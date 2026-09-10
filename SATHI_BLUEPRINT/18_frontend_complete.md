# 18 — Frontend Complete: Screens, Components, Hooks & Utils

Extracted verbatim from `artifacts/discharge-buddy/`. Covers 7 remaining screens, AssistantProvider + other components, 3 hooks, and 10 utils not in files 15–16.

---

## PART A: REMAINING SCREENS

### A1. `app/scan.tsx` — Prescription Scanner (977L)

Full structure exported as `ScanScreen` default. Key imports:
- `expo-camera` CameraView, `expo-image-picker` for gallery
- `expo-file-system`, `expo-image-manipulator` for image handling
- Calls `POST /api/ocr/scan` with base64 image → receives `PrescriptionAnalysisResult`
- Pipeline steps: 1=Reading, 2=Extracting, 3=Building schedule, 4=Done
- `handleCapture()` → `processPrescriptionImage()` → OCR API → results in Sheet overlay
- `handleConfirm()` maps each ExtractedMedicine to `addMedicine()` with times from schedule
- Edit modal for per-medicine correction, delete med from results
- Viewfinder with glow/scan-line animation, flash toggle, gallery picker
- Full source at `artifacts/discharge-buddy/app/scan.tsx`

Exported interfaces:
```typescript
interface ExtractedMed {
  name: string; dosage: string; frequency: string; frequency_code: string;
  duration: string; timing: string; notes: string; confidence: number;
  low_confidence: boolean; schedule: { morning: boolean; afternoon: boolean; night: boolean };
  times?: string[]; isDefaultTime?: boolean;
}
interface ScanResult {
  medicines: ExtractedMed[]; general_instructions: string; explanation: string;
  warnings: string[]; overall_confidence: number; ocr_source: string;
  quality?: { is_usable: boolean; overall_score: number; guidance: string; issues: Array<...> };
}
```

### A2. `app/cpr.tsx` — CPR Assistant (577L)

Exported as `CprScreen` default. Key structure:
- 4 modes: adult, child, infant, choking — each with depth, hands, ratio, steps, color
- `useKeepAwake()` keeps screen on during rescue
- `expo-speech` reads instructions aloud with beat-synced metronome
- Call 112 button via `Linking.openURL("tel:112")`
- Mode selector tabs, animated compression counter (30 comps at 110 BPM)
- Full source at `artifacts/discharge-buddy/app/cpr.tsx`

### A3. `app/onboarding.tsx` — Onboarding (582L)

Exported default, 3 slides:
1. "Your Recovery, Simplified" — Healing Heart visual with pulsing SVG rings and floating badge "Metformin 500mg" / "Lisinopril 10mg"
2. "Never Miss A Dose" — Bell animation with schedule preview (8AM Metformin ✓, 12PM Aspirin ✓, 8PM Atorvastatin, 9PM Lisinopril)
3. "Family Always There" — Seamless sync visual with floating avatar badges
- Uses `FlatList` pager with `onViewableItemsChanged`, snaps to slides
- Bottom "Get Started" button routes to login
- Animated mascot character per slide via `MascotBuddy` component

### A4. `app/verify-email.tsx` — Email OTP Verification (376L)

Full OTP flow:
- 6-digit code input (auto-focus next on type, backspace to prev)
- `POST /api/auth/verify-email` with `{ email, code }`
- `POST /api/auth/resend-verification` for resend (30s cooldown)
- Routes: patient → `/(tabs)`, caregiver → `/caregiver/dashboard`, family → `/family/dashboard`
- Full source at `artifacts/discharge-buddy/app/verify-email.tsx`

### A5. `app/journal.tsx` — Recovery Journal (374L)

Features:
- Mood picker: 5 levels (Rough→Great with emojis and colors)
- Energy picker: 5 levels (Drained→Amazing)
- Daily prompt rotation (5 prompts)
- `addJournalEntry()` writes to AppContext with `{ id, date, mood, energy, text }`
- History view with date-stamped entries, "+20 XP" on save

### A6. `app/drug-checker.tsx` — Drug Interaction Checker (248L)

Features:
- Auto-loads current medicines from AppContext
- `POST /api/ai/check-drugs` for real check, falls back to `MockProvider` offline
- `offlineCache` for previously checked results
- `InteractionWarningCard` component for severity display (high/moderate/mild)
- Food warnings section, offline banner, disclaimer text

### A7. `app/meditation.tsx` — Meditation Timer (421L)

Features:
- Breathing orb animation (pulse with `react-native-reanimated`)
- Preset times: 5/10/15/20/30 min
- Custom time inputs (minutes + seconds)
- Timer display with start/pause/reset
- Random meditative quote on completion
- `expo-haptics` feedback, `expo-keep-awake` during session

---

## PART B: COMPONENTS

### B1. `assistant/AssistantProvider.tsx` — Voice Assistant Core (1290L)

The brain of the voice assistant. Full source at `artifacts/discharge-buddy/components/assistant/AssistantProvider.tsx`.

Key architecture:
```typescript
export type AssistantState =
  | 'idle' | 'initializing' | 'listening' | 'speech_detected'
  | 'transcribing' | 'sending' | 'processing' | 'speaking'
  | 'sleeping' | 'error' | 'permission_denied' | 'interrupted';

interface AssistantContextValue {
  state; isVisible; meteringSharedValue; lastTranscript; lastReply; error;
  startAssistant; stopAssistant; cancelAssistant; dismissOverlay; processText;
}
```

Emergency detection: 97+ phrases across EN/HI/ES/UR/BN — bare distress words + critical danger signs (chest pain, can't breathe, stroke, etc.). Uses `isEmergencyUtterance()` and `isStopUtterance()` with punctuation-stripping regex.

Action handlers (speech → intent → API):
- `TAKE_MEDICINE` — marks doses taken, multi-language replies (EN/HI/BN)
- `NAVIGATE_TO_MEDICINES` — opens medicines screen
- `LOG_SYMPTOM` — logs via API, symptom extraction via `extractSymptom()` (covers 8 symptoms in EN/HI/BN), mild-casual detection via `isMildCasualSymptom()`
- Emergency SOS — triggers `triggerEmergency()`
- Meditation start — navigates to meditation screen with duration
- Language switch — detected in transcript, updates `setLanguage()`
- Caregiver/patient info queries — reads from user context

TTS pipeline (Edge TTS server → expo-av → on-device Speech fallback):
1. Server-generated MP3 via `api.generateTTS()` cached to `FileSystem.cacheDirectory`
2. Played via `Audio.Sound` with `setOnPlaybackStatusUpdate`
3. Falls back to `expo-speech` on Web or server failure
4. `stopAssistantSpeech()` cancels all active speech + active request IDs

The assistant overlays a modal with animated orb (NeuralOrb), transcript display, and quick-action chips. States drive the UI (listening = mic animating, speaking = orb pulsing, transcribing = dots).

### B2. `Sidebar.tsx` (286L)

Drawer-style sidebar with:
- Profile header (avatar, name, role) on teal-dark gradient
- Menu items: View Profile, My Schedule, Notifications, Activity Log, Settings, Help & Feedback
- Share Link QR modal for patients
- Logout button at bottom
- Uses `SidebarContext` for open/close/animated state (`translateX`, `overlayOpacity`)

### B3. `SuccessBurst.tsx` (156L)

Animated success overlay with:
- Expanding purple ring burst (0→2.5 scale, 0.8→0 opacity)
- Glass-morphism card with `BlurView`
- Check icon on purple circle with shadow glow
- `soundHelper.playTing()` for audio feedback
- Auto-dismiss after 2 seconds via `onComplete` callback

### B4. `AdherenceChart.tsx` (282L)

Weekly adherence bar chart:
- 7-day rolling window (6 past days + today)
- Stacked bars: teal = taken, red = missed
- Empty day shown as grey dot
- Percentage badge, legend row
- Uses `useColors()` for theme-aware card styling

---

## PART C: HOOKS

### C1. `hooks/useSpeechToText.ts` (296L)

Full speech-to-text with Voice Activity Detection:
```typescript
export function useSpeechToText(onTranscriptionComplete?: (text: string) => void, options?: { maxDurationMs?, minDurationMs? }): {
  isListening: boolean; isTranscribing: boolean; error: string | null; metering: number;
  startListening: () => Promise<void>; stopListening: () => Promise<string | null>; cancelListening: () => Promise<void>;
}
```
- VAD: speechThresholdDb=-35, silenceThresholdDb=-55, silenceTimeoutMs=1500
- Auto-stop after `maxDurationMs` (default 60s), min duration check (default 500ms)
- High quality recording: AAC 44100Hz 128kbps mono
- Transcribes via `api.transcribeAudio(base64, "m4a")` (Groq Whisper)
- Cleans up temp files after transcription
- Permission request, audio mode config

### C2. `hooks/useConnectivity.ts` (79L)

Online/offline detection with debounce:
- Pings `GET /api/healthz` every 20s with 5s timeout
- Web: uses `navigator.onLine` + online/offline events
- 3s stability threshold before reporting state change
- Returns debounced `boolean`

### C3. `hooks/useColors.ts` (24L)

Theme-aware design tokens:
```typescript
export function useColors() {
  const scheme = useColorScheme();
  const palette = scheme === "dark" && "dark" in colors ? colors.dark : colors.light;
  return { ...palette, radius: colors.radius };
}
```

---

## PART D: UTILITIES

### D1. `utils/apiUrl.ts` (34L)

Dynamically resolves API base URL:
```typescript
export function getApiUrl(): string {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configuredUrl) return configuredUrl.replace(/\/$/, '');
  if (Platform.OS === 'web') return 'http://127.0.0.1:3000';
  const expoHost = getExpoHost(); // from Constants manifest
  if (expoHost) return `http://${expoHost}:3000`;
  const fallbackUrl = Platform.OS === 'android' ? 'http://10.0.2.2' : 'http://localhost';
  return `${fallbackUrl}:3000`;
}
```

### D2. `utils/MessageEngine.ts` (130L)

Context-aware message generator for the assistant:
```typescript
export function getDynamicMessage(doses: DoseLog[], currentTime?: Date, userName?: string): string
```
Categories: urgent (8), dueNow (8), missed (8), idleMorning (8), idleAfternoon (8), idleEvening (8). Picks based on dose timing proximity (dueNow: ±15min, urgent: 5-30min ahead, missed: past -15min+). Falls back to time-of-day idle messages. Appends user's first name via `[Name]` placeholder.

### D3. `utils/conversationMemory.ts` (79L)

Persistent conversation store:
```typescript
export async function loadHistory(userKey?: string | null): Promise<ConversationTurn[]>
export async function appendTurns(userKey, turns): Promise<ConversationTurn[]>
export function recentForPrompt(history: ConversationTurn[], k=6): Array<{role, text}>
export async function clearHistory(userKey?): Promise<void>
```
- Namespaced per user via AsyncStorage, wiped on logout
- MAX_STORED_TURNS=40, DEFAULT_PROMPT_TURNS=6
- `recentForPrompt()` strips timestamps for LLM context window

### D4. `utils/NotificationHelper.ts` (139L)

Expo notifications management:
```typescript
export async function requestNotificationPermissions(): Promise<boolean>
export async function getDevicePushToken(): Promise<string | null>
export async function scheduleMedicineNotifications(medicine: Medicine): Promise<Record<string, string>>
export async function cancelMedicineNotifications(notificationIds: string[]): Promise<void>
export async function cancelAllNotifications(): Promise<void>
```
- Foreground handler shows all alerts
- Push tokens: Expo SDK 53+ skips in Expo Go, requires dev build
- `scheduleMedicineNotifications()` creates primary + 10min-warning for each dose time
- `CALENDAR` trigger with daily repeat

### D5. `utils/SoundHelper.ts` (49L)

Singleton audio player for UI sounds:
```typescript
class SoundHelper {
  public async load() // loads notification.mp3 from assets
  public async playTing() // plays from position 0
}
```
Web: silently no-ops. Singleton exported as `soundHelper`.

### D6. `utils/translate.ts` (67L)

Google Translate runtime with cache:
```typescript
export async function translateText(text: string, targetLanguage: string): Promise<string>
```
- Caches translations in AsyncStorage per language
- Falls back to original text on network error
- Returns `text` unchanged for `targetLanguage === "en"`

### D7. `utils/knowledgeBase.ts` (107L)

Static FAQ-like KB for offline assistant queries:
```typescript
export function matchKnowledgeBase(transcript: string): KBEntry | null // exact + substring match
export function matchKnowledgeBaseExact(transcript: string): KBEntry | null // exact only
```
Covers: guide me, how to use app, features, caregiver setup, medicines, reminders, symptom tracking, journal, stress tracking, scanner, voice assistant, caregiver features, messaging, emergency tools, CPR, choking assistance, settings, language, notifications, profile management. Each entry has `answer` string and optional `route` for navigation.

### D8. `utils/contextEngine.ts` (31L)

Screen context provider for LLM disambiguation:
```typescript
export function describeScreen(module: AppFeatureModule | string | null | undefined): ScreenContext
```
Modules: authentication, dashboard, medicine, journal, activity, settings, chatbot, unknown. Each has a one-line hint describing what "this"/"that" refers to on that screen.

### D9. `utils/errorUtils.ts` (44L)

User-friendly error formatter:
```typescript
export function getFriendlyErrorMessage(error: any, context: 'scan' | 'import' | 'auth' | 'general'): string
```
Maps: 500/DB errors → "temporarily unavailable", auth → "invalid credentials", duplicate → "already exists", USE_GOOGLE_SIGNIN → Google sign-in prompt, already imported → friendly message, Invalid QR → non-technical message.

### D10. `utils/offlineCache.ts` (32L)

Minimal JSON cache for offline resilience:
```typescript
export async function cacheSet(key: string, data: unknown): Promise<void>
export async function cacheGet<T>(key: string): Promise<{ data: T; at: number } | null>
export const CACHE_KEYS = { drugCheck: "drug_check", emergencyInfo: "emergency_info" } as const;
```
Thin wrapper over AsyncStorage with `PREFIX = "db_cache_"`.

---

## PART E: COMPLETE SOURCE CODE INDEX

All files below exist at the paths shown; the blueprint references below list their purpose and key exports for the rebuild team.

| File | Key Exports | Lines |
|------|------------|-------|
| `app/scan.tsx` | `ScanScreen` default | 977 |
| `app/cpr.tsx` | `CprScreen` default | 577 |
| `app/onboarding.tsx` | `OnboardingScreen` default | 582 |
| `app/verify-email.tsx` | `VerifyEmailScreen` default | 376 |
| `app/journal.tsx` | `JournalScreen` default | 374 |
| `app/drug-checker.tsx` | `DrugCheckerScreen` default | 248 |
| `app/meditation.tsx` | `MeditationTimerScreen` default | 421 |
| `components/assistant/AssistantProvider.tsx` | `AssistantProvider`, `useAssistant`, `AssistantState` | 1290 |
| `components/Sidebar.tsx` | `Sidebar` | 286 |
| `components/SuccessBurst.tsx` | `SuccessBurst` | 156 |
| `components/AdherenceChart.tsx` | `AdherenceChart` | 282 |
| `hooks/useSpeechToText.ts` | `useSpeechToText` | 296 |
| `hooks/useConnectivity.ts` | `useConnectivity` | 79 |
| `hooks/useColors.ts` | `useColors` | 24 |
| `utils/apiUrl.ts` | `getApiUrl` | 34 |
| `utils/MessageEngine.ts` | `getDynamicMessage` | 130 |
| `utils/conversationMemory.ts` | `loadHistory`, `appendTurns`, `recentForPrompt`, `clearHistory` | 79 |
| `utils/NotificationHelper.ts` | `scheduleMedicineNotifications`, `getDevicePushToken`, `cancelAllNotifications` | 139 |
| `utils/SoundHelper.ts` | `soundHelper` | 49 |
| `utils/translate.ts` | `translateText` | 67 |
| `utils/knowledgeBase.ts` | `matchKnowledgeBase`, `matchKnowledgeBaseExact`, `KNOWLEDGE_BASE` | 107 |
| `utils/contextEngine.ts` | `describeScreen` | 31 |
| `utils/errorUtils.ts` | `getFriendlyErrorMessage` | 44 |
| `utils/offlineCache.ts` | `cacheSet`, `cacheGet`, `CACHE_KEYS` | 32 |
