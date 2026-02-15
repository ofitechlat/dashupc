"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Calculator, TrendingUp, Users, Clock, DollarSign,
    ChevronLeft, Plus, Trash2, Save, RefreshCw,
    BarChart3, PieChart, Target, Zap
} from "lucide-react";
import { supabase } from "../../utils/supabase";

interface MEPSubject {
    id: string;
    name: string;
    hoursPerWeek: number;
    color: string;
    active: boolean;
}

interface PricePackage {
    id: string;
    name: string;
    subjectCount: number;
    price: number;
}

const MEP_SUBJECTS_PRESET: MEPSubject[] = [
    { id: 'esp', name: 'Español', hoursPerWeek: 1, color: 'blue', active: true },
    { id: 'soc', name: 'Estudios Sociales', hoursPerWeek: 1, color: 'orange', active: true },
    { id: 'civ', name: 'Cívica', hoursPerWeek: 1, color: 'amber', active: true },
    { id: 'ing', name: 'Inglés', hoursPerWeek: 1, color: 'purple', active: true },
    { id: 'cie', name: 'Ciencias', hoursPerWeek: 1, color: 'green', active: true },
    { id: 'mat', name: 'Matemáticas', hoursPerWeek: 2, color: 'red', active: true },
];

const DEFAULT_PACKAGES: PricePackage[] = [
    { id: 'single', name: 'Individual (1 Materia)', subjectCount: 1, price: 15000 },
    { id: 'triple', name: 'Tercio (3 Materias)', subjectCount: 3, price: 35000 },
    { id: 'full', name: 'Bloque (6 Materias)', subjectCount: 6, price: 60000 },
];

export default function AccountingPage() {
    const router = useRouter();
    const [tutorPay, setTutorPay] = useState(3500); // Updated to user's screenshot value
    const [subjects, setSubjects] = useState(MEP_SUBJECTS_PRESET);
    const [packages, setPackages] = useState(DEFAULT_PACKAGES);
    const [studentMix, setStudentMix] = useState<Record<string, number>>({
        'single': 5,
        'triple': 10,
        'full': 15,
    });
    const [isSaving, setIsSaving] = useState(false);

    // Calculated fields
    const activeSubjects = subjects.filter(s => s.active);
    const totalHoursPerWeek = activeSubjects.reduce((sum, s) => sum + s.hoursPerWeek, 0);
    const weeklyTutorCost = totalHoursPerWeek * tutorPay;
    const monthlyTutorCost = weeklyTutorCost * 4;

    const totalStudents = Object.values(studentMix).reduce((a, b) => a + b, 0);
    const monthlyRevenue = packages.reduce((sum, pkg) => {
        return sum + (pkg.price * (studentMix[pkg.id] || 0));
    }, 0);

    const monthlyProfit = monthlyRevenue - monthlyTutorCost;
    const margin = monthlyRevenue > 0 ? (monthlyProfit / monthlyRevenue) * 100 : 0;
    const breakEvenRevenue = monthlyTutorCost;

    const toggleSubject = (id: string) => {
        setSubjects(prev => prev.map(s => s.id === id ? { ...s, active: !s.active } : s));
    };

    const updateMix = (packageId: string, count: number) => {
        setStudentMix(prev => ({ ...prev, [packageId]: count }));
    };

    return (
        <div className="min-h-screen bg-[#0f1113] text-white">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-[#0f1113]/95 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.push('/admin')} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                            <ChevronLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold">Simulador Financiero MEP</h1>
                            <p className="text-sm text-gray-400">Análisis de Costos y Rentabilidad</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-8">
                <div className="grid gap-6 lg:grid-cols-3">

                    {/* Inputs Card */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-[#1a1c1e] rounded-2xl border border-white/5 p-6">
                            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                                <Calculator className="text-blue-400" size={20} />
                                Parámetros Base
                            </h2>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2 font-medium">Pago a Tutor (por hora)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">₡</span>
                                        <input
                                            type="number"
                                            value={tutorPay}
                                            onChange={(e) => setTutorPay(Number(e.target.value))}
                                            className="w-full bg-[#0f1113] border border-white/10 rounded-xl pl-8 pr-4 py-3 focus:border-blue-500 outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-white/5">
                                    <h3 className="text-sm font-bold text-gray-500 uppercase mb-4 tracking-wider text-xs">Simulador de Matrícula (Mix)</h3>
                                    <div className="space-y-4">
                                        {packages.map(pkg => (
                                            <div key={pkg.id}>
                                                <div className="flex justify-between text-xs mb-2">
                                                    <span className="text-gray-400">{pkg.name}</span>
                                                    <span className="text-blue-400 font-bold">₡{pkg.price.toLocaleString()}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="range"
                                                        min="0"
                                                        max="100"
                                                        value={studentMix[pkg.id] || 0}
                                                        onChange={(e) => updateMix(pkg.id, Number(e.target.value))}
                                                        className="flex-1 accent-blue-500 h-1.5"
                                                    />
                                                    <span className="w-8 text-right font-mono font-bold text-sm">
                                                        {studentMix[pkg.id] || 0}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-6 p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-400">Total Estudiantes</span>
                                            <span className="font-bold text-white">{totalStudents}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Subject Toggle Card */}
                        <div className="bg-[#1a1c1e] rounded-2xl border border-white/5 p-6">
                            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                                <Clock className="text-purple-400" size={20} />
                                Horas de Tutoría ({totalHoursPerWeek}h/sem)
                            </h2>
                            <div className="space-y-3">
                                {subjects.map(subject => (
                                    <button
                                        key={subject.id}
                                        onClick={() => toggleSubject(subject.id)}
                                        className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${subject.active ? 'bg-white/5 border-white/10' : 'opacity-40 border-transparent hover:opacity-60'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full bg-${getTailwindColor(subject.color)}`} />
                                            <span className="text-sm font-medium">{subject.name}</span>
                                        </div>
                                        <span className="text-xs font-mono text-gray-500">{subject.hoursPerWeek}h</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Stats & Charts Card */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Summary Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-[#1a1c1e] rounded-2xl border border-white/5 p-6 overflow-hidden relative">
                                <div className="absolute top-0 right-0 p-8 opacity-5">
                                    <TrendingUp size={80} />
                                </div>
                                <p className="text-sm text-gray-400 mb-1">Rentabilidad Mensual</p>
                                <h3 className={`text-3xl font-bold ${monthlyProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    ₡{monthlyProfit.toLocaleString()}
                                </h3>
                                <div className="mt-4 flex items-center gap-2">
                                    <span className={`px-2 py-1 rounded-md text-xs font-bold ${monthlyProfit >= 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                        {margin.toFixed(1)}% Margen
                                    </span>
                                </div>
                            </div>

                            <div className="bg-[#1a1c1e] rounded-2xl border border-white/5 p-6 overflow-hidden relative">
                                <div className="absolute top-0 right-0 p-8 opacity-5">
                                    <TrendingUp size={80} />
                                </div>
                                <p className="text-sm text-gray-400 mb-1">Rentabilidad Mensual</p>
                                <h3 className={`text-3xl font-bold ${monthlyProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    ₡{monthlyProfit.toLocaleString()}
                                </h3>
                                <div className="mt-4 flex items-center gap-2">
                                    <span className={`px-2 py-1 rounded-md text-xs font-bold ${monthlyProfit >= 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                        {margin.toFixed(1)}% Margen
                                    </span>
                                </div>
                            </div>

                            <div className="bg-[#1a1c1e] rounded-2xl border border-white/5 p-6">
                                <p className="text-sm text-gray-400 mb-1">Punto de Equilibrio (Ingresos)</p>
                                <h3 className="text-3xl font-bold text-blue-400">
                                    ₡{breakEvenRevenue.toLocaleString()}
                                </h3>
                                <p className="text-xs text-gray-500 mt-4">
                                    Monto que debes facturar mensualmente para cubrir el pago de los tutores activos.
                                </p>
                            </div>
                        </div>

                        {/* Detailed Metrics */}
                        <div className="bg-[#1a1c1e] rounded-2xl border border-white/5 p-8">
                            <h2 className="text-xl font-bold mb-8 flex items-center gap-3">
                                <BarChart3 className="text-cyan-400" />
                                Proyección de Flujo de Caja
                            </h2>

                            <div className="space-y-8">
                                {/* Revenue Bar */}
                                <div>
                                    <div className="flex justify-between items-end mb-3">
                                        <div className="space-y-1">
                                            <p className="text-sm text-gray-400 font-medium">Ingresos Totales (Bruto)</p>
                                            <p className="text-2xl font-bold text-white">₡{monthlyRevenue.toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <div className="h-4 w-full bg-[#0f1113] rounded-full overflow-hidden border border-white/5">
                                        <div
                                            className="h-full bg-gradient-to-r from-blue-600 to-cyan-500 transition-all duration-500"
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                </div>

                                {/* Cost Breakdown */}
                                <div className="grid md:grid-cols-2 gap-8 pt-4 border-t border-white/5">
                                    <div className="space-y-6">
                                        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Desglose de Egresos</h4>
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-sm bg-red-500" />
                                                    <span className="text-sm">Pago a Tutores</span>
                                                </div>
                                                <span className="font-semibold text-red-400">₡{monthlyTutorCost.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-gray-500">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-sm bg-gray-700" />
                                                    <span className="text-sm">Otros Gastos (Admin)</span>
                                                </div>
                                                <span className="font-semibold">₡0</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col justify-center items-center bg-[#0f1113]/50 rounded-2xl p-6 border border-white/5">
                                        <div className="relative w-32 h-32 flex items-center justify-center">
                                            <svg className="w-full h-full transform -rotate-90">
                                                <circle
                                                    cx="64"
                                                    cy="64"
                                                    r="58"
                                                    stroke="currentColor"
                                                    strokeWidth="12"
                                                    fill="transparent"
                                                    className="text-white/5"
                                                />
                                                <circle
                                                    cx="64"
                                                    cy="64"
                                                    r="58"
                                                    stroke="currentColor"
                                                    strokeWidth="12"
                                                    fill="transparent"
                                                    strokeDasharray={364.4}
                                                    strokeDashoffset={364.4 * (1 - margin / 100)}
                                                    className={`${margin > 0 ? 'text-green-500' : 'text-red-500'} transition-all duration-1000 ease-out`}
                                                />
                                            </svg>
                                            <div className="absolute inset-0 flex items-center justify-center flex-col">
                                                <span className="text-2xl font-bold">{margin > 0 ? margin.toFixed(0) : 0}%</span>
                                                <span className="text-[10px] text-gray-500 uppercase">ROI</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Optimization Strategy Card */}
                        <div className="bg-[#1a1c1e] rounded-2xl border border-white/5 p-8 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 text-blue-500/10 group-hover:text-blue-500/20 transition-all">
                                <Target size={120} />
                            </div>

                            <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
                                <Zap className="text-amber-400" />
                                Estrategia de Optimización
                            </h2>

                            <div className="grid md:grid-cols-2 gap-8 relative z-10">
                                <div className="space-y-6">
                                    <div>
                                        <h4 className="text-blue-400 font-bold text-sm uppercase mb-2">1. Prioridad de Margen 100%</h4>
                                        <p className="text-sm text-gray-400 leading-relaxed">
                                            Si ya tienes un grupo abierto (ej. Matemáticas), el costo del tutor es **fijo**.
                                            Cada estudiante extra que se sume a ese grupo es **100% ganancia libre**.
                                        </p>
                                    </div>
                                    <div>
                                        <h4 className="text-purple-400 font-bold text-sm uppercase mb-2">2. Incentivo de Bloque</h4>
                                        <p className="text-sm text-gray-400 leading-relaxed">
                                            Para los 5 estudiantes con cursos mixtos, ofréceles el "Bloque Completo" con descuento.
                                            Solo te conviene si el aumento en ingresos supera el pago de nuevas horas de tutor.
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-[#0f1113] rounded-2xl p-6 border border-white/5 self-start">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-4">Lógica de Decisión</h4>
                                    <div className="space-y-3">
                                        <div className="flex gap-3 text-xs">
                                            <div className="w-5 h-5 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center font-bold">1</div>
                                            <span>Llenar cupos en grupos ya activos.</span>
                                        </div>
                                        <div className="flex gap-3 text-xs">
                                            <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center font-bold">2</div>
                                            <span>Abrir nuevos cursos solo si hay min. 3 alumnos.</span>
                                        </div>
                                        <div className="flex gap-3 text-xs">
                                            <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold">3</div>
                                            <span>Fusionar horarios para reducir horas de tutor.</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-4">
                            <button
                                onClick={() => window.print()}
                                className="flex-1 min-w-[200px] flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 text-white px-6 py-4 rounded-2xl border border-white/10 transition-all font-semibold"
                            >
                                <PieChart size={20} className="text-blue-400" />
                                Exportar PDF
                            </button>
                            <button
                                onClick={() => router.push('/admin/requests')}
                                className="flex-1 min-w-[200px] flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-500 text-white px-6 py-4 rounded-2xl transition-all font-semibold shadow-lg shadow-blue-500/20"
                            >
                                Ver Solicitudes Reales
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

function getTailwindColor(color: string) {
    const colors: Record<string, string> = {
        blue: 'blue-500',
        orange: 'orange-500',
        amber: 'amber-500',
        purple: 'purple-500',
        green: 'green-500',
        red: 'red-500'
    };
    return colors[color] || 'gray-500';
}
