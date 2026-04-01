from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import Optional
from auth import verify_token
from services.gemini import gemini_analyze_image, gemini_analyze_file

router = APIRouter()

@router.post("/")
async def analyze_file(
    file: UploadFile = File(...),
    prompt: str = Form(default="حلّل هذا الملف وأعطني ملخصاً مفصلاً"),
    user: dict = Depends(verify_token)
):
    try:
        file_data  = await file.read()
        mime_type  = file.content_type

        # صورة
        if mime_type.startswith("image/"):
            result = await gemini_analyze_image(file_data, prompt, mime_type)
        # فيديو أو صوت
        elif mime_type.startswith(("video/", "audio/")):
            result = await gemini_analyze_file(file_data, mime_type, prompt)
        else:
            raise HTTPException(status_code=400, detail="نوع الملف غير مدعوم")

        return {"analysis": result, "filename": file.filename}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
