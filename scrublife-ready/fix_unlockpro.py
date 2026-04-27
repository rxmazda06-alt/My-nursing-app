"""
fix_unlockpro.py — Repairs the broken `unlockPro` function in App.js.

Run this once from your repo root in GitHub Codespaces:

    python3 fix_unlockpro.py

It locates the malformed nested-duplicate-function pattern and replaces
it with a clean, working implementation.
"""

import re
import sys
from pathlib import Path

APP_JS = Path("App.js")

if not APP_JS.exists():
    print("❌ App.js not found in the current directory.")
    print("   Run this script from your repo root.")
    sys.exit(1)

content = APP_JS.read_text(encoding="utf-8")

# The broken block to find — anchored on the duplicate `const unlockPro` line
# inside the outer try. We capture EVERYTHING from "const unlockPro = async"
# through to its closing "};" (the outer one), then replace it.
broken_pattern = re.compile(
    r"  const unlockPro = async \(\) => \{\s*\n"
    r"    try \{\s*\n"
    r"      // MUST FETCH THE PRODUCT FROM APPLE BEFORE BUYING\s*\n"
    r"      await getSubscriptions\(\{ skus: \[PRODUCT_ID\] \}\);\s*\n"
    r"      \s*\n"
    r"     const unlockPro = async \(\) => \{[\s\S]*?"
    r"\};\s*\n"
    r"    \}\s*\n"
    r"  \};",
    re.MULTILINE,
)

fixed = """  const unlockPro = async () => {
    try {
      // 1) Fetch product details from Apple FIRST. requestSubscription
      //    will fail silently or hang on iOS if the SKU hasn't been
      //    fetched/cached for the current StoreKit session.
      const subs = await getSubscriptions({ skus: [PRODUCT_ID] });
      if (!subs || subs.length === 0) {
        Alert.alert(
          'Unavailable',
          'This subscription is not available right now. Please try again in a moment, or contact support if it keeps happening.'
        );
        return;
      }

      // 2) Now actually request the purchase.
      const purchase = await requestSubscription({ sku: PRODUCT_ID });

      // 3) If we got a synchronous purchase object back, finalize.
      //    (The `purchaseUpdatedListener` in useEffect also handles
      //    async/queued cases like Ask-to-Buy and post-relaunch.)
      if (purchase) {
        setIsPro(true);
        await save(K.PRO, 'true');
        setScreen('home');
      }
    } catch (err) {
      console.warn('IAP unlockPro error:', err);
      if (err && err.code !== 'E_USER_CANCELLED') {
        Alert.alert(
          'Purchase Error',
          (err && err.message) || 'Could not complete purchase. Please try again.'
        );
      }
    }
  };"""

match = broken_pattern.search(content)
if not match:
    # Maybe it's already been fixed once. Check for the sentinel string.
    if "Fetch product details from Apple FIRST" in content:
        print("✅ App.js already contains the fixed unlockPro. Nothing to do.")
        sys.exit(0)
    print("⚠️  Could not auto-locate the broken unlockPro pattern.")
    print("    Open App.js and replace your `const unlockPro = async () => {...}`")
    print("    block manually with the version printed below:\n")
    print(fixed)
    sys.exit(2)

new_content = content[: match.start()] + fixed + content[match.end():]
APP_JS.write_text(new_content, encoding="utf-8")
print("✅ Fixed unlockPro in App.js")
print("   - Removed the duplicate nested function declaration")
print("   - getSubscriptions result is now actually checked")
print("   - requestSubscription is now actually called")
print("   - Catch block uses safer error access")
print("\nNext: bump iOS buildNumber in app.json, run `eas build --platform ios`,")
print("then `eas submit --platform ios`.")
