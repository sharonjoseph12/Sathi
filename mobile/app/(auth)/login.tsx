/**
 * Login screen — mirrors frontend/src/screens/auth.tsx Login.
 * Includes a server row: the app shows which backend URL it uses and lets
 * you test/override it, so "offline" login failures are self-diagnosable
 * on physical devices (which can't reach 10.0.2.2/localhost).
 */

import { useEffect, useState } from "react";
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useApp } from "../../lib/store";
import { getApiBase, setApiBase, testConnection } from "../../lib/api";
import { Btn, Input, Card, useTheme } from "../../components/ui";
import { FONT } from "../../lib/theme";

export default function LoginScreen() {
  const { login } = useApp();
  const router = useRouter();
  const t = useTheme();
  const [email, setEmail] = useState("meena@sathi.demo");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // ── Server connection ──────────────────────────────────────────
  const [server, setServer] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [testMsg, setTestMsg] = useState("");
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    void getApiBase().then((b) => {
      setServer(b);
      setDraft(b);
    });
  }, []);

  const runTest = async () => {
    setTesting(true);
    setTestMsg("");
    try {
      await testConnection();
      setTestMsg("✓ Connected to server");
    } catch (e) {
      setTestMsg(`✕ ${e instanceof Error ? e.message : "failed"}`);
    } finally {
      setTesting(false);
    }
  };

  const saveServer = async () => {
    await setApiBase(draft);
    const b = await getApiBase();
    setServer(b);
    setDraft(b);
    setEditing(false);
    setTestMsg("");
  };

  const submit = async () => {
    setBusy(true);
    setError("");
    const err = await login(email, password);
    if (err) setError(err);
    setBusy(false);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: t.bg }}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}>
        {/* Logo + header */}
        <View style={{ alignItems: "center", marginBottom: 32 }}>
          <View style={{
            width: 56, height: 56, borderRadius: 16,
            backgroundColor: t.primary, alignItems: "center", justifyContent: "center",
            marginBottom: 16,
          }}>
            <Text style={{ color: "#fff", fontSize: 24, fontWeight: "800", fontFamily: FONT.extra }}>S</Text>
          </View>
          <Text style={{ fontSize: 26, fontWeight: "800", fontFamily: FONT.extra, color: t.ink, letterSpacing: -0.5 }}>
            Welcome back
          </Text>
          <Text style={{ fontSize: 14, fontFamily: FONT.regular, color: t.mutedFg, marginTop: 4 }}>
            Sign in to continue your recovery
          </Text>
        </View>

        {/* Form */}
        <Card>
          <View style={{ gap: 12 }}>
            <Input
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Input
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            {error ? (
              <View style={{
                backgroundColor: "#fee2e2", borderRadius: 12, padding: 10,
                borderWidth: 1, borderColor: "#fecaca",
              }}>
                <Text style={{ fontSize: 12, fontWeight: "600", fontFamily: FONT.semi, color: "#991b1b" }}>{error}</Text>
              </View>
            ) : null}
            <Btn onPress={submit} disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </Btn>
          </View>
        </Card>

        {/* Server connection (diagnostics + override) */}
        <Card style={{ marginTop: 12 }}>
          <Text style={{ fontSize: 11, fontWeight: "700", fontFamily: FONT.bold, color: t.mutedFg, letterSpacing: 0.8 }}>
            SERVER
          </Text>
          <Text style={{ fontSize: 12, fontFamily: FONT.regular, color: t.ink, marginTop: 4 }} numberOfLines={1}>
            {server || "…"}
          </Text>
          {testMsg ? (
            <Text style={{
              fontSize: 12, fontFamily: FONT.semi, marginTop: 6,
              color: testMsg.startsWith("✓") ? t.success : t.danger,
            }}>
              {testMsg}
            </Text>
          ) : null}
          {editing ? (
            <View style={{ gap: 8, marginTop: 8 }}>
              <Input
                placeholder="http://192.168.1.5:8000/api"
                value={draft}
                onChangeText={setDraft}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Btn onPress={saveServer}><Text>Save</Text></Btn>
                </View>
                <View style={{ flex: 1 }}>
                  <Btn kind="ghost" onPress={() => { setEditing(false); setDraft(server); }}><Text>Cancel</Text></Btn>
                </View>
              </View>
            </View>
          ) : (
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              <View style={{ flex: 1 }}>
                <Btn kind="ghost" onPress={runTest} disabled={testing}>
                  <Text>{testing ? "Testing…" : "Test connection"}</Text>
                </Btn>
              </View>
              <View style={{ flex: 1 }}>
                <Btn kind="ghost" onPress={() => setEditing(true)}><Text>Change</Text></Btn>
              </View>
            </View>
          )}
        </Card>

        {/* Register link */}
        <Pressable onPress={() => router.push("/(auth)/register")} style={{ marginTop: 16, alignItems: "center" }}>
          <Text style={{ fontSize: 13, color: t.primary, fontWeight: "700", fontFamily: FONT.bold }}>
            Don&apos;t have an account? Register
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
