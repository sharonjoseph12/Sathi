/**
 * Symptoms screen — mirrors frontend Symptoms tab.
 * Text input + severity stepper (0-10), submit via api.symptom,
 * safety result + AI follow-up, history list with Badge.
 */

import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, localSafety } from "../lib/api";
import { useApp } from "../lib/store";
import { useTheme, Btn, Card, Badge, Empty, Input, PageHeader } from "../components/ui";

type HistRow = { id?: number; symptoms: string[]; severity: number; risk: string };

export default function SymptomsScreen() {
  const { pid } = useApp();
  const t = useTheme();
  const [text, setText] = useState("");
  const [sev, setSev] = useState(0);
  const [hist, setHist] = useState<HistRow[]>([]);
  const [res, setRes] = useState("");
  const [followup, setFollowup] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!pid) return;
    try {
      setHist(await api.symptoms(pid));
    } catch {
      /* offline: keep cached/empty */
    }
  }, [pid]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const step = (d: number) => setSev((s) => Math.min(10, Math.max(0, s + d)));

  const submit = async () => {
    const value = text.trim();
    if (!value || !pid || saving) return;
    setSaving(true);
    try {
      const r = await api.symptom(pid, value, sev);
      setRes(r.safety_status === "ESCALATE" ? "⚠ Flagged — please seek medical help." : `Logged (${r.risk}).`);
      setFollowup(r.ai_followup || "");
      setText("");
      setSev(0);
    } catch {
      setRes(`Logged locally (${localSafety(value)}). Will sync.`);
      setFollowup("");
    } finally {
      setSaving(false);
      load();
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.primary} />}
      >
        <PageHeader title="Symptoms" sub="Plain words work — no medical terms needed" />

        <Card style={styles.card}>
          <View style={styles.gap}>
            <Input placeholder="e.g. stomach hurts more than yesterday" value={text} onChangeText={setText} multiline />
            <View style={styles.sevRow}>
              <Text style={[styles.label, { color: t.ink }]}>
                Severity: {sev === 0 ? "—" : `${sev}/10`}
              </Text>
              <View style={styles.stepper}>
                <Pressable
                  accessibilityLabel="Decrease severity"
                  onPress={() => step(-1)}
                  style={[styles.stepBtn, { borderColor: t.border, backgroundColor: t.card }]}
                >
                  <Text style={[styles.stepTxt, { color: t.ink }]}>−</Text>
                </Pressable>
                <Pressable
                  accessibilityLabel="Increase severity"
                  onPress={() => step(1)}
                  style={[styles.stepBtn, { borderColor: t.border, backgroundColor: t.card }]}
                >
                  <Text style={[styles.stepTxt, { color: t.ink }]}>+</Text>
                </Pressable>
              </View>
            </View>
            {res ? (
              <Text style={[styles.res, { color: res.startsWith("⚠") ? t.danger : t.ink }]}>{res}</Text>
            ) : null}
            {followup ? (
              <View style={[styles.followup, { backgroundColor: `${t.primary}1A` }]}>
                <Text style={[styles.followupTitle, { color: t.primary }]}>✨ Nurse follow-up:</Text>
                <Text style={[styles.followupBody, { color: t.ink }]}>{followup}</Text>
                <Btn
                  kind="ghost"
                  onPress={() => {
                    setText(`${followup} `);
                    setFollowup("");
                  }}
                >
                  Answer
                </Btn>
              </View>
            ) : null}
            <Btn onPress={submit} disabled={saving || !text.trim()}>
              {saving ? "Logging…" : "Log symptom"}
            </Btn>
          </View>
        </Card>

        {hist.length === 0 ? (
          <Empty text="No symptoms logged yet." />
        ) : (
          <View style={styles.list}>
            {hist.map((h, i) => (
              <Card key={h.id ?? i} style={styles.row}>
                <View style={styles.rowInner}>
                  <Text style={[styles.rowTxt, { color: t.ink }]} numberOfLines={2}>
                    {h.symptoms[0]} <Text style={{ color: t.mutedFg }}>· {h.severity}/10</Text>
                  </Text>
                  <Badge level={h.risk} />
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 20, paddingBottom: 32 },
  card: { marginBottom: 12 },
  gap: { gap: 10 },
  sevRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  label: { fontSize: 12, fontWeight: "700" },
  stepper: { flexDirection: "row", gap: 8 },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  stepTxt: { fontSize: 22, fontWeight: "800", lineHeight: 24 },
  res: { fontSize: 14, fontWeight: "600" },
  followup: { borderRadius: 12, padding: 12, gap: 8 },
  followupTitle: { fontSize: 14, fontWeight: "700" },
  followupBody: { fontSize: 14, marginBottom: 4 },
  list: { gap: 8 },
  row: { paddingVertical: 12 },
  rowInner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  rowTxt: { fontSize: 14, fontWeight: "600", flex: 1 },
});
