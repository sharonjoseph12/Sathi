# SATHI — Refined Product Blueprint (v2)

**Status:** Refined synthesis of the original product brief and the existing hackathon PRD, reconciled against the current state of the `sharonjoseph12/Sathi` repository.
**Tagline:** Healthcare that adapts to the person, not the other way around.

> **One-line definition:** Sathi is a post-discharge recovery companion whose interface, safety behavior, and information density adapt to the age, role, and digital literacy of the person using it — one platform, many faces, built around a disciplined recovery core rather than a general-purpose everyday-health super-app.

---

## 1. Problem Statement

Hospital care ends at discharge. Recovery does not.

A discharged patient leaves with medicines, dosage instructions, follow-up dates, restrictions, warning signs, and documents — much of it in language that assumes a level of literacy, digital comfort, or family support the patient may not have. From that point on, responsibility for adherence, symptom awareness, and knowing when something is wrong shifts almost entirely onto the patient and their family.

That responsibility is fragmented across paper prescriptions, WhatsApp messages, hospital portals, memory, and scattered conversations with relatives. Existing tools don't close the gap:

- **Reminder apps** know a time, not a recovery plan.
- **Generic AI chatbots** aren't grounded in the patient's actual data or a safety workflow.
- **Hospital portals** are built for the hospital's records, not the patient's daily life.
- **Caregiver messaging** has no structured timeline or escalation logic behind it.

And underneath all of this sits a second, quieter problem: **almost every health app assumes one kind of user.** A 68-year-old recovering from surgery, their 35-year-old daughter coordinating care, and a 22-year-old managing their own prescriptions should not have to use the same screen, the same density of information, or the same interaction model. Most products force them to anyway.

---

## 2. Core Solution

Sathi converts a recovery or care plan into a simple daily rhythm — what to take, what to do, what to report — and delivers that rhythm through whichever interface actually works for the specific person using it: large-button, voice-first, and minimal for a grandparent; dense and fast for a caregiver tracking multiple people; quiet and low-frequency for a healthy young adult who only needs the app twice a year.

The same underlying data. A different experience for every person who touches it.

---

## 3. What Sathi Is — and Is Not

**Sathi is:**
- A personal recovery and health-organization companion
- An adaptive interface layer that reconfigures itself by who's using it
- A voice-first interaction system (with full touch/text fallback — voice is never mandatory)
- A deterministic safety and escalation system, assisted by AI, not run by it
- A consent-based bridge between patient, family, and caregiver

**Sathi is not:**
- An AI doctor, diagnosis engine, or prescription generator
- A hospital ERP or EHR replacement
- A generic chatbot
- A fitness tracker or wellness super-app
- A social network

---

## 4. The Central Innovation — Adaptive Interface

Most health apps expect the user to adapt to the interface. Sathi reverses this: **the interface adapts to the person.**

Adaptation is driven by a small set of profile variables, not by four separate codebases:

```
ageBand            elder | adult | young_adult | guardian
role               patient | caregiver | guardian
digitalLiteracy    low | medium | high
urgencyLevel       normal | monitor | escalate
accessibilityFlags large_text | high_contrast | voice_primary | reduced_motion
```

These variables drive rendering choices — typography scale, information density, navigation depth, which components are visible, how notifications are phrased — through one shared component library, not a fork per audience. A `MedicineCard` component has 2–3 render variants selected by a single `useAdaptiveProfile()` hook; the backend and data model never change.

**Example — the exact same record, rendered three ways:**

| | Elder | Standard | Caregiver |
|---|---|---|---|
| Content | "Medicine at 8:00 AM" + one giant button | "Metformin 500 mg · 8:00 AM · after breakfast" + compact Taken/Remind | "Metformin 500 mg · Scheduled 08:00 · Status: Pending · Source: Doctor-confirmed" |
| Interaction | Voice-first, single action | Touch, light detail | Scan for attention, not action |

This one mechanic is the strongest, most demoable differentiator in the entire product — and, importantly, it is currently **not yet built** in the repository. Everything else already exists in some form; this is the highest-leverage thing to build next, because it doesn't require new backend features, only a new rendering layer over data that already exists.

**One account, multiple profiles.** A single person is often more than one role at once — a patient for themselves, a guardian for their child's vaccination schedule, a caregiver for their aging parent. The account model should support switching between profiles within one login, each rendering completely differently, rather than issuing separate caregiver-only or patient-only accounts.

---

## 5. Target Users & Age-Specific UX

### Elderly
**Needs:** simplicity, large text, voice, minimal navigation, high contrast, emergency access.
**UI:** 5 navigation items max — Today, Medicines, Appointments, Ask Sathi, Emergency. One primary action per screen. No graphs, no jargon, no technical terminology. Yes/No/Not-sure buttons instead of forms.
**Reality check:** onboarding is realistically caregiver-assisted for most low-digital-literacy elderly users in this market — design the setup flow assuming a family member sets it up, not assuming the elder self-onboards.

### Children
**Needs:** vaccination tracking, medicines, appointments, records — managed entirely by a parent/guardian.
**UI:** no independent login or account for the child. A guardian-operated profile only: reminders, dosing (with a hard "confirm with pharmacist/doctor" guardrail on anything dosage-related — never an auto-adjust), documents, appointments.
**What to avoid:** anything conversational, journaling, or chat-based tied directly to a minor's profile.

### Young Adults / Students
**Needs:** fast interactions, appointments, preventive reminders, a modern feel.
**UI:** the app should be quiet most of the time and speak up only when something matters (a preventive reminder, an upcoming visit). The pre-visit summary ("what to tell the doctor since last time") is the single highest-value feature for this group, since they're the most likely to bounce between clinics, colleges, and pharmacies without a consistent record.

### Adults
**Needs:** medicines, appointments, records, family coordination — and frequently, simultaneous responsibility for a child's and a parent's health alongside their own.
**UI:** balanced information density. The multi-profile account model (Section 4) is what actually serves this group well, more than any single screen design.

### Caregivers
**Needs:** to know who needs attention, and why — not a feed of every event.
**UI:** an "attention needed" list only, never the patient's full app. Two categories: things needing action now, and a quiet "everything else is fine" summary. Critically, this needs a **feedback loop** — a caregiver should be able to mark an alert as "not urgent," feeding back into rule tuning, or the dashboard will suffer the same alert-fatigue failure every caregiver-notification system eventually hits.

---

## 6. Product Architecture — Five Pillars

| Pillar | Covers |
|---|---|
| **Understand** | Voice interaction, multilingual support, medical jargon simplification, document extraction |
| **Organize** | Medicines, appointments, recovery tasks, reminders, documents |
| **Remember** | Health timeline, medication history, confirmed information |
| **Protect** | Deterministic safety rules, attention alerts, emergency card, escalation |
| **Connect** | Patient, family, caregiver, and (future) healthcare professional |

---

## 7. The "Today" Engine

The home screen is not a dashboard. It answers one question: **what matters right now?**

```
Patient view:                 Caregiver view:                Quiet-day view:
"Good morning."                "2 things need your attention."   "You're all caught up."
3 important things today:      🔴 New symptom reported            Next appointment: Friday, 10:30am.
08:00 Morning medicine         🟡 Medicine missed
10:00 Recovery activity
16:30 Follow-up appointment
[ Ask Sathi ]
```

The rule governing this screen: **don't show a feature, show a need.** If Sathi has thirty capabilities, the user should never see thirty buttons — the relevant one surfaces when it's relevant, everything else stays out of sight until asked for (progressive disclosure).

---

## 8. Feature Set

### 8.1 Already built — keep and harden

Per the current repository and demo flow, these already exist and should not be rebuilt from scratch:

- Adherence tracking with a "Take" action and live stats
- Recovery/health timeline
- Voice and text symptom reporting with deterministic triage (currently 3 states: **NORMAL / MONITOR / ESCALATE**)
- AI companion chat, context-aware (Gemini 2.0 Flash primary, Groq fallback, mock mode)
- Live caregiver chat (SSE)
- Caregiver triage dashboard with patient linking and nudges
- Document scan (currently stubbed)
- Drug-interaction check
- Medical jargon simplifier
- Journal and breathing-exercise modules
- Follow-ups, care plans, settings

**Audit item:** confirm the journal and breathing-exercise features are tied to an actual prescribed recovery task (e.g., post-op breathing exercises, a doctor-assigned symptom log) rather than functioning as generic wellness features — the former is on-thesis, the latter is the "wellness super-app" drift the product should explicitly avoid.

### 8.2 Build next — highest leverage, in priority order

1. **Adaptive rendering layer** — profile-driven UI (Section 4). The single most important gap.
2. **Trust / provenance tags** on every data point — see Section 10.
3. **Emergency card** — a static screen pulling from data already stored (allergies, meds, contacts, preferred hospital). Minimal build cost, high value for exactly the users the product cares most about.
4. **Caregiver alert-feedback loop** — let a caregiver mark an alert as unnecessary; use it to tune thresholds. Direct fix for alert fatigue.
5. **One-page doctor-visit summary export** — recent symptoms, adherence, new documents, since-last-visit changes. Strongest hospital-facing value proposition for a B2B2C pitch.
6. **Multi-profile single account** — patient / guardian / caregiver switching under one login.

### 8.3 Deferred — real future scope, not this build cycle

- Full preventive-health pillar (vaccinations, routine screenings) as a standalone mode
- "What changed since your last visit" longitudinal comparison
- Full document vault / health library (beyond the confirm-and-store flow already scoped)
- Dedicated cloud speech-to-text / text-to-speech (replacing the current browser Web Speech API, which is a real limitation for reliable multilingual voice beyond a Chrome demo)
- Additional languages beyond the initial pilot set
- Offline/SMS/IVR fallback for low-connectivity users
- EHR / FHIR / hospital-system integrations, wearables, insurance, pharmacy ordering

### 8.4 Explicitly out of scope — do not build

Fitness tracker, social network, AI therapist, disease-prediction platform, generic unconstrained medical chatbot, hospital ERP, pharmacy or diet marketplace, wellness super-app, blockchain-based health records, independent accounts for minors, and separate native apps per age group (this must remain one adaptive codebase).

---

## 9. Safety & AI Architecture

The governing split:

```
AI                  →  Understand   (language, voice, extraction, simplification)
Deterministic logic  →  Organize     (scheduling, reminders, permissions)
Rule engine          →  Protect      (safety states, escalation triggers)
Human                →  Decide       (clinical judgment, final action)
```

**Safety states** (recommend keeping the 3-state model already implemented rather than the 4-state model in the original brief — it's simpler to explain, demo, and reason about): **NORMAL → MONITOR → ESCALATE.**

**Hard guardrails**, matching what's already correctly specified in the repository's PRD:
- Never diagnose, prescribe, or modify a dosage.
- Never invent a medication detail from an ambiguous document — ask, don't guess.
- Every alert must be explainable: "why was I alerted?" always has a traceable answer.
- Uploaded documents and patient messages are data, never instructions — no prompt injection through discharge paperwork.
- When uncertain: **ask → confirm → act**, never **guess → act**.

---

## 10. Trust & Data Provenance Layer

Every important fact carries a visible source, so AI-interpreted information never looks equivalent to a doctor's instruction:

```
✓ Doctor-confirmed
✓ Hospital discharge plan
✓ You confirmed
✓ You reported
✓ Caregiver-added
⏳ AI-extracted — needs your confirmation
```

This is one of the cheapest additions relative to its impact on perceived credibility (a single field on existing records) and directly answers the "what happens if the AI is wrong" objection a technical or clinical reviewer will raise first.

---

## 11. Privacy, Consent & Care Circle

- The patient authorizes specific people (parent, spouse, child, caregiver) into a **Care Circle**, with granular, per-field permissions — not a single all-or-nothing sharing toggle.
- Consent is explicit, recorded, versioned, and revocable at any time.
- Caregivers see only what's authorized and only what needs attention — never the patient's full record by default.
- No health data is sold or used for advertising, under any business model.
- For any real deployment in India, data handling should be reviewed against the DPDP Act 2023 and applicable health-data regulations before launch — this document does not substitute for that review.

---

## 12. Technical Architecture

**Current stack (verified from the repository):**
- Frontend: React + Vite + TypeScript, Tailwind design system
- Backend: FastAPI (Python)
- Database: SQLite
- AI provider: Gemini 2.0 Flash (primary), Groq Llama (fallback), mock mode for offline dev
- Voice: browser Web Speech API (STT/TTS) — adequate for a demo, a real limitation for production multilingual voice
- Auth: JWT

**Recommended evolution, in order:**
1. Add the adaptive theming layer on top of the existing Tailwind setup — profile-driven design tokens, not a new framework.
2. Add an output-validation pass on AI responses (check for invented dosages, unsupported diagnosis language) before display.
3. Move off SQLite to Postgres before any deployment beyond a demo.
4. Replace browser-native voice with a dedicated multilingual ASR/TTS service once the product needs to work outside a Chrome demo.

```
Patient / Caregiver
        ↓
   Sathi Client  ← adaptive rendering layer (new)
        ↓
     Backend (FastAPI)
        ↓
User & Health Context ─→ Task/Medication/Appointment Engine
        ↓
   AI / NLP Layer (Gemini/Groq, mock fallback)
        ↓
Deterministic Safety Engine ─→ Consent / Escalation
        ↓
Patient / Caregiver / (future) Healthcare Professional
```

---

## 13. Data Model

```
Profile            ← new: ageBand, role, digitalLiteracy, accessibilityFlags
User
PatientProfile
Caregiver
CareCircle
Medication
MedicationEvent
Appointment
RecoveryPlan / RecoveryTask
SymptomEvent
HealthDocument
TimelineEvent
SafetyRule
EscalationEvent / Alert
Consent
AuditEvent
```

Every high-impact fact (medication, safety trigger) should retain source, timestamp, creator, and confirmation state — this is what makes the trust layer (Section 10) possible without extra modeling work later.

---

## 14. Business Model

**B2B2C is the credible path, not direct-to-consumer.** Health apps monetize poorly sold directly to individual users in this market; a hospital, clinic, or rehabilitation center adopting Sathi as a post-discharge extension of their own care is a far stronger business.

| Customer (pays) | End user (uses, free) |
|---|---|
| Hospitals, clinics, rehab centers, home-healthcare organizations | Patients, caregivers, families |

**Revenue models:** per-active-patient pricing, hospital subscription, white-label deployment. **Not:** selling personal health data — this should remain a stated, permanent product principle, not a negotiable growth lever.

**Sequencing for credibility:** start narrow — one or two recovery pathways (e.g., cardiac or orthopedic post-op) with two or three partner clinics — before expanding horizontally into preventive/everyday health or vertically into more conditions and languages. Expanding into "everyday health for everyone" before the recovery core is validated is the single most common way a project like this dilutes into a generic wellness app.

---

## 15. Competitive Differentiation

| Existing solution | Strength | Gap Sathi closes |
|---|---|---|
| Reminder app | Reminders | No understanding of the broader recovery journey |
| Generic AI chatbot | Conversation | Not grounded in the patient's actual plan or a safety workflow |
| Health record app | Data storage | Data without action or interpretation |
| Hospital portal | Official records | Not built for daily use or accessibility |
| **Sathi** | **Recovery orchestration + adaptive interface** | **Combines plan → adherence → symptoms → caregiver → escalation, rendered appropriately for whoever's looking at it** |

The real moat is not the feature list — a well-funded competitor could copy voice reminders in a sprint. The moat is the **adaptive interface engine** plus the **deterministic-safety architecture**, because copying either requires an incumbent to redesign their information architecture, not bolt on a feature.

---

## 16. MVP Roadmap

**Phase 0 — already built:** recovery core loop (medicines, timeline, symptom triage), AI chat, caregiver dashboard, drug-check, jargon simplifier.

**Phase 1 — next (recommended near-term focus):** adaptive rendering layer, trust/provenance tags, emergency card, caregiver alert-feedback loop, one-page doctor-visit summary, multi-profile account.

**Phase 2:** preventive-health mode, document vault, "what changed since last visit," expanded language support.

**Phase 3:** hospital/EHR integrations, wearables, clinician dashboard, dedicated multilingual voice stack.

---

## 17. Success Metrics

| Category | Metrics |
|---|---|
| Adherence | % scheduled tasks acknowledged, medication reminder completion rate |
| Safety | Correct escalation rate, false-alert rate, missed-escalation rate |
| Caregiver | Alert acknowledgement rate, engagement with feedback-loop tuning |
| Usability | Task completion time, onboarding completion, accessibility feature usage |

Clinical outcome claims (e.g., readmission reduction) should only be made after formal validation — not asserted from demo or pilot data.

---

## 18. Key Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Alert fatigue causes caregivers to ignore real alerts | Feedback loop (Section 8.2 #4), transparent "why alerted" explanation |
| Retention looks weak outside active recovery episodes | Measure the two populations differently — active recovery vs. quiet/preventive use — rather than one daily-active-user target |
| Browser-based voice is unreliable across devices/languages | Scope voice claims to what's actually supported today; roadmap a dedicated ASR/TTS service before scaling multilingual claims |
| Direct-to-consumer monetization is weak in this market | Lead with the B2B2C hospital-partnership model, not consumer subscriptions |
| AI hallucination in health context | Output validation layer, deterministic rules for anything safety-critical, trust/provenance tags |
| Scope creep toward "everyday health super-app" | Hold the line on Section 8.4; every new feature must be justified against the recovery-core thesis, not feature-count |

---

## 19. Demo / Pitch Strategy

1. **Open on the elder view** — large buttons, voice-first, minimal.
2. **Switch profile live** to the standard/adult view — same data, denser, richer.
3. **Switch again to caregiver view** — same data, now filtered to "attention needed only."
4. **Ask Sathi a question** ("What do I need to do today?") and show it answering from real structured data, not a generic model response.
5. **Report a symptom** and trigger the safety pathway — show the ESCALATE state and the caregiver alert it generates.
6. **Tap "why was I alerted"** — show the trust/provenance trail behind the alert.

The adaptive-profile switch in steps 1–3 is the single moment that should carry the whole pitch — it's the one thing a judge, a hospital partner, or a competitor can't dismiss as "just another reminder app with AI on top."

---

## 20. Final Pitch

After a patient leaves the hospital, the care doesn't stop — but continuous, personalized support usually does. Sathi is a recovery companion that turns a discharge plan into simple daily actions, understands symptoms through natural voice conversation, keeps a trustworthy, source-labeled record of what happened, and connects the right person when something needs attention — while presenting all of it differently depending on whether the person looking at the screen is the patient, their grandmother, or the daughter coordinating both of their care.

Sathi is not a doctor, and it does not try to be. It is the adaptive layer between hospital discharge and the next human touchpoint — built once, for everyone, without asking everyone to use it the same way.
