import { useEffect, useState } from "react";
import { api, localSafety, type Med } from "../lib/api";
import { t } from "../lib/i18n";
import { speakSmart } from "../lib/voice";
import { go, useApp } from "../lib/store";
import { Avatar, Badge, Btn, Card, Confetti, Empty, Ring, SectionLabel } from "../components/ui";
import { toast } from "sonner";
import { processVoiceCommand } from "../lib/voiceEngine";
import {
  Pill,
  Check,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  X,
  ChevronRight,
  ShieldAlert,
  Play,
  Clock,
  Flame,
} from "lucide-react";
import { useAdaptiveProfile, isElder, wantsReducedMotion, wantsVoicePrimary } from "../lib/useAdaptiveProfile";
import { VoiceInputButton } from "../components/VoiceInputButton";

// ── TTS helper ────────────────────────────────────────────────────────
export function speak(text: string) {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-IN";
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch {
    /* voice optional */
  }
}

// ── Demo guide ───────────────────────────────────────────────────────
function DemoGuide() {
  const steps: [string, string][] = [
    ["Mark a medicine Taken below — ring and confetti update", "#/home"],
    ["Report breathing feels worse in Symptoms — safety triage + AI follow-up", "#/symptoms"],
    ["Ask the AI companion, then send a voice note — Whisper + neural voice", "#/chat"],
    ["Scan a prescription, or run the drug interaction check", "#/scan"],
    ["Open Emergency SOS — panic flow, 108/112 dial, CPR coach, QR card", "#/sos"],
    ["Print the Recovery report with Clinical AI Summary", "#/report"],
  ];
  return (
    <aside aria-label="Judge demo walkthrough guide" className="animate-slide-up sticky top-2 z-50 rounded-2xl bg-primary p-4 text-white shadow-lg">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 font-bold text-sm">
          <Play className="h-4 w-4 fill-white" aria-hidden="true" />
          Judge demo — Meena's recovery in 6 taps
        </p>
        <button
          onClick={() => (window.location.hash = "#/home")}
          className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold min-h-[44px] min-w-[44px] hover:bg-white/30 transition-colors"
          aria-label="Close demo guide"
        >
          Close
        </button>
      </div>
      <ol className="mt-3 grid gap-1.5">
        {steps.map(([label, path], i) => (
          <li key={i}>
            <button
              onClick={() => go(path)}
              className="flex w-full items-center justify-between rounded-xl bg-white/10 p-2.5 text-left text-xs font-semibold hover:bg-white/20 active:scale-[0.99] min-h-[44px] transition"
            >
              <span>{i + 1}. {label}</span>
              <ChevronRight className="h-4 w-4 shrink-0 opacity-80" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ol>
      <p className="mt-2 text-[11px] text-white/80">Then log in as priya@sathi.demo (caregiver) to see the SOS/symptom alerts land.</p>
    </aside>
  );
}

// ── Elder medicine card ──────────────────────────────────────────────
function ElderMedCard({ m, isTaken, onTake }: { m: Med; isTaken: boolean; onTake: () => void }) {
  return (
    <article className={`mb-3 rounded-2xl border-2 p-5 shadow-sm transition-all ${isTaken ? "border-success bg-success-bg/30" : "border-border bg-surface"}`}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-xl font-bold leading-tight text-ink">{m.name}</p>
          <p className="mt-1 flex items-center gap-1.5 text-base text-ink-muted">
            <Clock className="h-4 w-4" aria-hidden="true" />
            Take at {m.time}
          </p>
        </div>
        {isTaken && (
          <span className="flex items-center gap-1 rounded-full bg-success px-3 py-1 text-xs font-bold text-white shadow-sm">
            <Check className="h-3.5 w-3.5 stroke-[3]" />
            Taken
          </span>
        )}
      </div>
      <Btn
        kind={isTaken ? "ghost" : "success"}
        onClick={onTake}
        className="!w-full !min-h-[60px] !text-xl !font-bold flex items-center justify-center gap-2"
      >
        <Check className="h-6 w-6 stroke-[3]" aria-hidden="true" />
        {isTaken ? "Taken today ✓" : "Take medicine"}
      </Btn>
    </article>
  );
}

// ── Standard medicine card ───────────────────────────────────────────
function StandardMedCard({ m, isTaken, onTake }: { m: Med; isTaken: boolean; onTake: () => void }) {
  return (
    <article className={`mb-2 flex items-center justify-between gap-3 rounded-xl border p-3 transition hover:shadow-sm ${isTaken ? "border-success/40 bg-success-bg/15" : "border-border bg-surface"}`}>
      <div className="flex min-w-0 items-center gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${isTaken ? "bg-success/20 text-success" : "bg-primary/10 text-primary"}`}>
          {isTaken ? <Check className="h-5 w-5 stroke-[2.5]" /> : <Pill className="h-5 w-5" />}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{m.name}</p>
          <p className="text-xs text-ink-muted">{m.time} · {m.dose}</p>
        </div>
      </div>
      {isTaken ? (
        <span className="flex items-center gap-1 rounded-full bg-success/15 px-3 py-1.5 text-xs font-bold text-success">
          <Check className="h-3.5 w-3.5 stroke-[3]" />
          Taken
        </span>
      ) : (
        <Btn onClick={onTake} kind="primary" className="flex items-center gap-1.5">
          <Check className="h-4 w-4" aria-hidden="true" />
          Mark taken
        </Btn>
      )}
    </article>
  );
}

// ── Elder quick-report buttons ───────────────────────────────────────
function ElderQuickReport({ onReport }: { onReport: (text: string) => void }) {
  const presets = [
    { text: "I have a headache", label: "Report a headache" },
    { text: "breathing feels worse than yesterday", label: "Report breathing difficulty" },
  ];
  return (
    <div className="grid gap-2 w-full max-w-md">
      {presets.map((p) => (
        <Btn
          key={p.text}
          kind="ghost"
          onClick={() => onReport(p.text)}
          className="!min-h-[56px] !text-base !justify-start"
          aria-label={p.label}
        >
          {p.text}
        </Btn>
      ))}
      <Btn
        kind="danger"
        onClick={() => go("#/sos")}
        className="!min-h-[56px] !text-base flex items-center justify-center gap-2"
        aria-label="Open emergency SOS screen"
      >
        <ShieldAlert className="h-5 w-5" aria-hidden="true" />
        Emergency SOS
      </Btn>
    </div>
  );
}

// ── Home — "Today" engine ────────────────────────────────────────────
export function Home() {
  const { me, pid, adaptiveRaw, setAdaptiveProfile } = useApp();
  const profile = useAdaptiveProfile();
  const elder = isElder(profile);
  const reducedMotion = wantsReducedMotion(profile);
  const voicePrimary = wantsVoicePrimary(profile);

  const [meds, setMeds] = useState<Med[]>([]);
  const [doseStatuses, setDoseStatuses] = useState<Record<number, string>>({});
  const [st, setSt] = useState({
    adherence: 0,
    taken_today: 0,
    total: 0,
    streak: 0,
    xp: 0,
    next_followup: null as string | null,
    week: [] as { date: string; pct: number }[],
  });
  const [burst, setBurst] = useState(0);
  const [alert, setAlert] = useState<{ text: string; rule: string } | null>(null);
  const [followup, setFollowup] = useState("");
  const [why, setWhy] = useState(false);
  const [showAllMeds, setShowAllMeds] = useState(false);

  const load = async () => {
    if (!pid) return;
    try {
      const [mList, dList, stData] = await Promise.all([
        api.meds(pid),
        api.dosesToday(pid).catch(() => []),
        api.stats(pid).catch(() => null),
      ]);
      setMeds(mList);
      const map: Record<number, string> = {};
      dList.forEach((d) => { map[d.medication_id] = d.status; });
      setDoseStatuses(map);
      if (stData) setSt(stData);
    } catch {
      /* offline */
    }
  };
  useEffect(() => {
    load();
  }, [pid]);

  if (!pid) {
    return <Empty text="No patient yet — create a profile or connect with a link code in Settings." />;
  }

  const take = async (m: Med) => {
    // Optimistic status update
    setDoseStatuses((prev) => ({ ...prev, [m.id]: "taken" }));
    setSt((prev) => {
      const newTaken = prev.taken_today + 1;
      const total = Math.max(newTaken, prev.total);
      return {
        ...prev,
        taken_today: newTaken,
        adherence: Math.min(100, Math.round((newTaken / total) * 100)),
      };
    });
    if (!reducedMotion) setBurst((b) => b + 1);
    toast.success(`${m.name} marked as taken!`);
    void speakSmart(`${m.name} marked as taken.`);
    try {
      await api.confirm(pid, m.id);
    } catch {
      /* queued offline */
    }
  };

  const handleVoice = async (text: string) => {
    const res = await processVoiceCommand(text, {
      pid,
      meds,
      onMedUpdated: load,
      adaptiveRaw,
      setAdaptiveProfile,
    });
    if (res.handled) {
      if (res.category === "medication") load();
    } else {
      report(text);
    }
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
    } catch {
      /* offline: local triage already shown */
    }
  };

  // Elder mode: show max 3 medicines, progressive disclosure
  const visibleMeds = elder && !showAllMeds ? meds.slice(0, 3) : meds;
  const hasMoreMeds = elder && meds.length > 3 && !showAllMeds;

  return (
    <div className="grid gap-4">
      {!reducedMotion && <Confetti fire={burst} />}

      {/* ── Greeting section ── */}
      <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Avatar name={me?.name || "Patient"} />
          <div className="min-w-0 flex-1">
            <p className={`font-bold uppercase tracking-[0.08em] text-ink-muted ${elder ? "text-xs" : "text-[11px]"}`}>
              Today's recovery
            </p>
            <h1 className={`truncate font-bold tracking-tight text-ink ${elder ? "text-2xl" : "text-lg"}`}>
              {t(me?.language || "en", "hello")}, {me?.name?.split(" ")[0] || "friend"}
            </h1>
          </div>
          {!elder && (
            <div className="text-right text-xs text-ink-muted">
              <p className="font-semibold text-ink">{st.taken_today}/{st.total} doses</p>
              <p className="flex items-center justify-end gap-1">
                <Flame className="h-3.5 w-3.5 text-warning" aria-hidden="true" />
                {st.streak}-day streak
              </p>
            </div>
          )}
        </div>

        {elder ? (
          /* Elder: simple sentence summary */
          <div className="mt-3 rounded-xl bg-surface-sunken p-4">
            <p className="text-lg font-semibold text-ink">
              {st.total === 0
                ? "No medicines today."
                : st.taken_today === st.total
                  ? "All medicines taken. Well done!"
                  : `${st.total - st.taken_today} medicine${st.total - st.taken_today > 1 ? "s" : ""} left today.`}
            </p>
            {st.next_followup && (
              <p className="mt-1 flex items-center gap-1.5 text-base text-ink-muted">
                <Clock className="h-4 w-4" aria-hidden="true" />
                Next appointment: {st.next_followup}
              </p>
            )}
          </div>
        ) : (
          /* Standard: ring + stats */
          <div className="mt-3 flex items-center gap-4 rounded-xl bg-surface-sunken p-3">
            <Ring pct={st.adherence} />
            <div className="text-sm">
              <p className="font-semibold text-ink">Adherence {st.adherence}%</p>
              <p className="text-[13px] text-ink-muted">
                {st.next_followup ? `Next follow-up: ${st.next_followup}` : "No follow-up scheduled"}
              </p>
            </div>
          </div>
        )}
      </section>

      {window.location.hash.includes("demo=1") && <DemoGuide />}

      {/* ── Safety alert (role=alert + aria-live) ── */}
      {alert && (
        <Card
          className="border-2 border-danger bg-danger-bg"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-center justify-between gap-2">
            <p className={`flex items-center gap-2 font-bold text-danger ${elder ? "text-lg" : "text-sm"}`}>
              <AlertTriangle className={elder ? "h-6 w-6" : "h-5 w-5"} aria-hidden="true" />
              {elder ? "You may need a doctor" : "Please seek medical attention"}
            </p>
            <Badge level="ESCALATE" />
          </div>
          <p className={`mt-2 font-medium text-ink ${elder ? "text-lg leading-relaxed" : "text-sm"}`}>
            {alert.text}
          </p>
          <div className={`mt-3 flex gap-2 ${elder ? "flex-col" : ""}`}>
            <Btn
              kind="danger"
              onClick={() => setAlert(null)}
              className={elder ? "!min-h-[56px] !text-lg" : ""}
            >
              I've received help
            </Btn>
            {!elder && (
              <Btn kind="ghost" onClick={() => setWhy((w) => !w)}>
                Why?
              </Btn>
            )}
          </div>
          {why && !elder && (
            <p className="mt-2 rounded-xl bg-surface p-2 text-xs text-ink-muted border border-border">
              Rule: {alert.rule}. No diagnosis made.
            </p>
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
          <div role="list" aria-label="Today's medicine list">
            {visibleMeds.map((m) =>
              elder ? (
                <ElderMedCard
                  key={m.id}
                  m={m}
                  isTaken={doseStatuses[m.id] === "taken"}
                  onTake={() => take(m)}
                />
              ) : (
                <StandardMedCard
                  key={m.id}
                  m={m}
                  isTaken={doseStatuses[m.id] === "taken"}
                  onTake={() => take(m)}
                />
              )
            )}
            {visibleMeds.length > 0 && visibleMeds.every((m) => doseStatuses[m.id] === "taken") && (
              <div className="my-2 flex items-center gap-2.5 rounded-xl border border-success/30 bg-success-bg/30 p-3 text-success">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <p className="text-xs font-bold leading-snug">All medicines for today have been taken! Keep up the wonderful progress.</p>
              </div>
            )}
            {hasMoreMeds && (
              <Btn
                kind="ghost"
                onClick={() => setShowAllMeds(true)}
                className="!min-h-[56px] !text-base !w-full"
              >
                Show {meds.length - 3} more medicine{meds.length - 3 > 1 ? "s" : ""}
              </Btn>
            )}
          </div>
        )}
        <button
          className={`mt-2 inline-flex min-h-[44px] items-center gap-1 font-semibold text-primary hover:underline ${
            elder ? "text-base" : "text-[13px]"
          }`}
          onClick={() => go("#/meds")}
          aria-label="Manage all medicines"
        >
          <span>Manage medicines</span>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </Card>

      {/* ── Voice / symptom reporting ── */}
      <section aria-label="Symptom reporting" className="grid place-items-center gap-3 py-2 text-center">
        <VoiceInputButton
          onTranscript={(text) => handleVoice(text)}
          elderVariant={elder || voicePrimary}
          className="mx-auto"
        />

        <p className={`text-ink-muted ${elder ? "text-base" : "text-xs"}`}>
          {elder
            ? "Tap to tell me how you feel"
            : t(me?.language || "en", "talk")}
        </p>

        {/* AI follow-up live region */}
        {followup && (
          <div
            role="status"
            aria-live="polite"
            className="w-full text-left"
          >
            <Card className="border border-primary/30 bg-primary-soft">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                  <p className={`font-medium text-ink ${elder ? "text-lg" : "text-sm"}`}>
                    Sathi asks: {followup}
                  </p>
                </div>
                <button
                  aria-label="Dismiss follow-up question"
                  className="min-h-[44px] min-w-[44px] grid place-items-center rounded-lg text-ink-muted hover:text-ink"
                  onClick={() => setFollowup("")}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </Card>
          </div>
        )}

        {elder ? (
          <ElderQuickReport onReport={report} />
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Btn kind="ghost" onClick={() => report("mild headache")}>
              headache
            </Btn>
            <Btn kind="ghost" onClick={() => report("breathing feels worse than yesterday")}>
              breathing worse
            </Btn>
            <Btn
              kind="danger"
              onClick={() => go("#/sos")}
              className="flex items-center gap-1.5"
            >
              <ShieldAlert className="h-4 w-4" aria-hidden="true" />
              SOS
            </Btn>
          </div>
        )}
      </section>
    </div>
  );
}
