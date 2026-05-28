// ─────────────────────────────────────────────────────────────────────────
// classify-tracks.js — stamp a "tracks" array onto every case JSON.
//
// The app is RN-first: EVERY case is in scope for the RN track, so every
// case's tracks array begins with "RN". The array is ADDITIVE — it marks
// which narrower scopes a case ALSO belongs to:
//
//   ["RN"]                 RN-only. Acute/unstable/critical/emergent care,
//                          IV push & drip titration, blood products, complex
//                          leadership/triage, ethics/consent, high-alert IV meds.
//   ["RN","LVN"]           Also within LVN scope: stable/ongoing care, health
//                          promotion, basic care & comfort, wound/ostomy care,
//                          med-teaching reinforcement, routine infection control,
//                          chronic-disease management, recognize-and-escalate.
//   ["RN","LVN","LPT"]     Also within LPT (CA Psychiatric Technician) scope:
//                          psychiatric / behavioral / substance-use / DD cases.
//                          (Mental-health content is in scope for all 3 tracks.)
//
// The HomeScreen filter shows a case when case.tracks.includes(selectedTrack),
// so: RN sees everything, LVN sees LVN+psych cases, LPT sees psych cases only.
//
// This mapping is intentionally explicit (not a fragile keyword heuristic) so a
// nurse educator can audit and adjust any single case. Re-running is idempotent.
//
//   node scripts/classify-tracks.js          # apply
//   node scripts/classify-tracks.js --check   # report only, write nothing
// ─────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

const CASES_DIR = path.join('src', 'data', 'cases');

// Psychiatric / behavioral / substance-use / developmental cases → all 3 tracks.
const LPT_ALL = new Set([
  'case-016', // Acute suicidal ideation with plan
  'case-020', // Severe alcohol withdrawal with delirium tremens
  'case-049', // Severe alcohol withdrawal with delirium tremens
  'case-052', // Acute manic episode, bipolar I, lithium
  'case-076', // Severe anorexia nervosa with refeeding syndrome
  'case-089', // Behavioral & psychological symptoms of dementia (BPSD)
  'case-097', // Alcohol withdrawal syndrome (CIWA-guided)
  'case-105', // Severe anorexia nervosa (restricting type)
  'case-112', // Postpartum mood-disorder spectrum
  'case-113', // First-episode psychosis / new-onset schizophrenia
  'case-121', // Borderline personality disorder, non-suicidal self-injury
  'case-125', // Opioid use disorder + medication-assisted treatment
  'case-129', // Post-traumatic stress disorder (PTSD)
  'case-139', // Involuntary psychiatric commitment, patient rights
]);

// Stable / ongoing-care / health-promotion / basic-care cases → RN + LVN.
const RN_LVN = new Set([
  'case-029', // C. difficile colitis — infection control
  'case-055', // UTI-precipitated delirium superimposed on dementia
  'case-057', // Wrong-patient insulin — medication-safety event
  'case-063', // Hip fracture in older adult — post-op care
  'case-081', // Newly diagnosed type 2 diabetes — self-management teaching
  'case-082', // Inpatient hospice admission — comfort/end-of-life care
  'case-084', // Suspected elder abuse & neglect — recognition/reporting
  'case-086', // Smear-positive pulmonary TB — airborne infection control
  'case-087', // Adolescent annual well-visit — health promotion
  'case-093', // Smoking-cessation pharmacotherapy & counseling
  'case-102', // Active pulmonary TB — infection control
  'case-103', // Cystic fibrosis exacerbation — airway clearance/chronic care
  'case-106', // New end ileostomy — ostomy care & teaching
  'case-109', // Discharge medication teaching
  'case-114', // Guillain-Barré — basic care & comfort phase
  'case-117', // Patient-controlled analgesia (PCA) — safe use & monitoring
  'case-118', // Febrile neutropenia — neutropenic/protective precautions
  'case-119', // Routine 6-month well-child visit
  'case-124', // Pressure-injury staging & Braden-based prevention
  'case-127', // Suspected child physical abuse — recognition/reporting
  'case-128', // Neonatal opioid withdrawal (NAS) — supportive care
  'case-130', // Mechanical small-bowel obstruction — NGT/ongoing care
  'case-133', // Catheter-associated UTI (CAUTI) prevention
  'case-136', // Fall prevention in a high-risk older adult
  'case-137', // Pediatric asthma control & self-management education
  'case-140', // Enteral nutrition via new PEG tube — tube-feeding care & teaching
]);

function tracksFor(id) {
  if (LPT_ALL.has(id)) return ['RN', 'LVN', 'LPT'];
  if (RN_LVN.has(id)) return ['RN', 'LVN'];
  return ['RN']; // RN-only is the default for acute/critical/RN-scope cases
}

const checkOnly = process.argv.includes('--check');

const files = fs.readdirSync(CASES_DIR)
  .filter(f => /^case-\d+\.json$/.test(f))
  .sort();

const counts = { '["RN"]': 0, '["RN","LVN"]': 0, '["RN","LVN","LPT"]': 0 };
let changed = 0;

for (const f of files) {
  const full = path.join(CASES_DIR, f);
  const raw = fs.readFileSync(full, 'utf8');
  let data;
  try { data = JSON.parse(raw); } catch (e) {
    console.error(`SKIP ${f}: parse error ${e.message}`);
    continue;
  }
  const tracks = tracksFor(data.id);
  counts[JSON.stringify(tracks).replace(/,/g, ',')]++;

  // The repo normalizes text to LF (.gitattributes: "* text=auto") and the git
  // index stores these case files as LF. Write pure LF so `git diff` collapses
  // to just the inserted "tracks" lines instead of a whole-file CRLF/LF churn.
  const eol = '\n';
  // Build the tracks block at 2-space top-level indent / 4-space items.
  const items = tracks.map(t => `    "${t}"`).join(`,${eol}`);
  const block = `  "tracks": [${eol}${items}${eol}  ],${eol}`;

  // Normalize the whole file to LF first so the only real change is the insert.
  let body = raw.replace(/\r\n/g, '\n');
  // 1. Strip any existing tracks block (idempotent re-runs).
  body = body.replace(/^ *"tracks": \[[\s\S]*?\],\n/m, '');
  // 2. Insert immediately after the top-level "category" line.
  let next;
  if (/^ *"category": ".*?",\n/m.test(body)) {
    next = body.replace(/^( *"category": ".*?",\n)/m, `$1${block}`);
  } else {
    // Fallback: insert as the first property after the opening brace.
    next = body.replace(/^\{\n/, m => `${m}${block}`);
  }

  if (next !== raw) {
    changed++;
    if (!checkOnly) fs.writeFileSync(full, next);
  }
}

console.log(`${checkOnly ? '[check] ' : ''}Processed ${files.length} cases — ${changed} ${checkOnly ? 'would change' : 'written'}.`);
console.log('Distribution:');
console.log(`  ["RN"]              ${counts['["RN"]']}`);
console.log(`  ["RN","LVN"]        ${counts['["RN","LVN"]']}`);
console.log(`  ["RN","LVN","LPT"]  ${counts['["RN","LVN","LPT"]']}`);
