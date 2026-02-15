'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, Plus, DollarSign, Link as LinkIcon, FileText, Edit, Trash2 } from 'lucide-react';
import { supabase } from '../utils/supabase';
import { Subject } from '../types/tutoring';

export default function SubjectsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [subjects, setSubjects] = useState<Subject[]>([]);

    useEffect(() => {
        loadSubjects();
    }, []);

    const loadSubjects = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('subjects')
                .select('*')
                .order('level')
                .order('name');

            if (error) throw error;

            setSubjects((data || []).map(s => ({
                id: s.id,
                name: s.name,
                level: s.level || 'Sin nivel',
                syllabus: s.syllabus || [],
                moodleLink: s.moodle_link,
                individualPrice: s.individual_price,
                groupPrice: s.group_price,
                createdAt: s.created_at
            })));
        } catch (err) {
            console.error('Error loading subjects:', err);
        } finally {
            setLoading(false);
        }
    };

    const deleteSubject = async (id: string) => {
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

            loadSubjects();
        } catch (err: any) {
            console.error('Error deleting subject:', err);
            alert(`Error al eliminar: ${err.message}`);
        }
    };

    return (
        <div className="min-h-screen bg-[#0f1113] text-white">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-[#0f1113]/95 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/admin')}
                            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold">Materias</h1>
                            <p className="text-sm text-gray-400">{subjects.length} cursos registrados</p>
                        </div>
                    </div>

                    <button
                        onClick={() => router.push('/subjects/new')}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl font-medium transition-colors"
                    >
                        <Plus size={18} />
                        Nueva Materia
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-5xl mx-auto px-6 py-8">
                {loading ? (
                    <div className="text-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4" />
                        <p className="text-gray-400">Cargando materias...</p>
                    </div>
                ) : subjects.length === 0 ? (
                    <div className="text-center py-20">
                        <BookOpen size={48} className="mx-auto mb-4 text-gray-600" />
                        <p className="text-gray-400 text-lg">No hay materias registradas</p>
                        <button
                            onClick={() => router.push('/subjects/new')}
                            className="mt-4 text-blue-400 hover:text-blue-300"
                        >
                            + Crear primera materia
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                        {subjects.map(subject => (
                            <div
                                key={subject.id}
                                className="bg-[#1a1c1e] rounded-2xl border border-white/5 p-6 hover:border-white/10 transition-all group"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-500/20 rounded-xl">
                                            <BookOpen className="text-blue-400" size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-lg leading-tight">{subject.name}</h3>
                                            <span className="inline-block mt-1 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                {subject.level}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => router.push(`/subjects/${subject.id}/edit`)}
                                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                        >
                                            <Edit size={16} className="text-gray-400" />
                                        </button>
                                        <button
                                            onClick={() => deleteSubject(subject.id)}
                                            className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={16} className="text-red-400" />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3 text-sm">
                                    {/* Prices */}
                                    <div className="flex items-center gap-4">
                                        <span className="flex items-center gap-1 text-gray-400">
                                            <DollarSign size={14} />
                                            Individual: <span className="text-green-400 font-medium">${subject.individualPrice.toLocaleString()}</span>
                                        </span>
                                        <span className="flex items-center gap-1 text-gray-400">
                                            Grupal: <span className="text-green-400 font-medium">${subject.groupPrice.toLocaleString()}</span>
                                        </span>
                                    </div>

                                    {/* Syllabus count */}
                                    <div className="flex items-center gap-2 text-gray-400">
                                        <FileText size={14} />
                                        {subject.syllabus.length} temas en el plan
                                    </div>

                                    {/* Moodle Link */}
                                    {subject.moodleLink && (
                                        <a
                                            href={subject.moodleLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 text-blue-400 hover:text-blue-300"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <LinkIcon size={14} />
                                            Abrir en Moodle
                                        </a>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
