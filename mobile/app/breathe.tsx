/**
 * Breathing exercise — ported from frontend/src/screens/well.tsx (Meditation).
 * 4-4-4 guided rhythm with Begin/Stop, phase text, session seconds counter.
 */

import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme, Btn, Card, PageHeader } from "../components/ui";

const PHASES = ["Breathe in…", "Hold…", "Breathe out…"];

export default function BreatheScreen() {
  const t = useTheme();
  const [phase, setPhase] = useState("Ready");
  const [on, setOn] = useState(false);
  const [sec, setSec] = useState(0);

  const s = StyleSheet.create({
    container: { padding: 20, paddingBottom: 32, gap: 12 },
    center: { alignItems: "center", gap: 12, paddingVertical: 24 },
    circle: {
      width: 112, height: 112, borderRadius: 56,
      backgroundColor: on ? t.primary : t.secondary,
      alignItems: "center", justifyContent: "center",
    },
    circleText: { fontSize: 40 },
    phase: { fontSize: 18, fontWeight: "700", color: t.ink },
    sub: { fontSize: 12, color: t.mutedFg },
  });

  useEffect(() => {
    if (!on) return;
    let i = 0;
    setPhase(PHASES[0]);
    const timer = setInterval(() => {
      i = (i + 1) % PHASES.length;
      setPhase(PHASES[i]);
      setSec((prev) => prev + 4);
    }, 4000);
    return () => clearInterval(timer);
  }, [on]);

  const mins = Math.floor(sec / 60);

  const toggle = () => {
    if (on) setPhase("Ready");
    setOn((v) => !v);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={s.container}>
        <PageHeader title="Breathing" sub="4-4-4 calm rhythm" />
        <Card>
          <View style={s.center}>
            <View style={s.circle}>
              <Text style={s.circleText}>🫁</Text>
            </View>
            <Text style={s.phase}>{on ? phase : "Ready when you are"}</Text>
            <Text style={s.sub}>
              {sec}s this session{mins > 0 ? ` (${mins} min)` : ""}
            </Text>
            <Btn kind={on ? "danger" : "primary"} onPress={toggle}>
              {on ? "Stop" : "Begin"}
            </Btn>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
