"""Provider-agnostic companion engine. Uses Gemini/Groq when available, falls back to MOCK."""
import os
from app import groq_client as G

PROVIDER = os.getenv("AI_PROVIDER", "MOCK")

SYSTEM_PROMPT = """You are Sathi, a warm, calm, and concise post-hospital recovery companion.
You help patients with medication reminders, symptom tracking, and recovery questions.

RULES:
- Never diagnose. Never prescribe. Never change doses.
- If a patient reports alarming symptoms (chest pain, breathing difficulty, severe bleeding),
  immediately tell them to seek emergency medical help. Do NOT reassure.
- Keep responses short (2-3 sentences max). Speak like a caring friend, not a doctor.
- If uncertain, say "Please check with your doctor."
- Use the patient context provided to personalize responses.
- You can suggest logging symptoms, taking medicines, or viewing follow-ups.
- Respond in the same language the patient uses."""


def companion_reply(message: str, ctx: dict) -> dict:
    """ctx: {name, meds:[{name,time}], symptoms:[{text,risk}], adherence:int, risk:str}"""
    # Try Groq first
    if PROVIDER in ("GEMINI", "GROQ"):
        result = _ai_reply(message, ctx)
        if result:
            return result
    # Fallback to deterministic MOCK
    return _mock_reply(message, ctx)


def _ai_reply(message: str, ctx: dict) -> dict | None:
    name = (ctx.get("name") or "friend").split()[0]
    meds_str = ", ".join(f"{m['name']} at {m.get('time', '?')}" for m in (ctx.get("meds") or [])[:8]) or "none"
    syms_str = ", ".join(f"{s['text']} ({s.get('risk', '?')})" for s in (ctx.get("symptoms") or [])[:5]) or "none"

    user_ctx = (
        f"Patient: {name}. Adherence today: {ctx.get('adherence', 0)}%. "
        f"Active meds: {meds_str}. Recent symptoms: {syms_str}. "
        f"Next follow-up: {ctx.get('next_followup') or 'none scheduled'}."
    )

    text = G.chat([
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "system", "content": f"PATIENT CONTEXT: {user_ctx}"},
        {"role": "user", "content": message},
    ], temperature=0.4, max_tokens=300)

    if not text:
        return None

    # Detect action suggestions from response
    actions = []
    tl = text.lower()
    if any(w in tl for w in ["take your", "medicine", "medication", "dose"]):
        actions.append({"type": "NAVIGATE_TO_MEDICINES", "label": "Open medicines"})
    if any(w in tl for w in ["log", "symptom", "report"]):
        actions.append({"type": "LOG_SYMPTOM", "label": "Log symptom"})
    if any(w in tl for w in ["follow-up", "appointment", "doctor visit"]):
        actions.append({"type": "NAVIGATE_FOLLOWUPS", "label": "View follow-ups"})

    return {"message": text, "actions": actions}


def _mock_reply(message: str, ctx: dict) -> dict:
    """Original deterministic fallback."""
    t = (message or "").lower()
    name = (ctx.get("name") or "friend").split()[0]
    meds = ctx.get("meds", []) or []
    adh = ctx.get("adherence", 0)

    if any(w in t for w in ["medicine", "pill", "dose", "tablet", "take"]):
        if meds:
            first = meds[0]
            return {"message": f"{name}, your next listed medicine is {first['name']} at {first.get('time', 'its usual time')}. Mark it Taken once done.",
                    "actions": [{"type": "TAKE_MEDICINE", "label": "Open medicines"}]}
        return {"message": f"{name}, you have no pending medicines right now. Nice work staying on track.",
                "actions": []}
    if any(w in t for w in ["appointment", "follow", "doctor", "visit"]):
        fu = ctx.get("next_followup")
        if fu:
            return {"message": f"Your next follow-up is {fu}. Reply here if anything changes before then.",
                    "actions": [{"type": "NAVIGATE_FOLLOWUPS", "label": "View follow-ups"}]}
        return {"message": "No follow-up is scheduled yet. Ask your care team for the next date and add it under Follow-ups.",
                "actions": [{"type": "NAVIGATE_FOLLOWUPS", "label": "Add follow-up"}]}
    if any(w in t for w in ["pain", "hurt", "fever", "dizz", "nausea", "tired", "ache", "symptom", "feel"]):
        return {"message": f"Sorry to hear that, {name}. I have noted it for your timeline. Rest, drink water, and tell your caregiver if it worsens. What is the severity from 1 to 10?",
                "actions": [{"type": "LOG_SYMPTOM", "label": "Log symptom"}]}
    if "thank" in t:
        return {"message": f"You are welcome, {name}. You are at {adh}% adherence today — keep it up.",
                "actions": []}
    if any(w in t for w in ["hi", "hello", "namaste", "hey"]):
        return {"message": f"Hello {name}. I can help with medicines, symptoms, appointments, or simple explanations. What do you need?",
                "actions": []}
    return {"message": f"Noted, {name}. I can log that, explain it simply, or find the right screen. Try: medicines, symptoms, or appointments.",
            "actions": [{"type": "LOG_SYMPTOM", "label": "Log symptom"},
                        {"type": "NAVIGATE_TO_MEDICINES", "label": "Medicines"}]}
