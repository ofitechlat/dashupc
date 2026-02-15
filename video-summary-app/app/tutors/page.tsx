'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Users, Plus, Phone, Mail, BookOpen, DollarSign, Edit, Trash2 } from 'lucide-react';
import { supabase } from '../utils/supabase';
import { Tutor, Subject } from '../types/tutoring';

export default function TutorsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [tutors, setTutors] = useState<Tutor[]>([]);
    const [subjects, setSubjects] = useState<Record<string, Subject>>({});

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // Load subjects first
            const { data: subjectsData } = await supabase.from('subjects').select('*');
            const subjectsMap: Record<string, Subject> = {};
            (subjectsData || []).forEach(s => {
                subjectsMap[s.id] = { id: s.id, name: s.name, level: s.level || 'Sin Nivel', syllabus: [], moodleLink: '', individualPrice: s.individual_price, groupPrice: s.group_price, createdAt: s.created_at };
            });
            setSubjects(subjectsMap);

            // Load tutors
            const { data, error } = await supabase.from('tutors').select('*').order('name');
            if (error) throw error;

            setTutors((data || []).map(t => ({
                id: t.id,
                name: t.name,
                phone: t.phone,
                email: t.email,
                subjectIds: t.subject_ids || [],
                availability: t.availability || [],
                hourlyRate: t.hourly_rate,
                createdAt: t.created_at,
                updatedAt: t.updated_at
            })));
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    };

    const deleteTutor = async (id: string) => {
        if (!confirm('¿Eliminar este tutor?')) return;
        try {
            const { error } = await supabase.from('tutors').delete().eq('id', id);
            if (error) throw error;
            loadData();
        } catch (err) {
            console.error('Error:', err);
        }
    };

    return (
        <div className="min-h-screen bg-[#0f1113] text-white">
            <header className="sticky top-0 z-50 bg-[#0f1113]/95 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.push('/admin')} className="p-2 hover:bg-white/10 rounded-xl">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold">Tutores</h1>
                            <p className="text-sm text-gray-400">{tutors.length} registrados</p>
                        </div>
                    </div>
                    <button
                        onClick={() => router.push('/tutors/new')}
                        className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-xl font-medium"
                    >
                        <Plus size={18} /> Nuevo Tutor
                    </button>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-6 py-8">
                {loading ? (
                    <div className="text-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-4" />
                    </div>
                ) : tutors.length === 0 ? (
                    <div className="text-center py-20">
                        <Users size={48} className="mx-auto mb-4 text-gray-600" />
                        <p className="text-gray-400">No hay tutores registrados</p>
                        <button onClick={() => router.push('/tutors/new')} className="mt-4 text-purple-400">
                            + Registrar primer tutor
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                        {tutors.map(tutor => (
                            <div key={tutor.id} className="bg-[#1a1c1e] rounded-2xl border border-white/5 p-5 group">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-purple-500/20 rounded-xl">
                                            <Users className="text-purple-400" size={18} />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold">{tutor.name}</h3>
                                            <p className="text-sm text-green-400 flex items-center gap-1">
                                                <DollarSign size={12} />${tutor.hourlyRate}/hora
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                                        <button onClick={() => router.push(`/tutors/new?phone=${encodeURIComponent(tutor.phone)}`)} className="p-1.5 hover:bg-white/10 rounded-lg">
                                            <Edit size={14} className="text-gray-400" />
                                        </button>
                                        <button onClick={() => deleteTutor(tutor.id)} className="p-1.5 hover:bg-red-500/20 rounded-lg">
                                            <Trash2 size={14} className="text-red-400" />
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2 text-sm text-gray-400">
                                    <p className="flex items-center gap-2"><Phone size={14} />{tutor.phone}</p>
                                    {tutor.email && <p className="flex items-center gap-2"><Mail size={14} />{tutor.email}</p>}
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <BookOpen size={14} />
                                        {tutor.subjectIds.map(id => (
                                            <span key={id} className="px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded text-xs">
                                                {subjects[id]?.name || 'Materia'}
                                            </span>
                                        ))}
                                    </div>
                                    <p>{tutor.availability.length} bloques de disponibilidad</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
