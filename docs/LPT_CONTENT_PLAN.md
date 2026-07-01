# LPT (California Psychiatric Technician) — State-Exam Content Plan

The LPT track uses the **state-exam format**: standalone single-best-answer
multiple-choice questions (`format:"mc"`, schema in [CLAUDE.md §6b](../CLAUDE.md)).
Cases live in `src/data/cases/*-lpt.json` and are shown in the app's dedicated
**LPT State-Exam** area, grouped by PSI content domain.

## Content domains

The PSI-administered California LPT exam covers four content areas:

1. **Basic Nursing Care** — fundamentals, infection control, vital signs, basic pharmacology, safety, nutrition, elimination, mobility, documentation.
2. **Mental Health Care** — psychiatric disorders, therapeutic communication, crisis intervention, psychotropic meds, milieu/behavioral interventions, substance use.
3. **Developmental Disabilities** — support strategies, therapeutic programming, ADLs/skill-building, behavior support plans, abuse/neglect recognition in the IDD population.
4. **Legal & Ethical** — Lanterman-Petris-Short (LPS) Act, 5150/5250 holds, patient rights, informed consent, confidentiality, mandated reporting, scope of practice.

> ⚠️ **Verify blueprint weighting** against the current *LPT Examination Candidate
> Information Bulletin* (CA DCA / Office of Professional Examination Services) before
> treating any percentage split as authoritative. The targets below are a reasonable
> study balance, not official exam weights.

## Current coverage (as of this plan)

| Domain | Question sets | Status |
|---|---|---|
| Mental Health Care | 63 | ✅ Strong |
| Developmental Disabilities | 2 | ⚠️ Thin |
| Legal & Ethical | 2 | ⚠️ Thin |
| Basic Nursing Care | 0 | ❌ Missing |

All existing LPT sets were derived from psych/behavioral NGN cases, hence the heavy
Mental Health skew. To feel like real state-exam prep, the other three domains need
dedicated content.

## Target balance (study-balanced, ~1 set ≈ 8–12 questions)

| Domain | Target sets | Add |
|---|---|---|
| Mental Health Care | ~40 (trim/keep) | keep |
| Basic Nursing Care | ~25 | **+25** |
| Developmental Disabilities | ~15 | **+13** |
| Legal & Ethical | ~15 | **+13** |

## Topics to author (all standard, board-safe)

**Basic Nursing Care** (highest priority — currently zero):
- Hand hygiene & standard/transmission-based precautions
- Vital sign measurement, normal ranges, when to report
- Medication rights & routes (PO/IM/SQ); reading an MAR
- Basic pharmacology: acetaminophen, insulin basics, common PRN meds
- Fall prevention & safe patient handling / body mechanics
- Intake/output, basic nutrition & feeding assistance, aspiration precautions
- Skin integrity / pressure-injury prevention, positioning
- Bowel/bladder elimination basics, specimen collection
- Documentation & handoff (SBAR), incident reporting

**Developmental Disabilities**:
- Person-centered support & communication for IDD clients
- Positive behavior support plans vs restrictive interventions
- ADL skill-building & adaptive equipment
- Seizure precautions & safety in the IDD population
- Recognizing & reporting abuse/neglect (mandated reporting)
- Feeding/dysphagia safety; constipation risk with common meds
- Community integration & least-restrictive environment

**Legal & Ethical**:
- LPS Act overview; 5150 (72-hr) vs 5250 (14-day) holds
- Patient rights on a psychiatric hold (rights that cannot be denied)
- Informed consent & the LPT's witnessing role; refusal of treatment
- Confidentiality / HIPAA; when disclosure is permitted (Tarasoff duty to warn)
- Restraint & seclusion law + documentation requirements
- Mandated reporting (child/elder/dependent-adult abuse)
- LPT scope of practice vs RN; when to escalate

**Mental Health Care** (already strong — fill any missing high-yield topics):
- Neuroleptic malignant syndrome vs serotonin syndrome recognition
- Lithium & valproate monitoring/toxicity
- Alcohol/benzo/opioid withdrawal management
- De-escalation & the assault cycle
- ECT pre/post care; suicide risk & safety planning

## How to generate

1. **Author directly** in the §6b MC schema as `src/data/cases/<slug>-lpt.json` —
   `format:"mc"`, `tracks:["LPT"]`, correct `domain`, 8–12 `single` questions,
   exactly one `c:true` per question, real rationales.
2. Or **extend the daily workflow** (`.github/workflows/daily_cases.yml`) so LPT-track
   runs emit the MC schema and rotate through the domains above (see CLAUDE.md §6b/§3).
3. Validate before shipping: `node scripts/publish-cases.js` must report all cases pass,
   then commit `docs/cases.json`.

**Anti-hallucination:** keep to standard scope/dosing; when unsure of a drug dose or a
legal specific, pick a more foundational item and get it exactly right (CLAUDE.md §1).
