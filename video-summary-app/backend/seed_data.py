
import os
import random
from datetime import datetime, timedelta
from dotenv import load_dotenv
from supabase import create_client

# Cargar variables de entorno desde la raiz
from pathlib import Path
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print(f"❌ Error: Faltan credenciales de Supabase en {env_path}")
    print(f"URL: {SUPABASE_URL}")
    print(f"KEY: {SUPABASE_KEY is not None}")
    exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def authenticate():
    email = "seed_admin@example.com"
    password = "seed_password_123"
    try:
        supabase.auth.sign_in_with_password({"email": email, "password": password})
        print("🔐 Autenticado como Admin de Seed")
    except:
        print("⚠️ Usuario no encontrado, creando...")
        try:
            supabase.auth.sign_up({"email": email, "password": password})
            # Auto sign-in or wait for confirmation? In dev mode usually works.
            # Retry sign in
            supabase.auth.sign_in_with_password({"email": email, "password": password})
            print("🔐 Creado y Autenticado")
        except Exception as e:
            print(f"❌ Error autenticando: {e}")
            # If sign up requires email confirmation, this might fail. 
            # Fallback: Proceed hoping RLS allows anon or we have service role.
            pass

authenticate()

def clear_data():
    print("🧹 Limpiando datos existentes...")
    # Orden inverso por dependencias
    try: supabase.table("course_requests").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute(); print("- course_requests limpiada")
    except: print("! Error limpiando course_requests")
    
    try: supabase.table("classes").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute(); print("- classes limpiada")
    except: print("! Error limpiando classes")
    
    try: supabase.table("tutors").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute(); print("- tutors limpiada")
    except: print("! Error limpiando tutors")
    
    try: supabase.table("students").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute(); print("- students limpiada")
    except: print("! Error limpiando students")
    
    try: supabase.table("subjects").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute(); print("- subjects limpiada")
    except: print("! Error limpiando subjects")
    
    print("✅ Intento de limpieza completado")

def get_random_availability():
    days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
    slots = []
    
    # Generar entre 3 y 5 bloques de disponibilidad
    num_slots = random.randint(3, 5)
    selected_days = random.sample(days, min(len(days), num_slots))
    
    for day in selected_days:
        # Horas aleatorias entre 8am y 8pm
        start_hour = random.randint(8, 20) 
        slots.append({
            "day": day,
            "startTime": f"{start_hour:02d}:00",
            "endTime": f"{start_hour+1:02d}:00", # Bloques de 1 hora
            "recurring": True
        })
    return slots

def seed():
    print("Empezando carga de datos...")
    
    # 1. Crear Materias
    print("📚 Creando Materias...")
    subjects_data = [
        # III Ciclo
        {"name": "Matemáticas 7mo", "category": "iii_ciclo", "individual_price": 5000, "group_price": 2500},
        {"name": "Matemáticas 8vo", "category": "iii_ciclo", "individual_price": 5000, "group_price": 2500},
        {"name": "Ciencias 9no", "category": "iii_ciclo", "individual_price": 5000, "group_price": 2500},
        
        # Educación Diversificada
        {"name": "Español Bachillerato", "category": "diversificada", "individual_price": 6000, "group_price": 3000},
        {"name": "Matemáticas Bachillerato", "category": "diversificada", "individual_price": 6000, "group_price": 3000},
        {"name": "Estudios Sociales Bachillerato", "category": "diversificada", "individual_price": 6000, "group_price": 3000},
        {"name": "Biología Bachillerato", "category": "diversificada", "individual_price": 6000, "group_price": 3000},
        {"name": "Física Bachillerato", "category": "diversificada", "individual_price": 6000, "group_price": 3000},
        {"name": "Química Bachillerato", "category": "diversificada", "individual_price": 6000, "group_price": 3000},
        {"name": "Inglés Bachillerato", "category": "diversificada", "individual_price": 6000, "group_price": 3000},
        
        # Universidad
        {"name": "Cálculo I", "category": "universidad", "individual_price": 8000, "group_price": 4000},
        {"name": "Álgebra Lineal", "category": "universidad", "individual_price": 8000, "group_price": 4000},
        {"name": "Estadística", "category": "universidad", "individual_price": 8000, "group_price": 4000},
    ]
    
    created_subjects = {}
    for sub in subjects_data:
        res = supabase.table("subjects").insert(sub).execute()
        created_subjects[sub["name"]] = res.data[0]["id"]
        
    print(f"✅ {len(created_subjects)} materias creadas")

    # 2. Crear Tutores
    print("👨‍🏫 Creando Tutores...")
    tutors_data = [
        {
            "name": "Yuli Navarro", 
            "phone": "+50672275516", 
            "score": 95, 
            "subjects": ["Álgebra Lineal", "Matemáticas 7mo", "Matemáticas 8vo", "Matemáticas Bachillerato"],
            "availability": [
                {"day": "monday", "startTime": "17:00", "endTime": "22:00", "recurring": True}, # Lunes tarde/noche
                {"day": "wednesday", "startTime": "17:00", "endTime": "22:00", "recurring": True},
                {"day": "friday", "startTime": "09:00", "endTime": "12:00", "recurring": True}
            ]
        },
        {
            "name": "Arecio Herrera", 
            "phone": "+50672426947", 
            "score": 88, 
            "subjects": ["Español Bachillerato", "Estudios Sociales Bachillerato"],
            "availability": get_random_availability()
        },
        {
            "name": "Alonso", 
            "phone": "+50683591834", 
            "score": 90, 
            "subjects": ["Estadística"],
            "availability": get_random_availability() 
        },
        {
            "name": "Isa", 
            "phone": "+50670608612", 
            "score": 98, 
            "subjects": ["Biología Bachillerato", "Física Bachillerato", "Cálculo I"],
            "availability": [
               {"day": "monday", "startTime": "08:00", "endTime": "12:00", "recurring": True},
               {"day": "thursday", "startTime": "14:00", "endTime": "18:00", "recurring": True} 
            ]
        },
    ]

    for tutor in tutors_data:
        subject_ids = [created_subjects[name] for name in tutor["subjects"] if name in created_subjects]
        
        supabase.table("tutors").insert({
            "name": tutor["name"],
            "phone": tutor["phone"],
            "score": tutor["score"],
            "hourly_rate": 5000, # Base
            "subject_ids": subject_ids,
            "availability": tutor["availability"]
        }).execute()
        
    print(f"✅ {len(tutors_data)} tutores creados")

    # 3. Crear Estudiantes y Solicitudes
    print("🎓 Creando Estudiantes y Solicitudes...")
    students_data = [
        {"name": "Hellen", "phone": "+50663653584", "email": "hellen@example.com"},
        {"name": "Abdiel", "phone": "+50660769874", "email": "abdiel@example.com"},
        {"name": "Paquito", "phone": "+50660000001", "email": "paquito@example.com"},
        {"name": "Sebas", "phone": "+50660000002", "email": "sebas@example.com"},
    ]

    # Insertar estudiantes y guardar sus IDs
    student_ids = {}
    for stu in students_data:
        # Disponibilidad aleatoria para todos
        avail = get_random_availability()
        res = supabase.table("students").insert({
            "name": stu["name"],
            "phone": stu["phone"],
            "email": stu["email"],
            "availability": avail
        }).execute()
        student_ids[stu["name"]] = res.data[0]["id"]

    # Crear Solicitudes (Course Requests)
    requests = [
        # Hellen quiere Cálculo I, Grupal, 8 horas
        {
            "student_name": "Hellen",
            "subject_name": "Cálculo I",
            "hours": 8,
            "pref": "grupal"
        },
        # Abdiel quiere Mate 8vo, Individual, 4 horas
        {
            "student_name": "Abdiel",
            "subject_name": "Matemáticas 8vo",
            "hours": 4,
            "pref": "individual"
        },
        # Paquito quiere Álgebra, Grupal (Debería matchear con Yuli)
        {
            "student_name": "Paquito",
            "subject_name": "Álgebra Lineal",
            "hours": 10,
            "pref": "grupal"
        }
    ]

    count = 0
    for req in requests:
        if req["subject_name"] in created_subjects:
            supabase.table("course_requests").insert({
                "student_id": student_ids[req["student_name"]],
                "subject_id": created_subjects[req["subject_name"]],
                "package_hours": req["hours"],
                "preference": req["pref"],
                "status": "pending"
            }).execute()
            count += 1
            
    print(f"✅ {count} solicitudes de curso creadas")
    print("✨ Proceso completado exitosamente.")

if __name__ == "__main__":
    clear_data()
    seed()
