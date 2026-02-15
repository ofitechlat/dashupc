'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    LayoutDashboard,
    BookOpen,
    Calendar,
    LogOut,
    Menu,
    X,
    User,
    FileText,
    MessageCircle
} from 'lucide-react';
import { supabase } from '../utils/supabase';

export default function StudentLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [userEmail, setUserEmail] = useState<string | null>(null);

    // Close sidebar on route change (mobile)
    useEffect(() => {
        setIsSidebarOpen(false);
    }, [pathname]);

    useEffect(() => {
        const getUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setUserEmail(session.user.email || null);
            }
        };
        getUser();
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/student/login');
    };

    // Helper to check active state
    const isActive = (path: string) => pathname === path;

    // Navigation Items
    const navItems = [
        { name: 'Dashboard', path: '/student/dashboard', icon: LayoutDashboard },
        { name: 'Solicitudes', path: '/student/courses', icon: FileText },
        { name: 'Mis Cursos', path: '/student/my-courses', icon: BookOpen },
        { name: 'Mis Clases', path: '/student/classes', icon: Calendar },
    ];

    // Don't show sidebar on login/reset pages
    if (pathname === '/student/login' || pathname === '/student/change-password') {
        return <>{children}</>;
    }

    return (
        <div className="min-h-screen bg-[#0f1113] text-white flex">
            {/* Mobile Menu Button */}
            <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden fixed top-4 right-4 z-50 p-2 bg-[#1a1c1e] rounded-lg border border-white/10"
            >
                {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Sidebar Overlay (Mobile) */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed lg:sticky top-0 left-0 h-screen w-64 bg-[#1a1c1e] border-r border-white/5 
                flex flex-col z-40 transition-transform duration-300
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                {/* Logo / Header */}
                <div className="p-6 border-b border-white/5">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                        Portal Estudiante
                    </h1>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.path);
                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                className={`
                                    flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                                    ${active
                                        ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                    }
                                `}
                            >
                                <Icon size={20} />
                                <span className="font-medium">{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer / User Profile */}
                <div className="p-4 border-t border-white/5 bg-[#151719]">
                    <div className="flex items-center gap-3 mb-4 px-2">
                        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                            <User size={16} className="text-blue-400" />
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-medium truncate">{userEmail}</p>
                            <p className="text-xs text-gray-500">Estudiante</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors text-sm font-medium"
                    >
                        <LogOut size={16} />
                        Cerrar Sesion
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-w-0">
                {children}
            </main>

            {/* Floating WhatsApp Button */}
            <a
                href="https://wa.me/50688888888"
                target="_blank"
                rel="noopener noreferrer"
                className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white px-5 py-3 rounded-full shadow-lg shadow-[#25D366]/30 transition-all hover:scale-105 font-medium"
            >
                <MessageCircle size={20} />
                <span className="hidden sm:inline">Contactar Academia</span>
            </a>
        </div>
    );
}
