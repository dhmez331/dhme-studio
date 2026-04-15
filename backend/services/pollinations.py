import httpx
from urllib.parse import quote


async def generate_image_pollinations(
    prompt: str,
    model: str = "flux_schnell",
    negative_prompt: str = "",
    width: int = 1024,
    height: int = 1024,
) -> bytes:
    encoded_prompt = quote(prompt)
    params = f"width={width}&height={height}&nologo=true&safe=true"
    if negative_prompt:
        params += f"&negative={quote(negative_prompt)}"
    url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?{params}"

    try:
        async with httpx.AsyncClient(timeout=70) as client:
            response = await client.get(url)
    except httpx.TimeoutException as exc:
        raise Exception("timeout: Pollinations request timed out") from exc
    except Exception as exc:
        raise Exception(f"upstream: Pollinations request failed: {str(exc)}") from exc

    if response.status_code == 429:
        raise Exception("quota: Pollinations rate limit reached")
    if response.status_code >= 500:
        raise Exception("upstream: Pollinations internal service error")
    if response.status_code != 200:
        raise Exception(f"upstream: Pollinations error ({response.status_code})")

    return response.content
