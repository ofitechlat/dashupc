import os
from google import genai
from google.genai import types
from moviepy import VideoFileClip
import json
from dotenv import load_dotenv
import time

load_dotenv()

class VideoAIProcessor:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        # Use v1alpha for media_resolution and thinking_level
        self.client = genai.Client(
            api_key=self.api_key, 
            http_options={'api_version': 'v1alpha'}
        )
        self.model_id = "gemini-3-flash-preview"

    def analyze_video(self, video_path: str):
        """
        Sends the video to Gemini for topic segmentation reasoning.
        """
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Video not found: {video_path}")

        # Upload video to Gemini
        print(f"Uploading {video_path} to Gemini...")
        video_file = self.client.files.upload(path=video_path)
        
        # Wait for file to be processed
        while video_file.state == "PROCESSING":
            print("Processing video...")
            time.sleep(5)
            video_file = self.client.files.get(name=video_file.name)

        prompt = """
        Analyze this class video and identify the main topics discussed.
        For each topic, provide:
        1. A title.
        2. Start and end timestamps (formatted as seconds, e.g., 120.5).
        3. A brief reasoning of why you chose this cut, considering both audio (what is said) 
           and visual cues (like writing on the board). 
           Wait for the teacher to finish writing or an action to complete before suggesting a cut.
        
        Return the result ONLY as a JSON list of objects:
        [
          {"title": "Topic Title", "start": 0, "end": 330, "reasoning": "Explanation..."},
          ...
        ]
        """

        print("Analyzing content with Gemini 3.0...")
        # Construct content parts with media resolution
        video_part = types.Part.from_uri(
            file_uri=video_file.uri,
            mime_type=video_file.mime_type
        )
        # Note: current SDK might not have media_resolution in Part.from_uri yet
        # or it's applied differently. Based on docs:
        contents = [
            types.Content(
                role="user",
                parts=[
                    types.Part(text=prompt),
                    types.Part(
                        file_data=types.FileData(file_uri=video_file.uri, mime_type=video_file.mime_type),
                        # media_resolution is passed here according to dev guide
                    )
                ]
            )
        ]

        response = self.client.models.generate_content(
            model=self.model_id,
            contents=contents,
            config=types.GenerateContentConfig(
                thinking_config=types.ThinkingConfig(thinking_level="high")
            )
        )
        
        # Cleanup remote file
        self.client.files.delete(name=video_file.name)

        try:
            # Clean response text
            text = response.text.strip()
            if text.startswith("```json"):
                text = text[7:-3].strip()
            return json.loads(text)
        except Exception as e:
            print(f"Failed to parse Gemini response: {e}")
            print(f"Raw response: {response.text}")
            return []

if __name__ == "__main__":
    # Test logic can be added here if needed
    pass
