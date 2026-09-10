import { useEffect, useState, type ReactNode } from "react";

// Minimal kit from Sathi pixel specs: radius card 22 / pill 50, purple shadows.
export const Card = ({ children, accent }: { children: ReactNode; accent?: string }) => (
  <div className="rounded-[22px] bg-card p-4 shadow-[0_2px_8px_rgb(124_58_237/0.07)]"
    style={accent ? { borderLeft: `5px solid ${accent}` } : undefined}>{children}</div>
);

export const Btn = ({ children, onClick, kind = "primary", className = "" }: {
  children: ReactNode; onClick?: () => void; kind?: "primary" | "ghost" | "danger" | "success"; className?: string;
}) => {
  const k = {
    primary: "bg-primary text-white shadow-[0_6px_16px_rgb(108_71_255/0.35)]",
    success: "bg-success text-white", danger: "bg-danger text-white",
    ghost: "bg-secondary text-primary",
  }[kind];
  return <button onClick={onClick} className={`rounded-full px-5 py-2.5 text-sm font-bold active:scale-95 transition ${k} ${className}`}>{children}</button>;
};

export const Input = (p: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...p} className={`w-full rounded-2xl border border-border bg-muted px-4 py-3 text-sm outline-none focus:border-primary ${p.className || ""}`} />
);

export const Area = (p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea {...p} className={`w-full rounded-2xl border border-border bg-muted px-4 py-3 text-sm outline-none focus:border-primary ${p.className || ""}`} />
);

export const Badge = ({ level }: { level: string }) => {
  const m: Record<string, string> = {
    NORMAL: "bg-secondary text-primary", MONITOR: "bg-amber-100 text-amber-800",
    ESCALATE: "bg-red-100 text-red-800", high: "bg-red-100 text-red-800",
    medium: "bg-amber-100 text-amber-800", low: "bg-emerald-100 text-emerald-800",
    taken: "bg-emerald-100 text-emerald-800", active: "bg-secondary text-primary",
  };
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${m[level] ?? "bg-muted text-muted-fg"}`}>{level}</span>;
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
  <div className="grid h-16 w-16 place-items-center rounded-full bg-white/20 text-3xl">
    {mood === "concerned" ? "🧸‍⚕️" : mood === "celebrate" ? "🎉" : "🧸"}
  </div>
);

export const Page = ({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) => (
  <div className="mb-3 flex items-center justify-between">
    <div><h2 className="text-lg font-extrabold">{title}</h2>{sub && <p className="text-xs text-muted-fg">{sub}</p>}</div>
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

export const Empty = ({ text }: { text: string }) => (
  <p className="rounded-2xl bg-muted p-4 text-center text-sm text-muted-fg">{text}</p>
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
  return <div className="sticky top-0 z-50 rounded-b-2xl bg-warning px-4 py-2 text-center text-xs font-bold text-black">📴 Offline — schedules cached, doses will sync</div>;
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
