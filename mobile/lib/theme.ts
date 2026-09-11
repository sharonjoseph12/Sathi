/**
 * Design token system for Sathi React Native app.
 * Mirrors the CSS custom properties from frontend/src/index.css.
 *
 * Three theme modes: light, dark, elder (high-contrast light), elder-dark.
 * Components read tokens from the active theme via useTheme().
 */

export type ThemeMode = "light" | "dark" | "elder" | "elder-dark";

export type ThemeTokens = {
  bg: string;
  ink: string;
  card: string;
  primary: string;
  secondary: string;
  muted: string;
  mutedFg: string;
  success: string;
  warning: string;
  danger: string;
  border: string;
};

const LIGHT: ThemeTokens = {
  bg: "#f4f5f7",
  ink: "#101828",
  card: "#ffffff",
  primary: "#4f46e5",
  secondary: "#eef0ff",
  muted: "#f2f4f7",
  mutedFg: "#475467",
  success: "#067647",
  warning: "#b54708",
  danger: "#b42318",
  border: "#e4e7ec",
};

const DARK: ThemeTokens = {
  bg: "#0b0f1a",
  ink: "#f2f4f7",
  card: "#121826",
  primary: "#818cf8",
  secondary: "#1c2440",
  muted: "#1a2233",
  mutedFg: "#98a2b3",
  success: "#32d583",
  warning: "#fdb022",
  danger: "#f97066",
  border: "#232d42",
};

const ELDER: ThemeTokens = {
  bg: "#fffdf7",
  ink: "#0a0a0a",
  card: "#ffffff",
  primary: "#1a3fb5",
  secondary: "#e8edff",
  muted: "#f5f3ee",
  mutedFg: "#2d2d2d",
  success: "#065f46",
  warning: "#92400e",
  danger: "#991b1b",
  border: "#b0b0b0",
};

const ELDER_DARK: ThemeTokens = {
  bg: "#0a0a0a",
  ink: "#f5f5f5",
  card: "#1a1a1a",
  primary: "#93a3f8",
  secondary: "#1e2550",
  muted: "#1c1c1c",
  mutedFg: "#d4d4d4",
  success: "#4ade80",
  warning: "#fbbf24",
  danger: "#f87171",
  border: "#404040",
};

export const THEMES: Record<ThemeMode, ThemeTokens> = {
  light: LIGHT,
  dark: DARK,
  elder: ELDER,
  "elder-dark": ELDER_DARK,
};

export function getTheme(mode: ThemeMode): ThemeTokens {
  return THEMES[mode];
}

// ── Typography scales ────────────────────────────────────────────────

// Inter (loaded via @expo-google-fonts/inter in app/_layout.tsx).
// iOS/Android resolve these family names once the fonts are loaded.
export const FONT = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semi: "Inter_600SemiBold",
  bold: "Inter_700Bold",
  extra: "Inter_800ExtraBold",
} as const;

export type TypographyScale = {
  xs: number;
  sm: number;
  base: number;
  lg: number;
  xl: number;
  "2xl": number;
  "3xl": number;
};

export const TYPOGRAPHY: Record<"standard" | "elder", TypographyScale> = {
  standard: { xs: 11, sm: 13, base: 15, lg: 17, xl: 20, "2xl": 24, "3xl": 30 },
  elder: { xs: 14, sm: 16, base: 20, lg: 24, xl: 28, "2xl": 32, "3xl": 38 },
};

// ── Spacing & sizing ─────────────────────────────────────────────────

export const TOUCH_TARGET = {
  standard: 44,
  elder: 56,
} as const;

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
} as const;
