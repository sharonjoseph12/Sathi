"""
Medical Prescription Handwriting OCR using Hugging Face model chinmays18/medical-prescription-ocr.
Utilizes Donut (Document Understanding Transformer) VisionEncoderDecoder architecture to transcribe
and extract medication details from handwritten prescriptions and doctor notes.
"""

from __future__ import annotations
import base64
import io
import json
import logging
import re
import threading
from typing import Any, Dict, List, Optional

from PIL import Image

logger = logging.getLogger("sathi.handwriting_ocr")

# Singleton state for Donut model & processor
_lock = threading.Lock()
_processor = None
_model = None
_device = None
MODEL_NAME = "chinmays18/medical-prescription-ocr"


def get_device() -> str:
    """Returns 'cuda' if GPU is available else 'cpu'."""
    global _device
    if _device is None:
        try:
            import torch
            _device = "cuda" if torch.cuda.is_available() else "cpu"
        except Exception:
            _device = "cpu"
    return _device


def load_donut_model():
    """Lazily load the Donut processor and VisionEncoderDecoder model once."""
    global _processor, _model
    if _processor is not None and _model is not None:
        return _processor, _model

    with _lock:
        if _processor is not None and _model is not None:
            return _processor, _model

        logger.info(f"Loading Donut handwriting OCR model: {MODEL_NAME}...")
        try:
            from transformers import DonutProcessor, VisionEncoderDecoderModel
            import torch

            device = get_device()
            logger.info(f"Initializing {MODEL_NAME} on device: {device}")

            proc = DonutProcessor.from_pretrained(MODEL_NAME)
            mod = VisionEncoderDecoderModel.from_pretrained(MODEL_NAME)
            mod.to(device)
            mod.eval()

            _processor = proc
            _model = mod
            logger.info(f"Successfully loaded {MODEL_NAME} on {device}")
            return _processor, _model
        except Exception as e:
            logger.error(f"Failed to load Donut handwriting model {MODEL_NAME}: {e}", exc_info=True)
            raise RuntimeError(f"Could not load handwriting model {MODEL_NAME}: {e}")


def _load_image_from_b64_or_bytes(image_data: Any) -> Image.Image:
    """Convert base64 string, bytes, or PIL Image into an RGB PIL Image."""
    if isinstance(image_data, Image.Image):
        return image_data.convert("RGB")

    if isinstance(image_data, bytes):
        return Image.open(io.BytesIO(image_data)).convert("RGB")

    if isinstance(image_data, str):
        # Strip data URI header if present
        data_str = image_data.strip()
        if "," in data_str:
            data_str = data_str.split(",", 1)[1]
        raw_bytes = base64.b64decode(data_str)
        return Image.open(io.BytesIO(raw_bytes)).convert("RGB")

    raise ValueError("Unsupported image data type. Expected base64 str, bytes, or PIL Image.")


def _parse_medicines_heuristic(text: str) -> List[Dict[str, str]]:
    """
    Parse medicines and dosages from raw transcription text using clinical heuristics.
    Handles forms (Tab, Cap, Syr), dosages (500mg, 10ml), frequencies (OD, BD, TDS),
    and timings.
    """
    if not text:
        return []

    lines = [ln.strip() for ln in text.split("\n") if ln.strip()]
    meds: List[Dict[str, str]] = []

    # Common frequency mappings
    freq_map = {
        "od": "Once daily",
        "bd": "Twice daily",
        "bid": "Twice daily",
        "tds": "Three times daily",
        "tid": "Three times daily",
        "qid": "Four times daily",
        "hs": "At bedtime",
        "sos": "As needed (SOS)",
        "once daily": "Once daily",
        "twice daily": "Twice daily",
        "thrice daily": "Three times daily",
    }

    # Common timing defaults
    time_map = {
        "Once daily": "08:00 AM",
        "Twice daily": "08:00 AM, 08:00 PM",
        "Three times daily": "08:00 AM, 02:00 PM, 08:00 PM",
        "Four times daily": "08:00 AM, 12:00 PM, 04:00 PM, 08:00 PM",
        "At bedtime": "09:30 PM",
        "As needed (SOS)": "When required",
    }

    for line in lines:
        # Ignore non-prescription lines (dates, headers, signatures)
        if re.search(r"^(dr\.|doctor|clinic|hospital|patient|date|rx|prescript)", line, re.IGNORECASE) and len(line) < 40:
            continue

        dose_match = re.search(r"\b(\d+(?:\.\d+)?\s*(?:mg|g|mcg|ml|iu|tablets?|capsules?))\b", line, re.IGNORECASE)
        dose = dose_match.group(1) if dose_match else ""

        # Extract frequency
        freq = "Once daily"
        freq_match = re.search(r"\b(od|bd|bid|tds|tid|qid|hs|sos|once daily|twice daily|thrice daily)\b", line, re.IGNORECASE)
        if freq_match:
            key = freq_match.group(1).lower()
            freq = freq_map.get(key, "Once daily")

        time_val = time_map.get(freq, "08:00 AM")

        # Instructions
        instructions = ""
        if re.search(r"\b(after meals?|after food|pc)\b", line, re.IGNORECASE):
            instructions = "After food"
        elif re.search(r"\b(before meals?|before food|ac)\b", line, re.IGNORECASE):
            instructions = "Before food"
        elif re.search(r"\b(with water|empty stomach)\b", line, re.IGNORECASE):
            instructions = "Empty stomach"

        # Determine medicine name by stripping numbers/dose/frequency
        clean_name = line
        if dose_match:
            clean_name = clean_name[:dose_match.start()] + clean_name[dose_match.end():]
        if freq_match:
            clean_name = clean_name[:freq_match.start()] + clean_name[freq_match.end():]
        clean_name = re.sub(r"\b(tab|cap|syr|inj|tablet|capsule|syrup|injection|po|pc|ac|x\s*\d+\s*(?:days|d))\b", "", clean_name, flags=re.IGNORECASE)
        clean_name = re.sub(r"[^\w\s\-\.]", " ", clean_name)
        clean_name = re.sub(r"\s+", " ", clean_name).strip(" -.")

        # If clean_name is reasonable length, add it
        if len(clean_name) >= 3 and not re.match(r"^\d+$", clean_name):
            meds.append({
                "name": clean_name.title(),
                "dose": dose or "As directed",
                "frequency": freq,
                "time": time_val,
                "instructions": instructions or "Follow doctor's advice",
            })

    # If line-by-line yielded nothing but there's valid text, treat the text as an entry
    if not meds and len(text.strip()) > 3:
        meds.append({
            "name": text.strip()[:60].title(),
            "dose": "As directed",
            "frequency": "Once daily",
            "time": "08:00 AM",
            "instructions": "Follow doctor's advice",
        })

    return meds


def _refine_with_llm(raw_text: str) -> Optional[List[Dict[str, str]]]:
    """
    Optionally pass the Donut handwriting transcription through Groq LLM
    to transform decoded doctor handwriting into perfectly structured medication entries.
    """
    try:
        from app import groq_client as GC
        prompt = f"""You are a clinical pharmacist. The following text was transcribed from a handwritten doctor's prescription using an OCR model:

\"\"\"{raw_text}\"\"\"

Extract all prescribed medicines into a strict JSON list of objects:
[
  {{"name": "Medicine Name", "dose": "500mg", "frequency": "Twice daily", "time": "08:00 AM", "instructions": "after food"}}
]

Rules:
- Format standard abbreviations: OD=Once daily, BD=Twice daily, TDS=Three times daily, QID=Four times daily, HS=At bedtime, SOS=As needed.
- Time defaults: Once daily="08:00 AM", Twice daily="08:00 AM, 08:00 PM", Three times daily="08:00 AM, 02:00 PM, 08:00 PM", Bedtime="09:30 PM".
- If dose is unspecified, put "As directed".
- Return ONLY valid JSON array. No markdown, no commentary.
        response = GC.chat([{"role": "user", "content": prompt}], max_tokens=600, temperature=0.1)
        if not response:
            return None

        cleaned = response.strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```\w*\n?", "", cleaned)
            cleaned = re.sub(r"\n?```$", "", cleaned)
        data = json.loads(cleaned)
        if isinstance(data, list):
            return data
        if isinstance(data, dict) and "medicines" in data:
            return data["medicines"]
    except Exception as e:
        logger.warning(f"LLM refinement of handwriting text skipped/failed: {e}")
    return None


def process_prescription_handwriting(
    image_data: Any,
    task_prompt: str = "<s_ocr>",
    max_length: int = 512,
    use_llm_refinement: bool = True,
) -> Dict[str, Any]:
    """
    Analyze handwritten doctor's prescription using Hugging Face model chinmays18/medical-prescription-ocr.
    
    Steps:
    1. Load image and convert to RGB.
    2. Tokenize task prompt and compute pixel values via DonutProcessor.
    3. Generate tokens with VisionEncoderDecoderModel.
    4. Decode generated tokens into handwriting transcription text.
    5. Parse extracted prescription into structured medicine cards.
    """
    import torch

    processor, model = load_donut_model()
    device = get_device()

    # Step 1: Open image
    image = _load_image_from_b64_or_bytes(image_data)

    # Step 2: Preprocess image with DonutProcessor
    pixel_values = processor(images=image, return_tensors="pt").pixel_values.to(device)

    # Step 3: Tokenize prompt
    decoder_input_ids = processor.tokenizer(task_prompt, return_tensors="pt").input_ids.to(device)

    # Step 4: Generate text with model
    with torch.no_grad():
        generated_ids = model.generate(
            pixel_values,
            decoder_input_ids=decoder_input_ids,
            max_length=max_length,
            num_beams=1,
        )

    # Step 5: Decode generated text
    generated_text = processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
    generated_text = generated_text.strip()

    # Clean any special OCR prompt tokens from raw transcription
    cleaned_transcription = re.sub(r"</?s_\w+>", " ", generated_text).strip()
    cleaned_transcription = re.sub(r"\s+", " ", cleaned_transcription)

    # Step 6: Parse into structured medicine cards
    structured_meds = None
    if use_llm_refinement and cleaned_transcription:
        structured_meds = _refine_with_llm(cleaned_transcription)

    if not structured_meds:
        structured_meds = _parse_medicines_heuristic(cleaned_transcription)

    return {
        "raw_text": cleaned_transcription or generated_text,
        "medicines": structured_meds,
        "overall_instructions": "Handwritten prescription analyzed with Donut medical OCR model. Please verify dosage and instructions.",
        "model": MODEL_NAME,
        "device": device,
        "needs_review": True,
        "message": f"Detected {len(structured_meds)} medicine(s) from doctor's handwriting." if structured_meds else "Handwriting analyzed. Please review extracted text.",
    }
