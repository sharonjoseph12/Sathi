import { useEffect, useState, type ReactNode } from "react";

// Professional clinical design kit: 16px radius, 1px borders, quiet shadows.
export const Card = ({ children, accent, className = "" }: { children: ReactNode; accent?: string; className?: string }) => (
  <div className={`rounded-2xl border border-border bg-card p-4 shadow-[0_1px_2px_rgb(16_24_40/0.05)] ${className}`}
    style={accent ? { borderLeft: `3px solid ${accent}` } : undefined}>{children}</div>
);

export const Btn = ({ children, onClick, kind = "primary", className = "", label, type, disabled }: {
  children: ReactNode; onClick?: () => void; kind?: "primary" | "ghost" | "danger" | "success"; className?: string; label?: string; type?: "button" | "submit"; disabled?: boolean;
}) => {
  const k = {
    primary: "bg-primary text-white shadow-[0_1px_2px_rgb(16_24_40/0.12)] hover:brightness-105",
    success: "bg-success text-white", danger: "bg-danger text-white",
    ghost: "border border-border bg-card text-ink hover:bg-muted",
  }[kind];
  return <button type={type || "button"} aria-label={label} disabled={disabled} onClick={onClick} className={`min-h-[44px] rounded-xl px-5 py-2.5 text-sm font-semibold active:scale-[0.98] transition disabled:opacity-50 ${k} ${className}`}>{children}</button>;
};

export const Input = (p: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...p} className={`min-h-[44px] w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-ink placeholder:text-muted-fg outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 ${p.className || ""}`} />
);

export const Area = (p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea {...p} className={`w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-ink placeholder:text-muted-fg outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 ${p.className || ""}`} />
);

export const Badge = ({ level }: { level: string }) => {
  const m: Record<string, string> = {
    NORMAL: "bg-secondary text-primary", MONITOR: "bg-amber-100 text-amber-900",
    ESCALATE: "bg-red-100 text-red-900", high: "bg-red-100 text-red-900",
    medium: "bg-amber-100 text-amber-900", low: "bg-emerald-100 text-emerald-900",
    taken: "bg-emerald-100 text-emerald-900", active: "bg-secondary text-primary",
  };
  const icon = level === "ESCALATE" || level === "high" ? "⚠ " : level === "MONITOR" ? "● " : "";
  return <span role="status" className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${m[level] ?? "bg-muted text-muted-fg"}`}>{icon}{level}</span>;
};

export const Ring = ({ pct, size = 84 }: { pct: number; size?: number }) => {
  const sw = 9, r = (size - sw) / 2, c = 2 * Math.PI * r;
  const col = pct >= 80 ? "#10B981" : pct >= 50 ? "#F59E0B" : "#EF4444";
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke={`${col}22`} strokeWidth={sw} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={col} strokeWidth={sw} fill="none"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (c * pct) / 100}
          style={{ transition: "stroke-dashoffset 1s" }} />
      </svg>
      <div className="absolute text-center">
        <div className="text-lg font-extrabold leading-none">{pct}%</div>
        <div className="text-[10px] text-muted-fg">taken</div>
      </div>
    </div>
  );
};

export const Mascot = ({ mood = "happy" }: { mood?: "happy" | "concerned" | "celebrate" }) => (
  <div className={`grid h-12 w-12 place-items-center rounded-full text-sm font-bold ${mood === "concerned" ? "bg-red-100 text-red-800" : "bg-secondary text-primary"}`}>
    S
  </div>
);

export const Avatar = ({ name }: { name: string }) => {
  const initials = name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "S";
  return <div aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-white">{initials}</div>;
};

export const SectionLabel = ({ children }: { children: ReactNode }) => (
  <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-fg">{children}</p>
);

export const Page = ({ title, sub, right, eyebrow }: { title: string; sub?: string; right?: ReactNode; eyebrow?: string }) => (
  <div className="mb-4 flex items-start justify-between gap-3">
    <div>
      {eyebrow && <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-primary">{eyebrow}</p>}
      <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      {sub && <p className="mt-0.5 text-[13px] text-muted-fg">{sub}</p>}
    </div>
    {right}
  </div>
);

export const Seg = <T extends string>({ opts, val, set }: { opts: T[]; val: T; set: (t: T) => void }) => (
  <div className="mb-3 flex gap-1.5 overflow-x-auto">
    {opts.map((o) => (
      <button key={o} onClick={() => set(o)}
        className={`rounded-full px-3 py-1.5 text-xs font-bold capitalize ${val === o ? "bg-primary text-white" : "bg-secondary text-primary"}`}>{o}</button>
    ))}
  </div>
);

export const Empty = ({ text, title }: { text: string; title?: string }) => (
  <div className="rounded-2xl border border-dashed border-border bg-muted/50 p-6 text-center">
    {title && <p className="text-sm font-semibold">{title}</p>}
    <p className="mt-1 text-[13px] text-muted-fg">{text}</p>
  </div>
);

// Jargon toggle (VAni MedicineCard switch): plain ↔ original wording
export const Toggle = ({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) => (
  <button onClick={onClick} className="flex items-center gap-2 text-xs font-bold text-primary">
    <span className={`relative h-5 w-9 rounded-full transition ${on ? "bg-primary" : "bg-border"}`}>
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
    </span>{label}
  </button>
);

// Offline banner (VAni OfflineBanner, minimal)
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

// Confetti burst (VAni SuccessBurst, CSS-only)
const COLORS = ["#7C3AED", "#A78BFA", "#10B981", "#F59E0B", "#EF4444", "#F9A8D4"];
export const Confetti = ({ fire }: { fire: number }) => {
  const [pieces, setPieces] = useState<{ l: number; c: string; d: number; r: number; w: number }[]>([]);
  useEffect(() => {
    if (!fire) return;
    setPieces(Array.from({ length: 28 }, () => ({
      l: Math.random() * 100, c: COLORS[Math.floor(Math.random() * COLORS.length)],
      d: 1 + Math.random() * 1.2, r: Math.random() * 360, w: 6 + Math.random() * 6,
    })));
    const t = setTimeout(() => setPieces([]), 2400);
    return () => clearTimeout(t);
  }, [fire]);
  return <>{pieces.map((p, i) => (
    <span key={`${fire}-${i}`} className="confetti-piece" style={{
      left: `${p.l}%`, background: p.c, width: p.w, height: p.w * 0.6,
      animationDuration: `${p.d}s`, transform: `rotate(${p.r}deg)`, borderRadius: 2,
    }} />
  ))}</>;
};
