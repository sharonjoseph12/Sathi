/**
 * useAdaptiveProfile — Real implementation (Dev 1)
 *
 * Every component/screen imports this to branch on render variant (elder/standard/caregiver).
 * Consumers never pass variant props — they call useAdaptiveProfile() and read the result.
 */

import { useMemo } from "react";
import { useApp } from "./store";

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

// ── Raw stored fields (persisted in localStorage until backend adds them) ──

export type AdaptiveProfileRaw = {
  ageBand: AgeBand;
  digitalLiteracy: DigitalLiteracy;
  urgencyLevel: UrgencyLevel;
  accessibilityFlags: AccessibilityFlag[];
  roleOverride?: Role;
};

export type Density = "elder" | "standard" | "caregiver";

export type AdaptiveProfile = AdaptiveProfileRaw & {
  role: Role;
  density: Density;
  // Self reference so consumers destructuring { profile } get the profile object
  profile: AdaptiveProfile;
  // Convenience booleans — avoid repeated string comparisons in every component
  isElder: boolean;
  isCaregiver: boolean;
  isGuardian: boolean;
  isLowLiteracy: boolean;
  prefersLargeText: boolean;
  prefersHighContrast: boolean;
  prefersVoice: boolean;
  prefersReducedMotion: boolean;
  // Layout constraints
  maxNavItems: number; // 5 for elder, unrestricted otherwise
  fontScale: number;   // 1.0 standard, 1.35 elder
  // Dev 3 convenience alias — keeps consumers readable
  isElderMode: boolean; // = isElder (alias for backward compat with Dev 3 consumers)
  isCareMode: boolean;  // = isCaregiver || isGuardian
};

// ── localStorage persistence ─────────────────────────────────────────

const PROFILE_KEY = "@sathi_adaptive_profile";

const DEFAULT_RAW: AdaptiveProfileRaw = {
  ageBand: "adult",
  digitalLiteracy: "medium",
  urgencyLevel: "normal",
  accessibilityFlags: [],
};

export function loadAdaptiveProfileRaw(): AdaptiveProfileRaw {
  try {
    const stored = localStorage.getItem(PROFILE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<AdaptiveProfileRaw>;
      return {
        ageBand: parsed.ageBand ?? DEFAULT_RAW.ageBand,
        digitalLiteracy: parsed.digitalLiteracy ?? DEFAULT_RAW.digitalLiteracy,
        urgencyLevel: parsed.urgencyLevel ?? DEFAULT_RAW.urgencyLevel,
        accessibilityFlags:
          parsed.accessibilityFlags ?? DEFAULT_RAW.accessibilityFlags,
        roleOverride: parsed.roleOverride,
      };
    }
  } catch {
    /* corrupt or missing — use defaults */
  }
  return { ...DEFAULT_RAW };
}

export function saveAdaptiveProfileRaw(raw: AdaptiveProfileRaw): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(raw));
  } catch {
    /* storage full — degrade gracefully */
  }
}

// ── Derivation: raw fields → full AdaptiveProfile ────────────────────

function derive(raw: AdaptiveProfileRaw, baseRole: Role): AdaptiveProfile {
  const role = raw.roleOverride || baseRole;
  const isElder = raw.ageBand === "elder";
  const isCaregiver = role === "caregiver";
  const isGuardian = role === "guardian" || raw.ageBand === "guardian";
  const isLowLiteracy = raw.digitalLiteracy === "low";
  const flags = new Set(raw.accessibilityFlags || []);

  // Elder users get large text and high contrast by default, even if not explicitly flagged
  const prefersLargeText = flags.has("large_text") || isElder;
  const prefersHighContrast = flags.has("high_contrast") || isElder;

  // Check OS-level reduced-motion preference as a fallback
  const osReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  const density: Density = isElder ? "elder" : isCaregiver ? "caregiver" : "standard";

  const result: any = {
    ...raw,
    role,
    density,
    isElder,
    isCaregiver,
    isGuardian,
    isLowLiteracy,
    prefersLargeText,
    prefersHighContrast,
    prefersVoice: flags.has("voice_primary") || (isElder && isLowLiteracy),
    prefersReducedMotion: flags.has("reduced_motion") || !!osReducedMotion,
    maxNavItems: isElder ? 5 : 99,
    fontScale: isElder ? 1.35 : 1.0,
    // Convenience aliases for Dev 3 consumers (no changes needed in their files)
    isElderMode: isElder,
    isCareMode: isCaregiver || isGuardian,
  };
  result.profile = result;
  return result as AdaptiveProfile;
}

// ── The hook ─────────────────────────────────────────────────────────

export function useAdaptiveProfile(): AdaptiveProfile {
  const { me, adaptiveRaw } = useApp();
  const role = (me?.role ?? "patient") as Role;

  return useMemo(() => {
    return derive(adaptiveRaw || loadAdaptiveProfileRaw(), role);
  }, [adaptiveRaw, role]);
}

// ── CSS class helper: apply to <html> or a container ─────────────────
// Called from the Shell after profile loads to toggle elder/standard tokens.

export function getAdaptiveClasses(profile: AdaptiveProfile): string[] {
  const cls: string[] = [];
  if (profile.isElder) cls.push("elder");
  if (profile.prefersHighContrast) cls.push("high-contrast");
  if (profile.prefersLargeText) cls.push("large-text");
  if (profile.prefersReducedMotion) cls.push("reduced-motion");
  return cls;
}

// ── Backward-compatible convenience helpers (used by Dev 2 screens) ──
// These wrap the new boolean properties for call-site compatibility.

export const isElder = (p: AdaptiveProfile) => p.isElder;
export const isLowLiteracy = (p: AdaptiveProfile) => p.isLowLiteracy;
export const isCaregiver = (p: AdaptiveProfile) => p.isCaregiver;
export const wantsLargeText = (p: AdaptiveProfile) => p.prefersLargeText;
export const wantsHighContrast = (p: AdaptiveProfile) => p.prefersHighContrast;
export const wantsVoicePrimary = (p: AdaptiveProfile) => p.prefersVoice;
export const wantsReducedMotion = (p: AdaptiveProfile) => p.prefersReducedMotion;

// ── Helper functions for component variant selection (used by Dev 4 screens) ──

export function hasFlag(p: AdaptiveProfile, flag: AccessibilityFlag): boolean {
  return p.accessibilityFlags.includes(flag);
}

/** Returns "elder" | "standard" | "caregiver" for component variant selection */
export function getVariant(p: AdaptiveProfile): "elder" | "standard" | "caregiver" {
  if (p.isElder || p.isLowLiteracy) return "elder";
  if (p.role === "caregiver") return "caregiver";
  return "standard";
}

/** Check reduced-motion preference (CSS + profile flag) */
export function prefersReducedMotion(p: AdaptiveProfile): boolean {
  return p.prefersReducedMotion;
}

