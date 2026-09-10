# 16_team_of_3_build_guide.md — The SATHI Team of 3 Hackathon Execution Blueprint

> **Objective:** This guide divides the entire SATHI platform rebuild into **three parallel, zero-collision developer roles** tailored for the **100% Free Hackathon Alternative Tech Stack** (Supabase, Groq Llama 3.3, Gemini 1.5 Flash, Edge TTS, Render.com, and SSE Real-Time).
> Every team member has clear ownership, exact code/prompt specifications, and integration milestones.

---

## 👥 TEAM RESPONSIBILITY MATRIX

| Role | Title | Core Technologies | Primary Directory / Packages |
| :--- | :--- | :--- | :--- |
| **Dev A** | **AI & REST Backend Architect** | Node.js, Express, Groq Cloud, Gemini AI, Edge TTS, esbuild | `artifacts/api-server/src/routes/`, `src/services/` |
| **Dev B** | **Database & Real-Time Engineer**| Supabase PostgreSQL, Drizzle ORM, SSE Streams, Zod | `lib/db/`, `artifacts/api-server/src/routes/chat.ts` |
| **Dev C** | **Frontend & UI/UX Wizard** | Expo React Native, NativeWind, Reanimated 3, Moti, SVG | `artifacts/discharge-buddy/app/`, `components/` |

---

## 🛠️ DEEP-DIVE ROLE 1: DEVELOPER A (AI & REST BACKEND ARCHITECT)

### Your Goal
Build and deploy the Express API server on Render.com (`https://sathi-api.onrender.com`) and implement all 5 AI inference engines using official 100% free SDKs (`groq-sdk`, `@google/generative-ai`, `@andresaya/edge-tts`).

### 1. Key Environment Variables to Configure (`.env`)
```env
PORT=3001
JWT_SECRET=super_secret_jwt_key_here_for_hackathon_demo
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GOOGLE_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 2. AI Engine Specifications & Exact Prompts to Implement

#### A. Groq Whisper Speech-to-Text (`POST /api/ai/stt`)
- Receive base64 audio buffer from frontend.
- Call `groq.audio.transcriptions.create({ model: "whisper-large-v3-turbo", file, temperature: 0, response_format: "json" })`. Return `{ text: string }`.

#### B. Microsoft Edge Neural TTS (`POST /api/ai/tts`)
- Synthesize 24kHz mp3 audio using `@andresaya/edge-tts`.
- Map language codes: `en` -> `en-IN-NeerjaNeural`, `hi` -> `hi-IN-SwaraNeural`, `bn` -> `bn-IN-TanishaaNeural`, `es` -> `es-ES-ElviraNeural`.
- Return base64 mp3 string: `{ audioContent: base64String, format: "mp3" }`.

#### C. Mr. Meddy Conversational Companion (`POST /api/ai/chat`)
- Fetch patient's active medicines, symptom logs, and calculated risk score from Dev B's database queries.
- Call Groq Llama 3.1 8B Instant (`llama-3.1-8b-instant`) in strict JSON mode.
- **Exact System Prompt**:
  ```text
  You are Mr. Meddy, a highly professional, compassionate, and intelligent post-discharge medical recovery companion.
  YOUR MISSION: Provide genuinely helpful, specific, context-aware advice. Do NOT repeat yourself.
  RULES:
  1. ALWAYS use the patient context provided (medicines, symptoms, risk score).
  2. BE PROFESSIONAL: Do NOT use any emojis. Keep responses short — 2-4 sentences.
  3. GIVE REAL ADVICE: Suggest practical next steps (rest, hydration, doctor monitoring).
  4. ACTION ORIENTED: Suggest 1-2 relevant next steps in the app.
  5. SEVERITY: Always use the word "severity" instead of "rating".
  6. HIGH SEVERITY: If risk score > 80 or symptoms are critical, advise calling a doctor immediately.
  OUTPUT FORMAT: Valid JSON only: { "message": "text", "actions": [{ "type": "TAKE_MEDICINE" | "LOG_SYMPTOM" | "NAVIGATE_TO_MEDICINES", "label": "Label" }] }
  ```

#### D. AI Jargon Simplifier (`POST /api/language/simplify`)
- Call Groq Llama 3.3 70B Versatile (`llama-3.3-70b-versatile`) directly without any database lookup.
- **Exact System Prompt**:
  ```text
  You are a medical language simplifier for patients. Convert the given medical instruction into simple, clear English that a non-medical person can understand. Keep it under 2 sentences. Do not add warnings. Only simplify.
  ```

#### E. OCR Prescription Pipeline (`POST /api/ocr/scan`)
- Send image base64 to Groq Llama 4 Scout Vision (`meta-llama/llama-4-scout-17b-16e-instruct`).
- Pass extracted raw text to Groq Llama 3.3 70B (`llama-3.3-70b-versatile`) with the following structuring prompt:
  ```text
  Return ONLY valid JSON. Do NOT include markdown or backticks.
  You are a medical OCR correction system. Fix spelling mistakes and recognize true medicine names even if distorted.
  OUTPUT FORMAT:
  {
    "medicines": [{ "name": "Full Name", "dosage": "500mg", "frequency": "twice daily", "times": ["08:00", "20:00"], "notes": "instructions", "confidence": 95 }],
    "overall_instructions": "General notes",
    "explanation": "Simple 1-2 sentence summary for patient",
    "warnings": []
  }
  ```

---

## 🛠️ DEEP-DIVE ROLE 2: DEVELOPER B (DATABASE & REAL-TIME ENGINEER)

### Your Goal
Provision the **Supabase PostgreSQL** free tier instance, write the Drizzle ORM schemas (`lib/db/src/schema/index.ts`), run schema migrations, and build the real-time Server-Sent Events (SSE) streaming chat and SOS broadcast engine.

### 1. Supabase Connection Setup
- In Supabase Dashboard -> Project Settings -> Database -> Connection string, select **Session Pooler (port 6543)** or **IPv4 Direct connection string**.
- Set `DATABASE_URL` in `.env`:
  ```env
  DATABASE_URL=postgresql://postgres.xxxxx:your_password@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
  ```

### 2. Drizzle ORM Schema Checklist (`lib/db/src/schema/index.ts`)
Define these 8 core tables with exact foreign key relationships:
1. `users`: `id` (uuid PK), `name`, `email` (unique), `role` (enum: `patient`, `caregiver`, `family`, `doctor`), `password` (bcrypt), `anchorTimes` (jsonb default: `{"morning": "08:00", "afternoon": "14:00", "evening": "20:00", "night": "22:00"}`).
2. `patients`: `id` (uuid PK), `name`, `age`, `condition`, `dischargeDate`, `emergencyContact`, `linkCode` (varchar(12) unique e.g. `DB-7G4K2P`).
3. `care_links`: `id` (uuid PK), `patientId` (FK -> patients.id), `managerId` (FK -> users.id), `relationship` (enum: `caregiver`, `family`), `status` (default `'active'`). **Unique constraint on `(patientId, managerId)`**.
4. `medicines`: `id` (uuid PK), `patientId` (FK), `name`, `dosage`, `frequency`, `times` (text[] array), `instructions`, `simplifiedInstructions`, `startDate`, `status` (`active`/`archived`).
5. `dose_logs`: `id` (uuid PK), `medicineId` (FK), `scheduledTime` (HH:MM), `takenAt` (timestamp), `status` (enum: `taken`, `missed`, `pending`, `snoozed`), `date` (YYYY-MM-DD), `escalatedToCaregiver` (boolean default false).
6. `symptom_logs`: `id` (uuid PK), `patientId` (FK), `date`, `symptoms` (text[]), `severity` (integer 1-10), `notes`, `riskLevel` (enum: `low`, `medium`, `high`, `critical`).
7. `messages`: `id` (uuid PK), `senderId` (FK), `receiverId` (FK), `patientContextId` (FK), `text`, `audioBase64`, `createdAt`. **Index on `(patientContextId, createdAt)`**.
8. `emergency_alerts`: `id` (uuid PK), `userId` (FK), `timestamp`, `status` (`active`/`resolved`).

### 3. Server-Sent Events (SSE) Real-Time Engine (`src/routes/chat.ts`)
Implement the SSE stream without Firebase:
```typescript
const clients = new Map<string, Set<Response>>();

router.get("/stream", requireAuth, (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();
  res.write(`data: {"type":"connected"}\n\n`);

  let set = clients.get(userId) || new Set();
  set.add(res);
  clients.set(userId, set);

  // 25s keepalive heartbeat comment to prevent proxy timeout
  const heartbeat = setInterval(() => res.write(`: ping\n\n`), 25000);

  req.on("close", () => {
    clearInterval(heartbeat);
    set.delete(res);
    if (set.size === 0) clients.delete(userId);
  });
});

export function pushToClients(userId: string, payload: any): boolean {
  const userClients = clients.get(userId);
  if (!userClients || userClients.size === 0) return false;
  const dataString = `data: ${JSON.stringify(payload)}\n\n`;
  userClients.forEach((res) => {
    try { res.write(dataString); } catch { userClients.delete(res); }
  });
  return true;
}
```

---

## 🛠️ DEEP-DIVE ROLE 3: DEVELOPER C (FRONTEND & UI/UX WIZARD)

### Your Goal
Build a stunning, vibrant, premium Expo React Native mobile/web app (`artifacts/discharge-buddy/`) that connects to Dev A's Render URL and showcases all interactive animations and Hackathon Judge Demo Mode.

### 1. Core Config & API Interceptor Setup (`lib/api.ts`)
Set `EXPO_PUBLIC_API_URL=https://sathi-api.onrender.com`. Ensure Axios/Fetch attaches `Authorization: Bearer <token>` from AsyncStorage (`@sathi_auth_token`) and redirects to `/login` on HTTP 401.

### 2. High-Impact Components & Animations to Build
- **`MascotBuddy.tsx`**: Reanimated 2D bear SVG mascot. Use `withRepeat(withSequence(withTiming(-6), withTiming(6)), -1, true)` for floating hover animation.
- **`AdherenceRing.tsx`**: Circular SVG gauge using Reanimated `strokeDashoffset` transition.
- **`MedicineCard.tsx`**: Card with large `borderRadius: 22`, vibrant gradient header, Take/Snooze buttons, and "Simplify Jargon" AI toggle button that calls `/api/language/simplify`.
- **`EmergencyButton.tsx`**: Pulsing red SOS button (`#EF4444`) with expanding concentric radial rings.
- **`AssistantOverlay.tsx`**: Full-screen voice modal with a glowing sonic orb that streams Edge TTS mp3 audio.

### 3. Required Screens & Flows
1. **Onboarding**: `/intro` (clouds + mascot) -> `/login` (email/password + 6-digit OTP) -> `/role-select` -> `/onboarding` (anchor times setup).
2. **Tabs (`/(tabs)`)**:
   - `index.tsx`: Home dashboard with Beary mascot, next scheduled dose, adherence ring, and floating Buddy orb.
   - `medicines.tsx`: Time-of-day tabs (Morning, Afternoon, Evening, Night) with offline queueing in AsyncStorage.
   - `symptoms.tsx`: 1-10 severity slider that calls `/api/activity/symptom`.
   - `progress.tsx`: Gamified 30-day streak trophy and XP counter.
3. **Core Action Screens**:
   - `/scan`: Camera prescription capture with cropping review and import to calendar.
   - `/chat`: Real-time SSE chat thread with caregiver/doctor and Mr. Meddy AI.
   - `/emergency` & `/cpr`: 5-second siren countdown leading to an audio/visual 100-BPM CPR metronome guide.
   - `/judge-demo`: The **Hackathon Evaluation Sandbox**.

---

## ⏱️ 24-HOUR HACKATHON SYNCHRONIZATION TIMELINE

```
[Hours 1–4] FOUNDATION PHASE
 ├─ Dev A: Initialize Node.js Express server, CORS, pino logging, env validator, and Render deployment.
 ├─ Dev B: Provision Supabase database, write Drizzle 8-table schema, and run initial db push.
 └─ Dev C: Scaffold Expo Router mobile app, configure NativeWind/Tailwind, create client API wrapper.

[Hours 5–12] CORE FEATURES & AI INTEGRATION
 ├─ Dev A: Implement Groq Whisper STT, Edge TTS mp3 streaming, Mr. Meddy Llama 3.1 chat, and Jargon Simplifier.
 ├─ Dev B: Build REST endpoints for `/api/medicines`, `/api/activity/symptom`, and SSE `/api/chat/stream`.
 └─ Dev C: Build MascotBuddy, AdherenceRing, MedicineCard, and tab navigation screens (Home, Meds, Symptoms).

[Hours 13–20] FULL PIPELINE CONNECTION & REAL-TIME TESTS
 ├─ Dev A & B: Build Groq Vision OCR prescription structuring pipeline and emergency SOS push engine.
 ├─ Dev C: Connect `/scan` camera to OCR endpoint, implement `/cpr` 100-BPM metronome, build `/chat` SSE reader.
 └─ ALL: Perform cross-device E2E smoke tests (log dose on mobile -> verify SSE instant update on caregiver web).

[Hours 21–24] DEMO MODE & PITCH REHEARSAL
 ├─ Dev C: Build `/judge-demo` screen, seeding "Mary Smith, 58, Post-CABG" with 5 medicines and interaction warning.
 ├─ Dev A & B: Ensure API error catch blocks serve local offline fallbacks if hackathon Wi-Fi drops.
 └─ ALL: Complete 3-minute pitch walkthrough rehearsal.
```
