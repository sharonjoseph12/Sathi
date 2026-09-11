/**
 * screens/followups.tsx — Dev 3
 * Extracted from tabs.tsx and enhanced with adaptive rendering and zero emojis.
 */
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useApp } from "../lib/store";
import { useAdaptiveProfile } from "../lib/useAdaptiveProfile";
import { Badge, Btn, Card, Empty, Input, Page } from "../components/ui";
import {
  Calendar,
  MapPin,
  Check,
  CheckCircle2,
  Plus,
  Clock,
  User,
} from "lucide-react";

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
      <h2 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-ink">
        <Calendar className="h-6 w-6 text-primary" aria-hidden="true" />
        <span>Appointments</span>
      </h2>

      {upcoming.length === 0 && (
        <Empty text="No upcoming appointments." />
      )}

      {upcoming.map((a) => (
        <div
          key={a.id}
          className="rounded-2xl border-2 border-border bg-surface p-5 shadow-sm"
        >
          <p className="text-xl font-bold text-ink">{a.title}</p>
          {a.doctor && (
            <p className="mt-1 flex items-center gap-1.5 text-base text-ink-muted">
              <User className="h-4 w-4" aria-hidden="true" />
              <span>Doctor: {a.doctor}</span>
            </p>
          )}
          <p className="mt-1.5 flex items-center gap-1.5 text-lg font-semibold text-primary">
            <Clock className="h-5 w-5" aria-hidden="true" />
            <span>{friendlyDate(a.date_time)}</span>
          </p>
          {a.location && (
            <p className="mt-1 flex items-center gap-1.5 text-base text-ink-muted">
              <MapPin className="h-4 w-4" aria-hidden="true" />
              <span>{a.location}</span>
            </p>
          )}
          <Btn
            className="mt-4 w-full text-base flex items-center justify-center gap-2 !min-h-[52px]"
            kind="ghost"
            onClick={() => onDone(a.id)}
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            <span>Mark as done</span>
          </Btn>
        </div>
      ))}

      {done.length > 0 && (
        <p className="flex items-center gap-1.5 text-sm text-ink-muted font-medium">
          <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
          <span>{done.length} past appointment{done.length > 1 ? "s" : ""} completed</span>
        </p>
      )}

      {/* Progressive-disclosure: form hidden behind CTA */}
      {!showForm ? (
        <Btn
          className="w-full text-base flex items-center justify-center gap-2 !min-h-[56px]"
          onClick={() => setShowForm(true)}
          kind="ghost"
        >
          <Plus className="h-5 w-5" aria-hidden="true" />
          <span>Book a new appointment</span>
        </Btn>
      ) : (
        <Card>
          <h3 className="mb-3 text-lg font-bold text-ink">New Appointment</h3>
          <div className="grid gap-3">
            <Input
              className="text-base !min-h-[52px]"
              placeholder="What is the appointment for?"
              value={f.title}
              onChange={(e) => setF({ ...f, title: e.target.value })}
            />
            <Input
              className="text-base !min-h-[52px]"
              placeholder="Doctor's name"
              value={f.doctor}
              onChange={(e) => setF({ ...f, doctor: e.target.value })}
            />
            <Input
              className="text-base !min-h-[52px]"
              type="datetime-local"
              value={f.date_time}
              onChange={(e) => setF({ ...f, date_time: e.target.value })}
            />
            <Input
              className="text-base !min-h-[52px]"
              placeholder="Hospital or clinic name"
              value={f.location}
              onChange={(e) => setF({ ...f, location: e.target.value })}
            />
            <div className="flex gap-3 mt-1">
              <Btn
                className="flex-1 text-base !min-h-[52px] flex items-center justify-center gap-2"
                onClick={() => {
                  if (f.title) {
                    onAdd(f);
                    setF({ title: "", doctor: "", date_time: "", location: "" });
                    setShowForm(false);
                  }
                }}
              >
                <Check className="h-4 w-4" aria-hidden="true" />
                <span>Save appointment</span>
              </Btn>
              <Btn
                kind="ghost"
                onClick={() => setShowForm(false)}
                className="text-base !min-h-[52px]"
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
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="font-bold text-ink">{a.title}</p>
              <p className="text-xs text-ink-muted">
                {a.doctor ? `${a.doctor} · ` : ""}
                {a.date_time}
                {a.location ? ` · ${a.location}` : ""}
              </p>
            </div>
            {a.completed ? (
              <Badge level="taken" />
            ) : (
              <Btn
                kind="ghost"
                onClick={() => onDone(a.id)}
                className="flex items-center gap-1"
              >
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Done</span>
              </Btn>
            )}
          </div>
        </Card>
      ))}
      {list.length === 0 && <Empty text="No appointments yet." />}
      <Card>
        <h3 className="mb-3 font-bold text-ink">Book appointment</h3>
        <div className="grid gap-2.5">
          <Input
            placeholder="Title"
            value={f.title}
            onChange={(e) => setF({ ...f, title: e.target.value })}
            aria-label="Appointment title"
          />
          <Input
            placeholder="Doctor"
            value={f.doctor}
            onChange={(e) => setF({ ...f, doctor: e.target.value })}
            aria-label="Doctor's name"
          />
          <Input
            placeholder="Date & time"
            value={f.date_time}
            onChange={(e) => setF({ ...f, date_time: e.target.value })}
            aria-label="Appointment date and time"
          />
          <Input
            placeholder="Location"
            value={f.location}
            onChange={(e) => setF({ ...f, location: e.target.value })}
            aria-label="Location"
          />
          <Btn
            onClick={() => {
              if (f.title) {
                onAdd(f);
                setF({ title: "", doctor: "", date_time: "", location: "" });
              }
            }}
            label="Save appointment"
            className="flex items-center justify-center gap-1.5"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Save</span>
          </Btn>
        </div>
      </Card>
    </div>
  );
}

import { DoctorContacts } from "../components/DoctorContacts";
import { Stethoscope } from "lucide-react";

// ─── Main export ──────────────────────────────────────────────────────────────

export function Followups() {
  const { pid } = useApp();
  const { isElderMode } = useAdaptiveProfile();
  const [list, setList] = useState<Followup[]>([]);
  const [activeTab, setActiveTab] = useState<"appointments" | "doctors">("appointments");

  const load = () =>
    api
      .followups(pid)
      .then(setList)
      .catch(() => {});

  useEffect(() => {
    if (pid) load();
  }, [pid]);

  const handleDone = async (id: number) => {
    await api.doneFu(pid, id);
    load();
  };

  const handleAdd = async (f: {
    title: string;
    doctor: string;
    date_time: string;
    location: string;
  }) => {
    await api.addFu(pid, f);
    load();
  };

  return (
    <div className="grid gap-4">
      {/* Tab Switcher: Appointments vs Doctor Contacts */}
      <div className="flex rounded-2xl border border-border bg-surface p-1 shadow-sm">
        <button
          type="button"
          onClick={() => setActiveTab("appointments")}
          className={`flex-1 flex min-h-[44px] items-center justify-center gap-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "appointments"
              ? "bg-primary text-white shadow-elev-1"
              : "text-ink-muted hover:text-ink hover:bg-surface-sunken"
          }`}
        >
          <Calendar className="h-4 w-4" />
          <span>Appointments</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("doctors")}
          className={`flex-1 flex min-h-[44px] items-center justify-center gap-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "doctors"
              ? "bg-primary text-white shadow-elev-1"
              : "text-ink-muted hover:text-ink hover:bg-surface-sunken"
          }`}
        >
          <Stethoscope className="h-4 w-4" />
          <span>Doctor Contacts</span>
        </button>
      </div>

      {activeTab === "doctors" ? (
        <DoctorContacts />
      ) : isElderMode ? (
        <ElderFollowups
          list={list}
          onDone={handleDone}
          onAdd={handleAdd}
        />
      ) : (
        <StandardFollowups
          list={list}
          onDone={handleDone}
          onAdd={handleAdd}
        />
      )}
    </div>
  );
}
