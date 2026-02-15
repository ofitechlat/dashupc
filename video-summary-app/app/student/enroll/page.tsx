'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../utils/supabase';
import {
    GraduationCap, BookOpen, Clock, Calendar,
    ArrowLeft, CheckCircle2, ChevronRight, Target,
    Sparkles, Info, Users
} from 'lucide-react';
import AvailabilityCalendar from '../../components/AvailabilityCalendar';

interface Subject {
    id: string;
    name: string;
    level: string;
}

interface Term {
    id: string;
    name: string;
}

interface Combo {
    id: string;
    name: string;
    subjects: string[]; // Names or IDs
    description: string;
    icon: any;
}

export default function EnrollmentByObjectives() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [step, setStep] = useState(1);
    const [student, setStudent] = useState<any>(null);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [activeTerm, setActiveTerm] = useState<Term | null>(null);

    // Form State
    const [selectionType, setSelectionType] = useState<'combo' | 'individual' | null>(null);
    const [selectedCombo, setSelectedCombo] = useState<string | null>(null);
    const [selectedLevel, setSelectedLevel] = useState('Bachillerato');
    const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
    const [availability, setAvailability] = useState<any[]>([]);
    const [submitting, setSubmitting] = useState(false);

    const combos: Combo[] = [
        {
            id: 'bach-completo',
            name: 'Bachillerato Completo',
            description: 'Las 6 materias fundamentales para obtener tu título.',
            subjects: ['Matemáticas', 'Español', 'Estudios Sociales', 'Ciencias', 'Inglés', 'Educación Cívica'],
            icon: GraduationCap
        },
        {
            id: 'bloque-letras',
            name: 'Bloque Letras',
            description: 'Español, Estudios Sociales y Educación Cívica.',
            subjects: ['Español', 'Estudios Sociales', 'Educación Cívica'],
            icon: BookOpen
        },
        {
            id: 'bloque-mate-ciencias',
            name: 'Bloque Mate/Ciencias',
            description: 'Matemáticas y Ciencias (Biología/Física/Química).',
            subjects: ['Matemáticas', 'Ciencias'],
            icon: Target
        }
    ];

    useEffect(() => {
        checkSessionAndLoadData();
    }, []);

    const checkSessionAndLoadData = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            router.push('/student/login');
            return;
        }

        const { data: studentData } = await supabase
            .from('students')
            .select('*')
            .eq('user_id', session.user.id)
            .single();

        if (studentData) {
            setStudent(studentData);
            await Promise.all([
                loadSubjects(),
                loadActiveTerm()
            ]);
        }
        setLoading(false);
    };

    const loadSubjects = async () => {
        const { data } = await supabase.from('subjects').select('id, name, level').order('name');
        if (data) setSubjects(data);
    };

    const loadActiveTerm = async () => {
        const { data } = await supabase.from('terms').select('id, name').eq('is_active', true).maybeSingle();
        if (data) setActiveTerm(data);
    };

    const handleComboSelect = (comboId: string) => {
        setSelectedCombo(comboId);
        setSelectionType('combo');
        const combo = combos.find(c => c.id === comboId);
        if (combo) {
            // Find IDs for subjects in this combo and level
            const ids = subjects
                .filter(s => s.level === selectedLevel && combo.subjects.includes(s.name))
                .map(s => s.id);
            setSelectedSubjectIds(ids);
            setStep(2);
        }
    };

    const toggleSubject = (id: string) => {
        setSelectedSubjectIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleSubmit = async () => {
        if (!student || !activeTerm || selectedSubjectIds.length === 0 || availability.length === 0) {
            alert('Por favor completa todos los pasos');
            return;
        }

        setSubmitting(true);
        try {
            // 1. Crear la solicitud unificada
            const { data: request, error: reqError } = await supabase.from('course_requests').insert({
                student_id: student.id,
                subject_ids: selectedSubjectIds,
                term_id: activeTerm.id,
                proposed_schedule: availability,
                status: 'pending',
                preference: 'grupal', // Por defecto preferimos grupal para objetivos académicos
                objectives: {
                    type: selectionType,
                    combo_name: combos.find(c => c.id === selectedCombo)?.name || 'Personalizado',
                    level: selectedLevel
                }
            }).select().single();

            if (reqError) throw reqError;

            // 2. SILENT MATCH: Buscar grupos existentes que coincidan
            // Esto es magia por ahora, el Admin lo confirmará, pero podríamos pre-asignar
            // Para esta versión, dejaremos que el Admin vea la solicitud y haga el match manual
            // pero le avisamos al usuario que estamos procesando.

            alert('¡Solicitud enviada con éxito! La Academia revisará tu disponibilidad y te contactará pronto.');
            router.push('/student/dashboard');

        } catch (err: any) {
            console.error('Error submitting:', err);
            alert('Error: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center text-white">Cargando...</div>;

    return (
        <div className="min-h-screen bg-[#0f1113] text-white">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-[#0f1113]/90 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.push('/student/dashboard')} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold">Inscripción por Objetivos</h1>
                            <p className="text-xs text-gray-400">{activeTerm?.name || 'Periodo Actual'}</p>
                        </div>
                    </div>
                    {/* Progress Dots */}
                    <div className="flex gap-2">
                        {[1, 2, 3].map(i => (
                            <div key={i} className={`w-2.5 h-2.5 rounded-full transition-colors ${step >= i ? 'bg-blue-500' : 'bg-white/10'}`} />
                        ))}
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-12">

                {/* STEP 1: Selección de Meta */}
                {step === 1 && (
                    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4">
                        <div className="text-center max-w-xl mx-auto">
                            <Sparkles className="mx-auto text-yellow-400 mb-4" size={32} />
                            <h2 className="text-3xl font-bold mb-4">¿Cuál es tu objetivo hoy?</h2>
                            <p className="text-gray-400">Cuéntanos qué quieres lograr y nosotros nos encargamos de armar tu horario ideal.</p>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2">
                            {combos.map(combo => (
                                <button
                                    key={combo.id}
                                    onClick={() => handleComboSelect(combo.id)}
                                    className="group p-6 bg-[#1a1c1e] border border-white/5 rounded-3xl text-left hover:border-blue-500/50 hover:bg-blue-500/[0.02] transition-all shadow-xl"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400 group-hover:scale-110 transition-transform">
                                            <combo.icon size={24} />
                                        </div>
                                        <ChevronRight size={20} className="text-gray-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                                    </div>
                                    <h3 className="text-xl font-bold mb-2">{combo.name}</h3>
                                    <p className="text-sm text-gray-400 mb-4">{combo.description}</p>
                                    <div className="flex flex-wrap gap-2">
                                        {combo.subjects.slice(0, 3).map(s => (
                                            <span key={s} className="text-[10px] bg-white/5 px-2 py-1 rounded-md text-gray-300">{s}</span>
                                        ))}
                                        {combo.subjects.length > 3 && <span className="text-[10px] text-gray-500">+{combo.subjects.length - 3} más</span>}
                                    </div>
                                </button>
                            ))}

                            <button
                                onClick={() => { setSelectionType('individual'); setStep(2); }}
                                className="group p-6 bg-[#1a1c1e] border border-white/5 rounded-3xl text-left hover:border-purple-500/50 hover:bg-purple-500/[0.02] transition-all shadow-xl"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-3 bg-purple-500/10 rounded-2xl text-purple-400 group-hover:scale-110 transition-transform">
                                        <Target size={24} />
                                    </div>
                                    <ChevronRight size={20} className="text-gray-600 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
                                </div>
                                <h3 className="text-xl font-bold mb-2">Materias Sueltas</h3>
                                <p className="text-sm text-gray-400 mb-4">Elige exactamente las materias que necesitas reforzar a tu propio ritmo.</p>
                                <span className="text-sm font-bold text-purple-400">Personalizar selección </span>
                            </button>
                        </div>

                        <div className="bg-blue-500/5 border border-blue-500/10 p-6 rounded-2xl flex items-start gap-4">
                            <Info className="text-blue-400 flex-shrink-0 mt-1" size={18} />
                            <p className="text-sm text-blue-200/80">
                                <strong>¿No ves lo que buscas?</strong> No te preocupes. Puedes elegir "Materias Sueltas" o contactarnos directamente por WhatsApp para un plan a la medida.
                            </p>
                        </div>
                    </div>
                )}

                {/* STEP 2: Selección de Materias (Solo si es individual o para confirmar combo) */}
                {step === 2 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                        <div className="flex items-center gap-3">
                            <Target className="text-blue-400" />
                            <h2 className="text-2xl font-bold">Confirma tus materias</h2>
                        </div>

                        <div className="space-y-4">
                            <label className="text-sm text-gray-400 uppercase tracking-widest font-bold">Nivel Académico</label>
                            <div className="flex flex-wrap gap-2">
                                {['Sétimo', 'Octavo', 'Noveno', 'Bachillerato'].map(lvl => (
                                    <button
                                        key={lvl}
                                        onClick={() => { setSelectedLevel(lvl); setSelectedSubjectIds([]); }}
                                        className={`px-6 py-3 rounded-xl font-bold transition-all border ${selectedLevel === lvl ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'}`}
                                    >
                                        {lvl}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                            {subjects.filter(s => s.level === selectedLevel).map(subject => (
                                <button
                                    key={subject.id}
                                    onClick={() => toggleSubject(subject.id)}
                                    className={`p-4 rounded-2xl border-2 text-left transition-all ${selectedSubjectIds.includes(subject.id) ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10' : 'border-white/5 bg-white/[0.02] hover:border-white/20'}`}
                                >
                                    <div className="flex justify-between items-center">
                                        <span className={`font-bold ${selectedSubjectIds.includes(subject.id) ? 'text-white' : 'text-gray-400'}`}>{subject.name}</span>
                                        {selectedSubjectIds.includes(subject.id) && <CheckCircle2 className="text-blue-400" size={18} />}
                                    </div>
                                </button>
                            ))}
                        </div>

                        <div className="pt-8 flex justify-between">
                            <button onClick={() => setStep(1)} className="px-8 py-3 rounded-xl font-bold hover:bg-white/5 transition-colors">Volver</button>
                            <button
                                onClick={() => setStep(3)}
                                disabled={selectedSubjectIds.length === 0}
                                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-10 py-4 rounded-2xl font-bold shadow-xl shadow-blue-900/20"
                            >
                                Siguiente: Mi Horario
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 3: Disponibilidad */}
                {step === 3 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                        <div className="flex items-center gap-3">
                            <Clock className="text-blue-400" />
                            <h2 className="text-2xl font-bold">Marca tus horarios libres</h2>
                        </div>

                        <p className="text-gray-400">
                            Usaremos estos bloques para asignarte a los grupos que mejor te convengan.
                        </p>

                        <div className="bg-[#1a1c1e] rounded-3xl border border-white/5 p-8">
                            <AvailabilityCalendar
                                value={availability}
                                onChange={setAvailability}
                            />
                        </div>

                        <div className="pt-8 flex justify-between items-center">
                            <button onClick={() => setStep(2)} className="px-8 py-3 rounded-xl font-bold hover:bg-white/5 transition-colors">Volver</button>

                            <div className="text-right">
                                <p className="text-xs text-gray-500 mb-2">Al continuar, procesaremos tu inscripción</p>
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting || availability.length === 0}
                                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 px-12 py-4 rounded-2xl font-bold shadow-2xl shadow-blue-500/20 flex items-center gap-2"
                                >
                                    {submitting ? 'Enviando...' : (
                                        <>
                                            <Sparkles size={18} />
                                            ¡Finalizar Inscripción!
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-gray-500 justify-center">
                            <Users size={14} />
                            <span>Buscando automáticamente grupos que coincidan con tus horarios...</span>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
}
