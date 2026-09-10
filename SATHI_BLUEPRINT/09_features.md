# 09_features.md — SATHI Core Features Blueprint

This document details every feature in the SATHI post-discharge recovery platform from both user and technical perspectives.

---

## 1. Voice Emergency SOS & CPR Metronome Guide

### What It Does
Provides an instant distress response mechanism that broadcasts alarms to linked caregivers and guides bystanders through American Heart Association (AHA) compliant 100-BPM CPR.

### User Perspective
- A patient experiencing sudden chest pain or shortness of breath taps the red SOS button on any screen or shouts *"Help me!"* or *"Chest pain"* while speaking to Buddy.
- A 5-second countdown modal initiates with a loud siren tone and vibration.
- If not canceled within 5 seconds, an emergency alert broadcasts to all linked caregivers and family members.
- The screen transitions to a high-contrast CPR guide featuring an audio/visual metronome pulsing exactly at 100 beats per minute, voice prompts (*"Push hard and fast in the center of the chest"*), and emergency telephone dialers.

### Technical Perspective
- **Components**: `EmergencyButton`, `BreathingOrb`, `RiskBanner`, `app/emergency.tsx`, `app/cpr.tsx`.
- **Backend Services**: `/api/emergency/trigger`, `/api/emergency/cancel`, `emergencyService.ts`, `notificationService.ts`.
- **Database Tables**: `emergency_alerts`, `users`, `care_links`, `patients`.
- **AI Integration**: Deterministic keyword matching in `/api/ai/intent` short-circuits the LLM (`confidence: 0.99`) to execute `TRIGGER_EMERGENCY` instantly without API latency.

### Edge Cases Handled
- **Accidental Triggers**: 5-second countdown with immediate cancellation button.
- **Offline SOS**: If network fails during SOS trigger, the mobile app invokes native OS telephone handlers (`Linking.openURL('tel:112')` / `911`).
- **Duplicate Broadcasts**: Debounces multiple rapid SOS taps within a 30-second window.

---

## 2. AI Jargon Simplifier & On-the-Fly Translation

### What It Does
Translates complex medical terminology and Latin prescription abbreviations into simple 2-sentence patient-friendly explanations in 5 languages (English, Hindi, Bengali, Spanish, Urdu).

### User Perspective
- When viewing a medication instruction like *"Take 1 tab PO TID PC STAT"*, the patient taps the "Simplify Jargon" toggle on the medicine card.
- The text instantly transforms into: *"Take 1 pill by mouth three times a day after meals, starting right now."*
- If the patient changes their app language preference to Hindi (`hi`), the interface text and voice readouts switch natively without reloading.

### Technical Perspective
- **Components**: `TranslateText`, `MedicineCard`, `app/recovery-support.tsx`.
- **Backend Services**: `/api/language/simplify`, `LanguageSimplifierService`.
- **Database Tables**: `medicines`.
- **AI Integration**: Passes full string directly to Groq Llama 3.3 70B Versatile (`llama-3.3-70b-versatile`) for plain-English simplification without offline dictionary lookups.

### Edge Cases Handled
- **AI API Outage**: If Groq API times out or fails, `LanguageSimplifierService` catches the exception and returns the original string with `{ aiUnavailable: true }`.
- **Mixed Languages**: Handles prescriptions written in English-Hindi code-mixed script (Hinglish).

---

## 3. Prescription OCR & AI Structuring Pipeline

### What It Does
Converts raw photos of paper prescriptions, hospital discharge summaries, or pill bottles into structured digital medication schedules.

### User Perspective
- The patient or caregiver opens the Camera scanner (`/scan`), snaps a picture of a messy handwritten prescription, and crops the image.
- Within seconds, SATHI displays a clean review modal listing every recognized medicine, dosage, frequency, and recommended dosing slots.
- With one tap on "Save to Schedule", all medications are imported into the daily calendar.

### Technical Perspective
- **Components**: `app/scan.tsx`, `DotLoader`, `MedicineCard`.
- **Backend Services**: `/api/ocr/scan`, `PrescriptionService.ts`, `ocrClient.ts`, `medicalParser.ts`.
- **Database Tables**: `prescriptions`, `medicines`.
- **AI Integration**: Multi-stage OCR architecture: Groq Llama 4 Scout Vision (`meta-llama/llama-4-scout-17b-16e-instruct`) extracts raw text -> Groq Llama 3.3 70B (`llama-3.3-70b-versatile`) corrects OCR typos and structures JSON -> `medicalParser.ts` applies regex rules for timing codes (`OD`, `BD`, `TDS`).

### Edge Cases Handled
- **Low Light / Blurry Photos**: Calculates image quality score; if unusable, returns specific guidance (*"Image is too blurry. Please move to a brighter room and hold steady."*).
- **Service Outage**: Falls back to Python FastAPI microservice (`/analyze`) or Google Gemini Vision (`gemini-1.5-flash`).

---

## 4. AI Drug-Drug Interaction Checker

### What It Does
Analyzes the patient's complete active medication regimen to identify dangerous drug interactions and food incompatibility warnings.

### User Perspective
- In the Medicines tab, the user clicks "Check Interactions".
- SATHI cross-references all active medications and generates a clinical safety report.
- If a high-severity interaction is found (e.g., Aspirin + Warfarin), a pulsing red warning card appears with actionable medical advice (*"Severe bleeding risk detected. Consult your doctor before taking together."*).

### Technical Perspective
- **Components**: `InteractionWarningCard`, `app/drug-checker.tsx`.
- **Backend Services**: `/api/ai/drug-check`.
- **Database Tables**: `medicines`.
- **AI Integration**: Groq Llama 3.3 70B Versatile (`llama-3.3-70b-versatile`) prompted with clinical pharmacology constraints. Sets `hasCritical: true` if any interaction severity is `'high'`.

### Edge Cases Handled
- **Single Medicine**: If only 1 active medicine exists, returns an empty interactions array with an explanatory summary without calling the LLM.
- **Brand vs Generic Names**: AI resolves Indian trade brand names (e.g., *Thyronorm*, *Dolo 650*, *Augmentin*) to their active chemical constituents before checking interactions.

---

## 5. Mr. Meddy Conversational AI Companion

### What It Does
Provides an always-available voice and text medical assistant that answers recovery questions, logs symptoms, and navigates the app via speech.

### User Perspective
- Tapping the floating Buddy orb opens an interactive voice interface.
- The patient asks: *"I feel dizzy after taking my morning pills. What should I do?"*
- Buddy responds in a calm, professional voice: *"Dizziness can sometimes occur with blood pressure medications. Please sit or lie down immediately. I have logged this symptom for your caregiver."*
- An action button label appears: `[Log Symptom: Dizziness (Severity 4)]`.

### Technical Perspective
- **Components**: `MascotBuddy`, `NeuralOrb`, `VoiceInputButton`, `AssistantProvider`, `AssistantOverlay`.
- **Backend Services**: `/api/ai/chat`, `/api/ai/stt`, `/api/ai/tts`, `/api/ai/intent`.
- **Database Tables**: `patients`, `medicines`, `symptom_logs`, `dose_logs`.
- **AI Integration**: Groq Whisper STT transcribes speech -> Llama 3.1 8B Instant (`llama-3.1-8b-instant`) evaluates intent and generates JSON response with patient context -> Microsoft Edge Neural TTS streams 24kHz mp3 audio.

### Edge Cases Handled
- **Token Overflow / Prompt Injection**: Keeps only last 8 conversation turns; truncates each turn to 600 characters.
- **Critical Risk Threshold**: If calculated `riskScore > 80`, overrides conversational chat to instruct immediate hospital visitation.

---

## 6. Caregiver Multi-Patient Monitoring & Remote Scheduling

### What It Does
Allows family members and nurses to remotely monitor multiple recovery patients, author medication schedules, and receive instant alerts for missed doses.

### User Perspective
- A caregiver logs into the Caregiver Dashboard and sees cards for 3 assigned patients.
- Each card displays a live adherence ring, active medications, and current risk level.
- Tapping a patient allows the caregiver to remotely add a new prescription, edit dosing slots, or send an encouraging push notification nudge.

### Technical Perspective
- **Components**: `app/caregiver/dashboard.tsx`, `app/caregiver/patient-detail.tsx`, `LinkByCodeModal`.
- **Backend Services**: `/api/caregiver/patients`, `/api/caregiver/patient/:id`, `/api/caregiver/patient/:id/medicine`.
- **Database Tables**: `care_links`, `patients`, `medicines`, `dose_logs`, `symptom_logs`.
- **AI Integration**: Remote medication additions automatically trigger background AI jargon simplification.

### Edge Cases Handled
- **Revoked Links**: If a patient revokes link access in their settings, the caregiver's subsequent API requests are immediately blocked with `403 Forbidden`.
- **Simultaneous Edits**: Optimistic UI concurrency locking on medication updates.

---

## 7. Offline-First Dosing & Auto-Sync Engine

### What It Does
Ensures patients can check their medication schedules and log doses even without an active internet or cellular data connection.

### User Perspective
- While traveling in an elevator or rural area without Wi-Fi, the patient opens SATHI.
- Their medication schedule loads instantly from local cache.
- The patient taps "Take" on their 2 PM dose. A toast confirms: *"Dose logged offline. Will sync when connected."*
- As soon as cellular connection is restored, the offline badge disappears as logs sync seamlessly in the background.

### Technical Perspective
- **Components**: `OfflineBanner`, `app/(tabs)/medicines.tsx`.
- **Backend Services**: `POST /api/medicines/:id/log`, `GET /api/medicines`.
- **Database Tables**: `dose_logs`.
- **Local Storage**: `AsyncStorage` keys `@sathi_offline_doses`, `@sathi_offline_queue`.
- **Sync Logic**: Event listener on `@react-native-community/netinfo`. When `isConnected` transitions to true, frontend iterates over `@sathi_offline_queue` and flushes pending POST requests sequentially.

### Edge Cases Handled
- **Conflict Resolution**: If a dose was marked "snoozed" on the server by a caregiver while offline, server timestamp precedence resolves conflicts during queue replay.

---

## 8. Anchor Times & Dynamic Medication Schedule

### What It Does
Maps abstract prescription frequencies (e.g., "TID", "BD") to the patient's specific daily lifestyle routines (Morning, Afternoon, Evening, Night).

### User Perspective
- During onboarding, the patient specifies their routine: Morning breakfast at 8:30 AM, Lunch at 1:30 PM, Dinner at 8:00 PM, Bedtime at 10:30 PM.
- When a doctor prescribes a medicine "Three times a day after food", SATHI automatically schedules reminders for exactly 8:30 AM, 1:30 PM, and 8:00 PM without manual time entry.

### Technical Perspective
- **Components**: `TimeSegmentedControl`, `app/onboarding.tsx`, `app/(tabs)/schedule.tsx`.
- **Backend Services**: `PUT /api/auth/anchor-times`, `POST /api/medicines`.
- **Database Tables**: `users.anchor_times` (JSONB column), `medicines.times` (TEXT[]).
- **Logic**: Default anchor schema: `{"morning": "08:00", "afternoon": "14:00", "evening": "20:00", "night": "22:00"}`. When `medicines` row is inserted without explicit timestamps, time slots are derived from `users.anchor_times`.

### Edge Cases Handled
- **Night Shift Workers**: Handles inverted anchor schedules where morning sleep slots cross midnight boundaries.

---

## 9. Gamified Adherence Streaks & XP System

### What It Does
Motivates patient recovery compliance through positive reinforcement, experience points (XP), and animated progress celebrations.

### User Perspective
- Every time a patient marks a dose as taken on time, they gain +10 XP.
- Completing 7 consecutive days of 100% adherence unlocks a "7-Day Streak Trophy" accompanied by an animated confetti burst and mascot celebration.

### Technical Perspective
- **Components**: `SuccessBurst`, `AdherenceRing`, `app/(tabs)/progress.tsx`.
- **Backend Services**: `GET /api/activity/stats`.
- **Database Tables**: `dose_logs`, `medicines`.
- **Logic**: Calculates 30-day ratio of `'taken'` vs total scheduled doses. Computes current streak length dynamically from historical `dose_logs`.

### Edge Cases Handled
- **Snoozed Doses**: Snoozing a dose within its active window does not break the streak; leaving it pending past midnight flags it as `'missed'`.

---

## 10. Family Portal & Encouragement Nudges

### What It Does
Provides family members with a simplified, read-only monitoring feed and one-click emotional support triggers.

### User Perspective
- A daughter at work checks her SATHI family app and sees her father's adherence ring is at 100% today.
- She taps "Send Nudge". Her father's phone immediately chimes with a push alert: *"💜 Your daughter is proud of your recovery today!"*

### Technical Perspective
- **Components**: `app/family/dashboard.tsx`, `PendingFamilyRequests`.
- **Backend Services**: `/api/family/members`, `/api/caregiver/patient/:id/nudge`.
- **Database Tables**: `care_links` (where `relationship === 'family'`), `users`, `patients`.
- **RBAC Guard**: Backend blocks family accounts from modifying prescriptions or reading private mood diaries (`journal_entries`).

### Edge Cases Handled
- **Spam Prevention**: Rate-limits push nudges to a maximum of 3 per patient per hour.

---

## 11. Hackathon Judge / Presentation Demo Mode

### What It Does
A specialized presentation interface that allows judges and reviewers to evaluate all core AI features (OCR, voice Buddy, drug interaction check, SOS alarm, caregiver sync) in under 3 minutes without registration or typing.

### User Perspective
- On the splash screen, the evaluator taps "Demo Mode / Hackathon Judge".
- SATHI loads a pre-populated sandbox profile (*"Rajesh Kumar, 58, Post-CABG Heart Surgery"*).
- Guided numbered step buttons allow one-click execution of simulated OCR prescription scanning, AI voice triage, and emergency SOS alarms.

### Technical Perspective
- **Components**: `app/judge-demo.tsx`, `MascotBuddy`, `NeuralOrb`.
- **Backend Services**: Dispatches live or mocked HTTP requests to `/api/ai/chat`, `/api/ocr/scan`, and `/api/ai/drug-check`.
- **Database Tables**: Isolates demo modifications to temporary memory state or sandbox UUIDs.

### Edge Cases Handled
- **No API Keys**: If `GROQ_API_KEY` is missing during evaluation, Demo Mode intercepts network calls and serves static pre-recorded mock AI responses so presentation flow never crashes.
