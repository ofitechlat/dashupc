
"""
Tutoring Scheduler Optimizer V2 (SQLite Version)
================================================
Algoritmo de optimización avanzado adaptado para SQLite local.
Mantiene la misma lógica de negocio V2:
- Paquetes de horas.
- Restricciones diarias.
- Priorización por ingresos.
"""

from dataclasses import dataclass
from typing import Optional, List, Dict, Tuple
import json
from ortools.sat.python import cp_model
from collections import defaultdict
import sys
import os

# Agregar path padre para importar database_sqlite
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from database_sqlite import db

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

class TutoringOptimizerSQLite:
    def __init__(self):
        self.requests: List[Request] = []
        self.tutors: List[Tutor] = []

    def load_data(self):
        print("📥 (SQLite) Cargando solicitudes...")
        raw_reqs = db.get_requests_with_details()
        
        self.requests = []
        for r in raw_reqs:
            avail = []
            if r['student_availability']:
                try:
                    s_avail = json.loads(r['student_availability'])
                    for slot in s_avail:
                        avail.append(TimeSlot(slot['day'], slot['startTime'], slot['endTime']))
                except json.JSONDecodeError:
                    print(f"⚠️ Error decode avail for student {r['student_name']}")
            
            self.requests.append(Request(
                id=r['id'],
                student_id=r['student_id'],
                student_name=r['student_name'],
                subject_id=r['subject_id'],
                subject_name=r['subject_name'],
                subject_category=r['subject_category'],
                subject_group_price=r['group_price'],
                subject_individual_price=r['individual_price'],
                package_hours=r.get('package_hours', 1),
                max_daily_hours=r.get('max_daily_hours', 2),
                preference=r['preference'],
                availability=avail
            ))

        print("📥 (SQLite) Cargando tutores...")
        raw_tutors = db.get_all_tutors()
        self.tutors = []
        for t in raw_tutors:
            avail = []
            if t['availability']:
                try:
                    t_avail = json.loads(t['availability'])
                    for slot in t_avail:
                        avail.append(TimeSlot(slot['day'], slot['startTime'], slot['endTime']))
                except:
                    pass
            
            subj_ids = []
            if t['subject_ids']:
                try:
                    subj_ids = json.loads(t['subject_ids'])
                except:
                    pass

            self.tutors.append(Tutor(
                id=t['id'],
                name=t['name'],
                subject_ids=subj_ids,
                score=t['score'],
                availability=avail
            ))
            
    def generate_proposals(self, subject_filter: str = None) -> List[MatchProposal]:
        self.load_data()
        model = cp_model.CpModel()
        proposals = []
        
        matches = {}
        vars_by_req = defaultdict(list)
        vars_by_req_day = defaultdict(lambda: defaultdict(list))
        vars_by_student_slot = defaultdict(list)
        vars_by_tutor_slot = defaultdict(list)
        
        print(f"🧮 Optimizando para {len(self.requests)} solicitudes con {len(self.tutors)} tutores...")

        # --- 1. Crear Variables ---
        for req in self.requests:
            if subject_filter and req.subject_id != subject_filter:
                continue
            
            # Weighted Revenue Score
            price = req.subject_group_price if req.preference == 'grupal' else req.subject_individual_price
            # Si paquete >= 8h, gran boost. Si >= 4h, mediano boost.
            package_boost = 1000 if req.package_hours >= 8 else (500 if req.package_hours >= 4 else 0)
            revenue_weight = int((req.package_hours * price) / 100) # Simple shrinking
            
            base_score = package_boost + revenue_weight
            
            for tutor in self.tutors:
                if req.subject_id not in tutor.subject_ids:
                    continue

                common = self._find_common_slots(req.availability, tutor.availability)
                
                for day, time in common:
                    var_name = f'{req.student_name}_{day}_{time}'
                    var = model.NewBoolVar(var_name)
                    
                    final_score = base_score + tutor.score
                    # Pequeño boost por grupal para romper empates a favor de grupos
                    if req.preference == 'grupal': final_score += 10
                    
                    matches[(req.id, tutor.id, day, time)] = {
                        'var': var, 
                        'score': final_score, 
                        'info': (req, tutor, day, time)
                    }
                    
                    vars_by_req[req.id].append(var)
                    vars_by_req_day[req.id][day].append(var)
                    vars_by_student_slot[(req.student_id, day, time)].append(var)
                    vars_by_tutor_slot[(tutor.id, day, time)].append(var)

        # --- 2. Restricciones ---

        # A. Cumplir Paquete de Horas
        for req in self.requests:
            vars_list = vars_by_req[req.id]
            if vars_list:
                # Intentar asignar <= package_hours
                # La función objetivo maximiza score, así que intentará llenar todo
                model.Add(sum(vars_list) <= req.package_hours)

        # B. Máximo Horas Diarias (Intensidad)
        for req in self.requests:
            for day, vars_list in vars_by_req_day[req.id].items():
                model.Add(sum(vars_list) <= req.max_daily_hours)

        # C. Conflicto Estudiante (No ubicuidad)
        for key, vars_list in vars_by_student_slot.items():
            model.Add(sum(vars_list) <= 1)

        # D. Conflicto Tutor (Agrupación Inteligente)
        # Un tutor puede atender >1 alumno SI es la misma materia y grupo.
        # Si materias distintas -> Conflicto.
        
        # Mapa: (tutor, day, time) -> subject_id -> [vars]
        tutor_slot_subj_map = defaultdict(lambda: defaultdict(list))
        
        for key, data in matches.items():
            t_id, d, t = key[1], key[2], key[3]
            s_id = data['info'][0].subject_id
            tutor_slot_subj_map[(t_id, d, t)][s_id].append(data['var'])
            
        for slot_key, subj_map in tutor_slot_subj_map.items():
            # Slots activos por materia
            subj_actives = []
            for s_id, vars_list in subj_map.items():
                is_active = model.NewBoolVar(f'active_{slot_key}_{s_id}')
                model.Add(sum(vars_list) > 0).OnlyEnforceIf(is_active)
                model.Add(sum(vars_list) == 0).OnlyEnforceIf(is_active.Not())
                subj_actives.append(is_active)
                
                # Capacidad max grupo (5)
                model.Add(sum(vars_list) <= 5)
            
            # Solo 1 materia a la vez
            model.Add(sum(subj_actives) <= 1)

        # --- 3. Resolver ---
        model.Maximize(sum(m['var'] * m['score'] for m in matches.values()))
        
        solver = cp_model.CpSolver()
        status = solver.Solve(model)

        print(f"🧩 Estado Solver: {solver.StatusName(status)}")
        
        if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            print(f"✅ Score Total: {solver.ObjectiveValue()}")
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
        
        return proposals

    def save_class(self, proposal: MatchProposal) -> str:
        # Calcular fecha real (próximo día X)
        days_map = {'monday': 0, 'tuesday': 1, 'wednesday': 2, 'thursday': 3, 'friday': 4}
        from datetime import datetime, timedelta
        import uuid
        
        today = datetime.now()
        target = days_map.get(proposal.proposed_day.lower(), 0)
        current = today.weekday()
        days_ahead = target - current
        if days_ahead <= 0: days_ahead += 7
        date = today + timedelta(days=days_ahead)
        scheduled_at = f"{date.strftime('%Y-%m-%d')}T{proposal.proposed_time}:00"
        
        # Generar ID único
        class_id = str(uuid.uuid4())
        
        # Insertar en SQLite
        data = {
            'id': class_id,
            'student_id': proposal.student_id,
            'tutor_id': proposal.tutor_id,
            'subject_id': proposal.subject_id,
            'scheduled_at': scheduled_at,
            'type': proposal.type,
            'status': 'confirmed',
            'price': proposal.price,
            'is_open': 1 if proposal.type == 'grupal' else 0, # SQLite usa 1/0 para bool
            'group_id': None # Por ahora simple
        }
        
        # Guardar usando el helper
        db.insert_class(data)
        print(f"✅ Clase guardada en SQLite: {class_id}")
        return class_id

    def get_tutor_availability_table(self, subject_id):
        # Retornar lista vacía para evitar errores en frontend por ahora
        return []
        # Simplificación: slots de 1 hora.
        # Asumimos que "start_time" es HH:00.
        # Generar set de horas (day, hour_int)
        
        def expansion(slots):
            expanded = set()
            for s in slots:
                try:
                    start_h = int(s.start_time.split(':')[0])
                    end_h = int(s.end_time.split(':')[0])
                    for h in range(start_h, end_h):
                        expanded.add((s.day, f"{h:02d}:00"))
                except: pass
            return expanded

        s_set = expansion(s_avail)
        t_set = expansion(t_avail)
        
        common = sorted(list(s_set.intersection(t_set)))
        return common

if __name__ == "__main__":
    opt = TutoringOptimizerSQLite()
    results = opt.generate_proposals()
    
    with open("optimization_results.txt", "w", encoding="utf-8") as f:
        f.write("📊 RESULTADOS DE OPTIMIZACIÓN:\n")
        by_student = defaultdict(list)
        for p in results:
            by_student[p.student_name].append(p)
        
        for name, props in by_student.items():
            f.write(f"\n👤 {name}: {len(props)} slots asignados\n")
            for p in sorted(props, key=lambda x: (x.proposed_day, x.proposed_time)):
                f.write(f"   - {p.proposed_day} {p.proposed_time} -> {p.subject_name} ({p.type}) con {p.tutor_name} (Score: {p.score})\n")

        f.write("\n🤔 ANÁLISIS DE FALLOS:\n")
        all_students = set(r.student_name for r in opt.requests)
        allocated_students = set(by_student.keys())
        missing = all_students - allocated_students
        if missing:
            f.write(f"❌ Sin asignar: {', '.join(missing)}\n")
        else:
            f.write("✅ Todos los estudiantes recibieron al menos 1 clase.\n")
    
    # Print minimal confirmation to console
    print("Optimization finished. Results written to optimization_results.txt")
