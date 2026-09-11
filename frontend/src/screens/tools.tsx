import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { ocrImage, parseRxText, type OcrMed } from "../lib/ocr";
import { speakSmart, transcribeBlob } from "../lib/voice";
import { useApp } from "../lib/store";
import { Badge, Btn, Card, Empty, Input, Area, Page } from "../components/ui";
import { listenOnce } from "../lib/speech";
import { useAdaptiveProfile, isElder } from "../lib/useAdaptiveProfile";

/* ══════════════════════════════════════════════════════════════════
   Scan — Prescription photo → OCR → review → import
   Elder: simplified flow (AI-only), larger upload area, clear confirm
   Standard: AI + local OCR toggle, compact layout
   ══════════════════════════════════════════════════════════════════ */
export function Scan() {
  const { pid } = useApp();
  const profile = useAdaptiveProfile();
  const elderMode = isElder(profile);

  const [img, setImg] = useState<string | null>(null);
  const [imgB64, setImgB64] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [prog, setProg] = useState<number | null>(null);
  const [found, setFound] = useState<OcrMed[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"ai" | "local">("ai");

  const pick = (f: File | undefined) => {
    if (!f) return;
    setBlob(f);
    setImg(URL.createObjectURL(f));
    setFound([]);
    setMsg("");
    const reader = new FileReader();
    reader.onload = () => setImgB64(String(reader.result));
    reader.readAsDataURL(f);
  };

  const runAI = async () => {
    if (!imgB64) return;
    setBusy(true);
    setProg(50);
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
    } catch {
      setMsg("AI OCR failed — try local extraction below.");
    }
    setBusy(false);
    setProg(null);
  };

  const runLocal = async () => {
    if (!blob) return;
    setBusy(true);
    setProg(0);
    try {
      const text = await ocrImage(blob, setProg);
      const meds = parseRxText(text);
      setFound(meds);
      setMsg(meds.length
        ? `${meds.length} candidate(s) — review everything before importing.`
        : "No medicines detected. Use brighter light, hold steady, or add manually below.");
    } catch {
      setMsg("OCR engine unreachable. Add manually below — never guess doses.");
    }
    setBusy(false);
    setProg(null);
  };

  const run = () => mode === "ai" ? runAI() : runLocal();

  const edit = (i: number, k: keyof OcrMed, v: string) =>
    setFound((f) => f.map((m, j) => (j === i ? { ...m, [k]: v } : m)));

  const [confirmImport, setConfirmImport] = useState(false);
  const importAll = async () => {
    for (const m of found) {
      await api.addMed(pid, {
        name: m.name, dose: m.dose, frequency: m.frequency,
        time: m.time, instructions: m.instructions, expand: !!m.frequency,
      });
    }
    setMsg(`✓ Imported ${found.length} medicine(s). Verify each against your discharge paper.`);
    setFound([]);
    setConfirmImport(false);
  };

  return (
    <div className="grid gap-3">
      <Page
        title="Scan prescription"
        sub={elderMode
          ? "Take a photo of your prescription to add medicines"
          : "AI Vision + on-device OCR → review → import"}
      />
      <Card>
        <div className="grid gap-2">
          {/* Mode toggle — hidden in elder mode (defaults to AI) */}
          {!elderMode && (
            <div className="flex gap-2" role="radiogroup" aria-label="OCR extraction mode">
              <button
                onClick={() => setMode("ai")}
                role="radio"
                aria-checked={mode === "ai"}
                className={`flex-1 rounded-full py-2 text-xs font-bold ${
                  mode === "ai" ? "bg-primary text-white" : "bg-secondary text-primary"
                }`}
                style={{ minHeight: 44 }}
              >
                🤖 AI Vision (Groq)
              </button>
              <button
                onClick={() => setMode("local")}
                role="radio"
                aria-checked={mode === "local"}
                className={`flex-1 rounded-full py-2 text-xs font-bold ${
                  mode === "local" ? "bg-primary text-white" : "bg-secondary text-primary"
                }`}
                style={{ minHeight: 44 }}
              >
                📱 Local OCR
              </button>
            </div>
          )}

          {/* Photo upload */}
          <label
            className={`grid cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-border bg-muted text-center ${
              elderMode ? "p-8" : "p-6"
            }`}
          >
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => pick(e.target.files?.[0])}
              aria-label="Upload or take a photo of your prescription"
            />
            {img ? (
              <img src={img} alt="Uploaded prescription preview" className={`rounded-xl ${elderMode ? "max-h-64" : "max-h-56"}`} />
            ) : (
              <span className={`text-muted-fg ${elderMode ? "text-base" : "text-sm"}`}>
                📷 {elderMode ? "Tap here to take a photo of your prescription" : "Tap to snap / upload prescription"}
              </span>
            )}
          </label>

          <Btn
            onClick={run}
            disabled={busy || (!imgB64 && !blob)}
            label={busy ? "Reading prescription" : "Extract medicines from prescription photo"}
          >
            {busy ? "Reading…" : elderMode ? "📋 Read Prescription" : mode === "ai" ? "🔍 Extract with AI" : "🔍 Extract locally"}
          </Btn>

          {/* Progress bar */}
          {prog !== null && (
            <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={prog} aria-valuemin={0} aria-valuemax={100} aria-label="Scanning progress">
              <div className="h-full bg-primary transition-all" style={{ width: `${prog}%` }} />
            </div>
          )}

          {msg && (
            <p role="status" aria-live="polite" className={`rounded-xl bg-muted p-2 font-semibold ${elderMode ? "text-sm" : "text-xs"}`}>
              {msg}
            </p>
          )}

          <p className={`text-muted-fg ${elderMode ? "text-xs" : "text-[10px]"}`}>
            ⚠ AI-generated — always verify doses against your discharge paper.
          </p>
        </div>
      </Card>

      {/* Candidate review cards */}
      {found.map((m, i) => (
        <Card key={i} accent={m.confidence >= 80 ? "#10B981" : "#F59E0B"}>
          <div className="mb-1 flex items-center justify-between">
            <p className={`font-bold text-muted-fg ${elderMode ? "text-sm" : "text-xs"}`}>
              Medicine {i + 1} of {found.length}
            </p>
            <Badge level={m.confidence >= 80 ? "taken" : "MONITOR"} />
          </div>
          <div className="grid gap-1.5">
            <label className="text-xs font-bold text-muted-fg">Name</label>
            <Input value={m.name} onChange={(e) => edit(i, "name", e.target.value)} aria-label={`Medicine ${i + 1} name`} />
            <div className="flex gap-1.5">
              <div className="flex-1">
                <label className="text-xs font-bold text-muted-fg">Dose</label>
                <Input value={m.dose} onChange={(e) => edit(i, "dose", e.target.value)} aria-label={`Medicine ${i + 1} dose`} />
              </div>
              <div className="flex-1">
                <label className="text-xs font-bold text-muted-fg">Time</label>
                <Input value={m.time} onChange={(e) => edit(i, "time", e.target.value)} aria-label={`Medicine ${i + 1} time`} />
              </div>
            </div>
            <label className="text-xs font-bold text-muted-fg">Frequency</label>
            <Input value={m.frequency} onChange={(e) => edit(i, "frequency", e.target.value)} aria-label={`Medicine ${i + 1} frequency`} />
          </div>
        </Card>
      ))}

      {/* Import with confirmation */}
      {found.length > 0 && !confirmImport && (
        <Btn kind="success" onClick={() => elderMode ? setConfirmImport(true) : importAll()} label={`Save ${found.length} scanned medicines to your schedule`}>
          Save {found.length} to schedule
        </Btn>
      )}
      {confirmImport && (
        <Card accent="#F59E0B">
          <p className="text-base font-bold">
            Are you sure you want to add {found.length} medicine(s)?
          </p>
          <p className="mt-1 text-sm text-muted-fg">
            Please check each medicine name and dose matches your prescription.
          </p>
          <div className="mt-3 flex gap-2">
            <Btn kind="success" onClick={importAll} label="Confirm and save medicines">Yes, save them</Btn>
            <Btn kind="ghost" onClick={() => setConfirmImport(false)} label="Go back and review">Go back</Btn>
          </div>
        </Card>
      )}

      <Card>
        <h3 className={`mb-2 font-bold ${elderMode ? "text-lg" : ""}`}>Or add manually</h3>
        <ManualAdd />
      </Card>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Manual medicine entry
   ────────────────────────────────────────────────────────────────── */
export function ManualAdd() {
  const { pid } = useApp();
  const [f, setF] = useState({ name: "", dose: "", time: "08:00 AM" });
  const [ok, setOk] = useState("");

  return (
    <div className="grid gap-2">
      <Input placeholder="Medicine name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} aria-label="Medicine name" />
      <div className="flex gap-2">
        <Input placeholder="Dose" value={f.dose} onChange={(e) => setF({ ...f, dose: e.target.value })} aria-label="Medicine dose" />
        <Input placeholder="Time" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} aria-label="Medicine time" />
      </div>
      <Btn
        onClick={async () => {
          if (!f.name || !pid) return;
          await api.addMed(pid, f);
          setOk(`Saved ${f.name}. Confirm dose with your discharge paper.`);
          setF({ name: "", dose: "", time: "08:00 AM" });
        }}
        label="Save medicine to your daily schedule"
      >
        Save to schedule
      </Btn>
      {ok && <p role="status" className="text-xs font-semibold text-emerald-700">{ok}</p>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   Chat — AI companion + care team messaging
   Elder: large bubbles, prominent voice button, minimal text input
   Standard: full-featured with voice note, dictation, text
   ══════════════════════════════════════════════════════════════════ */
export function Chat() {
  const { me, pid } = useApp();
  const profile = useAdaptiveProfile();
  const elderMode = isElder(profile);

  const [peer, setPeer] = useState("");
  const [msgs, setMsgs] = useState<{ from: string; text: string; audio?: string }[]>([]);
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [aiMode, setAiMode] = useState(true);
  const [recUrl, setRecUrl] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const peerRef = useRef("");
  peerRef.current = peer;
  const pidRef = useRef(0);
  pidRef.current = pid;
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

  useEffect(() => {
    box.current?.scrollTo(0, 99999);
  }, [msgs]);

  const loadHistory = async () => {
    if (!pid || !peer) return;
    try {
      const h = await api.chatHistory(pid, Number(peer));
      setMsgs(h.map((m) => ({ from: m.senderId === me?.id ? "me" : "them", text: m.text, audio: m.audio || undefined })));
    } catch { /* offline */ }
  };

  const toggleRec = async () => {
    if (recording) {
      recRef.current?.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks.current = [];
      const rec = new MediaRecorder(stream);
      recRef.current = rec;
      rec.ondataavailable = (e) => chunks.current.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const b = new Blob(chunks.current, { type: rec.mimeType || "audio/webm" });
        const rd = new FileReader();
        rd.onload = () => setRecUrl(String(rd.result));
        rd.readAsDataURL(b);
      };
      rec.start();
      setRecording(true);
    } catch { /* mic denied */ }
  };

  const send = async () => {
    if (!text.trim() && !recUrl) return;
    const t = text;
    const a = recUrl;
    setText("");
    setRecUrl(null);
    setMsgs((m) => [...m, { from: "me", text: t || "🎤", audio: a || undefined }]);

    if (aiMode && pid) {
      try {
        let said = t;
        if (!said && a) {
          try {
            const b = await (await fetch(a)).blob();
            said = (await transcribeBlob(b))?.text || "";
          } catch { /* fall through */ }
        }
        const r = await api.aiChat(pid, said || "voice note sent");
        setMsgs((m) => [...m, { from: "them", text: r.message }]);
        void speakSmart(r.message, me?.language ? `${me.language}-IN` : "en-IN");
      } catch {
        setMsgs((m) => [...m, { from: "them", text: "(offline — will reply when connected)" }]);
      }
    } else if (pid && peer) {
      try {
        await api.chatSend({ receiver_id: Number(peer), patient_id: pid, text: t, audio_base64: a || "" });
      } catch { /* queued */ }
    }
  };

  return (
    <div className="grid gap-3">
      <Page
        title={elderMode ? "Ask Sathi" : "Chat"}
        right={
          !elderMode ? (
            <button
              onClick={() => setAiMode((v) => !v)}
              aria-label={aiMode ? "Switch to care team chat" : "Switch to AI companion"}
              className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                aiMode ? "bg-primary text-white" : "bg-secondary text-primary"
              }`}
              style={{ minHeight: 44 }}
            >
              {aiMode ? "🤖 AI companion" : "👥 Care team"}
            </button>
          ) : undefined
        }
      />

      {/* Peer selector — non-elder, non-AI mode only */}
      {!aiMode && !elderMode && (
        <div className="flex gap-2">
          <Input placeholder="Peer user id" value={peer} onChange={(e) => setPeer(e.target.value)} aria-label="Care team member user ID" />
          <Btn kind="ghost" onClick={loadHistory} label="Load chat history with this person">Load</Btn>
        </div>
      )}

      <Card>
        {/* Messages area */}
        <div
          ref={box}
          className={`mb-2 grid gap-2 overflow-y-auto ${elderMode ? "max-h-96" : "max-h-80"}`}
          role="log"
          aria-label="Chat messages"
          aria-live="polite"
        >
          {msgs.length === 0 && (
            <Empty text={
              elderMode
                ? "Say something like: \"What medicine do I take next?\""
                : aiMode
                  ? "Ask anything — medicines, symptoms, appointments."
                  : "Messages appear live via SSE."
            } />
          )}
          {msgs.map((m, i) => (
            <div
              key={i}
              className={`rounded-2xl p-2.5 ${
                elderMode ? "text-base" : "text-sm"
              } ${m.from === "me"
                ? `justify-self-end bg-primary text-white ${elderMode ? "max-w-[90%]" : "max-w-[85%]"}`
                : `bg-muted ${elderMode ? "max-w-[90%]" : "max-w-[85%]"}`
              }`}
            >
              {m.text !== "🎤" && <p>{m.text}</p>}
              {m.audio && <audio controls src={m.audio} className="mt-1 w-48" aria-label="Voice message playback" />}
            </div>
          ))}
        </div>

        {/* Recording preview */}
        {recUrl && (
          <div className="flex items-center gap-2 rounded-2xl bg-muted p-2">
            <audio controls src={recUrl} className="w-48" aria-label="Your recorded voice note" />
            <button
              className="text-xs font-bold text-red-500"
              onClick={() => setRecUrl(null)}
              aria-label="Delete voice recording"
              style={{ minHeight: 44, minWidth: 44 }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Input area */}
        {elderMode ? (
          /* Elder: prominent voice button, simple text input, large send */
          <div className="grid gap-2">
            <button
              onClick={() => listenOnce((t) => { setText(t); }, setListening)}
              aria-label={listening ? "Listening for your voice" : "Tap to speak your message"}
              className={`w-full rounded-2xl py-4 text-lg font-bold transition-all ${
                listening
                  ? "bg-primary text-white animate-glow"
                  : "bg-secondary text-primary hover:bg-primary hover:text-white"
              }`}
              style={{ minHeight: 56 }}
            >
              {listening ? "🎙 Listening…" : "🎙 Tap to speak"}
            </button>
            <div className="flex gap-2">
              <Input
                placeholder="Or type here…"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                aria-label="Type your message"
              />
              <Btn onClick={send} label="Send message">Send</Btn>
            </div>
          </div>
        ) : (
          /* Standard: full controls */
          <div className="flex gap-2">
            <button
              onClick={() => listenOnce((t) => { setText(t); }, setListening)}
              aria-label={listening ? "Listening for dictation" : "Dictate your message"}
              title="Dictate"
              className="rounded-full bg-secondary px-3 text-lg"
              style={{ minHeight: 44, minWidth: 44 }}
            >
              🎙
            </button>
            <button
              onClick={toggleRec}
              aria-label={recording ? "Stop recording voice note" : "Record a voice note"}
              title="Voice note"
              className={`rounded-full px-3 text-lg ${recording ? "animate-mic bg-danger text-white" : "bg-secondary"}`}
              style={{ minHeight: 44, minWidth: 44 }}
            >
              🎤
            </button>
            <Input
              placeholder="Type a message…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              aria-label="Type your message"
            />
            <Btn onClick={send} label="Send message">Send</Btn>
          </div>
        )}
        {listening && !elderMode && <p className="text-xs text-muted-fg" aria-live="polite">Listening…</p>}
      </Card>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   Drug Interaction Checker
   Critical warnings use role="alert" for screen readers
   ══════════════════════════════════════════════════════════════════ */
export function DrugChecker() {
  const { pid } = useApp();
  const profile = useAdaptiveProfile();
  const elderMode = isElder(profile);

  const [r, setR] = useState<{
    interactions: { pair: string[]; severity: string; description: string; advice: string }[];
    hasCritical: boolean;
    note: string;
  } | null>(null);

  useEffect(() => {
    if (pid) api.drugCheck(pid).then(setR).catch(() => {});
  }, [pid]);

  return (
    <div className="grid gap-3">
      <Page
        title={elderMode ? "Medicine safety check" : "Drug interaction check"}
        sub={elderMode ? "We checked if your medicines work safely together" : "Curated rule base — not a full pharmacology review"}
      />
      {!r ? (
        <Empty text="Checking your medicines…" />
      ) : (
        <>
          {r.hasCritical && (
            <div role="alert" aria-live="assertive" className="animate-danger">
              <Card accent="#EF4444">
                <p className={`font-bold text-danger ${elderMode ? "text-base" : ""}`}>
                  ⚠ {elderMode
                    ? "Warning: Some of your medicines may not be safe together. Please talk to your doctor before taking the next dose."
                    : "Critical interaction found — consult your doctor before the next dose."}
                </p>
              </Card>
            </div>
          )}
          {r.interactions.length === 0 && (
            <Card>
              <p className={elderMode ? "text-base" : "text-sm"}>
                ✅ {elderMode
                  ? "Your medicines look safe together. No problems found."
                  : `No known pairs from the checked list. ${r.note}`}
              </p>
            </Card>
          )}
          {r.interactions.map((x, i) => (
            <Card key={i} accent={x.severity === "high" ? "#EF4444" : "#F59E0B"}>
              <div className="flex items-center justify-between">
                <p className={`font-bold ${elderMode ? "text-base" : ""}`}>{x.pair.join(" + ")}</p>
                <Badge level={elderMode ? (x.severity === "high" ? "⚠ Dangerous" : "⚠ Caution") : x.severity} />
              </div>
              <p className={`mt-1 ${elderMode ? "text-base" : "text-sm"}`}>{x.description}</p>
              <p className={`text-muted-fg ${elderMode ? "text-sm" : "text-xs"}`}>
                💡 {x.advice}
              </p>
            </Card>
          ))}
          <p className={`text-muted-fg ${elderMode ? "text-sm" : "text-xs"}`}>{r?.note}</p>
        </>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   Jargon Simplifier — medical abbreviation → plain language
   ══════════════════════════════════════════════════════════════════ */
export function Simplify() {
  const profile = useAdaptiveProfile();
  const elderMode = isElder(profile);

  const [t, setT] = useState(elderMode ? "" : "Take 1 tab PO BD PC");
  const [r, setR] = useState<{ simplified: string; expanded: string[] } | null>(null);

  const examples = ["Take 1 tab PO BD PC", "Cap 500mg TDS AC", "Tab OD HS", "Inj 40U SC BD"];

  return (
    <div className="grid gap-3">
      <Page
        title={elderMode ? "Understand your prescription" : "Jargon simplifier"}
        sub={elderMode ? "Paste or type medical words to get a simple explanation" : "OD · BD · TDS · PO · STAT…"}
      />
      <Card>
        <div className="grid gap-2">
          {elderMode && (
            <div>
              <p className="mb-2 text-sm font-bold text-muted-fg">Try one of these examples:</p>
              <div className="flex flex-wrap gap-2">
                {examples.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => setT(ex)}
                    className="rounded-full bg-secondary px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary hover:text-white transition-colors"
                    style={{ minHeight: 44 }}
                    aria-label={`Use example: ${ex}`}
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          )}
          <label className={`font-bold text-muted-fg ${elderMode ? "text-sm" : "text-xs"}`}>
            {elderMode ? "Type or paste the medical text below:" : "Medical text"}
          </label>
          <Area
            rows={elderMode ? 4 : 3}
            value={t}
            onChange={(e) => setT(e.target.value)}
            placeholder={elderMode ? "Paste the text from your prescription here…" : "Enter medical abbreviations…"}
            aria-label="Medical text to simplify"
          />
          <Btn
            onClick={async () => setR(await api.simplify(t))}
            disabled={!t.trim()}
            label="Simplify medical text to plain language"
          >
            {elderMode ? "📖 Explain this" : "Simplify"}
          </Btn>
          {r && (
            <div className="rounded-2xl bg-muted p-3" role="region" aria-label="Simplified explanation">
              <p className={`font-semibold ${elderMode ? "text-base" : "text-sm"}`}>{r.simplified}</p>
              {r.expanded.length > 0 && (
                <p className={`mt-1 text-muted-fg ${elderMode ? "text-sm" : "text-xs"}`}>
                  Expanded: {r.expanded.join(", ")}
                </p>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
