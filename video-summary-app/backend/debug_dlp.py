
import yt_dlp
import imageio_ffmpeg
import os
import time
from pathlib import Path

# Config similar to main.py
PROCESSED_DIR = Path("processed")
PROCESSED_DIR.mkdir(exist_ok=True)
timestamp = int(time.time())
audio_filename = f"yt_debug_{timestamp}"

# Get ffmpeg path
ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
print(f"DEBUG: ffmpeg path: {ffmpeg_exe}")

ydl_opts = {
    'format': 'bestaudio[ext=m4a]/bestaudio',
    'ffmpeg_location': ffmpeg_exe,
    'outtmpl': str(PROCESSED_DIR / f"{audio_filename}.%(ext)s"),
    'noplaylist': True,
    'quiet': False, # Enable output
    'verbose': True
}

# Test URL (Short video)
url = "https://www.youtube.com/watch?v=jNQXAC9IVRw" # Me at the zoo (short)

print("DEBUG: Starting download...")
try:
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([url])
    print("DEBUG: Download finished.")
    
    # Check what file implies
    files = list(PROCESSED_DIR.glob(f"{audio_filename}.*"))
    print(f"DEBUG: Found files: {files}")
    
except Exception as e:
    print(f"DEBUG: Error happened: {e}")
    import traceback
    traceback.print_exc()
