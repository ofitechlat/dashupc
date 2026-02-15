'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    ArrowLeft, Calendar, Clock, Users, BookOpen,
    User, Save, Trash2, CheckCircle, AlertCircle,
    Plus, Play, List, UserPlus, X, GraduationCap
} from 'lucide-react';
import { supabase } from '../../../utils/supabase';
import { WorkshopGroup, Subject, ScheduleSlot } from '../../../types/tutoring';

export default function WorkshopDetailsPage() {
    const router = useRouter();
    const params = useParams();
    const workshopId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [workshop, setWorkshop] = useState<any>(null);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [tutors, setTutors] = useState<any[]>([]);
    const [requests, setRequests] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);

    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isAddingStudent, setIsAddingStudent] = useState(false);
    const [studentSearch, setStudentSearch] = useState('');
    const [foundStudents, setFoundStudents] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        if (workshopId) loadWorkshopData();
    }, [workshopId]);

    const loadWorkshopData = async () => {
        setLoading(true);
        try {
            const [workshopRes, subjectsRes, tutorsRes, requestsRes, classesRes] = await Promise.all([
                supabase.from('workshop_groups').select('*, subjects(*), tutors(*)').eq('id', workshopId).single(),
                supabase.from('subjects').select('*').order('name'),
                supabase.from('tutors').select('id, name').order('name'),
                supabase.from('course_requests').select('*, students(id, name, phone)').eq('workshop_group_id', workshopId),
                supabase.from('classes').select('*').eq('group_id', workshopId).order('scheduled_at')
            ]);

            if (workshopRes.error) throw workshopRes.error;
            setWorkshop(workshopRes.data);
            setSubjects(subjectsRes.data || []);
            setTutors(tutorsRes.data || []);
            setRequests(requestsRes.data || []);
            setClasses(classesRes.data || []);
        } catch (err) {
            console.error('Error loading workshop details:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateClasses = async () => {
        if (!confirm('Esto creará sesiones individuales en el calendario basadas en el horario recurrente. ¿Continuar?')) return;

        setIsGenerating(true);
        try {
            const sessions: any[] = [];
            let current = new Date(workshop.start_date);
            const end = new Date(workshop.end_date);

            const dayMap: Record<string, number> = {
                'Domingo': 0, 'Lunes': 1, 'Martes': 2, 'Miércoles': 3, 'Jueves': 4, 'Viernes': 5, 'Sábado': 6
            };

            while (current <= end) {
                const dayName = Object.keys(dayMap).find(key => dayMap[key] === current.getDay());
                const slots = (workshop.schedule_config as ScheduleSlot[]).filter(s => s.day === dayName);

                for (const slot of slots) {
                    const [hours, minutes] = slot.startTime.split(':');
                    const [endH, endM] = slot.endTime.split(':');

                    const scheduledAt = new Date(current);
                    scheduledAt.setHours(parseInt(hours), parseInt(minutes), 0);

                    const endTime = new Date(current);
                    endTime.setHours(parseInt(endH), parseInt(endM), 0);

                    const duration = (endTime.getTime() - scheduledAt.getTime()) / (1000 * 60);

                    sessions.push({
                        group_id: workshop.id,
                        subject_id: workshop.subject_id,
                        tutor_id: workshop.tutor_id,
                        scheduled_at: scheduledAt.toISOString(),
                        duration_minutes: duration,
                        status: 'confirmed'
                    });
                }
                current.setDate(current.getDate() + 1);
            }

            if (sessions.length > 0) {
                const { error } = await supabase.from('classes').insert(sessions);
                if (error) throw error;
                alert(`¡Se generaron ${sessions.length} sesiones exitosamente!`);
                loadWorkshopData();
            } else {
                alert('No se encontraron días que coincidan con el horario en el rango de fechas seleccionado.');
            }
        } catch (err: any) {
            console.error('Error generating classes:', err);
            alert(`Error al generar sesiones: ${err.message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleUpdatePrice = async (newPrice: number) => {
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('workshop_groups')
                .update({ price: newPrice })
                .eq('id', workshopId);

            if (error) throw error;
            setWorkshop((prev: any) => ({ ...prev, price: newPrice }));
        } catch (err: any) {
            alert('Error al actualizar precio: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteWorkshop = async () => {
        if (!confirm('¿Eliminar este taller? Esto no borrará las clases ya generadas, pero el grupo desaparecerá.')) return;

        try {
            const { error } = await supabase.from('workshop_groups').delete().eq('id', workshopId);
            if (error) throw error;
            router.push('/admin/workshops');
        } catch (err: any) {
            console.error('Error deleting workshop:', err);
            alert(`Error al eliminar: ${err.message}`);
        }
    };

    const handleToggleStatus = async () => {
        const newStatus = workshop.status === 'active' ? 'planning' : 'active';
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('workshop_groups')
                .update({ status: newStatus })
                .eq('id', workshopId);

            if (error) throw error;
            setWorkshop((prev: any) => ({ ...prev, status: newStatus }));
            alert(`Taller ${newStatus === 'active' ? 'publicado' : 'movido a planeación'} correctamente.`);
        } catch (err: any) {
            alert('Error al cambiar estado: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSearchStudents = async () => {
        if (!studentSearch.trim()) return;
        setIsSearching(true);
        try {
            const { data, error } = await supabase
                .from('students')
                .select('id, name, phone')
                .ilike('name', `%${studentSearch}%`)
                .limit(5);
            if (data) setFoundStudents(data);
        } catch (err) {
            console.error('Error searching students:', err);
        } finally {
            setIsSearching(false);
        }
    };

    const handleEnrollStudent = async (studentId: string) => {
        setIsSaving(true);
        try {
            // Check if already enrolled
            if (requests.some(r => r.student_id === studentId)) {
                alert('Este estudiante ya está inscrito en el taller.');
                return;
            }

            const { error } = await supabase.from('course_requests').insert({
                student_id: studentId,
                subject_id: workshop.subject_id,
                workshop_group_id: workshopId,
                status: 'pending',
                preference: 'grupal',
                total_price: workshop.price || 0
            });

            if (error) throw error;
            setIsAddingStudent(false);
            setStudentSearch('');
            setFoundStudents([]);
            loadWorkshopData();
        } catch (err: any) {
            alert('Error al inscribir: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleRemoveStudent = async (requestId: string) => {
        if (!confirm('¿Eliminar a este estudiante del taller?')) return;
        try {
            // Use the RPC for safe cascading deletion
            const { error } = await supabase.rpc('delete_course_request_linked', { p_request_id: requestId });

            if (error) {
                console.error('RPC Error:', error);
                // Fallback: Try manual deletion if RPC fails (e.g., function not created yet)
                const { error: fallbackError } = await supabase.from('course_requests').delete().eq('id', requestId);
                if (fallbackError) throw fallbackError;
            }

            loadWorkshopData();
            alert('Estudiante eliminado correctamente.');
        } catch (err: any) {
            console.error('Deletion error:', err);
            alert('Error al eliminar: ' + (err.message || err.details || 'Error desconocido'));
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0f1113] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0f1113] text-white">
            <header className="sticky top-0 z-50 bg-[#0f1113]/95 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.push('/admin/workshops')} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold">{workshop.name}</h1>
                            <p className="text-sm text-gray-400">{workshop.subjects?.name}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleDeleteWorkshop}
                            className="p-2.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                        >
                            <Trash2 size={20} />
                        </button>
                        <button
                            onClick={handleToggleStatus}
                            disabled={isSaving}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-all border ${workshop.status === 'active'
                                ? 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20'
                                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20'
                                }`}
                        >
                            {workshop.status === 'active' ? (
                                <><CheckCircle size={18} /> Publicado</>
                            ) : (
                                <><Play size={18} /> Publicar Taller</>
                            )}
                        </button>
                        <button
                            onClick={handleGenerateClasses}
                            disabled={isGenerating || !workshop.tutor_id || classes.length > 0}
                            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 disabled:opacity-50 px-4 py-2.5 rounded-xl font-semibold transition-all border border-white/10"
                        >
                            <Calendar size={18} />
                            {isGenerating ? 'Generando...' : classes.length > 0 ? 'Sesiones Listas' : 'Generar Sesiones'}
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-8">
                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Left Column: Info & Schedule */}
                    <div className="lg:col-span-2 space-y-6">
                        <section className="bg-[#1a1c1e] rounded-2xl border border-white/5 p-6">
                            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                                <List size={20} className="text-blue-400" />
                                Detalles del Taller
                            </h3>
                            <div className="grid gap-6 md:grid-cols-2">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Tutor</p>
                                    <p className="font-medium text-lg">{workshop.tutors?.name || 'No asignado'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Rango de Fechas</p>
                                    <p className="font-medium">
                                        {new Date(workshop.start_date).toLocaleDateString()} - {new Date(workshop.end_date).toLocaleDateString()}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Precio del Taller</p>
                                    <div className="flex items-center gap-2">
                                        <div className="relative flex-1">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₡</span>
                                            <input
                                                type="number"
                                                className="w-full bg-[#0f1113] border border-white/10 rounded-lg pl-8 pr-3 py-1 text-sm focus:border-blue-500 outline-none"
                                                value={workshop.price || 0}
                                                onChange={(e) => setWorkshop((prev: any) => ({ ...prev, price: parseFloat(e.target.value) }))}
                                                onBlur={(e) => handleUpdatePrice(parseFloat(e.target.value))}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-2">Horario Semanal</p>
                                    <div className="grid gap-2">
                                        {(workshop.schedule_config as ScheduleSlot[]).map((slot, i) => (
                                            <div key={i} className="flex items-center gap-3 bg-[#0f1113] p-3 rounded-xl border border-white/5 text-sm">
                                                <Clock size={14} className="text-cyan-400" />
                                                <span className="font-bold text-gray-300 w-20">{slot.day}</span>
                                                <span className="text-gray-400">{slot.startTime} - {slot.endTime}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="bg-[#1a1c1e] rounded-2xl border border-white/5 p-6">
                            <h3 className="text-lg font-semibold mb-6 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Calendar size={20} className="text-orange-400" />
                                    Sesiones Generadas ({classes.length})
                                </div>
                                {classes.length > 0 && (
                                    <button className="text-xs text-blue-400 hover:underline">Ver todas</button>
                                )}
                            </h3>
                            {classes.length === 0 ? (
                                <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-3xl">
                                    <Calendar size={40} className="mx-auto mb-3 opacity-20" />
                                    <p className="text-gray-500">Aún no se han generado las sesiones para este taller.</p>
                                    <p className="text-sm text-gray-600 mt-1">Haz clic en "Generar Sesiones" cuando el horario esté listo.</p>
                                </div>
                            ) : (
                                <div className="grid gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                    {classes.map((c) => (
                                        <div key={c.id} className="flex items-center justify-between bg-[#0f1113] p-4 rounded-xl border border-white/5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-white/5 rounded-lg flex flex-col items-center justify-center text-[10px] font-bold">
                                                    <span className="text-blue-400 uppercase">{new Date(c.scheduled_at).toLocaleDateString('es', { month: 'short' })}</span>
                                                    <span>{new Date(c.scheduled_at).getDate()}</span>
                                                </div>
                                                <div>
                                                    <p className="font-medium text-sm">
                                                        {new Date(c.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                    <p className="text-xs text-gray-500 capitalize">
                                                        {new Date(c.scheduled_at).toLocaleDateString('es', { weekday: 'long' })}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${c.status === 'confirmed' ? 'text-blue-400 border-blue-400/20' : 'text-green-400 border-green-400/20'}`}>
                                                {c.status === 'confirmed' ? 'Pendiente' : c.status === 'completed' ? 'Completado' : c.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>

                    {/* Right Column: Students */}
                    <div className="space-y-6">
                        <section className="bg-[#1a1c1e] rounded-2xl border border-white/5 p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <Users size={20} className="text-green-400" />
                                    Estudiantes ({requests.length}/{workshop.max_students})
                                </h3>
                                <button
                                    onClick={() => setIsAddingStudent(true)}
                                    className="p-2 hover:bg-white/10 rounded-lg text-blue-400 transition-colors"
                                >
                                    <UserPlus size={18} />
                                </button>
                            </div>

                            <div className="space-y-3">
                                {requests.length === 0 ? (
                                    <p className="text-center py-8 text-gray-500 text-sm border-2 border-dashed border-white/5 rounded-2xl">
                                        Nadie se ha unido aún
                                    </p>
                                ) : (
                                    requests.map((req) => (
                                        <div key={req.id} className="flex items-center justify-between bg-[#0f1113] p-3 rounded-xl border border-white/5 group">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-green-500/10 rounded-full flex items-center justify-center text-green-400 font-bold text-xs">
                                                    {req.students?.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-sm line-clamp-1">{req.students?.name}</p>
                                                    <p className="text-[10px] text-gray-500">{req.students?.phone}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveStudent(req.id)}
                                                className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/10 text-gray-500 hover:text-red-400 rounded-lg transition-all"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="mt-6 pt-6 border-t border-white/5">
                                <div className="flex justify-between text-xs text-gray-500 mb-2">
                                    <span>Cupo disponible</span>
                                    <span>{Math.round((requests.length / workshop.max_students) * 100)}%</span>
                                </div>
                                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-green-500 transition-all duration-1000"
                                        style={{ width: `${(requests.length / workshop.max_students) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        </section>

                        {/* Quick Tips */}
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <GraduationCap className="text-blue-400" size={20} />
                                <h4 className="font-bold text-blue-400">Tips de Admin</h4>
                            </div>
                            <ul className="space-y-3 text-xs text-blue-100/70">
                                <li className="flex gap-2">
                                    <span className="text-blue-400 text-lg leading-none">•</span>
                                    Genera las sesiones solo cuando el tutor esté confirmado.
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-blue-400 text-lg leading-none">•</span>
                                    Borrar el taller no borra las clases del calendario por seguridad.
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-blue-400 text-lg leading-none">•</span>
                                    Los estudiantes ven los talleres disponibles en su registro.
                                </li>
                            </ul>
                        </div>
                    </div>
                </div >
            </main >

            {/* Modal: Agregar Estudiante */}
            {
                isAddingStudent && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                        <div className="bg-[#1a1c1e] rounded-2xl border border-white/10 p-6 w-full max-w-md shadow-2xl">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold">Inscribir Estudiante</h3>
                                <button onClick={() => setIsAddingStudent(false)} className="p-1 hover:bg-white/10 rounded-lg">
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Buscar por nombre..."
                                        className="flex-1 bg-[#0f1113] border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:border-blue-500"
                                        value={studentSearch}
                                        onChange={(e) => setStudentSearch(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearchStudents()}
                                    />
                                    <button
                                        onClick={handleSearchStudents}
                                        disabled={isSearching}
                                        className="bg-blue-600 hover:bg-blue-700 p-2 rounded-xl transition-colors"
                                    >
                                        <Search size={20} />
                                    </button>
                                </div>

                                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                    {foundStudents.length === 0 ? (
                                        <p className="text-center py-8 text-gray-500 text-sm">
                                            Busca un estudiante para inscribirlo
                                        </p>
                                    ) : (
                                        foundStudents.map(student => (
                                            <div key={student.id} className="flex items-center justify-between bg-[#0f1113] p-3 rounded-xl border border-white/5">
                                                <div>
                                                    <p className="font-medium text-sm">{student.name}</p>
                                                    <p className="text-[10px] text-gray-500">{student.phone}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleEnrollStudent(student.id)}
                                                    disabled={isSaving}
                                                    className="bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                                                >
                                                    Inscribir
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}

const Search = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
);
