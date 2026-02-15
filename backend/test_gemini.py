from google import genai
import os
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
# Forcing v1 version
client = genai.Client(api_key=api_key, http_options={'api_version': 'v1'})

def test_gemini():
    try:
        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents="Hola, ¿puedes leerme? Responde solo con 'OK' si es así."
        )
        print(f"Gemini Response: {response.text}")
    except Exception as e:
        print(f"Error connecting to Gemini: {e}")

if __name__ == "__main__":
    test_gemini()
