from groq import Groq
import os
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# ─── Available Models ─────────────────────────────────────
GROQ_MODELS = {
    "llama":    "llama-3.3-70b-versatile",
    "gemma":    "gemma2-9b-it",
    "deepseek": "deepseek-r1-distill-llama-70b",
    "qwen":     "qwen-qwq-32b",
    "whisper":  "whisper-large-v3",
}

# ─── Chat ────────────────────────────────────────────────
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
        raise Exception(f"Groq error: {str(e)}")

# ─── Speech to Text ───────────────────────────────────────
async def groq_transcribe(audio_data: bytes, filename: str = "audio.wav", language: str = "ar") -> str:
    try:
        transcription = client.audio.transcriptions.create(
            file=(filename, audio_data, "audio/wav"),
            model=GROQ_MODELS["whisper"],
            language=language,
            response_format="text"
        )
        return transcription

    except Exception as e:
        raise Exception(f"Groq transcription error: {str(e)}")