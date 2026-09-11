/**
 * More grid — mirrors web App More().
 * Routes to every recovery tool.
 */

import { View, Text, ScrollView, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useTheme, PageHeader } from "../../components/ui";

type Item = { route: string; title: string; sub: string; icon: string };

const ITEMS: Item[] = [
  { route: "/symptoms", title: "Symptoms", sub: "Log and review symptoms", icon: "💓" },
  { route: "/schedule", title: "Schedule", sub: "Medicines and tasks for today", icon: "📅" },
  { route: "/progress", title: "Progress", sub: "Adherence and timeline", icon: "📊" },
  { route: "/followups", title: "Follow-ups", sub: "Appointments and visits", icon: "🗓️" },
  { route: "/scan", title: "Scan prescription", sub: "Extract medicines from photo", icon: "📷" },
  { route: "/drug", title: "Drug check", sub: "Interaction review", icon: "🛡️" },
  { route: "/simplify", title: "Simplify jargon", sub: "Plain-language explanations", icon: "📖" },
  { route: "/journal", title: "Journal", sub: "Mood, energy and notes", icon: "📝" },
  { route: "/breathe", title: "Breathing", sub: "Guided recovery exercise", icon: "🧘" },
  { route: "/timeline", title: "Timeline", sub: "Full recovery record", icon: "📜" },
  { route: "/care", title: "Care", sub: "Caregiver dashboard", icon: "👥" },
  { route: "/family", title: "Family", sub: "Family view + nudges", icon: "💜" },
  { route: "/reminders", title: "Reminders", sub: "Manage notifications", icon: "🔔" },
  { route: "/plans", title: "Discharge plans", sub: "Hospital instructions", icon: "🏥" },
  { route: "/report", title: "Recovery report", sub: "Summary for care team", icon: "📋" },
  { route: "/notifs", title: "Notifications", sub: "Alerts and updates", icon: "🔔" },
  { route: "/settings", title: "Settings", sub: "Language, theme, access", icon: "⚙️" },
  { route: "/help", title: "Help", sub: "Support and guidance", icon: "❓" },
  { route: "/sos", title: "Emergency SOS", sub: "Urgent help and contacts", icon: "🚨" },
];

export default function MoreScreen() {
  const t = useTheme();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <PageHeader title="More" sub="All recovery tools in one place." />

        <View style={styles.list}>
          {ITEMS.map((item) => (
            <Pressable
              key={item.route}
              onPress={() => router.push(item.route as never)}
              style={[styles.row, { backgroundColor: t.card, borderColor: t.border }]}
            >
              <View style={[styles.icon, { backgroundColor: t.secondary }]}>
                <Text style={styles.iconText}>{item.icon}</Text>
              </View>
              <View style={styles.flex}>
                <Text style={[styles.title, { color: t.ink }]} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={[styles.sub, { color: t.mutedFg }]} numberOfLines={1}>
                  {item.sub}
                </Text>
              </View>
              <Text style={[styles.arrow, { color: t.mutedFg }]}>›</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 20, paddingBottom: 32 },
  list: { gap: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: { fontSize: 18 },
  flex: { flex: 1, minWidth: 0 },
  title: { fontSize: 14, fontWeight: "600" },
  sub: { fontSize: 12, marginTop: 1 },
  arrow: { fontSize: 20, fontWeight: "700" },
});
