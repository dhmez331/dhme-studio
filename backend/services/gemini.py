import google.generativeai as genai
import os
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv())

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# ─── Models ───────────────────────────────────────────────
GEMINI_MODELS = {
    "flash":      "gemini-2.0-flash",
    "pro":        "gemini-1.5-pro",
    "thinking":   "gemini-2.0-flash-thinking-exp-01-21",
    "flash_8b":   "gemini-1.5-flash-8b",
    "flash_lite": "gemini-2.0-flash-lite",
}

GEMINI_MODEL_NAMES = {
    "flash":      "Gemini 2.0 Flash",
    "pro":        "Gemini 1.5 Pro",
    "thinking":   "Gemini 2.0 Thinking",
    "flash_8b":   "Gemini 1.5 Flash 8B",
    "flash_lite": "Gemini 2.0 Flash Lite",
}

async def gemini_chat(
    messages: list,
    model: str = "flash",
    system_prompt: str = None
) -> str:
    try:
        model_id = GEMINI_MODELS.get(model, GEMINI_MODELS["flash"])
        config = {}
        if system_prompt:
            config["system_instruction"] = system_prompt

        mdl = genai.GenerativeModel(model_id, **config)
        history = []
        last_message = messages[-1]["content"] if messages else ""

        for msg in messages[:-1]:
            role = "user" if msg["role"] == "user" else "model"
            history.append({"role": role, "parts": [msg["content"]]})

        chat = mdl.start_chat(history=history)
        response = chat.send_message(last_message)
        return response.text

    except Exception as e:
        error_str = str(e)
        error_lower = error_str.lower()
        # fallback أوسع: quota / not found / permission / unsupported
        if (
            "429" in error_str
            or "quota" in error_lower
            or "not found" in error_lower
            or "permission" in error_lower
            or "unsupported" in error_lower
            or "invalid argument" in error_lower
        ):
            from services.groq_service import groq_chat
            return await groq_chat(messages, "qwen", system_prompt)
        raise Exception(f"Gemini error ({model}): {error_str}")

async def gemini_chat_multi(
    messages: list,
    models: list = None,
    system_prompt: str = None
) -> dict:
    import asyncio
    if not models:
        models = ["flash", "pro"]

    async def single_chat(model):
        try:
            response = await gemini_chat(messages, model, system_prompt)
            return model, response
        except Exception as e:
            return model, f"خطأ: {str(e)}"

    tasks = [single_chat(m) for m in models]
    results = await asyncio.gather(*tasks)
    return {GEMINI_MODEL_NAMES.get(m, m): r for m, r in results}

async def gemini_analyze_image(
    image_data: bytes,
    prompt: str,
    mime_type: str = "image/jpeg"
) -> str:
    try:
        import PIL.Image
        import io
        img = PIL.Image.open(io.BytesIO(image_data))
        mdl = genai.GenerativeModel(GEMINI_MODELS["flash"])
        response = mdl.generate_content([prompt, img])
        return response.text
    except Exception as e:
        error_str = str(e)
        if "429" in error_str or "quota" in error_str.lower():
            # Fallback: نرسل الـ prompt بدون الصورة لـ Groq
            from services.groq_service import groq_chat
            msgs = [{"role": "user", "content": f"{prompt}\n\n(ملاحظة: تعذّر تحليل الصورة بسبب quota)"}]
            return await groq_chat(msgs, "llama")
        raise Exception(f"Gemini image analysis error: {error_str}")

async def gemini_analyze_file(
    file_data: bytes,
    mime_type: str,
    prompt: str
) -> str:
    try:
        import tempfile
        suffix = {
            "video/mp4": ".mp4", "audio/mpeg": ".mp3",
            "audio/wav": ".wav", "image/jpeg": ".jpg",
            "image/png": ".png", "application/pdf": ".pdf"
        }.get(mime_type, ".tmp")

        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(file_data)
            tmp_path = tmp.name

        uploaded = genai.upload_file(tmp_path, mime_type=mime_type)
        mdl = genai.GenerativeModel(GEMINI_MODELS["pro"])
        response = mdl.generate_content([prompt, uploaded])
        os.unlink(tmp_path)
        return response.text

    except Exception as e:
        error_str = str(e)
        if "429" in error_str or "quota" in error_str.lower():
            from services.groq_service import groq_chat
            msgs = [{"role": "user", "content": f"{prompt}\n\n(ملاحظة: تعذّر تحليل الملف بسبب quota)"}]
            return await groq_chat(msgs, "llama")
        raise Exception(f"Gemini file analysis error: {error_str}")

async def gemini_edit_image(
    image_data: bytes,
    prompt: str,
    mime_type: str = "image/jpeg"
) -> str:
    try:
        import PIL.Image
        import io
        img = PIL.Image.open(io.BytesIO(image_data))
        mdl = genai.GenerativeModel(GEMINI_MODELS["flash"])
        edit_prompt = f"""أنت محرر صور محترف. المستخدم يريد: {prompt}

حلّل هذه الصورة بدقة واعطِ:
1. وصف الصورة الحالية بالتفصيل
2. برومبت احترافي بالإنجليزية لتوليد صورة معدّلة حسب طلب المستخدم
3. اجعل البرومبت يحتفظ بعناصر الصورة الأصلية مع إضافة التعديلات المطلوبة

أعطِ البرومبت فقط في السطر الأخير بعد كلمة PROMPT:"""

        response = mdl.generate_content([edit_prompt, img])
        return response.text

    except Exception as e:
        error_str = str(e)
        if "429" in error_str or "quota" in error_str.lower():
            # Fallback بدون الصورة
            from services.groq_service import groq_chat
            msgs = [{"role": "user", "content": f"""أنت محرر صور. المستخدم يريد: {prompt}
اعطِ برومبت احترافي بالإنجليزية لتوليد هذه الصورة.
أعطِ البرومبت فقط في السطر الأخير بعد كلمة PROMPT:"""}]
            return await groq_chat(msgs, "llama")
        raise Exception(f"Gemini edit image error: {error_str}")

def get_gemini_models_list() -> list:
    return [{"id": k, "name": v, "provider": "Google"} for k, v in GEMINI_MODEL_NAMES.items()]