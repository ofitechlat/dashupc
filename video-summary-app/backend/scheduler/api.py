"""
Tutoring Scheduler API
======================
Endpoints para ejecutar el optimizador y gestionar propuestas de clases.
"""

from flask import Blueprint, request, jsonify
from flask_cors import cross_origin
from .optimizer import TutoringOptimizer, MatchProposal
import os

scheduler_bp = Blueprint('scheduler', __name__, url_prefix='/api/scheduler')

# Almacenar propuestas en memoria (en producción usar Redis/DB)
current_proposals: list[MatchProposal] = []

@scheduler_bp.route('/run', methods=['POST'])
@cross_origin()
def run_optimization():
    """
    Ejecuta el algoritmo de optimización.
    
    Body (opcional):
        subject_id: str - Filtrar por materia específica
    
    Returns:
        Lista de propuestas de emparejamiento
    """
    global current_proposals
    
    try:
        data = request.get_json() or {}
        subject_id = data.get('subject_id')
        
        optimizer = TutoringOptimizer()
        proposals = optimizer.generate_proposals(subject_id)
        
        # Guardar propuestas actuales
        current_proposals = proposals
        
        return jsonify({
            'success': True,
            'count': len(proposals),
            'proposals': [
                {
                    'student_id': p.student_id,
                    'student_name': p.student_name,
                    'tutor_id': p.tutor_id,
                    'tutor_name': p.tutor_name,
                    'subject_id': p.subject_id,
                    'subject_name': p.subject_name,
                    'proposed_day': p.proposed_day,
                    'proposed_time': p.proposed_time,
                    'duration_minutes': p.duration_minutes,
                    'type': p.type,
                    'price': p.price,
                    'score': p.score
                }
                for p in proposals
            ]
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@scheduler_bp.route('/proposals', methods=['GET'])
@cross_origin()
def get_proposals():
    """
    Obtiene las propuestas generadas en la última ejecución.
    """
    return jsonify({
        'success': True,
        'count': len(current_proposals),
        'proposals': [
            {
                'student_id': p.student_id,
                'student_name': p.student_name,
                'tutor_id': p.tutor_id,
                'tutor_name': p.tutor_name,
                'subject_id': p.subject_id,
                'subject_name': p.subject_name,
                'proposed_day': p.proposed_day,
                'proposed_time': p.proposed_time,
                'duration_minutes': p.duration_minutes,
                'type': p.type,
                'price': p.price,
                'score': p.score
            }
            for p in current_proposals
        ]
    })

@scheduler_bp.route('/confirm', methods=['POST'])
@cross_origin()
def confirm_match():
    """
    Confirma una propuesta y crea la clase en la base de datos.
    
    Body:
        student_id: str
        tutor_id: str
        subject_id: str
    
    Returns:
        ID de la clase creada
    """
    try:
        data = request.get_json()
        student_id = data.get('student_id')
        tutor_id = data.get('tutor_id')
        subject_id = data.get('subject_id')
        
        # Buscar la propuesta correspondiente
        proposal = None
        for p in current_proposals:
            if p.student_id == student_id and p.tutor_id == tutor_id and p.subject_id == subject_id:
                proposal = p
                break
        
        if not proposal:
            return jsonify({'success': False, 'error': 'Propuesta no encontrada'}), 404
        
        # Crear la clase
        optimizer = TutoringOptimizer()
        class_id = optimizer.save_class(proposal)
        
        return jsonify({
            'success': True,
            'class_id': class_id,
            'message': f'Clase creada exitosamente para {proposal.student_name} con {proposal.tutor_name}'
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@scheduler_bp.route('/tutor-availability/<subject_id>', methods=['GET'])
@cross_origin()
def get_tutor_availability(subject_id: str):
    """
    Obtiene la tabla de disponibilidad de tutores para una materia.
    Útil cuando no hay matches automáticos y el estudiante debe elegir.
    """
    try:
        optimizer = TutoringOptimizer()
        table = optimizer.get_tutor_availability_table(subject_id)
        
        return jsonify({
            'success': True,
            'subject_id': subject_id,
            'tutors': table
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
