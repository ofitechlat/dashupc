-- Limpiar datos existentes (¡Cuidado! Borra todo)
TRUNCATE TABLE course_requests, classes, tutors, students, subjects CASCADE;

-- 1. Insertar Materias
INSERT INTO subjects (name, category, individual_price, group_price) VALUES
('Matemáticas 7mo', 'iii_ciclo', 5000, 2500),
('Matemáticas 8vo', 'iii_ciclo', 5000, 2500),
('Ciencias 9no', 'iii_ciclo', 5000, 2500),
('Español Bachillerato', 'diversificada', 6000, 3000),
('Estudios Sociales Bachillerato', 'diversificada', 6000, 3000),
('Matemáticas Bachillerato', 'diversificada', 6000, 3000),
('Biología Bachillerato', 'diversificada', 6000, 3000),
('Física Bachillerato', 'diversificada', 6000, 3000),
('Química Bachillerato', 'diversificada', 6000, 3000),
('Inglés Bachillerato', 'diversificada', 6000, 3000),
('Cálculo I', 'universidad', 8000, 4000),
('Álgebra Lineal', 'universidad', 8000, 4000),
('Estadística', 'universidad', 8000, 4000);

-- 2. Insertar Tutores
-- Nota: Usamos subconsultas para obtener los IDs de las materias recién creadas
WITH 
  s_algebra AS (SELECT id FROM subjects WHERE name = 'Álgebra Lineal'),
  s_mate7 AS (SELECT id FROM subjects WHERE name = 'Matemáticas 7mo'),
  s_mate8 AS (SELECT id FROM subjects WHERE name = 'Matemáticas 8vo'),
  s_mateb AS (SELECT id FROM subjects WHERE name = 'Matemáticas Bachillerato'),
  s_espanol AS (SELECT id FROM subjects WHERE name = 'Español Bachillerato'),
  s_sociales AS (SELECT id FROM subjects WHERE name = 'Estudios Sociales Bachillerato'),
  s_estadistica AS (SELECT id FROM subjects WHERE name = 'Estadística'),
  s_biologia AS (SELECT id FROM subjects WHERE name = 'Biología Bachillerato'),
  s_fisica AS (SELECT id FROM subjects WHERE name = 'Física Bachillerato'),
  s_calculo AS (SELECT id FROM subjects WHERE name = 'Cálculo I')

INSERT INTO tutors (name, phone, score, subject_ids, hourly_rate, availability) VALUES 
(
  'Yuli Navarro', '+50672275516', 95, 
  ARRAY[(SELECT id FROM s_algebra), (SELECT id FROM s_mate7), (SELECT id FROM s_mate8), (SELECT id FROM s_mateb)],
  5000,
  '[
    {"day": "monday", "startTime": "17:00", "endTime": "22:00", "recurring": true},
    {"day": "wednesday", "startTime": "17:00", "endTime": "22:00", "recurring": true},
    {"day": "friday", "startTime": "09:00", "endTime": "12:00", "recurring": true}
  ]'::jsonb
),
(
  'Arecio Herrera', '+50672426947', 88,
  ARRAY[(SELECT id FROM s_espanol), (SELECT id FROM s_sociales)],
  5000,
  '[
    {"day": "monday", "startTime": "08:00", "endTime": "12:00", "recurring": true},
    {"day": "tuesday", "startTime": "08:00", "endTime": "12:00", "recurring": true}
  ]'::jsonb
),
(
  'Alonso', '+50683591834', 90,
  ARRAY[(SELECT id FROM s_estadistica)],
  5000,
  '[
    {"day": "thursday", "startTime": "14:00", "endTime": "18:00", "recurring": true}
  ]'::jsonb
),
(
  'Isa', '+50670608612', 98,
  ARRAY[(SELECT id FROM s_biologia), (SELECT id FROM s_fisica), (SELECT id FROM s_calculo)],
  5000,
  '[
    {"day": "monday", "startTime": "08:00", "endTime": "12:00", "recurring": true},
    {"day": "thursday", "startTime": "14:00", "endTime": "18:00", "recurring": true}
  ]'::jsonb
);

-- 3. Insertar Estudiantes
INSERT INTO students (name, phone, availability) VALUES
('Hellen', '+50663653584', '[{"day": "monday", "startTime": "08:00", "endTime": "18:00", "recurring": true}]'::jsonb),
('Abdiel', '+50660769874', '[{"day": "monday", "startTime": "15:00", "endTime": "20:00", "recurring": true}]'::jsonb),
('Paquito', '+50660000001', '[{"day": "wednesday", "startTime": "17:00", "endTime": "22:00", "recurring": true}]'::jsonb),
('Sebas', '+50660000002', '[{"day": "wednesday", "startTime": "17:00", "endTime": "22:00", "recurring": true}]'::jsonb);

-- 4. Insertar Solicitudes (Course Requests)
WITH 
  st_hellen AS (SELECT id FROM students WHERE name = 'Hellen'),
  st_abdiel AS (SELECT id FROM students WHERE name = 'Abdiel'),
  st_paquito AS (SELECT id FROM students WHERE name = 'Paquito'),
  st_sebas AS (SELECT id FROM students WHERE name = 'Sebas'),
  
  sub_calculo AS (SELECT id FROM subjects WHERE name = 'Cálculo I'),
  sub_mate8 AS (SELECT id FROM subjects WHERE name = 'Matemáticas 8vo'),
  sub_algebra AS (SELECT id FROM subjects WHERE name = 'Álgebra Lineal')

INSERT INTO course_requests (student_id, subject_id, package_hours, preference, status) VALUES
(
  (SELECT id FROM st_hellen), (SELECT id FROM sub_calculo), 8, 'grupal', 'pending'
),
(
  (SELECT id FROM st_abdiel), (SELECT id FROM sub_mate8), 4, 'individual', 'pending'
),
(
  (SELECT id FROM st_paquito), (SELECT id FROM sub_algebra), 10, 'grupal', 'pending'
),
(
  (SELECT id FROM st_sebas), (SELECT id FROM sub_algebra), 4, 'grupal', 'pending'
);
