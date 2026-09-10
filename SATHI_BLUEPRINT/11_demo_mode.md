# 11_demo_mode.md — SATHI Hackathon Judge & Evaluation Mode

## Overview

To enable hackathon evaluators, clinical judges, and project reviewers to test SATHI's complex multi-tier AI capabilities in under 3 minutes without going through multi-step email OTP verification or configuring cloud API keys, the application includes a dedicated **Judge Demo Mode** (`app/judge-demo.tsx`).

---

## 1. Why It Exists
- **Zero-Friction Evaluation**: Hackathon judging windows are notoriously short (often 3-5 minutes). Demo Mode lets evaluators trigger high-impact workflows with a single tap.
- **Offline & Fallback Resilience**: Evaluators testing in conference halls often experience spotty Wi-Fi. Demo Mode intercepts outbound HTTP requests and serves pre-compiled clinical fallback structures if network latency exceeds 3 seconds or API keys are absent.
- **Simulated Emergency Telemetry**: Demonstrates real-time GPS ambulance dispatch tracking, automated medical report compilation, and 100-BPM CPR metronome synchronization without broadcasting live distress alarms to real emergency services (112 / 911).

---

## 2. How It Works (User & System Flow)

```
[Splash Screen: app/intro.tsx]
       |
       +--- Taps "Demo Mode / Hackathon Judge" Button
       |
[Judge Demo Portal: app/judge-demo.tsx]
       |
       +--- Step 1: Simulate SOS Distress Call (112 / 911)
       |            -> Compiles medical history (active symptoms, today's meds, GPS)
       |            -> Renders live interactive OpenStreetMap Leaflet ambulance tracking
       |            -> Streams sequential status logs ("Dispatched -> En Route -> Arrived")
       |
       +--- Step 2: Test AI Drug-Drug Interaction Checker
       |            -> Loads seeded conflict pair (Aspirin + Warfarin)
       |            -> Renders high-severity bleeding risk warning banner
       |
       +--- Step 3: Test OCR Prescription Scanner
       |            -> Loads pre-captured sample prescription image
       |            -> Renders Llama 3.3 structured JSON output & plain English explanation
       |
       +--- Step 4: Test Mr. Meddy Voice Assistant
                    -> Opens conversational AI overlay with pre-injected recovery context
```

---

## 3. Seeded Demo Data Specification

When Demo Mode initializes, it seeds the local app context with a realistic post-discharge medical profile:

### Patient Profile
- **Name**: Mary Smith (or Rajesh Kumar in Indic locale)
- **Age**: 58
- **Condition**: Post-CABG Heart Surgery Recovery
- **Discharge Date**: 4 days ago
- **Emergency Contact**: Dr. Sharma (Cardiology Dept) — `+91 98765 43210`
- **GPS Coordinates**: `lat: 12.9716, lng: 77.5946` (Bangalore Central)

### Active Seeded Medications (`todayDoses`)
1. **Amoxicillin 500mg** — Scheduled: `08:00 AM` — Status: `taken`
2. **Thyronorm 100mcg** — Scheduled: `08:00 AM` — Status: `taken`
3. **Aspirin 75mg** — Scheduled: `02:00 PM` — Status: `pending`
4. **Warfarin 5mg** — Scheduled: `08:00 PM` — Status: `pending`
5. **Atorvastatin 40mg** — Scheduled: `10:00 PM` — Status: `pending`

### Seeded Drug Interaction Pair
When testing the interaction engine, Demo Mode automatically passes `["Aspirin 75mg", "Warfarin 5mg"]`, producing:
- **Severity**: `high`
- **Description**: Both Aspirin (antiplatelet) and Warfarin (anticoagulant) thin the blood through different mechanisms.
- **Patient Advice**: Severe bleeding risk detected. Do not take together without strict medical supervision and INR monitoring.

---

## 4. Controlling File & Technical Implementation (`app/judge-demo.tsx`)

The entire interactive demo is controlled by `artifacts/discharge-buddy/app/judge-demo.tsx`.

### Key Technical Features
1. **Dynamic Leaflet Map Embedding**: Renders a live HTML/JavaScript Leaflet map inside a React Native `WebView`. It animates a custom ambulance icon (`L.marker([startLat, startLng])`) along a path toward the patient's GPS coordinates using standard JavaScript `setInterval` interpolation.
2. **Sequential Telemetry Log Generator**: Uses a chain of `setTimeout` timers to simulate real-time hospital triage API communication:
   ```typescript
   setLogs(["Calling emergency response (112)..."]);
   // +1.5s -> "Generating patient medical history summary..."
   // +3.0s -> "Uploading medical history to emergency endpoint..."
   // +5.0s -> "Ambulance dispatched. En route to patient location."
   ```
3. **Graceful Error Catching**: In `triggerSOS()`, if `api.sendEmergencyReport(report)` fails due to lack of network, the catch block intercepts the error and generates a locally valid dispatch ID (`AMB-4829`) so evaluators see a successful completion state.
