import { useEffect, useState } from "react";
import { api, type Event } from "../lib/api";
import { go } from "../lib/store";
import { Badge, Btn, Card, Empty, Input, Area, Page, Ring } from "../components/ui";

export function CareDash() {
  const [list, setList] = useState<{ id: number; name: string; condition: string; rel: string; adherence: number; risk: string; recent: string[] }[]>([]);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const load = () => api.cgPatients().then(setList).catch(() => setMsg("Could not load — are you logged in as caregiver/family?"));
  useEffect(() => { load(); }, []);
  const connect = async () => {
    try { const r = await api.connect(code) as { patient_name: string }; setMsg(`Linked to ${r.patient_name}`); setCode(""); load(); }
    catch (e) { setMsg(e instanceof Error ? e.message : "invalid code"); }
  };
  return (
    <div className="grid gap-3">
      <Page title="Caregiver dashboard" sub="All linked patients at a glance" />
      <Card><div className="flex gap-2">
        <Input placeholder="Link code (e.g. DB-XXXXXX)" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
        <Btn onClick={connect}>Link</Btn>
      </div>{msg && <p className="mt-1 text-xs">{msg}</p>}</Card>
      {list.map((p) => (
        <Card key={p.id}>
          <div className="flex items-center gap-3">
            <Ring pct={p.adherence} size={64} />
            <div className="flex-1"><p className="font-bold">{p.name}</p>
              <p className="text-xs text-muted-fg">{p.condition} · {p.rel}</p>
              {p.recent[0] && <p className="text-xs">Latest: {p.recent[0]}</p>}</div>
            <Badge level={p.risk} />
          </div>
          <div className="mt-2 flex gap-2">
            <Btn kind="ghost" onClick={() => go(`#/care/${p.id}`)}>Open</Btn>
            <Btn kind="ghost" onClick={async () => { await api.nudge(p.id, "Thinking of you — keep going! 💜"); setMsg("Nudge sent"); }}>💜 Nudge</Btn>
          </div>
        </Card>
      ))}
      {list.length === 0 && <Empty text="No linked patients yet — enter a link code above." />}
    </div>
  );
}

export function PatientDetail({ id }: { id: number }) {
  const [d, setD] = useState<{ timeline: Event[]; symptoms: { symptoms: string[]; severity: number; risk: string }[]; doses: { name: string; status: string }[]; followups: { title: string }[] } | null>(null);
  const [rem, setRem] = useState("");
  const [nmsg, setNmsg] = useState("");
  const presets = ["💜 Proud of your recovery today!", "💊 Time for your medicines", "🚶 Time for a short walk", "📅 Don't forget your follow-up"];
  const sendNudge = async (text: string) => {
    if (!text) return;
    try { await api.nudge(id, text); setNmsg("✓ Sent"); }
    catch (e) { setNmsg(e instanceof Error ? e.message : "failed"); }
  };
  useEffect(() => { api.cgDetail(id).then(setD).catch(() => {}); }, [id]);
  if (!d) return <Empty text="Loading…" />;
  return (
    <div className="grid gap-3">
      <Page title={`Patient #${id}`} right={<Btn kind="ghost" onClick={() => go("#/care")}>← All</Btn>} />
      <Card><h3 className="mb-1 font-bold">Today's doses</h3>
        {d.doses.map((x, i) => <p key={i} className="text-sm">• {x.name} — <b>{x.status}</b></p>)}
        {d.doses.length === 0 && <p className="text-sm text-muted-fg">No medicines.</p>}</Card>
      <Card><h3 className="mb-1 font-bold">Recent symptoms</h3>
        {d.symptoms.map((s, i) => <p key={i} className="text-sm">• {s.symptoms[0]} ({s.severity}/10) <Badge level={s.risk} /></p>)}
        {d.symptoms.length === 0 && <p className="text-sm text-muted-fg">None reported.</p>}</Card>
      <Card><h3 className="mb-1 font-bold">Send reminder / nudge</h3>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {presets.map((p) => <button key={p} onClick={() => sendNudge(p)} className="rounded-full bg-secondary px-3 py-1.5 text-xs font-bold text-primary">{p}</button>)}
        </div>
        <div className="flex gap-2"><Input placeholder="or write your own…" value={rem} onChange={(e) => setRem(e.target.value)} />
          <Btn onClick={async () => { await sendNudge(rem); setRem(""); }}>Send</Btn></div>
        {nmsg && <p className="mt-1 text-xs">{nmsg}</p>}
        <p className="text-[11px] text-muted-fg">Max 3 nudges/hour per patient (anti-spam).</p>
        <div className="mt-2 flex gap-2"><Btn kind="ghost" onClick={() => go(`#/plan/${id}`)}>Create plan</Btn></div></Card>
      <Card><h3 className="mb-1 font-bold">Timeline</h3>
        {d.timeline.slice(0, 10).map((e, i) => <p key={i} className="text-sm">• {e.description} <span className="text-xs text-muted-fg">{e.event_type}</span></p>)}</Card>
    </div>
  );
}

export function CreatePlan({ id }: { id: number }) {
  const [hospital, setHospital] = useState("");
  const [medText, setMedText] = useState('{"medicines": [{"name": "Amoxicillin 500mg", "dose": "1 capsule", "time": "08:00 AM"}]}');
  const [msg, setMsg] = useState("");
  const save = async () => {
    try { const r = await api.addPlan(id, { hospital, data: medText }) as { version: number }; setMsg(`Plan v${r.version} saved + medicines imported`); }
    catch (e) { setMsg(e instanceof Error ? e.message : "failed"); }
  };
  return (
    <div className="grid gap-3">
      <Page title="Create discharge plan" right={<Btn kind="ghost" onClick={() => go(`#/care/${id}`)}>← Back</Btn>} />
      <Card><div className="grid gap-2">
        <Input placeholder="Hospital" value={hospital} onChange={(e) => setHospital(e.target.value)} />
        <Area rows={6} value={medText} onChange={(e) => setMedText(e.target.value)} />
        {msg && <p className="text-xs font-semibold">{msg}</p>}
        <Btn onClick={save}>Save plan</Btn>
      </div></Card>
    </div>
  );
}

export function FamilyDash() {
  const [list, setList] = useState<{ id: number; name: string; adherence: number; risk: string; recent: string[] }[]>([]);
  useEffect(() => { api.cgPatients().then(setList).catch(() => {}); }, []);
  return (
    <div className="grid gap-3">
      <Page title="Family view" sub="Read-only status + encouragement" />
      {list.map((p) => (
        <Card key={p.id}><div className="flex items-center gap-3">
          <Ring pct={p.adherence} size={64} />
          <div className="flex-1"><p className="font-bold">{p.name}</p>
            <p className="text-xs text-muted-fg">{p.recent[0] || "No recent symptoms"}</p></div>
          <Badge level={p.risk} /></div>
          <Btn kind="ghost" className="mt-2" onClick={async () => { await api.nudge(p.id, "💜 Proud of your recovery today!"); }}>Send 💜 nudge</Btn>
        </Card>
      ))}
      {list.length === 0 && <Empty text="Nothing shared with you yet." />}
    </div>
  );
}
