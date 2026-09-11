/**
 * Register screen — mirrors frontend/src/screens/auth.tsx Register.
 */

import { useState } from "react";
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useApp } from "../../lib/store";
import { Btn, Input, Card, useTheme } from "../../components/ui";

const ROLES = [
  { value: "patient", label: "Patient", emoji: "🏥" },
  { value: "guardian", label: "Family / Guardian", emoji: "👨‍👩‍👧" },
  { value: "caregiver", label: "Nurse / Caregiver", emoji: "🩺" },
];

export default function RegisterScreen() {
  const { register } = useApp();
  const router = useRouter();
  const t = useTheme();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("patient");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError("");
    const err = await register({ name, email, password, role });
    setBusy(false);
    if (err) {
      setError(err);
    } else {
      router.replace("/(auth)/onboarding");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: t.bg }}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}>
        <View style={{ alignItems: "center", marginBottom: 24 }}>
          <Text style={{ fontSize: 26, fontWeight: "800", color: t.ink }}>Create account</Text>
          <Text style={{ fontSize: 14, color: t.mutedFg, marginTop: 4 }}>Join your care circle</Text>
        </View>

        <Card>
          <View style={{ gap: 12 }}>
            <Input placeholder="Full name" value={name} onChangeText={setName} />
            <Input placeholder="Email" value={email} onChangeText={setEmail}
              keyboardType="email-address" autoCapitalize="none" />
            <Input placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />

            {/* Role selector */}
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: "600", color: t.mutedFg }}>I am a…</Text>
              {ROLES.map((r) => (
                <Pressable key={r.value} onPress={() => setRole(r.value)} style={{
                  flexDirection: "row", alignItems: "center", gap: 10,
                  borderRadius: 12, borderWidth: 2, padding: 12,
                  borderColor: role === r.value ? t.primary : t.border,
                  backgroundColor: role === r.value ? t.secondary : t.card,
                }}>
                  <Text style={{ fontSize: 20 }}>{r.emoji}</Text>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: t.ink }}>{r.label}</Text>
                </Pressable>
              ))}
            </View>

            {error ? (
              <View style={{ backgroundColor: "#fee2e2", borderRadius: 12, padding: 10 }}>
                <Text style={{ fontSize: 12, fontWeight: "600", color: "#991b1b" }}>{error}</Text>
              </View>
            ) : null}

            <Btn onPress={submit} disabled={busy}>
              {busy ? "Creating…" : "Create account"}
            </Btn>
          </View>
        </Card>

        <Pressable onPress={() => router.back()} style={{ marginTop: 16, alignItems: "center" }}>
          <Text style={{ fontSize: 13, color: t.primary, fontWeight: "700" }}>
            Already have an account? Sign in
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
