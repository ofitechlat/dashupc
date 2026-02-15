from google import genai
from google.genai import types
import os
import json
from dotenv import load_dotenv

load_dotenv()

class SummaryGenerator:
    def __init__(self):
        """Initialize Gemini 3.0 Flash for summary generation"""
        self.client = genai.Client(
            api_key=os.getenv("GEMINI_API_KEY"),
            http_options={'api_version': 'v1alpha'}
        )
        self.model_id = "gemini-3-flash-preview"
    
    def generate_summary(self, transcription: dict) -> dict:
        """
        Generates Markdown summary and YouTube chapters from transcription.
        
        Args:
            transcription: Whisper transcription result with segments
            
        Returns:
            dict with 'markdown' and 'youtube_chapters' keys
        """
        # Format segments for the prompt
        segments_text = self._format_segments(transcription.get('segments', []))
        full_text = transcription.get('text', '')
        
        prompt = f"""Eres un asistente experto en edición de videos educativos para YouTube.

Analiza esta transcripción de una clase y genera DOS cosas:

1. **Resumen en Markdown**:
   - Título principal (# Título de la Clase)
   - Secciones con subtítulos (## MM:SS - Nombre del Tema)
   - Explicación breve y clara de cada tema (2-3 oraciones)
   - Usa el timestamp al inicio de cada sección
   - Identifica cambios de tema basándote en el contenido

2. **YouTube Chapters** (formato exacto para copiar/pegar):
   - Primera línea DEBE ser: "00:00 Introducción"
   - Formato: "MM:SS Título del capítulo"
   - Mínimo 3 capítulos, máximo 15
   - Cada capítulo debe durar al menos 10 segundos
   - Títulos concisos y descriptivos (máximo 100 caracteres)

TRANSCRIPCIÓN COMPLETA:
{full_text}

SEGMENTOS CON TIMESTAMPS:
{segments_text}

Devuelve SOLO un objeto JSON válido con esta estructura exacta:
{{
  "markdown": "# Título de la Clase\\n\\n## 00:00 - Introducción\\n\\nDescripción breve...\\n\\n## 05:30 - Tema Principal\\n\\nExplicación...",
  "youtube_chapters": "00:00 Introducción\\n05:30 Tema Principal\\n12:45 Ejercicio Práctico\\n18:20 Conclusión"
}}

IMPORTANTE: Asegúrate de que el JSON sea válido y parseable."""

        print("Generating summary with Gemini 3.0 Flash...")
        response = self.client.models.generate_content(
            model=self.model_id,
            contents=prompt,
            config=types.GenerateContentConfig(
                thinking_config=types.ThinkingConfig(thinking_level="high"),
                response_mime_type="application/json"
            )
        )
        
        try:
            # Parse JSON response
            result = json.loads(response.text)
            print("Summary generated successfully")
            return result
        except json.JSONDecodeError as e:
            print(f"Failed to parse Gemini response: {e}")
            print(f"Raw response: {response.text}")
            # Return fallback structure
            return {
                "markdown": f"# Error al generar resumen\n\n{response.text}",
                "youtube_chapters": "00:00 Error en generación"
            }
    
    def _format_segments(self, segments: list, max_segments: int = 30) -> str:
        """
        Formats transcription segments for the prompt.
        Limits to max_segments to avoid token overflow.
        """
        formatted = []
        for i, seg in enumerate(segments[:max_segments]):
            start = self._seconds_to_timestamp(seg['start'])
            text = seg['text'].strip()
            formatted.append(f"[{start}] {text}")
        
        if len(segments) > max_segments:
            formatted.append(f"... ({len(segments) - max_segments} segmentos más)")
        
        return "\n".join(formatted)
    
    def _seconds_to_timestamp(self, seconds: float) -> str:
        """Converts seconds to MM:SS format"""
        mins = int(seconds // 60)
        secs = int(seconds % 60)
        return f"{mins:02d}:{secs:02d}"

if __name__ == "__main__":
    # Test summary generation
    gen = SummaryGenerator()
    # Add test transcription here for manual testing
