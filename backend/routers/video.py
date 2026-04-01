from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from auth import verify_token

router = APIRouter()

class VideoRequest(BaseModel):
    prompt: str
    duration: int = 5  # seconds

@router.post("/generate")
async def generate_video(request: VideoRequest, user: dict = Depends(verify_token)):
    # Video generation — قيد التطوير
    # سنضيف HuggingFace video models في المرحلة 3
    return {
        "status": "coming_soon",
        "message": "توليد الفيديو سيتوفر قريباً",
        "prompt": request.prompt
    }