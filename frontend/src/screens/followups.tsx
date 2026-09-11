/**
 * screens/followups.tsx — Dev 3
 * Extracted from tabs.tsx and enhanced with adaptive rendering.
 * Owner: Dev 3
 *
 * Elder mode: Friendly plain-language dates, large cards, add-form
 * collapsed behind a CTA (progressive disclosure).
 */
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useApp } from "../lib/store";
import { useAdaptiveProfile } from "../lib/useAdaptiveProfile";
import { Badge, Btn, Card, Empty, Input, Page } from "../components/ui";

type Followup = {
  id: number;
  title: string;
  doctor: string;
  date_time: string;
  location: string;
  completed: boolean;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function friendlyDate(dt: string): string {
  if (!dt) return "";
  try {
    const d = new Date(dt);
    return d.toLocaleDateString("en-IN", {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return dt;
  }
}

// ─── Elder-mode render ────────────────────────────────────────────────────────

function ElderFollowups({
  list,
  onDone,
  onAdd,
}: {
  list: Followup[];
  onDone: (id: number) => void;
  onAdd: (f: { title: string; doctor: string; date_time: string; location: string }) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [f, setF] = useState({
    title: "",
    doctor: "",
    date_time: "",
    location: "",
  });

  const upcoming = list.filter((a) => !a.completed);
  const done = list.filter((a) => a.completed);

  return (
    <div className="grid gap-5">
      <h2 className="text-2xl font-extrabold tracking-tight">
        📅 Appointments
      </h2>

      {upcoming.length === 0 && (
        <Empty text="No upcoming appointments." />
      )}

      {upcoming.map((a) => (
        <div
          key={a.id}
          className="rounded-2xl border-2 border-border bg-card p-5"
        >
          <p className="text-xl font-bold">{a.title}</p>
          {a.doctor && (
            <p className="mt-1 text-base text-muted-fg">
              Doctor: {a.doctor}
            </p>
          )}
          <p className="mt-1 text-lg font-semibold text-primary">
            {friendlyDate(a.date_time)}
          </p>
          {a.location && (
            <p className="mt-1 text-base text-muted-fg">📍 {a.location}</p>
          )}
          <Btn
            className="mt-3 w-full text-base"
            kind="ghost"
            onClick={() => onDone(a.id)}
          >
            Mark as done ✓
          </Btn>
        </div>
      ))}

      {done.length > 0 && (
        <p className="text-sm text-muted-fg">
          ✅ {done.length} past appointment{done.length > 1 ? "s" : ""} completed
        </p>
      )}

      {/* Progressive-disclosure: form hidden behind a large CTA */}
      {!showForm ? (
        <Btn
          className="w-full text-base"
          onClick={() => setShowForm(true)}
          kind="ghost"
        >
          + Book a new appointment
        </Btn>
      ) : (
        <Card>
          <h3 className="mb-3 text-lg font-bold">New Appointment</h3>
          <div className="grid gap-3">
            <Input
              className="text-base"
              placeholder="What is the appointment for?"
              value={f.title}
              onChange={(e) => setF({ ...f, title: e.target.value })}
            />
            <Input
              className="text-base"
              placeholder="Doctor's name"
              value={f.doctor}
              onChange={(e) => setF({ ...f, doctor: e.target.value })}
            />
            <Input
              className="text-base"
              type="datetime-local"
              value={f.date_time}
              onChange={(e) => setF({ ...f, date_time: e.target.value })}
            />
            <Input
              className="text-base"
              placeholder="Hospital or clinic name"
              value={f.location}
              onChange={(e) => setF({ ...f, location: e.target.value })}
            />
            <div className="flex gap-3">
              <Btn
                className="flex-1 text-base"
                onClick={() => {
                  if (f.title) {
                    onAdd(f);
                    setF({ title: "", doctor: "", date_time: "", location: "" });
                    setShowForm(false);
                  }
                }}
              >
                Save appointment
              </Btn>
              <Btn
                kind="ghost"
                onClick={() => setShowForm(false)}
                className="text-base"
              >
                Cancel
              </Btn>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Standard render ──────────────────────────────────────────────────────────

function StandardFollowups({
  list,
  onDone,
  onAdd,
}: {
  list: Followup[];
  onDone: (id: number) => void;
  onAdd: (f: { title: string; doctor: string; date_time: string; location: string }) => void;
}) {
  const [f, setF] = useState({
    title: "",
    doctor: "",
    date_time: "",
    location: "",
  });
  return (
    <div className="grid gap-3">
      <Page title="Follow-ups" />
      {list.map((a) => (
        <Card key={a.id}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold">{a.title}</p>
              <p className="text-xs text-muted-fg">
                {a.doctor} · {a.date_time} · {a.location}
              </p>
            </div>
            {a.completed ? (
              <Badge level="taken" />
            ) : (
              <Btn kind="ghost" onClick={() => onDone(a.id)}>
                Done
              </Btn>
            )}
          </div>
        </Card>
      ))}
      {list.length === 0 && <Empty text="No appointments yet." />}
      <Card>
        <h3 className="mb-2 font-bold">Book appointment</h3>
        <div className="grid gap-2">
          <Input
            placeholder="Title"
            value={f.title}
            onChange={(e) => setF({ ...f, title: e.target.value })}
          />
          <Input
            placeholder="Doctor"
            value={f.doctor}
            onChange={(e) => setF({ ...f, doctor: e.target.value })}
          />
          <Input
            placeholder="Date & time"
            value={f.date_time}
            onChange={(e) => setF({ ...f, date_time: e.target.value })}
          />
          <Input
            placeholder="Location"
            value={f.location}
            onChange={(e) => setF({ ...f, location: e.target.value })}
          />
          <Btn
            onClick={() => {
              if (f.title) {
                onAdd(f);
                setF({ title: "", doctor: "", date_time: "", location: "" });
              }
            }}
          >
            Add
          </Btn>
        </div>
      </Card>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function Followups() {
  const { pid } = useApp();
  const { isElderMode } = useAdaptiveProfile();
  const [list, setList] = useState<Followup[]>([]);
  const load = () =>
    api.followups(pid).then(setList).catch(() => {});
  useEffect(() => {
    if (pid) load();
  }, [pid]);

  const onDone = async (id: number) => {
    await api.doneFu(pid, id);
    load();
  };
  const onAdd = async (f: {
    title: string;
    doctor: string;
    date_time: string;
    location: string;
  }) => {
    await api.addFu(pid, f);
    load();
  };

  if (isElderMode) {
    return <ElderFollowups list={list} onDone={onDone} onAdd={onAdd} />;
  }
  return <StandardFollowups list={list} onDone={onDone} onAdd={onAdd} />;
}
