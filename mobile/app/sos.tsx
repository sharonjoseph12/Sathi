/**
 * SOS screen — emergency card + one-tap alert.
 */

import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, Alert, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../lib/api";
import { useApp } from "../lib/store";
import { Card, Btn, PageHeader, useTheme } from "../components/ui";
import { useAdaptiveProfile } from "../lib/useAdaptiveProfile";
import * as Haptics from "expo-haptics";

type EmCard = {
  name: string; age: number; condition: string; language: string;
  emergency_contact: string; medications: { name: string; dose: string; time: string }[];
  recent_symptoms: string[]; next_followup: string | null; note: string;
};

export default function SOSScreen() {
  const { pid } = useApp();
  const t = useTheme();
  const profile = useAdaptiveProfile();
  const [card, setCard] = useState<EmCard | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!pid) return;
    api.emergencyCard(pid).then(setCard).catch(() => {});
  }, [pid]);

  const sendSOS = async () => {
    if (!pid) return;
    Alert.alert(
      "Send SOS Alert?",
      "This will notify all caregivers and emergency contacts immediately.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send SOS",
          style: "destructive",
          onPress: async () => {
            setSending(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            try {
              await api.sosAlert(pid);
              setSent(true);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch { /* offline */ }
            setSending(false);
          },
        },
      ]
    );
  };

  const callEmergency = () => {
    if (card?.emergency_contact) {
      Linking.openURL(`tel:${card.emergency_contact}`);
    } else {
      Linking.openURL("tel:112");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32 }}>
        <PageHeader title="Emergency" sub="Show this to medical staff" eyebrow="SOS" />

        {/* Big SOS button */}
        <Pressable onPress={sendSOS} disabled={sending || sent} style={{
          backgroundColor: sent ? t.success : t.danger,
          borderRadius: 24,
          padding: 32,
          alignItems: "center",
          marginBottom: 16,
          opacity: sending ? 0.7 : 1,
        }}>
          <Text style={{ fontSize: profile.isElder ? 48 : 40, marginBottom: 8 }}>
            {sent ? "✓" : "🆘"}
          </Text>
          <Text style={{ fontSize: profile.isElder ? 24 : 20, fontWeight: "800", color: "#ffffff" }}>
            {sent ? "Alert Sent" : sending ? "Sending…" : "TAP FOR SOS"}
          </Text>
          <Text style={{ fontSize: 13, color: "#ffffff", opacity: 0.9, marginTop: 4 }}>
            {sent ? "Caregivers have been notified" : "Notifies all caregivers immediately"}
          </Text>
        </Pressable>

        {/* Call button */}
        <Btn kind="danger" onPress={callEmergency} style={{ marginBottom: 20 }}>
          📞 Call {card?.emergency_contact || "Emergency (112)"}
        </Btn>

        {/* Emergency card */}
        {card && (
          <Card>
            <View style={{ gap: 12 }}>
              <Text style={{ fontSize: profile.isElder ? 20 : 16, fontWeight: "800", color: t.ink }}>
                🏥 Emergency Card
              </Text>

              <InfoRow label="Name" value={card.name} t={t} profile={profile} />
              <InfoRow label="Age" value={String(card.age)} t={t} profile={profile} />
              <InfoRow label="Condition" value={card.condition} t={t} profile={profile} />
              <InfoRow label="Language" value={card.language} t={t} profile={profile} />
              <InfoRow label="Emergency Contact" value={card.emergency_contact} t={t} profile={profile} />

              {card.medications.length > 0 && (
                <View>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: t.mutedFg, textTransform: "uppercase", marginBottom: 4 }}>
                    Current Medications
                  </Text>
                  {card.medications.map((m, i) => (
                    <Text key={i} style={{ fontSize: profile.isElder ? 15 : 13, color: t.ink }}>
                      • {m.name} — {m.dose} at {m.time}
                    </Text>
                  ))}
                </View>
              )}

              {card.recent_symptoms.length > 0 && (
                <View>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: t.mutedFg, textTransform: "uppercase", marginBottom: 4 }}>
                    Recent Symptoms
                  </Text>
                  {card.recent_symptoms.map((s, i) => (
                    <Text key={i} style={{ fontSize: profile.isElder ? 15 : 13, color: t.ink }}>• {s}</Text>
                  ))}
                </View>
              )}

              {card.note && (
                <View style={{ backgroundColor: t.muted, borderRadius: 12, padding: 12 }}>
                  <Text style={{ fontSize: 13, color: t.ink, fontStyle: "italic" }}>{card.note}</Text>
                </View>
              )}
            </View>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value, t, profile }: { label: string; value: string; t: any; profile: any }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <Text style={{ fontSize: 12, fontWeight: "600", color: t.mutedFg }}>{label}</Text>
      <Text style={{ fontSize: profile.isElder ? 15 : 13, fontWeight: "700", color: t.ink }}>{value}</Text>
    </View>
  );
}
