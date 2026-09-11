/**
 * useAdaptiveProfile for React Native.
 * Same contract as frontend/src/lib/useAdaptiveProfile.ts.
 * Uses AsyncStorage instead of localStorage.
 */

import { useMemo, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Appearance } from "react-native";
import type { ThemeMode } from "./theme";

// ── Raw profile field types ──────────────────────────────────────────

export type AgeBand = "elder" | "adult" | "young_adult" | "guardian";
export type Role = "patient" | "caregiver" | "guardian" | "family";
export type DigitalLiteracy = "low" | "medium" | "high";
export type UrgencyLevel = "normal" | "monitor" | "escalate";
export type AccessibilityFlag =
  | "large_text"
  | "high_contrast"
  | "voice_primary"
  | "reduced_motion";

export type AdaptiveProfileRaw = {
  ageBand: AgeBand;
  digitalLiteracy: DigitalLiteracy;
  urgencyLevel: UrgencyLevel;
  accessibilityFlags: AccessibilityFlag[];
};

export type AdaptiveProfile = AdaptiveProfileRaw & {
  role: Role;
  isElder: boolean;
  isCaregiver: boolean;
  isGuardian: boolean;
  isLowLiteracy: boolean;
  prefersLargeText: boolean;
  prefersHighContrast: boolean;
  prefersVoice: boolean;
  prefersReducedMotion: boolean;
  maxNavItems: number;
  fontScale: number;
  themeMode: ThemeMode;
};

// ── AsyncStorage persistence ─────────────────────────────────────────

const PROFILE_KEY = "@sathi_adaptive_profile";

const DEFAULT_RAW: AdaptiveProfileRaw = {
  ageBand: "adult",
  digitalLiteracy: "medium",
  urgencyLevel: "normal",
  accessibilityFlags: [],
};

export async function loadAdaptiveProfileRaw(): Promise<AdaptiveProfileRaw> {
  try {
    const stored = await AsyncStorage.getItem(PROFILE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<AdaptiveProfileRaw>;
      return {
        ageBand: parsed.ageBand ?? DEFAULT_RAW.ageBand,
        digitalLiteracy: parsed.digitalLiteracy ?? DEFAULT_RAW.digitalLiteracy,
        urgencyLevel: parsed.urgencyLevel ?? DEFAULT_RAW.urgencyLevel,
        accessibilityFlags: parsed.accessibilityFlags ?? DEFAULT_RAW.accessibilityFlags,
      };
    }
  } catch { /* corrupt or missing */ }
  return { ...DEFAULT_RAW };
}

export async function saveAdaptiveProfileRaw(raw: AdaptiveProfileRaw): Promise<void> {
  try {
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(raw));
  } catch { /* storage issue */ }
}

// ── Derivation ───────────────────────────────────────────────────────

function derive(raw: AdaptiveProfileRaw, role: Role, darkMode: boolean): AdaptiveProfile {
  const isElder = raw.ageBand === "elder";
  const isCaregiver = role === "caregiver";
  const isGuardian = role === "guardian" || raw.ageBand === "guardian";
  const isLowLiteracy = raw.digitalLiteracy === "low";
  const flags = new Set(raw.accessibilityFlags);
  const prefersHighContrast = flags.has("high_contrast") || isElder;

  let themeMode: ThemeMode = darkMode ? "dark" : "light";
  if (isElder || prefersHighContrast) {
    themeMode = darkMode ? "elder-dark" : "elder";
  }

  // RN reduced-motion: check OS accessibility settings via AccessibilityInfo
  // For now, respect the explicit flag only
  const prefersReducedMotion = flags.has("reduced_motion");

  return {
    ...raw,
    role,
    isElder,
    isCaregiver,
    isGuardian,
    isLowLiteracy,
    prefersLargeText: flags.has("large_text") || isElder,
    prefersHighContrast,
    prefersVoice: flags.has("voice_primary") || (isElder && isLowLiteracy),
    prefersReducedMotion,
    maxNavItems: isElder ? 5 : 99,
    fontScale: isElder ? 1.35 : 1.0,
    themeMode,
  };
}

// ── The hook ─────────────────────────────────────────────────────────

export function useAdaptiveProfile(role: Role = "patient"): AdaptiveProfile {
  const [raw, setRaw] = useState<AdaptiveProfileRaw>(DEFAULT_RAW);
  const [loaded, setLoaded] = useState(false);
  const colorScheme = Appearance.getColorScheme();
  const darkMode = colorScheme === "dark";

  useEffect(() => {
    loadAdaptiveProfileRaw().then((r) => {
      setRaw(r);
      setLoaded(true);
    });
  }, []);

  return useMemo(
    () => derive(raw, role, darkMode),
    [raw, role, darkMode, loaded],
  );
}
