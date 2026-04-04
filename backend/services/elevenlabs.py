import httpx
import os
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv())

ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
BASE_URL = "https://api.elevenlabs.io/v1"

VOICES = {
    "arabic_male":        "pNInz6obpgDQGcFmaJgB",
    "arabic_female":      "EXAVITQu4vr4xnSDxMaL",
    "english_male":       "VR6AewLTigWG4xSOukaG",
    "english_female":     "ThT5KcBeYPX3keUQqHPh",
    "arabic_news":        "onwK4e9ZLuTAKqWW03F9",  # Daniel - إخباري
    "arabic_calm":        "N2lVS1w4EtoT3dr4eOWO",  # Callum - هادئ
    "saudi_dialect":      "pNInz6obpgDQGcFmaJgB",  # نفس Adam مع prompt مختلف
    "commercial":         "ErXwobaYiN019PkySvjV",  # Antoni - تجاري
}

VOICE_NAMES = {
    "arabic_male":    "عربي رجالي",
    "arabic_female":  "عربي نسائي",
    "english_male":   "إنجليزي رجالي",
    "english_female": "إنجليزي نسائي",
    "arabic_news":    "إخباري رسمي",
    "arabic_calm":    "هادئ ومريح",
    "saudi_dialect":  "عامية سعودية",
    "commercial":     "تعليق تجاري",
}

async def text_to_speech(
    text: str,
    voice_id: str = None,
    voice_name: str = "arabic_male",
    style: str = "normal",
    stability: float = 0.5,
    similarity_boost: float = 0.75
) -> bytes:
    try:
        vid = voice_id or VOICES.get(voice_name, VOICES["arabic_male"])

        # تعديل النص حسب الأسلوب
        final_text = text
        if style == "commercial":
            final_text = f"[تعليق تجاري احترافي] {text}"
        elif style == "saudi":
            final_text = text  # نعتمد على الـ voice settings

        # إعدادات الصوت حسب الأسلوب
        if style == "news":
            stability, similarity_boost = 0.8, 0.9
        elif style == "calm":
            stability, similarity_boost = 0.9, 0.8
        elif style == "commercial":
            stability, similarity_boost = 0.4, 0.85

        headers = {
            "xi-api-key": ELEVENLABS_API_KEY,
            "Content-Type": "application/json"
        }

        payload = {
            "text": final_text,
            "model_id": "eleven_multilingual_v2",
            "voice_settings": {
                "stability": stability,
                "similarity_boost": similarity_boost,
                "style": 0.5 if style == "commercial" else 0.0,
                "use_speaker_boost": True
            }
        }

        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                f"{BASE_URL}/text-to-speech/{vid}",
                headers=headers,
                json=payload
            )
            if response.status_code != 200:
                raise Exception(f"ElevenLabs error: {response.text}")
            return response.content

    except Exception as e:
        raise Exception(f"TTS error: {str(e)}")

async def get_voices() -> list:
    return [{"id": k, "name": v} for k, v in VOICE_NAMES.items()]

async def generate_sound_effect(text: str, duration: float = 5.0) -> bytes:
    """توليد مؤثرات صوتية"""
    try:
        headers = {
            "xi-api-key": ELEVENLABS_API_KEY,
            "Content-Type": "application/json"
        }
        payload = {
            "text": text,
            "duration_seconds": duration,
            "prompt_influence": 0.3
        }
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                f"{BASE_URL}/sound-generation",
                headers=headers,
                json=payload
            )
            if response.status_code != 200:
                raise Exception(f"Sound effect error: {response.text}")
            return response.content
    except Exception as e:
        raise Exception(f"Sound effect error: {str(e)}")