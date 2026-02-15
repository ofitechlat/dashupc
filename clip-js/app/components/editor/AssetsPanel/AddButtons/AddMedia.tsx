"use client";

import { getFile, useAppDispatch, useAppSelector } from "../../../../store";
import { setMediaFiles } from "../../../../store/slices/projectSlice";
import { storeFile } from "../../../../store";
import { categorizeFile } from "../../../../utils/utils";
import Image from 'next/image';
import toast from 'react-hot-toast';

export default function AddMedia({ fileId }: { fileId: string }) {
    const { mediaFiles } = useAppSelector((state) => state.projectState);
    const dispatch = useAppDispatch();

    const handleFileChange = async () => {
        const updatedMedia = [...mediaFiles];

        const file = await getFile(fileId);
        const mediaId = crypto.randomUUID();

        if (fileId) {
            const relevantClips = mediaFiles.filter(clip => clip.type === categorizeFile(file.type));
            const lastEnd = relevantClips.length > 0
                ? Math.max(...relevantClips.map(f => f.positionEnd))
                : 0;

            // Obtener duración real del video/audio
            let duration = 30; // valor por defecto para imágenes
            const fileType = categorizeFile(file.type);

            if (fileType === 'video' || fileType === 'audio') {
                try {
                    duration = await getMediaDuration(file, fileType);
                } catch (error) {
                    console.error('Error getting media duration:', error);
                    toast.error('No se pudo obtener la duración del archivo');
                }
            }

            updatedMedia.push({
                id: mediaId,
                fileName: file.name,
                fileId: fileId,
                startTime: 0,
                endTime: duration,
                src: URL.createObjectURL(file),
                positionStart: lastEnd,
                positionEnd: lastEnd + duration,
                includeInMerge: true,
                x: 0,
                y: 0,
                width: 1920,
                height: 1080,
                rotation: 0,
                opacity: 100,
                crop: { x: 0, y: 0, width: 1920, height: 1080 },
                playbackSpeed: 1,
                volume: 100,
                type: fileType,
                zIndex: 0,
            });
        }
        dispatch(setMediaFiles(updatedMedia));
        toast.success('Media added successfully.');
    };

    // Función auxiliar para obtener duración de video/audio
    const getMediaDuration = (file: File, type: 'video' | 'audio'): Promise<number> => {
        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(file);
            const element = type === 'video'
                ? document.createElement('video')
                : document.createElement('audio');

            element.preload = 'metadata';
            element.src = url;

            element.onloadedmetadata = () => {
                URL.revokeObjectURL(url);
                resolve(element.duration);
            };

            element.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Failed to load media'));
            };
        });
    };

    return (
        <div
        >
            <label
                className="cursor-pointer rounded-full bg-white border border-solid border-transparent transition-colors flex flex-col items-center justify-center text-gray-800 hover:bg-[#ccc] dark:hover:bg-[#ccc] font-medium sm:text-base py-2 px-2"
            >
                <Image
                    alt="Add Project"
                    className="Black"
                    height={12}
                    width={12}
                    src="https://www.svgrepo.com/show/513803/add.svg"
                />
                {/* <span className="text-xs">Add Media</span> */}
                <button
                    onClick={handleFileChange}
                >
                </button>
            </label>
        </div>
    );
}
