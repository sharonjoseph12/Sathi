/**
 * screens/progress.tsx — Dev 3
 * Extracted from tabs.tsx and enhanced with adaptive rendering and zero emojis.
 */
import { useEffect, useState } from "react";
import { api, type Event } from "../lib/api";
import { useApp } from "../lib/store";
import { useAdaptiveProfile } from "../lib/useAdaptiveProfile";
import { Card, Confetti, Empty, Page, Ring } from "../components/ui";
import {
  Award,
  Flame,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

// ─── Elder-mode render ────────────────────────────────────────────────────────

function ElderProgress({
  adherence,
  streak,
  takenToday,
  total,
}: {
  adherence: number;
  streak: number;
  takenToday: number;
  total: number;
}) {
  const sentence =
    total === 0
      ? "No medicines scheduled today."
      : takenToday === total
      ? `You've taken all ${total} medicines today. Excellent!`
      : `You've taken ${takenToday} out of ${total} medicines today.`;

  const encouragement =
    streak >= 7
      ? `You've been on track for ${streak} days in a row — wonderful!`
      : streak >= 3
      ? `${streak} days in a row — keep it up!`
      : streak === 1
      ? "You took your medicines yesterday. Well done!"
      : "";

  return (
    <div className="grid gap-6">
      <div className="text-center">
        <h2 className="mb-4 text-2xl font-extrabold tracking-tight text-ink">
          Your Progress
        </h2>
        {/* Large adherence ring */}
        <div className="flex justify-center">
          <Ring pct={adherence} size={160} />
        </div>
        <p className="mt-5 text-xl font-semibold leading-snug text-ink">{sentence}</p>
        {encouragement && (
          <p className="mt-2 text-base text-ink-muted">{encouragement}</p>
        )}
        {streak >= 7 && (
          <div
            aria-label="Seven-day streak trophy"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-warning-bg px-4 py-2 text-base font-bold text-warning border border-warning/30"
          >
            <Award className="h-5 w-5 text-warning" aria-hidden="true" />
            <span>7-day streak — well done!</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Standard render ──────────────────────────────────────────────────────────

function StandardProgress({
  adherence,
  streak,
  xp,
  takenToday,
  total,
  week,
  timeline,
  burst,
}: {
  adherence: number;
  streak: number;
  xp: number;
  takenToday: number;
  total: number;
  week: { date: string; pct: number }[];
  timeline: Event[];
  burst: number;
}) {
  const trophy = streak >= 7;
  return (
    <div className="grid gap-3">
      <Confetti fire={burst} />
      <Page title="Progress" />
      <Card>
        <div className="flex items-center gap-4">
          <Ring pct={adherence} size={96} />
          <div className="text-sm space-y-1 text-ink">
            <p className="flex items-center gap-1.5 font-medium">
              <Flame className="h-4 w-4 text-warning" aria-hidden="true" />
              <span><b>{streak}</b> active days</span>
            </p>
            <p className="flex items-center gap-1.5 font-medium">
              <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
              <span><b>{xp}</b> XP (+10 per dose)</span>
            </p>
            <p className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
              <span>{takenToday}/{total} today</span>
            </p>
            {trophy && (
              <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-warning-bg px-2.5 py-0.5 text-xs font-bold text-warning border border-warning/30">
                <Award className="h-3.5 w-3.5 text-warning" aria-hidden="true" />
                <span>7-day streak trophy!</span>
              </p>
            )}
          </div>
        </div>
        {week.length > 0 && (
          <div
            className="mt-4 flex items-end gap-1.5"
            aria-label="7-day adherence chart"
            role="img"
          >
            {week.map((d) => (
              <div
                key={d.date}
                className="flex flex-1 flex-col items-center gap-1"
              >
                <div
                  className="w-full rounded-t-lg bg-surface-sunken"
                  style={{ height: 64 }}
                >
                  <div
                    className="w-full rounded-t-lg bg-primary"
                    style={{
                      height: `${Math.max(d.pct, 4)}%`,
                      marginTop: `${100 - Math.max(d.pct, 4)}%`,
                    }}
                  />
                </div>
                <span className="text-[9px] text-ink-muted">
                  {d.date.slice(5)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
      <Card>
        <h3 className="mb-3 font-bold text-ink">Recovery timeline</h3>
        <div className="border-l-2 border-border pl-4">
          {timeline.slice(0, 20).map((e, i) => (
            <div key={i} className="relative mb-3.5">
              <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary" />
              <p className="text-sm font-semibold text-ink">{e.description}</p>
              <p className="text-xs text-ink-muted">
                {e.event_type}
                {e.severity ? ` · ${e.severity}` : ""}
              </p>
            </div>
          ))}
          {timeline.length === 0 && <Empty text="No events yet." />}
        </div>
      </Card>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function Progress() {
  const { pid } = useApp();
  const { isElderMode } = useAdaptiveProfile();
  const [st, setSt] = useState({
    adherence: 0,
    streak: 0,
    xp: 0,
    taken_today: 0,
    total: 0,
    week: [] as { date: string; pct: number }[],
  });
  const [tl, setTl] = useState<Event[]>([]);
  const [burst, setBurst] = useState(0);

  useEffect(() => {
    if (!pid) return;
    api
      .stats(pid)
      .then((s) => {
        setSt(s);
        if (s.adherence === 100 && s.total > 0) setBurst((b) => b + 1);
      })
      .catch(() => {});
    api.timeline(pid).then(setTl).catch(() => {});
  }, [pid]);

  if (isElderMode) {
    return (
      <ElderProgress
        adherence={st.adherence}
        streak={st.streak}
        takenToday={st.taken_today}
        total={st.total}
      />
    );
  }

  return (
    <StandardProgress
      adherence={st.adherence}
      streak={st.streak}
      xp={st.xp}
      takenToday={st.taken_today}
      total={st.total}
      week={st.week}
      timeline={tl}
      burst={burst}
    />
  );
}
