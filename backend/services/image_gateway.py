from datetime import datetime, timezone
from typing import Dict, List, Tuple
import logging
import time

from services.cloudflare_images import generate_image_cloudflare, cloudflare_is_configured
from services.huggingface import generate_image as generate_image_hf, huggingface_is_configured
from services.pollinations import generate_image_pollinations


IMAGE_PROVIDER_PRIORITY = ["cloudflare", "huggingface", "pollinations"]
logger = logging.getLogger("image_gateway")

_METRICS = {
    "total_requests": 0,
    "successful_requests": 0,
    "failed_requests": 0,
    "avg_latency_ms": 0.0,
    "last_latency_ms": 0.0,
    "provider_attempts": {"cloudflare": 0, "huggingface": 0, "pollinations": 0},
    "provider_success": {"cloudflare": 0, "huggingface": 0, "pollinations": 0},
    "provider_failures": {"cloudflare": 0, "huggingface": 0, "pollinations": 0},
    "error_types": {"auth": 0, "quota": 0, "model_unavailable": 0, "timeout": 0, "upstream": 0},
    "last_error": None,
}


def classify_error(message: str) -> str:
    msg = (message or "").lower()
    if "auth:" in msg or "unauthorized" in msg or "forbidden" in msg:
        return "auth"
    if "quota:" in msg or "rate limit" in msg or "429" in msg:
        return "quota"
    if "timeout:" in msg or "timed out" in msg:
        return "timeout"
    if "model" in msg and ("not found" in msg or "unavailable" in msg or "loading" in msg):
        return "model_unavailable"
    return "upstream"


def _record_failure(provider: str, err_msg: str) -> None:
    _METRICS["provider_failures"][provider] += 1
    error_type = classify_error(err_msg)
    _METRICS["error_types"][error_type] += 1
    _METRICS["last_error"] = {
        "provider": provider,
        "type": error_type,
        "message": err_msg,
        "at": datetime.now(timezone.utc).isoformat(),
    }


def _record_attempt(provider: str) -> None:
    _METRICS["provider_attempts"][provider] += 1


def _record_success(provider: str) -> None:
    _METRICS["provider_success"][provider] += 1


def get_image_metrics() -> Dict:
    return _METRICS


def get_image_health() -> Dict:
    cloudflare_ok = cloudflare_is_configured()
    huggingface_ok = huggingface_is_configured()
    status = "ok" if (cloudflare_ok or huggingface_ok) else "degraded"
    return {
        "status": status,
        "providers": {
            "cloudflare": {
                "configured": cloudflare_ok,
                "priority": 1,
            },
            "huggingface": {
                "configured": huggingface_ok,
                "priority": 2,
            },
            "pollinations": {
                "configured": True,
                "priority": 3,
                "experimental": True,
            },
        },
        "metrics": get_image_metrics(),
    }


async def generate_image_with_provider(
    provider: str,
    prompt: str,
    model: str,
    negative_prompt: str,
    width: int,
    height: int,
) -> bytes:
    if provider == "cloudflare":
        return await generate_image_cloudflare(prompt, model, negative_prompt, width, height)
    if provider == "huggingface":
        return await generate_image_hf(prompt, model, negative_prompt, width, height)
    if provider == "pollinations":
        return await generate_image_pollinations(prompt, model, negative_prompt, width, height)
    raise Exception(f"upstream: unknown image provider: {provider}")


async def generate_image_with_fallback(
    prompt: str,
    model: str = "flux_schnell",
    negative_prompt: str = "",
    width: int = 1024,
    height: int = 1024,
    providers: List[str] = None,
) -> Tuple[bytes, str, List[Dict]]:
    _METRICS["total_requests"] += 1
    started = time.perf_counter()
    provider_chain = providers or IMAGE_PROVIDER_PRIORITY
    attempts: List[Dict] = []

    for provider in provider_chain:
        _record_attempt(provider)
        try:
            image_bytes = await generate_image_with_provider(
                provider=provider,
                prompt=prompt,
                model=model,
                negative_prompt=negative_prompt,
                width=width,
                height=height,
            )
            _record_success(provider)
            attempts.append({"provider": provider, "ok": True})
            elapsed_ms = (time.perf_counter() - started) * 1000
            _METRICS["successful_requests"] += 1
            _METRICS["last_latency_ms"] = round(elapsed_ms, 2)
            success_count = max(_METRICS["successful_requests"], 1)
            _METRICS["avg_latency_ms"] = round(
                ((_METRICS["avg_latency_ms"] * (success_count - 1)) + elapsed_ms) / success_count,
                2,
            )
            logger.info(
                "Image generated successfully via %s in %.2fms (attempts=%s)",
                provider,
                elapsed_ms,
                len(attempts),
            )
            return image_bytes, provider, attempts
        except Exception as exc:
            msg = str(exc)
            _record_failure(provider, msg)
            logger.warning("Image provider %s failed: %s", provider, msg)
            attempts.append(
                {
                    "provider": provider,
                    "ok": False,
                    "type": classify_error(msg),
                    "error": msg,
                }
            )

    summary = "; ".join([f"{a['provider']}={a.get('type', 'error')}" for a in attempts if not a["ok"]])
    _METRICS["failed_requests"] += 1
    _METRICS["last_latency_ms"] = round((time.perf_counter() - started) * 1000, 2)
    logger.error("All image providers failed: %s", summary)
    raise Exception(f"upstream: all image providers failed ({summary})")
