'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft, Calendar, Clock, User, Users, BookOpen,
    Video, Link as LinkIcon, CheckCircle, XCircle, AlertCircle,
    ChevronRight, Filter
} from 'lucide-react';
import { supabase } from '../utils/supabase';
import { TutoringClass, Student, Tutor, Subject } from '../types/tutoring';

export default function ClassesPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [classes, setClasses] = useState<TutoringClass[]>([]);
    const [statusFilter, setStatusFilter] = useState<string>('all');

    useEffect(() => {
        loadClasses();
    }, []);

    const loadClasses = async () => {
        setLoading(true);
        try {
            // Cargar clases con sus relaciones
            const { data: classesData, error } = await supabase
                .from('classes')
                .select(`
                    *,
                    student:students(*),
                    tutor:tutors(*),
                    subject:subjects(*)
                `)
                .order('scheduled_at', { ascending: false });

            if (error) throw error;

            const mapped: TutoringClass[] = (classesData || []).map(c => ({
                id: c.id,
                studentId: c.student_id,
                tutorId: c.tutor_id,
                subjectId: c.subject_id,
                scheduledAt: c.scheduled_at,
                durationMinutes: c.duration_minutes,
                type: c.type,
                status: c.status,
                videoId: c.video_id,
                price: c.price,
                notes: c.notes,
                studentConfirmed: c.student_confirmed,
                tutorConfirmed: c.tutor_confirmed,
                createdAt: c.created_at,
                updatedAt: c.updated_at,
                student: c.student,
                tutor: c.tutor,
                subject: c.subject
            }));

            setClasses(mapped);
        } catch (err) {
            console.error('Error loading classes:', err);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (classId: string, newStatus: string) => {
        try {
            const { error } = await supabase
                .from('classes')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq('id', classId);

            if (error) throw error;
            loadClasses();
        } catch (err) {
            console.error('Error updating status:', err);
        }
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
            pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: <AlertCircle size={14} /> },
            confirmed: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: <CheckCircle size={14} /> },
            completed: { bg: 'bg-green-500/20', text: 'text-green-400', icon: <CheckCircle size={14} /> },
            cancelled: { bg: 'bg-red-500/20', text: 'text-red-400', icon: <XCircle size={14} /> }
        };
        const style = styles[status] || styles.pending;

        return (
            <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
                {style.icon}
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-ES', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const filteredClasses = classes.filter(c =>
        statusFilter === 'all' || c.status === statusFilter
    );

    return (
        <div className="min-h-screen bg-[#0f1113] text-white">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-[#0f1113]/95 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/')}
                            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold">Gestión de Clases</h1>
                            <p className="text-sm text-gray-400">{classes.length} clases registradas</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Status Filter */}
                        <div className="flex items-center gap-2 bg-[#1a1c1e] rounded-xl p-1">
                            {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map(status => (
                                <button
                                    key={status}
                                    onClick={() => setStatusFilter(status)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === status
                                            ? 'bg-white/10 text-white'
                                            : 'text-gray-400 hover:text-white'
                                        }`}
                                >
                                    {status === 'all' ? 'Todas' : status.charAt(0).toUpperCase() + status.slice(1)}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => router.push('/admin/matching')}
                            className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-xl font-medium transition-colors"
                        >
                            + Nueva Clase
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-6xl mx-auto px-6 py-8">
                {loading ? (
                    <div className="text-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4" />
                        <p className="text-gray-400">Cargando clases...</p>
                    </div>
                ) : filteredClasses.length === 0 ? (
                    <div className="text-center py-20">
                        <Calendar size={48} className="mx-auto mb-4 text-gray-600" />
                        <p className="text-gray-400 text-lg">No hay clases {statusFilter !== 'all' ? `con estado "${statusFilter}"` : ''}</p>
                        <button
                            onClick={() => router.push('/admin/matching')}
                            className="mt-4 text-blue-400 hover:text-blue-300"
                        >
                            Crear una nueva clase →
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredClasses.map(cls => (
                            <div
                                key={cls.id}
                                className="bg-[#1a1c1e] rounded-2xl border border-white/5 p-6 hover:border-white/10 transition-all cursor-pointer"
                                onClick={() => router.push(`/classes/${cls.id}`)}
                            >
                                <div className="flex items-center justify-between">
                                    {/* Left: Main Info */}
                                    <div className="flex items-center gap-6">
                                        {/* Date */}
                                        <div className="text-center">
                                            <div className="p-3 bg-blue-500/20 rounded-xl">
                                                <Calendar className="text-blue-400" size={24} />
                                            </div>
                                            <p className="text-xs text-gray-400 mt-2">
                                                {formatDate(cls.scheduledAt)}
                                            </p>
                                        </div>

                                        {/* Student & Tutor */}
                                        <div>
                                            <div className="flex items-center gap-3 mb-2">
                                                <User size={16} className="text-gray-400" />
                                                <span className="font-medium">{cls.student?.name || 'Sin asignar'}</span>
                                                <ChevronRight size={14} className="text-gray-600" />
                                                <Users size={16} className="text-gray-400" />
                                                <span className="font-medium">{cls.tutor?.name || 'Sin asignar'}</span>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-gray-400">
                                                <span className="flex items-center gap-1">
                                                    <BookOpen size={14} />
                                                    {cls.subject?.name || 'Materia'}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock size={14} />
                                                    {cls.durationMinutes} min
                                                </span>
                                                <span className={`px-2 py-0.5 rounded text-xs ${cls.type === 'individual'
                                                        ? 'bg-blue-500/20 text-blue-400'
                                                        : 'bg-green-500/20 text-green-400'
                                                    }`}>
                                                    {cls.type}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Status & Actions */}
                                    <div className="flex items-center gap-4">
                                        {/* Video Link */}
                                        {cls.videoId ? (
                                            <span className="flex items-center gap-1 text-green-400 text-sm">
                                                <Video size={16} />
                                                Video vinculado
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-gray-500 text-sm">
                                                <LinkIcon size={16} />
                                                Sin video
                                            </span>
                                        )}

                                        {/* Price */}
                                        <span className="text-lg font-bold text-green-400">
                                            ${cls.price}
                                        </span>

                                        {/* Status */}
                                        {getStatusBadge(cls.status)}

                                        <ChevronRight className="text-gray-600" size={20} />
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
