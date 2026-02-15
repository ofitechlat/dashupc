'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../utils/supabase';
import { BookOpen, Clock, Calendar, Plus, User, Loader2, DollarSign, Video, AlertTriangle, Target, Users } from 'lucide-react';

interface Student {
    id: string;
    name: string;
    user_id: string;
}

interface Request {
    id: string;
    package_hours: number;
    status: string;
    payment_status: 'pending' | 'partial' | 'paid' | 'overdue';
    total_price: number;
    amount_paid: number;
}

interface Subject {
    id: string;
    name: string;
}

export default function StudentDashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [student, setStudent] = useState<Student | null>(null);
    const [requests, setRequests] = useState<Request[]>([]);
    const [completedClasses, setCompletedClasses] = useState(0);
    const [pendingVideos, setPendingVideos] = useState(0);
    const [subjects, setSubjects] = useState<Subject[]>([]);

    // Form State
    const [showRequestForm, setShowRequestForm] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState('');
    const [hours, setHours] = useState(1);
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [preference, setPreference] = useState('grupal');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        checkSessionAndLoadData();
    }, []);

    const checkSessionAndLoadData = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            router.push('/student/login');
            return;
        }

        const { data: studentData, error } = await supabase
            .from('students')
            .select('*')
            .eq('user_id', session.user.id)
            .single();

        if (error || !studentData) {
            console.error('Error loading profile:', error);
            return;
        }

        setStudent(studentData);
        await Promise.all([
            loadStats(studentData.id),
            loadSubjects()
        ]);
        setLoading(false);
    };

    const loadStats = async (studentId: string) => {
        // Load Requests for financial calc
        const { data: reqs } = await supabase
            .from('course_requests')
            .select(`
                id, package_hours, status, total_price, amount_paid, payment_status, workshop_group_id,
                workshop:workshop_groups(price)
            `)
            .eq('student_id', studentId);

        if (reqs) {
            const mappedReqs = (reqs as any[]).map(r => ({
                ...r,
                total_price: r.workshop?.price || r.total_price || 0
            }));
            setRequests(mappedReqs);
        }

        const workshopGroupIds = (reqs as any[])?.filter(r => r.workshop_group_id).map(r => r.workshop_group_id) || [];

        // Load classes (direct + workshop)
        const { data: classData } = await supabase
            .from('classes')
            .select('id, status')
            .or(`student_id.eq.${studentId}${workshopGroupIds.length > 0 ? `,group_id.in.(${workshopGroupIds.join(',')})` : ''}`);

        if (classData) {
            const completed = classData.filter((c: any) => c.status === 'completed');
            setCompletedClasses(completed.length);
            setPendingVideos(0);
        }
    };

    const loadSubjects = async () => {
        const { data } = await supabase.from('subjects').select('id, name');
        if (data) setSubjects(data);
    };

    const handleCreateRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        if (!student) return;

        try {
            // Generate Proposed Schedule
            const schedule = [];
            const startDate = new Date(`${date}T${time}`);
            for (let i = 0; i < hours; i++) {
                const blockStart = new Date(startDate.getTime() + i * 60 * 60 * 1000);
                schedule.push({ start: blockStart.toISOString(), duration: 60 });
            }

            const { error } = await supabase.from('course_requests').insert({
                student_id: student.id,
                subject_id: selectedSubject,
                package_hours: hours,
                preference: preference,
                status: 'pending',
                proposed_schedule: schedule
            });

            if (error) throw error;

            setShowRequestForm(false);
            loadStats(student.id); // Refresh
            alert('Solicitud enviada correctamente');
            setHours(1); setSelectedSubject(''); setDate(''); setTime('');
        } catch (err: any) {
            alert('Error: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-white"><Loader2 className="animate-spin inline mr-2" /> Cargando...</div>;
    }

    // Calculations
    const pendingHours = requests.filter(r => r.status === 'pending').reduce((acc, r) => acc + r.package_hours, 0);
    const pendingBalance = requests.filter(r => r.payment_status !== 'paid').reduce((acc, r) => acc + (r.total_price - r.amount_paid), 0);
    const isOverdue = requests.some(r => r.payment_status === 'overdue');

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-8">Hola, {student?.name} 👋</h1>

            {/* Quick Actions Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">

                {/* Balance Card */}
                <div className="bg-[#1a1c1e] p-6 rounded-2xl border border-white/5 shadow-xl relative overflow-hidden">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400">
                            <DollarSign size={24} />
                        </div>
                        {isOverdue && <span className="bg-red-500/20 text-red-400 text-xs px-2 py-1 rounded font-bold">ATRASADO</span>}
                    </div>
                    <div>
                        <p className="text-gray-400 text-sm">Saldo Pendiente</p>
                        <h3 className={`text-3xl font-bold mt-1 ${pendingBalance > 0 ? 'text-white' : 'text-green-400'}`}>
                            ₡{pendingBalance.toLocaleString()}
                        </h3>
                    </div>
                </div>

                {/* Hours Card */}
                <div className="bg-[#1a1c1e] p-6 rounded-2xl border border-white/5 shadow-xl">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-purple-500/10 rounded-lg text-purple-400">
                            <Clock size={24} />
                        </div>
                    </div>
                    <div>
                        <p className="text-gray-400 text-sm">Horas por Asignar</p>
                        <h3 className="text-3xl font-bold text-white mt-1">{pendingHours}</h3>
                    </div>
                </div>

                {/* Completed Card */}
                <div className="bg-[#1a1c1e] p-6 rounded-2xl border border-white/5 shadow-xl">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-green-500/10 rounded-lg text-green-400">
                            <BookOpen size={24} />
                        </div>
                    </div>
                    <div>
                        <p className="text-gray-400 text-sm">Clases Completadas</p>
                        <h3 className="text-3xl font-bold text-white mt-1">{completedClasses}</h3>
                    </div>
                </div>

                {/* Pending Videos Card */}
                {pendingVideos > 0 && (
                    <div className="bg-[#1a1c1e] p-6 rounded-2xl border border-yellow-500/20 shadow-xl">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-yellow-500/10 rounded-lg text-yellow-400">
                                <Video size={24} />
                            </div>
                            <span className="bg-yellow-500/20 text-yellow-400 text-xs px-2 py-1 rounded font-bold">PENDIENTE</span>
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Videos Pendientes</p>
                            <h3 className="text-3xl font-bold text-yellow-400 mt-1">{pendingVideos}</h3>
                        </div>
                    </div>
                )}

                {/* Enrollment by Objectives Card */}
                <button
                    onClick={() => router.push('/student/enroll')}
                    className="bg-indigo-600 hover:bg-indigo-700 p-6 rounded-2xl transition-all shadow-xl flex flex-col items-center justify-center gap-4 group"
                >
                    <div className="p-4 bg-white/20 rounded-full group-hover:scale-110 transition-transform">
                        <Target size={32} className="text-white" />
                    </div>
                    <div className="text-center">
                        <span className="font-bold text-lg block">Lograr un Objetivo</span>
                        <span className="text-xs text-indigo-200">Bachillerato, Combos y más</span>
                    </div>
                </button>

                {/* Discover Workshops Card */}
                <button
                    onClick={() => router.push('/student/workshops')}
                    className="bg-emerald-600 hover:bg-emerald-700 p-6 rounded-2xl transition-all shadow-xl flex flex-col items-center justify-center gap-4 group"
                >
                    <div className="p-4 bg-white/20 rounded-full group-hover:scale-110 transition-transform">
                        <Users size={32} className="text-white" />
                    </div>
                    <div className="text-center">
                        <span className="font-bold text-lg block">Ver Talleres</span>
                        <span className="text-xs text-emerald-100">Grupos activos y cupos</span>
                    </div>
                </button>

                {/* Original Action Card */}
                <button
                    onClick={() => setShowRequestForm(true)}
                    className="bg-white/5 hover:bg-white/10 p-6 rounded-2xl transition-all shadow-xl flex flex-col items-center justify-center gap-4 group border border-white/10"
                >
                    <div className="p-4 bg-blue-500/20 rounded-full group-hover:scale-110 transition-transform">
                        <Plus size={32} className="text-blue-400" />
                    </div>
                    <span className="font-bold text-lg">Tutoria Individual</span>
                </button>
            </div>

            {/* Recent Activity (Ideally we would show last 3 classes here as a preview, but keeping it simple for now) */}
            <div className="bg-[#1a1c1e] rounded-2xl p-8 border border-white/5">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold">Resumen de Actividad</h2>
                    <button onClick={() => router.push('/student/classes')} className="text-blue-400 text-sm hover:underline">
                        Ver Calendario Completo
                    </button>
                </div>
                <div className="text-center py-12 text-gray-500">
                    <Calendar className="mx-auto mb-4 opacity-50" size={48} />
                    <p>Revisa tu calendario de clases en la pestaña "Mis Clases"</p>
                </div>
            </div>

            {/* Request Modal */}
            {showRequestForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-[#1a1c1e] rounded-2xl border border-white/10 p-6 w-full max-w-lg shadow-2xl">
                        <h2 className="text-xl font-bold mb-4">Solicitar Clase</h2>
                        <form onSubmit={handleCreateRequest} className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Materia</label>
                                <select
                                    className="w-full bg-[#0f1113] border border-white/10 rounded-xl p-3"
                                    value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} required
                                >
                                    <option value="">Selecciona materia...</option>
                                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Fecha</label>
                                    <input type="date" className="w-full bg-[#0f1113] border border-white/10 rounded-xl p-3"
                                        value={date} onChange={e => setDate(e.target.value)} required />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Hora</label>
                                    <input type="time" className="w-full bg-[#0f1113] border border-white/10 rounded-xl p-3"
                                        value={time} onChange={e => setTime(e.target.value)} required />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Horas</label>
                                    <input type="number" min="1" max="5" className="w-full bg-[#0f1113] border border-white/10 rounded-xl p-3"
                                        value={hours} onChange={e => setHours(Number(e.target.value))} />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Tipo</label>
                                    <select className="w-full bg-[#0f1113] border border-white/10 rounded-xl p-3"
                                        value={preference} onChange={e => setPreference(e.target.value)}>
                                        <option value="grupal">Grupal</option>
                                        <option value="individual">Individual</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-4">
                                <button type="button" onClick={() => setShowRequestForm(false)} className="px-4 py-2 hover:bg-white/10 rounded-xl">Cancelar</button>
                                <button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-xl font-bold">
                                    {submitting ? 'Enviando...' : 'Confirmar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
