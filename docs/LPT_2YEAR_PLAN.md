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

### Mental Health Care (MH)  — Phase-1 foundation COMPLETE (MH-01..20 done)
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
- [x] MH-14 Grief, loss, end-of-life, spiritual & cultural care (normal/anticipatory/complicated grief, non-linear stage models, therapeutic vs nontherapeutic support, palliative vs hospice, end-of-life comfort/communication, signs of approaching death, hearing-last, postmortem care, children & grief, staff grief, cultural/spiritual/religious accommodation, when to refer)  → mh-core-14 (2026-07-29)
- [x] MH-15 Abuse & neglect (child/elder/IPV) recognition & response (types incl. financial exploitation/self-neglect, physical/neglect/emotional/sexual indicators, elder & dependent-adult vulnerability, IPV cycle of violence + power/control + why victims stay, therapeutic response to disclosure, no-secrecy-promise, safety-first, objective documentation, recognize→report on reasonable suspicion, scope)  → mh-core-15 (2026-07-29; legal reporting mechanics live in legal-core-01/02/05 + planned LEG-10)
- [x] MH-16 Somatic symptom, dissociative & factitious disorders (somatic symptom/illness anxiety/conversion, primary vs secondary gain, factitious disorder + imposed-on-another=abuse, malingering contrast, dissociative amnesia, depersonalization/derealization, DID, grounding & safety, non-dismissive/nonconfrontational approach, intent-level discrimination, scope)  → mh-core-16 (2026-07-30)
- [x] MH-17 Perinatal & women's mental health (baby blues vs PPD vs postpartum psychosis=emergency, risk/contributing factors, thoughts-of-harm safety-first, perinatal anxiety/intrusive thoughts, bonding observation, perinatal-loss grief, PMDD, perimenopausal mood, meds-in-pregnancy→provider, stigma/help-seeking, screening=observe-report not diagnose)  → mh-core-17 (2026-07-30)
- [x] MH-18 Geriatric psychiatry (late-life depression, dementia behaviors, polypharmacy) (depression=treatable-not-aging, somatic/withdrawn presentation, don't-dismiss-as-aging, pseudodementia & why distinction matters, elderly/older-men suicide risk, loss/isolation factors, polypharmacy, start-low-go-slow sensitivity, med-related new confusion→report, sedative fall risk, side-effect monitoring, adherence support, full med review incl OTC, under-recognized substance use, late-life anxiety, sensory-impairment mimics, treatment optimism)  → mh-core-18 (2026-07-30; dementia BEHAVIORS remain in mh-core-07)
- [x] MH-19 Group/family therapy & modalities (CBT, DBT, MI) (group benefits/therapeutic factors/universality, tech role & ground rules & confidentiality, encouraging quiet member, family=system, CBT thought-feeling-behavior + challenge distortions, DBT emotion regulation + 4 skills + borderline, MI client-centered/evoke motivation/roll with resistance, psychoeducation/support/skills/12-step groups, reinforce skills between sessions, scope)  → mh-core-19 (2026-07-30; milieu in mh-core-12, monopolizer in mh-core-03)
- [x] MH-20 Mental status exam, assessment & documentation of behavior (MSE purpose & domains, mood vs affect, affect descriptors, orientation x person/place/time, thought process vs content, perception, cognition, insight, judgment, speech descriptors, objective behavioral documentation vs labels, client's-own-words quotes, baseline & change recognition, truthful safety-check charting, timely/factual/objective, scope)  → mh-core-20 (2026-07-30)

### Basic Nursing Care (BNC)  — Phase-1 foundation COMPLETE (orig + 02..15 done)
- [x] BNC (orig) Vital signs · Fall safety · Infection control · Medication administration
- [x] BNC-02 Safety, comfort & physical needs (skin, nutrition, mobility, oxygen, glucose)
- [x] BNC-03 Medication administration rights, routes & basic calculations
- [x] BNC-04 Infection control & transmission-based precautions II
- [x] BNC-05 Nutrition, hydration, feeding & therapeutic diets
- [x] BNC-06 Elimination (catheter/CAUTI, UTI signs, I&O, retention, incontinence, ostomy, impaction/diarrhea, safe toileting)  → bnc-core-06 (2026-07-28)
- [x] BNC-07 Mobility, positioning, transfers, ROM & assistive devices (immobility complications, ROM/contractures, gait belt/lifts, walker, footdrop, DVT)  → bnc-core-07 (2026-07-28)
- [x] BNC-08 Skin integrity, wound care & pressure-injury staging (Stages 1–4/unstageable, friction/shear, prevention, wound-infection signs, drainage types, dressing care)  → bnc-core-08 (2026-07-28)
- [x] BNC-09 Oxygenation & respiratory care basics (positioning for dyspnea, early vs late hypoxia signs, pulse oximetry technique, O2 devices & fire safety, nasal-cannula skin care, normal RR, incentive spirometry, pursed-lip breathing, secretion clearance, suctioning-on-withdrawal, oxygen-as-a-medication scope, when to report distress)  → bnc-core-09 (2026-07-29)
- [x] BNC-10 Emergency care (BLS/choking/seizure/shock/first aid) (find-unresponsive first action, responder scope, choking still-coughing vs becomes-unresponsive, seizure safety/nothing-in-mouth/postictal side-lying/when-to-call, fainting, shock recognition & support, direct-pressure bleeding, minor-burn cool water, possible spinal-injury do-not-move, chest-pain & stroke recognition, nosebleed lean-forward, poisoning, scene safety, post-event documentation)  → bnc-core-10 (2026-07-29; CPR/BLS numeric params deferred to BLS cert)
- [x] BNC-11 Diabetes care (glucose monitoring, insulin, hypo/hyperglycemia) (diabetes basics, hypo vs hyper signs & onset, rule of 15, post-recovery snack, unresponsive→NPO+emergency, glucometer technique, check/insulin timing, insulin high-alert/storage/site-rotation, rapid vs long-acting concept, insulin-without-food risk, exercise effect, foot care, meal coordination, what to report, no-glucometer symptomatic→treat-the-low)  → bnc-core-11 (2026-07-29; specific glucose thresholds & insulin onset/peak deferred to orders/labeling)
- [x] BNC-12 Fluid & electrolyte basics; IV observation (fluid balance/overload signs, daily weights, accurate I&O, at-risk clients, vomiting/diarrhea losses, electrolyte function, potassium & heart rhythm, imbalance warning signs, recognize→report; IV within scope: observe site/redness-swelling-pain-leaking/alarms/empty bag, never start/regulate/medicate/DC, protect site on transfer, fluid encourage/restrict per plan)  → bnc-core-12 (2026-07-30; electrolyte values & IV rates deferred)
- [x] BNC-13 Specimen collection & diagnostic prep (two-identifier verify + bedside labeling, clean-catch/midstream, 24-hr urine + lost-sample restart, stool no-contamination, deep-cough AM sputum, prompt transport/storage, standard precautions, culture sterile-before-antibiotics, requisition match, documentation, fasting/NPO per order, procedure prep + consent-by-provider, client teaching, abnormal-appearance report, safe transport, timed samples, scope)  → bnc-core-13 (2026-07-30)
- [x] BNC-14 Perioperative & pre/post-procedure care basics (pre-op purpose, NPO/aspiration rationale, verify-consent, checklist ID band/remove jewelry-dentures, pre-op DB&C/leg exercises teaching, anxiety support, baseline vitals; post-op airway/breathing/LOC priority, side-lying positioning, complication reporting, atelectasis/DVT prevention, dressing/pain/nausea/output monitoring, fall precautions, infection prevention, scope)  → bnc-core-14 (2026-07-30)
- [x] BNC-15 Documentation, SBAR reporting & delegation basics (documentation purposes/qualities, chart-after-care timing, entry integrity/no-gaps/no-white-out, SBAR = Situation/Background/Assessment/Recommendation + each component + benefit, safe shift handoff, report changes via SBAR, delegation nurse→tech, five rights of delegation, accept only in-scope/clarify-or-decline unsafe, report-back, non-delegable nursing judgment, confidential reporting)  → bnc-core-15 (2026-07-30)

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

### Legal & Ethical (LPS Act & Patient Rights) (LEG)  — Phase-1 foundation COMPLETE (9 batches / 180 Q)
- [x] LEG-01 LPS Act & patient rights core (5150/5250, consent, restraint, reporting)  → legal-core-01
- [x] LEG-02 Torts, ethics, boundaries, advance directives, abuse reporting & errors  → legal-core-02
- [x] LEG-03 Hold process, hearings, conservatorship, advocacy, restraint law & reporting  → legal-core-03
- [x] LEG-07 Scope of practice, BVNPT licensing/discipline & delegation, standard of care, accountability  → legal-core-04 (2026-07-28)
- [x] LEG-08 Ethics (beneficence/justice/fidelity + autonomy/nonmaleficence/veracity), boundaries  → legal-core-02 + legal-core-04 (dilemmas still open)
- [x] LEG-04 Confidentiality, HIPAA exceptions & Tarasoff (PHI, TPO permitted disclosures, authorization/ROI, right of access, need-to-know; exceptions: duty to warn/Tarasoff, mandated abuse reporting, danger to self, court order, communicable-disease reporting; breach prevention)  → legal-core-05 (2026-07-29)
- [x] LEG-06 Restraint & seclusion law, documentation & monitoring (purpose limits, no PRN/standing orders, emergency initiation, time-limited orders + renewal, face-to-face eval, restraint vs seclusion vs chemical restraint, least-restrictive-first, safe application/positioning, monitoring circulation/skin/airway, basic needs, discontinuation ASAP, documentation content, debriefing, advocacy/report unsafe practice)  → legal-core-06 (2026-07-29; numeric timeframes deferred to regulation/policy)
- [x] LEG-09 Torts in depth (tort vs crime, intentional vs unintentional, negligence + 4 elements duty/breach/causation/damages, malpractice=professional negligence, standard-of-care yardstick, assault vs battery, false imprisonment incl. improper restraint/holding voluntary client, defamation libel/slander, invasion of privacy, consent→battery, liability, error honesty, prevention via standards+documentation, action→tort matching)  → legal-core-07 (2026-07-30)
- [x] LEG-10 Mandated reporting (child, elder/dependent adult) in depth (mandated-reporter definition, reasonable-suspicion trigger, protected groups incl. 65+, report to CPS/APS/law enforcement, prompt oral-then-written, consent-not-required, good-faith immunity, failure-to-report penalties, reporter confidentiality, don't-investigate/confront, personal non-overridable duty vs supervisor, reportable forms incl. exploitation/self-neglect, document report, err-toward-safety, no-secrecy-promise)  → legal-core-08 (2026-07-30; statutory timeframes/ages/penalties deferred to CA law)
- [x] LEG-11 Conservatorship (LPS), grave disability & court process (purpose, court-established not staff/family, right to hearing/counsel/contest, grave-disability basis = can't provide food/clothing/shelter due to mental disorder, time-limited + periodic review/renewal/termination, right to petition review, conservator authority court-defined & limited, who may serve, least-restrictive placement, retained rights & humane care, civil-not-criminal, know decision authority, dignity/preferences respected, court makes determination, advocacy, scope)  → legal-core-09 (2026-07-30; statutory durations/standards deferred to CA law)

**Legal Phase-1 foundation complete (legal-core-01..09).** Phase-2 depth candidates: ethical dilemmas/decision-making, advance-directives depth.

## Phase 2 (Months 13–20) — Depth & application
Second-pass, scenario/priority-heavy batches for high-yield topics.

### Phase-2 tracker
- [x] Suicide II — risk stratification/lethality, observation levels (1:1), means restriction, imminent-risk cues, protective factors, safety-planning vs no-suicide-contract, post-attempt priority/sustained risk, transitions, admission search, verbatim documentation, prioritization, direct-questioning-doesn't-increase-risk, acute escalation of chronic ideation  → mh-core-21 (2026-07-30; builds on mh-core-01)
- [x] Psychosis II — negative-symptom misattribution, command-hallucination safety assessment + priority, anosognosia & adherence, LAIs, relapse/decompensation signs, concrete communication, de-escalating fear-driven agitation, grandiose/somatic delusion responses, hallucination coping strategies, avoid paranoia-feeding, safe guarded-client approach, negative-symptom gradual engagement, akathisia-vs-agitation, med-refusal trust approach, reality-based delusion response, nonjudgmental relapse support  → mh-core-22 (2026-08-02; builds on mh-core-02, meds in mh-core-06/10)
- [x] Withdrawal II — life-threatening (alcohol/benzo) vs uncomfortable (opioid/stimulant), benzo-withdrawal seizure risk/taper, priority scenario, DTs management (calm/lit/reorient/seizure-fall precautions), escalation monitoring (autonomic instability), polysubstance prioritize-most-dangerous, fall risk, supportive hydration/nutrition, stimulant-crash suicide watch, withdrawal hallucinations, craving/relapse nonjudgmental support, detox-meds-as-ordered scope, aftercare/relapse-prevention  → mh-core-23 (2026-08-02; builds on mh-core-05, numbers/CIWA there)
- [x] Mania/lithium II — acute-mania physical-safety priority (exhaustion/dehydration/nutrition via finger foods, low-stim structured environment, impulse/spending risk), lithium-toxicity recognition→hold+report, situations raising levels applied (dehydration/vomiting-diarrhea, heat/exertion sweating, low sodium, NSAIDs, diuretics), sick-day & consistent fluid/salt teaching, narrow-margin adherence & lab monitoring, manic-'high' nonjudgmental adherence support, depressive-swing/suicide-risk transition, pregnancy-meds→provider, consistent limit-setting, monopolizer redirect, technician scope  → mh-core-24 (2026-08-02; builds on mh-core-03, numeric lithium level there)
- [x] EPS/NMS II — differentiating the EPS (acute dystonia airway emergency→anticholinergic, akathisia vs anxiety & why not to up-dose, parkinsonism fall risk, tardive dyskinesia potentially irreversible/early screening), NMS vs serotonin syndrome vs simple infection, priority deteriorating client, NMS response (hold/report + cooling/hydration/monitor), cautious provider-led restart, anticholinergic-treatment cautions, high-potency typical risk, nonverbal observation, nonjudgmental side-effect nonadherence, technician escalate/report role  → mh-core-25 (2026-08-02; builds on mh-core-06, base recognition/doses there)
- [x] Dementia II — behavior-as-communication/unmet-needs model, acute change from baseline = delirium-superimposed-on-dementia→report reversible triggers (UTI/dehydration/pain/constipation/hypoxia/meds), nonverbal pain cues, nonpharm-first + antipsychotic cautions (last-resort/lowest-dose/monitored), sundowning plan, catastrophic reaction, wandering/elopement/fall/aspiration safety w/o restraints, validation vs reality confrontation in advanced, dignity/person-centered communication, meaningful activity, caregiver burden/respite  → mh-core-26 (2026-08-02; builds on mh-core-07, geriatric med sensitivity in mh-core-18)
- [x] Autism II — ASD in the MH setting: sensory overload/environment, meltdown-as-overwhelm vs willful + de-escalation/safety, predictability & prepared transitions/visual supports, concrete/literal communication & AAC, stimming as self-regulation, special interests as engagement, avoiding diagnostic overshadowing (assess pain/illness behind new behavior), minimally-verbal pain cues, co-occurring anxiety, touch/space consent, elopement/bolting safety, food selectivity, positive reinforcement, caregiver collaboration  → mh-core-27 (2026-08-02; builds on mh-core-08, complements DD series dd-core-01/03/06)
- [x] Restraint II — clinical/trauma-informed MH angle: last resort for imminent danger & restraint reduction, least-restrictive continuum, danger vs disruption, positional-asphyxia prevention + respiratory-distress emergency recognition during restraint, continuous 1:1 monitoring, trauma-informed re-traumatization risk, proactive safety planning, earliest-safe discontinuation, never-for-convenience/punishment/short-staffing, high-risk populations, dignity/basic needs, coordinated team, debrief-for-prevention, reintegration, duty to report unsafe restraint  → mh-core-28 (2026-08-02; complements legal-core-01/03/06 order mechanics + dd-core-06 SIB/aggression crisis)
- [x] Med calculations — dosage-calc METHOD (all values given in-stem, answers are self-checking arithmetic; no real drug figures asserted): g/mg/mcg + lb-to-kg conversions, tablet & liquid desired-over-have, weight-based & divided doses, reconstitution volume, IV mL/hr and gtt/min (drop factor), days-supply, safe-dose range check + hold/clarify over-max orders, verify-before-give safety habit on unusual results  → mh-core-29 (2026-08-03; conversion factors 1g=1000mg, 1mg=1000mcg, 1kg=2.2lb; drug names generic/illustrative)
- [x] Diabetes II — psych-setting angle: hypoglycemia-first priority, hyperglycemic emergency recognition (fruity breath/Kussmaul/dehydration/confusion), antipsychotic metabolic effects (weight/glucose/new-onset diabetes → mh-core-06/10), check glucose when behavior change could be a low, rule-of-15 + follow-up snack, hypo unawareness & nocturnal lows, insulin omission in eating disorders, sick-day, alcohol/steroid glucose effects, mealtime-insulin-no-food, foot inspection w/ neuropathy/non-reporting, insulin high-alert, dementia monitoring, activity lows  → mh-core-30 (2026-08-03; builds on bnc-core-11, no numeric thresholds asserted)
- [x] Emergency II — psychiatric & psych-medication emergencies: define psych emergency, active suicide attempt + unresponsive-after-attempt (ABCs/BLS), intentional overdose response, recognizing NMS/serotonin syndrome/lithium toxicity/DTs/acute dystonia/anaphylaxis as urgent (x-ref mh-core-23/24/25), NOT mistaking medical (cardiac/hypoglycemia/hypoxia/infection) for "just anxiety/behavior", choking, high-risk elopement + violence as safety emergencies (x-ref mh-core-11/28), severe agitation w/ physical instability, scene safety, activate-within-scope, post-event documentation/debrief  → mh-core-31 (2026-08-03; builds on bnc-core-10, no numbers asserted)
- [x] Priority/delegation — clinical priority-setting skill: life-threats (ABC) then imminent safety (suicidality/violence), unstable-before-stable, unexpected-before-expected, needs-based framework, applied who-comes-first scenarios, appropriate delegation (routine/predictable/stable, in-scope) vs nursing-judgment tasks (assessment of unstable, care planning, initial teaching, evaluating/revising plan), decline-and-escalate untrained/out-of-scope, safe-delegation conditions, prompt escalation of new changes, never skip required safety (1:1 obs), reassessed time management, SBAR hand-off  → mh-core-32 (2026-08-03; complements legal-core-04 scope + bnc-core-15 SBAR)

**MH Phase-2 depth series COMPLETE (mh-core-21..32, 12 batches / 240 Q):** Suicide II, Psychosis II, Withdrawal II, Mania/lithium II, EPS/NMS II, Dementia II, Autism II, Restraint II, Med calculations, Diabetes II, Emergency II, Priority/delegation.

## Phase 3 (Months 21–24) — Refresh & exam forms
Spaced review, gap-fill from performance data, and additional blueprint-weighted
240-question exam forms.

**Format decision:** exam forms ship as 20-Q blueprint-weighted mixed-review batches
(one JSON case each, `category:"Comprehensive Review"`, per-step `stepTitle`/`domain`
tags the question's own domain). A full 240-Q "form" = 12 of these. Weighting per
batch ≈ MH 9 / BNC 4 / DD 4 / Legal 3. Answer key rebalanced 5/5/5/5 A–D.

### Phase-3 tracker — Comprehensive exam forms
- [x] Exam Form 1 — mixed blueprint (MH9/BNC4/DD4/Legal3): therapeutic communication, direct suicide assessment, NMS, lithium teaching, projection, panic intervention, verbal de-escalation, alcohol-withdrawal danger, hallucination response · hand hygiene, rule-of-15, early hypoxia (restlessness), choking · behavior-as-communication/SIB, seizure safety, dysphagia positioning, least-restrictive rights · 5150 criteria, mandated reporting on reasonable suspicion, confidentiality  → exam-form-01-lpt (2026-08-03; isFree=true; reviewed by Joseph Ongongo, LPT)
- [ ] Exam Form 2 · [ ] Exam Form 3 · [ ] Exam Form 4 · … (target ~12 forms = one full 240-Q equivalent)
