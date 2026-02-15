'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    ArrowLeft, Calendar, Clock, User, Users, BookOpen,
    Video, Link as LinkIcon, CheckCircle, XCircle, AlertCircle,
    Play, Save, FileText, MessageSquare
} from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { TutoringClass } from '../../types/tutoring';
import { VideoData } from '../../types';

export default function ClassDetailPage() {
    const router = useRouter();
    const params = useParams();
    const classId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [classData, setClassData] = useState<TutoringClass | null>(null);
    const [videos, setVideos] = useState<VideoData[]>([]);
    const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
    const [notes, setNotes] = useState('');
    const [showVideoSelector, setShowVideoSelector] = useState(false);

    useEffect(() => {
        loadClass();
        loadVideos();
    }, [classId]);

    const loadClass = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('classes')
                .select(`
                    *,
                    student:students(*),
                    tutor:tutors(*),
                    subject:subjects(*)
                `)
                .eq('id', classId)
                .single();

            if (error) throw error;

            const mapped: TutoringClass = {
                id: data.id,
                studentId: data.student_id,
                tutorId: data.tutor_id,
                subjectId: data.subject_id,
                scheduledAt: data.scheduled_at,
                durationMinutes: data.duration_minutes,
                type: data.type,
                status: data.status,
                videoId: data.video_id,
                price: data.price,
                notes: data.notes,
                studentConfirmed: data.student_confirmed,
                tutorConfirmed: data.tutor_confirmed,
                createdAt: data.created_at,
                updatedAt: data.updated_at,
                student: data.student,
                tutor: data.tutor,
                subject: data.subject
            };

            setClassData(mapped);
            setSelectedVideoId(mapped.videoId || null);
            setNotes(mapped.notes || '');
        } catch (err) {
            console.error('Error loading class:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadVideos = async () => {
        try {
            const { data, error } = await supabase
                .from('videos')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;

            setVideos(data.map(v => ({
                id: v.id,
                title: v.title,
                duration: v.duration,
                thumbnail: v.thumbnail,
                compressedSize: v.compressed_size,
                originalSize: v.original_size,
                transcription: v.transcription,
                summary: v.summary,
                youtubeUrl: v.youtube_url,
                createdAt: v.created_at
            })));
        } catch (err) {
            console.error('Error loading videos:', err);
        }
    };

    const updateStatus = async (newStatus: string) => {
        setSaving(true);
        try {
            const { error } = await supabase
                .from('classes')
                .update({
                    status: newStatus,
                    updated_at: new Date().toISOString()
                })
                .eq('id', classId);

            if (error) throw error;

            setClassData(prev => prev ? { ...prev, status: newStatus as TutoringClass['status'] } : null);
        } catch (err) {
            console.error('Error updating status:', err);
        } finally {
            setSaving(false);
        }
    };

    const linkVideo = async (videoId: string) => {
        setSaving(true);
        try {
            // Actualizar clase con el video
            const { error: classError } = await supabase
                .from('classes')
                .update({
                    video_id: videoId,
                    updated_at: new Date().toISOString()
                })
                .eq('id', classId);

            if (classError) throw classError;

            // Actualizar video con la clase
            const { error: videoError } = await supabase
                .from('videos')
                .update({ class_id: classId })
                .eq('id', videoId);

            if (videoError) console.warn('Could not update video:', videoError);

            setSelectedVideoId(videoId);
            setShowVideoSelector(false);
            setClassData(prev => prev ? { ...prev, videoId } : null);
        } catch (err) {
            console.error('Error linking video:', err);
        } finally {
            setSaving(false);
        }
    };

    const saveNotes = async () => {
        setSaving(true);
        try {
            const { error } = await supabase
                .from('classes')
                .update({
                    notes,
                    updated_at: new Date().toISOString()
                })
                .eq('id', classId);

            if (error) throw error;
        } catch (err) {
            console.error('Error saving notes:', err);
        } finally {
            setSaving(false);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('es-ES', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const linkedVideo = videos.find(v => v.id === selectedVideoId);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0f1113] text-white flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4" />
                    <p className="text-gray-400">Cargando clase...</p>
                </div>
            </div>
        );
    }

    if (!classData) {
        return (
            <div className="min-h-screen bg-[#0f1113] text-white flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-400">Clase no encontrada</p>
                    <button
                        onClick={() => router.push('/classes')}
                        className="mt-4 text-blue-400 hover:text-blue-300"
                    >
                        ← Volver a clases
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0f1113] text-white">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-[#0f1113]/95 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/classes')}
                            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold">Detalle de Clase</h1>
                            <p className="text-sm text-gray-400">
                                {classData.subject?.name} • {formatDate(classData.scheduledAt)}
                            </p>
                        </div>
                    </div>

                    {/* Status Actions */}
                    <div className="flex items-center gap-2">
                        {classData.status === 'pending' && (
                            <button
                                onClick={() => updateStatus('confirmed')}
                                disabled={saving}
                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl font-medium transition-colors"
                            >
                                <CheckCircle size={16} />
                                Confirmar
                            </button>
                        )}
                        {classData.status === 'confirmed' && (
                            <button
                                onClick={() => updateStatus('completed')}
                                disabled={saving}
                                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-xl font-medium transition-colors"
                            >
                                <CheckCircle size={16} />
                                Marcar Completada
                            </button>
                        )}
                        {classData.status !== 'cancelled' && classData.status !== 'completed' && (
                            <button
                                onClick={() => updateStatus('cancelled')}
                                disabled={saving}
                                className="flex items-center gap-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 px-4 py-2 rounded-xl font-medium transition-colors"
                            >
                                <XCircle size={16} />
                                Cancelar
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
                {/* Class Info */}
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Student Card */}
                    <section className="bg-[#1a1c1e] rounded-2xl border border-white/5 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-blue-500/20 rounded-xl">
                                <User className="text-blue-400" size={20} />
                            </div>
                            <h2 className="text-lg font-semibold">Estudiante</h2>
                        </div>
                        <div className="space-y-2">
                            <p className="font-medium text-xl">{classData.student?.name || 'No asignado'}</p>
                            <p className="text-gray-400">{classData.student?.phone}</p>
                            <p className="text-gray-400">{classData.student?.email}</p>
                            <span className={`inline-block px-3 py-1 rounded-full text-xs ${classData.studentConfirmed
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-yellow-500/20 text-yellow-400'
                                }`}>
                                {classData.studentConfirmed ? '✓ Confirmado' : 'Pendiente confirmación'}
                            </span>
                        </div>
                    </section>

                    {/* Tutor Card */}
                    <section className="bg-[#1a1c1e] rounded-2xl border border-white/5 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-purple-500/20 rounded-xl">
                                <Users className="text-purple-400" size={20} />
                            </div>
                            <h2 className="text-lg font-semibold">Tutor</h2>
                        </div>
                        <div className="space-y-2">
                            <p className="font-medium text-xl">{classData.tutor?.name || 'No asignado'}</p>
                            <p className="text-gray-400">{classData.tutor?.phone}</p>
                            <p className="text-gray-400">{classData.tutor?.email}</p>
                            <span className={`inline-block px-3 py-1 rounded-full text-xs ${classData.tutorConfirmed
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-yellow-500/20 text-yellow-400'
                                }`}>
                                {classData.tutorConfirmed ? '✓ Confirmado' : 'Pendiente confirmación'}
                            </span>
                        </div>
                    </section>
                </div>

                {/* Class Details */}
                <section className="bg-[#1a1c1e] rounded-2xl border border-white/5 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-orange-500/20 rounded-xl">
                            <BookOpen className="text-orange-400" size={20} />
                        </div>
                        <h2 className="text-lg font-semibold">Detalles de la Clase</h2>
                    </div>

                    <div className="grid md:grid-cols-4 gap-6">
                        <div>
                            <p className="text-gray-400 text-sm mb-1">Materia</p>
                            <p className="font-medium">{classData.subject?.name}</p>
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm mb-1">Duración</p>
                            <p className="font-medium">{classData.durationMinutes} minutos</p>
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm mb-1">Tipo</p>
                            <span className={`px-3 py-1 rounded-full text-sm ${classData.type === 'individual'
                                ? 'bg-blue-500/20 text-blue-400'
                                : 'bg-green-500/20 text-green-400'
                                }`}>
                                {classData.type}
                            </span>
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm mb-1">Precio</p>
                            <p className="font-bold text-2xl text-green-400">${classData.price}</p>
                        </div>
                    </div>
                </section>

                {/* Video Link Section */}
                <section className="bg-[#1a1c1e] rounded-2xl border border-white/5 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-500/20 rounded-xl">
                                <Video className="text-red-400" size={20} />
                            </div>
                            <h2 className="text-lg font-semibold">Video de la Clase</h2>
                        </div>

                        {!linkedVideo && (
                            <button
                                onClick={() => setShowVideoSelector(!showVideoSelector)}
                                className="flex items-center gap-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-4 py-2 rounded-xl transition-colors"
                            >
                                <LinkIcon size={16} />
                                Vincular Video
                            </button>
                        )}
                    </div>

                    {linkedVideo ? (
                        <div className="flex items-start gap-6">
                            <div className="relative w-48 h-28 rounded-xl overflow-hidden bg-gray-800">
                                {linkedVideo.thumbnail ? (
                                    <img src={linkedVideo.thumbnail} alt={linkedVideo.title} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Video size={32} className="text-gray-600" />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1">
                                <h3 className="font-medium text-lg">{linkedVideo.title}</h3>
                                <p className="text-gray-400 text-sm mt-1">
                                    Duración: {Math.floor(linkedVideo.duration / 60)}:{String(linkedVideo.duration % 60).padStart(2, '0')}
                                </p>
                                <div className="flex gap-3 mt-4">
                                    <button
                                        onClick={() => router.push(`/video/${linkedVideo.id}`)}
                                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl font-medium transition-colors"
                                    >
                                        <Play size={16} />
                                        Ver Video
                                    </button>
                                    <button
                                        onClick={() => { setSelectedVideoId(null); setShowVideoSelector(true); }}
                                        className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl transition-colors"
                                    >
                                        Cambiar Video
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : showVideoSelector ? (
                        <div className="space-y-4">
                            <p className="text-gray-400">Selecciona un video para vincular a esta clase:</p>
                            <div className="grid gap-3 max-h-80 overflow-y-auto">
                                {videos.map(video => (
                                    <button
                                        key={video.id}
                                        onClick={() => linkVideo(video.id)}
                                        className="flex items-center gap-4 p-4 bg-[#0f1113] rounded-xl border border-white/5 hover:border-blue-500/50 transition-all text-left"
                                    >
                                        <div className="w-24 h-14 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0">
                                            {video.thumbnail ? (
                                                <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <Video size={20} className="text-gray-600" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium truncate">{video.title}</p>
                                            <p className="text-sm text-gray-400">
                                                {new Date(video.createdAt).toLocaleDateString('es-ES')}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-400">
                            <Video size={40} className="mx-auto mb-3 opacity-50" />
                            <p>No hay video vinculado a esta clase</p>
                        </div>
                    )}
                </section>

                {/* Notes Section */}
                <section className="bg-[#1a1c1e] rounded-2xl border border-white/5 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-500/20 rounded-xl">
                                <MessageSquare className="text-emerald-400" size={20} />
                            </div>
                            <h2 className="text-lg font-semibold">Notas de la Clase</h2>
                        </div>
                        <button
                            onClick={saveNotes}
                            disabled={saving}
                            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-xl font-medium transition-colors"
                        >
                            <Save size={16} />
                            Guardar
                        </button>
                    </div>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Escribe notas sobre la clase, temas cubiertos, observaciones..."
                        className="w-full h-40 bg-[#0f1113] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                    />
                </section>
            </main>
        </div>
    );
}
