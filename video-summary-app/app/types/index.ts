export interface VideoData {
    id: string;
    title: string;
    duration: number;
    thumbnail: string;
    compressedSize: number;
    originalSize: number;
    transcription: Transcription;
    summary: VideoSummary;
    parts?: string[]; // Para videos divididos en partes (Supabase 50MB limit)
    youtubeUrl?: string; // Link de YouTube opcional
    processingStatus?: 'completed' | 'partial_transcription_error' | 'partial_summary_error' | 'failed';
    classId?: string;
    createdAt: string;
}

export interface Transcription {
    text: string;
    segments: TranscriptionSegment[];
}

export interface TranscriptionSegment {
    id: string;
    startTime: number;
    endTime: number;
    text: string;
}

export interface VideoSummary {
    fullSummary: string;
    sections: SummarySection[];
    keyPoints: string[];
}

export interface SummarySection {
    id: string;
    title: string;
    timestamp: number;
    duration: number;
    content: string;
}

export interface UploadProgress {
    stage: 'uploading' | 'compressing' | 'transcribing' | 'summarizing' | 'complete';
    progress: number;
    message: string;
}
