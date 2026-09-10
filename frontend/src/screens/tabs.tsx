import { useEffect, useState } from "react";
import { api, localSafety, type Event, type Med } from "../lib/api";
import { t } from "../lib/i18n";
import { speakSmart } from "../lib/voice";
import { go, useApp } from "../lib/store";
import { Badge, Btn, Card, Confetti, Empty, Input, Mascot, Page, Ring, Seg, Toggle } from "../components/ui";

// Shared voice listener: Web Speech API, else typed fallback
export function listenOnce(cb: (text: string) => void, setListening: (b: boolean) => void) {
  const W = window as unknown as { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any };
  const Ctor = W.SpeechRecognition || W.webkitSpeechRecognition;
  if (!Ctor) {
    const t = prompt("Say / type symptom:", "breathing feels worse than yesterday");
    if (t) cb(t);
    return;
  }
  const rec = new Ctor();
  rec.lang = "en-IN"; setListening(true);
  rec.onresult = (e: any) => cb(e.results[0][0].transcript);
  rec.onend = () => setListening(false); rec.onerror = () => setListening(false);
  rec.start();
}
export function speak(text: string) {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-IN"; speechSynthesis.cancel(); speechSynthesis.speak(u);
  } catch { /* voice optional */ }
}

// Guided judge walkthrough: PRD acceptance flow as a dismissible checklist.
function DemoGuide() {
  const steps: [string, string][] = [
    ["Mark a medicine Taken below — ring + confetti update", "#/home"],
    ["Report “breathing feels worse” in Symptoms — safety triage + AI follow-up", "#/symptoms"],
    ["Ask the AI companion, then send a voice note — Whisper + neural voice", "#/chat"],
    ["Scan a prescription, or run the drug interaction check", "#/scan"],
    ["Open Emergency SOS — panic flow, 108/112 dial, CPR coach, QR card", "#/sos"],
    ["Print the Recovery report with Clinical AI Summary", "#/report"],
  ];
  return (
    <div className="animate-slide-up sticky top-2 z-50 rounded-2xl bg-primary p-3 text-white shadow-lg">
      <div className="flex items-center justify-between">
        <p className="font-bold">▶ Judge demo — Meena's recovery in 6 taps</p>
        <button onClick={() => window.location.hash = "#/home"} className="rounded-full bg-white/20 px-2 text-xs">Close</button>
      </div>
      <ol className="mt-2 grid gap-1">
        {steps.map(([label, path], i) => (
          <li key={i}>
            <button onClick={() => go(path)} className="w-full rounded-xl bg-white/10 p-2 text-left text-xs font-semibold active:scale-[0.99]">
              {i + 1}. {label} →
            </button>
          </li>
        ))}
      </ol>
      <p className="mt-1 text-[11px] text-white/80">Then log in as priya@sathi.demo (caregiver) to see the SOS/symptom alerts land.</p>
    </div>
  );
}

export function Home() {
  const { me, pid } = useApp();
  const [meds, setMeds] = useState<Med[]>([]);
  const [st, setSt] = useState({ adherence: 0, taken_today: 0, total: 0, streak: 0, xp: 0, next_followup: null as string | null, week: [] as { date: string; pct: number }[] });
  const [burst, setBurst] = useState(0);
  const [alert, setAlert] = useState<{ text: string; rule: string } | null>(null);
  const [followup, setFollowup] = useState("");
  const [why, setWhy] = useState(false);
  const [listening, setListening] = useState(false);
  const load = async () => {
    if (!pid) return;
    try { setMeds(await api.meds(pid)); } catch { /* offline */ }
    try { setSt(await api.stats(pid)); } catch { /* offline */ }
  };
  useEffect(() => { load(); }, [pid]);
  if (!pid) return <Empty text="No patient yet — create a profile or connect with a link code in Settings." />;

  const take = async (m: Med) => {
    setMeds((ms) => ms.filter((x) => x.id !== m.id));
    setBurst((b) => b + 1); // 🎉 gamified reward
    try { await api.confirm(pid, m.id); } catch { /* queued offline */ }
    load();
  };
  const report = async (text: string) => {
    const lv = localSafety(text);
    if (lv === "ESCALATE") setAlert({ text: "This may need urgent medical attention. Please contact your doctor now.", rule: `emergency pattern in “${text}”` });
    try {
      const r = await api.symptom(pid, text);
      if (r.safety_status === "ESCALATE") setAlert({ text: "Safety review flagged this. Please seek medical help.", rule: "server rule ESCALATE" });
      if (r.ai_followup) {
        setFollowup(r.ai_followup);
        void speakSmart(r.ai_followup, me?.language ? `${me.language}-IN` : "en-IN");
      } else {
        speak(r.safety_status === "ESCALATE" ? "Please seek medical help." : "Noted. I logged that.");
      }
    } catch { /* offline: local triage already shown */ }
  };

  return (
    <div className="grid gap-4">
      <Confetti fire={burst} />
      <header className="overflow-hidden rounded-b-[40px] bg-gradient-to-r from-[#4B26C8] via-[#6C47FF] to-[#8B5CF6] p-5 text-white">
        <div className="flex items-center justify-between">
          <div><h1 className="text-xl font-extrabold">{t(me?.language || "en", "hello")}, {me?.name?.split(" ")[0] || "friend"}</h1>
            <p className="text-xs text-white/80">{st.taken_today} of {st.total} doses · 🔥 {st.streak}d streak · ✨ {st.xp} XP</p></div>
          <div className="animate-float">
            <Mascot mood={alert ? "concerned" : "happy"} />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-4 rounded-[18px] bg-white/10 p-3">
          <Ring pct={st.adherence} />
          <div className="text-sm">
            <p className="font-bold">Today's recovery</p>
            <p className="text-white/80">{st.next_followup ? `Next: ${st.next_followup}` : "No follow-up scheduled"}</p>
          </div>
        </div>
      </header>

      {window.location.hash.includes("demo=1") && <DemoGuide />}

      {alert && (
        <Card accent="#EF4444">
          <div className="flex items-center justify-between"><p className="font-bold text-danger">⚠ Please seek medical attention</p><Badge level="ESCALATE" /></div>
          <p className="mt-2 text-sm">{alert.text}</p>
          <div className="mt-2 flex gap-2"><Btn kind="danger" onClick={() => setAlert(null)}>I've received help</Btn><Btn kind="ghost" onClick={() => setWhy((w) => !w)}>Why?</Btn></div>
          {why && <p className="mt-2 rounded-xl bg-muted p-2 text-xs text-muted-fg">Rule: {alert.rule}. No diagnosis made.</p>}
        </Card>
      )}

      <Card>
        <h3 className="mb-2 font-bold">Medicines</h3>
        {meds.length === 0 ? <p className="text-sm text-muted-fg">All clear 🎉</p> : meds.map((m) => (
          <div key={m.id} className="mb-2 flex items-center justify-between rounded-2xl bg-muted p-3">
            <div><p className="text-sm font-bold">{m.name}</p><p className="text-xs text-muted-fg">{m.time} · {m.dose}</p></div>
            <Btn onClick={() => take(m)}>{t(me?.language || "en", "take")}</Btn>
          </div>
        ))}
        <button className="mt-1 text-xs font-bold text-primary" onClick={() => go("#/meds")}>Manage all →</button>
      </Card>

      <div className="grid place-items-center gap-2 py-2 text-center">
        <button onClick={() => listenOnce(report, setListening)}
          className={`grid h-20 w-20 place-items-center rounded-full bg-primary text-3xl text-white shadow-lg active:scale-95 ${listening ? "animate-mic bg-danger" : ""}`}>🎙</button>
        <p className="text-xs text-muted-fg">{listening ? t(me?.language || "en", "listening") : t(me?.language || "en", "talk")}</p>
        {followup && (
          <Card accent="#7C3AED">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">💬 Sathi asks: {followup}</p>
              <button className="text-xs font-bold text-muted-fg" onClick={() => setFollowup("")}>✕</button>
            </div>
          </Card>
        )}
        <div className="flex gap-2">
          <Btn kind="ghost" onClick={() => report("mild headache")}>headache</Btn>
          <Btn kind="ghost" onClick={() => report("breathing feels worse than yesterday")}>breathing worse</Btn>
          <Btn kind="danger" onClick={() => go("#/sos")}>🚨 SOS</Btn>
        </div>
      </div>
    </div>
  );
}

// Medicine row with VAni-style jargon toggle (plain ↔ original)
function MedRow({ m, pid, onDone }: { m: Med; pid: number; onDone: () => void }) {
  const [plain, setPlain] = useState(true);
  const [msg, setMsg] = useState("");
  const act = async (status: string) => {
    try { await api.logDose(pid, m.id, { status }); onDone(); } catch { setMsg("saved offline — will sync"); }
  };
  return (
    <Card accent="#7C3AED">
      <div className="flex items-start justify-between gap-2">
        <div><p className="font-bold">{m.name}</p>
          <p className="text-xs text-muted-fg">{m.time} · {m.dose} · {m.frequency}</p>
          {m.simplified
            ? <p className="mt-1 text-xs">{plain ? `💡 ${m.simplified}` : m.instructions}</p>
            : m.instructions ? <p className="mt-1 text-xs text-muted-fg">{m.instructions}</p> : null}</div>
        <Badge level="active" />
      </div>
      {m.simplified && <div className="mt-1"><Toggle on={plain} onClick={() => setPlain((v) => !v)} label="Simple words" /></div>}
      <div className="mt-2 flex gap-2">
        <Btn kind="success" onClick={() => act("taken")}>Take</Btn>
        <Btn kind="ghost" onClick={() => act("snoozed")}>Snooze</Btn>
        <Btn kind="ghost" onClick={() => act("missed")}>Missed</Btn>
        <button className="text-xs text-red-500" onClick={async () => { await api.delMed(pid, m.id); onDone(); }}>remove</button>
      </div>
      {msg && <p className="mt-1 text-xs">{msg}</p>}
    </Card>
  );
}

export function Medicines() {
  const { pid } = useApp();
  const [meds, setMeds] = useState<Med[]>([]);
  const [form, setForm] = useState({ name: "", dose: "", time: "08:00 AM", frequency: "Twice daily", instructions: "", expand: true });
  const [msg, setMsg] = useState("");
  const load = () => api.meds(pid).then(setMeds).catch(() => {});
  useEffect(() => { if (pid) load(); }, [pid]);
  const add = async () => {
    if (!form.name) return;
    try {
      const r = await api.addMed(pid, form);
      setMsg(r.expanded ? `✓ Auto-mapped to ${r.expanded.map(([, t]) => t).join(" · ")}` : r.simplified ? `✓ ${r.simplified}` : "✓ Saved");
      setForm({ name: "", dose: "", time: "08:00 AM", frequency: "Twice daily", instructions: "", expand: true });
      load();
    } catch (e) { setMsg(e instanceof Error ? e.message : "failed"); }
  };
  return (
    <div className="grid gap-3">
      <Page title="Medicines" sub="Take · snooze · add" right={<Btn kind="ghost" onClick={() => go("#/drug")}>Check interactions</Btn>} />
      {meds.map((m) => <MedRow key={m.id} m={m} pid={pid} onDone={load} />)}
      {meds.length === 0 && <Empty text="No active medicines." />}
      <Card><h3 className="mb-2 font-bold">Add medicine</h3>
        <div className="grid gap-2">
          <Input placeholder="Name (e.g. Amoxicillin 500mg)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div className="flex gap-2">
            <Input placeholder="Dose" value={form.dose} onChange={(e) => setForm({ ...form, dose: e.target.value })} />
            <Input placeholder="Time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
          </div>
          <div className="flex gap-2">
            {(["Once daily", "Twice daily", "Three times daily", "Four times daily"] as string[]).map((f) => (
              <button key={f} onClick={() => setForm({ ...form, frequency: f })}
                className={`flex-1 rounded-full py-1.5 text-[11px] font-bold ${form.frequency === f ? "bg-primary text-white" : "bg-secondary text-primary"}`}>
                {f.replace(" daily", "×").replace("Once×", "1×").replace("Twice×", "2×").replace("Three times×", "3×").replace("Four times×", "4×")}</button>
            ))}
          </div>
          <Input placeholder="Instructions (e.g. 1 tab PO BD PC)" value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} />
          <Toggle on={form.expand} onClick={() => setForm({ ...form, expand: !form.expand })} label="Auto-map to my meal times" />
          {msg && <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">{msg}</p>}
          <Btn onClick={add}>Add</Btn>
        </div>
      </Card>
    </div>
  );
}

export function Symptoms() {
  const { pid } = useApp();
  const [text, setText] = useState("");
  const [sev, setSev] = useState(0);
  const [hist, setHist] = useState<{ symptoms: string[]; severity: number; risk: string }[]>([]);
  const [res, setRes] = useState("");
  const [followup, setFollowup] = useState("");
  const load = () => api.symptoms(pid).then(setHist).catch(() => {});
  useEffect(() => { if (pid) load(); }, [pid]);
  
  const submit = async (overrideText?: string) => {
    const t = overrideText || text;
    if (!t) return;
    try {
      const r = await api.symptom(pid, t, sev);
      setRes(r.safety_status === "ESCALATE" ? "⚠ Flagged — please seek medical help." : `Logged (${r.risk}).`);
      setFollowup(r.ai_followup || "");
      speak(r.safety_status);
    } catch { 
      setRes(`Logged locally (${localSafety(t)}). Will sync.`);
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
      <Page title="Symptoms" sub="Plain words work — no medical terms needed" />
      <Card><div className="grid gap-2">
        <Input placeholder="e.g. stomach hurts more than yesterday" value={text} onChange={(e) => setText(e.target.value)} />
        <label className="text-xs font-bold">Severity: {sev === 0 ? "—" : `${sev}/10`}</label>
        <input type="range" min={0} max={10} value={sev} onChange={(e) => setSev(Number(e.target.value))} />
        {res && <p className="text-sm font-semibold">{res}</p>}
        {followup && (
          <div className="rounded-xl bg-primary/10 p-3 mt-1">
            <p className="text-sm font-bold text-primary">✨ Nurse follow-up:</p>
            <p className="text-sm mb-2">{followup}</p>
            <Btn kind="ghost" onClick={() => { setText(`${followup} `); setFollowup(""); }}>Answer</Btn>
          </div>
        )}
        <Btn onClick={() => submit()}>Log symptom</Btn>
      </div></Card>
      {hist.map((h, i) => (
        <div key={i} className="flex items-center justify-between rounded-2xl bg-card p-3 shadow-sm">
          <p className="text-sm font-semibold">{h.symptoms[0]} <span className="text-xs text-muted-fg">· {h.severity}/10</span></p>
          <Badge level={h.risk} />
        </div>
      ))}
    </div>
  );
}

export function Schedule() {
  const { me, pid } = useApp();
  const [doses, setDoses] = useState<{ name: string; time: string; status: string }[]>([]);
  const [fus, setFus] = useState<{ title: string; date_time: string }[]>([]);
  const anchors = (() => { try { return JSON.parse(me?.anchor_times || "{}"); } catch { return {}; } })();
  useEffect(() => {
    if (!pid) return;
    api.dosesToday(pid).then(setDoses).catch(() => {});
    api.followups(pid).then(setFus).catch(() => {});
  }, [pid]);
  return (
    <div className="grid gap-3">
      <Page title="Schedule" sub="Anchored to your daily routine" />
      <Card><p className="text-sm">🌅 Morning {anchors.morning} · 🌞 Afternoon {anchors.afternoon} · 🌆 Evening {anchors.evening} · 🌙 Night {anchors.night}</p>
        <button className="mt-1 text-xs font-bold text-primary" onClick={() => go("#/settings")}>Edit in Settings →</button></Card>
      {doses.map((d, i) => (
        <div key={i} className="flex items-center justify-between rounded-2xl bg-card p-3 shadow-sm">
          <p className="text-sm font-semibold">💊 {d.name} <span className="text-xs text-muted-fg">· {d.time}</span></p>
          <Badge level={d.status === "pending" ? "NORMAL" : d.status === "taken" ? "taken" : "MONITOR"} />
        </div>
      ))}
      {fus.map((f, i) => <div key={i} className="rounded-2xl bg-card p-3 shadow-sm"><p className="text-sm font-semibold">📅 {f.title}</p><p className="text-xs text-muted-fg">{f.date_time}</p></div>)}
    </div>
  );
}

export function Progress() {
  const { pid } = useApp();
  const [st, setSt] = useState({ adherence: 0, streak: 0, xp: 0, taken_today: 0, total: 0, week: [] as { date: string; pct: number }[] });
  const [tl, setTl] = useState<Event[]>([]);
  const [burst, setBurst] = useState(0);
  useEffect(() => {
    if (!pid) return;
    api.stats(pid).then((s) => {
      setSt(s);
      if (s.adherence === 100 && s.total > 0) setBurst((b) => b + 1); // perfect day 🎉
    }).catch(() => {});
    api.timeline(pid).then(setTl).catch(() => {});
  }, [pid]);
  const trophy = st.streak >= 7;
  return (
    <div className="grid gap-3">
      <Confetti fire={burst} />
      <Page title="Progress" />
      <Card><div className="flex items-center gap-4"><Ring pct={st.adherence} size={96} />
        <div className="text-sm"><p>🔥 <b>{st.streak}</b> active days</p><p>✨ <b>{st.xp}</b> XP (+10 per dose)</p><p>✅ {st.taken_today}/{st.total} today</p>
          {trophy && <p className="mt-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">🏆 7-day streak trophy!</p>}</div></div>
        {st.week.length > 0 && (
          <div className="mt-3 flex items-end gap-1.5" aria-label="7-day adherence">
            {st.week.map((d) => (
              <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                <div className="w-full rounded-t-lg bg-muted" style={{ height: 64 }}>
                  <div className="w-full rounded-t-lg bg-gradient-to-t from-[#4B26C8] to-[#8B5CF6]" style={{ height: `${Math.max(d.pct, 4)}%`, marginTop: `${100 - Math.max(d.pct, 4)}%` }} />
                </div>
                <span className="text-[9px] text-muted-fg">{d.date.slice(5)}</span>
              </div>
            ))}
          </div>
        )}</Card>
      <Card><h3 className="mb-2 font-bold">Recovery timeline</h3>
        <div className="border-l-2 border-border pl-4">
          {tl.slice(0, 20).map((e, i) => (
            <div key={i} className="relative mb-3"><span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary" />
              <p className="text-sm font-semibold">{e.description}</p>
              <p className="text-xs text-muted-fg">{e.event_type}{e.severity ? ` · ${e.severity}` : ""}</p></div>
          ))}
          {tl.length === 0 && <Empty text="No events yet." />}
        </div></Card>
    </div>
  );
}

export function Followups() {
  const { pid } = useApp();
  const [list, setList] = useState<{ id: number; title: string; doctor: string; date_time: string; location: string; completed: boolean }[]>([]);
  const [f, setF] = useState({ title: "", doctor: "", date_time: "", location: "" });
  const load = () => api.followups(pid).then(setList).catch(() => {});
  useEffect(() => { if (pid) load(); }, [pid]);
  return (
    <div className="grid gap-3">
      <Page title="Follow-ups" />
      {list.map((a) => (
        <Card key={a.id}><div className="flex items-center justify-between">
          <div><p className="font-bold">{a.title}</p><p className="text-xs text-muted-fg">{a.doctor} · {a.date_time} · {a.location}</p></div>
          {a.completed ? <Badge level="taken" /> : <Btn kind="ghost" onClick={async () => { await api.doneFu(pid, a.id); load(); }}>Done</Btn>}
        </div></Card>
      ))}
      {list.length === 0 && <Empty text="No appointments yet." />}
      <Card><h3 className="mb-2 font-bold">Book appointment</h3><div className="grid gap-2">
        <Input placeholder="Title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        <Input placeholder="Doctor" value={f.doctor} onChange={(e) => setF({ ...f, doctor: e.target.value })} />
        <Input placeholder="Date & time" value={f.date_time} onChange={(e) => setF({ ...f, date_time: e.target.value })} />
        <Input placeholder="Location" value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} />
        <Btn onClick={async () => { if (f.title) { await api.addFu(pid, f); setF({ title: "", doctor: "", date_time: "", location: "" }); load(); } }}>Add</Btn>
      </div></Card>
    </div>
  );
}

export function Timeline() {
  const { pid } = useApp();
  const [tl, setTl] = useState<Event[]>([]);
  const [filter, setFilter] = useState("all");
  useEffect(() => { if (pid) api.timeline(pid).then(setTl).catch(() => {}); }, [pid]);
  const rows = tl.filter((e) => filter === "all" || e.event_type === filter);
  return (
    <div className="grid gap-3">
      <Page title="Timeline" />
      <Seg opts={["all", "MEDICATION_TAKEN", "SYMPTOM_REPORTED", "SAFETY_ALERT", "CAREGIVER_ALERT", "FOLLOW_UP"]} val={filter} set={setFilter} />
      <Card><div className="border-l-2 border-border pl-4">
        {rows.map((e, i) => (
          <div key={i} className="relative mb-3"><span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary" />
            <p className="text-sm font-semibold">{e.description}</p>
            <p className="text-xs text-muted-fg">{e.event_type}{e.severity ? ` · ${e.severity}` : ""}</p></div>
        ))}
        {rows.length === 0 && <Empty text="Nothing here yet." />}
      </div></Card>
    </div>
  );
}
