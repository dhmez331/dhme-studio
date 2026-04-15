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


def huggingface_is_configured() -> bool:
    return bool(HF_TOKEN and HF_TOKEN.strip())

# ─── Generate Image ───────────────────────────────────────
async def generate_image(
    prompt: str,
    model: str = "flux_schnell",
    negative_prompt: str = "",
    width: int = 1024,
    height: int = 1024
) -> bytes:
    try:
        if not huggingface_is_configured():
            raise Exception("auth: HUGGINGFACE_TOKEN is missing")

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
            
            if response.status_code == 401 or response.status_code == 403:
                raise Exception("auth: HuggingFace token unauthorized")
            if response.status_code == 429:
                raise Exception("quota: HuggingFace rate limit reached")
            if response.status_code == 503:
                raise Exception("model_unavailable: HuggingFace model loading/unavailable")
            if response.status_code >= 500:
                raise Exception("upstream: HuggingFace internal service error")
            if response.status_code != 200:
                raise Exception(f"upstream: HuggingFace error ({response.status_code})")
            
            return response.content

    except httpx.TimeoutException as e:
        raise Exception("timeout: HuggingFace request timed out") from e
    except Exception as e:
        raise Exception(str(e))