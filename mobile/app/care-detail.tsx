/**
 * Patient detail — mirrors frontend PatientDetail.
 * Reads id param, shows doses/symptoms/nudge presets + custom message + timeline.
 */

import { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, RefreshControl, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { api, type Event } from "../lib/api";
import { useTheme, Btn, Card, Badge, Empty, Input, PageHeader } from "../components/ui";

type Detail = {
  timeline: Event[];
  symptoms: { symptoms: string[]; severity: number; risk: string }[];
  doses: { name: string; status: string }[];
  followups: { title: string }[];
};

const PRESETS = [
  "💜 Proud of your recovery today!",
  "💊 Time for your medicines",
  "🚶 Time for a short walk",
  "📅 Don't forget your follow-up",
];

export default function CareDetailScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const pid = Number(id);
  const [d, setD] = useState<Detail | null>(null);
  const [rem, setRem] = useState("");
  const [nmsg, setNmsg] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!pid) return;
    try {
      const r = await api.cgDetail(pid);
      setD(r);
    } catch { /* offline */ }
  }, [pid]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const sendNudge = async (text: string) => {
    if (!text || !pid) return;
    try {
      await api.nudge(pid, text);
      setNmsg("✓ Sent");
    } catch (e) {
      setNmsg(e instanceof Error ? e.message : "failed");
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.primary} />}
      >
        <PageHeader title={`Patient #${id}`} sub="Doses, symptoms and encouragement" />
        <Btn kind="ghost" onPress={() => router.push("/care")} style={styles.backBtn}>
          ← All patients
        </Btn>

        {!d ? (
          <Empty text="Loading…" />
        ) : (
          <>
            <Card style={styles.card}>
              <Text style={[styles.h3, { color: t.ink }]}>Today&apos;s doses</Text>
              {d.doses.map((x, i) => (
                <Text key={i} style={[styles.line, { color: t.ink }]}>
                  • {x.name} — <Text style={styles.bold}>{x.status}</Text>
                </Text>
              ))}
              {d.doses.length === 0 && (
                <Text style={[styles.line, { color: t.mutedFg }]}>No medicines.</Text>
              )}
            </Card>

            <Card style={styles.card}>
              <Text style={[styles.h3, { color: t.ink }]}>Recent symptoms</Text>
              {d.symptoms.map((s, i) => (
                <View key={i} style={styles.symptomRow}>
                  <Text style={[styles.line, styles.flex, { color: t.ink }]}>
                    • {s.symptoms[0]} ({s.severity}/10)
                  </Text>
                  <Badge level={s.risk} />
                </View>
              ))}
              {d.symptoms.length === 0 && (
                <Text style={[styles.line, { color: t.mutedFg }]}>None reported.</Text>
              )}
            </Card>

            <Card style={styles.card}>
              <Text style={[styles.h3, { color: t.ink }]}>Send reminder / nudge</Text>
              <View style={styles.presets}>
                {PRESETS.map((p) => (
                  <Pressable
                    key={p}
                    onPress={() => sendNudge(p)}
                    style={[styles.preset, { backgroundColor: t.secondary }]}
                  >
                    <Text style={[styles.presetText, { color: t.primary }]}>{p}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.row}>
                <View style={styles.flex}>
                  <Input
                    placeholder="or write your own…"
                    value={rem}
                    onChangeText={setRem}
                  />
                </View>
                <Btn
                  onPress={() => {
                    sendNudge(rem);
                    setRem("");
                  }}
                >
                  Send
                </Btn>
              </View>
              {nmsg ? <Text style={[styles.msg, { color: t.mutedFg }]}>{nmsg}</Text> : null}
              <Text style={[styles.hint, { color: t.mutedFg }]}>
                Max 3 nudges/hour per patient (anti-spam).
              </Text>
            </Card>

            <Card style={styles.card}>
              <Text style={[styles.h3, { color: t.ink }]}>Timeline</Text>
              {d.timeline.slice(0, 10).map((e, i) => (
                <Text key={i} style={[styles.line, { color: t.ink }]}>
                  • {e.description}{" "}
                  <Text style={[styles.small, { color: t.mutedFg }]}>{e.event_type}</Text>
                </Text>
              ))}
              {d.timeline.length === 0 && (
                <Text style={[styles.line, { color: t.mutedFg }]}>No events yet.</Text>
              )}
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 20, paddingBottom: 32 },
  backBtn: { marginBottom: 12 },
  card: { marginBottom: 12 },
  h3: { fontSize: 15, fontWeight: "700", marginBottom: 6 },
  line: { fontSize: 14, marginTop: 2 },
  small: { fontSize: 11 },
  bold: { fontWeight: "700" },
  flex: { flex: 1 },
  row: { flexDirection: "row", gap: 8, alignItems: "center", marginTop: 8 },
  symptomRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  presets: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  preset: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  presetText: { fontSize: 12, fontWeight: "700" },
  msg: { marginTop: 6, fontSize: 12 },
  hint: { fontSize: 11, marginTop: 4 },
});
