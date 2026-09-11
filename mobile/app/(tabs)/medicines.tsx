/**
 * Medicines screen — list all medications, log doses.
 */

import { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, type Med } from "../../lib/api";
import { useApp } from "../../lib/store";
import { Card, Btn, SectionLabel, PageHeader, Empty, useTheme } from "../../components/ui";
import { useAdaptiveProfile } from "../../lib/useAdaptiveProfile";
import * as Haptics from "expo-haptics";

export default function MedicinesScreen() {
  const { pid } = useApp();
  const t = useTheme();
  const profile = useAdaptiveProfile();
  const [meds, setMeds] = useState<Med[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [confirming, setConfirming] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!pid) return;
    try { setMeds(await api.meds(pid)); } catch { /* offline */ }
  }, [pid]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const confirm = async (mid: number) => {
    if (!pid) return;
    setConfirming(mid);
    try {
      await api.confirm(pid, mid);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await load();
    } catch { /* offline */ }
    setConfirming(null);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.primary} />}
      >
        <PageHeader
          title="Medicines"
          sub={`${meds.length} medication${meds.length !== 1 ? "s" : ""}`}
          eyebrow="Adherence"
        />

        {meds.length === 0 ? (
          <Empty title="No medicines yet" text="Add your first medicine from the home screen or ask your caregiver to set them up." />
        ) : (
          <View style={{ gap: 10 }}>
            {meds.map((m) => (
              <Card key={m.id}>
                <View style={{ gap: 4 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text style={{ fontSize: profile.isElder ? 18 : 15, fontWeight: "700", color: t.ink }}>
                      💊 {m.name}
                    </Text>
                  </View>
                  <Text style={{ fontSize: profile.isElder ? 14 : 12, color: t.mutedFg }}>
                    {m.dose} · {m.time}
                  </Text>
                  {m.frequency && (
                    <Text style={{ fontSize: 12, color: t.mutedFg }}>{m.frequency}</Text>
                  )}
                  {m.instructions && (
                    <Text style={{ fontSize: 12, color: t.mutedFg, fontStyle: "italic" }}>
                      {m.simplified || m.instructions}
                    </Text>
                  )}
                  <View style={{ marginTop: 8 }}>
                    <Btn
                      onPress={() => confirm(m.id)}
                      disabled={confirming === m.id}
                      kind="success"
                    >
                      {confirming === m.id ? "Logging…" : "✓ Taken now"}
                    </Btn>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
