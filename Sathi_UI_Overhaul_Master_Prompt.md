# SATHI — MASTER UI OVERHAUL PROMPT
### (Paste this whole document as the task prompt for the build agent / coding session)

You are working inside the real `sharonjoseph12/Sathi` repository — React 19.2, Vite, TypeScript, Tailwind CSS v4, a hash-routed `App.tsx` shell, and `screens/`, `components/`, `lib/` folders that already contain working functionality (medicine tracking, AI chat, symptom triage, caregiver dashboard, drug checker, SOS, etc.). This is **not a greenfield build**. You are overhauling the visual and interaction layer on top of a real backend (FastAPI) that stays untouched.

Three documents already define the target. Treat them as binding, in this priority order if anything conflicts:

1. `Sathi_Frontend_Architecture_and_WBS.md` — the accessibility rules (WCAG 2.1 **AAA**, not AA), the file-ownership map, and the adaptive-profile architecture. These are hard rules, not style suggestions.
2. `Sathi_Frontend_UIUX_PRD.md` — the design tokens, component specs, and feature-to-screen mapping.
3. `SATHI_Refined_Product_Blueprint.md` + `Sathi_Technical_Analysis_and_Roadmap.md` — product intent and what already works and must not regress.

Your mission: turn this into a frontend that looks and feels like a funded health-tech product, not a hackathon MVP — while shipping **zero feature regressions** and meeting every AAA accessibility rule below. Beautiful and accessible are not in tension here; the constraints in Section 2 are what produces "professional," not a departure from them.

---

## 0. Non-negotiables — read before writing any code

- Do not rewrite the backend. Do not change API contracts in `lib/api.ts` beyond wrapping them in TanStack Query hooks.
- Do not fork screens per persona (`screens/elder/*` must never exist). Every adaptive behavior is a **render variant inside a shared component**, selected by one hook: `useAdaptiveProfile()`.
- Every feature listed in the Feature-to-Screen map (PRD §3) must still work after the overhaul. If you can't verify a feature still works, don't mark the task done — flag it.
- Every screen you touch must pass the Section 2 accessibility checklist below before it's considered finished. This is a merge gate, not a follow-up task.
- No emoji anywhere in production UI. Lucide React icons only, every icon-only control gets an `aria-label`.

---

## 1. Design System — implement this exactly

### 1.1 Tokens (CSS variables, both modes required from day one)

```css
:root {
  /* light mode */
  --bg: #fafafa;
  --surface: #ffffff;
  --surface-sunken: #f4f4f5;
  --border: #e4e4e7;
  --ink: #18181b;
  --ink-muted: #71717a;
  --primary: #4f46e5;
  --primary-soft: #eef2ff;
  --ai-accent: #7c3aed;
  --success: #059669; --success-bg: #ecfdf5;
  --warning: #d97706; --warning-bg: #fffbeb;
  --danger:  #dc2626; --danger-bg:  #fef2f2;

  /* elevation (see Section 3 — "spatial" system) */
  --elev-0: none;
  --elev-1: 0 1px 2px rgba(24,24,27,0.04);
  --elev-2: 0 2px 8px rgba(24,24,27,0.06), 0 1px 2px rgba(24,24,27,0.04);
  --elev-3: 0 8px 24px rgba(24,24,27,0.10), 0 2px 6px rgba(24,24,27,0.06);
  --elev-4: 0 16px 40px rgba(24,24,27,0.14);
}

.dark {
  --bg: #09090b;
  --surface: #18181b;
  --surface-sunken: #27272a;
  --border: #27272a;
  --ink: #fafafa;
  --ink-muted: #a1a1aa;
  --primary: #818cf8;
  --primary-soft: #1e1b4b;
  --ai-accent: #a78bfa;
  --success: #34d399; --success-bg: #052e22;
  --warning: #fbbf24; --warning-bg: #3a2a05;
  --danger:  #f87171; --danger-bg:  #3a0d0d;

  --elev-1: 0 1px 2px rgba(0,0,0,0.4);
  --elev-2: 0 2px 8px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.3);
  --elev-3: 0 8px 24px rgba(0,0,0,0.55), 0 2px 6px rgba(0,0,0,0.3);
  --elev-4: 0 16px 40px rgba(0,0,0,0.6);
}

.elder {
  /* overrides applied in addition to light/dark, per accessibilityFlags */
  --ink-muted: var(--ink); /* no low-contrast secondary text at all in elder mode */
  --border-width-base: 2px;
}
```

Border/text contrast against `--bg`/`--surface` must hit **7:1 for normal text, 4.5:1 for large text** (WCAG AAA 1.4.6) in **both** light and dark mode — verify with an automated contrast checker on every token pair above, not just the light-mode set.

### 1.2 Light/dark mode toggle — build this as a real, working feature

- A `ThemeToggle` component (sun/moon Lucide icons, animated crossfade via Framer Motion, ~200ms) lives in the top bar on every screen and in Settings.
- On first load, default to `prefers-color-scheme` (`window.matchMedia('(prefers-color-scheme: dark)')`). Once the user picks explicitly, persist the choice (`localStorage.theme = 'light' | 'dark' | 'system'`) and respect it on every subsequent load — this is real app persistence, not a Claude-artifact context, so `localStorage` is correct here.
- Apply the mode by toggling a `.dark` class on `<html>` (not per-component conditionals) so every Tailwind `dark:` utility and every CSS variable in 1.1 switches in one place.
- Toggling must not flash the wrong theme on load — set the class synchronously before first paint (inline script in `index.html` reading `localStorage`, before React hydrates).
- Every custom SVG in the app (the `Ring` adherence component, any illustration) must reference `currentColor` or the CSS variables above — never a hardcoded hex — so it correctly re-themes.

### 1.3 Typography

Inter, kept as-is. Scale:

| Role | Size/LH | Weight |
|---|---|---|
| Display | 26/32 | 700 |
| H1 | 20/26 | 700 |
| H2 (section label) | 13/18 | 600, sentence case, `--ink-muted`, never all-caps |
| Body | 15/22 | 400 |
| Body strong | 15/22 | 600 |
| Small/metadata | 13/18 | 500 |
| Numeric display | 32/36 | 800, tabular-nums |

**Elder mode:** every size steps up one tier (body → 17/26, H1 → 24/30), line length capped ~50 characters, base font-size ≥20px per the WBS.

### 1.4 Spacing

4px base unit. Screen gutters 20px mobile / 32px desktop. Fixed 28px vertical rhythm between sections. `rounded-2xl` (16px) on every card, no exceptions at the same visual level.

---

## 2. Accessibility — WCAG 2.1 AAA, hard gate on every screen

Copy this checklist into every PR description and check it explicitly:

- [ ] Text contrast 7:1 normal / 4.5:1 large, in **both** light and dark mode
- [ ] No meaning conveyed by color alone — every status has an icon or text label alongside the color
- [ ] Elder mode: base font ≥20px, near-black/white contrast, no gray-on-gray text
- [ ] Reflows correctly at 200% zoom, no horizontal scroll, no content loss
- [ ] No images of text
- [ ] Line length capped ~60–80 chars (50 in elder mode), line-height ≥1.5, never fully justified
- [ ] Every actionable element ≥44×44 CSS px, ≥8px spacing between adjacent targets
- [ ] No action requires a drag gesture — every action has a tap or voice equivalent
- [ ] Elder nav capped at 5 items; one primary action per screen
- [ ] Every link/button label is meaningful out of context (no bare "Tap here")
- [ ] Elder-mode copy at/below lower-secondary reading level, routed through the existing jargon-simplifier by default
- [ ] `prefers-reduced-motion` respected everywhere; `Confetti` and `Ring` animations have a static fallback
- [ ] No auto-advancing/auto-dismissing actionable content; no session timeout without an extend option
- [ ] Every icon-only control has an `aria-label`
- [ ] Skip link and `main`/`nav` landmarks survive every screen split
- [ ] `aria-live="polite"` on symptom-triage state changes and caregiver alerts

Run `axe-core` in CI against every route. A screen does not merge with an open AAA violation.

---

## 3. "Spatial" UI — the elevation & depth system

This is the concrete spec for "spacial/professional" feel — it comes from disciplined depth, not decoration:

- **Four elevation levels only** (`--elev-1` through `--elev-4` from Section 1.1). Nothing gets a shadow outside this scale.
  - `--elev-1`: resting cards (flat, informational)
  - `--elev-2`: interactive/tappable cards, raises to `--elev-3` on hover/focus (desktop) or active press (mobile scales to `0.99` instead)
  - `--elev-3`: floating elements — FAB (scan button), toasts, the voice input button
  - `--elev-4`: modals, sheets, the profile switcher popover — anything in its own visual layer above the page
- **Backdrop blur** (`backdrop-blur-xl` + `bg-surface/80`) on the top bar and bottom nav so content visibly passes underneath them on scroll — this is the one "glass" moment in the system, used consistently in exactly two places, not scattered everywhere.
- **Z-index scale**, fixed and documented, not ad hoc: `base:0 · nav:10 · dropdown:20 · sheet:30 · dialog:40 · toast:50`.
- Sheets and dialogs get a scrim (`bg-black/40` light, `bg-black/60` dark) behind them at `--elev-4`, and content beneath the scrim is inert (`inert` attribute or focus-trap) — this is both the "depth" effect and an accessibility requirement (2.4.3) at once.

---

## 4. Component & stack requirements

Install and wire: **shadcn/ui** (Dialog, Sheet, DropdownMenu, Tabs, Popover, Table — copied into `components/ui/`, not imported as a black box), **Lucide React**, **Framer Motion**, **TanStack Query** (wrapping `lib/api.ts`), **Zustand** (ephemeral UI state: drawer/toast/profile-switcher state — keep existing `lib/store.tsx` Context for auth/session), **sonner** (toasts), **React Hook Form + Zod** (onboarding, add-medicine, care-circle invite forms), **React Router v6** (replacing the hash router, enabling per-route code-splitting via `React.lazy`).

Build the adaptive core first — everything else depends on it:

```ts
// lib/useAdaptiveProfile.ts
type Density = "elder" | "standard" | "caregiver";
type Profile = {
  ageBand: "elder" | "adult" | "young_adult" | "guardian";
  role: "patient" | "caregiver" | "guardian";
  digitalLiteracy: "low" | "medium" | "high";
  urgencyLevel: "normal" | "monitor" | "escalate";
  accessibilityFlags: ("large_text" | "high_contrast" | "voice_primary" | "reduced_motion")[];
};
function useAdaptiveProfile(): { profile: Profile; density: Density } { /* ... */ }
```

Ship this as a typed stub on day one so every other component can build against it immediately, then swap in the real logic without touching consuming components.

---

## 5. Voice — must be fully functional, not a decorative mic icon

Voice is a first-class input method per the product blueprint ("voice-first, touch/text fallback, voice never mandatory"), and it is explicitly required to work end-to-end, not just render a button. Build the full pipeline:

### 5.1 States and component

Build a single `VoiceInputButton` with four explicit visual states, each distinct enough to read at a glance (not just a color change):

1. **Idle** — mic icon, `--elev-3`, resting.
2. **Listening** — animated waveform/pulse ring around the button (Framer Motion, respects `prefers-reduced-motion` with a static "Listening…" label fallback), live partial transcript shown above the button as the user speaks.
3. **Processing** — spinner replaces the waveform, button disabled, "Thinking…" label.
4. **Speaking** (TTS playback) — a distinct animated state (e.g. gentle equalizer bars) so the user can tell the assistant is talking versus listening.

### 5.2 Wiring — real implementation, not a stub

- **Primary path (browser):** Web Speech API (`SpeechRecognition`/`webkitSpeechRecognition` for STT, `speechSynthesis` for TTS) — already partially used in the repo per the Technical Analysis; wire it fully into the new `VoiceInputButton` with correct start/stop/error event handling.
- **Fallback/production path:** the backend already exposes Groq Whisper STT and `edge-tts` TTS (per the Technical Analysis, 12 languages configured) — wire the client to fall back to these endpoints when `SpeechRecognition` is unsupported (e.g. Firefox, most non-Chromium browsers) or when it errors mid-session. This fallback must be automatic, not require the user to know their browser doesn't support it.
- **Permissions:** on first use, request `microphone` permission with a clear pre-permission explainer ("Sathi needs your microphone to hear your question") — never trigger the native browser permission prompt with no context first. Handle all three outcomes explicitly: granted, denied, and dismissed — denied/dismissed shows a persistent, non-blocking inline message with a link to browser settings, and silently falls back to text input so the flow is never dead-ended.
- **Network failure:** if the voice pipeline fails mid-request (no connection, backend timeout), fail gracefully to a toast ("Couldn't hear that — try typing instead") and re-enable text input immediately — never leave the UI stuck in "Processing."
- **Elder / `voice_primary` accessibility flag:** when set, `VoiceInputButton` renders as the large, primary action on every screen that supports it (Today's symptom report, Ask Sathi, medicine confirmation) — not a small icon in a corner — with text/tap always available as a fallback beneath it, never removed.
- **Live regions:** the live partial transcript and any "Listening…"/"Processing…" state text must be in an `aria-live="polite"` region so screen-reader users get the same real-time feedback sighted users get from the waveform.

### 5.3 Definition of done for voice

Voice is only "done" when all of the following are true in a real browser test, not just code review:

- [ ] Tapping the mic requests permission with an explainer first
- [ ] Speaking produces a live partial transcript on screen
- [ ] Releasing/pausing produces a final transcript that's actually sent and acted on (symptom logged, chat message sent, medicine confirmed — whichever screen it's on)
- [ ] The assistant's spoken reply plays back audibly (TTS) with a visible "speaking" state
- [ ] Denying the mic permission does not break the screen — text input still works
- [ ] Tested in at least one Chromium browser (native `SpeechRecognition`) and one non-Chromium browser (must hit the backend fallback path successfully)

---

## 6. Build sequence

Follow the WBS's ownership map (`Sathi_Frontend_Architecture_and_WBS.md` §3) for what maps to what, but execute in this order regardless of how many people/agents are working:

1. **Foundation** — tokens (§1), theme toggle (§1.2), elevation system (§3), `useAdaptiveProfile()` stub, rebuilt primitives (`Card`, `Btn`, `Input`, `Badge`, `Ring`, `Toggle`) as profile-aware variants.
2. **Today + Medicines + Ask Sathi** — highest-traffic screens, including the full `VoiceInputButton` pipeline (§5).
3. **Caregiver dashboard** — attention-needed list, alert-feedback loop.
4. **Remaining screens** — grouped, categorized "More" (replacing the flat 18-item list), Emergency card, Journal/Wellbeing, Settings.
5. **Adaptive logic goes live** — swap the Section 4 stub for real profile data; smoke-test every screen against real (not mocked) profiles.
6. **Accessibility + voice + theme hardening pass** — run the Section 2 checklist and Section 5.3 voice checklist against every screen; fix findings before calling anything done.
7. **Demo rehearsal** — the live profile-switch sequence (elder → standard → caregiver, same data) plus a full voice interaction, in both light and dark mode, end to end.

---

## 7. Definition of done (whole overhaul)

- [ ] Every feature in the PRD's Feature-to-Screen map still works, verified by manual click-through, not assumed from code review.
- [ ] Light/dark toggle works everywhere, persists across reload, respects system preference on first load, no flash-of-wrong-theme.
- [ ] Voice pipeline passes every item in §5.3, in at least two different browsers.
- [ ] Every screen passes the full §2 AAA checklist.
- [ ] The elder → standard → caregiver profile-switch demo works live, rendering the same underlying data through different component variants with zero data mismatch.
- [ ] No emoji, no hardcoded hex colors outside the token file, no screen with more than one visually dominant element.
- [ ] Initial route bundle is code-split (`React.lazy`) and each screen loads independently.
