import { AudioExtractor, AudioChunk } from './audioExtractor';
import { Transcription, TranscriptionChunk, VideoSummary } from '../types';

export class TranscriptionService {
    private audioExtractor: AudioExtractor;

    constructor(audioExtractor: AudioExtractor) {
        this.audioExtractor = audioExtractor;
    }

    /**
     * Transcribe video completo (optimizado para videos largos)
     */
    async transcribeVideo(
        videoFile: File,
        videoDuration: number,
        onProgress?: (progress: number) => void
    ): Promise<Transcription> {
        const CHUNK_DURATION = 600; // 10 minutos
        const shouldChunk = videoDuration > CHUNK_DURATION;

        if (!shouldChunk) {
            // Video corto: transcribir completo
            return this.transcribeShortVideo(videoFile, videoDuration, onProgress);
        } else {
            // Video largo: usar chunking
            return this.transcribeLongVideo(videoFile, videoDuration, onProgress);
        }
    }

    /**
     * Transcribe video corto (< 10 min)
     */
    private async transcribeShortVideo(
        videoFile: File,
        videoDuration: number,
        onProgress?: (progress: number) => void
    ): Promise<Transcription> {
        onProgress?.(10); // Extrayendo audio

        const audioBase64 = await this.audioExtractor.extractAudio(videoFile);

        onProgress?.(50); // Transcribiendo

        const response = await fetch('/api/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                audioBase64,
                mimeType: 'audio/mpeg',
                startTime: 0,
                endTime: videoDuration
            })
        });

        const { text } = await response.json();
        onProgress?.(100);

        return {
            id: crypto.randomUUID(),
            videoId: videoFile.name,
            text,
            language: 'auto',
            createdAt: new Date().toISOString(),
            duration: videoDuration
        };
    }

    /**
     * Transcribe video largo (> 10 min) con chunking
     */
    private async transcribeLongVideo(
        videoFile: File,
        videoDuration: number,
        onProgress?: (progress: number) => void
    ): Promise<Transcription> {
        const CHUNK_DURATION = 600; // 10 minutos
        const CONCURRENT_LIMIT = 2; // Procesar 2 chunks a la vez

        onProgress?.(5); // Preparando chunks

        // Crear chunks de audio
        const audioChunks = await this.audioExtractor.createAudioChunks(
            videoFile,
            videoDuration,
            CHUNK_DURATION
        );

        onProgress?.(20); // Chunks creados

        // Procesar chunks en lotes (para evitar sobrecarga)
        const transcriptionChunks: TranscriptionChunk[] = [];
        const totalChunks = audioChunks.length;

        for (let i = 0; i < audioChunks.length; i += CONCURRENT_LIMIT) {
            const batch = audioChunks.slice(i, i + CONCURRENT_LIMIT);

            const batchResults = await Promise.allSettled(
                batch.map(chunk => this.transcribeChunk(chunk))
            );

            batchResults.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    transcriptionChunks.push(result.value);
                } else {
                    console.error(`Chunk ${i + index} failed:`, result.reason);
                }
            });

            const progress = 20 + ((i + batch.length) / totalChunks) * 70;
            onProgress?.(progress);
        }

        // Combinar transcripciones
        const fullText = transcriptionChunks
            .sort((a, b) => a.startTime - b.startTime)
            .map(chunk => chunk.text)
            .join('\n\n');

        onProgress?.(100);

        return {
            id: crypto.randomUUID(),
            videoId: videoFile.name,
            text: fullText,
            chunks: transcriptionChunks,
            language: 'auto',
            createdAt: new Date().toISOString(),
            duration: videoDuration
        };
    }

    /**
     * Transcribe un chunk individual
     */
    private async transcribeChunk(chunk: AudioChunk): Promise<TranscriptionChunk> {
        const response = await fetch('/api/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                audioBase64: chunk.audioBase64,
                mimeType: chunk.mimeType,
                startTime: chunk.startTime,
                endTime: chunk.endTime
            })
        });

        const { text } = await response.json();

        return {
            id: chunk.id,
            startTime: chunk.startTime,
            endTime: chunk.endTime,
            text
        };
    }

    /**
     * Genera resumen del video
     */
    async generateSummary(
        transcription: Transcription,
        videoTitle: string
    ): Promise<VideoSummary> {
        const isLong = transcription.chunks && transcription.chunks.length > 1;

        if (isLong && transcription.chunks) {
            // Resumen jerárquico para videos largos
            return this.generateHierarchicalSummary(transcription, videoTitle);
        } else {
            // Resumen directo para videos cortos
            return this.generateDirectSummary(transcription, videoTitle);
        }
    }

    /**
     * Resumen directo (videos cortos)
     */
    private async generateDirectSummary(
        transcription: Transcription,
        videoTitle: string
    ): Promise<VideoSummary> {
        const response = await fetch('/api/summarize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                transcription: transcription.text,
                videoTitle,
                isHierarchical: false
            })
        });

        const { summary } = await response.json();

        return {
            id: crypto.randomUUID(),
            videoId: transcription.videoId,
            transcriptionId: transcription.id,
            summary,
            keyPoints: this.extractKeyPoints(summary),
            createdAt: new Date().toISOString(),
            model: 'gemini-3-flash-preview'
        };
    }

    /**
     * Resumen jerárquico (videos largos)
     */
    private async generateHierarchicalSummary(
        transcription: Transcription,
        videoTitle: string
    ): Promise<VideoSummary> {
        // Paso 1: Resumir cada chunk
        const chunkSummaries = await Promise.all(
            transcription.chunks!.map(async (chunk) => {
                const response = await fetch('/api/summarize', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        transcription: chunk.text,
                        videoTitle: `${videoTitle} (${this.formatTime(chunk.startTime)} - ${this.formatTime(chunk.endTime)})`,
                        isHierarchical: false
                    })
                });
                const { summary } = await response.json();
                return summary;
            })
        );

        // Paso 2: Combinar resúmenes parciales en resumen final
        const combinedSummaries = chunkSummaries.join('\n\n---\n\n');

        const response = await fetch('/api/summarize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                transcription: combinedSummaries,
                videoTitle,
                isHierarchical: true
            })
        });

        const { summary } = await response.json();

        return {
            id: crypto.randomUUID(),
            videoId: transcription.videoId,
            transcriptionId: transcription.id,
            summary,
            keyPoints: this.extractKeyPoints(summary),
            createdAt: new Date().toISOString(),
            model: 'gemini-3-flash-preview'
        };
    }

    private extractKeyPoints(summary: string): string[] {
        // Extraer puntos clave del resumen (buscar listas con bullets)
        const lines = summary.split('\n');
        const keyPoints: string[] = [];

        for (const line of lines) {
            if (line.trim().match(/^[-*•]\s/)) {
                keyPoints.push(line.trim().replace(/^[-*•]\s/, ''));
            }
        }

        return keyPoints;
    }

    private formatTime(seconds: number): string {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
}
