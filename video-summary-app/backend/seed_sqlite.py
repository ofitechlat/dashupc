
import json
import uuid
from database_sqlite import db

# Generador de IDs
def gen_id(): return str(uuid.uuid4())

def seed_carlos_scenario():
    print("🌱 Sembrando escenario 'Profe Carlos' en SQLite...")
    
    # MATERIAS
    subjects = {
        'calc1': {'id': gen_id(), 'name': 'Cálculo I', 'category': 'universidad', 'grp': 4000, 'ind': 8000},
        'alg': {'id': gen_id(), 'name': 'Álgebra Lineal', 'category': 'universidad', 'grp': 4000, 'ind': 8000},
        'est': {'id': gen_id(), 'name': 'Estadística', 'category': 'universidad', 'grp': 4000, 'ind': 8000},
        'calc2': {'id': gen_id(), 'name': 'Cálculo II', 'category': 'universidad', 'grp': 4000, 'ind': 8000},
    }
    
    for k, v in subjects.items():
        db.execute("INSERT INTO subjects VALUES (?, ?, ?, ?, ?)", 
                   (v['id'], v['name'], v['category'], v['grp'], v['ind']))
        
    print(f"📚 {len(subjects)} materias insertadas.")

    # TUTOR: Carlos
    # Disponibilidad: Lunes a Viernes 11:00 - 21:00
    avail_carlos = []
    for day in ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']:
        avail_carlos.append({'day': day, 'startTime': '11:00', 'endTime': '21:00'})
        
    carlos_id = gen_id()
    db.execute("INSERT INTO tutors VALUES (?, ?, ?, ?, ?, ?)",
               (carlos_id, "Profe Carlos", 100, 40, json.dumps(avail_carlos), 
                json.dumps([s['id'] for s in subjects.values()])))
                
    print("👨‍🏫 Profe Carlos insertado.")

    # ESTUDIANTES
    # Ana: Lunes-Viernes 15:00-19:00. Pide: Calc I (8h, Grupal)
    ana_id = gen_id()
    avail_ana = [{"day": d, "startTime": "15:00", "endTime": "19:00"} for d in ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']]
    db.execute("INSERT INTO students VALUES (?, ?, ?)", (ana_id, "Ana", json.dumps(avail_ana)))
    
    db.execute("INSERT INTO course_requests VALUES (?, ?, ?, ?, ?, ?, ?)",
               (gen_id(), ana_id, subjects['calc1']['id'], 8, 2, 'grupal', 'pending'))

    # Beto: Lunes, Miercoles 11:00-13:00. Pide: Estadistica (4h, Indiv)
    beto_id = gen_id()
    avail_beto = [{"day": d, "startTime": "11:00", "endTime": "13:00"} for d in ['monday', 'wednesday']]
    db.execute("INSERT INTO students VALUES (?, ?, ?)", (beto_id, "Beto", json.dumps(avail_beto)))
    
    db.execute("INSERT INTO course_requests VALUES (?, ?, ?, ?, ?, ?, ?)",
               (gen_id(), beto_id, subjects['est']['id'], 4, 1, 'individual', 'pending'))

    # Carla: Lunes-Viernes 17:00-21:00. Pide: Algebra (10h, Grupal) - PRIORIDAD
    carla_id = gen_id()
    avail_carla = [{"day": d, "startTime": "17:00", "endTime": "21:00"} for d in ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']]
    db.execute("INSERT INTO students VALUES (?, ?, ?)", (carla_id, "Carla", json.dumps(avail_carla)))
    
    db.execute("INSERT INTO course_requests VALUES (?, ?, ?, ?, ?, ?, ?)",
               (gen_id(), carla_id, subjects['alg']['id'], 10, 2, 'grupal', 'pending'))

    # Dany: Lunes-Viernes 16:00-18:00. Pide: Calc I (4h, Grupal).
    # Debería agruparse con Ana en Calc I.
    dany_id = gen_id()
    avail_dany = [{"day": d, "startTime": "16:00", "endTime": "18:00"} for d in ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']]
    db.execute("INSERT INTO students VALUES (?, ?, ?)", (dany_id, "Dany", json.dumps(avail_dany)))
    
    db.execute("INSERT INTO course_requests VALUES (?, ?, ?, ?, ?, ?, ?)",
               (gen_id(), dany_id, subjects['calc1']['id'], 4, 1, 'grupal', 'pending'))

    print("🎓 4 Estudiantes y Solicitudes insertados.")
    print("✨ Seed completado. Listo para optimizar.")

if __name__ == "__main__":
    seed_carlos_scenario()
