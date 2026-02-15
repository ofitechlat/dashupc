from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
import shutil
import google.generativeai as genai
import imageio_ffmpeg
import subprocess
from pathlib import Path
from pydantic import BaseModel
from typing import List, Optional, Dict
import json
import io
import zipfile
from fastapi.responses import StreamingResponse
import time
from datetime import datetime, timedelta, timezone
import yt_dlp

# Cargar variables de entorno desde .env del directorio padre
from dotenv import load_dotenv
env_path = Path(__file__).parent.parent / '.env'
if env_path.exists():
    load_dotenv(env_path)
    print(f"✅ Variables de entorno cargadas desde: {env_path}")
else:
    # Intentar .env.local
    env_local = Path(__file__).parent.parent / '.env.local'
    if env_local.exists():
        load_dotenv(env_local)
        print(f"Variables de entorno cargadas desde: {env_local}")

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"]
)

# Configurar Directorios
UPLOAD_DIR = Path("uploads")
PROCESSED_DIR = Path("processed")
UPLOAD_DIR.mkdir(exist_ok=True)
PROCESSED_DIR.mkdir(exist_ok=True)

# Servir archivos procesados estáticos
from fastapi.staticfiles import StaticFiles
app.mount("/static", StaticFiles(directory="processed"), name="static")

# Configuración de Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    try:
        env_path = Path(r"f:\videos\editor ia\clip-js\.env")
        if env_path.exists():
            with open(env_path, "r") as f:
                for line in f:
                    if line.startswith("GEMINI_API_KEY="):
                        GEMINI_API_KEY = line.split("=")[1].strip().strip('"')
                        print("🔑 API Key encontrada en ruta absoluta")
                        break
    except Exception as e:
        print(f"⚠️ Error buscando API Key: {e}")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY, transport="rest")
    print("🤖 Verificando modelos disponibles en Gemini...", flush=True)
else:
    print("❌ ERROR: No se encontró GEMINI_API_KEY. El backend fallará al transcribir.")


@app.post("/process")
async def process_video(file: UploadFile = File(...)):
    try:
        print(f"🚀 Iniciando procesamiento para: {file.filename}", flush=True)
        if not GEMINI_API_KEY:
            raise HTTPException(status_code=500, detail="Missing GEMINI_API_KEY")
        
        file_path = UPLOAD_DIR / file.filename
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
        audio_path = PROCESSED_DIR / f"{file.filename}.mp3"
        subprocess.run([ffmpeg_exe, "-i", str(file_path), "-vn", "-ab", "128k", "-y", str(audio_path)], check=True)
        
        model = genai.GenerativeModel('models/gemini-2.5-flash')
        uploaded_file = genai.upload_file(path=str(audio_path), mime_type="audio/mp3")
        
        while uploaded_file.state.name == "PROCESSING":
            time.sleep(2)
            uploaded_file = genai.get_file(uploaded_file.name)
            
        prompt_transcribe = "Transcribe the audio verbatim in Spanish. Output JSON with 'text' and 'segments'."
        result_transcription = model.generate_content([prompt_transcribe, uploaded_file], generation_config={"response_mime_type": "application/json"})
        transcription_data = json.loads(result_transcription.text)
        
        prompt_summary = """Analyze the audio and create a detailed structured summary in Spanish. 
        Output STRICT JSON with the following structure:
        {
            "summary": "Full summary text...",
            "sections": [
                {
                    "title": "Topic Title",
                    "start": 0, // IMPORTANT: Start time in SECONDS (integer), e.g., 0, 120, 340
                    "content": "Detailed explanation of this section..."
                }
            ],
            "keyPoints": ["Key point 1", "Key point 2"...]
        }
        Ensure the 'start' time roughly corresponds to when this topic appears in the audio.
        """
        result_summary = model.generate_content([prompt_summary, uploaded_file], generation_config={"response_mime_type": "application/json"})
        summary_data = json.loads(result_summary.text)
        
        # Simplified compression
        compressed_filename = f"compressed_{file.filename}.mp4"
        compressed_path = PROCESSED_DIR / compressed_filename
        subprocess.run([ffmpeg_exe, "-i", str(file_path), "-vf", "scale=-2:720", "-c:v", "libx264", "-preset", "veryfast", "-y", str(compressed_path)], check=True)

        return {
            "status": "success",
            "videoId": file.filename,
            "title": file.filename,  # FIX: Return title to prevent DB error
            "videoUrl": f"/static/{compressed_filename}",
            "transcription": transcription_data,
            "summary": summary_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class YouTubeProcessRequest(BaseModel):
    url: str

@app.post("/api/process-youtube")
async def process_youtube(request: YouTubeProcessRequest):
    try:
        print(f"🚀 Procesando YouTube: {request.url}", flush=True)
        if not GEMINI_API_KEY:
            raise HTTPException(status_code=500, detail="Missing GEMINI_API_KEY")

        ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': str(PROCESSED_DIR / '%(id)s.%(ext)s'),
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }],
            'quiet': True,
            'no_warnings': True
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(request.url, download=True)
            video_id = info['id']
            video_title = info['title']
            video_duration = info.get('duration', 0)
            
            audio_filename = f"{video_id}.mp3"
            audio_path = PROCESSED_DIR / audio_filename

        print(f"✅ Audio descargado: {audio_path}", flush=True)

        # Gemini Processing
        model = genai.GenerativeModel('models/gemini-2.5-flash')
        uploaded_file = genai.upload_file(path=str(audio_path), mime_type="audio/mp3")
        
        while uploaded_file.state.name == "PROCESSING":
            time.sleep(2)
            uploaded_file = genai.get_file(uploaded_file.name)
            
        prompt_transcribe = "Transcribe the audio verbatim in Spanish. Output JSON with 'text' and 'segments'."
        result_transcription = model.generate_content([prompt_transcribe, uploaded_file], generation_config={"response_mime_type": "application/json"})
        transcription_data = json.loads(result_transcription.text)
        
        prompt_summary = """Analyze the audio and create a detailed structured summary in Spanish. 
        Output STRICT JSON with the following structure:
        {
            "summary": "Full summary text...",
            "sections": [
                {
                    "title": "Topic Title",
                    "start": 0, // IMPORTANT: Start time in SECONDS (integer), e.g., 0, 120, 340
                    "content": "Detailed explanation of this section..."
                }
            ],
            "keyPoints": ["Key point 1", "Key point 2"...]
        }
        Ensure the 'start' time roughly corresponds to when this topic appears in the audio.
        """
        result_summary = model.generate_content([prompt_summary, uploaded_file], generation_config={"response_mime_type": "application/json"})
        summary_data = json.loads(result_summary.text)

        return {
            "status": "success",
            "videoId": video_id,
            "title": video_title,  # FIX: Return extracted title
            "duration": video_duration,
            "videoUrl": request.url, # Return original URL for frontend
            "transcription": transcription_data,
            "summary": summary_data
        }

    except Exception as e:
        print(f"❌ Error en YouTube: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# =============================================
# TUTORING SYSTEM API ROUTES
# =============================================
from typing import Optional as OptionalType

USE_SQLITE = os.getenv("USE_SQLITE", "False").lower() == "true"

try:
    if USE_SQLITE:
        from scheduler.optimizer_sqlite import TutoringOptimizerSQLite as TutoringOptimizer
    else:
        from scheduler.optimizer import TutoringOptimizer
    
    from scheduler.api_sandbox import router as sandbox_router
    app.include_router(sandbox_router)
    
    # AI Data Entry Assistant
    from scheduler.ai_data_assistant import router as ai_assistant_router
    app.include_router(ai_assistant_router)
    
    TUTORING_ENABLED = True
except ImportError as e:
    TUTORING_ENABLED = False
    print(f"⚠️ MODULOS DE TUTORIAS NO DISPONIBLES: {e}")

# ... (Manually adding back the core tutoring endpoints if needed, but the router handles sandbox)
# For the sake of this fix, I am keeping the router which is the primary source of the conflict.

@app.get("/api/classes")
async def get_classes():
    if not TUTORING_ENABLED: raise HTTPException(status_code=503)
    return {"success": True, "classes": []}

if __name__ == "__main__":
    print("🔋 Iniciando servidor backend en puerto 8000...", flush=True)
    uvicorn.run(app, host="0.0.0.0", port=8000)
