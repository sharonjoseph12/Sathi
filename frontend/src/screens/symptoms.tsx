import { useEffect, useState } from "react";
import { api, localSafety } from "../lib/api";
import { useApp } from "../lib/store";
import { Badge, Btn, Card, Input, Page } from "../components/ui";
import { useAdaptiveProfile, isElder, wantsVoicePrimary } from "../lib/useAdaptiveProfile";
import { speak } from "../lib/speech";
import { VoiceInputButton } from "../components/VoiceInputButton";
import {
  AlertTriangle,
  Sparkles,
  ArrowLeft,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";

// ── Elder severity selector: 3 big buttons (Mild / Moderate / Severe) ──
function ElderSeverity({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const levels = [
    { label: "Mild", value: 3, style: "border-success bg-success-bg text-success" },
    { label: "Moderate", value: 6, style: "border-warning bg-warning-bg text-warning" },
    { label: "Severe", value: 9, style: "border-danger bg-danger-bg text-danger" },
  ];
  return (
    <fieldset className="grid gap-2">
      <legend className="text-sm font-semibold text-ink mb-1">How bad is it?</legend>
      <div className="grid gap-2">
        {levels.map((l) => (
          <button
            key={l.label}
            type="button"
            onClick={() => onChange(l.value)}
            aria-pressed={value === l.value}
            className={`min-h-[56px] rounded-xl border-2 px-4 text-left text-lg font-bold transition active:scale-[0.98] ${
              value === l.value
                ? `${l.style} shadow-sm ring-2 ring-primary/20`
                : "border-border bg-surface text-ink hover:bg-surface-sunken"
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

// ── Elder preset symptom buttons (Yes/No/Not-sure pattern) ───────────
function ElderPresets({ onSelect }: { onSelect: (text: string) => void }) {
  const presets = [
    "I feel pain",
    "It is hard to breathe",
    "I feel dizzy",
    "I feel sick to my stomach",
    "I have a fever",
    "I am very tired",
  ];
  return (
    <div className="grid gap-2">
      <p className="text-sm font-semibold text-ink">What are you feeling?</p>
      {presets.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onSelect(p)}
          className="flex items-center justify-between min-h-[56px] rounded-xl border border-border bg-surface px-4 text-left text-lg font-semibold text-ink transition hover:bg-surface-sunken active:scale-[0.98]"
        >
          <span>{p}</span>
          <ChevronRight className="h-5 w-5 text-ink-muted" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

// ── Symptoms screen ──────────────────────────────────────────────────
export function Symptoms() {
  const { pid } = useApp();
  const profile = useAdaptiveProfile();
  const elder = isElder(profile);
  const voicePrimary = wantsVoicePrimary(profile);

  const [text, setText] = useState("");
  const [sev, setSev] = useState(0);
  const [hist, setHist] = useState<{ symptoms: string[]; severity: number; risk: string }[]>([]);
  const [res, setRes] = useState("");
  const [isEscalate, setIsEscalate] = useState(false);
  const [followup, setFollowup] = useState("");
  const [elderMode, setElderMode] = useState<"choose" | "custom">(elder ? "choose" : "custom");

  const load = () =>
    api
      .symptoms(pid)
      .then(setHist)
      .catch(() => {});

  useEffect(() => {
    if (pid) load();
  }, [pid]);

  const submit = async (overrideText?: string) => {
    const t = overrideText || text;
    if (!t) return;
    try {
      const r = await api.symptom(pid, t, sev);
      const escalate = r.safety_status === "ESCALATE";
      setIsEscalate(escalate);
      setRes(
        escalate
          ? elder
            ? "This sounds serious. Please call your doctor now."
            : "Flagged — please seek medical help."
          : elder
          ? `Noted: ${r.risk}. Thank you for telling us.`
          : `Logged (${r.risk}).`
      );
      setFollowup(r.ai_followup || "");
      speak(r.safety_status);
    } catch {
      const localResult = localSafety(t);
      const escalate = localResult === "ESCALATE";
      setIsEscalate(escalate);
      setRes(
        elder
          ? `Saved (${localResult}). Will send when you are online.`
          : `Logged locally (${localResult}). Will sync.`
      );
      setFollowup("");
    }
    if (!overrideText) {
      setText("");
      setSev(0);
    }
    load();
  };

  return (
    <div className="grid gap-4">
      <Page
        title="Symptoms"
        sub={elder ? "Tell us how you feel" : "Plain words work — no medical terms needed"}
      />

      {/* Voice input banner for fast reporting */}
      <section
        aria-label="Voice symptom logging"
        className="rounded-2xl border border-primary/20 bg-primary-soft p-4 text-center"
      >
        <p className={`mb-3 font-semibold text-ink ${elder ? "text-lg" : "text-sm"}`}>
          {elder ? "Or tap to speak your symptoms" : "Speak to log symptom directly"}
        </p>
        <VoiceInputButton
          onTranscript={(spoken) => {
            setText(spoken);
            submit(spoken);
          }}
          elderVariant={elder || voicePrimary}
          className="mx-auto"
        />
      </section>

      <Card>
        <div className="grid gap-3">
          {elder ? (
            /* Elder variant: preset buttons or "something else" custom input */
            <>
              {elderMode === "choose" ? (
                <>
                  <ElderPresets
                    onSelect={(p) => {
                      setText(p);
                      submit(p);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setElderMode("custom")}
                    className="min-h-[52px] rounded-xl border border-dashed border-border px-4 text-base font-semibold text-primary hover:bg-surface-sunken transition"
                  >
                    Something else — type details
                  </button>
                </>
              ) : (
                <>
                  <label className="grid gap-1.5 text-sm font-semibold text-ink">
                    Describe how you feel
                    <Input
                      placeholder="e.g. my stomach hurts"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      className="!min-h-[56px] !text-lg"
                    />
                  </label>
                  <ElderSeverity value={sev} onChange={setSev} />
                  {elder && elderMode === "custom" && (
                    <button
                      type="button"
                      onClick={() => setElderMode("choose")}
                      className="flex items-center gap-1.5 min-h-[44px] text-sm font-semibold text-primary hover:underline"
                    >
                      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                      Back to common symptoms
                    </button>
                  )}
                </>
              )}
            </>
          ) : (
            /* Standard variant: text input + severity slider */
            <>
              <label className="grid gap-1.5 text-xs font-bold text-ink">
                Describe your symptom
                <Input
                  placeholder="e.g. stomach hurts more than yesterday"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
              </label>
              <label className="text-xs font-bold text-ink flex items-center justify-between">
                <span>Severity</span>
                <span className="font-mono">{sev === 0 ? "Not specified" : `${sev}/10`}</span>
              </label>
              <input
                type="range"
                min={0}
                max={10}
                value={sev}
                onChange={(e) => setSev(Number(e.target.value))}
                aria-label="Severity from 0 to 10"
                className="w-full accent-primary h-2 bg-surface-sunken rounded-lg cursor-pointer"
              />
            </>
          )}

          {/* Result feedback with aria-live="polite" */}
          {res && (
            <div
              role="status"
              aria-live="polite"
              className={`flex items-center gap-2 rounded-xl p-3 font-semibold ${
                isEscalate
                  ? "bg-danger-bg text-danger border border-danger/30"
                  : "bg-success-bg text-success border border-success/30"
              } ${elder ? "text-lg" : "text-sm"}`}
            >
              {isEscalate ? (
                <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
              )}
              <span>{res}</span>
            </div>
          )}

          {/* AI follow-up */}
          {followup && (
            <div
              role="status"
              aria-live="polite"
              className="rounded-xl border border-primary/20 bg-primary-soft p-3 mt-1"
            >
              <p className={`flex items-center gap-1.5 font-bold text-primary ${elder ? "text-base" : "text-sm"}`}>
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                <span>{elder ? "Sathi has a question:" : "Nurse follow-up:"}</span>
              </p>
              <p className={`my-2 text-ink ${elder ? "text-base leading-relaxed" : "text-sm"}`}>{followup}</p>
              <Btn
                kind="ghost"
                onClick={() => {
                  setText(`${followup} `);
                  setFollowup("");
                  if (elder) setElderMode("custom");
                }}
                className={elder ? "!min-h-[48px] !text-base" : ""}
              >
                Answer
              </Btn>
            </div>
          )}

          {/* Submit */}
          {(elderMode === "custom" || !elder) && (
            <Btn
              onClick={() => submit()}
              className={elder ? "!min-h-[56px] !text-lg" : ""}
            >
              {elder ? "Send symptom report" : "Log symptom"}
            </Btn>
          )}
        </div>
      </Card>

      {/* History */}
      {hist.length > 0 && (
        <Card>
          <h2 className={`mb-3 font-bold text-ink ${elder ? "text-lg" : "text-sm"}`}>
            {elder ? "Past reports" : "Recent symptoms"}
          </h2>
          <div role="list" aria-label="Symptom report history" className="grid gap-2">
            {hist.map((h, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-xl border border-border bg-surface p-3 transition"
              >
                <div>
                  <p className={`font-semibold text-ink ${elder ? "text-base" : "text-sm"}`}>
                    {h.symptoms[0]}
                  </p>
                  {!elder && (
                    <p className="text-xs text-ink-muted">Severity: {h.severity}/10</p>
                  )}
                </div>
                <Badge level={h.risk} />
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
