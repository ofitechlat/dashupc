'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../utils/supabase';
import { ArrowLeft, Save, Calendar, Clock, User, Users, BookOpen } from 'lucide-react';

export default function NewClassPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // Data for dropdowns
    const [students, setStudents] = useState<any[]>([]);
    const [tutors, setTutors] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);

    // Form state
    const [formData, setFormData] = useState({
        student_id: '',
        tutor_id: '',
        subject_id: '',
        date: '',
        time: ''
    });

    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

    useEffect(() => {
        loadDropdownData();
    }, []);

    const loadDropdownData = async () => {
        const [studentsRes, tutorsRes, subjectsRes] = await Promise.all([
            supabase.from('students').select('id, name').order('name'),
            supabase.from('tutors').select('id, name').order('name'),
            supabase.from('subjects').select('id, name').order('name')
        ]);

        if (studentsRes.data) setStudents(studentsRes.data);
        if (tutorsRes.data) setTutors(tutorsRes.data);
        if (subjectsRes.data) setSubjects(subjectsRes.data);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch(`${BACKEND_URL}/api/classes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (data.success) {
                alert('✅ Clase agendada exitosamente');
                router.push('/admin/classes');
            } else {
                alert('Error al agendar: ' + (data.detail || 'Error desconocido'));
            }
        } catch (err) {
            console.error('Error submitting form:', err);
            alert('Error de conexión con el servidor');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0f1113] text-white flex items-center justify-center p-6">
            <div className="max-w-2xl w-full">
                <button
                    onClick={() => router.back()}
                    className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                >
                    <ArrowLeft size={20} />
                    Volver al calendario
                </button>

                <div className="bg-[#1a1c1e] rounded-3xl border border-white/10 p-8 shadow-2xl">
                    <div className="mb-8">
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Calendar className="text-cyan-400" size={28} />
                            Agendar Clase Manualmente
                        </h1>
                        <p className="text-gray-400 mt-2">
                            Crea una sesión directamente omitiendo el algoritmo de optimización.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Student & Tutor Row */}
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-400 flex items-center gap-2">
                                    <User size={16} /> Estudiante
                                </label>
                                <select
                                    required
                                    value={formData.student_id}
                                    onChange={e => setFormData({ ...formData, student_id: e.target.value })}
                                    className="w-full bg-[#0f1113] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-cyan-500 transition-colors"
                                >
                                    <option value="">Seleccionar Estudiante...</option>
                                    {students.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-400 flex items-center gap-2">
                                    <Users size={16} /> Tutor
                                </label>
                                <select
                                    required
                                    value={formData.tutor_id}
                                    onChange={e => setFormData({ ...formData, tutor_id: e.target.value })}
                                    className="w-full bg-[#0f1113] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-cyan-500 transition-colors"
                                >
                                    <option value="">Seleccionar Tutor...</option>
                                    {tutors.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Subject */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-400 flex items-center gap-2">
                                <BookOpen size={16} /> Materia
                            </label>
                            <select
                                required
                                value={formData.subject_id}
                                onChange={e => setFormData({ ...formData, subject_id: e.target.value })}
                                className="w-full bg-[#0f1113] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-cyan-500 transition-colors"
                            >
                                <option value="">Seleccionar Materia...</option>
                                {subjects.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Date & Time Row */}
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-400 flex items-center gap-2">
                                    <Calendar size={16} /> Fecha
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={formData.date}
                                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                                    className="w-full bg-[#0f1113] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-cyan-500 transition-colors scheme-dark"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-400 flex items-center gap-2">
                                    <Clock size={16} /> Hora
                                </label>
                                <input
                                    type="time"
                                    required
                                    value={formData.time}
                                    onChange={e => setFormData({ ...formData, time: e.target.value })}
                                    className="w-full bg-[#0f1113] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-cyan-500 transition-colors scheme-dark"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all mt-8"
                        >
                            {loading ? (
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white" />
                            ) : (
                                <>
                                    <Save size={20} />
                                    Confirmar Agendamiento
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
