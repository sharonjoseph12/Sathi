// Full API client: token auth, all resources, SSE, offline queue, local safety.
export type Med = { id: number; name: string; dose: string; time: string; frequency?: string; instructions?: string; simplified?: string };
export type Event = { id?: number; event_type: string; description: string; severity?: string | null; created_at?: string };
export type Safety = "NORMAL" | "MONITOR" | "ESCALATE";
export type PatientRef = { id: number; name: string; rel?: string };
export type Me = { id: number; name: string; email: string; role: string; language: string; theme: string; anchor_times: string; patients: PatientRef[] };

const BASE = ((import.meta.env.VITE_API_URL as string) || "http://localhost:8000/api").replace(/\/$/, "");
const TKEY = "@sathi_token";
const QKEY = "@sathi_offline_queue";

export const tok = {
  get: () => localStorage.getItem(TKEY) || "",
  set: (t: string) => localStorage.setItem(TKEY, t),
  clear: () => localStorage.removeItem(TKEY),
};
const queue = {
  load(): string[] { try { return JSON.parse(localStorage.getItem(QKEY) || "[]"); } catch { return []; } },
  push(path: string) { const q = queue.load(); q.push(path); localStorage.setItem(QKEY, JSON.stringify(q)); },
};
window.addEventListener("online", async () => {
  const q = queue.load(); localStorage.setItem(QKEY, "[]");
  for (const p of q) { try { await fetch(`${BASE}${p}`, { method: "POST", headers: h() }); } catch { queue.push(p); } }
});

function h(): HeadersInit {
  const t = tok.get();
  return t ? { "Content-Type": "application/json", Authorization: `Bearer ${t}` } : { "Content-Type": "application/json" };
}

// Offline-first cache: reads fall back to last good response per patient.
function ck(pid: number, key: string) { return `@sathi_cache_${pid}_${key}`; }
async function cached<T>(pid: number, key: string, fn: () => Promise<T>): Promise<T> {
  try {
    const r = await fn();
    try { localStorage.setItem(ck(pid, key), JSON.stringify(r)); } catch { /* full */ }
    return r;
  } catch (e) {
    try {
      const c = localStorage.getItem(ck(pid, key));
      if (c) return JSON.parse(c) as T;
    } catch { /* corrupt */ }
    throw e;
  }
}

async function req<T>(path: string, init?: RequestInit, offlineRetry?: string, timeoutMs = 15000): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  let r: Response;
  try {
    r = await fetch(`${BASE}${path}`, { headers: h(), signal: ctrl.signal, ...init });
  } catch (e) {
    if (offlineRetry) queue.push(offlineRetry);
    throw new Error(e instanceof DOMException && e.name === "AbortError" ? "request timed out — try again" : "offline");
  } finally {
    clearTimeout(t);
  }
  if (r.status === 401) {
    tok.clear();
    if (!location.hash.startsWith("#/login")) location.hash = "#/login";
    throw new Error("session expired — please log in again");
  }
  if (!r.ok) {
    let d = "";
    try {
      const j = await r.json();
      d = (j as { detail?: string }).detail || "";
    } catch { /* ignore */ }
    throw new Error(d || `request failed (${r.status})`);
  }
  return r.json() as Promise<T>;
}
const J = (b: unknown) => ({ method: "POST", body: JSON.stringify(b) });
const P = (b: unknown) => ({ method: "PUT", body: JSON.stringify(b) });

export function localSafety(text: string): Safety {
  const t = text.toLowerCase();
  if (/(chest pain|breath|severe pain|bleed|unconscious|faint|can't breathe|help me|sos)/.test(t)) return "ESCALATE";
  if (/(headache|mild|tired|nausea|dizz|fever|pain|cough)/.test(t)) return "MONITOR";
  return "NORMAL";
}

export const api = {
  register: (b: object) => req<{ token: string; user: object }>("/auth/register", J(b)),
  login: (b: object) => req<{ token: string; user: object; patients: PatientRef[] }>("/auth/login", J(b)),
  me: () => req<Me>("/auth/me"),
  settings: (b: object) => req("/users/settings", P(b)),
  createPatient: (b: object) => req<{ id: number; link_code: string }>("/patients", J(b)),
  linkCode: (pid: number) => req<{ code: string }>(`/patients/${pid}/link-code`),
  connect: (code: string) => req(`/links/connect`, J({ code })),
  meds: (pid: number) => cached(pid, "meds", () => req<Med[]>(`/patients/${pid}/medications`)),
  addMed: (pid: number, b: object) => req<{ status: string; id?: number; expanded?: [string, string][]; simplified?: string }>(`/patients/${pid}/medications`, J(b)),
  editMed: (pid: number, mid: number, b: object) => req(`/patients/${pid}/medications/${mid}`, P(b)),
  delMed: (pid: number, mid: number) => req(`/patients/${pid}/medications/${mid}`, { method: "DELETE" }),
  confirm: (pid: number, mid: number) => req(`/patients/${pid}/medications/${mid}/confirm`, J({}), `/patients/${pid}/medications/${mid}/confirm`),
  logDose: (pid: number, mid: number, b: object) => req(`/patients/${pid}/medications/${mid}/log`, J(b)),
  dosesToday: (pid: number) => cached(pid, "doses", () => req<{ medication_id: number; name: string; time: string; status: string }[]>(`/patients/${pid}/doses/today`)),
  symptom: (pid: number, text: string, severity = 0) => req<{ safety_status: Safety; risk: string; ai_followup?: string }>(`/patients/${pid}/symptoms`, J({ text, severity })),
  symptoms: (pid: number) => cached(pid, "symptoms", () => req<{ id: number; symptoms: string[]; severity: number; risk: string }[]>(`/patients/${pid}/symptoms`)),
  followups: (pid: number) => cached(pid, "followups", () => req<{ id: number; title: string; doctor: string; date_time: string; location: string; completed: boolean }[]>(`/patients/${pid}/followups`)),
  addFu: (pid: number, b: object) => req(`/patients/${pid}/followups`, J(b)),
  doneFu: (pid: number, fid: number) => req(`/patients/${pid}/followups/${fid}/done`, J({})),
  timeline: (pid: number) => cached(pid, "timeline", () => req<Event[]>(`/patients/${pid}/timeline`)),
  note: (pid: number, description: string) => req(`/patients/${pid}/timeline`, J({ description })),
  stats: (pid: number) => cached(pid, "stats", () => req<{ adherence: number; taken_today: number; total: number; streak: number; xp: number; next_followup: string | null; week: { date: string; pct: number }[] }>(`/patients/${pid}/stats`)),
  aiReport: (pid: number) => req<{ report: string }>(`/patients/${pid}/ai-report`),
  sosAlert: (pid: number, note = "") => req<{ status: string; notified: number }>(`/patients/${pid}/sos/alert`, J({ note })),
  emergencyCard: (pid: number) => req<{ name: string; age: number; condition: string; language: string; emergency_contact: string; medications: { name: string; dose: string; time: string }[]; recent_symptoms: string[]; next_followup: string | null; note: string }>(`/patients/${pid}/emergency-card`),
  chatHistory: (pid: number, peer: number) => req<{ id: number; senderId: number; text: string; audio: string }[]>(`/chat/messages?patient_id=${pid}&peer_id=${peer}`),
  chatSend: (b: object) => req(`/chat/messages`, J(b)),
  streamUrl: () => `${BASE}/chat/stream?token=${encodeURIComponent(tok.get())}`,
  cgPatients: () => req<{ id: number; name: string; condition: string; rel: string; adherence: number; risk: string; recent: string[] }[]>("/caregiver/patients"),
  cgDetail: (pid: number) => req<{ timeline: Event[]; symptoms: { symptoms: string[]; severity: number; risk: string }[]; doses: { name: string; status: string }[]; followups: { title: string }[] }>(`/caregiver/patients/${pid}`),
  nudge: (pid: number, msg: string) => req(`/caregiver/patients/${pid}/nudge?msg=${encodeURIComponent(msg)}`, J({})),
  aiChat: (pid: number, message: string) => req<{ message: string; actions: { type: string; label: string }[]; safety: Safety }>(`/ai/chat`, J({ patient_id: pid, message })),
  simplify: (text: string) => req<{ simplified: string; expanded: string[] }>(`/ai/simplify`, J({ text })),
  drugCheck: (pid: number) => req<{ interactions: { pair: string[]; severity: string; description: string; advice: string }[]; hasCritical: boolean; note: string }>(`/ai/drug-check?patient_id=${pid}`, J({})),
  ocr: (image?: string, mode?: string) => req<{ medicines: { name: string; dose: string; frequency: string; time: string; instructions: string }[]; needs_review: boolean; message: string; source?: string; ocr_text?: string }>(`/ai/ocr`, J({ image: image || "", mode: mode || "auto" })),
  ocrStatus: () => req<{ donut: { enabled: boolean; model: string; device: string; loaded: boolean; deps_installed: boolean; error: string | null }; vision: { gemini: boolean; groq: boolean } }>(`/ai/ocr-status`),
  transcribe: (audio: string) => req<{ text: string; language: string; message?: string }>(`/ai/transcribe`, J({ audio })),
  speak: (text: string, lang = "en") => req<{ audio: string; voice?: string; message?: string }>(`/ai/speak`, J({ text, lang })),
  journal: () => req<{ id: number; mood: number; energy: number; text: string }[]>("/journal"),
  addJournal: (b: object) => req("/journal", J(b)),
  plans: (pid: number) => req<{ id: number; hospital: string; version: number; is_active: boolean; data: string }[]>(`/patients/${pid}/plans`),
  addPlan: (pid: number, b: object) => req(`/patients/${pid}/plans`, J(b)),
  reminders: (pid: number) => req<{ id: number; message: string; scheduled_for: string; channel: string; status: string }[]>(`/patients/${pid}/reminders`),
  addReminder: (pid: number, b: object) => req(`/patients/${pid}/reminders`, J(b)),
  delReminder: (pid: number, id: number) => req(`/patients/${pid}/reminders/${id}`, { method: "DELETE" }),
  notifs: () => req<{ id: number; title: string; body: string; kind: string; read: boolean }[]>("/notifications"),
  readNotif: (id: number) => req(`/notifications/${id}/read`, J({})),
  support: (type: string, message: string) => req("/support", J({ type, message })),
};
