# 01_architecture.md — SATHI Complete Project Blueprint

## Complete Folder and File Structure

```
sathi-main/
├── package.json                 # Monorepo root configuration & scripts
├── pnpm-workspace.yaml          # Workspace definition (artifacts/*, lib/*, scripts)
├── pnpm-lock.yaml               # Lockfile for exact dependency versions
├── tsconfig.base.json           # Shared compiler options for TypeScript
├── tsconfig.json                # Root TypeScript configuration
├── Dockerfile                   # Multi-stage Docker build for backend & static build
├── render.yaml                  # Render deployment blueprint
├── README.md                    # Project documentation
├── .env / .env.example          # Environment variables configuration
├── scripts/                     # Utility scripts for database & dev setup
├── lib/                         # Shared monorepo packages
│   ├── db/                      # @workspace/db — Drizzle ORM schema and PostgreSQL pool
│   │   ├── package.json
│   │   ├── drizzle.config.ts    # Drizzle Kit migration configuration
│   │   └── src/
│   │       ├── index.ts         # Database connection pool & Drizzle client exports
│   │       ├── query.ts         # Sample query runner script
│   │       └── schema/
│   │           └── index.ts     # Complete PostgreSQL tables, enums, & Zod schemas
│   ├── api-spec/                # @workspace/api-spec — OpenAPI specification
│   │   ├── package.json
│   │   ├── openapi.yaml         # Complete REST API OpenAPI 3.0 spec
│   │   └── orval.config.ts      # Orval configuration for TypeScript client generation
│   ├── api-zod/                 # @workspace/api-zod — Generated Zod validation schemas
│   │   └── package.json
│   └── api-client-react/        # @workspace/api-client-react — Generated React Query hooks
│       └── package.json
└── artifacts/                   # Application packages (services & frontend)
    ├── api-server/              # Express API Backend (Port 3001 / Cloud Run / Render)
    │   ├── package.json
    │   ├── tsconfig.json
    │   ├── build.mjs            # esbuild bundling script for production
    │   ├── apply-link-schema.mjs # Startup schema guard script for links
    │   ├── apply-messages-schema.mjs # Startup schema guard script for chat messages
    │   ├── run_migration.mjs    # Database migration runner script
    │   ├── smoke-test-messaging.mjs # Test verification script for messaging
    │   └── src/
    │       ├── index.ts         # Entry point: starts Express server, background services & schema guards
    │       ├── app.ts           # Express app setup, CORS, JSON limits, pino logger, middleware
    │       ├── ensureSchema.ts  # Additive schema runtime guard (idempotent table/index creation)
    │       ├── env.ts           # Environment variables validator/loader
    │       ├── controllers/     # Route handler logic
    │       │   ├── activityController.ts
    │       │   ├── dischargeController.ts
    │       │   ├── doseTrackingController.ts
    │       │   ├── emergencyController.ts
    │       │   ├── familyController.ts
    │       │   ├── followupController.ts
    │       │   ├── languageSimplifierController.ts
    │       │   ├── medicineController.ts
    │       │   ├── recoveryController.ts
    │       │   └── storageController.ts
    │       ├── middlewares/
    │       │   └── auth.ts      # requireAuth & optionalAuth JWT middleware
    │       ├── lib/
    │       │   ├── email.ts     # Email sending utilities
    │       │   ├── linkCode.ts  # Patient link code generator (e.g. DB-7G4K2P)
    │       │   ├── logger.ts    # Pino structured logger setup
    │       │   └── managedPatients.ts # Helper to query linked patients for a manager
    │       ├── routes/          # API route definitions
    │       │   ├── index.ts     # Router aggregator mounting all endpoints under /api
    │       │   ├── activity.ts  # /api/activity
    │       │   ├── ai.ts        # /api/ai — Groq STT/TTS/Chat/Intent/Drug check
    │       │   ├── auth.ts      # /api/auth — Register, login, OTP, push token
    │       │   ├── caregiver.ts # /api/caregiver — Caregiver management & monitoring
    │       │   ├── chat.ts      # /api/chat — Real-time messaging & SSE stream
    │       │   ├── discharge.ts # /api/discharge — Discharge plan parsing
    │       │   ├── doseTracking.ts # /api/dose-tracking
    │       │   ├── emergency.ts # /api/emergency — SOS alerts
    │       │   ├── family.ts    # /api/family — Family dashboard & invites
    │       │   ├── followup.ts  # /api/followups
    │       │   ├── health.ts    # /api/health
    │       │   ├── languageSimplifier.ts # /api/language — Jargon simplifier
    │       │   ├── links.ts     # /api/links — Link codes & permissions
    │       │   ├── medicines.ts # /api/medicines
    │       │   ├── ocr.ts       # /api/ocr/scan — Prescription image scanning
    │       │   ├── recovery.ts  # /api/recovery
    │       │   ├── schedules.ts # /api/schedules
    │       │   ├── storage.ts   # /api/storage
    │       │   ├── support.ts   # /api/support
    │       │   └── voiceNotes.ts# /api/voice-notes
    │       └── services/        # Core domain logic & external integrations
    │           ├── PrescriptionService.ts # OCR + Groq Vision + Llama structuring pipeline
    │           ├── activityService.ts
    │           ├── dischargeService.ts
    │           ├── doseTrackingService.ts
    │           ├── emergencyService.ts
    │           ├── followupService.ts
    │           ├── languageSimplifierService.ts # Anthropic Claude & dictionary jargon simplification
    │           ├── medicalParser.ts   # Rule-based prescription parser (OD, BD, TDS, AC, PC)
    │           ├── medicineService.ts
    │           ├── notificationService.ts # Firebase FCM & push notification worker
    │           ├── ocrClient.ts       # HTTP client for Python OCR service fallback
    │           ├── pushService.ts
    │           ├── recoveryService.ts
    │           ├── storageService.ts
    │           └── voiceScheduleService.ts # Voice reminder background worker
    ├── discharge-buddy/         # React Native / Expo Mobile Application & Web App
    │   ├── package.json
    │   ├── app.json / app.config.js # Expo configuration (schema, scheme, splash, icons)
    │   ├── babel.config.js      # Babel compiler plugins (Reanimated, NativeWind/Tailwind)
    │   ├── metro.config.cjs     # Metro bundler config with CSS/SVG support
    │   ├── eas.json             # Expo Application Services build & deploy config
    │   ├── vercel.json / netlify.toml # Web deployment headers & routing
    │   ├── app/                 # Expo Router file-based navigation (screens)
    │   │   ├── _layout.tsx      # Root stack layout, AssistantProvider, offline & error banners
    │   │   ├── +html.tsx        # HTML wrapper for web target
    │   │   ├── +not-found.tsx   # 404 fallback screen
    │   │   ├── index.tsx        # Root redirection based on auth & role
    │   │   ├── intro.tsx        # Splash onboarding screen
    │   │   ├── onboarding.tsx   # Initial patient profile setup
    │   │   ├── login.tsx        # User authentication screen
    │   │   ├── register.tsx     # Account registration
    │   │   ├── verify-email.tsx # OTP email verification screen
    │   │   ├── forgot-password.tsx # Password reset request
    │   │   ├── role-select.tsx  # Patient vs Caregiver vs Family selection
    │   │   ├── scan.tsx         # Prescription camera/image scan screen
    │   │   ├── scan-qr.tsx      # QR code scanner for link sharing
    │   │   ├── chat.tsx         # Real-time chat with doctor/caregiver
    │   │   ├── caregiver-chat.tsx # Caregiver messaging view
    │   │   ├── cpr.tsx          # Emergency CPR audio/visual metronome guide
    │   │   ├── drug-checker.tsx # AI Drug-drug interaction checker screen
    │   │   ├── emergency.tsx    # SOS emergency trigger screen
    │   │   ├── emergency-card.tsx # Lockscreen medical ID card
    │   │   ├── help.tsx         # Help center & FAQ
    │   │   ├── journal.tsx      # Recovery mood & symptom diary
    │   │   ├── judge-demo.tsx   # One-click hackathon/judge presentation demo mode
    │   │   ├── meditation.tsx   # Breathing exercises & timer
    │   │   ├── notifications.tsx # Push alert & missed dose history
    │   │   ├── recovery-support.tsx # Jargon simplifier & recovery tips
    │   │   ├── settings.tsx     # Language selection, themes, anchor times
    │   │   ├── (tabs)/          # Patient Bottom Tab Navigation
    │   │   │   ├── _layout.tsx  # Tab navigation configuration
    │   │   │   ├── index.tsx    # Home Dashboard (Beary mascot, adherence ring, daily tasks)
    │   │   │   ├── medicines.tsx # Medication schedule & logging
    │   │   │   ├── symptoms.tsx # Symptom checker & severity logging
    │   │   │   ├── schedule.tsx # Daily calendar & anchor timeline
    │   │   │   ├── progress.tsx # Gamified adherence streak & XP stats
    │   │   │   └── followups.tsx # Appointment manager
    │   │   ├── caregiver/       # Caregiver specific screens
    │   │   │   ├── dashboard.tsx # Patient overview & missed dose alerts
    │   │   │   ├── patient-detail.tsx # Detailed patient medication & vitals inspection
    │   │   │   ├── create-plan.tsx # Discharge plan authoring tool
    │   │   │   ├── alert.tsx    # Escalated emergency & missed dose alerts
    │   │   │   ├── message.tsx  # Send scheduled or instant message to patient
    │   │   │   ├── monitor.tsx  # Vitals telemetry monitor
    │   │   │   └── remind.tsx   # Voice/text reminder creator
    │   │   ├── family/          # Family member screens
    │   │   │   ├── _layout.tsx
    │   │   │   ├── dashboard.tsx # Simplified family status feed
    │   │   │   └── book-appointment.tsx # Assist in doctor booking
    │   │   └── profile/         # User account screens
    │   │       ├── edit.tsx     # Profile editor
    │   │       ├── change-password.tsx
    │   │       └── recovery-report.tsx # PDF / printable recovery summary
    │   ├── components/          # Reusable UI & Feature components
    │   │   ├── MascotBuddy.tsx  # Animated Beary recovery mascot with emotional states
    │   │   ├── MedicineCard.tsx # Interactive dose card (take, snooze, details)
    │   │   ├── AdherenceRing.tsx # Circular SVG adherence gauge
    │   │   ├── AdherenceChart.tsx # Weekly/Monthly adherence statistics graph
    │   │   ├── NeuralOrb.tsx    # AI voice listening/speaking visual orb
    │   │   ├── VoiceInputButton.tsx # Mic recording trigger for voice commands
    │   │   ├── TranslateText.tsx # On-the-fly UI text translation component
    │   │   ├── Sidebar.tsx      # Desktop/tablet navigation drawer
    │   │   ├── FloatingTabBar.tsx # Custom animated mobile tab bar
    │   │   ├── EmergencyButton.tsx # Quick-trigger SOS button
    │   │   ├── OfflineBanner.tsx # Network connectivity loss indicator
    │   │   ├── NotificationToast.tsx # In-app notification popup
    │   │   ├── InteractionWarningCard.tsx # Drug interaction severity banner
    │   │   ├── GlareHover.tsx / .css # Premium card glare hover effect
    │   │   ├── BreathingOrb.tsx # Meditation metronome animation
    │   │   ├── DayNightToggle.tsx # Theme switch
    │   │   ├── DotLoader.tsx / ErrorBoundary.tsx / ErrorFallback.tsx / ErrorNotice.tsx
    │   │   ├── LiquidCapsuleProgress.tsx # Pill-shaped adherence animation
    │   │   ├── MyLinkCodeCard.tsx / LinkByCodeModal.tsx / ShareLinkQRModal.tsx / ApkQRModal.tsx
    │   │   ├── PendingFamilyRequests.tsx / RiskBanner.tsx / RoleSelectModal.tsx
    │   │   ├── TimeOfDayFilter.tsx / TimeSegmentedControl.tsx
    │   │   └── assistant/
    │   │       ├── AssistantProvider.tsx # Global AI voice/chat state & TTS streaming engine
    │   │       ├── AssistantOverlay.tsx  # Full-screen conversational AI modal
    │   │       └── VoiceOrb.tsx          # Micro-animation for voice activity
    │   ├── context/             # React Context Providers (Auth, Theme, Notification)
    │   ├── hooks/               # Custom React hooks (useAuth, useRealtime, useSpeech)
    │   ├── lib/                 # Frontend client APIs & helpers (api.ts, socket.ts)
    │   ├── constants/           # Colors, themes, language lists, default anchor times
    │   └── utils/               # Audio recording, date formatting, storage wrappers
    ├── mockup-sandbox/          # Component testing sandbox & UI preview tool
    │   ├── package.json
    │   ├── vite.config.ts
    │   └── src/
    └── ocr-service/             # Python FastAPI microservice for backup OCR
        ├── main.py              # FastAPI server using Google Gemini Vision
        ├── requirements.txt
        └── report_generator.py  # PDF recovery report generator
```

---

## Monorepo Workspace Setup

### 1. Root Workspace Configuration (`pnpm-workspace.yaml`)
The monorepo uses `pnpm` workspaces to link internal packages without publishing to npm. It includes strict supply-chain security checks (`minimumReleaseAge: 1440` minutes / 24 hours) and explicit catalog dependency versioning.

```yaml
minimumReleaseAge: 1440
minimumReleaseAgeExclude:
  - '@replit/*'
  - stripe-replit-sync
  - expo
  - expo-*
  - '@expo/*'

packages:
  - artifacts/*
  - lib/*
  - lib/integrations/*
  - scripts

catalog:
  '@tanstack/react-query': ^5.90.21
  '@types/node': ^25.3.3
  '@types/react': ^19.2.0
  '@types/react-dom': ^19.2.0
  '@vitejs/plugin-react': ^5.0.4
  drizzle-orm: ^0.45.1
  framer-motion: ^12.23.24
  lucide-react: ^0.545.0
  react: 19.1.0
  react-dom: 19.1.0
  tailwindcss: ^4.1.14
  tsx: ^4.21.0
  vite: ^7.3.0
  zod: ^3.25.76

autoInstallPeers: false
onlyBuiltDependencies:
  - '@swc/core'
  - esbuild
  - msw
  - unrs-resolver
overrides:
  "@esbuild-kit/esm-loader": "npm:tsx@^4.21.0"
  esbuild: "0.27.3"
```

### 2. Root Package (`package.json`)
```json
{
  "name": "sathi-monorepo",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "pnpm -r --parallel run dev",
    "build": "pnpm -r run build",
    "db:push": "pnpm --filter @workspace/db run push",
    "typecheck": "pnpm -r run typecheck"
  }
}
}
```

---

## Frontend and Backend Communication

### Base URLs & Endpoint Routing
- **Development**: The backend API runs locally on port `3001` (e.g. `http://10.0.2.2:3001` for Android emulator or `http://localhost:3001` for iOS/Web).
- **Production**: Deployed on cloud providers (Render / Google Cloud Run) via environment variable `EXPO_PUBLIC_API_URL` (e.g. `https://sathi-api.onrender.com`).
- Every REST request is prefixed with `/api` (e.g. `GET /api/medicines`, `POST /api/ai/chat`).
- **Real-time Server-Sent Events (SSE)**: The client connects to `GET /api/chat/stream` for live bidirectional message push and notification sync.

### Authentication Headers & Request Structure
- The frontend stores the user's JWT token in React Native `AsyncStorage` under key `@sathi_auth_token`.
- Every HTTP request dispatched by the API client attaches this token in the standard Authorization header:
  ```http
  Authorization: Bearer <jwt_token>
  Content-Type: application/json
  ```
- If the token expires (HTTP 401 response), the client automatically purges `@sathi_auth_token` and redirects the user to `/login`.
- Audio upload endpoints (`/api/ai/stt`, `/api/ocr/scan`) use base64 JSON payload over standard HTTP POST with a payload limit expanded to `50MB` (`express.json({ limit: "50mb" })`).

---

## Environment Variables List

| Variable Name | Required | Description |
| :--- | :---: | :--- |
| `PORT` | Yes | API server listening port (defaults to `3001`). |
| `DATABASE_URL` | Yes | Supabase PostgreSQL connection string (e.g. `postgresql://postgres.xxx:pass@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`). |
| `JWT_SECRET` | Yes | Secret key used to sign and verify user authentication JSON Web Tokens. |
| `GROQ_API_KEY` | Yes | API key for Groq Cloud (used for Llama 3.3 Structuring & Jargon Simplifier, Llama 3.1 Intent & Chat, Whisper STT, and Llama Vision OCR). |
| `GOOGLE_API_KEY` | Yes | Google AI Studio key for Gemini 1.5 Flash (used in OCR fallback & recovery reports). |
| `OCR_SERVICE_URL` | Optional | URL for the backup Python OCR microservice (defaults to `http://localhost:8100`). |
| `EXPO_PUBLIC_API_URL` | Yes | Frontend environment variable defining the target API Base URL (e.g. `https://sathi-api.onrender.com`). |
| `EXPO_PUBLIC_GROQ_API_KEY`| Optional | Frontend fallback key for client-side AI operations if needed. |
| `EDGE_TTS_VOICE_<LANG>`| Optional | Per-language voice override for Microsoft Edge TTS (e.g. `EDGE_TTS_VOICE_HI=hi-IN-MadhurNeural`). |

---

## Docker and Deployment Configuration

### Multi-Stage Dockerfile (`Dockerfile`)
The project utilizes a multi-stage Docker build that compiles the TypeScript API server using `esbuild` into a single high-performance Node bundle.

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY lib ./lib
COPY artifacts/api-server ./artifacts/api-server
RUN pnpm install --frozen-lockfile
WORKDIR /app/artifacts/api-server
RUN pnpm run build

# Stage 2: Production Runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
COPY --from=builder /app/artifacts/api-server/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3001
CMD ["node", "dist/index.js"]
```

### Render Deployment Blueprint (`render.yaml`)
```yaml
services:
  - type: web
    name: sathi-api-server
    env: docker
    plan: starter
    dockerfilePath: ./Dockerfile
    envVars:
      - key: PORT
        value: 3001
      - key: DATABASE_URL
        fromDatabase:
          name: sathi-db
          property: connectionString
      - key: JWT_SECRET
        generateValue: true
      - key: GROQ_API_KEY
        sync: false
      - key: GOOGLE_API_KEY
        sync: false

databases:
  - name: sathi-db
    plan: starter
    databaseName: sathi_production
    user: sathi_user
```
