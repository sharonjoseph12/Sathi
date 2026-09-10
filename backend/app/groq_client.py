"""Shared AI client. Gemini primary, Groq fallback, graceful None when no keys."""
import os
import json

_gemini = None
_groq = None


def _get_gemini():
    global _gemini
    if _gemini is not None:
        return _gemini
    key = os.getenv("GEMINI_API_KEY", "")
    if not key:
        return None
    try:
        from google import genai
        _gemini = genai.Client(api_key=key)
        return _gemini
    except Exception:
        return None


def _get_groq():
    global _groq
    if _groq is not None:
        return _groq
    key = os.getenv("GROQ_API_KEY", "")
    if not key:
        return None
    try:
        from groq import Groq
        _groq = Groq(api_key=key)
        return _groq
    except Exception:
        return None


# ──── Chat (text-only) ────

def chat(messages: list[dict], temperature: float = 0.3, max_tokens: int = 1024) -> str | None:
    """Try Gemini first, then Groq, then None."""
    result = _gemini_chat(messages, temperature, max_tokens)
    if result:
        return result
    result = _groq_chat(messages, temperature, max_tokens)
    return result


def _gemini_chat(messages: list[dict], temperature: float, max_tokens: int) -> str | None:
    c = _get_gemini()
    if not c:
        return None
    try:
        # Convert openai-style messages to Gemini format
        system_parts = []
        contents = []
        for m in messages:
            if m["role"] == "system":
                system_parts.append(m["content"])
            elif m["role"] == "user":
                contents.append({"role": "user", "parts": [{"text": m["content"]}]})
            elif m["role"] == "assistant":
                contents.append({"role": "model", "parts": [{"text": m["content"]}]})

        # If no user message, wrap system as user
        if not contents and system_parts:
            contents = [{"role": "user", "parts": [{"text": "\n".join(system_parts)}]}]
            system_parts = []

        from google.genai import types
        config = types.GenerateContentConfig(
            temperature=temperature,
            max_output_tokens=max_tokens,
        )
        if system_parts:
            config.system_instruction = "\n\n".join(system_parts)

        r = c.models.generate_content(
            model="gemini-2.0-flash",
            contents=contents,
            config=config,
        )
        return r.text
    except Exception as e:
        print(f"[gemini] chat error: {e}")
        return None


def _groq_chat(messages: list[dict], temperature: float, max_tokens: int) -> str | None:
    c = _get_groq()
    if not c:
        return None
    try:
        r = c.chat.completions.create(
            model="llama-3.3-70b-versatile", messages=messages,
            temperature=temperature, max_tokens=max_tokens,
        )
        return r.choices[0].message.content
    except Exception as e:
        print(f"[groq] chat error: {e}")
        return None


# ──── Vision (image + text) ────

def vision(image_b64: str, prompt: str, max_tokens: int = 2048) -> str | None:
    """Try Gemini Flash vision first, then Groq Llama 4 Scout, then None."""
    result = _gemini_vision(image_b64, prompt, max_tokens)
    if result:
        return result
    result = _groq_vision(image_b64, prompt, max_tokens)
    return result


def _gemini_vision(image_b64: str, prompt: str, max_tokens: int) -> str | None:
    c = _get_gemini()
    if not c:
        return None
    try:
        import base64
        image_bytes = base64.b64decode(image_b64)

        from google.genai import types
        r = c.models.generate_content(
            model="gemini-2.0-flash",
            contents=[{
                "role": "user",
                "parts": [
                    {"text": prompt},
                    {"inline_data": {"mime_type": "image/jpeg", "data": image_b64}},
                ],
            }],
            config=types.GenerateContentConfig(
                temperature=0.1,
                max_output_tokens=max_tokens,
            ),
        )
        return r.text
    except Exception as e:
        print(f"[gemini] vision error: {e}")
        return None


def _groq_vision(image_b64: str, prompt: str, max_tokens: int) -> str | None:
    c = _get_groq()
    if not c:
        return None
    try:
        r = c.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            max_tokens=max_tokens,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {
                        "url": f"data:image/jpeg;base64,{image_b64}"
                    }},
                ],
            }],
        )
        return r.choices[0].message.content
    except Exception as e:
        print(f"[groq] vision error: {e}")
        return None
