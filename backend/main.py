from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import os
from dotenv import load_dotenv
from typing import List
from pydantic import BaseModel
from engine import VideoAIProcessor
from editor import VideoEditor
from transcriber import VideoTranscriber
from summary_generator import SummaryGenerator
import sqlite3
import json
import subprocess

from pathlib import Path

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / '.env')

app = FastAPI(title="AI Video Editor API")

# Database setup
DB_PATH = "editor.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS analyses (
            id TEXT PRIMARY KEY,
            video_path TEXT,
            status TEXT,
            results TEXT,
            error TEXT
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS transcriptions (
            id TEXT PRIMARY KEY,
            video_path TEXT,
            status TEXT,
            markdown TEXT,
            youtube_chapters TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

init_db()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

processor = VideoAIProcessor()
editor = VideoEditor(export_dir=os.getenv("EXPORT_DIR", "F:\\videos\\editor ia\\exports"))
transcriber = VideoTranscriber()
summary_gen = SummaryGenerator()
VIDEO_DIR = os.getenv("VIDEO_SOURCE_DIR", "F:\\videos")

class AnalysisResponse(BaseModel):
    id: str
    video_path: str
    status: str
    results: List[dict] = []

class ExportRequest(BaseModel):
    video_path: str
    start: float
    end: float
    title: str
    format: str = "16:9"

@app.get("/")
async def root():
    return {"message": "AI Video Editor Backend is running"}

@app.get("/videos")
async def list_videos():
    videos = []
    for root, dirs, files in os.walk(VIDEO_DIR):
        for file in files:
            if file.lower().endswith(('.mp4', '.mkv', '.mov', '.avi')):
                videos.append(os.path.join(root, file))
    return {"videos": videos}

def run_analysis(video_id: str, video_path: str):
    try:
        results = processor.analyze_video(video_path)
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE analyses SET status = 'COMPLETED', results = ? WHERE id = ?",
            (json.dumps(results), video_id)
        )
        conn.commit()
        conn.close()
    except Exception as e:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE analyses SET status = 'FAILED', error = ? WHERE id = ?",
            (str(e), video_id)
        )
        conn.commit()
        conn.close()

@app.post("/analyze")
async def analyze_video(video_path: str, background_tasks: BackgroundTasks):
    if not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail="Video file not found")
    
    video_id = str(os.path.basename(video_path))
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT OR REPLACE INTO analyses (id, video_path, status, results) VALUES (?, ?, ?, ?)",
        (video_id, video_path, "PROCESSING", "[]")
    )
    conn.commit()
    conn.close()
    
    background_tasks.add_task(run_analysis, video_id, video_path)
    return {"message": "Analysis started", "id": video_id}

@app.get("/analysis/{video_id}")
async def get_analysis(video_id: str):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM analyses WHERE id = ?", (video_id,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    return {
        "id": row[0],
        "video_path": row[1],
        "status": row[2],
        "results": json.loads(row[3]),
        "error": row[4]
    }

@app.post("/export-clip")
async def export_clip(request: ExportRequest):
    hf_token = os.getenv("HUGGINGFACE_TOKEN")
    if hf_token == "your_token_here":
        hf_token = None
        
    try:
        output_path = editor.extract_clip(
            request.video_path, 
            request.start, 
            request.end, 
            request.title, 
            request.format, 
            hf_token
        )
        return {"message": "Export successful", "path": output_path, "filename": os.path.basename(output_path)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")

@app.get("/stream/{video_id}")
async def stream_video(video_id: str):
    # For security, we should validate the video_id/path
    # Here we assume the id is the basename for simplicity
    for root, dirs, files in os.walk(VIDEO_DIR):
        if video_id in files:
            return FileResponse(os.path.join(root, video_id))
    
    # Also check exports
    export_dir = os.getenv("EXPORT_DIR", "F:\\videos\\editor ia\\exports")
    if os.path.exists(os.path.join(export_dir, video_id)):
        return FileResponse(os.path.join(export_dir, video_id))
        
    raise HTTPException(status_code=404, detail="Video not found")

@app.post("/prune-silence")
async def prune_silence(video_path: str):
    if not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail="Video not found")
    
    output_name = os.path.basename(video_path).split('.')[0] + "_pruned.mp4"
    export_dir = os.getenv("EXPORT_DIR", "F:\\videos\\editor ia\\exports")
    output_path = os.path.join(export_dir, output_name)
    
    # Run auto-editor command
    cmd = ["auto-editor", video_path, "--output", output_path, "--margin", "0.2s"]
    try:
        subprocess.run(cmd, check=True)
        return {"message": "Silence pruned", "output_path": output_path, "filename": output_name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Auto-editor failed: {str(e)}")

@app.post("/compress")
async def compress_video(video_path: str):
    if not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail="Video not found")
        
    output_name = os.path.basename(video_path).split('.')[0]
    try:
        output_path = editor.compress_video(video_path, output_name)
        return {"message": "Video compressed", "output_path": output_path, "filename": os.path.basename(output_path)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Compression failed: {str(e)}")

def run_transcription(video_id: str, video_path: str):
    """Background task for transcription and summary generation"""
    try:
        # Step 1: Transcribe video
        result = transcriber.transcribe(video_path)
        
        # Step 2: Generate summary with Gemini
        summary = summary_gen.generate_summary(result)
        
        # Step 3: Save to database
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE transcriptions SET status = 'COMPLETED', markdown = ?, youtube_chapters = ? WHERE id = ?",
            (summary['markdown'], summary['youtube_chapters'], video_id)
        )
        conn.commit()
        conn.close()
        print(f"Transcription completed for {video_id}")
    except Exception as e:
        print(f"Transcription failed for {video_id}: {str(e)}")
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE transcriptions SET status = 'FAILED' WHERE id = ?",
            (video_id,)
        )
        conn.commit()
        conn.close()

@app.post("/transcribe")
async def transcribe_video(video_path: str, background_tasks: BackgroundTasks):
    """Start transcription and summary generation for a video"""
    if not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail="Video file not found")
    
    video_id = str(os.path.basename(video_path))
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT OR REPLACE INTO transcriptions (id, video_path, status, markdown, youtube_chapters) VALUES (?, ?, ?, ?, ?)",
        (video_id, video_path, "PROCESSING", "", "")
    )
    conn.commit()
    conn.close()
    
    background_tasks.add_task(run_transcription, video_id, video_path)
    return {"message": "Transcription started", "id": video_id}

@app.get("/summary/{video_id}")
async def get_summary(video_id: str):
    """Get generated summary and YouTube chapters"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM transcriptions WHERE id = ?", (video_id,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        raise HTTPException(status_code=404, detail="Summary not found")
    
    return {
        "id": row[0],
        "video_path": row[1],
        "status": row[2],
        "markdown": row[3],
        "youtube_chapters": row[4]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
