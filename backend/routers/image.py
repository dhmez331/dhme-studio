from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response, JSONResponse
from pydantic import BaseModel
from typing import Optional, List
import base64
from auth import verify_token
from services.huggingface import generate_image
from services.collaboration import collaborate_image

router = APIRouter()

class ImageRequest(BaseModel):
    prompt: str
    model: str = "flux_schnell"
    negative_prompt: str = ""
    width: int = 1024
    height: int = 1024
    # وضع التعاون
    collaboration_mode: Optional[str] = None  # None / "compete" / "collaborate"
    enhance_prompt: bool = True

@router.post("/generate")
async def generate(request: ImageRequest, user: dict = Depends(verify_token)):
    try:
        # ─── وضع المنافسة — كل نموذج يولد صورته ──────────
        if request.collaboration_mode == "compete":
            result = await collaborate_image(
                prompt=request.prompt,
                mode="compete",
                enhance_prompt=request.enhance_prompt
            )

            # تحويل الصور لـ base64
            images_b64 = {}
            for model_name, img_bytes in result["images"].items():
                if img_bytes:
                    images_b64[model_name] = base64.b64encode(img_bytes).decode()

            return JSONResponse({
                "mode": "compete",
                "enhanced_prompt": result["enhanced_prompt"],
                "original_prompt": result["original_prompt"],
                "images": images_b64
            })

        # ─── وضع التعاون — برومبت محسّن + صورة واحدة ─────
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
                "image": img_b64
            })

        # ─── نموذج واحد ───────────────────────────────────
        else:
            image_bytes = await generate_image(
                prompt=request.prompt,
                model=request.model,
                negative_prompt=request.negative_prompt,
                width=request.width,
                height=request.height
            )
            return Response(content=image_bytes, media_type="image/jpeg")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
        ]
    }