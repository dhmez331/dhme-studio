import httpx
import os
from dotenv import load_dotenv

load_dotenv()

ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
BASE_URL = "https://api.elevenlabs.io/v1"

# ─── Available Voices ─────────────────────────────────────
VOICES = {
    "arabic_male":   "pNInz6obpgDQGcFmaJgB",  # Adam
    "arabic_female": "EXAVITQu4vr4xnSDxMaL",  # Bella
    "english_male":  "VR6AewLTigWG4xSOukaG",  # Arnold
    "english_female":"ThT5KcBeYPX3keUQqHPh",  # Dorothy
}

# ─── Text to Speech ───────────────────────────────────────
async def text_to_speech(
    text: str,
    voice_id: str = None,
    voice_name: str = "arabic_male",
    stability: float = 0.5,
    similarity_boost: float = 0.75
) -> bytes:
    try:
        vid = voice_id or VOICES.get(voice_name, VOICES["arabic_male"])
        
        headers = {
            "xi-api-key": ELEVENLABS_API_KEY,
            "Content-Type": "application/json"
        }
        
        payload = {
            "text": text,
            "model_id": "eleven_multilingual_v2",
            "voice_settings": {
                "stability": stability,
                "similarity_boost": similarity_boost
            }
        }
        
        async with httpx.AsyncClient(timeout=30) as client:
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

# ─── Get Available Voices ─────────────────────────────────
async def get_voices() -> list:
    try:
        headers = {"xi-api-key": ELEVENLABS_API_KEY}
        
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(f"{BASE_URL}/voices", headers=headers)
            data = response.json()
        
        return [{"id": v["voice_id"], "name": v["name"]} for v in data.get("voices", [])]

    except Exception as e:
        print(f"Get voices error: {e}")
        return list(VOICES.items())