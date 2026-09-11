import { useState } from "react";
import { api } from "../lib/api";
import { go, useApp } from "../lib/store";
import { Btn, Card, Input } from "../components/ui";
import { Icon } from "../components/icons";

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary text-white"><Icon name="logo" size={24} /></span>
      <div>
        <h1 className="text-[22px] font-bold tracking-tight">Sathi</h1>
        <p className="text-[13px] text-muted-fg">Post-hospital recovery companion</p>
      </div>
    </div>
  );
}

export function Login() {
  const { login } = useApp();
  const [email, setEmail] = useState("meena@sathi.demo");
  const [pw, setPw] = useState("demo1234");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true); setErr("");
    const e = await login(email.trim(), pw);
    setBusy(false);
    e ? setErr(e) : go("#/home");
  };
  return (
    <div className="mx-auto grid max-w-[420px] min-h-screen content-center gap-4 p-6">
      <Brand />
      <Card>
        <div className="grid gap-3">
          <div>
            <h2 className="text-lg font-bold tracking-tight">Welcome back</h2>
            <p className="text-[13px] text-muted-fg">Log in to continue your recovery plan.</p>
          </div>
          <label className="grid gap-1 text-xs font-semibold text-muted-fg">Email
            <Input placeholder="you@example.com" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-muted-fg">Password
            <Input placeholder="••••••••" type="password" autoComplete="current-password" value={pw}
              onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit(); }} />
          </label>
          {err && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs font-semibold text-red-800">{err}</p>}
          <Btn onClick={submit} disabled={busy}>{busy ? "Logging in…" : "Log in"}</Btn>
          <div className="flex items-center justify-between text-[13px]">
            <button className="font-semibold text-primary" onClick={() => go("#/register")}>Create account</button>
            <button className="font-medium text-muted-fg" onClick={() => go("#/demo")}>View judge demo</button>
          </div>
        </div>
      </Card>
      <Card className="bg-muted/50">
        <p className="text-xs leading-relaxed text-muted-fg"><span className="font-semibold text-ink">Safety notice:</span> Sathi supports recovery and escalation. It does not diagnose, prescribe, or replace professional medical care.</p>
      </Card>
    </div>
  );
}

export function Register() {
  const { register } = useApp();
  const [f, setF] = useState({ name: "", email: "", password: "", role: "patient" });
  const [err, setErr] = useState("");
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  const submit = async () => { const e = await register(f); e ? setErr(e) : go("#/onboarding"); };
  return (
    <div className="mx-auto grid max-w-[420px] min-h-screen content-center gap-3 p-6">
      <h1 className="text-2xl font-extrabold">Join Sathi</h1>
      <Card><div className="grid gap-2">
        <Input placeholder="Full name" value={f.name} onChange={(e) => set("name", e.target.value)} />
        <Input placeholder="Email" value={f.email} onChange={(e) => set("email", e.target.value)} />
        <Input placeholder="Password" type="password" value={f.password} onChange={(e) => set("password", e.target.value)} />
        <div className="flex gap-2">{["patient", "caregiver", "family"].map((r) => (
          <button key={r} onClick={() => set("role", r)}
            className={`flex-1 rounded-full py-2 text-xs font-bold capitalize ${f.role === r ? "bg-primary text-white" : "bg-secondary text-primary"}`}>{r}</button>
        ))}</div>
        {err && <p className="rounded-xl bg-red-100 p-2 text-xs font-semibold text-red-800">{err}</p>}
        <Btn onClick={submit}>Create account</Btn>
        <button className="text-xs font-bold text-primary" onClick={() => go("#/login")}>Back to login</button>
      </div></Card>
    </div>
  );
}

export function Onboarding() {
  const { me, refresh, setPid } = useApp();
  const [f, setF] = useState({ name: me?.name || "", phone: "", condition: "", age: "62" });
  const [msg, setMsg] = useState("");
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  const submit = async () => {
    try {
      const p = await api.createPatient({ ...f, age: Number(f.age) || 0 });
      setPid(p.id); await refresh(); go("#/home");
    } catch (e) { setMsg(e instanceof Error ? e.message : "failed"); }
  };
  return (
    <div className="mx-auto grid max-w-[420px] min-h-screen content-center gap-3 p-6">
      <h1 className="text-2xl font-extrabold">Recovery profile</h1>
      <p className="text-sm text-muted-fg">One profile per patient. Caregivers join later with a link code.</p>
      <Card><div className="grid gap-2">
        <Input placeholder="Patient name" value={f.name} onChange={(e) => set("name", e.target.value)} />
        <Input placeholder="Phone" value={f.phone} onChange={(e) => set("phone", e.target.value)} />
        <Input placeholder="Condition (e.g. post-surgery recovery)" value={f.condition} onChange={(e) => set("condition", e.target.value)} />
        <Input placeholder="Age" value={f.age} onChange={(e) => set("age", e.target.value)} />
        {msg && <p className="text-xs font-semibold text-red-700">{msg}</p>}
        <Btn onClick={submit}>Start recovery</Btn>
        {me?.role !== "patient" && <button className="text-xs font-bold text-primary" onClick={() => go("#/home")}>Skip — I join via link code</button>}
      </div></Card>
    </div>
  );
}
