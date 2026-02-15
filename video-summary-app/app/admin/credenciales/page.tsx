'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Key, User, Mail, Copy, RefreshCw, Check, Trash2, Phone } from 'lucide-react';
import { supabase } from '../../utils/supabase';

interface Credential {
    id: string;
    phone: string;
    email: string;
    password: string;
    createdAt: string;
    expiresAt: string;
    name?: string;
}

interface Student {
    id: string;
    name: string;
    phone: string;
    email: string;
}

export default function CredencialesPage() {
    const router = useRouter();
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState<Student[]>([]);
    const [credentials, setCredentials] = useState<Credential[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [generatedPassword, setGeneratedPassword] = useState('');
    const [copied, setCopied] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/admin');
                return;
            }
            setIsAdmin(true);
            loadStudents();
            loadCredentials();
            setLoading(false);
        };
        checkSession();
    }, [router]);

    const loadStudents = async () => {
        const { data } = await supabase
            .from('students')
            .select('id, name, phone, email')
            .order('name');

        if (data) {
            setStudents(data);
        }
    };

    const loadCredentials = async () => {
        // Fetch students who have a user_id linked
        const { data } = await supabase
            .from('students')
            .select('id, name, email, phone, user_id, must_change_password')
            .not('user_id', 'is', null);

        if (data) {
            // Map to local interface
            setCredentials(data.map(s => ({
                id: s.id,
                phone: s.phone,
                email: s.email,
                password: '***', // No podemos ver la contraseña real después de crearla
                createdAt: new Date().toISOString(),
                expiresAt: '',
                name: s.name // Added for display
            })));
        }
    };

    const generatePassword = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
        let password = '';
        for (let i = 0; i < 8; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    };

    const createCredential = async () => {
        if (!selectedStudent || !selectedStudent.email) {
            alert('El estudiante debe tener un correo electrónico');
            return;
        }

        const password = generatePassword();
        setGeneratedPassword(password);
        setLoading(true);

        try {
            const res = await fetch('/api/admin/create-student-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentId: selectedStudent.id,
                    email: selectedStudent.email,
                    password: password,
                    name: selectedStudent.name
                })
            });

            const data = await res.json();

            if (!res.ok) {
                alert('Error: ' + data.error);
                return;
            }

            // Success
            alert('Usuario creado exitosamente');
            setGeneratedPassword(password); // Keep shown for copying/whatsapp
            loadCredentials(); // Refresh list

        } catch (error) {
            console.error(error);
            alert('Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const sendWhatsApp = () => {
        if (!selectedStudent || !generatedPassword) return;

        // Clean phone number
        let phone = selectedStudent.phone.replace(/\D/g, '');
        // Assume Costa Rica (+506) if length is 8, or just preprend if missing
        if (phone.length === 8) phone = '506' + phone;

        const message = `Hola ${selectedStudent.name}, aquí tienes tus credenciales para el portal de estudiantes de Tutoring App:

📧 Usuario: ${selectedStudent.email}
🔑 Contraseña: ${generatedPassword}

Ingresa aquí: ${window.location.origin}/student/login
(Se te pedirá cambiar la contraseña al ingresar)`;

        const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.phone.includes(searchQuery) ||
        (s.email && s.email.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (loading && !generatedPassword) { // Only show full loader if not just creating
        return (
            <div className="min-h-screen bg-[#0f1113] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
            </div>
        );
    }

    if (!isAdmin) {
        return null;
    }

    return (
        <div className="min-h-screen bg-[#0f1113] text-white">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-[#0f1113]/95 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
                    <button onClick={() => router.push('/admin')} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold">Generador de Credenciales</h1>
                        <p className="text-sm text-gray-400">Crear cuentas de acceso para estudiantes</p>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-6 py-8">
                <div className="grid gap-8 lg:grid-cols-2">
                    {/* Selector de estudiante */}
                    <section className="bg-[#1a1c1e] rounded-2xl border border-white/5 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-blue-500/20 rounded-xl">
                                <User className="text-blue-400" size={20} />
                            </div>
                            <h2 className="text-lg font-semibold">Seleccionar Estudiante</h2>
                        </div>

                        <input
                            type="text"
                            placeholder="Buscar por nombre, teléfono o correo..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[#0f1113] border border-white/10 rounded-xl px-4 py-3 mb-4 focus:outline-none focus:border-blue-500 transition-colors"
                        />

                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {filteredStudents.map(student => (
                                <button
                                    key={student.id}
                                    onClick={() => {
                                        setSelectedStudent(student);
                                        setGeneratedPassword(''); // Reset if switching
                                    }}
                                    className={`w-full p-3 rounded-xl border-2 text-left transition-all ${selectedStudent?.id === student.id
                                        ? 'border-blue-500 bg-blue-500/10'
                                        : 'border-white/10 hover:border-white/20'
                                        }`}
                                >
                                    <p className="font-semibold">{student.name}</p>
                                    <div className="flex gap-4 text-sm text-gray-400 mt-1">
                                        <span className="flex items-center gap-1">
                                            <Phone size={12} />
                                            {student.phone}
                                        </span>
                                        {student.email && (
                                            <span className="flex items-center gap-1">
                                                <Mail size={12} />
                                                {student.email}
                                            </span>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>

                        {selectedStudent && !generatedPassword && (
                            <div className="mt-6 pt-6 border-t border-white/5">
                                <button
                                    onClick={createCredential}
                                    disabled={!selectedStudent.email || loading}
                                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed py-3 rounded-xl font-semibold transition-colors"
                                >
                                    <Key size={18} />
                                    {loading ? 'Creando Usuario...' : 'Generar Credencial & Usuario'}
                                </button>
                                {!selectedStudent.email && (
                                    <p className="text-sm text-amber-400 mt-2 text-center">
                                        Este estudiante no tiene correo registrado
                                    </p>
                                )}
                            </div>
                        )}
                    </section>

                    {/* Credencial generada */}
                    <section className="bg-[#1a1c1e] rounded-2xl border border-white/5 p-6 h-fit">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-green-500/20 rounded-xl">
                                <Key className="text-green-400" size={20} />
                            </div>
                            <h2 className="text-lg font-semibold">Credencial</h2>
                        </div>

                        {generatedPassword && selectedStudent ? (
                            <div className="space-y-4">
                                <div className="bg-[#0f1113] rounded-xl p-4 border border-green-500/30">
                                    <div className="flex justify-between items-start mb-2">
                                        <p className="text-sm text-gray-400">Usuario Generado</p>
                                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">Activo</span>
                                    </div>
                                    <p className="font-bold text-lg mb-1">{selectedStudent.email}</p>
                                    <p className="font-mono text-xl text-green-400 mt-2">{generatedPassword}</p>
                                </div>

                                <button
                                    onClick={sendWhatsApp}
                                    className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white py-3 rounded-xl font-bold transition-colors shadow-lg shadow-green-900/20"
                                >
                                    <Phone size={20} />
                                    Enviar por WhatsApp
                                </button>

                                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-sm text-amber-400">
                                    ⚠️ Esta contraseña es temporal. El estudiante deberá cambiarla al ingresar.
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12 text-gray-400 border-2 border-dashed border-white/5 rounded-xl">
                                <Key size={48} className="mx-auto mb-4 opacity-20" />
                                <p>Selecciona un estudiante para crear su cuenta</p>
                            </div>
                        )}
                    </section>
                </div>

                {/* Usuarios Activos */}
                <section className="mt-12">
                    <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                        <User size={20} className="text-blue-400" />
                        Estudiantes con Acceso ({credentials.length})
                    </h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {credentials.map(cred => (
                            <div key={cred.id} className="bg-[#1a1c1e] border border-white/5 rounded-xl p-4 flex items-center justify-between">
                                <div>
                                    <p className="font-semibold text-white">{cred.name || cred.email}</p>
                                    <p className="text-sm text-gray-400">{cred.email}</p>
                                </div>
                                <div className="h-8 w-8 bg-green-500/10 rounded-full flex items-center justify-center">
                                    <Check size={16} className="text-green-400" />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
}
