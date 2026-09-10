import { AppProvider, go, useApp, useHash } from "./lib/store";
import { OfflineBanner } from "./components/ui";
import { useEffect } from "react";
import { Login, Register, Onboarding } from "./screens/auth";
import { Home, Medicines, Symptoms, Schedule, Progress, Followups, Timeline } from "./screens/tabs";
import { Scan, Chat, DrugChecker, Simplify } from "./screens/tools";
import { Journal, Meditation } from "./screens/well";
import { CareDash, PatientDetail, CreatePlan, FamilyDash } from "./screens/care";
import { Settings, Notifications, Help, Demo, Reminders, Plans, Report } from "./screens/more";
import { t } from "./lib/i18n";
import { checkDueDoses } from "./lib/notify";

const TABS: { path: string; label: string; icon: string; roles: string[] }[] = [
  { path: "#/home", label: "home", icon: "🏠", roles: ["patient"] },
  { path: "#/meds", label: "meds", icon: "💊", roles: ["patient"] },
  { path: "#/chat", label: "chat", icon: "💬", roles: ["patient", "caregiver", "family"] },
  { path: "#/care", label: "care", icon: "🧑‍⚕️", roles: ["caregiver", "patient"] },
  { path: "#/family", label: "family", icon: "👪", roles: ["family", "patient"] },
  { path: "#/more", label: "more", icon: "⋯", roles: ["patient", "caregiver", "family"] },
];

function More() {
  const items: [string, string][] = [
    ["#/symptoms", "🩺 Symptoms"], ["#/schedule", "🗓 Schedule"], ["#/progress", "📈 Progress + Timeline"],
    ["#/followups", "📅 Follow-ups"], ["#/scan", "📷 Scan Rx"], ["#/drug", "🛡 Drug check"],
    ["#/simplify", "🔤 Simplify jargon"], ["#/journal", "📔 Journal"], ["#/meditate", "🫁 Breathing"],
    ["#/timeline", "🧾 Timeline"], ["#/reminders", "⏰ Reminders"], ["#/plans", "📋 Discharge plans"],
    ["#/report", "🖨 Recovery report"], ["#/notifs", "🔔 Notifications"], ["#/settings", "⚙ Settings"],
    ["#/help", "❓ Help"], ["#/demo", "▶ Judge demo"],
  ];
  return (
    <div className="grid gap-2">
      <h2 className="text-lg font-extrabold">More</h2>
      {items.map(([p, l]) => (
        <button key={p} onClick={() => go(p)} className="rounded-2xl bg-card p-3 text-left text-sm font-bold shadow-sm active:scale-[0.99]">{l}</button>
      ))}
    </div>
  );
}

function Shell() {
  const { me, pid, setPid } = useApp();
  const hash = useHash();
  // Hooks must run unconditionally — before any early return.
  useEffect(() => { document.documentElement.classList.toggle("dark", me?.theme === "dark"); }, [me?.theme]);
  useEffect(() => {
    if (!me || !pid) return;
    checkDueDoses(pid);
    const id = setInterval(() => checkDueDoses(pid), 60000);
    return () => clearInterval(id);
  }, [me, pid]);
  const [path, arg] = (hash.split("?")[0]).split("/").length >= 3
    ? [`#/${hash.split("?")[0].split("/")[1]}`, hash.split("?")[0].split("/")[2]]
    : [hash.split("?")[0], ""];

  if (!me) {
    if (path === "#/register") return <Register />;
    if (path === "#/demo") return <div className="mx-auto max-w-[600px] p-4"><Demo /></div>;
    return <Login />;
  }
  if (path === "#/" || path === "") { go(me.role === "caregiver" ? "#/care" : me.role === "family" ? "#/family" : "#/home"); }

  const screens: Record<string, React.ReactNode> = {
    "#/onboarding": <Onboarding />, "#/home": <Home />, "#/meds": <Medicines />, "#/symptoms": <Symptoms />,
    "#/schedule": <Schedule />, "#/progress": <Progress />, "#/followups": <Followups />, "#/timeline": <Timeline />,
    "#/scan": <Scan />, "#/chat": <Chat />, "#/drug": <DrugChecker />, "#/simplify": <Simplify />,
    "#/journal": <Journal />, "#/meditate": <Meditation />, "#/care": me.role === "family" ? <FamilyDash /> : <CareDash />,
    "#/family": <FamilyDash />, "#/settings": <Settings />, "#/notifs": <Notifications />,
    "#/reminders": <Reminders />, "#/plans": <Plans />, "#/report": <Report />,
    "#/help": <Help />, "#/demo": <Demo />, "#/more": <More />,
  };
  if (path === "#/care" && arg) screens["#/care"] = <PatientDetail id={Number(arg)} />;
  if (path === "#/plan" && arg) screens["#/plan"] = <CreatePlan id={Number(arg)} />;

  const tabs = TABS.filter((t) => t.roles.includes(me.role));
  return (
    <div className="mx-auto flex min-h-screen max-w-[600px] flex-col">
      <OfflineBanner />
      <div className="flex items-center justify-between px-4 pt-3">
        <button onClick={() => go("#/home")} className="text-lg font-extrabold text-primary">Sathi</button>
        {me.patients.length > 1 ? (
          <select value={pid} onChange={(e) => setPid(Number(e.target.value))} className="rounded-full bg-secondary px-2 py-1 text-xs font-bold text-primary">
            {me.patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        ) : <span className="text-xs text-muted-fg">{me.name} · {me.role}</span>}
      </div>
      <main className="flex-1 p-4 pb-24">{screens[path] ?? <Home />}</main>
      <nav className="fixed bottom-0 left-1/2 w-full max-w-[600px] -translate-x-1/2 border-t border-border bg-card/95 backdrop-blur print:hidden">
        <div className="flex">
          {tabs.map((tb) => (
            <button key={tb.path} onClick={() => go(tb.path)}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-bold ${path === tb.path ? "text-primary" : "text-muted-fg"}`}>
              <span className="text-lg">{tb.icon}</span>{t(me.language, tb.label)}
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
