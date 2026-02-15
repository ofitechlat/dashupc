"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Search, Users, GraduationCap, ChevronLeft,
    ArrowRight, Filter, Mail, Phone, Book
} from "lucide-react";
import { supabase } from "../../utils/supabase";

interface Person {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    type: 'student' | 'tutor';
    subjects?: string[];
}

export default function SearchPage() {
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [type, setType] = useState<'all' | 'student' | 'tutor'>('all');
    const [results, setResults] = useState<Person[]>([]);
    const [loading, setLoading] = useState(false);

    const handleSearch = async () => {
        if (!query.trim()) return;
        setLoading(true);
        try {
            let people: Person[] = [];

            if (type === 'all' || type === 'student') {
                const { data: students } = await supabase
                    .from('students')
                    .select('id, name, email, phone')
                    .ilike('name', `%${query}%`);

                if (students) {
                    people = [...people, ...students.map(s => ({ ...s, type: 'student' as const }))];
                }
            }

            if (type === 'all' || type === 'tutor') {
                const { data: tutors } = await supabase
                    .from('tutors')
                    .select('id, name, email')
                    .ilike('name', `%${query}%`);

                if (tutors) {
                    people = [...people, ...tutors.map(t => ({ ...t, type: 'tutor' as const }))];
                }
            }

            setResults(people);
        } catch (err) {
            console.error('Search error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (query) handleSearch();
            else setResults([]);
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [query, type]);

    return (
        <div className="min-h-screen bg-[#0f1113] text-white">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-[#0f1113]/95 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.push('/admin')} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                            <ChevronLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold">Búsqueda Global</h1>
                            <p className="text-sm text-gray-400">Localizar personas en el ecosistema</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-8">
                {/* Search Box */}
                <div className="bg-[#1a1c1e] rounded-3xl border border-white/10 p-2 shadow-2xl mb-8">
                    <div className="flex flex-col md:flex-row gap-2">
                        <div className="flex-1 relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Buscar por nombre..."
                                className="w-full bg-transparent border-none py-4 pl-12 pr-4 text-lg focus:ring-0 outline-none"
                                autoFocus
                            />
                        </div>
                        <div className="flex p-1 bg-[#0f1113] rounded-2xl border border-white/5">
                            <button
                                onClick={() => setType('all')}
                                className={`px-4 py-2 rounded-xl transition-all text-sm font-medium ${type === 'all' ? 'bg-white/10 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                            >
                                Todos
                            </button>
                            <button
                                onClick={() => setType('student')}
                                className={`px-4 py-2 rounded-xl transition-all text-sm font-medium ${type === 'student' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-500 hover:text-white'}`}
                            >
                                Estudiantes
                            </button>
                            <button
                                onClick={() => setType('tutor')}
                                className={`px-4 py-2 rounded-xl transition-all text-sm font-medium ${type === 'tutor' ? 'bg-purple-500/20 text-purple-400' : 'text-gray-500 hover:text-white'}`}
                            >
                                Tutores
                            </button>
                        </div>
                    </div>
                </div>

                {/* Results Area */}
                <div className="space-y-4">
                    {loading && (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                        </div>
                    )}

                    {!loading && results.length > 0 && (
                        <div className="grid gap-3">
                            {results.map((person) => (
                                <button
                                    key={`${person.type}-${person.id}`}
                                    onClick={() => router.push(person.type === 'student' ? `/students?id=${person.id}` : `/tutors?id=${person.id}`)}
                                    className="flex items-center justify-between p-4 bg-[#1a1c1e] hover:bg-[#252729] rounded-2xl border border-white/5 transition-all group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${person.type === 'student' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>
                                            {person.type === 'student' ? <Users size={24} /> : <GraduationCap size={24} />}
                                        </div>
                                        <div className="text-left">
                                            <h3 className="font-bold text-lg group-hover:text-blue-400 transition-colors uppercaseTracking-wider">{person.name}</h3>
                                            <div className="flex flex-wrap gap-4 mt-1">
                                                {person.email && (
                                                    <span className="flex items-center gap-1.5 text-xs text-gray-500">
                                                        <Mail size={12} /> {person.email}
                                                    </span>
                                                )}
                                                {person.phone && (
                                                    <span className="flex items-center gap-1.5 text-xs text-gray-500">
                                                        <Phone size={12} /> {person.phone}
                                                    </span>
                                                )}
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${person.type === 'student' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'}`}>
                                                    {person.type === 'student' ? 'Estudiante' : 'Tutor'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <ArrowRight className="text-gray-700 group-hover:text-white group-hover:translate-x-1 transition-all" size={20} />
                                </button>
                            ))}
                        </div>
                    )}

                    {!loading && query && results.length === 0 && (
                        <div className="text-center py-20 opacity-50">
                            <div className="bg-white/5 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Search size={32} />
                            </div>
                            <p className="text-lg">No se encontraron resultados para "{query}"</p>
                            <p className="text-sm mt-1">Intenta con otro nombre o criterio</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
