'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, BookOpen, DollarSign, Save, Link as LinkIcon, Plus, Trash2, GripVertical, GraduationCap } from 'lucide-react';
import { supabase } from '../../../utils/supabase';
import { SubjectFormData, SyllabusTopic } from '../../../types/tutoring';

export default function EditSubjectPage() {
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState<SubjectFormData>({
        name: '',
        level: '',
        moodleLink: '',
        individualPrice: 0,
        groupPrice: 0,
        syllabus: []
    });

    useEffect(() => {
        if (id) {
            loadSubject();
        }
    }, [id]);

    const loadSubject = async () => {
        try {
            const { data, error } = await supabase
                .from('subjects')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;

            if (data) {
                setFormData({
                    name: data.name,
                    level: data.level || '',
                    moodleLink: data.moodle_link || '',
                    individualPrice: data.individual_price,
                    groupPrice: data.group_price,
                    syllabus: data.syllabus || []
                });
            }
        } catch (err) {
            console.error('Error loading subject:', err);
            alert('Error al cargar la materia');
            router.push('/subjects');
        } finally {
            setLoading(false);
        }
    };

    const addTopic = () => {
        const newTopic: SyllabusTopic = {
            id: crypto.randomUUID(),
            title: '',
            description: '',
            order: formData.syllabus.length
        };
        setFormData(prev => ({
            ...prev,
            syllabus: [...prev.syllabus, newTopic]
        }));
    };

    const updateTopic = (topicId: string, field: keyof SyllabusTopic, value: string | number) => {
        setFormData(prev => ({
            ...prev,
            syllabus: prev.syllabus.map(t =>
                t.id === topicId ? { ...t, [field]: value } : t
            )
        }));
    };

    const removeTopic = (topicId: string) => {
        setFormData(prev => ({
            ...prev,
            syllabus: prev.syllabus.filter(t => t.id !== topicId)
        }));
    };

    const handleDelete = async () => {
        if (!confirm('¿Eliminar esta materia? Esta acción no se puede deshacer.')) return;

        try {
            const { error } = await supabase.from('subjects').delete().eq('id', id);

            if (error) {
                if (error.code === '23503') {
                    alert('No se puede eliminar esta materia porque ya tiene solicitudes de curso o clases asociadas. Primero debes eliminar o desvincular esos registros.');
                } else {
                    throw error;
                }
                return;
            }

            router.push('/subjects');
        } catch (err: any) {
            console.error('Error deleting subject:', err);
            alert(`Error al eliminar: ${err.message}`);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.level) {
            alert('Por favor selecciona un nivel/categoría');
            return;
        }

        setSaving(true);

        try {
            const { error } = await supabase
                .from('subjects')
                .update({
                    name: formData.name,
                    level: formData.level,
                    moodle_link: formData.moodleLink || null,
                    individual_price: formData.individualPrice,
                    group_price: formData.groupPrice,
                    syllabus: formData.syllabus
                })
                .eq('id', id);

            if (error) throw error;

            console.log('Subject updated');
            router.push('/subjects');
        } catch (err: any) {
            console.error('Error updating subject:', err);
            alert(`Error al actualizar: ${err.message}`);
        } finally {
            setSaving(false);
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
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold">Editar Materia</h1>
                        <p className="text-sm text-gray-400">{formData.name}</p>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-8">
                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Basic Info */}
                    <section className="bg-[#1a1c1e] rounded-2xl border border-white/5 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-blue-500/20 rounded-xl">
                                <BookOpen className="text-blue-400" size={20} />
                            </div>
                            <h2 className="text-lg font-semibold">Información Básica</h2>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-300 mb-2">Nombre de la Materia *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full bg-[#0f1113] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    <GraduationCap size={14} className="inline mr-2" />
                                    Nivel Académico *
                                </label>
                                <select
                                    required
                                    value={formData.level}
                                    onChange={(e) => setFormData(prev => ({ ...prev, level: e.target.value }))}
                                    className="w-full bg-[#0f1113] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                                >
                                    <option value="">Selecciona un nivel</option>
                                    <option value="Sétimo">Sétimo</option>
                                    <option value="Octavo">Octavo</option>
                                    <option value="Noveno">Noveno</option>
                                    <option value="Bachillerato">Bachillerato</option>
                                    <option value="Universidad">Universidad</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    <LinkIcon size={14} className="inline mr-2" />
                                    Link de Moodle
                                </label>
                                <input
                                    type="url"
                                    value={formData.moodleLink}
                                    onChange={(e) => setFormData(prev => ({ ...prev, moodleLink: e.target.value }))}
                                    className="w-full bg-[#0f1113] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Pricing */}
                    <section className="bg-[#1a1c1e] rounded-2xl border border-white/5 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-green-500/20 rounded-xl">
                                <DollarSign className="text-green-400" size={20} />
                            </div>
                            <h2 className="text-lg font-semibold">Precios por Hora</h2>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Tutoría Individual</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formData.individualPrice}
                                        onChange={(e) => setFormData(prev => ({ ...prev, individualPrice: parseFloat(e.target.value) || 0 }))}
                                        className="w-full bg-[#0f1113] border border-white/10 rounded-xl pl-8 pr-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Tutoría Grupal</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formData.groupPrice}
                                        onChange={(e) => setFormData(prev => ({ ...prev, groupPrice: parseFloat(e.target.value) || 0 }))}
                                        className="w-full bg-[#0f1113] border border-white/10 rounded-xl pl-8 pr-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Syllabus */}
                    <section className="bg-[#1a1c1e] rounded-2xl border border-white/5 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-500/20 rounded-xl">
                                    <BookOpen className="text-purple-400" size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold">Plan del Curso</h2>
                                    <p className="text-sm text-gray-400">{formData.syllabus.length} temas</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={addTopic}
                                className="flex items-center gap-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 px-4 py-2 rounded-xl transition-colors"
                            >
                                <Plus size={18} />
                                Agregar Tema
                            </button>
                        </div>

                        <div className="space-y-4">
                            {formData.syllabus.length === 0 ? (
                                <div className="text-center py-12 text-gray-400">
                                    <BookOpen size={48} className="mx-auto mb-4 opacity-50" />
                                    <p>No hay temas aún</p>
                                </div>
                            ) : (
                                formData.syllabus.map((topic, index) => (
                                    <div key={topic.id} className="bg-[#0f1113] rounded-xl p-4 border border-white/5 group">
                                        <div className="flex items-start gap-4">
                                            <div className="flex items-center gap-2 text-gray-500">
                                                <GripVertical size={16} className="cursor-grab" />
                                                <span className="text-sm font-mono">{index + 1}</span>
                                            </div>
                                            <div className="flex-1 space-y-3">
                                                <input
                                                    type="text"
                                                    placeholder="Título del tema"
                                                    value={topic.title}
                                                    onChange={(e) => updateTopic(topic.id, 'title', e.target.value)}
                                                    className="w-full bg-transparent border-b border-white/10 pb-2 focus:outline-none focus:border-purple-500 font-medium"
                                                />
                                                <textarea
                                                    placeholder="Descripción (opcional)"
                                                    value={topic.description}
                                                    onChange={(e) => updateTopic(topic.id, 'description', e.target.value)}
                                                    className="w-full bg-transparent border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500 text-sm text-gray-300 resize-none"
                                                    rows={2}
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeTopic(topic.id)}
                                                className="p-2 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>

                    <div className="flex justify-between items-center bg-[#1a1c1e] p-6 rounded-2xl border border-white/5">
                        <button
                            type="button"
                            onClick={handleDelete}
                            className="flex items-center gap-2 text-red-400 hover:text-red-300 px-4 py-2 rounded-xl hover:bg-red-500/10 transition-colors"
                        >
                            <Trash2 size={18} />
                            Eliminar Materia
                        </button>

                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="px-6 py-3 border border-white/10 rounded-xl hover:bg-white/5 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-6 py-3 rounded-xl font-semibold transition-colors"
                            >
                                <Save size={18} />
                                {saving ? 'Guardando...' : 'Guardar Cambios'}
                            </button>
                        </div>
                    </div>
                </form>
            </main>
        </div>
    );
}
