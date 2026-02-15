import { supabase } from './supabase';
import { VideoData } from '../types';

// ==========================================
// ☁️ SUPABASE IMPLEMENTATION
// ==========================================

export async function saveVideo(video: VideoData, blob: Blob | null, partBlobs?: { name: string; blob: Blob }[]): Promise<void> {
    try {
        // 1. Upload Blobs to Storage
        if (partBlobs && partBlobs.length > 0) {
            console.log('☁️ Uploading multiple parts to Supabase Storage...', video.id);
            for (const part of partBlobs) {
                const { error: uploadError } = await supabase.storage
                    .from('videos')
                    .upload(part.name, part.blob, {
                        cacheControl: '3600',
                        upsert: true
                    });
                if (uploadError) throw uploadError;
            }
        } else if (blob) {
            console.log('☁️ Uploading video to Supabase Storage...', video.id);
            const fileExt = 'mp4';
            const filePath = `${video.id}.${fileExt}`;
            const { error: uploadError } = await supabase.storage
                .from('videos')
                .upload(filePath, blob, {
                    cacheControl: '3600',
                    upsert: true
                });
            if (uploadError) throw uploadError;
        }

        // 2. Insert Metadata to DB
        console.log('☁️ Saving metadata to Supabase DB...', video.id);
        const { error: dbError } = await supabase
            .from('videos')
            .upsert({
                id: video.id,
                title: video.title,
                duration: video.duration,
                thumbnail: video.thumbnail,
                compressed_size: video.compressedSize,
                original_size: video.originalSize,
                transcription: video.transcription,
                summary: video.summary,
                parts: video.parts,
                youtube_link: video.youtubeUrl,
                processing_status: video.processingStatus || 'completed',
                created_at: new Date().toISOString()
            }, { onConflict: 'id' });

        if (dbError) throw dbError;
        console.log('✅ Video saved successfully to Supabase!');
    } catch (error) {
        console.error('❌ Error saving to Supabase:', error);
        throw error;
    }
}

export async function getVideo(id: string): Promise<{ video: VideoData; blob: Blob | null } | null> {
    try {
        // 1. Get Metadata from DB
        const { data: videoRecord, error: dbError } = await supabase
            .from('videos')
            .select('*')
            .eq('id', id)
            .single();

        if (dbError || !videoRecord) {
            console.warn('⚠️ Video not found in DB:', id);
            return null;
        }

        // 2. Download Blob from Storage (Optional if we have YouTube)
        let blobData = null;
        const hasYoutube = videoRecord.youtube_link && videoRecord.youtube_link.trim() !== '';

        if (!hasYoutube) {
            const filePath = videoRecord.id.includes('.') ? videoRecord.id : `${videoRecord.id}.mp4`;
            try {
                const { data } = await supabase.storage
                    .from('videos')
                    .download(filePath);
                blobData = data;
            } catch (e) {
                console.warn('⚠️ Download error (expected if file doesnt exist):', e);
            }
        }

        // Map snake_case (DB) to camelCase (Frontend Interface)
        const video: VideoData = {
            id: videoRecord.id,
            title: videoRecord.title,
            duration: videoRecord.duration,
            thumbnail: videoRecord.thumbnail,
            compressedSize: videoRecord.compressed_size,
            originalSize: videoRecord.original_size,
            transcription: videoRecord.transcription,
            summary: videoRecord.summary,
            parts: videoRecord.parts,
            youtubeUrl: videoRecord.youtube_link,
            processingStatus: videoRecord.processing_status,
            createdAt: videoRecord.created_at
        };

        return { video, blob: blobData || null };

    } catch (error) {
        console.error('❌ Error getting video from Supabase:', error);
        return null;
    }
}

export async function listVideos(): Promise<VideoData[]> {
    const { data, error } = await supabase
        .from('videos')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('❌ Error listing videos:', error);
        return [];
    }

    // Map DB results to Frontend Interface
    return data.map((record: any) => ({
        id: record.id,
        title: record.title,
        duration: record.duration,
        thumbnail: record.thumbnail,
        compressedSize: record.compressed_size,
        originalSize: record.original_size,
        transcription: record.transcription,
        summary: record.summary,
        parts: record.parts,
        youtubeUrl: record.youtube_link,
        classId: record.class_id,
        processingStatus: record.processing_status,
        createdAt: record.created_at
    }));
}

export async function deleteVideo(id: string): Promise<void> {
    try {
        // 1. Get metadata first to see if there are parts
        const { data: videoRecord } = await supabase
            .from('videos')
            .select('parts')
            .eq('id', id)
            .single();

        // 2. Delete from DB
        const { error: dbError } = await supabase
            .from('videos')
            .delete()
            .eq('id', id);

        if (dbError) throw dbError;

        // 3. Delete from Storage (all parts)
        const partsToDelete: string[] = [];
        if (videoRecord?.parts && Array.isArray(videoRecord.parts)) {
            partsToDelete.push(...videoRecord.parts);
        } else {
            partsToDelete.push(`${id}.mp4`);
        }

        const { error: storageError } = await supabase.storage
            .from('videos')
            .remove(partsToDelete);

        if (storageError) throw storageError;

        console.log('🗑️ Video and all its parts deleted from Supabase:', id);

    } catch (error) {
        console.error('❌ Error deleting video:', error);
        throw error;
    }
}

export async function getVideoBlob(id: string): Promise<Blob | null> {
    // Si el ID ya tiene extensión, la respetamos. Si no, asumimos .mp4
    const filePath = id.includes('.') ? id : `${id}.mp4`;

    console.log('☁️ Descargando blob:', filePath);
    const { data, error } = await supabase.storage
        .from('videos')
        .download(filePath);

    if (error) {
        console.warn('⚠️ Error de descarga para:', filePath, error.message);
        return null;
    }
    return data;
}
