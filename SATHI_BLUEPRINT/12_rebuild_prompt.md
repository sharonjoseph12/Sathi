# 12_rebuild_prompt.md — The SATHI AI Rebuild Mega-Prompt

> **Instructions for the AI Agent (Cursor / Windsurf / Devin / Claude Code)**:
> You are tasked with building **SATHI**, an advanced, AI-powered post-discharge medical recovery and medication compliance platform from scratch. You MUST follow the exact architecture, folder structure, database schema, REST/SSE routes, AI system prompts, and UI screen flows specified below without deviation or simplification.

---

## SECTION 1: MONOREPO ARCHITECTURE & DEPENDENCIES

### 1. Workspace Configuration (`pnpm-workspace.yaml`)
Create a pnpm monorepo with the following workspace configuration:
```yaml
minimumReleaseAge: 1440
packages:
  - artifacts/*
  - lib/*
  - scripts
catalog:
  '@tanstack/react-query': ^5.90.21
  drizzle-orm: ^0.45.1
  framer-motion: ^12.23.24
  lucide-react: ^0.545.0
  react: 19.1.0
  react-dom: 19.1.0
  tailwindcss: ^4.1.14
  tsx: ^4.21.0
  vite: ^7.3.0
  zod: ^3.25.76
```

### 2. Complete Directory Structure
```
sathi-monorepo/
├── package.json / pnpm-workspace.yaml / tsconfig.base.json / Dockerfile / render.yaml
├── lib/
│   ├── db/                 # @workspace/db — PostgreSQL Drizzle ORM Schema & Pool
│   ├── api-spec/           # @workspace/api-spec — OpenAPI 3.0 yaml & Orval config
│   ├── api-zod/            # @workspace/api-zod — Generated Zod validation schemas
│   └── api-client-react/   # @workspace/api-client-react — React Query hooks
└── artifacts/
    ├── api-server/         # Express REST/SSE Backend (TypeScript, esbuild, pino, port 3001)
    └── discharge-buddy/    # Expo / React Native Mobile & Web Application (Expo Router)
```

---

## SECTION 2: DATABASE SCHEMA (`@workspace/db`)

Configure PostgreSQL using `drizzle-orm` and `drizzle-zod`. Define all tables, enums, and relationships in `lib/db/src/schema/index.ts`:

### Enums
- `user_role`: `["patient", "caregiver", "family", "doctor"]`
- `risk_level`: `["low", "medium", "high", "critical"]`
- `dose_status`: `["taken", "missed", "pending", "snoozed"]`
- `link_relationship`: `["family", "caregiver"]`
- `link_status`: `["active", "revoked", "pending", "rejected"]`
- `schedule_type`: `["ONCE", "RECURRING", "MEDICATION_LINKED"]`
- `reminder_status`: `["pending", "delivered", "failed", "cancelled"]`

### Core Table Definitions (Drizzle TypeScript)
1. **`users`**: `id` (uuid PK), `name` (text, required), `email` (text unique required), `role` (user_role enum), `password` (bcrypt text), `pushToken` (text), `anchorTimes` (jsonb default: `{"morning": "08:00", "afternoon": "14:00", "evening": "20:00", "night": "22:00"}`), `isEmailVerified` (boolean default false).
2. **`patients`**: `id` (uuid PK), `name` (text required), `age` (integer required), `condition` (text required), `dischargeDate` (timestamp required), `emergencyContact` (text required), `linkCode` (varchar(12) unique shareable code e.g. `DB-7G4K2P`), `createdAt` (timestamp default now).
3. **`care_links`**: `id` (uuid PK), `patientId` (uuid FK -> patients.id), `managerId` (uuid FK -> users.id), `relationship` (link_relationship enum), `status` (link_status enum default 'active'). **Unique constraint on `(patientId, managerId)`**.
4. **`messages`**: `id` (uuid PK), `senderId` (uuid FK -> users.id), `receiverId` (uuid FK -> users.id), `patientContextId` (uuid FK -> patients.id), `text` (text required), `audioBase64` (text nullable voice recording), `createdAt` (timestamp default now). **Index on `(patientContextId, createdAt)`**.
5. **`medicines`**: `id` (uuid PK), `patientId` (uuid FK -> patients.id), `name` (text required), `dosage` (text required), `frequency` (text required), `times` (text[] array required), `instructions` (text), `simplifiedInstructions` (text AI jargon-free), `startDate` (timestamp required), `status` (text enum `["active", "archived"]` default 'active').
6. **`dose_logs`**: `id` (uuid PK), `medicineId` (uuid FK -> medicines.id), `scheduledTime` (text HH:MM required), `takenAt` (timestamp), `status` (dose_status enum default 'pending'), `date` (text YYYY-MM-DD required), `escalatedToCaregiver` (boolean default false).
7. **`symptom_logs`**: `id` (uuid PK), `patientId` (uuid FK -> patients.id), `date` (timestamp default now), `symptoms` (text[] required), `severity` (integer 1-10 required), `notes` (text), `riskLevel` (risk_level enum required).
8. **`emergency_alerts`**: `id` (uuid PK), `userId` (uuid FK -> users.id), `timestamp` (timestamp default now), `status` (text default 'active').
9. **`scheduled_messages`** & **`voice_reminders`**: Store caregiver-recorded scheduled audio alerts and reminders.

---

## SECTION 3: BACKEND API & REAL-TIME SSE (`artifacts/api-server`)

Build an Express server listening on port `3001` with `pino-http` logging, `cors`, `express.json({ limit: "50mb" })`, and JWT bearer authentication middleware (`requireAuth` and `optionalAuth`).

### Required API Endpoints
- **Health**: `GET /api/health` -> `{ status: "ok", db: "connected" }`
- **Auth**:
  - `POST /api/auth/register`: Hash password, create user/patient, generate `linkCode`, return 30d JWT.
  - `POST /api/auth/login`: Verify credentials, return JWT + profile + linked patients.
  - `POST /api/auth/verify-otp` & `resend-otp`: 6-digit email verification.
  - `GET /api/auth/me`: Return current user and `getManagedPatients()`.
  - `PUT /api/auth/anchor-times`: Update routine JSONB.
- **Medicines & Dosing**:
  - `GET /api/medicines`, `POST /api/medicines`, `PUT /api/medicines/:id`, `DELETE /api/medicines/:id`.
  - `POST /api/medicines/:id/log`: Upsert dose log. If `status === 'missed'` after 4h, set `escalatedToCaregiver = true` and push FCM alert.
  - `GET /api/medicines/logs/today`: Return today's dose logs.
- **Activity & SOS**:
  - `POST /api/activity/symptom`: Log symptoms. If severity >= 7, set risk `'high'`/'`critical'` and immediately notify linked caregivers.
  - `GET /api/activity/stats`: Return adherence %, streak count, and XP stats.
  - `POST /api/emergency/trigger`: Create SOS alert, send high-priority push notification to all linked caregivers/family.
- **Real-Time Chat (SSE & Push)**:
  - `GET /api/chat/stream`: Maintain a `Map<string, Set<Response>>` of active connections per userId. Send `: ping\n\n` heartbeat every 25s.
  - `POST /api/chat/messages` & `/api/chat/send`: Insert row into `messages`. Invoke `pushToClients(receiverId, payload)`. If receiver socket is offline (`deliveredLive === false`), optionally execute `sendPushNotification()` (skipped in zero-cost hackathon demos).
- **Caregiver & Links**:
  - `POST /api/links/connect`: Validate 12-char code, insert row into `care_links` with unique constraint `(patientId, managerId)`.
  - `GET /api/caregiver/patients`: Return triage cards for all linked patients.

---

## SECTION 4: AI ENGINES & SYSTEM PROMPTS (`/api/ai` & `/api/ocr`)

Implement 5 AI integration pipelines using official 100% free SDKs (`groq-sdk`, `@andresaya/edge-tts`, `@google/generative-ai`):

### 1. Groq Whisper STT (`POST /api/ai/stt`)
Receive base64 audio buffer. Call `groq.audio.transcriptions.create({ model: "whisper-large-v3-turbo", file, temperature: 0, response_format: "json" })`. Return `{ text }`.

### 2. Microsoft Edge Neural TTS (`POST /api/ai/tts`)
Synthesize 24kHz mp3 audio using `@andresaya/edge-tts`. Use language mapping: `en`->`en-IN-NeerjaNeural`, `hi`->`hi-IN-SwaraNeural`, `bn`->`bn-IN-TanishaaNeural`, `es`->`es-ES-ElviraNeural`. Cache output in LRU memory map. Return `{ audioContent: base64, format: "mp3" }`.

### 3. Mr. Meddy Conversational Companion (`POST /api/ai/chat`)
Fetch live patient context (`medicines`, `symptom_logs`, `dose_logs`) and calculate `riskScore`. Pass last 8 turns (max 600 chars each) to Groq Llama 3.1 8B Instant (`llama-3.1-8b-instant`) in JSON mode.
**Exact System Prompt**:
```text
You are Mr. Meddy, a highly professional, compassionate, and intelligent post-discharge medical recovery companion.
YOUR MISSION: Provide genuinely helpful, specific, context-aware advice. Do NOT repeat yourself.
RULES:
1. ALWAYS use the patient context provided.
2. BE PROFESSIONAL: Do NOT use any emojis. Keep responses short — 2-4 sentences.
3. GIVE REAL ADVICE: For health issues, suggest practical next steps (rest, hydration, doctor monitoring).
4. ACTION ORIENTED: Suggest 1-2 relevant next steps in the app.
5. SEVERITY: Always use the word "severity" instead of "rating".
6. HIGH SEVERITY: If risk score > 80 or symptoms are critical, advise calling a doctor immediately.
OUTPUT FORMAT: Valid JSON only: { "message": "text", "actions": [{ "type": "TAKE_MEDICINE" | "LOG_SYMPTOM" | "NAVIGATE_TO_MEDICINES", "label": "Label" }] }
```

### 4. Intent Router (`POST /api/ai/intent`)
Check input text against emergency phrases (`["help me", "sos", "chest pain", "can't breathe", "heart attack", "slurred speech", "bachao", "madad"]`). If matched, return immediately: `{"intent":"ACTION_INTENT","target":"TRIGGER_EMERGENCY","confidence":0.99}`. Otherwise call Llama 3.1 8B to classify into `NAVIGATE`, `ACTION_INTENT`, `INFO_INTENT`, or `CHAT`.

### 5. OCR Prescription Pipeline (`POST /api/ocr/scan`)
Send image base64 to Groq Llama 4 Scout Vision (`meta-llama/llama-4-scout-17b-16e-instruct`). Pass raw text to Groq Llama 3.3 70B (`llama-3.3-70b-versatile`) with the following strict structuring prompt:
```text
Return ONLY valid JSON. Do NOT include markdown or backticks.
You are a medical OCR correction system. Fix spelling mistakes and recognize true medicine names even if distorted.
OUTPUT FORMAT:
{
  "medicines": [{ "name": "Full Name", "dosage": "e.g. 500mg", "frequency": "twice daily", "times": ["08:00", "20:00"], "notes": "instructions", "confidence": 95 }],
  "overall_instructions": "General notes",
  "explanation": "Simple 1-2 sentence summary for patient",
  "warnings": []
}
```
Enrich output with rule-based regex parser (`OD`->1 dose, `BD`->2 doses, `TDS`->3 doses).

### 6. Drug Interaction Checker (`POST /api/ai/drug-check`)
Query active medicines, pass to Llama 3.3 70B to check drug-drug conflicts and food incompatibility. Return `{ interactions: [{ pair: ["DrugA", "DrugB"], severity: "high"|"moderate"|"mild", description, advice }], hasCritical: boolean }`.

---

## SECTION 5: FRONTEND EXPO MOBILE & WEB APP (`artifacts/discharge-buddy`)

Build an offline-first React Native app using Expo Router, NativeWind/Tailwind, Reanimated 3, and Moti.

### Key Components & Animations
- `MascotBuddy.tsx`: 2D animated Beary SVG mascot floating vertically with blinking eyes and speech bubble.
- `AdherenceRing.tsx`: Circular SVG adherence gauge using Reanimated `withSpring(strokeDashoffset)`.
- `EmergencyButton.tsx`: Pulsing red SOS button with infinite radial wave rings.
- `VoiceInputButton.tsx`: Floating microphone recording trigger with sonic expansion ripples.
- `MedicineCard.tsx`: Interactive dose card with Take/Snooze buttons and AI Jargon Simplifier toggle.
- `AssistantProvider.tsx` & `AssistantOverlay.tsx`: Global AI voice state, streaming TTS audio playback queue, and full-screen conversational modal.

### Required Screen Flows
1. **Auth & Onboarding**: `/intro` (splash mascot) -> `/login` or `/register` -> `/role-select` (Patient/Caregiver/Family) -> `/onboarding` (condition & anchor times setup). Store JWT in `AsyncStorage` under `@sathi_auth_token`.
2. **Patient Tabs (`/(tabs)`)**:
   - `index.tsx`: Home dashboard with Beary mascot, adherence ring, next dose card, and floating Assistant button.
   - `medicines.tsx`: Medication schedule with time-of-day filters (Morning/Afternoon/Evening/Night) and offline dose queue in `@sathi_offline_doses`.
   - `symptoms.tsx`: Interactive symptom logger with 1-10 severity slider.
   - `schedule.tsx`: Vertical timeline of anchor times and appointments.
   - `progress.tsx`: Gamified XP stats, streak counters, and adherence charts.
3. **Core Features**:
   - `/scan`: Camera prescription scanner with bounding box review and one-click import.
   - `/chat`: Real-time SSE messaging with doctor/caregiver and Mr. Meddy AI bot.
   - `/drug-checker` & `/recovery-support`: AI interaction checker and jargon simplifier tools.
   - `/emergency` & `/cpr`: 5s countdown SOS alarm and 100-BPM audio/visual CPR metronome guide.
4. **Caregiver & Family Portals**:
   - `/caregiver/dashboard`: Multi-patient compliance ring triage feed and missed dose alerts.
   - `/caregiver/patient-detail` & `/caregiver/create-plan`: Remote medication authoring and AI discharge plan generator.
   - `/family/dashboard`: Read-only compliance monitoring and one-click encouragement push nudges.
5. **Hackathon Demo Mode**:
   - `/judge-demo`: One-click evaluation screen reachable from `/intro`. Seeds "Mary Smith, 58, Post-CABG" with 5 active medications and simulated Leaflet OpenStreetMap ambulance GPS dispatch tracking.

---

## SECTION 6: STEP-BY-STEP BUILD INSTRUCTIONS

Execute the project build in the following strict chronological order:
1. **Initialize Monorepo & Dependencies**: Create root `package.json`, `pnpm-workspace.yaml`, and install shared typescript/zod/drizzle catalogs.
2. **Build Database Package (`lib/db`)**: Set up Drizzle PostgreSQL client, define all 18 tables and enums in `schema/index.ts`, and run Drizzle kit push.
3. **Build API Backend Foundation (`artifacts/api-server`)**: Create Express server, setup pino logging, CORS, environment validator (`env.ts`), JWT auth middlewares, and additive schema guard (`ensureSchema.ts`).
4. **Implement Backend Routes & Controllers**: Build out all 21 route modules (`auth`, `medicines`, `activity`, `emergency`, `caregiver`, `family`, `links`, `followups`, `storage`, `support`, `voiceNotes`).
5. **Integrate AI & Real-Time Services**: Implement `ai.ts`, `ocr.ts`, `chat.ts` (with SSE heartbeat and connection registry), `PrescriptionService.ts`, `LanguageSimplifierService.ts`, and `notificationService.ts` (Expo/FCM push).
6. **Scaffold Expo Mobile App (`artifacts/discharge-buddy`)**: Configure Expo Router, NativeWind, Metro SVG/CSS bundler, and create client API wrapper (`lib/api.ts`) with Axios/Fetch bearer interceptors and auto-logout on HTTP 401.
7. **Build UI Components & Assistant Engine**: Develop Reanimated mascot, adherence ring, medicine cards, and global `AssistantProvider` voice streaming engine.
8. **Develop Mobile Screens & Tabs**: Build out all auth screens, patient bottom tabs, OCR scanner, drug checker, CPR guide, caregiver dashboard, and Judge Demo Mode.
9. **Verify & Smoke Test**: Execute backend TypeScript build (`pnpm run build`), verify SSE streaming socket connectivity, test offline dose logging queues in AsyncStorage, and run end-to-end OCR prescription structuring.

---

## SECTION 7: SUPPLEMENT FILES — Exact Implementation Source Code

The following supplement files contain **exact copy-paste source code** extracted from the original `artifacts/` directory. Every file below provides pixel-perfect, verbatim reference implementations that MUST be followed exactly.

| File | Content |
|------|---------|
| `SATHI_BLUEPRINT/13_ui_exact_specs.md` | **Pixel-level UI specs**: exact colors (light + dark hex codes), typography (Inter font sizes/weights per element), shadow values, animation durations/damping/stiffness per component, SVG paths for MascotBuddy BearSvg, border-radius patterns (16/22/24/40/50), component nesting structure |
| `SATHI_BLUEPRINT/14_backend_implementation.md` | **Complete backend source**: `index.ts`, `app.ts`, `env.ts`, `logger.ts`, `email.ts`, `ensureSchema.ts`, auth middleware (requireAuth/optionalAuth/demo token), routes/index.ts (all 21 route modules), medicineController.ts, medicineService.ts, notificationService.ts, voiceScheduleService.ts, DB client package.json/drizzle.config/index.ts, API server package.json/tsconfig/build.mjs. Full source for auth routes (register/login/verify-email/forgot-password/reset-password/sos-notify-family/dev-session/dev-login), chat routes (SSE stream/send/history/conversations with participant resolution), AI routes (Mr. Meddy chat/Groq STT/Edge TTS/drug-check/intent router) |
| `SATHI_BLUEPRINT/15_frontend_implementation.md` | **Complete frontend source**: Entry point (`app/index.tsx`), intro screen (clouds + mascot animation + bottom sheet), login screen (Google OAuth + email/password + role selection + demo modal + 892 lines), dashboard, medicines screen, chat screen (SSE + NeuralOrb + voice input), settings (profile/language/haptics/theme/links), AppContext (700+ lines with all state management + persistence + TTS + MockProvider/ApiProvider), ApiProvider (all REST endpoints), FloatingTabBar, MascotBuddy (Reanimated bear SVG with 5 moods + speech + blink), MedicineCard (borderRadius:22 + color accent + Take/Snooze), AdherenceRing (SVG circular progress), AnimPressable, EmergencyButton, NotificationToast, notifications system, translations (14 languages), package.json/app.json/metro.config/babel.config/tsconfig |
| `SATHI_BLUEPRINT/16_supplemental_code.md` | **Remaining backend routes** (activity, emergency, ocr, caregiver with AI risk engine, doseTracking, followup, family, links with full code CRUD + FCM push, voiceNotes, support, discharge, health, languageSimplifier, recovery, storage) + **utilities** (linkCode.ts, managedPatients.ts, pushService.ts) + **remaining frontend** (tab layout, dashboard screen ~680 lines with full components, SidebarContext, IDataProvider interface, MockProvider ~420 lines, NeuralOrb animated SVG, DotLoader, TranslateText) + **list of unextracted files** for direct reference from artifacts |
| `SATHI_BLUEPRINT/17_root_and_backend_complete.md` | **Root monorepo config** (package.json, pnpm-workspace.yaml, tsconfig.base.json, Dockerfile, render.yaml, .gitignore, .npmrc, .dockerignore) + **9 controllers** full source (activityController, emergencyController, followupController, familyController, recoveryController, storageController, languageSimplifierController, dischargeController, doseTrackingController) + **11 services** full source (PrescriptionService 347L with Groq Llama Vision OCR pipeline, dischargeService with anchor-based normalization + import/versioning, languageSimplifierService with Anthropic Claude, medicalParser 381L with frequency/timing/dosage rule engine, ocrClient with retry + fallback, emergencyService with multi-link manager notification, recoveryService with trend analysis + alert detection, followupService with reminder scheduling, doseTrackingService with auto-missed marking, activityService, storageService) |
| `SATHI_BLUEPRINT/18_frontend_complete.md` | **7 screens** (scan.tsx 977L prescription scanner with CameraView + gallery + Groq OCR pipeline + confidence display, cpr.tsx 577L with 4-mode guide + metronome, onboarding.tsx 582L 3-slide animated pager, verify-email.tsx 376L OTP flow, journal.tsx 374L mood/energy/text, drug-checker.tsx 248L interactions, meditation.tsx 421L timer + orb) + **components** (AssistantProvider.tsx 1290L voice assistant with TTS pipeline + intent routing + 97 emergency phrases, Sidebar.tsx 286L, SuccessBurst.tsx 156L, AdherenceChart.tsx 282L) + **3 hooks** (useSpeechToText 296L with VAD, useConnectivity 79L with debounce, useColors 24L) + **10 utils** (apiUrl, MessageEngine, conversationMemory, NotificationHelper, SoundHelper, translate, knowledgeBase, contextEngine, errorUtils, offlineCache) |

