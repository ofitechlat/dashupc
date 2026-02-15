import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

export interface AudioChunk {
    id: string;
    startTime: number;
    endTime: number;
    audioBase64: string;
    mimeType: string;
}

export class AudioExtractor {
    private ffmpeg: FFmpeg;

    constructor(ffmpeg: FFmpeg) {
        this.ffmpeg = ffmpeg;
    }

    /**
     * Extrae audio completo de un video
     */
    async extractAudio(videoFile: File): Promise<string> {
        const inputName = 'input.mp4';
        const outputName = 'output.mp3';

        // Escribir video en FFmpeg
        await this.ffmpeg.writeFile(inputName, await fetchFile(videoFile));

        // Extraer audio
        await this.ffmpeg.exec([
            '-i', inputName,
            '-vn', // Sin video
            '-acodec', 'libmp3lame',
            '-b:a', '128k', // Bitrate de audio
            outputName
        ]);

        // Leer audio resultante
        const data = await this.ffmpeg.readFile(outputName) as Uint8Array;
        const base64 = btoa(
            new Uint8Array(data).reduce((data, byte) => data + String.fromCharCode(byte), '')
        );

        // Limpiar
        await this.ffmpeg.deleteFile(inputName);
        await this.ffmpeg.deleteFile(outputName);

        return base64;
    }

    /**
     * Extrae segmento de audio (para chunking)
     */
    async extractAudioChunk(
        videoFile: File,
        startTime: number,
        duration: number
    ): Promise<string> {
        const inputName = 'input.mp4';
        const outputName = 'chunk.mp3';

        await this.ffmpeg.writeFile(inputName, await fetchFile(videoFile));

        // Extraer segmento específico
        await this.ffmpeg.exec([
            '-i', inputName,
            '-ss', startTime.toString(), // Tiempo de inicio
            '-t', duration.toString(), // Duración
            '-vn',
            '-acodec', 'libmp3lame',
            '-b:a', '128k',
            outputName
        ]);

        const data = await this.ffmpeg.readFile(outputName) as Uint8Array;
        const base64 = btoa(
            new Uint8Array(data).reduce((data, byte) => data + String.fromCharCode(byte), '')
        );

        await this.ffmpeg.deleteFile(inputName);
        await this.ffmpeg.deleteFile(outputName);

        return base64;
    }

    /**
     * Divide video largo en chunks de audio
     */
    async createAudioChunks(
        videoFile: File,
        videoDuration: number,
        chunkDuration: number = 600 // 10 minutos por defecto
    ): Promise<AudioChunk[]> {
        const chunks: AudioChunk[] = [];
        const numChunks = Math.ceil(videoDuration / chunkDuration);

        for (let i = 0; i < numChunks; i++) {
            const startTime = i * chunkDuration;
            const endTime = Math.min((i + 1) * chunkDuration, videoDuration);
            const duration = endTime - startTime;

            const audioBase64 = await this.extractAudioChunk(videoFile, startTime, duration);

            chunks.push({
                id: `chunk-${i}`,
                startTime,
                endTime,
                audioBase64,
                mimeType: 'audio/mpeg'
            });
        }

        return chunks;
    }
}
