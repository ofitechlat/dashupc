'use client';
import { useState } from 'react';
import { useAppSelector, useAppDispatch, getFile } from '@/app/store';
import { setTranscriptions, setSummaries } from '@/app/store/slices/projectSlice';
import { TranscriptionService } from '@/app/utils/transcriptionService';
import { AudioExtractor } from '@/app/utils/audioExtractor';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toast } from 'react-hot-toast';
import { Transcription } from '@/app/types';
import { Download, FileText, Sparkles, Loader2 } from 'lucide-react';

export const TranscriptionPanel = () => {
    const dispatch = useAppDispatch();
    const { mediaFiles, transcriptions, summaries } = useAppSelector(
        (state) => state.projectState
    );

    const [isTranscribing, setIsTranscribing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);

    const handleTranscribe = async (videoId: string) => {
        setIsTranscribing(true);
        setProgress(0);
        setSelectedVideoId(videoId);

        try {
            // Obtener archivo de video
            const mediaFile = mediaFiles.find(m => m.id === videoId);
            if (!mediaFile) throw new Error('Video not found');

            const file = await getFile(mediaFile.fileId);
            if (!file) throw new Error('File not found in IndexedDB');

            // Inicializar FFmpeg y servicios
            const ffmpeg = new FFmpeg();
            await ffmpeg.load();

            const audioExtractor = new AudioExtractor(ffmpeg);
            const transcriptionService = new TranscriptionService(audioExtractor);

            // Transcribir
            toast.loading('Transcribiendo video...', { id: 'transcribe' });

            const transcription = await transcriptionService.transcribeVideo(
                file,
                mediaFile.endTime - mediaFile.startTime,
                setProgress
            );

            // Guardar transcripción
            dispatch(setTranscriptions([...transcriptions, transcription]));

            toast.success('Transcripción completada', { id: 'transcribe' });

            // Generar resumen
            toast.loading('Generando resumen con IA...', { id: 'summary' });

            const summary = await transcriptionService.generateSummary(
                transcription,
                mediaFile.fileName
            );

            dispatch(setSummaries([...summaries, summary]));

            toast.success('Resumen generado', { id: 'summary' });

        } catch (error) {
            console.error('Transcription error:', error);
            toast.error('Error al transcribir video', { id: 'transcribe' });
        } finally {
            setIsTranscribing(false);
            setProgress(0);
            setSelectedVideoId(null);
        }
    };

    const downloadTranscription = (transcription: Transcription) => {
        const blob = new Blob([transcription.text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transcription-${transcription.id}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Transcripción descargada');
    };

    const downloadTranscriptionCSV = (transcription: Transcription) => {
        // Crear CSV con formato: timestamp, texto
        let csvContent = 'Tiempo,Texto\n';

        if (transcription.chunks && transcription.chunks.length > 0) {
            // Si tiene chunks, agregar cada uno con su timestamp
            transcription.chunks.forEach(chunk => {
                const startTime = formatTime(chunk.startTime);
                const endTime = formatTime(chunk.endTime);
                const text = chunk.text.replace(/"/g, '""'); // Escapar comillas
                csvContent += `"${startTime} - ${endTime}","${text}"\n`;
            });
        } else {
            // Si no tiene chunks, agregar todo el texto
            const text = transcription.text.replace(/"/g, '""');
            csvContent += `"00:00:00","${text}"\n`;
        }

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transcription-${transcription.id}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Transcripción CSV descargada');
    };

    const downloadSummary = (summary: any) => {
        const blob = new Blob([summary.summary], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `summary-${summary.id}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Resumen descargado');
    };

    const downloadSummaryMarkdown = (summary: any, videoFileName: string) => {
        // Crear contenido Markdown estructurado
        const mdContent = `# Resumen de Video: ${videoFileName}

## 📊 Información del Resumen

- **Generado con**: ${summary.model}
- **Fecha**: ${new Date(summary.createdAt).toLocaleString('es-ES')}
- **ID de Transcripción**: ${summary.transcriptionId}

---

## 📝 Resumen

${summary.summary}

---

## 🔑 Puntos Clave

${summary.keyPoints && summary.keyPoints.length > 0
                ? summary.keyPoints.map((point: string) => `- ${point}`).join('\n')
                : 'No se identificaron puntos clave específicos.'}

---

*Generado automáticamente por Clip-JS con Gemini 3 Flash*
`;

        const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `summary-${summary.id}.md`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Resumen Markdown descargado');
    };

    const formatTime = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const videoFiles = mediaFiles.filter(m => m.type === 'video');

    return (
        <div className="p-4 space-y-4 h-full overflow-y-auto">
            <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-500" />
                <h3 className="text-lg font-semibold">Transcripción y Resumen IA</h3>
            </div>

            {videoFiles.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No hay videos en el proyecto</p>
                    <p className="text-sm">Agrega un video para comenzar</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {videoFiles.map((video) => {
                        const transcription = transcriptions.find(t => t.videoId === video.id);
                        const summary = summaries.find(s => s.videoId === video.id);
                        const isProcessing = isTranscribing && selectedVideoId === video.id;

                        return (
                            <div key={video.id} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex-1">
                                        <h4 className="font-medium text-gray-900 truncate">{video.fileName}</h4>
                                        <p className="text-xs text-gray-500">
                                            Duración: {Math.floor((video.endTime - video.startTime) / 60)}:{Math.floor((video.endTime - video.startTime) % 60).toString().padStart(2, '0')}
                                        </p>
                                    </div>

                                    {!transcription && !isProcessing && (
                                        <button
                                            onClick={() => handleTranscribe(video.id)}
                                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 text-sm font-medium"
                                        >
                                            <Sparkles className="w-4 h-4" />
                                            Transcribir
                                        </button>
                                    )}

                                    {isProcessing && (
                                        <div className="flex items-center gap-3">
                                            <div className="flex flex-col items-end">
                                                <div className="w-32 bg-gray-200 rounded-full h-2 mb-1">
                                                    <div
                                                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                                        style={{ width: `${progress}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-gray-600">{Math.round(progress)}%</span>
                                            </div>
                                            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                                        </div>
                                    )}
                                </div>

                                {transcription && (
                                    <div className="space-y-3">
                                        <details className="cursor-pointer group" open>
                                            <summary className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors flex items-center gap-2">
                                                <FileText className="w-4 h-4" />
                                                Ver Transcripción Completa
                                            </summary>
                                            <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm border border-gray-200">
                                                <pre className="whitespace-pre-wrap font-sans text-gray-700">
                                                    {transcription.text}
                                                </pre>
                                            </div>
                                        </details>

                                        {summary && (
                                            <details className="cursor-pointer group" open>
                                                <summary className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors flex items-center gap-2">
                                                    <Sparkles className="w-4 h-4" />
                                                    Ver Resumen IA
                                                </summary>
                                                <div className="mt-2 p-3 bg-blue-50 rounded-lg text-sm border border-blue-200">
                                                    <pre className="whitespace-pre-wrap font-sans text-gray-800">
                                                        {summary.summary}
                                                    </pre>
                                                    <div className="mt-2 text-xs text-gray-500">
                                                        Generado con {summary.model}
                                                    </div>
                                                </div>
                                            </details>
                                        )}

                                        <div className="space-y-2 pt-2 border-t border-gray-200">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => downloadTranscription(transcription)}
                                                    className="flex-1 text-xs px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 font-medium"
                                                >
                                                    <Download className="w-3 h-3" />
                                                    TXT
                                                </button>
                                                <button
                                                    onClick={() => downloadTranscriptionCSV(transcription)}
                                                    className="flex-1 text-xs px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors flex items-center justify-center gap-2 font-medium"
                                                >
                                                    <Download className="w-3 h-3" />
                                                    CSV
                                                </button>
                                            </div>
                                            {summary && (
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => downloadSummary(summary)}
                                                        className="flex-1 text-xs px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center justify-center gap-2 font-medium"
                                                    >
                                                        <Download className="w-3 h-3" />
                                                        Resumen TXT
                                                    </button>
                                                    <button
                                                        onClick={() => downloadSummaryMarkdown(summary, video.fileName)}
                                                        className="flex-1 text-xs px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors flex items-center justify-center gap-2 font-medium"
                                                    >
                                                        <Download className="w-3 h-3" />
                                                        Resumen MD
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800">
                <p className="font-medium mb-1">💡 Optimización para videos largos:</p>
                <ul className="list-disc list-inside space-y-1 text-yellow-700">
                    <li>Videos &lt; 10 min: Transcripción directa</li>
                    <li>Videos &gt; 10 min: Procesamiento por segmentos</li>
                    <li>Videos &gt; 1 hora: Resumen jerárquico automático</li>
                </ul>
            </div>
        </div>
    );
};
