from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from auth import verify_token
from services.gemini import gemini_chat, get_gemini_models_list
from services.groq_service import groq_chat, get_groq_models_list
from services.search import duckduckgo_search, format_results_for_ai
from services.collaboration import collaborate_chat, collaborate_search

router = APIRouter()

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]
    model: str = "gemini_flash"
    use_search: bool = False
    system_prompt: Optional[str] = None
    collaboration_mode: Optional[str] = None
    collaboration_providers: Optional[List[str]] = None

SYSTEM_PROMPT_AR = """أنت مساعد ذكاء اصطناعي متقدم اسمه "دحمي" من منصة Dhme Studio.
- تتحدث العربية الفصحى واللهجة السعودية بطلاقة
- إجاباتك دقيقة ومفيدة وودودة
- تستخدم نتائج البحث إذا توفرت"""

@router.post("/")
async def chat(request: ChatRequest, user: dict = Depends(verify_token)):
    try:
        messages = [{"role": m.role, "content": m.content} for m in request.messages]
        system = request.system_prompt or SYSTEM_PROMPT_AR

        if request.use_search and messages:
            results = await duckduckgo_search(messages[-1]["content"])
            if results:
                system += f"\n\n{format_results_for_ai(results, messages[-1]['content'])}"

        if request.collaboration_mode in ("compete", "collaborate"):
            result = await collaborate_chat(
                messages=messages,
                mode=request.collaboration_mode,
                providers=request.collaboration_providers,
                system_prompt=system
            )
            return {**result, "user": user["username"]}

        model = request.model

        if model.startswith("gemini_"):
            gemini_model = model.replace("gemini_", "")
            response = await gemini_chat(messages, gemini_model, system)
        elif model.startswith("groq_"):
            groq_model = model.replace("groq_", "")
            response = await groq_chat(messages, groq_model, system)
        else:
            response = await gemini_chat(messages, "flash", system)

        return {"mode": "single", "response": response, "model": model, "user": user["username"]}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/login")
async def login_endpoint(invite_code: str, username: str):
    from auth import login
    return login(invite_code, username)

@router.get("/models")
async def get_models(user: dict = Depends(verify_token)):
    gemini_models = get_gemini_models_list()
    groq_models = get_groq_models_list()
    for m in gemini_models:
        m["id"] = f"gemini_{m['id']}"
    for m in groq_models:
        m["id"] = f"groq_{m['id']}"
    return {
        "models": gemini_models + groq_models,
        "collaboration_providers": [
            {"id": "gemini_flash", "name": "Gemini 2.0 Flash"},
            {"id": "gemini_pro", "name": "Gemini 1.5 Pro"},
            {"id": "groq_llama", "name": "Llama 3.3 70B"},
            {"id": "groq_mistral", "name": "Mistral Saba 24B"},
            {"id": "groq_deepseek", "name": "DeepSeek R1"},
        ]
    }