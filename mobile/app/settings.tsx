/**
 * Settings — mirrors frontend Settings (minus DOM-only QR/camera).
 * Language, theme, anchor times, link patient, show link code, logout.
 * Link codes shown as text instead of QR.
 */

import { useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { api } from "../lib/api";
import { useApp } from "../lib/store";
import { useTheme, Btn, Card, Input, PageHeader, Toggle } from "../components/ui";

const LANGS = ["en", "hi", "kn", "ta", "te", "es"];

export default function SettingsScreen() {
  const t = useTheme();
  const { me, pid, refresh, logout } = useApp();
  const [lang, setLang] = useState(me?.language || "en");
  const [theme, setTheme] = useState(me?.theme || "light");
  const [anchors, setAnchors] = useState(me?.anchor_times || "");
  const [code, setCode] = useState("");
  const [share, setShare] = useState("");
  const [msg, setMsg] = useState("");

  const save = async () => {
    try {
      await api.settings({ language: lang, theme, anchor_times: anchors });
      await refresh();
      setMsg("Saved");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "failed");
    }
  };

  const join = async () => {
    if (!code.trim()) return;
    try {
      await api.connect(code.trim().toUpperCase());
      await refresh();
      setCode("");
      setMsg("Linked!");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "invalid");
    }
  };

  const showCode = async () => {
    if (!pid) return;
    try {
      const c = await api.linkCode(pid);
      setShare(c.code);
    } catch {
      setMsg("Only the patient owner can view the link code.");
    }
  };

  const doLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <PageHeader title="Settings" />

        <Card style={styles.card}>
          <Text style={[styles.label, { color: t.ink }]}>Language</Text>
          <View style={styles.langRow}>
            {LANGS.map((l) => (
              <Pressable
                key={l}
                onPress={() => setLang(l)}
                style={[
                  styles.langBtn,
                  { backgroundColor: lang === l ? t.primary : t.secondary },
                ]}
              >
                <Text style={[styles.langText, { color: lang === l ? "#ffffff" : t.primary }]}>
                  {l}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.label, { color: t.ink }]}>Anchor times (JSON)</Text>
          <Input value={anchors} onChangeText={setAnchors} placeholder='e.g. ["08:00","20:00"]' />

          <View style={styles.toggleWrap}>
            <Toggle on={theme === "dark"} onToggle={() => setTheme((v) => (v === "dark" ? "light" : "dark"))} label="Dark mode" />
          </View>

          <Btn onPress={save}>Save</Btn>
          {msg ? <Text style={[styles.msg, { color: t.mutedFg }]}>{msg}</Text> : null}
        </Card>

        <Card style={styles.card}>
          <Text style={[styles.h3, { color: t.ink }]}>Link a patient</Text>
          <View style={styles.row}>
            <View style={styles.flex}>
              <Input
                placeholder="DB-XXXXXX"
                value={code}
                onChangeText={(v) => setCode(v.toUpperCase())}
                autoCapitalize="characters"
              />
            </View>
            <Btn onPress={join}>Join</Btn>
          </View>
        </Card>

        {pid > 0 && (
          <Card style={styles.card}>
            <Text style={[styles.h3, { color: t.ink }]}>Share this patient</Text>
            <Btn kind="ghost" onPress={showCode}>
              Show link code
            </Btn>
            {share ? (
              <>
                <Text style={[styles.shareCode, { color: t.ink }]}>{share}</Text>
                <Text style={[styles.hint, { color: t.mutedFg }]}>
                  Caregivers can type this code in Settings → Link a patient.
                </Text>
              </>
            ) : null}
          </Card>
        )}

        <Btn kind="danger" onPress={doLogout}>
          Log out ({me?.email || "account"})
        </Btn>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 20, paddingBottom: 32 },
  card: { marginBottom: 12, gap: 8 },
  label: { fontSize: 12, fontWeight: "700" },
  h3: { fontSize: 15, fontWeight: "700", marginBottom: 4 },
  langRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  langBtn: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  langText: { fontSize: 12, fontWeight: "700" },
  toggleWrap: { marginVertical: 4 },
  row: { flexDirection: "row", gap: 8, alignItems: "center" },
  flex: { flex: 1 },
  msg: { fontSize: 12 },
  shareCode: { fontSize: 20, fontWeight: "800", fontFamily: "monospace", marginTop: 8 },
  hint: { fontSize: 11, marginTop: 4 },
});
