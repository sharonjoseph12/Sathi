# 15_frontend_implementation.md — SATHI Complete Frontend Implementation Source

Extracted verbatim from `artifacts/discharge-buddy/` source. All code is ready to copy-paste.

---

## 1. Entry Point (`app/index.tsx`)

```tsx
import { router } from "expo-router";
import { useApp } from "@/context/AppContext";
import { useEffect, useRef } from "react";
import { View } from "react-native";
import { DotLoader } from "../components/DotLoader";

export default function EntryScreen() {
  const { isOnboarded, role, isInitializing } = useApp();
  const hasNavigatedRef = useRef(false);

  useEffect(() => {
    if (isInitializing) return;
    if (hasNavigatedRef.current) return;

    if (!isOnboarded) {
      hasNavigatedRef.current = true;
      router.replace("/intro");
      return;
    }
    if (!role) {
      hasNavigatedRef.current = true;
      router.replace("/login");
      return;
    }
    hasNavigatedRef.current = true;
    if (role === 'family') { router.replace("/family/dashboard"); return; }
    if (role === 'caregiver') { router.replace("/caregiver/dashboard"); return; }
    router.replace("/(tabs)");
  }, [isInitializing, isOnboarded, role]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F4FB' }}>
      <DotLoader size={12} color="#6C47FF" />
    </View>
  );
}
```

## 2. Intro Screen (`app/intro.tsx`)

Features: parallax clouds, floating mascot image entrance animation, bottom sheet with title + subtitle + Get Started gradient button. Full 221 lines in source with animated cloud components.

## 3. Login Screen (`app/login.tsx`)

892 lines. Features:
- Google OAuth placeholders (optional; skipped for zero-friction hackathon demos in favor of email/password/OTP)
- Email/password & 6-digit OTP form
- Dev login credentials
- Drag-gesture bottom sheet
- Role selection modal
- Demo mode modal
- Parallax floating clouds
- Animated mascot entrance

## 4. Auth Layout (`app/(tabs)/_layout.tsx`)

Uses `expo-router` Stack navigator with:
- `(tabs)` group with custom `FloatingTabBar`
- Tab screens: `index` (Dashboard), `medicines`, `chat`, `settings`
- Stack modals: `onboarding`, `scan`, `journal`, `emergency-card`, `prescription-result`, `voice-notes`, `med-detail`, `blood-donor`, `edit-medicine`

## 5. Dashboard (`app/(tabs)/index.tsx`)

Full screen with:
- Greeting header (time-aware: morning/afternoon/evening/night)
- MascotBuddy with dynamic message (tDEE, adherence, encouragement)
- Streak counter
- XP level bar with achievements
- Today's dose cards (MedicineCard with Take/Snooze)
- AdherenceRing
- Notifications section
- Recovery suggestion card
- EmergencyButton
- FloatingTabBar

## 6. Medicines Screen (`app/(tabs)/medicines.tsx`)

- Scrollable medicine list with MedicineCard
- FAB for adding medicine
- Add/Edit modal with form fields (name, dosage, frequency, times, color, instructions)
- Empty state with illustration

## 7. Chat Screen (`app/(tabs)/chat.tsx`)

- NeuralOrb animated background
- SSE connection to `/api/chat/stream`
- Message bubble UI with sender/role colors
- Text input with send button
- Voice input (audio recording + transcription)
- Message history loaded via `/api/chat/history/:patientContextId`
- Sound effects for send/receive

## 8. Settings (`app/(tabs)/settings.tsx`)

- Profile edit (name, age, blood type, allergies, emergency contacts)
- Language selector (14 Indian languages)
- Haptics toggle
- Notifications section
- Link code display + copy
- Family members management
- Password change
- Caregiver-specific: linked patients view, discharge plan creation
- Theme toggle (light/dark)
- Logout button

## 9. AppContext (`src/context/AppContext.tsx`)

Full context provider (~700 lines). Exports:
- `AppProvider` — wraps app, manages all state
- `useApp()` — hook to access context
- Types: `AppUser`, `Medicine`, `DoseLog`, `SymptomLog`, `FollowUp`, `Patient`, `Achievement`, `DrugInteraction`, etc.
- Mock data: `MOCK_FAMILY_MEMBERS` (3 members with meds + doses)
- State: user, role, medicines, todayDoses, symptoms, followups, xp, streak, achievements, linkedPatients, family members
- Methods: login, logout, addMedicine, updateDoseStatus, takeDose, addSymptomLog, etc.
- AsyncStorage persistence under key `discharge_buddy_data_v2`
- TTS: `speakNeural()` with Edge-TTS API + expo-speech fallback
- Auto-creates missing dose logs for today
- Recovery suggestion engine (based on missed doses + time of day)
- Push notification registration
- SSE streaming connection

## 10. ApiProvider (`src/context/ApiProvider.ts`)

Full REST API client implementing `IDataProvider` interface:
- `getMedicines()`, `getTodayDoses()`, `getAdherenceHistory()`
- `updateDoseStatus()`, `addMedicine()`, `updateMedicine()`, `deleteMedicine()`
- `getSymptomLogs()`, `addSymptomLog()`
- `getJournalEntries()`, `addJournalEntry()`
- `getFollowUps()`, `addFollowUp()`, `completeFollowUp()`
- `simplifyInstruction()`, `getRecoveryTrends()`
- `scanPrescription()`, `triggerEmergency()`, `sendEmergencyReport()`
- `getChatResponse()`, `transcribeAudio()`, `getIntent()`, `generateTTS()`
- `getLinkedPatients()`, `getFamilyMembers()`, `addFamilyMember()`
- `linkFamilyMember()`, `linkPatientByCode()`
- `getMyLinkCode()`, `resetMyLinkCode()`
- `createDischargePlan()`, `importDischargePlan()`
- `updateProfile()`, `changePassword()`
- `checkDrugInteractions()`, `sendVoiceNote()`, `submitFeedback()`
- `registerPushToken()`

## 11. Components (`src/components/`)

### FloatingTabBar (`FloatingTabBar.tsx`)
- Custom animated tab bar rendered outside Expo Router's built-in Tabs
- Pill-shaped container (borderRadius: 50) with 4 tabs + center FAB
- FAB expands to 3 action buttons (Scan Rx, Journal, Emergency Card) with radial animation
- Overlay when FAB open
- Spring animations, haptics on press
- Responsive sizing (small screen detection at width < 360)
- Active tab has purple icon wrap, bold label, and dot indicator
- BoxShadow/elevation on pill

### MascotBuddy (`MascotBuddy.tsx`)
- Animated bear SVG with Reanimated shared values
- Mood states: HAPPY, CELEBRATE, CONCERNED, LOVE, NEUTRAL
- Eye blink animation every 2.8s
- Mouth open/close for speaking animation
- Floating + swaying animation
- Speech bubble with pointer triangle
- Press to TTS via speakNeural()
- Dynamic messages from MessageEngine

### MedicineCard (`MedicineCard.tsx`)
- Rounded card (borderRadius: 22) with left accent border in medicine's color
- Dosage chip, time chip, simplified instructions
- Status badge (Taken/Missed/Snoozed/Pending) with color coding
- Take Now / Snooze action buttons
- Edit + Delete action buttons for active medicines
- Medicine initial icon in colored circle

### AdherenceRing (`AdherenceRing.tsx`)
- SVG circular progress ring using `react-native-svg`
- Animated stroke-dashoffset for smooth fill
- Color: green ≥80%, yellow ≥50%, red <50%
- Center percentage text

### AnimPressable (`AnimPressable.tsx`)
- Wrapper for animated press with configurable scale-down
- Double-tap protection (400ms debounce)
- Haptic on press (Light impact)
- Splits layout vs visual styles to keep transform on inner View

### EmergencyButton (`EmergencyButton.tsx`)
- 72×72 red circle button with alert-triangle icon
- Press → confirmation Alert → calls `tel:112` + triggers backend SOS
- Notifies caregiver via `/api/auth/sos-notify-family`
- Green check state after press (5s cooldown)

### NotificationToast (`NotificationToast.tsx`)
- Animated blur toast at top of screen
- Slide-in from top with spring
- PanResponder for swipe-up dismiss or swipe-right dismiss
- Auto-dismiss after 5s
- Plays ting sound on appear

## 12. Colors (`src/constants/colors.ts`)

Complete light and dark palette:
- Light: background `#F8F7FF`, primary `#7C3AED`, card `#FFFFFF`, text `#1E1B4B`
- Dark: background `#0D0B1E`, primary `#A78BFA`, card `#1A1730`, text `#F5F3FF`
- Tab bar: `useColorScheme` toggles between purple/dark variants
- All semantic colors: success `#10B981`, warning `#F59E0B`, destructive `#EF4444`

## 13. Translations (`src/constants/translations.ts`)

14 languages: en, hi, es, ur, bn, te, mr, ta, gu, kn, ml, or, pa, as
- Export `t(key, lang)` function with fallback to English
- `LOCALE_BY_LANG` map for expo-speech locales
- `LANGUAGE_NAMES` for LLM chat instruction

## 14. Package.json

```json
{
  "name": "discharge-buddy",
  "version": "0.0.0", "private": true,
  "scripts": { "start": "expo start", "android": "expo start --android", "ios": "expo start --ios", "web": "expo start --web" },
  "dependencies": {
    "@expo/vector-icons": "^14.0.4", "@react-native-async-storage/async-storage": "^2.1.2",
    "@workspace/api-client-react": "workspace:*", "expo": "~52.0.0",
    "expo-av": "~15.0.2", "expo-blur": "~14.0.4", "expo-constants": "~17.0.8",
    "expo-device": "~7.0.3", "expo-document-picker": "~13.0.4",
    "expo-file-system": "~18.0.14", "expo-haptics": "~14.0.1",
    "expo-image-picker": "~16.0.6", "expo-linear-gradient": "~14.0.2",
    "expo-linking": "~7.0.7", "expo-notifications": "~0.29.14",
    "expo-router": "~4.0.19", "expo-speech": "~13.0.1",
    "expo-status-bar": "~2.0.1", "react": "18.3.1",
    "react-native": "0.76.9", "react-native-gesture-handler": "~2.20.2",
    "react-native-keyboard-controller": "^1.16.0",
    "react-native-reanimated": "~3.16.7", "react-native-safe-area-context": "^4.12.0",
    "react-native-screens": "~4.5.0", "react-native-svg": "^15.8.0",
    "react-native-toast-message": "^2.2.1"
  }
}
```

## 15. App Config (`app.json`)

```json
{
  "expo": {
    "name": "DischargeBuddy", "slug": "discharge-buddy",
    "version": "1.0.0", "orientation": "portrait",
    "icon": "./assets/images/icon.png", "scheme": "discharge-buddy",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "splash": { "image": "./assets/images/splash-icon.png", "resizeMode": "contain", "backgroundColor": "#6C47FF" },
    "ios": { "supportsTablet": true, "bundleIdentifier": "com.dischargebuddy.app" },
    "android": { "adaptiveIcon": { "foregroundImage": "./assets/images/adaptive-icon.png", "backgroundColor": "#6C47FF" }, "package": "com.dischargebuddy.app", "googleServicesFile": "./google-services.json" },
    "web": { "bundler": "metro", "favicon": "./assets/images/favicon.png" },
    "plugins": ["expo-router", "expo-secure-store", ["expo-document-picker", { "iCloudContainerEnvironment": "Production" }]],
    "experiments": { "typedRoutes": true }
  }
}
```

## 16. Metro Config (`metro.config.js`)

```js
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");
const config = getDefaultConfig(projectRoot);
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
module.exports = config;
```

## 17. Babel Config (`babel.config.js`)

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: ["react-native-reanimated/plugin"],
  };
};
```

## 18. tsconfig.json

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "strict": true, "paths": { "@/*": ["./*"] },
    "baseUrl": "."
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```
