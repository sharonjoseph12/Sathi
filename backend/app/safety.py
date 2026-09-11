"""Deterministic safety + intent + jargon + drug-check.
Groq Llama 3.3 70B augments jargon and drug checks when available; rules always run."""
import re
import json
from app import groq_client as G

# --- Safety triage (mirrors frontend localSafety) ---

def evaluate_safety_symptom(symptom_text: str, severity: str = "unknown") -> str:
    """Returns NORMAL, MONITOR or ESCALATE."""
    t = (symptom_text or "").lower()
    escalate = ["chest pain", "breathing", "breathless", "severe pain", "bleeding",
                "unconscious", "fainted", "can't breathe", "cant breathe", "help me", "sos",
                # --- multilingual escalate packs (transliterated + native script) ---
                # Hindi
                "saans", "chhati me dard", "khoon", "behosh", "bachao", "madad",
                "सांस", "छाती में दर्द", "खून", "बेहोश", "बचाओ", "मदद",
                # Kannada
                "usirata", "usiratu", "yede novu", "ede novu", "rakta", "sahaya",
                "ಉಸಿರಾಟ", "ಎದೆ ನೋವು", "ರಕ್ತ", "ಪ್ರಜ್ಞೆ", "ಸಹಾಯ",
                # Tamil
                "moochu", "moochhe", "nenju vali", "ratham", "mayakkam", "uthavi",
                "சுவாச", "மூச்சு", "நெஞ்சு வலி", "இரத்தம்", "உதவி",
                # Telugu
                "shwasa", "oopi", "gundello noppi", "raktam", "spriha", "sahayam",
                "శ్వాస", "ఛాతీ నొప్పి", "రక్తం", "సహాయం"]
    monitor = ["headache", "mild pain", "tired", "nausea", "dizzy", "fever", "pain", "cough",
               # Hindi monitor
               "sir dard", "bukhar", "thakan", "ulti",
               "सिर दर्द", "बुखार", "थकान", "उल्टी",
               # Kannada monitor
               "tale novu", "jwara", "aysha", "vanti",
               "ತಲೆ ನೋವು", "ಜ್ವರ", "ಆಯಾಸ", "ವಾಂತಿ",
               # Tamil monitor
               "thalai vali", "kaichal", "sorvu", "vanthi",
               "தலைவலி", "காய்ச்சல்", "சோர்வு", "வாந்தி",
               # Telugu monitor
               "tala noppi", "jwaram", "alasata", "vanti",
               "తలనొప్పి", "జ్వరం", "అలసట", "వాంతి"]
    # Negation handling: explicit denial of a red-flag overrides keyword match,
    # unless the caller already graded severity as severe.
    if re.search(r"\bno\s+(chest pain|breathing(\s+problem|\s+difficulty)?|bleeding)\b", t):
        if severity != "severe":
            return "NORMAL"
    if severity == "severe":
        return "ESCALATE"
    for p in escalate:
        if p in t:
            return "ESCALATE"
    for p in monitor:
        if p in t:
            return "MONITOR"
    return "NORMAL"


def triage_explain(text: str, severity: str = "unknown") -> dict:
    """Explain a safety triage decision: {level, matched, negated}."""
    t = (text or "").lower()
    neg = bool(re.search(r"\bno\s+(chest pain|breathing(\s+problem|\s+difficulty)?|bleeding)\b", t))
    level = evaluate_safety_symptom(text, severity)
    matched = None
    # Find first matching keyword for explainability (escalate first, then monitor).
    _esc = ["chest pain", "breathing", "breathless", "severe pain", "bleeding",
            "unconscious", "fainted", "can't breathe", "cant breathe", "help me", "sos",
            "saans", "chhati me dard", "khoon", "behosh", "bachao", "madad",
            "सांस", "छाती में दर्द", "खून", "बेहोश", "बचाओ", "मदद",
            "usirata", "usiratu", "yede novu", "ede novu", "rakta", "sahaya",
            "ಉಸಿರಾಟ", "ಎದೆ ನೋವು", "ರಕ್ತ", "ಸಹಾಯ",
            "moochu", "moochhe", "nenju vali", "ratham", "mayakkam", "uthavi",
            "சுவாச", "மூச்சு", "நெஞ்சு வலி", "இரத்தம்", "உதவி",
            "shwasa", "oopi", "gundello noppi", "raktam", "sahayam",
            "శ్వాస", "ఛాతీ నొప్పి", "రక్తం", "సహాయం"]
    _mon = ["headache", "mild pain", "tired", "nausea", "dizzy", "fever", "pain", "cough"]
    for p in _esc + _mon:
        if p in t:
            matched = p
            break
    return {"level": level, "matched": matched, "negated": neg}


def risk_from_severity(sev: int | None, text: str) -> str:
    if (sev is not None and sev >= 7) or evaluate_safety_symptom(text) == "ESCALATE":
        return "high"
    if (sev is not None and sev >= 4) or evaluate_safety_symptom(text) == "MONITOR":
        return "medium"
    return "low"


# --- Intent router (Buddy voice/text commands; emergency phrases route to ALERT, not SOS broadcast) ---

_NAV = {"medicine": "medicines", "medicines": "medicines", "pill": "medicines", "dose": "medicines",
        "symptom": "symptoms", "pain": "symptoms", "schedule": "schedule", "plan": "schedule",
        "progress": "progress", "streak": "progress", "appointment": "followups", "doctor": "followups",
        "journal": "journal", "diary": "journal", "mood": "journal", "scan": "scan",
        "prescription": "scan", "chat": "chat", "message": "chat", "setting": "settings",
        "language": "settings", "family": "family", "meditat": "meditation", "breath": "meditation",
        "home": "home", "today": "home", "drug": "drug-check", "interaction": "drug-check",
        "simplif": "simplify", "mean": "simplify", "notif": "notifications"}
_ACTION = {"took": "TAKE_MEDICINE", "taken": "TAKE_MEDICINE", "log": "LOG_SYMPTOM",
           "add medicine": "ADD_MEDICINE", "timer": "SET_TIMER", "remind": "SET_TIMER",
           "hindi": "LANG_HI", "english": "LANG_EN", "logout": "LOGOUT", "sign out": "LOGOUT",
           "tell my family": "SEND_NOTE_TO_FAMILY", "nudge": "SEND_NOTE_TO_FAMILY"}
_EMERG = ["help me", "sos", "chest pain", "can't breathe", "cant breathe", "heart attack",
          "slurred speech", "bachao", "madad"]


def route_intent(text: str) -> dict:
    t = (text or "").lower().strip()
    if any(p in t for p in _EMERG):
        return {"intent": "ALERT", "target": "SAFETY_REVIEW", "confidence": 0.99}
    for k, v in _ACTION.items():
        if k in t:
            return {"intent": "ACTION", "target": v, "confidence": 0.9}
    for k, v in _NAV.items():
        if k in t:
            return {"intent": "NAVIGATE", "target": v, "confidence": 0.85}
    if re.search(r"\b(how|what|when|why|should|is|are|can)\b", t):
        return {"intent": "CHAT", "target": "", "confidence": 0.7}
    return {"intent": "UNKNOWN", "target": "", "confidence": 0.2}


# --- Jargon simplifier: Groq Llama 3.3 70B with rule-based fallback ---

_JARGON = {"OD": "once a day", "BD": "twice a day", "BID": "twice a day", "TDS": "three times a day",
           "TID": "three times a day", "QID": "four times a day", "HS": "at bedtime", "AC": "before meals",
           "PC": "after meals", "PO": "by mouth", "STAT": "right now, urgently", "SOS": "only when needed",
           "PRN": "only when needed", "QD": "once a day", "QOD": "every other day"}

_SIMPLIFY_PROMPT = """You are a medical jargon translator for patients recovering at home.
Convert the following prescription instruction into simple, 2-sentence patient-friendly English.
Explain what each abbreviation means. Keep it short and clear.
Do NOT add any medical advice. Just translate the jargon.
Return ONLY the simplified text, nothing else."""


def simplify_jargon(text: str) -> dict:
    # Try Groq first
    groq_result = G.chat([
        {"role": "system", "content": _SIMPLIFY_PROMPT},
        {"role": "user", "content": text or ""},
    ], temperature=0.2, max_tokens=200)

    if groq_result:
        # Still detect which abbreviations were in the original
        hits = [abbr for abbr in _JARGON if re.search(rf"\b{abbr}\b", text or "", re.IGNORECASE)]
        return {"original": text, "simplified": groq_result.strip(), "expanded": hits, "ai": True}

    # Fallback: rule-based
    out = text or ""
    hits = []
    for abbr, plain in _JARGON.items():
        if re.search(rf"\b{abbr}\b", out, re.IGNORECASE):
            hits.append(abbr)
            out = re.sub(rf"\b{abbr}\b", plain, out, flags=re.IGNORECASE)
    simple = out.strip()
    if not hits:
        simple = f"In simple words: {simple}" if simple else ""
    return {"original": text, "simplified": simple, "expanded": hits, "ai": False}


# --- Anchor auto-mapping: "3x a day" -> user's meal times ---

def expand_frequency(freq: str, anchors: dict) -> list[tuple[str, str]]:
    """Map a frequency phrase to [(slot_label, HH:MM)] using anchor times."""
    import re as _re
    f = (freq or "").lower()
    has = lambda *ws: any(_re.search(rf"\b{w}\b", f) for w in ws)
    dash = _re.search(r"1\s*-\s*1\s*-\s*1", f) is not None
    dash2 = _re.search(r"1\s*-\s*0\s*-\s*1", f) is not None
    times_n = _re.search(r"(\d)\s*(?:x|times?)", f)
    if has("qid") or (times_n and times_n.group(1) == "4") or dash:
        n = 4 if not dash else 3
        if dash:
            n = 3
    elif has("tds", "tid", "thrice") or has("three") and has("times", "daily", "day") or (times_n and times_n.group(1) == "3"):
        n = 3
    elif has("bd", "bid", "twice") or has("two") and has("times", "daily", "day") or (times_n and times_n.group(1) == "2") or dash2:
        n = 2
    elif has("od", "qd", "qod", "hs", "once", "daily", "everyday", "every night", "bedtime") or (times_n and times_n.group(1) == "1"):
        n = 1
    else:
        return []
    pick = {"1": ["morning"], "2": ["morning", "evening"],
            "3": ["morning", "afternoon", "evening"],
            "4": ["morning", "afternoon", "evening", "night"]}[str(min(n, 4))]
    return [(k.capitalize(), anchors.get(k, "08:00")) for k in pick]


# --- Drug interaction checker: Groq Llama 3.3 70B with curated rule fallback ---

_PAIRS = [
    ({"aspirin", "warfarin"}, "high", "Both thin the blood; bleeding risk. Needs doctor supervision + INR checks."),
    ({"ibuprofen", "warfarin"}, "high", "NSAID + blood thinner raises bleeding risk."),
    ({"aspirin", "ibuprofen"}, "moderate", "NSAIDs together raise stomach-bleed risk; space them only if doctor advised."),
    ({"metformin", "alcohol"}, "moderate", "Alcohol raises lactic-acidosis risk with metformin."),
    ({"atorvastatin", "grapefruit"}, "moderate", "Grapefruit can raise statin levels."),
    ({"thyroxine", "calcium"}, "moderate", "Calcium blocks thyroid-medicine absorption; take 4h apart if doctor advised."),
    ({"thyroxine", "iron"}, "moderate", "Iron blocks thyroid-medicine absorption; take 4h apart if doctor advised."),
]

_DRUG_CHECK_PROMPT = """You are a clinical pharmacology assistant. Given a list of medications, identify potential drug-drug interactions.

RULES:
- Only report interactions you are confident about.
- For each interaction, provide: the pair of drugs, severity (high/moderate/low), a brief description, and advice.
- If no interactions are found, say so clearly.
- NEVER reassure that a combination is "safe" — absence of a known interaction does NOT mean safety.
- Return JSON array: [{"pair": ["Drug A", "Drug B"], "severity": "high|moderate|low", "description": "...", "advice": "..."}]
- Return ONLY the JSON array, no other text."""


def _norm(name: str) -> str:
    n = name.lower()
    alias = {"thyronorm": "thyroxine", "dolo": "paracetamol", "crocin": "paracetamol",
             "augmentin": "amoxicillin", "disprin": "aspirin"}
    for k, v in alias.items():
        if k in n:
            return v
    return re.sub(r"[^a-z ]", "", n).split()[0] if n.strip() else n


def drug_check(names: list[str]) -> dict:
    # Always run rule-based first
    normed = [_norm(n) for n in names]
    rule_found = []
    for i in range(len(normed)):
        for j in range(i + 1, len(normed)):
            pair = {normed[i], normed[j]}
            for rule_pair, sev, desc in _PAIRS:
                if pair == rule_pair:
                    rule_found.append({"pair": [names[i], names[j]], "severity": sev,
                                       "description": desc, "advice": "Ask your doctor or pharmacist before changing anything."})

    # Try Groq for expanded coverage
    ai_found = []
    if len(names) >= 2:
        meds_str = ", ".join(names)
        raw = G.chat([
            {"role": "system", "content": _DRUG_CHECK_PROMPT},
            {"role": "user", "content": f"Medications: {meds_str}"},
        ], temperature=0.1, max_tokens=800)
        if raw:
            try:
                # Extract JSON from response
                cleaned = raw.strip()
                if cleaned.startswith("```"):
                    cleaned = re.sub(r"^```\w*\n?", "", cleaned)
                    cleaned = re.sub(r"\n?```$", "", cleaned)
                parsed = json.loads(cleaned)
                if isinstance(parsed, list):
                    for item in parsed:
                        if isinstance(item, dict) and "pair" in item:
                            # Don't duplicate rule-based findings
                            existing_pairs = {frozenset(f["pair"]) for f in rule_found}
                            if frozenset(item.get("pair", [])) not in existing_pairs:
                                ai_found.append({
                                    "pair": item["pair"],
                                    "severity": item.get("severity", "moderate"),
                                    "description": item.get("description", ""),
                                    "advice": item.get("advice", "Ask your doctor."),
                                    "source": "ai",
                                })
            except (json.JSONDecodeError, ValueError):
                pass  # AI response unparseable, use rules only

    all_found = rule_found + ai_found
    return {"interactions": all_found,
            "hasCritical": any(f["severity"] == "high" for f in all_found),
            "checked": len(names),
            "note": "Covers common pairs only — absence of a warning is NOT proof of safety." +
                    (" AI-augmented check included." if ai_found else "")}
