# LVN Content Plan & Coverage Map (NCLEX-PN aligned)

Roadmap for building **LVN-specific** NGN case content for the ScrubLife app. LVN
cases use the **NGN 6-step** format (NCSBN Clinical Judgment Measurement Model:
Recognize Cues → Analyze Cues → Prioritize → Generate Solutions → Take Action →
Evaluate Outcomes), identical in structure to the RN cases. New LVN gap-fill cases
are authored at **LVN scope** (data collection & reporting to the RN, reinforcing —
not initiating — teaching, delegating to CNAs/UAP while retaining accountability,
escalating rather than acting independently).

## Current state (why this plan exists)
As of 2026-08-03 the app has **no LVN-exclusive cases**. LVN students see the
**199 dual-tracked `RN,LVN` NGN cases**, which are pitched at RN altitude and — because
of the app's LPT/psych origin — are heavily skewed to Psychosocial content. The LVN
track needs gap-fill cases written to the **NCLEX-PN** blueprint and LVN scope.

## NCLEX-PN blueprint vs. current LVN-visible coverage
Current = distribution of the 200 LVN-visible cases (199 `RN,LVN` + 1 triple).
Source: NCSBN NCLEX-PN Test Plan (via UWorld NCLEX-PN test-plan summary).

| Client-needs category (PN) | PN target | Current | Current % | Verdict |
|---|---|---|---|---|
| **Coordinated Care** *(app: "Management of Care")* | **18–24%** | 9 | 4.5% | ▼▼ **biggest gap — top priority** |
| **Physiological Adaptation** | **7–13%** | 3 | 1.5% | ▼▼ **severe gap** |
| Pharmacological & Parenteral Therapies | 10–16% | 19 | 9.5% | ▼ under |
| Safety & Infection Control | 10–16% | 18 | 9% | ▼ slightly under |
| Basic Care & Comfort | 7–13% | 27 | 13.5% | ✓ ok (slightly high) |
| Reduction of Risk Potential | 9–15% | 30 | 15% | ✓ at top of range |
| Health Promotion & Maintenance | 6–12% | 26 | 13% | ▲ slightly over |
| **Psychosocial Integrity** | **9–15%** | 67 | 33.5% | ▲▲ **2–3× over — stop adding** |

**Note on naming:** NCLEX-PN calls the largest category **Coordinated Care**; the app's
existing cases use **"Management of Care"** as the `category` value. New LVN cases use
`category: "Management of Care"` to keep the home-screen grouping consistent, and note the
PN "Coordinated Care" mapping in the `reference`.

## Build priority (fill the gaps, don't add to the overflow)
1. **Coordinated Care / Management of Care** — LVN scope & delegation: prioritization,
   delegating to CNAs vs. what stays with the LVN/RN, supervision & accountability,
   escalation/reporting to the RN, LVN scope of practice, advance directives/code status,
   informed consent role, confidentiality, continuity/hand-off (SBAR), referrals.
2. **Physiological Adaptation** — medical emergencies & complications, fluid/electrolyte
   imbalance, common disease processes (respiratory, cardiac, GI, endocrine), recognizing
   and reporting deterioration.
3. **Pharmacological & Parenteral Therapies** — safe med administration, high-alert drugs,
   expected effects/side effects, LVN med scope, dosage-safety checking.
4. **Safety & Infection Control** — precautions, PPE, safe environment, error prevention.
5. **Hold:** Psychosocial (over), Health Promotion (slightly over), Basic Care & Reduction
   of Risk (adequate) — add only if a specific sub-topic is genuinely missing.

## Tracker — LVN gap-fill cases
### Coordinated Care / Management of Care
- [x] MOC-01 Coordinating an SNF shift — LVN scope, delegation to a CNA, prioritization, and escalating a change in condition + code-status discrepancy to the RN  → lvn-moc-01 (2026-08-03; isFree=true; NGN 6-step; tracks:["LVN"])
- [ ] MOC-02 Delegation & the 5 rights of delegation (what can/can't go to a CNA) · [ ] MOC-03 Advance directives, code status & informed-consent role · [ ] MOC-04 SBAR hand-off & continuity · [ ] MOC-05 Prioritization across a multi-client assignment

### Physiological Adaptation
- [ ] PA-01 Respiratory deterioration · [ ] PA-02 Fluid/electrolyte imbalance · [ ] PA-03 Cardiac · [ ] PA-04 Endocrine emergency (DKA/hypoglycemia) · [ ] PA-05 GI/fluid loss

### Pharmacological & Parenteral Therapies
- [ ] PHARM-01 High-alert meds & safe administration · [ ] PHARM-02 Expected effects vs. adverse effects · [ ] PHARM-03 LVN med-administration scope

### Safety & Infection Control
- [ ] SIC-01 Transmission-based precautions & PPE · [ ] SIC-02 Error prevention & safe environment

## Authoring notes
- Copy the schema from a current `RN,LVN` NGN case (e.g., `case-016.json`) or from
  `lvn-moc-01.json`; validate with `scripts/validate_cases.py` before commit.
- Every `labs[]` entry needs its `.f` flag; keep values to standard reference ranges and
  flag exact figures for faculty confirmation in `reference`.
- Write to **LVN scope** — this is what differentiates LVN gap-fill cases from the shared
  RN,LVN pool.
