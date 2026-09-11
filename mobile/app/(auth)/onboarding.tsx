/**
 * Onboarding — profile capture flow (mirrors frontend/src/screens/onboarding.tsx).
 * 4 steps: age band → digital comfort → accessibility → patient details.
 */

import { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { api } from "../../lib/api";
import { useApp } from "../../lib/store";
import { Btn, Card, Input, useTheme } from "../../components/ui";
import {
  type AgeBand, type DigitalLiteracy, type AccessibilityFlag,
  type AdaptiveProfileRaw, saveAdaptiveProfileRaw,
} from "../../lib/useAdaptiveProfile";

type Step = "age" | "comfort" | "access" | "details";
const STEPS: Step[] = ["age", "comfort", "access", "details"];

const AGE_OPTIONS: { value: AgeBand; label: string; desc: string; emoji: string }[] = [
  { value: "elder",       label: "Elder (60+)",          desc: "Large buttons, simple navigation",  emoji: "👴" },
  { value: "adult",       label: "Adult (25–59)",        desc: "Balanced detail and speed",          emoji: "🧑" },
  { value: "young_adult", label: "Young adult (18–24)",  desc: "Fast, compact, modern feel",         emoji: "🧑‍🎓" },
  { value: "guardian",    label: "Guardian (for a child)", desc: "Managing a child's health profile", emoji: "👶" },
];

const COMFORT_OPTIONS: { value: DigitalLiteracy; label: string; desc: string }[] = [
  { value: "low",    label: "Not very comfortable", desc: "I need help using phone apps" },
  { value: "medium", label: "Somewhat comfortable",  desc: "I use a few apps daily" },
  { value: "high",   label: "Very comfortable",      desc: "I'm confident with technology" },
];

const ACCESS_OPTIONS: { value: AccessibilityFlag; label: string; desc: string }[] = [
  { value: "large_text",      label: "Larger text",       desc: "Increase text size throughout the app" },
  { value: "high_contrast",   label: "High contrast",     desc: "Stronger colors, clearer boundaries" },
  { value: "voice_primary",   label: "Voice-first",       desc: "Prefer speaking over typing" },
  { value: "reduced_motion",  label: "Reduce animations", desc: "Fewer moving elements on screen" },
];

export default function OnboardingScreen() {
  const { me, refresh, setPid, setAdaptiveProfile } = useApp();
  const router = useRouter();
  const t = useTheme();
  const [step, setStep] = useState<Step>("age");
  const stepIdx = STEPS.indexOf(step);

  const [ageBand, setAgeBand] = useState<AgeBand>("adult");
  const [literacy, setLiteracy] = useState<DigitalLiteracy>("medium");
  const [flags, setFlags] = useState<AccessibilityFlag[]>([]);
  const toggleFlag = (f: AccessibilityFlag) =>
    setFlags((prev) => prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]);

  const [details, setDetails] = useState({ name: me?.name || "", phone: "", condition: "", age: "62" });
  const setDetail = (k: string, v: string) => setDetails((p) => ({ ...p, [k]: v }));
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const handleAgeBand = (v: AgeBand) => {
    setAgeBand(v);
    if (v === "elder") {
      setFlags((prev) => { const s = new Set(prev); s.add("large_text"); s.add("high_contrast"); return [...s]; });
      setLiteracy("low");
    }
  };

  const next = () => { if (stepIdx < STEPS.length - 1) setStep(STEPS[stepIdx + 1]); };
  const back = () => { if (stepIdx > 0) setStep(STEPS[stepIdx - 1]); };

  const submit = async () => {
    setBusy(true); setMsg("");
    const raw: AdaptiveProfileRaw = {
      ageBand, digitalLiteracy: literacy, urgencyLevel: "normal", accessibilityFlags: flags,
    };
    setAdaptiveProfile(raw);
    await saveAdaptiveProfileRaw(raw);

    try {
      const p = await api.createPatient({ ...details, age: Number(details.age) || 0 });
      setPid(p.id);
      await refresh();
      router.replace("/(tabs)");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Something went wrong");
    } finally { setBusy(false); }
  };

  // ── Selection button helper ──
  const SelectBtn = ({ selected, onPress, children }: { selected: boolean; onPress: () => void; children: React.ReactNode }) => (
    <Pressable onPress={onPress} style={{
      borderRadius: 16, borderWidth: 2, padding: 16,
      borderColor: selected ? t.primary : t.border,
      backgroundColor: selected ? t.secondary : t.card,
    }}>
      {children}
    </Pressable>
  );

  const CheckBtn = ({ on, onPress, children }: { on: boolean; onPress: () => void; children: React.ReactNode }) => (
    <Pressable onPress={onPress} style={{
      flexDirection: "row", alignItems: "center", gap: 12,
      borderRadius: 16, borderWidth: 2, padding: 16,
      borderColor: on ? t.primary : t.border,
      backgroundColor: on ? t.secondary : t.card,
    }}>
      <View style={{
        width: 24, height: 24, borderRadius: 6, borderWidth: 2,
        borderColor: on ? t.primary : t.border,
        backgroundColor: on ? t.primary : t.card,
        alignItems: "center", justifyContent: "center",
      }}>
        {on && <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>✓</Text>}
      </View>
      <View style={{ flex: 1 }}>{children}</View>
    </Pressable>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }}
      contentContainerStyle={{ padding: 24, paddingTop: 60 }}>

      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <View style={{ width: 44, height: 44, borderRadius: 16, backgroundColor: t.primary, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: "#fff", fontSize: 20, fontWeight: "800" }}>S</Text>
        </View>
        <View>
          <Text style={{ fontSize: 22, fontWeight: "800", color: t.ink }}>Set up Sathi</Text>
          <Text style={{ fontSize: 13, color: t.mutedFg }}>Step {stepIdx + 1} of {STEPS.length}</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={{ flexDirection: "row", gap: 6, marginBottom: 20 }}>
        {STEPS.map((s, i) => (
          <View key={s} style={{
            flex: 1, height: 6, borderRadius: 3,
            backgroundColor: i <= stepIdx ? t.primary : t.border,
          }} />
        ))}
      </View>

      {/* Step content */}
      <Card>
        {step === "age" && (
          <View style={{ gap: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: t.ink }}>Who is this profile for?</Text>
            <Text style={{ fontSize: 13, color: t.mutedFg }}>This helps Sathi adapt its interface.</Text>
            {AGE_OPTIONS.map((o) => (
              <SelectBtn key={o.value} selected={ageBand === o.value} onPress={() => handleAgeBand(o.value)}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <Text style={{ fontSize: 24 }}>{o.emoji}</Text>
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: t.ink }}>{o.label}</Text>
                    <Text style={{ fontSize: 12, color: t.mutedFg }}>{o.desc}</Text>
                  </View>
                </View>
              </SelectBtn>
            ))}
          </View>
        )}

        {step === "comfort" && (
          <View style={{ gap: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: t.ink }}>How comfortable are you with apps?</Text>
            <Text style={{ fontSize: 13, color: t.mutedFg }}>No wrong answer — this helps us keep things simple.</Text>
            {COMFORT_OPTIONS.map((o) => (
              <SelectBtn key={o.value} selected={literacy === o.value} onPress={() => setLiteracy(o.value)}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: t.ink }}>{o.label}</Text>
                <Text style={{ fontSize: 12, color: t.mutedFg }}>{o.desc}</Text>
              </SelectBtn>
            ))}
          </View>
        )}

        {step === "access" && (
          <View style={{ gap: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: t.ink }}>Accessibility preferences</Text>
            <Text style={{ fontSize: 13, color: t.mutedFg }}>Select any that help. Change later in Settings.</Text>
            {ACCESS_OPTIONS.map((o) => (
              <CheckBtn key={o.value} on={flags.includes(o.value)} onPress={() => toggleFlag(o.value)}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: t.ink }}>{o.label}</Text>
                <Text style={{ fontSize: 12, color: t.mutedFg }}>{o.desc}</Text>
              </CheckBtn>
            ))}
          </View>
        )}

        {step === "details" && (
          <View style={{ gap: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: t.ink }}>Recovery profile</Text>
            <Text style={{ fontSize: 13, color: t.mutedFg }}>One profile per patient.</Text>
            <Input placeholder="Patient name" value={details.name} onChangeText={(v) => setDetail("name", v)} />
            <Input placeholder="Phone" value={details.phone} onChangeText={(v) => setDetail("phone", v)} keyboardType="phone-pad" />
            <Input placeholder="Condition (e.g. post-surgery)" value={details.condition} onChangeText={(v) => setDetail("condition", v)} />
            <Input placeholder="Age" value={details.age} onChangeText={(v) => setDetail("age", v)} keyboardType="numeric" />
            {msg ? (
              <View style={{ backgroundColor: "#fee2e2", borderRadius: 12, padding: 10 }}>
                <Text style={{ fontSize: 12, fontWeight: "600", color: "#991b1b" }}>{msg}</Text>
              </View>
            ) : null}
            {busy && <Text style={{ fontSize: 12, color: t.mutedFg }}>Setting up your profile…</Text>}
          </View>
        )}
      </Card>

      {/* Navigation buttons */}
      <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
        {stepIdx > 0 && <Btn kind="ghost" onPress={back} style={{ flex: 1 }}>Back</Btn>}
        {step === "details" ? (
          <Btn onPress={submit} disabled={busy} style={{ flex: 1 }}>
            {busy ? "Setting up…" : "Start recovery"}
          </Btn>
        ) : (
          <Btn onPress={next} style={{ flex: 1 }}>Continue</Btn>
        )}
      </View>

      {me?.role !== "patient" && (
        <Pressable onPress={() => router.replace("/(tabs)")} style={{ marginTop: 12, alignItems: "center" }}>
          <Text style={{ fontSize: 12, fontWeight: "700", color: t.primary }}>Skip — I join via link code</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}
