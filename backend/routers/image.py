from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import Response, JSONResponse
from pydantic import BaseModel
from typing import Optional
import base64
from auth import verify_token
from services.huggingface import generate_image
from services.collaboration import collaborate_image
from services.gemini import gemini_edit_image

router = APIRouter()

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
            return JSONResponse({
                "mode": "compete",
                "enhanced_prompt": result["enhanced_prompt"],
                "original_prompt": result["original_prompt"],
                "images": images_b64
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
                "image": img_b64
            })

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

        new_image = await generate_image(image_prompt, model)
        img_b64 = base64.b64encode(new_image).decode()

        return JSONResponse({
            "original_prompt": prompt,
            "enhanced_prompt": image_prompt,
            "analysis": edit_result,
            "image_b64": img_b64
        })

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