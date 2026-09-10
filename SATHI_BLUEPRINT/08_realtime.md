# 08_realtime.md — SATHI Complete Real-Time Architecture (SSE & Push)

SATHI achieves instantaneous real-time sync across mobile devices and web dashboards using **Server-Sent Events (SSE)** for active open app sessions. For zero-cost hackathon deployments, **Firebase Cloud Messaging (FCM) / Expo Push is skipped entirely** as SSE handles all live interactive demonstration needs.

---

## 1. Server-Sent Events (SSE) Server Implementation

### Multi-Device Client Connection Registry (`chat.ts`)
In `/api/chat/stream`, the Express server maintains an in-memory connection map:
```typescript
const clients = new Map<string, Set<Response>>();
```
Because one user may be simultaneously logged in on multiple devices (e.g., smartphone + web tablet), `clients` maps a user UUID to a `Set<Response>` of active HTTP response stream handles.

### Connection Establishment & Keepalive Heartbeat
```typescript
router.get("/stream", requireAuth, (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Disable Nginx proxy buffering
  res.flushHeaders?.();

  res.write(`data: {"type":"connected"}\n\n`);

  let set = clients.get(userId);
  if (!set) {
    set = new Set();
    clients.set(userId, set);
  }
  set.add(res);

  // Keepalive: prevent load balancers/proxies from dropping idle sockets
  const heartbeat = setInterval(() => {
    try {
      res.write(`: ping\n\n`);
    } catch {
      clearInterval(heartbeat);
    }
  }, 25000);

  req.on("close", () => {
    clearInterval(heartbeat);
    const s = clients.get(userId);
    if (s) {
      s.delete(res);
      if (s.size === 0) clients.delete(userId);
    }
  });
});
```
- Every 25 seconds, the server writes an SSE comment line (`: ping\n\n`). Because standard HTML5 `EventSource` parsers ignore lines starting with a colon, this silently keeps NAT firewalls and load balancers open without triggering unwanted frontend state re-renders.

---

## 2. Client-Side SSE Consumption (React Native / Web)

### Custom Socket & Fetch Stream Hook (`useRealtime.ts` / `socket.ts`)
On web targets, the client utilizes standard `new EventSource('/api/chat/stream')`. On React Native / Expo targets where standard browser EventSource is limited with auth headers, SATHI implements a custom streaming reader over `@react-native-community/netinfo` and `fetch`:

```typescript
const response = await fetch(`${API_URL}/api/chat/stream`, {
  headers: {
    Authorization: `Bearer ${token}`,
    Accept: "text/event-stream",
  },
});
const reader = response.body?.getReader();
const decoder = new TextDecoder("utf-8");

while (true) {
  const { done, value } = await reader!.read();
  if (done) break;
  const chunk = decoder.decode(value, { stream: true });
  const lines = chunk.split("\n\n");
  for (const line of lines) {
    if (line.startsWith("data: ")) {
      const payload = JSON.parse(line.slice(6));
      handleIncomingEvent(payload);
    }
  }
}
```

---

## 3. Event Types & Payloads

### 1. `connected`
- **When Emitted**: Immediately upon establishing SSE handshake.
- **Payload Schema**: `{ "type": "connected" }`

### 2. `message`
- **When Emitted**: When a user or caregiver dispatches a message via `POST /api/chat/send`.
- **Payload Schema**:
  ```json
  {
    "type": "message",
    "data": {
      "id": "c1f7a288-4389-4e7a-b9c1-52f1e812a022",
      "senderId": "user-uuid-1",
      "receiverId": "user-uuid-2",
      "patientContextId": "patient-uuid",
      "text": "Have you taken your 8 PM Thyronorm?",
      "audioBase64": null,
      "createdAt": "2026-07-25T18:00:00.000Z"
    }
  }
  ```

### 3. `notification` & `status_update`
- **When Emitted**: When a patient marks a medication dose as taken, or when an emergency alert status changes.
- **Payload Schema**: `{ "type": "status_update", "data": { "patientId": "uuid", "event": "DOSE_LOGGED", "medicineId": "med-uuid", "status": "taken" } }`

---

## 4. FCM / Expo Push Setup & Active Socket Detection

### Live vs Push Forking in `chat.ts`
When a message or alert is triggered, the server checks if the target recipient currently has an active SSE connection:
```typescript
const deliveredLive = pushToClients(receiverId, { type: "message", data: newMessage });
if (!deliveredLive) {
  const [receiver] = await db.select().from(users).where(eq(users.id, receiverId));
  if (receiver?.pushToken) {
    await sendPushNotification(receiver.pushToken, {
      title: `New message from ${req.user!.name}`,
      body: text || "Voice Message",
      data: { type: "chat", senderId, patientContextId },
    });
  }
}
```
- If `deliveredLive === true` (at least one device received the SSE frame over an open HTTP stream), the server bypasses external push notification gateways.
- If `deliveredLive === false` (user closed the app, socket disconnected, or phone asleep), the server falls back to `sendPushNotification()` via Expo Push / Firebase Cloud Messaging (optional background delivery; skipped for zero-friction hackathon demos).

---

## 5. Push Notification Payload Structure

All mobile push notifications sent via `notificationService.ts` conform to the Expo Push API JSON format:

```json
{
  "to": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "sound": "default",
  "title": "🚨 EMERGENCY ALERT from Rajesh",
  "body": "Rajesh has triggered an SOS alert! Tap immediately to view GPS coordinates and CPR guide.",
  "priority": "high",
  "channelId": "emergency-alerts",
  "data": {
    "type": "EMERGENCY_SOS",
    "alertId": "alert-uuid-string",
    "latitude": 12.9716,
    "longitude": 77.5946
  }
}
```

---

## 6. Missed Dose Escalation Engine

How a caregiver gets notified when a patient misses a scheduled medication dose:
1. **Dose Logging Check**: When `POST /api/medicines/:id/log` is called with `status: "missed"`, or when a scheduled cron job evaluates un-logged doses past their anchor times.
2. **Time Threshold Verification**: If `now() > scheduledTime + 4 hours` and `dose_logs.escalated_to_caregiver === false`:
3. **Manager Lookup**: The backend queries `care_links` for all users linked to `patient_id` with `status === 'active'` and `relationship === 'caregiver'`.
4. **Push Dispatch**: It iterates over `managerIds` and dispatches:
   ```json
   {
     "title": "⚠️ Missed Dose Alert",
     "body": "Rajesh missed his scheduled 08:00 AM dose of Amoxicillin 500mg.",
     "data": { "type": "MISSED_DOSE", "patientId": "uuid", "medicineId": "med-uuid" }
   }
   ```
5. **Idempotency Lock**: The row in `dose_logs` is updated to set `escalated_to_caregiver = true`, preventing duplicate push spam on subsequent polling checks.

---

## 7. Emergency SOS Alert Push Architecture

When a patient triggers an emergency via `POST /api/emergency/trigger` or by shouting an emergency phrase to Buddy AI:
1. **Immediate Broadcast**: The server queries `care_links` for **ALL** linked accounts regardless of relationship (`relationship IN ('caregiver', 'family')`).
2. **High-Priority Channel**: It sends a push notification payload with `priority: "high"` and `channelId: "emergency"`, which bypasses iOS/Android Do Not Disturb schedules where permitted.
3. **SSE Override**: Concurrently, `pushToClients()` broadcasts an emergency event to all active dashboards, causing caregiver and family screens to immediately render a flashing red modal banner with direct telephone call action buttons and CPR guidance links.
