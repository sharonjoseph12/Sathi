# 14_backend_implementation.md — SATHI Complete Backend Implementation Source

Extracted verbatim from `artifacts/api-server/` source. All code is ready to copy-paste.

---

## 1. Entry Point (`src/index.ts`)

```typescript
import "./env";
import app from "./app";
import { logger } from "./lib/logger";
import { ensureSchema } from "./ensureSchema";

import { NotificationService } from "./services/notificationService";
import { VoiceScheduleService } from "./services/voiceScheduleService";

NotificationService.init();
VoiceScheduleService.init();
ensureSchema();

const rawPort = process.env["PORT"];
if (!rawPort) throw new Error("PORT environment variable is required");
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT value: "${rawPort}"`);

const server = app.listen(port, "0.0.0.0", () => {
  logger.info({ port }, "Server listening on 0.0.0.0");
});

const shutdown = () => {
  logger.info("Gracefully shutting down server...");
  server.close(() => { logger.info("Server closed."); process.exit(0); });
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
process.on("uncaughtException", (err) => { logger.error({ err }, "Uncaught Exception"); process.exit(1); });
process.on("unhandledRejection", (reason, promise) => { logger.error({ reason, promise }, "Unhandled Rejection"); });
setInterval(() => {}, 1000 * 60 * 60);
```

## 2. Express App (`src/app.ts`)

```typescript
import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(pinoHttp({
  logger,
  serializers: {
    req(req) { return { id: req.id, method: req.method, url: req.url?.split("?")[0] }; },
    res(res) { return { statusCode: res.statusCode }; },
  },
}));
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.get("/", (req, res) => res.send("OK"));
app.use("/api", router);

export default app;
```

## 3. Env Loader (`src/env.ts`)

```typescript
import path from "path";
import { config } from "dotenv";
config({ path: path.join(process.cwd(), "../../.env") });
```

## 4. Logger (`src/lib/logger.ts`)

```typescript
import pino from "pino";
const isProduction = process.env.NODE_ENV === "production";
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: ["req.headers.authorization", "req.headers.cookie", "res.headers['set-cookie']"],
  ...(isProduction ? {} : { transport: { target: "pino-pretty", options: { colorize: true } } }),
});
```

## 5. JWT Auth Middleware (`src/middlewares/auth.ts`)

```typescript
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db, users } from "@workspace/db";
import { eq } from "drizzle-orm";

export interface AuthRequest extends Request {
  user?: typeof users.$inferSelect;
}

export const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return next();
  const token = authHeader.split(" ")[1];
  if (!token) return next();
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { sub: string };
    const [user] = await db.select().from(users).where(eq(users.id, decoded.sub));
    if (user) req.user = user;
  } catch {}
  return next();
};

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid authorization header" });
    return;
  }
  const token = authHeader.split(" ")[1];
  if (!token) { res.status(401).json({ error: "Missing token" }); return; }
  try {
    let user;
    const isDemoToken = token === "demo_token_123" || token.startsWith("demo_");
    if (isDemoToken) {
      const [demoUser] = await db.select().from(users).where(eq(users.email, "tester@dev.com"));
      if (demoUser) { user = demoUser; }
      else {
        const [firstUser] = await db.select().from(users).limit(1);
        user = firstUser;
      }
      if (!user) {
        user = { id: "00000000-0000-0000-0000-000000000000", name: "Demo Patient", email: "demo@example.com", role: "patient", linkedPatientId: "00000000-0000-0000-0000-000000000000", isEmailVerified: true } as any;
      }
    } else {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { sub: string };
      const [dbUser] = await db.select().from(users).where(eq(users.id, decoded.sub));
      user = dbUser;
    }
    if (!user) { res.status(401).json({ error: "User not found" }); return; }
    if (!user.isEmailVerified) {
      res.status(403).json({ error: "EMAIL_NOT_VERIFIED", message: "Please verify your email address to access this resource." });
      return;
    }
    req.user = user;
    return next();
  } catch (err) { res.status(401).json({ error: "Invalid token" }); }
};
```

## 6. Routes Index (`src/routes/index.ts`)

```typescript
import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import medicinesRouter from "./medicines";
import activityRouter from "./activity";
import emergencyRouter from "./emergency";
import ocrRouter from "./ocr";
import caregiverRouter from "./caregiver";
import doseTrackingRouter from "./doseTracking";
import followupRouter from "./followup";
import languageSimplifierRouter from "./languageSimplifier";
import recoveryRouter from "./recovery";
import storageRouter from "./storage";
import supportRouter from "./support";
import dischargeRouter from "./discharge";
import aiRouter from "./ai";
import familyRouter from "./family";
import linksRouter from "./links";
import voiceNotesRouter from "./voiceNotes";
import chatRouter from "./chat";

const router: IRouter = Router();
router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/medicines", medicinesRouter);
router.use("/activity", activityRouter);
router.use("/emergency", emergencyRouter);
router.use("/ocr", ocrRouter);
router.use("/caregiver", caregiverRouter);
router.use("/dose-tracking", doseTrackingRouter);
router.use("/followups", followupRouter);
router.use("/language", languageSimplifierRouter);
router.use("/recovery", recoveryRouter);
router.use("/storage", storageRouter);
router.use("/support", supportRouter);
router.use("/discharge", dischargeRouter);
router.use("/ai", aiRouter);
router.use("/family", familyRouter);
router.use("/links", linksRouter);
router.use("/voice-notes", voiceNotesRouter);
router.use("/chat", chatRouter);
export default router;
```

## 7. Auth Routes (`src/routes/auth.ts`)

Full implementation at `SATHI_BLUEPRINT/15_auth_routes_full.md` due to length (954 lines). Key endpoints:
- `POST /api/auth/register` - Create user + patient + linkCode, hash password with bcrypt
- `POST /api/auth/login` - Verify credentials, check email verification, return JWT (7d expiry)
- `POST /api/auth/verify-email` - Verify 6-digit OTP code (15 min expiry)
- `POST /api/auth/resend-verification` - Generate new OTP, send via SMTP or console
- `POST /api/auth/forgot-password` - Generate reset OTP, send via email
- `POST /api/auth/reset-password` - Verify OTP, set new bcrypt hash
- `GET /api/auth/me` - Return current user (requireAuth)
- `POST /api/auth/push-token` - Register Expo push token
- `PUT /api/auth/profile` - Update user + patient profile fields
- `POST /api/auth/change-password` - Verify old password, set new
- `POST /api/auth/sos-notify-family` - Send SOS email to linked caregivers
- `GET /api/auth/dev-session` - Create/return dev user with seeded medicines + dose logs
- `POST /api/auth/dev-login` - Dev credentials login

## 8. Chat Routes (`src/routes/chat.ts`)

Full implementation at `SATHI_BLUEPRINT/16_chat_routes_full.md` due to length (369 lines). Key:
- SSE connection registry: `Map<string, Set<Response>>`
- Heartbeat every 25 seconds: `res.write(": ping\n\n")`
- `GET /api/chat/stream` — SSE endpoint
- `POST /api/chat/send` — Insert message, push to live clients or FCM fallback
- `GET /api/chat/history/:patientContextId` — Message history with optional `?withUserId=`
- `GET /api/chat/conversations` — Resolve participants from care_links

## 9. Medicine Routes (`src/routes/medicines.ts`)

```typescript
import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { MedicineController } from "../controllers/medicineController";
const router = Router();
router.use(requireAuth);

router.get("/", MedicineController.getMedicines);
router.post("/", MedicineController.addMedicine);
router.get("/doses/today", MedicineController.getTodayDoses);
router.put("/doses/:id/status", MedicineController.updateDoseStatus);
router.put("/:id", MedicineController.updateMedicine);
router.get("/adherence/history", MedicineController.getAdherenceHistory);
router.delete("/:id", MedicineController.deleteMedicine);

export default router;
```

## 10. Medicine Controller (`src/controllers/medicineController.ts`)

```typescript
import type { Response } from "express";
import type { AuthRequest } from "../middlewares/auth";
import { MedicineService } from "../services/medicineService";

export class MedicineController {
  static async getMedicines(req: AuthRequest, res: Response) {
    if (!req.user?.linkedPatientId) return res.json({ medicines: [] });
    const userMedicines = await MedicineService.getUserMedicines(req.user.linkedPatientId);
    return res.json({ medicines: userMedicines });
  }

  static async getTodayDoses(req: AuthRequest, res: Response) {
    if (!req.user?.linkedPatientId) return res.json({ doseLogs: [] });
    const logs = await MedicineService.getTodayDoses(req.user.linkedPatientId);
    return res.json({ doseLogs: logs });
  }

  static async updateDoseStatus(req: AuthRequest, res: Response) {
    try {
      const id = req.params.id as string;
      const { status, snoozeMinutes } = req.body;
      if (!status) return res.status(400).json({ error: "Missing status" });
      const updated = await MedicineService.updateDoseStatus(id, status, snoozeMinutes);
      if (status === "taken") {
        const { NotificationService } = require("../services/notificationService");
        NotificationService.sendDoseTakenNotification(id).catch((e: any) => console.error(e));
      }
      return res.json({ doseLog: updated });
    } catch (error) {
      return res.status(500).json({ error: "Failed to update dose" });
    }
  }

  static async addMedicine(req: AuthRequest, res: Response) {
    try {
      if (!req.user?.linkedPatientId) return res.status(400).json({ error: "No patient linked" });
      const medicine = await MedicineService.addMedicine(req.user.linkedPatientId, req.body);
      return res.status(201).json(medicine);
    } catch (error: any) {
      return res.status(500).json({ error: "Failed to add medicine", detail: error.message });
    }
  }

  static async updateMedicine(req: AuthRequest, res: Response) {
    const updated = await MedicineService.updateMedicine(req.params.id, req.body);
    return res.json(updated);
  }

  static async deleteMedicine(req: AuthRequest, res: Response) {
    await MedicineService.deleteMedicine(req.params.id);
    return res.status(204).end();
  }

  static async getAdherenceHistory(req: AuthRequest, res: Response) {
    if (!req.user?.id) return res.status(401).json({ success: false, message: "Unauthorized" });
    try {
      const days = req.query.days ? parseInt(req.query.days as string, 10) : 30;
      const history = await MedicineService.getAdherenceHistory(req.user.id, isNaN(days) ? 30 : days);
      return res.json({ success: true, history });
    } catch {
      return res.status(500).json({ success: false, message: "Failed to get adherence history" });
    }
  }
}
```

## 11. Medicine Service (`src/services/medicineService.ts`)

```typescript
import { db, medicines, doseLogs, patients, eq, and, desc, lte, gte, sql } from "@workspace/db";

export class MedicineService {
  static async getUserMedicines(patientId: string) {
    return db.select().from(medicines).where(and(eq(medicines.patientId, patientId))).orderBy(medicines.createdAt);
  }

  static async getTodayDoses(patientId: string) {
    const today = new Date().toISOString().split("T")[0];
    const userMeds = await this.getUserMedicines(patientId);
    if (userMeds.length === 0) return [];

    const medMap = new Map(userMeds.map(m => [m.id, m]));
    const logs = await db.select().from(doseLogs)
      .where(and(eq(doseLogs.date, today), inArray(doseLogs.medicineId, [...medMap.keys()])));
    
    // Auto-create missing dose logs for today
    const created: any[] = [];
    for (const med of userMeds) {
      for (const time of med.times) {
        if (!logs.find(l => l.medicineId === med.id && l.scheduledTime === time)) {
          const [newLog] = await db.insert(doseLogs).values({
            medicineId: med.id, scheduledTime: time, date: today, status: "pending",
          }).returning();
          created.push(newLog);
        }
      }
    }
    const all = [...logs, ...created].map(l => ({
      ...l, medicineName: medMap.get(l.medicineId)?.name || "Unknown",
    }));
    return all.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
  }

  static async updateDoseStatus(doseId: string, status: string, snoozeMinutes?: number) {
    const updates: any = { status };
    if (status === "taken") updates.takenAt = new Date();
    if (status === "snoozed" && snoozeMinutes) {
      updates.snoozedUntil = new Date(Date.now() + snoozeMinutes * 60 * 1000);
    }
    const [updated] = await db.update(doseLogs).set(updates).where(eq(doseLogs.id, doseId)).returning();
    return updated;
  }

  static async addMedicine(patientId: string, data: any) {
    const [med] = await db.insert(medicines).values({
      patientId, name: data.name, dosage: data.dosage, frequency: data.frequency,
      times: data.times || ["08:00"], instructions: data.instructions,
      startDate: new Date(data.startDate || Date.now()),
      color: data.color || "#0891b2", totalPills: data.totalPills, status: "active",
    }).returning();
    return med;
  }

  static async updateMedicine(id: string, data: any) {
    const [updated] = await db.update(medicines).set(data).where(eq(medicines.id, id)).returning();
    return updated;
  }

  static async deleteMedicine(id: string) {
    await db.update(medicines).set({ status: "archived" }).where(eq(medicines.id, id));
  }

  static async getAdherenceHistory(userId: string, days: number) {
    const since = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];
    const history = await db.select({
      date: doseLogs.date,
      total: sql`COUNT(*)`.as('total'),
      taken: sql`SUM(CASE WHEN ${doseLogs.status} = 'taken' THEN 1 ELSE 0 END)`.as('taken'),
    }).from(doseLogs).where(gte(doseLogs.date, since))
      .groupBy(doseLogs.date).orderBy(doseLogs.date);
    return history;
  }
}
```

## 12. AI Routes (`src/routes/ai.ts`)

Full file at `SATHI_BLUEPRINT/17_ai_routes_full.md` (676 lines). Key endpoints:
- `POST /api/ai/chat` — Mr. Meddy with patient context injection, Groq Llama 3.1 8B
- `POST /api/ai/stt` — Groq Whisper `whisper-large-v3-turbo`
- `POST /api/ai/tts` — Microsoft Edge Neural TTS via `@andresaya/edge-tts`
- `POST /api/ai/drug-check` — Groq Llama 3.3 70B interaction analysis
- `POST /api/ai/intent` — Emergency keyword guard + Llama 3.1 classification

## 13. Email Service (`src/lib/email.ts`)

```typescript
import nodemailer from "nodemailer";
import { logger } from "./logger";

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER || "no-reply@dischargebuddy.com";

let transporter: nodemailer.Transporter | null = null;
if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  try {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST, port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
    logger.info({ host: SMTP_HOST, port: SMTP_PORT }, "SMTP email transporter initialized");
  } catch (error) {
    logger.error({ err: error }, "Failed to initialize SMTP email transporter");
  }
} else {
  logger.info("SMTP credentials not fully configured. Verification codes will be logged to console.");
}
export { transporter };

export async function sendVerificationEmail(to: string, code: string, name: string): Promise<boolean> {
  const subject = "Verify your email - SATHI";
  const htmlContent = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; borderRadius: 8px;">
    <h2 style="color: #7C3AED; text-align: center;">Welcome to SATHI!</h2>
    <p>Hello ${name},</p>
    <p>Thank you for registering with SATHI. To complete your sign-up and secure your account, please verify your email address using the 6-digit code below:</p>
    <div style="text-align: center; margin: 30px 0;">
      <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #7C3AED; background-color: #F5F3FF; padding: 10px 20px; border-radius: 8px; border: 1px dashed #7C3AED;">
        ${code}
      </span>
    </div>
    <p style="color: #64748b; font-size: 14px;">This code will expire in 15 minutes.</p>
    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
    <p style="font-size: 12px; color: #94a3b8; text-align: center;">SATHI Team</p>
  </div>`;

  if (transporter) {
    try {
      await transporter.sendMail({ from: SMTP_FROM, to, subject, html: htmlContent });
      logger.info({ to }, "Verification email sent successfully");
      return true;
    } catch (error) {
      logger.error({ err: error, to }, "Failed to send verification email via SMTP");
    }
  }
  console.log(`\n${"=".repeat(60)}\n✉️ EMAIL CODE FOR: ${to} (${name})\n${"=".repeat(60)}\n👉 CODE: ${code}\n👉 EXPIRES IN: 15 minutes\n${"=".repeat(60)}\n`);
  return true;
}
```

## 14. Notification Service (`src/services/notificationService.ts`)

Full file at `SATHI_BLUEPRINT/18_notification_service_full.md` (263 lines). Supports:
- Firebase Admin SDK FCM push notifications (optional; skipped in zero-cost hackathon setups in favor of SSE)
- Expo Push API fallback (`https://exp.host/--/api/v2/push/send`)
- `sendDoseTakenNotification(doseLogId)` — alert caregiver when patient takes dose
- `sendInactivityAlert(patientId, hours)` — alert caregiver on inactivity
- `sendPlanImportedNotification(patientId, planId)` — alert on plan import
- `sendMulticastNotification(tokens[], payload)` — batch send to multiple devices

## 15. Build Script (`build.mjs`)

Full file at `SATHI_BLUEPRINT/19_build_script.md` (127 lines). Uses esbuild with:
- Platform: node, format: esm
- Externalizes: bcrypt, nodemailer, firebase-admin, google-auth-library, pg-native, etc.
- Plugin: esbuildPluginPino for pino worker threads
- Banner: creates global require/__filename/__dirname for CJS compatibility

## 16. DB Package (`lib/db/package.json`)

```json
{
  "name": "@workspace/db",
  "version": "0.0.0", "private": true, "type": "module",
  "exports": { ".": "./src/index.ts", "./schema": "./src/schema/index.ts" },
  "scripts": { "push": "drizzle-kit push --config ./drizzle.config.ts", "push-force": "drizzle-kit push --force --config ./drizzle.config.ts" },
  "dependencies": { "drizzle-orm": "catalog:", "drizzle-zod": "^0.8.3", "pg": "^8.20.0", "zod": "catalog:" },
  "devDependencies": { "@types/node": "catalog:", "@types/pg": "^8.18.0", "drizzle-kit": "^0.31.9" }
}
```

## 17. DB Client (`lib/db/src/index.ts`)

```typescript
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
const { Pool } = pg;
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL must be set");
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });
export * from "./schema";
export * from "drizzle-orm";
```

## 18. Drizzle Config (`lib/db/drizzle.config.ts`)

```typescript
import { defineConfig } from "drizzle-kit";
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL, ensure the database is provisioned");
export default defineConfig({
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

## 19. API Server Package (`artifacts/api-server/package.json`)

```json
{
  "name": "@workspace/api-server", "version": "0.0.0", "private": true, "type": "module",
  "scripts": { "dev": "pnpm run build && pnpm run start", "build": "node ./build.mjs", "start": "node --enable-source-maps ./dist/index.mjs", "typecheck": "tsc -p tsconfig.json --noEmit" },
  "dependencies": {
    "@andresaya/edge-tts": "^1.8.0", "@google/generative-ai": "^0.24.1",
    "@workspace/api-zod": "workspace:*", "@workspace/db": "workspace:*",
    "bcryptjs": "^3.0.2", "cookie-parser": "^1.4.7", "cors": "^2", "dotenv": "^17.4.2",
    "drizzle-orm": "catalog:", "esbuild": "^0.27.3", "esbuild-plugin-pino": "^2.3.3",
    "expo-server-sdk": "^6.1.0", "express": "^5", "firebase-admin": "^13.8.0",
    "google-auth-library": "^10.6.2", "groq-sdk": "^1.1.2", "jsonwebtoken": "^9.0.3",
    "node-cron": "^4.2.1", "nodemailer": "^8.0.10", "pino": "^9", "pino-http": "^10", "zod": "catalog:"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6", "@types/cookie-parser": "^1.4.10", "@types/cors": "^2.8.19",
    "@types/express": "^5.0.6", "@types/jsonwebtoken": "^9.0.10", "@types/node": "catalog:",
    "@types/node-cron": "^3.0.11", "@types/node-fetch": "^2.6.13", "@types/nodemailer": "^8.0.0",
    "pino-pretty": "^13", "thread-stream": "3.1.0"
  }
}
```

## 20. API Server tsconfig (`artifacts/api-server/tsconfig.json`)

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src", "types": ["node"] },
  "include": ["src"],
  "references": [{ "path": "../../lib/db" }, { "path": "../../lib/api-zod" }]
}
```
