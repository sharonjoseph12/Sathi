import { useEffect, useState } from "react";
import { api, localSafety, type Med } from "../lib/api";
import { t } from "../lib/i18n";
import { speakSmart } from "../lib/voice";
import { go, useApp } from "../lib/store";
import { Avatar, Badge, Btn, Card, Confetti, Empty, Input, Ring, SectionLabel } from "../components/ui";
import { Icon } from "../components/icons";
import { useAdaptiveProfile, isElder, wantsReducedMotion, wantsVoicePrimary } from "../lib/useAdaptiveProfile";

// ── Voice helpers ────────────────────────────────────────────────────
/** Web Speech API one-shot listener; typed fallback if unsupported. */
export function listenOnce(cb: (text: string) => void, setListening: (b: boolean) => void) {
  const W = window as unknown as { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any };
  const Ctor = W.SpeechRecognition || W.webkitSpeechRecognition;
  if (!Ctor) {
    const t = prompt("Say / type symptom:", "breathing feels worse than yesterday");
    if (t) cb(t);
    return;
  }
  const rec = new Ctor();
  rec.lang = "en-IN";
  setListening(true);
  rec.onresult = (e: any) => cb(e.results[0][0].transcript);
  rec.onend = () => setListening(false);
  rec.onerror = () => setListening(false);
  rec.start();
}

/** Browser TTS one-shot. */
export function speak(text: string) {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-IN";
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch { /* voice optional */ }
}

// ── Demo guide ───────────────────────────────────────────────────────
function DemoGuide() {
  const steps: [string, string][] = [
    ["Mark a medicine Taken below — ring + confetti update", "#/home"],
    ["Report \"breathing feels worse\" in Symptoms — safety triage + AI follow-up", "#/symptoms"],
    ["Ask the AI companion, then send a voice note — Whisper + neural voice", "#/chat"],
    ["Scan a prescription, or run the drug interaction check", "#/scan"],
    ["Open Emergency SOS — panic flow, 108/112 dial, CPR coach, QR card", "#/sos"],
    ["Print the Recovery report with Clinical AI Summary", "#/report"],
  ];
  return (
    <div className="animate-slide-up sticky top-2 z-50 rounded-2xl bg-primary p-3 text-white shadow-lg">
      <div className="flex items-center justify-between">
        <p className="font-bold">▶ Judge demo — Meena's recovery in 6 taps</p>
        <button onClick={() => (window.location.hash = "#/home")} className="rounded-full bg-white/20 px-2 text-xs min-h-[44px] min-w-[44px]" aria-label="Close demo guide">
          Close
        </button>
      </div>
      <ol className="mt-2 grid gap-1">
        {steps.map(([label, path], i) => (
          <li key={i}>
            <button onClick={() => go(path)} className="w-full rounded-xl bg-white/10 p-2 text-left text-xs font-semibold active:scale-[0.99] min-h-[44px]">
              {i + 1}. {label} →
            </button>
          </li>
        ))}
      </ol>
      <p className="mt-1 text-[11px] text-white/80">Then log in as priya@sathi.demo (caregiver) to see the SOS/symptom alerts land.</p>
    </div>
  );
}

// ── Elder medicine card ──────────────────────────────────────────────
function ElderMedCard({ m, onTake }: { m: Med; onTake: () => void }) {
  return (
    <div className="mb-3 rounded-2xl border-2 border-border bg-card p-5 shadow-sm">
      <div className="mb-3">
        <p className="text-xl font-bold leading-tight">{m.name}</p>
        <p className="mt-1 text-base text-muted-fg">Take at {m.time}</p>
      </div>
      <Btn onClick={onTake} className="!w-full !min-h-[60px] !text-xl !font-bold">
        ✓ Take medicine
      </Btn>
    </div>
  );
}

// ── Standard medicine card (current design) ──────────────────────────
function StandardMedCard({ m, onTake }: { m: Med; onTake: () => void }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
          <Icon name="pill" size={18} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{m.name}</p>
          <p className="text-xs text-muted-fg">{m.time} · {m.dose}</p>
        </div>
      </div>
      <Btn onClick={onTake}>Mark taken</Btn>
    </div>
  );
}

// ── Elder quick-report buttons ───────────────────────────────────────
function ElderQuickReport({ onReport }: { onReport: (text: string) => void }) {
  const presets = [
    { text: "I have a headache", label: "Report a headache" },
    { text: "breathing feels worse than yesterday", label: "Report breathing difficulty" },
  ];
  return (
    <div className="grid gap-2">
      {presets.map((p) => (
        <Btn key={p.text} kind="ghost" onClick={() => onReport(p.text)} className="!min-h-[56px] !text-base !justify-start">
          {p.text}
        </Btn>
      ))}
      <Btn kind="danger" onClick={() => go("#/sos")} className="!min-h-[56px] !text-base">
        🚨 Emergency SOS
      </Btn>
    </div>
  );
}

// ── Home — "Today" engine ────────────────────────────────────────────
export function Home() {
  const { me, pid } = useApp();
  const profile = useAdaptiveProfile();
  const elder = isElder(profile);
  const reducedMotion = wantsReducedMotion(profile);
  const voicePrimary = wantsVoicePrimary(profile);

  const [meds, setMeds] = useState<Med[]>([]);
  const [st, setSt] = useState({
    adherence: 0, taken_today: 0, total: 0, streak: 0, xp: 0,
    next_followup: null as string | null,
    week: [] as { date: string; pct: number }[],
  });
  const [burst, setBurst] = useState(0);
  const [alert, setAlert] = useState<{ text: string; rule: string } | null>(null);
  const [followup, setFollowup] = useState("");
  const [why, setWhy] = useState(false);
  const [listening, setListening] = useState(false);
  const [showAllMeds, setShowAllMeds] = useState(false);

  const load = async () => {
    if (!pid) return;
    try { setMeds(await api.meds(pid)); } catch { /* offline */ }
    try { setSt(await api.stats(pid)); } catch { /* offline */ }
  };
  useEffect(() => { load(); }, [pid]);

  if (!pid) return <Empty text="No patient yet — create a profile or connect with a link code in Settings." />;

  const take = async (m: Med) => {
    setMeds((ms) => ms.filter((x) => x.id !== m.id));
    if (!reducedMotion) setBurst((b) => b + 1);
    try { await api.confirm(pid, m.id); } catch { /* queued offline */ }
    load();
  };

  const report = async (text: string) => {
    const lv = localSafety(text);
    if (lv === "ESCALATE") {
      setAlert({
        text: elder
          ? "This sounds serious. Please call your doctor or go to the hospital now."
          : "This may need urgent medical attention. Please contact your doctor now.",
        rule: `emergency pattern in "${text}"`,
      });
    }
    try {
      const r = await api.symptom(pid, text);
      if (r.safety_status === "ESCALATE") {
        setAlert({
          text: elder
            ? "We noticed something that needs a doctor. Please get medical help."
            : "Safety review flagged this. Please seek medical help.",
          rule: "server rule ESCALATE",
        });
      }
      if (r.ai_followup) {
        setFollowup(r.ai_followup);
        void speakSmart(r.ai_followup, me?.language ? `${me.language}-IN` : "en-IN");
      } else {
        speak(r.safety_status === "ESCALATE" ? "Please seek medical help." : "Noted. I logged that.");
      }
    } catch { /* offline: local triage already shown */ }
  };

  // Elder mode: show max 3 medicines, progressive disclosure
  const visibleMeds = elder && !showAllMeds ? meds.slice(0, 3) : meds;
  const hasMoreMeds = elder && meds.length > 3 && !showAllMeds;

  return (
    <div className="grid gap-4">
      {!reducedMotion && <Confetti fire={burst} />}

      {/* ── Greeting section ── */}
      <section className="rounded-2xl border border-border bg-card p-4 shadow-[0_1px_2px_rgb(16_24_40/0.05)]">
        <div className="flex items-center gap-3">
          <Avatar name={me?.name || "Patient"} />
          <div className="min-w-0 flex-1">
            <p className={`font-bold uppercase tracking-[0.08em] text-muted-fg ${elder ? "text-xs" : "text-[11px]"}`}>
              Today's recovery
            </p>
            <h1 className={`truncate font-bold tracking-tight ${elder ? "text-2xl" : "text-lg"}`}>
              {t(me?.language || "en", "hello")}, {me?.name?.split(" ")[0] || "friend"}
            </h1>
          </div>
          {!elder && (
            <div className="text-right text-xs text-muted-fg">
              <p className="font-semibold text-ink">{st.taken_today}/{st.total} doses</p>
              <p>{st.streak}-day streak</p>
            </div>
          )}
        </div>

        {elder ? (
          /* Elder: simple sentence summary */
          <div className="mt-3 rounded-xl bg-muted/60 p-4">
            <p className="text-lg font-semibold">
              {st.total === 0
                ? "No medicines today."
                : st.taken_today === st.total
                  ? "All medicines taken. Well done!"
                  : `${st.total - st.taken_today} medicine${st.total - st.taken_today > 1 ? "s" : ""} left today.`}
            </p>
            {st.next_followup && (
              <p className="mt-1 text-base text-muted-fg">Next appointment: {st.next_followup}</p>
            )}
          </div>
        ) : (
          /* Standard: ring + stats */
          <div className="mt-3 flex items-center gap-4 rounded-xl bg-muted/60 p-3">
            <Ring pct={st.adherence} />
            <div className="text-sm">
              <p className="font-semibold">Adherence {st.adherence}%</p>
              <p className="text-[13px] text-muted-fg">
                {st.next_followup ? `Next follow-up: ${st.next_followup}` : "No follow-up scheduled"}
              </p>
            </div>
          </div>
        )}
      </section>

      {window.location.hash.includes("demo=1") && <DemoGuide />}

      {/* ── Safety alert ── */}
      {alert && (
        <Card accent="#B42318">
          <div className="flex items-center justify-between gap-2">
            <p className={`flex items-center gap-2 font-semibold text-danger ${elder ? "text-lg" : "text-sm"}`}>
              <Icon name="alert" size={elder ? 24 : 18} />
              {elder ? "You may need a doctor" : "Please seek medical attention"}
            </p>
            <Badge level="ESCALATE" />
          </div>
          <p className={`mt-2 ${elder ? "text-lg leading-relaxed" : "text-sm"}`}>{alert.text}</p>
          <div className={`mt-3 flex gap-2 ${elder ? "flex-col" : ""}`}>
            <Btn kind="danger" onClick={() => setAlert(null)} className={elder ? "!min-h-[56px] !text-lg" : ""}>
              I've received help
            </Btn>
            {!elder && (
              <Btn kind="ghost" onClick={() => setWhy((w) => !w)}>Why?</Btn>
            )}
          </div>
          {why && !elder && (
            <p className="mt-2 rounded-xl bg-muted p-2 text-xs text-muted-fg">Rule: {alert.rule}. No diagnosis made.</p>
          )}
        </Card>
      )}

      {/* ── Medicine list ── */}
      <Card>
        <SectionLabel>{elder ? "Your medicines" : "Medicines"}</SectionLabel>
        {visibleMeds.length === 0 && meds.length === 0 ? (
          <Empty
            title={elder ? "Done for now" : "All doses complete"}
            text={elder ? "No medicines left for this time." : "No remaining medicines for this time window."}
          />
        ) : (
          <>
            {visibleMeds.map((m) =>
              elder
                ? <ElderMedCard key={m.id} m={m} onTake={() => take(m)} />
                : <StandardMedCard key={m.id} m={m} onTake={() => take(m)} />
            )}
            {hasMoreMeds && (
              <Btn kind="ghost" onClick={() => setShowAllMeds(true)} className="!min-h-[56px] !text-base !w-full">
                Show {meds.length - 3} more medicine{meds.length - 3 > 1 ? "s" : ""}
              </Btn>
            )}
          </>
        )}
        <button
          className={`mt-1 inline-flex min-h-[44px] items-center gap-1 font-semibold text-primary ${elder ? "text-base" : "text-[13px]"}`}
          onClick={() => go("#/meds")}
          aria-label="Manage all medicines"
        >
          Manage medicines <Icon name="arrow" size={14} />
        </button>
      </Card>

      {/* ── Voice / symptom reporting ── */}
      <div className="grid place-items-center gap-3 py-2 text-center">
        <button
          aria-label={listening ? "Listening — tap to stop" : "Report a symptom by voice"}
          onClick={() => listenOnce(report, setListening)}
          className={`grid place-items-center rounded-full text-white shadow-md transition active:scale-95 ${
            listening ? "bg-danger" : "bg-primary hover:brightness-105"
          } ${elder || voicePrimary ? "h-20 w-20" : "h-16 w-16"}`}
        >
          <Icon name="mic" size={elder || voicePrimary ? 32 : 26} />
        </button>
        <p className={`text-muted-fg ${elder ? "text-base" : "text-xs"}`}>
          {listening
            ? t(me?.language || "en", "listening")
            : elder
              ? "Tap to tell me how you feel"
              : t(me?.language || "en", "talk")}
        </p>

        {followup && (
          <Card accent="#4F46E5">
            <div className="flex items-center justify-between gap-2">
              <p className={`font-medium ${elder ? "text-lg" : "text-sm"}`}>Sathi asks: {followup}</p>
              <button
                aria-label="Dismiss follow-up question"
                className="min-h-[44px] min-w-[44px] text-xs font-bold text-muted-fg"
                onClick={() => setFollowup("")}
              >
                ✕
              </button>
            </div>
          </Card>
        )}

        {elder ? (
          <ElderQuickReport onReport={report} />
        ) : (
          <div className="flex gap-2">
            <Btn kind="ghost" onClick={() => report("mild headache")}>headache</Btn>
            <Btn kind="ghost" onClick={() => report("breathing feels worse than yesterday")}>breathing worse</Btn>
            <Btn kind="danger" onClick={() => go("#/sos")}>🚨 SOS</Btn>
          </div>
        )}
      </div>
    </div>
  );
}
