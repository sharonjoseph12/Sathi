// UI strings for 12 languages. Missing keys fall back to English.
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
  ta: { home: "முகப்பு", meds: "மருந்து", chat: "அரட்டை", care: "பராமரிப்பு", family: "குடும்பம்", more: "மேலும்",
    hello: "வணக்கம்", take: "எடு", talk: "சாத்தியுடன் பேசு", listening: "கேட்கிறது…",
    today: "இன்றைய குணம்", medicines: "மருந்துகள்", doses: "டோஸ்", leftToday: "மீதம்" },
  te: { home: "హోమ్", meds: "మందులు", chat: "చాట్", care: "సంరక్షణ", family: "కుటుంబం", more: "మరిన్ని",
    hello: "శుభోదయం", take: "తీసుకో", talk: "సాథితో మాట్లాడు", listening: "వింటున్నాను…",
    today: "నేటి కోలు", medicines: "మందులు", doses: "మోతాదులు", leftToday: "మిగిలినవి" },
  bn: { home: "হোম", meds: "ওষুধ", chat: "চ্যাট", care: "যত্ন", family: "পরিবার", more: "আরও",
    hello: "সুপ্রভাত", take: "নিন", talk: "সাথীর সাথে কথা বলুন", listening: "শুনছি…",
    today: "আজকের সুস্থতা", medicines: "ওষুধ", doses: "ডোজ", leftToday: "বাকি" },
  mr: { home: "होम", meds: "औषधे", chat: "चॅट", care: "काळजी", family: "कुटुंब", more: "अधिक",
    hello: "सुप्रभात", take: "घ्या", talk: "साथीशी बोला", listening: "ऐकत आहे…",
    today: "आजची तब्येत", medicines: "औषधे", doses: "डोस", leftToday: "शिल्लक" },
  gu: { home: "હોમ", meds: "દવાઓ", chat: "ચેટ", care: "સંભાળ", family: "પરિવાર", more: "વધુ",
    hello: "સુપ્રભાત", take: "લો", talk: "સાથી સાથે બોલો", listening: "સાંભળું છું…",
    today: "આજની તબિયત", medicines: "દવાઓ", doses: "ડોઝ", leftToday: "બાકી" },
  ml: { home: "ഹോം", meds: "മരുന്നുകൾ", chat: "ചാറ്റ്", care: "പരിചരണം", family: "കുടുംബം", more: "കൂടുതൽ",
    hello: "ശുഭദിനം", take: "എടുക്കൂ", talk: "സാഥിയോട് സംസാരിക്കൂ", listening: "കേൾക്കുന്നു…",
    today: "ഇന്നത്തെ വീണ്ടെടുപ്പ്", medicines: "മരുന്നുകൾ", doses: "ഡോസ്", leftToday: "ബാക്കി" },
  ur: { home: "ہوم", meds: "ادویات", chat: "چیٹ", care: "دیکھ بھال", family: "خاندان", more: "مزید",
    hello: "صبح بخیر", take: "لیں", talk: "ساتھی سے بات کریں", listening: "سن رہے ہیں…",
    today: "آج کی صحت", medicines: "ادویات", doses: "خوراک", leftToday: "باقی" },
  es: { home: "Inicio", meds: "Medicinas", chat: "Chat", care: "Cuidado", family: "Familia", more: "Más",
    hello: "Buenos días", take: "Tomar", talk: "Habla con Sathi", listening: "Escuchando…",
    today: "Recuperación de hoy", medicines: "Medicinas", doses: "dosis", leftToday: "restantes" },
  pa: { home: "ਹੋਮ", meds: "ਦਵਾਈਆਂ", chat: "ਚੈਟ", care: "ਦੇਖਭਾਲ", family: "ਪਰਿਵਾਰ", more: "ਹੋਰ",
    hello: "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ", take: "ਲਓ", talk: "ਸਾਥੀ ਨਾਲ ਗੱਲ ਕਰੋ", listening: "ਸੁਣ ਰਹੇ ਹਾਂ…",
    today: "ਅੱਜ ਦੀ ਸਿਹਤ", medicines: "ਦਵਾਈਆਂ", doses: "ਖੁਰਾਕ", leftToday: "ਬਾਕੀ" },
};

export const LANGS = Object.keys(D);

export function t(lang: string, key: string): string {
  const base = (lang || "en").split("-")[0];
  return D[base]?.[key] ?? D.en[key] ?? key;
}
