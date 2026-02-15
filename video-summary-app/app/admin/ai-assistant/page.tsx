'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Sparkles, Send, Check, X, AlertTriangle, Loader2, Copy, Database } from 'lucide-react';

interface SuggestedOperation {
    operation: string;
    table: string;
    data: Record<string, any>;
    warnings: string[];
    missing_fields: string[];
}

interface AssistantResponse {
    success: boolean;
    interpretation: string;
    suggestions: SuggestedOperation[];
    raw_entities: Record<string, any>;
}

export default function AIAssistantPage() {
    const router = useRouter();
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<AssistantResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copiedSql, setCopiedSql] = useState(false);

    const examplePrompts = [
        "Agregar profesor Juan Pérez, teléfono 88887777, email juan@academia.com, da clases de Matemáticas 7, 8 y 9, disponible lunes y miércoles de 2pm a 6pm, cobra 5000 por hora",
        "Nuevo estudiante María García, cel 70001234, nivel Sétimo, quiere estudiar Matemáticas y Español, disponible martes y jueves en la mañana",
        "Actualizar el plan de Octavo: Matemáticas 2 horas, Español 2 horas, Ciencias 1 hora, Estudios Sociales 1 hora, Inglés 1 hora",
        "El profesor Carlos ahora también puede dar Ciencias de Bachillerato, su teléfono es 88990011"
    ];

    const handleSubmit = async () => {
        if (!input.trim()) return;

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const response = await fetch('http://localhost:8000/api/ai-assistant/parse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: input })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || 'Error del servidor');
            }

            const data: AssistantResponse = await response.json();
            setResult(data);
        } catch (err: any) {
            setError(err.message || 'Error al procesar la solicitud');
        } finally {
            setLoading(false);
        }
    };

    const generateSQL = (suggestion: SuggestedOperation): string => {
        const { operation, table, data } = suggestion;
        if (operation === 'INSERT') {
            const cols = Object.keys(data).join(', ');
            const vals = Object.values(data).map(v =>
                typeof v === 'string' ? `'${v}'` :
                    Array.isArray(v) ? `'${JSON.stringify(v)}'` : String(v)
            ).join(', ');
            return `INSERT INTO ${table} (${cols}) VALUES (${vals});`;
        } else if (operation === 'UPDATE') {
            const sets = Object.entries(data)
                .filter(([k]) => k !== 'id' && k !== 'phone')
                .map(([k, v]) => `${k} = ${typeof v === 'string' ? `'${v}'` : v}`)
                .join(', ');
            const where = data.phone ? `phone = '${data.phone}'` : data.id ? `id = '${data.id}'` : 'TRUE';
            return `UPDATE ${table} SET ${sets} WHERE ${where};`;
        }
        return '-- Unknown operation';
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedSql(true);
        setTimeout(() => setCopiedSql(false), 2000);
    };

    return (
        <div className="min-h-screen bg-[#0f1113] text-white">
            {/* Header */}
            <header className="border-b border-white/10 bg-[#0f1113]/80 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.push('/admin')} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                            <ArrowLeft size={20} />
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                                <Sparkles size={20} />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold">Asistente IA de Datos</h1>
                                <p className="text-xs text-gray-400">Ingresa información en texto libre</p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-8">
                {/* Input Section */}
                <div className="bg-[#1a1c1e] rounded-2xl border border-white/5 p-6 mb-6">
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                        Describe lo que quieres hacer:
                    </label>
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ej: Agregar profesor Juan Pérez, teléfono 88887777, da Matemáticas 7 y 8, disponible lunes y miércoles de 2pm a 6pm..."
                        className="w-full h-32 bg-black/40 border border-white/10 rounded-xl p-4 text-white placeholder:text-gray-600 focus:border-purple-500 focus:outline-none resize-none"
                    />

                    <div className="flex items-center justify-between mt-4">
                        <p className="text-xs text-gray-500">
                            La IA interpretará tu texto y sugerirá operaciones de base de datos
                        </p>
                        <button
                            onClick={handleSubmit}
                            disabled={loading || !input.trim()}
                            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 px-6 py-3 rounded-xl font-semibold transition-all"
                        >
                            {loading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                            {loading ? 'Procesando...' : 'Analizar'}
                        </button>
                    </div>
                </div>

                {/* Example Prompts */}
                <div className="mb-6">
                    <p className="text-sm text-gray-400 mb-3">Ejemplos de uso:</p>
                    <div className="flex flex-wrap gap-2">
                        {examplePrompts.map((prompt, i) => (
                            <button
                                key={i}
                                onClick={() => setInput(prompt)}
                                className="text-xs bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-2 rounded-lg text-gray-300 transition-colors text-left max-w-xs truncate"
                            >
                                {prompt.slice(0, 50)}...
                            </button>
                        ))}
                    </div>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 flex items-center gap-3">
                        <AlertTriangle className="text-red-400" size={20} />
                        <span className="text-red-300">{error}</span>
                    </div>
                )}

                {/* Results Section */}
                {result && (
                    <div className="space-y-6">
                        {/* Interpretation */}
                        <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                            <h3 className="font-semibold text-purple-300 mb-2 flex items-center gap-2">
                                <Sparkles size={16} />
                                Interpretación de la IA:
                            </h3>
                            <p className="text-gray-300">{result.interpretation}</p>
                        </div>

                        {/* Suggestions */}
                        {result.suggestions.length > 0 ? (
                            <div className="space-y-4">
                                <h3 className="font-semibold text-white flex items-center gap-2">
                                    <Database size={18} />
                                    Operaciones Sugeridas:
                                </h3>

                                {result.suggestions.map((suggestion, idx) => (
                                    <div key={idx} className="bg-[#1a1c1e] border border-white/10 rounded-xl overflow-hidden">
                                        <div className="p-4 border-b border-white/5">
                                            <div className="flex items-center justify-between mb-3">
                                                <span className={`px-3 py-1 rounded-lg text-xs font-bold ${suggestion.operation === 'INSERT'
                                                        ? 'bg-green-500/20 text-green-400'
                                                        : 'bg-blue-500/20 text-blue-400'
                                                    }`}>
                                                    {suggestion.operation}
                                                </span>
                                                <span className="text-gray-400 text-sm">
                                                    Tabla: <code className="text-white">{suggestion.table}</code>
                                                </span>
                                            </div>

                                            {/* Data Preview */}
                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                                {Object.entries(suggestion.data).map(([key, value]) => (
                                                    <div key={key} className="flex justify-between bg-black/30 px-3 py-2 rounded-lg">
                                                        <span className="text-gray-400">{key}:</span>
                                                        <span className="text-white font-mono">
                                                            {Array.isArray(value) ? JSON.stringify(value) : String(value)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Warnings */}
                                            {suggestion.warnings.length > 0 && (
                                                <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                                                    <p className="text-yellow-400 text-sm font-medium mb-1">⚠️ Advertencias:</p>
                                                    <ul className="text-yellow-300 text-xs list-disc pl-4">
                                                        {suggestion.warnings.map((w, i) => <li key={i}>{w}</li>)}
                                                    </ul>
                                                </div>
                                            )}

                                            {/* Missing Fields */}
                                            {suggestion.missing_fields.length > 0 && (
                                                <div className="mt-3 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                                                    <p className="text-orange-400 text-sm font-medium mb-1">📝 Campos faltantes:</p>
                                                    <ul className="text-orange-300 text-xs list-disc pl-4">
                                                        {suggestion.missing_fields.map((f, i) => <li key={i}>{f}</li>)}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>

                                        {/* SQL Preview */}
                                        <div className="p-4 bg-black/30">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs text-gray-400">SQL Generado:</span>
                                                <button
                                                    onClick={() => copyToClipboard(generateSQL(suggestion))}
                                                    className="text-xs flex items-center gap-1 text-purple-400 hover:text-purple-300"
                                                >
                                                    {copiedSql ? <Check size={12} /> : <Copy size={12} />}
                                                    {copiedSql ? 'Copiado!' : 'Copiar'}
                                                </button>
                                            </div>
                                            <pre className="text-xs text-green-400 font-mono bg-black/50 p-3 rounded-lg overflow-x-auto">
                                                {generateSQL(suggestion)}
                                            </pre>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="p-4 flex justify-end gap-3">
                                            <button className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors">
                                                <X size={16} /> Rechazar
                                            </button>
                                            <button className="flex items-center gap-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors">
                                                <Check size={16} /> Aprobar y Ejecutar
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-gray-400 py-8">
                                No se generaron sugerencias. Intenta con más detalle.
                            </div>
                        )}

                        {/* Raw Entities Debug */}
                        <details className="bg-[#1a1c1e] border border-white/5 rounded-xl p-4">
                            <summary className="cursor-pointer text-gray-400 text-sm">
                                Ver entidades extraídas (debug)
                            </summary>
                            <pre className="mt-3 text-xs text-gray-500 overflow-auto">
                                {JSON.stringify(result.raw_entities, null, 2)}
                            </pre>
                        </details>
                    </div>
                )}
            </main>
        </div>
    );
}
