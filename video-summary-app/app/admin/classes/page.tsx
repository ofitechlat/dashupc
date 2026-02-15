'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft, Calendar, Clock, User, Users, Plus, Search,
    ChevronDown, ChevronUp, CheckCircle2, AlertTriangle,
    DollarSign, BookOpen, Trash2, Save, X, MessageCircle
} from 'lucide-react';
import { supabase } from '../../utils/supabase';

interface ClassSession {
    id: string;
    scheduled_at: string;
    duration_minutes: number;
    status: string;
    tutor_id: string;
    tutor_name: string;
}

interface Package {
    id: string;
    student_id: string;
    student_name: string;
    student_phone: string;
    subject_id: string;
    subject_name: string;
    package_hours: number;
    preference: string;
    status: string;
    total_price: number;
    amount_paid: number;
    payment_status: string;
    created_at: string;
    classes: ClassSession[];
}

interface Tutor {
    id: string;
    name: string;
}

export default function ClassesManagementPage() {
    const router = useRouter();
    const [packages, setPackages] = useState<Package[]>([]);
    const [tutors, setTutors] = useState<Tutor[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedPkg, setExpandedPkg] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed'>('active');

    // Add Session Modal
    const [addSessionPkgId, setAddSessionPkgId] = useState<string | null>(null);
    const [newSessionDate, setNewSessionDate] = useState('');
    const [newSessionTime, setNewSessionTime] = useState('');
    const [newSessionDuration, setNewSessionDuration] = useState(60);
    const [newSessionTutor, setNewSessionTutor] = useState('');
    const [saving, setSaving] = useState(false);

    // Register Payment Modal
    const [paymentPkgId, setPaymentPkgId] = useState<string | null>(null);
    const [paymentAmount, setPaymentAmount] = useState(0);
    const [paymentNote, setPaymentNote] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);

        // Load packages (course_requests) with their sessions (classes)
        const { data: reqData } = await supabase
            .from('course_requests')
            .select(`
                id, student_id, subject_id, package_hours, preference, status,
                total_price, amount_paid, payment_status, created_at,
                student:students(id, name, phone),
                subject:subjects(id, name),
                classes(id, scheduled_at, duration_minutes, status, tutor_id,
                    tutor:tutors(id, name)
                )
            `)
            .in('status', ['matched', 'pending', 'completed'])
            .order('created_at', { ascending: false });

        if (reqData) {
            const mapped: Package[] = (reqData as any[]).map(r => ({
                id: r.id,
                student_id: r.student_id,
                student_name: r.student?.name || 'Desconocido',
                student_phone: r.student?.phone || '',
                subject_id: r.subject_id,
                subject_name: r.subject?.name || 'Sin materia',
                package_hours: r.package_hours || 0,
                preference: r.preference || 'grupal',
                status: r.status,
                total_price: r.total_price || 0,
                amount_paid: r.amount_paid || 0,
                payment_status: r.payment_status || 'pending',
                created_at: r.created_at,
                classes: (r.classes || []).map((c: any) => ({
                    id: c.id,
                    scheduled_at: c.scheduled_at,
                    duration_minutes: c.duration_minutes || 60,
                    status: c.status,
                    tutor_id: c.tutor_id,
                    tutor_name: c.tutor?.name || 'Sin asignar'
                })).sort((a: ClassSession, b: ClassSession) =>
                    new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
                )
            }));
            setPackages(mapped);
        }

        // Load tutors
        const { data: tutorData } = await supabase
            .from('tutors')
            .select('id, name')
            .order('name');
        if (tutorData) setTutors(tutorData);

        setLoading(false);
    };

    // --- Add a new session to a package ---
    const handleAddSession = async () => {
        if (!addSessionPkgId || !newSessionDate || !newSessionTime) return;
        setSaving(true);

        const pkg = packages.find(p => p.id === addSessionPkgId);
        if (!pkg) return;

        try {
            const scheduledAt = new Date(`${newSessionDate}T${newSessionTime}`).toISOString();

            const { error } = await supabase.from('classes').insert({
                student_id: pkg.student_id,
                subject_id: pkg.subject_id,
                tutor_id: newSessionTutor || null,
                scheduled_at: scheduledAt,
                duration_minutes: newSessionDuration,
                status: 'confirmed',
                type: pkg.preference,
                request_id: pkg.id
            });

            if (error) throw error;

            setAddSessionPkgId(null);
            setNewSessionDate('');
            setNewSessionTime('');
            setNewSessionDuration(60);
            setNewSessionTutor('');
            loadData();
        } catch (err: any) {
            alert('Error: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    // --- Update session status ---
    const handleUpdateClassStatus = async (classId: string, newStatus: string) => {
        const { error } = await supabase
            .from('classes')
            .update({ status: newStatus })
            .eq('id', classId);

        if (error) alert('Error: ' + error.message);
        else loadData();
    };

    // --- Delete session ---
    const handleDeleteClass = async (classId: string) => {
        if (!confirm('Eliminar esta sesion?')) return;
        const { error } = await supabase.from('classes').delete().eq('id', classId);
        if (error) alert('Error: ' + error.message);
        else loadData();
    };

    // --- Register payment ---
    const handleRegisterPayment = async () => {
        if (!paymentPkgId || paymentAmount <= 0) return;
        setSaving(true);

        const pkg = packages.find(p => p.id === paymentPkgId);
        if (!pkg) return;

        try {
            const newAmountPaid = pkg.amount_paid + paymentAmount;
            const paymentStatus = newAmountPaid >= pkg.total_price ? 'paid'
                : newAmountPaid > 0 ? 'partial' : 'pending';

            const { error } = await supabase
                .from('course_requests')
                .update({
                    amount_paid: newAmountPaid,
                    payment_status: paymentStatus
                })
                .eq('id', paymentPkgId);

            if (error) throw error;

            setPaymentPkgId(null);
            setPaymentAmount(0);
            setPaymentNote('');
            loadData();
        } catch (err: any) {
            alert('Error: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    // --- Mark package as completed ---
    const handleCompletePackage = async (pkgId: string) => {
        if (!confirm('Marcar este paquete como completado?')) return;
        const { error } = await supabase
            .from('course_requests')
            .update({ status: 'completed' })
            .eq('id', pkgId);

        if (error) alert('Error: ' + error.message);
        else loadData();
    };

    // --- Computed helpers ---
    const getDeliveredHours = (pkg: Package) => {
        return pkg.classes
            .filter(c => c.status === 'completed')
            .reduce((sum, c) => sum + (c.duration_minutes / 60), 0);
    };

    const getScheduledHours = (pkg: Package) => {
        return pkg.classes.reduce((sum, c) => sum + (c.duration_minutes / 60), 0);
    };

    const getPackageFlag = (pkg: Package): { label: string; color: string } | null => {
        const delivered = getDeliveredHours(pkg);
        const remaining = pkg.total_price - pkg.amount_paid;

        if (delivered >= pkg.package_hours && remaining > 0) {
            return { label: 'HORAS COMPLETAS - PAGO PENDIENTE', color: 'text-red-400 bg-red-500/10 border-red-500/20' };
        }
        if (remaining <= 0 && delivered < pkg.package_hours) {
            return { label: 'PAGADO - HORAS PENDIENTES', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' };
        }
        if (delivered >= pkg.package_hours && remaining <= 0) {
            return { label: 'COMPLETADO', color: 'text-green-400 bg-green-500/10 border-green-500/20' };
        }
        return null;
    };

    // Filter & search
    const filtered = packages.filter(pkg => {
        if (filterStatus === 'active' && pkg.status === 'completed') return false;
        if (filterStatus === 'completed' && pkg.status !== 'completed') return false;
        if (searchTerm) {
            const q = searchTerm.toLowerCase();
            return pkg.student_name.toLowerCase().includes(q) || pkg.subject_name.toLowerCase().includes(q);
        }
        return true;
    });

    if (loading) {
        return <div className="p-8 text-center text-white">Cargando...</div>;
    }

    return (
        <div className="min-h-screen bg-[#0f1113] text-white">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-[#0f1113]/95 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.push('/admin')} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold flex items-center gap-2">
                                <Calendar size={22} /> Gestion de Paquetes
                            </h1>
                            <p className="text-sm text-gray-400">
                                {filtered.length} paquete{filtered.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-6 space-y-6">
                {/* Filters */}
                <div className="flex flex-wrap gap-3 items-center">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Buscar por estudiante o materia..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-[#1a1c1e] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                        />
                    </div>
                    <div className="flex bg-[#1a1c1e] rounded-xl border border-white/10 overflow-hidden">
                        {(['active', 'completed', 'all'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilterStatus(f)}
                                className={`px-4 py-2 text-sm font-medium transition-colors ${filterStatus === f
                                    ? 'bg-blue-500/20 text-blue-400'
                                    : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                {f === 'active' ? 'Activos' : f === 'completed' ? 'Completados' : 'Todos'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Package Cards */}
                {filtered.length === 0 ? (
                    <p className="text-center text-gray-500 py-12">No se encontraron paquetes.</p>
                ) : (
                    filtered.map(pkg => {
                        const delivered = getDeliveredHours(pkg);
                        const scheduled = getScheduledHours(pkg);
                        const progress = pkg.package_hours > 0 ? Math.min((delivered / pkg.package_hours) * 100, 100) : 0;
                        const remaining = pkg.total_price - pkg.amount_paid;
                        const isExpanded = expandedPkg === pkg.id;
                        const flag = getPackageFlag(pkg);

                        return (
                            <div key={pkg.id} className="bg-[#1a1c1e] border border-white/10 rounded-2xl overflow-hidden">
                                {/* Package Header */}
                                <button
                                    onClick={() => setExpandedPkg(isExpanded ? null : pkg.id)}
                                    className="w-full p-6 text-left hover:bg-white/[0.02] transition-colors"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-blue-500/20 p-2.5 rounded-xl">
                                                <BookOpen size={20} className="text-blue-400" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg">{pkg.student_name}</h3>
                                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                                    <span>{pkg.subject_name}</span>
                                                    <span className="w-1 h-1 bg-gray-600 rounded-full" />
                                                    <span className="capitalize">{pkg.preference}</span>
                                                    <span className="w-1 h-1 bg-gray-600 rounded-full" />
                                                    <span className="text-blue-400 font-medium">{pkg.package_hours}h contratadas</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {flag && (
                                                <span className={`text-xs px-3 py-1 rounded-full border font-semibold ${flag.color}`}>
                                                    {flag.label}
                                                </span>
                                            )}
                                            {isExpanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                                        </div>
                                    </div>

                                    {/* Progress + Payment Summary */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {/* Hours Progress */}
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">Horas impartidas</p>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-2xl font-bold text-white">{delivered}</span>
                                                <span className="text-sm text-gray-400">/ {pkg.package_hours}h</span>
                                            </div>
                                            <div className="w-full bg-white/5 rounded-full h-2 mt-2">
                                                <div
                                                    className={`h-2 rounded-full transition-all ${progress >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                                                    style={{ width: `${progress}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Sessions Count */}
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">Sesiones</p>
                                            <span className="text-2xl font-bold text-white">{pkg.classes.length}</span>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {pkg.classes.filter(c => c.status === 'completed').length} completadas
                                            </p>
                                        </div>

                                        {/* Payment */}
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">Pagado</p>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-2xl font-bold text-white">
                                                    {pkg.amount_paid.toLocaleString()}
                                                </span>
                                                <span className="text-sm text-gray-400">/ {pkg.total_price.toLocaleString()}</span>
                                            </div>
                                        </div>

                                        {/* Balance */}
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">Saldo pendiente</p>
                                            <span className={`text-2xl font-bold ${remaining > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                                {remaining > 0 ? `${remaining.toLocaleString()}` : 'Pagado'}
                                            </span>
                                        </div>
                                    </div>
                                </button>

                                {/* Expanded Content */}
                                {isExpanded && (
                                    <div className="border-t border-white/5 p-6 space-y-6">
                                        {/* Sessions List */}
                                        <div>
                                            <div className="flex items-center justify-between mb-4">
                                                <h4 className="font-bold text-sm text-gray-300 uppercase tracking-wider">Sesiones</h4>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setAddSessionPkgId(pkg.id); }}
                                                    className="flex items-center gap-1.5 text-sm bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg font-medium transition-colors"
                                                >
                                                    <Plus size={14} /> Nueva Sesion
                                                </button>
                                            </div>

                                            {pkg.classes.length === 0 ? (
                                                <p className="text-sm text-gray-500 italic py-4 text-center">No hay sesiones agendadas aun.</p>
                                            ) : (
                                                <div className="space-y-2">
                                                    {pkg.classes.map((cls, idx) => (
                                                        <div key={cls.id} className="flex items-center justify-between bg-[#0f1113] rounded-xl p-4 border border-white/5">
                                                            <div className="flex items-center gap-4">
                                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                                                                    ${cls.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                                                        cls.status === 'confirmed' ? 'bg-blue-500/20 text-blue-400' :
                                                                            cls.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                                                                                'bg-yellow-500/20 text-yellow-400'
                                                                    }`}>
                                                                    {idx + 1}
                                                                </div>
                                                                <div>
                                                                    <p className="font-medium">
                                                                        {new Date(cls.scheduled_at).toLocaleDateString('es-CR', {
                                                                            weekday: 'long', day: 'numeric', month: 'short'
                                                                        })}
                                                                        {' '}
                                                                        <span className="text-gray-400">
                                                                            {new Date(cls.scheduled_at).toLocaleTimeString('es-CR', {
                                                                                hour: '2-digit', minute: '2-digit'
                                                                            })}
                                                                        </span>
                                                                    </p>
                                                                    <p className="text-xs text-gray-500">
                                                                        {cls.duration_minutes} min — {cls.tutor_name}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-2">
                                                                {/* Status toggle */}
                                                                {cls.status !== 'completed' && cls.status !== 'cancelled' && (
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); handleUpdateClassStatus(cls.id, 'completed'); }}
                                                                        className="text-xs bg-green-500/10 text-green-400 hover:bg-green-500/20 px-3 py-1.5 rounded-lg font-medium transition-colors"
                                                                    >
                                                                        <CheckCircle2 size={12} className="inline mr-1" />
                                                                        Completada
                                                                    </button>
                                                                )}
                                                                {cls.status === 'completed' && (
                                                                    <span className="text-xs bg-green-500/10 text-green-400 px-3 py-1.5 rounded-lg font-medium">
                                                                        Completada
                                                                    </span>
                                                                )}
                                                                {cls.status === 'cancelled' && (
                                                                    <span className="text-xs bg-red-500/10 text-red-400 px-3 py-1.5 rounded-lg font-medium">
                                                                        Cancelada
                                                                    </span>
                                                                )}
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleDeleteClass(cls.id); }}
                                                                    className="p-1.5 hover:bg-red-500/10 text-gray-500 hover:text-red-400 rounded-lg transition-colors"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Hours Summary */}
                                            <div className="flex items-center gap-6 mt-4 text-sm">
                                                <span className="text-gray-400">
                                                    Agendadas: <strong className="text-white">{scheduled}h</strong>
                                                </span>
                                                <span className="text-gray-400">
                                                    Impartidas: <strong className="text-green-400">{delivered}h</strong>
                                                </span>
                                                <span className="text-gray-400">
                                                    Faltan: <strong className={`${pkg.package_hours - delivered > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                                                        {Math.max(0, pkg.package_hours - delivered)}h
                                                    </strong>
                                                </span>
                                            </div>
                                        </div>

                                        {/* Payment Section */}
                                        <div className="border-t border-white/5 pt-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <h4 className="font-bold text-sm text-gray-300 uppercase tracking-wider">Pagos</h4>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setPaymentPkgId(pkg.id); setPaymentAmount(0); }}
                                                    className="flex items-center gap-1.5 text-sm bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-lg font-medium transition-colors"
                                                >
                                                    <DollarSign size={14} /> Registrar Pago
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-3 gap-4">
                                                <div className="bg-[#0f1113] rounded-xl p-4 border border-white/5">
                                                    <p className="text-xs text-gray-500 mb-1">Precio Total</p>
                                                    <p className="text-xl font-bold">{pkg.total_price.toLocaleString()}</p>
                                                </div>
                                                <div className="bg-[#0f1113] rounded-xl p-4 border border-white/5">
                                                    <p className="text-xs text-gray-500 mb-1">Total Pagado</p>
                                                    <p className="text-xl font-bold text-green-400">{pkg.amount_paid.toLocaleString()}</p>
                                                </div>
                                                <div className="bg-[#0f1113] rounded-xl p-4 border border-white/5">
                                                    <p className="text-xs text-gray-500 mb-1">Pendiente</p>
                                                    <p className={`text-xl font-bold ${remaining > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                                        {remaining > 0 ? remaining.toLocaleString() : 'Saldado'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Package Actions */}
                                        <div className="border-t border-white/5 pt-4 flex gap-3">
                                            {delivered >= pkg.package_hours && pkg.status !== 'completed' && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleCompletePackage(pkg.id); }}
                                                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-xl font-bold text-sm transition-colors"
                                                >
                                                    <CheckCircle2 size={16} /> Marcar Paquete Completado
                                                </button>
                                            )}
                                            {pkg.student_phone && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        let phone = pkg.student_phone.replace(/\D/g, '');
                                                        if (phone.length === 8) phone = '506' + phone;
                                                        window.open(`https://wa.me/${phone}`, '_blank');
                                                    }}
                                                    className="flex items-center gap-2 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/20 px-4 py-2 rounded-xl font-medium text-sm transition-colors"
                                                >
                                                    <MessageCircle size={16} /> WhatsApp
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </main>

            {/* ============ MODAL: Add Session ============ */}
            {addSessionPkgId && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[#1a1c1e] rounded-2xl border border-white/10 p-6 w-full max-w-md shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold">Nueva Sesion</h3>
                            <button onClick={() => setAddSessionPkgId(null)} className="p-1 hover:bg-white/10 rounded-lg">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Fecha</label>
                                    <input type="date" className="w-full bg-[#0f1113] border border-white/10 rounded-xl p-3"
                                        value={newSessionDate} onChange={e => setNewSessionDate(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Hora</label>
                                    <input type="time" className="w-full bg-[#0f1113] border border-white/10 rounded-xl p-3"
                                        value={newSessionTime} onChange={e => setNewSessionTime(e.target.value)} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Duracion (minutos)</label>
                                <select className="w-full bg-[#0f1113] border border-white/10 rounded-xl p-3"
                                    value={newSessionDuration} onChange={e => setNewSessionDuration(Number(e.target.value))}>
                                    <option value={30}>30 min</option>
                                    <option value={60}>1 hora</option>
                                    <option value={90}>1.5 horas</option>
                                    <option value={120}>2 horas</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Tutor</label>
                                <select className="w-full bg-[#0f1113] border border-white/10 rounded-xl p-3"
                                    value={newSessionTutor} onChange={e => setNewSessionTutor(e.target.value)}>
                                    <option value="">Selecciona tutor...</option>
                                    {tutors.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setAddSessionPkgId(null)} className="flex-1 px-4 py-2.5 hover:bg-white/10 rounded-xl transition-colors">
                                Cancelar
                            </button>
                            <button
                                onClick={handleAddSession}
                                disabled={!newSessionDate || !newSessionTime || saving}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-6 py-2.5 rounded-xl font-bold transition-colors"
                            >
                                {saving ? 'Guardando...' : 'Agendar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ============ MODAL: Register Payment ============ */}
            {paymentPkgId && (() => {
                const pkg = packages.find(p => p.id === paymentPkgId);
                const rem = pkg ? pkg.total_price - pkg.amount_paid : 0;
                return (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                        <div className="bg-[#1a1c1e] rounded-2xl border border-white/10 p-6 w-full max-w-md shadow-2xl">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold">Registrar Pago</h3>
                                <button onClick={() => setPaymentPkgId(null)} className="p-1 hover:bg-white/10 rounded-lg">
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="bg-[#0f1113] rounded-xl p-4 border border-white/5 mb-4">
                                <p className="text-sm text-gray-400">Saldo pendiente: <strong className="text-white">{rem.toLocaleString()}</strong></p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Monto del pago</label>
                                    <input
                                        type="number"
                                        min={0}
                                        className="w-full bg-[#0f1113] border border-white/10 rounded-xl p-3 text-lg font-bold"
                                        value={paymentAmount || ''}
                                        onChange={e => setPaymentAmount(Number(e.target.value))}
                                        placeholder="0"
                                    />
                                </div>

                                {/* Quick amounts */}
                                <div className="flex gap-2">
                                    {rem > 0 && (
                                        <button
                                            onClick={() => setPaymentAmount(rem)}
                                            className="text-xs bg-green-500/10 text-green-400 px-3 py-1.5 rounded-lg hover:bg-green-500/20 transition-colors"
                                        >
                                            Pago total ({rem.toLocaleString()})
                                        </button>
                                    )}
                                    {rem > 0 && (
                                        <button
                                            onClick={() => setPaymentAmount(Math.round(rem / 2))}
                                            className="text-xs bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded-lg hover:bg-blue-500/20 transition-colors"
                                        >
                                            50% ({Math.round(rem / 2).toLocaleString()})
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button onClick={() => setPaymentPkgId(null)} className="flex-1 px-4 py-2.5 hover:bg-white/10 rounded-xl transition-colors">
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleRegisterPayment}
                                    disabled={paymentAmount <= 0 || saving}
                                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 px-6 py-2.5 rounded-xl font-bold transition-colors"
                                >
                                    {saving ? 'Guardando...' : 'Registrar Pago'}
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
