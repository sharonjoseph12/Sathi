import { useEffect, useState } from "react";
import { api, type Med } from "../lib/api";
import { go, useApp } from "../lib/store";
import { Badge, Btn, Card, Empty, Input, Page, Toggle } from "../components/ui";
import { useAdaptiveProfile, isElder } from "../lib/useAdaptiveProfile";

// ── Elder MedRow: simplified, progressive disclosure ─────────────────
function ElderMedRow({ m, pid, onDone }: { m: Med; pid: number; onDone: () => void }) {
  const [showMore, setShowMore] = useState(false);
  const [msg, setMsg] = useState("");

  const act = async (status: string) => {
    try { await api.logDose(pid, m.id, { status }); onDone(); } catch { setMsg("Saved — will sync when online"); }
  };

  return (
    <Card accent="#7C3AED">
      <div>
        <p className="text-xl font-bold leading-tight">{m.name}</p>
        <p className="mt-1 text-base text-muted-fg">{m.time} · {m.dose}</p>
        {m.simplified && (
          <p className="mt-2 text-base leading-relaxed">💡 {m.simplified}</p>
        )}
      </div>

      {/* Primary action: always visible */}
      <div className="mt-3">
        <Btn kind="success" onClick={() => act("taken")} className="!w-full !min-h-[56px] !text-lg !font-bold">
          ✓ Take this medicine
        </Btn>
      </div>

      {/* Secondary actions: behind disclosure */}
      <button
        type="button"
        onClick={() => setShowMore((v) => !v)}
        className="mt-2 min-h-[44px] text-sm font-semibold text-primary"
        aria-expanded={showMore}
        aria-label="Show more options for this medicine"
      >
        {showMore ? "Hide options" : "More options"}
      </button>

      {showMore && (
        <div className="mt-2 grid gap-2">
          <Btn kind="ghost" onClick={() => act("snoozed")} className="!min-h-[48px] !text-base">
            Remind me later
          </Btn>
          <Btn kind="ghost" onClick={() => act("missed")} className="!min-h-[48px] !text-base">
            I missed this one
          </Btn>
          <button
            className="min-h-[44px] text-sm text-red-600 font-semibold"
            onClick={async () => { await api.delMed(pid, m.id); onDone(); }}
            aria-label={`Remove ${m.name} from your medicine list`}
          >
            Remove medicine
          </button>
        </div>
      )}
      {msg && <p className="mt-1 text-sm text-muted-fg">{msg}</p>}
    </Card>
  );
}

// ── Standard MedRow: current dense layout with jargon toggle ─────────
function StandardMedRow({ m, pid, onDone }: { m: Med; pid: number; onDone: () => void }) {
  const [plain, setPlain] = useState(true);
  const [msg, setMsg] = useState("");

  const act = async (status: string) => {
    try { await api.logDose(pid, m.id, { status }); onDone(); } catch { setMsg("saved offline — will sync"); }
  };

  return (
    <Card accent="#7C3AED">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold">{m.name}</p>
          <p className="text-xs text-muted-fg">{m.time} · {m.dose} · {m.frequency}</p>
          {m.simplified
            ? <p className="mt-1 text-xs">{plain ? `💡 ${m.simplified}` : m.instructions}</p>
            : m.instructions ? <p className="mt-1 text-xs text-muted-fg">{m.instructions}</p> : null}
        </div>
        <Badge level="active" />
      </div>
      {m.simplified && (
        <div className="mt-1">
          <Toggle on={plain} onClick={() => setPlain((v) => !v)} label="Simple words" />
        </div>
      )}
      <div className="mt-2 flex gap-2">
        <Btn kind="success" onClick={() => act("taken")}>Take</Btn>
        <Btn kind="ghost" onClick={() => act("snoozed")}>Snooze</Btn>
        <Btn kind="ghost" onClick={() => act("missed")}>Missed</Btn>
        <button
          className="text-xs text-red-500 min-h-[44px]"
          onClick={async () => { await api.delMed(pid, m.id); onDone(); }}
          aria-label={`Remove ${m.name}`}
        >
          remove
        </button>
      </div>
      {msg && <p className="mt-1 text-xs">{msg}</p>}
    </Card>
  );
}

// ── Medicines screen ─────────────────────────────────────────────────
export function Medicines() {
  const { pid } = useApp();
  const profile = useAdaptiveProfile();
  const elder = isElder(profile);

  const [meds, setMeds] = useState<Med[]>([]);
  const [form, setForm] = useState({ name: "", dose: "", time: "08:00 AM", frequency: "Twice daily", instructions: "", expand: true });
  const [msg, setMsg] = useState("");
  const [showAdd, setShowAdd] = useState(!elder); // elder: hide form by default

  const load = () => api.meds(pid).then(setMeds).catch(() => {});
  useEffect(() => { if (pid) load(); }, [pid]);

  const add = async () => {
    if (!form.name) return;
    try {
      const r = await api.addMed(pid, form);
      setMsg(
        r.expanded ? `✓ Auto-mapped to ${r.expanded.map(([, t]) => t).join(" · ")}` :
        r.simplified ? `✓ ${r.simplified}` :
        "✓ Saved"
      );
      setForm({ name: "", dose: "", time: "08:00 AM", frequency: "Twice daily", instructions: "", expand: true });
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "failed");
    }
  };

  const frequencies = ["Once daily", "Twice daily", "Three times daily", "Four times daily"];
  const freqLabel = (f: string) => f.replace(" daily", "×").replace("Once×", "1×").replace("Twice×", "2×").replace("Three times×", "3×").replace("Four times×", "4×");

  return (
    <div className="grid gap-3">
      <Page
        title="Medicines"
        sub={elder ? "Your current medicines" : "Take · snooze · add"}
        right={<Btn kind="ghost" onClick={() => go("#/drug")} aria-label="Check drug interactions">Check interactions</Btn>}
      />

      {meds.map((m) =>
        elder
          ? <ElderMedRow key={m.id} m={m} pid={pid} onDone={load} />
          : <StandardMedRow key={m.id} m={m} pid={pid} onDone={load} />
      )}
      {meds.length === 0 && <Empty text={elder ? "No medicines added yet." : "No active medicines."} />}

      {/* Add medicine — elder: behind disclosure toggle */}
      {elder && !showAdd && (
        <Btn kind="ghost" onClick={() => setShowAdd(true)} className="!min-h-[56px] !text-base !w-full">
          + Add a new medicine
        </Btn>
      )}

      {showAdd && (
        <Card>
          <h3 className={`mb-2 font-bold ${elder ? "text-lg" : ""}`}>
            {elder ? "Add a new medicine" : "Add medicine"}
          </h3>
          <div className="grid gap-2">
            <label className={`grid gap-1 font-semibold ${elder ? "text-sm text-ink" : "text-xs text-muted-fg"}`}>
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
              <label className={`grid flex-1 gap-1 font-semibold ${elder ? "text-sm text-ink" : "text-xs text-muted-fg"}`}>
                Dose
                <Input
                  placeholder="Dose"
                  value={form.dose}
                  onChange={(e) => setForm({ ...form, dose: e.target.value })}
                  className={elder ? "!min-h-[56px] !text-lg" : ""}
                />
              </label>
              <label className={`grid flex-1 gap-1 font-semibold ${elder ? "text-sm text-ink" : "text-xs text-muted-fg"}`}>
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
            <fieldset className="grid gap-1">
              <legend className={`font-semibold ${elder ? "text-sm text-ink mb-1" : "text-xs text-muted-fg"}`}>
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
                          : "border border-border bg-card text-ink hover:bg-muted"
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
                      className={`flex-1 rounded-full py-1.5 text-[11px] font-bold ${
                        form.frequency === f ? "bg-primary text-white" : "bg-secondary text-primary"
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
              />
            )}
            <Toggle
              on={form.expand}
              onClick={() => setForm({ ...form, expand: !form.expand })}
              label={elder ? "Set times based on my meals" : "Auto-map to my meal times"}
            />
            {msg && (
              <p className={`font-semibold text-emerald-700 dark:text-emerald-300 ${elder ? "text-base" : "text-xs"}`}>
                {msg}
              </p>
            )}
            <Btn onClick={add} className={elder ? "!min-h-[56px] !text-lg" : ""}>
              {elder ? "Add this medicine" : "Add"}
            </Btn>
            {elder && (
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="min-h-[44px] text-sm font-semibold text-muted-fg"
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
