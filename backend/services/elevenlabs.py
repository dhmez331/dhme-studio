import asyncio
import os
import io

# ─── Edge TTS (مجاني من Microsoft) ───────────────────────
# pip install edge-tts

VOICES = {
    "arabic_male":    "ar-SA-HamedNeural",
    "arabic_female":  "ar-SA-ZariyahNeural",
    "english_male":   "en-US-GuyNeural",
    "english_female": "en-US-JennyNeural",
    "arabic_news":    "ar-EG-ShakirNeural",
    "arabic_calm":    "ar-SA-ZariyahNeural",
    "saudi_dialect":  "ar-SA-HamedNeural",
    "commercial":     "ar-SA-HamedNeural",
}

VOICE_NAMES = {
    "arabic_male":    "عربي رجالي (سعودي)",
    "arabic_female":  "عربي نسائي (سعودي)",
    "english_male":   "إنجليزي رجالي",
    "english_female": "إنجليزي نسائي",
    "arabic_news":    "إخباري رسمي (مصري)",
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
        import edge_tts

        voice = voice_id or VOICES.get(voice_name, VOICES["arabic_male"])

        # تعديل معدل الكلام حسب الأسلوب
        rate = "+0%"
        if style == "news":
            rate = "+5%"
        elif style == "calm":
            rate = "-10%"
        elif style == "commercial":
            rate = "+10%"

        communicate = edge_tts.Communicate(text, voice, rate=rate)

        # جمع الـ audio chunks
        audio_data = b""
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_data += chunk["data"]

        if not audio_data:
            raise Exception("لم يتم توليد صوت")

        return audio_data

    except ImportError:
        raise Exception("edge-tts غير مثبت — شغّل: pip install edge-tts")
    except Exception as e:
        raise Exception(f"TTS error: {str(e)}")

async def get_voices() -> list:
    return [{"id": k, "name": v} for k, v in VOICE_NAMES.items()]

async def generate_sound_effect(text: str, duration: float = 5.0) -> bytes:
    """
    Edge TTS ما يدعم sound effects —
    نولد صوت بسيط كـ placeholder
    """
    try:
        return await text_to_speech(
            text=f"مؤثر صوتي: {text}",
            voice_name="arabic_male"
        )
    except Exception as e:
        raise Exception(f"Sound effect error: {str(e)}")