/**
 * Family dashboard — mirrors frontend FamilyDash.
 * Read-only cards + send nudge.
 */

import { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../lib/api";
import { useTheme, Btn, Card, Badge, Empty, PageHeader, Ring } from "../../components/ui";

type Patient = {
  id: number; name: string; adherence: number; risk: string; recent: string[];
};

export default function FamilyScreen() {
  const t = useTheme();
  const [list, setList] = useState<Patient[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await api.cgPatients();
      setList(r);
    } catch { /* offline */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const nudge = async (id: number) => {
    try {
      await api.nudge(id, "💜 Proud of your recovery today!");
      setMsg("Nudge sent 💜");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "nudge failed");
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.primary} />}
      >
        <PageHeader title="Family view" sub="Read-only status + encouragement" />
        {msg ? <Text style={[styles.msg, { color: t.mutedFg }]}>{msg}</Text> : null}

        {list.map((p) => (
          <Card key={p.id} style={styles.card}>
            <View style={styles.row}>
              <Ring pct={p.adherence} size={64} />
              <View style={styles.flex}>
                <Text style={[styles.name, { color: t.ink }]}>{p.name}</Text>
                <Text style={[styles.sub, { color: t.mutedFg }]}>
                  {p.recent[0] || "No recent symptoms"}
                </Text>
              </View>
              <Badge level={p.risk} />
            </View>
            <View style={styles.btnWrap}>
              <Btn kind="ghost" onPress={() => nudge(p.id)}>
                Send 💜 nudge
              </Btn>
            </View>
          </Card>
        ))}

        {list.length === 0 && <Empty text="Nothing shared with you yet." />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 20, paddingBottom: 32 },
  card: { marginBottom: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  flex: { flex: 1 },
  name: { fontSize: 15, fontWeight: "700" },
  sub: { fontSize: 12, marginTop: 2 },
  btnWrap: { marginTop: 10 },
  msg: { fontSize: 12, marginBottom: 8 },
});
