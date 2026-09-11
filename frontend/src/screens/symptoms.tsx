import { useEffect, useState } from "react";
import { api, localSafety } from "../lib/api";
import { useApp } from "../lib/store";
import { Badge, Btn, Card, Empty, Input, Page } from "../components/ui";
import { useAdaptiveProfile, isElder } from "../lib/useAdaptiveProfile";
import { speak } from "./home";

// ── Elder severity selector: 3 big buttons (Mild / Moderate / Severe) ──
function ElderSeverity({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const levels = [
    { label: "Mild", value: 3, style: "bg-emerald-100 text-emerald-900 border-emerald-300" },
    { label: "Moderate", value: 6, style: "bg-amber-100 text-amber-900 border-amber-300" },
    { label: "Severe", value: 9, style: "bg-red-100 text-red-900 border-red-300" },
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
                ? `${l.style} shadow-sm`
                : "border-border bg-card text-ink hover:bg-muted"
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
          className="min-h-[56px] rounded-xl border border-border bg-card px-4 text-left text-lg font-semibold text-ink transition hover:bg-muted active:scale-[0.98]"
        >
          {p}
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

  const [text, setText] = useState("");
  const [sev, setSev] = useState(0);
  const [hist, setHist] = useState<{ symptoms: string[]; severity: number; risk: string }[]>([]);
  const [res, setRes] = useState("");
  const [followup, setFollowup] = useState("");
  const [elderMode, setElderMode] = useState<"choose" | "custom">(elder ? "choose" : "custom");

  const load = () => api.symptoms(pid).then(setHist).catch(() => {});
  useEffect(() => { if (pid) load(); }, [pid]);

  const submit = async (overrideText?: string) => {
    const t = overrideText || text;
    if (!t) return;
    try {
      const r = await api.symptom(pid, t, sev);
      setRes(
        r.safety_status === "ESCALATE"
          ? elder
            ? "⚠ This sounds serious. Please call your doctor now."
            : "⚠ Flagged — please seek medical help."
          : elder
            ? `Noted: ${r.risk}. Thank you for telling us.`
            : `Logged (${r.risk}).`
      );
      setFollowup(r.ai_followup || "");
      speak(r.safety_status);
    } catch {
      const localResult = localSafety(t);
      setRes(
        elder
          ? `Saved. (${localResult}). Will send when you are online.`
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
    <div className="grid gap-3">
      <Page
        title="Symptoms"
        sub={elder ? "Tell us how you feel" : "Plain words work — no medical terms needed"}
      />

      <Card>
        <div className="grid gap-3">
          {elder ? (
            /* Elder variant: preset buttons or "something else" custom input */
            <>
              {elderMode === "choose" ? (
                <>
                  <ElderPresets onSelect={(p) => { setText(p); submit(p); }} />
                  <button
                    type="button"
                    onClick={() => setElderMode("custom")}
                    className="min-h-[48px] rounded-xl border border-dashed border-border px-4 text-base font-semibold text-primary"
                  >
                    Something else — type or speak
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
                      className="min-h-[44px] text-sm font-semibold text-primary"
                    >
                      ← Back to common symptoms
                    </button>
                  )}
                </>
              )}
            </>
          ) : (
            /* Standard variant: text input + severity slider */
            <>
              <Input
                placeholder="e.g. stomach hurts more than yesterday"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <label className="text-xs font-bold">
                Severity: {sev === 0 ? "—" : `${sev}/10`}
              </label>
              <input
                type="range"
                min={0}
                max={10}
                value={sev}
                onChange={(e) => setSev(Number(e.target.value))}
                aria-label="Severity from 0 to 10"
              />
            </>
          )}

          {/* Result feedback */}
          {res && (
            <p role="status" className={`font-semibold ${elder ? "text-lg" : "text-sm"}`}>
              {res}
            </p>
          )}

          {/* AI follow-up */}
          {followup && (
            <div className="rounded-xl bg-primary/10 p-3 mt-1">
              <p className={`font-bold text-primary ${elder ? "text-base" : "text-sm"}`}>
                ✨ {elder ? "Sathi has a question:" : "Nurse follow-up:"}
              </p>
              <p className={`mb-2 ${elder ? "text-base leading-relaxed" : "text-sm"}`}>{followup}</p>
              <Btn
                kind="ghost"
                onClick={() => { setText(`${followup} `); setFollowup(""); if (elder) setElderMode("custom"); }}
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
          <p className={`mb-2 font-bold ${elder ? "text-lg" : "text-sm"}`}>
            {elder ? "Past reports" : "Recent symptoms"}
          </p>
          {hist.map((h, i) => (
            <div key={i} className={`flex items-center justify-between rounded-2xl bg-card p-3 shadow-sm ${i > 0 ? "mt-2" : ""}`}>
              <p className={`font-semibold ${elder ? "text-base" : "text-sm"}`}>
                {h.symptoms[0]}
                {!elder && <span className="text-xs text-muted-fg"> · {h.severity}/10</span>}
              </p>
              <Badge level={h.risk} />
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
