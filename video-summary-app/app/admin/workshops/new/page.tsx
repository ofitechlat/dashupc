'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft, Save, Calendar, Clock, Users,
    BookOpen, User, Plus, Trash2, GripVertical,
    AlertCircle, GraduationCap, CheckCircle
} from 'lucide-react';
import { supabase } from '../../../utils/supabase';
import { Subject, ScheduleSlot } from '../../../types/tutoring';

export default function NewWorkshopPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [tutors, setTutors] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        name: '',
        subjectId: '',
        tutorId: '',
        startDate: '',
        endDate: '',
        maxStudents: 10,
        price: 0,
        scheduleConfig: [] as ScheduleSlot[]
    });

    const [conflicts, setConflicts] = useState<any[]>([]);
    const [checkingConflicts, setCheckingConflicts] = useState(false);

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        if (formData.tutorId && formData.scheduleConfig.length > 0 && formData.startDate && formData.endDate) {
            checkConflicts();
        } else {
            setConflicts([]);
        }
    }, [formData.tutorId, formData.scheduleConfig, formData.startDate, formData.endDate]);

    const loadInitialData = async () => {
        const [subjectsRes, tutorsRes] = await Promise.all([
            supabase.from('subjects').select('*').order('name'),
            supabase.from('tutors').select('id, name').order('name')
        ]);

        if (subjectsRes.data) setSubjects(subjectsRes.data);
        if (tutorsRes.data) setTutors(tutorsRes.data);
    };

    const checkConflicts = async () => {
        setCheckingConflicts(true);
        try {
            const { data, error } = await supabase.rpc('check_tutor_conflicts', {
                p_tutor_id: formData.tutorId,
                p_schedule_config: formData.scheduleConfig,
                p_start_date: formData.startDate,
                p_end_date: formData.endDate
            });

            if (error) throw error;
            setConflicts(data || []);
        } catch (err) {
            console.error('Error checking conflicts:', err);
        } finally {
            setCheckingConflicts(false);
        }
    };

    const addScheduleSlot = () => {
        const newSlot: ScheduleSlot = {
            day: 'Lunes',
            startTime: '18:00',
            endTime: '20:00'
        };
        setFormData(prev => ({
            ...prev,
            scheduleConfig: [...prev.scheduleConfig, newSlot]
        }));
    };

    const updateScheduleSlot = (index: number, field: keyof ScheduleSlot, value: string) => {
        const newConfig = [...formData.scheduleConfig];
        newConfig[index] = { ...newConfig[index], [field]: value };
        setFormData(prev => ({ ...prev, scheduleConfig: newConfig }));
    };

    const removeScheduleSlot = (index: number) => {
        setFormData(prev => ({
            ...prev,
            scheduleConfig: prev.scheduleConfig.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase.from('workshop_groups').insert({
                name: formData.name,
                subject_id: formData.subjectId,
                tutor_id: formData.tutorId || null,
                schedule_config: formData.scheduleConfig,
                start_date: formData.startDate,
                end_date: formData.endDate,
                max_students: formData.maxStudents,
                price: formData.price,
                status: 'planning'
            });

            if (error) throw error;
            router.push('/admin/workshops');
        } catch (err: any) {
            console.error('Error creating workshop:', err);
            alert(`Error al crear el taller: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    return (
        <div className="min-h-screen bg-[#0f1113] text-white">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-[#0f1113]/95 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold">Nuevo Taller</h1>
                        <p className="text-sm text-gray-400">Define un nuevo grupo de estudio</p>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-8">
                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Basic Info */}
                    <section className="bg-[#1a1c1e] rounded-2xl border border-white/5 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-blue-500/20 rounded-xl">
                                <Users className="text-blue-400" size={20} />
                            </div>
                            <h2 className="text-lg font-semibold">Información del Grupo</h2>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-300 mb-2">Nombre del Taller *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Ej: Front-End React 2026"
                                    className="w-full bg-[#0f1113] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Materia *</label>
                                <select
                                    required
                                    value={formData.subjectId}
                                    onChange={(e) => setFormData(prev => ({ ...prev, subjectId: e.target.value }))}
                                    className="w-full bg-[#0f1113] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                                >
                                    <option value="">Selecciona una materia</option>
                                    {subjects.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} ({s.level || 'Sin nivel'})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Tutor Asignado</label>
                                <select
                                    value={formData.tutorId}
                                    onChange={(e) => setFormData(prev => ({ ...prev, tutorId: e.target.value }))}
                                    className={`w-full bg-[#0f1113] border rounded-xl px-4 py-3 focus:outline-none transition-colors ${conflicts.length > 0 ? 'border-red-500/50' : 'border-white/10 focus:border-blue-500'
                                        }`}
                                >
                                    <option value="">Por asignar</option>
                                    {tutors.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Alertas de Conflicto */}
                            {formData.tutorId && (
                                <div className="md:col-span-2">
                                    {checkingConflicts ? (
                                        <div className="flex items-center gap-2 text-sm text-gray-400">
                                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500" />
                                            Revisando conflictos de horario...
                                        </div>
                                    ) : conflicts.length > 0 ? (
                                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 space-y-3">
                                            <div className="flex items-center gap-2 text-red-400 font-semibold text-sm">
                                                <AlertCircle size={18} />
                                                Se detectaron {conflicts.length} conflictos de horario
                                            </div>
                                            <div className="space-y-2">
                                                {conflicts.map((c, i) => (
                                                    <div key={i} className="text-xs text-gray-400 flex items-start gap-2 bg-black/20 p-2 rounded-lg">
                                                        <div className="mt-1 w-1.5 h-1.5 rounded-full bg-red-500" />
                                                        <div>
                                                            <p className="text-gray-300">
                                                                {c.conflict_type === 'clase_individual' ? 'Clase Individual' : 'Otro Taller'}:
                                                                <span className="font-bold ml-1">{c.conflict_name}</span>
                                                            </p>
                                                            <p>
                                                                {c.conflict_date ? `${new Date(c.conflict_date).toLocaleDateString()} de ` : ''}
                                                                {c.conflict_start_time} a {c.conflict_end_time}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <p className="text-[10px] text-red-400/60 italic">
                                                * Se recomienda elegir otro tutor o ajustar el horario del taller.
                                            </p>
                                        </div>
                                    ) : formData.scheduleConfig.length > 0 && formData.startDate && formData.endDate && (
                                        <div className="flex items-center gap-2 text-sm text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-2 rounded-lg">
                                            <CheckCircle size={16} />
                                            Horario disponible para este tutor
                                        </div>
                                    )}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Fecha de Inicio *</label>
                                <input
                                    type="date"
                                    required
                                    value={formData.startDate}
                                    onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                                    className="w-full bg-[#0f1113] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Fecha de Finalización *</label>
                                <input
                                    type="date"
                                    required
                                    value={formData.endDate}
                                    onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                                    className="w-full bg-[#0f1113] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Capacidad Máxima *</label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    value={formData.maxStudents}
                                    onChange={(e) => setFormData(prev => ({ ...prev, maxStudents: parseInt(e.target.value) }))}
                                    className="w-full bg-[#0f1113] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Precio del Taller (CRC) *</label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    value={formData.price}
                                    onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
                                    className="w-full bg-[#0f1113] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Schedule Config */}
                    <section className="bg-[#1a1c1e] rounded-2xl border border-white/5 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-cyan-500/20 rounded-xl">
                                    <Clock className="text-cyan-400" size={20} />
                                </div>
                                <h2 className="text-lg font-semibold">Horario Recurrente</h2>
                            </div>
                            <button
                                type="button"
                                onClick={addScheduleSlot}
                                className="flex items-center gap-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 px-4 py-2 rounded-xl transition-colors"
                            >
                                <Plus size={18} />
                                Añadir Horario
                            </button>
                        </div>

                        <div className="space-y-4">
                            {formData.scheduleConfig.length === 0 ? (
                                <div className="text-center py-8 text-gray-500 border-2 border-dashed border-white/5 rounded-2xl">
                                    <Clock size={32} className="mx-auto mb-2 opacity-50" />
                                    <p>No has definido un horario para este taller</p>
                                </div>
                            ) : (
                                formData.scheduleConfig.map((slot, index) => (
                                    <div key={index} className="flex items-center gap-4 bg-[#0f1113] p-4 rounded-xl border border-white/5 group">
                                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-500 mb-1">Día</label>
                                                <select
                                                    value={slot.day}
                                                    onChange={(e) => updateScheduleSlot(index, 'day', e.target.value)}
                                                    className="w-full bg-[#1a1c1e] border border-white/5 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                                                >
                                                    {days.map(d => <option key={d} value={d}>{d}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-500 mb-1">Inicio</label>
                                                <input
                                                    type="time"
                                                    value={slot.startTime}
                                                    onChange={(e) => updateScheduleSlot(index, 'startTime', e.target.value)}
                                                    className="w-full bg-[#1a1c1e] border border-white/5 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-500 mb-1">Fin</label>
                                                <input
                                                    type="time"
                                                    value={slot.endTime}
                                                    onChange={(e) => updateScheduleSlot(index, 'endTime', e.target.value)}
                                                    className="w-full bg-[#1a1c1e] border border-white/5 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                                                />
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeScheduleSlot(index)}
                                            className="p-2 hover:bg-red-500/20 text-gray-500 hover:text-red-400 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>

                    {/* Submit */}
                    <div className="flex justify-end gap-4">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="px-6 py-3 border border-white/10 rounded-xl hover:bg-white/5 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !formData.name || !formData.subjectId || formData.scheduleConfig.length === 0}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20"
                        >
                            <Save size={18} />
                            {loading ? 'Creando...' : 'Crear Taller'}
                        </button>
                    </div>
                </form>
            </main>
        </div>
    );
}
