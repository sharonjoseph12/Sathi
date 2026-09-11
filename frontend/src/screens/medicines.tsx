import { useEffect, useState } from "react";
import { api, type Med } from "../lib/api";
import { go, useApp } from "../lib/store";
import { Badge, Btn, Card, Empty, Input, Page, Toggle, Confetti } from "../components/ui";
import { useAdaptiveProfile, isElder } from "../lib/useAdaptiveProfile";
import { toast } from "sonner";
import { speakSmart } from "../lib/voice";
import {
  Check,
  Plus,
  Trash2,
  Clock,
  Sparkles,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  BellRing,
} from "lucide-react";

type DoseStatus = "taken" | "snoozed" | "missed" | "pending";

// ── Elder MedRow: simplified, progressive disclosure ─────────────────
function ElderMedRow({
  m,
  status = "pending",
  onAct,
  onRemove,
}: {
  m: Med;
  status: DoseStatus;
  onAct: (m: Med, s: DoseStatus) => void;
  onRemove: (m: Med) => void;
}) {
  const [showMore, setShowMore] = useState(false);
  const isTaken = status === "taken";

  return (
    <Card className={`border-2 transition-all ${isTaken ? "border-success bg-success-bg/30" : "border-primary/20 bg-surface shadow-sm"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xl font-bold leading-tight text-ink">{m.name}</p>
          <p className="mt-1 flex items-center gap-1.5 text-base text-ink-muted">
            <Clock className="h-4 w-4" aria-hidden="true" />
            {m.time} · {m.dose}
          </p>
          {m.simplified && (
            <div className="mt-2.5 flex items-start gap-2 rounded-xl bg-primary-soft p-3 text-ink">
              <Sparkles className="h-5 w-5 shrink-0 text-primary mt-0.5" aria-hidden="true" />
              <p className="text-base leading-relaxed font-medium">{m.simplified}</p>
            </div>
          )}
        </div>
        {isTaken && (
          <span className="flex items-center gap-1 rounded-full bg-success px-3 py-1 text-xs font-bold text-white shadow-sm">
            <Check className="h-3.5 w-3.5 stroke-[3]" />
            Taken
          </span>
        )}
        {status === "snoozed" && (
          <span className="flex items-center gap-1 rounded-full bg-warning-bg border border-warning/40 px-2.5 py-1 text-xs font-bold text-warning">
            <BellRing className="h-3.5 w-3.5" />
            Snoozed
          </span>
        )}
        {status === "missed" && (
          <span className="flex items-center gap-1 rounded-full bg-danger-bg border border-danger/40 px-2.5 py-1 text-xs font-bold text-danger">
            <AlertCircle className="h-3.5 w-3.5" />
            Missed
          </span>
        )}
      </div>

      {/* Primary action: always visible */}
      <div className="mt-4">
        <Btn
          kind={isTaken ? "ghost" : "success"}
          onClick={() => onAct(m, isTaken ? "pending" : "taken")}
          className="!w-full !min-h-[56px] !text-lg !font-bold flex items-center justify-center gap-2"
        >
          <Check className="h-5 w-5 stroke-[3]" aria-hidden="true" />
          {isTaken ? "Taken today (Tap to undo)" : "Take this medicine"}
        </Btn>
      </div>

      {/* Secondary actions: behind disclosure */}
      <button
        type="button"
        onClick={() => setShowMore((v) => !v)}
        className="mt-3 flex items-center gap-1 min-h-[44px] text-sm font-semibold text-primary hover:underline"
        aria-expanded={showMore}
        aria-label="Show more options for this medicine"
      >
        <span>{showMore ? "Hide options" : "More options"}</span>
        {showMore ? (
          <ChevronUp className="h-4 w-4" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        )}
      </button>

      {showMore && (
        <div className="mt-2 grid gap-2 animate-in fade-in duration-150">
          <Btn
            kind="ghost"
            onClick={() => onAct(m, "snoozed")}
            className="!min-h-[48px] !text-base"
          >
            Remind me in 30 mins
          </Btn>
          <Btn
            kind="ghost"
            onClick={() => onAct(m, "missed")}
            className="!min-h-[48px] !text-base text-warning"
          >
            I missed this dose
          </Btn>
          <button
            className="flex items-center justify-center gap-1.5 min-h-[44px] text-sm text-danger font-semibold hover:underline"
            onClick={() => onRemove(m)}
            aria-label={`Remove ${m.name} from your medicine list`}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Remove medicine
          </button>
        </div>
      )}
    </Card>
  );
}

// ── Standard MedRow: dense layout with jargon toggle ─────────────────
function StandardMedRow({
  m,
  status = "pending",
  onAct,
  onRemove,
}: {
  m: Med;
  status: DoseStatus;
  onAct: (m: Med, s: DoseStatus) => void;
  onRemove: (m: Med) => void;
}) {
  const [plain, setPlain] = useState(true);
  const isTaken = status === "taken";

  return (
    <Card className={`border transition hover:shadow-sm ${isTaken ? "border-success/40 bg-success-bg/10" : "border-border bg-surface"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-bold text-ink text-base">{m.name}</p>
            {isTaken && (
              <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-bold text-success">
                <Check className="h-3 w-3 stroke-[3]" />
                Taken today
              </span>
            )}
            {status === "snoozed" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-bold text-warning">
                <Clock className="h-3 w-3" />
                Snoozed
              </span>
            )}
            {status === "missed" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-danger/15 px-2 py-0.5 text-[11px] font-bold text-danger">
                <AlertCircle className="h-3 w-3" />
                Missed
              </span>
            )}
          </div>
          <p className="text-xs text-ink-muted mt-0.5">{m.time} · {m.dose} · {m.frequency || "Daily"}</p>
          {m.simplified ? (
            <div className="mt-1.5 flex items-start gap-1.5 text-xs text-ink">
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary mt-0.5" aria-hidden="true" />
              <p>{plain ? m.simplified : m.instructions}</p>
            </div>
          ) : m.instructions ? (
            <p className="mt-1 text-xs text-ink-muted">{m.instructions}</p>
          ) : null}
        </div>
        <Badge level="active" />
      </div>

      {m.simplified && (
        <div className="mt-2">
          <Toggle on={plain} onClick={() => setPlain((v) => !v)} label="Simple words" />
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <Btn
          kind={isTaken ? "ghost" : "success"}
          onClick={() => onAct(m, isTaken ? "pending" : "taken")}
          className="flex items-center gap-1 font-semibold"
        >
          <Check className="h-4 w-4" aria-hidden="true" />
          {isTaken ? "Taken (Undo)" : "Take"}
        </Btn>
        <Btn
          kind="ghost"
          onClick={() => onAct(m, "snoozed")}
          className={status === "snoozed" ? "border border-warning text-warning" : ""}
        >
          Snooze
        </Btn>
        <Btn
          kind="ghost"
          onClick={() => onAct(m, "missed")}
          className={status === "missed" ? "border border-danger text-danger" : ""}
        >
          Missed
        </Btn>
        <button
          className="ml-auto flex items-center gap-1 text-xs text-danger min-h-[44px] px-2 font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger rounded-lg"
          onClick={() => onRemove(m)}
          aria-label={`Remove ${m.name}`}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          Remove
        </button>
      </div>
    </Card>
  );
}

// ── Medicines screen ─────────────────────────────────────────────────
export function Medicines() {
  const { pid } = useApp();
  const profile = useAdaptiveProfile();
  const elder = isElder(profile);

  const [meds, setMeds] = useState<Med[]>([]);
  const [doseStatuses, setDoseStatuses] = useState<Record<number, DoseStatus>>({});
  const [burst, setBurst] = useState(0);

  const [form, setForm] = useState({
    name: "",
    dose: "",
    time: "08:00 AM",
    frequency: "Twice daily",
    instructions: "",
    expand: true,
  });
  const [msg, setMsg] = useState("");
  const [showAdd, setShowAdd] = useState(!elder);

  const load = async () => {
    if (!pid) return;
    try {
      const [mList, dList] = await Promise.all([
        api.meds(pid),
        api.dosesToday(pid).catch(() => []),
      ]);
      setMeds(mList);
      const map: Record<number, DoseStatus> = {};
      dList.forEach((d) => {
        map[d.medication_id] = (d.status as DoseStatus) || "pending";
      });
      setDoseStatuses(map);
    } catch {
      /* offline */
    }
  };

  useEffect(() => {
    if (pid) load();
  }, [pid]);

  const handleAct = async (m: Med, s: DoseStatus) => {
    // Optimistic status update
    setDoseStatuses((prev) => ({ ...prev, [m.id]: s }));

    if (s === "taken") {
      setBurst((b) => b + 1);
      toast.success(`${m.name} marked as taken!`);
      void speakSmart(`${m.name} marked as taken. Great job!`);
      try {
        await api.confirm(pid, m.id);
      } catch {
        /* offline */
      }
    } else if (s === "snoozed") {
      toast.info(`${m.name} snoozed for 30 minutes.`);
      try {
        await api.logDose(pid, m.id, { status: "snoozed" });
      } catch {
        /* offline */
      }
    } else if (s === "missed") {
      toast.warning(`${m.name} recorded as missed. Caregiver notified.`);
      try {
        await api.logDose(pid, m.id, { status: "missed" });
      } catch {
        /* offline */
      }
    } else if (s === "pending") {
      toast.info(`${m.name} reset to pending.`);
      try {
        await api.logDose(pid, m.id, { status: "pending" });
      } catch {
        /* offline */
      }
    }
  };

  const handleRemove = async (m: Med) => {
    setMeds((prev) => prev.filter((x) => x.id !== m.id));
    toast.success(`${m.name} removed from medications.`);
    try {
      await api.delMed(pid, m.id);
    } catch {
      /* offline */
    }
  };

  const add = async () => {
    if (!form.name.trim()) {
      toast.error("Please enter a medicine name.");
      return;
    }
    try {
      const r = await api.addMed(pid, form);
      const newMed: Med = {
        id: r.id || Date.now(),
        name: form.name,
        dose: form.dose || "1 dose",
        time: form.time,
        frequency: form.frequency,
        instructions: form.instructions,
        simplified: r.simplified || form.instructions,
      };
      setMeds((prev) => [newMed, ...prev]);
      toast.success(`${form.name} added to medicines!`);
      setMsg(
        r.expanded
          ? `Auto-mapped to ${r.expanded.map(([, t]) => t).join(" · ")}`
          : r.simplified
          ? r.simplified
          : "Saved"
      );
      setForm({
        name: "",
        dose: "",
        time: "08:00 AM",
        frequency: "Twice daily",
        instructions: "",
        expand: true,
      });
      load();
    } catch (e) {
      const em = e instanceof Error ? e.message : "failed to add medicine";
      setMsg(em);
      toast.error(em);
    }
  };

  const frequencies = [
    "Once daily",
    "Twice daily",
    "Three times daily",
    "Four times daily",
  ];
  const freqLabel = (f: string) =>
    f
      .replace(" daily", "×")
      .replace("Once×", "1×")
      .replace("Twice×", "2×")
      .replace("Three times×", "3×")
      .replace("Four times×", "4×");

  return (
    <div className="grid gap-3">
      <Confetti fire={burst} />
      <Page
        title="Medicines"
        sub={elder ? "Your current medicines" : "Take · snooze · track"}
        right={
          <Btn
            kind="ghost"
            onClick={() => go("#/drug")}
            aria-label="Check drug interactions"
            className="flex items-center gap-1.5"
          >
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            <span>Check interactions</span>
          </Btn>
        }
      />

      <div role="list" aria-label="Medicines list" className="grid gap-3">
        {meds.map((m) =>
          elder ? (
            <ElderMedRow
              key={m.id}
              m={m}
              status={doseStatuses[m.id] || "pending"}
              onAct={handleAct}
              onRemove={handleRemove}
            />
          ) : (
            <StandardMedRow
              key={m.id}
              m={m}
              status={doseStatuses[m.id] || "pending"}
              onAct={handleAct}
              onRemove={handleRemove}
            />
          )
        )}
      </div>

      {meds.length === 0 && (
        <Empty text={elder ? "No medicines added yet." : "No active medicines."} />
      )}

      {/* Add medicine — elder: behind disclosure toggle */}
      {elder && !showAdd && (
        <Btn
          kind="ghost"
          onClick={() => setShowAdd(true)}
          className="!min-h-[56px] !text-base !w-full flex items-center justify-center gap-2"
        >
          <Plus className="h-5 w-5" aria-hidden="true" />
          Add a new medicine
        </Btn>
      )}

      {showAdd && (
        <Card>
          <h2 className={`mb-3 font-bold text-ink ${elder ? "text-lg" : "text-base"}`}>
            {elder ? "Add a new medicine" : "Add medicine"}
          </h2>
          <div className="grid gap-3">
            <label className={`grid gap-1.5 font-semibold ${elder ? "text-sm text-ink" : "text-xs text-ink-muted"}`}>
              Medicine name
              <Input
                placeholder={elder ? "Type the medicine name" : "Name (e.g. Amoxicillin 500mg)"}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={elder ? "!min-h-[56px] !text-lg" : ""}
                aria-required="true"
              />
            </label>
            <div className="flex gap-2">
              <label className={`grid flex-1 gap-1.5 font-semibold ${elder ? "text-sm text-ink" : "text-xs text-ink-muted"}`}>
                Dose
                <Input
                  placeholder="Dose"
                  value={form.dose}
                  onChange={(e) => setForm({ ...form, dose: e.target.value })}
                  className={elder ? "!min-h-[56px] !text-lg" : ""}
                />
              </label>
              <label className={`grid flex-1 gap-1.5 font-semibold ${elder ? "text-sm text-ink" : "text-xs text-ink-muted"}`}>
                Time
                <Input
                  placeholder="Time"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                  className={elder ? "!min-h-[56px] !text-lg" : ""}
                />
              </label>
            </div>

            {/* Frequency: elder gets stacked buttons, standard gets pills */}
            <fieldset className="grid gap-1.5">
              <legend className={`font-semibold ${elder ? "text-sm text-ink mb-1" : "text-xs text-ink-muted"}`}>
                How often
              </legend>
              {elder ? (
                <div className="grid gap-2">
                  {frequencies.map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setForm({ ...form, frequency: f })}
                      aria-pressed={form.frequency === f}
                      className={`min-h-[48px] rounded-xl px-4 text-left text-base font-bold transition ${
                        form.frequency === f
                          ? "bg-primary text-white"
                          : "border border-border bg-surface text-ink hover:bg-surface-sunken"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex gap-2">
                  {frequencies.map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setForm({ ...form, frequency: f })}
                      aria-pressed={form.frequency === f}
                      className={`flex-1 rounded-full py-2 text-[11px] font-bold min-h-[44px] transition ${
                        form.frequency === f
                          ? "bg-primary text-white"
                          : "bg-primary-soft text-primary hover:bg-primary/20"
                      }`}
                    >
                      {freqLabel(f)}
                    </button>
                  ))}
                </div>
              )}
            </fieldset>

            {!elder && (
              <Input
                placeholder="Instructions (e.g. 1 tab PO BD PC)"
                value={form.instructions}
                onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                aria-label="Prescription instructions"
              />
            )}
            <Toggle
              on={form.expand}
              onClick={() => setForm({ ...form, expand: !form.expand })}
              label={elder ? "Set times based on my meals" : "Auto-map to my meal times"}
            />
            {msg && (
              <p className={`font-semibold text-success ${elder ? "text-base" : "text-xs"}`} role="status">
                {msg}
              </p>
            )}
            <Btn
              onClick={add}
              className={`flex items-center justify-center gap-1.5 ${elder ? "!min-h-[56px] !text-lg" : ""}`}
            >
              <Plus className="h-5 w-5" aria-hidden="true" />
              {elder ? "Add this medicine" : "Add"}
            </Btn>
            {elder && (
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="min-h-[44px] text-sm font-semibold text-ink-muted hover:text-ink"
              >
                Cancel
              </button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
