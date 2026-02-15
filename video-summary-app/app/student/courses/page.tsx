'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import { BookOpen, Clock, AlertCircle } from 'lucide-react';

interface Request {
    id: string;
    package_hours: number;
    status: string;
    created_at: string;
    rejection_reason?: string;
    subject: { name: string; moodle_link: string | null };
    total_price: number;
    amount_paid: number;
    payment_status: 'pending' | 'partial' | 'paid' | 'overdue';
}

export default function StudentCoursesPage() {
    const [loading, setLoading] = useState(true);
    const [requests, setRequests] = useState<Request[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data: student } = await supabase.from('students').select('id').eq('user_id', session.user.id).single();
        if (!student) return;

        const { data } = await supabase
            .from('course_requests')
            .select(`
                id, package_hours, status, created_at, rejection_reason,
                subject:subjects(name, moodle_link),
                workshop:workshop_groups(name, schedule_config),
                total_price, amount_paid, payment_status
            `)
            .eq('student_id', student.id)
            .order('created_at', { ascending: false });

        if (data) setRequests(data as any);
        setLoading(false);
    };

    if (loading) return <div className="p-8 text-white">Cargando cursos...</div>;

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold mb-8">Mis Solicitudes</h1>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {requests.map((r: any) => (
                    <div key={r.id} className="bg-[#1a1c1e] rounded-xl p-6 border border-white/5 shadow-lg relative overflow-hidden">
                        {/* Status Stripe */}
                        <div className={`absolute top-0 left-0 w-1 h-full ${r.status === 'matched' || r.status === 'approved' ? 'bg-green-500' :
                            r.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
                            }`} />

                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                                    <BookOpen size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">
                                        {r.workshop?.name || r.subject?.name || 'Solicitud General'}
                                    </h3>
                                    <p className="text-xs text-gray-500">{new Date(r.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${r.status === 'matched' ? 'bg-green-500/10 text-green-500' :
                                r.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-red-500/10 text-red-500'
                                }`}>
                                {r.status === 'matched' ? 'Activo' : r.status}
                            </span>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Paquete:</span>
                                <span className="text-white font-medium">{r.package_hours} Horas</span>
                            </div>

                            {/* Payment Info */}
                            <div className="bg-[#0f1113] p-3 rounded-lg border border-white/5">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs text-gray-400">Estado de Pago</span>
                                    <span className={`text-xs font-bold uppercase ${r.payment_status === 'paid' ? 'text-green-400' :
                                        r.payment_status === 'overdue' ? 'text-red-400' : 'text-orange-400'
                                        }`}>
                                        {r.payment_status === 'overdue' ? 'Atrasado' : r.payment_status === 'paid' ? 'Pagado' : 'Pendiente'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-gray-500">Pendiente:</span>
                                    <span className={`font-bold ${r.total_price - r.amount_paid > 0 ? 'text-white' : 'text-gray-500'}`}>
                                        ₡{(r.total_price - r.amount_paid).toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            {r.rejection_reason && (
                                <div className="flex gap-2 items-start bg-red-500/10 p-3 rounded-lg text-red-400 text-xs mt-2">
                                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                                    <p>{r.rejection_reason}</p>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {requests.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                    No tienes cursos activos. ¡Solicita una clase desde el Dashboard!
                </div>
            )}
        </div>
    );
}
