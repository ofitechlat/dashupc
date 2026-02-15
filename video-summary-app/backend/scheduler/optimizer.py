
"""
Tutoring Scheduler Optimizer V2 (CP-SAT)
========================================
Algoritmo de optimización avanzado para maximizar ingresos y eficiencia.
Soporta:
- Paquetes de horas (asignación múltiple de slots).
- Restricciones de intensidad diaria (max_daily_hours).
- Priorización por valor del contrato.
- Agrupación dinámica.
"""

from dataclasses import dataclass
from typing import Optional, List, Dict, Tuple
import os
from supabase import create_client
from ortools.sat.python import cp_model
from collections import defaultdict

# Configuración
SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL', os.getenv('SUPABASE_URL', ''))
SUPABASE_KEY = os.getenv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY') # Usar Service Role idealmente

@dataclass
class TimeSlot:
    day: str
    start_time: str
    end_time: str
    
    def to_key(self) -> Tuple[str, str]:
        return (self.day, self.start_time)

@dataclass
class Request:
    id: str
    student_id: str
    student_name: str
    subject_id: str
    subject_name: str
    subject_category: str
    subject_group_price: float
    subject_individual_price: float
    package_hours: int
    max_daily_hours: int
    preference: str # 'individual' | 'grupal'
    availability: List[TimeSlot]

@dataclass
class Tutor:
    id: str
    name: str
    subject_ids: List[str]
    score: int
    availability: List[TimeSlot]

@dataclass
class MatchProposal:
    student_id: str
    student_name: str
    tutor_id: str
    tutor_name: str
    subject_id: str
    subject_name: str
    proposed_day: str
    proposed_time: str
    duration_minutes: int
    type: str
    price: float
    score: float

class TutoringOptimizer:
    def __init__(self):
        if not SUPABASE_URL or not SUPABASE_KEY:
             # Fallback para dev local sin env cargado
             pass
        self.supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        self.requests: List[Request] = []
        self.tutors: List[Tutor] = []

    def load_data(self):
        # 1. Cargar Solicitudes
        print("📥 Cargando solicitudes...")
        reqs_res = self.supabase.table('course_requests').select(
            '*, students(name, availability), subjects(name, category, individual_price, group_price)'
        ).eq('status', 'pending').execute()
        
        self.requests = []
        for r in reqs_res.data:
            avail = []
            if r['students'] and r['students'].get('availability'):
                for slot in r['students']['availability']:
                    avail.append(TimeSlot(slot['day'], slot['startTime'], slot['endTime']))
            
            self.requests.append(Request(
                id=r['id'],
                student_id=r['student_id'],
                student_name=r['students']['name'],
                subject_id=r['subject_id'],
                subject_name=r['subjects']['name'],
                subject_category=r['subjects'].get('category', 'general'),
                subject_group_price=r['subjects']['group_price'],
                subject_individual_price=r['subjects']['individual_price'],
                package_hours=r.get('package_hours', 1),
                max_daily_hours=r.get('max_daily_hours', 2),
                preference=r['preference'],
                availability=avail
            ))

        # 2. Cargar Tutores
        print("📥 Cargando tutores...")
        tutors_res = self.supabase.table('tutors').select('*').execute()
        self.tutors = []
        for t in tutors_res.data:
            avail = []
            if t.get('availability'):
                for slot in t['availability']:
                    avail.append(TimeSlot(slot['day'], slot['startTime'], slot['endTime']))
            
            self.tutors.append(Tutor(
                id=t['id'],
                name=t['name'],
                subject_ids=t.get('subject_ids', []),
                score=t.get('score', 100),
                availability=avail
            ))
            
    def generate_proposals(self, subject_filter: str = None) -> List[MatchProposal]:
        self.load_data()
        model = cp_model.CpModel()
        proposals = []
        
        # Mapa de variables: matches[(req_id, tutor_id, day, time)] = BoolVar
        matches = {}
        
        # Estructuras auxiliares para restricciones
        req_vars_by_id = defaultdict(list)
        req_vars_by_day = defaultdict(lambda: defaultdict(list)) # req_id -> day -> [vars]
        tutor_slots = defaultdict(list) # (tutor_id, day, time) -> [vars]
        student_slots = defaultdict(list) # (student_id, day, time) -> [vars]

        print("🧮 Construyendo modelo CP-SAT...")
        
        for req in self.requests:
            if subject_filter and req.subject_id != subject_filter:
                continue

            # Calcular Peso (Prioridad V2)
            # Base: Tutor Score
            # + Revenue Weight: (Hours * Price) / 100
            # + Package Boost: +1000 si > 8h
            
            price = req.subject_group_price if req.preference == 'grupal' else req.subject_individual_price
            revenue_score = (req.package_hours * price) / 100
            package_boost = 1000 if req.package_hours >= 8 else (500 if req.package_hours >= 4 else 0)
            
            for tutor in self.tutors:
                if req.subject_id not in tutor.subject_ids:
                    continue

                # Intersección de Slots
                common = self._find_common_slots(req.availability, tutor.availability)
                
                for day, time in common:
                    # Crear Variable
                    var_name = f'{req.id}_{tutor.id}_{day}_{time}'
                    var = model.NewBoolVar(var_name)
                    
                    final_score = tutor.score + revenue_score + package_boost
                    if req.preference == 'grupal': final_score += 50 # Preferencia por grupos
                    
                    key = (req.id, tutor.id, day, time)
                    matches[key] = {'var': var, 'score': int(final_score), 'info': (req, tutor, day, time)}
                    
                    # Agrupar para restricciones
                    req_vars_by_id[req.id].append(var)
                    req_vars_by_day[req.id][day].append(var)
                    tutor_slots[(tutor.id, day, time)].append(var)
                    student_slots[(req.student_id, day, time)].append(var)

        # --- RESTRICCIONES (Hard Constraints) ---

        # 1. Cumplir Paquete de Horas
        # La suma de slots asignados debe ser MENOR o IGUAL al paquete (si no hay suficientes slots, asigna lo que pueda)
        # Idealmente IGUAL, pero para evitar "Infeasible", usamos <= y maximizamos score.
        for req in self.requests:
            vars_list = req_vars_by_id[req.id]
            if vars_list:
                # Intentar asignar EXACTAMENTE las horas, si es posible.
                # Si es muy estricto, relajar a <= req.package_hours
                # Haremos: Sum <= package_hours. La función objetivo empujará a llenar.
                model.Add(sum(vars_list) <= req.package_hours)
                
        # 2. Máximo Horas Diarias por Materia
        for req in self.requests:
            for day, vars_list in req_vars_by_day[req.id].items():
                # Asumimos slots de 1 hora.
                model.Add(sum(vars_list) <= req.max_daily_hours)
        
        # 3. Conflictos de Estudiante (No ubicuidad)
        for key, vars_list in student_slots.items():
            model.Add(sum(vars_list) <= 1)
            
        # 4. Conflictos de Tutor (Agrupación)
        # Un tutor puede atender múltiples alumnos SI es la misma materia y horario (Grupo).
        # Si son materias distintas, solo 1.
        for key, vars_list in tutor_slots.items():
            # key = (t, d, time)
            tutor_id = key[0]
            
            # Agrupar variables por Subject
            by_subj = defaultdict(list)
            for v in vars_list:
                # Necesitamos recuperar el sujeto de la variable. 
                # Truco: buscar en matches inverso o iterar
                # Por eficiencia, iteramos matches values
               pass # Hecho abajo mejor

        # Re-iterar tutor_slots con info completa
        for key, vars_entry_list in tutor_slots.items():
             # vars_entry_list son BoolVars. Necesito saber a qué req pertenecen para ver el subject.
             # Ineficiente buscar inverso. Mejor guardar estructura rica.
             pass
        
        # Enforce Tutor constraint re-looping matches properly
        tutor_time_subject_map = defaultdict(lambda: defaultdict(list)) # (tutor, day, time) -> subject -> [vars]
        
        for k, v in matches.items():
            t_id, d, t = k[1], k[2], k[3]
            subj = v['info'][0].subject_id
            tutor_time_subject_map[(t_id, d, t)][subj].append(v['var'])
            
        for time_key, subj_map in tutor_time_subject_map.items():
            # time_key = (tutor, day, time)
            
            # Crear booleano "subject_active" para cada materia
            subj_actives = []
            for s_id, vars_list in subj_map.items():
                is_active = model.NewBoolVar(f'active_{time_key}_{s_id}')
                model.Add(sum(vars_list) > 0).OnlyEnforceIf(is_active)
                model.Add(sum(vars_list) == 0).OnlyEnforceIf(is_active.Not())
                subj_actives.append(is_active)
                
                # Capacidad Grupo (ej. 5 max)
                model.Add(sum(vars_list) <= 5)
            
            # Solo 1 materia activa por slot de tutor
            model.Add(sum(subj_actives) <= 1)

        # Función Objetivo
        model.Maximize(sum(m['var'] * m['score'] for m in matches.values()))

        # Resolver
        print("🧩 Resolviendo modelo...")
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = 10.0
        status = solver.Solve(model)

        if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            print(f"✅ Solución encontrada ({solver.ObjectiveValue()})")
            for k, m in matches.items():
                if solver.Value(m['var']):
                    req, tutor, day, time = m['info']
                    price = req.subject_group_price if req.preference == 'grupal' else req.subject_individual_price
                    
                    proposals.append(MatchProposal(
                        student_id=req.student_id,
                        student_name=req.student_name,
                        tutor_id=tutor.id,
                        tutor_name=tutor.name,
                        subject_id=req.subject_id,
                        subject_name=req.subject_name,
                        proposed_day=day,
                        proposed_time=time,
                        duration_minutes=60,
                        type=req.preference,
                        price=price,
                        score=float(m['score'])
                    ))
        else:
            print("⚠️ No se encontró solución factible")

        return proposals

    def _find_common_slots(self, s_avail, t_avail):
        common = []
        # Normalizar para comparación
        s_set = set((s.day, s.start_time) for s in s_avail)
        t_set = set((t.day, t.start_time) for t in t_avail)
        
        # Intersección directa (suponiendo slots alineados)
        # Mejora: Chequear rangos. Por ahora exact match.
        for slot in s_set.intersection(t_set):
            common.append(slot)
            
        return list(common)
    
    def save_class(self, proposal: MatchProposal) -> str:
        # Calcular fecha real (próximo día X)
        days_map = {'monday': 0, 'tuesday': 1, 'wednesday': 2, 'thursday': 3, 'friday': 4}
        from datetime import datetime, timedelta
        today = datetime.now()
        target = days_map.get(proposal.proposed_day.lower(), 0)
        current = today.weekday()
        days_ahead = target - current
        if days_ahead <= 0: days_ahead += 7
        date = today + timedelta(days=days_ahead)
        scheduled_at = f"{date.strftime('%Y-%m-%d')}T{proposal.proposed_time}:00"
        
        res = self.supabase.table('classes').insert({
            'student_id': proposal.student_id,
            'tutor_id': proposal.tutor_id,
            'subject_id': proposal.subject_id,
            'scheduled_at': scheduled_at,
            'type': proposal.type,
            'status': 'confirmed',
            'price': proposal.price,
            'is_open': (proposal.type == 'grupal')
        }).execute()
        
        return res.data[0]['id']

    def get_tutor_availability_table(self, subject_id):
        # Helper para frontend
        return []
