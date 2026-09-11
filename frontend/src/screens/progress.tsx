/**
 * screens/progress.tsx — Dev 3
 * Extracted from tabs.tsx and enhanced with adaptive rendering.
 * Owner: Dev 3
 *
 * Elder mode: No bar chart (confusing for low digital literacy).
 * Plain sentence summary + large adherence ring only.
 */
import { useEffect, useState } from "react";
import { api, type Event } from "../lib/api";
import { useApp } from "../lib/store";
import { useAdaptiveProfile } from "../lib/useAdaptiveProfile";
import { Card, Confetti, Empty, Page, Ring } from "../components/ui";

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
  // Plain English sentence, no jargon
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
        <h2 className="mb-4 text-2xl font-extrabold tracking-tight">
          Your Progress
        </h2>
        {/* Large adherence ring, centre-stage */}
        <div className="flex justify-center">
          <Ring pct={adherence} size={160} />
        </div>
        <p className="mt-5 text-xl font-semibold leading-snug">{sentence}</p>
        {encouragement && (
          <p className="mt-2 text-base text-muted-fg">{encouragement}</p>
        )}
        {streak >= 7 && (
          <p
            aria-label="Seven-day streak trophy"
            className="mt-4 inline-block rounded-full bg-amber-100 px-4 py-2 text-base font-bold text-amber-800"
          >
            🏆 7-day streak — well done!
          </p>
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
          <div className="text-sm">
            <p>
              🔥 <b>{streak}</b> active days
            </p>
            <p>
              ✨ <b>{xp}</b> XP (+10 per dose)
            </p>
            <p>
              ✅ {takenToday}/{total} today
            </p>
            {trophy && (
              <p className="mt-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                🏆 7-day streak trophy!
              </p>
            )}
          </div>
        </div>
        {week.length > 0 && (
          <div
            className="mt-3 flex items-end gap-1.5"
            aria-label="7-day adherence chart"
            role="img"
          >
            {week.map((d) => (
              <div
                key={d.date}
                className="flex flex-1 flex-col items-center gap-1"
              >
                <div
                  className="w-full rounded-t-lg bg-muted"
                  style={{ height: 64 }}
                >
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-[#4B26C8] to-[#8B5CF6]"
                    style={{
                      height: `${Math.max(d.pct, 4)}%`,
                      marginTop: `${100 - Math.max(d.pct, 4)}%`,
                    }}
                  />
                </div>
                <span className="text-[9px] text-muted-fg">
                  {d.date.slice(5)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
      <Card>
        <h3 className="mb-2 font-bold">Recovery timeline</h3>
        <div className="border-l-2 border-border pl-4">
          {timeline.slice(0, 20).map((e, i) => (
            <div key={i} className="relative mb-3">
              <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary" />
              <p className="text-sm font-semibold">{e.description}</p>
              <p className="text-xs text-muted-fg">
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
