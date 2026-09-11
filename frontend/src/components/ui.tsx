import { useEffect, useState, type ReactNode } from "react";
import { useAdaptiveProfile } from "../lib/useAdaptiveProfile";
import { Check, AlertTriangle, AlertCircle, Info } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Toaster } from "sonner";
import { cn } from "../lib/utils";

export { Toaster as SonnerToaster };

// ═══ Card ═══════════════════════════════════════════════════════════
// Spatial Elevation System:
// Resting cards: --elev-1. Interactive cards: --elev-2 with hover/focus lift to --elev-3.
export const Card = ({
  children,
  accent,
  interactive = false,
  className = "",
  onClick,
  ...rest
}: {
  children: ReactNode;
  accent?: string;
  interactive?: boolean;
  className?: string;
  onClick?: () => void;
} & React.HTMLAttributes<HTMLDivElement>) => {
  const { isElder, isCaregiver } = useAdaptiveProfile();
  const pad = isElder ? "p-5" : isCaregiver ? "p-3.5" : "p-4";
  const border = isElder ? "border-2 border-border" : "border border-border";
  const elevation = interactive
    ? "shadow-elev-2 hover:shadow-elev-3 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] cursor-pointer transition-all duration-200"
    : "shadow-elev-1";

  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-2xl bg-surface text-ink transition-colors",
        border,
        pad,
        elevation,
        className
      )}
      style={accent ? { borderLeft: `4px solid ${accent}` } : undefined}
      {...rest}
    >
      {children}
    </div>
  );
};

// ═══ Btn ════════════════════════════════════════════════════════════
// Touch Targets: ≥44×44px (standard), ≥56×56px (elder mode).
export const Btn = ({
  children,
  onClick,
  kind = "primary",
  className = "",
  label,
  type = "button",
  disabled,
  icon: IconComp,
}: {
  children: ReactNode;
  onClick?: () => void;
  kind?: "primary" | "ghost" | "danger" | "success" | "ai";
  className?: string;
  label?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  icon?: LucideIcon;
}) => {
  const { isElder } = useAdaptiveProfile();

  const variantStyles = {
    primary:
      "bg-primary text-white shadow-elev-1 hover:brightness-110 active:brightness-95 border border-transparent",
    ai: "bg-ai text-white shadow-elev-2 hover:brightness-110 active:brightness-95 border border-transparent",
    success:
      "bg-success text-white shadow-elev-1 hover:brightness-105 active:brightness-95 border border-transparent",
    danger:
      "bg-danger text-white shadow-elev-1 hover:brightness-105 active:brightness-95 border border-transparent",
    ghost:
      "border border-border bg-surface text-ink hover:bg-surface-sunken active:scale-[0.99]",
  }[kind];

  const sizeStyles = isElder
    ? "min-h-[56px] min-w-[56px] rounded-2xl px-6 py-3.5 text-lg font-bold"
    : "min-h-[44px] min-w-[44px] rounded-xl px-5 py-2.5 text-sm font-semibold";

  return (
    <button
      type={type}
      aria-label={label || (typeof children === "string" ? children : undefined)}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center gap-2 text-center transition-all duration-150 select-none",
        "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary focus-visible:ring-offset-2",
        "disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98]",
        sizeStyles,
        variantStyles,
        className
      )}
    >
      {IconComp && <IconComp className={isElder ? "h-6 w-6" : "h-4 w-4"} aria-hidden="true" />}
      <span>{children}</span>
    </button>
  );
};

// ═══ Input ══════════════════════════════════════════════════════════
export const Input = ({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) => {
  const { isElder } = useAdaptiveProfile();
  const sizeStyles = isElder
    ? "min-h-[56px] text-lg px-4 py-3 placeholder:text-base rounded-2xl border-2"
    : "min-h-[44px] text-sm px-3.5 py-2.5 placeholder:text-sm rounded-xl border";

  return (
    <input
      {...props}
      className={cn(
        "w-full bg-surface text-ink placeholder:text-ink-muted border-border outline-none transition-all",
        "focus:border-primary focus:ring-2 focus:ring-primary/20",
        sizeStyles,
        className
      )}
    />
  );
};

// ═══ Area (Textarea) ════════════════════════════════════════════════
export const Area = ({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => {
  const { isElder } = useAdaptiveProfile();
  const sizeStyles = isElder
    ? "text-lg p-4 rounded-2xl border-2"
    : "text-sm p-3.5 rounded-xl border";

  return (
    <textarea
      {...props}
      className={cn(
        "w-full bg-surface text-ink placeholder:text-ink-muted border-border outline-none transition-all",
        "focus:border-primary focus:ring-2 focus:ring-primary/20",
        sizeStyles,
        className
      )}
    />
  );
};

// ═══ Badge ══════════════════════════════════════════════════════════
// AAA Rule: Never convey meaning by color alone. Every badge has an icon + label.
export const Badge = ({
  level,
  className,
}: {
  level: string;
  className?: string;
}) => {
  const { isElder } = useAdaptiveProfile();
  const upper = level.toUpperCase();

  let styles = "bg-surface-sunken text-ink border border-border";
  let IconComponent: LucideIcon = Info;

  if (upper === "ESCALATE" || upper === "HIGH" || upper === "DANGER") {
    styles = "bg-danger-bg text-danger border border-danger/30 font-bold";
    IconComponent = AlertCircle;
  } else if (upper === "MONITOR" || upper === "MEDIUM" || upper === "WARNING") {
    styles = "bg-warning-bg text-warning border border-warning/30 font-bold";
    IconComponent = AlertTriangle;
  } else if (upper === "NORMAL" || upper === "LOW" || upper === "TAKEN" || upper === "SUCCESS") {
    styles = "bg-success-bg text-success border border-success/30 font-semibold";
    IconComponent = Check;
  } else if (upper === "ACTIVE" || upper === "INFO") {
    styles = "bg-primary-soft text-primary border border-primary/20 font-semibold";
    IconComponent = Info;
  }

  return (
    <span
      role="status"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 select-none",
        isElder ? "text-sm" : "text-xs",
        styles,
        className
      )}
    >
      <IconComponent className={isElder ? "h-4 w-4" : "h-3.5 w-3.5"} aria-hidden="true" />
      <span>{level}</span>
    </span>
  );
};

// ═══ Ring (Adherence Progress) ══════════════════════════════════════
// Dark/light mode re-theming using currentColor & CSS variables.
export const Ring = ({
  pct,
  size: sizeProp,
}: {
  pct: number;
  size?: number;
}) => {
  const { isElder, prefersReducedMotion } = useAdaptiveProfile();
  const size = sizeProp ?? (isElder ? 104 : 88);
  const strokeWidth = isElder ? 12 : 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (circumference * Math.min(Math.max(pct, 0), 100)) / 100;

  // Semantic accessible color token based on score
  const strokeColorClass =
    pct >= 80 ? "text-success" : pct >= 50 ? "text-warning" : "text-danger";

  return (
    <div
      className="relative grid shrink-0 place-items-center select-none"
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Recovery adherence: ${pct}%`}
    >
      <svg width={size} height={size} className="-rotate-90">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="text-surface-sunken"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Fill */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className={strokeColorClass}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={
            prefersReducedMotion
              ? undefined
              : { transition: "stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)" }
          }
        />
      </svg>
      <div className="absolute text-center flex flex-col items-center justify-center">
        <span
          className={cn(
            "font-extrabold tracking-tight text-ink tabular-nums",
            isElder ? "text-2xl" : "text-xl"
          )}
        >
          {pct}%
        </span>
        <span className="text-[10px] font-medium uppercase tracking-wider text-ink-muted">
          taken
        </span>
      </div>
    </div>
  );
};

// ═══ Toggle ═════════════════════════════════════════════════════════
export const Toggle = ({
  on,
  onClick,
  label,
}: {
  on: boolean;
  onClick: () => void;
  label: string;
}) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
      className="flex min-h-[44px] w-full items-center justify-between gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl px-1"
    >
      <span className="text-sm font-semibold text-ink">{label}</span>
      <span
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out",
          on ? "bg-primary" : "bg-surface-sunken border-border"
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out",
            on ? "translate-x-5" : "translate-x-0"
          )}
        />
      </span>
    </button>
  );
};

// ═══ Avatar ═════════════════════════════════════════════════════════
export const Avatar = ({ name, size = 44 }: { name: string; size?: number }) => {
  const initials =
    name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "P";
  return (
    <div
      style={{ width: size, height: size }}
      className="shrink-0 rounded-2xl bg-primary text-white font-bold text-sm grid place-items-center shadow-sm"
      aria-hidden="true"
    >
      {initials}
    </div>
  );
};

// ═══ Page Header ════════════════════════════════════════════════════
export const Page = ({
  title,
  sub,
  action,
  right,
}: {
  title: string;
  sub?: string;
  action?: ReactNode;
  right?: ReactNode;
}) => {
  const { isElder } = useAdaptiveProfile();
  const act = action || right;
  return (
    <header className="flex items-start justify-between gap-4 pb-2">
      <div>
        <h1
          className={cn(
            "font-bold tracking-tight text-ink",
            isElder ? "text-2xl leading-8" : "text-xl leading-7"
          )}
        >
          {title}
        </h1>
        {sub && (
          <p
            className={cn(
              "mt-0.5 text-ink-muted leading-relaxed",
              isElder ? "text-base font-medium" : "text-xs"
            )}
          >
            {sub}
          </p>
        )}
      </div>
      {act && <div className="shrink-0">{act}</div>}
    </header>
  );
};

// ═══ SectionLabel ═══════════════════════════════════════════════════
export const SectionLabel = ({ children }: { children: ReactNode }) => (
  <h2 className="text-[13px] font-semibold text-ink-muted uppercase tracking-wider mb-2">
    {children}
  </h2>
);

// ═══ Empty State ════════════════════════════════════════════════════
export const Empty = ({
  text,
  title,
  icon: IconComponent = Info,
}: {
  text: string;
  title?: string;
  icon?: LucideIcon;
}) => (
  <div className="flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-dashed border-border bg-surface/50">
    <IconComponent className="h-8 w-8 text-ink-muted mb-2 opacity-50" aria-hidden="true" />
    {title && <p className="font-bold text-ink mb-1">{title}</p>}
    <p className="text-sm font-medium text-ink-muted">{text}</p>
  </div>
);

// ═══ Confetti Celebration (with Reduced-Motion fallback) ════════════
export const Confetti = ({ fire }: { fire: number }) => {
  const { prefersReducedMotion } = useAdaptiveProfile();
  const [showStatic, setShowStatic] = useState(false);

  useEffect(() => {
    if (!fire) return;
    if (prefersReducedMotion) {
      setShowStatic(true);
      const t = setTimeout(() => setShowStatic(false), 3000);
      return () => clearTimeout(t);
    }
  }, [fire, prefersReducedMotion]);

  if (showStatic) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed top-20 left-1/2 -translate-x-1/2 z-toast rounded-2xl bg-success text-white px-6 py-3 shadow-elev-3 font-bold text-sm flex items-center gap-2"
      >
        <Check className="h-5 w-5" /> 100% adherence today! Great recovery progress!
      </div>
    );
  }

  return null;
};

// ═══ Seg (Segmented Control) ════════════════════════════════════════
export const Seg = ({
  opts,
  val,
  set,
}: {
  opts: string[];
  val: string;
  set: (v: string) => void;
}) => (
  <div className="flex gap-1 rounded-2xl border border-border bg-surface-sunken p-1 overflow-x-auto">
    {opts.map((o) => (
      <button
        key={o}
        type="button"
        onClick={() => set(o)}
        className={cn(
          "min-h-[38px] flex-1 rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all",
          val === o
            ? "bg-surface text-ink shadow-elev-1 font-bold"
            : "text-ink-muted hover:text-ink"
        )}
      >
        {o}
      </button>
    ))}
  </div>
);

// ═══ Offline Banner ═════════════════════════════════════════════════
export const OfflineBanner = () => {
  const [offline, setOffline] = useState(!navigator.onLine);
  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (!offline) return null;
  return (
    <div
      role="alert"
      className="bg-warning text-white px-4 py-2 text-center text-xs font-bold shadow-elev-2 flex items-center justify-center gap-2"
    >
      <AlertTriangle className="h-4 w-4" />
      <span>Offline mode active. Your health logs and doses are saved locally and will sync once connected.</span>
    </div>
  );
};
