import google.generativeai as genai
import os
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv())

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# ─── Models ──────────────────────────────────────────────
GEMINI_MODELS = {
    "flash":      "gemini-2.0-flash-exp",
    "pro":        "gemini-1.5-pro",
    "thinking":   "gemini-2.0-flash-thinking-exp",
    "flash_8b":   "gemini-1.5-flash-8b",
}

GEMINI_MODEL_NAMES = {
    "flash":    "Gemini 2.0 Flash",
    "pro":      "Gemini 1.5 Pro",
    "thinking": "Gemini 2.0 Thinking (تفكير عميق)",
    "flash_8b": "Gemini 1.5 Flash 8B (سريع)",
}

# ─── Chat ────────────────────────────────────────────────
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
            history.append({
                "role": role,
                "parts": [msg["content"]]
            })

        chat = mdl.start_chat(history=history)
        response = chat.send_message(last_message)
        return response.text

    except Exception as e:
        raise Exception(f"Gemini error ({model}): {str(e)}")

# ─── Chat with Multiple Gemini Models ────────────────────
async def gemini_chat_multi(
    messages: list,
    models: list = None,
    system_prompt: str = None
) -> dict:
    import asyncio

    if not models:
        models = ["flash", "pro", "thinking"]

    async def single_chat(model):
        try:
            response = await gemini_chat(messages, model, system_prompt)
            return model, response
        except Exception as e:
            return model, f"خطأ: {str(e)}"

    tasks = [single_chat(m) for m in models]
    results = await asyncio.gather(*tasks)

    return {
        GEMINI_MODEL_NAMES.get(model, model): response
        for model, response in results
    }

# ─── Generate Image with Imagen 3 ────────────────────────
async def imagen_generate(
    prompt: str,
    number_of_images: int = 1,
    aspect_ratio: str = "1:1"
) -> list:
    """
    توليد صور باستخدام Imagen 3 من Google
    يرجع قائمة من bytes
    """
    try:
        from google.generativeai import ImageGenerationModel

        model = ImageGenerationModel.from_pretrained("imagen-3.0-generate-001")

        response = model.generate_images(
            prompt=prompt,
            number_of_images=number_of_images,
            aspect_ratio=aspect_ratio,
        )

        images = []
        for img in response.images:
            images.append(img._image_bytes)

        return images

    except Exception as e:
        raise Exception(f"Imagen 3 error: {str(e)}")

# ─── Analyze Image ───────────────────────────────────────
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
        raise Exception(f"Gemini image analysis error: {str(e)}")

# ─── Analyze File (Video/Audio) ───────────────────────────
async def gemini_analyze_file(
    file_data: bytes,
    mime_type: str,
    prompt: str
) -> str:
    try:
        import tempfile

        suffix = {
            "video/mp4":   ".mp4",
            "audio/mpeg":  ".mp3",
            "audio/wav":   ".wav",
            "image/jpeg":  ".jpg",
            "image/png":   ".png"
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
        raise Exception(f"Gemini file analysis error: {str(e)}")

# ─── Get All Models Info ──────────────────────────────────
def get_gemini_models_list() -> list:
    return [
        {"id": k, "name": v, "provider": "Google"}
        for k, v in GEMINI_MODEL_NAMES.items()
    ]