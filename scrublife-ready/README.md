# SCRUB LIFE — Drop-In Fix Bundle

This is a complete, ready-to-apply fix bundle for the **NCLEX Clinical Trainer** Apple App Store rejection (Guideline 2.1 — App Completeness, IAP Payment Error), plus the **daily Opus-driven case generation system** for ongoing content.

## Apply everything in one shot

From your repo root in Codespaces:

```bash
# Extract this bundle on top of your repo
tar -xzf scrublife-ready.tar.gz

# Run the apply script
bash scrublife-ready/apply_all.sh
```

That's it. The script:

1. Backs up your originals to `/tmp/scrublife-backup-<timestamp>/`
2. Replaces `App.js` with the IAP-fixed version
3. Bumps `expo.ios.buildNumber` (Apple rejects duplicate build numbers on resubmission)
4. Installs `.github/workflows/daily_cases.yml` (Opus-driven, 3-day rotation, 2 cases/day)
5. Adds `CLAUDE.md` (anti-hallucination + scope-of-practice directive)
6. Adds `src/data/cases/MANIFEST.json` (overlap tracking)
7. Adds `DAILY_CASES_README.md` and `APP_REVIEW_REPLY.md`
8. Stages everything for `git commit` (does **not** auto-push — you review first)

## What you still have to do yourself

Anything that needs **your** credentials or **your** machine:

- `git commit && git push`
- `eas build --platform ios --profile production`
- `eas submit --platform ios`
- Paste the text from `APP_REVIEW_REPLY.md` into App Store Connect → Resolution Center
- Confirm GitHub repo secrets are set: `PAT_TOKEN` and `ANTHROPIC_API_KEY`

## What's in this bundle

```
scrublife-ready/
├── apply_all.sh                          # one-shot installer
├── App.js                                # FIXED IAP (drop-in replacement)
├── bump_build_number.py                  # bumps expo.ios.buildNumber
├── fix_unlockpro.py                      # standalone patch (kept for reference)
├── CLAUDE.md                             # master directive Opus reads each run
├── APP_REVIEW_REPLY.md                   # exact text for Apple Resolution Center
├── DAILY_CASES_README.md                 # operator guide for the daily workflow
├── .github/
│   └── workflows/
│       └── daily_cases.yml               # GitHub Actions, runs daily on cron
└── src/
    └── data/
        └── cases/
            └── MANIFEST.json             # anti-overlap topic tracking
```

## What was actually broken

In your `App.js`, the `unlockPro` function had a duplicated nested function declaration inside its own try block:

```javascript
const unlockPro = async () => {        // outer
  try {
    await getSubscriptions(...);
    const unlockPro = async () => {    // ← INNER duplicate, never called
      ...
    };
  };                                   // outer try has no catch — broken
};
```

Result: tapping **SUBSCRIBE** never actually called `requestSubscription()`. Apple's StoreKit then queued the request and only completed it on app relaunch — exactly what the App Review team observed.

The fix: collapse to a single, correctly-structured `unlockPro` that calls `getSubscriptions` first (so the SKU is cached), validates the result, calls `requestSubscription`, and finalizes synchronously while the `purchaseUpdatedListener` in `useEffect` handles async/queued cases.

## What this bundle does NOT do (deferred)

- **Wire daily-generated JSON cases into the app's `CASES` array.** Right now `App.js` ships with the 5 hardcoded cases. The daily workflow drops new cases into `src/data/cases/` but the app doesn't load them yet. Reason: keep the IAP-fix submission diff tight and uncontroversial. After Apple approves, the next iteration adds a `src/data/cases/index.js` aggregator and updates `App.js` to spread imported cases.
- **Fix the cosmetic `Info.plist` issue** (misplaced `ITSAppUsesNonExemptEncryption` inside `NSAppTransportSecurity`). Wasn't the rejection cause; deferred to keep diff minimal.
