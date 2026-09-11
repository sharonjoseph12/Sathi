import { useEffect, useState } from "react";
import { api, type Event } from "../lib/api";
import { go, useApp } from "../lib/store";
import { Badge, Btn, Card, Confetti, Empty, Input, Page, Ring, Seg } from "../components/ui";

export { listenOnce } from "./home";

// Home, Medicines, Symptoms have been moved to screens/home.tsx, screens/medicines.tsx, screens/symptoms.tsx.
// This file retains only Schedule, Progress, Followups, Timeline (owned by Dev 3).

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
