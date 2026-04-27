# App Review Reply — Paste Into Resolution Center

Submission: NCLEX Clinical Trainer
Rejection: Guideline 2.1 — Performance — App Completeness

---

## What to paste into App Store Connect → Resolution Center

> Hi App Review Team,
>
> Thank you for the detailed feedback. I have identified and fixed the issue.
>
> **Root cause:** The `unlockPro` function in `App.js` contained a duplicated nested function declaration that prevented `requestSubscription()` from ever firing on the first tap. Apple's StoreKit was queueing the request and only completing it after the app relaunched — which exactly matches the behavior your reviewer observed ("Payment Error" on first attempt, then transaction completing on second launch).
>
> **What I fixed in this build:**
>
> 1. Removed the duplicated nested `unlockPro` declaration.
> 2. Now call `getSubscriptions({ skus: [PRODUCT_ID] })` first to ensure Apple has cached the product before the purchase request.
> 3. Validate that the returned product list is non-empty before calling `requestSubscription()`, with a friendly user-facing message if the product can't be loaded.
> 4. Added safe error handling so the user sees Apple's actual error code if anything fails — no more silent hangs or generic "Payment Error" surfaces.
> 5. The `purchaseUpdatedListener` continues to handle async/queued cases (Ask-to-Buy, family approval, sandbox latency) in the background.
>
> The subscription button (com.scrublife.ncjmm.pro.monthly, $34.99/month) now triggers the standard Apple confirmation sheet immediately on first tap, completes synchronously, and unlocks Pro access without requiring an app relaunch.
>
> I have tested in the iOS sandbox environment with a fresh sandbox tester account and the purchase flow now works as expected on first attempt.
>
> Thank you for your time and patience. Please let me know if you need any additional information.
>
> Best regards,
> Johans
> SCRUB LIFE Nurse Merch Co.

---

## Build to attach

Submit the new build (with bumped `buildNumber` — see `app.json` change below) for review and reply with the message above in Resolution Center.
