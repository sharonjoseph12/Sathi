# 16_supplemental_code.md — SATHI Complete Remaining Source Code

Extracted verbatim from original `artifacts/`. Covers all backend routes/files not in `14_backend_implementation.md` and all frontend files not in `15_frontend_implementation.md`.

---

## PART A: REMAINING BACKEND ROUTES

### A1. Activity Routes (`src/routes/activity.ts`)

```typescript
import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { ActivityController } from "../controllers/activityController";
const router = Router();
router.use(requireAuth);
router.get("/symptoms", ActivityController.getSymptoms);
router.post("/symptoms", ActivityController.addSymptom);
router.get("/journal", ActivityController.getJournal);
router.post("/journal", ActivityController.addJournal);
export default router;
```

### A2. Emergency Routes (`src/routes/emergency.ts`)

```typescript
import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { EmergencyController } from "../controllers/emergencyController";
const router = Router();
router.use(requireAuth);
router.post("/", EmergencyController.triggerEmergency);
router.get("/", EmergencyController.getEmergencies);
router.post("/report", EmergencyController.sendEmergencyReport);
export default router;
```

### A3. OCR Routes (`src/routes/ocr.ts`)

- `POST /api/ocr/scan` — accepts `{ imageBase64 }`, validates size (max 20MB), calls `PrescriptionService.analyzePrescription()` which uses Groq Llama 4 Scout Vision + Llama 3.3 70B restructuring pipeline. Returns `PrescriptionAnalysisResult` with medicines array, confidence scores, warnings.

### A4. Caregiver Routes (`src/routes/caregiver.ts`)

Key features:
- **`GET /api/caregiver/patients`** — Returns all linked patients with nested medicines/doseLogs/symptomLogs + AI risk scoring engine
  - Risk score algorithm: base 10, +15 per missed overdue dose, +30 for severe pain, +40 for fever, +25 for 48h+ inactivity. Capped at 100.
  - Silent Patient Detection: pending doses + no symptom logs in 6h (family) / 48h (staff) → triggers `sendInactivityAlert`
  - Returns riskLevel: High >70 / Moderate >35 / Low
- **`GET /api/caregiver/briefing/:patientId`** — Gemini 1.5 Flash generates 2-sentence clinical summary of last 48h
- **`POST /api/caregiver/create-plan`** — Creates patient + discharge plan

### A5. Dose Tracking Routes (`src/routes/doseTracking.ts`)

```typescript
router.get("/stats", DoseTrackingController.getAdherenceStats);
router.post("/mark-missed", DoseTrackingController.markMissedDoses);
```

### A6. Follow-up Routes (`src/routes/followup.ts`)

```typescript
router.post("/", FollowupController.createFollowup);
router.get("/", FollowupController.getFollowups);
router.patch("/:id", FollowupController.updateFollowupStatus);
router.delete("/:id", FollowupController.deleteFollowup);
```

### A7. Family Routes (`src/routes/family.ts`)

```typescript
router.get("/members", FamilyController.getMembers);
router.post("/members", FamilyController.addMember);
router.post("/members/link", FamilyController.linkMember);
```

### A8. Links Routes (`src/routes/links.ts`)

Complete link code management:
- `GET /api/links/my-code` — Returns (or lazily creates) the patient's link code (e.g. "DB-7G4K2P")
- `POST /api/links/my-code/reset` — Regenerates link code
- `GET /api/links` — Lists linked patients for family/caregiver
- `POST /api/links` — Links caller to patient by code (inserts care_links row, dual-writes legacy caregiverId, sends FCM push to patient)
- `DELETE /api/links/:patientId` — Revokes link
- `GET /api/links/pending` — Lists pending link requests
- `POST /api/links/:managerId/approve` — Approves pending link
- `POST /api/links/:managerId/reject` — Rejects pending link

### A9. Voice Notes Routes (`src/routes/voiceNotes.ts`)

- `POST /api/voice-notes` — Accepts `{ transcript, audioBase64?, patientNote? }`, finds caregiver via linkedPatientId, sends FCM push with voice note content
- `GET /api/voice-notes` — Returns `{ notes: [] }` placeholder

### A10. Support Routes (`src/routes/support.ts`)

```typescript
router.post("/feedback", requireAuth, async (req, res) => {
  const { type, message } = feedbackSchema.parse(req.body);
  const [newFeedback] = await db.insert(feedback).values({ userId, type, message }).returning();
  res.json({ success: true, feedback: newFeedback });
});
```

### A11. Discharge Routes (`src/routes/discharge.ts`)

```typescript
router.post("/import", DischargeController.importPlan);
router.post("/create", DischargeController.createPlan);
router.get("/:id", DischargeController.getPlan);
router.post("/:id", DischargeController.getPlan);
```

### A12. Health Routes (`src/routes/health.ts`)

```typescript
router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});
```

### A13. Language Simplifier Routes (`src/routes/languageSimplifier.ts`)

```typescript
router.post("/simplify", LanguageSimplifierController.simplifyText);
router.get("/lookup", LanguageSimplifierController.lookupTerm);
```

### A14. Recovery Routes (`src/routes/recovery.ts`)

```typescript
router.post("/log", RecoveryController.upsertRecoveryLog);
router.get("/logs", RecoveryController.getRecoveryLogs);
router.get("/trends", RecoveryController.getRecoveryTrends);
router.get("/alerts", RecoveryController.getAlerts);
```

### A15. Storage Routes (`src/routes/storage.ts`)

```typescript
router.post("/prescriptions", StorageController.savePrescription);
router.get("/prescriptions", StorageController.getPrescriptionHistory);
router.get("/profile", StorageController.getUserProfile);
```

---

## PART B: REMAINING BACKEND UTILITIES

### B1. Link Code Generator (`src/lib/linkCode.ts`)

```typescript
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LEN = 6;

export function generateLinkCode(): string {
  let body = "";
  const randomBytes = crypto.randomBytes(CODE_LEN);
  for (let i = 0; i < CODE_LEN; i++) body += ALPHABET[randomBytes[i] % ALPHABET.length];
  return `DB-${body}`;
}

export async function generateUniqueLinkCode(): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generateLinkCode();
    const [existing] = await db.select({ id: patients.id }).from(patients).where(eq(patients.linkCode, code));
    if (!existing) return code;
  }
  return `${generateLinkCode()}${crypto.randomInt(10, 99)}`;
}

export async function ensureLinkCode(patientId: string): Promise<string> {
  const [patient] = await db.select({ linkCode: patients.linkCode }).from(patients).where(eq(patients.id, patientId));
  if (patient?.linkCode) return patient.linkCode;
  const code = await generateUniqueLinkCode();
  await db.update(patients).set({ linkCode: code, linkCodeIssuedAt: new Date() }).where(eq(patients.id, patientId));
  return code;
}
```

### B2. Managed Patients (`src/lib/managedPatients.ts`)

```typescript
export async function getManagedPatients(managerId: string) {
  const [viaLegacy, viaLinks] = await Promise.all([
    db.select().from(patients).where(eq(patients.caregiverId, managerId)),
    db.select({ p: patients }).from(careLinks)
      .innerJoin(patients, eq(careLinks.patientId, patients.id))
      .where(and(eq(careLinks.managerId, managerId), eq(careLinks.status, "active"))),
  ]);
  const byId = new Map<string, typeof patients.$inferSelect>();
  for (const p of viaLegacy) byId.set(p.id, p);
  for (const r of viaLinks) byId.set(r.p.id, r.p);
  return [...byId.values()];
}
```

### B3. Push Service (`src/services/pushService.ts`)

```typescript
import { Expo, ExpoPushMessage } from 'expo-server-sdk';
const expo = new Expo();

export class PushService {
  static async sendPushNotification(pushToken: string, title: string, body: string, data?: any) {
    if (!Expo.isExpoPushToken(pushToken)) { logger.error(`Invalid Expo push token`); return null; }
    const messages: ExpoPushMessage[] = [{ to: pushToken, sound: 'default', title, body, data: data || {} }];
    try {
      const chunks = expo.chunkPushNotifications(messages);
      const tickets = [];
      for (const chunk of chunks) {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      }
      return tickets;
    } catch (error) { logger.error({ err: error }, 'Error sending push'); return null; }
  }
}
```

---

## PART C: REMAINING FRONTEND — LAYOUT & SCREENS

### C1. Tab Layout (`app/(tabs)/_layout.tsx`)

```tsx
import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { FloatingTabBar } from "@/components/FloatingTabBar";
import { Sidebar } from "@/components/Sidebar";

export default function TabLayout() {
  return (
    <>
      <Tabs tabBar={(props) => <FloatingTabBar {...props} />} screenOptions={{ headerShown: false }}>
        <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: ({color,size}) => <Feather name="home" size={size} color={color} /> }} />
        <Tabs.Screen name="medicines" options={{ title: "Medicines", tabBarIcon: ({color,size}) => <Feather name="package" size={size} color={color} /> }} />
        <Tabs.Screen name="symptoms" options={{ title: "Activity", tabBarIcon: ({color,size}) => <Feather name="activity" size={size} color={color} /> }} />
        <Tabs.Screen name="progress" options={{ title: "Progress", tabBarIcon: ({color,size}) => <Feather name="award" size={size} color={color} /> }} />
        <Tabs.Screen name="followups" options={{ href: null }} />
        <Tabs.Screen name="schedule" options={{ href: null }} />
      </Tabs>
      <Sidebar />
    </>
  );
}
```

### C2. Dashboard Screen (`app/(tabs)/index.tsx`)

~680 lines. Key features (extracted in full in task output — refer to saved file):

- **Role-based routing**: Patient → PatientDashboard, Caregiver → caregiver/dashboard redirect, Family → family/dashboard with member picker
- **Skeleton loader** on startup (purple gradient skeleton)
- **Hero section**: LinearGradient header (#4B26C8 → #6C47FF → #8B5CF6), greeting with time-aware text, sidebar menu button, notification bell (with unread dot)
- **Daily greeting TTS**: tap name to hear "Good morning {name}! Today is {day}. You have {n} doses scheduled."
- **XP/Level pill**: level badge, progress bar, streak fire pill
- **Adherence stats**: CircularProgress SVG ring, taken/total, risk badge (missed count color-coded), stat chips (missed/pending/taken)
- **Quick actions grid**: Schedule, Symptoms, Meditation, AI Help, Care Team, Journal, Call 112, Helpline, Drug Check, CPR Guide
- **RecoverySupportBanner**: Animated suggestion card (calm/sleep/reset)
- **Upcoming follow-up card**: gradient card with calendar icon
- **AdherenceChart**: Weekly bar chart
- **DoseRow**: Animated dose list with staggered fade-in, take-on-tap for pending doses
- **CaregiverDashboard**: AI Risk Score gauge, patient card with Gemini briefing TTS, caregiver quick actions

### C3. Sidebar Context (`context/SidebarContext.tsx`)

```tsx
const SIDEBAR_WIDTH = Dimensions.get("window").width * 0.78;
const SidebarContext = createContext<SidebarContextType | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const translateX = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  const open = useCallback(() => {
    setIsOpen(true);
    Animated.parallel([
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
      Animated.timing(overlayOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  }, []);

  const close = useCallback(() => {
    Animated.parallel([
      Animated.spring(translateX, { toValue: -SIDEBAR_WIDTH, useNativeDriver: true, tension: 65, friction: 11 }),
      Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setIsOpen(false));
  }, []);

  return (
    <SidebarContext.Provider value={{ isOpen, open, close, toggle, translateX, overlayOpacity, SIDEBAR_WIDTH }}>
      {children}
    </SidebarContext.Provider>
  );
}
```

---

## PART D: REMAINING FRONTEND — PROVIDERS & COMPONENTS

### D1. Data Provider Interface (`context/types.ts`)

Defines `IDataProvider` interface with ~35 methods covering: medicines, doses, symptoms, journal, followups, prescriptions, TTS, STT, chat, drug check, emergency, profiles, family, links, discharge plans. Used by both `ApiProvider` and `MockProvider`.

### D2. MockProvider (`context/MockProvider.ts`)

~420 lines. Complete offline demo data provider implementing `IDataProvider`:
- 2 demo medicines: Metformin 500mg + Lisinopril 10mg
- 3 demo patients: Mary Smith (post-op knee), Riya Patel (pneumonia), Amit Kumar (appendectomy) with varying dose/symptom states
- Demo follow-ups, adherence history (7 days)
- Drug interaction checker: offline keyword-matching against 5 interaction rules
- Link codes: "DB-DEMO12" → Mary Smith, "DB-DEMO34" → Riya Patel
- All CRUD operations backed by AsyncStorage key `discharge_buddy_data_v2`
- Chat fallback response, TTS returns empty, prescription scan returns mock Amlodipine 5mg

### D3. NeuralOrb (`components/NeuralOrb.tsx`)

Animated Reanimated SVG orb with:
- Radial gradient core (#A855F7 → #6366F1)
- Rotating ring on speaking/processing
- Pulsing wave rings (2 layers, staggered)
- Assistant mode: animated eyes (Rect, height animates) and speaking mouth (Path, opacity oscillates)
- Shadow glow (#A855F7)

### D4. DotLoader (`components/DotLoader.tsx`)

3-dot bouncing loading animation using Animated. 150ms staggered, scale: 0.6→1.2, translateY: 0→-4, opacity: 0.3→1.

### D5. TranslateText (`components/TranslateText.tsx`)

Wrapper around RN `Text` that intercepts children and calls `translateText()` API on non-English languages. Skips numbers/short strings. Falls back to original text on failure.

---

## PART E: REMAINING FRONTEND — NOTES ON UNEXTRACTED FILES

The original `discharge-buddy` project does NOT have a `src/hooks/` or `src/utils/` directory. These files exist at the top level (next to `app/`, `context/`, `components/`):

Files that exist but were not fully extracted into the blueprint (available in original artifacts):
- `hooks/useAuth.ts`, `hooks/useMedicineTracking.ts`, `hooks/useChat.ts`, `hooks/useConnectivity.ts`, `hooks/useColors.ts`
- `utils/api.ts`, `utils/storage.ts`, `utils/apiUrl.ts`, `utils/MessageEngine.ts`, `utils/conversationMemory.ts`, `utils/NotificationHelper.ts`, `utils/SoundHelper.ts`, `utils/translate.ts`
- `components/Sidebar.tsx`, `components/SuccessBurst.tsx`, `components/AdherenceChart.tsx`, `components/AssistantProvider.tsx`
- `app/(tabs)/symptoms.tsx`, `app/(tabs)/progress.tsx`, `app/(tabs)/schedule.tsx`, `app/(tabs)/followups.tsx`
- `app/scan.tsx`, `app/journal.tsx`, `app/drug-checker.tsx`, `app/cpr.tsx`, `app/meditation.tsx`
- `app/family/dashboard.tsx`, `app/caregiver/dashboard.tsx`, `app/caregiver-chat.tsx`
- `app/onboarding.tsx`, `app/verify-email.tsx`, `app/voice-notes.tsx`
- `app/notifications.tsx`, `app/help.tsx`, `app/scan-qr.tsx`, `app/recovery-support.tsx`

These should be read directly from `artifacts/discharge-buddy/` when needed.
