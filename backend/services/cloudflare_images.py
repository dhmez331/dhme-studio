import os
import httpx
from dotenv import load_dotenv

load_dotenv()

CF_ACCOUNT_ID = os.getenv("CLOUDFLARE_ACCOUNT_ID", "").strip()
CF_API_TOKEN = os.getenv("CLOUDFLARE_API_TOKEN", "").strip()

CF_MODELS = {
    "flux_schnell": "@cf/black-forest-labs/flux-1-schnell",
    "flux_dev": "@cf/black-forest-labs/flux-1-dev",
    "sdxl": "@cf/stabilityai/stable-diffusion-xl-base-1.0",
}


def cloudflare_is_configured() -> bool:
    return bool(CF_ACCOUNT_ID and CF_API_TOKEN)


async def generate_image_cloudflare(
    prompt: str,
    model: str = "flux_schnell",
    negative_prompt: str = "",
    width: int = 1024,
    height: int = 1024,
) -> bytes:
    if not cloudflare_is_configured():
        raise Exception("auth: Cloudflare API credentials are not configured")

    model_id = CF_MODELS.get(model, CF_MODELS["flux_schnell"])
    endpoint = (
        f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT_ID}"
        f"/ai/run/{model_id}"
    )
    headers = {
        "Authorization": f"Bearer {CF_API_TOKEN}",
        "Content-Type": "application/json",
    }
    payload = {
        "prompt": prompt,
        "negative_prompt": negative_prompt,
        "width": width,
        "height": height,
    }

    try:
        async with httpx.AsyncClient(timeout=70) as client:
            response = await client.post(endpoint, headers=headers, json=payload)
    except httpx.TimeoutException as exc:
        raise Exception("timeout: Cloudflare image request timed out") from exc
    except Exception as exc:
        raise Exception(f"upstream: Cloudflare request failed: {str(exc)}") from exc

    if response.status_code == 401 or response.status_code == 403:
        raise Exception("auth: Cloudflare token unauthorized")
    if response.status_code == 429:
        raise Exception("quota: Cloudflare rate limit reached")
    if response.status_code >= 500:
        raise Exception("upstream: Cloudflare internal service error")
    if response.status_code != 200:
        raise Exception(f"upstream: Cloudflare error ({response.status_code})")

    content_type = (response.headers.get("content-type") or "").lower()
    if "image/" in content_type:
        return response.content

    try:
        payload = response.json()
        if payload.get("success") is False:
            err = payload.get("errors") or [{"message": "unknown"}]
            msg = err[0].get("message", "unknown")
            raise Exception(f"upstream: Cloudflare rejected request: {msg}")
        result = payload.get("result") or {}
        image_b64 = result.get("image") or result.get("output")
        if image_b64 and isinstance(image_b64, str):
            import base64
            return base64.b64decode(image_b64)
    except Exception as exc:
        raise Exception(f"upstream: Cloudflare returned unexpected payload: {str(exc)}") from exc

    raise Exception("upstream: Cloudflare returned no image data")
