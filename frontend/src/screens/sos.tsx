import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { api } from "../lib/api";
import { useApp } from "../lib/store";
import { Btn, Card, Empty, Page } from "../components/ui";

/** Panic button: 5 rapid taps arms a cancellable 5s countdown, then sends the SOS alert. */
function PanicButton({ onSent }: { onSent: (n: number) => void }) {
  const { pid } = useApp();
  const [taps, setTaps] = useState(0);
  const [count, setCount] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  const timer = useRef<number | null>(null);

  useEffect(() => () => { if (timer.current) window.clearInterval(timer.current); }, []);

  const tap = () => {
    if (count !== null) return;
    const n = taps + 1;
    setTaps(n);
    if (n >= 5) {
      setTaps(0);
      setCount(5);
      timer.current = window.setInterval(() => {
        setCount((c) => {
          if (c === null) return null;
          if (c <= 1) {
            if (timer.current) window.clearInterval(timer.current);
            fire();
            return null;
          }
          return c - 1;
        });
      }, 1000);
    } else {
      window.setTimeout(() => setTaps(0), 2500);
    }
  };

  const cancel = () => {
    if (timer.current) window.clearInterval(timer.current);
    setCount(null); setTaps(0); setMsg("SOS cancelled — no alert sent.");
  };

  const fire = async () => {
    try {
      const r = await api.sosAlert(pid, "Panic-button SOS from app");
      setMsg(`✓ Alert sent to ${r.notified} care-team member(s). Now call 112 below.`);
      onSent(r.notified);
    } catch {
      setMsg("Couldn't reach server — call 112 directly now.");
    }
  };

  return (
    <Card accent="#EF4444">
      <p className="font-bold text-danger">🚨 Emergency SOS</p>
      <p className="text-xs text-muted-fg">Tap 5 times fast to alert your care team. Then call emergency services below.</p>
      <button onClick={tap}
        className={`mt-2 w-full rounded-2xl py-4 text-lg font-extrabold text-white active:scale-[0.99] ${count !== null ? "bg-danger animate-danger" : "bg-danger"}`}>
        {count !== null ? `SENDING IN ${count}…` : taps > 0 ? `Keep tapping! (${taps}/5)` : "TAP 5× FOR SOS"}
      </button>
      {count !== null && <Btn kind="ghost" onClick={cancel}>Cancel SOS</Btn>}
      {msg && <p className="mt-2 rounded-xl bg-muted p-2 text-xs font-semibold">{msg}</p>}
    </Card>
  );
}

function DialButtons() {
  const { pid } = useApp();
  const [contact, setContact] = useState("");
  useEffect(() => {
    if (pid) api.emergencyCard(pid).then((c) => setContact(c.emergency_contact || "")).catch(() => {});
  }, [pid]);
  const smsBody = encodeURIComponent("SOS: I need help. This is my emergency alert from Sathi.");
  return (
    <Card>
      <p className="mb-2 font-bold">📞 One-tap help</p>
      <div className="grid grid-cols-2 gap-2">
        <a href="tel:112" className="rounded-2xl bg-danger p-3 text-center text-sm font-extrabold text-white">Call 112</a>
        <a href="tel:108" className="rounded-2xl bg-primary p-3 text-center text-sm font-extrabold text-white">Ambulance 108</a>
        {contact && <a href={`tel:${encodeURIComponent(contact)}`} className="rounded-2xl bg-secondary p-3 text-center text-sm font-bold text-primary">Contact: {contact}</a>}
        <a href={`sms:?body=${smsBody}`} className="rounded-2xl bg-secondary p-3 text-center text-sm font-bold text-primary">Share SOS via SMS</a>
      </div>
      <p className="mt-2 text-[11px] text-muted-fg">Sathi never auto-dials or dispatches — you stay in control; the care team is alerted in parallel.</p>
    </Card>
  );
}

const CPR_GUIDE: Record<string, { rate: string; depth: string; notes: string }> = {
  Adult: { rate: "110 compressions/min", depth: "5–6 cm, center of chest", notes: "Push hard and fast. Let the chest fully recoil. Call 112 first, on speaker." },
  Child: { rate: "110 compressions/min", depth: "~5 cm, one hand", notes: "One hand for small children. 30 compressions : 2 breaths if trained." },
  Infant: { rate: "110 compressions/min", depth: "~4 cm, two fingers", notes: "Two fingers center of chest, just below nipple line. Be gentle but firm." },
};

/** CPR & choking coach with 110 BPM metronome + compression counter. Guidance only. */
function CprCoach() {
  const [who, setWho] = useState<"Adult" | "Child" | "Infant">("Adult");
  const [running, setRunning] = useState(false);
  const [beats, setBeats] = useState(0);
  const timer = useRef<number | null>(null);
  const audio = useRef<AudioContext | null>(null);

  const beep = () => {
    try {
      audio.current ||= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const ctx = audio.current;
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = 880; g.gain.value = 0.15;
      o.start(); o.stop(ctx.currentTime + 0.08);
    } catch { /* silent metronome */ }
  };

  const toggle = () => {
    if (running) {
      if (timer.current) window.clearInterval(timer.current);
      setRunning(false);
      return;
    }
    setBeats(0);
    setRunning(true);
    timer.current = window.setInterval(() => { beep(); setBeats((b) => b + 1); }, 60000 / 110);
  };

  useEffect(() => () => { if (timer.current) window.clearInterval(timer.current); }, []);
  const g = CPR_GUIDE[who];

  return (
    <Card accent="#F59E0B">
      <p className="font-bold">❤️ CPR & choking coach</p>
      <p className="text-[11px] text-muted-fg">Guidance only — call 112 first. For choking: 5 back blows, then 5 abdominal thrusts, repeat.</p>
      <div className="mt-2 flex gap-2">
        {(Object.keys(CPR_GUIDE) as ("Adult" | "Child" | "Infant")[]).map((k) => (
          <button key={k} onClick={() => setWho(k)}
            className={`flex-1 rounded-full py-1.5 text-xs font-bold ${who === k ? "bg-primary text-white" : "bg-secondary text-primary"}`}>{k}</button>
        ))}
      </div>
      <div className="mt-2 rounded-2xl bg-muted p-3 text-sm">
        <p><b>Rate:</b> {g.rate}</p><p><b>Depth:</b> {g.depth}</p><p>{g.notes}</p>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Btn onClick={toggle}>{running ? "Stop metronome" : "Start 110 BPM metronome"}</Btn>
        <p className="text-sm font-extrabold">Compressions: {beats}</p>
      </div>
      <a href="tel:112" className="mt-2 block rounded-2xl bg-danger p-3 text-center text-sm font-extrabold text-white">Call 112 now</a>
    </Card>
  );
}

function MedicalCard() {
  const { pid } = useApp();
  const [card, setCard] = useState<Awaited<ReturnType<typeof api.emergencyCard>> | null>(null);
  useEffect(() => {
    if (pid) api.emergencyCard(pid).then(setCard).catch(() => {});
  }, [pid]);
  if (!card) return <Empty text="Loading emergency card…" />;
  const qrText = [
    `SATHI EMERGENCY CARD`,
    `${card.name}, ${card.age}y`,
    `Condition: ${card.condition || "—"}`,
    `Contact: ${card.emergency_contact || "—"}`,
    `Meds: ${card.medications.map((m) => `${m.name} ${m.dose}`).join("; ") || "—"}`,
    `Symptoms: ${card.recent_symptoms.join("; ") || "—"}`,
  ].join("\n");
  return (
    <Card accent="#10B981">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold">🪪 Medical card — {card.name}</p>
          <p className="text-xs text-muted-fg">{card.age}y · {card.condition || "post-discharge recovery"} · speaks {card.language}</p>
          <p className="mt-1 text-sm">Contact: <b>{card.emergency_contact || "—"}</b></p>
          {card.medications.map((m, i) => <p key={i} className="text-sm">• {m.name} — {m.dose} at {m.time}</p>)}
          {card.next_followup && <p className="mt-1 text-xs">Next: {card.next_followup}</p>}
        </div>
        <QRCodeSVG value={qrText} size={110} />
      </div>
      <p className="mt-2 text-[11px] text-muted-fg">{card.note}</p>
      <Btn kind="ghost" onClick={() => window.print()}>🖨 Print card for first responders</Btn>
    </Card>
  );
}

export function SOS() {
  const [sent, setSent] = useState<number | null>(null);
  return (
    <div className="grid gap-3">
      <Page title="Emergency SOS" sub="Alert care team · call for help · first-aid coach" />
      {sent !== null && (
        <Card accent="#EF4444"><p className="text-sm font-bold">SOS logged in your recovery timeline ({sent} notified). If this is life-threatening, call 112 now.</p></Card>
      )}
      <PanicButton onSent={setSent} />
      <DialButtons />
      <CprCoach />
      <MedicalCard />
    </div>
  );
}
