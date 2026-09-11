import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { api } from "../lib/api";
import { useApp } from "../lib/store";
import { Btn, Card, Empty, Page } from "../components/ui";
import { useAdaptiveProfile, getVariant, prefersReducedMotion } from "../lib/useAdaptiveProfile";
import {
  ShieldAlert,
  Phone,
  PhoneCall,
  Activity,
  HeartPulse,
  Printer,
  FileText,
  Clock,
  MessageSquare,
} from "lucide-react";

/* ──────────────────────────────────────────────────────────────────
   Panic Button — adaptive elder / standard variants
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

  useEffect(() => () => {
    if (timer.current) window.clearInterval(timer.current);
  }, []);

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
      startCountdown(3);
    } else {
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
    const caregiverPhone = localStorage.getItem("@sathi_caregiver_phone") || "+91 98765 43210";
    try {
      const r = await api.sosAlert(pid, "Panic-button SOS from app");
      setMsg(`Alert sent to care team. Initiating phone call to caregiver at ${caregiverPhone}...`);
      onSent(r.notified);
    } catch {
      setMsg(`Initiating phone call to caregiver at ${caregiverPhone}...`);
    }
    // Launch native phone dialer immediately to call caregiver
    window.location.href = `tel:${caregiverPhone.replace(/\s+/g, "")}`;
  };

  // Elder variant
  if (isElderMode) {
    return (
      <Card className="border-2 border-danger bg-danger-bg/50">
        <p className="flex items-center gap-2 text-xl font-extrabold text-danger" id="sos-title">
          <ShieldAlert className="h-6 w-6" aria-hidden="true" />
          <span>Emergency SOS</span>
        </p>
        <p className="mt-1 text-base text-ink font-medium">
          Tap the button below to alert your care team and call your caregiver.
        </p>
        <button
          onClick={tap}
          aria-label={count !== null ? `Sending SOS in ${count} seconds` : "Tap to send emergency SOS alert"}
          aria-describedby="sos-title"
          className={`mt-4 w-full flex items-center justify-center gap-2 rounded-2xl py-6 text-xl font-extrabold text-white active:scale-[0.98] transition-transform ${
            count !== null ? "bg-danger animate-pulse" : "bg-danger hover:brightness-110 shadow-elev-2"
          }`}
          style={{ minHeight: 72 }}
        >
          <ShieldAlert className="h-6 w-6" aria-hidden="true" />
          <span>{count !== null ? `CALLING IN ${count}…` : "TAP FOR EMERGENCY SOS"}</span>
        </button>
        {count !== null && (
          <Btn
            kind="ghost"
            onClick={cancel}
            label="Cancel emergency SOS alert"
            className="mt-2 w-full text-base min-h-[52px]"
          >
            Cancel — I'm okay
          </Btn>
        )}
        {msg && (
          <p
            role="status"
            aria-live="assertive"
            className="mt-3 rounded-xl bg-surface p-3 text-base font-semibold text-ink border border-border"
          >
            {msg}
          </p>
        )}
      </Card>
    );
  }

  // Standard variant
  return (
    <Card className="border-2 border-danger bg-danger-bg/40">
      <p className="flex items-center gap-2 font-bold text-danger" id="sos-title-std">
        <ShieldAlert className="h-5 w-5" aria-hidden="true" />
        <span>Emergency SOS</span>
      </p>
      <p className="text-xs text-ink-muted mt-1">
        Tap 5 times fast to trigger emergency SOS and immediately call your caregiver.
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
        className={`mt-3 w-full flex items-center justify-center gap-2 rounded-2xl py-4 text-base font-extrabold text-white active:scale-[0.99] transition-transform ${
          count !== null ? "bg-danger animate-pulse" : "bg-danger hover:brightness-105 shadow-elev-1"
        }`}
        style={{ minHeight: 52 }}
      >
        <ShieldAlert className="h-5 w-5" aria-hidden="true" />
        <span>
          {count !== null
            ? `CALLING IN ${count}…`
            : taps > 0
            ? `Keep tapping! (${taps}/5)`
            : "TAP 5× FOR SOS"}
        </span>
      </button>
      {count !== null && (
        <Btn kind="ghost" onClick={cancel} label="Cancel emergency SOS alert" className="mt-2">
          Cancel SOS
        </Btn>
      )}
      {msg && (
        <p
          role="status"
          aria-live="assertive"
          className="mt-2 rounded-xl bg-surface p-2 text-xs font-semibold text-ink border border-border"
        >
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
  const profile = useAdaptiveProfile();
  const isElderMode = getVariant(profile) === "elder";
  const [caregiverPhone, setCaregiverPhone] = useState(() => {
    return localStorage.getItem("@sathi_caregiver_phone") || "+91 98765 43210";
  });
  const [isEditingPhone, setIsEditingPhone] = useState(false);

  const saveCaregiverPhone = (newPhone: string) => {
    setCaregiverPhone(newPhone);
    localStorage.setItem("@sathi_caregiver_phone", newPhone);
  };

  const smsBody = encodeURIComponent("EMERGENCY SOS: I need immediate help. Please call me back right now.");
  const btnBase = isElderMode
    ? "flex items-center justify-center gap-2 rounded-2xl p-4 text-center text-base font-extrabold transition active:scale-[0.99] shadow-elev-1"
    : "flex items-center justify-center gap-2 rounded-2xl p-3 text-center text-sm font-extrabold transition active:scale-[0.99] shadow-elev-1";

  return (
    <div className="grid gap-3">
      {/* Caregiver Emergency Phone Setup Card */}
      <Card className="border border-primary/30 bg-primary-soft/30">
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
            <Phone className="h-4 w-4" />
            <span>Caregiver Emergency Number</span>
          </p>
          <button
            type="button"
            onClick={() => setIsEditingPhone((v) => !v)}
            className="text-xs font-semibold text-primary underline"
          >
            {isEditingPhone ? "Done" : "Change Number"}
          </button>
        </div>

        {isEditingPhone ? (
          <div className="flex items-center gap-2">
            <input
              type="tel"
              value={caregiverPhone}
              onChange={(e) => saveCaregiverPhone(e.target.value)}
              placeholder="e.g. +91 98765 43210"
              className="flex-1 min-h-[44px] rounded-xl border border-border bg-surface px-3 py-1.5 text-sm font-bold text-ink"
            />
            <button
              type="button"
              onClick={() => setIsEditingPhone(false)}
              className="min-h-[44px] rounded-xl bg-primary px-4 text-xs font-bold text-white shadow-elev-1"
            >
              Save
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-sm font-extrabold text-ink">{caregiverPhone}</p>
            <p className="text-xs text-ink-muted">Dials automatically when SOS is pressed</p>
          </div>
        )}
      </Card>

      {/* Emergency Dialer Actions */}
      <Card>
        <p className={`flex items-center gap-2 mb-3 font-bold text-ink ${isElderMode ? "text-lg" : "text-base"}`}>
          <Phone className="h-5 w-5 text-primary" aria-hidden="true" />
          <span>Direct Emergency Dialers</span>
        </p>
        <div className={`grid gap-2.5 ${isElderMode ? "grid-cols-1" : "grid-cols-2"}`}>
          {/* Primary Caregiver Call Button */}
          <a
            href={`tel:${caregiverPhone.replace(/\s+/g, "")}`}
            aria-label={`Call Caregiver now at ${caregiverPhone}`}
            className={`${btnBase} bg-danger text-white hover:brightness-105`}
            style={{ minHeight: isElderMode ? 56 : 48 }}
          >
            <PhoneCall className="h-5 w-5" aria-hidden="true" />
            <span>Call Caregiver ({caregiverPhone})</span>
          </a>

          {/* Doctor Call Button */}
          <a
            href="tel:+919820012345"
            aria-label="Call Doctor Dr. Rajesh Sharma"
            className={`${btnBase} bg-primary text-white hover:brightness-105`}
            style={{ minHeight: isElderMode ? 56 : 48 }}
          >
            <Phone className="h-5 w-5" aria-hidden="true" />
            <span>Call Doctor (Dr. Sharma)</span>
          </a>

          {/* Emergency 112 */}
          <a
            href="tel:112"
            aria-label="Call emergency services at 112"
            className={`${btnBase} border border-danger/30 bg-danger-bg text-danger hover:bg-danger/20`}
            style={{ minHeight: isElderMode ? 56 : 44 }}
          >
            <PhoneCall className="h-5 w-5" aria-hidden="true" />
            <span>Call 112 (Emergency)</span>
          </a>

          {/* Ambulance 108 */}
          <a
            href="tel:108"
            aria-label="Call ambulance at 108"
            className={`${btnBase} border border-border bg-surface text-ink hover:bg-surface-sunken`}
            style={{ minHeight: isElderMode ? 56 : 44 }}
          >
            <Activity className="h-5 w-5 text-primary" aria-hidden="true" />
            <span>Ambulance (108)</span>
          </a>

          {/* SMS Alert */}
          <a
            href={`sms:${caregiverPhone.replace(/\s+/g, "")}?body=${smsBody}`}
            aria-label="Share emergency SOS SMS"
            className={`${btnBase} col-span-full border border-border bg-surface text-ink hover:bg-surface-sunken`}
            style={{ minHeight: isElderMode ? 56 : 44 }}
          >
            <MessageSquare className="h-5 w-5 text-primary" aria-hidden="true" />
            <span>Send SOS SMS to Caregiver</span>
          </a>
        </div>
      </Card>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   CPR Coach — 110 BPM metronome + compression counter
   ────────────────────────────────────────────────────────────────── */
const CPR_GUIDE: Record<string, { rate: string; depth: string; notes: string }> = {
  Adult: {
    rate: "110 compressions/min",
    depth: "5–6 cm, center of chest",
    notes: "Push hard and fast. Let the chest fully recoil. Call 112 first, on speaker.",
  },
  Child: {
    rate: "110 compressions/min",
    depth: "~5 cm, one hand",
    notes: "One hand for small children. 30 compressions : 2 breaths if trained.",
  },
  Infant: {
    rate: "110 compressions/min",
    depth: "~4 cm, two fingers",
    notes: "Two fingers center of chest, just below nipple line. Be gentle but firm.",
  },
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
      audio.current ||= new (
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      )();
      const ctx = audio.current;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.frequency.value = 880;
      g.gain.value = 0.15;
      o.start();
      o.stop(ctx.currentTime + 0.08);
    } catch {
      /* silent fallback */
    }
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

  useEffect(() => () => {
    if (timer.current) window.clearInterval(timer.current);
  }, []);
  const g = CPR_GUIDE[who];

  return (
    <Card className="border border-warning/30 bg-surface">
      <p className={`flex items-center gap-2 font-bold text-ink ${isElderMode ? "text-lg" : "text-base"}`}>
        <HeartPulse className="h-5 w-5 text-danger" aria-hidden="true" />
        <span>CPR & choking coach</span>
      </p>
      <p className={`text-ink-muted mt-1 ${isElderMode ? "text-sm" : "text-[11px]"}`}>
        Guidance only — call 112 first. For choking: 5 back blows, then 5 abdominal thrusts, repeat.
      </p>
      <div className="mt-3 flex gap-2" role="radiogroup" aria-label="Select patient age group">
        {(Object.keys(CPR_GUIDE) as ("Adult" | "Child" | "Infant")[]).map((k) => (
          <button
            key={k}
            onClick={() => setWho(k)}
            role="radio"
            aria-checked={who === k}
            className={`flex-1 rounded-full py-2 text-xs font-bold transition-colors min-h-[44px] ${
              who === k
                ? "bg-primary text-white"
                : "bg-surface-sunken text-ink hover:bg-muted"
            }`}
          >
            {k}
          </button>
        ))}
      </div>
      <div className={`mt-3 rounded-2xl bg-surface-sunken p-3 text-ink ${isElderMode ? "text-base" : "text-sm"}`}>
        <p><b>Rate:</b> {g.rate}</p>
        <p><b>Depth:</b> {g.depth}</p>
        <p className="mt-1">{g.notes}</p>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Btn
          onClick={toggle}
          kind={running ? "danger" : "primary"}
          label={running ? "Stop CPR metronome" : "Start CPR metronome at 110 beats per minute"}
        >
          {running ? "Stop metronome" : "Start 110 BPM metronome"}
        </Btn>
        <p
          className={`font-extrabold text-ink ${isElderMode ? "text-base" : "text-sm"}`}
          aria-live="polite"
          aria-atomic="true"
        >
          {beats > 0 ? `Compressions: ${beats}` : ""}
        </p>
      </div>
      {running && !reducedMotion && (
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-sunken">
          <div className="h-full bg-warning animate-pulse" style={{ width: "100%" }} />
        </div>
      )}
      {running && reducedMotion && (
        <p className="mt-2 text-xs font-bold text-warning flex items-center gap-1.5" aria-live="polite">
          <Clock className="h-4 w-4" aria-hidden="true" />
          <span>Metronome active — follow the beeps</span>
        </p>
      )}
      <a
        href="tel:112"
        aria-label="Call emergency services at 112 now"
        className={`mt-3 block rounded-2xl bg-danger text-center font-extrabold text-white hover:brightness-105 transition ${
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
    if (pid)
      api
        .emergencyCard(pid)
        .then(setCard)
        .catch(() => {});
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
    <Card className="border border-success/30 bg-surface">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className={`flex items-center gap-2 font-bold text-ink ${isElderMode ? "text-lg" : "text-base"}`}>
            <FileText className="h-5 w-5 text-primary" aria-hidden="true" />
            <span>Medical card — {card.name}</span>
          </p>
          <p className={`text-ink-muted mt-1 ${isElderMode ? "text-base" : "text-xs"}`}>
            {card.age}y · {card.condition || "post-discharge recovery"} · speaks {card.language}
          </p>
          <p className={`mt-2 text-ink ${isElderMode ? "text-base" : "text-sm"}`}>
            Contact: <b>{card.emergency_contact || "—"}</b>
          </p>
          <div className="mt-2 space-y-1">
            {card.medications.map((m, i) => (
              <p key={i} className={`text-ink ${isElderMode ? "text-base" : "text-sm"}`}>
                • {m.name} — {m.dose} at {m.time}
              </p>
            ))}
          </div>
          {card.next_followup && (
            <p className={`mt-2 text-ink-muted ${isElderMode ? "text-sm" : "text-xs"}`}>
              Next appointment: {card.next_followup}
            </p>
          )}
        </div>
        <div className="shrink-0 p-2 bg-white rounded-xl shadow-sm">
          <QRCodeSVG
            value={qrText}
            size={isElderMode ? 120 : 100}
            aria-label="QR code with emergency medical information"
          />
        </div>
      </div>
      <p className={`mt-3 text-ink-muted ${isElderMode ? "text-sm" : "text-[11px]"}`}>{card.note}</p>
      <Btn
        kind="ghost"
        onClick={() => window.print()}
        label="Print emergency medical card for first responders"
        className="mt-3 flex items-center gap-2"
      >
        <Printer className="h-4 w-4" aria-hidden="true" />
        <span>Print card for first responders</span>
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
    <div className="grid gap-4">
      <Page
        title="Emergency SOS"
        sub={isElderMode ? "Get help quickly" : "Alert care team · call for help · first-aid coach"}
      />
      {sent !== null && (
        <div role="alert" aria-live="assertive">
          <Card className="border-2 border-danger bg-danger-bg">
            <p className={`font-bold text-danger ${isElderMode ? "text-base" : "text-sm"}`}>
              SOS logged in your recovery timeline ({sent} notified). If this is life-threatening, call 112 now.
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
