'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../utils/supabase';
import {
    Users, Clock, Calendar, ArrowLeft, Search,
    Filter, BookOpen, GraduationCap, CheckCircle2,
    AlertCircle, Sparkles, User, ChevronRight
} from 'lucide-react';

interface WorkshopGroup {
    id: string;
    name: string;
    subject: { name: string; level: string };
    tutor: { name: string } | null;
    schedule_config: any[];
    start_date: string;
    end_date: string;
    max_students: number;
    price: number;
    enrollment_count: number;
}

export default function WorkshopDiscovery() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [workshops, setWorkshops] = useState<WorkshopGroup[]>([]);
    const [filters, setFilters] = useState({
        level: 'Todos',
        search: ''
    });
    const [student, setStudent] = useState<any>(null);
    const [requestingId, setRequestingId] = useState<string | null>(null);

    const levels = ['Todos', 'Sétimo', 'Octavo', 'Noveno', 'Bachillerato', 'Universitario'];

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

        if (studentData) setStudent(studentData);

        await loadWorkshops();
        setLoading(false);
    };

    const loadWorkshops = async () => {
        // Fetch workshops with counts
        const { data, error } = await supabase
            .from('workshop_groups')
            .select(`
                *,
                subject:subjects(name, level),
                tutor:tutors(name),
                enrollment_count:course_requests(count)
            `)
            .eq('status', 'active');

        // Note: The enrollment_count query above might need adjustment depending on how Supabase count works in joins
        // or just calculate it. For now let's assume it works or we fetch requests separately.

        if (data) {
            setWorkshops(data as any);
        }
    };

    const handleJoinRequest = async (workshop: WorkshopGroup) => {
        if (!student) return;
        setRequestingId(workshop.id);

        try {
            // Check if already requested
            const { data: existing } = await supabase
                .from('course_requests')
                .select('id')
                .eq('student_id', student.id)
                .eq('workshop_group_id', workshop.id)
                .maybeSingle();

            if (existing) {
                alert('Ya tienes una solicitud pendiente para este taller.');
                return;
            }

            const { error } = await supabase.from('course_requests').insert({
                student_id: student.id,
                workshop_group_id: workshop.id,
                subject_id: (workshop as any).subject_id,
                total_price: workshop.price,
                status: 'pending',
                preference: 'grupal'
            });

            if (error) throw error;
            alert('¡Solicitud enviada! El administrador confirmará tu cupo pronto.');

        } catch (err: any) {
            alert('Error: ' + err.message);
        } finally {
            setRequestingId(null);
        }
    };

    const filteredWorkshops = workshops.filter(w => {
        const matchesLevel = filters.level === 'Todos' || w.subject.level === filters.level;
        const matchesSearch = w.name.toLowerCase().includes(filters.search.toLowerCase()) ||
            w.subject.name.toLowerCase().includes(filters.search.toLowerCase());
        return matchesLevel && matchesSearch;
    });

    if (loading) return <div className="p-8 text-white text-center">Cargando talleres disponibles...</div>;

    return (
        <div className="min-h-screen bg-[#0f1113] text-white">
            {/* Hero / Header Section */}
            <div className="bg-gradient-to-b from-blue-600/10 to-transparent border-b border-white/5 pt-12 pb-20 px-6">
                <div className="max-w-6xl mx-auto">
                    <button onClick={() => router.push('/student/dashboard')} className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors">
                        <ArrowLeft size={18} />
                        Volver al Dashboard
                    </button>
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-2 text-blue-400 font-bold text-sm uppercase tracking-widest mb-2">
                                <Sparkles size={16} />
                                Descubrir
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black mb-4">Talleres Grupales</h1>
                            <p className="text-gray-400 text-lg max-w-2xl">
                                Únete a grupos de estudio activos, comparte el costo con otros alumnos y aprende de forma colaborativa con nuestros mejores tutores.
                            </p>
                        </div>
                        <div className="flex bg-[#1a1c1e] p-1 rounded-2xl border border-white/10 shadow-2xl">
                            {levels.map(lvl => (
                                <button
                                    key={lvl}
                                    onClick={() => setFilters(f => ({ ...f, level: lvl }))}
                                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${filters.level === lvl ? 'bg-blue-600 shadow-lg shadow-blue-500/20' : 'text-gray-500 hover:text-white'}`}
                                >
                                    {lvl}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <main className="max-w-6xl mx-auto px-6 -mt-12 pb-20">
                {/* Search Bar */}
                <div className="bg-[#1a1c1e] p-4 rounded-3xl border border-white/10 shadow-2xl flex items-center gap-4 mb-12">
                    <Search className="text-gray-500 ml-2" size={22} />
                    <input
                        type="text"
                        placeholder="Busca por materia o nombre del taller..."
                        className="bg-transparent border-none focus:ring-0 text-lg w-full placeholder:text-gray-600"
                        value={filters.search}
                        onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                    />
                </div>

                {filteredWorkshops.length === 0 ? (
                    <div className="text-center py-20 bg-[#1a1c1e] rounded-3xl border border-dashed border-white/10">
                        <AlertCircle size={48} className="mx-auto text-gray-600 mb-4" />
                        <h3 className="text-xl font-bold">No hay talleres activos</h3>
                        <p className="text-gray-500 mt-2">Prueba cambiando los filtros o solicita un taller personalizado.</p>
                        <button
                            onClick={() => router.push('/student/enroll')}
                            className="mt-6 bg-blue-600/10 text-blue-400 border border-blue-500/20 px-6 py-3 rounded-xl font-bold hover:bg-blue-600/20 transition-all"
                        >
                            Solicitar por Objetivos
                        </button>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredWorkshops.map(workshop => {
                            const availableSeats = workshop.max_students - (workshop as any).enrollment_count[0]?.count || 0;
                            const isFull = availableSeats <= 0;

                            return (
                                <div key={workshop.id} className="group bg-[#1a1c1e] border border-white/5 rounded-3xl overflow-hidden hover:border-blue-500/30 transition-all shadow-xl hover:-translate-y-1">
                                    <div className="p-6">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="bg-blue-500/10 p-2.5 rounded-xl text-blue-400">
                                                <GraduationCap size={20} />
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Precio Total</p>
                                                <p className="text-xl font-black text-green-400">₡{workshop.price.toLocaleString()}</p>
                                            </div>
                                        </div>

                                        <h3 className="text-xl font-bold mb-1 group-hover:text-blue-400 transition-colors uppercase">{workshop.name}</h3>
                                        <div className="flex items-center gap-2 mb-6">
                                            <span className="text-xs font-bold text-gray-500">{workshop.subject.level}</span>
                                            <span className="w-1 h-1 bg-gray-700 rounded-full" />
                                            <span className="text-xs text-gray-400">{workshop.subject.name}</span>
                                            <span className="w-1 h-1 bg-gray-700 rounded-full" />
                                            <span className="text-xs font-bold text-blue-400">
                                                {(() => {
                                                    const weeklyHours = workshop.schedule_config.reduce((acc, slot) => {
                                                        const [startH, startM] = slot.startTime.split(':').map(Number);
                                                        const [endH, endM] = slot.endTime.split(':').map(Number);
                                                        return acc + ((endH + endM / 60) - (startH + startM / 60));
                                                    }, 0);
                                                    const weeks = Math.ceil((new Date(workshop.end_date).getTime() - new Date(workshop.start_date).getTime()) / (1000 * 60 * 60 * 24 * 7));
                                                    return Math.round(weeklyHours * weeks);
                                                })()} Horas Totales
                                            </span>
                                        </div>

                                        {/* Schedule */}
                                        <div className="space-y-3 mb-8">
                                            {workshop.schedule_config.map((slot, i) => (
                                                <div key={i} className="flex items-center gap-3 bg-[#0f1113] p-3 rounded-2xl border border-white/5 text-sm">
                                                    <Clock size={14} className="text-blue-400" />
                                                    <span className="font-bold text-gray-300 w-20">{slot.day}</span>
                                                    <span className="text-gray-400">{slot.startTime}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl mb-8">
                                            <div className="flex items-center gap-2">
                                                <User size={14} className="text-gray-500" />
                                                <span className="text-xs text-gray-400">Tutor: {workshop.tutor?.name || 'Por definir'}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 ">
                                                <Users size={14} className={isFull ? 'text-red-400' : 'text-green-400'} />
                                                <span className={`text-xs font-bold ${isFull ? 'text-red-400' : 'text-green-400'}`}>
                                                    {isFull ? 'Agotado' : `${availableSeats} campos`}
                                                </span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleJoinRequest(workshop)}
                                            disabled={isFull || requestingId === workshop.id}
                                            className={`w-full py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 ${isFull ? 'bg-gray-800 text-gray-500 cursor-not-allowed' :
                                                'bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-900/20'
                                                }`}
                                        >
                                            {requestingId === workshop.id ? 'Solicitando...' : (
                                                <>
                                                    {isFull ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
                                                    {isFull ? 'Cupo Completo' : 'Solicitar Cupo'}
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    {/* Dates Bar */}
                                    <div className="bg-[#151719] px-6 py-3 border-t border-white/5 flex items-center justify-between text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={12} />
                                            {new Date(workshop.start_date).toLocaleDateString()}
                                        </div>
                                        <span>al</span>
                                        <div className="flex items-center gap-2">
                                            <Calendar size={12} />
                                            {new Date(workshop.end_date).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Floating Action Button for Objectives */}
            <div className="fixed bottom-8 left-8 z-40">
                <button
                    onClick={() => router.push('/student/enroll')}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 pl-6 rounded-full shadow-2xl flex items-center gap-3 hover:scale-105 transition-transform group"
                >
                    <div className="text-left">
                        <p className="text-[10px] uppercase font-bold text-white/70 leading-none">¿No ves tu grupo?</p>
                        <p className="text-sm font-black text-white">Solicitar a medida</p>
                    </div>
                    <div className="bg-white/20 p-2 rounded-full">
                        <ChevronRight size={20} />
                    </div>
                </button>
            </div>
        </div>
    );
}
