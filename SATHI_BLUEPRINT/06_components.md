# 06_components.md — SATHI Complete Reusable Components Specification

This document specifications all reusable React Native UI and feature components located in `artifacts/discharge-buddy/components/`.

---

## 1. Core Visual & Mascot Components

### `components/MascotBuddy.tsx`
- **Props Interface**:
  ```typescript
  export interface MascotBuddyProps {
    state?: "idle" | "listening" | "speaking" | "happy" | "alert" | "sleeping";
    size?: number; // Default 120
    showBubble?: boolean;
    bubbleText?: string;
    onPress?: () => void;
  }
  ```
- **What It Renders**: An animated 2D SVG Beary recovery mascot character with dynamic facial expressions, glowing neural eyes, and an optional speech bubble.
- **Animations (Reanimated / Moti)**: Continuous vertical float bounce (`withRepeat(withSequence(withTiming(-6, { duration: 1200 }), withTiming(0, { duration: 1200 })), -1)`). Eye scaling on `'listening'`; rapid ear twitch on `'alert'`; breathing scale on `'sleeping'`.
- **Internal State**: `blinking` (boolean toggled by a randomized `setInterval` every 3-6 seconds).
- **Events Emitted**: `onPress()` when tapped by the user.

### `components/AdherenceRing.tsx`
- **Props Interface**:
  ```typescript
  export interface AdherenceRingProps {
    percentage: number; // 0 to 100
    size?: number; // Default 160
    strokeWidth?: number; // Default 16
    color?: string; // Default "#0891b2"
    showLabel?: boolean;
  }
  ```
- **What It Renders**: A circular SVG progress meter displaying medication adherence completion percentage with a centered text readout.
- **Animations (Reanimated)**: Animated SVG `strokeDashoffset` using `withSpring(targetOffset, { damping: 15 })` when `percentage` changes.
- **Internal State**: None.
- **Events Emitted**: None.

### `components/AdherenceChart.tsx`
- **Props Interface**:
  ```typescript
  export interface AdherenceChartProps {
    data: Array<{ day: string; percentage: number; taken: number; total: number }>;
    timeframe?: "week" | "month";
    onSelectDay?: (day: string) => void;
  }
  ```
- **What It Renders**: A responsive vertical bar chart depicting 7-day or 30-day compliance history with color-coded bars (Green >= 80%, Yellow 50-79%, Red < 50%).
- **Animations (Reanimated)**: Staggered bar height entrance animation (`withDelay(index * 50, withTiming(barHeight, { duration: 500 }))`).
- **Internal State**: `selectedBarIndex` (number | null).
- **Events Emitted**: `onSelectDay(day)` when a bar is pressed.

### `components/LiquidCapsuleProgress.tsx`
- **Props Interface**:
  ```typescript
  export interface LiquidCapsuleProgressProps {
    progress: number; // 0.0 to 1.0
    label?: string;
    height?: number; // Default 32
  }
  ```
- **What It Renders**: A pill-shaped capsule container with an internal horizontal liquid fill representing daily dose completion.
- **Animations (Reanimated)**: Horizontal width translation (`withSpring(progress * maxWidth)`) coupled with a subtle oscillating sine wave opacity shimmer.
- **Internal State**: None.
- **Events Emitted**: None.

---

## 2. Interactive Controls & Buttons

### `components/AnimPressable.tsx`
- **Props Interface**:
  ```typescript
  export interface AnimPressableProps extends TouchableOpacityProps {
    children: React.ReactNode;
    scaleDown?: number; // Default 0.96
    haptic?: boolean; // Default true
    style?: StyleProp<ViewStyle>;
  }
  ```
- **What It Renders**: A universal wrapper for buttons and interactive cards that applies spring scaling and physical haptic feedback on touch.
- **Animations (Reanimated)**: Scale animation on `onPressIn` (`withSpring(scaleDown)`) and `onPressOut` (`withSpring(1)`).
- **Internal State**: `isPressed` shared value.
- **Events Emitted**: Standard `onPress`, `onLongPress`. Triggers `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)` if `haptic` is true.

### `components/EmergencyButton.tsx`
- **Props Interface**:
  ```typescript
  export interface EmergencyButtonProps {
    onTrigger?: () => void;
    size?: "small" | "large";
    style?: StyleProp<ViewStyle>;
  }
  ```
- **What It Renders**: A prominent, pulsing red SOS emergency trigger button with warning iconography.
- **Animations (Reanimated)**: Infinite radial pulse wave ring animation (`withRepeat(withTiming(1.4, { duration: 1000 }), -1, true)`).
- **Internal State**: None.
- **Events Emitted**: `onTrigger()` when tapped or held.

### `components/VoiceInputButton.tsx`
- **Props Interface**:
  ```typescript
  export interface VoiceInputButtonProps {
    onSpeechResult: (text: string) => void;
    onRecordingStateChange?: (recording: boolean) => void;
    size?: number; // Default 64
    disabled?: boolean;
  }
  ```
- **What It Renders**: A floating microphone button that captures patient speech, displays visual recording waves, and dispatches audio to the Whisper STT backend.
- **Animations (Reanimated)**: Multi-ring sonic wave expansion when `isRecording` is true.
- **Internal State**: `isRecording` (boolean), `recordingDuration` (number in seconds), `audioPermission` (boolean).
- **Events Emitted**: `onSpeechResult(transcribedText)`, `onRecordingStateChange(boolean)`.

### `components/DayNightToggle.tsx`
- **Props Interface**:
  ```typescript
  export interface DayNightToggleProps {
    isDark: boolean;
    onToggle: (dark: boolean) => void;
  }
  ```
- **What It Renders**: An animated sun/moon theme toggle switch with celestial background transitions.
- **Animations (Reanimated)**: 180-degree rotational icon transition and background color interpolation between amber and dark navy.
- **Internal State**: None.
- **Events Emitted**: `onToggle(!isDark)`.

---

## 3. Cards & Domain UI Components

### `components/MedicineCard.tsx`
- **Props Interface**:
  ```typescript
  export interface MedicineCardProps {
    id: string;
    name: string;
    dosage: string;
    scheduledTime: string; // HH:MM
    status: "taken" | "missed" | "pending" | "snoozed";
    instructions?: string;
    simplifiedInstructions?: string;
    color?: string;
    onTake: (id: string, time: string) => void;
    onSnooze?: (id: string, time: string) => void;
    onPress?: (id: string) => void;
  }
  ```
- **What It Renders**: A medication card displaying pill name, dosage, time badge, status indicator, and interactive action buttons (Take / Snooze). Includes a toggle to switch between doctor instructions and AI simplified jargon.
- **Animations (Reanimated)**: Slide-out collapse when marked taken (`withTiming(0, { duration: 300 })`). Checkmark scale burst.
- **Internal State**: `showSimplified` (boolean toggle), `expanded` (boolean).
- **Events Emitted**: `onTake(id, time)`, `onSnooze(id, time)`, `onPress(id)`.

### `components/RiskBanner.tsx`
- **Props Interface**:
  ```typescript
  export interface RiskBannerProps {
    level: "low" | "medium" | "high" | "critical";
    message: string;
    onActionPress?: () => void;
    actionLabel?: string;
  }
  ```
- **What It Renders**: A prominent color-coded alert banner (Red for critical, Orange for high, Yellow for medium) advising the patient of elevated risk symptoms or consecutive missed doses.
- **Animations (Reanimated)**: Drop-down entrance from top (`withSpring({ translateY: 0 })`).
- **Internal State**: `dismissed` (boolean).
- **Events Emitted**: `onActionPress()` (e.g., triggers emergency screen or calls caregiver).

### `components/InteractionWarningCard.tsx`
- **Props Interface**:
  ```typescript
  export interface InteractionWarningCardProps {
    pair: [string, string];
    severity: "mild" | "moderate" | "high";
    description: string;
    advice: string;
  }
  ```
- **What It Renders**: A clinical warning card highlighting a detected drug-drug interaction with plain-English patient advice.
- **Animations (Reanimated)**: Subtle border pulse on `'high'` severity.
- **Internal State**: None.
- **Events Emitted**: None.

### `components/MyLinkCodeCard.tsx` & `components/LinkByCodeModal.tsx`
- **Props Interface**:
  ```typescript
  export interface MyLinkCodeCardProps {
    code: string; // e.g., "DB-7G4K2P"
    expiresAt?: string;
    onRegenerate?: () => void;
  }
  export interface LinkByCodeModalProps {
    visible: boolean;
    onClose: () => void;
    onConnect: (code: string, relationship: "family" | "caregiver") => Promise<void>;
  }
  ```
- **What It Renders**: Card displaying the patient's shareable 12-char code with a "Copy Code" button and QR code generator; Modal for managers to input a patient's code to establish a care link.
- **Animations (Reanimated)**: Modal slide-up backdrop fade.
- **Internal State**: `inputCode` (string), `selectedRel` ('family' | 'caregiver'), `loading` (boolean).
- **Events Emitted**: `onConnect(code, rel)`, `onRegenerate()`.

---

## 4. Navigation & Feedback Overlays

### `components/FloatingTabBar.tsx`
- **Props Interface**:
  ```typescript
  export interface FloatingTabBarProps {
    state: TabNavigationState<Record<string, object | undefined>>;
    descriptors: Record<string, BottomTabDescriptor>;
    navigation: NavigationHelpers<ParamListBase, BottomTabNavigationEventMap>;
  }
  ```
- **What It Renders**: A glassmorphism mobile navigation bar floating above the bottom screen edge with an oversized centered "Buddy AI" action orb.
- **Animations (Reanimated)**: Active tab indicator sliding horizontal translation (`withSpring(tabOffset)`).
- **Internal State**: None.
- **Events Emitted**: Standard tab `tabPress` and `tabLongPress` navigation events.

### `components/NotificationToast.tsx` & `components/OfflineBanner.tsx`
- **Props Interface**:
  ```typescript
  export interface NotificationToastProps {
    title: string;
    body: string;
    type?: "info" | "success" | "warning" | "alert";
    visible: boolean;
    onDismiss: () => void;
  }
  export interface OfflineBannerProps {
    isOffline: boolean;
    pendingQueueCount: number;
    onSync?: () => void;
  }
  ```
- **What It Renders**: Top-screen floating toast notification popup; Network loss warning banner showing count of locally cached offline dose logs awaiting server sync.
- **Animations (Reanimated)**: Slide-down from top edge (`withTiming(0, { duration: 250 })`).
- **Internal State**: Auto-dismiss timer ID for toast.
- **Events Emitted**: `onDismiss()`, `onSync()`.

### `components/SuccessBurst.tsx`, `components/DotLoader.tsx`, `components/ErrorBoundary.tsx`
- **Props Interface**: Various standard loading and error fallback prop interfaces.
- **What It Renders**: Confetti particle burst animation when a patient completes all daily doses or unlocks an adherence streak; 3-dot pulsating loading indicator; React error boundary fallback view.
- **Animations (Reanimated / Lottie)**: Confetti particle radial trajectory dispersion.
- **Internal State**: Error capture stack traces in ErrorBoundary.
- **Events Emitted**: `onRetry()` when error fallback reset button is pressed.

---

## 5. AI Voice Assistant Components (`components/assistant/`)

### `components/assistant/AssistantProvider.tsx`
- **Props Interface**: `export interface AssistantProviderProps { children: React.ReactNode; }`
- **What It Renders**: React Context Provider that wraps the entire app root (`_layout.tsx`), managing global AI voice state, TTS audio playback queues, conversation history, and overlay visibility.
- **Animations**: None (logic/state container).
- **Internal State**: `isOpen` (boolean), `messages` (chat array), `isSpeaking` (boolean), `isListening` (boolean), `audioQueue` (array of base64 TTS mp3 strings).
- **Events Emitted**: Exposes `useAssistant()` hook methods: `openAssistant()`, `closeAssistant()`, `sendMessage(text)`, `speakText(text)`.

### `components/assistant/AssistantOverlay.tsx`
- **Props Interface**: `export interface AssistantOverlayProps { visible: boolean; onClose: () => void; }`
- **What It Renders**: Full-screen glassmorphism conversational overlay displaying active live voice transcriptions, Mr. Meddy's animated response orb, and suggested action chips.
- **Animations (Reanimated)**: Backdrop blur fade and voice waveform visualizer.
- **Internal State**: Local text input override for silent chat mode.
- **Events Emitted**: `onClose()`, dispatches action button presses (e.g., executing `TAKE_MEDICINE` directly from chat).

### `components/assistant/VoiceOrb.tsx`
- **Props Interface**: `export interface VoiceOrbProps { state: "idle" | "listening" | "processing" | "speaking"; size?: number; }`
- **What It Renders**: A multi-layered glowing SVG orb that changes colors and morphs shapes depending on whether Buddy is listening (green ripples), processing (spinning cyan rings), or speaking (pulsing violet waves).
- **Animations (Reanimated)**: Multi-value rotation and scaling interpolation driven by `state`.
- **Internal State**: None.
- **Events Emitted**: None.
