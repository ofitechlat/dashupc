'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft, Users, User, Clock, DollarSign,
    Play, Plus, Trash2, Edit2, Sparkles,
    Check, AlertTriangle, X, BookOpen, Layers, Phone
} from 'lucide-react';

import { tutoringService } from '@/app/services/tutoringService';

interface SandboxData {
    students: any[];
    tutors: any[];
    subjects: any[];
    terms: any[];
}

export default function OptimizationSandboxPage() {
    const router = useRouter();
    const [data, setData] = useState<SandboxData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'students' | 'tutors' | 'terms'>('students');
    const [editingItem, setEditingItem] = useState<any | null>(null);
    const [saving, setSaving] = useState(false);
    const [running, setRunning] = useState(false);
    const [results, setResults] = useState<any | null>(null);
    const [selectedTerm, setSelectedTerm] = useState<string>('all');

    const SLOT_ORDER = [
        "mon_08", "mon_09", "mon_10", "mon_17", "mon_18", "mon_19",
        "tue_08", "tue_09", "tue_10", "tue_17", "tue_18", "tue_19",
        "wed_08", "wed_09", "wed_10", "wed_17", "wed_18", "wed_19",
        "thu_08", "thu_09", "thu_10", "thu_17", "thu_18", "thu_19",
        "fri_08", "fri_09", "fri_10", "fri_17", "fri_18", "fri_19"
    ];

    useEffect(() => {
        fetchSandboxData();
    }, []);

    const fetchSandboxData = async () => {
        try {
            console.log("📥 Loading data from Supabase via Service...");
            // Use the service to fetch REAL data from Supabase
            const dbData = await tutoringService.fetchOptimizationData();

            // If DB is empty, maybe fallback? or just show empty.
            // For now, assume if we integrated DB, we want DB data.
            setData(dbData);

            if (dbData.terms?.length > 0) {
                // Auto-select the active term if available
                const activeTerm = dbData.terms.find((t: any) => t.is_active);
                setSelectedTerm(activeTerm ? activeTerm.id : dbData.terms[0].id);
            }
        } catch (err) {
            console.error('Error loading Supabase data, falling back to JSON:', err);
            // Fallback to local JSON if Supabase fails (e.g. offline/dev)
            try {
                const res = await fetch('http://localhost:8000/api/sandbox/data');
                const json = await res.json();
                setData(json);
            } catch (fallbackErr) {
                console.error("Fallback failed", fallbackErr);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (updatedData: SandboxData) => {
        setSaving(true);
        try {
            const res = await fetch('http://localhost:8000/api/sandbox/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData)
            });
            if (res.ok) {
                setData(updatedData);
                setEditingItem(null);
            }
        } catch (err) {
            console.error('Error saving:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleRunOptimization = async (forceOptimization = false) => {
        if (!data) return;
        setRunning(true);
        setResults(null);

        try {
            const res = await fetch('http://localhost:8000/api/sandbox/optimize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...data, selected_term: selectedTerm, force_optimization: forceOptimization })
            });
            const result = await res.json();
            console.log('Backend Results:', result);

            // Always set results to show pre_analysis even if blocked
            setResults(result.results);

            if (result.blocked) {
                console.log('⚠️ Optimization BLOCKED:', result.results?.block_message);
            }
        } catch (err) {
            console.error('Error running optimization:', err);
        } finally {
            setRunning(false);
        }
    };

    const formatSlot = (slot: string) => {
        const days: any = { mon: 'Lun', tue: 'Mar', wed: 'Mie', thu: 'Jue', fri: 'Vie' };
        const [day, hour] = slot.split('_');
        return `${days[day] || day} ${hour}:00`;
    };

    const getSubjectName = (id: string) => data?.subjects.find(s => s.id === id)?.name || id;
    const getTermName = (id: string) => data?.terms.find(t => t.id === id)?.name || 'Sin Tanda';

    const handleAddNew = () => {
        const newItem = {
            id: 'temp_' + Date.now(),
            name: '',
            phone: '',
            level: activeTab === 'students' ? 'III Ciclo' : '',
            subjects: [],
            availability: [],
            revenue: 0,
            rate: 0,
            specialties: activeTab === 'tutors' ? [] : undefined,
            term_id: activeTab === 'students' ? (selectedTerm !== 'all' ? selectedTerm : '') : undefined,
            isNew: true
        };
        setEditingItem({ ...newItem, type: activeTab });
    };

    const handleDelete = (id: string, type: 'students' | 'tutors' | 'terms') => {
        if (!data || !confirm('¿Estás seguro de eliminar este registro?')) return;
        const newData = { ...data };
        newData[type] = newData[type].filter((i: any) => i.id !== id);
        handleSave(newData);
    };

    const handleSaveItem = () => {
        if (!data || !editingItem) return;
        const newData = { ...data };
        const listKey = editingItem.type as 'students' | 'tutors' | 'terms';

        if (editingItem.isNew) {
            const { isNew, type, ...itemToSave } = editingItem;
            itemToSave.id = type.slice(0, 1) + (newData[listKey].length + 1);
            newData[listKey] = [...newData[listKey], itemToSave];
        } else {
            newData[listKey] = newData[listKey].map((i: any) => i.id === editingItem.id ? editingItem : i);
        }
        handleSave(newData);
    };

    const handleAcceptPlan = async () => {
        if (!results) return;
        try {
            const res = await fetch('http://localhost:8000/api/sandbox/export-zip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(results)
            });
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `horarios_mep_${Date.now()}.zip`;
                document.body.appendChild(a);
                a.click();
                a.remove();
            } else {
                const errorText = await res.text();
                alert(`Error al exportar: ${errorText}`);
            }
        } catch (err) {
            console.error('Error exporting schedules:', err);
            alert('Error al generar el ZIP. Revisa la consola para más detalles.');
        }
    };

    const globalStats = results ? {
        totalRevenue: results.groups.reduce((acc: number, g: any) => acc + g.total_revenue, 0),
        totalCost: results.groups.reduce((acc: number, g: any) => acc + g.tutor_rate + g.async_cost, 0),
        netProfit: results.groups.reduce((acc: number, g: any) => acc + g.profit, 0),
        tutorPayable: results.groups.reduce((acc: number, g: any) => acc + g.tutor_rate, 0),
        platformFee: results.groups.reduce((acc: number, g: any) => acc + g.async_cost, 0),
    } : null;

    if (loading) return <div className="p-20 text-center text-gray-400 font-bold uppercase tracking-widest animate-pulse">Cargando Sandbox...</div>;

    return (
        <div className="min-h-screen bg-[#0f1113] text-white">
            <header className="sticky top-0 z-50 bg-[#0f1113]/95 backdrop-blur-xl border-b border-white/5 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.back()} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold flex items-center gap-2 text-purple-400 italic">
                                <Sparkles size={24} />
                                MEP Optimization Sandbox
                            </h1>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Planificación Estratégica</span>
                                <div className="h-1 w-1 rounded-full bg-gray-700" />
                                <select
                                    value={selectedTerm}
                                    onChange={(e) => setSelectedTerm(e.target.value)}
                                    className="bg-transparent text-[10px] text-gray-400 font-bold uppercase outline-none focus:text-purple-400 transition-colors cursor-pointer"
                                >
                                    <option value="all">Ver Todos Estudiantes</option>
                                    {data?.terms.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => handleRunOptimization(false)}
                            disabled={running}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black uppercase text-xs transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50 ${running ? 'bg-purple-600/50' : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:scale-105 active:scale-95'}`}
                        >
                            {running ? <Clock className="animate-spin" size={18} /> : <Play size={18} />}
                            {running ? 'Optimizando...' : 'Ejecutar Optimización'}
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-12 gap-8">
                <div className="col-span-3 space-y-4">
                    <div className="bg-[#16181b] rounded-2xl border border-white/5 p-2 shadow-xl">
                        <button onClick={() => setActiveTab('students')} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${activeTab === 'students' ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30' : 'hover:bg-white/5 text-gray-400'}`}>
                            <div className="flex items-center gap-3"><User size={18} /><span className="font-semibold text-sm">Estudiantes</span></div>
                            <span className="text-xs font-bold bg-blue-500/10 px-2 py-0.5 rounded-full">{data?.students.length}</span>
                        </button>
                        <button onClick={() => setActiveTab('tutors')} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all mt-1 ${activeTab === 'tutors' ? 'bg-purple-500/20 text-purple-400 ring-1 ring-purple-500/30' : 'hover:bg-white/5 text-gray-400'}`}>
                            <div className="flex items-center gap-3"><Users size={18} /><span className="font-semibold text-sm">Profesores</span></div>
                            <span className="text-xs font-bold bg-purple-500/10 px-2 py-0.5 rounded-full">{data?.tutors.length}</span>
                        </button>
                        <button onClick={() => setActiveTab('terms')} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all mt-1 ${activeTab === 'terms' ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30' : 'hover:bg-white/5 text-gray-400'}`}>
                            <div className="flex items-center gap-3"><Clock size={18} /><span className="font-semibold text-sm">Tandas (Inicios)</span></div>
                            <span className="text-xs font-bold bg-amber-500/10 px-2 py-0.5 rounded-full">{data?.terms.length}</span>
                        </button>
                    </div>

                    {results && globalStats && (
                        <div className="bg-gradient-to-br from-indigo-600/20 to-purple-600/20 rounded-3xl border border-white/10 p-6 shadow-2xl space-y-6 animate-in fade-in slide-in-from-left-4 duration-500">
                            <h4 className="text-xs font-black text-indigo-400 uppercase tracking-[0.2em]">Resumen Financiero</h4>
                            <div className="space-y-4">
                                <div className="flex justify-between items-baseline">
                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Costo Operativo</span>
                                    <span className="text-sm font-black text-gray-200">₡{globalStats.totalCost.toLocaleString()}</span>
                                </div>
                                <div className="space-y-1.5 pl-4 border-l border-white/5">
                                    <div className="flex justify-between text-[9px] text-gray-500 font-bold italic tracking-tight">
                                        <span>Profesores:</span>
                                        <span>₡{globalStats.tutorPayable.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-[9px] text-gray-500 font-bold italic tracking-tight">
                                        <span>Gestión Asínc:</span>
                                        <span>₡{globalStats.platformFee.toLocaleString()}</span>
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                                    <span className="text-xs text-green-400 font-black uppercase tracking-widest">Utilidad Neta</span>
                                    <span className="text-xl font-black text-green-500 tracking-tighter shadow-green-500/20 drop-shadow-sm">₡{globalStats.netProfit.toLocaleString()}</span>
                                </div>
                                {results.global_fulfillment_percent < 80 && (
                                    <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[10px] font-bold text-amber-400 flex items-center gap-2">
                                        <AlertTriangle size={14} />
                                        Cumplimiento: {results.global_fulfillment_percent}% — Algunos estudiantes tienen materias sin asignar.
                                    </div>
                                )}
                                <button
                                    onClick={handleAcceptPlan}
                                    className="w-full bg-green-600 hover:bg-green-500 text-white font-black text-[10px] uppercase py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl shadow-green-500/20 hover:scale-[1.02] active:scale-95"
                                >
                                    <Check size={14} /> Aceptar Plan y Generar ZIP
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="col-span-9 space-y-6">
                    <div className="bg-[#16181b] rounded-3xl border border-white/5 overflow-hidden shadow-2xl border-white/5 ring-1 ring-white/5">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                            <h2 className="text-lg font-bold flex items-center gap-2 uppercase tracking-tight italic">
                                {activeTab === 'students' ? <User className="text-blue-400" /> : activeTab === 'tutors' ? <Users className="text-purple-400" /> : <Clock className="text-amber-400" />}
                                {activeTab === 'students' ? 'Gestión de Estudiantes' : activeTab === 'tutors' ? 'Gestión de Profesores' : 'Ciclos Lectivos / Tandas'}
                            </h2>
                            <button onClick={handleAddNew} className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all border border-white/10">
                                <Plus size={14} /> Nuevo {activeTab === 'students' ? 'Estudiante' : activeTab === 'tutors' ? 'Docente' : 'Ciclo'}
                            </button>
                        </div>

                        <div className="p-6 grid gap-4">
                            {(activeTab === 'students' ? data?.students : activeTab === 'tutors' ? data?.tutors : data?.terms)?.map((item: any) => (
                                <div key={item.id} className="relative bg-[#0f1113] p-6 rounded-2xl border border-white/5 flex items-start justify-between group hover:border-white/20 transition-all shadow-lg hover:shadow-white/5">
                                    <div className="flex gap-6 w-full pr-24">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${activeTab === 'students' ? 'bg-blue-500/10 text-blue-400' : activeTab === 'tutors' ? 'bg-purple-500/10 text-purple-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                            {activeTab === 'students' ? <User size={22} /> : activeTab === 'tutors' ? <Users size={22} /> : <Clock size={22} />}
                                        </div>
                                        <div className="space-y-4 w-full">
                                            <div>
                                                <h3 className="font-bold text-gray-200 text-lg tracking-tight">{item.name}</h3>
                                                <div className="flex items-center gap-2 mt-1.5">
                                                    <span className="text-[10px] px-2.5 py-1 bg-white/5 rounded-lg text-gray-500 font-black uppercase border border-white/5">{item.level || (item.deadline ? `Cierre: ${item.deadline}` : 'Docente')}</span>
                                                    {activeTab !== 'terms' && <span className="text-[10px] px-2.5 py-1 bg-purple-500/10 text-purple-400 rounded-lg font-black border border-purple-500/5 flex items-center gap-1"><Phone size={10} /> {item.phone || 'N/A'}</span>}
                                                    {activeTab === 'students' && <span className="text-[10px] px-2.5 py-1 bg-indigo-500/10 text-indigo-400 rounded-lg font-black uppercase border border-indigo-500/5 tracking-tighter">{getTermName(item.term_id)}</span>}
                                                    <span className="text-[10px] px-2.5 py-1 bg-green-500/10 text-green-500 rounded-lg font-black border border-green-500/5">₡{activeTab === 'students' ? (item.revenue || 0).toLocaleString() : activeTab === 'tutors' ? `${item.rate || 0}/hr` : '—'}</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {(item.subjects || item.specialties || [])?.map((s_id: string) => (
                                                    <span key={s_id} className="text-[9px] px-3 py-1.5 bg-white/[0.04] text-gray-400 rounded-lg border border-white/5 font-black uppercase tracking-widest">{getSubjectName(s_id)}</span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 absolute top-6 right-6">
                                        <button onClick={() => setEditingItem({ ...item, type: activeTab })} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 transition-all border border-white/5"><Edit2 size={16} /></button>
                                        <button onClick={() => handleDelete(item.id, activeTab)} className="p-2.5 bg-red-500/5 hover:bg-red-500/10 rounded-xl text-red-500/40 hover:text-red-400 transition-all border border-red-500/5"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* BLOCKING SCREEN - Shows when optimization detected critical issues */}
                    {results?.optimization_blocked && (
                        <div className="bg-gradient-to-br from-red-900/20 to-orange-900/20 border-2 border-red-500/30 rounded-3xl p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-500">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-4 bg-red-500/20 rounded-2xl">
                                    <AlertTriangle size={32} className="text-red-400" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-red-400 uppercase tracking-tight">⚠️ Optimización Bloqueada</h3>
                                    <p className="text-gray-400 text-sm mt-1">{results.block_reason}</p>
                                </div>
                            </div>

                            {/* Ghost Courses */}
                            {results.pre_analysis?.ghost_courses?.length > 0 && (
                                <div className="mb-6 p-5 bg-black/30 rounded-2xl border border-red-500/10">
                                    <h4 className="text-xs font-black text-red-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <X size={14} /> Materias Sin Profesor ({results.pre_analysis.ghost_courses.length})
                                    </h4>
                                    <div className="grid gap-3">
                                        {results.pre_analysis.ghost_courses.map((ghost: any, i: number) => (
                                            <div key={i} className="flex items-center justify-between p-3 bg-red-500/5 rounded-xl border border-red-500/10">
                                                <span className="font-bold text-gray-300">{ghost.subject_name}</span>
                                                <span className="text-xs text-gray-500">Afecta: {ghost.affected_students?.join(', ')}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Schedule Mismatches */}
                            {results.pre_analysis?.schedule_mismatches?.length > 0 && (
                                <div className="mb-6 p-5 bg-black/30 rounded-2xl border border-amber-500/10">
                                    <h4 className="text-xs font-black text-amber-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <Clock size={14} /> Horarios Incompatibles ({results.pre_analysis.schedule_mismatches.length})
                                    </h4>
                                    <div className="grid gap-3">
                                        {results.pre_analysis.schedule_mismatches.slice(0, 5).map((mismatch: any, i: number) => (
                                            <div key={i} className="flex items-center justify-between p-3 bg-amber-500/5 rounded-xl border border-amber-500/10">
                                                <span className="font-bold text-gray-300">{mismatch.student_name}</span>
                                                <span className="text-xs text-amber-400">{mismatch.subject_name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-4 mt-8">
                                <button
                                    onClick={() => handleRunOptimization(true)}
                                    className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-black text-xs uppercase py-4 rounded-2xl transition-all flex items-center justify-center gap-2"
                                >
                                    <AlertTriangle size={16} /> Forzar Optimización Parcial
                                </button>
                                <button
                                    onClick={() => setResults(null)}
                                    className="flex-1 bg-white/5 hover:bg-white/10 text-gray-400 font-black text-xs uppercase py-4 rounded-2xl transition-all border border-white/10"
                                >
                                    Cancelar y Revisar Datos
                                </button>
                            </div>
                        </div>
                    )}

                    {results && !results.optimization_blocked && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
                            <div className="bg-gradient-to-br from-[#16181b] to-[#0f1113] border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-5">
                                    <Sparkles size={120} />
                                </div>
                                <h3 className="text-xl font-bold text-gray-200 flex items-center gap-3 mb-8 italic">
                                    <Layers className="text-purple-400" />
                                    Plan Estratégico de Grupos Optimizado
                                </h3>
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {results.groups.map((r: any, i: number) => (
                                        <div key={i} className={`bg-[#0f1113]/60 backdrop-blur-xl p-6 rounded-[2rem] border ${r.health === 'green' ? 'border-green-500/30 shadow-green-500/5' : r.health === 'yellow' ? 'border-amber-500/30' : 'border-red-500/40'} relative overflow-hidden group hover:scale-[1.03] transition-all cursor-default`}>
                                            <div className="absolute top-4 right-4 flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${r.health === 'green' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : r.health === 'yellow' ? 'bg-amber-500' : 'bg-red-500 animate-pulse'}`} />
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">{formatSlot(r.slot)}</span>
                                            </div>

                                            <div className="space-y-5">
                                                <div className="text-[11px] font-black text-white uppercase tracking-[0.2em]">{r.subject_name}</div>
                                                <div className="space-y-3">
                                                    <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/5">
                                                        <div className="text-[8px] font-black text-gray-500 uppercase tracking-wider mb-1.5">Profesor Designado</div>
                                                        <div className="text-sm font-bold text-purple-400 flex items-center gap-2">
                                                            {r.tutor}
                                                            <span className="text-[10px] text-gray-500 font-normal">({r.tutor_phone})</span>
                                                        </div>
                                                    </div>
                                                    <div className="bg-blue-500/5 p-4 rounded-2xl border border-blue-500/10">
                                                        <div className="text-[8px] font-black text-blue-400 uppercase tracking-wider mb-1.5 flex justify-between items-center">
                                                            <span>Matrícula ({r.students.length})</span>
                                                            {r.students.every((s: any) => s.term_id === selectedTerm) && selectedTerm !== 'all' && (
                                                                <span className="text-[7px] text-green-500 font-black animate-pulse bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20 uppercase tracking-tighter">✓ Tanda Verificada</span>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {r.students.map((s: any, idx: number) => (
                                                                <span key={idx} className="text-xs font-bold text-blue-200/80 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/5 flex items-center gap-1 group/pill relative">
                                                                    {s.name || s.id || 'Alumno'}
                                                                    <span className="text-[10px] opacity-40 font-normal">({s.phone || 'N/A'})</span>
                                                                    {s.term_id !== selectedTerm && selectedTerm !== 'all' && (
                                                                        <div className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow-lg border border-white/20">
                                                                            <AlertTriangle size={8} />
                                                                        </div>
                                                                    )}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="pt-4 border-t border-white/5 space-y-1.5">
                                                    <div className="flex justify-between items-center text-[11px] font-black tracking-widest"><span className="text-gray-500 uppercase">Utilidad:</span><span className={r.profit > 0 ? 'text-green-500 font-black' : 'text-red-500'}>₡{Math.round(r.profit).toLocaleString()}</span></div>
                                                    <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mt-2">
                                                        <div className={`h-full transition-all duration-1000 ${r.health === 'green' ? 'bg-green-500' : r.health === 'yellow' ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.max(5, Math.min(100, (r.profit / r.total_revenue) * 100))}%` }} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* FULFILLMENT STATUS SECTION */}
                            {results.fulfillment_status && results.fulfillment_status.some((s: any) => s.status !== 'complete') && (
                                <div className="bg-gradient-to-br from-amber-600/5 to-red-600/5 border border-amber-500/20 rounded-3xl p-8 shadow-2xl">
                                    <h3 className="text-xl font-bold text-gray-200 flex items-center gap-3 mb-6 italic">
                                        <AlertTriangle className="text-amber-400" />
                                        Status de Promesa (Materias Pendientes)
                                    </h3>
                                    <div className="overflow-hidden rounded-2xl border border-white/5">
                                        <table className="w-full text-left border-collapse">
                                            <thead className="bg-white/[0.02]">
                                                <tr>
                                                    <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase">Estudiante</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase">Contratadas</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase">Asignadas</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase">Pendientes</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase text-center">Estado</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase text-right">% Cumplido</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {results.fulfillment_status.filter((s: any) => s.status !== 'complete').map((s: any, i: number) => (
                                                    <tr key={i} className="hover:bg-white/[0.01]">
                                                        <td className="px-6 py-4 font-bold text-gray-300">{s.student_name}</td>
                                                        <td className="px-6 py-4 text-xs text-gray-500">{s.subjects_contracted.join(', ')}</td>
                                                        <td className="px-6 py-4 text-xs text-green-400/70">{s.subjects_assigned.join(', ') || '—'}</td>
                                                        <td className="px-6 py-4 text-xs text-red-400 font-bold">{s.subjects_pending.join(', ')}</td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full ${s.status === 'partial' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                                                                {s.status === 'partial' ? '⚠️ Parcial' : '❌ Sin Asignar'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-black text-lg">
                                                            <span className={s.fulfillment_percent >= 50 ? 'text-amber-400' : 'text-red-500'}>{s.fulfillment_percent}%</span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* PROFESSOR GAPS SECTION */}
                            {results.professor_gaps && results.professor_gaps.length > 0 && (
                                <div className="bg-gradient-to-br from-red-600/5 to-pink-600/5 border border-red-500/20 rounded-3xl p-8 shadow-2xl">
                                    <h3 className="text-xl font-bold text-gray-200 flex items-center gap-3 mb-6 italic">
                                        <Users className="text-red-400" />
                                        Brechas Docentes (Se Requiere Contratación)
                                    </h3>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        {results.professor_gaps.map((gap: any, i: number) => (
                                            <div key={i} className="bg-[#0f1113] p-5 rounded-2xl border border-red-500/10 shadow-lg">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className="p-2 bg-red-500/10 rounded-lg"><AlertTriangle size={16} className="text-red-400" /></div>
                                                    <span className="font-bold text-gray-200">{gap.subject_name} ({gap.level})</span>
                                                </div>
                                                <p className="text-xs text-gray-400 mb-2">{gap.suggested_action}</p>
                                                <div className="text-[10px] text-gray-500">Afecta a <span className="text-red-400 font-bold">{gap.student_count}</span> estudiante(s)</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="bg-[#16181b] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl ring-1 ring-white/5">
                                <h3 className="text-xl font-bold text-gray-200 flex items-center gap-3 mb-8 italic">
                                    <DollarSign className="text-blue-400" />
                                    Accountability Estudiantil (ROI Per Student)
                                </h3>
                                <div className="overflow-hidden rounded-3xl border border-white/5">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-white/[0.02]">
                                            <tr>
                                                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Nombre Completo</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Aporte Prorrateado</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">% Cumplido</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Gasto Proporcional</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Rentabilidad</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5 bg-black/10">
                                            {results.student_ltv.map((s: any, i: number) => (
                                                <tr key={i} className={`hover:bg-white/[0.01] transition-colors group ${s.status === 'unassigned' ? 'bg-red-500/5' : s.status === 'partial' ? 'bg-amber-500/5' : ''}`}>
                                                    <td className="px-6 py-4 font-bold text-gray-300 group-hover:text-white">
                                                        {s.name || 'Alumno'}
                                                        {s.status !== 'complete' && <span className={`ml-2 text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${s.status === 'partial' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>{s.status === 'partial' ? 'Parcial' : 'Pendiente'}</span>}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className="font-bold text-blue-400/80">₡{s.revenue.toLocaleString()}</span>
                                                        {s.original_revenue !== s.revenue && <span className="text-[9px] text-gray-600 ml-1 line-through">₡{s.original_revenue?.toLocaleString()}</span>}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={`font-black text-sm ${s.fulfillment_percent === 100 ? 'text-green-500' : s.fulfillment_percent >= 50 ? 'text-amber-400' : 'text-red-500'}`}>{s.fulfillment_percent}%</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right text-red-400/50 font-medium italic">- ₡{s.cost.toLocaleString()}</td>
                                                    <td className={`px-6 py-4 text-right font-black text-lg tracking-tighter ${s.profit > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                        {s.margin}% <span className="text-[10px] opacity-40 ml-1 font-bold">(₡{s.profit.toLocaleString()})</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {editingItem && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="bg-[#16181b] w-full max-w-2xl rounded-[3rem] border border-white/10 shadow-3xl overflow-hidden ring-1 ring-white/5">
                        <div className="p-10 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                            <h3 className="text-2xl font-black italic tracking-tighter flex items-center gap-4">
                                <div className="p-3 bg-purple-500/10 rounded-2xl border border-purple-500/20">
                                    <Edit2 size={24} className="text-purple-400" />
                                </div>
                                {editingItem.type === 'students' ? 'Perfil Estudiante' : editingItem.type === 'tutors' ? 'Perfil Docente' : 'Ciclo Lectivo'}
                            </h3>
                            <button onClick={() => setEditingItem(null)} className="p-3 hover:bg-white/10 rounded-2xl transition-all"><X size={28} /></button>
                        </div>
                        <div className="p-10 space-y-10 max-h-[65vh] overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-2 gap-10">
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black text-gray-600 uppercase mb-4 tracking-[0.3em]">Nombre del Perfil</label>
                                    <input value={editingItem.name} onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })} className="w-full bg-black/40 border-b border-white/10 rounded-none px-0 py-4 text-2xl font-black outline-none focus:border-purple-500 transition-all placeholder:text-gray-800" placeholder="Ej: Carlos Alberto" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black text-gray-600 uppercase mb-4 tracking-[0.3em]">Teléfono de Contacto</label>
                                    <input value={editingItem.phone} onChange={(e) => setEditingItem({ ...editingItem, phone: e.target.value })} className="w-full bg-black/20 border border-white/5 rounded-2xl px-6 py-4 text-sm font-black outline-none focus:border-purple-500 transition-all" placeholder="Ej: 8888-9999" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-600 uppercase mb-4 tracking-[0.3em]">{editingItem.type === 'students' ? 'Nivel Académico (Sétimo, Octavo, Noveno, etc)' : editingItem.type === 'tutors' ? 'Especialidades' : 'Fecha de Cierre (Deadline)'}</label>
                                    <input type={editingItem.type === 'terms' ? 'text' : 'text'} value={editingItem.level || editingItem.specialties?.join(', ') || editingItem.deadline || ''} onChange={(e) => {
                                        if (editingItem.type === 'students') setEditingItem({ ...editingItem, level: e.target.value });
                                        else if (editingItem.type === 'tutors') setEditingItem({ ...editingItem, specialties: e.target.value.split(',').map((s: string) => s.trim()) });
                                        else setEditingItem({ ...editingItem, deadline: e.target.value });
                                    }} className="w-full bg-white/[0.02] border border-white/5 rounded-2xl px-6 py-4 text-sm font-black outline-none focus:border-purple-500 transition-all" />
                                </div>
                                {editingItem.type === 'students' && (
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-600 uppercase mb-4 tracking-[0.3em]">Asignar a Ciclo</label>
                                        <select value={editingItem.term_id} onChange={(e) => setEditingItem({ ...editingItem, term_id: e.target.value })} className="w-full bg-white/[0.02] border border-white/5 rounded-2xl px-6 py-4 text-sm font-black outline-none focus:border-purple-500 appearance-none cursor-pointer">
                                            <option value="">Sin Asignar</option>
                                            {data?.terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>

                            {editingItem.type !== 'terms' && (
                                <div className="space-y-10">
                                    <div className="space-y-4">
                                        <label className="block text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] flex items-center gap-2"><BookOpen size={16} /> Especialidades MEP</label>
                                        <div className="flex flex-wrap gap-2.5">
                                            {data?.subjects.map(sub => {
                                                const field = editingItem.type === 'tutors' ? 'specialties' : 'subjects';
                                                const list = editingItem[field] || [];
                                                const isActive = list.includes(sub.id);
                                                return (
                                                    <button key={sub.id} onClick={() => {
                                                        const newList = isActive ? list.filter((s: string) => s !== sub.id) : [...list, sub.id];
                                                        setEditingItem({ ...editingItem, [field]: newList });
                                                    }} className={`px-5 py-3 rounded-2xl text-xs font-black transition-all border ${isActive ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-500/20' : 'bg-white/5 border-white/5 text-gray-600 hover:bg-white/10'}`}>{sub.name}</button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <label className="block text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] flex items-center gap-2"><Clock size={16} /> Disponibilidad Activa</label>
                                        <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                                            {SLOT_ORDER.map(slot => {
                                                const availability = editingItem.availability || [];
                                                const isActive = availability.includes(slot);
                                                return (
                                                    <button key={slot} onClick={() => {
                                                        const newAvail = isActive ? availability.filter((s: string) => s !== slot) : [...availability, slot];
                                                        setEditingItem({ ...editingItem, availability: newAvail });
                                                    }} className={`px-3 py-4 rounded-2xl text-[10px] font-black uppercase transition-all border leading-tight ${isActive ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-white/5 border-white/5 text-gray-700 hover:bg-white/10'}`}>{formatSlot(slot).replace(' ', '\n')}</button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="p-10 bg-white/[0.01] border-t border-white/5 flex gap-6">
                            <button onClick={() => setEditingItem(null)} className="flex-1 px-8 py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest bg-white/5 hover:bg-white/10 transition-all border border-white/10">Cerrar</button>
                            <button onClick={handleSaveItem} disabled={saving} className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 px-8 py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] transition-all shadow-2xl shadow-purple-500/30 disabled:opacity-50 hover:scale-[1.02] active:scale-95">{saving ? 'Impactando...' : (editingItem.isNew ? 'Confirmar Alta' : 'Impactar Cambios')}</button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.1); }
            `}</style>
        </div>
    );
}
