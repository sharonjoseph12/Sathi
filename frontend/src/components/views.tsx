import { useEffect, useState } from "react";
import { api, localSafety } from "../lib/api";
import type { Event, Med } from "../lib/api";
import { go, useApp } from "../lib/store";
import { useAdaptiveProfile } from "../lib/useAdaptiveProfile";
import { Badge, Btn, Card, Confetti, Empty, Input, Page, Ring, SectionLabel, Seg } from "./ui";
import { Icon } from "./icons";
import { TrustBadge } from "./os";
import { listenOnce, speak } from "../screens/home";
import { playChime, speakSmart } from "../lib/voice";

// ═══ PersonalToday — "what matters now" ═══════════════════════════════
export function PersonalToday() {
  const { me, pid } = useApp();
  const { isElder, prefersReducedMotion } = useAdaptiveProfile();
  const [doses, setDoses] = useState<{ medication_id: number; name: string; time: string; status: string }[]>([]);
  const [st, setSt] = useState({ adherence: 0, taken_today: 0, total: 0, next_followup: null as string | null });
  const [fus, setFus] = useState<{ title: string; date_time: string }[]>([]);
  const [burst, setBurst] = useState(0);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [showAllDoses, setShowAllDoses] = useState(false);
  const [alertMsg, setAlertMsg] = useState("");

  useEffect(() => {
    if (!pid) return;
    api.dosesToday(pid).then(setDoses).catch(() => {});
    api.stats(pid).then((s) => setSt({ adherence: s.adherence, taken_today: s.taken_today, total: s.total, next_followup: s.next_followup })).catch(() => {});
    api.followups(pid).then((f) => setFus(f.filter((x) => !x.completed).slice(0, 2))).catch(() => {});
  }, [pid]);

  if (!pid) return <Empty text="No patient yet — link one in Settings." />;
  const pending = doses.filter((d) => d.status === "pending");
  const hr = new Date().getHours();
  const greet = hr < 12 ? "Good morning" : hr < 17 ? "Good afternoon" : "Good evening";

  const take = async (mid: number) => {
    setDoses((ds) => ds.filter((d) => d.medication_id !== mid));
    if (!prefersReducedMotion) setBurst((b) => b + 1);
    playChime("success");
    try { await api.confirm(pid, mid); } catch { /* queued offline */ }
    try {
      const s = await api.stats(pid);
      setSt({ adherence: s.adherence, taken_today: s.taken_today, total: s.total, next_followup: s.next_followup });
    } catch { /* offline */ }
  };

  const readAloud = () => {
    playChime("neutral");
    setSpeaking(true);
    const text = pending.length === 0
      ? `${greet}, ${me?.name?.split(" ")[0] || "friend"}. You have taken all your medicines for today. Wonderful job!`
      : `${greet}, ${me?.name?.split(" ")[0] || "friend"}. You have ${pending.length} medicine${pending.length > 1 ? "s" : ""} left to take today. Next is ${pending[0].name} scheduled for ${pending[0].time}.`;
    speak(text);
    setTimeout(() => setSpeaking(false), 5000);
  };

  const handleQuickSymptom = async (symptomName: string) => {
    playChime("alert");
    try {
      await api.symptom(pid, symptomName, 6);
      const msg = `Reported ${symptomName}. Your caregiver has been notified.`;
      setAlertMsg(msg);
      speak(msg);
      setTimeout(() => setAlertMsg(""), 7000);
    } catch {
      setAlertMsg(`Logged ${symptomName}.`);
    }
  };

  const visibleDoses = showAllDoses ? pending : pending.slice(0, 3);

  // ── Elder-First View ──
  if (isElder) {
    return (
      <div className="grid gap-4">
        <Confetti fire={burst} />

        {/* Comforting Elder Greeting Header */}
        <div className="rounded-3xl border-2 border-primary/20 bg-card p-5 shadow-sm">
          <p className="text-xs font-extrabold uppercase tracking-wider text-primary">Your Daily Recovery</p>
          <h1 className="mt-1 text-[26px] font-extrabold leading-tight text-ink">
            {greet}, {me?.name?.split(" ")[0] || "friend"}
          </h1>
          <p className="mt-2 text-lg font-medium text-muted-fg">
            {pending.length === 0
              ? "🎉 You have taken all your medicines today! Well done."
              : `You have ${pending.length} medicine${pending.length > 1 ? "s" : ""} left to take today.`}
          </p>
          <button
            onClick={readAloud}
            aria-label="Read today's schedule aloud"
            className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm font-bold text-primary active:scale-[0.98]">
            <span aria-hidden="true">🔊</span> {speaking ? "Speaking…" : "Listen to summary"}
          </button>
        </div>

        {/* Safety Alert Notification */}
        {alertMsg && (
          <div role="alert" className="flex items-start justify-between gap-3 rounded-2xl border-2 border-danger bg-red-50 p-4 text-red-950 shadow-sm dark:bg-red-950/30 dark:text-red-200">
            <div className="flex items-start gap-2">
              <span className="text-xl" aria-hidden="true">⚠️</span>
              <div>
                <p className="font-bold">{alertMsg}</p>
                <p className="text-xs">If you feel unwell, tap the red SOS button at top right.</p>
              </div>
            </div>
            <button onClick={() => setAlertMsg("")} aria-label="Dismiss alert" className="grid h-[44px] w-[44px] place-items-center rounded-full text-base font-bold">
              ✕
            </button>
          </div>
        )}

        {/* Voice Assistant Quick Card */}
        <div className="flex items-center gap-4 rounded-3xl border-2 border-border bg-card p-4 shadow-sm">
          <button
            onClick={() => listenOnce((t) => { if (t) { playChime("start"); go("#/sathi"); } }, setListening)}
            aria-label={listening ? "Listening to your voice" : "Tap microphone to speak with Sathi"}
            className={`grid h-16 w-16 shrink-0 place-items-center rounded-full text-2xl text-white shadow-md transition-all active:scale-95 ${listening ? "animate-pulse bg-danger" : "bg-primary"}`}>
            <span aria-hidden="true">🎙️</span>
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold text-ink">Talk to Sathi</p>
            <p className="text-sm text-muted-fg">
              {listening ? "Listening now… speak clearly" : "Tap the mic to say how you feel"}
            </p>
          </div>
        </div>

        {/* Next Doses with 60px full-width touch targets */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight text-ink">Medicines to take</h2>
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-primary">
              {pending.length} remaining
            </span>
          </div>

          {visibleDoses.map((d) => (
            <div key={d.medication_id} className="mb-3 rounded-3xl border-2 border-border bg-card p-5 shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-extrabold text-ink">{d.name}</h3>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="inline-flex items-center rounded-xl bg-secondary px-3 py-1 text-sm font-extrabold text-primary">
                      ⏰ {d.time}
                    </span>
                    <TrustBadge source="doctor_confirmed" />
                  </div>
                </div>
              </div>
              <button
                onClick={() => take(d.medication_id)}
                aria-label={`Mark ${d.name} taken`}
                className="flex min-h-[60px] w-full items-center justify-center gap-2 rounded-2xl bg-success text-xl font-bold text-white shadow-md transition-transform active:scale-[0.99]">
                <span aria-hidden="true">✓</span> Take medicine
              </button>
            </div>
          ))}

          {pending.length === 0 && (
            <div className="rounded-3xl border-2 border-dashed border-border p-6 text-center">
              <p className="text-3xl" aria-hidden="true">🎉</p>
              <p className="mt-2 text-base font-bold">All caught up!</p>
              <p className="text-sm text-muted-fg">No pending medicines right now.</p>
            </div>
          )}

          {pending.length > 3 && (
            <button
              onClick={() => setShowAllDoses(!showAllDoses)}
              className="mt-1 flex min-h-[48px] w-full items-center justify-center rounded-2xl border border-border bg-card text-sm font-bold text-primary">
              {showAllDoses ? "Show fewer medicines" : `+ Show ${pending.length - 3} more medicines`}
            </button>
          )}
        </div>

        {/* 1-Tap Quick Symptom Reporting */}
        <div className="rounded-3xl border-2 border-border bg-card p-4 shadow-sm">
          <h2 className="mb-1 text-base font-bold text-ink">Quick check-in</h2>
          <p className="mb-3 text-sm text-muted-fg">Feeling any of these right now? Tap once to report:</p>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { label: "Dizziness", icon: "💫" },
              { label: "Pain", icon: "🩹" },
              { label: "Nausea", icon: "🤢" },
              { label: "Fever", icon: "🌡️" },
            ].map((s) => (
              <button
                key={s.label}
                onClick={() => handleQuickSymptom(s.label)}
                className="flex min-h-[56px] items-center gap-2.5 rounded-2xl border border-border bg-secondary/60 px-4 py-2 text-left font-bold text-ink shadow-sm transition-colors active:scale-[0.98] hover:bg-secondary">
                <span className="text-2xl" aria-hidden="true">{s.icon}</span>
                <span className="text-base">{s.label}</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => go("#/symptoms")}
            className="mt-3 flex min-h-[44px] w-full items-center justify-center text-sm font-bold text-primary">
            More symptoms or details →
          </button>
        </div>

        {/* Upcoming appointments preview */}
        {fus.length > 0 && (
          <div className="rounded-3xl border-2 border-border bg-card p-4 shadow-sm">
            <h2 className="mb-2 text-base font-bold text-ink">📅 Doctor appointments</h2>
            {fus.map((f, i) => (
              <div key={i} className="mb-1.5 rounded-2xl bg-muted/60 p-3">
                <p className="text-base font-bold">{f.title}</p>
                <p className="text-sm text-muted-fg">{f.date_time}</p>
              </div>
            ))}
            <button onClick={() => go("#/followups")} className="mt-1 flex min-h-[44px] items-center text-sm font-bold text-primary">
              All appointments →
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Standard Mode View ──
  return (
    <div className="grid gap-3">
      <Confetti fire={burst} />
      <Card>
        <div className="flex items-center gap-3">
          <Ring pct={st.adherence} />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-fg">What matters now</p>
            <h2 className="truncate text-lg font-bold tracking-tight">
              {greet}, {me?.name?.split(" ")[0] || "friend"}
            </h2>
            <p className="text-[13px] text-muted-fg">
              {st.taken_today}/{st.total} doses taken
              {st.next_followup ? ` · Next: ${st.next_followup}` : ""}
            </p>
          </div>
          <button
            onClick={readAloud}
            aria-label="Read today's schedule aloud"
            title="Listen to summary"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-secondary text-base font-bold text-primary active:scale-95">
            🔊
          </button>
        </div>
      </Card>

      <div>
        <SectionLabel>Next doses</SectionLabel>
        {pending.slice(0, 3).map((d) => (
          <div key={d.medication_id} className="mb-2 flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-secondary text-xs font-bold text-primary">{d.time}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">💊 {d.name}</p>
              <TrustBadge source="doctor_confirmed" />
            </div>
            <Btn kind="success" onClick={() => take(d.medication_id)}>Take</Btn>
          </div>
        ))}
        {pending.length === 0 && <Empty title="All caught up" text="No pending doses right now." />}
        {pending.length > 3 && (
          <button onClick={() => go("#/health")} className="min-h-[44px] text-[13px] font-bold text-primary">
            +{pending.length - 3} more in Health →
          </button>
        )}
      </div>

      <div className="flex gap-2">
        <Btn kind="ghost" onClick={() => go("#/symptoms")} className="flex-1">＋ Log symptom</Btn>
        <Btn kind="ghost" onClick={() => go("#/sathi")} className="flex-1">💬 Ask Sathi</Btn>
      </div>

      {fus.length > 0 && (
        <Card>
          <SectionLabel>Coming up</SectionLabel>
          {fus.map((f, i) => <p key={i} className="text-sm">📅 <b>{f.title}</b> <span className="text-muted-fg">· {f.date_time}</span></p>)}
          <button onClick={() => go("#/followups")} className="mt-1 min-h-[44px] text-[13px] font-bold text-primary">All follow-ups →</button>
        </Card>
      )}
      <button onClick={() => go("#/progress")} className="min-h-[44px] text-[13px] font-bold text-primary">View my progress →</button>
    </div>
  );
}

// ═══ ClinicalHealth — Meds / Symptoms / Timeline ══════════════════════
export function ClinicalHealth() {
  const { pid } = useApp();
  const { isElder } = useAdaptiveProfile();
  const [tab, setTab] = useState<"meds" | "symptoms" | "timeline">("meds");
  const [meds, setMeds] = useState<Med[]>([]);
  const [week, setWeek] = useState<{ date: string; pct: number }[]>([]);
  const [adherence, setAdherence] = useState(0);
  const [syms, setSyms] = useState<{ id: number; symptoms: string[]; severity: number; risk: string }[]>([]);
  const [tl, setTl] = useState<Event[]>([]);

  useEffect(() => {
    if (!pid) return;
    api.meds(pid).then(setMeds).catch(() => {});
    api.stats(pid).then((s) => { setWeek(s.week); setAdherence(s.adherence); }).catch(() => {});
    api.symptoms(pid).then(setSyms).catch(() => {});
    api.timeline(pid).then(setTl).catch(() => {});
  }, [pid]);

  const adherenceStatus = adherence >= 80 ? "Excellent" : adherence >= 60 ? "Moderate" : "Needs Attention";
  const adherenceColor = adherence >= 80 ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300" : adherence >= 60 ? "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300" : "bg-red-100 text-red-900 dark:bg-red-950/40 dark:text-red-300";

  return (
    <div className="grid gap-3">
      <Page title="Health" sub={`${meds.length} active medicines · 7-day adherence ${adherence}%`} />

      {/* Adherence Overview Banner */}
      <div className="flex items-center justify-between rounded-3xl border border-border bg-card p-4 shadow-sm">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-fg">Recovery Adherence</p>
          <p className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink">{adherence}%</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${adherenceColor}`}>
          ● {adherenceStatus}
        </span>
      </div>

      <Seg opts={["meds", "symptoms", "timeline"] as ("meds" | "symptoms" | "timeline")[]} val={tab} set={setTab} />

      {tab === "meds" && (
        <>
          {week.length > 0 && (
            <Card>
              <div className="mb-2 flex items-center justify-between">
                <SectionLabel>Past 7 days adherence</SectionLabel>
                <span className="text-xs font-bold text-muted-fg">Target: 80%+</span>
              </div>
              <div className="flex items-end gap-2 pt-2" aria-label="7-day adherence">
                {week.map((d) => (
                  <div key={d.date} className="flex flex-1 flex-col items-center gap-1.5">
                    <span className="text-[10px] font-bold text-muted-fg">{d.pct}%</span>
                    <div className="w-full rounded-t-xl bg-secondary" style={{ height: 64 }}>
                      <div
                        className="w-full rounded-t-xl bg-gradient-to-t from-primary to-primary/80 transition-all"
                        style={{ height: `${Math.max(d.pct, 6)}%`, marginTop: `${100 - Math.max(d.pct, 6)}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-muted-fg">{d.date.slice(5)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <div className="grid gap-2">
            {meds.map((m) => (
              <div key={m.id} className={`rounded-2xl border border-border bg-card p-3.5 shadow-sm ${isElder ? "p-4" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className={`font-bold text-ink ${isElder ? "text-lg" : "text-sm"}`}>💊 {m.name}</p>
                    <p className={`mt-0.5 text-muted-fg ${isElder ? "text-sm" : "text-xs"}`}>
                      Take at <b>{m.time}</b> · {m.dose}
                    </p>
                  </div>
                  <TrustBadge source="hospital_discharge" />
                </div>
              </div>
            ))}
          </div>

          {meds.length === 0 && <Empty text="No medicines on file." />}
          <button onClick={() => go("#/meds")} className="flex min-h-[44px] items-center text-sm font-bold text-primary">
            Manage & add medicines →
          </button>
        </>
      )}

      {tab === "symptoms" && (
        <>
          <div className="grid gap-2">
            {syms.map((s) => (
              <div key={s.id} className={`rounded-2xl border border-border bg-card p-3.5 shadow-sm ${isElder ? "p-4" : ""}`}>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className={`font-bold text-ink ${isElder ? "text-lg" : "text-sm"}`}>
                      {(s.symptoms || []).join(", ") || "Reported symptom"}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-fg">Severity: <b>{s.severity}/10</b></p>
                  </div>
                  <Badge level={s.risk} />
                </div>
              </div>
            ))}
          </div>
          {syms.length === 0 && <Empty text="No symptoms reported yet. Keep it up!" />}
          <Btn kind="ghost" onClick={() => go("#/symptoms")}>＋ Report symptom</Btn>
        </>
      )}

      {tab === "timeline" && (
        <Card>
          <div className="border-l-2 border-primary/30 pl-4">
            {tl.slice(0, 30).map((e, i) => {
              const isMed = e.event_type.includes("MED") || e.event_type.includes("DOSE");
              const isAlert = e.event_type.includes("ALERT") || e.event_type.includes("SOS");
              const isSym = e.event_type.includes("SYMPTOM");
              const icon = isMed ? "💊" : isAlert ? "⚠️" : isSym ? "🌡️" : "📋";
              return (
                <div key={i} className="relative mb-3.5 pb-1">
                  <span className="absolute -left-[23px] top-0.5 grid h-4 w-4 place-items-center rounded-full bg-card text-[10px] shadow-sm">
                    {icon}
                  </span>
                  <p className={`font-bold text-ink ${isElder ? "text-base" : "text-sm"}`}>{e.description}</p>
                  <p className="text-xs text-muted-fg">
                    {e.event_type}{e.severity ? ` · ${e.severity}` : ""}
                  </p>
                </div>
              );
            })}
            {tl.length === 0 && <Empty text="No timeline events recorded yet." />}
          </div>
        </Card>
      )}
    </div>
  );
}

// ═══ SathiEngine — AI companion ═══════════════════════════════════════
const CHIPS = ["What medicines do I need?", "I feel dizzy", "When is my appointment?", "I'm feeling anxious"];

export function SathiEngine() {
  const { me, pid } = useApp();
  const { isElder } = useAdaptiveProfile();
  const [msgs, setMsgs] = useState<{ from: string; text: string }[]>([]);
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [escalated, setEscalated] = useState(false);

  const send = async (raw: string) => {
    const t = raw.trim();
    if (!t || !pid) return;
    setText("");
    playChime("start");
    setMsgs((m) => [...m, { from: "me", text: t }]);
    if (localSafety(t) === "ESCALATE") setEscalated(true);
    try {
      const r = await api.aiChat(pid, t);
      if (r.safety === "ESCALATE") setEscalated(true);
      setMsgs((m) => [...m, { from: "sathi", text: r.message }]);
      playChime("neutral");
      if (isElder) {
        speak(r.message);
      } else {
        void speakSmart(r.message, me?.language ? `${me.language}-IN` : "en-IN");
      }
    } catch {
      setMsgs((m) => [...m, { from: "sathi", text: "(offline — will reply when connected)" }]);
    }
  };

  return (
    <div className="grid gap-3">
      <Page title="Sathi" sub="Your recovery companion — not a doctor" />
      {escalated && (
        <Card accent="#B42318">
          <p className="flex items-center gap-2 text-sm font-bold text-danger"><Icon name="alert" size={18} /> This may need urgent care</p>
          <p className="mt-1 text-[13px]">Please contact your doctor now. Your caregiver has been flagged automatically.</p>
          <div className="mt-2 flex gap-2">
            <Btn kind="danger" onClick={() => go("#/sos")}>🆘 Open SOS</Btn>
            <Btn kind="ghost" onClick={() => setEscalated(false)}>Dismiss</Btn>
          </div>
        </Card>
      )}
      <Card>
        <div className="mb-3 grid max-h-80 gap-2.5 overflow-y-auto" aria-live="polite">
          {msgs.length === 0 && (
            <div className="p-4 text-center">
              <p className="text-3xl" aria-hidden="true">💬</p>
              <p className={`mt-2 font-semibold text-ink ${isElder ? "text-base" : "text-sm"}`}>Ask Sathi anything about your recovery</p>
              <p className="text-xs text-muted-fg">Medicines, symptoms, appointments or peace of mind</p>
            </div>
          )}
          {msgs.map((m, i) => (
            <div key={i} className={`max-w-[85%] rounded-2xl p-3 shadow-sm ${isElder ? "text-base" : "text-sm"} ${m.from === "me" ? "justify-self-end bg-primary text-white" : "bg-secondary text-ink"}`}>
              {m.text}
            </div>
          ))}
        </div>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {CHIPS.map((c) => (
            <button key={c} onClick={() => send(c)} className={`rounded-full bg-secondary font-bold text-primary transition-colors hover:bg-secondary/80 ${isElder ? "min-h-[48px] px-4 text-sm" : "min-h-[44px] px-3 text-xs"}`}>{c}</button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={() => listenOnce((t) => send(t), setListening)} title="Dictate" aria-label="Dictate a message"
            className={`shrink-0 rounded-full text-lg shadow-sm transition-all active:scale-95 ${isElder ? "h-[52px] w-[52px]" : "h-11 w-11"} ${listening ? "animate-pulse bg-danger text-white" : "bg-secondary text-ink"}`}>🎙</button>
          <Input placeholder="Ask Sathi…" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send(text)} className={isElder ? "min-h-[52px] text-base" : ""} />
          <Btn onClick={() => send(text)} className={isElder ? "min-h-[52px] px-5 text-base" : ""}>Send</Btn>
        </div>
        {listening && <p className="mt-2 text-xs font-bold text-primary animate-pulse">● Listening… speak now</p>}
      </Card>
      <p className="text-center text-[11px] text-muted-fg">Sathi supports recovery — it does not diagnose or prescribe. In an emergency call 112.</p>
    </div>
  );
}

// ═══ FamilyCircle — caregiver triage ══════════════════════════════════
type CgP = { id: number; name: string; condition: string; rel: string; adherence: number; risk: string; recent: string[] };

export function FamilyCircle() {
  const [list, setList] = useState<CgP[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const [detail, setDetail] = useState<{ timeline: Event[]; symptoms: { symptoms: string[]; severity: number; risk: string }[]; doses: { name: string; status: string }[] } | null>(null);
  const [nudge, setNudge] = useState("");
  const [msg, setMsg] = useState("");
  const [shared, setShared] = useState("");

  useEffect(() => { api.cgPatients().then(setList).catch(() => setMsg("Could not load — log in as caregiver/family.")); }, []);

  const openDetail = async (id: number) => {
    setOpen(id); setDetail(null);
    try {
      const d = await api.cgDetail(id);
      setDetail(d);
    } catch { /* offline */ }
    try {
      const c = await api.consent(id);
      const act = c.care_links.filter((l) => l.status === "active").length;
      setShared(`${act} care link(s) active`);
    } catch { setShared(""); }
  };

  const ack = async (pid: number) => {
    const ev = detail?.timeline.find((e) => (e.event_type === "SAFETY_ALERT" || e.event_type === "CAREGIVER_ALERT") && !(e.description || "").startsWith("[ACK] "));
    if (!ev?.id) { setMsg("Nothing to acknowledge."); return; }
    try { await api.ackAlert(pid, ev.id); setMsg("✓ Acknowledged — care team notified."); openDetail(pid); }
    catch (e) { setMsg(e instanceof Error ? e.message : "failed"); }
  };

  const urgent = list.filter((p) => p.risk === "high" || p.adherence < 60);
  const fine = list.filter((p) => !(p.risk === "high" || p.adherence < 60));

  const row = (p: CgP) => (
    <Card key={p.id} accent={p.risk === "high" || p.adherence < 60 ? "#B42318" : undefined}>
      <div className="flex items-center gap-3">
        <Ring pct={p.adherence} size={56} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{p.name}</p>
          <p className="truncate text-xs text-muted-fg">{p.condition} · {p.rel}</p>
          {p.recent[0] && <p className="truncate text-xs">Latest: {p.recent[0]}</p>}
        </div>
        <Badge level={p.risk} />
      </div>
      <div className="mt-2 flex gap-2">
        <Btn kind="ghost" onClick={() => (open === p.id ? setOpen(null) : openDetail(p.id))}>{open === p.id ? "Close" : "Open"}</Btn>
        <Btn kind="ghost" onClick={async () => { try { await api.nudge(p.id, "💜 Thinking of you — keep going!"); setMsg("Nudge sent"); } catch { setMsg("Nudge failed"); } }}>💜 Nudge</Btn>
      </div>
      {open === p.id && (
        <div className="mt-3 grid gap-2 border-t border-border pt-3">
          {!detail ? <Empty text="Loading…" /> : (
            <>
              <p className="text-xs font-bold">Timeline preview</p>
              {detail.timeline.slice(0, 4).map((e, i) => (
                <p key={i} className="text-[13px]">• {e.description} <span className="text-xs text-muted-fg">({e.event_type})</span></p>
              ))}
              {detail.timeline.length === 0 && <p className="text-xs text-muted-fg">No events.</p>}
              <Btn kind="ghost" onClick={() => ack(p.id)}>✓ Acknowledge alert</Btn>
              <div className="flex gap-2">
                <Input placeholder="Write a nudge…" value={nudge} onChange={(e) => setNudge(e.target.value)} />
                <Btn onClick={async () => { if (nudge) { try { await api.nudge(p.id, nudge); setNudge(""); setMsg("✓ Sent"); } catch { setMsg("Failed"); } } }}>Send</Btn>
              </div>
              {shared && <p className="text-[11px] text-muted-fg">Sharing: {shared}. Max 3 nudges/hour.</p>}
            </>
          )}
        </div>
      )}
    </Card>
  );

  return (
    <div className="grid gap-3">
      <Page title="Family circle" sub="Attention first, reassurance second" />
      {msg && <p className="text-xs font-semibold">{msg}</p>}
      <div><SectionLabel>⚠ Attention now ({urgent.length})</SectionLabel>
        {urgent.map(row)}
        {urgent.length === 0 && <Empty text="No urgent patients. 🎉" />}</div>
      <div><SectionLabel>✓ All fine ({fine.length})</SectionLabel>
        {fine.map(row)}
        {fine.length === 0 && <Empty text="Nothing here." />}</div>
      <p className="text-[11px] text-muted-fg">You see doses, symptoms and timeline. Journal and private chat stay hidden unless the patient shares them.</p>
    </div>
  );
}

// ═══ MoreSettings — sectioned, never a flat grid ═════════════════════
const GROUPS: { label: string; items: [string, string, string, string][] }[] = [
  {
    label: "Health records",
    items: [
      ["#/m/visit", "Visit summary", "Print-ready handoff for doctors", "file"],
      ["#/m/what", "What changed", "Medicines, symptoms, adherence delta", "chart"],
      ["#/m/inbox", "Scan inbox", "Review AI reads before importing", "scan"],
      ["#/m/clipboard", "Emergency card", "Blood, allergies, contacts", "shield"],
      ["#/m/vault", "Plan vault", "All discharge plan versions", "book"],
    ],
  },
  {
    label: "Recovery tools",
    items: [
      ["#/scan", "Scan prescription", "Extract medicines from photo", "scan"],
      ["#/drug", "Drug check", "Interaction review", "shield"],
      ["#/simplify", "Simplify jargon", "Plain-language explanations", "book"],
      ["#/journal", "Journal", "Mood, energy and notes", "file"],
      ["#/meditate", "Breathing", "Guided recovery exercise", "clock"],
    ],
  },
  {
    label: "Planning",
    items: [
      ["#/schedule", "Schedule", "Medicines and tasks for today", "calendar"],
      ["#/progress", "Progress", "Adherence and timeline", "chart"],
      ["#/followups", "Follow-ups", "Appointments and visits", "calendar"],
      ["#/timeline", "Timeline", "Full recovery record", "file"],
      ["#/reminders", "Reminders", "Manage notifications", "bell"],
      ["#/plans", "Discharge plans", "Hospital instructions", "file"],
      ["#/report", "Recovery report", "Summary for care team", "file"],
    ],
  },
  {
    label: "Account",
    items: [
      ["#/settings", "Settings", "Language, theme, access", "gear"],
      ["#/notifs", "Notifications", "Alerts and updates", "bell"],
      ["#/help", "Help", "Support and guidance", "book"],
      ["#/demo", "Judge demo", "Guided evaluation flow", "check"],
      ["#/sos", "Emergency SOS", "Urgent help and contacts", "sos"],
    ],
  },
];

export function MoreSettings() {
  const { isElder } = useAdaptiveProfile();
  return (
    <div className="grid gap-4">
      <Page title="More" sub="Tools, planning and account" />
      {GROUPS.map((g) => (
        <section key={g.label} aria-label={g.label}>
          <SectionLabel>{g.label}</SectionLabel>
          <div className="grid gap-2">
            {g.items.map(([p, title, sub, ic]) => (
              <button key={p} onClick={() => go(p)}
                className={`flex items-center gap-3 rounded-2xl border border-border bg-card text-left shadow-sm transition-colors hover:bg-secondary/40 active:scale-[0.99] ${isElder ? "min-h-[56px] p-3.5" : "min-h-[44px] p-3"}`}>
                <span className={`grid shrink-0 place-items-center rounded-xl bg-secondary text-primary ${isElder ? "h-11 w-11" : "h-9 w-9"}`}><Icon name={ic} size={isElder ? 22 : 18} /></span>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate font-bold text-ink ${isElder ? "text-base" : "text-sm"}`}>{title}</span>
                  <span className={`block truncate text-muted-fg ${isElder ? "text-sm" : "text-xs"}`}>{sub}</span>
                </span>
                <span className="text-muted-fg"><Icon name="arrow" size={16} /></span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
