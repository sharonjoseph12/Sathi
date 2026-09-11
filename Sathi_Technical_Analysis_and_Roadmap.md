# Sathi — Technical Architecture Analysis & Enhancement Roadmap

**Repository:** `github.com/sharonjoseph12/Sathi` (commit `de2701e`, single squashed commit, single contributor)
**Reviewer role:** Senior Software Architect / OSS Project Analyst
**Method:** Static review of the full backend (`backend/app/*.py`), frontend (`frontend/src/**`), dependency manifests, test suite, git history, and the repository's own internal planning documents (`SATHI_BLUEPRINT/`, `Sathi_Complete_PRD.md`).

---

## Executive Summary

- Sathi is a working, coherent MVP (~4,300 LOC across backend + frontend) for a real problem — post-discharge medication/symptom/caregiver coordination. The core domain modeling and per-request authorization pattern are sound for an MVP.
- The single biggest structural risk is **scale-of-one design masquerading as production design**: in-process real-time pub/sub, in-memory rate limiting, and SQLite-as-system-of-record all work perfectly in a demo and all silently break the moment the app runs on more than one process or instance.
- The single biggest **domain-specific** risk is that the safety-critical symptom-escalation logic is English-keyword matching (plus two Hindi phrases), while the product's core claim is "multilingual." That gap sits exactly where a real safety incident would occur.
- Two backend endpoints (`/ai/intent`, `/ai/simplify`) have no authentication at all — an unauthenticated, free proxy to a metered third-party LLM API.
- The repository ships a 364 KB, 18-file internal blueprint (`SATHI_BLUEPRINT/`) and a 40 KB PRD describing a materially different, much larger system (Postgres/Drizzle, Express, pnpm monorepo, native mobile, OpenAPI-generated clients, Docker/Render). None of it is what's actually built. This is worth resolving before anyone outside the team reads the repo.
- Test coverage is one file, one function, seven assertions. For a health-adjacent app, that's the single highest-leverage gap to close first — ahead of any new feature work.

The sections below back every claim with a specific file and line reference so nothing here is a matter of opinion.

---

## 1. Repository Overview

### 1.1 What it is

Per the README and PRD, Sathi is a voice-first, multilingual **post-hospital recovery companion**: patients log medications and symptoms, get an AI companion chat, and caregivers/family get a live dashboard with alerts. It explicitly scopes itself as a support layer, not a diagnostic tool — the PRD lists diagnosis, autonomous treatment decisions, and emergency dispatch as out of scope, which is the right call for a system like this and is worth preserving through any redesign.

### 1.2 Actual implemented stack

| Layer | What's actually in the repo |
|---|---|
| Backend | FastAPI `0.95.1`, Pydantic `<2.0.0`, SQLAlchemy `2.0.35`, PyJWT, single SQLite file (`backend/app/database.py:5`) |
| AI orchestration | Provider-agnostic chat/vision wrapper (`groq_client.py`): Gemini 2.0 Flash primary, Groq Llama 3.3 70B / Llama 4 Scout fallback, deterministic `MOCK` fallback when no key is set |
| Voice | Browser Web Speech API primary; server-side STT via Groq Whisper (`whisper-large-v3-turbo`) and TTS via `edge-tts` (unofficial reverse-engineered Microsoft Edge voice API, 12 languages configured) |
| Frontend | React `19.2`, Vite, TypeScript, Tailwind CSS v4, hand-rolled hash router, no routing/state/data-fetching library |
| Realtime | Server-Sent Events over an in-process `asyncio.Queue` dict (`api.py:515-544`) |
| Auth | PBKDF2-HMAC-SHA256 (210,000 rounds) + HS256 JWT, 7-day TTL |
| Persistence for uploads | Voice notes stored as base64 text directly in the `chat_messages` table (`models.py:130`) |

### 1.3 Feature inventory (as implemented, not as planned)

Medication list + dose logging + adherence stats · symptom logging with deterministic NORMAL/MONITOR/ESCALATE triage · AI companion chat (context-aware, multi-provider) · live SSE caregiver/family chat · caregiver dashboard with "nudge" messaging · prescription photo → medicine list via vision LLM (OCR) · jargon simplifier (LLM + rule-based fallback) · drug-interaction checker (curated rule table + LLM augmentation) · mood/energy journal · versioned discharge plans · reminders · notifications · patient-triggered SOS alert to linked caregivers · emergency card · demo mode.

That's a broad, sensible feature set for an MVP. The concern in this report is almost entirely about *how* it's built, not *what* was chosen to build.

### 1.4 Scale of the codebase

~4,300 total lines: backend is 8 modules (`api.py` alone is 970 lines / 52 routes), frontend is 18 files across `screens/`, `components/`, `lib/`. One git commit, one contributor, no CI configuration, no Dockerfile.

### 1.5 A finding that reframes the rest of this report

`backend/app/api.py:1-2` opens with this module docstring:

> *"Sathi full API: ... Port of VAni core minus SOS/blood-network."*

The repository also contains `SATHI_BLUEPRINT/` (18 markdown files, ~364 KB) and `Sathi_Complete_PRD.md` (40 KB) — a fully specified **different** system: a pnpm monorepo, PostgreSQL via Drizzle ORM with UUID keys, an OpenAPI-first spec with generated Zod schemas and React Query hooks, an Express backend, a native Expo mobile app, Docker multi-stage builds, a `render.yaml` deployment blueprint, a blood-donor network, a doctor role, and an AHA-compliant CPR metronome guide (`SATHI_BLUEPRINT/12_rebuild_prompt.md:1-30`, `SATHI_BLUEPRINT/02_database.md:1-15`, `SATHI_BLUEPRINT/09_features.md:1-20`).

**None of that exists in `backend/` or `frontend/`.** What's actually built is a much smaller, self-contained FastAPI + SQLite + Vite web MVP, built in a single commit, and — per its own docstring — explicitly *pruned* the SOS/blood-network features relative to whatever "VAni" was. (Notably, the code still *does* ship an SOS/emergency-card system today at `api.py:929-970` — so even that one-line docstring is already slightly out of date relative to the code beneath it.)

This matters for the rest of the report: Section 4 doesn't need to invent a target architecture from nothing — a very detailed one already exists inside this repo. The real task is reconciling the blueprint with reality (or deleting the blueprint if it no longer reflects the plan), and then closing the gap in the right order. Several of the blueprint's specific choices are also worth revisiting rather than adopted wholesale — see §4.1.

### 1.6 What's already solid (don't lose this in a rewrite)

- A single `_can_access()` authorization gate (`api.py:66-77`) is consistently called across ~32 of the 52 routes to enforce patient-level ownership/care-link checks — a real, reusable authorization primitive, not ad hoc per-route checks.
- PBKDF2 at 210,000 iterations (`auth.py:36-39`) is a reasonable password-hashing choice, with backward-compatible legacy-hash handling.
- The AI layer has a real fallback chain (Gemini → Groq → deterministic MOCK) so the app keeps working with zero configured API keys — a genuinely good demo/offline property.
- The frontend has an offline queue and per-patient response cache in `localStorage` (`frontend/src/lib/api.ts:17-45`) with request timeouts and 401-triggered re-auth — real resilience thinking for a target audience that may be on unreliable mobile connections.
- `main.py:49-62` sets baseline security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, HSTS in production) and structured request-ID logging — small but correct.
- The PRD is explicit that Sathi does not diagnose or dispatch emergency services autonomously (`Sathi_Complete_PRD.md:1-10`) — keep that boundary through any redesign.

---

## 2. Architectural Gaps & Weaknesses

### 2.1 API & service layer

| Finding | Evidence | Impact |
|---|---|---|
| Entire REST surface (52 routes) lives in one 970-line file, no domain routers, no API versioning | `api.py` (whole file) | Merge conflicts scale with team size; no way to version a breaking change without breaking every client at once |
| Schema bootstrap and ad hoc migration run as import-time side effects | `api.py:20,23-39` (`_migrate()` does raw `ALTER TABLE` wrapped in a bare `try/except: pass`) | Failed migrations fail silently; no migration history, no rollback path |
| Business logic, DB queries, and HTTP concerns are interleaved in the same function bodies | e.g. `add_medication` at `api.py:205-237` | Hard to unit-test business rules without spinning up the full request stack |

### 2.2 Data layer

- **SQLite as the system of record** (`database.py:5-9`): single-writer, file-level locking, no built-in replication. Fine for a hackathon demo; not viable once more than a handful of concurrent caregivers are writing dose logs at once.
- **Structured data stored as opaque `Text` blobs** instead of a real JSON column: `SymptomLog.symptoms` (`models.py:104`), `RecoveryEvent.metadata_json` (`models.py:196`), `DischargePlan.data` (`models.py:149`) are all `Column(Text)` holding hand-serialized JSON. You lose queryability (`WHERE symptom_json @> ...`) and get manual `json.loads` scattered through `api.py` (e.g. `api.py:604, 656, 966`).
- **Binary media stored inline in the relational table**: `ChatMessage.audio_base64` (`models.py:130`) stores base64 voice notes directly as `Text`, truncated at 500,000 characters server-side (`api.py:555`). This bloats row size, table scans, and backup size, and gives you no CDN caching or range requests for playback.
- No `alembic` (or any migration tool) in `requirements.txt` — schema changes are hand-written `ALTER TABLE` strings.

### 2.3 Authentication & authorization

- **Two completely unauthenticated endpoints**: `POST /ai/intent` and `POST /ai/simplify` (`api.py:671-678`) take no `current_user` dependency at all. Anyone who knows the base URL can send arbitrary text and consume your Groq/Gemini quota for free, with no rate limit — a real cost and abuse vector, not a theoretical one.
- **Dev secret defaults to a hardcoded string** and only logs a warning if unset in production (`auth.py:13-16`) — this should hard-fail app startup in production rather than warn and continue.
- **7-day JWTs with no revocation mechanism** (`auth.py:18,56-58`): there's no refresh-token rotation and no server-side blacklist, so a stolen or leaked token stays valid for a week regardless of password changes or forced logout.
- **JWT stored in `localStorage`** on the client (`frontend/src/lib/api.ts:9,13-15`), not an `httpOnly` cookie — the standard XSS-to-account-takeover path, made worse by the non-revocable 7-day TTL above.
- **Login throttling is a Python in-process dict** (`auth.py:21-33`): resets on every restart and isn't shared across worker processes, so it silently stops functioning the moment you run more than one uvicorn worker (the normal way to use more than one CPU core).
- The SSE stream endpoint takes its JWT as a **query-string parameter** (`api.py:516`, and constructed client-side at `frontend/src/lib/api.ts:112`). This is a known, common workaround for `EventSource` not supporting custom headers, but it does mean the token can land in proxy/access logs and browser history — worth a short-lived, stream-scoped token rather than the same 7-day session token.

### 2.4 AI/LLM integration & data-handling

- **Unredacted patient context sent to third-party consumer LLM APIs**: `ai_engine.py:32-47` builds a string containing the patient's name, active medications, and recent symptom text, and sends it verbatim to Gemini/Groq. There is no de-identification step and no indication of a Business Associate Agreement (or equivalent) with either provider — see §3 for why this is an industry-standard requirement, not a nice-to-have, the moment real patient data (not demo data) is involved.
- **No resilience around LLM calls**: `groq_client.py` has no retry/backoff, no response caching, no per-user or global cost/rate limiting, and errors are handled with bare `print()` calls (`groq_client.py:86,101,141,165`) instead of the structured logger already set up in `main.py`.
- **Safety-critical logic duplicated by hand in two languages**: the ESCALATE/MONITOR keyword lists exist independently in `backend/app/safety.py:12-14` *and* `frontend/src/lib/api.ts:79-80` (the frontend comment literally says the backend "mirrors frontend localSafety" — `safety.py:7`). Two hand-maintained copies of a safety rule set will drift the first time either one is edited without the other.

### 2.5 Real-time messaging & scalability

- The SSE pub/sub is a Python dict of `asyncio.Queue` objects living in one process's memory (`api.py:515-541`, `_subs` and `_push`). This works flawlessly in a single-process demo and **silently breaks** the instant the app runs behind more than one worker or more than one container: a caregiver connected to instance A will never receive a message delivered while connected to instance B, with no error surfaced anywhere. There's no external broker (Redis Pub/Sub, NATS, a managed realtime service) doing the actual fan-out.
- **N+1 query patterns** in caregiver-facing aggregate endpoints: `cg_patients` (`api.py:584-605`) loops over every linked patient and issues four separate queries per patient (medications, dose logs, symptom logs, plus the patient row itself) inside a Python `for` loop, rather than one joined/aggregated query. This scales linearly-worse as a caregiver's patient list grows.
- The nudge rate limiter pulls **all** matching notification rows for the last hour and filters/counts them in Python (`api.py:623-629`) instead of filtering in SQL — works fine at demo volume, degrades as notification history grows.
- No pagination anywhere — fixed `.limit(100)` on chat history (`api.py:577`), `.limit(30)` on journal and notifications (`api.py:829-830, 905`). Older history simply becomes permanently unreachable through the API rather than paginated.

### 2.6 Frontend architecture

- No data-fetching/caching library (no React Query, no SWR): every screen manages its own fetch lifecycle through the shared `req()` helper (`frontend/src/lib/api.ts:47-73`), so there's no de-duplication of concurrent identical requests and no automatic background revalidation.
- No code-splitting: `App.tsx:1-11` statically imports every screen up front, so the whole app ships as one bundle regardless of which screen a user opens first — a real concern for the "digitally inexperienced," often older, possibly low-bandwidth users this product explicitly targets.
- No visible accessibility treatment (ARIA roles, focus management, screen-reader labels) despite the target demographic including elderly and low-literacy patients — worth an explicit accessibility pass given who this is for.
- `package.json` has no test framework in `devDependencies` — zero automated frontend test coverage.

### 2.7 Testing & quality assurance

The entire automated test suite is `backend/tests/test_safety.py`: one file, one function under test (`evaluate_safety_symptom`), seven assertions. There is no test coverage for:
- authorization boundaries (`_can_access` — a regression here is a patient-privacy incident, not a bug)
- dose logging / adherence math
- the AI provider fallback chain
- any of the 52 API routes as integration tests
- any frontend component or user flow

For a system whose core value proposition is safety-oriented triage and cross-role data access control, this is the highest-leverage place to invest before adding new features.

### 2.8 DevOps, observability & dependency hygiene

- No `.github/workflows`, no `Dockerfile`, no `docker-compose.yml`, no deployment manifest in the actual repo (a `render.yaml` is described only inside the aspirational blueprint, not present in reality). Every deploy today is manual.
- `requirements.txt` pins `fastapi==0.95.1` (April 2023) together with `pydantic<2.0.0` — this predates Pydantic v2's Rust-based validation core (materially faster request validation) and everything FastAPI has shipped since. No `pip-audit`/`safety`/Dependabot configuration exists to catch known CVEs in either the Python or npm dependency trees.
- `edge-tts` is an unofficial, reverse-engineered client for a Microsoft internal API, not a supported product — it can break without notice and shouldn't be a load-bearing dependency for a safety-adjacent voice feature.
- Logging is structured for HTTP requests (`main.py:19-29`) but the AI-call error paths fall back to plain `print()` (§2.4), so those failures won't show up wherever the structured logs go.

### 2.9 Domain-specific safety gap: multilingual triage isn't actually multilingual

This is the sharpest single finding in this review. The product's core claim is "voice-first, **multilingual**" (README, PRD). But the deterministic safety net — the one thing in this app that's supposed to work even when the LLM is down — is pure English substring matching:

```python
# safety.py:12-14
escalate = ["chest pain", "breathing", "breathless", "severe pain", "bleeding",
            "unconscious", "fainted", "can't breathe", "cant breathe", "help me", "sos"]
monitor = ["headache", "mild pain", "tired", "nausea", "dizzy", "fever", "pain", "cough"]
```

Only the emergency intent router (a *different* list, `safety.py:48-49`) includes two Hindi phrases (`bachao`, `madad`). A patient describing breathing difficulty in Hindi, Kannada, Tamil, or any of the other 9 languages the TTS layer already supports (`api.py:775-780`) will not trigger `ESCALATE` server-side — the exact scenario this system exists to catch. Two secondary issues compound this: substring matching has no negation handling ("no chest pain" still fires `ESCALATE`), and severity is only checked against the literal string `"severe"` (`safety.py:15`), not `"moderate"`/`"mild"`.

### 2.10 Documentation-reality mismatch

Covered in §1.5. Restated as a risk: anyone evaluating this project — a judge, a new teammate, an investor doing diligence, a future contributor — who reads `SATHI_BLUEPRINT/` or the PRD before reading `backend/`/`frontend/` will form a materially wrong picture of what's actually built. This should be resolved explicitly (either the blueprint is archived/labeled as "future direction, not current state," or it's used as the literal execution plan per §4).

---

## 3. Competitive Deficit Analysis

Sathi's category — post-discharge care coordination and medication adherence — is an active, well-funded product space in 2026, with clear standard practices Sathi doesn't yet meet.

| Capability | Industry standard practice | Sathi today | Gap |
|---|---|---|---|
| EHR/HIE integration | Live ADT (admission-discharge-transfer) feeds and FHIR-based REST resources (`Patient`, `MedicationRequest`, `Observation`) are the baseline for connecting to a hospital's actual discharge workflow [6][11][12] | `DischargePlan.data` is an opaque JSON blob (`models.py:149`) with no structured, standards-aligned resource model | No integration path into any real hospital system without a bespoke one-off parser |
| Adherence signal quality | Leading platforms are increasingly justified to health systems by RTM/RPM billing codes and measurable readmission-reduction ROI, which requires adherence evidence beyond self-report [3][4] | Adherence is 100% patient self-tap ("Take" button); no pharmacy refill data, wearable data, or caregiver-observed cross-check | A non-adherent patient who simply stops opening the app is indistinguishable from one having no problems |
| Outreach channels | Comparable systems triage and respond across SMS, voice, and email, tied to real discharge events, not just an installed app [6] | App-only. No SMS/voice fallback if the patient doesn't open Sathi | Patients least likely to engage with an app are the ones who get zero coverage |
| LLM/PHI compliance posture | Treating a signed BAA (or de-identification, or on-prem inference) as the baseline before sending real patient data to a model API is standard guidance for any health workflow touching PHI [7][8][9][10] | Raw symptom/medication context sent directly to consumer-tier Gemini/Groq endpoints (§2.4) | Compliance exposure the moment demo data is replaced with real patient data |
| Clinical triage rigor | Mature symptom-checker products run on structured, clinically reviewed decision logic with defined acuity levels and ongoing clinical governance | Three ad hoc buckets driven by a hand-written English keyword list, no clinical review process, no accuracy tracking | No defensible clinical basis for the triage output if ever challenged |
| Real-time care-team messaging | Backed by a centrally brokered pub/sub (Redis/Kafka/managed realtime) so delivery survives horizontal scaling | In-process `asyncio.Queue` dict (§2.5) | Breaks the moment the app scales past one process |

**Sources:** [3] Tenovi — medication adherence & RTM billing; [4] Prevounce — 2026 RPM company review; [6] Neon Health — 2026 care-coordination platform review; [7] TrueFoundry — LLM deployment HIPAA/SOC2/GDPR playbook (2026); [8] Aptible — HIPAA-compliant AI guide; [9] Medcurity — PHI-in-LLM rules (2026); [10] Stribog — on-prem HIPAA-compliant LLM inference; [11] CapMinds — EHR/EMR integration & FHIR guide; [12] athenahealth — HL7 FHIR interoperability standards.

---

## 4. Proposed Enhancement Strategy

### 4.1 Guiding principle

Don't treat this as a blank-page redesign — `SATHI_BLUEPRINT/` already specifies a detailed target architecture, and much of it is directionally correct (Postgres over SQLite, an OpenAPI-first contract, containerized deployment, structured schema). The practical roadmap is to **close the gap between the blueprint and reality in risk-ordered phases** — but two of the blueprint's specific technology choices are worth reconsidering rather than adopted as-is:

- **Keep FastAPI/Python, don't rewrite the backend in Express/Node** (as `12_rebuild_prompt.md` proposes). This app's core differentiator is LLM/vision/speech orchestration, and Python's AI ecosystem (async support, first-class SDKs for every model provider, easier local ML tooling if triage ever moves off keyword-matching) is a better long-term fit than Node's — and a full-language rewrite is a much bigger risk than hardening a backend that already has a sound authorization pattern (§1.6). FastAPI generates an OpenAPI spec for free; pair it with `openapi-typescript` + `@tanstack/react-query` codegen on the frontend to get the blueprint's "typed client generation" benefit without an Express rewrite.
- **Adopt Postgres, structured JSON, and containerization from the blueprint immediately** — these are stack-agnostic improvements that don't require the Node rewrite to get.

### 4.2 Recommended target stack

| Concern | Recommendation | Notes |
|---|---|---|
| Database | PostgreSQL (managed: e.g. Supabase/Neon/RDS) via SQLAlchemy + **Alembic** for migrations | Native `JSONB` replaces the hand-serialized `Text` blobs in §2.2; supports real concurrent writes |
| Object storage | S3-compatible storage (S3 / Cloudflare R2 / Supabase Storage) for voice notes and prescription photos, served via signed URLs or a CDN | Removes base64 blobs from the relational table (§2.2) |
| Cache / pub-sub / rate limiting | Redis | Backs SSE fan-out across processes, distributed login-throttling, and token-bucket rate limiting on `/ai/*` |
| Real-time transport | Either Redis-backed SSE fan-out, or move to WebSockets via a managed realtime provider if bidirectional low-latency chat becomes a priority | Either removes the single-process ceiling in §2.5 |
| Background jobs | Celery / RQ / Arq worker for reminders, notifications, and any batch adherence scoring | Gets slow work out of the request/response path |
| AI/LLM access | Model provider with a signed BAA (or equivalent DPA) for the target regulatory regime, **or** self-hosted inference for anything touching real PHI; de-identification pipeline as a second line of defense even where a BAA exists | See §3; this is a should-fix-before-real-users item, not a someday item |
| CI/CD & containers | GitHub Actions + Docker (multi-stage build already scoped in the blueprint) + a managed platform (Render/Fly.io/Cloud Run) | Currently fully manual (§2.8) |
| Frontend data layer | `@tanstack/react-query` on top of the existing `api.ts` client | Adds caching, de-duplication, and background revalidation without a rewrite |
| Testing | `pytest` + `httpx.AsyncClient` for backend integration tests; `vitest` + Testing Library for frontend; `Playwright` for the critical demo flows end-to-end | Priority order in §4.3 |
| Observability | Structured JSON logs (already partly present) shipped to a log sink; OpenTelemetry tracing; Sentry (or equivalent) for exception tracking | The `print()`-based AI error paths in `groq_client.py` should route through the existing logger first |

### 4.3 Phased roadmap

| Phase | Goal | Key deliverables |
|---|---|---|
| **0 — Stabilize & secure** (do first, before any new feature) | Close the open security holes that exist regardless of scale | Require auth on `/ai/intent` and `/ai/simplify`; hard-fail startup on the default JWT secret in production; move access tokens to short-lived + add a Redis-backed refresh/revocation flow; move token storage off `localStorage` toward an `httpOnly` cookie or in-memory + refresh pattern; write the first authorization-boundary test suite around `_can_access` |
| **1 — Data & infra foundation** | Make the persistence and deploy story production-viable | Postgres + Alembic migration history; move `symptoms`/`metadata_json`/`discharge plan data` to `JSONB`; move voice notes/photos to object storage; Dockerfile + docker-compose for local parity; GitHub Actions CI (lint, type-check, test, build) |
| **2 — Real-time & scale** | Remove the single-process ceiling | Redis-backed pub/sub for SSE (or WebSocket move); background job queue for reminders/notifications; fix the `cg_patients` N+1 with a joined/aggregated query; real cursor-based pagination on chat/journal/notifications; SQL-side filtering for rate-limit checks |
| **3 — Clinical safety & multilingual rigor** | Fix the gap in §2.9 — the most important one in this report | Extend `_EMERG`/escalate/monitor keyword sets per supported language (not just English + 2 Hindi phrases), with a unit test per language; add basic negation handling; log every triage decision (input, matched rule, output) for later clinical review; get a clinical advisor to review and sign off on the escalation rule set; consider a lightweight multilingual classifier as a second opinion layered *on top of* the deterministic rules, never replacing them |
| **4 — Compliance & interoperability** | Make the app safe to use with real patient data, and connectable to real health systems | Decide and implement the BAA/on-prem/de-identification approach for LLM calls (§4.2); design a FHIR-lite resource shape for medications/discharge plans so a future EHR integration doesn't require a data-model rewrite; formal data-retention and consent design for caregiver/family visibility |
| **5 — Frontend maturity & test depth** | Match the frontend to the backend's eventual hardening | React Query adoption; route-based code-splitting; accessibility pass (ARIA, focus order, screen-reader labels) for the target elderly/low-literacy audience; Vitest + Testing Library component tests; Playwright coverage of the demo flow end-to-end; basic load testing before any real launch |

### 4.4 Specific design patterns to apply while doing the above

- **Repository pattern** to pull DB queries out of `api.py`'s route bodies and into per-model modules — makes the N+1 fixes in Phase 2 and the future test suite in Phase 0/5 much easier to write.
- **Strategy pattern, formalized**: the Gemini→Groq→MOCK fallback in `groq_client.py` is already a strategy chain in spirit; give it an explicit interface (`class AIProvider: def chat(...)`) so adding a BAA-covered provider in Phase 4 is a one-class change, not a new `if PROVIDER == ...` branch.
- **Circuit breaker** around outbound LLM calls (e.g. via `pybreaker` or a small custom implementation) so a slow/degraded provider doesn't stack up blocking request threads.
- **Outbox pattern** for notification delivery: write the notification to the DB and a durable outbox row in the same transaction, then have a worker deliver it — removes the current "notify inline, hope it doesn't fail silently" pattern in routes like `log_dose` (`api.py:302-306`).
- **Token-bucket rate limiting via Redis** (e.g. `redis` + a sliding-window or token-bucket library) to replace both the in-memory login throttle (`auth.py:21-33`) and the ad hoc nudge limiter (`api.py:623-629`) with one shared, horizontally-safe primitive.

### 4.5 Open items this report deliberately does not decide for you

- `[TARGET_REGULATORY_REGIME]` — India's DPDP Act, HIPAA (if targeting a US market), both, or neither yet — this determines how strict the Phase 4 compliance work needs to be and on what timeline.
- `[TARGET_DEPLOYMENT_CLOUD_AND_MANAGED_POSTGRES_PROVIDER]` — e.g. Supabase vs Neon vs self-managed RDS; affects cost and how much of Phase 1 is "configure" vs "build."
- `[LLM_PROVIDER_WITH_BAA_OR_ON_PREM_DECISION]` — which model provider (if any) you can get a BAA/DPA with, versus self-hosting an open-weight model for anything touching real PHI.
- `[CLINICAL_ADVISOR_AVAILABILITY]` — Phase 3's triage rule review needs a clinician in the loop; whether one is available (mentor network, hospital partner, hackathon judge with a medical background) changes how that phase gets executed.
- `[MOBILE_STRATEGY]` — whether a native/Expo mobile app (as the blueprint assumes) is actually required, or whether the current responsive web app is the long-term client.
- `[SMS_VOICE_OUTREACH_BUDGET]` — whether an outreach channel (e.g. Twilio) for patients who don't open the app is in scope, given the competitive gap in §3.
- `[TEAM_SIZE_AND_FASTAPI_VS_NODE_FAMILIARITY]` — the recommendation in §4.1 to keep FastAPI assumes the team is more productive in Python than in the blueprint's proposed Express/TypeScript backend; worth confirming against actual team skills before committing to either direction.
