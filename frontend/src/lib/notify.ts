// Due-dose browser notifications. No server push needed.
import { api } from "./api";

const DONE_KEY = "@sathi_notified";

function doneToday(key: string): boolean {
  try {
    const d = JSON.parse(localStorage.getItem(DONE_KEY) || "{}");
    return d[key] === new Date().toISOString().slice(0, 10);
  } catch { return false; }
}
function markDone(key: string) {
  try {
    const d = JSON.parse(localStorage.getItem(DONE_KEY) || "{}");
    d[key] = new Date().toISOString().slice(0, 10);
    localStorage.setItem(DONE_KEY, JSON.stringify(d));
  } catch { /* ignore */ }
}

function toMinutes(t: string): number | null {
  const m = t.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!m) return null;
  let h = Number(m[1]) % 12;
  if (/pm/i.test(m[3] || "")) h += 12;
  return h * 60 + Number(m[2]);
}

export async function askPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  return (await Notification.requestPermission()) === "granted";
}

// Call every minute while app open: notifies for pending doses due within ±30 min.
export async function checkDueDoses(pid: number) {
  if (!pid || !("Notification" in window) || Notification.permission !== "granted") return;
  if (localStorage.getItem("@sathi_remind_off") === "1") return;
  let doses: { medication_id: number; name: string; time: string; status: string }[] = [];
  try { doses = await api.dosesToday(pid); } catch { return; }
  const now = new Date().getHours() * 60 + new Date().getMinutes();
  for (const d of doses) {
    if (d.status !== "pending") continue;
    const mins = toMinutes(d.time);
    if (mins === null || Math.abs(now - mins) > 30) continue;
    const key = `${pid}:${d.medication_id}:${d.time}`;
    if (doneToday(key)) continue;
    markDone(key);
    try { new Notification("💊 Sathi reminder", { body: `${d.name} — ${d.time}` }); } catch { /* blocked */ }
  }
}
