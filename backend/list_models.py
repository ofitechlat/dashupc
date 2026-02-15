from google import genai
import os
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key)

def list_models():
    try:
        print("Available models:")
        for model in client.models.list():
            print(f"- {model.name} (Supported: {model.supported_actions})")
    except Exception as e:
        print(f"Error listing models: {e}")

if __name__ == "__main__":
    list_models()
