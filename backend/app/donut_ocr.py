"""Local prescription OCR with a Donut model (default: chinmays18/medical-prescription-ocr).

Lazy-loaded and None-safe: importing this module never imports torch /
transformers and never downloads weights. If deps or weights are missing,
every function degrades gracefully so the API keeps working (vision LLMs or
manual entry take over).

Env:
  DONUT_ENABLED=1          set 0 to disable the local model
  DONUT_MODEL=<hf-id>      default chinmays18/medical-prescription-ocr
  DONUT_DEVICE=auto        auto | cuda | cpu
  DONUT_MAX_LENGTH=512     max generated tokens
"""

import io
import os
import threading

MODEL_ID = os.getenv("DONUT_MODEL", "chinmays18/medical-prescription-ocr")
DEVICE_ENV = os.getenv("DONUT_DEVICE", "auto")
try:
    MAX_LENGTH = int(os.getenv("DONUT_MAX_LENGTH", "512"))
except ValueError:
    MAX_LENGTH = 512
ENABLED = os.getenv("DONUT_ENABLED", "1") == "1"

_lock = threading.Lock()
_processor = None
_model = None
_device = None
_load_error: str | None = None


def _resolve_device() -> str:
    if DEVICE_ENV in ("cuda", "cpu"):
        return DEVICE_ENV
    try:
        import torch

        return "cuda" if torch.cuda.is_available() else "cpu"
    except Exception:
        return "cpu"


def status() -> dict:
    """Engine status for /ai/ocr-status. Never loads weights."""
    try:
        device = _device or _resolve_device()
    except Exception:
        device = "cpu"
    try:
        import transformers  # noqa: F401

        deps = True
    except Exception:
        deps = False
    return {
        "enabled": ENABLED,
        "model": MODEL_ID,
        "device": device,
        "loaded": _model is not None,
        "deps_installed": deps,
        "error": _load_error,
    }


def _ensure_loaded() -> bool:
    global _processor, _model, _device, _load_error
    with _lock:
        if _model is not None:
            return True
        if not ENABLED:
            _load_error = _load_error or "disabled via DONUT_ENABLED=0"
            return False
        if _load_error is not None:
            return False  # don't retry a failed load every request
        try:
            import torch
            from transformers import DonutProcessor, VisionEncoderDecoderModel

            _device = _resolve_device()
            _processor = DonutProcessor.from_pretrained(MODEL_ID)
            _model = VisionEncoderDecoderModel.from_pretrained(MODEL_ID)
            _model.to(_device)
            _model.eval()
            return True
        except Exception as e:
            _load_error = f"{type(e).__name__}: {e}"
            print(f"[donut] load error: {_load_error}")
            return False


def extract_text(image_bytes: bytes, task_prompt: str = "<s_ocr>") -> str | None:
    """Run Donut OCR on raw image bytes. Returns stripped text or None."""
    if not image_bytes:
        return None
    if not _ensure_loaded():
        return None
    try:
        from PIL import Image
        import torch

        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        pixel_values = _processor(images=image, return_tensors="pt").pixel_values.to(_device)
        decoder_input_ids = _processor.tokenizer(
            task_prompt, add_special_tokens=False, return_tensors="pt"
        ).input_ids.to(_device)
        with torch.no_grad():
            generated = _model.generate(
                pixel_values,
                decoder_input_ids=decoder_input_ids,
                max_length=MAX_LENGTH,
                num_beams=1,
                early_stopping=True,
            )
        text = _processor.batch_decode(generated, skip_special_tokens=True)[0]
        text = (text or "").strip()
        return text or None
    except Exception as e:
        print(f"[donut] extract error: {e}")
        return None
