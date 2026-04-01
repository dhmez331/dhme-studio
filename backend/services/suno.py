# Suno AI — نستخدم Groq لتوليد كلمات + ElevenLabs للصوت
# (Suno API مدفوع — نبني بديل مجاني)

async def generate_song_lyrics(
    theme: str,
    style: str = "شيلة",
    language: str = "ar"
) -> str:
    """
    نولّد كلمات الأغنية/الشيلة باستخدام Groq
    """
    from services.groq_service import groq_chat
    
    system = """أنت شاعر ومغني سعودي متخصص في كتابة الشيلات والأغاني.
    اكتب كلمات جميلة وأصيلة باللهجة السعودية أو الفصحى حسب الطلب.
    قسّم الكلمات لـ: مقدمة، مقطع 1، كورس، مقطع 2، خاتمة."""
    
    prompt = f"اكتب {style} عن: {theme}\nاللغة/اللهجة: {language}"
    
    messages = [{"role": "user", "content": prompt}]
    
    lyrics = await groq_chat(messages, model="llama", system_prompt=system)
    return lyrics

async def lyrics_to_audio(lyrics: str, voice: str = "arabic_male") -> bytes:
    """
    نحوّل الكلمات لصوت باستخدام ElevenLabs
    """
    from services.elevenlabs import text_to_speech
    return await text_to_speech(lyrics, voice_name=voice)