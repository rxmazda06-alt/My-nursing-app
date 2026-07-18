# RN 4-Year Content Plan & Schedule (NCLEX-RN / Next-Gen NCLEX)

Roadmap to build a comprehensive, blueprint-weighted, **SME-vetted** RN case bank over
4 years. RN cases use the **NGN 6-step NCJMM format** (patient chart + vitals + labs +
Recognize/Analyze/Prioritize/Generate/Take Action/Evaluate), one case JSON in
`src/data/cases/<slug>.json` (`tracks:["RN"]`, NOT `format:"mc"`, exactly 6 steps,
`labs[]` each with an `.f` flag, step types multi/rank/classify).

## Current state (2026-07)
341 RN NGN cases already exist (auto-generated) and touch **all 8** NCLEX-RN client-need
categories = 100% category coverage. Gap: **Pharmacological & Parenteral is proportionally
light** (~18% of cases vs 13–19% exam weight), and none have had credentialed SME review.
This plan governs new, hand-authored, reviewed cases and prioritizes the pharmacology gap.

## NCLEX-RN blueprint weighting (targets for the bank)
| Client-need category | Target |
|---|---|
| Management of Care | ~18% |
| Pharmacological & Parenteral Therapies | ~16% |
| Physiological Adaptation | ~14% |
| Safety & Infection Control | ~13% |
| Reduction of Risk Potential | ~12% |
| Health Promotion & Maintenance | ~9% |
| Psychosocial Integrity | ~9% |
| Basic Care & Comfort | ~9% |

## Cadence & phases
- **Cadence:** ~1 NGN case / week (~52/year, ~200 over 4 years).
- **Year 1 — Foundations:** core med-surg by body system, each mapped to a client-need
  category; front-load Pharmacological & Parenteral to close the gap.
- **Year 2 — High-acuity & Reduction of Risk:** critical care, complications, labs/
  diagnostics, perioperative, emergencies.
- **Year 3 — Specialty:** maternal-newborn, pediatrics, psychiatric-mental health,
  gerontology, community/public health.
- **Year 4 — Integration & NGN mastery:** Management of Care/delegation/prioritization,
  all NGN item types, and blueprint-weighted full practice exams; refresh/gap-fill from
  performance data.

## Anti-overlap rule (every case)
1. Read the Tracker; pick a `[ ]` topic and confirm the NGN clinical scenario is new.
2. Vary the body system AND the client-need category from recent cases.
3. Build: author 6-step case → `node scripts/publish-cases.js` (validates full NGN schema;
   rejects missing `.f` lab flags, wrong step count, etc.) → commit + push (ships via Pages).
4. **Every case needs an SME (RN faculty) accuracy pass before students rely on it.**

---

## Tracker — Year 1 (Foundations, ~52 cases)

### Pharmacological & Parenteral Therapies (priority gap-fill — front-load)
- [x] PHARM-01 Acute hemolytic blood transfusion reaction (blood products)
- [x] PHARM-02 IV heparin over-anticoagulation, aPTT monitoring & protamine
- [ ] PHARM-03 Warfarin: INR, vitamin K, bleeding precautions
- [ ] PHARM-04 Insulin types, sliding scale & hypo/hyperglycemia
- [ ] PHARM-05 IV potassium replacement (never IV push) & hyperkalemia
- [ ] PHARM-06 Opioid analgesia / PCA & naloxone reversal
- [ ] PHARM-07 Dosage calculation & high-alert medications
- [ ] PHARM-08 Vasoactive drips (norepinephrine/dopamine) titration
- [ ] PHARM-09 Total parenteral nutrition (TPN) & central-line care
- [ ] PHARM-10 Antibiotic therapy: vancomycin trough, allergy, anaphylaxis
- [ ] PHARM-11 Digoxin toxicity & therapeutic level
- [ ] PHARM-12 Chemotherapy safety & extravasation

### Physiological Adaptation
- [ ] PA-01 DKA / HHS · PA-02 Heart failure exacerbation · PA-03 Septic shock ·
  PA-04 ARDS/respiratory failure · PA-05 Acute kidney injury · PA-06 GI bleed/hypovolemia ·
  PA-07 Increased ICP · PA-08 Fluid/electrolyte imbalances

### Reduction of Risk Potential
- [ ] RR-01 Post-op complications · RR-02 Lab-value interpretation · RR-03 Chest tube ·
  RR-04 Diagnostic-test prep · RR-05 Deteriorating vitals · RR-06 Anticoagulation risk

### Safety & Infection Control
- [ ] SI-01 Standard/transmission precautions · SI-02 Sepsis bundle · SI-03 Fall/restraint ·
  SI-04 Medication safety/high-alert · SI-05 Surgical asepsis · SI-06 Hazardous materials

### Management of Care
- [ ] MC-01 Delegation (RN/LVN/UAP) · MC-02 Prioritization/triage · MC-03 Advance directives ·
  MC-04 Informed consent · MC-05 Care coordination/handoff (SBAR) · MC-06 Advocacy/ethics

### Health Promotion & Maintenance
- [ ] HP-01 Immunizations · HP-02 Prenatal/antepartum · HP-03 Newborn care ·
  HP-04 Developmental stages · HP-05 Health screening · HP-06 Aging changes

### Psychosocial Integrity
- [ ] PS-01 Suicide risk · PS-02 Crisis intervention · PS-03 Substance withdrawal ·
  PS-04 Grief/end-of-life · PS-05 Therapeutic communication · PS-06 Abuse recognition

### Basic Care & Comfort
- [ ] BC-01 Mobility/immobility · BC-02 Nutrition/enteral · BC-03 Elimination ·
  BC-04 Pain (non-pharm) · BC-05 Rest/sleep · BC-06 Personal hygiene/assistive devices

## Years 2–4
Expand each category with high-acuity, specialty, and integration cases per the phase notes
above, always blueprint-weighted and SME-reviewed. Track completion here as cases ship.
