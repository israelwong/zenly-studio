'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, AlertCircle, Upload, ImageIcon, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { APP_CONFIG } from '@/lib/actions/constants/config';

interface HeroDropzoneProps {
    media: Array<{ file_url: string; file_type: string; filename: string; thumbnail_url?: string }>;
    onDropFiles: (files: File[]) => Promise<void>;
    onRemoveMedia: () => void;
    isUploading?: boolean;
}

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];

export default function HeroDropzone({
    media,
    onDropFiles,
    onRemoveMedia,
    isUploading = false
}: HeroDropzoneProps) {
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [videoThumbnail, setVideoThumbnail] = useState<string | null>(null);
    const dragCounter = useRef(0);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Validar archivo antes de procesar
    const validateFile = (file: File): string | null => {
        const isImage = ACCEPTED_IMAGE_TYPES.includes(file.type);
        const isVideo = ACCEPTED_VIDEO_TYPES.includes(file.type);

        if (!isImage && !isVideo) {
            return `Tipo de archivo no permitido. Solo imágenes y videos.`;
        }

        // Validar según tipo específico
        const typeSpecificLimit = isImage ? APP_CONFIG.MAX_IMAGE_SIZE : APP_CONFIG.MAX_VIDEO_SIZE;
        
        if (file.size > typeSpecificLimit) {
            const maxSizeMB = typeSpecificLimit / (1024 * 1024);
            return `El archivo es demasiado grande. Máximo: ${maxSizeMB}MB`;
        }

        return null;
    };

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        dragCounter.current++;
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            setIsDragging(true);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        dragCounter.current--;
        if (dragCounter.current === 0) {
            setIsDragging(false);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.types.includes('Files')) {
            setIsDragging(true);
        }
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        dragCounter.current = 0;
        setError(null);

        const files = Array.from(e.dataTransfer.files);
        if (files.length === 0) return;

        if (files.length > 1) {
            const errorMsg = 'Solo se puede subir 1 archivo. Por favor, selecciona solo una imagen o video.';
            setError(errorMsg);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => setError(null), 5000);
            return;
        }

        const file = files[0];
        const validationError = validateFile(file);
        if (validationError) {
            setError(validationError);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => setError(null), 5000);
            return;
        }

        try {
            await onDropFiles(files);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al subir el archivo');
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => setError(null), 5000);
        }
    };

    const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);

        if (files.length === 0) return;

        if (files.length > 1) {
            const errorMsg = 'Solo se puede subir 1 archivo. Por favor, selecciona solo una imagen o video.';
            setError(errorMsg);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => setError(null), 5000);
            e.target.value = '';
            return;
        }

        const file = files[0];
        const validationError = validateFile(file);
        if (validationError) {
            setError(validationError);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => setError(null), 5000);
            e.target.value = '';
            return;
        }

        try {
            await onDropFiles(files);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al subir el archivo');
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => setError(null), 5000);
        }

        e.target.value = '';
    };

    const currentMedia = media[0] as HeroDropzoneProps['media'][0] | undefined;
    const hasThumbnail = currentMedia && 'thumbnail_url' in currentMedia ? currentMedia.thumbnail_url : undefined;

    // Capturar primer frame del video si no hay thumbnail
    useEffect(() => {
        if (currentMedia?.file_type === 'video' && !hasThumbnail && currentMedia.file_url) {
            const video = videoRef.current;
            const canvas = canvasRef.current;

            if (!video || !canvas) return;

            const captureFrame = () => {
                try {
                    video.currentTime = 0.1; // Ir al primer frame
                    const onSeeked = () => {
                        const ctx = canvas.getContext('2d');
                        if (ctx && video.videoWidth > 0 && video.videoHeight > 0) {
                            canvas.width = video.videoWidth;
                            canvas.height = video.videoHeight;
                            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                            setVideoThumbnail(dataUrl);
                        }
                    };
                    video.addEventListener('seeked', onSeeked, { once: true });
                } catch (error) {
                    console.error('Error capturing video frame:', error);
                    setVideoThumbnail(null);
                }
            };

            video.addEventListener('loadedmetadata', captureFrame, { once: true });
            video.load(); // Forzar carga del video

            return () => {
                video.removeEventListener('loadedmetadata', captureFrame);
                setVideoThumbnail(null);
            };
        } else {
            setVideoThumbnail(null);
        }
    }, [currentMedia, hasThumbnail]);

    return (
        <div className="space-y-3">
            {/* Mensaje de error */}
            {error && (
                <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm animate-in slide-in-from-top-2">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <span className="font-medium">Error:</span> {error}
                    </div>
                    <button
                        onClick={() => {
                            setError(null);
                            if (timeoutRef.current) clearTimeout(timeoutRef.current);
                        }}
                        className="text-red-400 hover:text-red-300 transition-colors"
                        aria-label="Cerrar error"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            {/* Grid compacto: Preview + Dropzone */}
            <div
                className={cn(
                    "grid gap-4 rounded-lg border-2 border-dashed transition-all duration-200 bg-zinc-800/30",
                    currentMedia ? "grid-cols-[120px_1fr]" : "grid-cols-1",
                    isDragging
                        ? "border-emerald-500 bg-emerald-500/20"
                        : "border-zinc-700 hover:border-emerald-500/50"
                )}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {/* Preview thumbnail - compacto */}
                {currentMedia && (
                    <>
                        {/* Video oculto para capturar frame */}
                        {currentMedia.file_type === 'video' && (
                            <>
                                <video
                                    ref={videoRef}
                                    src={currentMedia.file_url}
                                    className="hidden"
                                    preload="metadata"
                                    muted
                                    crossOrigin="anonymous"
                                />
                                <canvas ref={canvasRef} className="hidden" />
                            </>
                        )}

                        <div className="relative aspect-square bg-zinc-900 rounded-lg overflow-hidden border border-zinc-700 group">
                            {currentMedia.file_type === 'video' ? (
                                <>
                                    {/* Mostrar thumbnail si existe o fue capturado */}
                                    {(hasThumbnail || videoThumbnail) ? (
                                        <Image
                                            src={videoThumbnail || hasThumbnail || ''}
                                            alt={currentMedia.filename}
                                            fill
                                            className="object-cover"
                                            sizes="120px"
                                            unoptimized={!!videoThumbnail}
                                        />
                                    ) : (
                                        /* Fallback mientras carga */
                                        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
                                            <Video className="h-8 w-8 text-zinc-500" />
                                        </div>
                                    )}
                                    {/* Indicador de video */}
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                                        <div className="bg-black/60 rounded-full p-1.5">
                                            <Video className="h-4 w-4 text-white" />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <Image
                                    src={currentMedia.file_url}
                                    alt={currentMedia.filename}
                                    fill
                                    className="object-cover"
                                    sizes="120px"
                                />
                            )}

                            {/* Overlay de carga */}
                            {isUploading && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-emerald-400 border-t-transparent"></div>
                                </div>
                            )}

                            {/* Botón eliminar */}
                            {!isUploading && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRemoveMedia();
                                    }}
                                    className="absolute top-1 right-1 p-1.5 bg-red-500/90 hover:bg-red-500 rounded-full text-white transition-all opacity-0 group-hover:opacity-100 shadow-lg"
                                    title="Eliminar media"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            )}
                        </div>
                    </>
                )}

                {/* Dropzone */}
                <button
                    type="button"
                    onClick={() => {
                        if (isUploading) return;
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = [...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_VIDEO_TYPES].join(',');
                        input.onchange = (e: Event) => {
                            const target = e.target as HTMLInputElement;
                            const reactEvent = {
                                ...e,
                                target,
                                currentTarget: target,
                                nativeEvent: e,
                                isDefaultPrevented: () => e.defaultPrevented,
                                isPropagationStopped: () => false,
                                persist: () => { }
                            } as React.ChangeEvent<HTMLInputElement>;
                            handleFileInput(reactEvent);
                        };
                        input.click();
                    }}
                    disabled={isUploading}
                    className={cn(
                        "relative flex items-center justify-center p-4 rounded-lg text-center transition-colors cursor-pointer group disabled:opacity-50 disabled:cursor-not-allowed",
                        currentMedia ? "h-full min-h-[120px]" : "h-32",
                        isDragging && "bg-emerald-500/10"
                    )}
                >
                    <div className="flex flex-col items-center gap-2">
                        {isUploading ? (
                            <>
                                <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-400 border-t-transparent"></div>
                                <div className="text-sm text-emerald-400 font-medium">Subiendo...</div>
                            </>
                        ) : (
                            <>
                                <div className="flex items-center gap-3">
                                    {isDragging ? (
                                        <Upload className="h-8 w-8 text-emerald-400 animate-bounce" />
                                    ) : (
                                        <>
                                            <ImageIcon className="h-6 w-6 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
                                            <Video className="h-6 w-6 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
                                        </>
                                    )}
                                </div>
                                <div className="text-sm font-medium text-zinc-300">
                                    {isDragging
                                        ? 'Suelta el archivo aquí'
                                        : currentMedia
                                            ? 'Haz clic o arrastra para reemplazar'
                                            : 'Arrastra imagen o video aquí'}
                                </div>
                                <div className="text-xs text-zinc-500">
                                    {isDragging ? '' : 'O haz clic para seleccionar (máximo 1 archivo, 100MB)'}
                                </div>
                            </>
                        )}
                    </div>
                </button>
            </div>
        </div>
    );
}
