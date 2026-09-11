import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { api, tok } from "../lib/api";
import { LANGS } from "../lib/i18n";
import { useApp } from "../lib/store";
import { Badge, Btn, Card, Empty, Input, Area, Page, Toggle } from "../components/ui";
import { askPermission } from "../lib/notify";
import { useAdaptiveProfile, isElder } from "../lib/useAdaptiveProfile";
import {
  Check,
  Camera,
  QrCode,
  LogOut,
  Send,
  Plus,
  Printer,
  Sparkles,
  FileText,
  Clock,
} from "lucide-react";

/* ══════════════════════════════════════════════════════════════════
   Settings — Language, theme, patient linking, access controls
   ══════════════════════════════════════════════════════════════════ */
export function Settings() {
  const { me, pid, refresh, logout } = useApp();
  const profile = useAdaptiveProfile();
  const elderMode = isElder(profile);

  const [lang, setLang] = useState(me?.language || "en");
  const [theme, setTheme] = useState(me?.theme || "light");
  const [remOn, setRemOn] = useState(localStorage.getItem("@sathi_remind_off") !== "1");
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);
  const [anchors, setAnchors] = useState(me?.anchor_times || "");
  const [code, setCode] = useState("");
  const [share, setShare] = useState("");
  const [msg, setMsg] = useState("");
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const scanAgain = async (text: string) => {
    const m = (text || "").toUpperCase().match(/DB-[A-Z0-9]{6}/);
    if (m) {
      setCode(m[0]);
      setMsg(`Scanned ${m[0]} — tap Join.`);
      return true;
    }
    return false;
  };

  const scanQr = async () => {
    const BD = (
      window as unknown as {
        BarcodeDetector?: new (o: object) => {
          detect(v: HTMLVideoElement): Promise<{ rawValue: string }[]>;
        };
      }
    ).BarcodeDetector;
    if (!BD) {
      setMsg("QR scan needs Chrome/Edge on this device — type the code instead.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      setScanning(true);
      setTimeout(async () => {
        const v = videoRef.current;
        if (!v) {
          setScanning(false);
          return;
        }
        v.srcObject = stream;
        await v.play().catch(() => {});
        const det = new BD({ formats: ["qr_code"] });
        for (let i = 0; i < 40; i++) {
          await new Promise((r) => setTimeout(r, 500));
          if (!videoRef.current) break;
          try {
            const found = await det.detect(v);
            if (found.length && (await scanAgain(found[0].rawValue))) break;
          } catch {
            /* keep scanning */
          }
        }
        stream.getTracks().forEach((t) => t.stop());
        setScanning(false);
      }, 100);
    } catch {
      setMsg("Camera unavailable — type the code instead.");
    }
  };

  const save = async () => {
    try {
      await api.settings({ language: lang, theme, anchor_times: anchors });
      await refresh();
      setMsg("Saved");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "failed");
    }
  };

  return (
    <div className="grid gap-4">
      <Page title="Settings" />

      {/* Language */}
      <Card>
        <div className="grid gap-3">
          <fieldset>
            <legend className={`font-bold text-ink ${elderMode ? "text-base" : "text-xs"}`}>
              {elderMode ? "Choose your language" : "Language"}
            </legend>
            <div
              className="mt-2 flex flex-wrap gap-2"
              role="radiogroup"
              aria-label="Language selection"
            >
              {LANGS.map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  role="radio"
                  aria-checked={lang === l}
                  className={`rounded-full px-4 py-2 font-bold transition min-h-[44px] ${
                    elderMode ? "text-sm" : "text-xs"
                  } ${
                    lang === l
                      ? "bg-primary text-white shadow-sm"
                      : "bg-surface-sunken text-ink hover:bg-muted"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Anchor times */}
          {!elderMode && (
            <div>
              <label className="text-xs font-bold text-ink" htmlFor="anchor-times">
                Anchor times (JSON)
              </label>
              <Input
                id="anchor-times"
                value={anchors}
                onChange={(e) => setAnchors(e.target.value)}
                aria-label="Anchor times configuration in JSON format"
                className="mt-1"
              />
            </div>
          )}

          {/* Theme toggle */}
          <div className="flex items-center min-h-[44px]">
            <Toggle
              on={theme === "dark"}
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              label={elderMode ? "Dark screen" : "Dark mode"}
            />
          </div>

          {/* Reminders toggle */}
          <div className="flex items-center min-h-[44px]">
            <Toggle
              on={remOn}
              onClick={async () => {
                if (!remOn) {
                  if (!(await askPermission())) return;
                  localStorage.removeItem("@sathi_remind_off");
                } else {
                  localStorage.setItem("@sathi_remind_off", "1");
                }
                setRemOn(!remOn);
              }}
              label="Medicine reminders"
            />
          </div>

          <Btn
            onClick={save}
            label="Save settings"
            className={`flex items-center justify-center gap-2 ${elderMode ? "!min-h-[56px] !text-lg" : ""}`}
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            <span>{elderMode ? "Save Settings" : "Save"}</span>
          </Btn>
          {msg && (
            <p role="status" className={`font-semibold text-success ${elderMode ? "text-sm" : "text-xs"}`}>
              {msg}
            </p>
          )}
        </div>
      </Card>

      {/* Link a patient */}
      <Card>
        <h2 className={`mb-2 font-bold text-ink ${elderMode ? "text-lg" : "text-base"}`}>
          {elderMode ? "Connect to a caregiver" : "Link a patient"}
        </h2>
        <div className="flex gap-2">
          <Input
            placeholder="DB-XXXXXX"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            aria-label="Patient link code"
          />
          <Btn
            onClick={async () => {
              try {
                await api.connect(code);
                await refresh();
                setMsg("Linked!");
              } catch (e) {
                setMsg(e instanceof Error ? e.message : "invalid");
              }
            }}
            label="Join patient using link code"
          >
            Join
          </Btn>
        </div>
        <div className="mt-3">
          <Btn
            kind="ghost"
            onClick={scanQr}
            label="Scan QR code to link patient"
            className="flex items-center gap-2"
          >
            <Camera className="h-4 w-4" aria-hidden="true" />
            <span>{elderMode ? "Scan code with camera" : "Scan QR instead"}</span>
          </Btn>
        </div>
        {scanning && (
          <video
            ref={videoRef}
            className="mt-3 max-h-56 w-full rounded-xl bg-black"
            muted
            playsInline
            aria-label="Camera viewfinder for QR code scanning"
          />
        )}
        {msg && (
          <p className="mt-2 text-xs font-semibold text-ink" role="status">
            {msg}
          </p>
        )}
      </Card>

      {/* Share patient code */}
      {pid > 0 && (
        <Card>
          <h2 className={`mb-2 font-bold text-ink ${elderMode ? "text-lg" : "text-base"}`}>
            {elderMode ? "Share your code" : "Share this patient"}
          </h2>
          <Btn
            kind="ghost"
            onClick={async () => {
              try {
                const c = await api.linkCode(pid);
                setShare(c.code);
              } catch {
                /* owner only */
              }
            }}
            label="Generate and show patient link code"
            className="flex items-center gap-2"
          >
            <QrCode className="h-4 w-4" aria-hidden="true" />
            <span>{elderMode ? "Show my code" : "Show link code"}</span>
          </Btn>
          {share && (
            <div className="mt-3 flex items-center gap-4 p-4 bg-surface-sunken rounded-2xl">
              <div className="p-2 bg-white rounded-xl shadow-sm">
                <QRCodeSVG
                  value={share}
                  size={elderMode ? 120 : 100}
                  aria-label="QR code for patient linking"
                />
              </div>
              <p className={`font-mono font-extrabold text-ink tracking-wider ${elderMode ? "text-2xl" : "text-xl"}`}>
                {share}
              </p>
            </div>
          )}
          {share && (
            <p className={`mt-2 text-ink-muted ${elderMode ? "text-sm" : "text-xs"}`}>
              {elderMode
                ? "Show this code to your caregiver or family member so they can connect with you."
                : "Caregivers can scan this QR or type the code in Settings → Link a patient."}
            </p>
          )}
        </Card>
      )}

      <Btn
        kind="danger"
        onClick={logout}
        label={`Log out from account ${me?.email}`}
        className="flex items-center justify-center gap-2 !min-h-[52px]"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        <span>{elderMode ? "Log out" : `Log out (${me?.email})`}</span>
      </Btn>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   Notifications — Alerts and updates
   ══════════════════════════════════════════════════════════════════ */
export function Notifications() {
  const profile = useAdaptiveProfile();
  const elderMode = isElder(profile);

  const [list, setList] = useState<
    { id: number; title: string; body: string; kind: string; read: boolean }[]
  >([]);
  const load = () =>
    api
      .notifs()
      .then(setList)
      .catch(() => {});
  useEffect(() => {
    load();
  }, []);

  return (
    <div className="grid gap-4">
      <Page
        title="Notifications"
        sub={elderMode ? "Your alerts and messages" : undefined}
      />
      <div aria-live="polite" className="grid gap-3">
        {list.map((n) => (
          <Card
            key={n.id}
            className={`border ${
              n.read ? "border-border bg-surface" : "border-primary/40 bg-primary-soft/40"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className={`flex items-center gap-2 font-bold text-ink ${elderMode ? "text-base" : "text-sm"}`}>
                {!n.read && (
                  <span
                    className="h-2.5 w-2.5 rounded-full bg-primary shrink-0"
                    aria-label="Unread notification"
                  />
                )}
                <span>{n.title}</span>
              </p>
              <Badge level={n.kind} />
            </div>
            <p className={`mt-1.5 text-ink-muted ${elderMode ? "text-base" : "text-sm"}`}>
              {n.body}
            </p>
            {!n.read && (
              <button
                className={`mt-2 flex items-center gap-1 font-bold text-primary hover:underline min-h-[44px] ${
                  elderMode ? "text-sm" : "text-xs"
                }`}
                onClick={async () => {
                  await api.readNotif(n.id);
                  load();
                }}
                aria-label={`Mark notification "${n.title}" as read`}
              >
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Mark read</span>
              </button>
            )}
          </Card>
        ))}
      </div>
      {list.length === 0 && (
        <Empty
          text={
            elderMode ? "No notifications right now." : "No notifications."
          }
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   Help & Support
   ══════════════════════════════════════════════════════════════════ */
export function Help() {
  const profile = useAdaptiveProfile();
  const elderMode = isElder(profile);

  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState("");

  return (
    <div className="grid gap-4">
      <Page
        title={elderMode ? "Help" : "Help & support"}
        sub={elderMode ? "We're here to help you" : undefined}
      />
      <Card>
        <p className={`font-bold text-ink ${elderMode ? "text-base" : "text-sm"}`}>
          {elderMode ? "You can ask Sathi:" : "You can say:"}
        </p>
        <div className={`mt-3 ${elderMode ? "grid gap-2" : "grid gap-1.5"}`}>
          {elderMode ? (
            <>
              <p className="rounded-xl bg-surface-sunken p-3 text-base text-ink">
                "What medicines do I need?"
              </p>
              <p className="rounded-xl bg-surface-sunken p-3 text-base text-ink">
                "I have a headache"
              </p>
              <p className="rounded-xl bg-surface-sunken p-3 text-base text-ink">
                "When is my appointment?"
              </p>
            </>
          ) : (
            <p className="text-sm text-ink-muted leading-relaxed">
              "What medicines do I need?" · "I have a headache" · "When is my appointment?" · "Open my schedule"
            </p>
          )}
        </div>
      </Card>
      <Card>
        <div className="grid gap-3">
          <label
            className={`font-bold text-ink ${elderMode ? "text-base" : "text-xs"}`}
            htmlFor="help-msg"
          >
            {elderMode ? "Tell us what's wrong:" : "Report a problem or ask for help"}
          </label>
          <Area
            id="help-msg"
            rows={elderMode ? 4 : 3}
            placeholder={
              elderMode
                ? "Describe your problem here…"
                : "Report a problem or ask for help…"
            }
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            aria-label="Describe your problem or question"
          />
          <Btn
            onClick={async () => {
              if (msg) {
                await api.support("help", msg);
                setOk("Thanks — we got it.");
                setMsg("");
              }
            }}
            label="Send help request"
            className={`flex items-center justify-center gap-2 ${elderMode ? "!min-h-[56px] !text-lg" : ""}`}
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            <span>Send</span>
          </Btn>
          {ok && (
            <p role="status" className={`font-semibold text-success ${elderMode ? "text-sm" : "text-xs"}`}>
              {ok}
            </p>
          )}
        </div>
      </Card>
      <p className={`text-center text-ink-muted ${elderMode ? "text-sm" : "text-[11px]"}`}>
        Sathi supports recovery — it does not diagnose, prescribe, or replace emergency services (112).
      </p>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   Reminders — Custom nudges beyond the med schedule
   ══════════════════════════════════════════════════════════════════ */
export function Reminders() {
  const { pid } = useApp();
  const profile = useAdaptiveProfile();
  const elderMode = isElder(profile);

  const [list, setList] = useState<
    { id: number; message: string; scheduled_for: string; channel: string; status: string }[]
  >([]);
  const [msg, setMsg] = useState("");
  const [when, setWhen] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const load = () =>
    api
      .reminders(pid)
      .then(setList)
      .catch(() => {});
  useEffect(() => {
    if (pid) load();
  }, [pid]);

  const timePresets = [
    "Morning (8 AM)",
    "Afternoon (1 PM)",
    "Evening (6 PM)",
    "Bedtime (10 PM)",
  ];

  return (
    <div className="grid gap-4">
      <Page
        title="Reminders"
        sub={elderMode ? "Things you want to remember" : "Custom nudges beyond the med schedule"}
      />

      {/* Existing reminders */}
      {list.map((r) => (
        <Card key={r.id}>
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className={`font-bold text-ink ${elderMode ? "text-base" : "text-sm"}`}>
                {r.message}
              </p>
              <p className={`text-ink-muted ${elderMode ? "text-sm" : "text-xs"}`}>
                {r.scheduled_for} · {r.channel} · {r.status}
              </p>
            </div>
            {deleteConfirm === r.id ? (
              <div className="flex gap-1.5">
                <button
                  className="rounded-full bg-danger px-3 py-1 text-xs font-bold text-white min-h-[44px]"
                  onClick={async () => {
                    await api.delReminder(pid, r.id);
                    setDeleteConfirm(null);
                    load();
                  }}
                  aria-label={`Confirm delete reminder: ${r.message}`}
                >
                  Yes
                </button>
                <button
                  className="rounded-full bg-surface-sunken px-3 py-1 text-xs font-bold text-ink min-h-[44px]"
                  onClick={() => setDeleteConfirm(null)}
                  aria-label="Cancel delete"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                className={`font-bold text-danger hover:underline min-h-[44px] px-2 ${
                  elderMode ? "text-sm" : "text-xs"
                }`}
                onClick={() => setDeleteConfirm(r.id)}
                aria-label={`Delete reminder: ${r.message}`}
              >
                Delete
              </button>
            )}
          </div>
        </Card>
      ))}
      {list.length === 0 && (
        <Empty
          text={
            elderMode
              ? "No reminders yet. Add one below!"
              : "No custom reminders."
          }
        />
      )}

      {/* Add new reminder */}
      <Card>
        <h2 className={`mb-3 font-bold text-ink ${elderMode ? "text-lg" : "text-base"}`}>
          {elderMode ? "Add a reminder" : "New reminder"}
        </h2>
        <div className="grid gap-3">
          <Input
            placeholder={elderMode ? "What should we remind you?" : "e.g. Evening walk at 6pm"}
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            aria-label="Reminder message"
          />

          {elderMode ? (
            <div>
              <p className="mb-2 text-sm font-bold text-ink-muted">When?</p>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Reminder time">
                {timePresets.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setWhen(preset)}
                    role="radio"
                    aria-checked={when === preset}
                    className={`rounded-xl p-3 text-sm font-bold transition min-h-[48px] ${
                      when === preset
                        ? "bg-primary text-white shadow-sm"
                        : "bg-surface-sunken text-ink hover:bg-muted"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <Input
              placeholder="When (e.g. 06:00 PM daily)"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              aria-label="Reminder time"
            />
          )}

          <Btn
            onClick={async () => {
              if (msg) {
                await api.addReminder(pid, { message: msg, scheduled_for: when });
                setMsg("");
                setWhen("");
                load();
              }
            }}
            disabled={!msg.trim()}
            label="Add new reminder"
            className={`flex items-center justify-center gap-2 ${elderMode ? "!min-h-[56px] !text-lg" : ""}`}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Add reminder</span>
          </Btn>
        </div>
      </Card>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   Discharge Plans — versioned hospital instructions
   ══════════════════════════════════════════════════════════════════ */
export function Plans() {
  const { pid } = useApp();
  const profile = useAdaptiveProfile();
  const elderMode = isElder(profile);

  const [list, setList] = useState<
    { id: number; hospital: string; version: number; is_active: boolean; data: string }[]
  >([]);
  useEffect(() => {
    if (pid)
      api
        .plans(pid)
        .then(setList)
        .catch(() => {});
  }, [pid]);

  const pretty = (d: string) => {
    try {
      const j = JSON.parse(d);
      return [j.notes, (j.medicines || []).map((m: { name: string }) => m.name).join(", ")]
        .filter(Boolean)
        .join(" · ");
    } catch {
      return d.slice(0, 200);
    }
  };

  return (
    <div className="grid gap-4">
      <Page
        title={elderMode ? "Your hospital plans" : "Discharge plans"}
        sub={elderMode ? "Instructions from your hospital" : "Versioned, newest active first"}
      />
      {list.map((p) => (
        <Card key={p.id} className={p.is_active ? "border-2 border-success/40" : ""}>
          <div className="flex items-center justify-between">
            <p className={`font-bold text-ink ${elderMode ? "text-base" : "text-sm"}`}>
              {elderMode ? p.hospital || "Hospital plan" : `v${p.version} · ${p.hospital || "Hospital"}`}
            </p>
            <div className="flex items-center gap-2">
              {p.is_active && <Badge level="taken" />}
              <span className="flex items-center gap-1 rounded-full bg-success-bg px-2.5 py-0.5 text-[10px] font-semibold text-success">
                <Check className="h-3 w-3" aria-hidden="true" />
                <span>Discharge plan</span>
              </span>
            </div>
          </div>
          <p className={`mt-2 text-ink-muted ${elderMode ? "text-base" : "text-sm"}`}>
            {pretty(p.data)}
          </p>
        </Card>
      ))}
      {list.length === 0 && (
        <Empty
          text={
            elderMode
              ? "No hospital plans yet. Ask your caregiver to add one."
              : "No plans yet — your caregiver can create one."
          }
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   Recovery Report — for doctor visits, printable
   ══════════════════════════════════════════════════════════════════ */
export function Report() {
  const { me, pid } = useApp();
  const profile = useAdaptiveProfile();
  const elderMode = isElder(profile);

  const [data, setData] = useState<{
    adherence: number;
    streak: number;
    xp: number;
    taken_today: number;
    total: number;
    next_followup: string | null;
  } | null>(null);
  const [meds, setMeds] = useState<{ name: string; dose: string; time: string }[]>([]);
  const [tl, setTl] = useState<{ description: string; event_type: string; severity?: string | null }[]>([]);
  const [aiRep, setAiRep] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(!elderMode);

  useEffect(() => {
    if (!pid) return;
    api.stats(pid).then(setData).catch(() => {});
    api.meds(pid).then(setMeds).catch(() => {});
    api.timeline(pid).then((t) => setTl(t.slice(0, 25))).catch(() => {});
    api.aiReport(pid).then((r) => setAiRep(r.report)).catch(() => setAiRep("AI report unavailable."));
  }, [pid]);

  return (
    <div className="grid gap-4">
      <Page
        title={elderMode ? "Your recovery report" : "Recovery report"}
        sub={elderMode ? "Show this to your doctor" : "For your next doctor visit"}
        right={
          <Btn
            kind="ghost"
            onClick={() => window.print()}
            label="Print recovery report"
            className="flex items-center gap-1.5"
          >
            <Printer className="h-4 w-4" aria-hidden="true" />
            <span>Print</span>
          </Btn>
        }
      />

      {/* AI Summary */}
      <Card>
        <h2 className={`mb-2 flex items-center gap-2 font-bold text-primary ${elderMode ? "text-lg" : "text-base"}`}>
          <Sparkles className="h-5 w-5" aria-hidden="true" />
          <span>{elderMode ? "What your report says" : "Clinical AI Summary"}</span>
        </h2>
        {!aiRep ? (
          <div className="grid gap-2" aria-busy="true" aria-label="Loading AI summary">
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-5/6" />
            <div className="skeleton h-4 w-4/6" />
          </div>
        ) : (
          <div className={`whitespace-pre-wrap leading-relaxed text-ink ${elderMode ? "text-base" : "text-sm"}`}>
            {aiRep}
          </div>
        )}
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-ink-muted">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          <span>AI-generated summary — confirm key details with your doctor.</span>
        </p>
      </Card>

      {/* Quick stats */}
      {data && (
        <Card>
          <div className={`grid grid-cols-2 gap-3 ${elderMode ? "text-base" : "text-sm"}`}>
            <div className="rounded-xl bg-surface-sunken p-3 text-center">
              <p className="text-2xl font-extrabold text-primary">{data.adherence}%</p>
              <p className="text-xs text-ink-muted">Medicine taken</p>
            </div>
            <div className="rounded-xl bg-surface-sunken p-3 text-center">
              <p className="text-2xl font-extrabold text-primary">{data.streak}d</p>
              <p className="text-xs text-ink-muted">Streak</p>
            </div>
          </div>
          {data.next_followup && (
            <p className={`mt-3 text-ink ${elderMode ? "text-base" : "text-sm"}`}>
              Next appointment: <b>{data.next_followup}</b>
            </p>
          )}
        </Card>
      )}

      {/* Raw data */}
      {elderMode && (
        <Btn
          kind="ghost"
          onClick={() => setShowRaw(!showRaw)}
          label={showRaw ? "Hide detailed data" : "Show detailed data"}
          className="flex items-center justify-center gap-2 !min-h-[52px]"
        >
          <FileText className="h-4 w-4" aria-hidden="true" />
          <span>{showRaw ? "Hide details" : "Show full details"}</span>
        </Btn>
      )}

      {showRaw && (
        <Card>
          <h3 className={`font-extrabold text-ink ${elderMode ? "text-base" : "text-lg"}`}>
            {elderMode ? "Details" : "Raw Data"}
          </h3>
          <p className="text-sm text-ink-muted">
            {me?.name} · generated {new Date().toLocaleString()}
          </p>
          {data && !elderMode && (
            <p className="mt-2 text-sm text-ink">
              Adherence <b>{data.adherence}%</b> · Streak <b>{data.streak}d</b> · XP <b>{data.xp}</b> · Next: <b>{data.next_followup || "—"}</b>
            </p>
          )}
          <h4 className="mt-3 font-bold text-ink">Medicines</h4>
          {meds.map((m, i) => (
            <p key={i} className={`text-ink ${elderMode ? "text-base" : "text-sm"}`}>
              • {m.name} — {m.dose} at {m.time}
            </p>
          ))}
          <h4 className="mt-3 font-bold text-ink">Recent events</h4>
          {tl.map((e, i) => (
            <p key={i} className={`text-ink ${elderMode ? "text-base" : "text-sm"}`}>
              • {e.description} <span className="text-xs text-ink-muted">({e.event_type})</span>
            </p>
          ))}
          <p className="mt-3 text-[11px] text-ink-muted">
            Sathi supports recovery — it does not diagnose or prescribe.
          </p>
        </Card>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   Demo — Judge evaluation flow
   ══════════════════════════════════════════════════════════════════ */
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
      } catch {
        setMsg("Demo login failed. Make sure the backend is running and db is seeded.");
      }
    };
    run();
  }, [refresh]);

  return (
    <div className="flex h-[80vh] flex-col items-center justify-center gap-4 text-center">
      <div className="skeleton h-16 w-16 rounded-full" aria-hidden="true" />
      <h2 className="text-xl font-extrabold text-primary">Sathi Demo</h2>
      <p className="text-sm font-semibold animate-pulse" aria-live="polite">{msg}</p>
      <div className="mt-8 rounded-xl bg-surface p-4 shadow-sm text-xs text-ink-muted max-w-[280px] border border-border">
        This will log you in to the live app as a sample patient and show a guided overlay.
      </div>
    </div>
  );
}
