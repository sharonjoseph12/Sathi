import { useEffect, useState, type ReactNode } from "react";
import { useAdaptiveProfile } from "../lib/useAdaptiveProfile";

// ═══ Card ═══════════════════════════════════════════════════════════
// Elder: larger padding, bolder border. Caregiver: compact. Standard: current.
export const Card = ({ children, accent, className = "" }: { children: ReactNode; accent?: string; className?: string }) => {
  const { isElder, isCaregiver } = useAdaptiveProfile();
  const pad = isElder ? "p-5" : isCaregiver ? "p-3" : "p-4";
  const border = isElder ? "border-2" : "border";
  return (
    <div className={`rounded-2xl ${border} border-border bg-card ${pad} shadow-[0_1px_2px_rgb(16_24_40/0.05)] ${className}`}
      style={accent ? { borderLeft: `3px solid ${accent}` } : undefined}>{children}</div>
  );
};

// ═══ Btn ════════════════════════════════════════════════════════════
// Elder: taller (56px), larger text, wider padding. Standard: 44px.
export const Btn = ({ children, onClick, kind = "primary", className = "", label, type, disabled }: {
  children: ReactNode; onClick?: () => void; kind?: "primary" | "ghost" | "danger" | "success"; className?: string; label?: string; type?: "button" | "submit"; disabled?: boolean;
}) => {
  const { isElder } = useAdaptiveProfile();
  const k = {
    primary: "bg-primary text-white shadow-[0_1px_2px_rgb(16_24_40/0.12)] hover:brightness-105",
    success: "bg-success text-white", danger: "bg-danger text-white",
    ghost: "border border-border bg-card text-ink hover:bg-muted",
  }[kind];
  const size = isElder
    ? "min-h-[56px] rounded-xl px-6 py-3 text-base font-bold"
    : "min-h-[44px] rounded-xl px-5 py-2.5 text-sm font-semibold";
  return <button type={type || "button"} aria-label={label} disabled={disabled} onClick={onClick} className={`${size} active:scale-[0.98] transition disabled:opacity-50 ${k} ${className}`}>{children}</button>;
};

// ═══ Input ══════════════════════════════════════════════════════════
// Elder: taller, larger text and placeholder.
export const Input = (p: React.InputHTMLAttributes<HTMLInputElement>) => {
  const { isElder } = useAdaptiveProfile();
  const size = isElder
    ? "min-h-[56px] text-lg placeholder:text-base"
    : "min-h-[44px] text-sm placeholder:text-sm";
  return (
    <input {...p} className={`w-full rounded-xl border border-border bg-card px-4 py-2.5 text-ink placeholder:text-muted-fg outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 ${size} ${p.className || ""}`} />
  );
};

// ═══ Area ═══════════════════════════════════════════════════════════
export const Area = (p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => {
  const { isElder } = useAdaptiveProfile();
  const size = isElder ? "text-lg" : "text-sm";
  return (
    <textarea {...p} className={`w-full rounded-xl border border-border bg-card px-4 py-3 ${size} text-ink placeholder:text-muted-fg outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 ${p.className || ""}`} />
  );
};

// ═══ Badge ══════════════════════════════════════════════════════════
// Always keeps icon + text (never color-only). Elder: slightly larger text.
export const Badge = ({ level }: { level: string }) => {
  const { isElder } = useAdaptiveProfile();
  const m: Record<string, string> = {
    NORMAL: "bg-secondary text-primary", MONITOR: "bg-amber-100 text-amber-900",
    ESCALATE: "bg-red-100 text-red-900", high: "bg-red-100 text-red-900",
    medium: "bg-amber-100 text-amber-900", low: "bg-emerald-100 text-emerald-900",
    taken: "bg-emerald-100 text-emerald-900", active: "bg-secondary text-primary",
  };
  const icon = level === "ESCALATE" || level === "high" ? "⚠ " : level === "MONITOR" ? "● " : "";
  const textSize = isElder ? "text-xs font-bold" : "text-[11px] font-semibold";
  return <span role="status" className={`rounded-full px-2.5 py-1 ${textSize} ${m[level] ?? "bg-muted text-muted-fg"}`}>{icon}{level}</span>;
};

// ═══ Ring ═══════════════════════════════════════════════════════════
// Elder: larger default size, thicker stroke. Reduced-motion: no stroke animation.
export const Ring = ({ pct, size: sizeProp }: { pct: number; size?: number }) => {
  const { isElder, prefersReducedMotion } = useAdaptiveProfile();
  const size = sizeProp ?? (isElder ? 100 : 84);
  const sw = isElder ? 11 : 9;
  const r = (size - sw) / 2, c = 2 * Math.PI * r;
  const col = pct >= 80 ? "#10B981" : pct >= 50 ? "#F59E0B" : "#EF4444";
  const textSize = isElder ? "text-xl" : "text-lg";
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke={`${col}22`} strokeWidth={sw} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={col} strokeWidth={sw} fill="none"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (c * pct) / 100}
          style={prefersReducedMotion ? undefined : { transition: "stroke-dashoffset 1s" }} />
      </svg>
      <div className="absolute text-center">
        <div className={`${textSize} font-extrabold leading-none`}>{pct}%</div>
        <div className="text-[10px] text-muted-fg">taken</div>
      </div>
    </div>
  );
};

// ═══ Mascot ═════════════════════════════════════════════════════════
export const Mascot = ({ mood = "happy" }: { mood?: "happy" | "concerned" | "celebrate" }) => (
  <div className={`grid h-12 w-12 place-items-center rounded-full text-sm font-bold ${mood === "concerned" ? "bg-red-100 text-red-800" : "bg-secondary text-primary"}`}>
    S
  </div>
);

// ═══ Avatar ═════════════════════════════════════════════════════════
export const Avatar = ({ name }: { name: string }) => {
  const initials = name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "S";
  return <div aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-white">{initials}</div>;
};

// ═══ SectionLabel ═══════════════════════════════════════════════════
export const SectionLabel = ({ children }: { children: ReactNode }) => {
  const { isElder } = useAdaptiveProfile();
  const size = isElder ? "text-xs" : "text-[11px]";
  return <p className={`mb-2 ${size} font-bold uppercase tracking-[0.08em] text-muted-fg`}>{children}</p>;
};

// ═══ Page Header ════════════════════════════════════════════════════
export const Page = ({ title, sub, right, eyebrow }: { title: string; sub?: string; right?: ReactNode; eyebrow?: string }) => {
  const { isElder } = useAdaptiveProfile();
  const titleSize = isElder ? "text-2xl" : "text-xl";
  const subSize = isElder ? "text-sm" : "text-[13px]";
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        {eyebrow && <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-primary">{eyebrow}</p>}
        <h2 className={`${titleSize} font-bold tracking-tight`}>{title}</h2>
        {sub && <p className={`mt-0.5 ${subSize} text-muted-fg`}>{sub}</p>}
      </div>
      {right}
    </div>
  );
};

// ═══ Segment tabs ═══════════════════════════════════════════════════
export const Seg = <T extends string>({ opts, val, set }: { opts: T[]; val: T; set: (t: T) => void }) => {
  const { isElder } = useAdaptiveProfile();
  const btnSize = isElder ? "px-4 py-2 text-sm" : "px-3 py-1.5 text-xs";
  return (
    <div className="mb-3 flex gap-1.5 overflow-x-auto">
      {opts.map((o) => (
        <button key={o} onClick={() => set(o)}
          className={`rounded-full ${btnSize} font-bold capitalize ${val === o ? "bg-primary text-white" : "bg-secondary text-primary"}`}>{o}</button>
      ))}
    </div>
  );
};

// ═══ Empty state ════════════════════════════════════════════════════
export const Empty = ({ text, title }: { text: string; title?: string }) => (
  <div className="rounded-2xl border border-dashed border-border bg-muted/50 p-6 text-center">
    {title && <p className="text-sm font-semibold">{title}</p>}
    <p className="mt-1 text-[13px] text-muted-fg">{text}</p>
  </div>
);

// ═══ Toggle ═════════════════════════════════════════════════════════
// Elder: larger hit target, bolder label.
export const Toggle = ({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) => {
  const { isElder } = useAdaptiveProfile();
  const trackSize = isElder ? "h-7 w-12" : "h-5 w-9";
  const thumbSize = isElder ? "h-5 w-5" : "h-4 w-4";
  const thumbOn = isElder ? "left-[26px]" : "left-[18px]";
  const labelSize = isElder ? "text-sm font-bold" : "text-xs font-bold";
  return (
    <button onClick={onClick} className={`flex items-center gap-2 ${labelSize} text-primary`}>
      <span className={`relative ${trackSize} rounded-full transition ${on ? "bg-primary" : "bg-border"}`}>
        <span className={`absolute top-0.5 ${thumbSize} rounded-full bg-white shadow transition-all ${on ? thumbOn : "left-0.5"}`} />
      </span>{label}
    </button>
  );
};

// ═══ Offline banner ═════════════════════════════════════════════════
export const OfflineBanner = () => {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const f = () => setOnline(navigator.onLine);
    window.addEventListener("online", f); window.addEventListener("offline", f);
    return () => { window.removeEventListener("online", f); window.removeEventListener("offline", f); };
  }, []);
  if (online) return null;
  return <div role="alert" className="sticky top-0 z-50 rounded-b-2xl bg-warning px-4 py-2 text-center text-xs font-bold text-black">📴 Offline — schedules cached, doses will sync</div>;
};

// ═══ Confetti ═══════════════════════════════════════════════════════
// Reduced-motion: shows a static ✓ checkmark instead of particle animation.
const COLORS = ["#7C3AED", "#A78BFA", "#10B981", "#F59E0B", "#EF4444", "#F9A8D4"];
export const Confetti = ({ fire }: { fire: number }) => {
  const { prefersReducedMotion } = useAdaptiveProfile();
  const [pieces, setPieces] = useState<{ l: number; c: string; d: number; r: number; w: number }[]>([]);
  useEffect(() => {
    if (!fire) return;
    if (prefersReducedMotion) return; // skip animation
    setPieces(Array.from({ length: 28 }, () => ({
      l: Math.random() * 100, c: COLORS[Math.floor(Math.random() * COLORS.length)],
      d: 1 + Math.random() * 1.2, r: Math.random() * 360, w: 6 + Math.random() * 6,
    })));
    const t = setTimeout(() => setPieces([]), 2400);
    return () => clearTimeout(t);
  }, [fire, prefersReducedMotion]);

  // Reduced-motion fallback: a brief checkmark
  if (prefersReducedMotion && fire) {
    return <div className="fixed inset-0 z-60 grid place-items-center pointer-events-none" aria-live="polite">
      <span className="text-5xl">✓</span>
    </div>;
  }

  return <>{pieces.map((p, i) => (
    <span key={`${fire}-${i}`} className="confetti-piece" style={{
      left: `${p.l}%`, background: p.c, width: p.w, height: p.w * 0.6,
      animationDuration: `${p.d}s`, transform: `rotate(${p.r}deg)`, borderRadius: 2,
    }} />
  ))}</>;
};
