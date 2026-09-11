/**
 * App.tsx — Spatial Accessible Navigation Shell
 *
 * Adheres to:
 * - Sathi_UI_Overhaul_Master_Prompt.md
 * - WCAG 2.1 AAA accessibility rules
 * - Lucide React stroke iconography (zero emojis in production UI)
 * - Spatial Elevation & Backdrop Blur Glass System
 * - Live Adaptive Persona Switching & Theme Toggle
 */
import { useEffect, useState, type ReactNode } from "react";
import { AppProvider, go, useApp, useHash } from "./lib/store";
import { OfflineBanner, SonnerToaster } from "./components/ui";
import { ThemeToggle } from "./components/ThemeToggle";
import { ProfileSwitcher } from "./components/ProfileSwitcher";
import {
  Home as HomeIcon,
  Pill,
  Calendar,
  MessageSquare,
  AlertOctagon,
  Users,
  LayoutGrid,
  Activity,
  TrendingUp,
  FileText,
  Camera,
  ShieldAlert,
  BookOpen,
  Heart,
  Wind,
  Bell,
  Settings as SettingsIcon,
  HelpCircle,
  Award,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ShieldPlus,
  Compass,
} from "lucide-react";

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
import { CareDash, PatientDetail, CreatePlan, FamilyDash } from "./screens/care";
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
import { cn } from "./lib/utils";

// ─── Tab definitions ──────────────────────────────────────────────────────────

type TabDef = {
  path: string;
  label: string;
  icon: any;
  ariaLabel: string;
};

/** Returns the tab set appropriate for this profile.
 *  Elder profiles are capped at 5 items (PRD & WBS hard limit). */
function getAdaptiveTabs(profile: AdaptiveProfile, role: string): TabDef[] {
  // Elder mode: 5 items max
  if (profile.isElderMode) {
    return [
      { path: "#/home", label: "Today", icon: HomeIcon, ariaLabel: "Today's recovery tasks" },
      { path: "#/meds", label: "Medicines", icon: Pill, ariaLabel: "Medicines and doses" },
      { path: "#/followups", label: "Visits", icon: Calendar, ariaLabel: "Doctor appointments" },
      { path: "#/chat", label: "Ask Sathi", icon: MessageSquare, ariaLabel: "Ask Sathi voice assistant" },
      { path: "#/sos", label: "Emergency", icon: AlertOctagon, ariaLabel: "Emergency SOS help" },
    ];
  }

  // Caregiver / family
  if (role === "caregiver") {
    return [
      { path: "#/care", label: "Patients", icon: Users, ariaLabel: "Caregiver patient dashboard" },
      { path: "#/chat", label: "Chat", icon: MessageSquare, ariaLabel: "Care team chat" },
      { path: "#/more", label: "More", icon: LayoutGrid, ariaLabel: "More clinical tools" },
    ];
  }
  if (role === "family") {
    return [
      { path: "#/family", label: "Family", icon: Users, ariaLabel: "Family care dashboard" },
      { path: "#/chat", label: "Chat", icon: MessageSquare, ariaLabel: "Care chat" },
      { path: "#/more", label: "More", icon: LayoutGrid, ariaLabel: "More options" },
    ];
  }

  // Standard patient
  return [
    { path: "#/home", label: "Home", icon: HomeIcon, ariaLabel: "Today's recovery overview" },
    { path: "#/meds", label: "Meds", icon: Pill, ariaLabel: "Medicines" },
    { path: "#/chat", label: "Ask Sathi", icon: MessageSquare, ariaLabel: "Ask Sathi assistant" },
    { path: "#/care", label: "Care", icon: Users, ariaLabel: "Care circle" },
    { path: "#/more", label: "More", icon: LayoutGrid, ariaLabel: "More features" },
  ];
}

// ─── More screen (progressive disclosure) ────────────────────────────────────

type MoreItem = [string, string, string, any]; // [path, title, subtitle, Icon]

const RECOVERY_ITEMS: MoreItem[] = [
  ["#/symptoms", "Symptoms", "Log and review symptoms", Activity],
  ["#/schedule", "Schedule", "Medicines and tasks for today", Calendar],
  ["#/progress", "Progress", "Adherence and timeline", TrendingUp],
  ["#/followups", "Follow-ups", "Appointments and visits", Calendar],
  ["#/timeline", "Timeline", "Full recovery record", FileText],
];

const TOOLS_ITEMS: MoreItem[] = [
  ["#/scan", "Scan prescription", "Extract medicines from photo", Camera],
  ["#/drug", "Drug check", "Interaction review", ShieldAlert],
  ["#/simplify", "Simplify jargon", "Plain-language explanations", BookOpen],
  ["#/journal", "Journal", "Mood, energy and notes", Heart],
  ["#/meditate", "Breathing", "Guided recovery exercise", Wind],
  ["#/report", "Recovery report", "Summary for care team", FileCheck2(FileText)],
  ["#/plans", "Discharge plans", "Hospital instructions", FileText],
];

function FileCheck2(DefaultIcon: any) {
  return DefaultIcon;
}

const APP_ITEMS: MoreItem[] = [
  ["#/reminders", "Reminders", "Manage notifications", Bell],
  ["#/notifs", "Notifications", "Alerts and updates", Bell],
  ["#/settings", "Settings", "Language, theme, access", SettingsIcon],
  ["#/help", "Help", "Support and guidance", HelpCircle],
  ["#/demo", "Judge demo", "Guided evaluation flow", Award],
  ["#/sos", "Emergency SOS", "Urgent help and contacts", AlertOctagon],
];

const CAREGIVER_MORE_ITEMS: MoreItem[] = [
  ["#/settings", "Settings", "Language, theme, access", SettingsIcon],
  ["#/notifs", "Notifications", "Alerts and updates", Bell],
  ["#/help", "Help", "Support and guidance", HelpCircle],
];

function MoreItemBtn({ item }: { item: MoreItem }) {
  const [p, title, sub, IconComp] = item;
  return (
    <button
      type="button"
      onClick={() => go(p)}
      className="flex min-h-[48px] w-full items-center gap-3 rounded-2xl border border-border bg-surface p-3.5 text-left shadow-elev-1 transition-all hover:bg-surface-sunken hover:shadow-elev-2 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      aria-label={`${title} — ${sub}`}
    >
      <span
        aria-hidden="true"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"
      >
        <IconComp className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink">{title}</span>
        <span className="block truncate text-xs text-ink-muted">{sub}</span>
      </span>
      <ChevronRight className="h-4 w-4 text-ink-muted shrink-0" aria-hidden="true" />
    </button>
  );
}

function MoreSection({ title, items }: { title: string; items: MoreItem[] }) {
  return (
    <section aria-label={title} className="space-y-2">
      <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted px-1">
        {title}
      </h3>
      <div className="grid gap-2">
        {items.map((item) => (
          <MoreItemBtn key={item[0]} item={item} />
        ))}
      </div>
    </section>
  );
}

export function More() {
  const { me } = useApp();
  const profile = useAdaptiveProfile();
  const role = me?.role ?? "patient";
  const [expanded, setExpanded] = useState(false);

  // Elder mode: max 4 items, large buttons
  if (profile.isElderMode) {
    const elderItems: MoreItem[] = [
      ["#/symptoms", "Log Symptoms", "Tell us how you feel today", Activity],
      ["#/journal", "Daily Journal", "Track your mood and rest", Heart],
      ["#/meditate", "Breathing Exercise", "Calm 4-7-8 breathing", Wind],
      ["#/help", "Audio Help", "Listen to guided assistance", HelpCircle],
    ];
    return (
      <div className="grid gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-ink">More Tools</h2>
          <p className="mt-1 text-base text-ink-muted">Essential recovery tools.</p>
        </div>
        <div className="grid gap-3">
          {elderItems.map((item) => (
            <MoreItemBtn key={item[0]} item={item} />
          ))}
        </div>
      </div>
    );
  }

  // Caregiver mode
  if (role === "caregiver" || role === "family") {
    return (
      <div className="grid gap-4">
        <h2 className="text-xl font-bold tracking-tight text-ink">More</h2>
        <div className="grid gap-2">
          {CAREGIVER_MORE_ITEMS.map((item) => (
            <MoreItemBtn key={item[0]} item={item} />
          ))}
        </div>
      </div>
    );
  }

  // Standard patient
  return (
    <div className="grid gap-5">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-ink">More</h2>
        <p className="mt-0.5 text-xs text-ink-muted">All recovery tools in one place.</p>
      </div>

      <MoreSection title="Recovery" items={RECOVERY_ITEMS} />

      {expanded ? (
        <>
          <MoreSection title="Tools" items={TOOLS_ITEMS} />
          <MoreSection title="App Settings" items={APP_ITEMS} />
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="flex items-center justify-center gap-1.5 min-h-[44px] rounded-xl border border-dashed border-border py-2 text-xs font-semibold text-ink-muted hover:text-ink hover:bg-surface-sunken transition-colors"
          >
            <span>Show less</span>
            <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex items-center justify-center gap-1.5 min-h-[44px] rounded-xl border border-dashed border-border py-2 text-xs font-semibold text-ink-muted hover:text-ink hover:bg-surface-sunken transition-colors"
          aria-label="Show all tools and app settings"
        >
          <span>Tools & settings</span>
          <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
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
    hash.split("?")[0].split("/").length >= 3
      ? [`#/${hash.split("?")[0].split("/")[1]}`, hash.split("?")[0].split("/")[2]]
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
        <div className="mx-auto max-w-[640px] p-4">
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
    "#/ask": <Chat />,
    "#/drug": <DrugChecker />,
    "#/simplify": <Simplify />,
    "#/journal": <Journal />,
    "#/meditate": <Meditation />,
    "#/care": me.role === "family" ? <FamilyDash /> : <CareDash />,
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
  if (path === "#/care" && arg) screens["#/care"] = <PatientDetail id={Number(arg)} />;
  if (path === "#/plan" && arg) screens["#/plan"] = <CreatePlan id={Number(arg)} />;

  const tabs = getAdaptiveTabs(profile, me.role);
  const screen = screens[path];

  const headerName = profile.isElderMode
    ? me.name?.split(" ")[0] || "You"
    : null;

  return (
    <div className="mx-auto flex min-h-screen max-w-[640px] flex-col border-x border-border bg-bg text-ink relative">
      {/* Skip to Content Landmark */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 z-toast rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white shadow-elev-3"
      >
        Skip to content
      </a>

      <OfflineBanner />

      {/* Spatial Sticky Header with Backdrop Blur */}
      <header className="sticky top-0 z-nav flex items-center justify-between border-b border-border glass-panel px-4 py-2.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
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
            className="flex min-h-[44px] items-center gap-2 text-base font-bold tracking-tight text-ink hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
          >
            <span
              aria-hidden="true"
              className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-white shadow-elev-1"
            >
              <ShieldPlus className="h-5 w-5" />
            </span>
            <div className="flex flex-col text-left">
              <span className="leading-none">Sathi</span>
              {profile.isElderMode && headerName && (
                <span className="text-[11px] font-normal text-ink-muted">
                  Recovery · {headerName}
                </span>
              )}
            </div>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Patient Selector for Caregivers */}
          {!profile.isElderMode && me.patients && me.patients.length > 1 && (
            <select
              aria-label="Select patient"
              value={pid}
              onChange={(e) => setPid(Number(e.target.value))}
              className="min-h-[38px] rounded-xl border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-ink shadow-elev-1"
            >
              {me.patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}

          {/* Elder SOS pinned header button */}
          {profile.isElderMode && (
            <button
              type="button"
              onClick={() => go("#/sos")}
              aria-label="Emergency SOS — tap for urgent help"
              className="grid min-h-[44px] min-w-[44px] place-items-center rounded-xl bg-danger text-white shadow-elev-2 active:scale-95"
            >
              <AlertOctagon className="h-5 w-5" />
            </button>
          )}

          {/* Adaptive Profile Switcher (Judge / Persona Switcher) */}
          <ProfileSwitcher />

          {/* Real Animated Theme Toggle */}
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content Landmark */}
      <main id="main-content" tabIndex={-1} className="flex-1 p-4 pb-safe outline-none">
        {screen ?? (
          <div className="grid gap-3 py-16 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-surface-sunken text-ink-muted">
              <Compass className="h-8 w-8" />
            </span>
            <h2 className="text-xl font-bold text-ink">Page not found</h2>
            <p className="text-sm text-ink-muted">
              The page you requested could not be located.
            </p>
            <button
              type="button"
              onClick={() => go("#/home")}
              className="mx-auto mt-2 min-h-[44px] rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-elev-1 hover:brightness-105"
            >
              Back to Home
            </button>
          </div>
        )}
      </main>

      {/* Spatial Fixed Bottom Navigation with Backdrop Blur */}
      <nav
        aria-label="Primary navigation"
        className="fixed bottom-0 left-1/2 w-full max-w-[640px] -translate-x-1/2 border-t border-border glass-panel z-nav print:hidden shadow-elev-2"
      >
        <div className="flex items-center justify-around px-2 py-1.5 mb-safe-nav">
          {tabs.map((tb) => {
            const IconComponent = tb.icon;
            const active = path === tb.path;
            return (
              <button
                key={tb.path}
                type="button"
                onClick={() => go(tb.path)}
                aria-label={tb.ariaLabel}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-1 rounded-xl transition-all duration-150 select-none",
                  profile.isElderMode ? "min-h-[56px] py-1.5" : "min-h-[46px] py-1",
                  active
                    ? "text-primary font-bold"
                    : "text-ink-muted hover:text-ink hover:bg-surface-sunken/40"
                )}
              >
                <IconComponent
                  className={cn(
                    "transition-transform",
                    profile.isElderMode ? "h-6 w-6" : "h-5 w-5",
                    active && "scale-105 stroke-[2.5]"
                  )}
                  aria-hidden="true"
                />
                <span className={cn(profile.isElderMode ? "text-xs font-bold" : "text-[11px]")}>
                  {t(me.language, tb.label) || tb.label}
                </span>
              </button>
            );
          })}
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
      <SonnerToaster richColors position="top-center" />
    </AppProvider>
  );
}
