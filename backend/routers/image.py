from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Optional
from auth import verify_token
from services.huggingface import generate_image

router = APIRouter()

class ImageRequest(BaseModel):
    prompt: str
    model: str = "flux_schnell"
    negative_prompt: str = ""
    width: int = 1024
    height: int = 1024

@router.post("/generate")
async def generate(request: ImageRequest, user: dict = Depends(verify_token)):
    try:
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
        ]
    }