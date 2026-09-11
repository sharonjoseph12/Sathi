import { useState, useEffect } from "react";
import { go, useApp } from "../lib/store";
import { Btn, Card, Input } from "../components/ui";
import { Icon } from "../components/icons";
import { useAdaptiveProfile, isElder, wantsHighContrast } from "../lib/useAdaptiveProfile";

function Brand() {
  const profile = useAdaptiveProfile();
  const elder = isElder(profile);
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary text-white">
        <Icon name="logo" size={24} />
      </span>
      <div>
        <h1 className={`font-bold tracking-tight ${elder ? "text-[28px]" : "text-[22px]"}`}>Sathi</h1>
        <p className={`text-muted-fg ${elder ? "text-base" : "text-[13px]"}`}>
          {elder ? "Your recovery helper" : "Post-hospital recovery companion"}
        </p>
      </div>
    </div>
  );
}

export function Login() {
  const { login } = useApp();
  const profile = useAdaptiveProfile();
  const elder = isElder(profile);
  const hc = wantsHighContrast(profile);

  const [email, setEmail] = useState("meena@sathi.demo");
  const [pw, setPw] = useState("demo1234");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (window.location.hash.includes("role=caregiver")) {
      setEmail("priya@sathi.demo");
      setPw("demo1234");
      login("priya@sathi.demo", "demo1234", true).then((e) => {
        if (!e) go("#/care");
      });
    }
  }, []);

  const submit = async () => {
    setBusy(true);
    setErr("");
    const e = await login(email.trim(), pw);
    setBusy(false);
    if (e) {
      setErr(e);
      // Focus management: move focus to error on failure
      requestAnimationFrame(() => {
        document.getElementById("login-error")?.focus();
      });
    } else {
      go("#/home");
    }
  };

  return (
    <div className="mx-auto grid max-w-[420px] min-h-screen content-center gap-4 p-6">
      <Brand />
      <Card>
        <div className="grid gap-3">
          <div>
            <h2 className={`font-bold tracking-tight ${elder ? "text-2xl" : "text-lg"}`}>
              {elder ? "Log in" : "Welcome back"}
            </h2>
            <p className={`text-muted-fg ${elder ? "text-base leading-relaxed" : "text-[13px]"}`}>
              {elder ? "Type your email and password to continue." : "Log in to continue your recovery plan."}
            </p>
          </div>
          <label className={`grid gap-1.5 font-semibold ${elder ? "text-sm text-ink" : "text-xs text-muted-fg"}`}>
            Email
            <Input
              placeholder="you@example.com"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={elder ? "!min-h-[56px] !text-lg" : ""}
              aria-required="true"
            />
          </label>
          <label className={`grid gap-1.5 font-semibold ${elder ? "text-sm text-ink" : "text-xs text-muted-fg"}`}>
            Password
            <Input
              placeholder="••••••••"
              type="password"
              autoComplete="current-password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
              className={elder ? "!min-h-[56px] !text-lg" : ""}
              aria-required="true"
            />
          </label>
          {err && (
            <p id="login-error" role="alert" tabIndex={-1}
              className={`rounded-xl border p-2.5 text-xs font-semibold ${hc
                ? "border-red-600 bg-red-100 text-red-900"
                : "border-red-200 bg-red-50 text-red-800"
              }`}>
              {err}
            </p>
          )}
          <Btn onClick={submit} disabled={busy} className={elder ? "!min-h-[56px] !text-lg" : ""}>
            {busy ? "Logging in…" : "Log in"}
          </Btn>
          <div className="mt-2 border-t border-border pt-3">
            <p className="mb-2 text-xs font-semibold text-muted-fg uppercase tracking-wider">Quick Demo Logins (Dual-Tab Ready)</p>
            <div className="grid gap-2">
              <button
                type="button"
                onClick={async () => {
                  setBusy(true);
                  setEmail("meena@sathi.demo");
                  setPw("demo1234");
                  const e = await login("meena@sathi.demo", "demo1234", true);
                  setBusy(false);
                  if (!e) go("#/home");
                }}
                className="flex min-h-[44px] items-center justify-between rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-ink shadow-sm hover:bg-surface-sunken transition-all text-left"
              >
                <span>Patient Account (Meena)</span>
                <span className="rounded-md bg-primary-soft px-2 py-0.5 text-[11px] font-bold text-primary">Patient</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  setBusy(true);
                  setEmail("priya@sathi.demo");
                  setPw("demo1234");
                  const e = await login("priya@sathi.demo", "demo1234", true);
                  setBusy(false);
                  if (!e) go("#/care");
                }}
                className="flex min-h-[44px] items-center justify-between rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-ink shadow-sm hover:bg-surface-sunken transition-all text-left"
              >
                <span>Caregiver Account (Priya)</span>
                <span className="rounded-md bg-success-bg px-2 py-0.5 text-[11px] font-bold text-success">Caregiver</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const url = new URL(window.location.href);
                  url.hash = "#/login?role=caregiver";
                  window.open(url.toString(), "_blank");
                }}
                className="flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border border-dashed border-primary/40 bg-primary-soft/40 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary-soft transition-all"
              >
                <span>Open Caregiver in New Tab (Split View)</span>
              </button>
            </div>
          </div>

          <div className={`flex items-center justify-between mt-1 ${elder ? "text-base gap-4" : "text-[13px]"}`}>
            <button
              className={`font-semibold text-primary min-h-[44px] ${elder ? "text-base" : ""}`}
              onClick={() => go("#/register")}
              aria-label="Create a new account"
            >
              Create account
            </button>
            <button
              className={`font-medium text-muted-fg min-h-[44px] ${elder ? "text-base" : ""}`}
              onClick={() => go("#/demo")}
              aria-label="View the judge demo walkthrough"
            >
              View judge demo
            </button>
          </div>
        </div>
      </Card>
      <Card className="bg-muted/50">
        <p className={`leading-relaxed text-muted-fg ${elder ? "text-base" : "text-xs"}`}>
          <span className="font-semibold text-ink">Safety notice:</span> Sathi supports recovery and escalation. It does not diagnose, prescribe, or replace professional medical care.
        </p>
      </Card>
    </div>
  );
}
