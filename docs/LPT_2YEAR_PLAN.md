# LPT 2-Year Content Plan & Schedule (BVNPT Psychiatric Technician)

Master roadmap to comprehensively cover the California LPT program over 2 years, in
non-overlapping **20-question single-best-answer batches**. Each batch = one case
JSON in `src/data/cases/<slug>-lpt.json` (`format:"mc"`, `domain` = one of the four
LPT domains, 20 steps, one correct answer each, rationale on every option).

## Cadence & phases
- **Cadence:** ~1 batch (20 Q) per week (≈52 batches/year).
- **Phase 1 — Foundation coverage (Months 1–12, ~52 batches):** first-pass coverage of
  every sub-topic across all 4 domains, rotated by blueprint weight.
- **Phase 2 — Depth & application (Months 13–20, ~35 batches):** scenario/priority
  "Set 2/3" batches for high-yield topics, clinical-judgment and med items.
- **Phase 3 — Refresh & exam forms (Months 21–24, ~13 batches):** fill gaps, spaced
  review, additional full-length exam forms.
- **Total:** ~100 batches / ~2,000 questions over 24 months.

## Blueprint weighting (guides rotation & the 240-exam form)
Mental Health Care ~45% · Basic Nursing Care ~22% · Developmental Disabilities ~18% ·
Legal & Ethical (LPS Act & Patient Rights) ~15%.

## Anti-overlap rule (do this every batch)
1. Before writing, read the **Tracker** below and the concept list of any related batch.
2. Pick a sub-topic marked `[ ]` (or a new, non-duplicative angle for Phase 2/3).
3. Do not repeat a stem's core concept already covered; vary scenarios and stems.
4. After publishing, mark the batch `[x]` and add a one-line concept summary.
5. Per-batch build: write JSON → run answer-key rebalance (5/5/5/5 A–D) →
   `node scripts/publish-cases.js` → commit + push (ships via GitHub Pages; no EAS).

## Weekly rotation pattern (Phase 1)
Repeat: `MH · BNC · DD · MH · Legal · BNC · MH · DD` (keeps ~45/22/18/15 mix).

---

## Tracker — Foundation batches (Phase 1)

### Mental Health Care (MH)  — 12 batches / 240 Q (MH-01..13 done; MH-14..20 pending)
- [x] MH-01 Suicide risk, crisis & depression
- [x] MH-02 Schizophrenia, psychosis & therapeutic communication
- [x] MH-03 Bipolar disorder & mood stabilizers
- [x] MH-04 Anxiety, OCD & PTSD
- [x] MH-05 Substance use & withdrawal
- [x] MH-06 Psych meds/EPS/NMS, ECT, personality & eating disorders
- [x] MH-07 Cognitive disorders — delirium & dementia (neurocognitive)
- [x] MH-08 Child & adolescent mental health (ADHD, conduct, autism-in-psych)
- [x] MH-09 Antidepressants deep dive (SSRI/SNRI/TCA/bupropion, discontinuation)
- [x] MH-10 Antipsychotics — classes, administration & teaching (typical vs atypical, LAIs, indications, adherence, monitoring)  → mh-core-10 (2026-07-28; side-effect recognition stays in mh-core-06)
- [x] MH-11 Anger/aggression, de-escalation & violence-risk (warning signs, aggression cycle, verbal de-escalation, limit-setting, milieu safety)  → mh-core-11 (2026-07-28)
- [x] MH-12 Therapeutic relationship, boundaries, transference & milieu (phases, therapeutic use of self, self-disclosure/gifts/dual-relationships, transference/countertransference, empathy, milieu)  → mh-core-12 (2026-07-28)
- [x] MH-13 Defense mechanisms & coping (denial, projection, displacement, rationalization, regression, repression vs suppression, reaction formation, sublimation, compensation, undoing, introjection, identification, splitting, intellectualization, conversion, dissociation, adaptive vs maladaptive, problem- vs emotion-focused coping)  → mh-core-13 (2026-07-29)
- [ ] MH-14 Grief, loss, end-of-life, spiritual & cultural care
- [ ] MH-15 Abuse & neglect (child/elder/IPV) recognition & response
- [ ] MH-16 Somatic symptom, dissociative & factitious disorders
- [ ] MH-17 Perinatal & women's mental health
- [ ] MH-18 Geriatric psychiatry (late-life depression, dementia behaviors, polypharmacy)
- [ ] MH-19 Group/family therapy & modalities (CBT, DBT, MI)
- [ ] MH-20 Mental status exam, assessment & documentation of behavior

### Basic Nursing Care (BNC)  — 8 batches / ~160 Q (orig + 02..09 done; 10..15 pending)
- [x] BNC (orig) Vital signs · Fall safety · Infection control · Medication administration
- [x] BNC-02 Safety, comfort & physical needs (skin, nutrition, mobility, oxygen, glucose)
- [x] BNC-03 Medication administration rights, routes & basic calculations
- [x] BNC-04 Infection control & transmission-based precautions II
- [x] BNC-05 Nutrition, hydration, feeding & therapeutic diets
- [x] BNC-06 Elimination (catheter/CAUTI, UTI signs, I&O, retention, incontinence, ostomy, impaction/diarrhea, safe toileting)  → bnc-core-06 (2026-07-28)
- [x] BNC-07 Mobility, positioning, transfers, ROM & assistive devices (immobility complications, ROM/contractures, gait belt/lifts, walker, footdrop, DVT)  → bnc-core-07 (2026-07-28)
- [x] BNC-08 Skin integrity, wound care & pressure-injury staging (Stages 1–4/unstageable, friction/shear, prevention, wound-infection signs, drainage types, dressing care)  → bnc-core-08 (2026-07-28)
- [x] BNC-09 Oxygenation & respiratory care basics (positioning for dyspnea, early vs late hypoxia signs, pulse oximetry technique, O2 devices & fire safety, nasal-cannula skin care, normal RR, incentive spirometry, pursed-lip breathing, secretion clearance, suctioning-on-withdrawal, oxygen-as-a-medication scope, when to report distress)  → bnc-core-09 (2026-07-29)
- [ ] BNC-10 Emergency care (BLS/choking/seizure/shock/first aid)
- [ ] BNC-11 Diabetes care (glucose monitoring, insulin, hypo/hyperglycemia)
- [ ] BNC-12 Fluid & electrolyte basics; IV observation
- [ ] BNC-13 Specimen collection & diagnostic prep
- [ ] BNC-14 Perioperative & pre/post-procedure care basics
- [ ] BNC-15 Documentation, SBAR reporting & delegation basics

### Developmental Disabilities (DD)  — Phase-1 foundation COMPLETE (7 batches / 140 Q)
- [x] DD-01 Core care & behavior (autism, Down syndrome, seizures, communication, PBS)  → dd-core-01
- [x] DD-02 Intellectual disability, genetic conditions & CA service system  → dd-core-02
- [x] DD-03 Communication (AAC), behavior techniques (FBA/shaping/token economy) & dual diagnosis  → dd-core-03
- [x] DD-04 Cerebral palsy, epilepsy, positioning, dysphagia, choking & skin  → dd-core-04 (2026-07-28)
- [x] DD-05 Causes & prevention (genetic/prenatal/perinatal/postnatal, Down/Fragile X/FASD/PKU, newborn screening, early intervention)  → dd-core-07 (2026-07-28)
- [x] DD-06 Positive behavior support & functional behavior assessment  → dd-core-03 (FBA) + dd-core-06 (PBS)
- [x] DD-07 Self-injurious & aggressive behavior management (de-escalation, restraint as last resort, debriefing)  → dd-core-06 (2026-07-28)
- [x] DD-08 Dual diagnosis (DD + mental illness); psychotropics in DD  → intro in dd-core-03 (candidate for a Phase-2 depth batch)
- [x] DD-09 Health maintenance & aging in DD  → within dd-core-04 (2026-07-28)
- [x] DD-10 Rights, regional centers, IPP, consent & least-restrictive  → dd-core-05 (2026-07-28)
- [x] DD-11 Community integration, vocational & person-centered planning  → dd-core-05 (2026-07-28)

### Legal & Ethical (LPS Act & Patient Rights) (LEG)  — 4 batches / 80 Q
- [x] LEG-01 LPS Act & patient rights core (5150/5250, consent, restraint, reporting)  → legal-core-01
- [x] LEG-02 Torts, ethics, boundaries, advance directives, abuse reporting & errors  → legal-core-02
- [x] LEG-03 Hold process, hearings, conservatorship, advocacy, restraint law & reporting  → legal-core-03
- [x] LEG-07 Scope of practice, BVNPT licensing/discipline & delegation, standard of care, accountability  → legal-core-04 (2026-07-28)
- [x] LEG-08 Ethics (beneficence/justice/fidelity + autonomy/nonmaleficence/veracity), boundaries  → legal-core-02 + legal-core-04 (dilemmas still open)
- [ ] LEG-04 Confidentiality, HIPAA exceptions & Tarasoff (deeper — Tarasoff/confidentiality intro'd in legal-core-01/02/03)
- [ ] LEG-06 Restraint & seclusion law, documentation & monitoring (intro'd across legal-core-01/03)
- [ ] LEG-09 Torts in depth (negligence, malpractice, assault/battery, false imprisonment — intro'd in legal-core-02)
- [ ] LEG-10 Mandated reporting (child, elder/dependent adult) in depth
- [ ] LEG-11 Conservatorship (LPS), grave disability & court process (intro'd in legal-core-01/03)

**Next Legal targets:** LEG-04 (HIPAA exceptions / Tarasoff depth), LEG-10 (mandated reporting depth), then torts/conservatorship depth.

## Phase 2 (Months 13–20) — Depth & application
Second-pass, scenario/priority-heavy batches for high-yield topics (Suicide II,
Psychosis II, Withdrawal II, Mania/lithium II, EPS/NMS II, Dementia II, Autism II,
Restraint II, Med calculations, Diabetes II, Emergency II, Priority/delegation).

## Phase 3 (Months 21–24) — Refresh & exam forms
Spaced review, gap-fill from performance data, and additional blueprint-weighted
240-question exam forms.
