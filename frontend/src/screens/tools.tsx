import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { ocrImage, parseRxText, type OcrMed } from "../lib/ocr";
import { speakSmart, transcribeBlob } from "../lib/voice";
import { useApp } from "../lib/store";
import { Badge, Btn, Card, Empty, Input, Area, Page } from "../components/ui";
import { listenOnce } from "./tabs";

export function Scan() {
  const { pid } = useApp();
  const [img, setImg] = useState<string | null>(null);
  const [imgB64, setImgB64] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [prog, setProg] = useState<number | null>(null);
  const [found, setFound] = useState<OcrMed[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"ai" | "donut" | "local">("ai");

  const pick = (f: File | undefined) => {
    if (!f) return;
    setBlob(f); setImg(URL.createObjectURL(f)); setFound([]); setMsg("");
    // Read as base64 for Groq Vision
    const reader = new FileReader();
    reader.onload = () => setImgB64(String(reader.result));
    reader.readAsDataURL(f);
  };

  const runAI = async () => {
    if (!imgB64) return;
    setBusy(true); setProg(50);
    try {
      const r = await api.ocr(imgB64);
      setProg(100);
      if (r.medicines && r.medicines.length > 0) {
        setFound(r.medicines.map((m) => ({
          name: m.name || "", dose: m.dose || "", frequency: m.frequency || "",
          time: m.time || "08:00 AM", instructions: m.instructions || "", confidence: 90,
        })));
      }
      setMsg(r.message || "Done");
    } catch { setMsg("AI OCR failed — try local extraction below."); }
    setBusy(false); setProg(null);
  };

  const runLocal = async () => {
    if (!blob) return;
    setBusy(true); setProg(0);
    try {
      const text = await ocrImage(blob, setProg);
      const meds = parseRxText(text);
      setFound(meds);
      setMsg(meds.length
        ? `${meds.length} candidate(s) — review everything before importing.`
        : "No medicines detected. Use brighter light, hold steady, or add manually below.");
    } catch { setMsg("OCR engine unreachable. Add manually below — never guess doses."); }
    setBusy(false); setProg(null);
  };

  const run = () => mode === "ai" ? runAI() : mode === "donut" ? runDonut() : runLocal();

  const runDonut = async () => {
    if (!imgB64) return;
    setBusy(true); setProg(50);
    try {
      const r = await api.ocr(imgB64, "donut");
      setProg(100);
      if (r.medicines && r.medicines.length > 0) {
        setFound(r.medicines.map((m) => ({
          name: m.name || "", dose: m.dose || "", frequency: m.frequency || "",
          time: m.time || "08:00 AM", instructions: m.instructions || "", confidence: 85,
        })));
      }
      setMsg(r.message || "Done");
    } catch { setMsg("Donut OCR failed — is the backend model loaded? Try AI Vision."); }
    setBusy(false); setProg(null);
  };

  const edit = (i: number, k: keyof OcrMed, v: string) =>
    setFound((f) => f.map((m, j) => (j === i ? { ...m, [k]: v } : m)));
  const importAll = async () => {
    for (const m of found) {
      await api.addMed(pid, { name: m.name, dose: m.dose, frequency: m.frequency, time: m.time, instructions: m.instructions, expand: !!m.frequency });
    }
    setMsg(`✓ Imported ${found.length} medicine(s). Verify each against your discharge paper.`);
    setFound([]);
  };

  return (
    <div className="grid gap-3">
      <Page title="Scan prescription" sub="AI Vision + on-device OCR → review → import" />
      <Card><div className="grid gap-2">
        <div className="flex gap-2">
          <button onClick={() => setMode("ai")} className={`flex-1 rounded-full py-1.5 text-xs font-bold ${mode === "ai" ? "bg-primary text-white" : "bg-secondary text-primary"}`}>🤖 AI Vision (Groq)</button>
          <button onClick={() => setMode("donut")} className={`flex-1 rounded-full py-1.5 text-xs font-bold ${mode === "donut" ? "bg-primary text-white" : "bg-secondary text-primary"}`}>🏠 Donut (on-device)</button>
          <button onClick={() => setMode("local")} className={`flex-1 rounded-full py-1.5 text-xs font-bold ${mode === "local" ? "bg-primary text-white" : "bg-secondary text-primary"}`}>📱 Local OCR</button>
        </div>
        <label className="grid cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-border bg-muted p-6 text-center">
          <input type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
          {img ? <img src={img} alt="prescription" className="max-h-56 rounded-xl" /> : <span className="text-sm text-muted-fg">📷 Tap to snap / upload prescription</span>}
        </label>
        <Btn onClick={run}>{busy ? "Reading…" : mode === "ai" ? "🔍 Extract with AI" : mode === "donut" ? "🔍 Extract with Donut" : "🔍 Extract locally"}</Btn>
        {prog !== null && <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${prog}%` }} /></div>}
        {msg && <p className="rounded-xl bg-muted p-2 text-xs font-semibold">{msg}</p>}
        {mode === "ai" && <p className="text-[10px] text-muted-fg">⚠ AI-generated — always verify doses against your discharge paper.</p>}
      </div></Card>
      {found.map((m, i) => (
        <Card key={i} accent={m.confidence >= 80 ? "#10B981" : "#F59E0B"}>
          <div className="mb-1 flex items-center justify-between">
            <p className="text-xs font-bold text-muted-fg">Candidate {i + 1}</p><Badge level={m.confidence >= 80 ? "taken" : "MONITOR"} />
          </div>
          <div className="grid gap-1.5">
            <Input value={m.name} onChange={(e) => edit(i, "name", e.target.value)} />
            <div className="flex gap-1.5">
              <Input value={m.dose} onChange={(e) => edit(i, "dose", e.target.value)} />
              <Input value={m.time} onChange={(e) => edit(i, "time", e.target.value)} />
            </div>
            <Input value={m.frequency} onChange={(e) => edit(i, "frequency", e.target.value)} />
          </div>
        </Card>
      ))}
      {found.length > 0 && <Btn kind="success" onClick={importAll}>Save {found.length} to schedule</Btn>}
      <Card><h3 className="mb-2 font-bold">Or add manually</h3><ManualAdd /></Card>
    </div>
  );
}

export function ManualAdd() {
  const { pid } = useApp();
  const [f, setF] = useState({ name: "", dose: "", time: "08:00 AM" });
  const [ok, setOk] = useState("");
  return (
    <div className="grid gap-2">
      <Input placeholder="Medicine name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      <div className="flex gap-2">
        <Input placeholder="Dose" value={f.dose} onChange={(e) => setF({ ...f, dose: e.target.value })} />
        <Input placeholder="Time" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} />
      </div>
      <Btn onClick={async () => { if (!f.name || !pid) return; await api.addMed(pid, f); setOk(`Saved ${f.name}. Confirm dose with your discharge paper.`); setF({ name: "", dose: "", time: "08:00 AM" }); }}>Save to schedule</Btn>
      {ok && <p className="text-xs font-semibold text-emerald-700">{ok}</p>}
    </div>
  );
}

export function Chat() {
  const { me, pid } = useApp();
  const [peer, setPeer] = useState("");
  const [msgs, setMsgs] = useState<{ from: string; text: string; audio?: string }[]>([]);
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [aiMode, setAiMode] = useState(true);
  const [recUrl, setRecUrl] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const peerRef = useRef(""); peerRef.current = peer;
  const pidRef = useRef(0); pidRef.current = pid;
  const box = useRef<HTMLDivElement>(null);

  // Live SSE feed
  useEffect(() => {
    if (!me) return;
    const myId = me.id;
    const es = new EventSource(api.streamUrl());
    es.onmessage = (e) => {
      try {
        const p = JSON.parse(e.data);
        if (p.type === "message") {
          if (p.data.hasAudio && peerRef.current && pidRef.current) {
            api.chatHistory(pidRef.current, Number(peerRef.current))
              .then((h) => setMsgs(h.map((m) => ({ from: m.senderId === myId ? "me" : "them", text: m.text, audio: m.audio || undefined }))))
              .catch(() => {});
          } else {
            setMsgs((m) => [...m, { from: p.data.senderId === myId ? "me" : "them", text: p.data.text }]);
          }
        } else if (p.type === "notification") {
          setMsgs((m) => [...m, { from: "them", text: `🔔 ${p.data.title}: ${p.data.body}` }]);
        }
      } catch { /* heartbeat */ }
    };
    return () => es.close();
  }, [me]);

  useEffect(() => { box.current?.scrollTo(0, 99999); }, [msgs]);

  const loadHistory = async () => {
    if (!pid || !peer) return;
    try {
      const h = await api.chatHistory(pid, Number(peer));
      setMsgs(h.map((m) => ({ from: m.senderId === me?.id ? "me" : "them", text: m.text, audio: m.audio || undefined })));
    } catch { /* offline */ }
  };

  const toggleRec = async () => {
    if (recording) { recRef.current?.stop(); setRecording(false); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks.current = [];
      const rec = new MediaRecorder(stream);
      recRef.current = rec;
      rec.ondataavailable = (e) => chunks.current.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks.current, { type: rec.mimeType || "audio/webm" });
        const rd = new FileReader();
        rd.onload = () => setRecUrl(String(rd.result));
        rd.readAsDataURL(blob);
      };
      rec.start(); setRecording(true);
    } catch { /* mic denied */ }
  };

  const send = async () => {
    if (!text.trim() && !recUrl) return;
    const t = text; const a = recUrl; setText(""); setRecUrl(null);
    setMsgs((m) => [...m, { from: "me", text: t || "🎤", audio: a || undefined }]);
    if (aiMode && pid) {
      try {
        // Voice note → server transcription (Groq Whisper) so speech works
        // in browsers without Web Speech recognition.
        let said = t;
        if (!said && a) {
          try {
            const blob = await (await fetch(a)).blob();
            said = (await transcribeBlob(blob))?.text || "";
          } catch { /* fall through */ }
        }
        const r = await api.aiChat(pid, said || "voice note sent");
        setMsgs((m) => [...m, { from: "them", text: r.message }]);
        void speakSmart(r.message, me?.language ? `${me.language}-IN` : "en-IN");
      } catch { setMsgs((m) => [...m, { from: "them", text: "(offline — will reply when connected)" }]); }
    } else if (pid && peer) {
      try { await api.chatSend({ receiver_id: Number(peer), patient_id: pid, text: t, audio_base64: a || "" }); } catch { /* queued */ }
    }
  };

  return (
    <div className="grid gap-3">
      <Page title="Chat" right={
        <button onClick={() => setAiMode((v) => !v)} className={`rounded-full px-3 py-1.5 text-xs font-bold ${aiMode ? "bg-primary text-white" : "bg-secondary text-primary"}`}>
          {aiMode ? "🤖 AI companion" : "👥 Care team"}
        </button>} />
      {!aiMode && (
        <div className="flex gap-2">
          <Input placeholder="Peer user id" value={peer} onChange={(e) => setPeer(e.target.value)} />
          <Btn kind="ghost" onClick={loadHistory}>Load</Btn>
        </div>
      )}
      <Card>
        <div ref={box} className="mb-2 grid max-h-80 gap-2 overflow-y-auto">
          {msgs.length === 0 && <Empty text={aiMode ? "Ask anything — medicines, symptoms, appointments." : "Messages appear live via SSE."} />}
          {msgs.map((m, i) => (
            <div key={i} className={`max-w-[85%] rounded-2xl p-2.5 text-sm ${m.from === "me" ? "justify-self-end bg-primary text-white" : "bg-muted"}`}>
              {m.text !== "🎤" && <p>{m.text}</p>}
              {m.audio && <audio controls src={m.audio} className="mt-1 w-48" />}
            </div>
          ))}
        </div>
        {recUrl && (
          <div className="flex items-center gap-2 rounded-2xl bg-muted p-2">
            <audio controls src={recUrl} className="w-48" />
            <button className="text-xs font-bold text-red-500" onClick={() => setRecUrl(null)}>✕</button>
          </div>
        )}
        <div className="flex gap-2">
          <button onClick={() => listenOnce((t) => { setText(t); }, setListening)} title="Dictate" className="rounded-full bg-secondary px-3 text-lg">🎙</button>
          <button onClick={toggleRec} title="Voice note" className={`rounded-full px-3 text-lg ${recording ? "animate-mic bg-danger text-white" : "bg-secondary"}`}>🎤</button>
          <Input placeholder="Type a message…" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} />
          <Btn onClick={send}>Send</Btn>
        </div>
        {listening && <p className="text-xs text-muted-fg">Listening…</p>}
      </Card>
    </div>
  );
}

export function DrugChecker() {
  const { pid } = useApp();
  const [r, setR] = useState<{ interactions: { pair: string[]; severity: string; description: string; advice: string }[]; hasCritical: boolean; note: string } | null>(null);
  useEffect(() => { if (pid) api.drugCheck(pid).then(setR).catch(() => {}); }, [pid]);
  return (
    <div className="grid gap-3">
      <Page title="Drug interaction check" sub="Curated rule base — not a full pharmacology review" />
      {!r ? <Empty text="Loading…" /> : (
        <>
          {r.hasCritical && <div className="animate-danger"><Card accent="#EF4444"><p className="font-bold text-danger">⚠ Critical interaction found — consult your doctor before the next dose.</p></Card></div>}
          {r.interactions.length === 0 && <Card><p className="text-sm">No known pairs from the checked list. {r.note}</p></Card>}
          {r.interactions.map((x, i) => (
            <Card key={i} accent={x.severity === "high" ? "#EF4444" : "#F59E0B"}>
              <div className="flex items-center justify-between"><p className="font-bold">{x.pair.join(" + ")}</p><Badge level={x.severity} /></div>
              <p className="mt-1 text-sm">{x.description}</p>
              <p className="text-xs text-muted-fg">{x.advice}</p>
            </Card>
          ))}
          <p className="text-xs text-muted-fg">{r?.note}</p>
        </>
      )}
    </div>
  );
}

export function Simplify() {
  const [t, setT] = useState("Take 1 tab PO BD PC");
  const [r, setR] = useState<{ simplified: string; expanded: string[] } | null>(null);
  return (
    <div className="grid gap-3">
      <Page title="Jargon simplifier" sub="OD · BD · TDS · PO · STAT…" />
      <Card><div className="grid gap-2">
        <Area rows={3} value={t} onChange={(e) => setT(e.target.value)} />
        <Btn onClick={async () => setR(await api.simplify(t))}>Simplify</Btn>
        {r && <div className="rounded-2xl bg-muted p-3"><p className="text-sm font-semibold">{r.simplified}</p>
          {r.expanded.length > 0 && <p className="text-xs text-muted-fg">Expanded: {r.expanded.join(", ")}</p>}</div>}
      </div></Card>
    </div>
  );
}
