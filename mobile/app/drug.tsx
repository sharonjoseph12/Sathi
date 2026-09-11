/**
 * Drug interaction check — ported from frontend/src/screens/tools.tsx (DrugChecker).
 */

import { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../lib/api";
import { useApp } from "../lib/store";
import { useTheme, Btn, Card, Empty, PageHeader, Badge } from "../components/ui";

type Interaction = {
  pair: string[];
  severity: string;
  description: string;
  advice: string;
};

type Check = {
  interactions: Interaction[];
  hasCritical: boolean;
  note: string;
};

export default function DrugScreen() {
  const { pid } = useApp();
  const t = useTheme();
  const [r, setR] = useState<Check | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const s = StyleSheet.create({
    container: { padding: 20, paddingBottom: 32, gap: 12 },
    pairRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
    pair: { fontSize: 15, fontWeight: "700", color: t.ink, flex: 1 },
    desc: { fontSize: 14, color: t.ink, marginTop: 6 },
    advice: { fontSize: 12, color: t.mutedFg, marginTop: 4 },
    note: { fontSize: 12, color: t.mutedFg },
    critical: { fontSize: 14, fontWeight: "700", color: t.danger },
    plain: { fontSize: 14, color: t.ink },
  });

  const load = useCallback(async () => {
    if (!pid) return;
    try {
      setR(await api.drugCheck(pid));
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView
        contentContainerStyle={s.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.primary} />}
      >
        <PageHeader title="Drug interaction check" sub="Curated rule base — not a full pharmacology review" />

        {!r ? (
          <Empty text="Checking interactions…" />
        ) : (
          <>
            {r.hasCritical && (
              <Card accent="#EF4444">
                <Text style={s.critical}>
                  ⚠ Critical interaction found — consult your doctor before the next dose.
                </Text>
              </Card>
            )}
            {r.interactions.length === 0 && (
              <Card>
                <Text style={s.plain}>No known pairs from the checked list. {r.note}</Text>
              </Card>
            )}
            {r.interactions.map((x, i) => (
              <Card key={i} accent={x.severity === "high" ? "#EF4444" : "#F59E0B"}>
                <View style={s.pairRow}>
                  <Text style={s.pair}>{x.pair.join(" + ")}</Text>
                  <Badge level={x.severity} />
                </View>
                <Text style={s.desc}>{x.description}</Text>
                <Text style={s.advice}>{x.advice}</Text>
              </Card>
            ))}
            <Text style={s.note}>{r.note}</Text>
            <Btn kind="ghost" onPress={load}>
              Check again
            </Btn>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
