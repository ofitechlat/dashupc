"""
MEP Group Optimization Solver (CP-SAT)
=====================================
Specialized solver for MEP and "Educación Abierta" that handles 
multi-subject students and minimizes total teacher hours.
"""

from ortools.sat.python import cp_model
from typing import List, Dict, Any
from dataclasses import dataclass

# Configuration for subject durations and costs
SUBJECT_CONFIG = {
    "mat_3": {"duration": 2},
    "mat_b": {"duration": 2},
}
ASYNC_COST_PER_STUDENT = 2000 # Costo de gestión asincrónica (plataforma/revisión)

@dataclass
class StudentRequest:
    id: str
    name: str
    level: str
    subjects: List[str] # ["mat_3", "esp_3"]
    availability: List[str] # ["mon_17", "mon_18"]
    revenue: float

@dataclass
class TutorOffer:
    id: str
    name: str
    rate: float
    specialties: List[str] # ["III Ciclo", "Bachillerato"]
    subjects: List[str]
    availability: List[str]

class MEPGroupOptimizer:
    def __init__(self, students: List[StudentRequest], tutors: List[TutorOffer]):
        self.students = students
        self.tutors = tutors
        self.model = cp_model.CpModel()
        self.slots = self._get_unique_slots()
        self.slot_map = self._map_slots()
        
    def _get_unique_slots(self):
        all_slots = set()
        for s in self.students: all_slots.update(s.availability)
        for t in self.tutors: all_slots.update(t.availability)
        return sorted(list(all_slots))

    def _map_slots(self):
        """Parses slots like 'mon_17' into (day_int, hour_int) for continuity checks."""
        days = {"mon": 0, "tue": 1, "wed": 2, "thu": 3, "fri": 4, "sat": 5, "sun": 6}
        mapping = {}
        for s in self.slots:
            try:
                parts = s.split('_')
                if len(parts) == 2:
                    d_str, h_str = parts
                    mapping[s] = (days.get(d_str, 0), int(h_str))
                else:
                    mapping[s] = (0, 0)
            except:
                mapping[s] = (0, 0)
        return mapping

    def solve(self):
        # Variables: x[student, tutor, slot, subject]
        x = {}
        tutor_slot_active = {}
        
        # 1. Variables and Tutor Active links
        for t_idx, tutor in enumerate(self.tutors):
            for slot in tutor.availability:
                tutor_slot_active[(t_idx, slot)] = self.model.NewBoolVar(f't{t_idx}_{slot}')

        for s_idx, student in enumerate(self.students):
            for t_idx, tutor in enumerate(self.tutors):
                if student.level in tutor.specialties:
                    common_subs = set(student.subjects).intersection(tutor.subjects)
                    common_slots = set(student.availability).intersection(tutor.availability)
                    for sub_id in common_subs:
                        for slot in common_slots:
                            v = self.model.NewBoolVar(f's{s_idx}_t{t_idx}_{slot}_{sub_id}')
                            x[(s_idx, t_idx, slot, sub_id)] = v
                            self.model.AddImplication(v, tutor_slot_active[(t_idx, slot)])

        # 2. Basic Constraints
        for s_idx in range(len(self.students)):
            for slot in self.slots:
                vars_in_slot = [x[k] for k in x if k[0] == s_idx and k[2] == slot]
                if vars_in_slot: self.model.Add(sum(vars_in_slot) <= 1)

        for t_idx in range(len(self.tutors)):
            for slot in self.slots:
                if (t_idx, slot) not in tutor_slot_active: continue
                vars_for_tutor = [x[k] for k in x if k[1] == t_idx and k[2] == slot]
                if vars_for_tutor:
                    self.model.Add(sum(vars_for_tutor) <= 25)
                    sub_ids = list(set(k[3] for k in x if k[1] == t_idx and k[2] == slot))
                    if len(sub_ids) > 1:
                        ts_vars = {}
                        for sid in sub_ids:
                            tsv = self.model.NewBoolVar(f'ts_{t_idx}_{slot}_{sid}')
                            ts_vars[sid] = tsv
                            for v in [x[k] for k in x if k[1] == t_idx and k[2] == slot and k[3] == sid]:
                                self.model.AddImplication(v, tsv)
                        self.model.Add(sum(ts_vars.values()) <= 1)

        # 3. Subject Duration & Continuity
        for s_idx in range(len(self.students)):
            student = self.students[s_idx]
            for sub_id in student.subjects:
                duration = SUBJECT_CONFIG.get(sub_id, {}).get("duration", 1)
                sub_vars = [x[k] for k in x if k[0] == s_idx and k[3] == sub_id]
                if not sub_vars: continue
                
                is_assigned = self.model.NewBoolVar(f'asig_s{s_idx}_{sub_id}')
                self.model.Add(sum(sub_vars) == duration * is_assigned)
                
                if duration > 1:
                    for k in [key for key in x if key[0] == s_idx and key[3] == sub_id]:
                        var = x[k]
                        t_idx, slot = k[1], k[2]
                        day, hour = self.slot_map[slot]
                        neighbors = []
                        for h_off in [-1, 1]:
                            n_slot = f"{slot.split('_')[0]}_{hour + h_off}"
                            if (s_idx, t_idx, n_slot, sub_id) in x:
                                neighbors.append(x[(s_idx, t_idx, n_slot, sub_id)])
                        if neighbors:
                            self.model.Add(sum(neighbors) >= 1).OnlyEnforceIf(var)
                        else:
                            self.model.Add(var == 0)

        # 4. Objective
        revenue_sum = []
        for k, var in x.items():
            num_subs = len(self.students[k[0]].subjects)
            rev_per_sub = int(self.students[k[0]].revenue) // num_subs
            revenue_sum.append(var * (rev_per_sub - ASYNC_COST_PER_STUDENT))
            
        cost_sum = [var * int(self.tutors[t_key[0]].rate) for t_key, var in tutor_slot_active.items()]
        
        self.model.Maximize(sum(revenue_sum) - sum(cost_sum))

        solver = cp_model.CpSolver()
        status = solver.Solve(self.model)

        groups = {}
        student_ltv = {s_idx: {"revenue": self.students[s_idx].revenue, "cost": 0, "name": self.students[s_idx].name} for s_idx in range(len(self.students))}

        if status == cp_model.OPTIMAL or status == cp_model.FEASIBLE:
            for k, var in x.items():
                if solver.Value(var):
                    s_idx, t_idx, slot, sub_id = k
                    g_key = (t_idx, slot, sub_id)
                    if g_key not in groups:
                        groups[g_key] = {
                            "tutor": self.tutors[t_idx].name,
                            "slot": slot,
                            "subject": sub_id,
                            "students": [],
                            "total_revenue": 0,
                            "tutor_rate": self.tutors[t_idx].rate,
                            "async_cost": 0,
                            "status": "proposed"
                        }
                    student = self.students[s_idx]
                    groups[g_key]["students"].append(student.name)
                    rev_per_sub = student.revenue / len(student.subjects)
                    groups[g_key]["total_revenue"] += rev_per_sub
                    groups[g_key]["async_cost"] += ASYNC_COST_PER_STUDENT
                    
                    # Estimate LTV: Each student in a group 'carries' 1/N of the tutor cost for that hour
                    # This is just for visualization in the dashboard
                    num_students_in_group = sum(1 for k2, v2 in x.items() if k2[1] == t_idx and k2[2] == slot and k2[3] == sub_id and solver.Value(v2))
                    student_ltv[s_idx]["cost"] += (self.tutors[t_idx].rate / num_students_in_group) + ASYNC_COST_PER_STUDENT

        results = []
        for g in groups.values():
            g["profit"] = g["total_revenue"] - g["tutor_rate"] - g["async_cost"]
            # Color code (Semáforo)
            margin = (g["profit"] / g["total_revenue"]) if g["total_revenue"] > 0 else 0
            if margin > 0.4: g["health"] = "green"
            elif margin > 0.1: g["health"] = "yellow"
            else: g["health"] = "red"
            results.append(g)
            
        final_out = {
            "groups": results,
            "student_ltv": [
                {
                    "name": v["name"],
                    "revenue": v["revenue"],
                    "cost": round(v["cost"]),
                    "profit": round(v["revenue"] - v["cost"]),
                    "margin": round(((v["revenue"] - v["cost"]) / v["revenue"] * 100) if v["revenue"] > 0 else 0, 1)
                } for v in student_ltv.values() if v["cost"] > 0
            ]
        }
        return final_out
