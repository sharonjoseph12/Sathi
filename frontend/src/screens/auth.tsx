import { useState } from "react";
import { api } from "../lib/api";
import { go, useApp } from "../lib/store";
import { Btn, Card, Input } from "../components/ui";

// Login and Register have been moved to screens/login.tsx and screens/register.tsx.
// This file retains only Onboarding (owned by Dev 1).

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
