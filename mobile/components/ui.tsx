/**
 * Sathi React Native UI primitives — profile-aware.
 * Mirrors frontend/src/components/ui.tsx using RN primitives.
 * Visual tokens (radius, padding, colors, type scale) match
 * frontend/src/index.css; type uses Inter like the website.
 */

import React, { type ReactNode } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  Switch,
  Appearance,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useAdaptiveProfile } from "../lib/useAdaptiveProfile";
import { useApp } from "../lib/store";
import { getTheme, TYPOGRAPHY, TOUCH_TARGET, RADIUS, FONT, type ThemeTokens } from "../lib/theme";

// ── Hook for current theme tokens ────────────────────────────────────

export function useTheme(): ThemeTokens & { typo: typeof TYPOGRAPHY.standard; minTouch: number } {
  const profile = useAdaptiveProfile();
  const { me } = useApp();
  // Website drives dark mode from the user's saved theme (Settings toggle),
  // falling back to the OS scheme before login.
  let mode = profile.themeMode;
  if (me?.theme === "dark" && (mode === "light" || mode === "elder")) {
    mode = mode === "elder" ? "elder-dark" : "dark";
  } else if (me?.theme === "light" && (mode === "dark" || mode === "elder-dark")) {
    mode = mode === "elder-dark" ? "elder" : "light";
  } else if (!me && Appearance.getColorScheme() == null && (mode === "dark" || mode === "elder-dark")) {
    mode = mode === "elder-dark" ? "elder" : "light";
  }
  const tokens = getTheme(mode);
  const typo = profile.isElder ? TYPOGRAPHY.elder : TYPOGRAPHY.standard;
  const minTouch = profile.isElder ? TOUCH_TARGET.elder : TOUCH_TARGET.standard;
  return { ...tokens, typo, minTouch };
}

// ── Card ═════════════════════════════════════════════════════════════

export function Card({ children, accent, style }: {
  children: ReactNode; accent?: string; style?: ViewStyle;
}) {
  const t = useTheme();
  const profile = useAdaptiveProfile();
  const pad = profile.isElder ? 20 : profile.isCaregiver ? 12 : 16;
  const borderW = profile.isElder ? 2 : 1;
  return (
    <View style={[{
      borderRadius: RADIUS.lg,
      borderWidth: borderW,
      borderColor: t.border,
      backgroundColor: t.card,
      padding: pad,
      ...(accent ? { borderLeftWidth: 3, borderLeftColor: accent } : {}),
      // Shadow
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    }, style]}>
      {children}
    </View>
  );
}

// ── Btn ══════════════════════════════════════════════════════════════

type BtnKind = "primary" | "ghost" | "danger" | "success";

export function Btn({ children, onPress, kind = "primary", disabled, style }: {
  children: ReactNode; onPress?: () => void; kind?: BtnKind;
  disabled?: boolean; style?: ViewStyle;
}) {
  const t = useTheme();
  const profile = useAdaptiveProfile();
  const minH = profile.isElder ? TOUCH_TARGET.elder : TOUCH_TARGET.standard;
  const fontSize = profile.isElder ? t.typo.base : t.typo.sm;

  const bgMap: Record<BtnKind, string> = {
    primary: t.primary,
    success: t.success,
    danger: t.danger,
    ghost: t.card,
  };
  const fgMap: Record<BtnKind, string> = {
    primary: "#ffffff",
    success: "#ffffff",
    danger: "#ffffff",
    ghost: t.ink,
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [{
        minHeight: minH,
        borderRadius: RADIUS.md,
        paddingHorizontal: profile.isElder ? 24 : 20,
        paddingVertical: profile.isElder ? 14 : 10,
        backgroundColor: bgMap[kind],
        opacity: disabled ? 0.5 : pressed ? 0.9 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
        alignItems: "center" as const,
        justifyContent: "center" as const,
        ...(kind === "ghost" ? { borderWidth: 1, borderColor: t.border } : {}),
      }, style]}
    >
      <Text style={{
        color: fgMap[kind],
        fontSize,
        fontWeight: "700",
        fontFamily: FONT.bold,
      }}>
        {children}
      </Text>
    </Pressable>
  );
}

// ── Input ════════════════════════════════════════════════════════════

export function Input(props: TextInputProps & { label?: string; style?: ViewStyle }) {
  const { label, style, ...rest } = props;
  const t = useTheme();
  const profile = useAdaptiveProfile();
  const minH = profile.isElder ? TOUCH_TARGET.elder : TOUCH_TARGET.standard;
  const fontSize = profile.isElder ? t.typo.lg : t.typo.sm;

  return (
    <View>
      {label && <Text style={{ fontSize: t.typo.xs, fontWeight: "600", fontFamily: FONT.semi, color: t.mutedFg, marginBottom: 4 }}>{label}</Text>}
      <TextInput
        placeholderTextColor={t.mutedFg}
        {...rest}
        style={[{
          minHeight: minH,
          borderRadius: RADIUS.md,
          borderWidth: 1,
          borderColor: t.border,
          backgroundColor: t.card,
          paddingHorizontal: 16,
          paddingVertical: 10,
          fontSize,
          fontFamily: FONT.regular,
          color: t.ink,
        }, style as any]}
      />
    </View>
  );
}

// ── Badge ════════════════════════════════════════════════════════════

const BADGE_COLORS: Record<string, { bg: string; fg: string }> = {
  NORMAL: { bg: "#eef0ff", fg: "#4f46e5" },
  MONITOR: { bg: "#fef3c7", fg: "#92400e" },
  ESCALATE: { bg: "#fee2e2", fg: "#991b1b" },
  high: { bg: "#fee2e2", fg: "#991b1b" },
  medium: { bg: "#fef3c7", fg: "#92400e" },
  low: { bg: "#d1fae5", fg: "#065f46" },
  taken: { bg: "#d1fae5", fg: "#065f46" },
  active: { bg: "#eef0ff", fg: "#4f46e5" },
};

export function Badge({ level }: { level: string }) {
  const profile = useAdaptiveProfile();
  const colors = BADGE_COLORS[level] ?? { bg: "#f2f4f7", fg: "#475467" };
  const icon = level === "ESCALATE" || level === "high" ? "⚠ " : level === "MONITOR" ? "● " : "";
  const fontSize = profile.isElder ? 13 : 11;

  return (
    <View style={{
      backgroundColor: colors.bg,
      borderRadius: RADIUS.full,
      paddingHorizontal: 10,
      paddingVertical: 4,
    }}>
      <Text style={{ color: colors.fg, fontSize, fontWeight: "700", fontFamily: FONT.bold }}>{icon}{level}</Text>
    </View>
  );
}

// ── Ring (adherence circle) ══════════════════════════════════════════

export function Ring({ pct, size: sizeProp }: { pct: number; size?: number }) {
  const profile = useAdaptiveProfile();
  const size = sizeProp ?? (profile.isElder ? 100 : 84);
  const sw = profile.isElder ? 11 : 9;
  const r = (size - sw) / 2;
  const c = 2 * Math.PI * r;
  const col = pct >= 80 ? "#10B981" : pct >= 50 ? "#F59E0B" : "#EF4444";
  const fontSize = profile.isElder ? 22 : 18;

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={`${col}22`} strokeWidth={sw} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={col} strokeWidth={sw} fill="none"
          strokeLinecap="round" strokeDasharray={`${c}`} strokeDashoffset={`${c - (c * pct) / 100}`} />
      </Svg>
      <Text style={{ fontSize, fontWeight: "800", fontFamily: FONT.extra }}>{pct}%</Text>
      <Text style={{ fontSize: 10, color: "#475467", fontFamily: FONT.regular }}>taken</Text>
    </View>
  );
}

// ── SectionLabel ═════════════════════════════════════════════════════

export function SectionLabel({ children }: { children: string }) {
  const t = useTheme();
  const profile = useAdaptiveProfile();
  return (
    <Text style={{
      fontSize: profile.isElder ? t.typo.xs : 11,
      fontWeight: "700",
      fontFamily: FONT.bold,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      color: t.mutedFg,
      marginBottom: 8,
    }}>
      {children}
    </Text>
  );
}

// ── Page header ══════════════════════════════════════════════════════

export function PageHeader({ title, sub, eyebrow }: {
  title: string; sub?: string; eyebrow?: string;
}) {
  const t = useTheme();
  const profile = useAdaptiveProfile();
  return (
    <View style={{ marginBottom: 16 }}>
      {eyebrow && (
        <Text style={{ fontSize: 11, fontWeight: "700", fontFamily: FONT.bold, textTransform: "uppercase", letterSpacing: 0.8, color: t.primary }}>
          {eyebrow}
        </Text>
      )}
      <Text style={{ fontSize: profile.isElder ? t.typo["2xl"] : t.typo.xl, fontWeight: "700", fontFamily: FONT.bold, color: t.ink, letterSpacing: -0.4 }}>
        {title}
      </Text>
      {sub && <Text style={{ fontSize: profile.isElder ? t.typo.sm : t.typo.xs, fontFamily: FONT.regular, color: t.mutedFg, marginTop: 2 }}>{sub}</Text>}
    </View>
  );
}

// ── Empty state ══════════════════════════════════════════════════════

export function Empty({ text, title }: { text: string; title?: string }) {
  const t = useTheme();
  return (
    <View style={{
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: t.border,
      backgroundColor: t.muted + "80",
      padding: 24,
      alignItems: "center",
    }}>
      {title && <Text style={{ fontSize: 14, fontWeight: "600", fontFamily: FONT.semi, color: t.ink }}>{title}</Text>}
      <Text style={{ fontSize: 13, fontFamily: FONT.regular, color: t.mutedFg, marginTop: 4, textAlign: "center" }}>{text}</Text>
    </View>
  );
}

// ── Toggle ═══════════════════════════════════════════════════════════

export function Toggle({ on, onToggle, label }: {
  on: boolean; onToggle: () => void; label: string;
}) {
  const t = useTheme();
  const profile = useAdaptiveProfile();
  return (
    <Pressable onPress={onToggle} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Switch
        value={on}
        onValueChange={onToggle}
        trackColor={{ false: t.border, true: t.primary }}
        thumbColor="#ffffff"
        style={profile.isElder ? { transform: [{ scaleX: 1.3 }, { scaleY: 1.3 }] } : undefined}
      />
      <Text style={{
        fontSize: profile.isElder ? t.typo.sm : t.typo.xs,
        fontWeight: "700",
        fontFamily: FONT.bold,
        color: t.primary,
      }}>
        {label}
      </Text>
    </Pressable>
  );
}

// ── Mascot ═══════════════════════════════════════════════════════════

export function Mascot({ mood = "happy" }: { mood?: "happy" | "concerned" | "celebrate" }) {
  const t = useTheme();
  const bg = mood === "concerned" ? "#fee2e2" : t.secondary;
  const fg = mood === "concerned" ? "#991b1b" : t.primary;
  return (
    <View style={{
      width: 48, height: 48, borderRadius: 24,
      backgroundColor: bg, alignItems: "center", justifyContent: "center",
    }}>
      <Text style={{ fontSize: 14, fontWeight: "700", fontFamily: FONT.bold, color: fg }}>S</Text>
    </View>
  );
}

// ── Avatar ═══════════════════════════════════════════════════════════

export function Avatar({ name }: { name: string }) {
  const t = useTheme();
  const initials = name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "S";
  return (
    <View style={{
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: t.primary, alignItems: "center", justifyContent: "center",
    }}>
      <Text style={{ fontSize: 14, fontWeight: "700", fontFamily: FONT.bold, color: "#ffffff" }}>{initials}</Text>
    </View>
  );
}

// ── Seg (segment tabs) ══════════════════════════════════════════════

export function Seg<T extends string>({ opts, val, set }: { opts: T[]; val: T; set: (t: T) => void }) {
  const t = useTheme();
  const profile = useAdaptiveProfile();
  return (
    <View style={{ flexDirection: "row", gap: 6, marginBottom: 12 }}>
      {opts.map((o) => (
        <Pressable key={o} onPress={() => set(o)} style={{
          borderRadius: RADIUS.full,
          paddingHorizontal: profile.isElder ? 16 : 12,
          paddingVertical: profile.isElder ? 10 : 6,
          backgroundColor: val === o ? t.primary : t.secondary,
        }}>
          <Text style={{
            fontSize: profile.isElder ? t.typo.sm : t.typo.xs,
            fontWeight: "700",
            fontFamily: FONT.bold,
            color: val === o ? "#ffffff" : t.primary,
            textTransform: "capitalize",
          }}>
            {o}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
