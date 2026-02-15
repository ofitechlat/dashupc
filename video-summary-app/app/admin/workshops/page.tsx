'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft, Plus, Users, Calendar, Clock,
    ChevronRight, BookOpen, User, CheckCircle,
    AlertCircle, Search, Filter, LayoutGrid
} from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { WorkshopGroup } from '../../types/tutoring';

export default function WorkshopsListPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [workshops, setWorkshops] = useState<any[]>([]);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        loadWorkshops();
    }, []);

    const loadWorkshops = async () => {
        try {
            const { data, error } = await supabase
                .from('workshop_groups')
                .select(`
                    *,
                    subjects (name),
                    tutors (name),
                    course_requests (id)
                `)
                .order('start_date', { ascending: false });

            if (error) throw error;
            setWorkshops(data || []);
        } catch (err) {
            console.error('Error loading workshops:', err);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'text-green-400 bg-green-500/10 border-green-500/20';
            case 'planning': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
            case 'completed': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
            case 'cancelled': return 'text-red-400 bg-red-500/10 border-red-500/20';
            default: return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
        }
    };

    const filteredWorkshops = workshops.filter(w => filter === 'all' || w.status === filter);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0f1113] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
            </div>
        );
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
                            <h1 className="text-xl font-bold">Gestión de Talleres</h1>
                            <p className="text-sm text-gray-400">Cohortes y grupos de estudio</p>
                        </div>
                    </div>
                    <button
                        onClick={() => router.push('/admin/workshops/new')}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2.5 rounded-xl font-semibold transition-colors shadow-lg shadow-blue-600/20"
                    >
                        <Plus size={18} />
                        Nuevo Taller
                    </button>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-8">
                {/* Stats & Filters */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-2 bg-[#1a1c1e] p-1 rounded-xl border border-white/5">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'all' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            Todos
                        </button>
                        <button
                            onClick={() => setFilter('active')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'active' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            Activos
                        </button>
                        <button
                            onClick={() => setFilter('planning')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'planning' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            Planeación
                        </button>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar taller..."
                            className="bg-[#1a1c1e] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-blue-500 w-full md:w-64 transition-colors"
                        />
                    </div>
                </div>

                {/* Workshops Grid */}
                {filteredWorkshops.length === 0 ? (
                    <div className="bg-[#1a1c1e] rounded-3xl border border-white/5 p-12 text-center">
                        <div className="w-20 h-20 bg-gray-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <LayoutGrid className="text-gray-500" size={40} />
                        </div>
                        <h3 className="text-xl font-bold mb-2">No se encontraron talleres</h3>
                        <p className="text-gray-400 mb-8">Comienza creando un nuevo grupo para tus estudiantes</p>
                        <button
                            onClick={() => router.push('/admin/workshops/new')}
                            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-xl font-semibold transition-colors"
                        >
                            <Plus size={20} />
                            Crear Primer Taller
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {filteredWorkshops.map((workshop) => (
                            <div
                                key={workshop.id}
                                onClick={() => router.push(`/admin/workshops/${workshop.id}`)}
                                className="bg-[#1a1c1e] rounded-2xl border border-white/5 p-6 hover:bg-[#1f2123] hover:border-white/10 transition-all cursor-pointer group"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(workshop.status)}`}>
                                        {workshop.status === 'planning' ? 'Planeando' : workshop.status}
                                    </span>
                                    <ChevronRight className="text-gray-600 group-hover:text-blue-400 transition-colors" size={20} />
                                </div>

                                <h3 className="text-lg font-bold mb-1 group-hover:text-blue-400 transition-colors line-clamp-1">
                                    {workshop.name}
                                </h3>
                                <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
                                    <BookOpen size={14} />
                                    <span>{workshop.subjects?.name}</span>
                                </div>

                                <div className="space-y-3 pt-4 border-t border-white/5">
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2 text-gray-400">
                                            <Calendar size={14} />
                                            <span>Inicia:</span>
                                        </div>
                                        <span className="font-medium">{new Date(workshop.start_date).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2 text-gray-400">
                                            <User size={14} />
                                            <span>Tutor:</span>
                                        </div>
                                        <span className="font-medium">{workshop.tutors?.name || 'Por asignar'}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2 text-gray-400">
                                            <Users size={14} />
                                            <span>Estudiantes:</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-blue-500"
                                                    style={{ width: `${Math.min(100, ((workshop.course_requests?.length || 0) / workshop.max_students) * 100)}%` }}
                                                ></div>
                                            </div>
                                            <span className="font-medium text-xs">
                                                {workshop.course_requests?.length || 0}/{workshop.max_students}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
