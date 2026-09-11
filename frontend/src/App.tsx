import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { AppProvider, go, useApp, useHash } from "./lib/store";
import { OfflineBanner } from "./components/ui";
import { Onboarding } from "./screens/onboarding";
import { Login } from "./screens/login";
import { Register } from "./screens/register";
import { Medicines } from "./screens/medicines";
import { Symptoms } from "./screens/symptoms";
import { Schedule, Progress, Followups, Timeline } from "./screens/tabs";
import { useAdaptiveProfile, getAdaptiveClasses } from "./lib/useAdaptiveProfile";
import { Scan, DrugChecker, Simplify } from "./screens/tools";
import { SOS } from "./screens/sos";
import { Journal, Meditation } from "./screens/well";
import { PatientDetail, CreatePlan } from "./screens/care";
import { Settings, Notifications, Help, Demo, Reminders, Plans, Report } from "./screens/more";
import { checkDueDoses } from "./lib/notify";
import { api } from "./lib/api";
import { OSHeader, OSBottomNav, JudgeDemoBar } from "./components/os";
import { PersonalToday, ClinicalHealth, SathiEngine, FamilyCircle, MoreSettings } from "./components/views";
import { VisitSummaryModal, WhatChangedModal, InboxModal, ClipboardModal, VaultModal } from "./components/modals";

// Health-OS primary tabs. Patient sees all 5; caregiver sees
// family/health/more+sathi; family sees family/sathi/more.
// Elder cap (maxNavItems) is enforced in OSBottomNav.
export const TABS: { path: string; label: string; roles: string[] }[] = [
  { path: "#/today", label: "Today", roles: ["patient"] },
  { path: "#/health", label: "Health", roles: ["patient", "caregiver"] },
  { path: "#/sathi", label: "Sathi", roles: ["patient", "caregiver", "family"] },
  { path: "#/family", label: "Family", roles: ["patient", "caregiver", "family"] },
  { path: "#/more", label: "More", roles: ["patient", "caregiver", "family"] },
];

function Shell() {
  const { me, pid } = useApp();
  const hash = useHash();
  const profile = useAdaptiveProfile();
  const [lastTab, setLastTab] = useState("#/today");
  const [todayCount, setTodayCount] = useState(0);
  const [alertCount, setAlertCount] = useState(0);

  // Hooks must run unconditionally — before any early return.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", me?.theme === "dark");
    try { localStorage.setItem("@sathi_theme", me?.theme === "dark" ? "dark" : "light"); } catch { /* noop */ }
  }, [me?.theme]);
  // Apply adaptive CSS classes (elder, reduced-motion) to the document element
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

  const raw = hash.split("?")[0];
  const segs = raw.split("/");
  const path = segs.length >= 3 ? `#/${segs[1]}` : raw;
  const arg = segs.length >= 3 ? segs[2] : "";

  const homeFor = !me ? "#/today" : me.role === "patient" ? "#/today" : "#/family";

  // Remember the last non-modal tab so #/m/* overlays render over it.
  useEffect(() => {
    if (path !== "#/m" && raw) setLastTab(raw);
  }, [raw, path]);
  // Default redirect by role (side-effect, never during render).
  useEffect(() => {
    if ((path === "#/" || path === "") && me) go(homeFor);
  }, [path, me, homeFor]);
  // Badge counts for the bottom nav.
  useEffect(() => {
    if (!me || !pid) return;
    api.dosesToday(pid).then((d) => setTodayCount(d.filter((x) => x.status === "pending").length)).catch(() => {});
    if (me.role !== "patient") {
      api.cgPatients().then((l) => setAlertCount(l.filter((p) => p.risk === "high" || p.adherence < 60).length)).catch(() => {});
    } else {
      setAlertCount(0);
    }
  }, [me, pid]);

  if (!me) {
    if (path === "#/register") return <Register />;
    if (path === "#/demo") return <div className="mx-auto max-w-[600px] p-4"><Demo /></div>;
    return <Login />;
  }

  // When a modal deep-link is open, resolve the screen underneath from lastTab.
  const lastRaw = lastTab.split("?")[0];
  const lastSegs = lastRaw.split("/");
  const basePath = path === "#/m" ? (lastSegs.length >= 3 ? `#/${lastSegs[1]}` : lastRaw) : path;
  const baseArg = path === "#/m" ? (lastSegs.length >= 3 ? lastSegs[2] : "") : arg;

  const screens: Record<string, ReactNode> = {
    // ── Health-OS tabs ──
    "#/today": <PersonalToday />, "#/health": <ClinicalHealth />, "#/sathi": <SathiEngine />,
    "#/family": <FamilyCircle />, "#/more": <MoreSettings />,
    // ── Legacy aliases (no dead links from old screens) ──
    "#/onboarding": <Onboarding />, "#/home": <PersonalToday />, "#/meds": <Medicines />,
    "#/symptoms": <Symptoms />, "#/chat": <SathiEngine />, "#/care": <FamilyCircle />,
    "#/schedule": <Schedule />, "#/progress": <Progress />, "#/followups": <Followups />, "#/timeline": <Timeline />,
    "#/scan": <Scan />, "#/drug": <DrugChecker />, "#/simplify": <Simplify />,
    "#/journal": <Journal />, "#/meditate": <Meditation />,
    "#/settings": <Settings />, "#/notifs": <Notifications />,
    "#/reminders": <Reminders />, "#/plans": <Plans />, "#/report": <Report />,
    "#/help": <Help />, "#/demo": <Demo />, "#/sos": <SOS />,
  };
  if (basePath === "#/care" && baseArg) screens["#/care"] = <PatientDetail id={Number(baseArg)} />;
  if (basePath === "#/plan" && baseArg) screens["#/plan"] = <CreatePlan id={Number(baseArg)} />;

  const screen = screens[basePath];
  const closeModal = () => go(lastTab);
  const modal = path === "#/m" && arg === "inbox" ? <InboxModal onClose={closeModal} />
    : path === "#/m" && arg === "clipboard" ? <ClipboardModal onClose={closeModal} />
    : path === "#/m" && arg === "visit" ? <VisitSummaryModal onClose={closeModal} />
    : path === "#/m" && arg === "what" ? <WhatChangedModal onClose={closeModal} />
    : path === "#/m" && arg === "vault" ? <VaultModal onClose={closeModal} />
    : null;

  return (
    <div className="mx-auto flex min-h-screen max-w-[600px] flex-col border-x border-border bg-bg">
      <a href="#main" className="skip-link">Skip to content</a>
      <OfflineBanner />
      <OSHeader />
      <main id="main" className="flex-1 p-4 pb-safe">
        <JudgeDemoBar />
        {screen ?? (
          <div className="grid gap-3 py-10 text-center">
            <p className="text-4xl" aria-hidden="true">🧭</p>
            <h2 className="font-extrabold">Page not found</h2>
            <p className="text-sm text-muted-fg">That link doesn't exist. Back to your recovery home?</p>
            <button onClick={() => go(homeFor)} className="mx-auto min-h-[44px] rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white">Go home</button>
          </div>
        )}
      </main>
      {modal}
      <OSBottomNav todayCount={todayCount} alertCount={alertCount} />
    </div>
  );
}

export default function App() {
  return <AppProvider><Shell /></AppProvider>;
}
