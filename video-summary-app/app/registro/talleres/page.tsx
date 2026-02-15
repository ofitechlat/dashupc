'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, Filter, Clock, Users, Calendar, CheckCircle, PlusCircle, User } from 'lucide-react';
import { supabase } from '../../utils/supabase';

interface Workshop {
    id: string;
    name: string;
    subject_id: string;
    tutor_id: string;
    max_students: number;
    price: number;
    start_date: string;
    end_date: string;
    // total_hours: number; // Calculated dynamically
    status: 'active' | 'planning' | 'completed' | 'cancelled';
    schedule_config: any[];
    subjects: {
        name: string;
        level: string;
    };
    tutors: {
        name: string;
    };
    current_students: number; // Calculated later
}

const LEVEL_FILTERS = ['Todos', 'Sétimo', 'Octavo', 'Noveno', 'Bachillerato', 'Universidad'];

export default function WorkshopDiscoveryPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [workshops, setWorkshops] = useState<Workshop[]>([]);
    const [filter, setFilter] = useState('Todos');
    const [search, setSearch] = useState('');
    const [showEnrollModal, setShowEnrollModal] = useState<Workshop | null>(null);

    // Enroll Form State
    const [enrollForm, setEnrollForm] = useState({
        name: '',
        phone: ''
    });
    const [enrolling, setEnrolling] = useState(false);

    useEffect(() => {
        loadWorkshops();
    }, []);

    const loadWorkshops = async () => {
        setLoading(true);
        try {
            // 1. Get Active Workshops
            const { data: wsData, error: wsError } = await supabase
                .from('workshop_groups')
                .select(`
                    *,
                    subjects (name, level),
                    tutors (name)
                `)
                .eq('status', 'active');

            if (wsError) throw wsError;

            // 2. Get enrollments count for each
            const { data: reqData, error: reqError } = await supabase
                .from('course_requests')
                .select('workshop_group_id')
                .eq('status', 'matched') // Only count matched/accepted students? Or pending too? Let's count all linked requests for now to show "busy-ness"
                // Actually, let's count only relevant statuses if we want "spots left"
                .in('status', ['matched', 'approved', 'pending']);

            if (reqError) throw reqError;

            // 3. Merge counts
            const workshopsWithCounts = wsData.map((w: any) => {
                const count = reqData.filter((r: any) => r.workshop_group_id === w.id).length;
                return { ...w, current_students: count };
            });

            setWorkshops(workshopsWithCounts);

        } catch (err) {
            console.error('Error loading workshops:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleEnroll = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!showEnrollModal) return;
        setEnrolling(true);

        try {
            // 1. Check if student exists or create
            let studentId: string;
            const { data: existingStudent } = await supabase
                .from('students')
                .select('id')
                .eq('phone', enrollForm.phone)
                .maybeSingle();

            if (existingStudent) {
                studentId = existingStudent.id;
            } else {
                const { data: newStudent, error: createError } = await supabase
                    .from('students')
                    .insert({
                        name: enrollForm.name,
                        phone: enrollForm.phone,
                        preference: 'grupal'
                    })
                    .select('id')
                    .single();

                if (createError) throw createError;
                studentId = newStudent.id;
            }

            // 2. Create Request
            const { error: reqError } = await supabase.from('course_requests').insert({
                student_id: studentId,
                subject_id: showEnrollModal.subject_id,
                workshop_group_id: showEnrollModal.id,
                status: 'pending', // Pending admin approval? Or matched directly?
                // Let's set 'pending' so admin sees it in the "Workshop Requests" list to confirm payment/details
                preference: 'grupal',
                total_price: showEnrollModal.price,
                package_hours: 0 // Workshops don't use package hours logic usually
            });

            if (reqError) throw reqError;

            alert('¡Solicitud enviada! Te contactaremos pronto para confirmar tu cupo.');
            setShowEnrollModal(null);
            setEnrollForm({ name: '', phone: '' });
            loadWorkshops(); // Refresh counts

        } catch (err: any) {
            alert('Error al inscribirse: ' + err.message);
        } finally {
            setEnrolling(false);
        }
    };

    const calculateTotalHours = (workshop: Workshop) => {
        if (!workshop.start_date || !workshop.end_date || !workshop.schedule_config) return 0;

        const start = new Date(workshop.start_date);
        const end = new Date(workshop.end_date);
        let totalHours = 0;

        // Iterate through days
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dayName = d.toLocaleDateString('es-CR', { weekday: 'long' });
            // Normalize day name (remove accents, lowercase) for comparison if needed, 
            // but usually schedule_config uses "Lunes", "Martes" etc. Title case.
            const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
            const dayNameCap = capitalize(dayName);

            const schedule = workshop.schedule_config.find((s: any) => s.day === dayNameCap);

            if (schedule) {
                const startTime = parseInt(schedule.startTime.split(':')[0]) + parseInt(schedule.startTime.split(':')[1]) / 60;
                // Assuming 2 hours duration by default if endTime is missing, or calculating from config
                // The current schema comment said: { "day": "Lunes", "startTime": "18:00", "endTime": "20:00" }
                // Let's assume endTime exists or calculate diff
                const endTime = schedule.endTime
                    ? parseInt(schedule.endTime.split(':')[0]) + parseInt(schedule.endTime.split(':')[1]) / 60
                    : startTime + 2; // Default 2 hours if not specified

                totalHours += (endTime - startTime);
            }
        }

        return Math.round(totalHours);
    };

    const filteredWorkshops = workshops.filter(w => {
        const matchesFilter = filter === 'Todos' || w.subjects?.level === filter;
        const matchesSearch = w.subjects?.name.toLowerCase().includes(search.toLowerCase()) ||
            w.name.toLowerCase().includes(search.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    return (
        <div className="min-h-screen bg-[#0f1113] text-white">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-[#0f1113]/95 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-6xl mx-auto px-6 py-4">
                    <button
                        onClick={() => router.push('/')}
                        className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
                    >
                        <ArrowLeft size={16} /> Volver al Inicio
                    </button>

                    <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                        <Users className="text-blue-400" />
                        Talleres Grupales
                    </h1>
                    <p className="text-gray-400 max-w-2xl">
                        Únete a grupos de estudio activos, comparte el costo con otros alumnos y aprende de forma colaborativa con nuestros mejores tutores.
                    </p>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
                {/* Controls */}
                <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
                    {/* Filter Pills */}
                    <div className="flex gap-2 overflow-x-auto pb-2 w-full md:w-auto custom-scrollbar">
                        {LEVEL_FILTERS.map(level => (
                            <button
                                key={level}
                                onClick={() => setFilter(level)}
                                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${filter === level
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                                    }`}
                            >
                                {level}
                            </button>
                        ))}
                    </div>

                    {/* Search */}
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por materia..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-[#1a1c1e] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-blue-500 transition-colors"
                        />
                    </div>
                </div>

                {/* Workshops Grid */}
                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
                    </div>
                ) : filteredWorkshops.length === 0 ? (
                    <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-3xl">
                        <Filter size={48} className="mx-auto mb-4 text-gray-600" />
                        <h3 className="text-xl font-bold text-gray-300">No encontramos talleres activos</h3>
                        <p className="text-gray-500 mt-2">Intenta cambiar los filtros o crea tu propio grupo.</p>
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {filteredWorkshops.map(workshop => {
                            const spotsLeft = Math.max(0, workshop.max_students - workshop.current_students);

                            return (
                                <div key={workshop.id} className="group bg-[#1a1c1e] border border-white/5 hover:border-blue-500/50 rounded-2xl p-6 transition-all hover:shadow-xl hover:shadow-blue-500/10 flex flex-col">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <span className="text-xs font-bold text-blue-400 bg-blue-400/10 px-2 py-1 rounded uppercase tracking-wide">
                                                {workshop.subjects?.level}
                                            </span>
                                            <h3 className="text-xl font-bold mt-2 group-hover:text-blue-400 transition-colors">
                                                {workshop.name}
                                            </h3>
                                            <p className="text-sm text-gray-400">{workshop.subjects?.name}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-gray-500 font-bold uppercase">Precio Total</p>
                                            <p className="text-xl font-bold text-green-400">₡{workshop.price.toLocaleString()}</p>
                                        </div>
                                    </div>

                                    {/* Detailed Info Block */}
                                    <div className="bg-white/5 rounded-xl p-4 mb-6 space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Fecha Inicio</p>
                                                <div className="flex items-center gap-2 text-sm text-gray-200">
                                                    <Calendar size={14} className="text-blue-400" />
                                                    {new Date(workshop.start_date).toLocaleDateString('es-CR', { day: 'numeric', month: 'short' })}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Fecha Finalización</p>
                                                <div className="flex items-center gap-2 text-sm text-gray-200">
                                                    <Calendar size={14} className="text-blue-400" />
                                                    {new Date(workshop.end_date).toLocaleDateString('es-CR', { day: 'numeric', month: 'short' })}
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Duración del Taller</p>
                                            <div className="flex items-center gap-2 text-sm text-gray-200">
                                                <Clock size={14} className="text-purple-400" />
                                                <span className="font-semibold text-white">{calculateTotalHours(workshop)} Horas Totales</span>
                                            </div>
                                        </div>

                                        <div className="pt-3 border-t border-white/10">
                                            <p className="text-[10px] text-gray-500 uppercase font-bold mb-2">Horario de Lecciones</p>
                                            <div className="space-y-2">
                                                {workshop.schedule_config?.map((slot: any, i: number) => (
                                                    <div key={i} className="flex items-center justify-between text-sm bg-black/20 p-2 rounded-lg border border-white/5">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                                            <span className="font-medium text-gray-300">{slot.day}</span>
                                                        </div>
                                                        <span className="text-white font-mono text-xs">
                                                            {slot.startTime}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Info Footer */}
                                    <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold text-xs">
                                                {workshop.tutors?.name.charAt(0)}
                                            </div>
                                            <div className="text-xs">
                                                <p className="text-gray-500">Tutor</p>
                                                <p className="font-medium max-w-[100px] truncate">{workshop.tutors?.name}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-sm font-bold ${spotsLeft > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                {spotsLeft} campos
                                            </p>
                                            <p className="text-[10px] text-gray-500">disponibles</p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => setShowEnrollModal(workshop)}
                                        disabled={spotsLeft === 0}
                                        className="w-full mt-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                                    >
                                        {spotsLeft > 0 ? (
                                            <>
                                                <CheckCircle size={18} /> Solicitar Cupo
                                            </>
                                        ) : (
                                            'Cupo Lleno'
                                        )}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* THE BIG BUTTON (Comodín) */}
                <div className="mt-12 bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-blue-500/30 rounded-3xl p-8 md:p-12 text-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors" />
                    <div className="relative z-10">
                        <h2 className="text-2xl md:text-3xl font-bold mb-4">¿No encontraste el horario perfecto?</h2>
                        <p className="text-gray-300 mb-8 max-w-2xl mx-auto text-lg">
                            No te preocupes. Si ninguno de los talleres actuales se ajusta a tu disponibilidad,
                            <span className="text-blue-400 font-bold"> ¡podemos abrir uno nuevo para ti!</span>
                            <br />Con solo 1 estudiante interesado abrimos un nuevo espacio.
                        </p>
                        <button
                            onClick={() => router.push('/registro/objetivos')}
                            className="bg-white text-black hover:bg-gray-200 px-8 py-4 rounded-full font-bold text-lg shadow-xl shadow-white/10 transition-all transform hover:scale-105 flex items-center gap-3 mx-auto"
                        >
                            <PlusCircle size={24} />
                            Abrir Nuevo Taller
                        </button>
                    </div>
                </div>
            </main>

            {/* Enroll Modal */}
            {showEnrollModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-[#1a1c1e] rounded-2xl border border-white/10 p-6 w-full max-w-md shadow-2xl relative">
                        <button
                            onClick={() => setShowEnrollModal(null)}
                            className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
                        >
                            <Search className="rotate-45" size={20} />
                        </button>

                        <h3 className="text-xl font-bold mb-1">Solicitar Cupo</h3>
                        <p className="text-sm text-gray-400 mb-6">
                            Para: <span className="text-blue-400 font-semibold">{showEnrollModal.name}</span>
                        </p>

                        <form onSubmit={handleEnroll} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    <User size={14} className="inline mr-2" />
                                    Nombre Completo
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={enrollForm.name}
                                    onChange={(e) => setEnrollForm(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full bg-[#0f1113] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                                    placeholder="Tu nombre"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    <Clock size={14} className="inline mr-2" />
                                    Número de WhatsApp
                                </label>
                                <input
                                    type="tel"
                                    required
                                    value={enrollForm.phone}
                                    onChange={(e) => setEnrollForm(prev => ({ ...prev, phone: e.target.value }))}
                                    className="w-full bg-[#0f1113] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                                    placeholder="+506 8888-8888"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={enrolling}
                                className="w-full mt-4 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all"
                            >
                                {enrolling ? 'Enviando...' : 'Confirmar Solicitud'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
