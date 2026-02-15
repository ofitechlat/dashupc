// =============================================
// TUTORING MANAGEMENT SYSTEM - TYPES
// =============================================

// Slot de disponibilidad (formato Google Calendar simplificado)
export interface AvailabilitySlot {
    day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
    startTime: string; // "HH:MM" formato 24h
    endTime: string;
    recurring: boolean; // true = se repite cada semana
    specificDate?: string; // ISO date para slots no recurrentes
}

// Tema del syllabus
export interface SyllabusTopic {
    id: string;
    title: string;
    description: string;
    order: number;
    completed?: boolean;
}

// Materia/Curso
export interface Subject {
    id: string;
    name: string;
    level: string; // I Ciclo, II Ciclo, III Ciclo, Universidad
    syllabus: SyllabusTopic[];
    moodleLink?: string;
    individualPrice: number;
    groupPrice: number;
    createdAt: string;
}

// Estudiante
export interface Student {
    id: string;
    name: string;
    phone: string;
    email?: string;
    subjectIds: string[];
    preference: 'individual' | 'grupal';
    availability: AvailabilitySlot[];
    createdAt: string;
    updatedAt: string;
}

// Tutor
export interface Tutor {
    id: string;
    name: string;
    phone: string;
    email?: string;
    subjectIds: string[];
    availability: AvailabilitySlot[];
    hourlyRate: number;
    createdAt: string;
    updatedAt: string;
}

// Clase/Tutoría
export interface TutoringClass {
    id: string;
    studentId: string;
    tutorId: string;
    subjectId: string;
    scheduledAt: string;
    durationMinutes: number;
    type: 'individual' | 'grupal';
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
    videoId?: string;
    price: number;
    notes?: string;
    studentConfirmed: boolean;
    tutorConfirmed: boolean;
    createdAt: string;
    updatedAt: string;
    // Relations (populated when fetched)
    student?: Student;
    tutor?: Tutor;
    subject?: Subject;
}

// Propuesta de Match (generada por el optimizador)
export interface MatchProposal {
    studentId: string;
    tutorId: string;
    subjectId: string;
    proposedSlots: {
        datetime: string;
        type: 'individual' | 'grupal';
        price: number;
    }[];
    score: number; // Puntuación de compatibilidad
}

// Reporte de Progreso
export interface ProgressReport {
    studentId: string;
    subjectId: string;
    totalClasses: number;
    completedClasses: number;
    topicsCovered: string[];
    topicsPending: string[];
    progressPercentage: number;
    recommendations: string[];
    lastUpdated: string;
}

// Form data types
export interface StudentFormData {
    name: string;
    phone: string;
    email: string;
    subjectIds: string[];
    preference: 'individual' | 'grupal';
    availability: AvailabilitySlot[];
}

export interface TutorFormData {
    name: string;
    phone: string;
    email: string;
    subjectIds: string[];
    availability: AvailabilitySlot[];
    hourlyRate: number;
}

export interface SubjectFormData {
    name: string;
    level: string;
    moodleLink: string;
    individualPrice: number;
    groupPrice: number;
    syllabus: SyllabusTopic[];
}

export interface ScheduleSlot {
    day: string;
    startTime: string;
    endTime: string;
}

export interface WorkshopGroup {
    id: string;
    name: string;
    subjectId: string;
    tutorId?: string;
    scheduleConfig: ScheduleSlot[];
    startDate: string;
    endDate: string;
    maxStudents: number;
    status: 'planning' | 'active' | 'completed' | 'cancelled';
    createdAt: string;
    updatedAt: string;
}
