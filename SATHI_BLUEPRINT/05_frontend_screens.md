# 05_frontend_screens.md — SATHI Complete Frontend Screens Catalog

This document details every screen in the React Native / Expo mobile application (`artifacts/discharge-buddy/app/`).

---

## 1. Authentication & Onboarding Screens

### `app/intro.tsx`
- **Purpose**: Welcoming splash screen introducing SATHI's voice-driven recovery features.
- **State Variables**: `activeSlide` (current carousel page index), `animValue` (Reanimated fade/translate value).
- **API Calls Made**: None.
- **Navigation Flow**: Entry point for unauthenticated users. Navigates to `/login`, `/register`, or `/judge-demo`.
- **Key Components**: `MascotBuddy` (waving state), `AnimPressable`.
- **Props / Route Params**: None.
- **AsyncStorage Keys**: Checks `@sathi_has_seen_intro`.

### `app/login.tsx`
- **Purpose**: Standard email/password login and account recovery portal.
- **State Variables**: `email`, `password`, `loading`, `errorMsg`, `showPassword`.
- **API Calls Made**: `POST /api/auth/login` (triggered on submit button press).
- **Navigation Flow**: Reached from `/intro` or logout. Navigates to `/(tabs)` (Patient), `/caregiver/dashboard` (Caregiver), `/family/dashboard` (Family), or `/verify-email`.
- **Key Components**: `AnimPressable`, `ErrorNotice`, `DotLoader`.
- **Props / Route Params**: Accepts optional `?email=xxx` query param from registration.
- **AsyncStorage Keys**: Writes `@sathi_auth_token` and `@sathi_user_role` upon success.

### `app/register.tsx` & `app/role-select.tsx`
- **Purpose**: Account registration and role selection (Patient vs Caregiver vs Family).
- **State Variables**: `name`, `email`, `password`, `role`, `selectedHospital`, `loading`, `error`.
- **API Calls Made**: `POST /api/auth/register` (triggered on signup submit).
- **Navigation Flow**: Reached from `/login`. Leads to `/onboarding` (for patients) or `/verify-email`.
- **Key Components**: `RoleSelectModal`, `AnimPressable`.
- **Props / Route Params**: `role` passed between register and onboarding.
- **AsyncStorage Keys**: Writes `@sathi_auth_token` on auto-login.

### `app/verify-email.tsx` & `app/forgot-password.tsx`
- **Purpose**: 6-digit OTP verification and password reset workflows.
- **State Variables**: `otp` (array of 6 digits), `timer`, `resendDisabled`, `email`, `newPassword`.
- **API Calls Made**: `POST /api/auth/verify-otp`, `POST /api/auth/resend-otp`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`.
- **Navigation Flow**: Reached from `/register` or `/login`. Redirects to `/login` or `/(tabs)`.
- **Key Components**: Custom OTP digit box inputs, `NotificationToast`.
- **Props / Route Params**: `email` string query param.
- **AsyncStorage Keys**: None.

### `app/onboarding.tsx`
- **Purpose**: Post-registration medical profile setup (condition, discharge date, emergency contact).
- **State Variables**: `step` (1 to 3), `age`, `condition`, `dischargeDate`, `emergencyContact`, `allergies`, `bloodType`, `anchorTimes`.
- **API Calls Made**: `PUT /api/auth/anchor-times`, `POST /api/medicines` (if starter meds added).
- **Navigation Flow**: Reached after patient signup. Leads directly to `/(tabs)/index`.
- **Key Components**: `TimeSegmentedControl`, `AnimPressable`.
- **Props / Route Params**: None.
- **AsyncStorage Keys**: Writes `@sathi_onboarding_completed`.

---

## 2. Patient Bottom Tab Screens (`app/(tabs)/`)

### `app/(tabs)/index.tsx` (Home Dashboard)
- **Purpose**: Main patient recovery control center displaying Beary mascot, adherence gauge, next scheduled medicine, and quick-action triggers.
- **State Variables**: `refreshing`, `nextDose`, `todayProgress`, `recentSymptoms`, `riskBannerVisible`.
- **API Calls Made**:
  - `GET /api/medicines` (on mount and pull-to-refresh)
  - `GET /api/medicines/logs/today` (on mount)
  - `GET /api/activity/stats` (on mount)
- **Navigation Flow**: Main tab landing. Links to `/scan`, `/chat`, `/emergency`, and all tab views.
- **Key Components**: `MascotBuddy`, `AdherenceRing`, `MedicineCard`, `RiskBanner`, `VoiceInputButton`, `FloatingTabBar`.
- **Props / Route Params**: None.
- **AsyncStorage Keys**: Reads `@sathi_auth_token`, `@sathi_offline_queue`.

### `app/(tabs)/medicines.tsx`
- **Purpose**: Complete medication schedule manager with time-of-day filtering, dose logging, and manual addition.
- **State Variables**: `medicines`, `selectedTimeSlot` ('all' | 'morning' | 'afternoon' | 'evening' | 'night'), `showAddModal`, `loggingDoseId`.
- **API Calls Made**:
  - `GET /api/medicines` (on mount)
  - `POST /api/medicines/:id/log` (when user marks pill taken/snoozed)
  - `DELETE /api/medicines/:id` (when deleting/archiving)
- **Navigation Flow**: Second bottom tab. Links to `/drug-checker` and `/scan`.
- **Key Components**: `TimeOfDayFilter`, `MedicineCard`, `LiquidCapsuleProgress`, `SuccessBurst`.
- **Props / Route Params**: None.
- **AsyncStorage Keys**: Reads/writes offline dose queue in `@sathi_offline_doses`.

### `app/(tabs)/symptoms.tsx`
- **Purpose**: Interactive symptom logger with severity sliders and historical trend timeline.
- **State Variables**: `selectedSymptoms` (array), `severity` (1-10 slider), `notes`, `history`, `submitting`.
- **API Calls Made**: `POST /api/activity/symptom` (when submit button pressed), `GET /api/recovery` (for history).
- **Navigation Flow**: Third bottom tab. Links to `/journal` and `/emergency` (if critical severity logged).
- **Key Components**: `RiskBanner`, `AnimPressable`.
- **Props / Route Params**: None.
- **AsyncStorage Keys**: None.

### `app/(tabs)/schedule.tsx`
- **Purpose**: Chronological vertical timeline of today's anchor times, appointments, and medication slots.
- **State Variables**: `selectedDate`, `timelineItems`, `loading`.
- **API Calls Made**: `GET /api/medicines`, `GET /api/followups`, `GET /api/medicines/logs/today`.
- **Navigation Flow**: Fourth bottom tab.
- **Key Components**: `TimeSegmentedControl`, custom Timeline node UI.
- **Props / Route Params**: None.
- **AsyncStorage Keys**: None.

### `app/(tabs)/progress.tsx` & `app/(tabs)/followups.tsx`
- **Purpose**: Gamified recovery stats (XP, streaks, adherence charts) and doctor appointment manager.
- **State Variables**: `stats` (streak, xp, percentage), `chartData`, `followupsList`, `showNewModal`.
- **API Calls Made**: `GET /api/activity/stats`, `GET /api/followups`, `POST /api/followups`.
- **Navigation Flow**: Fifth bottom tab and child views.
- **Key Components**: `AdherenceChart`, `SuccessBurst`.
- **Props / Route Params**: None.
- **AsyncStorage Keys**: Reads `@sathi_user_xp`.

---

## 3. Dedicated Feature Screens (`app/`)

### `app/scan.tsx` (OCR Scanner)
- **Purpose**: Camera and image picker interface for scanning prescriptions and medicine bottles.
- **State Variables**: `imageUri`, `scanning`, `extractedMeds`, `explanation`, `step` ('camera' | 'review' | 'saving').
- **API Calls Made**: `POST /api/ocr/scan` (when picture taken/selected), `POST /api/medicines` (batch creation on save).
- **Navigation Flow**: Reached from Home or Medicines tab. Redirects to `/medicines` upon saving.
- **Key Components**: `DotLoader`, `MedicineCard`, custom bounding-box review modal.
- **Props / Route Params**: None.
- **AsyncStorage Keys**: Temporary image cache.

### `app/chat.tsx`
- **Purpose**: Real-time messaging interface with linked doctor/caregiver and Mr. Meddy AI bot.
- **State Variables**: `messages`, `inputText`, `recording`, `isTyping`, `activeTab` ('ai' | 'doctor').
- **API Calls Made**: `GET /api/chat/messages`, `POST /api/chat/messages`, `POST /api/ai/chat`, `POST /api/ai/stt`, `POST /api/ai/tts`.
- **Navigation Flow**: Reached from floating Assistant button or Home tab.
- **Key Components**: `NeuralOrb`, `VoiceInputButton`, `TranslateText`.
- **Props / Route Params**: `?tab=doctor` query param.
- **AsyncStorage Keys**: Caches recent chat history under `@sathi_chat_history`.

### `app/drug-checker.tsx` & `app/recovery-support.tsx`
- **Purpose**: AI Drug-drug interaction checker and medical jargon simplifier tool.
- **State Variables**: `selectedMeds` (array of strings), `interactions`, `checking`, `jargonInput`, `simplifiedResult`.
- **API Calls Made**: `POST /api/ai/drug-check`, `POST /api/language/simplify`.
- **Navigation Flow**: Reached from Medicines tab or Profile drawer.
- **Key Components**: `InteractionWarningCard`, `TranslateText`.
- **Props / Route Params**: Optional initial med string.
- **AsyncStorage Keys**: None.

### `app/emergency.tsx`, `app/cpr.tsx` & `app/emergency-card.tsx`
- **Purpose**: SOS broadcast trigger, audio/visual CPR 100-BPM metronome guide, and lockscreen medical ID.
- **State Variables**: `countdown` (5s auto-trigger), `alertActive`, `cprBeating`, `cprElapsed`.
- **API Calls Made**: `POST /api/emergency/trigger`, `POST /api/emergency/cancel`.
- **Navigation Flow**: High-priority global access from any screen via `EmergencyButton`.
- **Key Components**: `BreathingOrb`, `EmergencyButton`, `RiskBanner`.
- **Props / Route Params**: None.
- **AsyncStorage Keys**: Reads `@sathi_emergency_contacts`.

### `app/scan-qr.tsx`, `app/journal.tsx`, `app/meditation.tsx`, `app/notifications.tsx`, `app/settings.tsx`, `app/help.tsx`
- **Purpose**: Supporting utilities for QR linking, diary logging, breathing timers, push alert logs, theme/language preferences, and FAQ.
- **State Variables**: Various local toggles (`isDark`, `langCode`, `timerRunning`).
- **API Calls Made**: `PUT /api/auth/anchor-times`, `GET /api/activity/journal`, `POST /api/activity/journal`.
- **Navigation Flow**: Reached from Profile or Home menu.
- **Key Components**: `DayNightToggle`, `ApkQRModal`, `MyLinkCodeCard`, `ShareLinkQRModal`, `BreathingOrb`.
- **Props / Route Params**: None.
- **AsyncStorage Keys**: Reads/writes `@sathi_language`, `@sathi_theme`, `@sathi_anchor_times`.

---

## 4. Caregiver & Family Screens (`app/caregiver/`, `app/family/`)

### `app/caregiver/dashboard.tsx` & `app/family/dashboard.tsx`
- **Purpose**: Multi-patient triage dashboard showing real-time compliance rings, missed dose alerts, and risk levels.
- **State Variables**: `patientsList`, `selectedPatient`, `refreshing`, `filterRisk`.
- **API Calls Made**: `GET /api/caregiver/patients`, `GET /api/family/members`, `POST /api/caregiver/patient/:id/nudge`.
- **Navigation Flow**: Landing screen for users with `role === 'caregiver'` or `'family'`. Leads to patient detail or chat.
- **Key Components**: `AdherenceRing`, `RiskBanner`, `PendingFamilyRequests`, `LinkByCodeModal`.
- **Props / Route Params**: None.
- **AsyncStorage Keys**: Reads `@sathi_auth_token`.

### `app/caregiver/patient-detail.tsx`, `app/caregiver/create-plan.tsx`, `app/caregiver/message.tsx`, `app/caregiver/alert.tsx`, `app/caregiver/monitor.tsx`, `app/caregiver/remind.tsx`
- **Purpose**: Remote medication management, AI discharge plan authoring, scheduled voice reminder creator, vitals telemetry monitor, and escalated alert resolver.
- **State Variables**: `patientData`, `planText`, `reminderTime`, `voiceRecordingBase64`, `vitalsHistory`.
- **API Calls Made**:
  - `GET /api/caregiver/patient/:id`
  - `POST /api/caregiver/patient/:id/medicine`
  - `POST /api/caregiver/patient/:id/discharge-plan`
  - `POST /api/voice-notes/schedule`
- **Navigation Flow**: Reached by clicking a patient card on the Caregiver Dashboard.
- **Key Components**: `MedicineCard`, `AdherenceChart`, `VoiceInputButton`.
- **Props / Route Params**: `patientId` string passed via Expo Router dynamic segment (`:id`).
- **AsyncStorage Keys**: None.

---

## 5. Hackathon Judge Presentation Mode

### `app/judge-demo.tsx`
- **Purpose**: One-click presentation screen designed for judges and evaluators to test all core AI capabilities (OCR scan, voice Buddy, drug interaction check, SOS broadcast, caregiver sync) in under 3 minutes without typing or registration.
- **State Variables**: `currentDemoStep`, `demoLogs`, `mockPatientActive`.
- **API Calls Made**: Executes seeded mock requests against `/api/ai/chat`, `/api/ocr/scan`, and `/api/ai/drug-check`.
- **Navigation Flow**: Accessible directly from `/intro` via a subtle "Demo Mode / Hackathon Judge" button.
- **Key Components**: `MascotBuddy`, `NeuralOrb`, `SuccessBurst`.
- **Props / Route Params**: None.
- **AsyncStorage Keys**: Writes temporary demo session keys.
