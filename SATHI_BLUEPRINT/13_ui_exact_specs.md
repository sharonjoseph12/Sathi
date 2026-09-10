# 13_ui_exact_specs.md — SATHI Exact Pixel-Level UI Specification

Extracted from the original `artifacts/discharge-buddy/` source code. Use these values for a pixel-identical replica.

---

## 1. COLOR SYSTEM

### Light Theme (`constants/colors.ts`)
```
background:    "#F8F7FF"     // page bg
foreground:    "#1E1B4B"     // text
card:          "#FFFFFF"     // card bg
primary:       "#7C3AED"     // buttons, links
primaryFg:     "#FFFFFF"
secondary:     "#EDE9FE"
secondaryFg:   "#5B21B6"
muted:         "#F3F0FF"
mutedFg:       "#6B7280"
accent:        "#A78BFA"
success:       "#10B981"     // green
successFg:     "#FFFFFF"
warning:       "#F59E0B"     // amber
destructive:   "#EF4444"     // red
emergency:     "#EF4444"
border:        "#E8E4FF"
input:         "#F3F0FF"
tabBarBg:      "#FFFFFF"
headerBg:      "#FFFFFF"
radius:        16
```

### Dark Theme
```
background:    "#0D0B1E"
foreground:    "#F5F3FF"
card:          "#1A1730"
primary:       "#A78BFA"
primaryFg:     "#0D0B1E"
secondary:     "#2D1F6E"
secondaryFg:   "#DDD6FE"
muted:         "#1E1945"
mutedFg:       "#A78BFA"
accent:        "#7C3AED"
success:       "#34D399"
warning:       "#FBBF24"
destructive:   "#F87171"
emergency:     "#F87171"
border:        "#2D1F6E"
input:         "#1A1730"
tabBarBg:      "#0D0B1E"
headerBg:      "#0D0B1E"
radius:        16
```

### Purple Gradient Header
```typescript
colors: ["#4B26C8", "#6C47FF", "#8B5CF6"]   // used in LinearGradient headers
PURPLE: "#6C47FF"
PURPLE_LIGHT: "#EDE9FE"
```

### Status Color Mappings
```typescript
taken:   { color: "#10B981", bg: "#D1FAE5", icon: "check-circle" }
missed:  { color: "#EF4444", bg: "#FEE2E2", icon: "x-circle" }
snoozed: { color: "#F59E0B", bg: "#FEF3C7", icon: "clock" }
pending: { color: "#7C3AED", bg: "#EDE9FE", icon: "circle" }
```

---

## 2. TYPOGRAPHY

### Font Family
```
Inter_400Regular
Inter_500Medium
Inter_600SemiBold
Inter_700Bold
Inter_800ExtraBold
```

### Font Sizes (by usage)
```
nameText:     19   (700Bold)
welcomeText:  16   (500Medium)
sectionTitle: 17   (700Bold)
cardName:     17   (700Bold)
dosageChip:   11   (600SemiBold)
timeText:     11   (400Regular)
statusText:   10   (600SemiBold)
doseName:     14   (700Bold)
doseSub:      11   (400Regular)
btnText:      16   (700Bold)
bubbleText:   15   (500Medium)  lineHeight: 22
intrTitle:    26   (700Bold)
intrSub:      16   (400Regular) lineHeight: 24
```

---

## 3. SHADOWS (per component)

### Cards
```typescript
// MedicineCard, DoseRow, cpCard
shadowColor: "#7C3AED" or "#000"
shadowOffset: { width: 0, height: 2 }
shadowOpacity: 0.07
shadowRadius: 8
elevation: 3
```

### Bottom Sheet (Login, Intro)
```typescript
shadowColor: "#000"
shadowOffset: { width: 0, height: -10 }
shadowOpacity: 0.08
shadowRadius: 20
elevation: 30
```

### Buttons / FAB
```typescript
// FAB (floating tab bar)
shadowColor: "#6C47FF"
shadowOffset: { width: 0, height: 6 }
shadowOpacity: 0.45
shadowRadius: 16
elevation: 10

// "Get Started" button
shadowColor: "#6C47FF"
shadowOffset: { width: 0, height: 8 }
shadowOpacity: 0.3
shadowRadius: 16
elevation: 10
```

### Mascot
```typescript
shadowColor: "#000"
shadowOffset: { width: 0, height: 15 }
shadowOpacity: 0.25
shadowRadius: 25
elevation: 30
```

---

## 4. BORDER RADIUS PATTERN

```
radius base:  16  (buttons, inputs, cards, chips)
card:         22  (MedicineCard, followupCard)
bubble:       24  (MascotBuddy bubble)
sheet:        40  (bottom sheets top corners)
pill:         50  (tab bar, pills, chips)
button:       100 (rounded full - "Get Started")
iconWrap:     21  (header icon buttons)
```

---

## 5. COMPONENT STRUCTURE (Exact JSX Patterns)

### MascotBuddy SVG (`BearSvg`)
- ViewBox: `0 0 90 90`
- Ears: circles at (18,24) and (72,24), r=15 purple, r=9 inner light
- Face: circle at (45,52), r=36, fill "#FFF8F0"
- Shadow under chin: ellipse (45,86), rx=22, ry=5, "#EDE9FE" opacity 0.5
- Eyes: white ellipses rx=7 ry=7, black pupils r=4.5, translated to (33,46) and (57,46)
- CELEBRATE eyes: path arcs "M 28 48 Q 33 42 38 48" stroke "#1E1B4B" width 3
- LOVE eyes: heart paths fill "#EF4444"
- Nose: ellipse (45,57), rx=5, ry=3.5, "#7C3AED"
- Mouth: path at (45,62), HAPPY: "M -6 0 Q 0 8 6 0", CONCERNED: "M -5 2 Q 0 -1 5 2"
- Cheeks: ellipses at (27,58) and (63,58), rx=7, ry=4.5, "#F9A8D4"
- Snout: ellipse (45,62), rx=16, ry=12, "#EDE9FE" opacity 0.7

### Animations
```typescript
// Entrance
withSpring(1, { damping: 10, stiffness: 80 })

// Floating (continuous)
float = withRepeat(withSequence(
  withTiming(-10, { duration: 1500 }),
  withTiming(0, { duration: 1500 })
), -1, true)

// Sway (continuous)
sway = withRepeat(withSequence(
  withTiming(3, { duration: 2200 }),
  withTiming(-3, { duration: 2200 })
), -1, true)

// Blink (random interval ~2800ms)
blink = withSequence(
  withTiming(1, { duration: 90 }),
  withTiming(0, { duration: 90 })
)

// Bubble entrance (delayed 300ms)
bubbleOpacity = withTiming(1, { duration: 800 })
bubbleTranslateY = withTiming(0, { duration: 800 })
bubbleScale = withTiming(1, { duration: 800 })

// Pulse after entrance
bubbleScale = withRepeat(withSequence(
  withTiming(1.015, { duration: 2200 }),
  withTiming(1, { duration: 2200 })
), -1, true)

// Mouth speaking
withRepeat(
  withSequence(withTiming(1, { duration: 150 }), withTiming(0, { duration: 150 })),
  -1, true
)

// Trigger bounce
scale = withSequence(
  withTiming(0.85, { duration: 80 }),
  withSpring(1.25, { damping: 6, stiffness: 200 }),
  withSpring(1, { damping: 12, stiffness: 150 })
)
```

### MedicineCard
- Outer: bg "#fff", borderRadius 22, borderLeftWidth 5 (medicine color), padding 16
- Pill icon: 48x48, borderRadius 16, bg `${medicine.color}18`
- Med initial: fontSize 22, 700Bold, color medicine.color
- Name: fontSize 17, 700Bold, color "#1E1B4B"
- Dosage chip: paddingHorizontal 8, paddingVertical 3, borderRadius 50, bg `${medicine.color}15`
- Time chip: flexDirection row, gap 3, bg "#f1f5f9", borderRadius 50
- Status badge: flexDirection row, gap 4, paddingHorizontal 8, paddingVertical 4, borderRadius 50
- Take button: flex 2, borderRadius 50, bg medicine.color, text white
- Snooze button: flex 1, borderRadius 50, borderWidth 1.5, borderColor "#fef3c7", bg "#fffbeb"

### AnimPressable
- scaleDownTo: 0.93 (default)
- Spring in: friction 8, tension 150
- Spring out: friction 5, tension 100
- Double-tap guard: 400ms
- Haptic: ImpactFeedbackStyle.Light (if globalHapticsEnabled)
- Uses Animated.Value (not Reanimated shared values)
- `requestAnimationFrame` wrapper for onPress

### EmergencyButton
- Alert title: "Emergency Help"
- Alert message: "This will call the National Emergency Number (112)..."
- Button (collapsed): 72x72, borderRadius 36, bg colors.emergency ("#EF4444")
- Button (pressed): bg colors.success ("#10B981"), icon "check"
- Press animation: sequence of timing (0.92, 0.08s) → (1.05, 0.08s) → (1, 0.08s)
- Shadow: offset {0,4}, opacity 0.3, radius 8, color "#dc2626", elevation 6

### AdherenceRing
- size: default 100 (prop)
- strokeWidth: 10
- bg ring: `${ringColor}20`
- filled ring: stroke ringColor, strokeLinecap "round", rotate(-90)
- center text: percentage 20px 700Bold, "taken" 11px 400Regular
- color conditional: >=80% success, >=50% warning, <50% destructive
- Animation: Animated.timing 1000ms

### FloatingTabBar
- Container: position absolute, bottom 0, left 0, right 0, alignItems center
- Pill: bg "#FFFFFF", borderRadius 50, paddingHorizontal 6, paddingVertical 6-8, maxWidth 430
- Tab item: flex 1, alignItems center, paddingVertical 6-8, gap 3
- Active tab: bg PURPLE_LIGHT on icon wrap, color PURPLE, 700Bold
- Inactive tab: color "#9CA3AF", 500Medium
- Active dot: 4x4, borderRadius 2, bg PURPLE, marginTop 2
- FAB: position absolute, alignSelf center, bg PURPLE, zIndex 10
  - size: small=52, normal=58
  - Plus icon rotated 45deg when open
- FAB actions: 3 items (Scan Rx, Journal, Card)
  - fan-out angles: -90, -35, 20 (rad spread 55deg)
  - distance: small=82, normal=95
  - spring: tension 130, friction 8
- Overlay: bg "rgba(14,10,35,0.38)", StyleSheet.absoluteFillObject

---

## 6. SCREEN LAYOUTS

### Home Dashboard (`(tabs)/index.tsx`)
```
Background: "#F5F4FB"
Header: LinearGradient ["#4B26C8", "#6C47FF", "#8B5CF6"]
  - borderBottomLeftRadius: 40
  - borderBottomRightRadius: 40
  - overflow: hidden
  - Decor circles: absolute positioned
    - 200x200 r=100, rgba(255,255,255,0.05), top -60, right -50
    - 110x110 r=55, rgba(255,255,255,0.04), bottom -20, left -20
    - 60x60 r=30, rgba(255,255,255,0.06), top 80, left 30
  - Top bar: iconBtn 42x42 borderRadius 21, bg rgba(255,255,255,0.16)
  - XP Pill: borderRadius 30, bg rgba(255,255,255,0.18), border rgba(255,255,255,0.25)
  - Streak Pill: borderRadius 24, bg rgba(252,211,77,0.2), border rgba(252,211,77,0.5)
  - Stats Row 2: bg rgba(255,255,255,0.1), borderRadius 18, padding 12
  - Quick actions: circles 52-58x52-58, borderRadius 26-29, borderWidth 1.5
```

### Intro Screen
```
BG: "#E9DEFE"
Layout: flex 1
  - Top 60%: mascot area
  - Bottom 40%: white sheet, borderTopLeftRadius 40, borderTopRightRadius 40
Handle bar: 40x5, borderRadius 3, bg "#E2E8F0"
Title: 26px, "#1E293B", 700Bold, letterSpacing -0.5
Subtitle: 16px, "#64748B", 400Regular, lineHeight 24
Button: LinearGradient ["#8A63FF", "#6C47FF"], borderRadius 100, paddingVertical 18
Cloud decor: rgba(255,255,255,0.95) circles
  - small circle: 40x40, bottom 0, left 10
  - top circle: 50x50, bottom 10, left 25
  - right circle: 40x40, bottom 0, right 15
  - base: 80x30, borderRadius 20, bottom 0, left 10
```

### Login Screen
```
BG: "#E9DEFE"
Draggable sheet: height 65% of screen, bg "#FFFFFF"
  - borderTopLeftRadius 40, borderTopRightRadius 40
  - Collapsed snap: 48% of screen height
  - Expanded snap: 65% of screen height
Handle bar: 44x5, borderRadius 3, bg "#CBD5E1"
Input: height 56, borderRadius 16, border "#E2E8F0", bg "#F8FAFC", paddingHorizontal 16
Google btn: height 56, borderRadius 16, border "#E2E8F0" 1.5, bg "#FFFFFF"
Email btn: height 56, borderRadius 16, bg "#6C47FF"
Error box: bg "#FEF2F2", borderRadius 12, border "#FECACA", padding 12
```

---

## 7. NAVIGATION CONFIGURATION (Exact)

### Root Layout (`_layout.tsx`)
```typescript
<Stack screenOptions={{ headerShown: false }}>
  index          // root redirect
  intro          // splash
  onboarding     // profile setup
  login          // auth
  register       // registration
  verify-email   // OTP
  role-select    // role picker
  (tabs)         // patient tabs
  scan           // modal
  scan-qr        // modal
  help           // modal
  chat           // modal
  caregiver/create-plan  // modal
  caregiver/dashboard
  caregiver/patient-detail  // card
  family         // headerShown false
  emergency      // modal
  cpr            // modal
  drug-checker   // modal
  notifications  // modal
  profile        // modal
  settings       // modal
  caregiver-chat
  judge-demo     // modal
</Stack>
```

### Tab Layout (`(tabs)/_layout.tsx`)
```typescript
<Tabs tabBar={FloatingTabBar} screenOptions={{ headerShown: false }}>
  index       // Home (home icon)
  medicines   // Medicines (package icon)
  symptoms    // Activity (activity icon)
  progress    // Progress (award icon)
  followups   // href: null (hidden)
  schedule    // href: null (hidden)
</Tabs>
<Sidebar />
```

---

## 8. ASYNCSTORAGE KEYS

```typescript
"@sathi_auth_token"          // JWT string
"@sathi_user_role"           // role string
"@sathi_user_profile"        // cached user JSON
"@sathi_has_seen_intro"      // boolean
"@sathi_onboarding_completed" // boolean
"@sathi_offline_doses"       // offline dose queue
"@sathi_offline_queue"       // generic offline queue
"@sathi_language"            // language code
"@sathi_theme"               // theme string
"@sathi_anchor_times"        // JSON times
"@sathi_emergency_contacts"  // contacts
"@sathi_chat_history"        // recent chat
"@sathi_user_xp"             // XP value
```

---

## 9. ANIMATION DURATIONS (Reference Table)

| Component | Animation | Duration | Config |
|-----------|-----------|----------|--------|
| MascotBuddy float | withTiming | 1500ms | repeat -1, true |
| MascotBuddy sway | withTiming | 2200ms | repeat -1, true |
| MascotBuddy blink | withTiming | 90ms each phase | interval 2800ms |
| MascotBuddy bubble in | withTiming | 800ms | delay 300ms |
| MascotBuddy bubble pulse | withTiming | 2200ms | repeat -1, true |
| MascotBuddy mouth | withTiming | 150ms | repeat -1, true |
| MascotBuddy trigger bounce | withTiming + withSpring | 80ms/spring | damping 6/12 |
| AdherenceRing | Animated.timing | 1000ms | nativeDriver false |
| AnimPressable in | withSpring | - | friction 8, tension 150 |
| AnimPressable out | withSpring | - | friction 5, tension 100 |
| EmergencyButton | Animated.timing | 80ms | 3-step sequence |
| FloatingTabBar FAB | withSpring | - | tension 130, friction 8 |
| FloatingTabBar tab | withSpring | - | friction 8/5 |
| QuickAction entrance | Animated.timing | 320ms | staggered delay 40ms |
| QuickAction slide | Animated.spring | - | tension 100, friction 8 |
| DoseRow entrance | Animated.timing | 300ms | staggered delay 60ms |
| CircularProgress | Animated.timing | 900ms | - |
| Home hero fade | Animated.timing | 500ms | - |

---

## 10. PACKAGES (from original package.json)

```json
{
  "expo": "~54.0.34",
  "react": "19.1.0",
  "react-native": "0.81.5",
  "react-native-reanimated": "~4.1.1",
  "react-native-svg": "15.12.1",
  "react-native-safe-area-context": "~5.6.0",
  "expo-router": "~6.0.17",
  "expo-linear-gradient": "~15.0.8",
  "expo-haptics": "~15.0.8",
  "expo-av": "~16.0.8",
  "expo-speech": "~14.0.8",
  "expo-blur": "~15.0.8",
  "expo-notifications": "~0.32.17",
  "expo-camera": "~17.0.10",
  "expo-image-picker": "~17.0.11",
  "expo-file-system": "~19.0.22",
  "@expo-google-fonts/inter": "^0.4.0",
  "@expo/vector-icons": "^15.0.3",
  "@react-native-async-storage/async-storage": "2.2.0",
  "@tanstack/react-query": "^5.90.21",
  "react-native-gesture-handler": "~2.28.0",
  "react-native-screens": "~4.16.0",
  "react-native-sse": "^1.2.1",
  "react-native-web": "^0.21.0",
  "react-native-webview": "13.15.0",
  "three": "^0.184.0",
  "@react-three/fiber": "^9.6.1",
  "@react-three/drei": "^10.7.7",
  "zustand": "^5.0.0",
  "framer-motion": "^12.23.24",
  "lucide-react": "^0.545.0",
  "tailwindcss": "^4.1.14",
  "nativewind": "^4.1.23"
}
```

---

## 11. ASSETS

```
assets/images/intro_image.png       // robot/mascot image for intro & login
assets/images/pink_medical_mascot.png // alternative mascot
assets/images/onboarding1.png       // onboarding carousel
assets/images/onboarding2.png       // onboarding carousel
assets/images/onboarding3.png       // onboarding carousel
assets/images/SATHI.jpeg             // app logo
assets/images/icon.png              // app icon
```

---

This supplement gives you pixel-exact rendering — identical colors, shadows, fonts, border radii, animation curves, SVG paths, and navigation structure as the original.
