# Daily Cases + IAP Fix — Operator Guide

## TL;DR

Two things to do, in order:

1. **Fix the IAP bug** (one Codespaces command). This is what Apple rejected.
2. **Drop in the new daily-cases system** (3 files). 2 cases/day, Opus, no overlap.

---

## Part 1 — Fix the In-App Purchase

### What was wrong

Your `App.js` `unlockPro` function had a **duplicate function declaration nested inside itself**. The outer function called `getSubscriptions(...)` and then declared (but never called) an inner `unlockPro`. So `requestSubscription` never actually ran on the tap. Apple's reviewer saw exactly that: tap → no response → app relaunch → purchase finally completes (because your `purchaseUpdatedListener` picks up the queued retry).

### The fix

In Codespaces, from your repo root:

```bash
python3 fix_unlockpro.py
```

You'll see:

```
✅ Fixed unlockPro in App.js
```

Then commit:

```bash
git add App.js
git commit -m "fix(iap): repair broken unlockPro that blocked App Store purchase"
```

### Re-submit to Apple

1. **Bump `buildNumber`** in `app.json` (e.g., `"buildNumber": "12"` if you were on `"11"`).
2. `eas build --platform ios --profile production`
3. `eas submit --platform ios`
4. In App Store Connect → your rejected submission → **Reply to App Review**, paste:

> Thank you for the detailed feedback. We identified the cause of the purchase button non-response: a broken function nesting in our IAP handler that meant `requestSubscription` was never invoked synchronously. The transaction only completed via our background `purchaseUpdatedListener` when the app relaunched. We've corrected the function so the purchase flow now executes immediately on tap and the success state is reflected in-session. New build attached.

---

## Part 2 — Daily Cases System (Opus, rotation, no overlap)

### What changed vs. your current setup

| | Before | After |
|---|---|---|
| Model | `claude-sonnet-4-5` | **`claude-opus-4-7`** (Anthropic's strongest, lowest hallucination on clinical content) |
| Cases per day | 5 | **2** (quality over quantity) |
| Tracks | RN only (per CLAUDE.md but not enforced) | **3-day rotation: RN, LVN, LPT** — each track gets 2 days out of 3 |
| Overlap prevention | None | **MANIFEST.json** — Claude reads it before generating, can't repeat topics |
| Schema enforcement | Vague | **Strict** — JSON validated in workflow before commit |
| Scope of practice | Not differentiated | **Per-track scope rules** (LVN can't push IV cardizem, LPT focused on psych, etc.) |

### Rotation pattern

Cycles every 3 days:

| Day mod 3 | Case A | Case B |
|---|---|---|
| 0 | RN | LVN |
| 1 | LVN | LPT |
| 2 | LPT | RN |

Over a week each track gets ~5 cases. Over a month ~20 cases per track.

### Files to add

Drop these into your repo:

```
.github/workflows/daily_cases.yml   ← REPLACES your existing one
CLAUDE.md                           ← REPLACES your existing one
src/data/cases/MANIFEST.json        ← NEW (initial empty manifest)
fix_unlockpro.py                    ← NEW (one-time use)
```

Commit:

```bash
git add .github/workflows/daily_cases.yml CLAUDE.md src/data/cases/MANIFEST.json fix_unlockpro.py
git commit -m "feat(cases): Opus-driven daily case generation w/ rotation + manifest"
git push
```

### Test the workflow before waiting for cron

In GitHub → **Actions** → **Generate Daily NCLEX Cases** → **Run workflow**. It will:

1. Compute today's track pair from the date
2. Read `MANIFEST.json`
3. Pick two fresh, never-repeated topics
4. Write two case JSONs + update the manifest
5. Validate JSON
6. Commit + push

If anything fails, the workflow log will tell you which step.

---

## Part 3 — One thing you'll want to do soon

**Your app's `App.js` still has the 5 cases hardcoded in a `CASES = [...]` array.** The daily-generated JSONs go to `src/data/cases/` but **nothing in the app loads them yet.** So today, your daily generation is filling a folder that the app doesn't read.

To wire them up (a separate small change for next iteration):

1. Add an `index.js` to `src/data/cases/` that imports every JSON and exports a combined array.
2. In `App.js`, change `const CASES = [ ...5 hardcoded... ]` to `const CASES = [ ...hardcoded5, ...require('./src/data/cases').default ]`.

I didn't bundle that change here because Apple's current rejection is purely about the IAP and bundling new app code in this fix would slow re-submission. Get the IAP fix into review first, then enable dynamic loading in the next build.

---

## File reference (what each does)

- **`fix_unlockpro.py`** — One-shot Python script. Finds the broken nested-function pattern and replaces it with a clean working version. Idempotent — safe to run twice.
- **`.github/workflows/daily_cases.yml`** — Daily cron + manual dispatch. Determines rotation, runs Opus, validates JSON, commits.
- **`CLAUDE.md`** — Master directive Opus reads on every run. Covers anti-hallucination rules, scope of practice per track, NCLEX test plan matrix, exact JSON schema, manifest workflow, quality bar.
- **`src/data/cases/MANIFEST.json`** — The single source of truth for "what topics have we covered already." Opus reads it to avoid repeats and updates it after each run.
