import google.generativeai as genai
import os
from pathlib import Path

# Cargar API Key
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    try:
        env_path = Path(r"f:\videos\editor ia\clip-js\.env")
        if env_path.exists():
            with open(env_path, "r") as f:
                for line in f:
                    if line.startswith("GEMINI_API_KEY="):
                        GEMINI_API_KEY = line.split("=")[1].strip().strip('"')
                        print("🔑 API Key loaded.")
                        break
    except Exception as e:
        print(f"⚠️ Error loading key: {e}")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    
    with open("models.txt", "w", encoding="utf-8") as f:
        f.write("-------- AVAILABLE MODELS --------\n")
        try:
            for m in genai.list_models():
                if 'generateContent' in m.supported_generation_methods:
                    f.write(f"Name: {m.name}\n")
                    f.write(f"Display Name: {m.display_name}\n")
                    f.write("-" * 30 + "\n")
            print("✅ Models written to models.txt")
        except Exception as e:
            f.write(f"❌ Error listing models: {e}\n")
            print(f"❌ Error: {e}")
else:
    print("❌ No API Key found.")
