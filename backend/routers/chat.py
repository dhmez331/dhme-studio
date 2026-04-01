from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
from auth import verify_token
from services.gemini import gemini_chat
from services.groq_service import groq_chat
from services.search import duckduckgo_search, format_results_for_ai
import json

router = APIRouter()

# ─── Models ──────────────────────────────────────────────
class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]
    model: str = "gemini"
    use_search: bool = False
    system_prompt: Optional[str] = None

SYSTEM_PROMPT_AR = """أنت مساعد ذكاء اصطناعي متقدم اسمه "دحمي" من منصة Dhme Studio.
- تتحدث العربية الفصحى واللهجة السعودية بطلاقة
- إجاباتك دقيقة ومفيدة وودودة
- تستخدم نتائج البحث إذا توفرت
- تتعامل مع المستخدم باحترام وتقدير"""

# ─── Chat Endpoint ────────────────────────────────────────
@router.post("/")
async def chat(request: ChatRequest, user: dict = Depends(verify_token)):
    try:
        messages = [{"role": m.role, "content": m.content} for m in request.messages]
        system  = request.system_prompt or SYSTEM_PROMPT_AR

        # بحث في الإنترنت إذا طُلب
        if request.use_search and messages:
            last_msg = messages[-1]["content"]
            results  = await duckduckgo_search(last_msg)
            if results:
                search_context = format_results_for_ai(results, last_msg)
                system += f"\n\n{search_context}"

        # اختيار النموذج
        if request.model == "gemini":
            response = await gemini_chat(messages, system_prompt=system)
        else:
            response = await groq_chat(messages, model=request.model, system_prompt=system)

        return {
            "response": response,
            "model": request.model,
            "user": user["username"]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ─── Get Available Models ──────────────────────────────────
@router.get("/models")
async def get_models(user: dict = Depends(verify_token)):
    return {
        "models": [
            {"id": "gemini",    "name": "Gemini 2.0 Flash",  "provider": "Google"},
            {"id": "llama",     "name": "Llama 3.3 70B",     "provider": "Groq"},
            {"id": "deepseek",  "name": "DeepSeek R1",       "provider": "Groq"},
            {"id": "qwen",      "name": "Qwen QwQ 32B",      "provider": "Groq"},
            {"id": "gemma",     "name": "Gemma 2 9B",        "provider": "Groq"},
        ]
    }

# ─── Login Endpoint ───────────────────────────────────────
@router.post("/login")
async def login_endpoint(invite_code: str, username: str):
    from auth import login
    return login(invite_code, username)