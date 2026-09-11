import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { api } from "../lib/api";
import { useApp } from "../lib/store";
import { Btn, Card, Empty, Page } from "../components/ui";
import { useAdaptiveProfile, getVariant, prefersReducedMotion } from "../lib/useAdaptiveProfile";

/* ──────────────────────────────────────────────────────────────────
   Panic Button — adaptive elder / standard variants
   Elder: single-tap → 3s cancellable countdown (simple under panic)
   Standard: 5-tap arm → 5s countdown (guards against accidental triggers)
   ────────────────────────────────────────────────────────────────── */
function PanicButton({ onSent }: { onSent: (n: number) => void }) {
  const { pid } = useApp();
  const profile = useAdaptiveProfile();
  const variant = getVariant(profile);
  const isElderMode = variant === "elder";

  const [taps, setTaps] = useState(0);
  const [count, setCount] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  const timer = useRef<number | null>(null);

  useEffect(() => () => { if (timer.current) window.clearInterval(timer.current); }, []);

  const startCountdown = (seconds: number) => {
    setCount(seconds);
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
  };

  const tap = () => {
    if (count !== null) return;

    if (isElderMode) {
      // Elder: single tap starts a short 3s countdown
      startCountdown(3);
    } else {
      // Standard: require 5 taps to arm
      const n = taps + 1;
      setTaps(n);
      if (n >= 5) {
        setTaps(0);
        startCountdown(5);
      } else {
        window.setTimeout(() => setTaps(0), 2500);
      }
    }
  };

  const cancel = () => {
    if (timer.current) window.clearInterval(timer.current);
    setCount(null);
    setTaps(0);
    setMsg("SOS cancelled — no alert sent.");
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

  // Elder variant — large, simple, unmistakable
  if (isElderMode) {
    return (
      <Card accent="#EF4444">
        <p className="text-lg font-extrabold text-danger" id="sos-title">🚨 Emergency SOS</p>
        <p className="mt-1 text-base text-muted-fg">
          Tap the button below to alert your care team.
        </p>
        <button
          onClick={tap}
          aria-label={count !== null ? `Sending SOS in ${count} seconds` : "Tap to send emergency SOS alert"}
          aria-describedby="sos-title"
          className={`mt-3 w-full rounded-2xl py-6 text-xl font-extrabold text-white active:scale-[0.98] transition-transform ${
            count !== null ? "bg-danger animate-danger" : "bg-danger hover:brightness-110"
          }`}
          style={{ minHeight: 72 }}
        >
          {count !== null ? `SENDING IN ${count}…` : "🚨 SEND SOS"}
        </button>
        {count !== null && (
          <Btn kind="ghost" onClick={cancel} label="Cancel emergency SOS alert" className="mt-2 w-full text-base">
            Cancel — I'm okay
          </Btn>
        )}
        {msg && (
          <p role="status" aria-live="assertive" className="mt-3 rounded-xl bg-muted p-3 text-base font-semibold">
            {msg}
          </p>
        )}
      </Card>
    );
  }

  // Standard variant — 5-tap arm + countdown
  return (
    <Card accent="#EF4444">
      <p className="font-bold text-danger" id="sos-title-std">🚨 Emergency SOS</p>
      <p className="text-xs text-muted-fg">
        Tap 5 times fast to alert your care team. Then call emergency services below.
      </p>
      <button
        onClick={tap}
        aria-label={
          count !== null
            ? `Sending SOS in ${count} seconds`
            : taps > 0
              ? `Keep tapping, ${taps} of 5 taps done`
              : "Tap 5 times quickly to activate emergency SOS"
        }
        aria-describedby="sos-title-std"
        className={`mt-2 w-full rounded-2xl py-4 text-lg font-extrabold text-white active:scale-[0.99] transition-transform ${
          count !== null ? "bg-danger animate-danger" : "bg-danger"
        }`}
        style={{ minHeight: 56 }}
      >
        {count !== null ? `SENDING IN ${count}…` : taps > 0 ? `Keep tapping! (${taps}/5)` : "TAP 5× FOR SOS"}
      </button>
      {count !== null && (
        <Btn kind="ghost" onClick={cancel} label="Cancel emergency SOS alert" className="mt-1">
          Cancel SOS
        </Btn>
      )}
      {msg && (
        <p role="status" aria-live="assertive" className="mt-2 rounded-xl bg-muted p-2 text-xs font-semibold">
          {msg}
        </p>
      )}
    </Card>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Dial Buttons — one-tap emergency contacts with full ARIA labels
   ────────────────────────────────────────────────────────────────── */
function DialButtons() {
  const { pid } = useApp();
  const profile = useAdaptiveProfile();
  const isElderMode = getVariant(profile) === "elder";
  const [contact, setContact] = useState("");

  useEffect(() => {
    if (pid) api.emergencyCard(pid).then((c) => setContact(c.emergency_contact || "")).catch(() => {});
  }, [pid]);

  const smsBody = encodeURIComponent("SOS: I need help. This is my emergency alert from Sathi.");
  const btnBase = isElderMode
    ? "rounded-2xl p-4 text-center text-base font-extrabold"
    : "rounded-2xl p-3 text-center text-sm font-extrabold";

  return (
    <Card>
      <p className={`mb-2 font-bold ${isElderMode ? "text-lg" : ""}`}>📞 One-tap help</p>
      <div className={`grid gap-2 ${isElderMode ? "grid-cols-1" : "grid-cols-2"}`}>
        <a
          href="tel:112"
          aria-label="Call emergency services at 112"
          className={`${btnBase} bg-danger text-white`}
          style={{ minHeight: isElderMode ? 56 : 44 }}
        >
          {isElderMode ? "🚨 Call 112 — Emergency" : "Call 112"}
        </a>
        <a
          href="tel:108"
          aria-label="Call ambulance at 108"
          className={`${btnBase} bg-primary text-white`}
          style={{ minHeight: isElderMode ? 56 : 44 }}
        >
          {isElderMode ? "🚑 Call Ambulance — 108" : "Ambulance 108"}
        </a>
        {contact && (
          <a
            href={`tel:${encodeURIComponent(contact)}`}
            aria-label={`Call your emergency contact at ${contact}`}
            className={`${btnBase} bg-secondary text-primary`}
            style={{ minHeight: isElderMode ? 56 : 44 }}
          >
            {isElderMode ? `📱 Call ${contact}` : `Contact: ${contact}`}
          </a>
        )}
        <a
          href={`sms:?body=${smsBody}`}
          aria-label="Share SOS message via SMS"
          className={`${btnBase} bg-secondary text-primary`}
          style={{ minHeight: isElderMode ? 56 : 44 }}
        >
          {isElderMode ? "💬 Send SOS Message" : "Share SOS via SMS"}
        </a>
      </div>
      <p className={`mt-2 text-muted-fg ${isElderMode ? "text-sm" : "text-[11px]"}`}>
        Sathi never auto-dials or dispatches — you stay in control; the care team is alerted in parallel.
      </p>
    </Card>
  );
}

/* ──────────────────────────────────────────────────────────────────
   CPR Coach — 110 BPM metronome + compression counter
   Respects prefers-reduced-motion. Guidance only.
   ────────────────────────────────────────────────────────────────── */
const CPR_GUIDE: Record<string, { rate: string; depth: string; notes: string }> = {
  Adult: { rate: "110 compressions/min", depth: "5–6 cm, center of chest", notes: "Push hard and fast. Let the chest fully recoil. Call 112 first, on speaker." },
  Child: { rate: "110 compressions/min", depth: "~5 cm, one hand", notes: "One hand for small children. 30 compressions : 2 breaths if trained." },
  Infant: { rate: "110 compressions/min", depth: "~4 cm, two fingers", notes: "Two fingers center of chest, just below nipple line. Be gentle but firm." },
};

function CprCoach() {
  const profile = useAdaptiveProfile();
  const isElderMode = getVariant(profile) === "elder";
  const reducedMotion = prefersReducedMotion(profile);

  const [who, setWho] = useState<"Adult" | "Child" | "Infant">("Adult");
  const [running, setRunning] = useState(false);
  const [beats, setBeats] = useState(0);
  const timer = useRef<number | null>(null);
  const audio = useRef<AudioContext | null>(null);

  const beep = () => {
    try {
      audio.current ||= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const ctx = audio.current;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.frequency.value = 880;
      g.gain.value = 0.15;
      o.start();
      o.stop(ctx.currentTime + 0.08);
    } catch { /* silent metronome fallback */ }
  };

  const toggle = () => {
    if (running) {
      if (timer.current) window.clearInterval(timer.current);
      setRunning(false);
      return;
    }
    setBeats(0);
    setRunning(true);
    timer.current = window.setInterval(() => {
      beep();
      setBeats((b) => b + 1);
    }, 60000 / 110);
  };

  useEffect(() => () => { if (timer.current) window.clearInterval(timer.current); }, []);
  const g = CPR_GUIDE[who];

  return (
    <Card accent="#F59E0B">
      <p className={`font-bold ${isElderMode ? "text-lg" : ""}`}>❤️ CPR & choking coach</p>
      <p className={`text-muted-fg ${isElderMode ? "text-sm" : "text-[11px]"}`}>
        Guidance only — call 112 first. For choking: 5 back blows, then 5 abdominal thrusts, repeat.
      </p>
      <div className="mt-2 flex gap-2" role="radiogroup" aria-label="Select patient age group">
        {(Object.keys(CPR_GUIDE) as ("Adult" | "Child" | "Infant")[]).map((k) => (
          <button
            key={k}
            onClick={() => setWho(k)}
            role="radio"
            aria-checked={who === k}
            className={`flex-1 rounded-full py-2 text-xs font-bold transition-colors ${
              who === k ? "bg-primary text-white" : "bg-secondary text-primary"
            }`}
            style={{ minHeight: 44 }}
          >
            {k}
          </button>
        ))}
      </div>
      <div className={`mt-2 rounded-2xl bg-muted p-3 ${isElderMode ? "text-base" : "text-sm"}`}>
        <p><b>Rate:</b> {g.rate}</p>
        <p><b>Depth:</b> {g.depth}</p>
        <p className="mt-1">{g.notes}</p>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Btn
          onClick={toggle}
          kind={running ? "danger" : "primary"}
          label={running ? "Stop CPR metronome" : "Start CPR metronome at 110 beats per minute"}
        >
          {running ? "Stop metronome" : "Start 110 BPM metronome"}
        </Btn>
        <p
          className={`font-extrabold ${isElderMode ? "text-base" : "text-sm"}`}
          aria-live="polite"
          aria-atomic="true"
        >
          {beats > 0 ? `Compressions: ${beats}` : ""}
        </p>
      </div>
      {running && !reducedMotion && (
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-warning animate-danger" style={{ width: "100%" }} />
        </div>
      )}
      {running && reducedMotion && (
        <p className="mt-2 text-xs font-bold text-warning" aria-live="polite">⏱ Metronome active — follow the beeps</p>
      )}
      <a
        href="tel:112"
        aria-label="Call emergency services at 112 now"
        className={`mt-2 block rounded-2xl bg-danger text-center font-extrabold text-white ${
          isElderMode ? "p-4 text-base" : "p-3 text-sm"
        }`}
        style={{ minHeight: isElderMode ? 56 : 44 }}
      >
        Call 112 now
      </a>
    </Card>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Medical Emergency Card — pull-from-stored-data, QR, printable
   ────────────────────────────────────────────────────────────────── */
function MedicalCard() {
  const { pid } = useApp();
  const profile = useAdaptiveProfile();
  const isElderMode = getVariant(profile) === "elder";
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
          <p className={`font-bold ${isElderMode ? "text-lg" : ""}`}>
            🪪 Medical card — {card.name}
          </p>
          <p className={`text-muted-fg ${isElderMode ? "text-base" : "text-xs"}`}>
            {card.age}y · {card.condition || "post-discharge recovery"} · speaks {card.language}
          </p>
          <p className={`mt-1 ${isElderMode ? "text-base" : "text-sm"}`}>
            Contact: <b>{card.emergency_contact || "—"}</b>
          </p>
          {card.medications.map((m, i) => (
            <p key={i} className={isElderMode ? "text-base" : "text-sm"}>
              • {m.name} — {m.dose} at {m.time}
            </p>
          ))}
          {card.next_followup && (
            <p className={`mt-1 ${isElderMode ? "text-sm" : "text-xs"}`}>
              Next: {card.next_followup}
            </p>
          )}
        </div>
        <QRCodeSVG value={qrText} size={isElderMode ? 130 : 110} aria-label="QR code with emergency medical information" />
      </div>
      <p className={`mt-2 text-muted-fg ${isElderMode ? "text-sm" : "text-[11px]"}`}>{card.note}</p>
      <Btn kind="ghost" onClick={() => window.print()} label="Print emergency medical card for first responders" className="mt-1">
        🖨 Print card for first responders
      </Btn>
    </Card>
  );
}

/* ──────────────────────────────────────────────────────────────────
   SOS Screen — composed from adaptive sub-components
   ────────────────────────────────────────────────────────────────── */
export function SOS() {
  const profile = useAdaptiveProfile();
  const isElderMode = getVariant(profile) === "elder";
  const [sent, setSent] = useState<number | null>(null);

  return (
    <div className="grid gap-3">
      <Page
        title="Emergency SOS"
        sub={isElderMode ? "Get help quickly" : "Alert care team · call for help · first-aid coach"}
      />
      {sent !== null && (
        <div role="alert" aria-live="assertive">
          <Card accent="#EF4444">
            <p className={`font-bold ${isElderMode ? "text-base" : "text-sm"}`}>
              SOS logged in your recovery timeline ({sent} notified).
              {" "}If this is life-threatening, call 112 now.
            </p>
          </Card>
        </div>
      )}
      <PanicButton onSent={setSent} />
      <DialButtons />
      <CprCoach />
      <MedicalCard />
    </div>
  );
}
