import { useState } from "react";
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
          <div className={`flex items-center justify-between ${elder ? "text-base gap-4" : "text-[13px]"}`}>
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
