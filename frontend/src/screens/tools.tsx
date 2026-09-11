import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { ocrImage, parseRxText, type OcrMed } from "../lib/ocr";
import { speakSmart, transcribeBlob } from "../lib/voice";
import { useApp } from "../lib/store";
import { Badge, Btn, Card, Empty, Input, Area, Page } from "../components/ui";
import { useAdaptiveProfile, isElder, wantsVoicePrimary } from "../lib/useAdaptiveProfile";
import { VoiceInputButton } from "../components/VoiceInputButton";
import {
  Bot,
  Smartphone,
  Check,
  CheckCircle2,
  Sparkles,
  BookOpen,
  Users,
  Mic,
  Send,
  X,
  ShieldAlert,
  Camera,
  PencilLine,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

/* ══════════════════════════════════════════════════════════════════
   Scan — Prescription photo → OCR → review → import
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
  const [rawText, setRawText] = useState("");
  const [showRaw, setShowRaw] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"donut" | "ai" | "local">("donut");

  const pick = (f: File | undefined) => {
    if (!f) return;
    setBlob(f);
    setImg(URL.createObjectURL(f));
    setFound([]);
    setRawText("");
    setMsg("");
    const reader = new FileReader();
    reader.onload = () => setImgB64(String(reader.result));
    reader.readAsDataURL(f);
  };

  const runDonut = async () => {
    if (!imgB64) return;
    setBusy(true);
    setProg(30);
    setMsg("Reading doctor's handwriting with Donut AI model...");
    try {
      setProg(60);
      const r = await api.handwritingOcr(imgB64);
      setProg(100);
      setRawText(r.raw_text || "");
      if (r.raw_text) setShowRaw(true);
      if (r.medicines && r.medicines.length > 0) {
        setFound(
          r.medicines.map((m) => ({
            name: m.name || "",
            dose: m.dose || "",
            frequency: m.frequency || "",
            time: m.time || "08:00 AM",
            instructions: m.instructions || "",
            confidence: 92,
          }))
        );
      }
      setMsg(r.message || "Doctor's handwriting analyzed. Review medicines below.");
    } catch {
      setMsg("Handwriting model unavailable — trying cloud AI vision...");
      await runAI();
    }
    setBusy(false);
    setProg(null);
  };

  const runAI = async () => {
    if (!imgB64) return;
    setBusy(true);
    setProg(50);
    try {
      const r = await api.ocr(imgB64, "groq");
      setProg(100);
      setRawText(r.raw_text || "");
      if (r.medicines && r.medicines.length > 0) {
        setFound(
          r.medicines.map((m) => ({
            name: m.name || "",
            dose: m.dose || "",
            frequency: m.frequency || "",
            time: m.time || "08:00 AM",
            instructions: m.instructions || "",
            confidence: 90,
          }))
        );
      }
      setMsg(r.message || "Extraction complete");
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
      setRawText(text);
      const meds = parseRxText(text);
      setFound(meds);
      setMsg(
        meds.length
          ? `${meds.length} candidate(s) — review everything before importing.`
          : "No medicines detected. Use brighter light, hold steady, or add manually below."
      );
    } catch {
      setMsg("OCR engine unreachable. Add manually below — never guess doses.");
    }
    setBusy(false);
    setProg(null);
  };

  const run = () => {
    if (mode === "donut") return runDonut();
    if (mode === "ai") return runAI();
    return runLocal();
  };

  const edit = (i: number, k: keyof OcrMed, v: string) =>
    setFound((f) => f.map((m, j) => (j === i ? { ...m, [k]: v } : m)));

  const [confirmImport, setConfirmImport] = useState(false);
  const importAll = async () => {
    for (const m of found) {
      await api.addMed(pid, {
        name: m.name,
        dose: m.dose,
        frequency: m.frequency,
        time: m.time,
        instructions: m.instructions,
        expand: !!m.frequency,
      });
    }
    setMsg(`Imported ${found.length} medicine(s). Verify each against your discharge paper.`);
    setFound([]);
    setConfirmImport(false);
  };

  return (
    <div className="grid gap-4">
      <Page
        title="Scan prescription"
        sub={
          elderMode
            ? "Take a photo of your doctor's handwritten prescription to add medicines"
            : "Hugging Face Donut Handwriting OCR + Vision + on-device fallback"
        }
      />
      <Card>
        <div className="grid gap-3">
          {/* Mode toggle */}
          {!elderMode && (
            <div className="flex gap-2 flex-wrap" role="radiogroup" aria-label="OCR extraction mode">
              <button
                onClick={() => setMode("donut")}
                role="radio"
                aria-checked={mode === "donut"}
                className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 rounded-full py-2 px-3 text-xs font-bold transition min-h-[44px] ${
                  mode === "donut"
                    ? "bg-primary text-white shadow-sm"
                    : "bg-primary-soft text-primary hover:bg-primary/20"
                }`}
              >
                <PencilLine className="h-4 w-4" aria-hidden="true" />
                <span>Doctor Handwriting (Donut)</span>
              </button>
              <button
                onClick={() => setMode("ai")}
                role="radio"
                aria-checked={mode === "ai"}
                className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 rounded-full py-2 px-3 text-xs font-bold transition min-h-[44px] ${
                  mode === "ai"
                    ? "bg-primary text-white shadow-sm"
                    : "bg-primary-soft text-primary hover:bg-primary/20"
                }`}
              >
                <Bot className="h-4 w-4" aria-hidden="true" />
                <span>AI Vision</span>
              </button>
              <button
                onClick={() => setMode("local")}
                role="radio"
                aria-checked={mode === "local"}
                className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 rounded-full py-2 px-3 text-xs font-bold transition min-h-[44px] ${
                  mode === "local"
                    ? "bg-primary text-white shadow-sm"
                    : "bg-primary-soft text-primary hover:bg-primary/20"
                }`}
              >
                <Smartphone className="h-4 w-4" aria-hidden="true" />
                <span>Local OCR</span>
              </button>
            </div>
          )}

          {/* Photo upload */}
          <label
            className={`grid cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-border bg-surface-sunken text-center hover:border-primary/50 transition ${
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
              <img
                src={img}
                alt="Uploaded prescription preview"
                className={`rounded-xl object-contain ${elderMode ? "max-h-64" : "max-h-56"}`}
              />
            ) : (
              <div className="grid place-items-center gap-2 text-ink-muted">
                <Camera className="h-10 w-10 text-primary" aria-hidden="true" />
                <p className={`font-semibold text-ink ${elderMode ? "text-lg" : "text-sm"}`}>
                  {elderMode ? "Tap here to take photo" : "Select or drop prescription photo"}
                </p>
                <p className="text-xs text-ink-muted">JPEG, PNG or camera capture</p>
              </div>
            )}
          </label>

          {img && (
            <Btn
              onClick={run}
              disabled={busy}
              className={`flex items-center justify-center gap-2 ${elderMode ? "!min-h-[56px] !text-lg" : ""}`}
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              {busy ? "Reading prescription…" : "Read prescription"}
            </Btn>
          )}

          {prog !== null && (
            <div className="w-full bg-surface-sunken rounded-full h-2 overflow-hidden">
              <div
                className="bg-primary h-2 transition-all duration-300"
                style={{ width: `${prog}%` }}
              />
            </div>
          )}

          {msg && (
            <p className="text-sm font-semibold text-ink" role="status">
              {msg}
            </p>
          )}
        </div>
      </Card>

      {/* Raw Doctor's Handwriting Transcription Card */}
      {rawText && (
        <Card className="border border-primary/30 bg-surface-raised">
          <button
            onClick={() => setShowRaw((s) => !s)}
            className="w-full flex items-center justify-between text-left"
            aria-expanded={showRaw}
          >
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" aria-hidden="true" />
              <span className="text-xs font-bold uppercase tracking-wider text-ink">
                Doctor's Handwriting Transcription
              </span>
            </div>
            {showRaw ? (
              <ChevronUp className="h-4 w-4 text-ink-muted" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-4 w-4 text-ink-muted" aria-hidden="true" />
            )}
          </button>
          {showRaw && (
            <div className="mt-3 pt-3 border-t border-border">
              <pre className="text-xs text-ink whitespace-pre-wrap font-mono bg-surface-sunken p-3 rounded-lg border border-border/60">
                {rawText}
              </pre>
              <p className="mt-1 text-[11px] text-ink-muted">
                Transcribed with Hugging Face Donut model (chinmays18/medical-prescription-ocr).
              </p>
            </div>
          )}
        </Card>
      )}

      {/* Candidate review cards */}
      {found.map((m, i) => (
        <Card
          key={i}
          className={`border-2 ${
            m.confidence >= 80 ? "border-success/30" : "border-warning/30"
          }`}
        >
          <div className="mb-2 flex items-center justify-between">
            <p className={`font-bold text-ink-muted ${elderMode ? "text-sm" : "text-xs"}`}>
              Medicine {i + 1} of {found.length}
            </p>
            <Badge level={m.confidence >= 80 ? "taken" : "MONITOR"} />
          </div>
          <div className="grid gap-2">
            <label className="text-xs font-bold text-ink">
              Name
              <Input
                value={m.name}
                onChange={(e) => edit(i, "name", e.target.value)}
                aria-label={`Medicine ${i + 1} name`}
              />
            </label>
            <div className="flex gap-2">
              <label className="flex-1 text-xs font-bold text-ink">
                Dose
                <Input
                  value={m.dose}
                  onChange={(e) => edit(i, "dose", e.target.value)}
                  aria-label={`Medicine ${i + 1} dose`}
                />
              </label>
              <label className="flex-1 text-xs font-bold text-ink">
                Time
                <Input
                  value={m.time}
                  onChange={(e) => edit(i, "time", e.target.value)}
                  aria-label={`Medicine ${i + 1} time`}
                />
              </label>
            </div>
            <label className="text-xs font-bold text-ink">
              Frequency
              <Input
                value={m.frequency}
                onChange={(e) => edit(i, "frequency", e.target.value)}
                aria-label={`Medicine ${i + 1} frequency`}
              />
            </label>
          </div>
        </Card>
      ))}

      {/* Import with confirmation */}
      {found.length > 0 && !confirmImport && (
        <Btn
          kind="success"
          onClick={() => (elderMode ? setConfirmImport(true) : importAll())}
          className="flex items-center justify-center gap-2"
        >
          <Check className="h-5 w-5 stroke-[3]" aria-hidden="true" />
          Save {found.length} to schedule
        </Btn>
      )}

      {confirmImport && (
        <Card className="border-2 border-warning bg-warning-bg">
          <p className="text-base font-bold text-ink">
            Are you sure you want to add {found.length} medicine(s)?
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            Please check each medicine name and dose matches your prescription.
          </p>
          <div className="mt-3 flex gap-2">
            <Btn kind="success" onClick={importAll}>
              Yes, save them
            </Btn>
            <Btn kind="ghost" onClick={() => setConfirmImport(false)}>
              Go back
            </Btn>
          </div>
        </Card>
      )}

      <Card>
        <h2 className={`mb-2 font-bold text-ink ${elderMode ? "text-lg" : "text-base"}`}>
          Or add manually
        </h2>
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
    <div className="grid gap-2.5">
      <Input
        placeholder="Medicine name"
        value={f.name}
        onChange={(e) => setF({ ...f, name: e.target.value })}
        aria-label="Medicine name"
      />
      <div className="flex gap-2">
        <Input
          placeholder="Dose"
          value={f.dose}
          onChange={(e) => setF({ ...f, dose: e.target.value })}
          aria-label="Medicine dose"
        />
        <Input
          placeholder="Time"
          value={f.time}
          onChange={(e) => setF({ ...f, time: e.target.value })}
          aria-label="Medicine time"
        />
      </div>
      <Btn
        onClick={async () => {
          if (!f.name || !pid) return;
          await api.addMed(pid, f);
          setOk(`Saved ${f.name}. Confirm dose with your discharge paper.`);
          setF({ name: "", dose: "", time: "08:00 AM" });
        }}
        className="flex items-center justify-center gap-1.5"
      >
        <Check className="h-4 w-4" aria-hidden="true" />
        Save to schedule
      </Btn>
      {ok && (
        <p role="status" className="text-xs font-semibold text-success">
          {ok}
        </p>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   Chat — AI companion + care team messaging
   ══════════════════════════════════════════════════════════════════ */
export function Chat() {
  const { me, pid } = useApp();
  const profile = useAdaptiveProfile();
  const elderMode = isElder(profile);
  const voicePrimary = wantsVoicePrimary(profile);

  const [peer, setPeer] = useState("");
  const [msgs, setMsgs] = useState<{ from: string; text: string; audio?: string }[]>([]);
  const [text, setText] = useState("");
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
            api
              .chatHistory(pidRef.current, Number(peerRef.current))
              .then((h) =>
                setMsgs(
                  h.map((m) => ({
                    from: m.senderId === myId ? "me" : "them",
                    text: m.text,
                    audio: m.audio || undefined,
                  }))
                )
              )
              .catch(() => {});
          } else {
            setMsgs((m) => [
              ...m,
              { from: p.data.senderId === myId ? "me" : "them", text: p.data.text },
            ]);
          }
        } else if (p.type === "notification") {
          setMsgs((m) => [...m, { from: "them", text: `${p.data.title}: ${p.data.body}` }]);
        }
      } catch {
        /* heartbeat */
      }
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
      setMsgs(
        h.map((m) => ({
          from: m.senderId === me?.id ? "me" : "them",
          text: m.text,
          audio: m.audio || undefined,
        }))
      );
    } catch {
      /* offline */
    }
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
    } catch {
      /* mic denied */
    }
  };

  const send = async (overrideText?: string) => {
    const t = overrideText || text;
    const a = recUrl;
    if (!t.trim() && !a) return;
    setText("");
    setRecUrl(null);
    setMsgs((m) => [...m, { from: "me", text: t || "Voice note", audio: a || undefined }]);

    if (aiMode && pid) {
      try {
        let said = t;
        if (!said && a) {
          try {
            const b = await (await fetch(a)).blob();
            said = (await transcribeBlob(b))?.text || "";
          } catch {
            /* fall through */
          }
        }
        const r = await api.aiChat(pid, said || "voice note sent");
        setMsgs((m) => [...m, { from: "them", text: r.message }]);
        void speakSmart(r.message, me?.language ? `${me.language}-IN` : "en-IN");
      } catch {
        setMsgs((m) => [...m, { from: "them", text: "(offline — will reply when connected)" }]);
      }
    } else if (pid && peer) {
      try {
        await api.chatSend({
          receiver_id: Number(peer),
          patient_id: pid,
          text: t,
          audio_base64: a || "",
        });
      } catch {
        /* queued */
      }
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
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold min-h-[44px] transition ${
                aiMode
                  ? "bg-primary text-white"
                  : "bg-primary-soft text-primary hover:bg-primary/20"
              }`}
            >
              {aiMode ? (
                <>
                  <Bot className="h-4 w-4" aria-hidden="true" />
                  <span>AI companion</span>
                </>
              ) : (
                <>
                  <Users className="h-4 w-4" aria-hidden="true" />
                  <span>Care team</span>
                </>
              )}
            </button>
          ) : undefined
        }
      />

      {/* Peer selector */}
      {!aiMode && !elderMode && (
        <div className="flex gap-2">
          <Input
            placeholder="Peer user id"
            value={peer}
            onChange={(e) => setPeer(e.target.value)}
            aria-label="Care team member user ID"
          />
          <Btn kind="ghost" onClick={loadHistory} label="Load chat history with this person">
            Load
          </Btn>
        </div>
      )}

      <Card>
        {/* Messages area */}
        <div
          ref={box}
          className={`mb-3 grid gap-2.5 overflow-y-auto ${elderMode ? "max-h-96" : "max-h-80"}`}
          role="log"
          aria-label="Chat messages"
          aria-live="polite"
        >
          {msgs.length === 0 && (
            <Empty
              text={
                elderMode
                  ? "Say something like: \"What medicine do I take next?\""
                  : aiMode
                  ? "Ask anything — medicines, symptoms, appointments."
                  : "Messages appear live via SSE."
              }
            />
          )}
          {msgs.map((m, i) => (
            <div
              key={i}
              className={`rounded-2xl p-3 leading-relaxed ${
                elderMode ? "text-base" : "text-sm"
              } ${
                m.from === "me"
                  ? `justify-self-end bg-primary text-white ${
                      elderMode ? "max-w-[90%]" : "max-w-[85%]"
                    }`
                  : `bg-surface-sunken text-ink ${elderMode ? "max-w-[90%]" : "max-w-[85%]"}`
              }`}
            >
              <p>{m.text}</p>
              {m.audio && (
                <audio
                  controls
                  src={m.audio}
                  className="mt-2 w-48"
                  aria-label="Voice message playback"
                />
              )}
            </div>
          ))}
        </div>

        {/* Recording preview */}
        {recUrl && (
          <div className="flex items-center gap-2 rounded-2xl bg-surface-sunken p-2 mb-2">
            <audio controls src={recUrl} className="w-48" aria-label="Your recorded voice note" />
            <button
              className="text-xs font-bold text-danger min-h-[44px] min-w-[44px] grid place-items-center"
              onClick={() => setRecUrl(null)}
              aria-label="Delete voice recording"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Input area */}
        {elderMode || voicePrimary ? (
          <div className="grid gap-3">
            <VoiceInputButton
              onTranscript={(spoken) => {
                setText(spoken);
                send(spoken);
              }}
              elderVariant={true}
              className="mx-auto w-full"
            />
            <div className="flex gap-2">
              <Input
                placeholder="Or type here…"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                aria-label="Type your message"
                className="!min-h-[52px] !text-base"
              />
              <Btn onClick={() => send()} className="!min-h-[52px] px-5 flex items-center gap-1.5">
                <Send className="h-4 w-4" aria-hidden="true" />
                <span>Send</span>
              </Btn>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <VoiceInputButton
              onTranscript={(spoken) => {
                setText((prev) => (prev ? `${prev} ${spoken}` : spoken));
              }}
            />
            <button
              onClick={toggleRec}
              aria-label={recording ? "Stop recording voice note" : "Record a voice note"}
              title="Voice note"
              className={`rounded-full p-2.5 transition min-h-[44px] min-w-[44px] grid place-items-center ${
                recording ? "bg-danger text-white animate-pulse" : "bg-primary-soft text-primary"
              }`}
            >
              <Mic className="h-5 w-5" aria-hidden="true" />
            </button>
            <Input
              placeholder="Type a message…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              aria-label="Type your message"
            />
            <Btn onClick={() => send()} className="flex items-center gap-1.5">
              <Send className="h-4 w-4" aria-hidden="true" />
              <span>Send</span>
            </Btn>
          </div>
        )}
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
        sub={
          elderMode
            ? "We checked if your medicines work safely together"
            : "Curated rule base — not a full pharmacology review"
        }
      />
      {!r ? (
        <Empty text="Checking your medicines…" />
      ) : (
        <>
          {r.hasCritical && (
            <div role="alert" aria-live="assertive">
              <Card className="border-2 border-danger bg-danger-bg">
                <p className={`flex items-center gap-2 font-bold text-danger ${elderMode ? "text-base" : "text-sm"}`}>
                  <ShieldAlert className="h-5 w-5 shrink-0" aria-hidden="true" />
                  {elderMode
                    ? "Warning: Some of your medicines may not be safe together. Please talk to your doctor before taking the next dose."
                    : "Critical interaction found — consult your doctor before the next dose."}
                </p>
              </Card>
            </div>
          )}

          {r.interactions.length === 0 && (
            <Card className="border border-success/30 bg-success-bg">
              <p className={`flex items-center gap-2 font-semibold text-success ${elderMode ? "text-base" : "text-sm"}`}>
                <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
                {elderMode
                  ? "Your medicines look safe together. No problems found."
                  : `No known pairs from the checked list. ${r.note}`}
              </p>
            </Card>
          )}

          {r.interactions.map((x, i) => (
            <Card
              key={i}
              className={`border-2 ${
                x.severity === "high"
                  ? "border-danger/40 bg-danger-bg"
                  : "border-warning/40 bg-warning-bg"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className={`font-bold text-ink ${elderMode ? "text-base" : "text-sm"}`}>
                  {x.pair.join(" + ")}
                </p>
                <Badge
                  level={
                    elderMode
                      ? x.severity === "high"
                        ? "Dangerous"
                        : "Caution"
                      : x.severity
                  }
                />
              </div>
              <p className={`mt-2 text-ink ${elderMode ? "text-base leading-relaxed" : "text-sm"}`}>
                {x.description}
              </p>
              <p className={`mt-1.5 flex items-start gap-1.5 text-ink-muted ${elderMode ? "text-sm" : "text-xs"}`}>
                <Sparkles className="h-4 w-4 shrink-0 text-primary mt-0.5" aria-hidden="true" />
                <span>{x.advice}</span>
              </p>
            </Card>
          ))}
          {r.note && (
            <p className={`text-ink-muted ${elderMode ? "text-sm" : "text-xs"}`}>{r.note}</p>
          )}
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
    <div className="grid gap-4">
      <Page
        title={elderMode ? "Understand your prescription" : "Jargon simplifier"}
        sub={
          elderMode
            ? "Paste or type medical words to get a simple explanation"
            : "OD · BD · TDS · PO · STAT…"
        }
      />
      <Card>
        <div className="grid gap-3">
          {elderMode && (
            <div>
              <p className="mb-2 text-sm font-bold text-ink-muted">Try one of these examples:</p>
              <div className="flex flex-wrap gap-2">
                {examples.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => setT(ex)}
                    className="rounded-full bg-primary-soft px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary hover:text-white transition-colors min-h-[44px]"
                    aria-label={`Use example: ${ex}`}
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          )}
          <label className={`font-bold text-ink ${elderMode ? "text-sm" : "text-xs"}`}>
            {elderMode ? "Type or paste the medical text below:" : "Medical text"}
            <Area
              rows={elderMode ? 4 : 3}
              value={t}
              onChange={(e) => setT(e.target.value)}
              placeholder={
                elderMode
                  ? "Paste the text from your prescription here…"
                  : "Enter medical abbreviations…"
              }
              aria-label="Medical text to simplify"
              className="mt-1"
            />
          </label>
          <Btn
            onClick={async () => setR(await api.simplify(t))}
            disabled={!t.trim()}
            className={`flex items-center justify-center gap-2 ${elderMode ? "!min-h-[56px] !text-lg" : ""}`}
          >
            <BookOpen className="h-5 w-5" aria-hidden="true" />
            <span>{elderMode ? "Explain this" : "Simplify"}</span>
          </Btn>
          {r && (
            <div
              className="rounded-2xl border border-primary/20 bg-primary-soft p-4"
              role="region"
              aria-label="Simplified explanation"
            >
              <p className={`font-semibold text-ink ${elderMode ? "text-base" : "text-sm"}`}>
                {r.simplified}
              </p>
              {r.expanded.length > 0 && (
                <p className={`mt-2 text-ink-muted ${elderMode ? "text-sm" : "text-xs"}`}>
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
