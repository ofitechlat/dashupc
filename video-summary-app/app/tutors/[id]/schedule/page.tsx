'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft, User, Phone, Mail, BookOpen, Clock,
    Calendar, CheckCircle2, AlertCircle, ExternalLink,
    ChevronDown, ChevronUp
} from 'lucide-react';
import { supabase } from '../../../utils/supabase';
import TutorMonthlyCalendar from '../../../components/TutorMonthlyCalendar';

interface ClassSession {
    id: string;
    scheduled_at: string;
    duration_minutes: number;
    status: string;
    student_name: string;
    subject_name: string;
}

interface Tutor {
    id: string;
    name: string;
    phone: string;
    email?: string;
}

export default function TutorSchedulePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [tutor, setTutor] = useState<Tutor | null>(null);
    const [classes, setClasses] = useState<ClassSession[]>([]);

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        setLoading(true);
        try {
            // 1. Load Tutor info
            const { data: tutorData, error: tError } = await supabase
                .from('tutors')
                .select('*')
                .eq('id', id)
                .single();

            if (tError) throw tError;
            setTutor(tutorData);

            // 2. Load Assigned Classes
            // We fetch from 'classes' and join with students and subjects
            const { data: classesData, error: cError } = await supabase
                .from('classes')
                .select(`
                    id, scheduled_at, duration_minutes, status,
                    students(name),
                    subjects(name)
                `)
                .eq('tutor_id', id)
                .order('scheduled_at', { ascending: false });

            if (cError) throw cError;

            const mapped: ClassSession[] = (classesData || []).map((c: any) => ({
                id: c.id,
                scheduled_at: c.scheduled_at,
                duration_minutes: c.duration_minutes,
                status: c.status,
                student_name: c.students?.name || 'Desconocido',
                subject_name: c.subjects?.name || 'Sin materia'
            }));

            setClasses(mapped);

        } catch (err: any) {
            console.error('Error loading schedule:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0f1113] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
            </div>
        );
    }

    if (!tutor) {
        return (
            <div className="min-h-screen bg-[#0f1113] text-white flex flex-col items-center justify-center p-6 text-center">
                <AlertCircle size={48} className="text-red-400 mb-4" />
                <h1 className="text-2xl font-bold mb-2">Tutor no encontrado</h1>
                <button onClick={() => router.push('/tutors')} className="text-blue-400 hover:underline">Volver a Tutores</button>
            </div>
        );
    }

    const upcomingClasses = classes
        .filter(c => new Date(c.scheduled_at) >= new Date() && c.status !== 'cancelled')
        .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

    return (
        <div className="min-h-screen bg-[#0f1113] text-white">
            <header className="sticky top-0 z-50 bg-[#0f1113]/95 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.push('/tutors')} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold flex items-center gap-2">
                                Horario de {tutor.name}
                            </h1>
                            <p className="text-sm text-gray-400">Control de asignaciones y calendario</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-8 grid lg:grid-cols-3 gap-8">
                {/* Left Column: Calendar */}
                <div className="lg:col-span-2 space-y-6">
                    <TutorMonthlyCalendar classes={classes} />

                    {/* All sessions list */}
                    <div className="bg-[#1a1c1e] border border-white/5 rounded-3xl p-6">
                        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                            <Clock size={20} className="text-purple-400" />
                            Histórico de Sesiones
                        </h3>
                        <div className="space-y-3">
                            {classes.length === 0 ? (
                                <p className="text-gray-500 text-center py-10">No hay sesiones registradas.</p>
                            ) : (
                                classes.map(cls => (
                                    <div key={cls.id} className="bg-black/20 border border-white/5 rounded-2xl p-4 flex items-center justify-between group">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold
                                                ${cls.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                                    cls.status === 'confirmed' ? 'bg-blue-500/20 text-blue-400' :
                                                        cls.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                                                            'bg-yellow-500/20 text-yellow-400'}`}>
                                                <Calendar size={18} />
                                            </div>
                                            <div>
                                                <p className="font-bold">
                                                    {new Date(cls.scheduled_at).toLocaleDateString('es-CR', {
                                                        weekday: 'long', day: 'numeric', month: 'long'
                                                    })}
                                                </p>
                                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                                    <span>{new Date(cls.scheduled_at).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })}</span>
                                                    <span>•</span>
                                                    <span className="text-blue-400 font-medium">{cls.subject_name}</span>
                                                    <span>•</span>
                                                    <span className="text-white">{cls.student_name}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border
                                            ${cls.status === 'completed' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                cls.status === 'confirmed' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                    cls.status === 'cancelled' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                        'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'}`}>
                                            {cls.status}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Info & Upcoming */}
                <div className="space-y-6">
                    {/* Tutor Profile Card */}
                    <div className="bg-gradient-to-br from-[#1a1c1e] to-[#0f1113] border border-white/10 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 blur-3xl -mr-16 -mt-16 rounded-full" />
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Información del Tutor</h3>
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center text-blue-400">
                                <User size={32} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">{tutor.name}</h2>
                                <p className="text-sm text-blue-400 font-medium">{tutor.phone}</p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <button
                                onClick={() => {
                                    let phone = tutor.phone.replace(/\D/g, '');
                                    if (phone.length === 8) phone = '506' + phone;
                                    window.open(`https://wa.me/${phone}`, '_blank');
                                }}
                                className="w-full bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all border border-[#25D366]/20"
                            >
                                <ExternalLink size={18} /> WhatsApp
                            </button>
                            <button
                                onClick={() => router.push(`/tutors/new?phone=${encodeURIComponent(tutor.phone)}`)}
                                className="w-full bg-white/5 hover:bg-white/10 py-3 rounded-2xl font-bold text-gray-400 hover:text-white transition-all border border-white/5 text-sm"
                            >
                                Editar Perfil
                            </button>
                        </div>
                    </div>

                    {/* Upcoming Sessions */}
                    <div className="bg-[#1a1c1e] border border-white/5 rounded-3xl p-6">
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                            Próximas Clases
                            <span className="bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-full">{upcomingClasses.length}</span>
                        </h3>
                        {upcomingClasses.length === 0 ? (
                            <p className="text-sm text-gray-500 italic py-4">No hay clases programadas.</p>
                        ) : (
                            <div className="space-y-4">
                                {upcomingClasses.map(cls => (
                                    <div key={cls.id} className="relative pl-6 border-l-2 border-blue-500/30">
                                        <div className="absolute left-[-5px] top-0 w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                                        <p className="text-sm font-bold">{cls.student_name}</p>
                                        <p className="text-xs text-blue-400 font-medium mb-1">{cls.subject_name}</p>
                                        <p className="text-[10px] text-gray-500 flex items-center gap-1">
                                            <Calendar size={10} />
                                            {new Date(cls.scheduled_at).toLocaleDateString('es-CR', { day: 'numeric', month: 'short' })}
                                            <span className="mx-1">•</span>
                                            <Clock size={10} />
                                            {new Date(cls.scheduled_at).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
