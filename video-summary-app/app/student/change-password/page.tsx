'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../utils/supabase';
import { Key, Check, AlertCircle, ShieldCheck } from 'lucide-react';

export default function ChangePasswordPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [studentId, setStudentId] = useState<string | null>(null);

    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/student/login');
                return;
            }

            // Get student ID linked to this user
            const { data: student } = await supabase
                .from('students')
                .select('id')
                .eq('user_id', session.user.id)
                .single();

            if (student) {
                setStudentId(student.id);
            }
        };
        checkSession();
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (newPassword.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        setLoading(true);

        try {
            // 1. Update Auth Password
            const { error: authError } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (authError) throw authError;

            // 2. Update must_change_password flag
            if (studentId) {
                const { error: dbError } = await supabase
                    .from('students')
                    .update({ must_change_password: false })
                    .eq('id', studentId);

                if (dbError) console.error('Error updating status:', dbError);
            }

            // Redirect to dashboard
            router.push('/student/dashboard');

        } catch (err: any) {
            setError(err.message || 'Error al actualizar contraseña');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0f1113] text-white flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-[#1a1c1e] rounded-2xl border border-white/5 p-8 shadow-2xl relative overflow-hidden">
                {/* Background decorative elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-bl-full pointer-events-none" />

                <div className="text-center mb-8 relative z-10">
                    <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-green-500/20">
                        <ShieldCheck className="text-green-500" size={32} />
                    </div>
                    <h1 className="text-2xl font-bold">Cambiar Contraseña</h1>
                    <p className="text-gray-400 mt-2">Por seguridad, debes configurar una nueva contraseña</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 text-red-200">
                            <AlertCircle size={20} className="shrink-0" />
                            <p className="text-sm">{error}</p>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-2 pl-1">Nueva Contraseña</label>
                            <div className="relative">
                                <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full bg-[#0f1113] border border-white/10 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-green-500 transition-colors"
                                    placeholder="Mínimo 6 caracteres"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm text-gray-400 mb-2 pl-1">Confirmar Contraseña</label>
                            <div className="relative">
                                <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full bg-[#0f1113] border border-white/10 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-green-500 transition-colors"
                                    placeholder="Repite tu nueva contraseña"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <Check size={18} />
                                Actualizar y Continuar
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
