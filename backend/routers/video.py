from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
from auth import verify_token
from services.gemini import gemini_edit_image, gemini_chat
from services.image_gateway import generate_image_with_fallback
import base64

router = APIRouter()

class VideoRequest(BaseModel):
    prompt: str
    duration: int = 5

@router.post("/generate")
async def generate_video(request: VideoRequest, user: dict = Depends(verify_token)):
    return {
        "status": "coming_soon",
        "message": "توليد الفيديو قيد التطوير",
        "prompt": request.prompt
    }

@router.post("/from-image")
async def video_from_image(
    file: UploadFile = File(...),
    prompt: str = Form(default="حوّل هذه الصورة لمشهد متحرك"),
    user: dict = Depends(verify_token)
):
    """
    مؤقتاً: نستخدم Gemini لتحليل الصورة + FLUX لتوليد صورة معدّلة
    لاحقاً: نضيف نموذج فيديو حقيقي
    """
    try:
        image_data = await file.read()

        # الخطوة 1: Gemini يحلل الصورة ويولد برومبت
        edit_result = await gemini_edit_image(image_data, prompt)

        # استخراج البرومبت من الرد
        lines = edit_result.strip().split('\n')
        image_prompt = lines[-1].replace("PROMPT:", "").strip()
        if not image_prompt or len(image_prompt) < 10:
            image_prompt = prompt

        # الخطوة 2: FLUX يولد الصورة المعدّلة
        new_image, provider, attempts = await generate_image_with_fallback(image_prompt, "flux_dev")
        img_b64 = base64.b64encode(new_image).decode()

        return JSONResponse({
            "status": "image_generated",
            "note": "توليد الفيديو قيد التطوير — تم توليد صورة معدّلة",
            "analysis": edit_result,
            "enhanced_prompt": image_prompt,
            "image_b64": img_b64,
            "provider": provider,
            "attempts": attempts,
        })

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))