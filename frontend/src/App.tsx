import { AppProvider, go, useApp, useHash } from "./lib/store";
import { OfflineBanner } from "./components/ui";
import { Icon } from "./components/icons";
import { useEffect } from "react";
import { Login, Register, Onboarding } from "./screens/auth";
import { Home, Medicines, Symptoms, Schedule, Progress, Followups, Timeline } from "./screens/tabs";
import { Scan, Chat, DrugChecker, Simplify } from "./screens/tools";
import { SOS } from "./screens/sos";
import { Journal, Meditation } from "./screens/well";
import { CareDash, PatientDetail, CreatePlan, FamilyDash } from "./screens/care";
import { Settings, Notifications, Help, Demo, Reminders, Plans, Report } from "./screens/more";
import { t } from "./lib/i18n";
import { checkDueDoses } from "./lib/notify";

const TABS: { path: string; label: string; icon: string; roles: string[] }[] = [
  { path: "#/home", label: "home", icon: "home", roles: ["patient"] },
  { path: "#/meds", label: "meds", icon: "pill", roles: ["patient"] },
  { path: "#/chat", label: "chat", icon: "chat", roles: ["patient", "caregiver", "family"] },
  { path: "#/care", label: "care", icon: "users", roles: ["caregiver", "patient"] },
  { path: "#/family", label: "family", icon: "users", roles: ["family", "patient"] },
  { path: "#/more", label: "more", icon: "grid", roles: ["patient", "caregiver", "family"] },
];

function More() {
  const items: [string, string, string, string][] = [
    ["#/symptoms", "Symptoms", "Log and review symptoms", "pulse"],
    ["#/schedule", "Schedule", "Medicines and tasks for today", "calendar"],
    ["#/progress", "Progress", "Adherence and timeline", "chart"],
    ["#/followups", "Follow-ups", "Appointments and visits", "calendar"],
    ["#/scan", "Scan prescription", "Extract medicines from photo", "scan"],
    ["#/drug", "Drug check", "Interaction review", "shield"],
    ["#/simplify", "Simplify jargon", "Plain-language explanations", "book"],
    ["#/journal", "Journal", "Mood, energy and notes", "file"],
    ["#/meditate", "Breathing", "Guided recovery exercise", "clock"],
    ["#/timeline", "Timeline", "Full recovery record", "file"],
    ["#/reminders", "Reminders", "Manage notifications", "bell"],
    ["#/plans", "Discharge plans", "Hospital instructions", "file"],
    ["#/report", "Recovery report", "Summary for care team", "file"],
    ["#/notifs", "Notifications", "Alerts and updates", "bell"],
    ["#/settings", "Settings", "Language, theme, access", "gear"],
    ["#/help", "Help", "Support and guidance", "book"],
    ["#/demo", "Judge demo", "Guided evaluation flow", "check"],
    ["#/sos", "Emergency SOS", "Urgent help and contacts", "sos"],
  ];
  return (
    <div className="grid gap-2">
      <h2 className="text-xl font-bold tracking-tight">More</h2>
      <p className="text-[13px] text-muted-fg">All recovery tools in one place.</p>
      {items.map(([p, title, sub, ic]) => (
        <button key={p} onClick={() => go(p)} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left shadow-sm active:scale-[0.99]">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><Icon name={ic} size={18} /></span>
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{title}</span><span className="block truncate text-xs text-muted-fg">{sub}</span></span>
          <span className="text-muted-fg"><Icon name="arrow" size={16} /></span>
        </button>
      ))}
    </div>
  );
}

function Shell() {
  const { me, pid, setPid } = useApp();
  const hash = useHash();
  // Hooks must run unconditionally — before any early return.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", me?.theme === "dark");
    try { localStorage.setItem("@sathi_theme", me?.theme === "dark" ? "dark" : "light"); } catch { /* noop */ }
  }, [me?.theme]);
  useEffect(() => {
    if (!me || !pid) return;
    checkDueDoses(pid);
    const id = setInterval(() => checkDueDoses(pid), 60000);
    return () => clearInterval(id);
  }, [me, pid]);
  const [path, arg] = (hash.split("?")[0]).split("/").length >= 3
    ? [`#/${hash.split("?")[0].split("/")[1]}`, hash.split("?")[0].split("/")[2]]
    : [hash.split("?")[0], ""];
  // Redirect side-effect must not run during render (hook stays unconditional).
  useEffect(() => {
    if ((path === "#/" || path === "") && me) {
      go(me.role === "caregiver" ? "#/care" : me.role === "family" ? "#/family" : "#/home");
    }
  }, [path, me]);

  if (!me) {
    if (path === "#/register") return <Register />;
    if (path === "#/demo") return <div className="mx-auto max-w-[600px] p-4"><Demo /></div>;
    return <Login />;
  }

  const screens: Record<string, React.ReactNode> = {
    "#/onboarding": <Onboarding />, "#/home": <Home />, "#/meds": <Medicines />, "#/symptoms": <Symptoms />,
    "#/schedule": <Schedule />, "#/progress": <Progress />, "#/followups": <Followups />, "#/timeline": <Timeline />,
    "#/scan": <Scan />, "#/chat": <Chat />, "#/drug": <DrugChecker />, "#/simplify": <Simplify />,
    "#/journal": <Journal />, "#/meditate": <Meditation />, "#/care": me.role === "family" ? <FamilyDash /> : <CareDash />,
    "#/family": <FamilyDash />, "#/settings": <Settings />, "#/notifs": <Notifications />,
    "#/reminders": <Reminders />, "#/plans": <Plans />, "#/report": <Report />,
    "#/help": <Help />, "#/demo": <Demo />, "#/more": <More />, "#/sos": <SOS />,
  };
  if (path === "#/care" && arg) screens["#/care"] = <PatientDetail id={Number(arg)} />;
  if (path === "#/plan" && arg) screens["#/plan"] = <CreatePlan id={Number(arg)} />;

  const tabs = TABS.filter((t) => t.roles.includes(me.role));
  const screen = screens[path];
  return (
    <div className="mx-auto flex min-h-screen max-w-[600px] flex-col border-x border-border bg-bg">
      <a href="#main" className="skip-link">Skip to content</a>
      <OfflineBanner />
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-card/90 px-4 py-2 backdrop-blur">
        <button aria-label="Go home" onClick={() => go("#/home")} className="flex min-h-[44px] items-center gap-2 text-[15px] font-bold tracking-tight text-ink">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-white"><Icon name="logo" size={18} /></span>
          Sathi
        </button>
        {me.patients.length > 1 ? (
          <select aria-label="Select patient" value={pid} onChange={(e) => setPid(Number(e.target.value))} className="min-h-[44px] rounded-full bg-secondary px-3 py-1 text-xs font-bold text-primary">
            {me.patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        ) : <span className="text-xs text-muted-fg">{me.name} · {me.role}</span>}
      </div>
      <main id="main" className="flex-1 p-4 pb-safe">{screen ?? (
        <div className="grid gap-3 py-10 text-center">
          <p className="text-4xl" aria-hidden="true">🧭</p>
          <h2 className="font-extrabold">Page not found</h2>
          <p className="text-sm text-muted-fg">That link doesn't exist. Back to your recovery home?</p>
          <button onClick={() => go("#/home")} className="mx-auto min-h-[44px] rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white">Go home</button>
        </div>
      )}</main>
      <nav aria-label="Primary" className="glass-nav fixed bottom-0 left-1/2 w-full max-w-[600px] -translate-x-1/2 border-t border-border print:hidden">
        <div className="mb-safe-nav flex">
          {tabs.map((tb) => (
            <button key={tb.path} onClick={() => go(tb.path)} aria-current={path === tb.path ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-semibold ${path === tb.path ? "text-primary" : "text-muted-fg"}`}>
              <span aria-hidden="true"><Icon name={tb.icon} size={20} /></span>{t(me.language, tb.label)}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

export default function App() {
  return <AppProvider><Shell /></AppProvider>;
}
