// Bundles every src/data/cases/*.json into docs/cases.json for GitHub Pages
const fs = require('fs');
const path = require('path');

const CASES_DIR = path.join('src', 'data', 'cases');
const OUT_DIR = 'docs';
const OUT_FILE = path.join(OUT_DIR, 'cases.json');

const files = fs.readdirSync(CASES_DIR)
  .filter(f => f.endsWith('.json') && f !== 'MANIFEST.json' && !f.startsWith('.'));

const cases = [];
const errors = [];

for (const f of files) {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(CASES_DIR, f), 'utf8'));
    cases.push(data);
  } catch (e) {
    errors.push(`${f}: ${e.message}`);
  }
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_FILE, JSON.stringify(cases));

console.log(`✅ Bundled ${cases.length} case(s) → ${OUT_FILE}`);
if (errors.length) {
  console.warn(`⚠️  Skipped ${errors.length} malformed file(s):`);
  errors.forEach(e => console.warn(`   ${e}`));
}
