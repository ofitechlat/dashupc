'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, User, Phone, Mail, DollarSign, BookOpen, Save, Search } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { TutorFormData, Tutor, Subject } from '../../types/tutoring';
import AvailabilityCalendar from '../../components/AvailabilityCalendar';

import { Suspense } from 'react';

function NewTutorContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [existingTutor, setExistingTutor] = useState<Tutor | null>(null);
    const [searching, setSearching] = useState(false);
    const [formData, setFormData] = useState<TutorFormData>({
        name: '',
        phone: '',
        email: '',
        subjectIds: [],
        availability: [],
        hourlyRate: 0
    });

    // Cargar materias al iniciar
    useEffect(() => {
        const loadSubjects = async () => {
            const { data, error } = await supabase
                .from('subjects')
                .select('*')
                .order('name');

            if (data && !error) {
                setSubjects(data.map(s => ({
                    id: s.id,
                    name: s.name,
                    level: s.level || 'Sin Nivel',
                    syllabus: s.syllabus || [],
                    moodleLink: s.moodle_link,
                    individualPrice: s.individual_price,
                    groupPrice: s.group_price,
                    createdAt: s.created_at
                })));
            }
        };
        loadSubjects();
    }, []);

    // Cargar teléfono desde URL (para edición)
    useEffect(() => {
        const phoneParam = searchParams.get('phone');
        if (phoneParam) {
            setFormData(prev => ({ ...prev, phone: phoneParam }));
            // Auto-buscar el tutor
            const autoSearch = async () => {
                setSearching(true);
                try {
                    const { data, error } = await supabase
                        .from('tutors')
                        .select('*')
                        .eq('phone', phoneParam)
                        .single();

                    if (data && !error) {
                        setExistingTutor(data);
                        setFormData({
                            name: data.name,
                            phone: data.phone,
                            email: data.email || '',
                            subjectIds: data.subject_ids || [],
                            availability: data.availability || [],
                            hourlyRate: data.hourly_rate || 0
                        });
                    }
                } catch (err) {
                    console.log('No existing tutor found');
                } finally {
                    setSearching(false);
                }
            };
            autoSearch();
        }
    }, [searchParams]);


    // Buscar tutor existente por teléfono
    const searchByPhone = async () => {
        if (!formData.phone || formData.phone.length < 8) return;

        setSearching(true);
        try {
            const { data, error } = await supabase
                .from('tutors')
                .select('*')
                .eq('phone', formData.phone)
                .single();

            if (data && !error) {
                setExistingTutor(data);
                setFormData({
                    name: data.name,
                    phone: data.phone,
                    email: data.email || '',
                    subjectIds: data.subject_ids || [],
                    availability: data.availability || [],
                    hourlyRate: data.hourly_rate || 0
                });
            } else {
                setExistingTutor(null);
            }
        } catch (err) {
            console.log('No existing tutor found');
        } finally {
            setSearching(false);
        }
    };

    const toggleSubject = (subjectId: string) => {
        setFormData(prev => ({
            ...prev,
            subjectIds: prev.subjectIds.includes(subjectId)
                ? prev.subjectIds.filter(id => id !== subjectId)
                : [...prev.subjectIds, subjectId]
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (existingTutor) {
                // Actualizar tutor existente
                const { error } = await supabase
                    .from('tutors')
                    .update({
                        name: formData.name,
                        email: formData.email || null,
                        subject_ids: formData.subjectIds,
                        availability: formData.availability,
                        hourly_rate: formData.hourlyRate,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existingTutor.id);

                if (error) {
                    console.error('Supabase update error:', error);
                    throw new Error(error.message || 'Error de permisos RLS');
                }
            } else {
                // Crear nuevo tutor
                const { data, error } = await supabase.from('tutors').insert({
                    name: formData.name,
                    phone: formData.phone,
                    email: formData.email || null,
                    subject_ids: formData.subjectIds,
                    availability: formData.availability,
                    hourly_rate: formData.hourlyRate
                }).select();

                if (error) {
                    console.error('Supabase insert error:', error);
                    throw new Error(error.message || 'Error de permisos RLS');
                }
                console.log('Tutor created:', data);
            }

            router.push('/tutors');
        } catch (err: any) {
            console.error('Error saving tutor:', err);
            if (err.code === '23505' || err.message?.includes('duplicate')) {
                alert('Ya existe un tutor con este número de teléfono');
            } else if (err.message?.includes('row-level security')) {
                alert('Error de permisos: Ejecuta el SQL de update_rls_policies.sql en Supabase');
            } else {
                alert(`Error al guardar el tutor: ${err.message || 'Error desconocido'}`);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0f1113] text-white">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-[#0f1113]/95 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold">
                            {existingTutor ? 'Actualizar Tutor' : 'Nuevo Tutor'}
                        </h1>
                        <p className="text-sm text-gray-400">
                            {existingTutor
                                ? 'Modifica los datos y disponibilidad'
                                : 'Registra un tutor para impartir clases'}
                        </p>
                    </div>
                </div>
            </header>

            {/* Form */}
            <main className="max-w-4xl mx-auto px-6 py-8">
                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Phone Search Card */}
                    <section className="bg-[#1a1c1e] rounded-2xl border border-white/5 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-blue-500/20 rounded-xl">
                                <Phone className="text-blue-400" size={20} />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold">Número de Teléfono</h2>
                                <p className="text-sm text-gray-400">Identificador único del tutor</p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="flex-1">
                                <input
                                    type="tel"
                                    required
                                    value={formData.phone}
                                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                    onBlur={searchByPhone}
                                    className="w-full bg-[#0f1113] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                                    placeholder="8888-8888"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={searchByPhone}
                                disabled={searching}
                                className="flex items-center gap-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-6 py-3 rounded-xl transition-colors"
                            >
                                <Search size={18} />
                                {searching ? 'Buscando...' : 'Buscar'}
                            </button>
                        </div>

                        {existingTutor && (
                            <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                                <p className="text-green-400 text-sm">
                                    ✓ Tutor encontrado: <strong>{existingTutor.name}</strong>.
                                    Los cambios actualizarán el perfil existente.
                                </p>
                            </div>
                        )}
                    </section>

                    {/* Personal Info Card */}
                    <section className="bg-[#1a1c1e] rounded-2xl border border-white/5 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-purple-500/20 rounded-xl">
                                <User className="text-purple-400" size={20} />
                            </div>
                            <h2 className="text-lg font-semibold">Información Personal</h2>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Nombre Completo *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full bg-[#0f1113] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                                    placeholder="María García"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    <Mail size={14} className="inline mr-2" />
                                    Correo Electrónico
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                    className="w-full bg-[#0f1113] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                                    placeholder="tutor@ejemplo.com"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    <DollarSign size={14} className="inline mr-2" />
                                    Tarifa por Hora
                                </label>
                                <div className="relative max-w-xs">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formData.hourlyRate}
                                        onChange={(e) => setFormData(prev => ({ ...prev, hourlyRate: parseFloat(e.target.value) || 0 }))}
                                        className="w-full bg-[#0f1113] border border-white/10 rounded-xl pl-8 pr-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Subjects Card */}
                    <section className="bg-[#1a1c1e] rounded-2xl border border-white/5 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-orange-500/20 rounded-xl">
                                <BookOpen className="text-orange-400" size={20} />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold">Materias que Imparte</h2>
                                <p className="text-sm text-gray-400">Selecciona una o más materias</p>
                            </div>
                        </div>

                        {subjects.length === 0 ? (
                            <div className="text-center py-8 text-gray-400">
                                <BookOpen size={40} className="mx-auto mb-3 opacity-50" />
                                <p>No hay materias registradas</p>
                                <button
                                    type="button"
                                    onClick={() => router.push('/subjects/new')}
                                    className="mt-4 text-blue-400 hover:text-blue-300 text-sm"
                                >
                                    + Agregar materia primero
                                </button>
                            </div>
                        ) : (
                            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                                {subjects.map(subject => (
                                    <button
                                        key={subject.id}
                                        type="button"
                                        onClick={() => toggleSubject(subject.id)}
                                        className={`p-4 rounded-xl border-2 transition-all text-left ${formData.subjectIds.includes(subject.id)
                                            ? 'border-orange-500 bg-orange-500/10'
                                            : 'border-white/10 hover:border-white/20'
                                            }`}
                                    >
                                        <h3 className="font-medium">{subject.name}</h3>
                                        <p className="text-xs text-gray-400 mt-1">
                                            Individual: ${subject.individualPrice} / Grupal: ${subject.groupPrice}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Availability Card */}
                    <section className="bg-[#1a1c1e] rounded-2xl border border-white/5 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-emerald-500/20 rounded-xl">
                                <BookOpen className="text-emerald-400" size={20} />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold">Disponibilidad</h2>
                                <p className="text-sm text-gray-400">Horarios en que puede impartir tutorías</p>
                            </div>
                        </div>

                        <AvailabilityCalendar
                            value={formData.availability}
                            onChange={(availability) => setFormData(prev => ({ ...prev, availability }))}
                        />
                    </section>

                    {/* Submit Button */}
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
                            disabled={loading || !formData.name || !formData.phone || formData.subjectIds.length === 0}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-xl font-semibold transition-colors"
                        >
                            <Save size={18} />
                            {loading ? 'Guardando...' : existingTutor ? 'Actualizar' : 'Registrar'}
                        </button>
                    </div>
                </form>
            </main>
        </div>
    );
}

export default function NewTutorPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#0f1113] flex items-center justify-center text-white">Cargando...</div>}>
            <NewTutorContent />
        </Suspense>
    );
}
