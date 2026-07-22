# Accessibility Conformance Statement — ScrubLife

**Product:** ScrubLife (NCLEX-RN/PN and California LPT exam-prep mobile app)
**Platforms:** iOS and Android (React Native / Expo)
**Standards referenced:** WCAG 2.1 Level AA; Section 508; California Government Code §7405
**Statement date:** 2026-07-09
**Status: Partial conformance — self-assessment (see Limitations)**

> This is a good-faith **self-assessment by the developer**, not a third-party audit and
> not a completed VPAT® certified by an accessibility vendor. It is provided so a college
> accessibility office can see exactly what has and has not been done.

---

## Supported accessibility features

**Screen reader (VoiceOver / TalkBack)**
- Answer options expose a `radio` role with checked/disabled state; the label announces
  the option letter, the full answer text, and — after grading — whether it was the
  correct answer or the learner's incorrect selection.
- Rationales are grouped and announced as "Correct answer. Rationale: …".
- Grading results use a polite live region, so "Correct / Incorrect" and the running
  score are announced automatically without the learner hunting for them.
- Submit and Next controls expose button roles, labels, disabled state, and hints.
- Track selectors expose a `tab` role with selected state, track name, and item count.
- Filter chips expose selected state and the number of matching items.
- Search fields, refresh, and back controls are labeled with hints.
- Case cards and question rows announce title, domain, lock status, item count, and
  best score.
- The exam-simulation toggle exposes a `switch` role with checked state.

**Touch targets**
- Interactive controls are laid out with a minimum height of 44px, meeting the common
  44×44 minimum target guidance.

**Privacy-related note**
- The app uses no accounts and stores learner progress on the device only, so there is
  no login flow to navigate and no student data transmitted.

---

## Known limitations (not yet conformant)

These are open items. We are not claiming conformance in these areas:

1. **No third-party audit or formal VPAT.** No external accessibility vendor has
   evaluated the product.
2. **Dynamic type / text resizing not fully verified.** Font sizes are fixed values;
   behavior at large OS text sizes has not been systematically tested and some layouts
   may clip or overflow.
3. **Color contrast not formally measured.** The interface uses a dark theme; contrast
   ratios have not been verified against the WCAG 2.1 AA 4.5:1 threshold across all
   text and state colors.
4. **Drag-to-rank interaction.** The NGN "rank" step relies on ordering interactions
   that have not been validated for screen-reader or switch-control operation, and may
   not currently be operable without vision.
5. **Reduced-motion and focus-visible behavior** have not been explicitly implemented.
6. **No captions/transcripts** — the app currently contains no audio or video content,
   so this is not applicable today, but would need to be addressed if media is added.

---

## Roadmap

| Item | Priority |
|---|---|
| Verify and fix color contrast to WCAG 2.1 AA | High |
| Make the NGN rank/classify steps fully operable without vision | High |
| Test and support OS dynamic type / large text | High |
| Third-party accessibility audit and formal VPAT | Medium |
| Reduced-motion support | Medium |

---

## Feedback and remediation

Accessibility barriers can be reported to the developer, and we commit to responding to
a partner institution's accessibility office and remediating reported barriers on an
agreed timeline. Contact: [developer name] — [email] — [phone].
