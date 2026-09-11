/**
 * screens/timeline.tsx — Dev 3
 * Extracted from tabs.tsx and enhanced with adaptive rendering.
 * Owner: Dev 3
 *
 * Elder mode: No filter bar (6-option segment control is overwhelming).
 * Plain-English event labels. Chronological list only.
 */
import { useEffect, useState } from "react";
import { api, type Event } from "../lib/api";
import { useApp } from "../lib/store";
import { useAdaptiveProfile } from "../lib/useAdaptiveProfile";
import { Card, Empty, Page, Seg } from "../components/ui";

// ─── Plain-English event type labels ─────────────────────────────────────────

const EVENT_LABELS: Record<string, string> = {
  MEDICATION_TAKEN: "Medicine taken",
  SYMPTOM_REPORTED: "Symptom reported",
  SAFETY_ALERT: "Safety alert",
  CAREGIVER_ALERT: "Caregiver was notified",
  FOLLOW_UP: "Appointment",
  NOTE: "Note",
};

function labelFor(eventType: string): string {
  return EVENT_LABELS[eventType] ?? eventType.replace(/_/g, " ").toLowerCase();
}

// ─── Shared timeline list ─────────────────────────────────────────────────────

function TimelineList({
  events,
  elderMode,
}: {
  events: Event[];
  elderMode: boolean;
}) {
  if (events.length === 0) return <Empty text="Nothing here yet." />;
  return (
    <div className="border-l-2 border-border pl-4">
      {events.map((e, i) => (
        <div key={i} className="relative mb-4">
          {/* Timeline dot */}
          <span
            className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ${
              e.event_type === "SAFETY_ALERT" || e.event_type === "CAREGIVER_ALERT"
                ? "bg-danger"
                : e.event_type === "MEDICATION_TAKEN"
                ? "bg-success"
                : "bg-primary"
            }`}
            aria-hidden="true"
          />
          <p
            className={`font-semibold ${elderMode ? "text-base" : "text-sm"}`}
          >
            {e.description}
          </p>
          <p
            className={`text-muted-fg ${elderMode ? "text-sm" : "text-xs"}`}
          >
            {elderMode ? labelFor(e.event_type) : e.event_type}
            {e.severity ? ` · ${e.severity}` : ""}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── Elder-mode render ────────────────────────────────────────────────────────

function ElderTimeline({ events }: { events: Event[] }) {
  return (
    <div className="grid gap-4">
      <h2 className="text-2xl font-extrabold tracking-tight">Your History</h2>
      <p className="text-base text-muted-fg">
        Everything that has happened in your recovery, in order.
      </p>
      <Card>
        <TimelineList events={events} elderMode />
      </Card>
    </div>
  );
}

// ─── Standard render ──────────────────────────────────────────────────────────

const FILTER_OPTS = [
  "all",
  "MEDICATION_TAKEN",
  "SYMPTOM_REPORTED",
  "SAFETY_ALERT",
  "CAREGIVER_ALERT",
  "FOLLOW_UP",
] as const;
type FilterOpt = (typeof FILTER_OPTS)[number];

function StandardTimeline({ events }: { events: Event[] }) {
  const [filter, setFilter] = useState<FilterOpt>("all");
  const rows =
    filter === "all" ? events : events.filter((e) => e.event_type === filter);
  return (
    <div className="grid gap-3">
      <Page title="Timeline" />
      <Seg
        opts={[...FILTER_OPTS]}
        val={filter}
        set={(v) => setFilter(v as FilterOpt)}
      />
      <Card>
        <TimelineList events={rows} elderMode={false} />
      </Card>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function Timeline() {
  const { pid } = useApp();
  const { isElderMode } = useAdaptiveProfile();
  const [tl, setTl] = useState<Event[]>([]);

  useEffect(() => {
    if (pid) api.timeline(pid).then(setTl).catch(() => {});
  }, [pid]);

  if (isElderMode) return <ElderTimeline events={tl} />;
  return <StandardTimeline events={tl} />;
}
