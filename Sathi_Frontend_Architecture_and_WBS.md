# Sathi — Elder-Adaptive Frontend Architecture & 4-Developer Work Breakdown

**Scope note:** This plan is grounded in the actual `sharonjoseph12/Sathi` repository (React 19.2 + Vite + TypeScript + Tailwind CSS v4, hash-routed `App.tsx` shell, `screens/`, `components/`, `lib/`) rather than a hypothetical greenfield stack — so the framework is fixed (React), and every workstream below maps onto real files that already exist today. Where the repo already does something right (44px touch targets on `Btn`/`Input`, a skip link and ARIA landmarks in `App.tsx`, an offline banner), the plan extends it rather than replacing it.

---

## 1. Architecture Overview

Sathi's differentiator is **one adaptive rendering layer over one data model**, not four separate builds for four audiences. A single `Profile` object —

```
ageBand            elder | adult | young_adult | guardian
role               patient | caregiver | guardian
digitalLiteracy    low | medium | high
urgencyLevel       normal | monitor | escalate
accessibilityFlags large_text | high_contrast | voice_primary | reduced_motion
```

— is read through one hook, `useAdaptiveProfile()`, and every screen/component branches its **variant**, not its **codebase**, off that hook. A `MedicineCard` has 2–3 render variants; the backend, the API client, and the data it displays never change. This is why frontend-only work (this plan) can proceed in parallel across 4 people without touching `backend/` at all — the API surface is stable.

Two structural things follow from that:

- **The adaptive hook is a dependency, not a feature.** Whoever owns it ships a typed contract on day one (even before the real logic is done), so the other three streams build against a stub and swap in the real implementation later without rewriting anything.
- **Nothing gets forked per audience.** "Elder mode" is a render branch inside the shared component, never a parallel `screens/elder/*` tree — that's the exact anti-pattern the product brief calls out (`8.4`, "separate native apps per age group... must remain one adaptive codebase").

One existing gap worth flagging up front: the current `More` screen (`App.tsx`) is a flat list of 18 items — the opposite of the "don't show a feature, show a need" progressive-disclosure principle this plan is built around. Elder-mode profiles should never render that flat grid; they get the 5-item capped nav described below instead. That reconciliation is explicitly assigned in Section 3.

---

## 2. Design System & Accessibility Guidelines (WCAG 2.1 AAA)

These are hard rules, not aspirations — every workstream's PRs get checked against this list (Dev 4 owns enforcement, Section 4).

**Color & contrast**
- Text contrast **7:1** for normal text, **4.5:1** for large text (≥18pt / ≥14pt bold) — WCAG 1.4.6, stricter than the common 4.5:1/3:1 AA bar.
- Never encode meaning by color alone. `NORMAL`/`MONITOR`/`ESCALATE` and taken/pending states must keep an icon or text label alongside the color (the existing `Badge` component already prefixes state with ⚠/● — keep and extend that pattern for any new indicator).
- Elder mode gets its own high-contrast token set (near-black on white/cream, no gray-on-gray secondary text) — not just a darker tint of the standard palette.

**Typography**
- Elder-mode base font size **≥20px** (the current shell uses 13–15px utility text in several places — that's a standard-mode size, not an elder-mode one).
- Text must reflow and stay usable at 200% zoom with no loss of content or horizontal scroll (1.4.4 / 1.4.8).
- No images of text, ever, no exceptions (1.4.9 AAA) — the icon set is already SVG, which is correct; keep it that way.
- Line length capped (~60–80 characters), line-height ≥1.5, no full justification (1.4.8).

**Touch targets & interaction**
- **44×44 CSS px minimum** for every actionable element (2.5.5 AAA), with ≥8px spacing between adjacent targets. `Btn` and `Input` already hit this via `min-h-[44px]` — the rule is to carry that forward into every new component, and treat any smaller tap target as a regression, not a style choice.
- No action requires a drag gesture; every action has a single-tap or voice equivalent.

**Navigation & structure**
- Elder profile: **5 nav items max** (Today, Medicines, Appointments, Ask Sathi, Emergency), one primary action per screen.
- Consistent nav placement and always-visible location context (2.4.8 AAA).
- Every link/button label is meaningful out of context — no bare "Tap here" or "Learn more" (2.4.9 AAA).

**Content & reading level**
- Elder-mode copy at or below lower-secondary reading level (3.1.5 AAA). This isn't new work — it should route through the existing jargon-simplifier logic by default for elder profiles, not as an opt-in toggle.
- Yes/No/Not-sure interaction patterns replace open-text forms wherever the product brief specifies it for elder flows.

**Motion & timing**
- Respect `prefers-reduced-motion`; the existing `Confetti` burst and `Ring` stroke-animation need a reduced-motion fallback (2.3.3 / 2.2.2 AAA).
- No auto-advancing or auto-dismissing content for anything actionable; no session timeout without an extend option (2.2.3 / 2.2.4 AAA).

**Assistive technology**
- Every icon-only control gets an `aria-label` — extend the pattern already on the "Go home" button and the offline banner's `role="alert"`.
- Keep the existing skip link and `main`/`nav` landmarks through every refactor; don't let a screen split silently drop them.
- `aria-live` regions for symptom-triage state changes and caregiver alerts — these are safety-relevant and must reach screen-reader users without requiring a manual focus move.

---

## 3. 4-Person Work Breakdown Structure (WBS)

### Ownership map — no two developers touch the same file

| File / Screen (current) | Split into | Owner |
|---|---|---|
| `lib/store.tsx` + new `lib/useAdaptiveProfile.ts` | Profile state + hook | **Dev 1** |
| `components/ui.tsx`, `icons.tsx`, `ErrorBoundary.tsx`, `index.css` tokens | AAA-compliant primitives + design tokens | **Dev 1** |
| `screens/auth.tsx` (partial) | new `screens/onboarding.tsx` (profile capture) | **Dev 1** |
| `screens/auth.tsx` (partial) | `login.tsx`, `register.tsx` | **Dev 2** |
| `screens/tabs.tsx` (partial) | `home.tsx`, `medicines.tsx`, `symptoms.tsx` | **Dev 2** |
| `App.tsx` (Shell/bottom nav) | adaptive nav shell | **Dev 3** |
| `screens/care.tsx` | `CareDash`, `PatientDetail`, `CreatePlan`, `FamilyDash` | **Dev 3** |
| `screens/tabs.tsx` (partial) | `schedule.tsx`, `progress.tsx`, `followups.tsx`, `timeline.tsx` | **Dev 3** |
| `screens/tools.tsx` | `Scan`, `Chat`, `DrugChecker`, `Simplify` | **Dev 4** |
| `screens/sos.tsx` | Emergency card + SOS | **Dev 4** |
| `screens/well.tsx` | `Journal`, `Meditation` | **Dev 4** |
| `screens/more.tsx` | `Settings`, `Notifications`, `Reminders`, `Plans`, `Report`, `Help`, `Demo` | **Dev 4** |

### Dev 1 — Adaptive Core & Design System (Foundation)
Narrow scope, ships first, blocks everyone else — that's the trade for owning fewer files.
- Extend the `Me`/profile type with `ageBand`, `digitalLiteracy`, `accessibilityFlags`, `urgencyLevel`; build `useAdaptiveProfile()`.
- Rebuild `Card`, `Btn`, `Input`, `Badge`, `Ring`, `Toggle` as profile-aware (elder / standard / caregiver render variants), against the Section 2 rules.
- Own the design-token layer in `index.css` (contrast-safe palette, elder type scale, reduced-motion variants).
- Build the onboarding profile-capture step, designed for caregiver-assisted setup (per the product brief's reality check — most elderly users won't self-onboard).
- **Deliverable by end of Day 1**: a typed `useAdaptiveProfile()` stub (even before the real logic works) that Devs 2–4 can import immediately.

### Dev 2 — Patient Core Experience (Elder-First Screens)
The flagship demo surface — same record, three densities.
- `login.tsx` / `register.tsx`.
- `home.tsx` — the "Today" engine (Section 7 of the product brief: one question, "what matters right now," not a dashboard).
- `medicines.tsx`, `symptoms.tsx` — adherence tracking and voice/text symptom triage, rendered through Dev 1's variants.
- Owns getting the elder large-button/voice-first/single-action pattern right on the highest-traffic screens first.

### Dev 3 — Navigation Shell, Caregiver & Family
- `App.tsx` Shell: the adaptive bottom nav (5-item elder cap vs. standard/caregiver tab sets), role-based filtering, and the progressive-disclosure fix for the current flat `More` grid.
- `care.tsx` — caregiver "attention needed" list (two categories only: needs action now, everything-else-is-fine), plus the alert-feedback-loop UI ("mark as not urgent") called out as the direct fix for alert fatigue.
- `schedule.tsx`, `progress.tsx`, `followups.tsx`, `timeline.tsx`.

### Dev 4 — Support Tools, Safety & Accessibility QA
Lower per-screen complexity (mostly forms and lists, not multi-variant rendering) balances out owning the cross-cutting QA role.
- `tools.tsx` (Scan, Chat, Drug Checker, Simplify), `sos.tsx` (Emergency card — high value, low build cost, exactly for this audience), `well.tsx`, `more.tsx`.
- Owns the shared accessibility test harness: automated contrast/target-size checks (e.g. `axe-core` in CI), one manual screen-reader pass per screen, and the Section 2 checklist as the actual PR merge gate for the other three streams — not just their own code.

---

## 4. Milestones & Integration Strategy

| Phase | What happens |
|---|---|
| **Day 0 — Split & contract** | One short pairing session (not parallel) mechanically splits `tabs.tsx`, `auth.tsx`, and `more.tsx` into the files in the ownership map above, and pushes it as a single prerequisite commit. Dev 1 pushes the typed `useAdaptiveProfile()` stub in the same window. Everyone branches from here — this is what makes "no overlapping conflicts" actually true in git, not just on paper. |
| **Days 1–3 — Parallel build** | Each stream builds against Dev 1's stub and the Section 2 checklist. No cross-stream file edits; if Dev 2 needs a new primitive, they request it from Dev 1 rather than adding it to `ui.tsx` themselves. |
| **Mid-point checkpoint** | Dev 1's real adaptive logic replaces the stub. Everyone rebases and smoke-tests their screens against real profile data instead of mocks — this is the one moment all four streams touch the same shared file (`useAdaptiveProfile.ts`) on the same day, so schedule it as a sync point, not a surprise. |
| **Accessibility hardening pass** | Dev 4 runs the automated + manual checklist across all screens; each owner fixes findings in their own files. This is a gate, not a suggestion — no screen merges to main un-audited. |
| **Final integration & demo rehearsal** | Full run-through of the live profile-switch demo: open on elder view → switch to standard/adult → switch to caregiver, same underlying data each time. This sequence is the single moment that sells the whole architecture, so it gets an explicit rehearsal slot, not just a hope that it works on the day. |

**Merge mechanics:** one short-lived branch per developer, small frequent PRs rather than one big end-of-build merge. Dev 1 reviews any PR that consumes `useAdaptiveProfile()` for correct usage; Dev 4 reviews every PR for the Section 2 checklist. This two-reviewer pattern (contract owner + accessibility owner) catches the two failure modes that actually cause rework — a mis-used hook and a missed AAA rule — without requiring all four people to review everything.
