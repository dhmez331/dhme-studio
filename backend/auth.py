from fastapi import HTTPException, Header
from pydantic import BaseModel
import os
import hashlib
import time

# ─── Models ──────────────────────────────────────────────
class LoginRequest(BaseModel):
    invite_code: str
    username: str

class TokenData(BaseModel):
    username: str
    is_admin: bool
    token: str

# ─── Simple Token Store (في الذاكرة — مؤقت) ─────────────
# لاحقاً نحوّله لـ Supabase
active_tokens: dict = {}

# ─── Invite Codes ────────────────────────────────────────
def get_valid_codes() -> dict:
    """
    كودات الدعوة — Admin يعدّلها من .env
    Format: CODE:username:is_admin
    """
    admin_code = (os.getenv("ADMIN_INVITE_CODE") or "dhme_admin_2026").strip()
    fallback_admin_code = "dhme_admin_2026"
    
    # كودات ثابتة للعائلة والأصدقاء — تُضاف هنا
    codes = {
        admin_code: {"username": "admin", "is_admin": True},
        fallback_admin_code: {"username": "admin", "is_admin": True},
        "dhme_family_001": {"username": "family1", "is_admin": False},
        "dhme_family_002": {"username": "family2", "is_admin": False},
        "dhme_friend_001": {"username": "friend1", "is_admin": False},
        "dhme_friend_002": {"username": "friend2", "is_admin": False},
    }
    # توحيد شكل الكود لتجنب مشاكل case/spacing
    return {k.strip().lower(): v for k, v in codes.items() if k and k.strip()}

# ─── Login ───────────────────────────────────────────────
def login(invite_code: str, username: str) -> TokenData:
    invite_code = (invite_code or "").strip().lower()
    username = (username or "").strip()

    if not username:
        raise HTTPException(status_code=400, detail="اسم المستخدم مطلوب")
    if not invite_code:
        raise HTTPException(status_code=400, detail="كود الدعوة مطلوب")

    codes = get_valid_codes()
    
    if invite_code not in codes:
        raise HTTPException(status_code=401, detail="كود الدعوة غير صحيح")
    
    user_data = codes[invite_code]
    
    # توليد token بسيط
    raw = f"{invite_code}:{username}:{time.time()}"
    token = hashlib.sha256(raw.encode()).hexdigest()
    
    # حفظ الـ token
    active_tokens[token] = {
        "username": username,
        "is_admin": user_data["is_admin"],
        "created_at": time.time()
    }
    
    return TokenData(
        username=username,
        is_admin=user_data["is_admin"],
        token=token
    )

# ─── Verify Token ────────────────────────────────────────
def verify_token(authorization: str = Header(None)) -> dict:
    if not authorization:
        raise HTTPException(status_code=401, detail="مطلوب تسجيل الدخول")
    
    token = authorization.replace("Bearer ", "").strip()
    
    if token not in active_tokens:
        raise HTTPException(status_code=401, detail="الجلسة منتهية — سجّل دخولك مجدداً")
    
    user = active_tokens[token]
    
    # Token يصلح 24 ساعة
    if time.time() - user["created_at"] > 86400:
        del active_tokens[token]
        raise HTTPException(status_code=401, detail="انتهت صلاحية الجلسة")
    
    return user

def require_admin(user: dict = None) -> dict:
    if not user or not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="هذه الميزة للمدير فقط")
    return user