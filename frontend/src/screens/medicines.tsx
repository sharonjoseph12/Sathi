import { useEffect, useState } from "react";
import { api, type Med } from "../lib/api";
import { go, useApp } from "../lib/store";
import { Badge, Btn, Card, Empty, Input, Page, Toggle } from "../components/ui";
import { useAdaptiveProfile, isElder } from "../lib/useAdaptiveProfile";
import {
  Check,
  Plus,
  Trash2,
  Clock,
  Sparkles,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ── Elder MedRow: simplified, progressive disclosure ─────────────────
function ElderMedRow({ m, pid, onDone }: { m: Med; pid: number; onDone: () => void }) {
  const [showMore, setShowMore] = useState(false);
  const [msg, setMsg] = useState("");

  const act = async (status: string) => {
    try {
      await api.logDose(pid, m.id, { status });
      onDone();
    } catch {
      setMsg("Saved — will sync when online");
    }
  };

  return (
    <Card className="border-2 border-primary/20 bg-surface shadow-sm">
      <div>
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

      {/* Primary action: always visible */}
      <div className="mt-4">
        <Btn
          kind="success"
          onClick={() => act("taken")}
          className="!w-full !min-h-[56px] !text-lg !font-bold flex items-center justify-center gap-2"
        >
          <Check className="h-5 w-5 stroke-[3]" aria-hidden="true" />
          Take this medicine
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
        <div className="mt-2 grid gap-2">
          <Btn
            kind="ghost"
            onClick={() => act("snoozed")}
            className="!min-h-[48px] !text-base"
          >
            Remind me later
          </Btn>
          <Btn
            kind="ghost"
            onClick={() => act("missed")}
            className="!min-h-[48px] !text-base"
          >
            I missed this one
          </Btn>
          <button
            className="flex items-center justify-center gap-1.5 min-h-[44px] text-sm text-danger font-semibold hover:underline"
            onClick={async () => {
              await api.delMed(pid, m.id);
              onDone();
            }}
            aria-label={`Remove ${m.name} from your medicine list`}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Remove medicine
          </button>
        </div>
      )}
      {msg && <p className="mt-2 text-sm text-ink-muted">{msg}</p>}
    </Card>
  );
}

// ── Standard MedRow: dense layout with jargon toggle ─────────────────
function StandardMedRow({ m, pid, onDone }: { m: Med; pid: number; onDone: () => void }) {
  const [plain, setPlain] = useState(true);
  const [msg, setMsg] = useState("");

  const act = async (status: string) => {
    try {
      await api.logDose(pid, m.id, { status });
      onDone();
    } catch {
      setMsg("Saved offline — will sync");
    }
  };

  return (
    <Card className="border border-border bg-surface transition hover:shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-bold text-ink">{m.name}</p>
          <p className="text-xs text-ink-muted">{m.time} · {m.dose} · {m.frequency}</p>
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

      <div className="mt-3 flex items-center gap-2">
        <Btn kind="success" onClick={() => act("taken")} className="flex items-center gap-1">
          <Check className="h-4 w-4" aria-hidden="true" />
          Take
        </Btn>
        <Btn kind="ghost" onClick={() => act("snoozed")}>
          Snooze
        </Btn>
        <Btn kind="ghost" onClick={() => act("missed")}>
          Missed
        </Btn>
        <button
          className="ml-auto flex items-center gap-1 text-xs text-danger min-h-[44px] px-2 font-medium hover:underline"
          onClick={async () => {
            await api.delMed(pid, m.id);
            onDone();
          }}
          aria-label={`Remove ${m.name}`}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          Remove
        </button>
      </div>
      {msg && <p className="mt-1 text-xs text-ink-muted">{msg}</p>}
    </Card>
  );
}

// ── Medicines screen ─────────────────────────────────────────────────
export function Medicines() {
  const { pid } = useApp();
  const profile = useAdaptiveProfile();
  const elder = isElder(profile);

  const [meds, setMeds] = useState<Med[]>([]);
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

  const load = () =>
    api
      .meds(pid)
      .then(setMeds)
      .catch(() => {});

  useEffect(() => {
    if (pid) load();
  }, [pid]);

  const add = async () => {
    if (!form.name) return;
    try {
      const r = await api.addMed(pid, form);
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
      setMsg(e instanceof Error ? e.message : "failed");
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
      <Page
        title="Medicines"
        sub={elder ? "Your current medicines" : "Take · snooze · add"}
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
            <ElderMedRow key={m.id} m={m} pid={pid} onDone={load} />
          ) : (
            <StandardMedRow key={m.id} m={m} pid={pid} onDone={load} />
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
