/**
 * Onboarding — profile capture flow (Dev 1 owned).
 *
 * Designed for caregiver-assisted setup per the product brief:
 * most elderly users won't self-onboard, so a family member sets it up.
 *
 * Steps:
 * 1. Role selection (patient / guardian / caregiver)
 * 2. Age band (elder / adult / young_adult / guardian-for-child)
 * 3. Digital comfort level
 * 4. Accessibility preferences
 * 5. Patient details (name, phone, condition, age)
 */

import { useState } from "react";
import { api } from "../lib/api";
import { go, useApp } from "../lib/store";
import { Btn, Card, Input } from "../components/ui";
import { Icon } from "../components/icons";
import type { AgeBand, DigitalLiteracy, AccessibilityFlag, AdaptiveProfileRaw } from "../lib/useAdaptiveProfile";

type Step = "age" | "comfort" | "access" | "details";
const STEPS: Step[] = ["age", "comfort", "access", "details"];

// ── Age band selection ───────────────────────────────────────────────

const AGE_OPTIONS: { value: AgeBand; label: string; desc: string; emoji: string }[] = [
  { value: "elder",       label: "Elder (60+)",       desc: "Large buttons, simple navigation",           emoji: "👴" },
  { value: "adult",       label: "Adult (25–59)",     desc: "Balanced detail and speed",                   emoji: "🧑" },
  { value: "young_adult", label: "Young adult (18–24)", desc: "Fast, compact, modern feel",                emoji: "🧑‍🎓" },
  { value: "guardian",    label: "Guardian (for a child)", desc: "Managing a child's health profile",      emoji: "👶" },
];

function StepAge({ ageBand, set }: { ageBand: AgeBand; set: (v: AgeBand) => void }) {
  return (
    <div className="grid gap-3">
      <h2 className="text-lg font-bold tracking-tight">Who is this profile for?</h2>
      <p className="text-[13px] text-muted-fg">This helps Sathi adapt its interface — larger buttons, simpler words, or a compact view.</p>
      <div className="grid gap-2">
        {AGE_OPTIONS.map((o) => (
          <button key={o.value} onClick={() => set(o.value)}
            className={`flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition ${
              ageBand === o.value ? "border-primary bg-secondary" : "border-border bg-card hover:border-primary/30"
            }`}>
            <span className="text-2xl" aria-hidden="true">{o.emoji}</span>
            <span>
              <span className="block text-sm font-bold">{o.label}</span>
              <span className="block text-xs text-muted-fg">{o.desc}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Digital comfort ──────────────────────────────────────────────────

const COMFORT_OPTIONS: { value: DigitalLiteracy; label: string; desc: string }[] = [
  { value: "low",    label: "Not very comfortable", desc: "I need help using phone apps" },
  { value: "medium", label: "Somewhat comfortable",  desc: "I use a few apps daily" },
  { value: "high",   label: "Very comfortable",      desc: "I'm confident with technology" },
];

function StepComfort({ literacy, set }: { literacy: DigitalLiteracy; set: (v: DigitalLiteracy) => void }) {
  return (
    <div className="grid gap-3">
      <h2 className="text-lg font-bold tracking-tight">How comfortable are you with phone apps?</h2>
      <p className="text-[13px] text-muted-fg">No wrong answer — this helps us keep things simple or give you more control.</p>
      <div className="grid gap-2">
        {COMFORT_OPTIONS.map((o) => (
          <button key={o.value} onClick={() => set(o.value)}
            className={`rounded-2xl border-2 p-4 text-left transition ${
              literacy === o.value ? "border-primary bg-secondary" : "border-border bg-card hover:border-primary/30"
            }`}>
            <span className="block text-sm font-bold">{o.label}</span>
            <span className="block text-xs text-muted-fg">{o.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Accessibility preferences ────────────────────────────────────────

const ACCESS_OPTIONS: { value: AccessibilityFlag; label: string; desc: string }[] = [
  { value: "large_text",      label: "Larger text",          desc: "Increase text size throughout the app" },
  { value: "high_contrast",   label: "High contrast",        desc: "Stronger colors, clearer boundaries" },
  { value: "voice_primary",   label: "Voice-first",          desc: "Prefer speaking over typing" },
  { value: "reduced_motion",  label: "Reduce animations",    desc: "Fewer moving elements on screen" },
];

function StepAccess({ flags, toggle }: { flags: AccessibilityFlag[]; toggle: (f: AccessibilityFlag) => void }) {
  return (
    <div className="grid gap-3">
      <h2 className="text-lg font-bold tracking-tight">Accessibility preferences</h2>
      <p className="text-[13px] text-muted-fg">Select any that help. You can change these later in Settings.</p>
      <div className="grid gap-2">
        {ACCESS_OPTIONS.map((o) => {
          const on = flags.includes(o.value);
          return (
            <button key={o.value} onClick={() => toggle(o.value)}
              className={`flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition ${
                on ? "border-primary bg-secondary" : "border-border bg-card hover:border-primary/30"
              }`}>
              <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 text-xs font-bold transition ${
                on ? "border-primary bg-primary text-white" : "border-border bg-card"
              }`}>{on ? "✓" : ""}</span>
              <span>
                <span className="block text-sm font-bold">{o.label}</span>
                <span className="block text-xs text-muted-fg">{o.desc}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Patient details (kept from original onboarding) ──────────────────

function StepDetails({ f, set, msg, busy }: {
  f: { name: string; phone: string; condition: string; age: string };
  set: (k: string, v: string) => void;
  msg: string;
  busy: boolean;
}) {
  return (
    <div className="grid gap-3">
      <h2 className="text-lg font-bold tracking-tight">Recovery profile</h2>
      <p className="text-[13px] text-muted-fg">One profile per patient. Caregivers join later with a link code.</p>
      <Input placeholder="Patient name" value={f.name} onChange={(e) => set("name", e.target.value)} />
      <Input placeholder="Phone" value={f.phone} onChange={(e) => set("phone", e.target.value)} />
      <Input placeholder="Condition (e.g. post-surgery recovery)" value={f.condition} onChange={(e) => set("condition", e.target.value)} />
      <Input placeholder="Age" value={f.age} onChange={(e) => set("age", e.target.value)} />
      {msg && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs font-semibold text-red-800">{msg}</p>}
      {busy && <p className="text-xs text-muted-fg">Setting up your profile…</p>}
    </div>
  );
}

// ── Main Onboarding component ────────────────────────────────────────

export function Onboarding() {
  const { me, refresh, setPid, setAdaptiveProfile } = useApp();
  const [step, setStep] = useState<Step>("age");
  const stepIdx = STEPS.indexOf(step);

  // Adaptive profile fields
  const [ageBand, setAgeBand] = useState<AgeBand>("adult");
  const [literacy, setLiteracy] = useState<DigitalLiteracy>("medium");
  const [flags, setFlags] = useState<AccessibilityFlag[]>([]);
  const toggleFlag = (f: AccessibilityFlag) =>
    setFlags((prev) => prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]);

  // Patient details
  const [details, setDetails] = useState({ name: me?.name || "", phone: "", condition: "", age: "62" });
  const setDetail = (k: string, v: string) => setDetails((p) => ({ ...p, [k]: v }));
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  // Auto-set elder accessibility defaults
  const handleAgeBand = (v: AgeBand) => {
    setAgeBand(v);
    if (v === "elder") {
      // Pre-select sensible defaults for elders
      setFlags((prev) => {
        const s = new Set(prev);
        s.add("large_text");
        s.add("high_contrast");
        return [...s];
      });
      setLiteracy("low");
    }
  };

  const next = () => {
    if (stepIdx < STEPS.length - 1) setStep(STEPS[stepIdx + 1]);
  };
  const back = () => {
    if (stepIdx > 0) setStep(STEPS[stepIdx - 1]);
  };

  const submit = async () => {
    setBusy(true);
    setMsg("");

    // 1. Save adaptive profile to localStorage (and context)
    const raw: AdaptiveProfileRaw = {
      ageBand,
      digitalLiteracy: literacy,
      urgencyLevel: "normal",
      accessibilityFlags: flags,
    };
    setAdaptiveProfile(raw);

    // 2. Apply elder class to document immediately
    document.documentElement.classList.toggle("elder", ageBand === "elder" || flags.includes("high_contrast"));
    document.documentElement.classList.toggle("reduced-motion", flags.includes("reduced_motion"));

    // 3. Create patient profile via API
    try {
      const p = await api.createPatient({ ...details, age: Number(details.age) || 0 });
      setPid(p.id);
      await refresh();
      go("#/home");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const isLastStep = step === "details";
  const canSkipToHome = me?.role !== "patient";

  return (
    <div className="mx-auto grid max-w-[420px] min-h-screen content-center gap-4 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary text-white">
          <Icon name="logo" size={24} />
        </span>
        <div>
          <h1 className="text-[22px] font-bold tracking-tight">Set up Sathi</h1>
          <p className="text-[13px] text-muted-fg">Step {stepIdx + 1} of {STEPS.length}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex gap-1.5">
        {STEPS.map((s, i) => (
          <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${
            i <= stepIdx ? "bg-primary" : "bg-border"
          }`} />
        ))}
      </div>

      {/* Step content */}
      <Card>
        {step === "age" && <StepAge ageBand={ageBand} set={handleAgeBand} />}
        {step === "comfort" && <StepComfort literacy={literacy} set={setLiteracy} />}
        {step === "access" && <StepAccess flags={flags} toggle={toggleFlag} />}
        {step === "details" && <StepDetails f={details} set={setDetail} msg={msg} busy={busy} />}
      </Card>

      {/* Navigation */}
      <div className="flex gap-2">
        {stepIdx > 0 && (
          <Btn kind="ghost" onClick={back} className="flex-1">Back</Btn>
        )}
        {isLastStep ? (
          <Btn onClick={submit} disabled={busy} className="flex-1">
            {busy ? "Setting up…" : "Start recovery"}
          </Btn>
        ) : (
          <Btn onClick={next} className="flex-1">Continue</Btn>
        )}
      </div>

      {/* Skip option for non-patients */}
      {canSkipToHome && (
        <button className="text-xs font-bold text-primary" onClick={() => go("#/home")}>
          Skip — I join via link code
        </button>
      )}
    </div>
  );
}
