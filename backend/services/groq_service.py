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
    "qwen":          "qwen-qwq-32b",
    "compound":      "compound-beta",
    "whisper":       "whisper-large-v3",
    "whisper_turbo": "whisper-large-v3-turbo",
}

GROQ_MODEL_NAMES = {
    "llama":      "Llama 3.3 70B",
    "llama_fast": "Llama 3.1 8B (سريع)",
    "llama4":     "Llama 4 Scout (جديد)",
    "qwen":       "Qwen QwQ 32B (عربي ممتاز)",
    "compound":   "Groq Compound",
}

GROQ_MODEL_ALIASES = {
    # توافق مع أي عميل قديم ما زال يرسل mistral
    "mistral": "qwen",
    # نماذج تم إيقافها في Groq
    "deepseek": "qwen",
    "gemma": "qwen",
}

async def groq_chat(
    messages: list,
    model: str = "llama",
    system_prompt: str = None
) -> str:
    resolved_model = GROQ_MODEL_ALIASES.get(model, model)
    formatted = []
    if system_prompt:
        formatted.append({"role": "system", "content": system_prompt})
    formatted.extend(messages)
    try:
        model_id = GROQ_MODELS.get(resolved_model, GROQ_MODELS["llama"])
        response = client.chat.completions.create(
            model=model_id,
            messages=formatted,
            max_tokens=4096,
            temperature=0.7
        )
        return response.choices[0].message.content
    except Exception as e:
        # fallback متعدد لتفادي rate-limit أو decommission
        fallback_order = ["qwen", "llama4", "llama_fast", "compound", "llama"]
        fallback_models = [m for m in fallback_order if m != resolved_model and m in GROQ_MODELS]
        for fallback in fallback_models:
            try:
                fallback_response = client.chat.completions.create(
                    model=GROQ_MODELS[fallback],
                    messages=formatted,
                    max_tokens=4096,
                    temperature=0.7
                )
                return fallback_response.choices[0].message.content
            except Exception:
                continue
        raise Exception(f"Groq error ({resolved_model}): {str(e)}")

async def groq_chat_multi(
    messages: list,
    models: list = None,
    system_prompt: str = None
) -> dict:
    import asyncio
    if not models:
        models = ["llama", "qwen", "llama4"]

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