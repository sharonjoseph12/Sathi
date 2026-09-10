# 17 — Root Monorepo Config + Backend Controllers & Services

Complete source code extracted verbatim from `artifacts/`. Covers all root monorepo config files, all 9 missing controllers (full implementation code, not just routes), and all 11 missing services.

---

## PART A: ROOT MONOREPO CONFIGURATION

### A1. Root `package.json`

```json
{
  "name": "workspace",
  "version": "0.0.0",
  "license": "MIT",
  "packageManager": "pnpm@10.33.2",
  "scripts": {
    "build": "pnpm run typecheck && pnpm -r --if-present run build",
    "typecheck:libs": "tsc --build",
    "typecheck": "pnpm run typecheck:libs && pnpm -r --filter \"./artifacts/**\" --filter \"./scripts\" --if-present run typecheck",
    "services": "powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/manage-services.ps1",
    "services:stop": "powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/manage-services.ps1 -Action stop",
    "services:build": "powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/manage-services.ps1 -Action build",
    "dev:all": "powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/start-dev.ps1",
    "deploy": "powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/deploy.ps1"
  },
  "private": true,
  "devDependencies": {
    "prettier": "^3.8.1",
    "typescript": "~5.9.2"
  },
  "dependencies": {
    "expo": "~54.0.34"
  }
}
```

### A2. `pnpm-workspace.yaml`

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
  '@replit/vite-plugin-cartographer': ^0.5.1
  '@replit/vite-plugin-dev-banner': ^0.1.1
  '@replit/vite-plugin-runtime-error-modal': ^0.0.6
  '@tailwindcss/vite': ^4.1.14
  '@tanstack/react-query': ^5.90.21
  '@types/node': ^25.3.3
  '@types/react': ^19.2.0
  '@types/react-dom': ^19.2.0
  '@vitejs/plugin-react': ^5.0.4
  class-variance-authority: ^0.7.1
  clsx: ^2.1.1
  drizzle-orm: ^0.45.1
  framer-motion: ^12.23.24
  lucide-react: ^0.545.0
  react: 19.1.0
  react-dom: 19.1.0
  tailwind-merge: ^3.3.1
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

### A3. `tsconfig.base.json`

```json
{
  "compilerOptions": {
    "isolatedModules": true,
    "lib": ["es2022"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "noEmitOnError": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": false,
    "noImplicitReturns": true,
    "noUnusedLocals": false,
    "noImplicitAny": true,
    "noImplicitThis": true,
    "strictNullChecks": true,
    "strictFunctionTypes": false,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "useUnknownInCatchVariables": true,
    "alwaysStrict": true,
    "skipLibCheck": true,
    "target": "es2022",
    "types": [],
    "customConditions": ["workspace"]
  }
}
```

### A4. `Dockerfile`

```dockerfile
# ─── Stage 1: Build ───
FROM node:20-slim AS builder

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json tsconfig.json ./
COPY lib/db/package.json ./lib/db/package.json
COPY lib/api-zod/package.json ./lib/api-zod/package.json
COPY artifacts/api-server/package.json ./artifacts/api-server/package.json

RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm --filter @workspace/api-server run build

# ─── Stage 2: Production ───
FROM node:20-slim AS runner

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY artifacts/api-server/package.json ./artifacts/api-server/package.json
COPY lib/db/package.json ./lib/db/package.json
COPY lib/api-zod/package.json ./lib/api-zod/package.json

RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/artifacts/api-server/dist ./artifacts/api-server/dist

EXPOSE 8080

CMD ["node", "--enable-source-maps", "./artifacts/api-server/dist/index.mjs"]
```

### A5. `render.yaml`

```yaml
services:
  - type: web
    name: discharge-buddy-backend
    env: docker
    dockerfilePath: ./Dockerfile
    plan: free
    healthCheckPath: /
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 3000
      - key: DATABASE_URL
        sync: false
      - key: JWT_SECRET
        sync: false
      - key: GEMINI_API_KEY
        sync: false
```

### A6. `.gitignore`

```
# compiled output
dist
tmp
out-tsc
*.tsbuildinfo
.expo
.expo-shared

# dependencies
node_modules

# IDEs and editors
/.idea
.project
.classpath
.c9/
*.launch
.settings/
*.sublime-workspace

# IDE - VSCode
.vscode/*
!.vscode/settings.json
!.vscode/tasks.json
!.vscode/launch.json
!.vscode/extensions.json

# misc
/.sass-cache
/connect.lock
/coverage
/libpeerconnection.log
npm-debug.log
yarn-error.log
testem.log
/typings

# System Files
.DS_Store
Thumbs.db

.cursor/rules/nx-rules.mdc
.github/instructions/nx.instructions.md

# Replit
.cache/
.local/

# Environment files
.env
.env.*
.env*.local
!.env.example

# Python
venv/
__pycache__/
*.pyc

# Node
node_modules/

# OS
.DS_Store
google-services*.json

# Cloud Run deploy secrets (real values)
scripts/cloudrun.env.yaml

# Artifacts
artifacts/discharge-buddy/app.json
```

### A7. `.npmrc`

```
auto-install-peers=false
strict-peer-dependencies=false
node-linker=hoisted
```

### A8. `.dockerignore`

```
node_modules
**/node_modules
.expo
.expo-shared
.git
.gitignore
venv
__pycache__
*.pyc
web-build
.npm
.cache
.env
.env.*
!.env.example
artifacts/discharge-buddy
attached_assets
*.md
PPT Assests
scratch
```

---

## PART B: CONTROLLERS (Full Implementation)

### B1. `activityController.ts`

```typescript
import type { Response } from "express";
import type { AuthRequest } from "../middlewares/auth";
import { ActivityService } from "../services/activityService";

export class ActivityController {
  static async getSymptoms(req: AuthRequest, res: Response) {
    if (!req.user?.linkedPatientId) return res.json({ symptomLogs: [] });
    const logs = await ActivityService.getSymptoms(req.user.linkedPatientId);
    return res.json({ symptomLogs: logs });
  }

  static async addSymptom(req: AuthRequest, res: Response) {
    if (!req.user?.linkedPatientId) return res.status(403).json({ error: "No linked patient" });
    try {
      const created = await ActivityService.addSymptom(req.user.linkedPatientId, req.body);
      return res.json({ symptomLog: created });
    } catch {
      return res.status(500).json({ error: "Failed to add symptom" });
    }
  }

  static async getJournal(req: AuthRequest, res: Response) {
    if (!req.user?.id) return res.json({ journalEntries: [] });
    const entries = await ActivityService.getJournals(req.user.id);
    return res.json({ journalEntries: entries });
  }

  static async addJournal(req: AuthRequest, res: Response) {
    if (!req.user?.id) return res.status(403).json({ error: "Unauthorized" });
    try {
      const created = await ActivityService.addJournal(req.user.id, req.body);
      return res.json({ journalEntry: created });
    } catch {
      return res.status(500).json({ error: "Failed to add journal" });
    }
  }
}
```

### B2. `emergencyController.ts`

```typescript
import type { Response } from "express";
import type { AuthRequest } from "../middlewares/auth";
import { EmergencyService } from "../services/emergencyService";

export class EmergencyController {
  static async triggerEmergency(req: AuthRequest, res: Response) {
    if (!req.user?.id) return res.status(403).json({ error: "Unauthorized" });
    try {
      const alert = await EmergencyService.logEmergency(req.user.id);
      return res.json({ success: true, alert });
    } catch {
      return res.status(500).json({ error: "Failed to trigger emergency alert" });
    }
  }

  static async getEmergencies(req: AuthRequest, res: Response) {
    if (!req.user?.id) return res.status(403).json({ error: "Unauthorized" });
    const alerts = await EmergencyService.getEmergencies(req.user.id);
    return res.json({ alerts });
  }

  static async sendEmergencyReport(req: AuthRequest, res: Response) {
    if (!req.user?.id) return res.status(403).json({ error: "Unauthorized" });
    try {
      const { symptoms, medicines, location } = req.body;
      console.log(`[EmergencyController] SOS Report received for user ${req.user.id}:`, { symptoms, medicines, location });
      const dispatchId = `AMB-${Math.floor(1000 + Math.random() * 9000)}`;
      const etaMinutes = Math.floor(5 + Math.random() * 10);
      return res.json({
        success: true,
        message: "Ambulance dispatched.",
        dispatchId,
        etaMinutes,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      return res.status(500).json({ error: "Failed to process emergency report" });
    }
  }
}
```

### B3. `followupController.ts`

```typescript
import type { Response } from "express";
import type { AuthRequest } from "../middlewares/auth";
import { FollowupService } from "../services/followupService";

export class FollowupController {
  static async createFollowup(req: AuthRequest, res: Response) {
    if (!req.user?.id) return res.status(401).json({ success: false, message: "Unauthorized" });
    try {
      const { type, title, scheduledDate, dateTime, doctorName, reminderDaysBefore, notes } = req.body;
      const actualDate = scheduledDate || dateTime;
      if (!actualDate || !title) {
        return res.status(400).json({ success: false, message: "title and scheduledDate (or dateTime) are required" });
      }
      const followup = await FollowupService.createFollowup(req.user.id, {
        type: type || "appointment",
        title,
        scheduledDate: new Date(actualDate),
        reminderDaysBefore,
        notes: notes || (doctorName ? `Doctor: ${doctorName}` : undefined),
      });
      return res.json({ success: true, data: followup });
    } catch {
      return res.status(500).json({ success: false, message: "Failed to create followup" });
    }
  }

  static async getFollowups(req: AuthRequest, res: Response) {
    if (!req.user?.id) return res.status(401).json({ success: false, message: "Unauthorized" });
    try {
      const status = req.query.status as "upcoming" | "completed" | "missed" | undefined;
      const followups = await FollowupService.getFollowups(req.user.id, status);
      return res.json({ success: true, data: followups });
    } catch (err: unknown) {
      console.error("[FollowupController] Error fetching followups:", err);
      const message = err instanceof Error ? err.message : "Failed to get followups";
      return res.status(500).json({ success: false, message });
    }
  }

  static async updateFollowupStatus(req: AuthRequest, res: Response) {
    if (!req.user?.id) return res.status(401).json({ success: false, message: "Unauthorized" });
    try {
      const id = req.params.id as string;
      const { status } = req.body;
      if (status !== "completed" && status !== "missed") {
        return res.status(400).json({ success: false, message: "Status must be 'completed' or 'missed'" });
      }
      const updated = await FollowupService.updateFollowupStatus(id, req.user.id, status);
      return res.json({ success: true, data: updated });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update followup";
      return res.status(500).json({ success: false, message });
    }
  }

  static async deleteFollowup(req: AuthRequest, res: Response) {
    if (!req.user?.id) return res.status(401).json({ success: false, message: "Unauthorized" });
    try {
      const id = req.params.id as string;
      await FollowupService.deleteFollowup(id, req.user.id);
      return res.json({ success: true, message: "Deleted" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete followup";
      return res.status(500).json({ success: false, message });
    }
  }
}
```

### B4. `familyController.ts`

```typescript
import { Request, Response } from "express";
import { db, patients, users, eq, medicines, doseLogs, symptomLogs, followUps, inArray } from "@workspace/db";
import type { AuthRequest } from "../middlewares/auth";
import { logger } from "../lib/logger";
import { getManagedPatients } from "../lib/managedPatients";

export class FamilyController {
  static async getMembers(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const members = await getManagedPatients(req.user.id);
      if (members.length === 0) return res.json({ members: [] });
      const patientIds = members.map(p => p.id);
      const [allMedicines, allSymptomLogs, allFollowUps] = await Promise.all([
        db.select().from(medicines).where(inArray(medicines.patientId, patientIds)),
        db.select().from(symptomLogs).where(inArray(symptomLogs.patientId, patientIds)),
        db.select().from(followUps).where(inArray(followUps.patientId, patientIds)),
      ]);
      const allMedicineIds = allMedicines.map(m => m.id);
      const allDoseLogs = allMedicineIds.length > 0
        ? await db.select().from(doseLogs).where(inArray(doseLogs.medicineId, allMedicineIds))
        : [];
      const formattedMembers = members.map(p => {
        const pMeds = allMedicines.filter(m => m.patientId === p.id);
        const medIds = pMeds.map(m => m.id);
        const pDoseLogs = allDoseLogs.filter(d => medIds.includes(d.medicineId));
        const pSymptomLogs = allSymptomLogs.filter(s => s.patientId === p.id);
        return {
          ...p,
          dischargeDate: p.dischargeDate?.toISOString(),
          medicines: pMeds.map(m => ({ ...m, startDate: m.startDate?.toISOString(), endDate: m.endDate?.toISOString() })),
          doseLogs: pDoseLogs.map(d => ({ ...d, takenAt: d.takenAt?.toISOString() })),
          symptomLogs: pSymptomLogs.map(s => ({ ...s, date: s.date?.toISOString() })),
          followUps: allFollowUps.filter(f => f.patientId === p.id).map(f => ({ ...f, dateTime: f.dateTime?.toISOString() })),
        };
      });
      return res.json({ members: formattedMembers });
    } catch (error: any) {
      logger.error({ error: error.message }, "[FamilyController] getMembers failed");
      return res.status(500).json({ error: "Failed to fetch family members", detail: error.message });
    }
  }

  static async addMember(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const { name, age, condition, emergencyContact } = req.body;
      if (!name) return res.status(400).json({ error: "Name is required" });
      const [newPatient] = await db.insert(patients).values({
        name,
        age: age ? parseInt(age) : 0,
        condition: condition || "Healthy",
        dischargeDate: new Date(),
        emergencyContact: emergencyContact || req.user.phone || "Unknown",
        caregiverId: req.user.id,
      }).returning();
      return res.status(201).json({ member: newPatient });
    } catch (error: any) {
      logger.error({ error: error.message }, "[FamilyController] addMember failed");
      return res.status(500).json({ error: "Failed to add family member", detail: error.message });
    }
  }

  static async linkMember(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: "Email is required" });
      const [patientUser] = await db.select().from(users).where(eq(users.email, email));
      if (!patientUser || patientUser.role !== "patient") {
        return res.status(404).json({ error: "Patient account not found with this email" });
      }
      if (!patientUser.linkedPatientId) {
        return res.status(400).json({ error: "This patient account is not fully set up." });
      }
      const [updatedPatient] = await db.update(patients)
        .set({ caregiverId: req.user.id })
        .where(eq(patients.id, patientUser.linkedPatientId))
        .returning();
      return res.json({ success: true, member: updatedPatient });
    } catch (error: any) {
      logger.error({ error: error.message }, "[FamilyController] linkMember failed");
      return res.status(500).json({ error: "Failed to link family member", detail: error.message });
    }
  }
}
```

### B5. `recoveryController.ts`

```typescript
import type { Response } from "express";
import type { AuthRequest } from "../middlewares/auth";
import { RecoveryService } from "../services/recoveryService";

export class RecoveryController {
  static async upsertRecoveryLog(req: AuthRequest, res: Response) {
    if (!req.user?.id) return res.status(401).json({ success: false, message: "Unauthorized" });
    try {
      const { logDate, painLevel, energyLevel, fever, feverTemp, notes } = req.body;
      if (!logDate) return res.status(400).json({ success: false, message: "logDate is required" });
      if (painLevel !== undefined && (painLevel < 0 || painLevel > 10)) {
        return res.status(400).json({ success: false, message: "painLevel must be between 0 and 10" });
      }
      if (energyLevel !== undefined && (energyLevel < 0 || energyLevel > 10)) {
        return res.status(400).json({ success: false, message: "energyLevel must be between 0 and 10" });
      }
      const log = await RecoveryService.upsertRecoveryLog(req.user.id, { logDate, painLevel, energyLevel, fever, feverTemp, notes });
      return res.json({ success: true, data: log });
    } catch {
      return res.status(500).json({ success: false, message: "Failed to save recovery log" });
    }
  }

  static async getRecoveryLogs(req: AuthRequest, res: Response) {
    if (!req.user?.id) return res.status(401).json({ success: false, message: "Unauthorized" });
    try {
      const days = req.query.days ? parseInt(req.query.days as string, 10) : 30;
      const logs = await RecoveryService.getRecoveryLogs(req.user.id, days);
      return res.json({ success: true, data: logs });
    } catch {
      return res.status(500).json({ success: false, message: "Failed to get recovery logs" });
    }
  }

  static async getRecoveryTrends(req: AuthRequest, res: Response) {
    if (!req.user?.id) return res.status(401).json({ success: false, message: "Unauthorized" });
    try {
      const trends = await RecoveryService.getRecoveryTrends(req.user.id);
      return res.json({ success: true, data: trends });
    } catch {
      return res.status(500).json({ success: false, message: "Failed to get recovery trends" });
    }
  }

  static async getAlerts(req: AuthRequest, res: Response) {
    if (!req.user?.id) return res.status(401).json({ success: false, message: "Unauthorized" });
    try {
      const alerts = await RecoveryService.detectAlerts(req.user.id);
      return res.json({ success: true, data: alerts });
    } catch {
      return res.status(500).json({ success: false, message: "Failed to detect alerts" });
    }
  }
}
```

### B6. `storageController.ts`

```typescript
import type { Response } from "express";
import type { AuthRequest } from "../middlewares/auth";
import { StorageService } from "../services/storageService";

export class StorageController {
  static async savePrescription(req: AuthRequest, res: Response) {
    if (!req.user?.id) return res.status(401).json({ success: false, message: "Unauthorized" });
    try {
      const { imageUrl, rawText, extractedData } = req.body;
      const prescription = await StorageService.savePrescription(req.user.id, { imageUrl, rawText, extractedData });
      return res.json({ success: true, data: { prescription } });
    } catch {
      return res.status(500).json({ success: false, message: "Failed to save prescription" });
    }
  }

  static async getPrescriptionHistory(req: AuthRequest, res: Response) {
    if (!req.user?.id) return res.status(401).json({ success: false, message: "Unauthorized" });
    try {
      const prescriptions = await StorageService.getUserPrescriptions(req.user.id);
      return res.json({ success: true, data: prescriptions });
    } catch {
      return res.status(500).json({ success: false, message: "Failed to get prescriptions" });
    }
  }

  static async getUserProfile(req: AuthRequest, res: Response) {
    if (!req.user?.id) return res.status(401).json({ success: false, message: "Unauthorized" });
    try {
      const user = await StorageService.getUserProfile(req.user.id);
      return res.json({ success: true, data: user });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to get profile";
      return res.status(500).json({ success: false, message });
    }
  }
}
```

### B7. `languageSimplifierController.ts`

```typescript
import type { Response } from "express";
import type { AuthRequest } from "../middlewares/auth";
import { LanguageSimplifierService } from "../services/languageSimplifierService";

export class LanguageSimplifierController {
  static async simplifyText(req: AuthRequest, res: Response) {
    try {
      const { text } = req.body;
      if (!text || text.trim() === "") {
        return res.status(400).json({ success: false, message: "text is required" });
      }
      const result = await LanguageSimplifierService.simplifyInstruction(text);
      return res.json({ success: true, data: result });
    } catch {
      return res.status(500).json({ success: false, message: "Failed to simplify text" });
    }
  }

  static async lookupTerm(req: AuthRequest, res: Response) {
    try {
      const term = req.query.term as string;
      if (!term) return res.status(400).json({ success: false, message: "term query parameter is required" });
      const meaning = await LanguageSimplifierService.lookupAbbreviation(term);
      if (!meaning) return res.status(404).json({ success: false, message: "Term not found" });
      return res.json({ success: true, data: { term, meaning } });
    } catch {
      return res.status(500).json({ success: false, message: "Failed to lookup term" });
    }
  }
}
```

### B8. `dischargeController.ts`

```typescript
import { db, dischargePlans, patients } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { Response } from "express";
import type { AuthRequest } from "../middlewares/auth";
import { DischargeService } from "../services/dischargeService";
import { logger } from "../lib/logger";

export class DischargeController {
  static async getPlan(req: AuthRequest, res: Response) {
    const id = req.params.id;
    logger.info({ id, method: req.method }, "[DEBUG] Fetching plan");
    try {
      if (!req.user) { logger.error("[DEBUG] No user on request"); return res.status(401).json({ error: "Unauthorized" }); }
      const userId = req.user.id;
      if (id === "dev") {
        const body = req.body || {};
        logger.info({ hasBodyData: !!body.data }, "[DEBUG] Dev mode normalization");
        const plan = await DischargeService.normalizePlan(userId, body.data);
        return res.json({ data: plan });
      }
      logger.info({ id }, "[DEBUG] Querying DB for plan");
      const results = await db.select().from(dischargePlans).where(eq(dischargePlans.id, id as string));
      if (!results || results.length === 0) { logger.warn({ id }, "[DEBUG] Plan not found in DB"); return res.status(404).json({ error: "Plan not found" }); }
      const planRecord = results[0];
      if (!planRecord) { logger.error("[DEBUG] Results[0] is null even if length > 0"); return res.status(500).json({ error: "Query yielded null row" }); }
      logger.info({ planId: planRecord.id }, "[DEBUG] Plan record found");
      return res.json(planRecord);
    } catch (error: any) {
      logger.error({ msg: error.message, stack: error.stack, id }, "[DEBUG] getPlan CRASHED");
      return res.status(500).json({ error: "Failed to fetch plan", detail: error.message || "Unknown error" });
    }
  }

  static async importPlan(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const userId = req.user.id;
      const { planId, mode, data } = req.body || {};
      if (planId === "dev") {
        const result = await DischargeService.normalizePlan(userId, data);
        return res.json({ success: true, message: "Dev plan normalized", data: result });
      }
      const result = await DischargeService.importPlan(userId, planId, mode);
      return res.json(result);
    } catch (error: any) {
      logger.error({ error: error.message }, "[DEBUG] importPlan FAILED");
      return res.status(500).json({ error: "Import failed", detail: error.message });
    }
  }

  static async createPlan(req: AuthRequest, res: Response) {
    try {
      const { patientId, data } = req.body || {};
      let actualPatientId = patientId;
      if (!actualPatientId) {
        if (!data || !data.patientName) return res.status(400).json({ error: "Patient name is required to create a plan." });
        const [newPatient] = await db.insert(patients).values({
          name: data.patientName,
          age: data.age ? parseInt(data.age) : 0,
          condition: data.diagnosis || "Pending",
          dischargeDate: new Date(data.dischargeDate || Date.now()),
          emergencyContact: data.emergencyContact || "Unknown",
          caregiverId: req.user?.id,
        }).returning();
        actualPatientId = newPatient.id;
      }
      const newPlan = await DischargeService.createPlan(actualPatientId, data);
      return res.status(201).json({ planId: newPlan.id });
    } catch (error: any) {
      logger.error({ error: error.message }, "[DEBUG] createPlan FAILED");
      return res.status(500).json({ error: "Creation failed", detail: error.message });
    }
  }
}
```

### B9. `doseTrackingController.ts`

```typescript
import type { Response } from "express";
import type { AuthRequest } from "../middlewares/auth";
import { DoseTrackingService } from "../services/doseTrackingService";

export class DoseTrackingController {
  static async getAdherenceStats(req: AuthRequest, res: Response) {
    if (!req.user?.linkedPatientId) {
      return res.json({ success: true, data: { total: 0, taken: 0, missed: 0, pending: 0, snoozed: 0, adherencePercent: 0 } });
    }
    try {
      const stats = await DoseTrackingService.getAdherenceStats(req.user.linkedPatientId);
      return res.json({ success: true, data: stats });
    } catch {
      return res.status(500).json({ success: false, message: "Failed to get adherence stats" });
    }
  }

  static async markMissedDoses(req: AuthRequest, res: Response) {
    if (!req.user?.linkedPatientId) return res.status(403).json({ success: false, message: "No linked patient" });
    try {
      const markedCount = await DoseTrackingService.markMissedDoses(req.user.linkedPatientId);
      return res.json({ success: true, data: { markedCount } });
    } catch {
      return res.status(500).json({ success: false, message: "Failed to mark missed doses" });
    }
  }
}
```

---

## PART C: SERVICES (Full Implementation)

### C1. `PrescriptionService.ts` — Full OCR/AI Pipeline

```typescript
import { enrichWithRuleParsing, type ParsedMedicine, type ParsedSchedule } from "./medicalParser";
import { type QualityReport } from "./ocrClient";

interface NvidiaResponse {
  choices: Array<{ message: { tool_calls?: Array<{ function: { arguments: string } }> } }>;
}
interface GroqResponse {
  choices: Array<{ message: { content: string } }>;
}

export interface ExtractedMedicine {
  name: string;
  dosage: string;
  frequency: string;
  frequency_code: string;
  duration: string;
  timing: string;
  notes: string;
  confidence: number;
  low_confidence: boolean;
  schedule: ParsedSchedule;
}

export interface PrescriptionAnalysisResult {
  medicines: ExtractedMedicine[];
  general_instructions: string;
  explanation: string;
  warnings: string[];
  overall_confidence: number;
  ocr_source: string;
  quality?: QualityReport;
  processing_note: string;
}

const GROQ_STRUCTURE_MODEL = "llama-3.3-70b-versatile";

const STRUCTURING_PROMPT = `
Return ONLY valid JSON. Do NOT include markdown, backticks, or explanation.
You are a medical OCR correction system. You are given text extracted from a prescription image by an OCR engine.
Your job is to fix spelling mistakes and recognize the true medicine names even if they are heavily distorted, and output them in a structured JSON format.

# EXAMPLES OF OCR CORRECTION:
- "Cabergolin", "G lalyak", "N Cluyah", or "Caber" -> Cabergoline
- "025uy" -> 0.25mg
- "Thyronom" or "Thyronorn" -> Thyronorm
- "6ok Nitkye lok" or "Dailysl 6ok" -> Vitamin D3
- "tuice Lsee k2" or "tu weke" -> Twice weekly

# EXTRACTION RULES
- Be BRAVE in correcting spelling errors. If it looks like a medicine name, correct it.
- If you see "T." or "Tab." before a word, it stands for "Tablet".
- If a word is just noise and doesn't map to a real medicine or dosage, DISCARD IT.

# OUTPUT FORMAT (STRICT JSON)
{
  "medicines": [
    {
      "name": "Full Medicine Name",
      "dosage": "e.g., 500mg",
      "frequency": "e.g., twice daily",
      "duration": "e.g., 5 days",
      "timing": "e.g., after food",
      "times": ["HH:MM"],
      "notes": "any special instructions",
      "confidence": 0,
      "rule_match": boolean
    }
  ],
  "overall_instructions": "General notes found on paper",
  "explanation": "Simple 1-2 sentence summary for the patient",
  "warnings": []
}

NO GUESSING. NO MARKDOWN.

# RULES
## Medicine Name: Extract exact name from the text. Do NOT auto-correct spelling if completely unreadable.
## Dosage: Examples: 500 mg, 5 ml, 1 tablet
## Frequency (IMPORTANT): OD -> once daily, BD -> twice daily, TDS -> three times daily, QID -> four times daily, SOS -> only when needed, 1-0-1 -> morning and night, 1-1-1 -> morning/afternoon/night, 0-0-1 -> night only. Return in FULL FORM.
## Duration: Examples: 3 days, 1 week. If not mentioned -> ""
## Timing: Extract if mentioned: before food, after food, morning / night
## Times: If text mentions specific times (e.g. "10:00 AM", "10 PM", "9:30"), extract as 24-hour format array. If none, return [].
## Notes: Special instructions, conditional usage
## Explanation: Write clear, simple explanation in 2-3 sentences in plain language.
## Warnings: If text is unclear, add warning. If not a prescription, add warning.
## Confidence Score: 0-100 based on clarity in text.

STRICT RULES: DO NOT invent medicines. DO NOT assume missing values. DO NOT correct spelling unless confident. DO NOT output anything except JSON. If nothing readable, return empty fields with warning.
`;

export class PrescriptionService {
  static async analyzePrescription(imageBase64: string): Promise<PrescriptionAnalysisResult> {
    const groqKey = process.env.GROQ_API_KEY || process.env.EXPO_PUBLIC_GROQ_API_KEY;
    if (!groqKey) throw new Error("GROQ_API_KEY is not configured in environment variables");
    const cleanBase64 = imageBase64.includes(",") ? imageBase64.split(",")[1]! : imageBase64;
    console.log("[Pipeline] Step 1: Attempting NVIDIA Vision OCR service (via Groq fallback)...");
    let extractedText = "";
    try {
      extractedText = await this.analyzeWithGroqVision(cleanBase64, groqKey);
    } catch (err: any) {
      console.error(\`[Pipeline] Groq Vision OCR error: \${err.message}\`);
      throw new Error("OCR failed: " + err.message);
    }
    if (extractedText.trim().length === 0) {
      return {
        medicines: [], general_instructions: "", explanation: "",
        warnings: ["No readable text was found in the image. Please ensure the prescription is clearly visible."],
        overall_confidence: 0, ocr_source: "nvidia_vision", processing_note: "OCR completed but no text was detected.",
      };
    }
    console.log(\`[Pipeline] Step 2: Structuring text with Groq (\${GROQ_STRUCTURE_MODEL})...\`);
    const structuredResult = await this.structureWithGroq(extractedText, groqKey);
    console.log("[Pipeline] Step 3: Enriching with medical parser...");
    const enriched = enrichWithRuleParsing(structuredResult.medicines);
    const medicines: ExtractedMedicine[] = enriched
      .filter((med: any) => { const name = med.name?.trim() || ""; return name.length >= 2 && !name.match(/^[. ,;:]+$/); })
      .map((med: any) => { const confidence = med.confidence || 85; return { ...med, confidence, low_confidence: confidence < 75 }; });
    return {
      medicines,
      general_instructions: structuredResult.overall_instructions || "",
      explanation: structuredResult.explanation || "",
      warnings: structuredResult.warnings || [],
      overall_confidence: medicines.length > 0 ? Math.round(medicines.reduce((s, m) => s + m.confidence, 0) / medicines.length) : 0,
      ocr_source: "groq_llama_vision",
      processing_note: "Used Groq Llama Vision for OCR and Groq for structuring.",
    };
  }

  private static async analyzeWithGroqVision(imageBase64: string, groqApiKey: string): Promise<string> {
    const groqUrl = "https://api.groq.com/openai/v1/chat/completions";
    const requestBody = {
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [{ role: "user", content: [{ type: "text", text: "You are a medical OCR expert. Extract ALL text from this prescription or medical discharge document exactly as written. Include medicine names, dosages, frequencies, timings, doctor notes, and patient instructions. Do NOT summarize. Output the raw extracted text only." }, { type: "image_url", image_url: { url: \`data:image/jpeg;base64,\${imageBase64}\` } }] }],
      max_tokens: 1024, temperature: 0.1,
    };
    const response = await fetch(groqUrl, {
      method: "POST", headers: { "Authorization": \`Bearer \${groqApiKey}\`, "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
    if (!response.ok) { const errorText = await response.text(); throw new Error(\`Groq Vision API error: \${response.status} \${errorText}\`); }
    const data = (await response.json()) as any;
    const extractedText = data.choices?.[0]?.message?.content;
    if (!extractedText || typeof extractedText !== "string") throw new Error("Groq Vision API returned an empty response.");
    console.log(\`[Pipeline] Groq Vision extracted \${extractedText.length} chars of text.\`);
    return extractedText.trim();
  }

  private static async structureWithGroq(extractedText: string, apiKey: string): Promise<any> {
    const apiEndpoint = "https://api.groq.com/openai/v1/chat/completions";
    const requestBody = {
      model: GROQ_STRUCTURE_MODEL,
      messages: [
        { role: "system", content: STRUCTURING_PROMPT },
        { role: "user", content: \`Here is the OCR-extracted text from a prescription:\\n\\n\${extractedText}\` },
      ],
      temperature: 0.1, max_tokens: 2048,
    };
    const response = await fetch(apiEndpoint, {
      method: "POST", headers: { "Content-Type": "application/json", "Authorization": \`Bearer \${apiKey}\` },
      body: JSON.stringify(requestBody),
    });
    if (!response.ok) { const errorText = await response.text(); throw new Error(\`Groq API error: \${response.status} \${errorText}\`); }
    const data = (await response.json()) as GroqResponse;
    const resultText = data.choices[0]?.message?.content;
    if (!resultText) throw new Error("Groq returned an empty response.");
    const cleanedText = resultText.replace(/\`\`\`json\\s*/gi, "").replace(/\`\`\`\\s*/g, "").trim();
    return JSON.parse(cleanedText);
  }
}
```

### C2. `dischargeService.ts`

```typescript
import { db, medicines, doseLogs, dischargePlans, users, patients, eq, and, desc } from "@workspace/db";
import { logger } from "../lib/logger";
import { MedicineService } from "./medicineService";

export interface DischargeMedication {
  name: string;
  dosage: string;
  frequency: string;
  duration: number;
  instructions?: string;
}

export interface DischargePlanData {
  patientName: string;
  hospitalName?: string;
  medicines: DischargeMedication[];
  instructions?: string;
  followUpDate?: string;
}

export class DischargeService {
  private static mapFrequencyToAnchors(frequency: string): string[] {
    const f = frequency.toLowerCase();
    if (f.includes("od") || f.includes("once") || f.includes("daily")) return ["morning"];
    if (f.includes("bid") || f.includes("twice") || f.includes("bd")) return ["morning", "evening"];
    if (f.includes("tid") || f.includes("thrice") || f.includes("three")) return ["morning", "afternoon", "evening"];
    if (f.includes("qid") || f.includes("four")) return ["morning", "afternoon", "evening", "night"];
    return ["morning"];
  }

  static async normalizePlan(userId: string, rawData: DischargePlanData) {
    if (!rawData) throw new Error("No plan data provided for normalization");
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    const anchors: any = user?.anchorTimes || { morning: "08:00", afternoon: "14:00", evening: "20:00", night: "22:00" };
    const actualData = (rawData as any).data || rawData;
    logger.info({ userId, inputMeds: actualData.medicines?.length || 0 }, "Normalizing discharge plan.");
    const normalizedMeds = (actualData.medicines || []).map((m: any) => {
      const anchorKeys = this.mapFrequencyToAnchors(m.frequency);
      const times = anchorKeys.map(key => anchors[key] || "08:00");
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(startDate.getDate() + (m.duration || 7));
      return { name: m.name, dosage: m.dosage, frequency: m.frequency, times, instructions: m.instructions, startDate, endDate, color: "#6C47FF" };
    });
    return { ...rawData, normalizedMeds };
  }

  static async importPlan(userId: string, planId: string, mode: "merge" | "replace") {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new Error("User not found");
    const [plan] = await db.select().from(dischargePlans).where(eq(dischargePlans.id, planId));
    if (!plan) throw new Error("Plan not found");
    if (plan.isUsed) throw new Error("This discharge plan has already been imported.");
    if (plan.expiresAt && new Date() > new Date(plan.expiresAt)) throw new Error("This discharge plan has expired.");
    const patientId = plan.patientId;
    const planData = plan.data as unknown as DischargePlanData;
    if (user.linkedPatientId !== patientId) {
      await db.update(users).set({ linkedPatientId: patientId }).where(eq(users.id, userId));
    }
    if (mode === "replace") {
      await db.update(medicines).set({ status: "archived" }).where(and(eq(medicines.patientId, patientId), eq(medicines.status, "active")));
      await db.update(dischargePlans).set({ isActive: false }).where(eq(dischargePlans.patientId, patientId));
    }
    const { normalizedMeds } = await this.normalizePlan(userId, planData);
    const createdMeds = [];
    for (const med of normalizedMeds) {
      const created = await MedicineService.addMedicine(patientId, { ...med, planId: plan.id });
      createdMeds.push(created);
    }
    await db.update(dischargePlans).set({ isUsed: true, isActive: true }).where(eq(dischargePlans.id, plan.id));
    const { NotificationService } = require("./notificationService");
    await NotificationService.sendPlanImportedNotification(patientId, plan.id).catch((e: any) => {
      logger.error({ err: e }, "Failed to notify caregiver about plan import");
    });
    return { success: true, medicinesImported: createdMeds.length };
  }

  static async createPlan(patientId: string, data: DischargePlanData) {
    const existing = await db.select().from(dischargePlans).where(eq(dischargePlans.patientId, patientId)).orderBy(desc(dischargePlans.version)).limit(1);
    const nextVersion = existing.length > 0 ? existing[0].version + 1 : 1;
    const [newPlan] = await db.insert(dischargePlans).values({
      patientId, hospitalName: data.hospitalName || "General Hospital", data: data as any,
      version: nextVersion, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    }).returning();
    return newPlan;
  }
}
```

### C3. `languageSimplifierService.ts`

```typescript
import { db, medicalTermsDictionary } from "@workspace/db";
import { eq } from "drizzle-orm";

export type SimplifiedResult = {
  original: string;
  simplified: string;
  replacements: { term: string; meaning: string }[];
  aiUnavailable?: boolean;
};

export class LanguageSimplifierService {
  static async lookupAbbreviation(term: string): Promise<string | null> {
    const upperTerm = term.toUpperCase();
    const [result] = await db.select().from(medicalTermsDictionary).where(eq(medicalTermsDictionary.abbreviation, upperTerm));
    return result ? result.simpleMeaning : null;
  }

  static async simplifyWithAI(text: string): Promise<string> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === "your_anthropic_api_key_here") throw new Error("Anthropic API key is not configured");
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20240620", max_tokens: 1024,
        system: "You are a medical language simplifier for patients. Convert the given medical instruction into simple, clear English that a non-medical person can understand. Keep it under 2 sentences. Do not add warnings. Only simplify.",
        messages: [{ role: "user", content: text }],
      }),
    });
    if (!response.ok) throw new Error(\`AI API Error: \${response.status} \${response.statusText}\`);
    const json = await response.json() as { content: { text: string }[] };
    return json.content[0].text;
  }

  static async simplifyInstruction(rawText: string): Promise<SimplifiedResult> {
    const words = rawText.split(/[\s,]+/);
    const replacements: { term: string; meaning: string }[] = [];
    let preProcessedText = rawText;
    for (const word of words) {
      const cleanWord = word.replace(/[^a-zA-Z]/g, "");
      if (cleanWord.length > 0) {
        const meaning = await this.lookupAbbreviation(cleanWord);
        if (meaning) {
          if (!replacements.find(r => r.term === cleanWord.toUpperCase())) replacements.push({ term: cleanWord.toUpperCase(), meaning });
          const regex = new RegExp(\`\\\\b\${cleanWord}\\\\b\`, "gi");
          preProcessedText = preProcessedText.replace(regex, meaning);
        }
      }
    }
    let simplified = preProcessedText;
    let aiUnavailable = false;
    try { simplified = await this.simplifyWithAI(preProcessedText); } catch { aiUnavailable = true; }
    return { original: rawText, simplified, replacements, aiUnavailable };
  }
}
```

### C4. `medicalParser.ts`

```typescript
export interface ParsedSchedule { morning: boolean; afternoon: boolean; night: boolean; }

export interface ParsedMedicine {
  name: string; dosage: string; frequency: string; frequency_code: string; duration: string;
  timing: string; schedule: ParsedSchedule; times: string[]; isDefaultTime: boolean;
  notes: string; confidence: number; low_confidence: boolean;
}

const FREQUENCY_MAP: Record<string, { label: string; schedule: ParsedSchedule }> = {
  "OD": { label: "once daily", schedule: { morning: true, afternoon: false, night: false } },
  "QD": { label: "once daily", schedule: { morning: true, afternoon: false, night: false } },
  "BD": { label: "twice daily", schedule: { morning: true, afternoon: false, night: true } },
  "BID": { label: "twice daily", schedule: { morning: true, afternoon: false, night: true } },
  "TDS": { label: "three times daily", schedule: { morning: true, afternoon: true, night: true } },
  "TID": { label: "three times daily", schedule: { morning: true, afternoon: true, night: true } },
  "QID": { label: "four times daily", schedule: { morning: true, afternoon: true, night: true } },
  "SOS": { label: "as needed (SOS)", schedule: { morning: false, afternoon: false, night: false } },
  "PRN": { label: "as needed", schedule: { morning: false, afternoon: false, night: false } },
  "HS": { label: "at bedtime", schedule: { morning: false, afternoon: false, night: true } },
  "STAT": { label: "immediately", schedule: { morning: true, afternoon: false, night: false } },
  "QOD": { label: "every other day", schedule: { morning: true, afternoon: false, night: false } },
  "Q4H": { label: "every 4 hours", schedule: { morning: true, afternoon: true, night: true } },
  "Q6H": { label: "every 6 hours", schedule: { morning: true, afternoon: true, night: true } },
  "Q8H": { label: "every 8 hours", schedule: { morning: true, afternoon: false, night: true } },
  "Q12H": { label: "every 12 hours", schedule: { morning: true, afternoon: false, night: true } },
  "QWK": { label: "weekly", schedule: { morning: true, afternoon: false, night: false } },
  "BIW": { label: "twice a week", schedule: { morning: true, afternoon: false, night: false } },
  "WEEKLY": { label: "weekly", schedule: { morning: true, afternoon: false, night: false } },
  "ONCE A WEEK": { label: "weekly", schedule: { morning: true, afternoon: false, night: false } },
  "TWICE A WEEK": { label: "twice a week", schedule: { morning: true, afternoon: false, night: false } },
  "DAILY": { label: "once daily", schedule: { morning: true, afternoon: false, night: false } },
  "EVERY DAY": { label: "daily", schedule: { morning: true, afternoon: false, night: false } },
  "ONCE DAILY": { label: "once daily", schedule: { morning: true, afternoon: false, night: false } },
  "TWICE DAILY": { label: "twice daily", schedule: { morning: true, afternoon: false, night: true } },
  "THRICE DAILY": { label: "three times daily", schedule: { morning: true, afternoon: true, night: true } },
};

const TIMING_MAP: Record<string, string> = {
  "AC": "before food", "PC": "after food", "CC": "with food", "AM": "in the morning",
  "PM": "in the evening", "HS": "at bedtime", "EMPTY STOMACH": "on empty stomach",
  "WITH FOOD": "with food", "BEFORE FOOD": "before food", "AFTER FOOD": "after food",
  "BEFORE MEALS": "before meals", "AFTER MEALS": "after meals",
};

const DOSE_PATTERN_REGEX = /^([01])\s*[-]\s*([01])\s*[-]\s*([01])$/;

function parseDosePattern(pattern: string): ParsedSchedule | null {
  const match = pattern.trim().match(DOSE_PATTERN_REGEX);
  if (!match) return null;
  return { morning: match[1] === "1", afternoon: match[2] === "1", night: match[3] === "1" };
}

function dosePatternToFrequency(pattern: string): string {
  const schedule = parseDosePattern(pattern);
  if (!schedule) return pattern;
  const parts: string[] = [];
  if (schedule.morning) parts.push("morning");
  if (schedule.afternoon) parts.push("afternoon");
  if (schedule.night) parts.push("night");
  if (parts.length === 0) return "as needed";
  if (parts.length === 3) return "three times daily (morning, afternoon, night)";
  if (parts.length === 2) return \`twice daily (\${parts.join(" and ")})\`;
  return \`once daily (\${parts[0]})\`;
}

const DURATION_PATTERNS = [/(\d+)\s*days?/i, /(\d+)\s*weeks?/i, /(\d+)\s*months?/i, /x\s*(\d+)\s*d/i, /for\s*(\d+)\s*d/i];

function extractDuration(text: string): string {
  for (const pattern of DURATION_PATTERNS) { const match = text.match(pattern); if (match) return match[0].trim(); }
  return "";
}

const DOSAGE_PATTERNS = [/\d+\.?\d*\s*(?:mg|mcg|g|ml|IU|units?|tab(?:let)?s?|cap(?:sule)?s?|drops?|puffs?)/i, /\d+\s*\/\s*\d+/i];

function extractDosage(text: string): string {
  for (const pattern of DOSAGE_PATTERNS) { const match = text.match(pattern); if (match) return match[0].trim(); }
  return "";
}

function matchFrequency(text: string): { label: string; code: string; schedule: ParsedSchedule } | null {
  const upper = text.toUpperCase().trim();
  const doseSchedule = parseDosePattern(upper);
  if (doseSchedule) return { label: dosePatternToFrequency(upper), code: upper, schedule: doseSchedule };
  const sortedKeys = Object.keys(FREQUENCY_MAP).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    const regex = new RegExp(\`\\\\b\${key.replace(/[.*+?^\${}()|[\]\\\\]/g, '\\\\$&')}\\\\b\`, "i");
    if (regex.test(upper)) { const entry = FREQUENCY_MAP[key]!; return { label: entry.label, code: key, schedule: entry.schedule }; }
  }
  return null;
}

function matchTiming(text: string): string {
  const upper = text.toUpperCase().trim();
  const sortedKeys = Object.keys(TIMING_MAP).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) { if (upper.includes(key)) return TIMING_MAP[key]!; }
  return "";
}

export function parseRawPrescriptionText(rawText: string, lineConfidences?: { text: string; confidence: number }[]) {
  const parsedFrequencies: Record<string, { label: string; code: string; schedule: ParsedSchedule }> = {};
  const parsedTimings: Record<string, string> = {};
  const parsedDurations: Record<string, string> = {};
  const lines = rawText.split("\n").filter(l => l.trim().length > 0);
  for (const line of lines) {
    const freq = matchFrequency(line);
    if (freq) parsedFrequencies[line] = freq;
    const timing = matchTiming(line);
    if (timing) parsedTimings[line] = timing;
    const duration = extractDuration(line);
    if (duration) parsedDurations[line] = duration;
  }
  return { parsedFrequencies, parsedTimings, parsedDurations };
}

function extractTimesFromText(text: string): string[] {
  const times: string[] = [];
  const clean = text.toUpperCase();
  const regex12 = /\b(1[0-2]|0?[1-9])(?:[:.]([0-5]\d))?\s*(AM|PM)\b/gi;
  let match;
  while ((match = regex12.exec(clean)) !== null) {
    let hour = parseInt(match[1]); const minute = match[2] ? parseInt(match[2]) : 0; const ampm = match[3];
    if (ampm === "PM" && hour < 12) hour += 12; else if (ampm === "AM" && hour === 12) hour = 0;
    times.push(\`\${String(hour).padStart(2, "0")}:\${String(minute).padStart(2, "0")}\`);
  }
  const regex24 = /\b([0-1]?\d|2[0-3])[:.]([0-5]\d)\b/g;
  while ((match = regex24.exec(clean)) !== null) {
    const hour = parseInt(match[1]); const minute = parseInt(match[2]);
    const formatted = \`\${String(hour).padStart(2, "0")}:\${String(minute).padStart(2, "0")}\`;
    if (!times.includes(formatted)) times.push(formatted);
  }
  return times;
}

export function enrichWithRuleParsing(medicines: Array<{ name: string; dosage: string; frequency: string; duration: string; timing: string; notes: string; confidence: number; times?: string[] }>): ParsedMedicine[] {
  return medicines.map(med => {
    const freq = matchFrequency(med.frequency) || matchFrequency(med.notes);
    let schedule: ParsedSchedule;
    if (freq) { schedule = freq.schedule; } else {
      const lower = med.frequency.toLowerCase();
      schedule = { morning: lower.includes("morning") || lower.includes("once") || lower.includes("daily"), afternoon: lower.includes("afternoon") || lower.includes("three") || lower.includes("thrice"), night: lower.includes("night") || lower.includes("bedtime") || lower.includes("twice") || lower.includes("three") };
    }
    const timing = matchTiming(med.timing) || matchTiming(med.notes) || med.timing;
    let times: string[] = [];
    if (Array.isArray(med.times) && med.times.length > 0) {
      times = med.times.map(t => { const match = t.trim().match(/\b([0-1]?\d|2[0-3])[:.]([0-5]\d)\b/); if (match) return \`\${String(match[1]).padStart(2, "0")}:\${String(match[2]).padStart(2, "0")}\`; const hourOnlyMatch = t.trim().match(/^\b([0-1]?\d|2[0-3])\b$/); if (hourOnlyMatch) return \`\${String(hourOnlyMatch[1]).padStart(2, "0")}:00\`; return t; }).filter(t => /^\d{2}:\d{2}$/.test(t));
    }
    if (times.length === 0) { const textToScan = \`\${med.timing || ""} \${med.notes || ""} \${med.frequency || ""}\`; times = extractTimesFromText(textToScan); }
    if (times.length > 0) times.sort();
    let isDefaultTime = false;
    if (times.length === 0) {
      if (schedule.morning) times.push("08:00");
      if (schedule.afternoon) times.push("14:00");
      if (schedule.night) times.push("20:00");
      if (times.length === 0) { times.push("08:00"); isDefaultTime = true; } else isDefaultTime = true;
    }
    return { name: med.name, dosage: med.dosage, frequency: freq?.label || med.frequency, frequency_code: freq?.code || "", duration: med.duration || "", timing, schedule, times, isDefaultTime, notes: med.notes, confidence: med.confidence, low_confidence: med.confidence < 70 };
  });
}
```

### C5. `ocrClient.ts`

```typescript
export interface OCRWord { text: string; confidence: number; source: string; refined: boolean; bbox: number[]; }
export interface OCRLine { text: string; confidence: number; low_confidence: boolean; words: OCRWord[]; }
export interface QualityIssue { code: string; severity: string; message: string; score: number; }
export interface QualityReport { is_usable: boolean; overall_score: number; issues: QualityIssue[]; guidance: string; needs_preprocessing: boolean; details: Record<string, unknown>; }
export interface OCRAnalysisResult { success: boolean; extracted_text: string; lines: OCRLine[]; overall_confidence: number; word_count: number; low_confidence_words: number; ocr_source: string; quality: QualityReport; processing_time_ms: number; error?: string; }

const OCR_SERVICE_URL = process.env.OCR_SERVICE_URL || "http://localhost:8100";
const OCR_TIMEOUT_MS = 120_000;
const MAX_RETRIES = 2;

export async function isOCRServiceHealthy(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(\`\${OCR_SERVICE_URL}/health\`, { signal: controller.signal });
    clearTimeout(timeoutId);
    return res.ok;
  } catch { return false; }
}

export async function analyzeWithOCR(imageBase64: string, options?: { refineWithTrOCR?: boolean; skipQualityCheck?: boolean }): Promise<OCRAnalysisResult | null> {
  const body = { image_base64: imageBase64, refine_with_trocr: options?.refineWithTrOCR ?? true, skip_quality_check: options?.skipQualityCheck ?? false };
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), OCR_TIMEOUT_MS);
      console.log(\`[OCR Client] Attempt \${attempt + 1}/\${MAX_RETRIES + 1} — sending to \${OCR_SERVICE_URL}/analyze\`);
      const response = await fetch(\`\${OCR_SERVICE_URL}/analyze\`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        const errorBody = await response.text();
        console.error(\`[OCR Client] Service returned \${response.status}: \${errorBody}\`);
        if (response.status >= 400 && response.status < 500) { const parsed = JSON.parse(errorBody).detail; throw new Error(parsed?.error || \`OCR service error: \${response.status}\`); }
        lastError = new Error(\`OCR service error: \${response.status}\`); continue;
      }
      const result = (await response.json()) as OCRAnalysisResult;
      console.log(\`[OCR Client] Success: \${result.word_count} words, confidence=\${result.overall_confidence}, time=\${result.processing_time_ms}ms, source=\${result.ocr_source}\`);
      return result;
    } catch (err: any) {
      if (err.name === "AbortError") { console.error("[OCR Client] Request timed out"); lastError = new Error("OCR service request timed out"); }
      else if (err.message?.includes("ECONNREFUSED") || err.cause?.code === "ECONNREFUSED") { console.warn("[OCR Client] OCR service is not running — will fall back to Gemini"); return null; }
      else { lastError = err; console.error(\`[OCR Client] Error: \${err.message}\`); }
    }
    if (attempt < MAX_RETRIES) { const delay = 1000 * (attempt + 1); console.log(\`[OCR Client] Retrying in \${delay}ms...\`); await new Promise(resolve => setTimeout(resolve, delay)); }
  }
  console.error(\`[OCR Client] All \${MAX_RETRIES + 1} attempts failed. Last error: \${lastError?.message}\`);
  return null;
}
```

### C6. `emergencyService.ts`

```typescript
import { db, emergencyAlerts, users, patients, careLinks, eq, and, inArray, desc } from "@workspace/db";
import { sendPushNotification } from "./notificationService";
import { logger } from "../lib/logger";

export class EmergencyService {
  static async logEmergency(userId: string) {
    const [alert] = await db.insert(emergencyAlerts).values({ userId, status: "active" }).returning();
    this.notifyManagers(userId).catch((err) => logger.error({ err, userId }, "Emergency notification failed"));
    return alert;
  }

  private static async notifyManagers(triggeringUserId: string) {
    const [actor] = await db.select().from(users).where(eq(users.id, triggeringUserId));
    if (!actor) return;
    const patientContextId = actor.linkedPatientId;
    if (!patientContextId) { logger.warn({ userId: triggeringUserId }, "Emergency: user has no linked patient; no managers to notify"); return; }
    const managerIds = new Set<string>();
    const links = await db.select({ managerId: careLinks.managerId }).from(careLinks).where(and(eq(careLinks.patientId, patientContextId), eq(careLinks.status, "active")));
    for (const l of links) managerIds.add(l.managerId);
    const [patientRecord] = await db.select({ caregiverId: patients.caregiverId }).from(patients).where(eq(patients.id, patientContextId));
    if (patientRecord?.caregiverId) managerIds.add(patientRecord.caregiverId);
    const legacy = await db.select({ id: users.id }).from(users).where(and(eq(users.linkedPatientId, patientContextId), inArray(users.role, ["caregiver", "family"])));
    for (const m of legacy) managerIds.add(m.id);
    managerIds.delete(triggeringUserId);
    if (managerIds.size === 0) { logger.warn({ patientContextId }, "Emergency: no linked managers to notify"); return; }
    const managers = await db.select({ id: users.id, pushToken: users.pushToken }).from(users).where(inArray(users.id, [...managerIds]));
    const title = "Emergency Alert";
    const body = \`\${actor.name} triggered an emergency alert. Please check on them immediately.\`;
    await Promise.all(managers.filter((m) => !!m.pushToken).map((m) => sendPushNotification(m.pushToken!, { title, body, data: { type: "emergency", patientUserId: triggeringUserId, patientContextId } }).catch((err) => logger.error({ err, managerId: m.id }, "Emergency push to manager failed"))));
    logger.info({ patientContextId, notified: managers.length }, "Emergency alert dispatched to managers");
  }

  static async getEmergencies(userId: string) {
    return await db.select().from(emergencyAlerts).where(eq(emergencyAlerts.userId, userId)).orderBy(desc(emergencyAlerts.timestamp));
  }
}
```

### C7. `recoveryService.ts`

```typescript
import { db, recoveryLogs } from "@workspace/db";
import { eq, and, asc, desc, sql } from "drizzle-orm";

export class RecoveryService {
  static async upsertRecoveryLog(userId: string, data: { logDate: string; painLevel?: number; energyLevel?: number; fever?: boolean; feverTemp?: number; notes?: string }) {
    const [log] = await db.insert(recoveryLogs).values({
      userId, logDate: data.logDate, painLevel: data.painLevel, energyLevel: data.energyLevel,
      fever: data.fever ?? false, feverTemp: data.feverTemp ? data.feverTemp.toString() : undefined, notes: data.notes,
    }).onConflictDoUpdate({
      target: [recoveryLogs.userId, recoveryLogs.logDate],
      set: { painLevel: data.painLevel, energyLevel: data.energyLevel, fever: data.fever ?? false, feverTemp: data.feverTemp ? data.feverTemp.toString() : undefined, notes: data.notes },
    }).returning();
    return log;
  }

  static async getRecoveryLogs(userId: string, days: number = 30) {
    return await db.select().from(recoveryLogs).where(and(eq(recoveryLogs.userId, userId), sql\`\${recoveryLogs.logDate} >= CURRENT_DATE - (\${days} * interval '1 day')\`)).orderBy(asc(recoveryLogs.logDate));
  }

  static async getRecoveryTrends(userId: string) {
    const logs = await this.getRecoveryLogs(userId, 14);
    if (logs.length === 0) return { avgPain: 0, avgEnergy: 0, feverDays: 0, trend: "stable" as const, logs: [] };
    let totalPain = 0, painCount = 0, totalEnergy = 0, energyCount = 0, feverDays = 0;
    for (const log of logs) {
      if (log.painLevel !== null) { totalPain += log.painLevel; painCount++; }
      if (log.energyLevel !== null) { totalEnergy += log.energyLevel; energyCount++; }
      if (log.fever) feverDays++;
    }
    const avgPain = painCount > 0 ? totalPain / painCount : 0;
    const avgEnergy = energyCount > 0 ? totalEnergy / energyCount : 0;
    let trend: "improving" | "stable" | "worsening" = "stable";
    if (logs.length >= 4) {
      const mid = Math.floor(logs.length / 2);
      const firstHalf = logs.slice(0, mid);
      const secondHalf = logs.slice(mid);
      let p1 = 0, c1 = 0, p2 = 0, c2 = 0;
      firstHalf.forEach(l => { if (l.painLevel !== null) { p1 += l.painLevel; c1++; } });
      secondHalf.forEach(l => { if (l.painLevel !== null) { p2 += l.painLevel; c2++; } });
      const a1 = c1 > 0 ? p1 / c1 : 0;
      const a2 = c2 > 0 ? p2 / c2 : 0;
      if (a2 < a1 - 1) trend = "improving";
      else if (a2 > a1 + 1) trend = "worsening";
    }
    return { avgPain, avgEnergy, feverDays, trend, logs };
  }

  static async detectAlerts(userId: string) {
    const logs = await this.getRecoveryLogs(userId, 3);
    const alerts: string[] = [];
    if (logs.length >= 2) {
      const latest = logs.slice(-2);
      if (latest.every(l => l.painLevel !== null && l.painLevel >= 8)) alerts.push("High pain levels detected for consecutive days.");
    }
    if (logs.length >= 3) {
      const latest = logs.slice(-3);
      if (latest.every(l => l.fever)) alerts.push("Persistent fever detected for 3 or more days.");
      if (latest.every(l => l.energyLevel !== null && l.energyLevel <= 2)) alerts.push("Extremely low energy detected for 3 or more days.");
    }
    return { alerts };
  }
}
```

### C8. `followupService.ts`

```typescript
import { db, followups } from "@workspace/db";
import { eq, and, asc, sql } from "drizzle-orm";

export class FollowupService {
  static async createFollowup(userId: string, data: { type: string; title: string; scheduledDate: Date; reminderDaysBefore?: number; notes?: string }) {
    const [followup] = await db.insert(followups).values({
      userId, type: data.type, title: data.title, scheduledDate: data.scheduledDate,
      reminderDaysBefore: data.reminderDaysBefore ?? 1, notes: data.notes,
    }).returning();
    return followup;
  }

  static async getFollowups(userId: string, statusFilter?: "upcoming" | "completed" | "missed") {
    const conditions = [eq(followups.userId, userId)];
    if (statusFilter) conditions.push(eq(followups.status, statusFilter));
    return await db.select().from(followups).where(and(...conditions)).orderBy(asc(followups.scheduledDate));
  }

  static async updateFollowupStatus(followupId: string, userId: string, status: "completed" | "missed") {
    const [updated] = await db.update(followups).set({ status }).where(and(eq(followups.id, followupId), eq(followups.userId, userId))).returning();
    if (!updated) throw new Error("Followup not found or unauthorized");
    return updated;
  }

  static async deleteFollowup(followupId: string, userId: string) {
    const [deleted] = await db.delete(followups).where(and(eq(followups.id, followupId), eq(followups.userId, userId))).returning();
    if (!deleted) throw new Error("Followup not found or unauthorized");
    return true;
  }

  static async getDueReminders() {
    return await db.select().from(followups).where(and(eq(followups.status, "upcoming"), sql\`\${followups.scheduledDate} > NOW()\`, sql\`\${followups.scheduledDate} - (\${followups.reminderDaysBefore} * interval '1 day') <= NOW()\`));
  }
}
```

### C9. `doseTrackingService.ts`

```typescript
import { db, doseLogs, medicines } from "@workspace/db";
import { eq, and, lt } from "drizzle-orm";

export class DoseTrackingService {
  static async getAdherenceStats(patientId: string) {
    const patientMeds = await db.select().from(medicines).where(eq(medicines.patientId, patientId));
    if (patientMeds.length === 0) return { total: 0, taken: 0, missed: 0, pending: 0, snoozed: 0, adherencePercent: 0 };
    const medIds = patientMeds.map(m => m.id);
    const allLogs = [];
    for (const medId of medIds) { const logs = await db.select().from(doseLogs).where(eq(doseLogs.medicineId, medId)); allLogs.push(...logs); }
    const total = allLogs.length;
    let taken = 0, missed = 0, pending = 0, snoozed = 0;
    for (const log of allLogs) { switch (log.status) { case "taken": taken++; break; case "missed": missed++; break; case "pending": pending++; break; case "snoozed": snoozed++; break; } }
    const adherencePercent = total > 0 ? Math.round((taken / total) * 100) : 0;
    return { total, taken, missed, pending, snoozed, adherencePercent };
  }

  static async markMissedDoses(patientId: string) {
    const patientMeds = await db.select().from(medicines).where(eq(medicines.patientId, patientId));
    if (patientMeds.length === 0) return 0;
    const today = new Date().toISOString().split("T")[0];
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    let markedCount = 0;
    for (const med of patientMeds) {
      const pendingLogs = await db.select().from(doseLogs).where(and(eq(doseLogs.medicineId, med.id), eq(doseLogs.date, today), eq(doseLogs.status, "pending")));
      for (const log of pendingLogs) {
        const [schedHour, schedMin] = log.scheduledTime.split(":").map(Number);
        const scheduledMinutes = schedHour * 60 + schedMin;
        const currentTotalMinutes = currentHours * 60 + currentMinutes;
        if (currentTotalMinutes - scheduledMinutes > 120) { await db.update(doseLogs).set({ status: "missed" }).where(eq(doseLogs.id, log.id)); markedCount++; }
      }
    }
    return markedCount;
  }
}
```

### C10. `activityService.ts`

```typescript
import { db, symptomLogs, journalEntries } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

export class ActivityService {
  static async getSymptoms(patientId: string) {
    return await db.select().from(symptomLogs).where(eq(symptomLogs.patientId, patientId)).orderBy(desc(symptomLogs.date));
  }

  static async addSymptom(patientId: string, data: { symptoms: string[], severity: number, notes?: string, riskLevel?: "low" | "medium" | "high" }) {
    const [created] = await db.insert(symptomLogs).values({ patientId, symptoms: data.symptoms || [], severity: data.severity || 1, notes: data.notes || "", riskLevel: data.riskLevel || "low" }).returning();
    return created;
  }

  static async getJournals(userId: string) {
    return await db.select().from(journalEntries).where(eq(journalEntries.userId, userId)).orderBy(desc(journalEntries.date));
  }

  static async addJournal(userId: string, data: { mood: number, energy: number, text: string }) {
    const [created] = await db.insert(journalEntries).values({ userId, mood: data.mood || 5, energy: data.energy || 5, text: data.text || "" }).returning();
    return created;
  }
}
```

### C11. `storageService.ts`

```typescript
import { db, users, prescriptions } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

export class StorageService {
  static async savePrescription(userId: string, data: { imageUrl?: string; rawText?: string; extractedData?: unknown }) {
    const [prescription] = await db.insert(prescriptions).values({ userId, imageUrl: data.imageUrl, rawText: data.rawText, extractedData: data.extractedData }).returning();
    return prescription;
  }

  static async getUserPrescriptions(userId: string) {
    return await db.select().from(prescriptions).where(eq(prescriptions.userId, userId)).orderBy(desc(prescriptions.createdAt));
  }

  static async getUserProfile(userId: string) {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new Error("User not found");
    return user;
  }
}
```
