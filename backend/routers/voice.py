from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Optional
from auth import verify_token
from services.elevenlabs import text_to_speech, get_voices
from services.groq_service import groq_transcribe

router = APIRouter()

class TTSRequest(BaseModel):
    text: str
    voice_name: str = "arabic_male"
    voice_id: Optional[str] = None

@router.post("/tts")
async def tts(request: TTSRequest, user: dict = Depends(verify_token)):
    try:
        audio = await text_to_speech(
            text=request.text,
            voice_id=request.voice_id,
            voice_name=request.voice_name
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

@router.get("/voices")
async def voices(user: dict = Depends(verify_token)):
    return {"voices": await get_voices()}