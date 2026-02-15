"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Video, Users, GraduationCap, BookOpen, Key, Calendar,
    ArrowLeft, LogOut, LayoutDashboard, FileText, Settings, Sparkles
} from "lucide-react";
import { supabase } from "../utils/supabase";
import Login from "../components/Login";

interface DashboardStats {
    videos: number;
    students: number;
    tutors: number;
    subjects: number;
    classes: number;
    pendingRequests: number;
}

export default function AdminDashboard() {
    const router = useRouter();
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<DashboardStats>({
        videos: 0,
        students: 0,
        tutors: 0,
        subjects: 0,
        classes: 0,
        pendingRequests: 0
    });

    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setIsAdmin(!!session);
            if (session) {
                loadStats();
            }
            setLoading(false);
        };
        checkSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setIsAdmin(!!session);
            if (session) loadStats();
        });

        return () => subscription.unsubscribe();
    }, []);

    const loadStats = async () => {
        try {
            const [videosRes, studentsRes, tutorsRes, subjectsRes, classesRes, requestsRes] = await Promise.all([
                supabase.from('videos').select('id', { count: 'exact', head: true }),
                supabase.from('students').select('id', { count: 'exact', head: true }),
                supabase.from('tutors').select('id', { count: 'exact', head: true }),
                supabase.from('subjects').select('id', { count: 'exact', head: true }),
                supabase.from('classes').select('id', { count: 'exact', head: true }),
                supabase.from('course_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending')
            ]);

            setStats({
                videos: videosRes.count || 0,
                students: studentsRes.count || 0,
                tutors: tutorsRes.count || 0,
                subjects: subjectsRes.count || 0,
                classes: classesRes.count || 0,
                pendingRequests: requestsRes.count || 0
            });
        } catch (err) {
            console.error('Error loading stats:', err);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setIsAdmin(false);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0f1113] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-[#0f1113] text-white flex items-center justify-center">
                <div className="max-w-md w-full mx-4">
                    <div className="bg-[#1a1c1e] rounded-3xl border border-white/10 p-8">
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <LayoutDashboard className="text-blue-400" size={32} />
                            </div>
                            <h1 className="text-2xl font-bold">Panel de Administración</h1>
                            <p className="text-gray-400 mt-2">Inicia sesión para continuar</p>
                        </div>
                        <Login onLogin={() => setIsAdmin(true)} />
                        <button
                            onClick={() => router.push('/')}
                            className="w-full mt-4 flex items-center justify-center gap-2 text-gray-400 hover:text-white transition-colors"
                        >
                            <ArrowLeft size={16} />
                            Volver al inicio
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const menuItems = [
        {
            title: "Clases",
            description: "Calendario y gestión de clases aprobadas",
            icon: Calendar,
            color: "cyan",
            count: stats.classes,
            href: "/admin/classes"
        },
        {
            title: "Videos Transcritos",
            description: "Gestionar videos con transcripciones y resúmenes IA",
            icon: Video,
            color: "blue",
            count: stats.videos,
            href: "/admin/videos"
        },
        {
            title: "Estudiantes",
            description: "Ver y gestionar registros de estudiantes",
            icon: Users,
            color: "green",
            count: stats.students,
            href: "/students"
        },
        {
            title: "Tutores",
            description: "Administrar tutores y sus disponibilidades",
            icon: GraduationCap,
            color: "purple",
            count: stats.tutors,
            href: "/tutors"
        },
        {
            title: "Materias",
            description: "Cursos disponibles y sus syllabus",
            icon: BookOpen,
            color: "orange",
            count: stats.subjects,
            href: "/subjects"
        },
        {
            title: "Solicitudes",
            description: "Solicitudes de tutoría pendientes",
            icon: FileText,
            color: "amber",
            count: stats.pendingRequests,
            href: "/admin/requests"
        },
        {
            title: "Credenciales",
            description: "Generar accesos para modificaciones",
            icon: Key,
            color: "red",
            count: null,
            href: "/admin/credenciales"
        },
        {
            title: "Matching",
            description: "Algoritmo de asignación tutor-estudiante",
            icon: Calendar,
            color: "cyan",
            count: null,
            href: "/admin/matching"
        },
        {
            title: "Contabilidad",
            description: "Análisis financiero y ROI de cursos MEP",
            icon: Settings,
            color: "indigo",
            count: null,
            href: "/admin/accounting"
        },
        {
            title: "Búsqueda Global",
            description: "Buscar estudiantes y tutores en el sistema",
            icon: Users,
            color: "blue",
            count: null,
            href: "/admin/search"
        },
        {
            title: "Simulador MEP",
            description: "Sandbox de optimización y mix de estudiantes",
            icon: Sparkles,
            color: "purple",
            count: null,
            href: "/admin/optimization-sandbox"
        },
        {
            title: "Talleres",
            description: "Gestión de grupos, cohortes y horarios recurrentes",
            icon: Users,
            color: "blue",
            count: null,
            href: "/admin/workshops"
        }
    ];

    const getColorClasses = (color: string) => {
        const colors: Record<string, { bg: string; text: string; border: string }> = {
            blue: { bg: "bg-blue-500/20", text: "text-blue-400", border: "hover:border-blue-500/30" },
            green: { bg: "bg-green-500/20", text: "text-green-400", border: "hover:border-green-500/30" },
            purple: { bg: "bg-purple-500/20", text: "text-purple-400", border: "hover:border-purple-500/30" },
            orange: { bg: "bg-orange-500/20", text: "text-orange-400", border: "hover:border-orange-500/30" },
            amber: { bg: "bg-amber-500/20", text: "text-amber-400", border: "hover:border-amber-500/30" },
            red: { bg: "bg-red-500/20", text: "text-red-400", border: "hover:border-red-500/30" },
            cyan: { bg: "bg-cyan-500/20", text: "text-cyan-400", border: "hover:border-cyan-500/30" },
            indigo: { bg: "bg-indigo-500/20", text: "text-indigo-400", border: "hover:border-indigo-500/30" }
        };
        return colors[color] || colors.blue;
    };

    return (
        <div className="min-h-screen bg-[#0f1113] text-white">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-[#0f1113]/95 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.push('/')} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold">Panel de Administración</h1>
                            <p className="text-sm text-gray-400">Academia UPC</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 text-gray-400 hover:text-red-400 transition-colors"
                    >
                        <LogOut size={18} />
                        Cerrar Sesión
                    </button>
                </div>
            </header>

            {/* Dashboard Grid */}
            <main className="max-w-6xl mx-auto px-6 py-8">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {menuItems.map((item) => {
                        const colors = getColorClasses(item.color);
                        const Icon = item.icon;

                        return (
                            <button
                                key={item.href}
                                onClick={() => router.push(item.href)}
                                className={`bg-[#1a1c1e] rounded-2xl border border-white/5 p-6 text-left transition-all hover:bg-[#1f2123] ${colors.border} group`}
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className={`p-3 ${colors.bg} rounded-xl`}>
                                        <Icon className={colors.text} size={24} />
                                    </div>
                                    {item.count !== null && (
                                        <span className={`text-2xl font-bold ${colors.text}`}>
                                            {item.count}
                                        </span>
                                    )}
                                </div>
                                <h3 className="text-lg font-semibold mb-1 group-hover:text-white transition-colors">
                                    {item.title}
                                </h3>
                                <p className="text-sm text-gray-400">
                                    {item.description}
                                </p>
                            </button>
                        );
                    })}
                </div>

                {/* Quick Stats */}
                <div className="mt-12 bg-[#1a1c1e] rounded-2xl border border-white/5 p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Settings size={20} className="text-gray-400" />
                        Acciones Rápidas
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <button
                            onClick={() => router.push('/subjects/new')}
                            className="flex items-center gap-3 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 px-4 py-3 rounded-xl transition-colors"
                        >
                            <BookOpen size={18} />
                            Nueva Materia
                        </button>
                        <button
                            onClick={() => router.push('/students/new')}
                            className="flex items-center gap-3 bg-green-500/10 hover:bg-green-500/20 text-green-400 px-4 py-3 rounded-xl transition-colors"
                        >
                            <Users size={18} />
                            Nuevo Estudiante
                        </button>
                        <button
                            onClick={() => router.push('/tutors/new')}
                            className="flex items-center gap-3 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 px-4 py-3 rounded-xl transition-colors"
                        >
                            <GraduationCap size={18} />
                            Nuevo Tutor
                        </button>
                        <button
                            onClick={() => router.push('/admin/matching')}
                            className="flex items-center gap-3 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 px-4 py-3 rounded-xl transition-colors"
                        >
                            <Calendar size={18} />
                            Ejecutar Matching
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
