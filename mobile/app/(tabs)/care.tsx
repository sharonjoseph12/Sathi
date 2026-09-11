/**
 * Caregiver dashboard — mirrors frontend CareDash.
 * Link-code connect, patient cards with Ring + Badge, Open detail + Nudge.
 */

import { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { api } from "../../lib/api";
import { useTheme, Btn, Card, Badge, Empty, Input, PageHeader, Ring } from "../../components/ui";

type Patient = {
  id: number; name: string; condition: string; rel: string;
  adherence: number; risk: string; recent: string[];
};

export default function CareScreen() {
  const t = useTheme();
  const [list, setList] = useState<Patient[]>([]);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api.cgPatients();
      setList(r);
    } catch {
      setMsg("Could not load — are you logged in as caregiver/family?");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const connect = async () => {
    if (!code.trim()) return;
    try {
      const r = await api.connect(code.trim().toUpperCase());
      setMsg(`Linked to ${r.patient_name}`);
      setCode("");
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "invalid code");
    }
  };

  const nudge = async (id: number) => {
    try {
      await api.nudge(id, "Thinking of you — keep going! 💜");
      setMsg("Nudge sent");
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
        <PageHeader title="Caregiver dashboard" sub="All linked patients at a glance" />

        <Card style={styles.card}>
          <View style={styles.row}>
            <View style={styles.flex}>
              <Input
                placeholder="Link code (e.g. DB-XXXXXX)"
                value={code}
                onChangeText={(v: string) => setCode(v.toUpperCase())}
                autoCapitalize="characters"
              />
            </View>
            <Btn onPress={connect}>Link</Btn>
          </View>
          {msg ? <Text style={[styles.msg, { color: t.mutedFg }]}>{msg}</Text> : null}
        </Card>

        {list.map((p) => (
          <Card key={p.id} style={styles.card}>
            <View style={styles.patientRow}>
              <Ring pct={p.adherence} size={64} />
              <View style={styles.flex}>
                <Text style={[styles.name, { color: t.ink }]}>{p.name}</Text>
                <Text style={[styles.sub, { color: t.mutedFg }]}>
                  {p.condition} · {p.rel}
                </Text>
                {p.recent[0] ? (
                  <Text style={[styles.sub, { color: t.mutedFg }]}>Latest: {p.recent[0]}</Text>
                ) : null}
              </View>
              <Badge level={p.risk} />
            </View>
            <View style={styles.btnRow}>
              <Btn kind="ghost" onPress={() => router.push(`/care-detail?id=${p.id}`)}>
                Open
              </Btn>
              <Btn kind="ghost" onPress={() => nudge(p.id)}>
                💜 Nudge
              </Btn>
            </View>
          </Card>
        ))}

        {list.length === 0 && (
          <Empty text="No linked patients yet — enter a link code above." />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 20, paddingBottom: 32 },
  card: { marginBottom: 12 },
  row: { flexDirection: "row", gap: 8, alignItems: "center" },
  flex: { flex: 1 },
  msg: { marginTop: 6, fontSize: 12 },
  patientRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  name: { fontSize: 15, fontWeight: "700" },
  sub: { fontSize: 12, marginTop: 2 },
  btnRow: { marginTop: 10, flexDirection: "row", gap: 8 },
});
