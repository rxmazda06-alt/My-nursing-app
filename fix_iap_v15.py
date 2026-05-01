#!/usr/bin/env python3
"""
fix_iap_v15.py — Migrate App.js to react-native-iap v15 (OpenIAP) API.

WHAT THIS FIXES
---------------
react-native-iap v14 rewrote the API under the OpenIAP spec. Two functions
your App.js calls no longer exist as named exports:

    getSubscriptions(...)   →  fetchProducts({ skus, type: 'subs' })
    requestSubscription({sku})  →  requestPurchase({ request:{apple,google}, type:'subs' })

Tapping Subscribe was therefore throwing "undefined is not a function" because
`getSubscriptions` was undefined in v15.

Everything else — `initConnection`, `endConnection`, `getAvailablePurchases`,
`finishTransaction`, `purchaseUpdatedListener`, `purchaseErrorListener` — is
still exported in v15, so we keep those as-is.

USAGE
-----
From your repo root in Codespaces:

    python3 fix_iap_v15.py

Idempotent: safe to run multiple times.
"""
from __future__ import annotations
import re
import sys
from pathlib import Path

APP_JS = Path("App.js")

if not APP_JS.exists():
    print("❌ App.js not found. Run this from your repo root.")
    sys.exit(1)

src = APP_JS.read_text(encoding="utf-8")

# Sentinel: detect actual v15 *call sites* (with paren), not just any
# occurrence of the function names — comments mentioning the old names
# must not trigger a false "needs migration" verdict.
already_v15 = (
    "fetchProducts({" in src
    and "requestPurchase({" in src
    and "type: 'subs'" in src
    and "getSubscriptions({" not in src
    and "requestSubscription({" not in src
)
if already_v15:
    print("✅ App.js already on v15 API. Nothing to do.")
    sys.exit(0)

# ─────────────────────────────────────────────────────────────────────
# 1) Imports: swap the two removed names for the v15 names.
# ─────────────────────────────────────────────────────────────────────
import_patterns = [
    ("  getSubscriptions,\n  requestSubscription,",
     "  fetchProducts,\n  requestPurchase,"),
    ("  getSubscriptions,\r\n  requestSubscription,",
     "  fetchProducts,\r\n  requestPurchase,"),
]
imports_changed = False
for old, new in import_patterns:
    if old in src:
        src = src.replace(old, new)
        imports_changed = True
        break

# Fallback: if the imports are reordered or formatted differently, swap
# the names individually wherever they appear in the import block.
if not imports_changed:
    if "getSubscriptions," in src:
        src = src.replace("getSubscriptions,", "fetchProducts,", 1)
        imports_changed = True
    if "requestSubscription," in src:
        src = src.replace("requestSubscription,", "requestPurchase,", 1)
        imports_changed = True

if not imports_changed:
    print("⚠️  Could not find the IAP imports to patch. "
          "Open App.js and confirm the import block from 'react-native-iap'.")
    # Don't bail — maybe the user already swapped imports manually but not
    # the function body. Continue and try the body replacement.

# ─────────────────────────────────────────────────────────────────────
# 2) Replace the entire unlockPro function body with v15-compatible code.
# ─────────────────────────────────────────────────────────────────────
new_unlock = '''  const unlockPro = async () => {
    try {
      // v15 OpenIAP API: fetchProducts replaces getSubscriptions.
      // Cache the SKU with StoreKit before requesting the purchase, otherwise
      // the request can hang or no-op on the first tap.
      const subs = await fetchProducts({
        skus: [PRODUCT_ID],
        type: 'subs',
      });
      if (!subs || subs.length === 0) {
        Alert.alert(
          'Unavailable',
          'This subscription is not available right now. Please try again in a moment, or contact support if it keeps happening.'
        );
        return;
      }

      // v15 OpenIAP API: requestPurchase replaces requestSubscription.
      // The purchase result is delivered through the purchaseUpdatedListener
      // set up in useEffect — NOT as a synchronous return value. That listener
      // calls setIsPro(true), saves to storage, finalizes the transaction,
      // and routes back to 'home'.
      await requestPurchase({
        request: {
          apple: { sku: PRODUCT_ID },
          google: { skus: [PRODUCT_ID] },
        },
        type: 'subs',
      });
    } catch (err) {
      console.warn('IAP unlockPro error:', err);
      if (err && err.code !== 'E_USER_CANCELLED') {
        Alert.alert(
          'Purchase Error',
          (err && err.message) || 'Could not complete purchase. Please try again.'
        );
      }
    }
  };'''

# Match the existing unlockPro block.
# We anchor on the exact opening line and capture through its closing "  };"
unlock_pattern = re.compile(
    r"  const unlockPro = async \(\) => \{.*?\n  \};",
    re.DOTALL,
)

m = unlock_pattern.search(src)
if not m:
    print("⚠️  Could not locate the unlockPro function block in App.js.")
    print("    Open App.js and replace your `const unlockPro = async () => {...}`")
    print("    block manually with the version below:\n")
    print(new_unlock)
    sys.exit(2)

src = src[: m.start()] + new_unlock + src[m.end():]

# ─────────────────────────────────────────────────────────────────────
# Write the patched file.
# ─────────────────────────────────────────────────────────────────────
APP_JS.write_text(src, encoding="utf-8")

print("✅ Patched App.js for react-native-iap v15:")
print("   • imports:  getSubscriptions, requestSubscription")
print("              → fetchProducts, requestPurchase")
print("   • unlockPro: now uses the v15 OpenIAP signatures")
print("   • purchase result still flows through your existing")
print("     purchaseUpdatedListener — no other changes needed")
print()
print("Next steps:")
print("   1. Bump iOS buildNumber:   python3 scrublife-ready/bump_build_number.py")
print("      (or edit app.json -> expo.ios.buildNumber by hand)")
print("   2. Commit + push:          git add App.js app.json && \\")
print("                              git commit -m 'fix(iap): migrate to v15 API' && \\")
print("                              git push")
print("   3. Build + submit:         eas build --platform ios --profile production")
print("                              eas submit --platform ios")
