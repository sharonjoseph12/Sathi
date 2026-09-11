/**
 * screens/schedule.tsx — Dev 3
 * Extracted from tabs.tsx and enhanced with adaptive rendering.
 * Owner: Dev 3 (Nav shell, Caregiver & Family, Schedule/Progress/Followups/Timeline)
 */
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { go, useApp } from "../lib/store";
import { useAdaptiveProfile } from "../lib/useAdaptiveProfile";
import { Card, Empty, Page } from "../components/ui";

// ─── Shared dose card (elder large-touch variant) ────────────────────────────

function DoseCard({ d }: { d: { name: string; time: string; status: string } }) {
  return (
    <div
      className={`mb-2 flex items-center justify-between rounded-2xl border-2 p-4 ${
        d.status === "taken"
          ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30"
          : "border-border bg-card"
      }`}
    >
      <div>
        <p className="text-xl font-bold">{d.name}</p>
        <p className="text-sm text-muted-fg">
          {d.status === "taken" ? "✅ Taken" : "⏳ Pending"}
        </p>
      </div>
      {d.status !== "taken" && (
        <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
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
  // Plain-language time-of-day labels instead of raw anchor times
  const periods = [
    { label: "Morning", key: "morning", emoji: "🌅" },
    { label: "Afternoon", key: "afternoon", emoji: "🌞" },
    { label: "Evening", key: "evening", emoji: "🌆" },
    { label: "Night", key: "night", emoji: "🌙" },
  ];

  // Format date/time for elder: "Tuesday, 3 PM" not "2026-09-16T15:00"
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

  // Determine if anchors are configured at all
  const hasAnchors = Object.values(anchors).some(Boolean);

  return (
    <div className="grid gap-4">
      {/* Medicines: grouped by period if anchors set, flat list otherwise */}
      <section aria-label="Today's medicines">
        <h2 className="mb-3 text-2xl font-extrabold tracking-tight">
          Today's Medicines
        </h2>

        {hasAnchors ? (
          /* Grouped by morning/afternoon/evening/night */
          periods.map(({ label, key, emoji }) => {
            const periodDoses = doses.filter((d) => d.time === anchors[key]);
            if (periodDoses.length === 0) return null;
            return (
              <div key={key} className="mb-3">
                <p className="mb-2 text-base font-bold text-muted-fg">
                  {emoji} {label} · {anchors[key]}
                </p>
                {periodDoses.map((d, i) => (
                  <DoseCard key={i} d={d} />
                ))}
              </div>
            );
          })
        ) : (
          /* Flat list when no anchors configured */
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
          className="mt-1 min-h-[44px] text-base font-bold text-primary underline"
          onClick={() => go("#/settings")}
          aria-label="Change meal times in settings"
        >
          Change my meal times →
        </button>
      </section>

      {/* Upcoming appointments in plain language */}
      {followups.length > 0 && (
        <section aria-label="Upcoming appointments">
          <h2 className="mb-3 text-2xl font-extrabold tracking-tight">
            📅 Appointments
          </h2>
          {followups.map((f, i) => (
            <div
              key={i}
              className="mb-2 rounded-2xl border border-border bg-card p-4"
            >
              <p className="text-xl font-bold">{f.title}</p>
              <p className="mt-1 text-base text-muted-fg">
                {friendlyDate(f.date_time)}
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
        <p className="text-sm">
          🌅 Morning {anchors.morning} · 🌞 Afternoon {anchors.afternoon} ·
          🌆 Evening {anchors.evening} · 🌙 Night {anchors.night}
        </p>
        <button
          className="mt-1 text-xs font-bold text-primary"
          onClick={() => go("#/settings")}
        >
          Edit in Settings →
        </button>
      </Card>
      {doses.map((d, i) => (
        <div
          key={i}
          className="flex items-center justify-between rounded-2xl bg-card p-3 shadow-sm"
        >
          <p className="text-sm font-semibold">
            💊 {d.name}{" "}
            <span className="text-xs text-muted-fg">· {d.time}</span>
          </p>
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              d.status === "pending"
                ? "bg-secondary text-primary"
                : d.status === "taken"
                ? "bg-emerald-100 text-emerald-900"
                : "bg-amber-100 text-amber-900"
            }`}
          >
            {d.status === "pending" ? "● Pending" : d.status === "taken" ? "✓ Taken" : "⚠ " + d.status}
          </span>
        </div>
      ))}
      {followups.map((f, i) => (
        <div key={i} className="rounded-2xl bg-card p-3 shadow-sm">
          <p className="text-sm font-semibold">📅 {f.title}</p>
          <p className="text-xs text-muted-fg">{f.date_time}</p>
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
    return (
      <ElderSchedule doses={doses} followups={fus} anchors={anchors} />
    );
  }
  return (
    <StandardSchedule doses={doses} followups={fus} anchors={anchors} />
  );
}
