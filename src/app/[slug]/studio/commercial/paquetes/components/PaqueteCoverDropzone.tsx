'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, AlertCircle, Upload, ImageIcon, Film } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { APP_CONFIG } from '@/lib/actions/constants/config';

interface MediaItem {
    file_url: string;
    file_type: string;
    filename: string;
    thumbnail_url?: string;
    file_size?: number;
}

interface PaqueteCoverDropzoneProps {
    media: MediaItem[];
    onDropFiles: (files: File[]) => Promise<void>;
    onRemoveMedia: () => void;
    isUploading?: boolean;
}

// Usar el mayor entre imagen y video como límite general
const MAX_FILE_SIZE = Math.max(APP_CONFIG.MAX_IMAGE_SIZE, APP_CONFIG.MAX_VIDEO_SIZE);
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];

export function PaqueteCoverDropzone({
    media,
    onDropFiles,
    onRemoveMedia,
    isUploading = false
}: PaqueteCoverDropzoneProps) {
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [fileSize, setFileSize] = useState<number | null>(null);
    const dragCounter = useRef(0);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Función para formatear bytes
    const formatBytes = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    };

    // Obtener tamaño del archivo si no está disponible
    useEffect(() => {
        const currentMedia = media[0];
        if (!currentMedia) {
            setFileSize(null);
            return;
        }

        // Si ya tiene file_size, usarlo
        if (currentMedia.file_size) {
            setFileSize(currentMedia.file_size);
            return;
        }

        // Intentar obtener el tamaño mediante HEAD request
        const fetchFileSize = async () => {
            try {
                const response = await fetch(currentMedia.file_url, { method: 'HEAD' });
                const contentLength = response.headers.get('content-length');
                if (contentLength) {
                    setFileSize(parseInt(contentLength, 10));
                }
            } catch (err) {
                console.warn('No se pudo obtener el tamaño del archivo:', err);
                setFileSize(null);
            }
        };

        fetchFileSize();
    }, [media]);

    // Validar archivo antes de procesar (imágenes y videos)
    const validateFile = (file: File): string | null => {
        const isImage = ACCEPTED_IMAGE_TYPES.includes(file.type);
        const isVideo = ACCEPTED_VIDEO_TYPES.includes(file.type);

        if (!isImage && !isVideo) {
            return `Tipo de archivo no permitido. Solo se permiten imágenes (JPG, PNG, WEBP, GIF) o videos (MP4, WEBM, MOV, AVI).`;
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

    const currentMedia = media[0] as MediaItem | undefined;

    return (
        <div className="space-y-2">
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
                    "grid rounded-lg border-2 border-dashed transition-all duration-200 bg-zinc-800/30 overflow-hidden",
                    currentMedia ? "grid-cols-[88px_1fr] gap-0" : "grid-cols-1",
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
                    <div className="relative bg-zinc-900 overflow-hidden group pt-0.5" style={{ height: '88px', width: '88px', margin: 0 }}>
                        {currentMedia.file_type === 'video' ? (
                            <video
                                src={currentMedia.file_url}
                                className="h-full w-full object-cover"
                                muted
                                playsInline
                                preload="metadata"
                                onLoadedMetadata={(e) => {
                                    // Asegurar que el video muestre el primer frame
                                    const video = e.currentTarget;
                                    video.currentTime = 0.1;
                                }}
                            />
                        ) : (
                            <Image
                                src={currentMedia.file_url}
                                alt={currentMedia.filename}
                                fill
                                className="object-cover"
                                sizes="88px"
                            />
                        )}

                        {isUploading && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <div className="animate-spin rounded-full h-6 w-6 border-2 border-emerald-400 border-t-transparent"></div>
                            </div>
                        )}

                        {!isUploading && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onRemoveMedia();
                                }}
                                className="absolute top-1 right-1 p-1.5 bg-red-500/90 hover:bg-red-500 rounded-full text-white transition-all opacity-0 group-hover:opacity-100 shadow-lg"
                                title="Eliminar carátula"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        )}

                        {/* Mostrar tamaño del archivo */}
                        {fileSize !== null && (
                            <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/70 backdrop-blur-sm rounded text-[10px] text-white font-medium">
                                {formatBytes(fileSize)}
                            </div>
                        )}
                    </div>
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
                        "relative flex items-center justify-center p-2 rounded-lg text-center transition-colors cursor-pointer group disabled:opacity-50 disabled:cursor-not-allowed",
                        currentMedia ? "h-full min-h-[88px]" : "h-24",
                        isDragging && "bg-emerald-500/10"
                    )}
                >
                    <div className="flex flex-col items-center gap-1">
                        {isUploading ? (
                            <>
                                <div className="animate-spin rounded-full h-6 w-6 border-2 border-emerald-400 border-t-transparent"></div>
                                <div className="text-xs text-emerald-400 font-medium">Subiendo...</div>
                            </>
                        ) : (
                            <>
                                <div className="flex items-center gap-2">
                                    {isDragging ? (
                                        <Upload className="h-6 w-6 text-emerald-400 animate-bounce" />
                                    ) : currentMedia?.file_type === 'video' ? (
                                        <Film className="h-5 w-5 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
                                    ) : (
                                        <ImageIcon className="h-5 w-5 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
                                    )}
                                </div>
                                <div className="text-xs font-medium text-zinc-300">
                                    {isDragging
                                        ? 'Suelta el archivo aquí'
                                        : currentMedia
                                            ? 'Haz clic o arrastra para reemplazar'
                                            : 'Arrastra una imagen o video aquí'}
                                </div>
                                <div className="text-[10px] text-zinc-500 leading-tight">
                                    {isDragging ? '' : 'O haz clic para seleccionar (máx. 1 archivo)'}
                                </div>
                            </>
                        )}
                    </div>
                </button>
            </div>
        </div>
    );
}

