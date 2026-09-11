import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { go, useApp } from "../lib/store";
import { Badge, Btn, Card, Empty, Input, SectionLabel } from "./ui";
import { Modal } from "./os";

function Skeleton() {
  return (
    <div className="grid gap-2" aria-label="Loading">
      <div className="skeleton h-4 w-full" />
      <div className="skeleton h-4 w-5/6" />
      <div className="skeleton h-4 w-4/6" />
    </div>
  );
}

// ═══ Visit summary — print-ready doctor handoff ═══════════════════════
export function VisitSummaryModal({ onClose }: { onClose: () => void }) {
  const { pid } = useApp();
  const [d, setD] = useState<Awaited<ReturnType<typeof api.visitSummary>> | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => { if (pid) api.visitSummary(pid).then(setD).catch((e) => setErr(e instanceof Error ? e.message : "failed")); }, [pid]);
  return (
    <Modal title="Visit summary" sub="Print-ready handoff for your doctor" onClose={onClose}>
      {!d && !err && <Skeleton />}
      {err && <Empty title="Could not load" text={err} />}
      {d && (
        <div className="grid gap-3">
          <Card>
            <p className="font-bold">{d.patient.name}{d.patient.age ? `, ${d.patient.age}` : ""}</p>
            <p className="text-xs text-muted-fg">{d.patient.condition || "No condition on file"}</p>
            <p className="mt-1 text-sm">Adherence <b>{d.adherence}%</b> · {d.taken_today}/{d.total} today · {d.missed} missed</p>
          </Card>
          <Card>
            <SectionLabel>Recent symptoms</SectionLabel>
            {d.symptoms.map((s, i) => <p key={i} className="text-sm">• {s.text} <Badge level={s.risk} /></p>)}
            {d.symptoms.length === 0 && <p className="text-sm text-muted-fg">None.</p>}
          </Card>
          <Card>
            <SectionLabel>Follow-ups</SectionLabel>
            {d.followups.map((f) => <p key={f.id} className="text-sm">📅 {f.title} · {f.date_time}</p>)}
            {d.followups.length === 0 && <p className="text-sm text-muted-fg">None scheduled.</p>}
          </Card>
          <div className="flex gap-2 print:hidden">
            <Btn onClick={() => window.print()}>🖨 Print</Btn>
            <Btn kind="ghost" onClick={() => { onClose(); go("#/report"); }}>✨ AI report</Btn>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ═══ What changed — 14-day delta ══════════════════════════════════════
export function WhatChangedModal({ onClose }: { onClose: () => void }) {
  const { pid } = useApp();
  const [d, setD] = useState<Awaited<ReturnType<typeof api.whatChanged>> | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => { if (pid) api.whatChanged(pid).then(setD).catch((e) => setErr(e instanceof Error ? e.message : "failed")); }, [pid]);
  return (
    <Modal title="What changed" sub={`Last ${d?.since_days ?? 14} days at a glance`} onClose={onClose}>
      {!d && !err && <Skeleton />}
      {err && <Empty title="Could not load" text={err} />}
      {d && (
        <div className="grid gap-3">
          <Card><SectionLabel>Medicines ({d.medicines_added.length})</SectionLabel>
            {d.medicines_added.map((m) => <p key={m.id} className="text-sm">💊 {m.name} — {m.dose} at {m.time}</p>)}
            {d.medicines_added.length === 0 && <p className="text-sm text-muted-fg">No active medicines.</p>}</Card>
          <Card><SectionLabel>Symptoms</SectionLabel>
            <p className="text-sm">{d.symptoms_delta.count} report(s){d.symptoms_delta.latest_risk && <> · latest <Badge level={d.symptoms_delta.latest_risk} /></>} · trend: <b>{d.symptoms_delta.trend}</b></p>
            <p className="mt-1 text-sm">Adherence <b>{d.adherence}%</b> · {d.new_events} new event(s)</p></Card>
          <Card><SectionLabel>Upcoming</SectionLabel>
            {d.upcoming_followups.map((f) => <p key={f.id} className="text-sm">📅 {f.title} · {f.date_time}</p>)}
            {d.upcoming_followups.length === 0 && <p className="text-sm text-muted-fg">Nothing scheduled.</p>}</Card>
        </div>
      )}
    </Modal>
  );
}

// ═══ Inbox — scan review, confirm-to-plan (never auto-import) ═════════
export function InboxModal({ onClose }: { onClose: () => void }) {
  const { pid } = useApp();
  const [found, setFound] = useState<{ name: string; dose: string; frequency: string; time: string; instructions: string }[]>([]);
  const [review, setReview] = useState(true);
  const [plans, setPlans] = useState<{ id: number; hospital: string; version: number }[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (pid) api.plans(pid).then(setPlans).catch(() => {}); }, [pid]);

  const pick = (f: File | undefined) => {
    if (!f) return;
    setBusy(true); setMsg("Reading…");
    const r = new FileReader();
    r.onload = async () => {
      try {
        const res = await api.ocr(String(r.result));
        setFound(res.medicines || []);
        setReview(!!res.needs_review);
        setMsg(res.message || `${res.medicines?.length || 0} candidate(s) — tap Add for each one you confirm.`);
      } catch { setMsg("Read failed — try brighter light or add manually."); }
      setBusy(false);
    };
    r.readAsDataURL(f);
  };

  const add = async (m: { name: string; dose: string; frequency: string; time: string; instructions: string }) => {
    try {
      await api.addMed(pid, { name: m.name, dose: m.dose, frequency: m.frequency, time: m.time, instructions: m.instructions });
      setFound((f) => f.filter((x) => x !== m));
      setMsg(`✓ Added ${m.name} — verify against your discharge paper.`);
    } catch (e) { setMsg(e instanceof Error ? e.message : "failed"); }
  };

  return (
    <Modal title="Scan inbox" sub="Review every AI read — nothing imports without your tap" onClose={onClose}>
      <div className="grid gap-3">
        <label className="grid min-h-[44px] cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-border bg-muted p-4 text-center text-sm text-muted-fg">
          <input type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
          {busy ? "Reading…" : "📷 Snap / upload a prescription"}
        </label>
        {review && found.length > 0 && <div><Badge level="MONITOR" /> <span className="text-xs font-bold">Needs review</span></div>}
        {msg && <p className="rounded-xl bg-muted p-2 text-xs font-semibold">{msg}</p>}
        {found.map((m, i) => (
          <Card key={i}>
            <p className="text-sm font-semibold">{m.name} <span className="text-xs text-muted-fg">· {m.dose} · {m.time}</span></p>
            <Btn kind="success" className="mt-2" onClick={() => add(m)}>Add to schedule</Btn>
          </Card>
        ))}
        <Card>
          <SectionLabel>Discharge plans ({plans.length})</SectionLabel>
          {plans.slice(0, 3).map((p) => <p key={p.id} className="text-sm">• v{p.version} · {p.hospital || "Hospital"}</p>)}
          {plans.length === 0 && <p className="text-sm text-muted-fg">No plans yet.</p>}
        </Card>
      </div>
    </Modal>
  );
}

// ═══ Clipboard — emergency card ═══════════════════════════════════════
export function ClipboardModal({ onClose }: { onClose: () => void }) {
  const { pid } = useApp();
  const [d, setD] = useState<Awaited<ReturnType<typeof api.emergencyCard>> | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => { if (pid) api.emergencyCard(pid).then(setD).catch((e) => setErr(e instanceof Error ? e.message : "failed")); }, [pid]);
  return (
    <Modal title="Emergency card" sub="Show this screen at the hospital" onClose={onClose}>
      {!d && !err && <Skeleton />}
      {err && <Empty title="Could not load" text={err} />}
      {d && (
        <div className="grid gap-3">
          <Card accent="#B42318">
            <p className="text-lg font-extrabold">{d.name}{d.age ? ` · ${d.age}y` : ""}</p>
            <p className="text-sm text-muted-fg">{d.condition} · speaks {d.language}</p>
            <p className="mt-1 text-sm font-bold">📞 {d.emergency_contact || "No emergency contact"}</p>
          </Card>
          <Card><SectionLabel>Medicines</SectionLabel>
            {d.medications.map((m, i) => <p key={i} className="text-sm">💊 {m.name} — {m.dose} at {m.time}</p>)}
            {d.medications.length === 0 && <p className="text-sm text-muted-fg">None.</p>}</Card>
          <Card><SectionLabel>Recent symptoms</SectionLabel>
            {d.recent_symptoms.map((s, i) => <p key={i} className="text-sm">• {s}</p>)}
            {d.recent_symptoms.length === 0 && <p className="text-sm text-muted-fg">None.</p>}
            {d.next_followup && <p className="mt-1 text-sm">Next: <b>{d.next_followup}</b></p>}
            {d.note && <p className="mt-1 text-xs text-muted-fg">{d.note}</p>}</Card>
          <p className="text-[11px] text-muted-fg">QR sharing code: Settings → Share this patient. Rescuers can scan it to link instantly.</p>
          <Btn kind="ghost" onClick={() => window.print()}>🖨 Print card</Btn>
        </div>
      )}
    </Modal>
  );
}

// ═══ Vault — all discharge plan versions ══════════════════════════════
export function VaultModal({ onClose }: { onClose: () => void }) {
  const { pid } = useApp();
  const [list, setList] = useState<{ id: number; hospital: string; version: number; is_active: boolean; data: string }[]>([]);
  const [err, setErr] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [show, setShow] = useState<number | null>(null);
  const [edit, setEdit] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (pid) api.plans(pid).then((l) => setList(l)).catch((e) => setErr(e instanceof Error ? e.message : "failed")).finally(() => setLoaded(true));
  }, [pid]);

  const pretty = (d: string) => {
    try {
      const j = JSON.parse(d);
      return [j.notes, (j.medicines || []).map((m: { name: string }) => m.name).join(", ")].filter(Boolean).join(" · ");
    } catch { return d.slice(0, 200); }
  };

  const saveEdit = async (id: number) => {
    try {
      await api.addPlan(pid, { hospital: list.find((p) => p.id === id)?.hospital || "", data: edit });
      const l = await api.plans(pid);
      setList(l); setShow(null); setMsg("✓ Saved as a new version.");
    } catch (e) { setMsg(e instanceof Error ? e.message : "failed"); }
  };

  return (
    <Modal title="Plan vault" sub="Every discharge version, newest active first" onClose={onClose}>
      {!loaded && !err && <Skeleton />}
      {err && <Empty title="Could not load" text={err} />}
      {loaded && !err && list.length === 0 && <Empty text="No plans yet — your caregiver can create one." />}
      {msg && <p className="mb-2 text-xs font-semibold">{msg}</p>}
      {list.map((p) => (
        <Card key={p.id} accent={p.is_active ? "#10B981" : undefined}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-bold">v{p.version} · {p.hospital || "Hospital"}</p>
            <div className="flex items-center gap-2">
              {p.is_active && <Badge level="taken" />}
              <button onClick={() => { setShow(show === p.id ? null : p.id); setEdit(p.data); }}
                className="min-h-[44px] text-xs font-bold text-primary">{show === p.id ? "Hide" : "View"}</button>
            </div>
          </div>
          <p className="mt-1 text-[13px] text-muted-fg">{pretty(p.data)}</p>
          {show === p.id && (
            <div className="mt-2 grid gap-2">
              <Input value={edit} onChange={(e) => setEdit(e.target.value)} aria-label="Plan data" />
              <Btn kind="ghost" onClick={() => saveEdit(p.id)}>Save as new version</Btn>
            </div>
          )}
        </Card>
      ))}
    </Modal>
  );
}
