import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Btn, Card, Empty, Area, Page } from "../components/ui";
import { useAdaptiveProfile, getVariant, prefersReducedMotion } from "../lib/useAdaptiveProfile";

/* ══════════════════════════════════════════════════════════════════
   Journal — Mood, energy & recovery notes
   Elder: simplified 3-choice mood (Good/Okay/Not great), larger buttons
   Standard: 5-point emoji scale + energy slider
   ══════════════════════════════════════════════════════════════════ */
export function Journal() {
  const profile = useAdaptiveProfile();
  const elderMode = getVariant(profile) === "elder";

  const [list, setList] = useState<{ mood: number; energy: number; text: string }[]>([]);
  const [mood, setMood] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [text, setText] = useState("");
  const load = () => api.journal().then(setList).catch(() => {});
  useEffect(() => { load(); }, []);

  const faces = ["😞", "🙁", "😐", "🙂", "😄"];
  const faceLabels = ["Very sad", "Sad", "Okay", "Good", "Very happy"];

  // Elder mode: 3 simplified choices mapped to 5-point scale
  const elderChoices: { label: string; emoji: string; value: number }[] = [
    { label: "Not great", emoji: "😞", value: 2 },
    { label: "Okay", emoji: "😐", value: 3 },
    { label: "Good", emoji: "😄", value: 5 },
  ];

  const save = async () => {
    await api.addJournal({ mood, energy, text });
    setText("");
    load();
  };

  return (
    <div className="grid gap-3">
      <Page
        title="Journal"
        sub={elderMode ? "How are you feeling today?" : "Mood · energy · notes"}
      />
      <Card>
        <div className="grid gap-3">
          {/* Mood selection */}
          <fieldset>
            <legend className={`font-bold ${elderMode ? "text-base" : "text-xs"}`}>
              {elderMode ? "How do you feel?" : "Mood"}
            </legend>
            {elderMode ? (
              <div className="mt-2 grid grid-cols-3 gap-2">
                {elderChoices.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setMood(c.value)}
                    aria-label={`Mood: ${c.label}`}
                    aria-pressed={mood === c.value}
                    className={`grid place-items-center gap-1 rounded-2xl p-3 text-center transition-all ${
                      mood === c.value ? "bg-primary text-white ring-2 ring-primary ring-offset-2" : "bg-secondary"
                    }`}
                    style={{ minHeight: 72 }}
                  >
                    <span className="text-3xl" aria-hidden="true">{c.emoji}</span>
                    <span className={`text-sm font-bold ${mood === c.value ? "text-white" : "text-primary"}`}>
                      {c.label}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-1 flex gap-2" role="radiogroup" aria-label="Select your mood">
                {faces.map((f, i) => (
                  <button
                    key={i}
                    onClick={() => setMood(i + 1)}
                    role="radio"
                    aria-checked={mood === i + 1}
                    aria-label={`Mood: ${faceLabels[i]}`}
                    className={`rounded-2xl p-2 text-2xl transition-all ${
                      mood === i + 1 ? "bg-secondary ring-2 ring-primary" : ""
                    }`}
                    style={{ minHeight: 44, minWidth: 44 }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            )}
          </fieldset>

          {/* Energy — hidden in elder mode for simplicity */}
          {!elderMode && (
            <fieldset>
              <legend className="text-xs font-bold">
                Energy: {energy}/5
              </legend>
              <input
                type="range"
                min={1}
                max={5}
                value={energy}
                onChange={(e) => setEnergy(Number(e.target.value))}
                aria-label={`Energy level: ${energy} out of 5`}
                aria-valuemin={1}
                aria-valuemax={5}
                aria-valuenow={energy}
                className="mt-1 w-full"
              />
              <div className="flex justify-between text-[10px] text-muted-fg">
                <span>Low</span><span>Medium</span><span>High</span>
              </div>
            </fieldset>
          )}

          {/* Notes */}
          <Area
            rows={elderMode ? 3 : 2}
            placeholder={elderMode ? "Anything you want to remember about today?" : "How was today?"}
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-label="Journal notes for today"
          />
          <Btn onClick={save} label="Save journal entry">
            {elderMode ? "💾 Save" : "Save entry"}
          </Btn>
        </div>
      </Card>

      {/* Previous entries */}
      {list.length > 0 && (
        <div>
          <p className={`mb-2 font-bold text-muted-fg ${elderMode ? "text-sm" : "text-xs"}`}>
            Previous entries
          </p>
          {list.map((j, i) => (
            <div key={i} className="mb-2 rounded-2xl bg-card p-3 shadow-sm">
              <p className={elderMode ? "text-base" : "text-sm"}>
                {faces[j.mood - 1]}{" "}
                {j.text || <span className="text-muted-fg">(no note)</span>}
              </p>
              {!elderMode && (
                <p className="text-xs text-muted-fg">energy {j.energy}/5</p>
              )}
            </div>
          ))}
        </div>
      )}
      {list.length === 0 && <Empty text={elderMode ? "No entries yet. Start by telling us how you feel!" : "No entries yet."} />}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   Meditation — 4-4-4 breathing exercise
   Respects prefers-reduced-motion (text-only phase indicator)
   Elder: larger circle, clearer text, auto-stop prompt at 5min
   ══════════════════════════════════════════════════════════════════ */
export function Meditation() {
  const profile = useAdaptiveProfile();
  const elderMode = getVariant(profile) === "elder";
  const reducedMotion = prefersReducedMotion(profile);

  const [phase, setPhase] = useState("Ready");
  const [on, setOn] = useState(false);
  const [sec, setSec] = useState(0);
  const [showStopPrompt, setShowStopPrompt] = useState(false);

  useEffect(() => {
    if (!on) return;
    const seq = ["Breathe in…", "Hold…", "Breathe out…"];
    let i = 0;
    setPhase(seq[0]);
    const t = setInterval(() => {
      i = (i + 1) % 3;
      setPhase(seq[i]);
      setSec((s) => s + 4);
    }, 4000);
    return () => clearInterval(t);
  }, [on]);

  // Auto-stop prompt at 5 minutes for elder mode
  useEffect(() => {
    if (elderMode && sec >= 300 && !showStopPrompt) {
      setShowStopPrompt(true);
    }
  }, [sec, elderMode, showStopPrompt]);

  const mins = Math.floor(sec / 60);
  const circleSize = elderMode ? "h-36 w-36" : "h-28 w-28";

  const stop = () => {
    setOn(false);
    setPhase("Ready");
    setShowStopPrompt(false);
  };

  return (
    <div className="grid gap-3">
      <Page
        title={elderMode ? "Breathing Exercise" : "Breathing"}
        sub={elderMode ? "A calm breathing exercise to help you relax" : "4-4-4 calm rhythm"}
      />
      <Card>
        <div className="grid place-items-center gap-3 py-6 text-center">
          {/* Breathing circle — respects reduced motion */}
          <div
            className={`grid place-items-center rounded-full bg-secondary text-4xl ${circleSize} ${
              on && !reducedMotion ? "scale-110 transition-transform duration-[4s]" : "transition-transform"
            }`}
            aria-hidden="true"
          >
            🫁
          </div>

          {/* Phase indicator */}
          <p
            className={`font-bold ${elderMode ? "text-xl" : "text-lg"}`}
            aria-live="polite"
            aria-atomic="true"
            role="status"
          >
            {on ? phase : elderMode ? "Ready when you are" : "Ready when you are"}
          </p>

          {/* Reduced-motion text indicator */}
          {on && reducedMotion && (
            <p className="text-sm font-semibold text-primary" aria-live="polite">
              {phase === "Breathe in…" ? "↑ IN" : phase === "Hold…" ? "— HOLD" : "↓ OUT"}
            </p>
          )}

          <p className={`text-muted-fg ${elderMode ? "text-sm" : "text-xs"}`} aria-live="polite">
            {mins > 0 ? `${mins} minute${mins > 1 ? "s" : ""} this session` : "0 min this session"}
          </p>

          <Btn
            kind={on ? "danger" : "primary"}
            onClick={() => {
              if (on) stop();
              else { setOn(true); setSec(0); setShowStopPrompt(false); }
            }}
            label={on ? "Stop breathing exercise" : "Begin breathing exercise"}
            className={elderMode ? "text-base px-8 py-3" : ""}
          >
            {on ? "Stop" : "Begin"}
          </Btn>

          {/* Auto-stop prompt for elder mode at 5 minutes */}
          {showStopPrompt && (
            <div className="rounded-2xl bg-muted p-3 text-center" role="alert">
              <p className="text-sm font-bold">
                You've been breathing for {mins} minutes — great job!
              </p>
              <p className="mt-1 text-xs text-muted-fg">
                Would you like to continue or stop?
              </p>
              <div className="mt-2 flex justify-center gap-2">
                <Btn kind="ghost" onClick={() => setShowStopPrompt(false)} label="Continue breathing exercise">
                  Keep going
                </Btn>
                <Btn kind="primary" onClick={stop} label="Stop breathing exercise">
                  I'm done
                </Btn>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
