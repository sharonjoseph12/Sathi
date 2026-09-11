/**
 * screens/care.tsx — Dev 3
 * Rebuilt caregiver & family screens with alert-fatigue fix and zero emojis.
 */
import { useEffect, useRef, useState } from "react";
import { api, type Event } from "../lib/api";
import { go } from "../lib/store";
import {
  Badge,
  Btn,
  Card,
  Empty,
  Input,
  Area,
  Page,
  Ring,
} from "../components/ui";
import {
  Heart,
  Check,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type CgPatient = {
  id: number;
  name: string;
  condition: string;
  rel: string;
  adherence: number;
  risk: string;
  recent: string[];
};

// ─── Alert reason helpers ─────────────────────────────────────────────────────

function alertReason(p: CgPatient): string {
  if (p.risk === "ESCALATE" && p.recent[0])
    return `ESCALATE — most recent symptom: "${p.recent[0]}"`;
  if (p.risk === "ESCALATE") return "ESCALATE — safety rule triggered";
  if (p.risk === "MONITOR" && p.recent[0])
    return `MONITOR — needs watching: "${p.recent[0]}"`;
  if (p.adherence < 50) return `Adherence is ${p.adherence}% — medicines may be missed`;
  return "Flagged for your attention";
}

function needsAttention(p: CgPatient): boolean {
  return p.risk === "ESCALATE" || p.risk === "MONITOR" || p.adherence < 50;
}

// ─── Attention card (single patient needing action) ───────────────────────────

function AttentionCard({
  p,
  onDismiss,
  onOpen,
  onNudge,
}: {
  p: CgPatient;
  onDismiss: (id: number) => void;
  onOpen: (id: number) => void;
  onNudge: (id: number) => void;
}) {
  const [showWhy, setShowWhy] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [nudgeSent, setNudgeSent] = useState(false);
  const whyRef = useRef<HTMLDivElement>(null);

  if (dismissed) return null;

  return (
    <Card
      className={`border-2 ${
        p.risk === "ESCALATE"
          ? "border-danger bg-danger-bg/50"
          : "border-warning bg-warning-bg/50"
      }`}
    >
      <div className="flex items-start gap-3">
        <Ring pct={p.adherence} size={56} />
        <div className="min-w-0 flex-1">
          <p className="font-bold leading-tight text-ink">{p.name}</p>
          <p className="text-xs text-ink-muted">
            {p.condition} · {p.rel}
          </p>
          {p.recent[0] && (
            <p className="mt-1 text-xs text-ink font-medium">Latest: {p.recent[0]}</p>
          )}
        </div>
        <Badge level={p.risk} />
      </div>

      {/* Action row */}
      <div className="mt-3 flex flex-wrap gap-2">
        <Btn onClick={() => onOpen(p.id)} label={`Open ${p.name}'s detail`}>
          View details
        </Btn>
        <Btn
          kind="ghost"
          label={`Send encouragement to ${p.name}`}
          onClick={async () => {
            await onNudge(p.id);
            setNudgeSent(true);
            setTimeout(() => setNudgeSent(false), 3000);
          }}
          className="flex items-center gap-1.5"
        >
          {nudgeSent ? (
            <>
              <Check className="h-4 w-4 text-success" aria-hidden="true" />
              <span>Sent</span>
            </>
          ) : (
            <>
              <Heart className="h-4 w-4 text-primary" aria-hidden="true" />
              <span>Nudge</span>
            </>
          )}
        </Btn>
      </div>

      {/* Why + dismiss row */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          aria-expanded={showWhy}
          aria-controls={`why-${p.id}`}
          onClick={() => {
            setShowWhy((v) => !v);
            setTimeout(() => whyRef.current?.focus(), 50);
          }}
          className="flex items-center gap-1 min-h-[44px] rounded-xl px-3 py-2 text-xs font-bold text-primary underline-offset-2 hover:underline"
        >
          <span>{showWhy ? "Hide reason" : "Why am I seeing this?"}</span>
          {showWhy ? (
            <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </button>
        <button
          onClick={() => {
            onDismiss(p.id);
            setDismissed(true);
          }}
          className="min-h-[44px] rounded-xl px-3 py-2 text-xs font-bold text-ink-muted hover:text-ink"
          aria-label={`Mark ${p.name}'s alert as not urgent`}
        >
          Mark as not urgent
        </button>
      </div>

      {showWhy && (
        <div
          id={`why-${p.id}`}
          ref={whyRef}
          tabIndex={-1}
          role="region"
          aria-label={`Reason for alert on ${p.name}`}
          className="mt-2 rounded-xl bg-surface px-3 py-2 text-xs text-ink-muted border border-border outline-none"
        >
          <span className="font-semibold text-ink">Rule triggered: </span>
          {alertReason(p)}
          <p className="mt-1">
            No diagnosis made. This alert is generated by a safety rule, not clinical judgement.
          </p>
        </div>
      )}
    </Card>
  );
}

// ─── CareDash ─────────────────────────────────────────────────────────────────

export function CareDash() {
  const [list, setList] = useState<CgPatient[]>([]);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");

  const load = () =>
    api
      .cgPatients()
      .then(setList)
      .catch(() =>
        setMsg("Could not load — are you logged in as caregiver/family?")
      );

  useEffect(() => {
    load();
  }, []);

  const connect = async () => {
    try {
      const r = (await api.connect(code)) as { patient_name: string };
      setMsg(`Linked to ${r.patient_name}`);
      setCode("");
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Invalid code");
    }
  };

  const dismiss = async (id: number) => {
    try {
      await api.nudge(id, "__dismiss_alert__");
    } catch {
      /* non-blocking */
    }
    setDismissed((prev) => new Set([...prev, id]));
  };

  const nudge = async (id: number) => {
    await api.nudge(id, "Thinking of you — keep going!");
  };

  const attention = list.filter((p) => needsAttention(p) && !dismissed.has(p.id));
  const allGood = list.filter((p) => !needsAttention(p) || dismissed.has(p.id));
  const alertCount = attention.length;

  return (
    <div className="grid gap-4">
      <Page title="Care dashboard" sub="Focused on what needs your attention" />

      {/* Link code */}
      <Card>
        <div className="flex gap-2">
          <Input
            placeholder="Link code (e.g. DB-XXXXXX)"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            aria-label="Patient link code"
          />
          <Btn onClick={connect} label="Link to patient with this code">
            Link
          </Btn>
        </div>
        {msg && <p className="mt-1 text-xs text-ink-muted">{msg}</p>}
      </Card>

      {/* Attention-needed section */}
      <section aria-label="Patients needing attention">
        <div aria-live="polite" aria-atomic="true" className="mb-3 flex items-center gap-2">
          {alertCount > 0 ? (
            <>
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-danger text-xs font-bold text-white">
                {alertCount}
              </span>
              <h2 className="text-base font-bold text-danger">
                {alertCount === 1
                  ? "1 patient needs attention now"
                  : `${alertCount} patients need attention now`}
              </h2>
            </>
          ) : (
            <h2 className="text-base font-bold text-ink-muted">Needs attention now</h2>
          )}
        </div>

        {alertCount === 0 && list.length > 0 && (
          <div className="rounded-2xl border border-dashed border-success/40 bg-success-bg p-4 text-center">
            <CheckCircle2 className="h-8 w-8 text-success mx-auto" aria-hidden="true" />
            <p className="mt-2 text-sm font-semibold text-success">
              All patients are doing well
            </p>
            <p className="mt-0.5 text-xs text-ink-muted">No alerts at this time</p>
          </div>
        )}

        {attention.map((p) => (
          <div key={p.id} className="mb-3">
            <AttentionCard
              p={p}
              onDismiss={dismiss}
              onOpen={(id) => go(`#/care/${id}`)}
              onNudge={nudge}
            />
          </div>
        ))}
      </section>

      {/* All-good section */}
      {allGood.length > 0 && (
        <section aria-label="Patients with no current alerts">
          <div className="mb-2 flex items-center gap-1.5 text-sm font-bold text-ink-muted">
            <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
            <h2>
              All good ({allGood.length} {allGood.length === 1 ? "patient" : "patients"})
            </h2>
          </div>
          <Card>
            <div className="grid gap-2">
              {allGood.map((p) => (
                <button
                  key={p.id}
                  onClick={() => go(`#/care/${p.id}`)}
                  className="flex min-h-[44px] items-center gap-3 rounded-xl px-2 py-1 text-left hover:bg-surface-sunken active:scale-[0.99] transition"
                  aria-label={`Open ${p.name}'s details — adherence ${p.adherence}%`}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success-bg text-xs font-bold text-success">
                    {p.adherence}%
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{p.name}</p>
                    <p className="truncate text-xs text-ink-muted">{p.condition}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-ink-muted" aria-hidden="true" />
                </button>
              ))}
            </div>
          </Card>
        </section>
      )}

      {list.length === 0 && (
        <Empty text="No linked patients yet — enter a link code above." />
      )}
    </div>
  );
}

// ─── PatientDetail ────────────────────────────────────────────────────────────

export function PatientDetail({ id }: { id: number }) {
  type Detail = {
    timeline: Event[];
    symptoms: { symptoms: string[]; severity: number; risk: string }[];
    doses: { name: string; status: string }[];
    followups: { title: string }[];
  };

  const [d, setD] = useState<Detail | null>(null);
  const [rem, setRem] = useState("");
  const [nmsg, setNmsg] = useState("");
  const [alertDismissed, setAlertDismissed] = useState(false);

  const presets = [
    "Proud of your recovery today!",
    "Time for your medicines",
    "Time for a short walk",
    "Don't forget your follow-up",
  ];

  const sendNudge = async (text: string) => {
    if (!text) return;
    try {
      await api.nudge(id, text);
      setNmsg("Sent");
      setTimeout(() => setNmsg(""), 3000);
    } catch (e) {
      setNmsg(e instanceof Error ? e.message : "failed");
    }
  };

  const dismissAlert = async () => {
    try {
      await api.nudge(id, "__dismiss_alert__");
    } catch {
      /* best-effort */
    }
    setAlertDismissed(true);
  };

  useEffect(() => {
    api
      .cgDetail(id)
      .then(setD)
      .catch(() => {});
  }, [id]);

  if (!d) return <Empty text="Loading…" />;

  const topRisk = d.symptoms[0]?.risk ?? "NORMAL";
  const flagged =
    !alertDismissed && (topRisk === "ESCALATE" || topRisk === "MONITOR");

  return (
    <div className="grid gap-3">
      <Page
        title={`Patient #${id}`}
        right={
          <Btn
            kind="ghost"
            onClick={() => go("#/care")}
            className="flex items-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>All</span>
          </Btn>
        }
      />

      {/* Flagged-alert banner at top of detail */}
      {flagged && (
        <Card
          className={`border-2 ${
            topRisk === "ESCALATE"
              ? "border-danger bg-danger-bg"
              : "border-warning bg-warning-bg"
          }`}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-danger shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1">
              <p className="font-bold text-sm text-ink">
                {topRisk === "ESCALATE"
                  ? "Safety alert — please check in with this patient"
                  : "Monitoring — keep an eye on this patient"}
              </p>
              {d.symptoms[0] && (
                <p className="mt-1 text-xs text-ink-muted">
                  Last symptom: "{d.symptoms[0].symptoms[0]}" · {d.symptoms[0].severity}/10
                </p>
              )}
              <p className="mt-1 text-[11px] text-ink-muted">
                Rule triggered: {topRisk} state from symptom report. No diagnosis made.
              </p>
            </div>
          </div>
          <button
            onClick={dismissAlert}
            className="mt-2 min-h-[44px] rounded-xl px-4 py-2 text-xs font-bold text-ink-muted hover:text-ink"
          >
            Mark as reviewed — not urgent
          </button>
        </Card>
      )}

      {/* Today's doses */}
      <Card>
        <h3 className="mb-2 font-bold text-ink">Today's doses</h3>
        {d.doses.map((x, i) => (
          <p key={i} className="text-sm py-0.5">
            • <span className="font-medium text-ink">{x.name}</span> —{" "}
            <span
              className={
                x.status === "taken"
                  ? "text-success font-semibold"
                  : "text-warning font-semibold"
              }
            >
              {x.status}
            </span>
          </p>
        ))}
        {d.doses.length === 0 && (
          <p className="text-sm text-ink-muted">No medicines scheduled.</p>
        )}
      </Card>

      {/* Recent symptoms */}
      <Card>
        <h3 className="mb-2 font-bold text-ink">Recent symptoms</h3>
        {d.symptoms.map((s, i) => (
          <div key={i} className="mb-1 flex items-center justify-between py-0.5">
            <p className="text-sm text-ink">
              • {s.symptoms[0]}{" "}
              <span className="text-xs text-ink-muted">({s.severity}/10)</span>
            </p>
            <Badge level={s.risk} />
          </div>
        ))}
        {d.symptoms.length === 0 && (
          <p className="text-sm text-ink-muted">None reported.</p>
        )}
      </Card>

      {/* Nudge / reminder */}
      <Card>
        <h3 className="mb-2 font-bold text-ink">Send reminder or nudge</h3>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {presets.map((p) => (
            <button
              key={p}
              onClick={() => sendNudge(p)}
              className="min-h-[44px] rounded-full bg-primary-soft px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 transition"
            >
              {p}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="or write your own…"
            value={rem}
            onChange={(e) => setRem(e.target.value)}
            aria-label="Custom nudge message"
          />
          <Btn
            onClick={async () => {
              await sendNudge(rem);
              setRem("");
            }}
            label="Send nudge"
          >
            Send
          </Btn>
        </div>
        {nmsg && (
          <p className="mt-1 text-xs font-semibold text-success" role="status">
            {nmsg}
          </p>
        )}
        <p className="mt-2 text-[11px] text-ink-muted">
          Max 3 nudges/hour per patient (anti-spam).
        </p>
        <div className="mt-3">
          <Btn
            kind="ghost"
            onClick={() => go(`#/plan/${id}`)}
            label="Create a discharge plan for this patient"
          >
            Create plan
          </Btn>
        </div>
      </Card>

      {/* Timeline */}
      <Card>
        <h3 className="mb-2 font-bold text-ink">Timeline</h3>
        {d.timeline.slice(0, 10).map((e, i) => (
          <p key={i} className="text-sm py-0.5 text-ink">
            • {e.description}{" "}
            <span className="text-xs text-ink-muted">({e.event_type})</span>
          </p>
        ))}
        {d.timeline.length === 0 && (
          <p className="text-sm text-ink-muted">No events yet.</p>
        )}
      </Card>
    </div>
  );
}

// ─── CreatePlan ───────────────────────────────────────────────────────────────

export function CreatePlan({ id }: { id: number }) {
  const [hospital, setHospital] = useState("");
  const [medText, setMedText] = useState(
    '{"medicines": [{"name": "Amoxicillin 500mg", "dose": "1 capsule", "time": "08:00 AM"}]}'
  );
  const [msg, setMsg] = useState("");

  const save = async () => {
    try {
      const r = (await api.addPlan(id, {
        hospital,
        data: medText,
      })) as { version: number };
      setMsg(`Plan v${r.version} saved + medicines imported`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "failed");
    }
  };

  return (
    <div className="grid gap-3">
      <Page
        title="Create discharge plan"
        right={
          <Btn
            kind="ghost"
            onClick={() => go(`#/care/${id}`)}
            className="flex items-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Back</span>
          </Btn>
        }
      />
      <Card>
        <div className="grid gap-2">
          <Input
            placeholder="Hospital"
            value={hospital}
            onChange={(e) => setHospital(e.target.value)}
            aria-label="Hospital name"
          />
          <Area
            rows={6}
            value={medText}
            onChange={(e) => setMedText(e.target.value)}
            aria-label="Discharge plan JSON"
          />
          {msg && <p className="text-xs font-semibold text-success">{msg}</p>}
          <Btn onClick={save} label="Save discharge plan">
            Save plan
          </Btn>
        </div>
      </Card>
    </div>
  );
}

// ─── FamilyDash ───────────────────────────────────────────────────────────────

export function FamilyDash() {
  const [list, setList] = useState<
    { id: number; name: string; adherence: number; risk: string; recent: string[] }[]
  >([]);
  const [nudgeSent, setNudgeSent] = useState<Record<number, boolean>>({});

  useEffect(() => {
    api.cgPatients().then(setList).catch(() => {});
  }, []);

  const sendNudge = async (id: number) => {
    await api.nudge(id, "Proud of your recovery today!");
    setNudgeSent((prev) => ({ ...prev, [id]: true }));
    setTimeout(
      () => setNudgeSent((prev) => ({ ...prev, [id]: false })),
      3000
    );
  };

  const alertCount = list.filter(
    (p) => p.risk === "ESCALATE" || p.risk === "MONITOR"
  ).length;

  return (
    <div className="grid gap-4">
      <Page
        title="Family view"
        sub="Read-only — send encouragement anytime"
      />

      {/* Quiet-day state */}
      {list.length > 0 && alertCount === 0 && (
        <div className="rounded-2xl border border-success/30 bg-success-bg p-6 text-center">
          <CheckCircle2 className="h-10 w-10 text-success mx-auto" aria-hidden="true" />
          <p className="mt-2 text-lg font-bold text-success">
            Everyone is doing well
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            No alerts right now. Send a nudge to encourage them!
          </p>
        </div>
      )}

      {/* Alert indicator */}
      {alertCount > 0 && (
        <div
          role="alert"
          className="rounded-2xl border border-warning/40 bg-warning-bg p-4"
        >
          <p className="flex items-center gap-2 text-sm font-bold text-warning">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <span>
              {alertCount === 1
                ? "1 family member may need extra support today"
                : `${alertCount} family members may need extra support today`}
            </span>
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            A caregiver has been notified. You can send encouragement below.
          </p>
        </div>
      )}

      {/* Patient cards */}
      {list.map((p) => (
        <Card key={p.id}>
          <div className="flex items-center gap-3">
            <Ring pct={p.adherence} size={64} />
            <div className="min-w-0 flex-1">
              <p className="font-bold text-ink">{p.name}</p>
              <p className="text-xs text-ink-muted">
                {p.recent[0] || "No recent symptoms reported"}
              </p>
            </div>
            <Badge level={p.risk} />
          </div>
          <Btn
            kind="ghost"
            className="mt-3 w-full flex items-center justify-center gap-1.5"
            label={`Send encouragement to ${p.name}`}
            onClick={() => sendNudge(p.id)}
          >
            {nudgeSent[p.id] ? (
              <>
                <Check className="h-4 w-4 text-success" aria-hidden="true" />
                <span>Sent!</span>
              </>
            ) : (
              <>
                <Heart className="h-4 w-4 text-primary" aria-hidden="true" />
                <span>Send encouragement</span>
              </>
            )}
          </Btn>
        </Card>
      ))}

      {list.length === 0 && (
        <Empty text="Nothing shared with you yet. Ask a caregiver to add you to the care circle." />
      )}
    </div>
  );
}
