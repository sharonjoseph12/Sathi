/**
 * API client for React Native — full parity with frontend/src/lib/api.ts.
 * SecureStore for JWT, AsyncStorage for offline cache.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

export type Med = {
  id: number; name: string; dose: string; time: string;
  frequency?: string; instructions?: string; simplified?: string;
};
export type Event = {
  id?: number; event_type: string; description: string;
  severity?: string | null; created_at?: string;
};
export type Safety = "NORMAL" | "MONITOR" | "ESCALATE";
export type PatientRef = { id: number; name: string; rel?: string };
export type Me = {
  id: number; name: string; email: string; role: string;
  language: string; theme: string; anchor_times: string;
  patients: PatientRef[];
};
export type Stats = {
  adherence: number; taken_today: number; total: number; streak: number; xp: number;
  next_followup: string | null; week: { date: string; pct: number }[];
};

// Expo Go on a physical device cannot reach localhost/10.0.2.2 — it needs
// the PC's LAN IP. Resolution order: in-app override (login screen) >
// EXPO_PUBLIC_API_URL (Metro bundle time) > Metro host IP (auto) > default.
const ENV_BASE = (process.env.EXPO_PUBLIC_API_URL || "").replace(/\/$/, "");
const DEFAULT_BASE = "http://10.0.2.2:8000/api";
const BASE_OVERRIDE_KEY = "sathi_api_base";

/** Derive http://<pc-lan-ip>:8000/api from the Metro server the app loaded from. */
function devLanBase(): string {
  try {
    const hostUri =
      Constants.expoConfig?.hostUri ||
      (Constants as unknown as { manifest?: { debuggerHost?: string } }).manifest?.debuggerHost ||
      "";
    const host = hostUri.split(":")[0].trim();
    // Tunnel hosts (xxx.exp.direct) only proxy Metro, not the backend — skip those.
    if (host && !host.endsWith(".exp.direct") && host !== "localhost" && host !== "127.0.0.1") {
      return `http://${host}:8000/api`;
    }
  } catch { /* fall through to default */ }
  return "";
}

let overrideCache: string | null | undefined = undefined; // undefined = not loaded yet

async function getBase(): Promise<string> {
  if (overrideCache !== undefined) return overrideCache || ENV_BASE || devLanBase() || DEFAULT_BASE;
  try {
    const v = await AsyncStorage.getItem(BASE_OVERRIDE_KEY);
    overrideCache = (v || "").replace(/\/$/, "") || null;
  } catch {
    overrideCache = null;
  }
  return overrideCache || ENV_BASE || devLanBase() || DEFAULT_BASE;
}

/** Current API base (for display/diagnostics). */
export async function getApiBase(): Promise<string> {
  return getBase();
}

/** Persist a custom API base (e.g. http://192.168.1.5:8000/api). Empty clears it. */
export async function setApiBase(url: string): Promise<void> {
  const clean = url.trim().replace(/\/$/, "");
  overrideCache = clean || null;
  try {
    if (clean) await AsyncStorage.setItem(BASE_OVERRIDE_KEY, clean);
    else await AsyncStorage.removeItem(BASE_OVERRIDE_KEY);
  } catch { /* storage unavailable */ }
}

function healthUrl(base: string): string {
  return base.replace(/\/api$/, "") + "/health";
}

/** Hit GET /health on a base URL. Resolves "ok", throws a human-readable error. */
export async function testConnection(base?: string): Promise<string> {
  const b = ((base || (await getBase())) || "").replace(/\/$/, "");
  if (!b) throw new Error("empty server URL");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(healthUrl(b), { signal: ctrl.signal });
    if (!r.ok) throw new Error(`server replied ${r.status}`);
    return "ok";
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") throw new Error("timed out — server unreachable");
    throw new Error(e instanceof Error && e.message ? e.message : "network failed");
  } finally {
    clearTimeout(timer);
  }
}
const TKEY = "sathi_token";
const CACHE_PREFIX = "sathi_cache_";

export const tok = {
  get: async (): Promise<string> => {
    try { return (await SecureStore.getItemAsync(TKEY)) || ""; } catch { return ""; }
  },
  set: async (t: string) => { try { await SecureStore.setItemAsync(TKEY, t); } catch {} },
  clear: async () => { try { await SecureStore.deleteItemAsync(TKEY); } catch {} },
};

async function h(): Promise<Record<string, string>> {
  const t = await tok.get();
  return t ? { "Content-Type": "application/json", Authorization: `Bearer ${t}` } : { "Content-Type": "application/json" };
}

function ck(pid: number, key: string) { return `${CACHE_PREFIX}${pid}_${key}`; }

async function cached<T>(pid: number, key: string, fn: () => Promise<T>): Promise<T> {
  try {
    const r = await fn();
    try { await AsyncStorage.setItem(ck(pid, key), JSON.stringify(r)); } catch {}
    return r;
  } catch (e) {
    try {
      const c = await AsyncStorage.getItem(ck(pid, key));
      if (c) return JSON.parse(c) as T;
    } catch {}
    throw e;
  }
}

async function req<T>(path: string, init?: RequestInit, timeoutMs = 15000): Promise<T> {
  const base = await getBase();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  let r: Response;
  try {
    r = await fetch(`${base}${path}`, { headers: await h(), signal: ctrl.signal, ...init });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") throw new Error("request timed out — server unreachable");
    throw new Error(`offline — ${e instanceof Error && e.message ? e.message : "network failed"}`);
  } finally {
    clearTimeout(t);
  }
  if (r.status === 401) { await tok.clear(); throw new Error("session expired"); }
  if (!r.ok) {
    let d = "";
    try { const j = await r.json(); d = (j as { detail?: string }).detail || ""; } catch {}
    throw new Error(d || `request failed (${r.status})`);
  }
  return r.json() as Promise<T>;
}

const J = (b: unknown) => ({ method: "POST" as const, body: JSON.stringify(b) });
const P = (b: unknown) => ({ method: "PUT" as const, body: JSON.stringify(b) });

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
  connect: (code: string) => req<{ status: string; patient_id: number; patient_name: string }>(`/links/connect`, J({ code })),
  meds: (pid: number) => cached(pid, "meds", () => req<Med[]>(`/patients/${pid}/medications`)),
  addMed: (pid: number, b: object) =>
    req<{ status: string; id?: number; expanded?: [string, string][]; simplified?: string }>(`/patients/${pid}/medications`, J(b)),
  editMed: (pid: number, mid: number, b: object) => req(`/patients/${pid}/medications/${mid}`, P(b)),
  delMed: (pid: number, mid: number) => req(`/patients/${pid}/medications/${mid}`, { method: "DELETE" }),
  confirm: (pid: number, mid: number) => req(`/patients/${pid}/medications/${mid}/confirm`, J({})),
  logDose: (pid: number, mid: number, b: object) => req(`/patients/${pid}/medications/${mid}/log`, J(b)),
  dosesToday: (pid: number) => cached(pid, "doses", () =>
    req<{ medication_id: number; name: string; time: string; status: string }[]>(`/patients/${pid}/doses/today`)),
  symptom: (pid: number, text: string, severity = 0) =>
    req<{ safety_status: Safety; risk: string; ai_followup?: string }>(`/patients/${pid}/symptoms`, J({ text, severity })),
  symptoms: (pid: number) => cached(pid, "symptoms", () =>
    req<{ id: number; symptoms: string[]; severity: number; risk: string }[]>(`/patients/${pid}/symptoms`)),
  followups: (pid: number) => cached(pid, "followups", () =>
    req<{ id: number; title: string; doctor: string; date_time: string; location: string; completed: boolean }[]>(`/patients/${pid}/followups`)),
  addFu: (pid: number, b: object) => req(`/patients/${pid}/followups`, J(b)),
  doneFu: (pid: number, fid: number) => req(`/patients/${pid}/followups/${fid}/done`, J({})),
  timeline: (pid: number) => cached(pid, "timeline", () => req<Event[]>(`/patients/${pid}/timeline`)),
  note: (pid: number, description: string) => req(`/patients/${pid}/timeline`, J({ description })),
  stats: (pid: number) => cached(pid, "stats", () => req<Stats>(`/patients/${pid}/stats`)),
  aiReport: (pid: number) => req<{ report: string }>(`/patients/${pid}/ai-report`),
  sosAlert: (pid: number, note = "") => req<{ status: string; notified: number }>(`/patients/${pid}/sos/alert`, J({ note })),
  emergencyCard: (pid: number) =>
    req<{ name: string; age: number; condition: string; language: string; emergency_contact: string;
      medications: { name: string; dose: string; time: string }[]; recent_symptoms: string[];
      next_followup: string | null; note: string }>(`/patients/${pid}/emergency-card`),
  chatHistory: (pid: number, peer: number) =>
    req<{ id: number; senderId: number; text: string; audio: string }[]>(`/chat/messages?patient_id=${pid}&peer_id=${peer}`),
  chatSend: (b: object) => req(`/chat/messages`, J(b)),
  cgPatients: () =>
    req<{ id: number; name: string; condition: string; rel: string; adherence: number; risk: string; recent: string[] }[]>("/caregiver/patients"),
  cgDetail: (pid: number) =>
    req<{ timeline: Event[]; symptoms: { symptoms: string[]; severity: number; risk: string }[];
      doses: { name: string; status: string }[]; followups: { title: string }[] }>(`/caregiver/patients/${pid}`),
  nudge: (pid: number, msg: string) => req(`/caregiver/patients/${pid}/nudge?msg=${encodeURIComponent(msg)}`, J({})),
  aiChat: (pid: number, message: string) =>
    req<{ message: string; actions: { type: string; label: string }[]; safety: Safety }>(`/ai/chat`, J({ patient_id: pid, message })),
  simplify: (text: string) => req<{ simplified: string; expanded: string[] }>(`/ai/simplify`, J({ text })),
  drugCheck: (pid: number) =>
    req<{ interactions: { pair: string[]; severity: string; description: string; advice: string }[]; hasCritical: boolean; note: string }>(
      `/ai/drug-check?patient_id=${pid}`, J({})),
  ocr: (image?: string, mode?: string) =>
    req<{ medicines: { name: string; dose: string; frequency: string; time: string; instructions: string }[];
      needs_review: boolean; message: string; source?: string; ocr_text?: string }>(
      `/ai/ocr`, J({ image: image || "", mode: mode || "auto" })),
  ocrStatus: () =>
    req<{ donut: { enabled: boolean; model: string; device: string; loaded: boolean; deps_installed: boolean; error: string | null };
      vision: { gemini: boolean; groq: boolean } }>(`/ai/ocr-status`),
  transcribe: (audio: string) => req<{ text: string; language: string; message?: string }>(`/ai/transcribe`, J({ audio })),
  speak: (text: string, lang = "en") => req<{ audio: string; voice?: string; message?: string }>(`/ai/speak`, J({ text, lang })),
  journal: () => req<{ id: number; mood: number; energy: number; text: string }[]>("/journal"),
  addJournal: (b: object) => req("/journal", J(b)),
  plans: (pid: number) =>
    req<{ id: number; hospital: string; version: number; is_active: boolean; data: string }[]>(`/patients/${pid}/plans`),
  addPlan: (pid: number, b: object) => req<{ status: string; version: number }>(`/patients/${pid}/plans`, J(b)),
  reminders: (pid: number) =>
    req<{ id: number; message: string; scheduled_for: string; channel: string; status: string }[]>(`/patients/${pid}/reminders`),
  addReminder: (pid: number, b: object) => req(`/patients/${pid}/reminders`, J(b)),
  delReminder: (pid: number, id: number) => req(`/patients/${pid}/reminders/${id}`, { method: "DELETE" }),
  notifs: () => req<{ id: number; title: string; body: string; kind: string; read: boolean }[]>("/notifications"),
  readNotif: (id: number) => req(`/notifications/${id}/read`, J({})),
  support: (type: string, message: string) => req("/support", J({ type, message })),
};
