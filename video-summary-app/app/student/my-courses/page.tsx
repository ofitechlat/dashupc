'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import {
    BookOpen, Calendar, Clock, PlayCircle, ExternalLink,
    ChevronDown, ChevronUp, Video, FileText, CheckCircle2,
    AlertTriangle
} from 'lucide-react';

interface ClassSession {
    id: string;
    scheduled_at: string;
    duration_minutes: number;
    status: string;
    tutor_name: string;
    videos: { id: string; youtube_link: string; title: string }[];
}

interface CourseData {
    id: string; // course_request id
    subject_name: string;
    subject_id: string;
    moodle_link: string | null;
    syllabus: string[];
    package_hours: number;
    preference: string;
    status: string;
    total_price: number;
    amount_paid: number;
    payment_status: string;
    workshop?: {
        id: string;
        name: string;
        start_date: string;
        end_date: string;
        price: number;
        status: string;
    };
    classes: ClassSession[];
}

export default function MyCoursesPage() {
    const [loading, setLoading] = useState(true);
    const [courses, setCourses] = useState<CourseData[]>([]);
    const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<Record<string, 'clases' | 'videos' | 'temas'>>({});

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data: student } = await supabase
            .from('students')
            .select('id')
            .eq('user_id', session.user.id)
            .maybeSingle();

        if (!student) { setLoading(false); return; }

        // Load course_requests with related classes and subject info
        const { data } = await supabase
            .from('course_requests')
            .select(`
                id, package_hours, preference, status, total_price, amount_paid, payment_status, workshop_group_id,
                subject:subjects(id, name, moodle_link, syllabus),
                workshop:workshop_groups(id, name, start_date, end_date, price, status)
            `)
            .eq('student_id', student.id)
            .in('status', ['matched', 'completed'])
            .order('created_at', { ascending: false });

        if (data) {
            const requests = data as any[];

            // Collect all workshop group IDs
            const workshopGroupIds = requests.filter(r => r.workshop_group_id).map(r => r.workshop_group_id);
            const requestIds = requests.map(r => r.id);

            // Fetch classes: either direct student classes (request_id) or group workshops (group_id)
            const { data: classesData } = await supabase
                .from('classes')
                .select(`
                    id, scheduled_at, duration_minutes, status, group_id, request_id,
                    tutor:tutors(name),
                    subject:subjects(name)
                `)
                .or(`request_id.in.(${requestIds.join(',')}),group_id.in.(${workshopGroupIds.length > 0 ? workshopGroupIds.join(',') : '00000000-0000-0000-0000-000000000000'})`);

            const classList = classesData || [];

            // Collect all class IDs to find linked videos
            const allClassIds = classList.map(c => c.id);

            // Load videos
            let videosMap: Record<string, { id: string; title: string }[]> = {};
            if (allClassIds.length > 0) {
                const { data: vids } = await supabase
                    .from('videos')
                    .select('id, title, class_id')
                    .in('class_id', allClassIds);

                if (vids) {
                    for (const v of vids as any[]) {
                        if (!videosMap[v.class_id]) videosMap[v.class_id] = [];
                        videosMap[v.class_id].push({ id: v.id, title: v.title || 'Video de clase' });
                    }
                }
            }

            const mapped: CourseData[] = requests.map(d => {
                const courseClasses = classList.filter(c =>
                    c.request_id === d.id || (d.workshop_group_id && c.group_id === d.workshop_group_id)
                );

                // For workshops, total hours = sum of session durations. For others, use package_hours.
                const totalHours = d.workshop_group_id
                    ? courseClasses.reduce((acc: number, c: any) => acc + (c.duration_minutes || 60) / 60, 0)
                    : (d.package_hours || 0);

                // Prioritize workshop specific price if available
                const finalTotalPrice = d.workshop?.price || d.total_price || 0;

                return {
                    id: d.id,
                    subject_name: d.subject?.name || 'Sin materia',
                    subject_id: d.subject?.id || '',
                    moodle_link: d.subject?.moodle_link || null,
                    syllabus: d.subject?.syllabus || [],
                    package_hours: totalHours,
                    preference: d.preference || 'grupal',
                    status: d.status,
                    total_price: finalTotalPrice,
                    amount_paid: d.amount_paid || 0,
                    payment_status: d.payment_status || 'pending',
                    workshop: d.workshop || undefined,
                    classes: courseClasses.map((c: any) => ({
                        id: c.id,
                        scheduled_at: c.scheduled_at,
                        duration_minutes: c.duration_minutes || 60,
                        status: c.status,
                        tutor_name: c.tutor?.name || 'Sin asignar',
                        videos: (videosMap[c.id] || []).map(v => ({ ...v, youtube_link: '' }))
                    })).sort((a: ClassSession, b: ClassSession) =>
                        new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
                    )
                };
            });
            setCourses(mapped);
        }
        setLoading(false);
    };

    const getDeliveredHours = (course: CourseData) =>
        course.classes.filter(c => c.status === 'completed').reduce((s, c) => s + c.duration_minutes / 60, 0);

    const getAllVideos = (course: CourseData) =>
        course.classes.flatMap(c => c.videos.map(v => ({ ...v, classDate: c.scheduled_at })));

    const getTab = (courseId: string) => activeTab[courseId] || 'clases';

    if (loading) return <div className="p-8 text-white">Cargando cursos...</div>;

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <h1 className="text-3xl font-bold mb-8">Mis Cursos</h1>

            {courses.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                    <BookOpen size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No tienes cursos activos. Tus solicitudes aprobadas apareceran aqui.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {courses.map(course => {
                        const delivered = getDeliveredHours(course);
                        const progress = course.package_hours > 0 ? Math.min((delivered / course.package_hours) * 100, 100) : 0;
                        const remaining = course.total_price - course.amount_paid;
                        const isExpanded = expandedCourse === course.id;
                        const tab = getTab(course.id);
                        const allVideos = getAllVideos(course);
                        const pendingVideos = course.classes.filter(c => c.status === 'completed' && c.videos.length === 0).length;

                        return (
                            <div key={course.id} className="bg-[#1a1c1e] rounded-2xl border border-white/10 overflow-hidden">
                                {/* Course Header */}
                                <button
                                    onClick={() => setExpandedCourse(isExpanded ? null : course.id)}
                                    className="w-full p-6 text-left hover:bg-white/[0.02] transition-colors"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-blue-500/20 p-3 rounded-xl">
                                                <BookOpen size={22} className="text-blue-400" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-xl">
                                                    {course.workshop ? course.workshop.name : course.subject_name}
                                                </h3>
                                                <p className="text-sm text-gray-400 capitalize">
                                                    {course.workshop ? 'Taller Grupal' : `${course.preference} - ${course.package_hours}h contratadas`}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`text-xs px-3 py-1 rounded-full font-bold ${course.status === 'completed'
                                                ? 'bg-green-500/10 text-green-400'
                                                : 'bg-blue-500/10 text-blue-400'
                                                }`}>
                                                {course.status === 'completed' ? 'Completado' : 'Activo'}
                                            </span>
                                            {isExpanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                                        </div>
                                    </div>

                                    {/* Summary Cards */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">Progreso</p>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-xl font-bold">{delivered}</span>
                                                <span className="text-sm text-gray-400">/ {course.package_hours}h</span>
                                            </div>
                                            <div className="w-full bg-white/5 rounded-full h-1.5 mt-2">
                                                <div className={`h-1.5 rounded-full ${progress >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                                                    style={{ width: `${progress}%` }} />
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">Sesiones</p>
                                            <span className="text-xl font-bold">{course.classes.length}</span>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">Saldo Pendiente</p>
                                            <span className={`text-xl font-bold ${remaining > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                                {remaining > 0 ? `${remaining.toLocaleString()}` : 'Pagado'}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">Videos</p>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xl font-bold">{allVideos.length}</span>
                                                {pendingVideos > 0 && (
                                                    <span className="text-xs bg-yellow-500/10 text-yellow-400 px-2 py-0.5 rounded">
                                                        {pendingVideos} pendiente{pendingVideos > 1 ? 's' : ''}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </button>

                                {/* Expanded Content */}
                                {isExpanded && (
                                    <div className="border-t border-white/5">
                                        {/* Action Bar */}
                                        <div className="flex items-center justify-between px-6 py-3 bg-[#151719]">
                                            {/* Tabs */}
                                            <div className="flex gap-1 bg-[#0f1113] rounded-xl p-1">
                                                {(['clases', 'videos', 'temas'] as const).map(t => (
                                                    <button
                                                        key={t}
                                                        onClick={() => setActiveTab(prev => ({ ...prev, [course.id]: t }))}
                                                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors capitalize ${tab === t
                                                            ? 'bg-blue-500/20 text-blue-400'
                                                            : 'text-gray-400 hover:text-white'
                                                            }`}
                                                    >
                                                        {t}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Moodle Button */}
                                            {course.moodle_link && (
                                                <a
                                                    href={course.moodle_link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 px-4 py-2 rounded-xl text-sm font-medium transition-colors border border-purple-500/20"
                                                >
                                                    <ExternalLink size={14} />
                                                    Ir a Moodle
                                                </a>
                                            )}
                                        </div>

                                        <div className="p-6">
                                            {/* TAB: Clases */}
                                            {tab === 'clases' && (
                                                <div className="space-y-3">
                                                    {course.classes.length === 0 ? (
                                                        <p className="text-center text-gray-500 py-8">No hay clases agendadas.</p>
                                                    ) : course.classes.map((cls, idx) => {
                                                        const isPast = new Date(cls.scheduled_at) < new Date();
                                                        return (
                                                            <div key={cls.id} className="flex items-center justify-between bg-[#0f1113] rounded-xl p-4 border border-white/5">
                                                                <div className="flex items-center gap-4">
                                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${cls.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                                                        isPast ? 'bg-yellow-500/20 text-yellow-400' :
                                                                            'bg-blue-500/20 text-blue-400'
                                                                        }`}>
                                                                        {idx + 1}
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-medium">
                                                                            {new Date(cls.scheduled_at).toLocaleDateString('es-CR', {
                                                                                weekday: 'long', day: 'numeric', month: 'short', year: 'numeric'
                                                                            })}
                                                                        </p>
                                                                        <p className="text-xs text-gray-500">
                                                                            {new Date(cls.scheduled_at).toLocaleTimeString('es-CR', {
                                                                                hour: '2-digit', minute: '2-digit'
                                                                            })}
                                                                            {' - '}{cls.duration_minutes} min - Tutor: {cls.tutor_name}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`text-xs px-3 py-1.5 rounded-lg font-medium ${cls.status === 'completed' ? 'bg-green-500/10 text-green-400' :
                                                                        cls.status === 'cancelled' ? 'bg-red-500/10 text-red-400' :
                                                                            isPast ? 'bg-yellow-500/10 text-yellow-400' :
                                                                                'bg-blue-500/10 text-blue-400'
                                                                        }`}>
                                                                        {cls.status === 'completed' ? 'Completada' :
                                                                            cls.status === 'cancelled' ? 'Cancelada' :
                                                                                isPast ? 'Pendiente' : 'Agendada'}
                                                                    </span>
                                                                    {cls.videos.length > 0 ? (
                                                                        <a
                                                                            href={`/video/${cls.videos[0].id}`}
                                                                            onClick={e => e.stopPropagation()}
                                                                            className="text-xs bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors border border-purple-500/20"
                                                                        >
                                                                            <PlayCircle size={12} />
                                                                            Ver Video
                                                                        </a>
                                                                    ) : cls.status === 'completed' ? (
                                                                        <span className="text-xs bg-yellow-500/10 text-yellow-400 px-2 py-1 rounded-lg flex items-center gap-1">
                                                                            <AlertTriangle size={12} />
                                                                            Sin video
                                                                        </span>
                                                                    ) : null}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}

                                                    {/* Summary */}
                                                    <div className="flex items-center gap-6 pt-4 text-sm border-t border-white/5">
                                                        <span className="text-gray-400">
                                                            Impartidas: <strong className="text-green-400">{delivered}h</strong>
                                                        </span>
                                                        <span className="text-gray-400">
                                                            Faltan: <strong className={delivered < course.package_hours ? 'text-yellow-400' : 'text-green-400'}>
                                                                {Math.max(0, course.package_hours - delivered)}h
                                                            </strong>
                                                        </span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* TAB: Videos */}
                                            {tab === 'videos' && (
                                                <div className="space-y-3">
                                                    {allVideos.length === 0 ? (
                                                        <p className="text-center text-gray-500 py-8">No hay videos disponibles aun.</p>
                                                    ) : allVideos.map((video, idx) => (
                                                        <a
                                                            key={video.id || idx}
                                                            href={`/video/${video.id}`}
                                                            className="flex items-center gap-4 bg-[#0f1113] rounded-xl p-4 border border-white/5 hover:border-purple-500/30 transition-colors group"
                                                        >
                                                            <div className="bg-purple-500/20 p-3 rounded-xl group-hover:scale-110 transition-transform">
                                                                <PlayCircle size={20} className="text-purple-400" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-medium truncate">{video.title || `Clase ${idx + 1}`}</p>
                                                                <p className="text-xs text-gray-500">
                                                                    {new Date(video.classDate).toLocaleDateString('es-CR', {
                                                                        weekday: 'long', day: 'numeric', month: 'short'
                                                                    })}
                                                                </p>
                                                            </div>
                                                            <span className="text-xs text-purple-400 bg-purple-500/10 px-3 py-1.5 rounded-lg">Ver Resumen</span>
                                                        </a>
                                                    ))}

                                                    {pendingVideos > 0 && (
                                                        <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-xl p-4 text-sm text-yellow-400 flex items-center gap-3">
                                                            <AlertTriangle size={16} />
                                                            {pendingVideos} clase{pendingVideos > 1 ? 's' : ''} completada{pendingVideos > 1 ? 's' : ''} sin video disponible aun.
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* TAB: Temas */}
                                            {tab === 'temas' && (
                                                <div>
                                                    {course.syllabus.length === 0 ? (
                                                        <p className="text-center text-gray-500 py-8">
                                                            No hay temario cargado para esta materia.
                                                            {course.moodle_link && (
                                                                <a href={course.moodle_link} target="_blank" rel="noopener noreferrer"
                                                                    className="block mt-2 text-purple-400 hover:underline">
                                                                    Ver temario completo en Moodle
                                                                </a>
                                                            )}
                                                        </p>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            {course.syllabus.map((topic, idx) => {
                                                                // Check if any video title matches this topic
                                                                const linkedVideo = allVideos.find(v =>
                                                                    v.title && v.title.toLowerCase().includes(topic.toLowerCase())
                                                                );

                                                                return (
                                                                    <div key={idx} className="flex items-center justify-between bg-[#0f1113] rounded-xl p-4 border border-white/5">
                                                                        <div className="flex items-center gap-3">
                                                                            <span className="text-sm text-gray-500 w-6">{idx + 1}.</span>
                                                                            <span className="font-medium">{topic}</span>
                                                                        </div>
                                                                        {linkedVideo ? (
                                                                            <a
                                                                                href={linkedVideo.youtube_link}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="flex items-center gap-1.5 text-xs bg-red-500/10 text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/20 transition-colors"
                                                                            >
                                                                                <PlayCircle size={12} />
                                                                                Ver video
                                                                            </a>
                                                                        ) : (
                                                                            <span className="text-xs text-gray-600">Sin video</span>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
