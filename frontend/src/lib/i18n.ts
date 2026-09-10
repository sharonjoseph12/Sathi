// Minimal UI strings: English, Hindi, Kannada. Falls back to English.
const D: Record<string, Record<string, string>> = {
  en: { home: "Home", meds: "Meds", chat: "Chat", care: "Care", family: "Family", more: "More",
    hello: "Good morning", take: "Take", talk: "Talk to Sathi", listening: "Listening…",
    today: "Today's recovery", medicines: "Medicines", doses: "doses", leftToday: "left today" },
  hi: { home: "होम", meds: "दवाएँ", chat: "चैट", care: "देखभाल", family: "परिवार", more: "और",
    hello: "सुप्रभात", take: "लें", talk: "साथी से बात करें", listening: "सुन रहे हैं…",
    today: "आज की देखभाल", medicines: "दवाएँ", doses: "खुराक", leftToday: "बाकी" },
  kn: { home: "ಮನೆ", meds: "ಔಷಧಿ", chat: "ಚಾಟ್", care: "ಆರೈಕೆ", family: "ಕುಟುಂಬ", more: "ಇನ್ನಷ್ಟು",
    hello: "ಶುಭೋದಯ", take: "ತೆಗೆದುಕೊಳ್ಳಿ", talk: "ಸಾಥಿಯೊಂದಿಗೆ ಮಾತನಾಡಿ", listening: "ಕೇಳುತ್ತಿದೆ…",
    today: "ಇಂದಿನ ಚೇತರಿಕೆ", medicines: "ಔಷಧಿಗಳು", doses: "ಡೋಸ್", leftToday: "ಬಾಕಿ" },
};

export function t(lang: string, key: string): string {
  const base = (lang || "en").split("-")[0];
  return D[base]?.[key] ?? D.en[key] ?? key;
}
