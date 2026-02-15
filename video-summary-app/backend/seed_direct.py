
import os
import random
import psycopg2
from dotenv import load_dotenv
from pathlib import Path

# Cargar .env root
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

# Obtener credenciales
DB_PASS = os.getenv("contra_supa")
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL") 
# Extraer Project ID de la URL (https://xyz.supabase.co -> xyz)
PROJECT_REF = SUPABASE_URL.split("//")[1].split(".")[0]

DB_HOST = f"db.{PROJECT_REF}.supabase.co"
DB_USER = "postgres"
DB_NAME = "postgres"
DB_PORT = "5432"

print(f"🔌 Conectando a {DB_HOST}...")

try:
    conn = psycopg2.connect(
        host=DB_HOST,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASS,
        port=DB_PORT
    )
    conn.autocommit = True
    cur = conn.cursor()
    print("✅ Conexión exitosa")
    
    # Limpiar datos
    print("🧹 Limpiando tablas...")
    tables = ["course_requests", "classes", "tutors", "students", "subjects"]
    for t in tables:
        try:
            cur.execute(f"TRUNCATE TABLE {t} CASCADE;")
            print(f"- {t} truncada")
        except Exception as e:
            print(f"Warning truncating {t}: {e}")

    # 1. Insertar Materias
    print("📚 Insertando materias...")
    subjects = [
        ("Matemáticas 7mo", "iii_ciclo", 5000, 2500),
        ("Matemáticas 8vo", "iii_ciclo", 5000, 2500),
        ("Ciencias 9no", "iii_ciclo", 5000, 2500),
        ("Español Bachillerato", "diversificada", 6000, 3000),
        ("Estudios Sociales Bachillerato", "diversificada", 6000, 3000),
        ("Matemáticas Bachillerato", "diversificada", 6000, 3000),
        ("Biología Bachillerato", "diversificada", 6000, 3000),
        ("Física Bachillerato", "diversificada", 6000, 3000),
        ("Química Bachillerato", "diversificada", 6000, 3000),
        ("Inglés Bachillerato", "diversificada", 6000, 3000),
        ("Cálculo I", "universidad", 8000, 4000),
        ("Álgebra Lineal", "universidad", 8000, 4000),
        ("Estadística", "universidad", 8000, 4000)
    ]
    
    subj_ids = {}
    for name, cat, ind_p, grp_p in subjects:
        cur.execute(
            "INSERT INTO subjects (name, category, individual_price, group_price) VALUES (%s, %s, %s, %s) RETURNING id, name;",
            (name, cat, ind_p, grp_p)
        )
        row = cur.fetchone()
        subj_ids[row[1]] = row[0]

    # 2. Insertar Tutores
    print("👨‍🏫 Insertando tutores...")
    tutors = [
        ("Yuli Navarro", "+50672275516", 95, ["Álgebra Lineal", "Matemáticas 7mo", "Matemáticas 8vo", "Matemáticas Bachillerato"]),
        ("Arecio Herrera", "+50672426947", 88, ["Español Bachillerato", "Estudios Sociales Bachillerato"]),
        ("Alonso", "+50683591834", 90, ["Estadística"]),
        ("Isa", "+50670608612", 98, ["Biología Bachillerato", "Física Bachillerato", "Cálculo I"])
    ]
    
    tutor_ids = {}
    
    import json
    # Generar disponibilidad simple
    avail_week = [
        {"day": "monday", "startTime": "17:00", "endTime": "21:00", "recurring": True},
        {"day": "wednesday", "startTime": "17:00", "endTime": "21:00", "recurring": True}
    ]
    
    for name, phone, score, subj_names in tutors:
        s_ids = [subj_ids[n] for n in subj_names if n in subj_ids]
        cur.execute(
            "INSERT INTO tutors (name, phone, score, subject_ids, availability, hourly_rate) VALUES (%s, %s, %s, %s, %s, 5000) RETURNING id, name;",
            (name, phone, score, s_ids, json.dumps(avail_week))
        )
        row = cur.fetchone()
        tutor_ids[row[1]] = row[0]

    # 3. Insertar Estudiantes
    print("🎓 Insertando estudiantes...")
    students = [
        ("Hellen", "+50663653584"),
        ("Abdiel", "+50660769874"),
        ("Paquito", "+50660000001"),
        ("Sebas", "+50660000002")
    ]
    
    student_ids = {}
    for name, phone in students:
        cur.execute(
            "INSERT INTO students (name, phone, availability) VALUES (%s, %s, %s) RETURNING id, name;",
            (name, phone, json.dumps(avail_week)) # Asumimos misma disponibilidad para match fácil
        )
        row = cur.fetchone()
        student_ids[row[1]] = row[0]

    # 4. Insertar Solicitudes
    print("📝 Insertando solicitudes...")
    requests = [
        ("Hellen", "Cálculo I", 8, "grupal"),
        ("Abdiel", "Matemáticas 8vo", 4, "individual"),
        ("Paquito", "Álgebra Lineal", 10, "grupal"),
        ("Sebas", "Álgebra Lineal", 4, "grupal") # Match con Paquito?
    ]
    
    for s_name, sub_name, hrs, pref in requests:
        if s_name in student_ids and sub_name in subj_ids:
            cur.execute(
                "INSERT INTO course_requests (student_id, subject_id, package_hours, preference, status) VALUES (%s, %s, %s, %s, 'pending')",
                (student_ids[s_name], subj_ids[sub_name], hrs, pref)
            )

    print("✨ Datos insertados correctamente!")
    cur.close()
    conn.close()

except Exception as e:
    print(f"❌ Error DB: {e}")
    exit(1)
