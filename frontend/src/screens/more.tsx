import { useEffect, useState } from "react";
import { api, tok } from "../lib/api";
import { useApp } from "../lib/store";
import { Badge, Btn, Card, Empty, Input, Area, Page, Toggle } from "../components/ui";
import { askPermission } from "../lib/notify";

export function Settings() {
  const { me, pid, refresh, logout } = useApp();
  const [lang, setLang] = useState(me?.language || "en");
  const [theme, setTheme] = useState(me?.theme || "light");
  const [remOn, setRemOn] = useState(localStorage.getItem("@sathi_remind_off") !== "1");
  useEffect(() => { document.documentElement.classList.toggle("dark", theme === "dark"); }, [theme]);
  const [anchors, setAnchors] = useState(me?.anchor_times || "");
  const [code, setCode] = useState("");
  const [share, setShare] = useState("");
  const [msg, setMsg] = useState("");
  const save = async () => {
    try { await api.settings({ language: lang, theme, anchor_times: anchors }); await refresh(); setMsg("Saved"); }
    catch (e) { setMsg(e instanceof Error ? e.message : "failed"); }
  };
  return (
    <div className="grid gap-3">
      <Page title="Settings" />
      <Card><div className="grid gap-2">
        <label className="text-xs font-bold">Language</label>
        <div className="flex gap-2">{["en", "hi", "kn", "ta", "es"].map((l) => (
          <button key={l} onClick={() => setLang(l)} className={`rounded-full px-3 py-1.5 text-xs font-bold ${lang === l ? "bg-primary text-white" : "bg-secondary text-primary"}`}>{l}</button>))}</div>
        <label className="text-xs font-bold">Anchor times (JSON)</label>
        <Input value={anchors} onChange={(e) => setAnchors(e.target.value)} />
        <Toggle on={theme === "dark"} onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))} label="Dark mode" />
        <Toggle on={remOn} onClick={async () => {
          if (!remOn) {
            if (!(await askPermission())) return;
            localStorage.removeItem("@sathi_remind_off");
          } else localStorage.setItem("@sathi_remind_off", "1");
          setRemOn(!remOn);
        }} label="🔔 Medicine reminders" />
        <Btn onClick={save}>Save</Btn>{msg && <p className="text-xs">{msg}</p>}
      </div></Card>
      <Card><h3 className="mb-1 font-bold">Link a patient</h3>
        <div className="flex gap-2"><Input placeholder="DB-XXXXXX" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
          <Btn onClick={async () => { try { await api.connect(code); await refresh(); setMsg("Linked!"); } catch (e) { setMsg(e instanceof Error ? e.message : "invalid"); } }}>Join</Btn></div></Card>
      {pid > 0 && <Card><h3 className="mb-1 font-bold">Share this patient</h3>
        <Btn kind="ghost" onClick={async () => { try { const c = await api.linkCode(pid); setShare(c.code); } catch { /* owner only */ } }}>Show link code</Btn>
        {share && <p className="mt-1 font-mono text-lg font-extrabold">{share}</p>}</Card>}
      <Btn kind="danger" onClick={logout}>Log out ({me?.email})</Btn>
    </div>
  );
}

export function Notifications() {
  const [list, setList] = useState<{ id: number; title: string; body: string; kind: string; read: boolean }[]>([]);
  const load = () => api.notifs().then(setList).catch(() => {});
  useEffect(() => { load(); }, []);
  return (
    <div className="grid gap-3">
      <Page title="Notifications" />
      {list.map((n) => (
        <Card key={n.id} accent={n.read ? undefined : "#7C3AED"}>
          <div className="flex items-center justify-between"><p className="font-bold">{n.title}</p><Badge level={n.kind} /></div>
          <p className="text-sm text-muted-fg">{n.body}</p>
          {!n.read && <button className="mt-1 text-xs font-bold text-primary" onClick={async () => { await api.readNotif(n.id); load(); }}>Mark read</button>}
        </Card>
      ))}
      {list.length === 0 && <Empty text="No notifications." />}
    </div>
  );
}

export function Help() {
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState("");
  return (
    <div className="grid gap-3">
      <Page title="Help & support" />
      <Card><p className="text-sm font-bold">You can say:</p>
        <p className="text-sm text-muted-fg">“What medicines do I need?” · “I have a headache” · “When is my appointment?” · “Open my schedule”</p></Card>
      <Card><div className="grid gap-2">
        <Area rows={3} placeholder="Report a problem or ask for help…" value={msg} onChange={(e) => setMsg(e.target.value)} />
        <Btn onClick={async () => { if (msg) { await api.support("help", msg); setOk("Thanks — we got it."); setMsg(""); } }}>Send</Btn>
        {ok && <p className="text-xs">{ok}</p>}
      </div></Card>
      <p className="text-center text-[11px] text-muted-fg">Sathi supports recovery — it does not diagnose, prescribe, or replace emergency services (112).</p>
    </div>
  );
}

export function Reminders() {
  const { pid } = useApp();
  const [list, setList] = useState<{ id: number; message: string; scheduled_for: string; channel: string; status: string }[]>([]);
  const [msg, setMsg] = useState("");
  const [when, setWhen] = useState("");
  const load = () => api.reminders(pid).then(setList).catch(() => {});
  useEffect(() => { if (pid) load(); }, [pid]);
  return (
    <div className="grid gap-3">
      <Page title="Reminders" sub="Custom nudges beyond the med schedule" />
      {list.map((r) => (
        <Card key={r.id}><div className="flex items-center justify-between gap-2">
          <div><p className="text-sm font-bold">{r.message}</p>
            <p className="text-xs text-muted-fg">{r.scheduled_for} · {r.channel} · {r.status}</p></div>
          <button className="text-xs font-bold text-red-500" onClick={async () => { await api.delReminder(pid, r.id); load(); }}>Delete</button>
        </div></Card>
      ))}
      {list.length === 0 && <Empty text="No custom reminders." />}
      <Card><div className="grid gap-2">
        <Input placeholder="e.g. Evening walk at 6pm" value={msg} onChange={(e) => setMsg(e.target.value)} />
        <Input placeholder="When (e.g. 06:00 PM daily)" value={when} onChange={(e) => setWhen(e.target.value)} />
        <Btn onClick={async () => { if (msg) { await api.addReminder(pid, { message: msg, scheduled_for: when }); setMsg(""); setWhen(""); load(); } }}>Add reminder</Btn>
      </div></Card>
    </div>
  );
}

export function Plans() {
  const { pid } = useApp();
  const [list, setList] = useState<{ id: number; hospital: string; version: number; is_active: boolean; data: string }[]>([]);
  useEffect(() => { if (pid) api.plans(pid).then(setList).catch(() => {}); }, [pid]);
  const pretty = (d: string) => {
    try {
      const j = JSON.parse(d);
      return [j.notes, (j.medicines || []).map((m: { name: string }) => m.name).join(", ")].filter(Boolean).join(" · ");
    } catch { return d.slice(0, 200); }
  };
  return (
    <div className="grid gap-3">
      <Page title="Discharge plans" sub="Versioned, newest active first" />
      {list.map((p) => (
        <Card key={p.id} accent={p.is_active ? "#10B981" : undefined}>
          <div className="flex items-center justify-between"><p className="font-bold">v{p.version} · {p.hospital || "Hospital"}</p>
            {p.is_active && <Badge level="taken" />}</div>
          <p className="mt-1 text-sm text-muted-fg">{pretty(p.data)}</p>
        </Card>
      ))}
      {list.length === 0 && <Empty text="No plans yet — your caregiver can create one." />}
    </div>
  );
}

export function Report() {
  const { me, pid } = useApp();
  const [data, setData] = useState<{ adherence: number; streak: number; xp: number; taken_today: number; total: number; next_followup: string | null } | null>(null);
  const [meds, setMeds] = useState<{ name: string; dose: string; time: string }[]>([]);
  const [tl, setTl] = useState<{ description: string; event_type: string; severity?: string | null }[]>([]);
  const [aiRep, setAiRep] = useState<string | null>(null);

  useEffect(() => {
    if (!pid) return;
    api.stats(pid).then(setData).catch(() => {});
    api.meds(pid).then(setMeds).catch(() => {});
    api.timeline(pid).then((t) => setTl(t.slice(0, 25))).catch(() => {});
    api.aiReport(pid).then((r) => setAiRep(r.report)).catch(() => setAiRep("AI report unavailable."));
  }, [pid]);

  return (
    <div className="grid gap-3">
      <Page title="Recovery report" sub="For your next doctor visit" right={<Btn kind="ghost" onClick={() => window.print()}>🖨 Print</Btn>} />
      
      <Card>
        <h3 className="mb-2 font-bold text-primary">✨ Clinical AI Summary</h3>
        {!aiRep ? (
          <div className="grid gap-2">
            <div className="skeleton h-4 w-full"></div>
            <div className="skeleton h-4 w-5/6"></div>
            <div className="skeleton h-4 w-4/6"></div>
          </div>
        ) : (
          <div className="text-sm whitespace-pre-wrap">{aiRep}</div>
        )}
      </Card>

      <Card>
        <h3 className="text-lg font-extrabold">Raw Data</h3>
        <p className="text-sm text-muted-fg">{me?.name} · generated {new Date().toLocaleString()}</p>
        {data && <p className="mt-2 text-sm">Adherence <b>{data.adherence}%</b> · Streak <b>{data.streak}d</b> · XP <b>{data.xp}</b> · Next: <b>{data.next_followup || "—"}</b></p>}
        <h4 className="mt-3 font-bold">Medicines</h4>
        {meds.map((m, i) => <p key={i} className="text-sm">• {m.name} — {m.dose} at {m.time}</p>)}
        <h4 className="mt-3 font-bold">Recent events</h4>
        {tl.map((e, i) => <p key={i} className="text-sm">• {e.description} <span className="text-xs">({e.event_type})</span></p>)}
        <p className="mt-3 text-[11px]">Sathi supports recovery — it does not diagnose or prescribe.</p>
      </Card>
    </div>
  );
}

export function Demo() {
  const { refresh } = useApp();
  const [msg, setMsg] = useState("Initializing demo environment...");

  useEffect(() => {
    const run = async () => {
      try {
        setMsg("Logging in as patient Meena...");
        const r = await api.login({ email: "meena@sathi.demo", password: "demo1234" });
        tok.set(r.token);
        await refresh();
        setMsg("Routing to home...");
        window.location.hash = "#/home?demo=1";
      } catch (e) {
        setMsg("Demo login failed. Make sure the backend is running and db is seeded.");
      }
    };
    run();
  }, [refresh]);

  return (
    <div className="flex h-[80vh] flex-col items-center justify-center gap-4 text-center">
      <div className="skeleton h-16 w-16 rounded-full" />
      <h2 className="text-xl font-extrabold text-primary">Sathi Demo</h2>
      <p className="text-sm font-semibold animate-pulse">{msg}</p>
      <div className="mt-8 rounded-xl bg-card p-4 shadow-sm text-xs text-muted-fg max-w-[250px]">
        This will log you in to the live app as a sample patient and show a guided overlay.
      </div>
    </div>
  );
}
