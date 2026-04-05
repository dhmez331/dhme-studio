from groq import Groq
import os
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv())

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# ─── Models (محدّثة 2026) ─────────────────────────────────
GROQ_MODELS = {
    "llama":         "llama-3.3-70b-versatile",
    "llama_fast":    "llama-3.1-8b-instant",
    "llama4":        "meta-llama/llama-4-scout-17b-16e-instruct",
    "gemma":         "gemma2-9b-it",
    "deepseek":      "deepseek-r1-distill-llama-70b",
    "qwen":          "qwen-qwq-32b",
    "compound":      "compound-beta",
    "whisper":       "whisper-large-v3",
    "whisper_turbo": "whisper-large-v3-turbo",
}

GROQ_MODEL_NAMES = {
    "llama":      "Llama 3.3 70B",
    "llama_fast": "Llama 3.1 8B (سريع)",
    "llama4":     "Llama 4 Scout (جديد)",
    "gemma":      "Gemma 2 9B",
    "deepseek":   "DeepSeek R1",
    "qwen":       "Qwen QwQ 32B (عربي ممتاز)",
    "compound":   "Groq Compound",
}

async def groq_chat(
    messages: list,
    model: str = "llama",
    system_prompt: str = None
) -> str:
    try:
        model_id = GROQ_MODELS.get(model, GROQ_MODELS["llama"])
        formatted = []
        if system_prompt:
            formatted.append({"role": "system", "content": system_prompt})
        formatted.extend(messages)

        response = client.chat.completions.create(
            model=model_id,
            messages=formatted,
            max_tokens=4096,
            temperature=0.7
        )
        return response.choices[0].message.content
    except Exception as e:
        raise Exception(f"Groq error ({model}): {str(e)}")

async def groq_chat_multi(
    messages: list,
    models: list = None,
    system_prompt: str = None
) -> dict:
    import asyncio
    if not models:
        models = ["llama", "qwen", "gemma"]

    async def single_chat(model):
        try:
            response = await groq_chat(messages, model, system_prompt)
            return model, response
        except Exception as e:
            return model, f"خطأ: {str(e)}"

    tasks = [single_chat(m) for m in models]
    results = await asyncio.gather(*tasks)
    return {GROQ_MODEL_NAMES.get(m, m): r for m, r in results}

async def groq_transcribe(
    audio_data: bytes,
    filename: str = "audio.wav",
    language: str = "ar",
    turbo: bool = True
) -> str:
    try:
        model = GROQ_MODELS["whisper_turbo"] if turbo else GROQ_MODELS["whisper"]
        transcription = client.audio.transcriptions.create(
            file=(filename, audio_data, "audio/wav"),
            model=model,
            language=language,
            response_format="text"
        )
        return transcription
    except Exception as e:
        raise Exception(f"Groq transcription error: {str(e)}")

def get_groq_models_list() -> list:
    return [{"id": k, "name": v, "provider": "Groq"} for k, v in GROQ_MODEL_NAMES.items()]