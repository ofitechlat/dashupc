'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, User, Phone, Mail, Users, UserCheck, Search, Save, BookOpen } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { StudentFormData, Student, Subject } from '../../types/tutoring';
import AvailabilityCalendar from '../../components/AvailabilityCalendar';

import { Suspense } from 'react';

function NewStudentContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [searching, setSearching] = useState(false);
    const [existingStudent, setExistingStudent] = useState<Student | null>(null);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [formData, setFormData] = useState<StudentFormData>({
        name: '',
        phone: '',
        email: '',
        subjectIds: [],
        preference: 'grupal',
        availability: []
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

    // Buscar estudiante existente por teléfono
    const searchByPhone = async () => {
        if (!formData.phone || formData.phone.length < 8) return;

        setSearching(true);
        try {
            const { data, error } = await supabase
                .from('students')
                .select('*')
                .eq('phone', formData.phone)
                .single();

            if (data && !error) {
                setExistingStudent(data);
                setFormData({
                    name: data.name,
                    phone: data.phone,
                    email: data.email || '',
                    subjectIds: data.subject_ids || [],
                    preference: data.preference,
                    availability: data.availability || []
                });
            } else {
                setExistingStudent(null);
            }
        } catch (err) {
            console.log('No existing student found');
        } finally {
            setSearching(false);
        }
    };

    // Pre-cargar teléfono desde URL si existe
    useEffect(() => {
        const phoneParam = searchParams.get('phone');
        if (phoneParam) {
            setFormData(prev => ({ ...prev, phone: phoneParam }));
            // Auto-buscar el estudiante
            const autoSearch = async () => {
                setSearching(true);
                try {
                    const { data, error } = await supabase
                        .from('students')
                        .select('*')
                        .eq('phone', phoneParam)
                        .single();

                    if (data && !error) {
                        setExistingStudent(data);
                        setFormData({
                            name: data.name,
                            phone: data.phone,
                            email: data.email || '',
                            subjectIds: data.subject_ids || [],
                            preference: data.preference,
                            availability: data.availability || []
                        });
                    }
                } catch (err) {
                    console.log('No existing student found');
                } finally {
                    setSearching(false);
                }
            };
            autoSearch();
        }
    }, [searchParams]);

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
            if (existingStudent) {
                // Actualizar estudiante existente
                const { error } = await supabase
                    .from('students')
                    .update({
                        name: formData.name,
                        email: formData.email || null,
                        subject_ids: formData.subjectIds,
                        preference: formData.preference,
                        availability: formData.availability,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existingStudent.id);

                if (error) throw error;
            } else {
                // Crear nuevo estudiante
                const { error } = await supabase.from('students').insert({
                    name: formData.name,
                    phone: formData.phone,
                    email: formData.email || null,
                    subject_ids: formData.subjectIds,
                    preference: formData.preference,
                    availability: formData.availability
                });

                if (error) throw error;
            }

            router.push('/students');
        } catch (err: any) {
            console.error('Error saving student:', err);
            if (err.code === '23505') {
                alert('Ya existe un estudiante con este número de teléfono');
            } else {
                alert('Error al guardar el estudiante');
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
                            {existingStudent ? 'Actualizar Estudiante' : 'Nuevo Estudiante'}
                        </h1>
                        <p className="text-sm text-gray-400">
                            {existingStudent
                                ? 'Modifica los datos y disponibilidad'
                                : 'Registra tus datos y horarios disponibles'}
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
                                <p className="text-sm text-gray-400">Tu identificador único en el sistema</p>
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

                        {existingStudent && (
                            <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                                <p className="text-green-400 text-sm">
                                    ✓ Estudiante encontrado: <strong>{existingStudent.name}</strong>.
                                    Los cambios actualizarán tu perfil existente.
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
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Nombre Completo *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full bg-[#0f1113] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                                    placeholder="Juan Pérez"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    <Mail size={14} className="inline mr-2" />
                                    Correo Electrónico
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                    className="w-full bg-[#0f1113] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                                    placeholder="correo@ejemplo.com"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Preference Card */}
                    <section className="bg-[#1a1c1e] rounded-2xl border border-white/5 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-orange-500/20 rounded-xl">
                                <Users className="text-orange-400" size={20} />
                            </div>
                            <h2 className="text-lg font-semibold">Preferencia de Tutoría</h2>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, preference: 'individual' }))}
                                className={`p-6 rounded-xl border-2 transition-all text-left ${formData.preference === 'individual'
                                    ? 'border-blue-500 bg-blue-500/10'
                                    : 'border-white/10 hover:border-white/20'
                                    }`}
                            >
                                <UserCheck size={32} className={formData.preference === 'individual' ? 'text-blue-400' : 'text-gray-400'} />
                                <h3 className="font-semibold mt-3">Individual</h3>
                                <p className="text-sm text-gray-400 mt-1">
                                    Atención personalizada. Precio más alto pero 100% enfocado en ti.
                                </p>
                            </button>

                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, preference: 'grupal' }))}
                                className={`p-6 rounded-xl border-2 transition-all text-left ${formData.preference === 'grupal'
                                    ? 'border-green-500 bg-green-500/10'
                                    : 'border-white/10 hover:border-white/20'
                                    }`}
                            >
                                <Users size={32} className={formData.preference === 'grupal' ? 'text-green-400' : 'text-gray-400'} />
                                <h3 className="font-semibold mt-3">Grupal</h3>
                                <p className="text-sm text-gray-400 mt-1">
                                    Precio reducido. Aprendes con otros estudiantes.
                                </p>
                            </button>
                        </div>

                        <p className="text-sm text-gray-500 mt-4">
                            💡 Si hay espacios libres, las tutorías individuales pueden darse a precio de grupal.
                        </p>
                    </section>

                    {/* Subjects Selection Card */}
                    <section className="bg-[#1a1c1e] rounded-2xl border border-white/5 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-amber-500/20 rounded-xl">
                                <BookOpen className="text-amber-400" size={20} />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold">Materias de Interés</h2>
                                <p className="text-sm text-gray-400">Selecciona los cursos que te interesan</p>
                            </div>
                        </div>

                        {subjects.length === 0 ? (
                            <div className="text-center py-8 text-gray-400">
                                <BookOpen size={32} className="mx-auto mb-2 opacity-50" />
                                <p>No hay materias registradas</p>
                                <button
                                    type="button"
                                    onClick={() => router.push('/subjects/new')}
                                    className="mt-2 text-amber-400 hover:underline text-sm"
                                >
                                    + Crear primera materia
                                </button>
                            </div>
                        ) : (
                            <div className="grid gap-3 md:grid-cols-2">
                                {subjects.map(subject => (
                                    <button
                                        key={subject.id}
                                        type="button"
                                        onClick={() => toggleSubject(subject.id)}
                                        className={`p-4 rounded-xl border-2 transition-all text-left ${formData.subjectIds.includes(subject.id)
                                            ? 'border-amber-500 bg-amber-500/10'
                                            : 'border-white/10 hover:border-white/20'
                                            }`}
                                    >
                                        <h3 className={`font-semibold ${formData.subjectIds.includes(subject.id) ? 'text-amber-400' : ''
                                            }`}>{subject.name}</h3>
                                        <p className="text-sm text-gray-400 mt-1">
                                            Individual: ${subject.individualPrice} / Grupal: ${subject.groupPrice}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        )}

                        {formData.subjectIds.length > 0 && (
                            <p className="text-sm text-amber-400 mt-4">
                                ✓ {formData.subjectIds.length} materia(s) seleccionada(s)
                            </p>
                        )}
                    </section>

                    {/* Availability Card */}
                    <section className="bg-[#1a1c1e] rounded-2xl border border-white/5 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-emerald-500/20 rounded-xl">
                                <Users className="text-emerald-400" size={20} />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold">Disponibilidad</h2>
                                <p className="text-sm text-gray-400">Selecciona los horarios en que puedes recibir tutoría</p>
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
                            disabled={loading || !formData.name || !formData.phone}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-xl font-semibold transition-colors"
                        >
                            <Save size={18} />
                            {loading ? 'Guardando...' : existingStudent ? 'Actualizar' : 'Registrar'}
                        </button>
                    </div>
                </form>
            </main>
        </div>
    );
}

export default function NewStudentPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#0f1113] flex items-center justify-center text-white">Cargando...</div>}>
            <NewStudentContent />
        </Suspense>
    );
}
