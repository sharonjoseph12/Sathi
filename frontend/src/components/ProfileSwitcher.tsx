import { useState, useRef, useEffect } from "react";
import { UserCircle2, ChevronDown, Sliders, Check, User, HeartHandshake } from "lucide-react";
import { useApp } from "../lib/store";
import { useAdaptiveProfile, type AccessibilityFlag } from "../lib/useAdaptiveProfile";
import { cn } from "../lib/utils";

export function ProfileSwitcher({ className = "" }: { className?: string }) {
  const { adaptiveRaw, setAdaptiveProfile } = useApp();
  const profile = useAdaptiveProfile();
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleOutside);
    }
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  const setPersona = (mode: "elder" | "standard" | "caregiver") => {
    if (mode === "elder") {
      setAdaptiveProfile({
        ...adaptiveRaw,
        ageBand: "elder",
        roleOverride: "patient",
      });
    } else if (mode === "caregiver") {
      setAdaptiveProfile({
        ...adaptiveRaw,
        ageBand: "adult",
        roleOverride: "caregiver",
      });
    } else {
      setAdaptiveProfile({
        ...adaptiveRaw,
        ageBand: "adult",
        roleOverride: "patient",
      });
    }
  };

  const toggleFlag = (flag: AccessibilityFlag) => {
    const currentFlags = adaptiveRaw.accessibilityFlags || [];
    const exists = currentFlags.includes(flag);
    const newFlags = exists
      ? currentFlags.filter((f) => f !== flag)
      : [...currentFlags, flag];
    setAdaptiveProfile({
      ...adaptiveRaw,
      accessibilityFlags: newFlags,
    });
  };

  const personaLabel = profile.isElder
    ? "Elder Mode"
    : profile.isCaregiver
    ? "Caregiver"
    : "Standard";

  return (
    <div className={cn("relative inline-block text-left select-none", className)} ref={popoverRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={`Adaptive profile: ${personaLabel}`}
        className="flex min-h-[40px] items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-ink shadow-elev-1 transition-all hover:bg-surface-sunken hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95"
      >
        <span className="grid h-5 w-5 place-items-center rounded-lg bg-primary-soft text-primary">
          {profile.isElder ? <UserCircle2 className="h-3.5 w-3.5" /> : profile.isCaregiver ? <HeartHandshake className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
        </span>
        <span>{personaLabel}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-ink-muted transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Adaptive Profile Controls"
          className="absolute right-0 mt-2 w-80 origin-top-right rounded-2xl border border-border bg-surface p-3 shadow-elev-4 z-dropdown focus:outline-none animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center gap-2 border-b border-border pb-2.5 mb-2.5">
            <Sliders className="h-4 w-4 text-primary" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink">Adaptive Persona</h3>
          </div>

          {/* Mode Switcher: Elder vs Standard vs Caregiver */}
          <div className="grid grid-cols-3 gap-1.5 mb-3">
            <button
              type="button"
              onClick={() => setPersona("elder")}
              className={cn(
                "flex min-h-[42px] flex-col items-center justify-center rounded-xl p-1.5 text-xs font-semibold transition-all",
                profile.isElder
                  ? "bg-primary text-white shadow-elev-1"
                  : "bg-surface-sunken text-ink hover:bg-surface border border-border"
              )}
            >
              <span className="leading-none">Elder</span>
              <span className="text-[10px] opacity-80 mt-0.5">Assisted</span>
            </button>

            <button
              type="button"
              onClick={() => setPersona("standard")}
              className={cn(
                "flex min-h-[42px] flex-col items-center justify-center rounded-xl p-1.5 text-xs font-semibold transition-all",
                !profile.isElder && !profile.isCaregiver
                  ? "bg-primary text-white shadow-elev-1"
                  : "bg-surface-sunken text-ink hover:bg-surface border border-border"
              )}
            >
              <span className="leading-none">Standard</span>
              <span className="text-[10px] opacity-80 mt-0.5">Patient</span>
            </button>

            <button
              type="button"
              onClick={() => setPersona("caregiver")}
              className={cn(
                "flex min-h-[42px] flex-col items-center justify-center rounded-xl p-1.5 text-xs font-semibold transition-all",
                profile.isCaregiver
                  ? "bg-primary text-white shadow-elev-1"
                  : "bg-surface-sunken text-ink hover:bg-surface border border-border"
              )}
            >
              <span className="leading-none">Caregiver</span>
              <span className="text-[10px] opacity-80 mt-0.5">Clinical</span>
            </button>
          </div>

          <div className="border-t border-border pt-2.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">A11y Overrides</span>
            </div>

            <div className="grid gap-1.5">
              {[
                { flag: "voice_primary" as AccessibilityFlag, label: "Voice Primary Action" },
                { flag: "high_contrast" as AccessibilityFlag, label: "High Contrast (AAA)" },
                { flag: "large_text" as AccessibilityFlag, label: "Large Text Mode" },
                { flag: "reduced_motion" as AccessibilityFlag, label: "Reduced Motion" },
              ].map(({ flag, label }) => {
                const active = (adaptiveRaw.accessibilityFlags || []).includes(flag);
                return (
                  <button
                    key={flag}
                    type="button"
                    onClick={() => toggleFlag(flag)}
                    className={cn(
                      "flex min-h-[36px] w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-medium transition-all text-left",
                      active ? "bg-primary-soft text-primary font-bold border border-primary/30" : "text-ink hover:bg-surface-sunken border border-transparent"
                    )}
                  >
                    <span>{label}</span>
                    <span className={cn("h-4 w-4 rounded-md border flex items-center justify-center", active ? "bg-primary border-primary text-white" : "border-border bg-surface")}>
                      {active && <Check className="h-3 w-3 stroke-[3]" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
