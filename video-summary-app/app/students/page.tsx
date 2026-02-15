'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, User, Plus, Phone, Mail, Calendar, Edit, Trash2, BookOpen } from 'lucide-react';
import { supabase } from '../utils/supabase';
import { Student, Subject } from '../types/tutoring';

export default function StudentsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState<Student[]>([]);
    const [subjects, setSubjects] = useState<Record<string, Subject>>({});

    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.email !== '506casm@gmail.com') {
                router.push('/student/dashboard');
                return;
            }
            loadData();
        };
        checkSession();
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

            // Load students
            const { data, error } = await supabase
                .from('students')
                .select('*')
                .order('name');

            if (error) throw error;

            setStudents((data || []).map(s => ({
                id: s.id,
                name: s.name,
                phone: s.phone,
                email: s.email,
                subjectIds: s.subject_ids || [],
                preference: s.preference,
                availability: s.availability || [],
                createdAt: s.created_at,
                updatedAt: s.updated_at
            })));
        } catch (err) {
            console.error('Error loading students:', err);
        } finally {
            setLoading(false);
        }
    };

    const deleteStudent = async (id: string) => {
        if (!confirm('¿Eliminar este estudiante?')) return;

        try {
            const { error } = await supabase.from('students').delete().eq('id', id);
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
                            <h1 className="text-xl font-bold">Estudiantes</h1>
                            <p className="text-sm text-gray-400">{students.length} registrados</p>
                        </div>
                    </div>
                    <button
                        onClick={() => router.push('/students/new')}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl font-medium"
                    >
                        <Plus size={18} /> Nuevo Estudiante
                    </button>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-6 py-8">
                {loading ? (
                    <div className="text-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4" />
                    </div>
                ) : students.length === 0 ? (
                    <div className="text-center py-20">
                        <User size={48} className="mx-auto mb-4 text-gray-600" />
                        <p className="text-gray-400">No hay estudiantes registrados</p>
                        <button onClick={() => router.push('/students/new')} className="mt-4 text-blue-400">
                            + Registrar primer estudiante
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {students.map(student => (
                            <div key={student.id} className="bg-[#1a1c1e] rounded-2xl border border-white/5 p-5 group">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-500/20 rounded-xl">
                                            <User className="text-blue-400" size={18} />
                                        </div>
                                        <h3 className="font-semibold">{student.name}</h3>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                                        <button onClick={() => router.push(`/students/new?phone=${encodeURIComponent(student.phone)}`)} className="p-1.5 hover:bg-white/10 rounded-lg">
                                            <Edit size={14} className="text-gray-400" />
                                        </button>
                                        <button onClick={() => deleteStudent(student.id)} className="p-1.5 hover:bg-red-500/20 rounded-lg">
                                            <Trash2 size={14} className="text-red-400" />
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2 text-sm text-gray-400">
                                    <p className="flex items-center gap-2"><Phone size={14} />{student.phone}</p>
                                    {student.email && <p className="flex items-center gap-2"><Mail size={14} />{student.email}</p>}
                                    {student.subjectIds.length > 0 && (
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <BookOpen size={14} className="text-amber-400" />
                                            {student.subjectIds.map(id => (
                                                <span key={id} className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs">
                                                    {subjects[id]?.name || 'Materia'}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    <p className="flex items-center gap-2">
                                        <Calendar size={14} />
                                        {student.availability.length} bloques de disponibilidad
                                    </p>
                                    <span className={`inline-block px-2 py-0.5 rounded text-xs ${student.preference === 'individual' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                                        }`}>
                                        {student.preference}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
