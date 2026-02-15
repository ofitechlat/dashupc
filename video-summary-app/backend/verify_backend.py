import requests
import os
import json
import sys

# Configuración
API_URL = "http://localhost:8000/process"
VIDEO_PATH = r"F:\videos\2025-08-09 14-11-41.mkv"

def test_backend():
    print(f"🔧 Iniciando prueba de backend...")
    print(f"📁 Video objetivo: {VIDEO_PATH}")

    if not os.path.exists(VIDEO_PATH):
        print("❌ Error: El archivo de video no existe en la ruta especificada.")
        return

    try:
        # Abrir archivo video
        with open(VIDEO_PATH, 'rb') as f:
            files = {'file': (os.path.basename(VIDEO_PATH), f, 'video/x-matroska')}
            
            print("📤 Enviando archivo al servidor (POST /process)... esto puede tardar unos minutos.")
            print("   (Audio extract -> Transcribe -> Summary -> Compression)")
            
            # Enviar request sin timeout (el procesamiento es largo)
            response = requests.post(API_URL, files=files, timeout=600)
            
        if response.status_code == 200:
            print("\n✅ ¡ÉXITO! El backend procesó el video correctamente.")
            data = response.json()
            
            # Guardar respuesta para inspección
            output_json = "backend_response.json"
            with open(output_json, "w", encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
                
            print(f"📄 Respuesta guardada en: {output_json}")
            print("\n--- RESUMEN GENERADO ---")
            print(f"Video ID: {data.get('videoId')}")
            print(f"Video URL: {data.get('videoUrl')}")
            
            summary = data.get('summary', {})
            print(f"\nResumen General: {summary.get('summary')[:200]}...")
            
            print("\nSecciones:")
            for sec in summary.get('sections', [])[:3]:
                print(f" - [{sec.get('start')}s] {sec.get('title')}")
                
        else:
            print(f"\n❌ Error del Servidor ({response.status_code}):")
            print(response.text)

    except requests.exceptions.ConnectionError:
        print("\n❌ Error de conexión: ¿Está corriendo el servidor backend?")
        print("   Ejecuta: python main.py en la carpeta backend")
    except Exception as e:
        print(f"\n❌ Error inesperado: {str(e)}")

if __name__ == "__main__":
    # Instalar requests si falta (hack simple para el script de prueba)
    try:
        import requests
    except ImportError:
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "requests"])
        import requests
        
    test_backend()
