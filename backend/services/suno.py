from services.groq_service import groq_chat
from services.elevenlabs import text_to_speech

STYLES = {
    "sheilah":    "شيلة سعودية أصيلة",
    "nasheed":    "نشيد إسلامي بدون موسيقى",
    "poem":       "قصيدة نبطية",
    "song_ar":    "أغنية عربية",
    "commercial": "إعلان صوتي تجاري",
    "intro":      "مقدمة صوتية احترافية",
}

async def generate_lyrics(
    theme: str,
    style: str = "sheilah",
    language: str = "ar"
) -> str:
    style_name = STYLES.get(style, "شيلة")

    system = f"""أنت شاعر سعودي محترف متخصص في {style_name}.
اكتب كلمات جميلة وأصيلة. قسّم الكلمات بوضوح:
[مقدمة] ... [مقطع 1] ... [كورس] ... [مقطع 2] ... [خاتمة]
لا تضف أي شرح — الكلمات فقط."""

    messages = [{"role": "user", "content": f"اكتب {style_name} عن: {theme}"}]
    return await groq_chat(messages, model="llama", system_prompt=system)

async def lyrics_to_audio(
    lyrics: str,
    voice: str = "arabic_male",
    style: str = "normal"
) -> bytes:
    return await text_to_speech(lyrics, voice_name=voice, style=style)

async def generate_commercial(
    product: str,
    duration: str = "30",
    voice: str = "commercial"
) -> dict:
    """توليد إعلان صوتي كامل"""
    system = """أنت كاتب إعلانات محترف.
اكتب سكريبت إعلان قصير وجذاب.
يجب أن يكون مقنعاً ومؤثراً.
أعطِ النص فقط بدون أي شرح."""

    messages = [{"role": "user", "content":
        f"اكتب إعلان صوتي مدته {duration} ثانية عن: {product}"}]

    script = await groq_chat(messages, model="llama", system_prompt=system)
    audio = await text_to_speech(script, voice_name=voice, style="commercial")

    return {"script": script, "audio": audio}