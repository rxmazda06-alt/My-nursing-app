#!/usr/bin/env bash
# ======================================================================
# apply_all.sh — Apply the IAP fix + daily case generator in one shot.
# ======================================================================
# Run this from your repo root in Codespaces:
#
#   bash apply_all.sh
#
# What it does:
#   1. Backs up your existing App.js, app.json, .github/workflows/ to /tmp
#   2. Drops in the fixed App.js
#   3. Bumps expo.ios.buildNumber by 1 (Apple rejects duplicate build numbers)
#   4. Installs the daily Opus case-generation workflow
#   5. Adds CLAUDE.md, MANIFEST.json, and the operator guide
#   6. Stages everything for commit (does NOT auto-push — you review first)
#
# After running, you do:
#   git diff --staged           # eyeball the changes
#   git commit -m "Fix IAP + add daily case generator (Opus)"
#   git push
#   eas build --platform ios --profile production
#   eas submit --platform ios
# ======================================================================

set -e

# Where this script lives — assume the bundle was extracted next to it.
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BUNDLE_DIR="${SCRIPT_DIR}"

# Sanity check: are we in a real repo?
if [ ! -f "App.js" ]; then
  echo "❌ Not in a repo root (no App.js found). cd into your repo first."
  exit 1
fi
if [ ! -f "app.json" ]; then
  echo "❌ No app.json found. Make sure you're in the Expo project root."
  exit 1
fi

echo "════════════════════════════════════════════════════════════════"
echo "  SCRUB LIFE — Apple IAP fix + daily case generator"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Backup
TS=$(date +%Y%m%d-%H%M%S)
BACKUP="/tmp/scrublife-backup-${TS}"
mkdir -p "${BACKUP}"
cp App.js "${BACKUP}/App.js"
cp app.json "${BACKUP}/app.json"
[ -d .github/workflows ] && cp -r .github/workflows "${BACKUP}/workflows"
echo "✅ Backed up originals → ${BACKUP}"

# 1) Drop in fixed App.js
cp "${BUNDLE_DIR}/App.js" ./App.js
echo "✅ Replaced App.js (IAP fix applied)"

# 2) Bump iOS buildNumber
python3 "${BUNDLE_DIR}/bump_build_number.py"

# 3) Install daily Opus workflow
mkdir -p .github/workflows
cp "${BUNDLE_DIR}/.github/workflows/daily_cases.yml" .github/workflows/daily_cases.yml
echo "✅ Installed .github/workflows/daily_cases.yml (uses Opus 4.7)"

# 4) Master directive for Opus
cp "${BUNDLE_DIR}/CLAUDE.md" ./CLAUDE.md
echo "✅ Installed CLAUDE.md (anti-hallucination + scope-of-practice rules)"

# 5) Manifest (anti-overlap tracking)
mkdir -p src/data/cases
if [ ! -f src/data/cases/MANIFEST.json ]; then
  cp "${BUNDLE_DIR}/src/data/cases/MANIFEST.json" src/data/cases/MANIFEST.json
  echo "✅ Installed src/data/cases/MANIFEST.json (empty starting state)"
else
  echo "ℹ️  src/data/cases/MANIFEST.json already exists — leaving as-is"
fi

# 6) Operator guide
cp "${BUNDLE_DIR}/DAILY_CASES_README.md" ./DAILY_CASES_README.md
cp "${BUNDLE_DIR}/APP_REVIEW_REPLY.md" ./APP_REVIEW_REPLY.md
echo "✅ Installed DAILY_CASES_README.md + APP_REVIEW_REPLY.md"

# 7) Stage everything
git add App.js app.json CLAUDE.md DAILY_CASES_README.md APP_REVIEW_REPLY.md \
        .github/workflows/daily_cases.yml \
        src/data/cases/MANIFEST.json 2>/dev/null || true

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  DONE. Review the changes:"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "    git status"
echo "    git diff --staged App.js | head -100"
echo ""
echo "  When happy, commit and push:"
echo ""
echo "    git commit -m 'Fix IAP unlockPro + add daily Opus case generator'"
echo "    git push"
echo ""
echo "  Then build and submit:"
echo ""
echo "    eas build --platform ios --profile production"
echo "    eas submit --platform ios"
echo ""
echo "  Then in App Store Connect → Resolution Center, paste the text"
echo "  from APP_REVIEW_REPLY.md."
echo ""
echo "  GitHub repo secrets needed for the daily workflow:"
echo "    • PAT_TOKEN          (personal access token, repo + workflow scope)"
echo "    • ANTHROPIC_API_KEY  (your Anthropic console key)"
echo ""
echo "════════════════════════════════════════════════════════════════"
