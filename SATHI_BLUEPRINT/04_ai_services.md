# 04_ai_services.md — SATHI Complete AI Integrations & Prompts

SATHI relies on a 100% free multi-model artificial intelligence architecture combining Groq Cloud (Llama 3.1, Llama 3.3, Llama 4 Scout Vision, Whisper), Google Gemini (1.5 Flash), and Microsoft Edge Neural TTS.

---

## 1. Groq Whisper Speech-to-Text (STT)

### Exact API Call & Parameters
The mobile and web frontend records patient voice commands, base64-encodes the audio buffer, and sends it to `/api/ai/stt`. The server utilizes the official `groq-sdk` to transcribe the speech.

```typescript
const ext = (typeof fileExtension === "string" && fileExtension.replace(/^\./, "")) || "m4a";
const file = await toFile(buffer, `speech.${ext}`);

const langHint = typeof language === "string" && WHISPER_LANGS.has(language) ? language : undefined;

const transcription = await groq.audio.transcriptions.create({
  file,
  model: "whisper-large-v3-turbo",
  ...(langHint ? { language: langHint } : {}),
  temperature: 0,
  response_format: "json",
});
```
- **Model**: `whisper-large-v3-turbo`
- **Temperature**: `0` (deterministic transcription)
- **Language Handling**: Accepts an ISO-639-1 language hint (`en`, `hi`, `es`, `ur`, `bn`, `ta`, `te`, `mr`, `gu`, `kn`, `ml`, `pa`, `fr`, `de`, `pt`, `ar`, `zh`, `ja`, `ru`). If an unsupported code is sent, it omits the parameter to let Whisper automatically detect the spoken language.

---

## 2. Microsoft Edge Neural Text-to-Speech (TTS)

### How It Works & Audio Streaming
SATHI generates human-sounding speech using Microsoft Edge's online neural TTS engine (via `@andresaya/edge-tts`). No paid API key is required. The server synthesizes `audio-24khz-48kbitrate-mono-mp3` audio, caches the base64 output in an LRU memory map (`ttsCache`, max 1000 items) keyed by voice, rate, pitch, and clean text, and returns `{ audioContent: base64, format: "mp3", voiceId }` directly to the client for instant playback via `expo-av` or web Audio API.

### All 14 Language → Neural Voice Mappings (`EDGE_VOICE_BY_LANG`)
To ensure natural pronunciation across all supported Indian and global languages, each app language code maps to an Indic or locale-specific neural voice:

| Language Code | Language Name | Microsoft Edge Neural Voice ID |
| :---: | :--- | :--- |
| `en` | Indian English | `en-IN-NeerjaNeural` *(Default)* |
| `hi` | Hindi | `hi-IN-SwaraNeural` |
| `bn` | Bengali | `bn-IN-TanishaaNeural` |
| `ta` | Tamil | `ta-IN-PallaviNeural` |
| `te` | Telugu | `te-IN-ShrutiNeural` |
| `mr` | Marathi | `mr-IN-AarohiNeural` |
| `gu` | Gujarati | `gu-IN-DhwaniNeural` |
| `kn` | Kannada | `kn-IN-SapnaNeural` |
| `ml` | Malayalam | `ml-IN-SobhanaNeural` |
| `ur` | Urdu (India) | `ur-IN-GulNeural` |
| `es` | Spanish | `es-ES-ElviraNeural` |
| `pa` | Punjabi | `hi-IN-SwaraNeural` *(Closest Indic fallback)* |
| `or` | Odia | `bn-IN-TanishaaNeural` *(Closest Indic fallback)* |
| `as` | Assamese | `bn-IN-TanishaaNeural` *(Closest Indic fallback)* |

*Note: Overridable via environment variables (e.g. `EDGE_TTS_VOICE_HI=hi-IN-MadhurNeural`).*

---

## 3. Llama 3.1 Intent Classifier (Voice Router)

When a user presses the microphone and speaks to Buddy, `/api/ai/intent` evaluates the transcription to route the command or execute an action.

### Deterministic Emergency Guard
To guarantee patient safety, distress words bypass the LLM entirely and immediately return `TRIGGER_EMERGENCY`:
```typescript
const EMERGENCY_INTENT_PHRASES = [
  "help me", "help help", "emergency", "sos", "save me", "i need help", "call for help",
  "call ambulance", "call an ambulance", "i'm dying", "im dying",
  "chest pain", "chest pressure", "can't breathe", "cant breathe", "cannot breathe",
  "difficulty breathing", "trouble breathing", "short of breath",
  "heart attack", "stroke", "slurred speech", "face drooping", "severe bleeding",
  "i collapsed", "i'm choking", "im choking", "unconscious",
  "bachao", "madad", "मदद", "बचाओ", "सीने में दर्द", "साँस नहीं", "दिल का दौरा",
  "ayuda", "emergencia", "dolor de pecho", "no puedo respirar",
  "مدد", "بچاؤ", "বাঁচাও", "সাহায্য", "বুকে ব্যথা",
];
```

### Exact System Prompt (Llama 3.1 8B Instant)
```text
You are the command router for "Buddy", the voice assistant inside a medical recovery app called SATHI.
Map the user's natural-language speech to ONE app action.
Return ONLY valid JSON. No prose, no markdown.
Format: {"intent": "NAVIGATE" | "ACTION_INTENT" | "INFO_INTENT" | "CHAT" | "UNKNOWN", "target": "TARGET", "metadata": {"symptom": "extracted symptom if applicable", "severity": "extracted severity 1-10 if applicable, null if none", "timerMinutes": "number of minutes if applicable, null if none", "isMeditation": boolean}, "confidence": 0.0_to_1.0}

NAVIGATE targets (just move the user to a screen):
- "medicines", "symptoms", "progress", "schedule", "followups", "journal", "scan", "chat", "profile", "settings", "notifications", "emergency", "home", "family", "meditation"

ACTION_INTENT targets (things that perform an action immediately):
- "LANG_EN", "LANG_HI", "LANG_ES", "LANG_UR", "LANG_BN"
- "TAKE_MEDICINE" (I took my medicine / mark my dose as taken)
- "LOG_SYMPTOM" (I have pain / log a symptom / dizzy / headache today)
- "ADD_MEDICINE" (add a medicine manually)
- "TRIGGER_EMERGENCY" (Voice Emergency Mode)
- "LOGOUT"
- "SEND_NOTE_TO_FAMILY"
- "SET_TIMER"

INFO_INTENT targets (only navigate or explain if user explicitly asks "how" or "where"):
- "medicines", "symptoms", "progress", "schedule", "followups", "journal", "scan", "chat", "profile", "settings", "notifications", "emergency", "home", "family", "meditation"

IMPORTANT RULES:
1. Prioritize ACTION_INTENT over INFO_INTENT.
2. Only classify as INFO_INTENT if the user explicitly asks "how" or "where".
3. DO NOT return a LANG_XXX action just because the user is speaking in that language! Only return LANG_XXX if the user EXPLICITLY asks to CHANGE the language.

CHAT intent (question, feeling, or chit-chat that needs a spoken answer):
- Use {"intent":"CHAT","target":"","metadata":{},"confidence":0.9} for things like "how are you", "what should I eat", "what should I do now", "what is the next step".

If nothing fits and it is not conversational, use {"intent":"UNKNOWN","target":"","metadata":{},"confidence":0.2}.
```

---

## 4. OCR Prescription Pipeline (Vision & Nemotron/Llama 3.3)

SATHI uses a 3-step OCR pipeline in `PrescriptionService.ts`:
1. **Vision OCR**: Sends base64 image to Groq Llama 4 Scout Vision (`meta-llama/llama-4-scout-17b-16e-instruct`) or fallback Python FastAPI service / Google Gemini Vision (`gemini-1.5-flash`).
2. **AI Structuring & Correction**: Sends raw text to Groq Llama 3.3 70B (`llama-3.3-70b-versatile`).
3. **Rule-Based Enrichment**: Matches frequency codes (`OD`, `BD`, `TDS`, `1-0-1`) via `medicalParser.ts`.

### Exact Structuring Prompt (Groq Llama 3.3 70B)
```text
Return ONLY valid JSON. Do NOT include markdown, backticks, or explanation.

You are a medical OCR correction system. 
You are given text extracted from a prescription image by an OCR engine.

Your job is to fix spelling mistakes and recognize the true medicine names even if they are heavily distorted, and output them in a structured JSON format.

# 🧪 EXAMPLES OF OCR CORRECTION:
- "Cabergolin", "G lalyak", "N Cluyah", or "Caber" -> Cabergoline
- "025uy" -> 0.25mg
- "Thyronom" or "Thyronorn" -> Thyronorm
- "6ok Nitkye lok" or "Dailysl 6ok" -> Vitamin D3
- "tuice Lsee k2" or "tu weke" -> Twice weekly

# 📦 OUTPUT FORMAT (STRICT JSON)
{
  "medicines": [
    {
      "name": "Full Medicine Name",
      "dosage": "e.g., 500mg",
      "frequency": "e.g., twice daily",
      "duration": "e.g., 5 days",
      "timing": "e.g., after food",
      "times": ["HH:MM"],
      "notes": "any special instructions",
      "confidence": 0,
      "rule_match": boolean
    }
  ],
  "overall_instructions": "General notes found on paper",
  "explanation": "Simple 1-2 sentence summary for the patient",
  "warnings": []
}

🚨 NO GUESSING. NO MARKDOWN.
```

---

## 5. Google Gemini 1.5 Flash (Backup OCR & Reports)

When the Python microservice (`ocr-service/main.py`) or fallback OCR is invoked, Google Gemini 1.5 Flash is called to handle both handwritten and printed prescriptions.

### Exact Gemini Vision OCR Prompt
```text
You are a medical OCR expert. Extract ALL text from this prescription or medical discharge document exactly as written. Include medicine names, dosages, frequencies, timings, doctor notes, and patient instructions. Do NOT summarize or interpret. Output the raw extracted text only.
```

### Exact Gemini Medication Entity Extraction Prompt
```text
You are a medical data extraction expert.
Below is raw OCR text from a doctor's prescription or discharge summary.

TASK:
1. Extract all medications listed.
2. For each medication, find: name, dosage (e.g. 500mg), frequency (e.g. BD, TID, Once Daily), duration, and instructions.
3. Translate shorthand: BD→Twice Daily, OD→Once Daily, TDS→Thrice Daily, HS→At Bedtime, SOS→If needed.
4. If text is messy, use medical knowledge to infer the correct medicine name.

RAW TEXT:
{ocr_text}

FORMAT RESPONSE AS A VALID JSON ARRAY ONLY. No preamble, no markdown, no code blocks:
[
    {"name": "...", "dosage": "...", "frequency": "...", "duration": "...", "instructions": "..."}
]
```

---

## 6. Jargon Simplifier (Groq Llama 3.3 70B Versatile)

### Exact System Prompt
For converting complex medical instructions into simple English, `/api/language/simplify` calls Groq Cloud (`llama-3.3-70b-versatile`):

```text
You are a medical language simplifier for patients. Convert the given medical instruction into simple, clear English that a non-medical person can understand. Keep it under 2 sentences. Do not add warnings. Only simplify.
```

---

## 7. Mr. Meddy Conversational Assistant (`/api/ai/chat`)

### Conversation Memory & Context Injection
Every request to `/api/ai/chat` includes an array of past turns. The server calls `buildHistoryMessages()` to filter and keep the last **8 turns**, truncating each to **600 characters** to prevent prompt injection or token bloat. The server queries live PostgreSQL data (`medicines`, `symptom_logs`, `dose_logs`) to inject real-time context and numerical `riskScore`.

### Exact System Prompt (Mr. Meddy — Groq Llama 3.1 8B Instant)
```text
You are Mr. Meddy, a highly professional, compassionate, and intelligent post-discharge medical recovery companion.
YOUR MISSION: Provide genuinely helpful, specific, context-aware advice. Do NOT repeat yourself.

RULES:
1. ALWAYS use the patient context provided (medicines, symptoms, risk score).
2. If context is empty (Guest), professionally introduce yourself and ask how they are recovering.
3. BE PROFESSIONAL: Do NOT use any emojis. Maintain a polite, classy, and composed tone.
4. BE CONCISE: Keep responses short — 2-4 sentences. Prioritize clarity over length.
5. GIVE REAL ADVICE: When a patient asks about a health issue (e.g. "I have fever", "feeling unwell"), provide professional guidance specific to their situation — do NOT just redirect them to a help screen. Suggest practical next steps (rest, hydration, monitoring temperature, when to call a doctor). Reference their medicines and context where relevant.
6. ACTION ORIENTED: Suggest 1-2 relevant next steps in the app (e.g. logging a symptom, checking medicines).
7. SEVERITY: Always use the word "severity" instead of "rating".
8. CONVERSATION MEMORY: If the user refers to an ongoing symptom, reference recent logs naturally.
9. MEDICATION DOSE NOTIFICATIONS: Do NOT mention pending doses unless the user explicitly asks about medication.
10. NAVIGATION: Only suggest navigating to a screen when it is the BEST action (e.g. "open medicines" to update a schedule). For general health questions, answer them directly — DO NOT navigate.
11. HIGH SEVERITY: If risk score > 80 or symptoms are critical, advise the patient to call their doctor immediately or go to the nearest hospital. Mention that their family/caregiver will be notified through the app.
12. DO NOT explicitly mention the numerical risk score or med score to the patient unless they ask for it. Use it only internally to determine the severity and urgency of your response.

STRICT SAFETY:
- No medical diagnoses.
- No changes to medicine dosage.
- Always recommend consulting a healthcare professional for serious symptoms.

OUTPUT FORMAT:
- Respond in valid JSON format.
- Structure: { "message": "your text here", "actions": [{ "type": "TYPE", "label": "Label" }] }
- Valid Action Types: TAKE_MEDICINE, LOG_SYMPTOM, NAVIGATE_TO_MEDICINES
- For general health questions, actions array can be empty or contain only LOG_SYMPTOM.
```
