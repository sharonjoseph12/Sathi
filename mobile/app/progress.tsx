/**
 * Progress screen — mirrors frontend Progress tab.
 * Adherence ring + streak/XP + 7-day bars + recovery timeline.
 */

import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, type Event, type Stats } from "../lib/api";
import { useApp } from "../lib/store";
import { useTheme, Card, Empty, PageHeader, Ring } from "../components/ui";

export default function ProgressScreen() {
  const { pid } = useApp();
  const t = useTheme();
  const [st, setSt] = useState<Stats>({
    adherence: 0,
    taken_today: 0,
    total: 0,
    streak: 0,
    xp: 0,
    next_followup: null,
    week: [],
  });
  const [tl, setTl] = useState<Event[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!pid) return;
    try {
      setSt(await api.stats(pid));
    } catch {
      /* offline */
    }
    try {
      setTl(await api.timeline(pid));
    } catch {
      /* offline */
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

  const trophy = st.streak >= 7;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.primary} />}
      >
        <PageHeader title="Progress" />

        <Card style={styles.card}>
          <View style={styles.topRow}>
            <Ring pct={st.adherence} size={96} />
            <View style={styles.topTxt}>
              <Text style={[styles.line, { color: t.ink }]}>
                🔥 <Text style={styles.bold}>{st.streak}</Text> active days
              </Text>
              <Text style={[styles.line, { color: t.ink }]}>
                ✨ <Text style={styles.bold}>{st.xp}</Text> XP (+10 per dose)
              </Text>
              <Text style={[styles.line, { color: t.ink }]}>
                ✅ {st.taken_today}/{st.total} today
              </Text>
              {trophy ? (
                <View style={styles.trophy}>
                  <Text style={styles.trophyTxt}>🏆 7-day streak trophy!</Text>
                </View>
              ) : null}
            </View>
          </View>
          {st.week.length > 0 ? (
            <View style={styles.bars}>
              {st.week.map((d) => {
                const h = Math.max(d.pct, 4);
                return (
                  <View key={d.date} style={styles.barCol}>
                    <View style={[styles.barTrack, { backgroundColor: t.muted }]}>
                      <View style={[styles.barFill, { height: `${h}%`, backgroundColor: t.primary }]} />
                    </View>
                    <Text style={[styles.barLabel, { color: t.mutedFg }]}>{d.date.slice(5)}</Text>
                  </View>
                );
              })}
            </View>
          ) : null}
        </Card>

        <Card>
          <Text style={[styles.h3, { color: t.ink }]}>Recovery timeline</Text>
          {tl.length === 0 ? (
            <Empty text="No events yet." />
          ) : (
            <View style={[styles.timeline, { borderLeftColor: t.border }]}>
              {tl.slice(0, 20).map((e, i) => (
                <View key={e.id ?? i} style={styles.tlRow}>
                  <View style={[styles.dot, { backgroundColor: t.primary }]} />
                  <Text style={[styles.tlTitle, { color: t.ink }]}>{e.description}</Text>
                  <Text style={[styles.tlSub, { color: t.mutedFg }]}>
                    {e.event_type}
                    {e.severity ? ` · ${e.severity}` : ""}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 20, paddingBottom: 32 },
  card: { marginBottom: 12 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  topTxt: { flex: 1, gap: 2 },
  line: { fontSize: 14 },
  bold: { fontWeight: "800" },
  trophy: { marginTop: 6, borderRadius: 999, backgroundColor: "#fef3c7", paddingHorizontal: 8, paddingVertical: 2, alignSelf: "flex-start" },
  trophyTxt: { fontSize: 12, fontWeight: "700", color: "#92400e" },
  bars: { marginTop: 12, flexDirection: "row", alignItems: "flex-end", gap: 6 },
  barCol: { flex: 1, alignItems: "center", gap: 4 },
  barTrack: { height: 64, width: "100%", borderRadius: 8, overflow: "hidden", justifyContent: "flex-end" },
  barFill: { width: "100%", borderRadius: 8 },
  barLabel: { fontSize: 9 },
  h3: { fontSize: 15, fontWeight: "700", marginBottom: 8 },
  timeline: { borderLeftWidth: 2, paddingLeft: 16 },
  tlRow: { marginBottom: 12, position: "relative" },
  dot: { position: "absolute", left: -21, top: 4, width: 10, height: 10, borderRadius: 5 },
  tlTitle: { fontSize: 14, fontWeight: "600" },
  tlSub: { fontSize: 12, marginTop: 2 },
});
