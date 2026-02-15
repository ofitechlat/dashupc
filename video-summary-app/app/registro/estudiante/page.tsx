'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, User, Phone, Mail, Users, UserCheck, BookOpen, Send, MessageCircle, AlertTriangle, CheckCircle, Clock, GraduationCap, AlertCircle } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { Subject } from '../../types/tutoring';
import AvailabilityCalendar from '../../components/AvailabilityCalendar';

interface CourseRequest {
    subjectId: string;
    availability: any[];
    preference: 'individual' | 'grupal';
    packageHours: number;
}

export default function RegistroEstudiantePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [workshopGroups, setWorkshopGroups] = useState<any[]>([]);
    const [step, setStep] = useState(1); // 1: datos, 2: cursos, 3: disponibilidad
    const [existingRequest, setExistingRequest] = useState<any>(null);
    const [successMessage, setSuccessMessage] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        selectedLevel: '', // Sétimo, Octavo, Noveno, etc.
        selectedSubjectId: '',
        selectedWorkshopGroupId: '', // Nuevo: Vincular a un grupo específico
        preference: 'individual' as 'individual' | 'grupal',
        availability: [] as any[],
        packageHours: 4
    });

    const whatsappNumber = "+50661943970";
    const academicLevels = ['Sétimo', 'Octavo', 'Noveno', 'Bachillerato', 'Universidad'];

    useEffect(() => {
        loadData();

        // Handle direct workshop link
        const params = new URLSearchParams(window.location.search);
        if (params.get('type') === 'workshop') {
            setFormData(prev => ({ ...prev, preference: 'grupal' }));
        }
    }, []);

    const loadData = async () => {
        const [subjectsRes, groupsRes] = await Promise.all([
            supabase.from('subjects').select('*').order('name'),
            supabase.from('workshop_groups').select('*, subjects(name)').eq('status', 'active')
        ]);

        if (subjectsRes.data) {
            setSubjects(subjectsRes.data.map(s => ({
                id: s.id,
                name: s.name,
                level: s.level || 'Sin Nivel',
                syllabus: s.syllabus || [],
                moodleLink: s.moodle_link,
                individualPrice: s.individual_price,
                groupPrice: s.group_price,
                createdAt: s.created_at
            })));
        }

        if (groupsRes.data) {
            setWorkshopGroups(groupsRes.data);
        }
    };

    const checkExistingRequest = async () => {
        if (!formData.phone || !formData.selectedSubjectId) return false;

        // Verificar si ya existe una solicitud para este teléfono y curso
        const { data, error } = await supabase
            .from('students')
            .select('*')
            .eq('phone', formData.phone)
            .maybeSingle();

        if (data && !error) {
            // Verificar si ya tiene este curso seleccionado
            const subjectIds = data.subject_ids || [];
            if (subjectIds.includes(formData.selectedSubjectId)) {
                setExistingRequest(data);
                return true;
            }
        }
        return false;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Verificar si ya existe solicitud para este curso
            const hasExisting = await checkExistingRequest();
            if (hasExisting) {
                setLoading(false);
                return;
            }

            let studentId: string;

            // Verificar si el estudiante ya existe
            const { data: existingStudent } = await supabase
                .from('students')
                .select('*')
                .eq('phone', formData.phone)
                .maybeSingle();

            if (existingStudent) {
                studentId = existingStudent.id;
                // Actualizar estudiante existente agregando nuevo curso
                const newSubjectIds = [...(existingStudent.subject_ids || []), formData.selectedSubjectId];
                const newAvailability = [...(existingStudent.availability || []), ...formData.availability];

                const { error } = await supabase
                    .from('students')
                    .update({
                        subject_ids: newSubjectIds,
                        availability: newAvailability,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existingStudent.id);

                if (error) throw error;
            } else {
                // Crear nuevo estudiante
                const { data: newStudent, error } = await supabase.from('students').insert({
                    name: formData.name,
                    phone: formData.phone,
                    email: formData.email || null,
                    subject_ids: [formData.selectedSubjectId],
                    preference: formData.preference,
                    availability: formData.availability
                }).select('id').single();

                if (error) throw error;
                studentId = newStudent.id;
            }

            // Determinar el precio total si es un taller
            let totalPrice = 0;
            if (formData.selectedWorkshopGroupId) {
                const group = workshopGroups.find(g => g.id === formData.selectedWorkshopGroupId);
                if (group) totalPrice = group.price || 0;
            } else {
                // Si no es taller, podrías asignar el precio de la materia (Package * Price)
                const subject = subjects.find(s => s.id === formData.selectedSubjectId);
                if (subject) {
                    const pricePerHour = formData.preference === 'individual' ? (subject.individualPrice || 0) : (subject.groupPrice || 0);
                    totalPrice = formData.packageHours * pricePerHour;
                }
            }

            // Crear course_request para que aparezca en /admin/requests
            const { error: reqError } = await supabase.from('course_requests').insert({
                student_id: studentId,
                subject_id: formData.selectedSubjectId,
                workshop_group_id: formData.selectedWorkshopGroupId || null,
                package_hours: formData.packageHours,
                preference: formData.preference,
                proposed_schedule: formData.availability, // AvailabilitySlot[] format
                status: 'pending',
                total_price: totalPrice
            });

            if (reqError) throw reqError;

            setSuccessMessage('¡Solicitud enviada correctamente! Nos pondremos en contacto contigo pronto.');

        } catch (err: any) {
            console.error('Error:', err);
            alert('Error al enviar la solicitud. Por favor intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    const getWhatsAppLink = () => {
        const message = encodeURIComponent(
            `Hola, ya tengo una solicitud de tutoría para ${subjects.find(s => s.id === formData.selectedSubjectId)?.name || 'un curso'} y necesito modificarla. Mi teléfono es ${formData.phone}.`
        );
        return `https://wa.me/${whatsappNumber}?text=${message}`;
    };

    // Pantalla de éxito
    if (successMessage) {
        return (
            <div className="min-h-screen bg-[#0f1113] text-white flex items-center justify-center p-6">
                <div className="max-w-md w-full text-center">
                    <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="text-green-400" size={40} />
                    </div>
                    <h1 className="text-2xl font-bold mb-4">¡Solicitud Enviada!</h1>
                    <p className="text-gray-400 mb-8">{successMessage}</p>
                    <div className="space-y-3">
                        <button
                            onClick={() => router.push('/')}
                            className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-xl font-semibold transition-colors"
                        >
                            Volver al Inicio
                        </button>
                        <a
                            href={`https://wa.me/${whatsappNumber}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 py-3 rounded-xl font-semibold transition-colors"
                        >
                            <MessageCircle size={18} />
                            Contactar por WhatsApp
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    // Pantalla de solicitud existente
    if (existingRequest) {
        return (
            <div className="min-h-screen bg-[#0f1113] text-white flex items-center justify-center p-6">
                <div className="max-w-md w-full text-center">
                    <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle className="text-amber-400" size={40} />
                    </div>
                    <h1 className="text-2xl font-bold mb-4">Solicitud Existente</h1>
                    <p className="text-gray-400 mb-6">
                        Ya tienes una solicitud registrada para este curso.
                        Si deseas modificarla, por favor contacta al administrador.
                    </p>
                    <div className="bg-[#1a1c1e] rounded-2xl p-4 mb-8 border border-white/5">
                        <p className="text-sm text-gray-400 mb-1">Nombre registrado:</p>
                        <p className="font-semibold">{existingRequest.name}</p>
                    </div>
                    <div className="space-y-3">
                        <a
                            href={getWhatsAppLink()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 py-3 rounded-xl font-semibold transition-colors"
                        >
                            <MessageCircle size={18} />
                            Contactar Administrador
                        </a>
                        <button
                            onClick={() => {
                                setExistingRequest(null);
                                setFormData(prev => ({ ...prev, selectedSubjectId: '' }));
                                setStep(2);
                            }}
                            className="w-full bg-white/10 hover:bg-white/20 py-3 rounded-xl font-semibold transition-colors"
                        >
                            Elegir Otro Curso
                        </button>
                        <button
                            onClick={() => router.push('/')}
                            className="w-full text-gray-400 hover:text-white py-3 transition-colors"
                        >
                            Volver al Inicio
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0f1113] text-white">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-[#0f1113]/95 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
                    <button
                        onClick={() => step > 1 ? setStep(step - 1) : router.push('/')}
                        className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-xl font-bold">Solicitar Tutoría</h1>
                        <p className="text-sm text-gray-400">Paso {step} de 3</p>
                    </div>
                    {/* Progress bar */}
                    <div className="flex gap-1">
                        {[1, 2, 3].map(s => (
                            <div
                                key={s}
                                className={`w-8 h-1.5 rounded-full transition-colors ${s <= step ? 'bg-blue-500' : 'bg-white/10'
                                    }`}
                            />
                        ))}
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-8">
                <form onSubmit={handleSubmit}>
                    {/* Step 1: Datos personales */}
                    {step === 1 && (
                        <section className="space-y-6">
                            <div className="bg-[#1a1c1e] rounded-2xl border border-white/5 p-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-blue-500/20 rounded-xl">
                                        <User className="text-blue-400" size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold">Información Personal</h2>
                                        <p className="text-sm text-gray-400">Ingresa tus datos de contacto</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            <Phone size={14} className="inline mr-2" />
                                            Número de WhatsApp *
                                        </label>
                                        <input
                                            type="tel"
                                            required
                                            value={formData.phone}
                                            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                            className="w-full bg-[#0f1113] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                                            placeholder="+506 8888-8888"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            <User size={14} className="inline mr-2" />
                                            Nombre Completo *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.name}
                                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                            className="w-full bg-[#0f1113] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                                            placeholder="Tu nombre"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            <Mail size={14} className="inline mr-2" />
                                            Correo Electrónico
                                        </label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                            className="w-full bg-[#0f1113] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                                            placeholder="correo@ejemplo.com"
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setStep(2)}
                                disabled={!formData.name || !formData.phone}
                                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed py-4 rounded-xl font-semibold transition-colors"
                            >
                                Continuar
                            </button>
                        </section>
                    )}

                    {/* Step 2: Selección de curso */}
                    {step === 2 && (
                        <section className="space-y-6">
                            {/* Nivel Académico */}
                            <div className="bg-[#1a1c1e] rounded-2xl border border-white/5 p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-500/20 rounded-xl">
                                            <GraduationCap className="text-blue-400" size={20} />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-semibold">Nivel Académico</h2>
                                            <p className="text-sm text-gray-400">¿En qué nivel te encuentras?</p>
                                        </div>
                                    </div>
                                    {formData.selectedLevel && (
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, selectedLevel: '', selectedSubjectId: '' }))}
                                            className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                                        >
                                            Cambiar Nivel
                                        </button>
                                    )}
                                </div>

                                {!formData.selectedLevel ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {academicLevels.map(lvl => (
                                            <button
                                                key={lvl}
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, selectedLevel: lvl }))}
                                                className="p-4 rounded-xl border border-white/10 hover:border-blue-500 hover:bg-blue-500/5 transition-all text-center"
                                            >
                                                <p className="font-semibold">{lvl}</p>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="bg-[#0f1113] p-4 rounded-xl border border-white/5 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <CheckCircle className="text-green-400" size={18} />
                                            <span className="font-semibold text-blue-400">{formData.selectedLevel}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Selección de Materia */}
                            {formData.selectedLevel && (
                                <div className="bg-[#1a1c1e] rounded-2xl border border-white/5 p-6">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-2 bg-orange-500/20 rounded-xl">
                                            <BookOpen className="text-orange-400" size={20} />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-semibold">Selecciona el Curso</h2>
                                            <p className="text-sm text-gray-400">Materias disponibles para <span className="text-blue-400">{formData.selectedLevel}</span></p>
                                        </div>
                                    </div>

                                    {subjects.filter(s => s.level === formData.selectedLevel).length === 0 ? (
                                        <div className="text-center py-8 text-gray-400">
                                            <BookOpen size={32} className="mx-auto mb-2 opacity-50" />
                                            <p>No hay cursos disponibles para este nivel</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            <div className="grid gap-3">
                                                {subjects
                                                    .filter(s => s.level === formData.selectedLevel)
                                                    .map(subject => (
                                                        <button
                                                            key={subject.id}
                                                            type="button"
                                                            onClick={() => setFormData(prev => ({ ...prev, selectedSubjectId: subject.id, selectedWorkshopGroupId: '' }))}
                                                            className={`p-4 rounded-xl border-2 transition-all text-left ${formData.selectedSubjectId === subject.id
                                                                ? 'border-orange-500 bg-orange-500/10'
                                                                : 'border-white/10 hover:border-white/20'
                                                                }`}
                                                        >
                                                            <div className="flex justify-between items-center">
                                                                <h3 className={`font-semibold ${formData.selectedSubjectId === subject.id ? 'text-orange-400' : ''
                                                                    }`}>{subject.name}</h3>
                                                                {formData.selectedSubjectId === subject.id && (
                                                                    <CheckCircle size={16} className="text-orange-400" />
                                                                )}
                                                            </div>
                                                            <p className="text-sm text-gray-400 mt-1">
                                                                Preferencial: ${subject.groupPrice} / Individual: ${subject.individualPrice}
                                                            </p>
                                                        </button>
                                                    ))}
                                            </div>

                                            {/* Sub-paso: Grupos o Individual */}
                                            {formData.selectedSubjectId && (
                                                <div className="pt-6 border-t border-white/5 space-y-4 animate-in fade-in slide-in-from-top-4">
                                                    <h3 className="text-sm font-semibold text-gray-300">¿Cómo prefieres llevar este curso?</h3>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <button
                                                            type="button"
                                                            onClick={() => setFormData(prev => ({ ...prev, preference: 'individual', selectedWorkshopGroupId: '' }))}
                                                            className={`p-4 rounded-xl border-2 transition-all text-center ${formData.preference === 'individual'
                                                                ? 'border-blue-500 bg-blue-500/10'
                                                                : 'border-white/10 hover:border-white/20'
                                                                }`}
                                                        >
                                                            <User size={20} className="mx-auto mb-2 text-blue-400" />
                                                            <p className="text-sm font-bold">Individual</p>
                                                            <p className="text-[10px] text-gray-500 mt-1">Horario flexible personalizado</p>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setFormData(prev => ({ ...prev, preference: 'grupal' }))}
                                                            className={`p-4 rounded-xl border-2 transition-all text-center ${formData.preference === 'grupal'
                                                                ? 'border-green-500 bg-green-500/10'
                                                                : 'border-white/10 hover:border-white/20'
                                                                }`}
                                                        >
                                                            <Users size={20} className="mx-auto mb-2 text-green-400" />
                                                            <p className="text-sm font-bold">Taller Grupal</p>
                                                            <p className="text-[10px] text-gray-500 mt-1">Comparte con otros estudiantes</p>
                                                        </button>
                                                    </div>

                                                    {/* Mostrar Grupos Disponibles si la preferencia es Grupal */}
                                                    {formData.preference === 'grupal' && (
                                                        <div className="mt-4 space-y-3">
                                                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Talleres Activos</p>
                                                            {workshopGroups.filter(g => g.subject_id === formData.selectedSubjectId).length === 0 ? (
                                                                <div className="bg-[#0f1113] p-4 rounded-xl border border-white/5 flex items-center gap-3">
                                                                    <AlertCircle className="text-amber-400 flex-shrink-0" size={18} />
                                                                    <p className="text-xs text-gray-400">
                                                                        Actualmente no hay talleres abiertos para esta materia. Te avisaremos cuando se abra un nuevo grupo.
                                                                    </p>
                                                                </div>
                                                            ) : (
                                                                <div className="grid gap-2">
                                                                    {workshopGroups
                                                                        .filter(g => g.subject_id === formData.selectedSubjectId)
                                                                        .map(group => (
                                                                            <button
                                                                                key={group.id}
                                                                                type="button"
                                                                                onClick={() => setFormData(prev => ({ ...prev, selectedWorkshopGroupId: group.id }))}
                                                                                className={`w-full p-4 rounded-xl border-2 transition-all text-left flex items-center justify-between ${formData.selectedWorkshopGroupId === group.id
                                                                                    ? 'border-green-500 bg-green-500/10'
                                                                                    : 'border-white/10 hover:border-white/20 bg-black/20'
                                                                                    }`}
                                                                            >
                                                                                <div>
                                                                                    <p className="font-bold text-sm">{group.name}</p>
                                                                                    <div className="flex items-center gap-2 mt-1">
                                                                                        <Clock size={12} className="text-gray-500" />
                                                                                        <p className="text-[10px] text-gray-500">
                                                                                            {group.schedule_config?.map((s: any) => `${s.day} ${s.startTime}`).join(', ')}
                                                                                        </p>
                                                                                    </div>
                                                                                </div>
                                                                                <span className="text-[10px] font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded uppercase">
                                                                                    Abrir Cupo
                                                                                </span>
                                                                            </button>
                                                                        ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Paquete de horas */}
                            <div className="bg-[#1a1c1e] rounded-2xl border border-white/5 p-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-cyan-500/20 rounded-xl">
                                        <Clock size={20} className="text-cyan-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold">¿Cuántas horas necesitas?</h2>
                                        <p className="text-sm text-gray-400">Selecciona tu paquete de horas de tutoría</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {[1, 4, 8, 10].map(h => (
                                        <button
                                            key={h}
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, packageHours: h }))}
                                            className={`p-4 rounded-xl border-2 transition-all text-center ${formData.packageHours === h
                                                ? 'border-cyan-500 bg-cyan-500/10'
                                                : 'border-white/10 hover:border-white/20'
                                                }`}
                                        >
                                            <p className={`text-2xl font-bold ${formData.packageHours === h ? 'text-cyan-400' : 'text-white'}`}>{h}</p>
                                            <p className="text-sm text-gray-400 mt-1">{h === 1 ? 'hora' : 'horas'}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Preferencia */}
                            <div className="bg-[#1a1c1e] rounded-2xl border border-white/5 p-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-purple-500/20 rounded-xl">
                                        <Users className="text-purple-400" size={20} />
                                    </div>
                                    <h2 className="text-lg font-semibold">Preferencia de Clase</h2>
                                </div>

                                <div className="grid gap-3 md:grid-cols-2">
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, preference: 'individual' }))}
                                        className={`p-4 rounded-xl border-2 transition-all text-left ${formData.preference === 'individual'
                                            ? 'border-blue-500 bg-blue-500/10'
                                            : 'border-white/10 hover:border-white/20'
                                            }`}
                                    >
                                        <UserCheck size={24} className={formData.preference === 'individual' ? 'text-blue-400' : 'text-gray-400'} />
                                        <h3 className="font-semibold mt-2">Individual</h3>
                                        <p className="text-sm text-gray-400">Atención personalizada</p>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, preference: 'grupal' }))}
                                        className={`p-4 rounded-xl border-2 transition-all text-left ${formData.preference === 'grupal'
                                            ? 'border-green-500 bg-green-500/10'
                                            : 'border-white/10 hover:border-white/20'
                                            }`}
                                    >
                                        <Users size={24} className={formData.preference === 'grupal' ? 'text-green-400' : 'text-gray-400'} />
                                        <h3 className="font-semibold mt-2">Grupal</h3>
                                        <p className="text-sm text-gray-400">Precio reducido</p>
                                    </button>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={async () => {
                                    const hasExisting = await checkExistingRequest();
                                    if (!hasExisting) {
                                        setStep(3);
                                    }
                                }}
                                disabled={!formData.selectedSubjectId}
                                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed py-4 rounded-xl font-semibold transition-colors"
                            >
                                Continuar
                            </button>
                        </section>
                    )}

                    {/* Step 3: Disponibilidad */}
                    {step === 3 && (
                        <section className="space-y-6">
                            <div className="bg-[#1a1c1e] rounded-2xl border border-white/5 p-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-emerald-500/20 rounded-xl">
                                        <Users className="text-emerald-400" size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold">Tu Disponibilidad</h2>
                                        <p className="text-sm text-gray-400">
                                            Selecciona los horarios en que puedes recibir tutoría de{' '}
                                            <span className="text-orange-400">
                                                {subjects.find(s => s.id === formData.selectedSubjectId)?.name}
                                            </span>
                                        </p>
                                    </div>
                                </div>

                                <AvailabilityCalendar
                                    value={formData.availability}
                                    onChange={(availability) => setFormData(prev => ({ ...prev, availability }))}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading || formData.availability.length === 0}
                                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed py-4 rounded-xl font-semibold transition-colors"
                            >
                                <Send size={18} />
                                {loading ? 'Enviando...' : 'Enviar Solicitud'}
                            </button>
                        </section>
                    )}
                </form>
            </main>
        </div>
    );
}
