'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft, User, Phone, Mail, CheckCircle,
    Target, Calendar, BookOpen, Send, MessageCircle
} from 'lucide-react';
import { supabase } from '../../utils/supabase';
import AvailabilityCalendar from '../../components/AvailabilityCalendar';

// Hardcoded bundles for "Quick Combos"
const BUNDLES = [
    {
        id: 'bachillerato_completo',
        name: 'Bachillerato Completo',
        description: 'Prepárate para todas las materias de Bachillerato por Madurez.',
        subjects: ['Matemáticas', 'Español', 'Ciencias', 'Estudios Sociales', 'Inglés', 'Cívica']
    },
    {
        id: 'tercer_ciclo',
        name: 'Tercer Ciclo (7°, 8°, 9°)',
        description: 'Refuerzo completo para aprobar el año.',
        subjects: ['Matemáticas', 'Español', 'Ciencias', 'Estudios Sociales', 'Inglés']
    },
    {
        id: 'bloque_numeros',
        name: 'Bloque Números',
        description: 'Solo las materias prácticas: Mate y Ciencias.',
        subjects: ['Matemáticas', 'Ciencias']
    }
];

const LEVEL_FILTERS = ['Todos', 'Sétimo', 'Octavo', 'Noveno', 'Bachillerato', 'Universitario'];

export default function RegistrationObjectivesPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [filter, setFilter] = useState('Todos');

    // ... existing state ...
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        goalType: 'custom' as 'bundle' | 'custom' | '', // Default to custom
        selectedBundleId: '',
        selectedSubjectIds: [] as string[],
        availability: [] as any[],
        comments: ''
    });

    // ... existing functions ...

    // Helper to filter subjects
    const filteredSubjects = subjects.filter(s =>
        filter === 'Todos' || s.level === filter
    );



    useEffect(() => {
        loadSubjects();
    }, []);

    const loadSubjects = async () => {
        const { data } = await supabase.from('subjects').select('id, name, level').order('name');
        if (data) setSubjects(data);
    };

    const handleToggleSubject = (id: string) => {
        setFormData(prev => {
            const current = prev.selectedSubjectIds;
            return {
                ...prev,
                selectedSubjectIds: current.includes(id)
                    ? current.filter(s => s !== id)
                    : [...current, id]
            };
        });
    };

    const resolveBundleSubjects = () => {
        if (formData.goalType === 'custom') return formData.selectedSubjectIds;

        const bundle = BUNDLES.find(b => b.id === formData.selectedBundleId);
        if (!bundle) return [];

        // Map bundle names to DB IDs
        return bundle.subjects.map(name => {
            const subject = subjects.find(s => s.name.toLowerCase().includes(name.toLowerCase()));
            return subject ? subject.id : null;
        }).filter(Boolean) as string[];
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // 1. Create or Update Student
            let studentId: string;
            const { data: existingStudent } = await supabase
                .from('students')
                .select('id')
                .eq('phone', formData.phone)
                .maybeSingle();

            if (existingStudent) {
                studentId = existingStudent.id;
            } else {
                const { data: newStudent, error: createError } = await supabase
                    .from('students')
                    .insert({
                        name: formData.name,
                        phone: formData.phone,
                        email: formData.email || null,
                        availability: formData.availability
                    })
                    .select('id')
                    .single();

                if (createError) throw createError;
                studentId = newStudent.id;
            }

            // 2. Create Course Request (Objective Based)
            const finalSubjectIds = resolveBundleSubjects();
            const bundleName = BUNDLES.find(b => b.id === formData.selectedBundleId)?.name;

            const { error: reqError } = await supabase.from('course_requests').insert({
                student_id: studentId,
                subject_ids: finalSubjectIds,
                objectives: [
                    {
                        type: formData.goalType,
                        bundle: bundleName,
                        comments: formData.comments
                    }
                ],
                proposed_schedule: formData.availability,
                status: 'pending',
                preference: 'grupal', // Default to group for objectives
                package_hours: 0 // To be defined
            });

            if (reqError) throw reqError;

            // Success
            setStep(4); // Success Step
        } catch (err: any) {
            alert('Error al enviar solicitud: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    if (step === 4) {
        return (
            <div className="min-h-screen bg-[#0f1113] text-white flex items-center justify-center p-6">
                <div className="max-w-md w-full text-center">
                    <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="text-green-400" size={40} />
                    </div>
                    <h1 className="text-2xl font-bold mb-4">¡Meta Registrada!</h1>
                    <p className="text-gray-400 mb-8">
                        Hemos recibido tu plan de estudio. Un asesor académico revisará tu disponibilidad para armar tu horario ideal.
                    </p>
                    <button
                        onClick={() => router.push('/')}
                        className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-xl font-bold"
                    >
                        Volver al Inicio
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0f1113] text-white">
            <header className="sticky top-0 z-50 bg-[#0f1113]/95 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
                    <button onClick={() => step > 1 ? setStep(step - 1) : router.push('/')} className="p-2 hover:bg-white/10 rounded-xl">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold">Cumplir una Meta</h1>
                        <p className="text-sm text-gray-400">Paso {step} de 3</p>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-8">
                {/* STEP 1: SELECT WORKSHOPS (Was 1.5) */}
                {step === 1 && (
                    <section className="space-y-6 animate-in fade-in slide-in-from-right-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <h2 className="text-2xl font-bold flex items-center gap-2">
                                <BookOpen className="text-purple-400" /> Selecciona tus Talleres
                            </h2>

                            {/* Filters */}
                            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                                {LEVEL_FILTERS.map(level => (
                                    <button
                                        key={level}
                                        onClick={() => setFilter(level)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${filter === level
                                                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                                                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                                            }`}
                                    >
                                        {level}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {filteredSubjects.map(subject => (
                                <button
                                    key={subject.id}
                                    onClick={() => handleToggleSubject(subject.id)}
                                    className={`p-4 rounded-xl border text-left transition-all ${formData.selectedSubjectIds.includes(subject.id)
                                        ? 'bg-purple-500/20 border-purple-500 text-purple-100'
                                        : 'bg-[#1a1c1e] border-white/10 hover:border-white/30'
                                        }`}
                                >
                                    <span className="font-semibold block">{subject.name}</span>
                                    <span className="text-xs opacity-70">{subject.level}</span>
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => setStep(2)}
                            disabled={formData.selectedSubjectIds.length === 0}
                            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 py-4 rounded-xl font-bold mt-6"
                        >
                            Confirmar Selección ({formData.selectedSubjectIds.length})
                        </button>
                    </section>
                )}



                {/* STEP 2: AVAILABILITY */}
                {step === 2 && (
                    <section className="space-y-6 animate-in fade-in slide-in-from-right-4">
                        <div className="bg-[#1a1c1e] p-6 rounded-2xl border border-white/10">
                            <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
                                <Calendar className="text-cyan-400" />
                                ¿Cuándo puedes estudiar?
                            </h2>
                            <p className="text-gray-400 text-sm mb-6">
                                Marca todos los bloques libres que tengas en tu semana.
                                Usaremos esto para asignarte a los grupos ideales.
                            </p>

                            <AvailabilityCalendar
                                value={formData.availability}
                                onChange={(val) => setFormData(prev => ({ ...prev, availability: val }))}
                            />
                        </div>

                        <button
                            onClick={() => setStep(3)}
                            disabled={formData.availability.length === 0}
                            className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 py-4 rounded-xl font-bold"
                        >
                            Continuar
                        </button>
                    </section>
                )}

                {/* STEP 3: CONTACT INFO */}
                {step === 3 && (
                    <section className="space-y-6 animate-in fade-in slide-in-from-right-4">
                        <div className="bg-[#1a1c1e] p-6 rounded-2xl border border-white/10">
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <User className="text-green-400" />
                                Datos de Contacto
                            </h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Nombre Completo</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                        className="w-full bg-[#0f1113] border border-white/10 rounded-xl px-4 py-3 focus:border-green-500 outline-none"
                                        placeholder="Ej: Ana García"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">WhatsApp</label>
                                    <input
                                        type="tel"
                                        required
                                        value={formData.phone}
                                        onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                        className="w-full bg-[#0f1113] border border-white/10 rounded-xl px-4 py-3 focus:border-green-500 outline-none"
                                        placeholder="+506 8888 8888"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Comentarios (Opcional)</label>
                                    <textarea
                                        value={formData.comments}
                                        onChange={e => setFormData(prev => ({ ...prev, comments: e.target.value }))}
                                        className="w-full bg-[#0f1113] border border-white/10 rounded-xl px-4 py-3 focus:border-green-500 outline-none h-24"
                                        placeholder="¿Alguna duda o requerimiento especial?"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={loading || !formData.name || !formData.phone}
                            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 py-4 rounded-xl font-bold flex items-center justify-center gap-2"
                        >
                            {loading ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" /> : <Send size={20} />}
                            Enviar Solicitud
                        </button>
                    </section>
                )}
            </main>
        </div>
    );
}
