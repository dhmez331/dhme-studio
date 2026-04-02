from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from auth import verify_token
from services.gemini import gemini_chat, get_gemini_models_list
from services.groq_service import groq_chat, get_groq_models_list
from services.search import duckduckgo_search, format_results_for_ai
from services.collaboration import collaborate_chat, collaborate_search

router = APIRouter()

# ─── Models ──────────────────────────────────────────────
class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]
    model: str = "gemini_flash"
    use_search: bool = False
    system_prompt: Optional[str] = None
    # وضع التعاون
    collaboration_mode: Optional[str] = None  # None / "compete" / "collaborate"
    collaboration_providers: Optional[List[str]] = None

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
        system   = request.system_prompt or SYSTEM_PROMPT_AR

        # ─── وضع التعاون ──────────────────────────────────
        if request.collaboration_mode in ("compete", "collaborate"):

            # بحث إذا طُلب
            if request.use_search and messages:
                results = await duckduckgo_search(messages[-1]["content"])
                if results:
                    system += f"\n\n{format_results_for_ai(results, messages[-1]['content'])}"

            result = await collaborate_chat(
                messages=messages,
                mode=request.collaboration_mode,
                providers=request.collaboration_providers,
                system_prompt=system
            )
            return {**result, "user": user["username"]}

        # ─── بحث في الإنترنت ──────────────────────────────
        if request.use_search and messages:
            results = await duckduckgo_search(messages[-1]["content"])
            if results:
                system += f"\n\n{format_results_for_ai(results, messages[-1]['content'])}"

        # ─── نموذج واحد ───────────────────────────────────
        model = request.model

        # Gemini models
        if model.startswith("gemini_"):
            gemini_model = model.replace("gemini_", "")
            response = await gemini_chat(messages, gemini_model, system)

        # Groq models
        elif model.startswith("groq_"):
            groq_model = model.replace("groq_", "")
            response = await groq_chat(messages, groq_model, system)

        else:
            response = await gemini_chat(messages, "flash", system)

        return {
            "mode": "single",
            "response": response,
            "model": model,
            "user": user["username"]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ─── Search Endpoint ──────────────────────────────────────
@router.post("/search")
async def search_and_answer(
    query: str,
    messages: Optional[List[Message]] = None,
    user: dict = Depends(verify_token)
):
    try:
        msgs = [{"role": m.role, "content": m.content} for m in messages] if messages else None
        result = await collaborate_search(query, msgs)
        return {**result, "user": user["username"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ─── Login ────────────────────────────────────────────────
@router.post("/login")
async def login_endpoint(invite_code: str, username: str):
    from auth import login
    return login(invite_code, username)

# ─── Get All Models ───────────────────────────────────────
@router.get("/models")
async def get_models(user: dict = Depends(verify_token)):
    gemini_models = get_gemini_models_list()
    groq_models   = get_groq_models_list()

    # إضافة prefix للـ ID
    for m in gemini_models:
        m["id"] = f"gemini_{m['id']}"
    for m in groq_models:
        m["id"] = f"groq_{m['id']}"

    return {
        "models": gemini_models + groq_models,
        "collaboration_providers": [
            {"id": "gemini_flash",    "name": "Gemini 2.0 Flash"},
            {"id": "gemini_pro",      "name": "Gemini 1.5 Pro"},
            {"id": "gemini_thinking", "name": "Gemini Thinking"},
            {"id": "groq_llama",      "name": "Llama 3.3 70B"},
            {"id": "groq_mistral",    "name": "Mistral Saba 24B"},
            {"id": "groq_deepseek",   "name": "DeepSeek R1"},
            {"id": "groq_qwen",       "name": "Qwen QwQ 32B"},
        ]
    }