'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../utils/supabase';
import {
    Clock, Check, X, Calendar,
    ArrowLeft, CheckCircle2, XCircle, User, BookOpen,
    Users, MessageCircle, Phone, UserCheck, Target, Split, Link
} from 'lucide-react';

interface Tutor {
    id: string;
    name: string;
    phone: string;
    email: string;
}

interface AvailabilitySlot {
    day: string;
    startTime: string;
    endTime: string;
    recurring: boolean;
    specificDate?: string;
}

interface Request {
    id: string;
    student_id: string;
    student: { id: string; name: string; phone: string; email: string };
    subject_id?: string;
    subject?: { id: string; name: string; individual_price: number; group_price: number };
    subject_ids?: string[];
    term_id?: string;
    term?: { id: string; name: string };
    package_hours: number;
    preference: 'individual' | 'grupal';
    proposed_schedule: any[];
    request_type?: string;
    objectives?: any;
    status: string;
    created_at: string;
    rejection_reason?: string;
    workshop_group_id?: string;
    workshop_group?: { id: string; name: string; schedule_config: any[] };
}

const DAY_LABELS: Record<string, string> = {
    monday: 'Lunes',
    tuesday: 'Martes',
    wednesday: 'Miércoles',
    thursday: 'Jueves',
    friday: 'Viernes',
    saturday: 'Sábado',
    sunday: 'Domingo'
};

function isAvailabilityRequest(req: Request): boolean {
    if (req.workshop_group_id) return false; // Workshops have fixed schedule
    if (req.request_type === 'availability') return true;
    if (req.subject_ids && req.subject_ids.length > 0) return true;
    if (req.proposed_schedule && req.proposed_schedule.length > 0) {
        const first = req.proposed_schedule[0];
        return !!first.day && !!first.startTime;
    }
    return false;
}

export default function AdminRequestsPage() {
    const router = useRouter();
    const [requests, setRequests] = useState<Request[]>([]);
    const [tutors, setTutors] = useState<Tutor[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [activeGroups, setActiveGroups] = useState<any[]>([]); // For Smart Matching
    const [allSubjects, setAllSubjects] = useState<any[]>([]); // For name lookup

    // Reject Modal
    const [rejectId, setRejectId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState('');

    // Schedule Modal (for availability requests)
    const [scheduleReqId, setScheduleReqId] = useState<string | null>(null);
    const [selectedTutorId, setSelectedTutorId] = useState('');
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedTime, setSelectedTime] = useState('');

    useEffect(() => {
        loadRequests();
        loadTutors();
        loadActiveGroups();
        loadAllSubjects();
    }, []);

    const loadAllSubjects = async () => {
        const { data } = await supabase.from('subjects').select('id, name');
        if (data) setAllSubjects(data);
    };

    const loadActiveGroups = async () => {
        const { data } = await supabase
            .from('workshop_groups')
            .select('id, name, subject_id, schedule_config, start_date')
            .eq('status', 'active');
        if (data) setActiveGroups(data);
    };

    const loadRequests = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('course_requests')
            .select(`
                *,
                student:students(id, name, phone, email),
                subject:subjects(id, name, individual_price, group_price),
                term:terms(id, name),
                workshop_group:workshop_groups(id, name, schedule_config)
            `)
            .order('created_at', { ascending: false });

        if (data) setRequests(data as any);
        setLoading(false);
    };

    const loadTutors = async () => {
        const { data } = await supabase
            .from('tutors')
            .select('id, name, phone, email')
            .order('name');
        if (data) setTutors(data);
    };

    // --- Approve WORKSHOP Request ---
    const handleApproveWorkshop = async (req: Request) => {
        if (!confirm(`¿Confirmar cupo para ${req.student.name} en el taller ${req.workshop_group?.name}?`)) return;

        setProcessingId(req.id);
        try {
            const { error } = await supabase
                .from('course_requests')
                .update({
                    status: 'matched', // Approved/Active
                    payment_status: 'pending' // Assume pending payment upon approval
                })
                .eq('id', req.id);

            if (error) throw error;
            loadRequests();
            alert('¡Cupo confirmado exitosamente!');
        } catch (err: any) {
            alert('Error al confirmar: ' + err.message);
        } finally {
            setProcessingId(null);
        }
    };

    // --- Approve a SPECIFIC DATE request (existing behavior) ---
    const handleApproveSpecific = async (req: Request) => {
        if (!confirm(`¿Aprobar solicitud de ${req.student.name} por ${req.package_hours} horas?`)) return;

        setProcessingId(req.id);
        try {
            const unitPrice = req.preference === 'grupal' ? req.subject?.group_price : req.subject?.individual_price;
            const totalPrice = (unitPrice || 0) * req.package_hours;

            if (req.proposed_schedule && req.proposed_schedule.length > 0) {
                const classesToInsert = req.proposed_schedule.map(slot => ({
                    student_id: req.student.id,
                    subject_id: req.subject?.id || null,
                    scheduled_at: slot.start,
                    duration_minutes: slot.duration || 60,
                    status: 'confirmed',
                    type: req.preference,
                    request_id: req.id
                }));

                const { error: classError } = await supabase.from('classes').insert(classesToInsert);
                if (classError) throw classError;
            }

            const { error: reqError } = await supabase
                .from('course_requests')
                .update({
                    status: 'matched',
                    total_price: totalPrice,
                    payment_status: totalPrice > 0 ? 'pending' : 'paid'
                })
                .eq('id', req.id);

            if (reqError) throw reqError;
            loadRequests();
        } catch (err: any) {
            alert('Error al aprobar: ' + err.message);
        } finally {
            setProcessingId(null);
        }
    };

    // --- Schedule an AVAILABILITY request ---
    const handleScheduleAvailability = async (req: Request) => {
        if (!selectedTutorId || !selectedDate || !selectedTime) {
            alert('Selecciona un tutor, fecha y hora');
            return;
        }

        setProcessingId(req.id);
        try {
            const unitPrice = req.preference === 'grupal' ? req.subject?.group_price : req.subject?.individual_price;
            const totalPrice = (unitPrice || 0) * req.package_hours;

            const scheduledAt = new Date(`${selectedDate}T${selectedTime}`).toISOString();

            const { error: classError } = await supabase.from('classes').insert({
                student_id: req.student.id,
                tutor_id: selectedTutorId,
                subject_id: req.subject?.id || null,
                scheduled_at: scheduledAt,
                duration_minutes: 60,
                status: 'pending',
                type: req.preference,
                request_id: req.id
            });

            if (classError) throw classError;

            const { error: reqError } = await supabase
                .from('course_requests')
                .update({
                    status: 'matched',
                    total_price: totalPrice,
                    payment_status: totalPrice > 0 ? 'pending' : 'paid'
                })
                .eq('id', req.id);

            if (reqError) throw reqError;

            setScheduleReqId(null);
            setSelectedTutorId('');
            setSelectedDate('');
            setSelectedTime('');
            loadRequests();
            alert('¡Clase agendada exitosamente!');
        } catch (err: any) {
            alert('Error al agendar: ' + err.message);
        } finally {
            setProcessingId(null);
        }
    };

    // --- WhatsApp confirmation message ---
    const sendWhatsAppConfirmation = (req: Request, tutorName: string, date: string, time: string) => {
        let phone = (req.student.phone || '').replace(/\D/g, '');
        if (phone.length === 8) phone = '506' + phone;

        const dayFormatted = date ? new Date(date + 'T12:00').toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'long' }) : 'por definir';

        const message = `Hola ${req.student.name}, somos de Academia UPC.

Revisamos tu solicitud de tutoria para *${req.subject?.name || (req.subject_ids?.length ? `${req.subject_ids.length} materias` : 'N/A')}* (${req.package_hours} horas, ${req.preference}).

Te proponemos la siguiente clase:
- Fecha: ${dayFormatted}
- Hora: ${time || 'por definir'}
- Profesor: ${tutorName || 'por definir'}

Te queda bien este horario? Confirmanos por favor.`;

        const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    // --- WhatsApp general contact ---
    const sendWhatsAppGeneral = (req: Request) => {
        let phone = (req.student.phone || '').replace(/\D/g, '');
        if (phone.length === 8) phone = '506' + phone;

        const message = `Hola ${req.student.name}, somos de Academia UPC.

Recibimos tu solicitud de tutoria para *${req.subject?.name || (req.subject_ids?.length ? `${req.subject_ids.length} materias` : 'N/A')}* (${req.package_hours} horas).

Estamos revisando tu disponibilidad para asignarte un profesor. Te escribiremos pronto con una propuesta de horario.`;

        const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    const handleReject = async () => {
        if (!rejectId || !rejectReason.trim()) return;

        setProcessingId(rejectId);
        try {
            const { error } = await supabase
                .from('course_requests')
                .update({
                    status: 'rejected',
                    rejection_reason: rejectReason
                })
                .eq('id', rejectId);

            if (error) throw error;

            setRejectId(null);
            setRejectReason('');
            loadRequests();
        } catch (err: any) {
            alert('Error al rechazar: ' + err.message);
        } finally {
            setProcessingId(null);
        }
    };

    // --- SMART MATCHING HELPERS ---
    const parseTime = (timeStr: string) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    };

    const findMatchingGroups = (subjectId: string, studentAvailability: any[]) => {
        if (!studentAvailability || studentAvailability.length === 0) return [];

        return activeGroups.filter(group => {
            if (group.subject_id !== subjectId) return false;

            // Check overlap: day + time
            return group.schedule_config?.some((gSlot: any) => {
                const gStart = parseTime(gSlot.startTime);
                const gEnd = parseTime(gSlot.endTime || '00:00');
                const efficientGEnd = gEnd || (gStart + 60);

                return studentAvailability.some((sSlot: any) => {
                    if (sSlot.day !== gSlot.day) return false;

                    const sStart = parseTime(sSlot.startTime);
                    const sEnd = parseTime(sSlot.endTime);

                    // Group must start at or after student availability start, 
                    // and end at or before student availability end.
                    // Or more loosely: Group session overlaps with student availability?
                    // Let's stick to: Group must fit strictly within student availability for a "Smart Match".
                    return gStart >= sStart && efficientGEnd <= sEnd;
                });
            });
        });
    };

    const handleAssignToGroup = async (req: Request, subjectId: string, groupId: string) => {
        if (!groupId) return;
        if (!confirm('¿Asignar estudiante a este grupo? Se creará una solicitud aprobada.')) return;
        setProcessingId(req.id);

        try {
            const { error: newReqError } = await supabase.from('course_requests').insert({
                student_id: req.student.id,
                subject_id: subjectId,
                workshop_group_id: groupId,
                status: 'matched',
                preference: 'grupal',
                payment_status: 'pending',
                package_hours: 0,
                objectives: req.objectives
            });
            if (newReqError) throw newReqError;

            alert('Asignado al grupo exitosamente.');
            loadRequests();
        } catch (err: any) {
            alert('Error: ' + err.message);
        } finally {
            setProcessingId(null);
        }
    };

    // Categorize pending requests
    const pendingRequests = requests.filter(r => r.status === 'pending');
    const workshopRequests = pendingRequests.filter(r => r.workshop_group_id);
    const objectiveRequests = pendingRequests.filter(r => r.subject_ids && r.subject_ids.length > 0);
    const availabilityRequests = pendingRequests.filter(r => !r.workshop_group_id && !r.subject_ids?.length && isAvailabilityRequest(r));
    const specificRequests = pendingRequests.filter(r => !r.workshop_group_id && !r.subject_ids?.length && !isAvailabilityRequest(r));
    const historyRequests = requests.filter(r => r.status !== 'pending');

    const scheduleReq = scheduleReqId ? requests.find(r => r.id === scheduleReqId) : null;

    return (
        <div className="min-h-screen bg-[#0f1113] text-white">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-[#0f1113]/95 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
                    <button onClick={() => router.push('/admin')} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold">Solicitudes de Clases</h1>
                        <p className="text-sm text-gray-400">
                            {workshopRequests.length} talleres • {availabilityRequests.length} agendar • {specificRequests.length} aprobar
                        </p>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-8 space-y-12">

                {/* ============ SECTION 0.5: OBJECTIVE REQUESTS ============ */}
                <section>
                    <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
                        <Target className="text-blue-400" />
                        Solicitudes por Objetivos ({objectiveRequests.length})
                    </h2>
                    <p className="text-sm text-gray-500 mb-6">
                        Planes de estudio completos (ej: Bachillerato). Resuélvelos asignatura por asignatura.
                    </p>

                    <div className="grid gap-6">
                        {objectiveRequests.length === 0 ? (
                            <p className="text-gray-500 italic">No hay solicitudes de objetivos pendientes.</p>
                        ) : (
                            objectiveRequests.map(req => (
                                <div key={req.id} className="bg-[#1a1c1e] border border-blue-500/20 rounded-2xl p-6">
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <h3 className="font-bold text-lg flex items-center gap-2">
                                                {req.student.name}
                                                <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">
                                                    {(req.objectives as any)?.[0]?.bundle || 'Plan Personalizado'}
                                                </span>
                                            </h3>
                                            <p className="text-sm text-gray-400 mt-1">
                                                Interesado en <strong>{req.subject_ids?.length} materias</strong>
                                            </p>
                                        </div>
                                        <div className="bg-[#0f1113] p-3 rounded-xl border border-white/5">
                                            <p className="text-xs text-gray-500 mb-2">Disponibilidad:</p>
                                            <div className="flex flex-wrap gap-1">
                                                {req.proposed_schedule?.map((s, i) => (
                                                    <span key={i} className="text-xs bg-white/5 px-2 py-1 rounded">
                                                        {DAY_LABELS[s.day] || s.day} {s.startTime}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Breakdown by Subject */}
                                    <div className="space-y-3">
                                        {req.subject_ids?.map((subjectId) => {
                                            const matches = findMatchingGroups(subjectId, req.proposed_schedule);

                                            return (
                                                <div key={subjectId} className="bg-[#0f1113] p-4 rounded-xl border border-white/5 flex flex-col md:flex-row gap-4 items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                                                        <span className="font-medium text-sm text-gray-300">
                                                            {allSubjects.find(s => s.id === subjectId)?.name || 'Materia desconocida'}
                                                        </span>
                                                    </div>

                                                    <div className="flex-1 w-full md:w-auto">
                                                        {matches.length > 0 ? (
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs text-green-400 font-bold bg-green-500/10 px-2 py-1 rounded">
                                                                    {matches.length} GRUPOS COMPATIBLES
                                                                </span>
                                                                <select
                                                                    className="bg-white/5 border border-white/10 rounded-lg text-xs p-2 outline-none text-white w-full md:w-auto"
                                                                    onChange={(e) => {
                                                                        if (e.target.value) handleAssignToGroup(req, subjectId, e.target.value);
                                                                    }}
                                                                >
                                                                    <option value="">Seleccionar grupo...</option>
                                                                    {matches.map(g => (
                                                                        <option key={g.id} value={g.id}>
                                                                            {g.name} ({g.schedule_config?.[0]?.day} {g.schedule_config?.[0]?.startTime})
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs text-gray-500 italic">No hay grupos compatibles</span>
                                                                <Link size={14} className="text-gray-600" />
                                                            </div>
                                                        )}
                                                    </div>

                                                    <button className="text-xs text-blue-400 hover:text-blue-300 border border-blue-500/30 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                                                        <Split size={12} />
                                                        Crear Grupo
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="mt-4 flex justify-end gap-3 border-t border-white/5 pt-4">
                                        <button
                                            onClick={() => sendWhatsAppGeneral(req)}
                                            className="text-sm text-green-400 font-medium hover:underline flex items-center gap-2"
                                        >
                                            <MessageCircle size={16} /> Contactar por WhatsApp
                                        </button>
                                        <button
                                            onClick={() => setRejectId(req.id)}
                                            className="text-sm text-red-400 font-medium hover:underline"
                                        >
                                            Archivar Solicitud
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>

                {/* ============ SECTION 0: Workshop Requests (NEW) ============ */}
                <section>
                    <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
                        <Users className="text-purple-400" />
                        Inscripciones a Talleres ({workshopRequests.length})
                    </h2>
                    <p className="text-sm text-gray-500 mb-6">
                        Estudiantes solicitando unirse a grupos existentes. Solo necesitas confirmar el cupo.
                    </p>

                    <div className="grid gap-4">
                        {workshopRequests.length === 0 ? (
                            <p className="text-gray-500 italic">No hay inscripciones pendientes a talleres.</p>
                        ) : (
                            workshopRequests.map(req => (
                                <div key={req.id} className="bg-[#1a1c1e] border border-purple-500/20 rounded-2xl p-6 flex flex-col md:flex-row justify-between gap-6">
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-purple-500/20 p-2 rounded-lg">
                                                <User size={20} className="text-purple-400" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg">{req.student?.name}</h3>
                                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                                    <span className="text-purple-300 font-bold uppercase tracking-wider text-xs bg-purple-500/10 px-2 py-0.5 rounded">
                                                        Taller
                                                    </span>
                                                    <span className="font-medium text-white">{req.workshop_group?.name || 'Taller Desconocido'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-[#0f1113] p-4 rounded-xl border border-white/5">
                                            <p className="text-xs text-gray-500 mb-2 uppercase font-bold tracking-wider">Horario del Taller</p>
                                            <div className="flex flex-wrap gap-2">
                                                {req.workshop_group?.schedule_config && req.workshop_group.schedule_config.length > 0 ? (
                                                    req.workshop_group.schedule_config.map((slot: any, idx: number) => (
                                                        <div key={idx} className="flex items-center gap-2 text-sm bg-white/5 px-3 py-1 rounded-lg">
                                                            <Clock size={14} className="text-purple-400" />
                                                            <span className="text-white">{slot.day} {slot.startTime}</span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-sm italic text-gray-500">Horario no configurado</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col justify-center gap-3 min-w-[200px]">
                                        <button
                                            onClick={() => handleApproveWorkshop(req)}
                                            disabled={!!processingId}
                                            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-900/20"
                                        >
                                            {processingId === req.id ? (
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            ) : (
                                                <>
                                                    <CheckCircle2 size={18} /> Confirmar Cupo
                                                </>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => setRejectId(req.id)}
                                            disabled={!!processingId}
                                            className="bg-red-500/10 hover:bg-red-500/20 text-red-500 disabled:opacity-50 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all border border-red-500/20"
                                        >
                                            <X size={18} /> Rechazar
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>

                {/* ============ SECTION 1: Availability Requests ============ */}
                <section>
                    <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
                        <Calendar className="text-cyan-400" />
                        Solicitudes de Disponibilidad ({availabilityRequests.length})
                    </h2>

                    <p className="text-sm text-gray-500 mb-6">
                        Provienen del registro público. El estudiante indicó su disponibilidad — tú asignas tutor y fecha.
                    </p>

                    <div className="grid gap-6">
                        {availabilityRequests.length === 0 ? (
                            <p className="text-gray-500 italic">No hay solicitudes de disponibilidad pendientes.</p>
                        ) : (
                            availabilityRequests.map(req => (
                                <div key={req.id} className="bg-[#1a1c1e] border border-cyan-500/20 rounded-2xl p-6">
                                    {/* Header */}
                                    <div className="flex items-start justify-between mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-cyan-500/20 p-2 rounded-lg">
                                                <User size={20} className="text-cyan-400" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg">{req.student?.name}</h3>
                                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                                    <BookOpen size={14} />
                                                    {req.subject ? (
                                                        <span>{req.subject.name}</span>
                                                    ) : req.subject_ids && req.subject_ids.length > 0 ? (
                                                        <span className="text-cyan-300 font-bold">
                                                            {req.subject_ids.length} Materias ({req.objectives?.combo_name || 'Combo'})
                                                        </span>
                                                    ) : (
                                                        <span className="italic">Sin materia</span>
                                                    )}
                                                    {req.term && (
                                                        <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded ml-2 uppercase tracking-tighter">
                                                            {req.term.name}
                                                        </span>
                                                    )}
                                                    <span className="w-1 h-1 bg-gray-600 rounded-full" />
                                                    <span className="capitalize">{req.preference}</span>
                                                    <span className="w-1 h-1 bg-gray-600 rounded-full" />
                                                    <span className="text-cyan-400 font-medium">{req.package_hours}h</span>
                                                </div>
                                                {req.student?.phone && (
                                                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                                        <Phone size={10} /> {req.student.phone}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <span className="bg-cyan-500/10 text-cyan-400 text-xs px-3 py-1 rounded-full font-semibold">
                                            DISPONIBILIDAD
                                        </span>
                                    </div>

                                    {/* Availability Grid */}
                                    <div className="bg-[#0f1113] p-4 rounded-xl border border-white/5 mb-6">
                                        <p className="text-sm text-gray-400 mb-3">📅 Disponibilidad del estudiante:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {(req.proposed_schedule || []).map((slot: AvailabilitySlot, idx: number) => (
                                                <span
                                                    key={idx}
                                                    className="inline-flex items-center gap-1.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-sm px-3 py-1.5 rounded-lg"
                                                >
                                                    <Calendar size={12} />
                                                    {DAY_LABELS[slot.day] || slot.day} {slot.startTime}–{slot.endTime}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-wrap gap-3">
                                        <button
                                            onClick={() => {
                                                setScheduleReqId(req.id);
                                                setSelectedTutorId('');
                                                setSelectedDate('');
                                                setSelectedTime('');
                                            }}
                                            className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 px-5 py-2.5 rounded-xl font-bold transition-all"
                                        >
                                            <UserCheck size={16} />
                                            Asignar Tutor y Agendar
                                        </button>

                                        <button
                                            onClick={() => sendWhatsAppGeneral(req)}
                                            className="flex items-center gap-2 bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] border border-[#25D366]/30 px-4 py-2.5 rounded-xl font-medium transition-all"
                                        >
                                            <MessageCircle size={16} />
                                            WhatsApp
                                        </button>

                                        <button
                                            onClick={() => setRejectId(req.id)}
                                            className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-4 py-2.5 rounded-xl font-medium transition-all ml-auto"
                                        >
                                            <X size={16} />
                                            Rechazar
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>

                {/* ============ SECTION 2: Specific Date Requests ============ */}
                <section>
                    <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
                        <Clock className="text-yellow-400" />
                        Solicitudes con Fecha Específica ({specificRequests.length})
                    </h2>
                    <p className="text-sm text-gray-500 mb-6">
                        Provienen del portal de estudiantes. El estudiante pidió una fecha concreta.
                    </p>

                    <div className="grid gap-4">
                        {specificRequests.length === 0 ? (
                            <p className="text-gray-500 italic">No hay solicitudes con fecha específica.</p>
                        ) : (
                            specificRequests.map(req => (
                                <div key={req.id} className="bg-[#1a1c1e] border border-yellow-500/20 rounded-2xl p-6 flex flex-col md:flex-row justify-between gap-6">
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-yellow-500/20 p-2 rounded-lg">
                                                <User size={20} className="text-yellow-400" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg">{req.student?.name}</h3>
                                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                                    <BookOpen size={14} />
                                                    {req.subject ? (
                                                        <span>{req.subject.name}</span>
                                                    ) : req.subject_ids && req.subject_ids.length > 0 ? (
                                                        <span className="text-yellow-400 font-bold">
                                                            {req.subject_ids.length} Materias ({req.objectives?.combo_name || 'Combo'})
                                                        </span>
                                                    ) : (
                                                        <span className="italic">Sin materia</span>
                                                    )}
                                                    {req.term && (
                                                        <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded ml-2 uppercase tracking-tighter">
                                                            {req.term.name}
                                                        </span>
                                                    )}
                                                    <span className="w-1 h-1 bg-gray-600 rounded-full" />
                                                    <span className="capitalize">{req.preference}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-[#0f1113] p-4 rounded-xl border border-white/5">
                                            <p className="text-sm text-gray-400 mb-2">Horario Solicitado ({req.package_hours}h):</p>
                                            <div className="space-y-1">
                                                {req.proposed_schedule && req.proposed_schedule.length > 0 ? (
                                                    req.proposed_schedule.map((slot, idx) => (
                                                        <div key={idx} className="flex items-center gap-2 text-sm">
                                                            <Calendar size={14} className="text-yellow-500" />
                                                            {new Date(slot.start).toLocaleString('es-CR', {
                                                                weekday: 'long', day: 'numeric', month: 'short',
                                                                hour: '2-digit', minute: '2-digit'
                                                            })}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-sm italic text-gray-500">Sin horario específico</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col justify-center gap-3 min-w-[200px]">
                                        <button
                                            onClick={() => handleApproveSpecific(req)}
                                            disabled={!!processingId}
                                            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                                        >
                                            {processingId === req.id ? (
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            ) : (
                                                <>
                                                    <Check size={18} /> Aprobar
                                                </>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => setRejectId(req.id)}
                                            disabled={!!processingId}
                                            className="bg-red-500/10 hover:bg-red-500/20 text-red-500 disabled:opacity-50 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all border border-red-500/20"
                                        >
                                            <X size={18} /> Rechazar
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>

                {/* ============ SECTION 3: History ============ */}
                <section>
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <Clock className="text-gray-400" />
                        Historial Reciente
                    </h2>
                    <div className="space-y-4 opacity-75">
                        {historyRequests.map(req => (
                            <div key={req.id} className="bg-[#1a1c1e] border border-white/5 rounded-xl p-4 flex items-center justify-between">
                                <div>
                                    <p className="font-semibold">{req.student?.name} - {req.subject?.name}</p>
                                    <p className="text-sm text-gray-400">
                                        {req.package_hours}h • {new Date(req.created_at).toLocaleDateString('es-CR')}
                                    </p>
                                </div>
                                <div>
                                    {req.status === 'matched' ? (
                                        <div className="flex items-center gap-2 text-green-400 bg-green-500/10 px-3 py-1 rounded-full text-xs font-semibold uppercase">
                                            <CheckCircle2 size={14} /> Aprobada
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-red-400 bg-red-500/10 px-3 py-1 rounded-full text-xs font-semibold uppercase">
                                            <XCircle size={14} /> Rechazada
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ============ MODAL: Schedule Availability Request ============ */}
                {scheduleReq && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                        <div className="bg-[#1a1c1e] rounded-2xl border border-white/10 p-6 w-full max-w-lg shadow-2xl">
                            <h3 className="text-lg font-bold mb-1 text-white">Agendar Clase</h3>
                            <p className="text-sm text-gray-400 mb-6">
                                {scheduleReq.student.name} — {scheduleReq.subject?.name || (scheduleReq.subject_ids?.length ? `${scheduleReq.subject_ids.length} materias` : 'Combo')} ({scheduleReq.package_hours}h)
                            </p>

                            {/* Show student availability */}
                            <div className="bg-[#0f1113] p-3 rounded-xl border border-white/5 mb-5">
                                <p className="text-xs text-gray-500 mb-2">Disponibilidad del estudiante:</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {(scheduleReq.proposed_schedule || []).map((slot: AvailabilitySlot, idx: number) => (
                                        <span key={idx} className="text-xs bg-cyan-500/10 text-cyan-300 px-2 py-1 rounded-lg">
                                            {DAY_LABELS[slot.day] || slot.day} {slot.startTime}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                {/* Tutor Selector */}
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">👨‍🏫 Tutor</label>
                                    <select
                                        className="w-full bg-[#0f1113] border border-white/10 rounded-xl p-3"
                                        value={selectedTutorId}
                                        onChange={e => setSelectedTutorId(e.target.value)}
                                    >
                                        <option value="">Selecciona tutor...</option>
                                        {tutors.map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Date + Time */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-2">📅 Fecha</label>
                                        <input
                                            type="date"
                                            className="w-full bg-[#0f1113] border border-white/10 rounded-xl p-3"
                                            value={selectedDate}
                                            onChange={e => setSelectedDate(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-2">🕐 Hora</label>
                                        <input
                                            type="time"
                                            className="w-full bg-[#0f1113] border border-white/10 rounded-xl p-3"
                                            value={selectedTime}
                                            onChange={e => setSelectedTime(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* WhatsApp Confirm + Actions */}
                            <div className="flex flex-col gap-3 mt-6">
                                {/* WhatsApp confirmation */}
                                <button
                                    onClick={() => {
                                        const tutor = tutors.find(t => t.id === selectedTutorId);
                                        sendWhatsAppConfirmation(scheduleReq, tutor?.name || '', selectedDate, selectedTime);
                                    }}
                                    disabled={!selectedTutorId || !selectedDate || !selectedTime}
                                    className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#128C7E] disabled:opacity-30 text-white py-3 rounded-xl font-bold transition-colors"
                                >
                                    <MessageCircle size={18} />
                                    Consultar al Estudiante por WhatsApp
                                </button>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setScheduleReqId(null)}
                                        className="flex-1 px-4 py-2.5 hover:bg-white/10 rounded-xl transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={() => handleScheduleAvailability(scheduleReq)}
                                        disabled={!selectedTutorId || !selectedDate || !selectedTime || !!processingId}
                                        className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-6 py-2.5 rounded-xl font-bold transition-colors"
                                    >
                                        {processingId ? 'Agendando...' : '✅ Agendar Clase'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ============ MODAL: Reject ============ */}
                {rejectId && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                        <div className="bg-[#1a1c1e] rounded-2xl border border-white/10 p-6 w-full max-w-md">
                            <h3 className="text-lg font-bold mb-4 text-white">Motivo del Rechazo</h3>
                            <textarea
                                autoFocus
                                className="w-full bg-[#0f1113] border border-white/10 rounded-xl p-4 mb-4 h-32 resize-none focus:border-red-500 outline-none text-white"
                                placeholder="Explica por qué rechazas la solicitud..."
                                value={rejectReason}
                                onChange={e => setRejectReason(e.target.value)}
                            />
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => { setRejectId(null); setRejectReason(''); }}
                                    className="px-4 py-2 hover:bg-white/10 rounded-xl transition-colors text-white"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleReject}
                                    disabled={!rejectReason.trim() || !!processingId}
                                    className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded-xl font-bold text-white transition-colors"
                                >
                                    {processingId ? 'Procesando...' : 'Confirmar Rechazo'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
}
