/**
 * Recovery report — mirrors frontend Report.
 * Stats + meds + timeline + AI summary.
 */

import { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, type Med, type Event } from "../lib/api";
import { useApp } from "../lib/store";
import { useTheme, Card, PageHeader, Ring, Empty } from "../components/ui";

type Stats = {
  adherence: number; streak: number; xp: number;
  taken_today: number; total: number; next_followup: string | null;
};

export default function ReportScreen() {
  const t = useTheme();
  const { me, pid } = useApp();
  const [data, setData] = useState<Stats | null>(null);
  const [meds, setMeds] = useState<Med[]>([]);
  const [tl, setTl] = useState<Event[]>([]);
  const [aiRep, setAiRep] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!pid) return;
    try { setData(await api.stats(pid)); } catch { /* offline */ }
    try { setMeds(await api.meds(pid)); } catch { /* offline */ }
    try { setTl((await api.timeline(pid)).slice(0, 25)); } catch { /* offline */ }
    try {
      const r = await api.aiReport(pid);
      setAiRep(r.report);
    } catch {
      setAiRep("AI report unavailable.");
    }
  }, [pid]);

  useEffect(() => { if (pid) load(); }, [pid, load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.primary} />}
      >
        <PageHeader title="Recovery report" sub="For your next doctor visit" />

        <Card style={styles.card}>
          <Text style={[styles.aiTitle, { color: t.primary }]}>✨ Clinical AI Summary</Text>
          {!aiRep ? (
            <Empty text="Generating summary…" />
          ) : (
            <Text style={[styles.body, { color: t.ink }]}>{aiRep}</Text>
          )}
        </Card>

        <Card style={styles.card}>
          <Text style={[styles.h3, { color: t.ink }]}>Raw Data</Text>
          <Text style={[styles.sub, { color: t.mutedFg }]}>
            {me?.name} · generated {new Date().toLocaleString()}
          </Text>
          {data && (
            <View style={styles.statsRow}>
              <Ring pct={data.adherence} size={72} />
              <View style={styles.flex}>
                <Text style={[styles.body, { color: t.ink }]}>
                  Adherence <Text style={styles.bold}>{data.adherence}%</Text>
                </Text>
                <Text style={[styles.body, { color: t.ink }]}>
                  Streak <Text style={styles.bold}>{data.streak}d</Text> · XP{" "}
                  <Text style={styles.bold}>{data.xp}</Text>
                </Text>
                <Text style={[styles.body, { color: t.ink }]}>
                  Next: <Text style={styles.bold}>{data.next_followup || "—"}</Text>
                </Text>
              </View>
            </View>
          )}

          <Text style={[styles.h4, { color: t.ink }]}>Medicines</Text>
          {meds.map((m, i) => (
            <Text key={i} style={[styles.body, { color: t.ink }]}>
              • {m.name} — {m.dose} at {m.time}
            </Text>
          ))}
          {meds.length === 0 && (
            <Text style={[styles.body, { color: t.mutedFg }]}>No medicines.</Text>
          )}

          <Text style={[styles.h4, { color: t.ink }]}>Recent events</Text>
          {tl.map((e, i) => (
            <Text key={i} style={[styles.body, { color: t.ink }]}>
              • {e.description}{" "}
              <Text style={[styles.small, { color: t.mutedFg }]}>({e.event_type})</Text>
            </Text>
          ))}

          <Text style={[styles.disclaimer, { color: t.mutedFg }]}>
            Sathi supports recovery — it does not diagnose or prescribe.
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 20, paddingBottom: 32 },
  card: { marginBottom: 12 },
  aiTitle: { fontSize: 15, fontWeight: "700", marginBottom: 8 },
  h3: { fontSize: 16, fontWeight: "800" },
  h4: { fontSize: 14, fontWeight: "700", marginTop: 12 },
  sub: { fontSize: 12, marginTop: 2 },
  body: { fontSize: 13, marginTop: 4 },
  small: { fontSize: 11 },
  bold: { fontWeight: "700" },
  flex: { flex: 1 },
  statsRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8 },
  disclaimer: { fontSize: 11, marginTop: 12 },
});
