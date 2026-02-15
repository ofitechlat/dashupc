from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict
import json
import os
import io
import zipfile
from pathlib import Path
from datetime import datetime
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/api/sandbox", tags=["sandbox"])

# Single Source of Truth for Data
SANDBOX_FILE = Path(__file__).parent.parent / "sandbox_data.json"

class SandboxUpdate(BaseModel):
    students: List[dict]
    tutors: List[dict]
    subjects: List[dict]
    terms: List[dict] = []

@router.get("/data")
async def get_sandbox_data():
    if not SANDBOX_FILE.exists():
        return {"students": [], "tutors": [], "subjects": [], "terms": []}
    try:
        with open(SANDBOX_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        return {"students": [], "tutors": [], "subjects": [], "terms": []}

@router.post("/save")
async def save_sandbox_data(data: SandboxUpdate):
    try:
        with open(SANDBOX_FILE, 'w', encoding='utf-8') as f:
            json.dump(data.dict(), f, indent=4, ensure_ascii=False)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/optimize")
async def run_sandbox_optimization(data: dict):
    try:
        results = {
            "groups": [], 
            "student_ltv": [], 
            "fulfillment_status": [], 
            "professor_gaps": [], 
            "conflicts": [],
            "global_fulfillment_percent": 0,
            "has_conflicts": False,
            "conflict_count": 0,
            # NEW: Pre-optimization gap analysis
            "pre_analysis": {
                "ghost_courses": [],      # Subjects no professor can teach
                "schedule_mismatches": [], # Subjects where professor exists but no overlap
                "bottlenecks": [],        # Resources that force priority decisions
                "viability_summary": {}   # Per-student viability before optimization
            }
        }
        
        source_students = data.get('students') or []
        tutors = data.get('tutors') or []
        subjects_list = data.get('subjects') or []
        
        subjects_map = {s['id']: s['name'] for s in subjects_list if isinstance(s, dict) and 'id' in s}
        selected_term = data.get('selected_term', 'all')
        
        active_students = source_students
        if selected_term != 'all':
            active_students = [s for s in source_students if s.get('term_id') == selected_term]
        
        # ========== PRE-OPTIMIZATION GAP ANALYSIS ==========
        
        # Build complete tutor coverage map: {subject_id: [{tutor_id, tutor_name, slots}]}
        tutor_offerings = {}
        for tutor in tutors:
            tutor_id = tutor.get('id')
            tutor_name = tutor.get('name')
            tutor_slots = set(tutor.get('availability') or [])
            specialties = tutor.get('specialties') or tutor.get('subjects') or []
            
            for subj_id in specialties:
                if subj_id not in tutor_offerings:
                    tutor_offerings[subj_id] = []
                tutor_offerings[subj_id].append({
                    "tutor_id": tutor_id,
                    "tutor_name": tutor_name,
                    "slots": tutor_slots
                })
        
        # Analyze each student's viability BEFORE optimization
        for student in active_students:
            student_id = student.get('id')
            student_name = student.get('name')
            student_subjects = student.get('subjects') or []
            student_slots = set(student.get('availability') or [])
            student_level = student.get('level', 'Otros')
            
            student_viability = {
                "student_id": student_id,
                "student_name": student_name,
                "total_subjects": len(student_subjects),
                "viable_subjects": 0,
                "issues": []
            }
            
            for subj_id in student_subjects:
                subj_name = subjects_map.get(subj_id, subj_id)
                
                # Check 1: Does ANY professor teach this subject?
                if subj_id not in tutor_offerings:
                    student_viability["issues"].append({
                        "subject": subj_name,
                        "type": "GHOST_COURSE",
                        "detail": f"Nadie da {subj_name}. Se requiere contratar profesor."
                    })
                    # Add to global ghost courses if not already there
                    ghost = {"subject_id": subj_id, "subject_name": subj_name, "level": student_level, "affected_students": [student_name]}
                    existing_ghost = next((g for g in results["pre_analysis"]["ghost_courses"] if g["subject_id"] == subj_id), None)
                    if existing_ghost:
                        if student_name not in existing_ghost["affected_students"]:
                            existing_ghost["affected_students"].append(student_name)
                    else:
                        results["pre_analysis"]["ghost_courses"].append(ghost)
                    continue
                
                # Check 2: Does any professor's schedule overlap with student's?
                has_overlap = False
                for offering in tutor_offerings[subj_id]:
                    overlap = student_slots.intersection(offering["slots"])
                    if overlap:
                        has_overlap = True
                        student_viability["viable_subjects"] += 1
                        break
                
                if not has_overlap:
                    student_viability["issues"].append({
                        "subject": subj_name,
                        "type": "SCHEDULE_MISMATCH",
                        "detail": f"Existe profesor pero horarios no coinciden para {subj_name}."
                    })
                    available_tutors = [t["tutor_name"] for t in tutor_offerings[subj_id]]
                    results["pre_analysis"]["schedule_mismatches"].append({
                        "student_name": student_name,
                        "subject_name": subj_name,
                        "student_slots": list(student_slots),
                        "available_tutors": available_tutors,
                        "tutor_slots": list(tutor_offerings[subj_id][0]["slots"]) if tutor_offerings[subj_id] else []
                    })
            
            # Calculate viability percentage
            viability_pct = round((student_viability["viable_subjects"] / student_viability["total_subjects"]) * 100) if student_viability["total_subjects"] > 0 else 0
            student_viability["viability_percent"] = viability_pct
            student_viability["status"] = "viable" if viability_pct == 100 else "partial" if viability_pct > 0 else "impossible"
            
            results["pre_analysis"]["viability_summary"][student_id] = student_viability
        
        # Identify bottlenecks (slots with high demand)
        slot_demand = {}  # {slot: {students: [], tutors: []}}
        for student in active_students:
            for slot in student.get('availability') or []:
                if slot not in slot_demand:
                    slot_demand[slot] = {"students": [], "tutors": []}
                slot_demand[slot]["students"].append(student.get('name'))
        
        for tutor in tutors:
            for slot in tutor.get('availability') or []:
                if slot in slot_demand:
                    slot_demand[slot]["tutors"].append(tutor.get('name'))
        
        # Flag bottlenecks (high student demand, low tutor supply)
        for slot, demand in slot_demand.items():
            student_count = len(demand["students"])
            tutor_count = len(demand["tutors"])
            if student_count > 3 and tutor_count < 2:
                results["pre_analysis"]["bottlenecks"].append({
                    "slot": slot,
                    "student_demand": student_count,
                    "tutor_supply": tutor_count,
                    "alert": f"¡Cuello de botella! {student_count} estudiantes pero solo {tutor_count} profesor(es) disponible(s)."
                })
        
        # ========== END PRE-ANALYSIS ==========
        
        # ========== GATEKEEPER: Block optimization if critical issues exist ==========
        ghost_count = len(results["pre_analysis"]["ghost_courses"])
        mismatch_count = len(results["pre_analysis"]["schedule_mismatches"])
        impossible_students = [s for s in results["pre_analysis"]["viability_summary"].values() if s.get("status") == "impossible"]
        
        # Calculate how severe the issues are
        total_issue_count = ghost_count + mismatch_count + len(impossible_students)
        force_run = data.get('force_optimization', False)  # User can override with this flag
        
        results["pre_analysis"]["critical_issue_count"] = total_issue_count
        results["pre_analysis"]["can_proceed"] = total_issue_count == 0 or force_run
        results["pre_analysis"]["blocked"] = total_issue_count > 0 and not force_run
        
        # Generate actionable summary
        if ghost_count > 0:
            results["pre_analysis"]["action_required"] = results["pre_analysis"].get("action_required", [])
            results["pre_analysis"]["action_required"].append({
                "type": "HIRE_PROFESSOR",
                "count": ghost_count,
                "message": f"Contratar {ghost_count} profesor(es) para materias sin cobertura."
            })
        
        if mismatch_count > 0:
            results["pre_analysis"]["action_required"] = results["pre_analysis"].get("action_required", [])
            results["pre_analysis"]["action_required"].append({
                "type": "ADJUST_SCHEDULE",
                "count": mismatch_count,
                "message": f"Ajustar horarios de {mismatch_count} caso(s) con incompatibilidad."
            })
        
        # IF BLOCKED: Return ONLY the pre-analysis without running the optimizer
        if results["pre_analysis"]["blocked"]:
            results["optimization_blocked"] = True
            results["block_reason"] = f"Existen {total_issue_count} problemas críticos que impiden generar un plan viable."
            results["block_message"] = "⚠️ OPTIMIZACIÓN BLOQUEADA: El sistema detectó materias sin profesor y/o horarios incompatibles. Resuelve estos problemas antes de continuar, o activa 'Forzar Optimización' para generar un plan parcial."
            
            # Still provide empty structures for frontend compatibility
            results["groups"] = []
            results["student_ltv"] = []
            results["fulfillment_status"] = []
            results["professor_gaps"] = []
            results["global_fulfillment_percent"] = 0
            
            return {"success": False, "blocked": True, "results": results}
        
        # ========== PROCEED WITH OPTIMIZATION (only if not blocked) ==========

        assigned_subjects = {}  # {student_id: set of assigned subject_ids}
        
        # CRITICAL FIX: Track student slot usage with (student_id, slot) only - NO subject_id
        # This prevents double-booking a student in the same timeslot
        student_slot_usage = {}  # {student_id: {slot: subject_id}} - tracks which slot is used for what
        
        # CRITICAL FIX #2: Track TUTOR slot usage to prevent professor double-booking
        tutor_slot_usage = {}  # {tutor_id: {slot: subject_id}} - prevents Prof. Mario from teaching Sétimo AND Octavo at same time
        
        # Build a map of all available tutors by subject
        tutor_coverage = {}  # {subject_id: [(tutor, slots)]}
        for tutor in tutors:
            specialties = tutor.get('specialties') or tutor.get('subjects') or []
            for subj in specialties:
                if subj not in tutor_coverage:
                    tutor_coverage[subj] = []
                tutor_coverage[subj].append({
                    "tutor_name": tutor.get('name'),
                    "slots": tutor.get('availability') or []
                })
        
        for tutor in tutors:
            tutor_id = tutor.get('id')
            t_avail = tutor.get('availability') or []
            t_rate = tutor.get('rate', 0)
            specialties = tutor.get('specialties') or tutor.get('subjects') or []
            
            for subject_id in specialties:
                levels = {}
                for s in active_students:
                    if subject_id in (s.get('subjects') or []):
                        lvl = s.get('level', 'Otros')
                        if lvl not in levels: levels[lvl] = []
                        levels[lvl].append(s)
                
                for lvl, students_in_lvl in levels.items():
                    for slot in t_avail:
                        # CRITICAL: Check if TUTOR is already booked for this slot
                        if tutor_id in tutor_slot_usage and slot in tutor_slot_usage[tutor_id]:
                            # Tutor already teaching another class at this time - skip
                            continue
                        
                        group_students = []
                        for s in students_in_lvl:
                            student_id = s['id']
                            student_avail = s.get('availability') or []
                            
                            # Check if student is available in this slot
                            if slot not in student_avail:
                                continue
                            
                            # CRITICAL: Check if student is ALREADY booked for this slot (regardless of subject)
                            if student_id in student_slot_usage and slot in student_slot_usage[student_id]:
                                # Student is already booked - skip to prevent double-booking
                                continue
                            
                            group_students.append(s)
                        
                        if group_students:
                            # Mark tutor slot as used
                            if tutor_id not in tutor_slot_usage:
                                tutor_slot_usage[tutor_id] = {}
                            tutor_slot_usage[tutor_id][slot] = f"{subject_id}_{lvl}"
                            
                            for s in group_students:
                                student_id = s['id']
                                # Mark this slot as used for this student
                                if student_id not in student_slot_usage:
                                    student_slot_usage[student_id] = {}
                                student_slot_usage[student_id][slot] = subject_id
                                
                                # Track subject assignment
                                if student_id not in assigned_subjects:
                                    assigned_subjects[student_id] = set()
                                assigned_subjects[student_id].add(subject_id)
                                
                            total_rev = sum(s.get('revenue', 0) for s in group_students)
                            tutor_cost = t_rate * 4
                            async_cost = 6000 
                            profit = total_rev - tutor_cost - async_cost
                            roi = (profit / total_rev * 100) if total_rev > 0 else 0
                            health = "green" if roi > 50 else "yellow" if roi > 25 else "red"
                            
                            student_details = [{
                                "id": s.get('id'),
                                "name": s.get('name') or s.get('id', 'Alumno'),
                                "phone": s.get('phone') or 'N/A',
                                "term_id": s.get('term_id'),
                                "level": s.get('level')
                            } for s in group_students]
                            
                            base_name = subjects_map.get(subject_id, subject_id)
                            subj_label = f"{base_name} ({lvl})" if lvl.lower() not in base_name.lower() else base_name
                            
                            results["groups"].append({
                                "subject_name": subj_label,
                                "subject_id": subject_id,
                                "level": lvl,
                                "tutor": tutor.get('name', 'N/A'),
                                "tutor_phone": tutor.get('phone', 'N/A'),
                                "slot": slot,
                                "students": student_details,
                                "total_revenue": total_rev,
                                "tutor_rate": tutor_cost,
                                "async_cost": async_cost,
                                "profit": profit,
                                "health": health
                            })

        # === FULFILLMENT ANALYSIS ===
        unmet_demands = []  # For professor gap analysis
        total_fulfillment = 0
        
        for s in active_students:
            contracted = s.get('subjects') or []
            assigned = list(assigned_subjects.get(s['id'], set()))
            unassigned = [subj for subj in contracted if subj not in assigned]
            
            fulfillment_pct = round((len(assigned) / len(contracted)) * 100) if contracted else 100
            total_fulfillment += fulfillment_pct
            
            if len(unassigned) == 0:
                status = "complete"
            elif len(assigned) > 0:
                status = "partial"
            else:
                status = "unassigned"
            
            # Determine reasons for unassigned subjects
            unassigned_reasons = []
            for subj_id in unassigned:
                subj_name = subjects_map.get(subj_id, subj_id)
                if subj_id not in tutor_coverage:
                    reason = "NO_PROFESSOR"
                    unassigned_reasons.append({"subject": subj_name, "reason": reason, "detail": f"No hay profesor que enseñe {subj_name}"})
                    unmet_demands.append({"subject_id": subj_id, "subject_name": subj_name, "level": s.get('level'), "student_slots": s.get('availability', [])})
                else:
                    # Check if schedule conflict
                    student_slots = set(s.get('availability') or [])
                    tutor_slots = set()
                    for tc in tutor_coverage[subj_id]:
                        tutor_slots.update(tc['slots'])
                    if not student_slots.intersection(tutor_slots):
                        reason = "SCHEDULE_CONFLICT"
                        unassigned_reasons.append({"subject": subj_name, "reason": reason, "detail": f"Horarios incompatibles para {subj_name}"})
                        unmet_demands.append({"subject_id": subj_id, "subject_name": subj_name, "level": s.get('level'), "student_slots": list(student_slots)})
                    else:
                        reason = "CAPACITY_OR_ALREADY_ASSIGNED"
                        unassigned_reasons.append({"subject": subj_name, "reason": reason, "detail": f"Posible conflicto de capacidad en {subj_name}"})
            
            # Prorated revenue calculation
            prorated_revenue = round(s.get('revenue', 0) * (fulfillment_pct / 100))
            
            results["fulfillment_status"].append({
                "student_id": s['id'],
                "student_name": s.get('name', 'Alumno'),
                "phone": s.get('phone', 'N/A'),
                "subjects_contracted": [subjects_map.get(sub, sub) for sub in contracted],
                "subjects_assigned": [subjects_map.get(sub, sub) for sub in assigned],
                "subjects_pending": [subjects_map.get(sub, sub) for sub in unassigned],
                "status": status,
                "fulfillment_percent": fulfillment_pct,
                "unassigned_reasons": unassigned_reasons,
                "original_revenue": s.get('revenue', 0),
                "prorated_revenue": prorated_revenue
            })
            
            # LTV Calculation
            student_groups = [g for g in results["groups"] if any(st['id'] == s['id'] for st in g['students'])]
            total_assigned_cost = sum((g['tutor_rate'] + g['async_cost']) / len(g['students']) for g in student_groups)
            final_cost = total_assigned_cost if total_assigned_cost > 0 else 15000
            profit = prorated_revenue - final_cost
            margin = round((profit / prorated_revenue) * 100) if prorated_revenue > 0 else 0
            
            results["student_ltv"].append({
                "id": s.get('id'),
                "name": s.get('name') or s.get('id', 'Alumno'),
                "phone": s.get('phone') or 'N/A',
                "revenue": prorated_revenue,
                "original_revenue": s.get('revenue', 0),
                "cost": round(final_cost),
                "profit": round(profit),
                "margin": margin,
                "fulfillment_percent": fulfillment_pct,
                "status": status
            })

        # Global fulfillment
        results["global_fulfillment_percent"] = round(total_fulfillment / len(active_students)) if active_students else 100
        
        # === PROFESSOR GAPS ===
        gap_summary = {}
        for demand in unmet_demands:
            key = (demand['subject_id'], demand['level'])
            if key not in gap_summary:
                gap_summary[key] = {"subject_name": demand['subject_name'], "level": demand['level'], "required_slots": set(), "student_count": 0}
            gap_summary[key]["required_slots"].update(demand['student_slots'])
            gap_summary[key]["student_count"] += 1
        
        for key, gap in gap_summary.items():
            slots_str = ", ".join(list(gap["required_slots"])[:5])  # Limit to 5 slots
            results["professor_gaps"].append({
                "subject_name": gap["subject_name"],
                "level": gap["level"],
                "required_slots": list(gap["required_slots"]),
                "student_count": gap["student_count"],
                "suggested_action": f"Contratar profesor de {gap['subject_name']} ({gap['level']}) disponible en: {slots_str}"
            })

        return {"success": True, "results": results}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/export-zip")
async def export_sandbox_zip(results: dict):
    zip_buffer = io.BytesIO()
    try:
        with zipfile.ZipFile(zip_buffer, "a", zipfile.ZIP_DEFLATED, False) as zip_file:
            # 1. Horarios para Profesores
            tutors = {}
            for group in results.get('groups', []):
                tname = group.get('tutor', 'N/A')
                if tname not in tutors: tutors[tname] = {"phone": group.get('tutor_phone', 'N/A'), "classes": []}
                tutors[tname]["classes"].append(group)
                
            for tname, tdata in tutors.items():
                content = f"HORARIO PARA: {tname}\nTEL: {tdata['phone']}\n\nGRUPOS:\n"
                for g in tdata['classes']:
                    content += f"- {g['subject_name']} ({g['slot']})\n  Alumnos: {', '.join([s['name'] for s in g.get('students', [])])}\n"
                
                # Sanitize filename for Windows
                safe_tname = "".join(c for c in tname if c.isalnum() or c in (' ', '_')).strip().replace(' ', '_')
                zip_file.writestr(f"profesores/{safe_tname}.txt", content)

            # 2. Horarios para Estudiantes
            students_map = {}
            for group in results.get('groups', []):
                for s in group.get('students', []):
                    sname = s.get('name', s.get('id', 'Alumno'))
                    if sname not in students_map: students_map[sname] = {"phone": s.get('phone', 'N/A'), "classes": []}
                    students_map[sname]["classes"].append(group)
                    
            for sname, sdata in students_map.items():
                content = f"HORARIO PARA: {sname}\nTEL: {sdata['phone']}\n\nCLASES:\n"
                for g in sdata['classes']:
                    content += f"- {g['subject_name']} ({g['slot']}) - Prof: {g['tutor']}\n"
                
                # Sanitize filename for Windows
                safe_sname = "".join(c for c in sname if c.isalnum() or c in (' ', '_')).strip().replace(' ', '_')
                zip_file.writestr(f"estudiantes/{safe_sname}.txt", content)

        zip_buffer.seek(0)
        return StreamingResponse(
            zip_buffer, 
            media_type="application/x-zip-compressed",
            headers={"Content-Disposition": f"attachment; filename=horarios_mep_{datetime.now().strftime('%Y%m%d_%H%M')}.zip"}
        )
    except Exception as e:
        print(f"❌ Error generating ZIP: {e}")
        raise HTTPException(status_code=500, detail=str(e))
