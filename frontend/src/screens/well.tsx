import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Btn, Card, Empty, Area, Page } from "../components/ui";
import { useAdaptiveProfile, getVariant, prefersReducedMotion } from "../lib/useAdaptiveProfile";
import {
  Frown,
  Meh,
  Smile,
  SmilePlus,
  Sparkles,
  Wind,
  Check,
} from "lucide-react";

/* ══════════════════════════════════════════════════════════════════
   Journal — Mood, energy & recovery notes
   ══════════════════════════════════════════════════════════════════ */
export function Journal() {
  const profile = useAdaptiveProfile();
  const elderMode = getVariant(profile) === "elder";

  const [list, setList] = useState<{ mood: number; energy: number; text: string }[]>([]);
  const [mood, setMood] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [text, setText] = useState("");
  const load = () => api.journal().then(setList).catch(() => {});
  useEffect(() => {
    load();
  }, []);

  const moodLevels = [
    { icon: Frown, label: "Very sad", value: 1 },
    { icon: Meh, label: "Low", value: 2 },
    { icon: Smile, label: "Okay", value: 3 },
    { icon: SmilePlus, label: "Good", value: 4 },
    { icon: Sparkles, label: "Great", value: 5 },
  ];

  // Elder mode: 3 simplified choices mapped to 5-point scale
  const elderChoices = [
    { label: "Not great", icon: Frown, value: 2 },
    { label: "Okay", icon: Smile, value: 3 },
    { label: "Good", icon: Sparkles, value: 5 },
  ];

  const save = async () => {
    await api.addJournal({ mood, energy, text });
    setText("");
    load();
  };

  const getMoodIcon = (val: number) => {
    const item = moodLevels.find((m) => m.value === val) || moodLevels[2];
    const IconComp = item.icon;
    return <IconComp className="h-5 w-5 text-primary shrink-0" aria-hidden="true" />;
  };

  return (
    <div className="grid gap-4">
      <Page
        title="Journal"
        sub={elderMode ? "How are you feeling today?" : "Mood · energy · notes"}
      />
      <Card>
        <div className="grid gap-4">
          {/* Mood selection */}
          <fieldset>
            <legend className={`font-bold text-ink ${elderMode ? "text-base" : "text-xs"}`}>
              {elderMode ? "How do you feel?" : "Mood"}
            </legend>
            {elderMode ? (
              <div className="mt-2.5 grid grid-cols-3 gap-2">
                {elderChoices.map((c) => {
                  const IconComp = c.icon;
                  return (
                    <button
                      key={c.value}
                      onClick={() => setMood(c.value)}
                      aria-label={`Mood: ${c.label}`}
                      aria-pressed={mood === c.value}
                      className={`grid place-items-center gap-2 rounded-2xl p-3 text-center transition-all min-h-[72px] ${
                        mood === c.value
                          ? "bg-primary text-white shadow-sm ring-2 ring-primary ring-offset-2"
                          : "bg-surface-sunken text-ink hover:bg-muted"
                      }`}
                    >
                      <IconComp className="h-7 w-7" aria-hidden="true" />
                      <span className="text-sm font-bold">{c.label}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="mt-2 flex gap-2" role="radiogroup" aria-label="Select your mood">
                {moodLevels.map((item) => {
                  const IconComp = item.icon;
                  return (
                    <button
                      key={item.value}
                      onClick={() => setMood(item.value)}
                      role="radio"
                      aria-checked={mood === item.value}
                      aria-label={`Mood: ${item.label}`}
                      className={`flex-1 grid place-items-center rounded-2xl p-2.5 transition min-h-[44px] ${
                        mood === item.value
                          ? "bg-primary text-white shadow-sm"
                          : "bg-surface-sunken text-ink hover:bg-muted"
                      }`}
                    >
                      <IconComp className="h-6 w-6" aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
            )}
          </fieldset>

          {/* Energy */}
          {!elderMode && (
            <fieldset>
              <legend className="text-xs font-bold text-ink flex items-center justify-between">
                <span>Energy level</span>
                <span className="font-mono">{energy}/5</span>
              </legend>
              <input
                type="range"
                min={1}
                max={5}
                value={energy}
                onChange={(e) => setEnergy(Number(e.target.value))}
                aria-label={`Energy level: ${energy} out of 5`}
                className="mt-2 w-full accent-primary h-2 bg-surface-sunken rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-ink-muted mt-1">
                <span>Low</span>
                <span>Medium</span>
                <span>High</span>
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
          <Btn
            onClick={save}
            label="Save journal entry"
            className={`flex items-center justify-center gap-2 ${elderMode ? "!min-h-[56px] !text-lg" : ""}`}
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            <span>{elderMode ? "Save entry" : "Save"}</span>
          </Btn>
        </div>
      </Card>

      {/* Previous entries */}
      {list.length > 0 && (
        <section aria-label="Previous journal entries">
          <h2 className={`mb-2 font-bold text-ink-muted ${elderMode ? "text-sm" : "text-xs"}`}>
            Previous entries
          </h2>
          <div role="list" className="grid gap-2">
            {list.map((j, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-3 shadow-sm"
              >
                <div className="mt-0.5">{getMoodIcon(j.mood)}</div>
                <div className="min-w-0 flex-1">
                  <p className={`text-ink ${elderMode ? "text-base" : "text-sm"}`}>
                    {j.text || <span className="text-ink-muted italic">No note added</span>}
                  </p>
                  {!elderMode && (
                    <p className="text-xs text-ink-muted mt-0.5">Energy: {j.energy}/5</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {list.length === 0 && (
        <Empty
          text={
            elderMode
              ? "No entries yet. Start by telling us how you feel!"
              : "No journal entries yet."
          }
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   Meditation — 4-4-4 breathing exercise
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
    <div className="grid gap-4">
      <Page
        title={elderMode ? "Breathing Exercise" : "Breathing"}
        sub={
          elderMode
            ? "A calm breathing exercise to help you relax"
            : "4-4-4 calm rhythm"
        }
      />
      <Card>
        <div className="grid place-items-center gap-4 py-8 text-center">
          {/* Breathing circle */}
          <div
            className={`grid place-items-center rounded-full bg-primary-soft text-primary ${circleSize} ${
              on && !reducedMotion
                ? "scale-110 transition-transform duration-[4s]"
                : "transition-transform"
            }`}
            aria-hidden="true"
          >
            <Wind className={elderMode ? "h-14 w-14" : "h-10 w-10"} />
          </div>

          {/* Phase indicator */}
          <p
            className={`font-bold text-ink ${elderMode ? "text-2xl" : "text-xl"}`}
            aria-live="polite"
            aria-atomic="true"
            role="status"
          >
            {on ? phase : "Ready when you are"}
          </p>

          {/* Reduced-motion text indicator */}
          {on && reducedMotion && (
            <p className="text-sm font-semibold text-primary" aria-live="polite">
              {phase === "Breathe in…"
                ? "IN (4s)"
                : phase === "Hold…"
                ? "HOLD (4s)"
                : "OUT (4s)"}
            </p>
          )}

          <p className={`text-ink-muted ${elderMode ? "text-base" : "text-xs"}`} aria-live="polite">
            {mins > 0
              ? `${mins} minute${mins > 1 ? "s" : ""} this session`
              : "0 min this session"}
          </p>

          <Btn
            kind={on ? "danger" : "primary"}
            onClick={() => {
              if (on) stop();
              else {
                setOn(true);
                setSec(0);
                setShowStopPrompt(false);
              }
            }}
            label={on ? "Stop breathing exercise" : "Begin breathing exercise"}
            className={elderMode ? "!min-h-[56px] !text-lg px-8" : "px-6"}
          >
            {on ? "Stop" : "Begin"}
          </Btn>

          {/* Auto-stop prompt for elder mode at 5 minutes */}
          {showStopPrompt && (
            <div className="rounded-2xl bg-surface-sunken p-4 text-center border border-border mt-2" role="alert">
              <p className="text-base font-bold text-ink">
                You've been breathing for {mins} minutes — great job!
              </p>
              <p className="mt-1 text-sm text-ink-muted">
                Would you like to continue or stop?
              </p>
              <div className="mt-3 flex justify-center gap-2">
                <Btn
                  kind="ghost"
                  onClick={() => setShowStopPrompt(false)}
                  label="Continue breathing exercise"
                >
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
