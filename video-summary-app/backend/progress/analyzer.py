"""
Student Progress Analyzer
=========================
Analiza el progreso de los estudiantes comparando las transcripciones
de sus clases con el syllabus del curso usando IA local o Gemini.
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Optional
import json
import os
from supabase import create_client, Client

# Configuración (compatible con Next.js env vars)
SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL', os.getenv('SUPABASE_URL', ''))
SUPABASE_KEY = os.getenv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY', os.getenv('SUPABASE_ANON_KEY', ''))
USE_LOCAL_AI = os.getenv('USE_LOCAL_AI', 'false').lower() == 'true'

@dataclass
class TopicProgress:
    """Estado de progreso de un tema del syllabus."""
    topic_id: str
    topic_title: str
    covered: bool
    coverage_percentage: float
    mentioned_in_classes: list[str]  # IDs de clases donde se mencionó
    notes: str

@dataclass
class ProgressReport:
    """Reporte completo de progreso de un estudiante en una materia."""
    student_id: str
    student_name: str
    subject_id: str
    subject_name: str
    total_classes: int
    completed_classes: int
    total_topics: int
    covered_topics: int
    progress_percentage: float
    topic_details: list[TopicProgress]
    recommendations: list[str]
    strengths: list[str]
    areas_to_improve: list[str]
    generated_at: str

class StudentProgressAnalyzer:
    """
    Analizador de progreso que usa IA para comparar transcripciones
    de clases con el syllabus del curso.
    """
    
    def __init__(self, supabase_client: Optional[Client] = None):
        if supabase_client:
            self.supabase = supabase_client
        elif SUPABASE_URL and SUPABASE_KEY:
            self.supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        else:
            raise ValueError("Supabase credentials required")
        
        self.gemini_model = None
        if not USE_LOCAL_AI:
            try:
                import google.generativeai as genai
                api_key = os.getenv('GEMINI_API_KEY')
                if api_key:
                    genai.configure(api_key=api_key)
                    self.gemini_model = genai.GenerativeModel('gemini-2.5-flash')
            except ImportError:
                print("⚠️ google.generativeai not installed, using rule-based analysis")
    
    def get_student_classes(self, student_id: str, subject_id: str) -> list[dict]:
        """Obtiene todas las clases completadas de un estudiante en una materia."""
        result = self.supabase.table('classes').select(
            '*, video:videos(*)'
        ).eq('student_id', student_id).eq('subject_id', subject_id).eq('status', 'completed').execute()
        
        return result.data or []
    
    def get_subject_syllabus(self, subject_id: str) -> list[dict]:
        """Obtiene el syllabus de una materia."""
        result = self.supabase.table('subjects').select('*').eq('id', subject_id).single().execute()
        
        if result.data:
            return result.data.get('syllabus', [])
        return []
    
    def extract_transcription_text(self, classes: list[dict]) -> str:
        """Extrae todo el texto de las transcripciones de las clases."""
        all_text = []
        for cls in classes:
            video = cls.get('video')
            if video and video.get('transcription'):
                transcription = video['transcription']
                if isinstance(transcription, dict):
                    all_text.append(transcription.get('text', ''))
                elif isinstance(transcription, str):
                    all_text.append(transcription)
        
        return '\n\n'.join(all_text)
    
    def analyze_with_gemini(self, syllabus: list[dict], transcription_text: str) -> dict:
        """Usa Gemini para analizar el progreso."""
        if not self.gemini_model:
            return self.analyze_rule_based(syllabus, transcription_text)
        
        prompt = f"""Eres un asistente educativo. Analiza el progreso de un estudiante comparando 
las transcripciones de sus clases con el temario del curso.

TEMARIO DEL CURSO:
{json.dumps(syllabus, indent=2, ensure_ascii=False)}

TRANSCRIPCIONES DE LAS CLASES:
{transcription_text[:15000]}  # Limitar para no exceder tokens

Responde en JSON con esta estructura exacta:
{{
    "topic_coverage": [
        {{
            "topic_id": "id del tema",
            "topic_title": "título",
            "covered": true/false,
            "coverage_percentage": 0-100,
            "notes": "observaciones"
        }}
    ],
    "recommendations": ["lista de recomendaciones"],
    "strengths": ["fortalezas identificadas"],
    "areas_to_improve": ["áreas a mejorar"]
}}
"""
        
        try:
            response = self.gemini_model.generate_content(prompt)
            text = response.text
            
            # Extraer JSON de la respuesta
            if '```json' in text:
                text = text.split('```json')[1].split('```')[0]
            elif '```' in text:
                text = text.split('```')[1].split('```')[0]
            
            return json.loads(text)
        except Exception as e:
            print(f"⚠️ Error con Gemini: {e}")
            return self.analyze_rule_based(syllabus, transcription_text)
    
    def analyze_rule_based(self, syllabus: list[dict], transcription_text: str) -> dict:
        """Análisis basado en reglas cuando no hay IA disponible."""
        text_lower = transcription_text.lower()
        topic_coverage = []
        
        for topic in syllabus:
            title = topic.get('title', '').lower()
            description = topic.get('description', '').lower()
            
            # Buscar menciones del tema
            title_words = [w for w in title.split() if len(w) > 3]
            matches = sum(1 for word in title_words if word in text_lower)
            
            coverage = min((matches / max(len(title_words), 1)) * 100, 100) if title_words else 0
            
            topic_coverage.append({
                'topic_id': topic.get('id', ''),
                'topic_title': topic.get('title', ''),
                'covered': coverage > 30,
                'coverage_percentage': round(coverage, 1),
                'notes': f"Detectadas {matches} coincidencias de palabras clave"
            })
        
        covered_count = sum(1 for t in topic_coverage if t['covered'])
        total = len(topic_coverage)
        
        recommendations = []
        if covered_count < total:
            pending = [t['topic_title'] for t in topic_coverage if not t['covered']]
            recommendations.append(f"Pendiente revisar: {', '.join(pending[:3])}")
        
        return {
            'topic_coverage': topic_coverage,
            'recommendations': recommendations or ['Continuar con el plan de estudios'],
            'strengths': ['Progreso constante en las clases'] if covered_count > 0 else [],
            'areas_to_improve': [t['topic_title'] for t in topic_coverage if not t['covered']][:3]
        }
    
    def generate_report(self, student_id: str, subject_id: str) -> ProgressReport:
        """Genera un reporte completo de progreso."""
        # Obtener datos
        classes = self.get_student_classes(student_id, subject_id)
        syllabus = self.get_subject_syllabus(subject_id)
        
        # Obtener info del estudiante
        student_res = self.supabase.table('students').select('*').eq('id', student_id).single().execute()
        student = student_res.data or {}
        
        # Obtener info de la materia
        subject_res = self.supabase.table('subjects').select('*').eq('id', subject_id).single().execute()
        subject = subject_res.data or {}
        
        # Extraer transcripciones
        transcription_text = self.extract_transcription_text(classes)
        
        # Analizar con IA o reglas
        if transcription_text and syllabus:
            analysis = self.analyze_with_gemini(syllabus, transcription_text)
        else:
            analysis = {
                'topic_coverage': [],
                'recommendations': ['Aún no hay suficientes datos para analizar'],
                'strengths': [],
                'areas_to_improve': []
            }
        
        # Construir detalles de temas
        topic_details = [
            TopicProgress(
                topic_id=t['topic_id'],
                topic_title=t['topic_title'],
                covered=t['covered'],
                coverage_percentage=t['coverage_percentage'],
                mentioned_in_classes=[],
                notes=t.get('notes', '')
            )
            for t in analysis.get('topic_coverage', [])
        ]
        
        covered_topics = sum(1 for t in topic_details if t.covered)
        total_topics = len(topic_details)
        
        return ProgressReport(
            student_id=student_id,
            student_name=student.get('name', 'Desconocido'),
            subject_id=subject_id,
            subject_name=subject.get('name', 'Materia'),
            total_classes=len(classes),
            completed_classes=len([c for c in classes if c.get('status') == 'completed']),
            total_topics=total_topics,
            covered_topics=covered_topics,
            progress_percentage=round((covered_topics / max(total_topics, 1)) * 100, 1),
            topic_details=topic_details,
            recommendations=analysis.get('recommendations', []),
            strengths=analysis.get('strengths', []),
            areas_to_improve=analysis.get('areas_to_improve', []),
            generated_at=datetime.now().isoformat()
        )
    
    def report_to_dict(self, report: ProgressReport) -> dict:
        """Convierte un reporte a diccionario para JSON."""
        return {
            'student_id': report.student_id,
            'student_name': report.student_name,
            'subject_id': report.subject_id,
            'subject_name': report.subject_name,
            'total_classes': report.total_classes,
            'completed_classes': report.completed_classes,
            'total_topics': report.total_topics,
            'covered_topics': report.covered_topics,
            'progress_percentage': report.progress_percentage,
            'topic_details': [
                {
                    'topic_id': t.topic_id,
                    'topic_title': t.topic_title,
                    'covered': t.covered,
                    'coverage_percentage': t.coverage_percentage,
                    'notes': t.notes
                }
                for t in report.topic_details
            ],
            'recommendations': report.recommendations,
            'strengths': report.strengths,
            'areas_to_improve': report.areas_to_improve,
            'generated_at': report.generated_at
        }


def run_analysis(student_id: str, subject_id: str):
    """Función helper para ejecutar análisis."""
    analyzer = StudentProgressAnalyzer()
    report = analyzer.generate_report(student_id, subject_id)
    return analyzer.report_to_dict(report)
