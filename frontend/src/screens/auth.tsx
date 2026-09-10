import { useState } from "react";
import { api } from "../lib/api";
import { go, useApp } from "../lib/store";
import { Btn, Card, Input } from "../components/ui";

export function Login() {
  const { login } = useApp();
  const [email, setEmail] = useState("meena@sathi.demo");
  const [pw, setPw] = useState("demo1234");
  const [err, setErr] = useState("");
  const submit = async () => { const e = await login(email, pw); e ? setErr(e) : go("#/home"); };
  return (
    <div className="mx-auto grid max-w-[420px] min-h-screen content-center gap-3 p-6">
      <h1 className="text-2xl font-extrabold">Sathi</h1>
      <p className="text-sm text-muted-fg">Recovery companion · not a doctor</p>
      <Card>
        <div className="grid gap-2">
          <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input placeholder="Password" type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
          {err && <p className="rounded-xl bg-red-100 p-2 text-xs font-semibold text-red-800">{err}</p>}
          <Btn onClick={submit}>Log in</Btn>
          <button className="text-xs font-bold text-primary" onClick={() => go("#/register")}>New here? Create account</button>
          <button className="text-xs text-muted-fg" onClick={() => go("#/demo")}>▶ Judge demo (no login needed)</button>
        </div>
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
