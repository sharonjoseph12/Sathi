# 10_features_to_remove.md — SATHI Codebase Pruning & Simplification Plan

To optimize maintainability, reduce Docker image size, and eliminate architectural redundancy, the following non-core features, duplicate subsystems, and dead code have been identified for pruning.

---

## 1. Python OCR Microservice (`artifacts/ocr-service/`)

### File Paths Involved
- `artifacts/ocr-service/main.py`
- `artifacts/ocr-service/report_generator.py`
- `artifacts/ocr-service/requirements.txt`
- `artifacts/api-server/src/services/ocrClient.ts`

### Why It Should Be Removed
- **Architectural Redundancy**: The Node.js Express backend (`artifacts/api-server/src/services/PrescriptionService.ts`) already implements a robust, high-speed OCR pipeline using Groq Llama 4 Scout Vision (`meta-llama/llama-4-scout-17b-16e-instruct`) and Llama 3.3 70B (`llama-3.3-70b-versatile`). The standalone Python FastAPI service originally built for DocTR/TrOCR fallback now simply wraps Google Gemini Vision, duplicating the exact AI capabilities already present in Node.
- **Complexity Burden**: Requires maintaining a secondary Python runtime, `virtualenv`, Pillow/PyTorch/FastAPI dependencies, and an extra port (`8100`) inside Docker containers.

### What Breaks If Removed & How to Fix
- **Impact**: `PrescriptionService.ts` currently attempts to ping `ocrClient.ts` as a primary/secondary OCR step.
- **Fix**: Remove `ocrClient.ts` import from `PrescriptionService.ts`. Route all OCR image scan payloads directly to the native Node Groq Vision / Llama 3.3 pipeline.

### Step-by-Step Removal Guide
1. Delete directory `artifacts/ocr-service/`.
2. Delete file `artifacts/api-server/src/services/ocrClient.ts`.
3. In `artifacts/api-server/src/services/PrescriptionService.ts`, remove `analyzeWithOCR()` calls and rely exclusively on the `analyzeViaGroqVision()` method.
4. Remove `OCR_SERVICE_URL` from `.env.example`, `env.ts`, and Docker build scripts.

### Estimated Complexity Reduction
- **Lines of Code**: ~450 lines of Python/TypeScript removed.
- **Bundle Size Impact**: Eliminates ~500MB+ of Python container runtime dependencies (FastAPI, uvicorn, PIL, pydantic) from Docker builds.

---

## 2. Standalone UI Mockup Sandbox (`mockup-sandbox/`)

### File Paths Involved
- `mockup-sandbox/package.json`
- `mockup-sandbox/vite.config.ts`
- `mockup-sandbox/src/*`

### Why It Should Be Removed
- **Dead Workspace Code**: A separate Vite/React web project created during initial UI prototyping. It is not integrated into the Expo React Native production app (`artifacts/discharge-buddy/`), nor is it deployed to Render or Vercel.
- **Dependency Bloat**: Adds an extra `node_modules` tree, duplicate React/Tailwind dependencies, and unnecessary build scripts in `pnpm-workspace.yaml`.

### What Breaks If Removed & How to Fix
- **Impact**: None to production mobile or API servers.
- **Fix**: Remove folder and unregister from root workspace.

### Step-by-Step Removal Guide
1. Delete folder `mockup-sandbox/`.
2. Ensure `pnpm-workspace.yaml` does not explicitly list `mockup-sandbox`.
3. Run `pnpm install` at workspace root to prune lockfile entries.

### Estimated Complexity Reduction
- **Lines of Code**: ~2,500 lines of prototype component code removed.
- **Bundle Size Impact**: Saves ~120MB of local node_modules disk space and speeds up root `pnpm install` by ~15%.

---

## 3. Blood Donor & Request Schema (`donor_profiles` & `blood_requests`)

### File Paths Involved
- `lib/db/src/schema/index.ts` (lines 177 to 210)
- Any residual references in backend route files.

### Why It Should Be Removed
- **Scope Creep / Unused Feature**: Tables `donor_profiles` and `blood_requests` (along with enums `blood_type`, `blood_urgency`, `blood_request_status`) were originally scaffolded for a community blood donation feature that is completely disconnected from SATHI's core value proposition of post-discharge medication and symptom recovery tracking.
- **Database Clutter**: Unused tables increase schema introspection time and migration surface area without client UI endpoints.

### What Breaks If Removed & How to Fix
- **Impact**: None to active features. No mobile screen or Express controller imports `donor_profiles`.
- **Fix**: Drop Drizzle definitions and run a migration to clean PostgreSQL catalog.

### Step-by-Step Removal Guide
1. In `lib/db/src/schema/index.ts`, delete `donorProfiles`, `bloodRequests`, `bloodUrgencyEnum`, and `bloodRequestStatusEnum` exports.
2. Generate and apply Drizzle migration (`pnpm --filter @workspace/db run push`) to drop tables from live DB.

### Estimated Complexity Reduction
- **Lines of Code**: ~45 lines of Drizzle ORM schema definitions removed.
- **Bundle Size Impact**: Minor Node bundle reduction; cleaner database ERD.

---

## 4. Legacy Single-Caregiver Foreign Key Columns

### File Paths Involved
- `lib/db/src/schema/index.ts`: `patients.caregiverId` and `users.linkedPatientId`.
- `artifacts/api-server/src/routes/chat.ts` & `managedPatients.ts`.

### Why It Should Be Removed
- **Superseded by Multi-Manager Architecture**: The introduction of the many-to-many `care_links` table fully supports linking multiple caregivers, family members, and doctors to a single patient. Keeping the legacy single-column foreign keys (`patients.caregiver_id`, `users.linked_patient_id`) forces backend queries (such as in `chat.ts` participant resolution) to execute redundant fallback checks across 3 different tables.

### What Breaks If Removed & How to Fix
- **Impact**: Any legacy queries relying solely on `req.user.linkedPatientId` would fail if not migrated to check `care_links`.
- **Fix**: Ensure `getManagedPatients()` and `getParticipants()` read exclusively from `care_links`. Execute a backfill script (`backfill-links.mjs`) to migrate existing single-column links into `care_links` before dropping the columns.

### Step-by-Step Removal Guide
1. Run `node artifacts/api-server/backfill-links.mjs` in production to guarantee all relationships exist in `care_links`.
2. In `lib/db/src/schema/index.ts`, remove `caregiverId` from `patients` and `linkedPatientId` from `users`.
3. In `chat.ts` and `auth.ts`, remove the legacy fallback branches querying those columns.
4. Run Drizzle migration push.

### Estimated Complexity Reduction
- **Lines of Code**: ~60 lines of complex fallback query logic removed from backend controllers.
- **Bundle Size Impact**: Reduces SQL query execution planning time and eliminates 2 nullable foreign key indexes in PostgreSQL.

---

## 5. Offline Medical Acronym Dictionary Table (`medical_terms_dictionary`)

### File Paths Involved
- `lib/db/src/schema/index.ts`: `medicalTermsDictionary` table definition.
- `artifacts/api-server/src/services/languageSimplifierService.ts`.

### Why It Should Be Removed
- **Redundant with LLM Capabilities**: Modern large language models (Groq Llama 3.3 70B Versatile) natively understand medical Latin shorthand (`PO`, `TID`, `PC`, `STAT`) with near-100% accuracy in context. Maintaining a manual PostgreSQL dictionary table requires constant seeding scripts and database lookups that add latency without improving translation quality.

### What Breaks If Removed & How to Fix
- **Impact**: `LanguageSimplifierService.ts` performs dictionary lookups before invoking the LLM.
- **Fix**: Simplify `LanguageSimplifierService.ts` to pass raw prescription instructions directly to the Groq Llama 3.3 simplifier prompt, removing the database lookup loop entirely.

### Step-by-Step Removal Guide
1. In `languageSimplifierService.ts`, delete `lookupAbbreviation()` and the pre-processing loop.
2. In `lib/db/src/schema/index.ts`, delete `medicalTermsDictionary` export.
3. Drop table from database via Drizzle push.

### Estimated Complexity Reduction
- **Lines of Code**: ~35 lines of string regex loop code and Drizzle schema removed.
- **Bundle Size Impact**: Eliminates 1 database table query per medication simplification request.
