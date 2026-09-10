# 07_auth_flow.md — SATHI Authentication & Authorization Architecture

## 1. Complete Step-by-Step Authentication Flow

```
[User App/Web Client]                     [Express API Backend]                    [PostgreSQL DB]
         |                                          |                                     |
         | --- 1. POST /api/auth/register --------> |                                     |
         |        { name, email, pass, role }       | --- Hashes password (bcrypt) -----> |
         |                                          | --- Inserts users & patients row -> |
         |                                          | --- Generates 12-char linkCode ---> |
         | <--- Returns { token, user, patient } -- |                                     |
         |                                          |                                     |
         | --- 2. POST /api/auth/resend-otp ------> | --- Generates 6-digit OTP --------> |
         |        (Optional email verification)     | --- Saves code & expiry ----------> |
         | <--- Sends Verification Email (SMTP) --- |                                     |
         |                                          |                                     |
         | --- 3. POST /api/auth/verify-otp ------> | --- Validates OTP & expiry -------> |
         |        { email, code: "123456" }         | --- Sets is_email_verified = true-> |
         | <--- Returns { verified: true } -------- |                                     |
         |                                          |                                     |
         | --- 4. POST /api/auth/login -----------> |                                     |
         |        { email, password }               | --- Looks up user by email -------> |
         |                                          | --- Compares bcrypt password -----> |
         | <--- Returns signed JWT token ---------- | --- Fetches linked care_links ----> |
         |                                          |                                     |
         | --- 5. Stores JWT in AsyncStorage -----> |                                     |
         |        Key: "@sathi_auth_token"           |                                     |
```

1. **Registration (`/api/auth/register`)**: User submits registration details. The backend hashes the password with bcrypt, inserts a record into `users`, and checks `role`. If `role === 'patient'`, it creates an associated `patients` record with a shareable 12-character `linkCode` (`DB-XXXXXX`). It generates a signed JWT and returns it immediately so the user is logged in without waiting for email verification.
2. **Email OTP Verification (`/api/auth/verify-otp`)**: To verify their email address, the user requests a 6-digit OTP code (`/api/auth/resend-otp`), which is stored in `users.email_verification_code` with a 15-minute expiration timestamp. Submitting the correct code sets `users.is_email_verified = true`.
3. **Login (`/api/auth/login`)**: Existing users authenticate with email and password. Upon verification, the server generates a fresh 30-day JWT and returns the user object alongside their linked patient profile and active care links.

---

## 2. JWT Structure & Payload Fields

JSON Web Tokens in SATHI are signed using the HMAC SHA-256 algorithm (`HS256`) against the `JWT_SECRET` environment variable. The token expiration is set to **30 days** (`30d`).

### Decoded Payload Schema
```json
{
  "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "email": "sharon@example.com",
  "role": "patient",
  "iat": 1721930000,
  "exp": 1724522000
}
```
- `id`: The unique PostgreSQL UUID of the user (`users.id`).
- `email`: The user's email address.
- `role`: The primary role (`'patient'`, `'caregiver'`, `'family'`, `'doctor'`).
- `iat`: Issued at timestamp (seconds since epoch).
- `exp`: Expiration timestamp (seconds since epoch).

---

## 3. Client-Side JWT Storage & Request Header Attachment

### Storage in React Native / Expo (`AsyncStorage`)
Upon successful login or registration, the client saves the authentication state in `AsyncStorage`:
- `@sathi_auth_token`: Stores the raw JWT string.
- `@sathi_user_role`: Stores the user's role string for fast splash routing.
- `@sathi_user_profile`: Caches the JSON user profile object for offline offline-first rendering.

### Request Header Attachment Format
All API communications dispatch through an Axios/Fetch client wrapper (`lib/api.ts`) that intercepts outbound requests, retrieves `@sathi_auth_token`, and injects the HTTP header:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 4. Middleware Logic (`requireAuth` & `optionalAuth`)

The Express backend secures endpoints using middleware defined in `artifacts/api-server/src/middlewares/auth.ts`.

```typescript
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db, users, eq } from "@workspace/db";

export interface AuthenticatedRequest extends Request {
  user?: any;
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Authentication required. Missing Bearer token." });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const [user] = await db.select().from(users).where(eq(users.id, payload.id));

    if (!user) {
      return res.status(401).json({ error: "User account no longer exists." });
    }

    req.user = user;
    next();
  } catch (err: any) {
    return res.status(401).json({ error: "Invalid or expired authentication token." });
  }
}

export async function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    req.user = null; // Guest mode
    return next();
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const [user] = await db.select().from(users).where(eq(users.id, payload.id));
    req.user = user || null;
  } catch {
    req.user = null;
  }
  next();
}
```
- `requireAuth`: Strict guard. Rejects requests with HTTP `401 Unauthorized` if the header is missing, malformed, expired, or if the user record was deleted from the database.
- `optionalAuth`: Graceful guard used on AI endpoints (`/api/ai/chat`, `/api/ai/stt`, `/api/ai/tts`). If a valid token is provided, `req.user` is populated with the patient's context. If missing or expired, `req.user` is set to `null`, allowing Buddy AI to respond as a helpful "Guest" assistant without throwing 401 errors.

---

## 5. Role-Based Access Control (RBAC)

SATHI implements strict granular access boundaries across its four core roles:

| Role | Access Permissions & Restrictions |
| :--- | :--- |
| **`patient`** | • Full read/write access to their own profile, medicines, symptom logs, dose logs, journal, and follow-ups.<br>• Ability to generate shareable link codes (`/api/links/generate`) and revoke manager access.<br>• Exclusive trigger access to emergency SOS broadcast (`/api/emergency/trigger`). |
| **`caregiver`** | • Read/write management over connected patients via `care_links` (where `relationship === 'caregiver'`).<br>• Authoring and modifying medication schedules, adding prescriptions, and creating AI discharge plans (`/api/caregiver/patient/:id/discharge-plan`).<br>• Access to multi-patient dashboard and vitals telemetry monitor.<br>• **Restricted**: Cannot generate link codes for the patient or trigger emergency SOS alarms on their behalf. |
| **`family`** | • **Read-Only** monitoring access over connected patients (where `relationship === 'family'`).<br>• Can view adherence rings, medication schedule lists, and general check-in status.<br>• Ability to send encouraging push notification nudges (`/api/caregiver/patient/:id/nudge`) and assist in booking appointments.<br>• **Restricted**: Cannot add/edit/delete medications, alter discharge plans, or view private journal entries. |
| **`doctor`** | • Clinical inspection access to assigned patients' longitudinal recovery reports and medication adherence metrics.<br>• Ability to review and sign off on structured AI discharge plans.<br>• **Restricted**: Cannot alter patient account settings or delete user profiles. |

---

## 6. Email OTP Authentication (Google OAuth Skipped)
To maintain zero setup friction and avoid third-party developer console configuration, **Google OAuth setup is skipped entirely**. Primary authentication is handled natively via email/password and 6-digit verification codes (`/api/auth/register`, `/api/auth/login`, `/api/auth/verify-otp`). Standard production flows rely on JWT bearer token exchange over `/api/auth/login` to ensure compatibility across web, iOS, Android, and offline sandbox environments.

---

## 7. Session Expiry & Token Revocation Handling
1. **Token Expiration**: When a JWT reaches its 30-day expiration (`exp`), any subsequent API request protected by `requireAuth` returns `HTTP 401 Unauthorized` with `{ error: "Invalid or expired authentication token." }`.
2. **Client Auto-Logout Interceptor**: The frontend API client interceptor catches any global `401` response. It automatically executes a cleanup sequence:
   - Purges `@sathi_auth_token`, `@sathi_user_role`, and `@sathi_user_profile` from `AsyncStorage`.
   - Closes any open real-time SSE chat streams.
   - Redirects the navigation stack root to `/login` with a toast notice: *"Your session has expired. Please log in again."*
3. **Server-Side Account Verification**: Because `requireAuth` executes a live database lookup (`db.select().from(users)`) on every protected request, if an administrator or user deletes their account, access is instantly revoked on the very next HTTP request without waiting for the 30-day token to expire.
