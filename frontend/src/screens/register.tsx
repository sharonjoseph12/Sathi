import { useState } from "react";
import { go, useApp } from "../lib/store";
import { Btn, Card, Input } from "../components/ui";
import { useAdaptiveProfile, isElder } from "../lib/useAdaptiveProfile";

export function Register() {
  const { register } = useApp();
  const profile = useAdaptiveProfile();
  const elder = isElder(profile);

  const [f, setF] = useState({ name: "", email: "", password: "", role: "patient" });
  const [err, setErr] = useState("");
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    const e = await register(f);
    if (e) {
      setErr(e);
      requestAnimationFrame(() => {
        document.getElementById("register-error")?.focus();
      });
    } else {
      go("#/onboarding");
    }
  };

  const roles: { key: string; label: string; elderLabel: string }[] = [
    { key: "patient", label: "patient", elderLabel: "I am the patient" },
    { key: "caregiver", label: "caregiver", elderLabel: "I help someone recover" },
    { key: "family", label: "family", elderLabel: "I am a family member" },
  ];

  return (
    <div className="mx-auto grid max-w-[420px] min-h-screen content-center gap-3 p-6">
      <h1 className={`font-extrabold ${elder ? "text-3xl" : "text-2xl"}`}>
        {elder ? "Create your account" : "Join Sathi"}
      </h1>
      {elder && (
        <p className="text-base text-muted-fg leading-relaxed">
          Fill in your name, email, and a password. Then pick your role.
        </p>
      )}
      <Card>
        <div className="grid gap-3">
          <label className={`grid gap-1.5 font-semibold ${elder ? "text-sm text-ink" : "text-xs text-muted-fg"}`}>
            {elder ? "Your full name" : "Full name"}
            <Input
              placeholder="Full name"
              value={f.name}
              onChange={(e) => set("name", e.target.value)}
              className={elder ? "!min-h-[56px] !text-lg" : ""}
              aria-required="true"
            />
          </label>
          <label className={`grid gap-1.5 font-semibold ${elder ? "text-sm text-ink" : "text-xs text-muted-fg"}`}>
            Email
            <Input
              placeholder="you@example.com"
              value={f.email}
              onChange={(e) => set("email", e.target.value)}
              className={elder ? "!min-h-[56px] !text-lg" : ""}
              aria-required="true"
            />
          </label>
          <label className={`grid gap-1.5 font-semibold ${elder ? "text-sm text-ink" : "text-xs text-muted-fg"}`}>
            Password
            <Input
              placeholder="Choose a password"
              type="password"
              value={f.password}
              onChange={(e) => set("password", e.target.value)}
              className={elder ? "!min-h-[56px] !text-lg" : ""}
              aria-required="true"
            />
          </label>

          {/* Role selector: elder gets stacked big buttons, standard gets compact pills */}
          <fieldset className="grid gap-2">
            <legend className={`font-semibold ${elder ? "text-sm text-ink mb-1" : "text-xs text-muted-fg"}`}>
              {elder ? "I am joining as…" : "Your role"}
            </legend>
            {elder ? (
              <div className="grid gap-2">
                {roles.map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => set("role", r.key)}
                    aria-pressed={f.role === r.key}
                    className={`min-h-[56px] rounded-xl px-4 text-left text-lg font-bold transition active:scale-[0.98] ${
                      f.role === r.key
                        ? "bg-primary text-white shadow-[0_1px_2px_rgb(16_24_40/0.12)]"
                        : "border border-border bg-card text-ink hover:bg-muted"
                    }`}
                  >
                    {r.elderLabel}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex gap-2">
                {roles.map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => set("role", r.key)}
                    aria-pressed={f.role === r.key}
                    className={`flex-1 min-h-[44px] rounded-full py-2 text-xs font-bold capitalize ${
                      f.role === r.key ? "bg-primary text-white" : "bg-secondary text-primary"
                    }`}
                  >
                    {r.key}
                  </button>
                ))}
              </div>
            )}
          </fieldset>

          {err && (
            <p id="register-error" role="alert" tabIndex={-1}
              className="rounded-xl bg-red-100 border border-red-300 p-2.5 text-xs font-semibold text-red-900">
              {err}
            </p>
          )}
          <Btn onClick={submit} className={elder ? "!min-h-[56px] !text-lg" : ""}>
            {elder ? "Create my account" : "Create account"}
          </Btn>
          <button
            className={`font-bold text-primary min-h-[44px] ${elder ? "text-base" : "text-xs"}`}
            onClick={() => go("#/login")}
            aria-label="Go back to the login page"
          >
            Back to login
          </button>
        </div>
      </Card>
    </div>
  );
}
