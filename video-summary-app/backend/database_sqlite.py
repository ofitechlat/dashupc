
import sqlite3
import json
from pathlib import Path
from dataclasses import dataclass
from typing import List, Any, Dict

DB_PATH = Path(__file__).parent / "local_tutoring.db"

class SQLiteClient:
    """
    Cliente wrapper para SQLite que imita métodos básicos de Supabase/PostgREST
    para facilitar la migración futura.
    """
    def __init__(self, db_path=DB_PATH):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        conn = sqlite3.connect(self.db_path)
        cur = conn.cursor()
        
        # 1. Subjects
        cur.execute("""
            CREATE TABLE IF NOT EXISTS subjects (
                id TEXT PRIMARY KEY,
                name TEXT,
                category TEXT,
                group_price REAL,
                individual_price REAL
            )
        """)
        
        # 2. Tutors
        cur.execute("""
            CREATE TABLE IF NOT EXISTS tutors (
                id TEXT PRIMARY KEY,
                name TEXT,
                score INTEGER DEFAULT 100,
                max_weekly_hours INTEGER,
                availability TEXT, 
                subject_ids TEXT 
            )
        """)
        
        # 3. Students
        cur.execute("""
            CREATE TABLE IF NOT EXISTS students (
                id TEXT PRIMARY KEY,
                name TEXT,
                availability TEXT 
            )
        """)
        
        # 4. Requests
        cur.execute("""
            CREATE TABLE IF NOT EXISTS course_requests (
                id TEXT PRIMARY KEY,
                student_id TEXT,
                subject_id TEXT,
                package_hours INTEGER,
                max_daily_hours INTEGER DEFAULT 2,
                preference TEXT,
                status TEXT DEFAULT 'pending',
                FOREIGN KEY(student_id) REFERENCES students(id),
                FOREIGN KEY(subject_id) REFERENCES subjects(id)
            )
        """)
        
        # 5. Classes (Output)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS classes (
                id TEXT PRIMARY KEY,
                student_id TEXT,
                tutor_id TEXT,
                subject_id TEXT,
                scheduled_at TEXT, -- ISO Format
                type TEXT,
                status TEXT,
                price REAL,
                is_open BOOLEAN,
                group_id TEXT
            )
        """)
        
        conn.commit()
        conn.close()

    def query(self, sql: str, params: tuple = ()):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute(sql, params)
        res = [dict(row) for row in cur.fetchall()]
        conn.commit()
        conn.close()
        return res

    def execute(self, sql: str, params: tuple = ()):
        conn = sqlite3.connect(self.db_path)
        cur = conn.cursor()
        cur.execute(sql, params)
        conn.commit()
        conn.close()
        
    def get_requests_with_details(self):
        """
        Simula el join: course_requests + students + subjects
        """
        sql = """
            SELECT 
                r.*,
                s.name as student_name, s.availability as student_availability,
                sub.name as subject_name, sub.category as subject_category, 
                sub.group_price, sub.individual_price
            FROM course_requests r
            JOIN students s ON r.student_id = s.id
            JOIN subjects sub ON r.subject_id = sub.id
            WHERE r.status = 'pending'
        """
        return self.query(sql)

    def get_all_tutors(self):
        return self.query("SELECT * FROM tutors")

    def insert_class(self, data: dict):
        keys = ', '.join(data.keys())
        questions = ', '.join(['?'] * len(data))
        values = tuple(data.values())
        sql = f"INSERT INTO classes ({keys}) VALUES ({questions})"
        self.execute(sql, values)

# Instancia Global
db = SQLiteClient()
