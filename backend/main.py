from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import routers
from routers import chat, image, voice, video, analyze

# ─── App Setup ───────────────────────────────────────────
app = FastAPI(
    title="Dhme Studio API",
    description="منصة ذكاء اصطناعي شخصية — Dhme Studio",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# ─── CORS ────────────────────────────────────────────────
origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ─────────────────────────────────────────────
app.include_router(chat.router,    prefix="/api/chat",    tags=["Chat"])
app.include_router(image.router,   prefix="/api/image",   tags=["Image"])
app.include_router(voice.router,   prefix="/api/voice",   tags=["Voice"])
app.include_router(video.router,   prefix="/api/video",   tags=["Video"])
app.include_router(analyze.router, prefix="/api/analyze", tags=["Analyze"])

# ─── Health Check ────────────────────────────────────────
@app.get("/")
async def root():
    return {
        "status": "online",
        "app": "Dhme Studio",
        "version": "1.0.0"
    }

@app.get("/health")
async def health():
    return {"status": "healthy"}

# ─── Global Error Handler ────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"error": str(exc), "message": "Internal server error"}
    )