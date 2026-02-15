'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, User, Phone, Mail, DollarSign, BookOpen, Send, CheckCircle, MessageCircle } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { Subject } from '../../types/tutoring';
import AvailabilityCalendar from '../../components/AvailabilityCalendar';

export default function RegistroTutorPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [step, setStep] = useState(1); // 1: datos, 2: materias, 3: disponibilidad
    const [successMessage, setSuccessMessage] = useState('');
    const [existingTutor, setExistingTutor] = useState<any>(null);

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        subjectIds: [] as string[],
        hourlyRate: 0,
        availability: [] as any[]
    });

    const whatsappNumber = "+50661943970";

    useEffect(() => {
        loadSubjects();
    }, []);

    const loadSubjects = async () => {
        const { data, error } = await supabase
            .from('subjects')
            .select('*')
            .order('name');

        if (data && !error) {
            setSubjects(data.map(s => ({
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
    };

    const checkExistingTutor = async () => {
        if (!formData.phone) return;

        const { data, error } = await supabase
            .from('tutors')
            .select('*')
            .eq('phone', formData.phone)
            .single();

        if (data && !error) {
            setExistingTutor(data);
        }
    };

    const toggleSubject = (subjectId: string) => {
        setFormData(prev => ({
            ...prev,
            subjectIds: prev.subjectIds.includes(subjectId)
                ? prev.subjectIds.filter(id => id !== subjectId)
                : [...prev.subjectIds, subjectId]
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (existingTutor) {
                // Actualizar tutor existente
                const { error } = await supabase
                    .from('tutors')
                    .update({
                        name: formData.name,
                        email: formData.email || null,
                        subject_ids: formData.subjectIds,
                        availability: formData.availability,
                        hourly_rate: formData.hourlyRate,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existingTutor.id);

                if (error) throw error;
            } else {
                // Crear nuevo tutor
                const { error } = await supabase.from('tutors').insert({
                    name: formData.name,
                    phone: formData.phone,
                    email: formData.email || null,
                    subject_ids: formData.subjectIds,
                    availability: formData.availability,
                    hourly_rate: formData.hourlyRate
                });

                if (error) throw error;
            }

            setSuccessMessage('¡Registro enviado correctamente! El administrador revisará tu perfil y te contactará pronto.');

        } catch (err: any) {
            console.error('Error:', err);
            alert('Error al enviar el registro. Por favor intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    // Pantalla de éxito
    if (successMessage) {
        return (
            <div className="min-h-screen bg-[#0f1113] text-white flex items-center justify-center p-6">
                <div className="max-w-md w-full text-center">
                    <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="text-purple-400" size={40} />
                    </div>
                    <h1 className="text-2xl font-bold mb-4">¡Registro Enviado!</h1>
                    <p className="text-gray-400 mb-8">{successMessage}</p>
                    <div className="space-y-3">
                        <button
                            onClick={() => router.push('/')}
                            className="w-full bg-purple-600 hover:bg-purple-700 py-3 rounded-xl font-semibold transition-colors"
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
                        <h1 className="text-xl font-bold">Registrarse como Tutor</h1>
                        <p className="text-sm text-gray-400">Paso {step} de 3</p>
                    </div>
                    {/* Progress bar */}
                    <div className="flex gap-1">
                        {[1, 2, 3].map(s => (
                            <div
                                key={s}
                                className={`w-8 h-1.5 rounded-full transition-colors ${s <= step ? 'bg-purple-500' : 'bg-white/10'
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
                                    <div className="p-2 bg-purple-500/20 rounded-xl">
                                        <User className="text-purple-400" size={20} />
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
                                            onBlur={checkExistingTutor}
                                            className="w-full bg-[#0f1113] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors"
                                            placeholder="+506 8888-8888"
                                        />
                                    </div>

                                    {existingTutor && (
                                        <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                                            <p className="text-purple-400 text-sm">
                                                ✓ Ya estás registrado como <strong>{existingTutor.name}</strong>.
                                                Puedes actualizar tu información.
                                            </p>
                                        </div>
                                    )}

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
                                            className="w-full bg-[#0f1113] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors"
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
                                            className="w-full bg-[#0f1113] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors"
                                            placeholder="correo@ejemplo.com"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            <DollarSign size={14} className="inline mr-2" />
                                            Tarifa por Hora (USD)
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={formData.hourlyRate}
                                            onChange={(e) => setFormData(prev => ({ ...prev, hourlyRate: parseFloat(e.target.value) || 0 }))}
                                            className="w-full bg-[#0f1113] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setStep(2)}
                                disabled={!formData.name || !formData.phone}
                                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed py-4 rounded-xl font-semibold transition-colors"
                            >
                                Continuar
                            </button>
                        </section>
                    )}

                    {/* Step 2: Selección de materias */}
                    {step === 2 && (
                        <section className="space-y-6">
                            <div className="bg-[#1a1c1e] rounded-2xl border border-white/5 p-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-orange-500/20 rounded-xl">
                                        <BookOpen className="text-orange-400" size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold">Materias que Impartes</h2>
                                        <p className="text-sm text-gray-400">Selecciona las materias en las que puedes dar tutoría</p>
                                    </div>
                                </div>

                                {subjects.length === 0 ? (
                                    <div className="text-center py-8 text-gray-400">
                                        <BookOpen size={32} className="mx-auto mb-2 opacity-50" />
                                        <p>No hay materias disponibles</p>
                                    </div>
                                ) : (
                                    <div className="grid gap-3 md:grid-cols-2">
                                        {subjects.map(subject => (
                                            <button
                                                key={subject.id}
                                                type="button"
                                                onClick={() => toggleSubject(subject.id)}
                                                className={`p-4 rounded-xl border-2 transition-all text-left ${formData.subjectIds.includes(subject.id)
                                                    ? 'border-orange-500 bg-orange-500/10'
                                                    : 'border-white/10 hover:border-white/20'
                                                    }`}
                                            >
                                                <h3 className={`font-semibold ${formData.subjectIds.includes(subject.id) ? 'text-orange-400' : ''
                                                    }`}>{subject.name}</h3>
                                                <p className="text-sm text-gray-400 mt-1">
                                                    Individual: ${subject.individualPrice} / Grupal: ${subject.groupPrice}
                                                </p>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {formData.subjectIds.length > 0 && (
                                    <p className="text-sm text-orange-400 mt-4">
                                        ✓ {formData.subjectIds.length} materia(s) seleccionada(s)
                                    </p>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={() => setStep(3)}
                                disabled={formData.subjectIds.length === 0}
                                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed py-4 rounded-xl font-semibold transition-colors"
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
                                        <User className="text-emerald-400" size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold">Tu Disponibilidad</h2>
                                        <p className="text-sm text-gray-400">Selecciona los horarios en que puedes impartir tutoría</p>
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
                                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed py-4 rounded-xl font-semibold transition-colors"
                            >
                                <Send size={18} />
                                {loading ? 'Enviando...' : existingTutor ? 'Actualizar Perfil' : 'Enviar Registro'}
                            </button>
                        </section>
                    )}
                </form>
            </main>
        </div>
    );
}
