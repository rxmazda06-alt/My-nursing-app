// Bundles every src/data/cases/*.json into docs/cases.json for GitHub Pages.
// Validates each case against the EXACT schema the app uses in src/data/cases/useCases.js.
// Exits non-zero if any case would be silently rejected by the app — so broken cases
// can never ship to docs/cases.json.
const fs = require('fs');
const path = require('path');

const CASES_DIR = path.join('src', 'data', 'cases');
const OUT_DIR = 'docs';
const OUT_FILE = path.join(OUT_DIR, 'cases.json');

// ─── Validator mirrors useCases.js exactly ─────────────────────────
const VALID_FLAGS = ['critical', 'high', 'low', 'normal'];
const VALID_STEP_TYPES = ['multi', 'rank', 'classify'];
const REQUIRED_PATIENT_KEYS = ['name', 'age', 'sex', 'code', 'allergies', 'admitDate', 'room'];
const isStr = v => typeof v === 'string' && v.length > 0;
const isNum = v => typeof v === 'number' && !Number.isNaN(v);
const isBool = v => typeof v === 'boolean';
const isArr = v => Array.isArray(v);
const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);

function check(cond, msg, trail) { if (!cond) trail.push(msg); return cond; }

function validateOpts(opts, type, cats, trail) {
  if (!check(isArr(opts) && opts.length > 0, 'opts empty/not array', trail)) return false;
  for (let i = 0; i < opts.length; i++) {
    const opt = opts[i];
    if (!check(isObj(opt), `opt[${i}] not object`, trail)) return false;
    if (!check(isStr(opt.id), `opt[${i}].id missing`, trail)) return false;
    if (!check(isStr(opt.text), `opt[${i}].text missing`, trail)) return false;
    if (!check(isStr(opt.rat), `opt[${i}].rat missing`, trail)) return false;
    if (type === 'multi' && !check(isBool(opt.c), `opt[${i}].c not bool`, trail)) return false;
    if (type === 'rank' && !check(isNum(opt.cr) && opt.cr >= 1, `opt[${i}].cr not num>=1`, trail)) return false;
    if (type === 'classify') {
      if (!check(isStr(opt.c), `opt[${i}].c not string`, trail)) return false;
      if (!check(isArr(cats) && cats.includes(opt.c), `opt[${i}].c "${opt.c}" not in cats`, trail)) return false;
    }
  }
  return true;
}

function validateStep(step, expectedId, trail) {
  if (!check(isObj(step), 'step not object', trail)) return false;
  if (!check(step.id === expectedId, `step.id ${step.id} != ${expectedId}`, trail)) return false;
  if (!check(isStr(step.title) && isStr(step.sub) && isStr(step.icon) && isStr(step.inst), 'step text fields bad', trail)) return false;
  if (!check(VALID_STEP_TYPES.includes(step.type), `step.type "${step.type}" invalid`, trail)) return false;
  if (step.type === 'classify' && !check(isArr(step.cats) && step.cats.length >= 2, 'step.cats bad', trail)) return false;
  return validateOpts(step.opts, step.type, step.cats, trail);
}

function validateCase(c) {
  const trail = [];
  if (!check(isObj(c), 'not object', trail)) return { ok: false, trail };
  if (!check(isStr(c.id) && isStr(c.title) && isStr(c.subtitle), 'id/title/subtitle bad', trail)) return { ok: false, trail };
  if (!check(isBool(c.isFree), 'isFree not bool', trail)) return { ok: false, trail };
  if (!check(isStr(c.category) && isStr(c.nursesNote), 'category/nursesNote bad', trail)) return { ok: false, trail };
  if (!check(isObj(c.patient), 'patient not object', trail)) return { ok: false, trail };
  for (const k of REQUIRED_PATIENT_KEYS) {
    if (!check(c.patient[k] !== undefined && c.patient[k] !== null, `patient.${k} missing`, trail)) return { ok: false, trail };
  }
  if (!check(isArr(c.vitals) && c.vitals.length > 0, 'vitals empty', trail)) return { ok: false, trail };
  for (let i = 0; i < c.vitals.length; i++) {
    const v = c.vitals[i];
    if (!check(isObj(v), `vitals[${i}] bad`, trail)) return { ok: false, trail };
    for (const k of ['time', 'hr', 'bp', 'rr', 'spo2']) {
      if (!check(isStr(v[k]), `vitals[${i}].${k} not string`, trail)) return { ok: false, trail };
    }
  }
  if (!check(isArr(c.labs) && c.labs.length > 0, 'labs empty', trail)) return { ok: false, trail };
  for (let i = 0; i < c.labs.length; i++) {
    const l = c.labs[i];
    if (!check(isObj(l), `labs[${i}] bad`, trail)) return { ok: false, trail };
    if (!check(isStr(l.n) && isStr(l.v) && isStr(l.r), `labs[${i}] n/v/r bad`, trail)) return { ok: false, trail };
    if (!check(VALID_FLAGS.includes(l.f), `labs[${i}].f "${l.f}" not in ${JSON.stringify(VALID_FLAGS)} (lab n="${l.n}")`, trail)) return { ok: false, trail };
  }
  if (!check(isArr(c.steps) && c.steps.length === 6, `steps length ${c.steps?.length} != 6`, trail)) return { ok: false, trail };
  for (let i = 0; i < 6; i++) {
    if (!validateStep(c.steps[i], i + 1, trail)) return { ok: false, trail };
  }
  return { ok: true, trail };
}

// ─── Run ──────────────────────────────────────────────────────────
const files = fs.readdirSync(CASES_DIR)
  .filter(f => f.endsWith('.json') && f !== 'MANIFEST.json' && !f.startsWith('.'));

const cases = [];
const parseErrors = [];
const validationErrors = [];

for (const f of files) {
  let data;
  try {
    data = JSON.parse(fs.readFileSync(path.join(CASES_DIR, f), 'utf8'));
  } catch (e) {
    parseErrors.push(`${f}: ${e.message}`);
    continue;
  }
  const { ok, trail } = validateCase(data);
  if (!ok) {
    validationErrors.push({ file: f, id: data?.id, trail });
    continue;
  }
  cases.push(data);
}

if (parseErrors.length) {
  console.error(`❌ ${parseErrors.length} file(s) failed to parse:`);
  parseErrors.forEach(e => console.error(`   ${e}`));
}
if (validationErrors.length) {
  console.error(`❌ ${validationErrors.length} case(s) FAILED app-validator (would be silently dropped at runtime):`);
  for (const v of validationErrors) {
    console.error(`   ${v.file} (id=${v.id}):`);
    v.trail.forEach(t => console.error(`     - ${t}`));
  }
}
if (parseErrors.length || validationErrors.length) {
  console.error(`\nRefusing to publish: fix the errors above first.`);
  process.exit(1);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_FILE, JSON.stringify(cases));
console.log(`✅ Bundled ${cases.length} case(s) → ${OUT_FILE} (all pass app validator)`);
