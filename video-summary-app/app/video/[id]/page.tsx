'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Share2, Download, Trash2, Youtube, Check } from 'lucide-react';
import { getVideo, deleteVideo, getVideoBlob } from '../../utils/storage';
import { VideoData } from '../../types';
import SummaryPanel from '../../components/SummaryPanel';
import { supabase } from '../../utils/supabase';

// ==========================================
// 🛠️ HELPERS (Fuera del componente para evitar ReferenceError)
// ==========================================

const getYouTubeId = (url: string) => {
    try {
        const trimmedUrl = url.trim();
        const urlObj = new URL(trimmedUrl.includes('://') ? trimmedUrl : `https://${trimmedUrl}`);

        if (urlObj.hostname.includes('youtu.be')) {
            return urlObj.pathname.slice(1).split(/[?&]/)[0];
        }

        if (urlObj.hostname.includes('youtube.com')) {
            const v = urlObj.searchParams.get('v');
            if (v) return v;

            const paths = ['/embed/', '/v/', '/shorts/', '/live/'];
            for (const path of paths) {
                if (urlObj.pathname.startsWith(path)) {
                    return urlObj.pathname.split(path)[1].split(/[?&]/)[0];
                }
            }
        }
    } catch (e) {
        const match = url.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/user\/\S+|\/ytscreeningroom\?v=|\/shorts\/|\/live\/))([\w\-]{11})/);
        return match?.[1];
    }
    return null;
};

const getYouTubeEmbedUrl = (url: string, startTime: number = 0) => {
    const id = getYouTubeId(url);
    if (!id) {
        console.error("❌ No se pudo extraer ID de YouTube de:", url);
        return "";
    }
    // URL LIMPIA sin tokens de sesión (si=) ni tracking (fbclid)
    // Esto evita el Error 153 que ocurre cuando los tokens expiran
    const params = new URLSearchParams();
    if (startTime > 0) params.set('start', String(Math.floor(startTime)));
    params.set('autoplay', '1');
    params.set('rel', '0');
    params.set('modestbranding', '1');

    return `https://www.youtube.com/embed/${id}?${params.toString()}`;
};

const safePlay = (element: HTMLMediaElement | null) => {
    if (!element) return;
    try {
        const playPromise = element.play();
        if (playPromise !== undefined) {
            playPromise.then(_ => {
                // Autoplay started!
            })
                .catch(error => {
                    console.log("Play interrupted or prevented:", error.message);
                });
        }
    } catch (e) {
        console.error("Critical play error:", e);
    }
};

export default function WatchPage() {
    const { id: rawId } = useParams();
    const id = rawId ? decodeURIComponent(rawId as string) : null;
    const router = useRouter();

    const [data, setData] = useState<{ video: VideoData; videoUrl: string } | null>(null);
    const [currentPartIndex, setCurrentPartIndex] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isAdmin, setIsAdmin] = useState(false);
    const [shareCopied, setShareCopied] = useState(false);
    const [isClient, setIsClient] = useState(false);
    const [playerUrl, setPlayerUrl] = useState<string>(''); // Nueva URL activa
    const [error, setError] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const youtubeRef = useRef<any>(null);
    const loadingRef = useRef<string | null>(null);

    useEffect(() => {
        setIsClient(true);
        // Verificar Auth
        supabase.auth.getSession().then(({ data: { session } }) => {
            setIsAdmin(!!session);
        });

        if (id && loadingRef.current !== id) {
            loadingRef.current = id;
            loadVideoData();
        }
    }, [id]);

    async function loadVideoData() {
        try {
            const result = await getVideo(id as string);
            if (result) {
                const cleanedYoutube = result.video.youtubeUrl?.trim();
                // Si el video tiene YouTube, no necesitamos cargar blobs locales para el video
                if (cleanedYoutube) {
                    setData({ video: { ...result.video, youtubeUrl: cleanedYoutube }, videoUrl: '' });
                    setPlayerUrl(getYouTubeEmbedUrl(cleanedYoutube));
                    setDuration(result.video.duration || 0);
                    return;
                }
                // Si no hay YouTube, cargamos partes locales
                const partToLoad = (result.video.parts && result.video.parts.length > 0)
                    ? result.video.parts[0]
                    : result.video.id;

                const blob = await getVideoBlob(partToLoad);
                if (blob) {
                    const url = URL.createObjectURL(blob);
                    setData({ video: result.video, videoUrl: url });
                } else if (result.blob) {
                    const url = URL.createObjectURL(result.blob);
                    setData({ video: result.video, videoUrl: url });
                } else if (result.video.youtubeUrl) {
                    // Si no hay blob pero hay YouTube, simplemente mostramos el video de YouTube
                    setData({ video: result.video, videoUrl: '' });
                } else {
                    setError('Video no encontrado o procesando.');
                }
            } else {
                setError('Video no encontrado o procesando.');
            }
        } catch (e: any) {
            console.error('Error:', e);
            setError('Error al recuperar datos del servidor.');
        }
    }

    // Cambiar de Parte
    const handleSetPart = async (index: number) => {
        if (!data?.video.parts) return;

        const partName = data.video.parts[index];
        const blob = await getVideoBlob(partName.replace('.mp4', ''));

        if (blob) {
            if (data.videoUrl) URL.revokeObjectURL(data.videoUrl);
            const url = URL.createObjectURL(blob);
            setData({ ...data, videoUrl: url });
            setCurrentPartIndex(index);
            if (videoRef.current) {
                videoRef.current.currentTime = 0;
            }
        }
    };

    useEffect(() => {
        return () => {
            if (data?.videoUrl) {
                URL.revokeObjectURL(data.videoUrl);
            }
        };
    }, [data?.videoUrl]);

    if (!data) return (
        <div className="flex items-center justify-center h-screen bg-[#0f1113]">
            <div className="text-center">
                {error ? (
                    <div className="bg-[#1a1c1e] p-8 rounded-3xl border border-white/5 max-w-sm mx-auto shadow-2xl">
                        <p className="text-xl font-bold mb-4">Lo sentimos</p>
                        <p className="text-gray-400 text-sm mb-6">{error}</p>
                        <button
                            onClick={() => router.push('/')}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-bold transition-all shadow-lg shadow-blue-900/40"
                        >
                            Volver al Inicio
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                        <p className="text-gray-400 font-medium">Cargando análisis inteligente...</p>
                    </div>
                )}
            </div>
        </div>
    );

    const handleTimestampClick = (time: number) => {
        console.log("🎯 Seeking to:", time, "isYoutube:", isYoutube);
        setIsPlaying(true);

        // Actualizar currentTime inmediatamente para que el UI muestre la sección seleccionada
        setCurrentTime(time);

        if (isYoutube && isClient && data?.video.youtubeUrl) {
            try {
                // Actualizar la URL del IFRAME para forzar carga nativa en el minuto exacto
                const newUrl = getYouTubeEmbedUrl(data.video.youtubeUrl, time);
                if (newUrl) setPlayerUrl(newUrl);
            } catch (e) {
                console.warn("Seek error:", e);
            }
        } else if (videoRef.current) {
            videoRef.current.currentTime = time;
            safePlay(videoRef.current);
        }
    };

    const handleGlobalShare = () => {
        if (!data?.video.youtubeUrl) return;

        const youtubeUrl = data.video.youtubeUrl;
        const videoId = youtubeUrl.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/user\/\S+|\/ytscreeningroom\?v=))([\w\-]{11})/)?.[1];

        const timestampUrl = videoId
            ? `https://youtu.be/${videoId}?t=${Math.floor(currentTime)}`
            : `${youtubeUrl}${youtubeUrl.includes('?') ? '&' : '?'}t=${Math.floor(currentTime)}`;

        navigator.clipboard.writeText(timestampUrl);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
    };

    const handleDelete = async () => {
        if (!isAdmin) return;
        if (confirm('¿Estás seguro de que quieres eliminar este video?')) {
            await deleteVideo(id as string);
            router.push('/admin/videos');
        }
    };

    const hasParts = data.video.parts && data.video.parts.length > 1;
    const isYoutube = !!data.video.youtubeUrl;

    return (
        <div className="h-screen flex flex-col bg-[#0f1113] text-white overflow-hidden">
            {/* Header Premium */}
            <header className="bg-black/40 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center justify-between shrink-0 z-10">
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => router.push('/admin/videos')}
                        className="p-2.5 hover:bg-white/5 rounded-2xl transition-all border border-transparent hover:border-white/5 group"
                    >
                        <ChevronLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold tracking-tight line-clamp-1 max-w-xl">
                            {data.video.title}
                        </h1>
                        <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Análisis de Video IA</p>
                            {isYoutube ? (
                                <span className="text-[10px] bg-red-600/20 text-red-400 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                    <Youtube size={10} /> YouTube Sync
                                </span>
                            ) : hasParts && (
                                <span className="text-[10px] bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded-full font-bold">
                                    Parte {currentPartIndex + 1} de {data.video.parts?.length}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {isYoutube && (
                        <button
                            onClick={handleGlobalShare}
                            className={`p-3 rounded-2xl transition-all border ${shareCopied ? 'bg-green-500/20 text-green-400 border-green-500/20' : 'hover:bg-white/5 text-gray-400 hover:text-white border-transparent hover:border-white/5'}`}
                            title="Compartir momento actual"
                        >
                            {shareCopied ? <Check size={20} /> : <Share2 size={20} />}
                        </button>
                    )}
                    {!isYoutube && (
                        <button
                            onClick={() => {
                                const a = document.createElement('a');
                                a.href = data.videoUrl;
                                a.download = data.video.title;
                                a.click();
                            }}
                            className="p-3 hover:bg-white/5 rounded-2xl text-gray-400 hover:text-white transition-all border border-transparent hover:border-white/5"
                            title="Descargar"
                        >
                            <Download size={20} />
                        </button>
                    )}
                    {isAdmin && (
                        <button
                            onClick={handleDelete}
                            className="p-3 hover:bg-red-500/10 rounded-2xl text-gray-500 hover:text-red-500 transition-all border border-transparent hover:border-red-500/10"
                            title="Eliminar permanentemente"
                        >
                            <Trash2 size={20} />
                        </button>
                    )}
                </div>
            </header>

            {/* Main Split Content */}
            <main className="flex-1 flex overflow-hidden">
                {/* Lado Izquierdo: Resumen (50%) */}
                <div className="w-1/2 border-r border-white/5 bg-[#0f1113]">
                    <SummaryPanel
                        summary={data.video.summary}
                        currentTime={currentTime}
                        videoDuration={duration}
                        youtubeUrl={data.video.youtubeUrl}
                        onTimestampClick={handleTimestampClick}
                    />
                </div>

                {/* Lado Derecho: Video (50%) */}
                <div className="w-1/2 bg-[#08090a] flex flex-col items-center justify-center p-12">
                    <div className="w-full max-w-4xl bg-black rounded-[2.5rem] overflow-hidden shadow-2xl shadow-blue-900/10 border border-white/5 aspect-video relative group">
                        {isYoutube && isClient ? (
                            <div className="w-full h-full bg-black">
                                <iframe
                                    src={playerUrl}
                                    className="w-full h-full border-0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    title="YouTube Video Player"
                                />
                            </div>
                        ) : !isYoutube ? (
                            <video
                                ref={videoRef}
                                src={data.videoUrl}
                                controls
                                className="w-full h-full object-contain"
                                onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                                onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-black gap-4">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                                <p className="text-gray-500 text-sm">Iniciando Sync con YouTube...</p>
                            </div>
                        )}
                    </div>

                    {/* Navegación entre Partes */}
                    {!isYoutube && hasParts && (
                        <div className="mt-8 flex items-center gap-4 bg-[#16181a] p-2 rounded-[2rem] border border-white/5 shadow-xl">
                            <button
                                onClick={() => handleSetPart(currentPartIndex - 1)}
                                disabled={currentPartIndex === 0}
                                className="px-6 py-2.5 rounded-2xl font-bold text-sm bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 transition-all"
                            >
                                ← Anterior
                            </button>
                            <div className="px-4 text-xs font-black uppercase tracking-tighter text-gray-500">
                                Parte {currentPartIndex + 1} / {data.video.parts?.length}
                            </div>
                            <button
                                onClick={() => handleSetPart(currentPartIndex + 1)}
                                disabled={currentPartIndex === (data.video.parts?.length || 0) - 1}
                                className="px-6 py-2.5 rounded-2xl font-bold text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-30 transition-all shadow-lg shadow-blue-900/20"
                            >
                                Siguiente →
                            </button>
                        </div>
                    )}

                    <div className="mt-10 text-center text-gray-400 max-w-sm">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/5 rounded-full border border-blue-500/10 mb-4">
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
                            <p className="text-[10px] font-black uppercase tracking-widest text-blue-500/80">Navegación Inteligente</p>
                        </div>
                        <p className="text-sm leading-relaxed text-gray-500">
                            {isYoutube
                                ? "Haz clic en los tiempos del resumen para saltar al minuto exacto en YouTube."
                                : hasParts
                                    ? "Este video largo ha sido dividido para mantener la calidad. Usa los botones de arriba para navegar entre las partes."
                                    : "Usa las marcas de tiempo a la izquierda para saltar a momentos clave. El video se sincroniza automáticamente."
                            }
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
