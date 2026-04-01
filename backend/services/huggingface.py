import httpx
import os
from dotenv import load_dotenv

load_dotenv()

HF_TOKEN = os.getenv("HUGGINGFACE_TOKEN")
BASE_URL  = "https://api-inference.huggingface.co/models"

HEADERS = {"Authorization": f"Bearer {HF_TOKEN}"}

# ─── Image Generation Models ──────────────────────────────
IMAGE_MODELS = {
    "flux_schnell": "black-forest-labs/FLUX.1-schnell",
    "flux_dev":     "black-forest-labs/FLUX.1-dev",
    "sdxl":         "stabilityai/stable-diffusion-xl-base-1.0",
}

# ─── Generate Image ───────────────────────────────────────
async def generate_image(
    prompt: str,
    model: str = "flux_schnell",
    negative_prompt: str = "",
    width: int = 1024,
    height: int = 1024
) -> bytes:
    try:
        model_id = IMAGE_MODELS.get(model, IMAGE_MODELS["flux_schnell"])
        
        payload = {
            "inputs": prompt,
            "parameters": {
                "negative_prompt": negative_prompt,
                "width": width,
                "height": height,
            }
        }
        
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                f"{BASE_URL}/{model_id}",
                headers=HEADERS,
                json=payload
            )
            
            if response.status_code != 200:
                raise Exception(f"HuggingFace error: {response.text[:200]}")
            
            return response.content

    except Exception as e:
        raise Exception(f"Image generation error: {str(e)}")