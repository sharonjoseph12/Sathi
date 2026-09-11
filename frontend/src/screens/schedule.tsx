/**
 * screens/schedule.tsx — Dev 3
 * Extracted from tabs.tsx and enhanced with adaptive rendering and zero emojis.
 */
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { go, useApp } from "../lib/store";
import { useAdaptiveProfile } from "../lib/useAdaptiveProfile";
import { Card, Empty, Page } from "../components/ui";
import {
  Check,
  Clock,
  Calendar,
  Pill,
  Sunrise,
  Sun,
  Sunset,
  Moon,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";

// ─── Shared dose card (elder large-touch variant) ────────────────────────────

function DoseCard({ d }: { d: { name: string; time: string; status: string } }) {
  return (
    <div
      className={`mb-2 flex items-center justify-between rounded-2xl border-2 p-4 transition ${
        d.status === "taken"
          ? "border-success/40 bg-success-bg"
          : "border-border bg-surface"
      }`}
    >
      <div>
        <p className="text-xl font-bold text-ink">{d.name}</p>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-muted">
          {d.status === "taken" ? (
            <>
              <Check className="h-4 w-4 text-success" aria-hidden="true" />
              <span className="font-semibold text-success">Taken</span>
            </>
          ) : (
            <>
              <Clock className="h-4 w-4" aria-hidden="true" />
              <span>Pending</span>
            </>
          )}
        </p>
      </div>
      {d.status !== "taken" && (
        <span className="rounded-full bg-primary-soft px-3 py-1.5 text-sm font-bold text-primary">
          Not yet taken
        </span>
      )}
    </div>
  );
}

// ─── Elder-mode render ────────────────────────────────────────────────────────

function ElderSchedule({
  doses,
  followups,
  anchors,
}: {
  doses: { name: string; time: string; status: string }[];
  followups: { title: string; date_time: string }[];
  anchors: Record<string, string>;
}) {
  const periods = [
    { label: "Morning", key: "morning", icon: Sunrise },
    { label: "Afternoon", key: "afternoon", icon: Sun },
    { label: "Evening", key: "evening", icon: Sunset },
    { label: "Night", key: "night", icon: Moon },
  ];

  function friendlyDate(dt: string) {
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

  const hasAnchors = Object.values(anchors).some(Boolean);

  return (
    <div className="grid gap-4">
      {/* Medicines: grouped by period if anchors set, flat list otherwise */}
      <section aria-label="Today's medicines">
        <h2 className="mb-3 text-2xl font-extrabold tracking-tight text-ink">
          Today's Medicines
        </h2>

        {hasAnchors ? (
          periods.map(({ label, key, icon: IconComp }) => {
            const periodDoses = doses.filter((d) => d.time === anchors[key]);
            if (periodDoses.length === 0) return null;
            return (
              <div key={key} className="mb-4">
                <p className="mb-2 flex items-center gap-2 text-base font-bold text-ink-muted">
                  <IconComp className="h-5 w-5 text-primary" aria-hidden="true" />
                  <span>
                    {label} · {anchors[key]}
                  </span>
                </p>
                {periodDoses.map((d, i) => (
                  <DoseCard key={i} d={d} />
                ))}
              </div>
            );
          })
        ) : (
          <div className="grid gap-2">
            {doses.map((d, i) => (
              <DoseCard key={i} d={d} />
            ))}
          </div>
        )}

        {doses.length === 0 && (
          <Empty text="No medicines scheduled for today." />
        )}
        <button
          className="mt-2 flex items-center gap-1 min-h-[44px] text-base font-bold text-primary underline"
          onClick={() => go("#/settings")}
          aria-label="Change meal times in settings"
        >
          <span>Change my meal times</span>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </section>

      {/* Upcoming appointments */}
      {followups.length > 0 && (
        <section aria-label="Upcoming appointments">
          <h2 className="mb-3 flex items-center gap-2 text-2xl font-extrabold tracking-tight text-ink">
            <Calendar className="h-6 w-6 text-primary" aria-hidden="true" />
            <span>Appointments</span>
          </h2>
          {followups.map((f, i) => (
            <div
              key={i}
              className="mb-2 rounded-2xl border-2 border-border bg-surface p-4"
            >
              <p className="text-xl font-bold text-ink">{f.title}</p>
              <p className="mt-1 flex items-center gap-1.5 text-base text-ink-muted">
                <Clock className="h-4 w-4" aria-hidden="true" />
                <span>{friendlyDate(f.date_time)}</span>
              </p>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

// ─── Standard render ──────────────────────────────────────────────────────────

function StandardSchedule({
  doses,
  followups,
  anchors,
}: {
  doses: { name: string; time: string; status: string }[];
  followups: { title: string; date_time: string }[];
  anchors: Record<string, string>;
}) {
  return (
    <div className="grid gap-3">
      <Page title="Schedule" sub="Anchored to your daily routine" />
      <Card>
        <div className="flex flex-wrap items-center gap-3 text-xs text-ink font-medium">
          <span className="flex items-center gap-1">
            <Sunrise className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            Morning {anchors.morning || "8:00 AM"}
          </span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <Sun className="h-3.5 w-3.5 text-warning" aria-hidden="true" />
            Afternoon {anchors.afternoon || "1:00 PM"}
          </span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <Sunset className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            Evening {anchors.evening || "7:00 PM"}
          </span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <Moon className="h-3.5 w-3.5 text-ink-muted" aria-hidden="true" />
            Night {anchors.night || "10:00 PM"}
          </span>
        </div>
        <button
          className="mt-2 flex items-center gap-1 text-xs font-bold text-primary hover:underline min-h-[44px]"
          onClick={() => go("#/settings")}
        >
          <span>Edit in Settings</span>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </Card>
      {doses.map((d, i) => (
        <div
          key={i}
          className="flex items-center justify-between rounded-2xl border border-border bg-surface p-3 shadow-sm"
        >
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary-soft text-primary">
              <Pill className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">{d.name}</p>
              <p className="text-xs text-ink-muted">{d.time}</p>
            </div>
          </div>
          <span
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              d.status === "pending"
                ? "bg-primary-soft text-primary"
                : d.status === "taken"
                ? "bg-success-bg text-success"
                : "bg-warning-bg text-warning"
            }`}
          >
            {d.status === "taken" ? (
              <>
                <Check className="h-3 w-3 stroke-[3]" aria-hidden="true" />
                <span>Taken</span>
              </>
            ) : d.status === "pending" ? (
              <>
                <Clock className="h-3 w-3" aria-hidden="true" />
                <span>Pending</span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                <span>{d.status}</span>
              </>
            )}
          </span>
        </div>
      ))}
      {followups.map((f, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 shadow-sm"
        >
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary-soft text-primary">
            <Calendar className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">{f.title}</p>
            <p className="text-xs text-ink-muted">{f.date_time}</p>
          </div>
        </div>
      ))}
      {doses.length === 0 && followups.length === 0 && (
        <Empty text="Nothing scheduled today." />
      )}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function Schedule() {
  const { me, pid } = useApp();
  const { isElderMode } = useAdaptiveProfile();
  const [doses, setDoses] = useState<{ name: string; time: string; status: string }[]>([]);
  const [fus, setFus] = useState<{ title: string; date_time: string }[]>([]);
  const anchors = (() => {
    try {
      return JSON.parse(me?.anchor_times || "{}");
    } catch {
      return {};
    }
  })();

  useEffect(() => {
    if (!pid) return;
    api.dosesToday(pid).then(setDoses).catch(() => {});
    api.followups(pid).then(setFus).catch(() => {});
  }, [pid]);

  if (isElderMode) {
    return <ElderSchedule doses={doses} followups={fus} anchors={anchors} />;
  }
  return <StandardSchedule doses={doses} followups={fus} anchors={anchors} />;
}
