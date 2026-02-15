'use client';
import { useState } from 'react';
import { Upload, Loader2, CheckCircle2, AlertCircle, Link as LinkIcon, Youtube } from 'lucide-react';
import { saveVideo } from '../utils/storage';
import { VideoData, UploadProgress } from '../types';

export default function VideoUploader({ onUploadComplete }: { onUploadComplete: (id: string) => void }) {
    const [status, setStatus] = useState<UploadProgress | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [youtubeUrl, setYoutubeUrl] = useState('');

    const processVideo = async (file?: File) => {
        try {
            setError(null);

            // VALIDATION
            if (!file && !youtubeUrl) {
                setError("Por favor selecciona un archivo o ingresa un link de YouTube.");
                return;
            }

            // MODE A: YOUTUBE ONLY
            if (!file && youtubeUrl) {
                setStatus({ stage: 'compressing', progress: 10, message: 'Iniciando descarga de YouTube...' });

                const response = await fetch('http://localhost:8000/api/process-youtube', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: youtubeUrl })
                });

                if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.detail || 'Error en procesamiento de YouTube');
                }

                const result = await response.json();
                await handleSuccess(result, null);
                return;
            }

            // MODE B: FILE UPLOAD (Legacy + Hybrid)
            if (file) {
                setStatus({ stage: 'compressing', progress: 0, message: 'Conectando con motor de IA...' });

                const formData = new FormData();
                formData.append('file', file);

                const xhr = new XMLHttpRequest();

                xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable) {
                        const percent = Math.round((event.loaded / event.total) * 40);
                        setStatus({
                            stage: 'compressing',
                            progress: percent,
                            message: `Cargando en IA Local... ${percent}%`
                        });
                    }
                };

                xhr.upload.onload = () => {
                    setStatus({
                        stage: 'transcribing',
                        progress: 45,
                        message: 'Subida completa. Procesando en Backend (Audio -> Gemini)...'
                    });
                };

                const responsePromise = new Promise<any>((resolve, reject) => {
                    xhr.onreadystatechange = () => {
                        if (xhr.readyState === 4) {
                            if (xhr.status === 200) {
                                try {
                                    resolve(JSON.parse(xhr.responseText));
                                } catch (e) {
                                    reject(new Error('Error al leer la respuesta del servidor (JSON inválido)'));
                                }
                            } else {
                                try {
                                    const errorData = JSON.parse(xhr.responseText);
                                    reject(new Error(errorData.detail || `Error ${xhr.status}: ${xhr.statusText}`));
                                } catch (e) {
                                    reject(new Error(`Error del servidor: ${xhr.statusText}`));
                                }
                            }
                        }
                    };
                });

                xhr.open('POST', 'http://localhost:8000/process');
                xhr.send(formData);

                const result = await responsePromise;
                await handleSuccess(result, file);
            }

        } catch (err: any) {
            console.error(err);
            let userMessage = err.message || 'Error al procesar el video';

            if (err.message?.includes('exceeded the maximum allowed size') || err.name === 'StorageApiError') {
                userMessage = '❌ El video es demasiado pesado para la configuración actual de Supabase. Aumenta el límite en el Dashboard de Supabase (Settings -> Storage) o sube un video más corto.';
            }

            setError(userMessage);
            setStatus(null);
        }
    };

    const handleSuccess = async (result: any, file: File | null) => {
        const API_BASE = 'http://localhost:8000';
        const parts = result.parts || [];

        // Determinar URL final (Prioridad: YouTube Input > Result URL > Parts)
        const finalYoutubeUrl = youtubeUrl || (result.videoUrl.includes('http') ? result.videoUrl : undefined);

        // HYBRID MODE LOGIC:
        // Si tenemos URL de YouTube (ya sea por input manual o resultado), NO guardamos blobs en Supabase.
        // Solo descargamos/guardamos blobs si NO hay YouTube link.
        const useSupabaseStorage = !finalYoutubeUrl;

        const partBlobs: { name: string, blob: Blob }[] = [];

        if (useSupabaseStorage && parts.length > 0) {
            setStatus({ stage: 'summarizing', progress: 95, message: 'Descargando partes para almacenamiento local...' });
            for (let i = 0; i < parts.length; i++) {
                setStatus({
                    stage: 'summarizing',
                    progress: 95 + (i / parts.length * 3),
                    message: `Descargando parte ${i + 1} de ${parts.length}...`
                });
                const resp = await fetch(`${API_BASE}/static/${parts[i]}`);
                const blob = await resp.blob();
                partBlobs.push({ name: parts[i], blob });
            }
        } else if (finalYoutubeUrl) {
            setStatus({ stage: 'summarizing', progress: 97, message: 'Vinculando con YouTube (Ahorrando espacio)...' });
        } else {
            setStatus({ stage: 'summarizing', progress: 97, message: 'Finalizando...' });
        }

        // Mapeo Transcripcion
        const mappedTranscription = result.transcription ? {
            text: result.transcription.text,
            segments: (result.transcription.segments || []).map((seg: any, idx: number) => ({
                id: `seg-${idx}`,
                startTime: seg.start,
                endTime: seg.end,
                text: seg.text
            }))
        } : { text: '', segments: [] };

        // Mapeo Resumen
        const mappedSummary = result.summary ? {
            fullSummary: result.summary.summary,
            sections: (result.summary.sections || []).map((sec: any, idx: number) => ({
                id: `sec-${idx}`,
                title: sec.title,
                timestamp: sec.start,
                duration: 0,
                content: sec.content
            })),
            keyPoints: result.summary.keyPoints || []
        } : { fullSummary: '', sections: [], keyPoints: [] };

        const videoData: VideoData = {
            id: result.videoId,
            title: result.title,
            duration: result.duration || 0,
            thumbnail: '',
            originalSize: file ? file.size : 0,
            compressedSize: partBlobs.length > 0 ? partBlobs.reduce((acc, p) => acc + p.blob.size, 0) : 0,
            transcription: mappedTranscription,
            summary: mappedSummary,
            parts: useSupabaseStorage ? parts : [], // Si hay YouTube, vaciamos parts
            youtubeUrl: finalYoutubeUrl,
            processingStatus: result.processing_status || 'completed',
            createdAt: new Date().toISOString()
        };

        setStatus({ stage: 'summarizing', progress: 98, message: 'Guardando metadatos en Supabase...' });
        await saveVideo(videoData, null, partBlobs.length > 0 ? partBlobs : undefined);
        setStatus({ stage: 'complete', progress: 100, message: '¡Procesamiento completado!' });

        setTimeout(() => onUploadComplete(result.videoId), 1500);
    };

    return (
        <div className="max-w-2xl mx-auto p-10 border-2 border-dashed border-white/10 rounded-[2.5rem] bg-[#16181a] shadow-2xl hover:border-blue-500/50 transition-all duration-500 group/uploader">
            {!status ? (
                <div className="flex flex-col items-center justify-center space-y-6">
                    <div className="p-6 bg-blue-600/10 rounded-3xl text-blue-500 group-hover/uploader:scale-110 group-hover/uploader:bg-blue-600/20 transition-all duration-500">
                        {youtubeUrl ? <Youtube size={48} strokeWidth={1.5} /> : <Upload size={48} strokeWidth={2.5} />}
                    </div>
                    <div className="text-center w-full">
                        <h3 className="text-2xl font-bold text-white tracking-tight">Cargar nuevo video</h3>
                        <p className="text-gray-400 mt-2 max-w-xs mx-auto mb-6">Sube un archivo o pega un link de YouTube para procesar con IA</p>

                        {/* Input de YouTube */}
                        <div className="max-w-md mx-auto mb-4 bg-black/40 p-1.5 rounded-2xl border border-white/5 focus-within:border-blue-500/50 transition-all group/yt flex items-center gap-2">
                            <div className="pl-3 text-red-500"><Youtube size={20} /></div>
                            <input
                                type="url"
                                placeholder="Pegar Link de YouTube aquí..."
                                value={youtubeUrl}
                                onChange={(e) => setYoutubeUrl(e.target.value)}
                                className="w-full bg-transparent border-none focus:ring-0 text-sm text-white px-2 py-3 placeholder:text-gray-600"
                            />
                        </div>


                        {/* Botón Acción Principal */}
                        <div className="flex flex-col gap-4 items-center w-full">
                            {/* Selector de Archivo (Siempre visible) */}
                            <label className="inline-block px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold cursor-pointer transition-all hover:shadow-xl hover:shadow-blue-900/40 active:scale-95">
                                {youtubeUrl ? 'Cargar VIDEO LOCAL (Más Rápido)' : 'Seleccionar archivo Local'}
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="video/*,.mkv,.m4v"
                                    onChange={(e) => e.target.files?.[0] && processVideo(e.target.files[0])}
                                />
                            </label>

                            {/* Opción Link Only */}
                            {youtubeUrl && (
                                <div className="text-gray-500 text-sm font-medium">o</div>
                            )}

                            {youtubeUrl && (
                                <button
                                    onClick={() => processVideo()}
                                    className="px-8 py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold transition-all hover:shadow-xl hover:shadow-red-900/40 active:scale-95 flex items-center gap-2"
                                >
                                    <Youtube size={18} /> Procesar SOLO Link (Descarga Lenta)
                                </button>
                            )}
                        </div>

                        <div className="mt-8 flex items-center justify-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-green-500/80">
                                Sistema Listo • IA v2.5
                            </span>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            {status.stage === 'complete' ? (
                                <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center text-green-500">
                                    <CheckCircle2 size={24} />
                                </div>
                            ) : (
                                <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-500">
                                    <Loader2 className="animate-spin" size={24} />
                                </div>
                            )}
                            <div>
                                <h4 className="font-bold text-white text-lg">{status.message}</h4>
                                <p className="text-sm text-gray-500 capitalize">{status.stage}</p>
                            </div>
                        </div>
                        <span className="text-2xl font-black text-blue-500">{status.progress}%</span>
                    </div>

                    <div className="relative w-full bg-white/5 rounded-full h-4 overflow-hidden border border-white/5">
                        <div
                            className="bg-gradient-to-r from-blue-600 to-indigo-500 h-full transition-all duration-700 ease-out shadow-[0_0_20px_rgba(59,130,246,0.5)]"
                            style={{ width: `${status.progress}%` }}
                        />
                    </div>

                    <div className="grid grid-cols-4 gap-4 px-2">
                        {[
                            { id: 'compressing', label: 'Carga/Descarga' },
                            { id: 'transcribing', label: 'IA Transcriber' },
                            { id: 'summarizing', label: 'IA Resumen' },
                            { id: 'complete', label: 'Listo' }
                        ].map((step, idx) => {
                            const isActive = status.stage === step.id;
                            const isDone = (
                                (step.id === 'compressing' && status.progress > 40) ||
                                (step.id === 'transcribing' && status.progress > 80) ||
                                (step.id === 'summarizing' && status.progress > 95) ||
                                status.stage === 'complete'
                            );

                            return (
                                <div key={step.id} className="flex flex-col gap-2">
                                    <div className={`h-1.5 rounded-full transition-colors duration-500 ${isDone ? 'bg-green-500' : isActive ? 'bg-blue-500' : 'bg-white/5'}`}></div>
                                    <span className={`text-[10px] font-black uppercase tracking-tighter text-center ${isDone ? 'text-green-500/70' : isActive ? 'text-blue-500' : 'text-gray-600'}`}>
                                        {step.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {error && (
                <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center space-x-3 text-red-400 animate-in zoom-in-95 duration-300">
                    <AlertCircle size={20} />
                    <span className="text-sm font-medium">{error}</span>
                </div>
            )}
        </div>
    );
}
