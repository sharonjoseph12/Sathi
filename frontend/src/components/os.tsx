import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { api } from "../lib/api";
import { go, useApp } from "../lib/store";
import { useAdaptiveProfile } from "../lib/useAdaptiveProfile";
import { Icon } from "./icons";

// ═══ TrustBadge — source provenance pill (icon + text, never color-only) ═
const TRUST: Record<string, { icon: string; label: string; cls: string }> = {
  doctor_confirmed: { icon: "✓", label: "Doctor confirmed", cls: "bg-emerald-100 text-emerald-900" },
  hospital_discharge: { icon: "🏥", label: "Discharge plan", cls: "bg-blue-100 text-blue-900" },
  user_confirmed: { icon: "✓", label: "Confirmed", cls: "bg-emerald-100 text-emerald-900" },
  patient_reported: { icon: "○", label: "Patient noted", cls: "bg-muted text-muted-fg" },
  caregiver_added: { icon: "💜", label: "Caregiver added", cls: "bg-purple-100 text-purple-900" },
  doctor_visit: { icon: "🩺", label: "Doctor visit", cls: "bg-teal-100 text-teal-900" },
  inbox_structured: { icon: "📥", label: "From scan — review", cls: "bg-amber-100 text-amber-900" },
};

export function TrustBadge({ source }: { source: string }) {
  const { isElder } = useAdaptiveProfile();
  const m = TRUST[source] ?? { icon: "○", label: source.replace(/_/g, " "), cls: "bg-muted text-muted-fg" };
  return (
    <span role="status" title={`Source: ${m.label}`}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold ${m.cls} ${isElder ? "text-xs" : "text-[11px]"}`}>
      <span aria-hidden="true">{m.icon}</span>{m.label}
    </span>
  );
}

// ═══ DailyItemCard — one "what matters now" row ═══════════════════════
export type DailyItem = {
  time?: string; title: string; subtitle?: string; source?: string;
  priority?: string; completed?: boolean;
};

export function DailyItemCard({ item, onDone }: { item: DailyItem; onDone?: () => void }) {
  const { isElder } = useAdaptiveProfile();
  return (
    <div className={`flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm ${item.completed ? "opacity-60" : ""}`}>
      {item.time && (
        <span className={`grid shrink-0 place-items-center rounded-xl bg-secondary font-bold text-primary ${isElder ? "h-14 w-14 text-sm" : "h-11 w-11 text-xs"}`}>
          {item.time}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className={`truncate font-semibold ${isElder ? "text-base" : "text-sm"}`}>
          {item.completed ? "✓ " : ""}{item.title}
        </p>
        {item.subtitle && <p className={`truncate text-muted-fg ${isElder ? "text-sm" : "text-xs"}`}>{item.subtitle}</p>}
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {item.source && <TrustBadge source={item.source} />}
          {item.priority && (
            <span className={`rounded-full px-2 py-0.5 font-bold ${item.priority === "high" ? "bg-red-100 text-red-900" : "bg-muted text-muted-fg"} ${isElder ? "text-xs" : "text-[10px]"}`}>
              {item.priority === "high" ? "⚠ " : ""}{item.priority}
            </span>
          )}
        </div>
      </div>
      {onDone && !item.completed && (
        <button onClick={onDone} aria-label={`Mark done: ${item.title}`}
          className={`shrink-0 rounded-xl bg-success font-bold text-white active:scale-[0.98] ${isElder ? "min-h-[56px] px-5 text-base" : "min-h-[44px] px-4 text-sm"}`}>
          Done
        </button>
      )}
    </div>
  );
}

// ═══ Modal — accessible overlay (ESC, focus, reduced-motion, print) ═══
export function Modal({ title, sub, onClose, children }: {
  title: string; sub?: string; onClose: () => void; children: ReactNode;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const { prefersReducedMotion } = useAdaptiveProfile();
  useEffect(() => { closeRef.current?.focus(); }, []);
  useEffect(() => {
    const f = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 print:static print:block print:bg-white print:p-0"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={title}
        className={`max-h-[85vh] w-full max-w-[560px] overflow-y-auto rounded-2xl border border-border bg-card p-4 shadow-xl print:max-h-none print:max-w-none print:border-0 print:shadow-none ${prefersReducedMotion ? "" : "animate-slide-up"}`}>
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold tracking-tight">{title}</h2>
            {sub && <p className="text-[13px] text-muted-fg">{sub}</p>}
          </div>
          <button ref={closeRef} onClick={onClose} aria-label="Close dialog"
            className="grid h-[44px] w-[44px] shrink-0 place-items-center rounded-full bg-secondary text-lg font-bold text-primary">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ═══ OSHeader — brand + persona + language + SOS ══════════════════════
const QUICK_LANGS = ["en", "hi", "kn", "ta", "te"];

export function OSHeader({ onEmergency }: { onEmergency?: () => void }) {
  const { me, pid, setPid, refresh } = useApp();
  const sos = () => { if (onEmergency) onEmergency(); else go("#/sos"); };
  return (
    <div className="sticky top-0 z-40 flex items-center gap-2 border-b border-border bg-card/90 px-3 py-2 backdrop-blur">
      <button aria-label="Go to Today" onClick={() => go("#/today")}
        className="flex min-h-[44px] items-center gap-2 text-[15px] font-bold tracking-tight text-ink">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-white"><Icon name="logo" size={18} /></span>
        Sathi
      </button>
      <div className="min-w-0 flex-1">
        {me && me.patients.length > 1 ? (
          <select aria-label="Select patient" value={pid} onChange={(e) => setPid(Number(e.target.value))}
            className="max-w-full rounded-full bg-secondary px-2 py-2 text-xs font-bold text-primary">
            {me.patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        ) : (
          <p className="truncate text-xs text-muted-fg">{me?.name} · {me?.role}</p>
        )}
      </div>
      <div className="flex items-center gap-1" role="group" aria-label="Language">
        {QUICK_LANGS.map((l) => (
          <button key={l} onClick={async () => { try { await api.settings({ language: l }); await refresh(); } catch { /* offline */ } }}
            aria-pressed={me?.language === l} aria-label={`Language ${l}`}
            className={`min-h-[44px] min-w-[44px] rounded-full px-2 text-xs font-bold transition-colors ${me?.language === l ? "bg-primary text-white shadow-sm" : "bg-secondary text-primary hover:bg-secondary/80"}`}>
            {l}
          </button>
        ))}
      </div>
      <button onClick={sos} aria-label="Emergency SOS"
        className="min-h-[44px] shrink-0 rounded-full bg-danger px-3 text-xs font-extrabold text-white active:scale-[0.98]">
        🆘 SOS
      </button>
    </div>
  );
}

// ═══ OSBottomNav — 5 tabs max, role-filtered, elder-capped, badged ════
const NAV: { path: string; label: string; icon: string; roles: string[] }[] = [
  { path: "#/today", label: "Today", icon: "home", roles: ["patient"] },
  { path: "#/health", label: "Health", icon: "pulse", roles: ["patient", "caregiver"] },
  { path: "#/sathi", label: "Sathi", icon: "chat", roles: ["patient", "caregiver", "family"] },
  { path: "#/family", label: "Family", icon: "users", roles: ["patient", "caregiver", "family"] },
  { path: "#/more", label: "More", icon: "grid", roles: ["patient", "caregiver", "family"] },
];

export function OSBottomNav({ todayCount = 0, alertCount = 0 }: { todayCount?: number; alertCount?: number }) {
  const { me } = useApp();
  const { maxNavItems } = useAdaptiveProfile();
  const hash = typeof location !== "undefined" ? location.hash.split("?")[0] : "";
  const role = me?.role ?? "patient";
  // Role filter first, then elder cap: elder sees the same 5, never more.
  const items = NAV.filter((t) => t.roles.includes(role)).slice(0, Math.min(5, maxNavItems));
  const badgeFor = (p: string) => (p === "#/today" ? todayCount : p === "#/family" ? alertCount : 0);
  return (
    <nav aria-label="Primary" className="glass-nav fixed bottom-0 left-1/2 w-full max-w-[600px] -translate-x-1/2 border-t border-border print:hidden">
      <div className="mb-safe-nav flex">
        {items.map((tb) => {
          const n = badgeFor(tb.path);
          const active = hash === tb.path;
          return (
            <button key={tb.path} onClick={() => go(tb.path)} aria-current={active ? "page" : undefined}
              aria-label={`${tb.label}${n > 0 ? `, ${n} pending` : ""}`}
              className={`relative flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-semibold ${active ? "text-primary" : "text-muted-fg"}`}>
              <span aria-hidden="true" className="relative">
                <Icon name={tb.icon} size={20} />
                {n > 0 && (
                  <span className="absolute -right-2 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[9px] font-extrabold text-white">
                    {n > 9 ? "9+" : n}
                  </span>
                )}
              </span>
              {tb.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// ═══ JudgeDemoBar — dismissible 3-step evaluation strip ═══════════════
export function JudgeDemoBar() {
  const [off, setOff] = useState(() => {
    try { return localStorage.getItem("@sathi_judgebar_off") === "1"; } catch { return false; }
  });
  if (off) return null;
  const dismiss = () => { try { localStorage.setItem("@sathi_judgebar_off", "1"); } catch { /* noop */ } setOff(true); };
  return (
    <div className="mb-3 flex items-center gap-2 rounded-2xl bg-primary px-3 py-2 text-white shadow-sm" role="note" aria-label="Judge demo quick steps">
      <button onClick={() => go("#/demo")} className="min-h-[44px] flex-1 truncate text-left text-xs font-bold">
        ▶ Judge demo: ① Take dose → ② Report symptom → ③ Caregiver view
      </button>
      <button onClick={dismiss} aria-label="Dismiss demo strip" className="grid h-[44px] w-[44px] shrink-0 place-items-center rounded-full bg-white/20 text-sm font-bold">
        ✕
      </button>
    </div>
  );
}
