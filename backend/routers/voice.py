from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import Response, JSONResponse
from pydantic import BaseModel
from typing import Optional
from auth import verify_token
from services.elevenlabs import text_to_speech, get_voices, generate_sound_effect
from services.groq_service import groq_transcribe
from services.suno import generate_lyrics, lyrics_to_audio, generate_commercial
import base64

router = APIRouter()

class TTSRequest(BaseModel):
    text: str
    voice_name: str = "arabic_male"
    voice_id: Optional[str] = None
    style: str = "normal"

class LyricsRequest(BaseModel):
    theme: str
    style: str = "sheilah"
    language: str = "ar"
    voice: str = "arabic_male"
    audio: bool = True

class CommercialRequest(BaseModel):
    product: str
    duration: str = "30"
    voice: str = "commercial"

class SoundEffectRequest(BaseModel):
    description: str
    duration: float = 5.0

@router.post("/tts")
async def tts(request: TTSRequest, user: dict = Depends(verify_token)):
    try:
        audio = await text_to_speech(
            text=request.text,
            voice_id=request.voice_id,
            voice_name=request.voice_name,
            style=request.style
        )
        return Response(content=audio, media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/transcribe")
async def transcribe(
    file: UploadFile = File(...),
    user: dict = Depends(verify_token)
):
    try:
        audio_data = await file.read()
        text = await groq_transcribe(audio_data, file.filename)
        return {"text": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/lyrics")
async def create_lyrics(request: LyricsRequest, user: dict = Depends(verify_token)):
    try:
        lyrics = await generate_lyrics(request.theme, request.style, request.language)
        result = {"lyrics": lyrics, "style": request.style}

        if request.audio:
            audio = await lyrics_to_audio(lyrics, request.voice)
            result["audio_b64"] = base64.b64encode(audio).decode()

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/commercial")
async def create_commercial(request: CommercialRequest, user: dict = Depends(verify_token)):
    try:
        result = await generate_commercial(request.product, request.duration, request.voice)
        return {
            "script": result["script"],
            "audio_b64": base64.b64encode(result["audio"]).decode()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sound-effect")
async def sound_effect(request: SoundEffectRequest, user: dict = Depends(verify_token)):
    try:
        audio = await generate_sound_effect(request.description, request.duration)
        return Response(content=audio, media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/voices")
async def voices(user: dict = Depends(verify_token)):
    return {"voices": await get_voices()}

@router.get("/styles")
async def styles(user: dict = Depends(verify_token)):
    return {"styles": [
        {"id": "sheilah",    "name": "شيلة سعودية"},
        {"id": "nasheed",    "name": "نشيد بدون موسيقى"},
        {"id": "poem",       "name": "قصيدة نبطية"},
        {"id": "song_ar",    "name": "أغنية عربية"},
        {"id": "commercial", "name": "إعلان تجاري"},
        {"id": "intro",      "name": "مقدمة صوتية"},
    ]}