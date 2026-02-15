import whisper
import os
from moviepy import VideoFileClip
from dotenv import load_dotenv

load_dotenv()

class VideoTranscriber:
    def __init__(self):
        """Initialize Whisper model for transcription"""
        print("Loading Whisper model...")
        self.model = whisper.load_model("base")
        print("Whisper model loaded successfully")
    
    def extract_audio(self, video_path: str) -> str:
        """
        Extracts audio from video file for transcription.
        Returns path to the extracted audio file.
        """
        print(f"Extracting audio from {video_path}...")
        clip = VideoFileClip(video_path)
        
        # Create audio file path
        base_name = os.path.splitext(video_path)[0]
        audio_path = f"{base_name}_audio.wav"
        
        # Extract audio
        clip.audio.write_audiofile(audio_path, verbose=False, logger=None)
        clip.close()
        
        print(f"Audio extracted to {audio_path}")
        return audio_path
    
    def transcribe(self, video_path: str) -> dict:
        """
        Transcribes video with word-level timestamps.
        Returns Whisper transcription result with segments and words.
        """
        # Extract audio first
        audio_path = self.extract_audio(video_path)
        
        try:
            print("Transcribing audio...")
            result = self.model.transcribe(
                audio_path,
                language="es",  # Spanish for class videos
                word_timestamps=True,
                verbose=False
            )
            print("Transcription completed successfully")
            return result
        finally:
            # Cleanup audio file
            if os.path.exists(audio_path):
                os.remove(audio_path)
                print(f"Cleaned up temporary audio file: {audio_path}")

if __name__ == "__main__":
    # Test transcription
    transcriber = VideoTranscriber()
    # Add test video path here for manual testing
