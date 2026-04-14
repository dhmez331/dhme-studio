# Dhme Studio — Cursor Project Context
> نسخة شاملة لربط المشروع مع Cursor AI

---

## 🎯 ما هو هذا المشروع؟

**Dhme Studio (دحمي استوديو)** — منصة ذكاء اصطناعي شخصية مجانية 100%، تجمع أفضل أدوات الذكاء الاصطناعي المجانية في واجهة واحدة. المنصة مخصصة للمطور وعائلته وأصدقائه (5-20 مستخدم)، بدون حد شهري، كل الـ APIs متاحة من السعودية.

---

## 🏗️ الهيكل التقني الكامل

```
dhme-studio/
├── frontend/                    ← Vercel (HTML/CSS/JS Vanilla)
│   ├── index.html               ← SPA كاملة
│   ├── css/
│   │   ├── main.css             ← CSS variables + 5 styles × dark/light
│   │   ├── components.css       ← buttons, cards, sidebar, toast, modal
│   │   └── pages.css            ← كل صفحة بتصميمها
│   └── js/
│       ├── app.js               ← State + Navigation + API calls + Admin
│       ├── ui.js                ← Themes + Language + Toast + Modal
│       ├── chat.js              ← المحادثة + compete/collaborate modes
│       ├── image.js             ← توليد صور + compete/collaborate
│       ├── voice.js             ← TTS + شيلات + إعلانات + تفريغ صوتي
│       ├── video.js             ← placeholder (coming soon)
│       ├── analyze.js           ← تحليل ملفات (صور، PDF، صوت، فيديو)
│       ├── prompts.js           ← مكتبة برومبتات (built-in + custom)
│       └── history.js           ← سجل + مفضلة + فلتر
│
└── backend/                     ← Render.com (Python 3.11.9 + FastAPI)
    ├── main.py                  ← FastAPI app + CORS + routers
    ├── auth.py                  ← Invite code auth + token system
    ├── database.py              ← Supabase client (معطل حالياً)
    ├── runtime.txt              ← python-3.11.9
    ├── render.yaml              ← Render deployment config
    ├── requirements.txt
    ├── routers/
    │   ├── chat.py              ← POST /api/chat/
    │   ├── image.py             ← POST /api/image/generate + /edit
    │   ├── voice.py             ← POST /api/voice/tts + /transcribe + /lyrics + /commercial
    │   ├── video.py             ← POST /api/video/generate (coming soon)
    │   └── analyze.py          ← POST /api/analyze/
    └── services/
        ├── gemini.py            ← Gemini API (chat + image analysis + fallback to Groq)
        ├── groq_service.py      ← Groq API (chat + transcription)
        ├── huggingface.py       ← FLUX + SDXL image generation
        ├── elevenlabs.py        ← Edge TTS (Microsoft) — بديل ElevenLabs
        ├── suno.py              ← شيلات + إعلانات (يستخدم Groq + Edge TTS)
        ├── search.py            ← DuckDuckGo search (مجاني 100%)
        └── collaboration.py     ← compete/collaborate modes logic
```

---

## 🔗 الروابط الحية

| الخدمة | الرابط |
|--------|--------|
| Frontend (Vercel) | https://dhme-studio.vercel.app |
| Backend (Render) | https://dhme-studio-api1.onrender.com |
| API Docs (Swagger) | https://dhme-studio-api1.onrender.com/docs |
| GitHub | https://github.com/dhmez331/dhme-studio |

---

## ⚙️ Environment Variables (backend/.env)

```env
GEMINI_API_KEY=your_gemini_key
GROQ_API_KEY=your_groq_key
HUGGINGFACE_TOKEN=your_hf_token
APP_SECRET=dhme_studio_secret_2026
ADMIN_INVITE_CODE=dhme_admin_2026
ALLOWED_ORIGINS=*
# معطل حالياً:
SUPABASE_URL=
SUPABASE_KEY=
```

> ⚠️ المفاتيح محفوظة كـ Secret في Render — لا تُرفع على GitHub أبداً
> ⚠️ `backend/.env` موجود في `.gitignore`

---

## 🤖 النماذج المستخدمة

### Groq (الأساسي — يعمل دائماً)
```python
GROQ_MODELS = {
    "llama":      "llama-3.3-70b-versatile",
    "llama_fast": "llama-3.1-8b-instant",
    "llama4":     "meta-llama/llama-4-scout-17b-16e-instruct",
    "gemma":      "gemma2-9b-it",
    "deepseek":   "deepseek-r1-distill-llama-70b",
    "qwen":       "qwen-qwq-32b",          # ممتاز في العربي
    "compound":   "compound-beta",
    "whisper":    "whisper-large-v3",       # transcription
    "whisper_turbo": "whisper-large-v3-turbo",
}
# ⚠️ mistral-saba-24b محذوف رسمياً — لا تستخدمه
```

### Gemini (ثانوي — مع fallback تلقائي لـ Groq عند quota)
```python
GEMINI_MODELS = {
    "flash":      "gemini-2.0-flash",
    "pro":        "gemini-1.5-pro",
    "thinking":   "gemini-2.0-flash-thinking-exp-01-21",
    "flash_8b":   "gemini-1.5-flash-8b",
    "flash_lite": "gemini-2.0-flash-lite",
}
# ⚠️ عند 429 quota error → fallback تلقائي لـ groq/llama
```

### HuggingFace (توليد صور)
```python
IMAGE_MODELS = {
    "flux_schnell": "black-forest-labs/FLUX.1-schnell",
    "flux_dev":     "black-forest-labs/FLUX.1-dev",
    "sdxl":         "stabilityai/stable-diffusion-xl-base-1.0",
}
# ⚠️ imagen_generate غير موجودة — لا تستدعيها
```

### Edge TTS (Microsoft) — بديل ElevenLabs
```python
VOICES = {
    "arabic_male":   "ar-SA-HamedNeural",
    "arabic_female": "ar-SA-ZariyahNeural",
    "english_male":  "en-US-GuyNeural",
    "english_female":"en-US-JennyNeural",
    "arabic_news":   "ar-EG-ShakirNeural",
    "commercial":    "ar-SA-HamedNeural",
}
# ElevenLabs معطل — الحساب محظور بسبب VPN detection
# البديل: edge-tts (pip install edge-tts) — مجاني تماماً
```

---

## 🔑 نظام الدخول

- **نوع الدخول:** Invite Code (كود دعوة)
- **كود الإدارة:** `dhme_admin_2026`
- **كودات العائلة:** `dhme_family_001`, `dhme_family_002`
- **كودات الأصدقاء:** `dhme_friend_001`, `dhme_friend_002`
- Token يصلح 24 ساعة، محفوظ في memory (dict) — يُفقد عند restart
- كودات إضافية تُضاف من Admin Panel وتُحفظ في localStorage

---

## 🎨 نظام التصميم

### 5 أساليب × dark/light = 10 ثيمات
```css
[data-style="cosmic"][data-theme="dark"]  /* بنفسجي + أزرق غامق — الافتراضي */
[data-style="cosmic"][data-theme="light"]
[data-style="desert"][data-theme="dark"]  /* ذهبي + بني */
[data-style="desert"][data-theme="light"]
[data-style="neon"][data-theme="dark"]    /* أخضر نيون */
[data-style="neon"][data-theme="light"]
[data-style="ocean"][data-theme="dark"]   /* أزرق بحري */
[data-style="ocean"][data-theme="light"]
[data-style="rose"][data-theme="dark"]    /* وردي */
[data-style="rose"][data-theme="light"]
```

### CSS Variables الأساسية (كل ثيم يعرّفها)
```css
--bg-primary, --bg-secondary, --bg-card, --bg-hover, --bg-input
--accent-1, --accent-2, --accent-grad, --accent-glow
--text-primary, --text-secondary, --text-muted
--border, --border-hover, --sidebar-bg
--radius, --radius-sm, --radius-lg
--font-ar (Tajawal), --font-en (Syne), --font-mono (JetBrains Mono)
```

---

## 🤝 نظام التعاون بين النماذج

### وضع المنافسة (compete)
```
المستخدم يكتب → 3 نماذج يردوا بالتوازي → تُعرض النتائج جنباً لجنب
```

### وضع التعاون (collaborate)
```
نموذج 1 يكتب → نموذج 2 يكتب → Gemini يدمج الردود في إجابة واحدة
للصور: Gemini يحسّن البرومبت → FLUX يولد الصورة النهائية
```

---

## 📡 API Endpoints الكاملة

```
POST /api/chat/              محادثة (يدعم: model, use_search, collaboration_mode)
POST /api/chat/login         تسجيل الدخول (invite_code, username)
GET  /api/chat/models        قائمة النماذج

POST /api/image/generate     توليد صورة (عادي / compete / collaborate)
POST /api/image/edit         تعديل صورة مرفوعة
GET  /api/image/models

POST /api/voice/tts          نص → صوت (Edge TTS)
POST /api/voice/transcribe   صوت → نص (Groq Whisper)
POST /api/voice/lyrics       توليد شيلة/قصيدة/نشيد
POST /api/voice/commercial   توليد إعلان صوتي
GET  /api/voice/voices
GET  /api/voice/styles

POST /api/video/generate     (coming soon — يرجع coming_soon status)
POST /api/video/from-image   تحليل صورة + توليد صورة معدلة

POST /api/analyze/           تحليل ملف (صورة/PDF/صوت/فيديو/نص)
GET  /api/analyze/supported-types

GET  /                       {"status": "online"}
GET  /health                 {"status": "healthy"}
```

---

## 🚨 المشاكل الحالية التي تحتاج إصلاح

### 1. 🔴 Gemini — Quota Exceeded
**المشكلة:** كل النماذج Gemini تفشل بـ 429 quota error، limit = 0
**السبب:** API key القديم استهلك حصته أو مربوط بمشروع quota=0
**الحل المطلوب:**
- إنشاء Google Cloud project جديد
- إنشاء Gemini API key جديد
- تحديث `GEMINI_API_KEY` في Render environment variables
- التأكد من أن الـ fallback في `gemini.py` يعمل (عند 429 → Groq تلقائياً)

---

### 2. 🔴 Image Generation — Import Error
**المشكلة:** `cannot import name 'imagen_generate' from 'services.gemini'`
**السبب:** `collaboration.py` يستدعي `imagen_generate` لكنها غير موجودة في `gemini.py`
**الملف المسبب:** `backend/services/collaboration.py` السطر:
```python
from services.gemini import imagen_generate, gemini_chat  # ← imagen_generate غير موجودة
```
**الحل:** احذف `imagen_generate` من الـ import في `collaboration.py`

---

### 3. 🔴 Voice (TTS / Lyrics / Commercial) — معطل
**المشكلة:** ElevenLabs API محظور (unusual activity / VPN detection)
**الحل المطبّق فعلاً:** تم استبدال `elevenlabs.py` بـ Edge TTS
**لكن يجب التحقق:**
- هل `requirements.txt` يحتوي `edge-tts==6.1.9`؟ ✅ (موجود)
- هل `elevenlabs.py` يستخدم `edge_tts` فعلاً؟ ✅ (تم التعديل)
- **قد يكون المشكلة:** Render لم يعيد deploy بعد التعديل — تحقق من آخر deploy

---

### 4. 🔴 File Analysis — Gemini Quota
**المشكلة:** نفس مشكلة Gemini (quota)
**الحل:** بعد تجديد Gemini API key ستعمل تلقائياً
**للتحليل بدون Gemini:** أضف fallback في `analyze.py` يستخدم Groq للنصوص

---

### 5. 🟡 Groq Mistral — Decommissioned
**المشكلة:** `mistral-saba-24b` تم إيقافه رسمياً
**الحل:** احذفه من كل مكان واستبدله بـ `qwen` في وضع collaboration
**الملفات المتأثرة:**
- `backend/services/groq_service.py` — احذف mistral من GROQ_MODELS
- `backend/services/collaboration.py` — استبدل `groq_mistral` بـ `groq_qwen`
- `backend/routers/chat.py` — استبدل في collaboration_providers
- `frontend/index.html` — محدود بالـ dropdown (ما فيه mistral موجود)

---

### 6. 🟡 Frontend — Prompts لا تعمل
**المشكلة:** زر "نسخ" و"استخدام" في البرومبتات لا يعمل
**السبب:** الأزرار كانت تُبنى بـ template literals مع onclick مباشر يحتوي backticks مشكلة
**الحل المطبّق:** إعادة بناء الكروت بـ DOM API (createElement) — تحقق من `prompts.js`

---

### 7. 🟡 Frontend — Logo لا يتحدث في الـ Sidebar
**المشكلة:** عند رفع لوقو جديد من Admin Panel، الـ sidebar لا يتحدث
**السبب:** الكود يبحث عن `div[style*="font-size:1.6rem"]` الذي قد لا يكون موجوداً
**الحل:** في `app.js` → دالة `showApp()` تقرأ اللوقو من localStorage وتحدث العناصر

---

### 8. 🟡 Frontend — ترجمة ناقصة
**المشكلة:** عند تغيير اللغة لـ English، بعض النصوص تبقى عربية
**الأماكن الناقصة في `ui.js`:**
- عناوين الصفحات (page titles)
- نصوص الـ tool cards في الصفحة الرئيسية
- نصوص الأزرار في كل الأدوات
- رسائل الـ toast

---

### 9. 🟢 Video — غير مطبق
**الحالة:** يرجع `{"status": "coming_soon"}` فقط
**المطلوب مستقبلاً:** دمج نماذج فيديو من HuggingFace

---

## 📦 requirements.txt الكامل

```
fastapi==0.115.0
uvicorn[standard]==0.30.6
python-dotenv==1.0.1
httpx==0.27.2
python-multipart==0.0.12
groq==0.11.0
google-generativeai==0.8.3
pydantic==2.10.6
pydantic-settings==2.7.0
Pillow==11.1.0
aiofiles==24.1.0
supabase==2.10.0
edge-tts==6.1.9
```

---

## 🔧 Frontend — كيف يعمل الـ State

```javascript
// app.js
App.state = {
    token:       null,        // Bearer token (from login)
    username:    null,
    isAdmin:     false,
    currentPage: 'home',
    apiBase:     'https://dhme-studio-api1.onrender.com',
}

// محفوظ في localStorage:
// dhme_token, dhme_username, dhme_is_admin
// dhme_style, dhme_theme, dhme_lang
// dhme_logo (base64 — من Admin)
// dhme_history (array — السجل)
// dhme_prompts (array — البرومبتات المخصصة)
// dhme_invite_codes (array — كودات إضافية)
```

---

## 🔧 Frontend — كيف تُرسل الـ API Calls

```javascript
// طلب JSON عادي:
const data = await App.apiJSON('/api/chat/', { messages, model });

// طلب يرجع blob (صورة/صوت):
const blob = await App.apiBlob('/api/image/generate', { prompt, model });

// طلب FormData (رفع ملف):
const data = await App.apiForm('/api/analyze/', formData);
```

---

## 🛡️ Auth Flow

```
المستخدم يدخل username + invite_code
→ POST /api/chat/login?invite_code=...&username=...
→ السيرفر يتحقق من الكود
→ يرجع { token, username, is_admin }
→ يُحفظ في localStorage
→ كل طلب بعدها يحمل: Authorization: Bearer <token>
→ السيرفر يتحقق من الـ token في كل endpoint
```

---

## ⚠️ نقاط مهمة يجب معرفتها

1. **Render Free Tier ينام بعد 15 دقيقة** من عدم الاستخدام → أول طلب يأخذ 30-60 ثانية (cold start)

2. **Tokens تُفقد عند restart** لأنها محفوظة في dict في الذاكرة — المستخدمون يحتاجون إعادة تسجيل دخول بعد كل sleep

3. **HuggingFace Cold Start** — نماذج الصور قد ترجع 503 أول مرة → أعد المحاولة بعد دقيقة

4. **لا ترفع .env على GitHub** — السر محفوظ في Render فقط

5. **Python version = 3.11.9** — لا تغيرها، Pillow و pydantic تنكسر مع 3.14

6. **apiBase في app.js** = `https://dhme-studio-api1.onrender.com` — تحديثه إذا غيرت اسم الـ service

7. **mistral-saba-24b محذوف** — لا تستخدمه في أي مكان

8. **imagen_generate غير موجودة** في gemini.py — لا تستدعيها

9. **ElevenLabs محظور** — استخدم edge-tts فقط

---

## ✅ أولويات الإصلاح بالترتيب

### الأولوية 1 — أعطال مكسّرة (يجب إصلاحها الآن)

| # | الملف | التغيير |
|---|-------|---------|
| 1 | `backend/services/collaboration.py` | احذف `imagen_generate` من الـ import |
| 2 | `backend/services/groq_service.py` | احذف `mistral`, أضف/تأكد `qwen` |
| 3 | `backend/services/collaboration.py` | استبدل `groq_mistral` بـ `groq_qwen` |
| 4 | `backend/routers/chat.py` | استبدل mistral بـ qwen في collaboration_providers |
| 5 | Render Dashboard | جدد `GEMINI_API_KEY` بـ key جديد |

### الأولوية 2 — إصلاحات Frontend

| # | الملف | التغيير |
|---|-------|---------|
| 6 | `frontend/js/ui.js` | أكمل ترجمة كل النصوص لـ English |
| 7 | `frontend/js/app.js` | تأكد أن لوقو الـ sidebar يتحدث من localStorage |
| 8 | `frontend/js/prompts.js` | تأكد أن DOM-based buttons تعمل |

### الأولوية 3 — تحسينات مستقبلية

| # | المهمة |
|---|--------|
| 9 | ربط Supabase لحفظ الـ tokens والمحادثات |
| 10 | إضافة توليد فيديو حقيقي عبر HuggingFace |
| 11 | ذاكرة المحادثة بين الجلسات |
| 12 | PWA manifest.json + Service Worker |
| 13 | Admin Dashboard بإحصائيات حقيقية من Supabase |

---

## 📝 ملخص الـ Services وما تفعله

| Service | ملف | تعتمد على | حالة |
|---------|-----|-----------|------|
| Chat | `routers/chat.py` | gemini.py + groq_service.py + search.py | ✅ يعمل (llama فقط حالياً) |
| Image | `routers/image.py` | huggingface.py + collaboration.py | ❌ import error |
| Voice TTS | `routers/voice.py` | elevenlabs.py (= edge-tts) | ❓ تحقق من deploy |
| Voice STT | `routers/voice.py` | groq_service.py (whisper) | ✅ يعمل |
| Lyrics | `routers/voice.py` | suno.py → groq + edge-tts | ❓ تحقق |
| Analyze | `routers/analyze.py` | gemini.py | ❌ quota |
| Search | `services/search.py` | DuckDuckGo (مجاني) | ✅ يعمل |
| Collaboration | `services/collaboration.py` | gemini + groq | ❌ import error |

---

## 🗂️ الملفات التي تحتاج تعديل الآن

### `backend/services/collaboration.py`
```python
# السطر المكسور (ابحث عنه وعدّله):
# قبل:
from services.gemini import imagen_generate, gemini_chat
# بعد:
from services.gemini import gemini_chat
```

### `backend/services/groq_service.py`
```python
# احذف mistral من GROQ_MODELS:
# "mistral": "mistral-saba-24b",  ← احذف هذا السطر

# تأكد أن qwen موجود:
"qwen": "qwen-qwq-32b",
```

### `backend/routers/chat.py`
```python
# في collaboration_providers - استبدل:
# 'groq_mistral'  ← احذف
# أضف:
'groq_qwen'
```

### `backend/services/collaboration.py` (collaborate_chat)
```python
# استبدل كل مكان يستخدم mistral:
# elif provider == "groq_mistral":  ← احذف أو استبدل
# elif provider == "groq_qwen":    ← أضف هذا
#     r = await groq_chat(messages, "qwen", system_prompt)
#     return "Qwen QwQ 32B", r
```

---

## 💡 نصائح لـ Cursor

1. **ابدأ دائماً بالـ Backend** قبل تعديل الـ Frontend
2. **اختبر كل endpoint** في `/docs` قبل تعديل الـ Frontend
3. **لا تغير** `runtime.txt` أو Python version
4. **لا تضف** مكتبات جديدة بدون إضافتها لـ `requirements.txt`
5. **كل تعديل Backend** يحتاج push لـ GitHub → Render يعيد deploy تلقائياً
6. **الـ Frontend** لا يحتاج build — فقط ارفع الملفات وVercel يتولى
7. **اختبر الـ CORS** إذا ظهر خطأ من الـ Frontend — تأكد من `ALLOWED_ORIGINS=*`
8. **الـ cold start** — انتظر 60 ثانية بعد deploy قبل الاختبار

---

*آخر تحديث: أبريل 2026 | Dhme Studio v1.0*
