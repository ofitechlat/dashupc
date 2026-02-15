'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../utils/supabase';
import { LogIn, Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';

export default function StudentLoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (authError) throw authError;

            if (data.user) {
                // Check if user must change password
                const { data: studentData, error: studentError } = await supabase
                    .from('students')
                    .select('must_change_password')
                    .eq('user_id', data.user.id)
                    .single();

                if (studentError) {
                    console.error('Error checking student status:', studentError);
                    // Fallback to dashboard if error checking (or maybe not a student?)
                    router.push('/student/dashboard');
                } else if (studentData?.must_change_password) {
                    router.push('/student/change-password');
                } else {
                    router.push('/student/dashboard');
                }
            }
        } catch (err: any) {
            setError(err.message || 'Error al iniciar sesión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0f1113] text-white flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-[#1a1c1e] rounded-2xl border border-white/5 p-8 shadow-2xl">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
                        <LogIn className="text-blue-500" size={32} />
                    </div>
                    <h1 className="text-2xl font-bold">Portal de Estudiantes</h1>
                    <p className="text-gray-400 mt-2">Ingresa para ver tus clases y videos</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 text-red-200">
                            <AlertCircle size={20} className="shrink-0" />
                            <p className="text-sm">{error}</p>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                            <input
                                type="email"
                                placeholder="Correo electrónico"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-[#0f1113] border border-white/10 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                                required
                            />
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                            <input
                                type="password"
                                placeholder="Contraseña"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-[#0f1113] border border-white/10 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all mt-6"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                Ingresar
                                <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center border-t border-white/5 pt-6">
                    <p className="text-sm text-gray-500">
                        ¿Olvidaste tu contraseña? Contacta a tu administrador.
                    </p>
                </div>
            </div>
        </div>
    );
}
