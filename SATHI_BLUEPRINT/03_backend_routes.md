# 03_backend_routes.md — SATHI Complete API Routes Specification

This document details every single REST and SSE endpoint mounted in the SATHI Express backend.

---

## 1. Health & Diagnostics

### `GET /api/health`
- **Auth Required?**: No
- **Request Body**: None
- **Response Schema**: `{ "status": "ok", "timestamp": "ISO-8601", "db": "connected", "version": "1.0.0" }`
- **Internal Logic**: Executes a lightweight health check ping against the PostgreSQL database connection pool (`pool.query("SELECT 1")`).
- **DB Tables Touched**: None (raw pool ping).
- **AI Services Called**: None.
- **Error Cases**: Returns `503 Service Unavailable` if database pool connection fails.

---

## 2. Authentication & User Profile (`/api/auth`)

### `POST /api/auth/register`
- **Auth Required?**: No
- **Request Body (Zod)**:
  ```typescript
  z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
    role: z.enum(["patient", "caregiver", "family", "doctor"]),
    age: z.number().optional(),
    condition: z.string().optional(),
    dischargeDate: z.string().optional(),
    emergencyContact: z.string().optional(),
    hospital: z.string().optional(),
    designation: z.string().optional()
  })
  ```
- **Response Schema**: `{ "token": "jwt_string", "user": { id, name, email, role, ... }, "patient": { id, linkCode, ... } }`
- **Internal Logic**: Hashes password using bcrypt. Creates user in `users`. If role is `'patient'`, generates a shareable 12-char link code (`DB-XXXXXX`) and inserts record into `patients`. Also seeds a self-referential or manager link in `care_links`. Generates signed JWT valid for 30 days.
- **DB Tables Touched**: `users`, `patients`, `care_links`.
- **AI Services Called**: None.
- **Error Cases**: `400 Bad Request` if email already exists or Zod validation fails.

### `POST /api/auth/login`
- **Auth Required?**: No
- **Request Body (Zod)**: `z.object({ email: z.string().email(), password: z.string() })`
- **Response Schema**: `{ "token": "jwt_string", "user": UserObject, "patient": PatientObject }`
- **Internal Logic**: Looks up email in `users`. Compares bcrypt password hash. If user has a linked patient or is a patient, fetches patient entity from `patients` and active links from `care_links`. Returns signed JWT.
- **DB Tables Touched**: `users`, `patients`, `care_links`.
- **AI Services Called**: None.
- **Error Cases**: `401 Unauthorized` on invalid email or password; `404 Not Found` if user deleted.

### `POST /api/auth/verify-otp`
- **Auth Required?**: No
- **Request Body**: `z.object({ email: z.string().email(), code: z.string().length(6) })`
- **Response Schema**: `{ "verified": true, "message": "Email verified successfully" }`
- **Internal Logic**: Checks if `users.email_verification_code` matches `code` and `users.email_verification_expires > now()`. Sets `is_email_verified = true` and clears code fields.
- **DB Tables Touched**: `users`.
- **AI Services Called**: None.
- **Error Cases**: `400 Bad Request` if code is incorrect or expired.

### `POST /api/auth/resend-otp`
- **Auth Required?**: No
- **Request Body**: `z.object({ email: z.string().email() })`
- **Response Schema**: `{ "success": true, "message": "New verification code sent" }`
- **Internal Logic**: Generates a random 6-digit OTP code, sets expiration to 15 minutes from now in `users`, and invokes `email.ts` to send email via nodemailer / SMTP.
- **DB Tables Touched**: `users`.
- **AI Services Called**: None.
- **Error Cases**: `404 Not Found` if email not registered.

### `GET /api/auth/me`
- **Auth Required?**: Yes (Any Role)
- **Request Body**: None
- **Response Schema**: `{ "user": UserObject, "patient": PatientObject, "managedPatients": PatientObject[] }`
- **Internal Logic**: Retrieves current authenticated user from database via `req.user.id`. If user is a caregiver/family member, calls `getManagedPatients(user.id)` to return all connected patient profiles from `care_links`.
- **DB Tables Touched**: `users`, `patients`, `care_links`.
- **AI Services Called**: None.
- **Error Cases**: `401 Unauthorized` if JWT missing or invalid; `404 Not Found` if account deleted.

### `POST /api/auth/push-token`
- **Auth Required?**: Yes (Any Role)
- **Request Body**: `z.object({ pushToken: z.string() })`
- **Response Schema**: `{ "success": true, "message": "Push token updated" }`
- **Internal Logic**: Updates `users.push_token` with the client's Expo/Firebase notification token for background alerts.
- **DB Tables Touched**: `users`.
- **AI Services Called**: None.
- **Error Cases**: `400 Bad Request` if token empty.

### `PUT /api/auth/anchor-times`
- **Auth Required?**: Yes (Any Role)
- **Request Body**: `z.object({ morning: z.string(), afternoon: z.string(), evening: z.string(), night: z.string() })`
- **Response Schema**: `{ "success": true, "anchorTimes": { ... } }`
- **Internal Logic**: Updates the JSONB `anchor_times` column in `users` to customize default dosing slots.
- **DB Tables Touched**: `users`.
- **AI Services Called**: None.
- **Error Cases**: `400 Bad Request` if time strings are not valid HH:MM format.

### `POST /api/auth/forgot-password` & `POST /api/auth/reset-password`
- **Auth Required?**: No
- **Request Body**: `z.object({ email: z.string().email() })` & `z.object({ token: z.string(), newPassword: z.string().min(6) })`
- **Response Schema**: `{ "success": true, "message": "..." }`
- **Internal Logic**: Generates temporary password reset token sent via email; resets bcrypt hash upon token verification.
- **DB Tables Touched**: `users`.
- **AI Services Called**: None.
- **Error Cases**: `400 Bad Request` if token expired or invalid.

---

## 3. Medications & Schedule (`/api/medicines`)

### `GET /api/medicines`
- **Auth Required?**: Yes (Any Role; caregivers see linked patient's meds)
- **Request Body**: None
- **Response Schema**: `MedicineObject[]`
- **Internal Logic**: Resolves target `patientId` (user's own patient ID or query parameter if caregiver). Queries `medicines` where `status = 'active'`.
- **DB Tables Touched**: `medicines`, `patients`, `care_links`.
- **AI Services Called**: None.
- **Error Cases**: `403 Forbidden` if caregiver lacks active link in `care_links`.

### `POST /api/medicines`
- **Auth Required?**: Yes (`patient` or `caregiver` with active link)
- **Request Body (Zod)**:
  ```typescript
  z.object({
    name: z.string(),
    dosage: z.string(),
    frequency: z.string(),
    times: z.array(z.string()),
    instructions: z.string().optional(),
    color: z.string().optional(),
    totalPills: z.number().optional(),
    patientId: z.string().uuid().optional()
  })
  ```
- **Response Schema**: `MedicineObject`
- **Internal Logic**: Inserts medication record into `medicines`. Automatically triggers background jargon simplification on `instructions`.
- **DB Tables Touched**: `medicines`.
- **AI Services Called**: Groq Llama 3.3 70B (`llama-3.3-70b-versatile`) (asynchronous background call to populate `simplified_instructions`).
- **Error Cases**: `400 Bad Request` on validation failure.

### `PUT /api/medicines/:id` & `DELETE /api/medicines/:id`
- **Auth Required?**: Yes (`patient` or linked `caregiver`)
- **Request Body**: Updates to medication fields (for PUT); none for DELETE.
- **Response Schema**: `{ "success": true, "medicine": MedicineObject }`
- **Internal Logic**: Updates medication details or sets `status = 'archived'` (soft delete) in `medicines`.
- **DB Tables Touched**: `medicines`.
- **AI Services Called**: None.
- **Error Cases**: `404 Not Found` if medicine doesn't exist.

### `POST /api/medicines/:id/log`
- **Auth Required?**: Yes (`patient` or linked `caregiver`)
- **Request Body**: `z.object({ scheduledTime: z.string(), status: z.enum(["taken", "missed", "snoozed"]), date: z.string() })`
- **Response Schema**: `DoseLogObject`
- **Internal Logic**: Upserts dose log entry in `dose_logs` for the given medicine and scheduled time slot. If status is `'missed'` and time > 4 hours ago, sets `escalated_to_caregiver = true` and fires push notification to linked caregivers.
- **DB Tables Touched**: `dose_logs`, `medicines`, `users`, `care_links`.
- **AI Services Called**: None.
- **Error Cases**: `404 Not Found` if medicine ID invalid.

### `GET /api/medicines/logs/today`
- **Auth Required?**: Yes (Any Role)
- **Request Body**: None
- **Response Schema**: `DoseLogObject[]`
- **Internal Logic**: Returns all dose logs for the target patient matching today's date string (`YYYY-MM-DD`).
- **DB Tables Touched**: `dose_logs`, `medicines`.
- **AI Services Called**: None.
- **Error Cases**: `401 Unauthorized`.

---

## 4. Activity, Symptoms & Journal (`/api/activity`)

### `POST /api/activity/symptom`
- **Auth Required?**: Yes (`patient`)
- **Request Body (Zod)**: `z.object({ symptoms: z.array(z.string()), severity: z.number().min(1).max(10), notes: z.string().optional() })`
- **Response Schema**: `SymptomLogObject`
- **Internal Logic**: Computes `riskLevel` (`'low'` if severity <= 3, `'medium'` if 4-6, `'high'` if 7-8, `'critical'` if 9-10). Inserts row into `symptom_logs`. If `riskLevel` is `'high'` or `'critical'`, immediately invokes `NotificationService` to push SOS warnings to all linked managers in `care_links`.
- **DB Tables Touched**: `symptom_logs`, `patients`, `care_links`, `users`.
- **AI Services Called**: None directly (risk classification is rule-based on severity scale).
- **Error Cases**: `400 Bad Request` if severity out of bounds.

### `POST /api/activity/journal` & `GET /api/activity/journal`
- **Auth Required?**: Yes (`patient` or `user`)
- **Request Body**: `z.object({ mood: z.number().min(1).max(5), energy: z.number().min(1).max(5), text: z.string() })`
- **Response Schema**: `JournalEntryObject` or `JournalEntryObject[]`
- **Internal Logic**: Creates or lists mood diary entries from `journal_entries` ordered by `date` descending.
- **DB Tables Touched**: `journal_entries`.
- **AI Services Called**: None.
- **Error Cases**: `400 Bad Request` on invalid mood/energy scale.

### `GET /api/activity/stats`
- **Auth Required?**: Yes
- **Request Body**: None
- **Response Schema**: `{ "adherencePercentage": number, "currentStreak": number, "xp": number, "totalDoses": number, "takenDoses": number }`
- **Internal Logic**: Aggregates `dose_logs` over the last 30 days. Calculates percentage of `'taken'` vs total scheduled doses. Computes consecutive daily streak and gamification XP (10 XP per dose taken + 50 XP bonus per 7-day streak).
- **DB Tables Touched**: `dose_logs`, `medicines`.
- **AI Services Called**: None.
- **Error Cases**: `401 Unauthorized`.

---

## 5. Emergency & SOS (`/api/emergency`)

### `POST /api/emergency/trigger`
- **Auth Required?**: Yes (`patient`)
- **Request Body**: `z.object({ latitude: z.number().optional(), longitude: z.number().optional(), note: z.string().optional() })`
- **Response Schema**: `{ "success": true, "alertId": "uuid", "notifiedCaregivers": number }`
- **Internal Logic**: Inserts an active alert record into `emergency_alerts` (`status = 'active'`). Retrieves all linked managers from `care_links`. Sends high-priority FCM push notifications ("🚨 EMERGENCY ALERT from [Patient Name]") with sound vibration and SMS trigger payload.
- **DB Tables Touched**: `emergency_alerts`, `care_links`, `users`, `patients`.
- **AI Services Called**: None.
- **Error Cases**: `500 Internal Server Error` if push service fails.

### `POST /api/emergency/cancel` & `GET /api/emergency/status`
- **Auth Required?**: Yes
- **Request Body**: `z.object({ alertId: z.string().uuid() })`
- **Response Schema**: `{ "success": true, "status": "cancelled" }`
- **Internal Logic**: Updates `emergency_alerts` status to `'cancelled'`. Notifies caregivers that distress call was resolved.
- **DB Tables Touched**: `emergency_alerts`.
- **AI Services Called**: None.
- **Error Cases**: `404 Not Found` if alert ID non-existent.

---

## 6. AI & Voice Engines (`/api/ai`)

### `POST /api/ai/tts`
- **Auth Required?**: No (Optional Auth)
- **Request Body**: `z.object({ text: z.string(), language: z.string().optional(), voice: z.string().optional(), rate: z.number().optional(), pitch: z.number().optional() })`
- **Response Schema**: `{ "audioContent": "base64_mp3_string", "format": "mp3", "voiceId": "en-IN-NeerjaNeural" }`
- **Internal Logic**: Sanitizes emojis and special unicode symbols. Resolves target Microsoft Edge neural voice based on language mapping (`EDGE_VOICE_BY_LANG`). Checks in-memory LRU cache (`ttsCache`, max 1000 items). Synthesizes 24kHz audio via `@andresaya/edge-tts`.
- **DB Tables Touched**: None.
- **AI Services Called**: Microsoft Edge Neural TTS online service.
- **Error Cases**: `400 Bad Request` if text empty; `500 Internal Server Error` if Edge TTS network fails after 1 retry.

### `POST /api/ai/stt`
- **Auth Required?**: No (Optional Auth)
- **Request Body**: `z.object({ audioBase64: z.string(), fileExtension: z.string().optional(), language: z.string().optional() })`
- **Response Schema**: `{ "text": "Transcribed speech text" }`
- **Internal Logic**: Converts base64 audio string to Buffer. Rejects buffers < 1000 bytes. Wraps in Groq SDK file object. Calls Groq Whisper API (`whisper-large-v3-turbo`) with temperature `0` and optional ISO language hint.
- **DB Tables Touched**: None.
- **AI Services Called**: Groq Whisper (`whisper-large-v3-turbo`).
- **Error Cases**: `400 Bad Request` if audio recording is too short/empty; `500 Internal Server Error` if Groq API key missing.

### `POST /api/ai/chat`
- **Auth Required?**: No (Optional Auth; Guest context if unauthenticated)
- **Request Body**: `z.object({ userQuery: z.string(), language: z.string().optional(), history: z.array(z.object({ role: z.string(), text: z.string() })).optional(), screenContext: z.string().optional() })`
- **Response Schema**: `{ "message": "Calm text reply in target language", "actions": [{ "type": "TAKE_MEDICINE" | "LOG_SYMPTOM" | "NAVIGATE_TO_MEDICINES", "label": "Button Label" }] }`
- **Internal Logic**: Queries `patients`, `medicines`, `symptom_logs`, and `dose_logs` to build real-time patient context object. Calculates numerical `riskScore` (adds 15 per missed dose, 30-40 per high severity symptom). Formats prompt with `SYSTEM_PROMPT`, language directive, 8 turns of conversation history, and current UI screen context. Calls Groq Llama 3.1 8B Instant (`llama-3.1-8b-instant`) in JSON object mode.
- **DB Tables Touched**: `patients`, `medicines`, `symptom_logs`, `dose_logs`.
- **AI Services Called**: Groq Llama 3.1 (`llama-3.1-8b-instant`).
- **Error Cases**: Returns graceful JSON error fallback message with `"RETRY"` action if Groq request times out or fails.

### `POST /api/ai/drug-check`
- **Auth Required?**: No (Optional Auth)
- **Request Body**: `z.object({ medicines: z.array(z.string()).optional() })`
- **Response Schema**: `{ "interactions": [{ "pair": ["DrugA", "DrugB"], "severity": "mild"|"moderate"|"high", "description": "...", "advice": "..." }], "foodWarnings": ["..."], "summary": "...", "hasCritical": boolean, "medicinesChecked": string[] }`
- **Internal Logic**: If `medicines` array is empty, queries user's active medication list from `medicines` table. De-duplicates and caps list to 30 items. Sends formatted list to Groq Llama 3.3 70B Versatile (`llama-3.3-70b-versatile`) with clinical pharmacology instructions. Sets `hasCritical = true` if any interaction severity is `'high'`.
- **DB Tables Touched**: `medicines` (if no explicit list provided).
- **AI Services Called**: Groq Llama 3.3 (`llama-3.3-70b-versatile`).
- **Error Cases**: Returns empty interactions array with explanatory summary if < 2 medicines provided.

### `POST /api/ai/intent`
- **Auth Required?**: No (Optional Auth)
- **Request Body**: `z.object({ text: z.string(), context: z.string().optional() })`
- **Response Schema**: `{ "intent": "NAVIGATE" | "ACTION_INTENT" | "INFO_INTENT" | "CHAT" | "UNKNOWN", "target": "TARGET_STRING", "metadata": { "symptom"?: string, "severity"?: number, "timerMinutes"?: number, "isMeditation"?: boolean }, "confidence": number }`
- **Internal Logic**: Checks deterministic emergency keyword list (`EMERGENCY_INTENT_PHRASES`). If matched, short-circuits immediately to return `target: "TRIGGER_EMERGENCY"` with `0.99` confidence. Otherwise, invokes Groq Llama 3.1 8B (`llama-3.1-8b-instant`) to classify command into exact navigation screens or actionable intents (e.g. `TAKE_MEDICINE`, `LANG_BN`, `SET_TIMER`).
- **DB Tables Touched**: None.
- **AI Services Called**: Groq Llama 3.1 (`llama-3.1-8b-instant`).
- **Error Cases**: Returns `{ intent: "UNKNOWN", confidence: 0.2 }` on JSON parse error or unrecognized text.

---

## 7. OCR Prescription Scanner (`/api/ocr`)

### `POST /api/ocr/scan`
- **Auth Required?**: Yes (`patient` or `caregiver`)
- **Request Body**: `z.object({ imageBase64: z.string() })`
- **Response Schema**: `{ "medicines": ExtractedMedicine[], "general_instructions": string, "explanation": string, "warnings": string[], "overall_confidence": number, "ocr_source": string }`
- **Internal Logic**: Validates base64 payload (< 20MB limit). Calls `PrescriptionService.analyzePrescription(imageBase64)`.
  1. Executes OCR Vision extraction via Groq Llama 4 Scout Vision (`meta-llama/llama-4-scout-17b-16e-instruct`).
  2. Passes raw OCR text to Groq Llama 3.3 70B (`llama-3.3-70b-versatile`) with `STRUCTURING_PROMPT` to correct OCR typos, map abbreviations, extract specific 24h `times[]`, and generate a plain English explanation.
  3. Enriches results using rule-based `medicalParser.ts` (frequency regexes, timing codes).
- **DB Tables Touched**: None directly (returned JSON is presented on screen for user approval before saving to `medicines`).
- **AI Services Called**: Groq Vision (`meta-llama/llama-4-scout-17b-16e-instruct`), Groq Llama 3.3 (`llama-3.3-70b-versatile`). Fallback to Python microservice / Gemini Vision (`gemini-1.5-flash`).
- **Error Cases**: `400 Bad Request` if base64 corrupted or empty; `413 Payload Too Large` if > 20MB.

---

## 8. Caregiver Management & Monitoring (`/api/caregiver`)

### `GET /api/caregiver/patients`
- **Auth Required?**: Yes (`caregiver` or `family`)
- **Request Body**: None
- **Response Schema**: `Array<{ patient: PatientObject, activeMedicinesCount: number, todayAdherence: number, latestRiskLevel: string }>`
- **Internal Logic**: Queries `care_links` for all active patient IDs linked to `req.user.id`. Joins `patients`, `medicines`, and `symptom_logs` to assemble live status cards for caregiver dashboard.
- **DB Tables Touched**: `care_links`, `patients`, `medicines`, `symptom_logs`, `dose_logs`.
- **AI Services Called**: None.
- **Error Cases**: `403 Forbidden` if user is not a caregiver or family member.

### `GET /api/caregiver/patient/:id` & `GET /api/caregiver/patient/:id/adherence`
- **Auth Required?**: Yes (`caregiver` linked to `:id`)
- **Request Body**: None
- **Response Schema**: Detailed patient profile, full medicine list, 14-day adherence chart data, and symptom log history.
- **Internal Logic**: Validates link in `care_links`. Returns deep inspection data for the patient detail screen.
- **DB Tables Touched**: `care_links`, `patients`, `medicines`, `dose_logs`, `symptom_logs`.
- **AI Services Called**: None.
- **Error Cases**: `403 Forbidden` if link status is `'revoked'` or non-existent.

### `POST /api/caregiver/patient/:id/medicine`, `PUT /api/caregiver/patient/:id/medicine/:medId`, `DELETE /api/caregiver/patient/:id/medicine/:medId`
- **Auth Required?**: Yes (`caregiver` with `relationship = 'caregiver'`)
- **Request Body**: Same as `/api/medicines` endpoints.
- **Response Schema**: Updated medicine object.
- **Internal Logic**: Allows caregivers to remotely author, modify, or delete medication regimens for their linked patient.
- **DB Tables Touched**: `medicines`, `care_links`.
- **AI Services Called**: Groq Llama 3.3 70B (for instruction simplification).
- **Error Cases**: `403 Forbidden` if user is linked as `'family'` (family members are read-only).

### `POST /api/caregiver/patient/:id/nudge`
- **Auth Required?**: Yes (`caregiver` or `family`)
- **Request Body**: `z.object({ message: z.string().optional() })`
- **Response Schema**: `{ "success": true, "message": "Nudge sent" }`
- **Internal Logic**: Looks up patient's associated user account and `pushToken`. Dispatches an encouraging push notification alert ("💜 Friendly reminder from your caregiver to check your meds!").
- **DB Tables Touched**: `care_links`, `patients`, `users`.
- **AI Services Called**: None.
- **Error Cases**: `404 Not Found` if patient has no registered push token.

### `POST /api/caregiver/patient/:id/discharge-plan`
- **Auth Required?**: Yes (`caregiver`)
- **Request Body**: `z.object({ hospitalName: z.string().optional(), rawText: z.string() })`
- **Response Schema**: `DischargePlanObject`
- **Internal Logic**: Uses AI to parse a copy-pasted hospital discharge summary into a structured plan stored in `discharge_plans`.
- **DB Tables Touched**: `discharge_plans`, `care_links`.
- **AI Services Called**: Groq Llama 3.3 (`llama-3.3-70b-versatile`).
- **Error Cases**: `400 Bad Request` if rawText is empty.

---

## 9. Real-Time Chat & Messaging (`/api/chat`)

### `GET /api/chat/messages` & `POST /api/chat/messages`
- **Auth Required?**: Yes (Any Role)
- **Request Body (POST)**: `z.object({ receiverId: z.string().uuid(), patientContextId: z.string().uuid(), text: z.string(), audioBase64: z.string().optional() })`
- **Response Schema**: `MessageObject[]` or `MessageObject`
- **Internal Logic**: Retrieves or saves bidirectional messages in `messages` table filtered by `patient_context_id`. Upon POST, publishes event to active in-memory SSE clients and sends background push notification to receiver.
- **DB Tables Touched**: `messages`, `users`, `patients`, `care_links`.
- **AI Services Called**: None.
- **Error Cases**: `403 Forbidden` if sender/receiver lack an active care link for `patientContextId`.

### `GET /api/chat/stream` (Server-Sent Events)
- **Auth Required?**: Yes (via query token `?token=jwt_string` or header)
- **Request Body**: None
- **Response Schema**: Text-event stream (`text/event-stream`).
- **Internal Logic**: Establishes persistent HTTP connection. Keeps socket alive with periodic comments (`: ping\n\n` every 30s). Pushes live `message`, `notification`, and `status_update` JSON events to connected clients.
- **DB Tables Touched**: None during streaming.
- **AI Services Called**: None.
- **Error Cases**: Immediately closes socket with HTTP 401 if token invalid.

---

## 10. Links, Family & Follow-ups (`/api/links`, `/api/family`, `/api/followups`)

### `POST /api/links/generate` & `GET /api/links/patient-code`
- **Auth Required?**: Yes (`patient`)
- **Request Body**: None
- **Response Schema**: `{ "linkCode": "DB-7G4K2P", "expiresAt": "ISO-8601" }`
- **Internal Logic**: Generates or retrieves unique shareable code in `patients` table.
- **DB Tables Touched**: `patients`.
- **AI Services Called**: None.
- **Error Cases**: `403 Forbidden` if user is not a patient.

### `POST /api/links/connect` & `DELETE /api/links/revoke/:id`
- **Auth Required?**: Yes (`caregiver` / `family` for connect; `patient` for revoke)
- **Request Body (connect)**: `z.object({ linkCode: z.string().length(9).or(z.string().length(12)), relationship: z.enum(["family", "caregiver"]) })`
- **Response Schema**: `{ "success": true, "link": CareLinkObject, "patient": PatientObject }`
- **Internal Logic**: Connects manager to patient in `care_links` or revokes link (`status = 'revoked'`).
- **DB Tables Touched**: `care_links`, `patients`.
- **AI Services Called**: None.
- **Error Cases**: `404 Not Found` if code invalid or expired; `409 Conflict` if link already active.

### `GET /api/followups`, `POST /api/followups`, `PUT /api/followups/:id`, `DELETE /api/followups/:id`
- **Auth Required?**: Yes (`patient` or `caregiver`)
- **Request Body**: `z.object({ title: z.string(), doctorName: z.string(), dateTime: z.string(), location: z.string(), notes: z.string().optional() })`
- **Response Schema**: `FollowUpObject`
- **Internal Logic**: CRUD operations on medical appointment reminders in `follow_ups` and `followups` tables.
- **DB Tables Touched**: `follow_ups`, `followups`.
- **AI Services Called**: None.
- **Error Cases**: `404 Not Found`.

---

## 11. Jargon Simplifier (`/api/language`)

### `POST /api/language/simplify`
- **Auth Required?**: No (Optional Auth)
- **Request Body**: `z.object({ text: z.string() })`
- **Response Schema**: `{ "original": string, "simplified": string, "replacements": Array<{ "term": string, "meaning": string }>, "aiUnavailable"?: boolean }`
- **Internal Logic**: Passes medical text directly to Groq Llama 3.3 70B (`llama-3.3-70b-versatile`) to produce a simple, empathetic 2-sentence patient explanation without needing manual offline dictionary table lookups.
- **DB Tables Touched**: None.
- **AI Services Called**: Groq Llama 3.3 70B (`llama-3.3-70b-versatile`).
- **Error Cases**: Returns `{ aiUnavailable: true }` fallback if external AI fails.

---

## 12. Voice Notes & Scheduled Reminders (`/api/voice-notes`)

### `POST /api/voice-notes/schedule` & `POST /api/voice-notes/reminder`
- **Auth Required?**: Yes (`caregiver` or `patient`)
- **Request Body**: `z.object({ recipientId: z.string().uuid(), message: z.string(), audioBase64: z.string().optional(), scheduledFor: z.string(), scheduleType: z.enum(["ONCE", "RECURRING", "MEDICATION_LINKED"]) })`
- **Response Schema**: `ScheduledMessageObject` or `VoiceReminderObject`
- **Internal Logic**: Inserts scheduled reminder into `scheduled_messages` or `voice_reminders`. The background `VoiceScheduleService` cron worker polls these tables every minute and dispatches notifications/audio when `scheduledFor <= now()`.
- **DB Tables Touched**: `scheduled_messages`, `voice_reminders`.
- **AI Services Called**: Whisper STT (if voice note transcription needed).
- **Error Cases**: `400 Bad Request` if schedule timestamp is in the past.
