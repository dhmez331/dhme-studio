from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import Optional
from auth import verify_token
from services.gemini import gemini_analyze_image, gemini_analyze_file

router = APIRouter()

SUPPORTED_TYPES = {
    "image": ["image/jpeg", "image/png", "image/webp", "image/gif"],
    "audio": ["audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4"],
    "video": ["video/mp4", "video/mpeg", "video/quicktime"],
    "document": ["application/pdf", "text/plain",
                 "application/msword",
                 "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
}

@router.post("/")
async def analyze_file(
    file: UploadFile = File(...),
    prompt: str = Form(default="حلّل هذا الملف وأعطني ملخصاً مفصلاً"),
    user: dict = Depends(verify_token)
):
    try:
        file_data = await file.read()
        mime_type = file.content_type or "application/octet-stream"

        # صورة
        if mime_type.startswith("image/"):
            result = await gemini_analyze_image(file_data, prompt, mime_type)

        # PDF أو مستند
        elif mime_type in ["application/pdf", "text/plain",
                           "application/msword",
                           "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]:
            # للـ PDF نستخدم gemini_analyze_file
            if mime_type == "application/pdf":
                result = await gemini_analyze_file(file_data, mime_type, prompt)
            else:
                # للنص العادي نقرأه مباشرة
                try:
                    text_content = file_data.decode("utf-8", errors="ignore")
                    from services.gemini import gemini_chat
                    messages = [{"role": "user", "content": f"{prompt}\n\nمحتوى الملف:\n{text_content[:8000]}"}]
                    result = await gemini_chat(messages)
                except Exception as e:
                    raise Exception(f"Text file error: {str(e)}")

        # فيديو أو صوت
        elif mime_type.startswith(("video/", "audio/")):
            result = await gemini_analyze_file(file_data, mime_type, prompt)

        else:
            # محاولة أي ملف كنص
            try:
                text_content = file_data.decode("utf-8", errors="ignore")
                if text_content.strip():
                    from services.gemini import gemini_chat
                    messages = [{"role": "user", "content": f"{prompt}\n\n{text_content[:8000]}"}]
                    result = await gemini_chat(messages)
                else:
                    raise HTTPException(status_code=400, detail=f"نوع الملف غير مدعوم: {mime_type}")
            except HTTPException:
                raise
            except Exception:
                raise HTTPException(status_code=400, detail=f"نوع الملف غير مدعوم: {mime_type}")

        return {
            "analysis": result,
            "filename": file.filename,
            "mime_type": mime_type
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/supported-types")
async def get_supported_types(user: dict = Depends(verify_token)):
    return {"supported": SUPPORTED_TYPES}