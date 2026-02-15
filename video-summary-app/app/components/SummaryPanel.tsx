'use client';
import { Play, FileText, List, Sparkles, Link as LinkIcon, Check } from 'lucide-react';
import { useState } from 'react';
import { VideoSummary } from '../types';

interface SummaryPanelProps {
    summary: VideoSummary;
    currentTime: number;
    videoDuration: number; // Nueva prop
    youtubeUrl?: string; // Nueva prop para generar links
    onTimestampClick: (time: number) => void;
}

export default function SummaryPanel({ summary, currentTime, videoDuration, youtubeUrl, onTimestampClick }: SummaryPanelProps) {
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Filtrar alucinaciones: Si el timestamp es mayor a la duración real del video (+5s margen), no lo mostramos.
    // Solo filtrarmos si videoDuration > 0 (ya cargó metadata)
    const validSections = summary.sections.filter(section => {
        if (videoDuration === 0) return true;
        return section.timestamp < (videoDuration + 5);
    });

    const handleCopyLink = (e: React.MouseEvent, timestamp: number, id: string) => {
        e.stopPropagation();
        if (!youtubeUrl) return;

        // Limpiar URL base (quitar parámetros existentes)
        const baseUrl = youtubeUrl.split('?')[0].split('&')[0];
        const videoId = youtubeUrl.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/user\/\S+|\/ytscreeningroom\?v=))([\w\-]{11})/)?.[1];

        const timestampUrl = videoId
            ? `https://youtu.be/${videoId}?t=${Math.floor(timestamp)}`
            : `${youtubeUrl}${youtubeUrl.includes('?') ? '&' : '?'}t=${Math.floor(timestamp)}`;

        navigator.clipboard.writeText(timestampUrl);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const formatTime = (seconds: any) => {
        try {
            if (!seconds || isNaN(seconds)) return "00:00";
            const date = new Date(Number(seconds) * 1000);
            if (isNaN(date.getTime())) return "00:00";
            return date.toISOString().substr(14, 5);
        } catch (e) {
            return "00:00";
        }
    };

    return (
        <div className="h-full overflow-y-auto bg-white p-6 custom-scrollbar">
            <div className="space-y-8">
                {/* Resumen General */}
                <section>
                    <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="text-blue-500" size={20} />
                        <h2 className="text-xl font-bold text-gray-800">Resumen General</h2>
                    </div>
                    <p className="text-gray-600 leading-relaxed text-sm">
                        {summary.fullSummary}
                    </p>
                </section>

                {/* Secciones con Timestamps */}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <List className="text-blue-500" size={20} />
                        <h2 className="text-lg font-bold text-gray-800">Secciones del Video</h2>
                    </div>
                    <div className="space-y-4">
                        {validSections.length === 0 ? (
                            <p className="text-gray-400 italic text-sm">Cargando secciones...</p>
                        ) : (
                            validSections.map((section) => {
                                const isActive = currentTime >= section.timestamp &&
                                    currentTime < section.timestamp + (section.duration || 9999);

                                return (
                                    <div
                                        key={section.id}
                                        onClick={() => onTimestampClick(section.timestamp)}
                                        className={`p-4 rounded-xl border transition-all cursor-pointer ${isActive
                                            ? 'border-blue-500 bg-blue-50 shadow-md transform scale-[1.02]'
                                            : 'border-gray-100 bg-gray-50 hover:bg-white hover:border-gray-300'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded">
                                                    {formatTime(section.timestamp)}
                                                </span>
                                                {youtubeUrl && (
                                                    <button
                                                        onClick={(e) => handleCopyLink(e, section.timestamp, section.id)}
                                                        className="p-1 hover:bg-blue-200 rounded text-blue-600 transition-colors"
                                                        title="Copiar link con tiempo"
                                                    >
                                                        {copiedId === section.id ? <Check size={12} /> : <LinkIcon size={12} />}
                                                    </button>
                                                )}
                                            </div>
                                            {isActive && <span className="text-[10px] font-black text-blue-500 animate-pulse">REPRODUCIENDO</span>}
                                        </div>
                                        <h3 className="font-bold text-gray-800 mb-1">{section.title}</h3>
                                        <p className="text-xs text-gray-500 line-clamp-2">{section.content}</p>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </section>

                {/* Puntos Clave */}
                {summary.keyPoints && summary.keyPoints.length > 0 && (
                    <section className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-100">
                        <div className="flex items-center gap-2 mb-3">
                            <FileText className="text-blue-600" size={20} />
                            <h2 className="text-lg font-bold text-blue-900">Puntos Clave</h2>
                        </div>
                        <ul className="space-y-2">
                            {summary.keyPoints.map((point, i) => (
                                <li key={i} className="flex gap-2 text-sm text-blue-800">
                                    <span className="font-bold text-blue-400">•</span>
                                    {point}
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
            </div>

            <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
        </div>
    );
}
