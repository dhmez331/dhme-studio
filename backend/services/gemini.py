import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# ─── Models ──────────────────────────────────────────────
GEMINI_FLASH  = "gemini-2.0-flash-exp"
GEMINI_PRO    = "gemini-1.5-pro"

# ─── Chat ────────────────────────────────────────────────
async def gemini_chat(
    messages: list,
    model: str = GEMINI_FLASH,
    system_prompt: str = None
) -> str:
    try:
        config = {}
        if system_prompt:
            config["system_instruction"] = system_prompt

        mdl = genai.GenerativeModel(model, **config)

        # تحويل messages لصيغة Gemini
        history = []
        last_message = messages[-1]["content"] if messages else ""

        for msg in messages[:-1]:
            role = "user" if msg["role"] == "user" else "model"
            history.append({
                "role": role,
                "parts": [msg["content"]]
            })

        chat = mdl.start_chat(history=history)
        response = chat.send_message(last_message)
        return response.text

    except Exception as e:
        raise Exception(f"Gemini error: {str(e)}")

# ─── Analyze Image ───────────────────────────────────────
async def gemini_analyze_image(image_data: bytes, prompt: str, mime_type: str = "image/jpeg") -> str:
    try:
        import PIL.Image
        import io

        img = PIL.Image.open(io.BytesIO(image_data))
        mdl = genai.GenerativeModel(GEMINI_FLASH)
        response = mdl.generate_content([prompt, img])
        return response.text

    except Exception as e:
        raise Exception(f"Gemini image analysis error: {str(e)}")

# ─── Analyze with File ───────────────────────────────────
async def gemini_analyze_file(file_data: bytes, mime_type: str, prompt: str) -> str:
    try:
        import tempfile, os

        # حفظ مؤقت للملف
        suffix = {
            "video/mp4": ".mp4",
            "audio/mpeg": ".mp3",
            "audio/wav": ".wav",
            "image/jpeg": ".jpg",
            "image/png": ".png"
        }.get(mime_type, ".tmp")

        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(file_data)
            tmp_path = tmp.name

        uploaded = genai.upload_file(tmp_path, mime_type=mime_type)
        mdl = genai.GenerativeModel(GEMINI_PRO)
        response = mdl.generate_content([prompt, uploaded])

        os.unlink(tmp_path)
        return response.text

    except Exception as e:
        raise Exception(f"Gemini file analysis error: {str(e)}")