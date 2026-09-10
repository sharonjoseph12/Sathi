import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Btn, Card, Empty, Area, Page } from "../components/ui";

export function Journal() {
  const [list, setList] = useState<{ mood: number; energy: number; text: string }[]>([]);
  const [mood, setMood] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [text, setText] = useState("");
  const load = () => api.journal().then(setList).catch(() => {});
  useEffect(() => { load(); }, []);
  const faces = ["😞", "🙁", "😐", "🙂", "😄"];
  return (
    <div className="grid gap-3">
      <Page title="Journal" sub="Mood · energy · notes" />
      <Card><div className="grid gap-2">
        <label className="text-xs font-bold">Mood</label>
        <div className="flex gap-2">{faces.map((f, i) => (
          <button key={i} onClick={() => setMood(i + 1)} className={`rounded-2xl p-2 text-2xl ${mood === i + 1 ? "bg-secondary" : ""}`}>{f}</button>))}</div>
        <label className="text-xs font-bold">Energy: {energy}/5</label>
        <input type="range" min={1} max={5} value={energy} onChange={(e) => setEnergy(Number(e.target.value))} />
        <Area rows={2} placeholder="How was today?" value={text} onChange={(e) => setText(e.target.value)} />
        <Btn onClick={async () => { await api.addJournal({ mood, energy, text }); setText(""); load(); }}>Save entry</Btn>
      </div></Card>
      {list.map((j, i) => (
        <div key={i} className="rounded-2xl bg-card p-3 shadow-sm">
          <p className="text-sm">{faces[j.mood - 1]} {j.text || <span className="text-muted-fg">(no note)</span>}</p>
          <p className="text-xs text-muted-fg">energy {j.energy}/5</p>
        </div>
      ))}
      {list.length === 0 && <Empty text="No entries yet." />}
    </div>
  );
}

export function Meditation() {
  const [phase, setPhase] = useState("Ready");
  const [on, setOn] = useState(false);
  const [sec, setSec] = useState(0);
  useEffect(() => {
    if (!on) return;
    const seq = ["Breathe in…", "Hold…", "Breathe out…"];
    let i = 0; setPhase(seq[0]);
    const t = setInterval(() => { i = (i + 1) % 3; setPhase(seq[i]); setSec((s) => s + 4); }, 4000);
    return () => clearInterval(t);
  }, [on]);
  const mins = Math.floor(sec / 60);
  return (
    <div className="grid gap-3">
      <Page title="Breathing" sub="4-4-4 calm rhythm" />
      <Card><div className="grid place-items-center gap-3 py-6 text-center">
        <div className={`grid h-28 w-28 place-items-center rounded-full bg-secondary text-4xl transition-all ${on ? "scale-110" : ""}`}>🫁</div>
        <p className="text-lg font-bold">{on ? phase : "Ready when you are"}</p>
        <p className="text-xs text-muted-fg">{mins} min this session</p>
        <Btn kind={on ? "danger" : "primary"} onClick={() => { setOn((v) => !v); if (on) setPhase("Ready"); }}>{on ? "Stop" : "Begin"}</Btn>
      </div></Card>
    </div>
  );
}
