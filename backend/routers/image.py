from fastapi import APIRouter, Depends, UploadFile, File, Form
from fastapi.responses import Response, JSONResponse
from pydantic import BaseModel
from typing import Optional
import base64
from auth import verify_token
from services.image_gateway import (
    generate_image_with_fallback,
    classify_error,
    get_image_health,
    get_image_metrics,
)
from services.collaboration import collaborate_image
from services.gemini import gemini_edit_image

router = APIRouter()


def build_image_error(status_code: int, error_type: str, message: str, **extra):
    payload = {
        "ok": False,
        "error": {
            "type": error_type,
            "message": message,
        },
    }
    if extra:
        payload["error"].update(extra)
    return JSONResponse(payload, status_code=status_code)

class ImageRequest(BaseModel):
    prompt: str
    model: str = "flux_schnell"
    negative_prompt: str = ""
    width: int = 1024
    height: int = 1024
    collaboration_mode: Optional[str] = None
    enhance_prompt: bool = True

@router.post("/generate")
async def generate(request: ImageRequest, user: dict = Depends(verify_token)):
    try:
        if request.collaboration_mode == "compete":
            result = await collaborate_image(
                prompt=request.prompt,
                mode="compete",
                enhance_prompt=request.enhance_prompt
            )
            images_b64 = {}
            for model_name, img_bytes in result["images"].items():
                if img_bytes:
                    images_b64[model_name] = base64.b64encode(img_bytes).decode()
            if not images_b64:
                error_types = [v.get("type", "upstream") for v in (result.get("errors") or {}).values()]
                dominant_type = error_types[0] if error_types else "upstream"
                return build_image_error(
                    502,
                    dominant_type,
                    "فشل توليد الصور من جميع النماذج. جرّب نموذجًا مختلفًا أو أعد المحاولة لاحقًا.",
                    mode="compete",
                    images={},
                    errors=result.get("errors", {}),
                    enhanced_prompt=result["enhanced_prompt"],
                    original_prompt=result["original_prompt"],
                )
            return JSONResponse({
                "mode": "compete",
                "enhanced_prompt": result["enhanced_prompt"],
                "original_prompt": result["original_prompt"],
                "images": images_b64,
                "providers": result.get("providers", {}),
                "errors": result.get("errors", {}),
            })

        elif request.collaboration_mode == "collaborate":
            result = await collaborate_image(
                prompt=request.prompt,
                mode="collaborate",
                enhance_prompt=request.enhance_prompt
            )
            img_b64 = base64.b64encode(result["image"]).decode()
            return JSONResponse({
                "mode": "collaborate",
                "enhanced_prompt": result["enhanced_prompt"],
                "original_prompt": result["original_prompt"],
                "image": img_b64,
                "provider": result.get("provider"),
                "attempts": result.get("attempts", []),
            })

        else:
            image_bytes, provider, attempts = await generate_image_with_fallback(
                prompt=request.prompt,
                model=request.model,
                negative_prompt=request.negative_prompt,
                width=request.width,
                height=request.height
            )
            headers = {"X-Image-Provider": provider, "X-Image-Attempts": str(len(attempts))}
            return Response(content=image_bytes, media_type="image/jpeg", headers=headers)

    except Exception as e:
        msg = str(e)
        err_type = classify_error(msg)
        code = 500
        if err_type == "auth":
            code = 401
        elif err_type == "quota":
            code = 429
        elif err_type in {"timeout", "model_unavailable", "upstream"}:
            code = 502
        return build_image_error(code, err_type, msg)

@router.post("/edit")
async def edit_image(
    file: UploadFile = File(...),
    prompt: str = Form(...),
    model: str = Form(default="flux_dev"),
    user: dict = Depends(verify_token)
):
    try:
        image_data = await file.read()
        edit_result = await gemini_edit_image(image_data, prompt)

        lines = edit_result.strip().split('\n')
        image_prompt = lines[-1].replace("PROMPT:", "").strip()
        if not image_prompt or len(image_prompt) < 10:
            image_prompt = prompt

        new_image, provider, attempts = await generate_image_with_fallback(image_prompt, model)
        img_b64 = base64.b64encode(new_image).decode()

        return JSONResponse({
            "original_prompt": prompt,
            "enhanced_prompt": image_prompt,
            "analysis": edit_result,
            "image_b64": img_b64,
            "provider": provider,
            "attempts": attempts,
        })

    except Exception as e:
        msg = str(e)
        err_type = classify_error(msg)
        code = 500
        if err_type == "auth":
            code = 401
        elif err_type == "quota":
            code = 429
        elif err_type in {"timeout", "model_unavailable", "upstream"}:
            code = 502
        return build_image_error(code, err_type, msg)

@router.get("/models")
async def get_models(user: dict = Depends(verify_token)):
    return {
        "models": [
            {"id": "flux_schnell", "name": "FLUX.1 Schnell (سريع)"},
            {"id": "flux_dev",     "name": "FLUX.1 Dev (جودة عالية)"},
            {"id": "sdxl",         "name": "Stable Diffusion XL"},
        ],
        "collaboration_modes": [
            {"id": "compete",     "name": "منافسة — كل نموذج يولد صورة"},
            {"id": "collaborate", "name": "تعاون — نتيجة واحدة محسّنة"},
        ],
        "providers": [
            {"id": "cloudflare", "name": "Cloudflare Workers AI (primary free tier)"},
            {"id": "huggingface", "name": "Hugging Face Inference"},
            {"id": "pollinations", "name": "Pollinations (experimental fallback)"},
        ],
    }


@router.get("/health")
async def image_health(user: dict = Depends(verify_token)):
    return get_image_health()


@router.get("/metrics")
async def image_metrics(user: dict = Depends(verify_token)):
    return get_image_metrics()