'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import {
    Calendar, Clock, Video, FileText, Search,
    ChevronRight, PlayCircle, X
} from 'lucide-react';

interface ClassSession {
    id: string;
    scheduled_at: string;
    duration_minutes: number;
    status: string;
    subject: { name: string; moodle_link: string | null };
    tutor: { name: string } | null;
    videos: { id: string; youtube_link: string; title: string }[];
}

interface Subject {
    id: string;
    name: string;
}

export default function StudentClassesPage() {
    const [loading, setLoading] = useState(true);
    const [classes, setClasses] = useState<ClassSession[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);

    // Filters
    const [selectedSubject, setSelectedSubject] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Video Player State
    const [activeVideo, setActiveVideo] = useState<{ url: string, title: string } | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Get Student ID first
        const { data: student } = await supabase.from('students').select('id').eq('user_id', session.user.id).single();
        if (!student) return;

        // Load Subjects
        const { data: subjs } = await supabase.from('subjects').select('id, name');
        if (subjs) setSubjects(subjs);

        // Load Classes
        fetchClasses(student.id);
    };

    const fetchClasses = async (studentId: string) => {
        setLoading(true);
        try {
            // First, get all workshop group IDs the student is in
            const { data: requests } = await supabase
                .from('course_requests')
                .select('workshop_group_id')
                .eq('student_id', studentId)
                .not('workshop_group_id', 'is', null);

            const workshopGroupIds = requests?.map(r => r.workshop_group_id) || [];

            // Fetch classes: matching student_id OR matching group_id in workshops
            let query = supabase
                .from('classes')
                .select(`
                    id, scheduled_at, duration_minutes, status, group_id,
                    subject:subjects(name, moodle_link),
                    tutor:tutors(name),
                    videos(id, youtube_link, title)
                `)
                .or(`student_id.eq.${studentId}${workshopGroupIds.length > 0 ? `,group_id.in.(${workshopGroupIds.join(',')})` : ''}`)
                .order('scheduled_at', { ascending: false });

            if (selectedSubject) query = query.eq('subject_id', selectedSubject);
            if (startDate) query = query.gte('scheduled_at', `${startDate}T00:00:00`);
            if (endDate) query = query.lte('scheduled_at', `${endDate}T23:59:59`);

            const { data, error } = await query;
            if (error) throw error;
            if (data) setClasses(data as any);
        } catch (err) {
            console.error('Error fetching classes:', err);
        } finally {
            setLoading(false);
        }
    };

    // Re-fetch when filters change (Debounced ideally, but button driven or effect driven ok for now)
    // We need the studentID again to refetch.
    // Simplifying: Just load all logic in one effect or store studentID.

    // Better: Filter client side if list is small, or Refetch. 
    // Let's perform client side filtering for responsiveness unless data is massive.
    // Actually, SQL filtering is safer for pagination later. 
    // I will use a simple "Apply Filters" approach or Effect dependency if I had studentID stored.

    // For now, let's just stick to Client Side filtering for responsiveness on this MVP list
    // UNLESS the user explicitly wants API filtering. API filtering is robust.

    // Let's filter the ALREADY FETCHED list for now to avoid complexity of storing student ID in state or refetching auth.
    // WAit, I can just store studentId.

    const filteredClasses = classes.filter(c => {
        if (selectedSubject && c.subject.name !== selectedSubject) return false; // Name matching potentially if ID not available in UI choice? Ah I have subject ID in select value but name in class object.
        // Wait, class object has subject: { name }. I don't have subject_id in the select payload unless I expanded it. 
        // Let's match by NAME for simplicity in client filter, or ensure I fetch subject_id.

        // Let's just use Client Side Date Filter
        if (startDate && new Date(c.scheduled_at) < new Date(startDate)) return false;
        if (endDate && new Date(c.scheduled_at) > new Date(endDate + 'T23:59:59')) return false;

        return true;
    });


    if (loading && classes.length === 0) return <div className="p-8 text-white">Cargando clases...</div>;

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold mb-8">Mis Clases</h1>

            {/* Filters Bar */}
            <div className="bg-[#1a1c1e] p-4 rounded-xl border border-white/5 mb-8 flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                    <label className="text-sm text-gray-400 mb-1 block">Materia</label>
                    <select
                        className="w-full bg-[#0f1113] border border-white/10 rounded-lg p-2.5 outline-none"
                        value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}
                    >
                        <option value="">Todas las materias</option>
                        {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                        {/* Matching by Name for client filter simplicity since I didn't select subject_id in class join */}
                    </select>
                </div>
                <div>
                    <label className="text-sm text-gray-400 mb-1 block">Desde</label>
                    <input type="date" className="bg-[#0f1113] border border-white/10 rounded-lg p-2.5 outline-none"
                        value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div>
                    <label className="text-sm text-gray-400 mb-1 block">Hasta</label>
                    <input type="date" className="bg-[#0f1113] border border-white/10 rounded-lg p-2.5 outline-none"
                        value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
                {/* <button className="bg-blue-600 hover:bg-blue-700 px-4 py-2.5 rounded-lg font-medium flex items-center gap-2">
                    <Search size={16} /> Filtrar
                </button> */}
            </div>

            {/* Classes Grid */}
            <div className="grid gap-4">
                {filteredClasses.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 bg-[#1a1c1e] rounded-xl border border-white/5">
                        No se encontraron clases con estos filtros.
                    </div>
                ) : (
                    filteredClasses.map(c => (
                        <div key={c.id} className="bg-[#1a1c1e] rounded-xl p-6 border border-white/5 hover:border-blue-500/30 transition-all group">
                            <div className="flex flex-col md:flex-row justify-between gap-6">
                                {/* Info */}
                                <div className="flex gap-4 items-start">
                                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                                        <Calendar size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-white">{c.subject.name}</h3>
                                        <p className="text-sm text-gray-400 mt-1 flex items-center gap-2">
                                            <span>{new Date(c.scheduled_at).toLocaleDateString()}</span>
                                            <span className="w-1 h-1 bg-gray-600 rounded-full" />
                                            <span className="text-white">{new Date(c.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            <span className="w-1 h-1 bg-gray-600 rounded-full" />
                                            <span>{c.duration_minutes} min</span>
                                        </p>
                                        <p className="text-xs text-gray-500 mt-2">Tutor: {c.tutor?.name || 'Por asignar'}</p>
                                    </div>
                                </div>

                                {/* Actions & Status */}
                                <div className="flex flex-col items-end justify-between gap-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${c.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                        c.status === 'confirmed' ? 'bg-blue-500/20 text-blue-400' :
                                            'bg-gray-500/20 text-gray-400'
                                        }`}>
                                        {c.status}
                                    </span>

                                    <div className="flex gap-3">
                                        {c.subject.moodle_link && (
                                            <a href={c.subject.moodle_link} target="_blank" rel="noreferrer"
                                                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-medium transition-colors flex items-center gap-2"
                                            >
                                                <FileText size={16} /> Material
                                            </a>
                                        )}
                                        {c.videos && c.videos.length > 0 ? (
                                            <button
                                                onClick={() => setActiveVideo({
                                                    url: c.videos[0].youtube_link,
                                                    title: c.videos[0].title
                                                })}
                                                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors flex items-center gap-2 shadow-lg shadow-red-900/20"
                                            >
                                                <PlayCircle size={18} /> Ver Grabación
                                            </button>
                                        ) : (
                                            <button disabled className="px-4 py-2 rounded-lg bg-white/5 text-gray-500 text-sm font-medium cursor-not-allowed">
                                                No disponible
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Video Modal */}
            {activeVideo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-5xl bg-[#0f1113] rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative">
                        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#1a1c1e]">
                            <h3 className="font-bold flex items-center gap-2">
                                <Video size={18} className="text-red-500" />
                                {activeVideo.title || 'Grabación de la clase'}
                            </h3>
                            <button onClick={() => setActiveVideo(null)} className="p-2 hover:bg-white/10 rounded-lg">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="aspect-video w-full bg-black">
                            {/* Handle various Youtube URL formats if needed, assuming embed link or standard watch link needs conversion? 
                                YouTube Embed requires 'embed/' path. 
                                Let's write a quick helper or assume the link provided is 'watch?v=' and convert it. 
                             */}
                            <iframe
                                src={activeVideo.url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                                className="w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
