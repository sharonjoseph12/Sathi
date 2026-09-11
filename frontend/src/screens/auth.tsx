import { useState } from "react";
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
// Onboarding has been extracted to screens/onboarding.tsx (Dev 1 owned).
// Re-export for backward compatibility with any remaining imports.
export { Onboarding } from "./onboarding";


