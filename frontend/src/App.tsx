/**
 * App.tsx — Adaptive Navigation Shell (Dev 3)
 *
 * Key changes vs original:
 * 1. Tab set is profile-driven via getAdaptiveTabs() — elder profiles get
 *    a hard-capped 5-item nav (Today, Medicines, Appointments, Ask Sathi,
 *    Emergency). Standard/caregiver get their existing richer sets.
 * 2. "More" screen is rebuilt with progressive disclosure:
 *    - Elder: 4 items max + "Show all" toggle. No item overload.
 *    - Caregiver: only caregiver-relevant items shown.
 *    - Standard: sectioned layout (Recovery, Records, App) + expand.
 * 3. SOS shortcut pinned to header for elder profiles.
 * 4. Adaptive header — elder shows first name + "Your recovery"; caregiver
 *    shows patient count.
 */
import { AppProvider, go, useApp, useHash } from "./lib/store";
import { OfflineBanner } from "./components/ui";
import { Icon } from "./components/icons";
import { useEffect, useState, type ReactNode } from "react";
import { Onboarding } from "./screens/onboarding";
import { Login } from "./screens/login";
import { Register } from "./screens/register";
import { Home } from "./screens/home";
import { Medicines } from "./screens/medicines";
import { Symptoms } from "./screens/symptoms";
import { Schedule } from "./screens/schedule";
import { Progress } from "./screens/progress";
import { Followups } from "./screens/followups";
import { Timeline } from "./screens/timeline";
import { Scan, Chat, DrugChecker, Simplify } from "./screens/tools";
import { SOS } from "./screens/sos";
import { Journal, Meditation } from "./screens/well";
import {
  CareDash,
  PatientDetail,
  CreatePlan,
  FamilyDash,
} from "./screens/care";
import {
  Settings,
  Notifications,
  Help,
  Demo,
  Reminders,
  Plans,
  Report,
} from "./screens/more";
import { t } from "./lib/i18n";
import { checkDueDoses } from "./lib/notify";
import {
  useAdaptiveProfile,
  getAdaptiveClasses,
  type AdaptiveProfile,
} from "./lib/useAdaptiveProfile";

// ─── Tab definitions ──────────────────────────────────────────────────────────

type TabDef = {
  path: string;
  label: string;
  icon: string;
  ariaLabel: string;
};

/** Returns the tab set appropriate for this profile.
 *  Elder profiles are capped at 5 items (blueprint §5, §3 Architecture). */
function getAdaptiveTabs(
  profile: AdaptiveProfile,
  role: string
): TabDef[] {
  // Elder mode: 5 items max, no More grid in nav
  if (profile.isElderMode) {
    return [
      { path: "#/home", label: "Today", icon: "home", ariaLabel: "Today's recovery" },
      { path: "#/meds", label: "Medicines", icon: "pill", ariaLabel: "Medicines" },
      { path: "#/followups", label: "Appointments", icon: "calendar", ariaLabel: "Appointments" },
      { path: "#/chat", label: "Ask Sathi", icon: "chat", ariaLabel: "Ask Sathi" },
      { path: "#/sos", label: "Emergency", icon: "sos", ariaLabel: "Emergency SOS" },
    ];
  }

  // Caregiver / family
  if (role === "caregiver") {
    return [
      { path: "#/care", label: "Patients", icon: "users", ariaLabel: "Caregiver dashboard" },
      { path: "#/chat", label: "Chat", icon: "chat", ariaLabel: "Chat" },
      { path: "#/more", label: "More", icon: "grid", ariaLabel: "More options" },
    ];
  }
  if (role === "family") {
    return [
      { path: "#/family", label: "Family", icon: "users", ariaLabel: "Family view" },
      { path: "#/chat", label: "Chat", icon: "chat", ariaLabel: "Chat" },
      { path: "#/more", label: "More", icon: "grid", ariaLabel: "More options" },
    ];
  }

  // Standard patient
  return [
    { path: "#/home", label: "Home", icon: "home", ariaLabel: "Today's recovery" },
    { path: "#/meds", label: "Meds", icon: "pill", ariaLabel: "Medicines" },
    { path: "#/chat", label: "Chat", icon: "chat", ariaLabel: "Ask Sathi" },
    { path: "#/care", label: "Care", icon: "users", ariaLabel: "Care team" },
    { path: "#/more", label: "More", icon: "grid", ariaLabel: "More options" },
  ];
}

// ─── More screen (progressive disclosure) ────────────────────────────────────

type MoreItem = [string, string, string, string]; // [path, title, subtitle, icon]

const RECOVERY_ITEMS: MoreItem[] = [
  ["#/symptoms", "Symptoms", "Log and review symptoms", "pulse"],
  ["#/schedule", "Schedule", "Medicines and tasks for today", "calendar"],
  ["#/progress", "Progress", "Adherence and timeline", "chart"],
  ["#/followups", "Follow-ups", "Appointments and visits", "calendar"],
  ["#/timeline", "Timeline", "Full recovery record", "file"],
];

const TOOLS_ITEMS: MoreItem[] = [
  ["#/scan", "Scan prescription", "Extract medicines from photo", "scan"],
  ["#/drug", "Drug check", "Interaction review", "shield"],
  ["#/simplify", "Simplify jargon", "Plain-language explanations", "book"],
  ["#/journal", "Journal", "Mood, energy and notes", "file"],
  ["#/meditate", "Breathing", "Guided recovery exercise", "clock"],
  ["#/report", "Recovery report", "Summary for care team", "file"],
  ["#/plans", "Discharge plans", "Hospital instructions", "file"],
];

const APP_ITEMS: MoreItem[] = [
  ["#/reminders", "Reminders", "Manage notifications", "bell"],
  ["#/notifs", "Notifications", "Alerts and updates", "bell"],
  ["#/settings", "Settings", "Language, theme, access", "gear"],
  ["#/help", "Help", "Support and guidance", "book"],
  ["#/demo", "Judge demo", "Guided evaluation flow", "check"],
  ["#/sos", "Emergency SOS", "Urgent help and contacts", "sos"],
];

const CAREGIVER_MORE_ITEMS: MoreItem[] = [
  ["#/settings", "Settings", "Language, theme, access", "gear"],
  ["#/notifs", "Notifications", "Alerts and updates", "bell"],
  ["#/help", "Help", "Support and guidance", "book"],
];

function MoreItemBtn({ item }: { item: MoreItem; key?: string | number }) {
  const [p, title, sub, ic] = item;
  return (
    <button
      onClick={() => go(p)}
      className="flex min-h-[44px] items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left shadow-sm active:scale-[0.99]"
      aria-label={`${title} — ${sub}`}
    >
      <span
        aria-hidden="true"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-secondary text-primary"
      >
        <Icon name={ic} size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{title}</span>
        <span className="block truncate text-xs text-muted-fg">{sub}</span>
      </span>
      <span aria-hidden="true" className="text-muted-fg">
        <Icon name="arrow" size={16} />
      </span>
    </button>
  );
}

function MoreSection({
  title,
  items,
}: {
  title: string;
  items: MoreItem[];
}) {
  return (
    <section aria-label={title}>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-fg">
        {title}
      </p>
      <div className="grid gap-2">
        {items.map((item) => (
          <MoreItemBtn key={item[0]} item={item} />
        ))}
      </div>
    </section>
  );
}

function More() {
  const profile = useAdaptiveProfile();
  const { me } = useApp();
  const role = me?.role ?? "patient";
  const [expanded, setExpanded] = useState(false);

  // Elder mode: minimal — 4 items + "Show all" toggle
  if (profile.isElderMode) {
    const elderItems: MoreItem[] = [
      ["#/settings", "Settings", "Language, theme, access", "gear"],
      ["#/reminders", "Reminders", "Manage notifications", "bell"],
      ["#/help", "Help", "Support and guidance", "book"],
      ["#/sos", "Emergency SOS", "Urgent help and contacts", "sos"],
    ];
    return (
      <div className="grid gap-4">
        <h2 className="text-2xl font-extrabold tracking-tight">More</h2>
        <div className="grid gap-3">
          {elderItems.map((item) => (
            <MoreItemBtn key={item[0]} item={item} />
          ))}
        </div>
        {!expanded ? (
          <button
            onClick={() => setExpanded(true)}
            className="min-h-[44px] rounded-2xl border border-dashed border-border py-3 text-sm font-semibold text-muted-fg"
          >
            Show all options ▼
          </button>
        ) : (
          <>
            <div className="grid gap-3">
              {[...RECOVERY_ITEMS, ...TOOLS_ITEMS, ...APP_ITEMS]
                .filter((i) => !elderItems.find((e) => e[0] === i[0]))
                .map((item) => (
                  <MoreItemBtn key={item[0]} item={item} />
                ))}
            </div>
            <button
              onClick={() => setExpanded(false)}
              className="min-h-[44px] rounded-2xl border border-dashed border-border py-3 text-sm font-semibold text-muted-fg"
            >
              Show less ▲
            </button>
          </>
        )}
      </div>
    );
  }

  // Caregiver mode: only relevant items
  if (role === "caregiver" || role === "family") {
    return (
      <div className="grid gap-4">
        <h2 className="text-xl font-bold tracking-tight">More</h2>
        <div className="grid gap-2">
          {CAREGIVER_MORE_ITEMS.map((item) => (
            <MoreItemBtn key={item[0]} item={item} />
          ))}
        </div>
      </div>
    );
  }

  // Standard patient: sectioned, first 3 recovery items visible, rest collapsed
  return (
    <div className="grid gap-5">
      <div>
        <h2 className="text-xl font-bold tracking-tight">More</h2>
        <p className="mt-0.5 text-[13px] text-muted-fg">
          All recovery tools in one place.
        </p>
      </div>

      <MoreSection title="Recovery" items={RECOVERY_ITEMS} />

      {expanded ? (
        <>
          <MoreSection title="Tools" items={TOOLS_ITEMS} />
          <MoreSection title="App" items={APP_ITEMS} />
          <button
            onClick={() => setExpanded(false)}
            className="min-h-[44px] rounded-2xl border border-dashed border-border py-2 text-sm font-semibold text-muted-fg"
          >
            Show less ▲
          </button>
        </>
      ) : (
        <button
          onClick={() => setExpanded(true)}
          className="min-h-[44px] rounded-2xl border border-dashed border-border py-2 text-sm font-semibold text-muted-fg"
          aria-label="Show all tools and app settings"
        >
          + Tools & settings ▼
        </button>
      )}
    </div>
  );
}

// ─── Shell ────────────────────────────────────────────────────────────────────

function Shell() {
  const { me, pid, setPid } = useApp();
  const profile = useAdaptiveProfile();
  const hash = useHash();

  // Hooks must run unconditionally — before any early return.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", me?.theme === "dark");
    try {
      localStorage.setItem(
        "@sathi_theme",
        me?.theme === "dark" ? "dark" : "light"
      );
    } catch {
      /* noop */
    }
  }, [me?.theme]);
  // Apply adaptive CSS classes (elder, reduced-motion) to the document root
  useEffect(() => {
    const cls = getAdaptiveClasses(profile);
    const el = document.documentElement;
    el.classList.remove("elder", "reduced-motion");
    cls.forEach((c) => el.classList.add(c));
  }, [profile]);
  useEffect(() => {
    if (!me || !pid) return;
    checkDueDoses(pid);
    const id = setInterval(() => checkDueDoses(pid), 60000);
    return () => clearInterval(id);
  }, [me, pid]);

  const [path, arg] =
    (hash.split("?")[0]).split("/").length >= 3
      ? [
          `#/${hash.split("?")[0].split("/")[1]}`,
          hash.split("?")[0].split("/")[2],
        ]
      : [hash.split("?")[0], ""];

  useEffect(() => {
    if ((path === "#/" || path === "") && me) {
      go(
        me.role === "caregiver"
          ? "#/care"
          : me.role === "family"
          ? "#/family"
          : "#/home"
      );
    }
  }, [path, me]);

  if (!me) {
    if (path === "#/register") return <Register />;
    if (path === "#/demo")
      return (
        <div className="mx-auto max-w-[600px] p-4">
          <Demo />
        </div>
      );
    return <Login />;
  }

  const screens: Record<string, ReactNode> = {
    "#/onboarding": <Onboarding />,
    "#/home": <Home />,
    "#/meds": <Medicines />,
    "#/symptoms": <Symptoms />,
    "#/schedule": <Schedule />,
    "#/progress": <Progress />,
    "#/followups": <Followups />,
    "#/timeline": <Timeline />,
    "#/scan": <Scan />,
    "#/chat": <Chat />,
    "#/drug": <DrugChecker />,
    "#/simplify": <Simplify />,
    "#/journal": <Journal />,
    "#/meditate": <Meditation />,
    "#/care":
      me.role === "family" ? (
        <FamilyDash />
      ) : (
        <CareDash />
      ),
    "#/family": <FamilyDash />,
    "#/settings": <Settings />,
    "#/notifs": <Notifications />,
    "#/reminders": <Reminders />,
    "#/plans": <Plans />,
    "#/report": <Report />,
    "#/help": <Help />,
    "#/demo": <Demo />,
    "#/more": <More />,
    "#/sos": <SOS />,
  };
  if (path === "#/care" && arg)
    screens["#/care"] = <PatientDetail id={Number(arg)} />;
  if (path === "#/plan" && arg)
    screens["#/plan"] = <CreatePlan id={Number(arg)} />;

  const tabs = getAdaptiveTabs(profile, me.role);
  const screen = screens[path];

  // Adaptive header content
  const headerName =
    profile.isElderMode
      ? me.name?.split(" ")[0] || "You"
      : me.patients.length > 1
      ? null // show patient selector
      : null;

  const headerSub =
    profile.isElderMode
      ? "Your recovery"
      : me.role === "caregiver"
      ? `${me.patients.length} patient${me.patients.length !== 1 ? "s" : ""}`
      : `${me.name} · ${me.role}`;

  return (
    <div className="mx-auto flex min-h-screen max-w-[600px] flex-col border-x border-border bg-bg">
      {/* Skip link */}
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      <OfflineBanner />

      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-card/90 px-4 py-2 backdrop-blur">
        <button
          aria-label="Go to home screen"
          onClick={() =>
            go(
              me.role === "caregiver"
                ? "#/care"
                : me.role === "family"
                ? "#/family"
                : "#/home"
            )
          }
          className="flex min-h-[44px] items-center gap-2 text-[15px] font-bold tracking-tight text-ink"
        >
          <span
            aria-hidden="true"
            className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-white"
          >
            <Icon name="logo" size={18} />
          </span>
          {profile.isElderMode ? (
            <span>
              Sathi{" "}
              <span className="text-xs font-normal text-muted-fg">
                · {headerName}
              </span>
            </span>
          ) : (
            "Sathi"
          )}
        </button>

        <div className="flex items-center gap-2">
          {/* Elder mode: SOS quick-access pinned in header */}
          {profile.isElderMode && (
            <button
              onClick={() => go("#/sos")}
              aria-label="Emergency SOS"
              className="grid min-h-[44px] min-w-[44px] place-items-center rounded-full bg-danger text-white"
            >
              <Icon name="sos" size={18} />
            </button>
          )}

          {/* Patient selector or name badge */}
          {!profile.isElderMode && me.patients.length > 1 ? (
            <select
              aria-label="Select patient"
              value={pid}
              onChange={(e) => setPid(Number(e.target.value))}
              className="min-h-[44px] rounded-full bg-secondary px-3 py-1 text-xs font-bold text-primary"
            >
              {me.patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-xs text-muted-fg">{headerSub}</span>
          )}
        </div>
      </header>

      {/* Main content */}
      <main
        id="main"
        className={`flex-1 p-4 pb-safe ${profile.isElderMode ? "elder-mode" : ""}`}
      >
        {screen ?? (
          <div className="grid gap-3 py-10 text-center">
            <p className="text-4xl" aria-hidden="true">
              🧭
            </p>
            <h2 className="font-extrabold">Page not found</h2>
            <p className="text-sm text-muted-fg">
              That link doesn't exist. Back to your recovery home?
            </p>
            <button
              onClick={() => go("#/home")}
              className="mx-auto min-h-[44px] rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white"
            >
              Go home
            </button>
          </div>
        )}
      </main>

      {/* Adaptive bottom nav */}
      <nav
        aria-label="Primary navigation"
        className="glass-nav fixed bottom-0 left-1/2 w-full max-w-[600px] -translate-x-1/2 border-t border-border print:hidden"
      >
        <div className="mb-safe-nav flex">
          {tabs.map((tb) => (
            <button
              key={tb.path}
              onClick={() => go(tb.path)}
              aria-label={tb.ariaLabel}
              aria-current={path === tb.path ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 ${
                profile.isElderMode ? "text-sm" : "text-xs"
              } font-semibold ${
                path === tb.path ? "text-primary" : "text-muted-fg"
              }`}
            >
              <span aria-hidden="true">
                <Icon
                  name={tb.icon}
                  size={profile.isElderMode ? 24 : 20}
                />
              </span>
              {t(me.language, tb.label) || tb.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
