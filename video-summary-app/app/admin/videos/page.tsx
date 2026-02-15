"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import VideoUploader from "../../components/VideoUploader";
import { listVideos, deleteVideo } from "../../utils/storage";
import { VideoData } from "../../types";
import { supabase } from "../../utils/supabase";
import {
    ArrowLeft, Search, Trash2, Play, Clock, X,
    Filter, Calendar, User, BookOpen, GraduationCap, Link2
} from "lucide-react";

interface ClassRecord {
    id: string;
    scheduled_at: string;
    status: string;
    subject_name: string;
    student_name: string;
    tutor_name: string;
    duration_minutes: number;
}

export default function AdminVideosPage() {
    const [videos, setVideos] = useState<VideoData[]>([]);
    const [classes, setClasses] = useState<ClassRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const router = useRouter();

    // Assignment modal state
    const [assigningVideoId, setAssigningVideoId] = useState<string | null>(null);
    const [modalSearch, setModalSearch] = useState("");
    const [modalCycle, setModalCycle] = useState("");
    const [modalDateFrom, setModalDateFrom] = useState("");
    const [modalDateTo, setModalDateTo] = useState("");
    const [modalTutor, setModalTutor] = useState("");
    const [modalStudent, setModalStudent] = useState("");

    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/admin');
                return;
            }
            setIsAdmin(true);
            await Promise.all([loadVideos(), loadClasses()]);
        };
        checkSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!session) {
                router.push('/admin');
            }
        });

        return () => subscription.unsubscribe();
    }, [router]);

    async function loadVideos() {
        try {
            setLoading(true);
            const data = await listVideos();
            setVideos(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        } catch (err) {
            console.error("Error cargando videos:", err);
        } finally {
            setLoading(false);
        }
    }

    async function loadClasses() {
        const { data } = await supabase
            .from('classes')
            .select(`
                id, scheduled_at, status, duration_minutes,
                subject:subjects(name),
                student:students(name),
                tutor:tutors(name)
            `)
            .or('status.eq.confirmed,status.eq.completed,status.eq.scheduled')
            .order('scheduled_at', { ascending: false });

        if (data) {
            setClasses((data as any[]).map(c => ({
                id: c.id,
                scheduled_at: c.scheduled_at,
                status: c.status,
                subject_name: c.subject?.name || 'Sin materia',
                student_name: c.student?.name || 'Sin estudiante',
                tutor_name: c.tutor?.name || 'Sin tutor',
                duration_minutes: c.duration_minutes || 60,
            })));
        }
    }

    async function handleAssignClass(videoId: string, classId: string) {
        const { error } = await supabase
            .from('videos')
            .update({ class_id: classId || null })
            .eq('id', videoId);

        if (error) {
            alert('Error al asignar clase: ' + error.message);
        } else {
            setVideos(prev => prev.map(v => v.id === videoId ? { ...v, classId: classId } : v));
            setAssigningVideoId(null);
        }
    }

    async function handleDelete(id: string) {
        if (confirm("Estas seguro de que quieres eliminar este video?")) {
            await deleteVideo(id);
            loadVideos();
        }
    }

    const filteredVideos = useMemo(() => {
        if (!searchQuery.trim()) return videos;
        const q = searchQuery.toLowerCase();
        return videos.filter(v =>
            v.title.toLowerCase().includes(q) ||
            v.summary?.fullSummary?.toLowerCase().includes(q) ||
            v.summary?.keyPoints?.some(kp => kp.toLowerCase().includes(q))
        );
    }, [videos, searchQuery]);

    // -- Cycle-based subject classification --
    const cycleKeywords: Record<string, string[]> = {
        'I Ciclo': ['1', '2', '3', 'primero', 'segundo', 'tercero', 'i ciclo', 'primer ciclo'],
        'II Ciclo': ['4', '5', '6', 'cuarto', 'quinto', 'sexto', 'ii ciclo', 'segundo ciclo'],
        'III Ciclo': ['7', '8', '9', 'setimo', 'septimo', 'octavo', 'noveno', 'iii ciclo', 'tercer ciclo', '7mo', '8vo', '9no'],
        'Universidad': ['universidad', 'universitario', 'lineal', 'calculo', 'fisica', 'estadistica', 'algebra lineal', 'ingenieria'],
    };

    function classMatchesCycle(subjectName: string, cycle: string): boolean {
        const lower = subjectName.toLowerCase();
        const keywords = cycleKeywords[cycle] || [];
        return keywords.some(kw => lower.includes(kw));
    }

    // -- Filtered classes for the modal --
    const modalFilteredClasses = useMemo(() => {
        return classes.filter(c => {
            // Keyword search
            if (modalSearch.trim()) {
                const q = modalSearch.toLowerCase();
                const matchesAny =
                    c.subject_name.toLowerCase().includes(q) ||
                    c.student_name.toLowerCase().includes(q) ||
                    c.tutor_name.toLowerCase().includes(q);
                if (!matchesAny) return false;
            }

            // Cycle filter
            if (modalCycle && !classMatchesCycle(c.subject_name, modalCycle)) return false;

            // Date range
            if (modalDateFrom) {
                const classDate = new Date(c.scheduled_at).toISOString().split('T')[0];
                if (classDate < modalDateFrom) return false;
            }
            if (modalDateTo) {
                const classDate = new Date(c.scheduled_at).toISOString().split('T')[0];
                if (classDate > modalDateTo) return false;
            }

            // Tutor filter
            if (modalTutor && !c.tutor_name.toLowerCase().includes(modalTutor.toLowerCase())) return false;

            // Student filter
            if (modalStudent && !c.student_name.toLowerCase().includes(modalStudent.toLowerCase())) return false;

            return true;
        });
    }, [classes, modalSearch, modalCycle, modalDateFrom, modalDateTo, modalTutor, modalStudent]);

    // Unique tutors/students for datalist suggestions
    const uniqueTutors = [...new Set(classes.map(c => c.tutor_name).filter(n => n !== 'Sin tutor'))];
    const uniqueStudents = [...new Set(classes.map(c => c.student_name).filter(n => n !== 'Sin estudiante'))];

    function openAssignModal(videoId: string) {
        setAssigningVideoId(videoId);
        setModalSearch("");
        setModalCycle("");
        setModalDateFrom("");
        setModalDateTo("");
        setModalTutor("");
        setModalStudent("");
    }

    function getAssignedClassName(classId: string): string {
        const cls = classes.find(c => c.id === classId);
        if (!cls) return '';
        const d = new Date(cls.scheduled_at);
        return `${d.toLocaleDateString('es-CR', { day: '2-digit', month: 'short' })} - ${cls.subject_name} (${cls.student_name})`;
    }

    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-[#0f1113] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-[#0f1113] text-white">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-[#0f1113]/95 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.push('/admin')} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold">Videos Transcritos</h1>
                            <p className="text-sm text-gray-400">{videos.length} videos procesados</p>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-6xl mx-auto px-6 py-8">
                {/* Upload Section */}
                <section className="mb-12">
                    <div className="bg-[#1a1c1e] rounded-2xl border border-white/5 p-8">
                        <h2 className="text-lg font-semibold mb-2">Administrador</h2>
                        <p className="text-gray-400 text-sm mb-6">Sube y procesa nuevos videos para la academia</p>
                        <VideoUploader onUploadComplete={loadVideos} />
                    </div>
                </section>

                {/* Search */}
                <div className="mb-8">
                    <div className="relative max-w-md">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Buscar en videos..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-[#1a1c1e] border border-white/10 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
                        />
                    </div>
                </div>

                {/* Videos Grid */}
                {loading ? (
                    <div className="text-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4" />
                        <p className="text-gray-400">Cargando videos...</p>
                    </div>
                ) : filteredVideos.length === 0 ? (
                    <div className="text-center py-20">
                        <Play size={48} className="mx-auto mb-4 text-gray-600" />
                        <p className="text-gray-400">No hay videos disponibles</p>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {filteredVideos.map((video) => (
                            <div
                                key={video.id}
                                className="bg-[#1a1c1e] rounded-2xl border border-white/5 overflow-hidden group hover:border-blue-500/30 transition-colors flex flex-col"
                            >
                                {/* Thumbnail */}
                                <div
                                    className="relative aspect-video bg-gradient-to-br from-blue-900/30 to-purple-900/30 cursor-pointer"
                                    onClick={() => router.push(`/video/${video.id}`)}
                                >
                                    {video.thumbnail ? (
                                        <img
                                            src={video.thumbnail}
                                            alt={video.title}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <Play size={48} className="text-white/30" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <span className="bg-blue-600 px-4 py-2 rounded-lg font-medium">Ver Resumen</span>
                                    </div>
                                </div>

                                {/* Info */}
                                <div className="p-4 flex-1 flex flex-col">
                                    <h3 className="font-semibold truncate mb-2">{video.title}</h3>
                                    <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
                                        <span className="flex items-center gap-1">
                                            <Clock size={14} />
                                            {new Date(video.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>

                                    {/* Status Badge */}
                                    <div className="mb-4">
                                        {(!video.processingStatus || video.processingStatus === 'completed') ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-xs font-medium text-green-400">
                                                <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                                                Completado
                                            </span>
                                        ) : video.processingStatus === 'partial_summary_error' ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-xs font-medium text-yellow-400">
                                                <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                                                Error en Resumen
                                            </span>
                                        ) : video.processingStatus === 'partial_transcription_error' ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-xs font-medium text-orange-400">
                                                <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                                                Error Transcripcion
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-xs font-medium text-red-400">
                                                <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                                                Fallido
                                            </span>
                                        )}
                                    </div>

                                    {/* Class Linking - Button */}
                                    <div className="mt-auto pt-4 border-t border-white/5 space-y-2">
                                        <label className="text-xs text-gray-500 uppercase font-semibold">Asignar a Clase</label>
                                        {video.classId ? (
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2 text-sm text-green-400 truncate">
                                                    <Link2 size={12} className="inline mr-1.5" />
                                                    {getAssignedClassName(video.classId)}
                                                </div>
                                                <button
                                                    onClick={() => handleAssignClass(video.id, '')}
                                                    className="p-2 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors"
                                                    title="Desasignar"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => openAssignModal(video.id)}
                                                className="w-full bg-[#0f1113] border border-white/10 hover:border-blue-500/50 rounded-lg p-2.5 text-sm text-gray-400 hover:text-blue-400 transition-colors text-left flex items-center gap-2"
                                            >
                                                <Filter size={14} />
                                                Buscar y asignar clase...
                                            </button>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="mt-4 flex gap-2">
                                        <button
                                            onClick={() => router.push(`/video/${video.id}`)}
                                            className="flex-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 py-2 rounded-lg text-sm transition-colors"
                                        >
                                            Ver Detalles
                                        </button>
                                        <button
                                            onClick={() => handleDelete(video.id)}
                                            className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ============ ASSIGNMENT MODAL ============ */}
            {assigningVideoId && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="bg-[#1a1c1e] rounded-2xl border border-white/10 w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-white/5">
                            <div>
                                <h2 className="text-xl font-bold">Asignar Video a Clase</h2>
                                <p className="text-sm text-gray-400 mt-1">
                                    {videos.find(v => v.id === assigningVideoId)?.title}
                                </p>
                            </div>
                            <button onClick={() => setAssigningVideoId(null)} className="p-2 hover:bg-white/10 rounded-xl">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Filters Section */}
                        <div className="p-6 border-b border-white/5 space-y-4 bg-[#151719]">
                            {/* Search bar */}
                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                <input
                                    type="text"
                                    placeholder="Buscar por materia, estudiante o tutor..."
                                    value={modalSearch}
                                    onChange={e => setModalSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-[#0f1113] border border-white/10 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                                    autoFocus
                                />
                            </div>

                            {/* Filter Row */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {/* Cycle Filter */}
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block flex items-center gap-1">
                                        <GraduationCap size={12} /> Nivel
                                    </label>
                                    <select
                                        value={modalCycle}
                                        onChange={e => setModalCycle(e.target.value)}
                                        className="w-full bg-[#0f1113] border border-white/10 rounded-lg p-2 text-sm focus:border-blue-500 outline-none"
                                    >
                                        <option value="">Todos</option>
                                        <option value="I Ciclo">I Ciclo</option>
                                        <option value="II Ciclo">II Ciclo</option>
                                        <option value="III Ciclo">III Ciclo</option>
                                        <option value="Universidad">Universidad</option>
                                    </select>
                                </div>

                                {/* Tutor Filter */}
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block flex items-center gap-1">
                                        <User size={12} /> Tutor
                                    </label>
                                    <input
                                        type="text"
                                        list="tutorList"
                                        placeholder="Todos"
                                        value={modalTutor}
                                        onChange={e => setModalTutor(e.target.value)}
                                        className="w-full bg-[#0f1113] border border-white/10 rounded-lg p-2 text-sm focus:border-blue-500 outline-none"
                                    />
                                    <datalist id="tutorList">
                                        {uniqueTutors.map(t => <option key={t} value={t} />)}
                                    </datalist>
                                </div>

                                {/* Student Filter */}
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block flex items-center gap-1">
                                        <BookOpen size={12} /> Estudiante
                                    </label>
                                    <input
                                        type="text"
                                        list="studentList"
                                        placeholder="Todos"
                                        value={modalStudent}
                                        onChange={e => setModalStudent(e.target.value)}
                                        className="w-full bg-[#0f1113] border border-white/10 rounded-lg p-2 text-sm focus:border-blue-500 outline-none"
                                    />
                                    <datalist id="studentList">
                                        {uniqueStudents.map(s => <option key={s} value={s} />)}
                                    </datalist>
                                </div>

                                {/* Date Range */}
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block flex items-center gap-1">
                                        <Calendar size={12} /> Fecha
                                    </label>
                                    <div className="flex gap-1">
                                        <input
                                            type="date"
                                            value={modalDateFrom}
                                            onChange={e => setModalDateFrom(e.target.value)}
                                            className="flex-1 bg-[#0f1113] border border-white/10 rounded-lg p-2 text-xs focus:border-blue-500 outline-none"
                                        />
                                        <input
                                            type="date"
                                            value={modalDateTo}
                                            onChange={e => setModalDateTo(e.target.value)}
                                            className="flex-1 bg-[#0f1113] border border-white/10 rounded-lg p-2 text-xs focus:border-blue-500 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Active filter count + clear */}
                            {(modalSearch || modalCycle || modalDateFrom || modalDateTo || modalTutor || modalStudent) && (
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-400">
                                        {modalFilteredClasses.length} clase{modalFilteredClasses.length !== 1 ? 's' : ''} encontrada{modalFilteredClasses.length !== 1 ? 's' : ''}
                                    </span>
                                    <button
                                        onClick={() => {
                                            setModalSearch(""); setModalCycle(""); setModalDateFrom(""); setModalDateTo(""); setModalTutor(""); setModalStudent("");
                                        }}
                                        className="text-xs text-blue-400 hover:underline"
                                    >
                                        Limpiar filtros
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Results List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {modalFilteredClasses.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    <Calendar size={40} className="mx-auto mb-3 opacity-40" />
                                    <p>No se encontraron clases con esos filtros.</p>
                                </div>
                            ) : modalFilteredClasses.map(c => {
                                const d = new Date(c.scheduled_at);
                                return (
                                    <button
                                        key={c.id}
                                        onClick={() => handleAssignClass(assigningVideoId!, c.id)}
                                        className="w-full flex items-center gap-4 bg-[#0f1113] hover:bg-blue-500/10 border border-white/5 hover:border-blue-500/30 rounded-xl p-4 text-left transition-all group"
                                    >
                                        {/* Date Chip */}
                                        <div className="text-center bg-white/5 rounded-lg px-3 py-2 min-w-[60px]">
                                            <p className="text-xs text-gray-400">{d.toLocaleDateString('es-CR', { month: 'short' })}</p>
                                            <p className="text-xl font-bold">{d.getDate()}</p>
                                            <p className="text-xs text-gray-500">{d.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })}</p>
                                        </div>

                                        {/* Class Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-white group-hover:text-blue-400 transition-colors truncate">
                                                {c.subject_name}
                                            </p>
                                            <div className="flex items-center gap-4 text-xs text-gray-400 mt-1">
                                                <span className="flex items-center gap-1 truncate">
                                                    <User size={11} /> {c.student_name}
                                                </span>
                                                <span className="flex items-center gap-1 truncate">
                                                    <BookOpen size={11} /> {c.tutor_name}
                                                </span>
                                                <span>{c.duration_minutes} min</span>
                                            </div>
                                        </div>

                                        {/* Status */}
                                        <span className={`text-xs px-2 py-1 rounded-lg shrink-0 ${c.status === 'completed' ? 'bg-green-500/10 text-green-400' :
                                                c.status === 'confirmed' ? 'bg-blue-500/10 text-blue-400' :
                                                    'bg-yellow-500/10 text-yellow-400'
                                            }`}>
                                            {c.status === 'completed' ? 'Completada' :
                                                c.status === 'confirmed' ? 'Confirmada' : 'Agendada'}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-white/5 flex justify-between items-center">
                            <button
                                onClick={() => {
                                    handleAssignClass(assigningVideoId!, '');
                                }}
                                className="text-sm text-red-400 hover:text-red-300 transition-colors"
                            >
                                Desasignar clase
                            </button>
                            <button
                                onClick={() => setAssigningVideoId(null)}
                                className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
