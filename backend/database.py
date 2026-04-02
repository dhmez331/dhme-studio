import os
from dotenv import load_dotenv

load_dotenv()

# ─── Supabase Setup ──────────────────────────────────────
# سنفعّله بعد ما تنشئ Supabase project
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

supabase_client = None

def get_db():
    """Get Supabase client — يُفعَّل بعد إنشاء المشروع"""
    global supabase_client
    
    if not SUPABASE_URL or not SUPABASE_KEY:
        return None  # نشتغل بدون DB في البداية
    
    if supabase_client is None:
        try:
            from supabase import create_client
            supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
        except Exception as e:
            print(f"Supabase connection failed: {e}")
            return None
    
    return supabase_client

# ─── Helper Functions ────────────────────────────────────
def save_conversation(user_id: str, messages: list, tool: str = "chat"):
    db = get_db()
    if not db:
        return None
    
    try:
        result = db.table("conversations").insert({
            "user_id": user_id,
            "messages": messages,
            "tool": tool
        }).execute()
        return result.data
    except Exception as e:
        print(f"Save conversation error: {e}")
        return None

def get_conversations(user_id: str, limit: int = 20):
    db = get_db()
    if not db:
        return []
    
    try:
        result = db.table("conversations")\
            .select("*")\
            .eq("user_id", user_id)\
            .order("created_at", desc=True)\
            .limit(limit)\
            .execute()
        return result.data
    except Exception as e:
        print(f"Get conversations error:- {e}")
        return []

