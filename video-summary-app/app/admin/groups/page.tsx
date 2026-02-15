"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Calendar, Users, BookOpen, ChevronLeft,
    Plus, Clock, Target, ArrowRight,
    CheckCircle2, AlertCircle
} from "lucide-react";
import { supabase } from "../../utils/supabase";

interface GroupConfig {
    id: string;
    subject_id: string;
    subject_name: string;
    modality: 'EDAD_P1' | 'EDAD_P2' | 'Individual' | 'Small_Package';
    startDate: string;
    examDate: string;
    enrolled: number;
    capacity: number;
    status: 'enrolling' | 'active' | 'finished';
}

const MEP_MODALITIES = [
    { id: 'EDAD_P1', name: 'EDAD Prueba 1 (10°)', weeks: 12 },
    { id: 'EDAD_P2', name: 'EDAD Prueba 2 (11°)', weeks: 12 },
    { id: 'Intensive', name: 'Formativo Intensivo', weeks: 4 },
];

export default function GroupsPage() {
    const router = useRouter();
    const [groups, setGroups] = useState<GroupConfig[]>([
        {
            id: '1',
            subject_id: 'mat',
            subject_name: 'Mate - Prueba 1',
            modality: 'EDAD_P1',
            startDate: '2026-03-01',
            examDate: '2026-06-28',
            enrolled: 12,
            capacity: 25,
            status: 'enrolling'
        },
        {
            id: '2',
            subject_id: 'esp',
            subject_name: 'Español - Prueba 1',
            modality: 'EDAD_P1',
            startDate: '2026-03-08',
            examDate: '2026-06-28',
            enrolled: 8,
            capacity: 25,
            status: 'enrolling'
        }
    ]);

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
                            <h1 className="text-xl font-bold">Gestión de Grupos MEP</h1>
                            <p className="text-sm text-gray-400">Programación de Ciclos y Modalidades</p>
                        </div>
                    </div>
                    <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl transition-all text-sm font-bold shadow-lg shadow-blue-500/20">
                        <Plus size={18} />
                        Nuevo Grupo
                    </button>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-8">
                {/* Modality Info */}
                <div className="grid md:grid-cols-3 gap-6 mb-12">
                    {MEP_MODALITIES.map(m => (
                        <div key={m.id} className="bg-[#1a1c1e] rounded-2xl border border-white/5 p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5">
                                <Target size={60} />
                            </div>
                            <h3 className="text-lg font-bold mb-1">{m.name}</h3>
                            <p className="text-sm text-gray-400 mb-4">{m.weeks} semanas de duración</p>
                            <div className="flex items-center gap-2 text-xs font-medium text-blue-400">
                                <Clock size={14} />
                                Planeación Estándar
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold">Ciclos en Curso</h2>
                    <div className="flex gap-2">
                        <span className="flex items-center gap-1.5 text-xs text-gray-500 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                            <div className="w-2 h-2 rounded-full bg-green-500" /> Abierto
                        </span>
                        <span className="flex items-center gap-1.5 text-xs text-gray-500 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                            <div className="w-2 h-2 rounded-full bg-blue-500" /> En Clase
                        </span>
                    </div>
                </div>

                {/* Groups Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groups.map(group => (
                        <div key={group.id} className="bg-[#1a1c1e] rounded-3xl border border-white/10 hover:border-blue-500/30 transition-all group overflow-hidden">
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400">
                                        <BookOpen size={24} />
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${group.status === 'enrolling' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                                        {group.status === 'enrolling' ? 'Matrícula Abierta' : 'Activo'}
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold mb-1">{group.subject_name}</h3>
                                <p className="text-sm text-gray-400 mb-6">Inicia: {new Date(group.startDate).toLocaleDateString('es-CR')}</p>

                                <div className="space-y-4">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Inscritos</span>
                                        <span className="font-bold">{group.enrolled} / {group.capacity}</span>
                                    </div>
                                    <div className="h-2 w-full bg-[#0f1113] rounded-full overflow-hidden border border-white/5">
                                        <div
                                            className="h-full bg-blue-500 transition-all duration-1000"
                                            style={{ width: `${(group.enrolled / group.capacity) * 100}%` }}
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 p-3 bg-amber-500/5 rounded-xl border border-amber-500/10">
                                        <AlertCircle className="text-amber-500" size={16} />
                                        <span className="text-xs text-amber-500/80">Examen MEP: {new Date(group.examDate).toLocaleDateString('es-CR')}</span>
                                    </div>
                                </div>
                            </div>
                            <button className="w-full py-4 bg-white/5 hover:bg-white/10 text-sm font-bold border-t border-white/5 flex items-center justify-center gap-2 group-hover:text-blue-400 transition-all">
                                Gestionar Estudiantes
                                <ArrowRight size={16} />
                            </button>
                        </div>
                    ))}

                    <button className="bg-[#1a1c1e] rounded-3xl border border-dashed border-white/10 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all flex flex-col items-center justify-center gap-4 py-8 group">
                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-blue-500/20 transition-all">
                            <Plus className="text-gray-500 group-hover:text-blue-400" size={32} />
                        </div>
                        <div className="text-center px-6">
                            <p className="font-bold text-gray-400 group-hover:text-white">Programar Nuevo Ciclo</p>
                            <p className="text-xs text-gray-600 mt-1">Define fechas para la próxima convocatoria MEP</p>
                        </div>
                    </button>
                </div>
            </main>
        </div>
    );
}
