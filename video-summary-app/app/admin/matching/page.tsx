'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft, Play, Check, X, Users, User, Clock, DollarSign,
    RefreshCw, BookOpen, Calendar, ChevronRight, Sparkles
} from 'lucide-react';

interface MatchProposal {
    student_id: string;
    student_name: string;
    tutor_id: string;
    tutor_name: string;
    subject_id: string;
    subject_name: string;
    proposed_day: string;
    proposed_time: string;
    duration_minutes: number;
    type: 'individual' | 'grupal';
    price: number;
    score: number;
}

const DAY_LABELS: Record<string, string> = {
    monday: 'Lunes',
    tuesday: 'Martes',
    wednesday: 'Miércoles',
    thursday: 'Jueves',
    friday: 'Viernes',
    saturday: 'Sábado',
    sunday: 'Domingo'
};

export default function MatchingDashboardPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [running, setRunning] = useState(false);
    const [proposals, setProposals] = useState<MatchProposal[]>([]);
    const [confirming, setConfirming] = useState<string | null>(null);

    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

    // Cargar propuestas al iniciar
    useEffect(() => {
        loadProposals();
    }, []);

    const loadProposals = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${BACKEND_URL}/api/scheduler/proposals`);
            const data = await res.json();
            if (data.success) {
                setProposals(data.proposals);
            }
        } catch (err) {
            console.error('Error loading proposals:', err);
        } finally {
            setLoading(false);
        }
    };

    const runOptimization = async () => {
        setRunning(true);
        try {
            const res = await fetch(`${BACKEND_URL}/api/scheduler/run`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json();
            if (data.success) {
                setProposals(data.proposals);
            } else {
                alert('Error al ejecutar optimización: ' + data.error);
            }
        } catch (err) {
            console.error('Error running optimization:', err);
            alert('Error de conexión con el backend');
        } finally {
            setRunning(false);
        }
    };

    const confirmMatch = async (proposal: MatchProposal) => {
        const key = `${proposal.student_id}-${proposal.tutor_id}-${proposal.subject_id}`;
        setConfirming(key);

        try {
            const res = await fetch(`${BACKEND_URL}/api/scheduler/confirm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    student_id: proposal.student_id,
                    tutor_id: proposal.tutor_id,
                    subject_id: proposal.subject_id
                })
            });
            const data = await res.json();

            if (data.success) {
                // Remover la propuesta confirmada
                setProposals(prev => prev.filter(p =>
                    !(p.student_id === proposal.student_id &&
                        p.tutor_id === proposal.tutor_id &&
                        p.subject_id === proposal.subject_id &&
                        p.proposed_day === proposal.proposed_day &&
                        p.proposed_time === proposal.proposed_time)
                ));
                alert(`✅ Clase creada: ${data.message}`);
            } else {
                alert('Error: ' + data.error);
            }
        } catch (err) {
            console.error('Error confirming match:', err);
            alert('Error de conexión');
        } finally {
            setConfirming(null);
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 70) return 'text-green-400 bg-green-500/20';
        if (score >= 40) return 'text-yellow-400 bg-yellow-500/20';
        return 'text-red-400 bg-red-500/20';
    };

    return (
        <div className="min-h-screen bg-[#0f1113] text-white">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-[#0f1113]/95 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.back()}
                            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold flex items-center gap-2">
                                <Sparkles className="text-purple-400" size={24} />
                                Matching Inteligente
                            </h1>
                            <p className="text-sm text-gray-400">
                                Empareja estudiantes con tutores automáticamente
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={runOptimization}
                        disabled={running}
                        className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 px-6 py-3 rounded-xl font-semibold transition-colors"
                    >
                        {running ? (
                            <>
                                <RefreshCw size={18} className="animate-spin" />
                                Optimizando...
                            </>
                        ) : (
                            <>
                                <Play size={18} />
                                Ejecutar Optimización
                            </>
                        )}
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-6xl mx-auto px-6 py-8">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="bg-[#1a1c1e] rounded-2xl border border-white/5 p-6">
                        <p className="text-gray-400 text-sm">Propuestas Generadas</p>
                        <p className="text-3xl font-bold mt-2">{proposals.length}</p>
                    </div>
                    <div className="bg-[#1a1c1e] rounded-2xl border border-white/5 p-6">
                        <p className="text-gray-400 text-sm">Alta Compatibilidad</p>
                        <p className="text-3xl font-bold mt-2 text-green-400">
                            {proposals.filter(p => p.score >= 70).length}
                        </p>
                    </div>
                    <div className="bg-[#1a1c1e] rounded-2xl border border-white/5 p-6">
                        <p className="text-gray-400 text-sm">Estudiantes Únicos</p>
                        <p className="text-3xl font-bold mt-2">
                            {new Set(proposals.map(p => p.student_id)).size}
                        </p>
                    </div>
                </div>

                {/* Proposals List */}
                {loading ? (
                    <div className="text-center py-20">
                        <RefreshCw size={40} className="mx-auto mb-4 animate-spin text-gray-400" />
                        <p className="text-gray-400">Cargando propuestas...</p>
                    </div>
                ) : proposals.length === 0 ? (
                    <div className="text-center py-20">
                        <Users size={48} className="mx-auto mb-4 text-gray-600" />
                        <p className="text-gray-400 text-lg">No hay propuestas de matching</p>
                        <p className="text-gray-500 text-sm mt-2">
                            Ejecuta la optimización para generar emparejamientos
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {proposals.map((proposal, index) => {
                            const key = `${proposal.student_id}-${proposal.tutor_id}-${proposal.subject_id}-${proposal.proposed_day}-${proposal.proposed_time}`;
                            const isConfirming = confirming === `${proposal.student_id}-${proposal.tutor_id}-${proposal.subject_id}`;

                            return (
                                <div
                                    key={key}
                                    className="bg-[#1a1c1e] rounded-2xl border border-white/5 p-6 hover:border-white/10 transition-all"
                                >
                                    <div className="flex items-center justify-between">
                                        {/* Left: Student & Tutor */}
                                        <div className="flex items-center gap-6">
                                            {/* Score Badge */}
                                            <div className={`w-14 h-14 rounded-xl flex items-center justify-center font-bold ${getScoreColor(proposal.score)}`}>
                                                {proposal.score.toFixed(0)}
                                            </div>

                                            {/* Student */}
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-blue-500/20 rounded-xl">
                                                    <User className="text-blue-400" size={20} />
                                                </div>
                                                <div>
                                                    <p className="font-medium">{proposal.student_name}</p>
                                                    <p className="text-xs text-gray-400">Estudiante</p>
                                                </div>
                                            </div>

                                            <ChevronRight className="text-gray-600" size={20} />

                                            {/* Tutor */}
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-purple-500/20 rounded-xl">
                                                    <Users className="text-purple-400" size={20} />
                                                </div>
                                                <div>
                                                    <p className="font-medium">{proposal.tutor_name}</p>
                                                    <p className="text-xs text-gray-400">Tutor</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Middle: Details */}
                                        <div className="flex items-center gap-6">
                                            <div className="flex items-center gap-2 text-sm">
                                                <BookOpen size={16} className="text-gray-400" />
                                                <span>{proposal.subject_name}</span>
                                            </div>

                                            <div className="flex items-center gap-2 text-sm">
                                                <Calendar size={16} className="text-gray-400" />
                                                <span>{DAY_LABELS[proposal.proposed_day]} {proposal.proposed_time}</span>
                                            </div>

                                            <div className="flex items-center gap-2 text-sm">
                                                <Clock size={16} className="text-gray-400" />
                                                <span>{proposal.duration_minutes} min</span>
                                            </div>

                                            <div className={`flex items-center gap-2 text-sm px-3 py-1 rounded-full ${proposal.type === 'individual'
                                                ? 'bg-blue-500/20 text-blue-400'
                                                : 'bg-green-500/20 text-green-400'
                                                }`}>
                                                {proposal.type === 'individual' ? <User size={14} /> : <Users size={14} />}
                                                {proposal.type}
                                            </div>

                                            <div className="flex items-center gap-2 text-sm font-medium">
                                                <DollarSign size={16} className="text-green-400" />
                                                <span className="text-green-400">${proposal.price}</span>
                                            </div>
                                        </div>

                                        {/* Right: Actions */}
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => confirmMatch(proposal)}
                                                disabled={isConfirming}
                                                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 px-4 py-2 rounded-xl font-medium transition-colors"
                                            >
                                                {isConfirming ? (
                                                    <RefreshCw size={16} className="animate-spin" />
                                                ) : (
                                                    <Check size={16} />
                                                )}
                                                Confirmar
                                            </button>
                                            <button
                                                onClick={() => setProposals(prev => prev.filter((_, i) => i !== index))}
                                                className="p-2 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-xl transition-colors"
                                            >
                                                <X size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Quick Links */}
                <div className="mt-12 grid grid-cols-3 gap-4">
                    <button
                        onClick={() => router.push('/students/new')}
                        className="bg-[#1a1c1e] rounded-2xl border border-white/5 p-6 hover:border-blue-500/50 transition-all text-left"
                    >
                        <User className="text-blue-400 mb-3" size={24} />
                        <h3 className="font-semibold">Agregar Estudiante</h3>
                        <p className="text-sm text-gray-400 mt-1">Registrar nuevo estudiante</p>
                    </button>

                    <button
                        onClick={() => router.push('/tutors/new')}
                        className="bg-[#1a1c1e] rounded-2xl border border-white/5 p-6 hover:border-purple-500/50 transition-all text-left"
                    >
                        <Users className="text-purple-400 mb-3" size={24} />
                        <h3 className="font-semibold">Agregar Tutor</h3>
                        <p className="text-sm text-gray-400 mt-1">Registrar nuevo tutor</p>
                    </button>

                    <button
                        onClick={() => router.push('/subjects/new')}
                        className="bg-[#1a1c1e] rounded-2xl border border-white/5 p-6 hover:border-orange-500/50 transition-all text-left"
                    >
                        <BookOpen className="text-orange-400 mb-3" size={24} />
                        <h3 className="font-semibold">Agregar Materia</h3>
                        <p className="text-sm text-gray-400 mt-1">Crear nueva materia</p>
                    </button>
                </div>
            </main>
        </div>
    );
}
