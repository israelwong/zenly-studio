'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, AlertCircle, Upload, ImageIcon, Film } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { APP_CONFIG } from '@/lib/actions/constants/config';

interface CoverDropzoneProps {
    // Media actual
    mediaUrl?: string | null;
    mediaType?: 'image' | 'video' | null;
    filename?: string;
    fileSize?: number;

    // Callbacks
    onDropFiles: (files: File[]) => Promise<void>;
    onRemoveMedia: () => void;

    // Estado
    isUploading?: boolean;

    // Opciones de diseño
    variant?: 'compact' | 'large';  // compact = grid pequeño, large = aspect-video
    aspectRatio?: 'video' | 'square' | 'auto';  // Para variant='large'

    // Opciones de validación
    maxFileSize?: number;  // Default: 100MB
    acceptedImageTypes?: string[];
    acceptedVideoTypes?: string[];

    // Textos personalizables
    helpText?: string;
    placeholderText?: string;
    replaceText?: string;

    // Opciones de UI
    showFileSize?: boolean;
    showHelpText?: boolean;
}

const DEFAULT_MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const DEFAULT_ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const DEFAULT_ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];

export function CoverDropzone({
    mediaUrl,
    mediaType,
    filename,
    fileSize: propFileSize,
    onDropFiles,
    onRemoveMedia,
    isUploading = false,
    variant = 'large',
    aspectRatio = 'video',
    maxFileSize = DEFAULT_MAX_FILE_SIZE,
    acceptedImageTypes = DEFAULT_ACCEPTED_IMAGE_TYPES,
    acceptedVideoTypes = DEFAULT_ACCEPTED_VIDEO_TYPES,
    helpText,
    placeholderText,
    replaceText,
    showFileSize = false,
    showHelpText = true,
}: CoverDropzoneProps) {
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [fileSize, setFileSize] = useState<number | null>(propFileSize || null);
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
        if (propFileSize) {
            setFileSize(propFileSize);
            return;
        }

        if (!mediaUrl) {
            setFileSize(null);
            return;
        }

        // Intentar obtener el tamaño mediante HEAD request
        const fetchFileSize = async () => {
            try {
                const response = await fetch(mediaUrl, { method: 'HEAD' });
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
    }, [mediaUrl, propFileSize]);

    // Validar archivo antes de procesar
    const validateFile = (file: File): string | null => {
        const isImage = acceptedImageTypes.includes(file.type);
        const isVideo = acceptedVideoTypes.includes(file.type);

        if (!isImage && !isVideo) {
            return `Tipo de archivo no permitido. Solo se permiten imágenes (JPG, PNG, WEBP, GIF) o videos (MP4, WEBM, MOV, AVI).`;
        }

        // Validar según tipo específico si no se pasó maxFileSize custom
        const typeSpecificLimit = isImage ? APP_CONFIG.MAX_IMAGE_SIZE : APP_CONFIG.MAX_VIDEO_SIZE;
        const actualLimit = maxFileSize !== DEFAULT_MAX_FILE_SIZE ? maxFileSize : typeSpecificLimit;
        
        if (file.size > actualLimit) {
            const maxSizeMB = actualLimit / (1024 * 1024);
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

    const hasMedia = !!mediaUrl;
    const isCompact = variant === 'compact';
    const aspectClass = aspectRatio === 'video' ? 'aspect-video' : aspectRatio === 'square' ? 'aspect-square' : '';

    // Textos por defecto
    const defaultPlaceholderText = isCompact
        ? 'Arrastra una imagen o video aquí'
        : 'Arrastra una imagen o video, o haz clic para seleccionar';
    const defaultReplaceText = isCompact
        ? 'Haz clic o arrastra para reemplazar'
        : 'Arrastra una imagen o video, o haz clic para seleccionar';
    const defaultHelpText = isCompact
        ? 'O haz clic para seleccionar (máx. 1 archivo)'
        : 'Recomendado: 1920x1080px';

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

            {/* Container según variant */}
            {isCompact ? (
                // Variant compact: Grid con preview pequeño
                <div
                    className={cn(
                        "grid rounded-lg border-2 border-dashed transition-all duration-200 bg-zinc-800/30 overflow-hidden",
                        hasMedia ? "grid-cols-[120px_1fr] gap-0" : "grid-cols-1",
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
                    {hasMedia && (
                        <div className="relative bg-zinc-900 overflow-hidden group pt-1" style={{ height: '120px', width: '120px', margin: 0 }}>
                            {mediaType === 'video' ? (
                                <video
                                    src={mediaUrl}
                                    className="h-full w-full object-cover"
                                    muted
                                    playsInline
                                    preload="metadata"
                                    onLoadedMetadata={(e) => {
                                        const video = e.currentTarget;
                                        video.currentTime = 0.1;
                                    }}
                                />
                            ) : (
                                <Image
                                    src={mediaUrl}
                                    alt={filename || 'Portada'}
                                    fill
                                    className="object-cover"
                                    sizes="120px"
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
                                    title="Eliminar portada"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            )}

                            {/* Mostrar tamaño del archivo */}
                            {showFileSize && fileSize !== null && (
                                <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/70 backdrop-blur-sm rounded text-[10px] text-white font-medium">
                                    {formatBytes(fileSize)}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Dropzone compacto */}
                    <button
                        type="button"
                        onClick={() => {
                            if (isUploading) return;
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = [...acceptedImageTypes, ...acceptedVideoTypes].join(',');
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
                            "relative flex items-center justify-center p-3 rounded-lg text-center transition-colors cursor-pointer group disabled:opacity-50 disabled:cursor-not-allowed",
                            hasMedia ? "h-full min-h-[120px]" : "h-32",
                            isDragging && "bg-emerald-500/10"
                        )}
                    >
                        <div className="flex flex-col items-center gap-1.5">
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
                                        ) : mediaType === 'video' ? (
                                            <Film className="h-6 w-6 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
                                        ) : (
                                            <ImageIcon className="h-6 w-6 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
                                        )}
                                    </div>
                                    <div className="text-sm font-medium text-zinc-300">
                                        {isDragging
                                            ? 'Suelta el archivo aquí'
                                            : hasMedia
                                                ? (replaceText || defaultReplaceText)
                                                : (placeholderText || defaultPlaceholderText)}
                                    </div>
                                    {showHelpText && (
                                        <div className="text-[10px] text-zinc-500 leading-tight">
                                            {isDragging ? '' : (helpText || defaultHelpText)}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </button>
                </div>
            ) : (
                // Variant large: Preview grande aspect-video
                <>
                    {hasMedia ? (
                        <div className="relative group">
                            <div className={cn(
                                "relative bg-zinc-800 rounded-lg overflow-hidden border border-zinc-700",
                                aspectClass || "aspect-video"
                            )}>
                                {mediaType === 'video' ? (
                                    <video
                                        src={mediaUrl}
                                        className="w-full h-full object-cover"
                                        controls
                                    />
                                ) : (
                                    <Image
                                        src={mediaUrl}
                                        alt={filename || 'Portada'}
                                        fill
                                        className="object-cover"
                                    />
                                )}
                                <button
                                    onClick={onRemoveMedia}
                                    className="absolute top-2 right-2 p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <label className="block">
                            <div
                                className={cn(
                                    "border-2 border-dashed rounded-lg transition-colors cursor-pointer flex items-center justify-center bg-zinc-800/30",
                                    aspectClass || "aspect-video",
                                    isDragging
                                        ? "border-emerald-500 bg-emerald-500/10"
                                        : "border-zinc-700 hover:border-emerald-500"
                                )}
                                onDragEnter={handleDragEnter}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                            >
                                {isUploading ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-400 border-t-transparent"></div>
                                        <span className="text-sm text-zinc-400">Subiendo...</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-2 text-zinc-400">
                                        <Upload className="h-8 w-8" />
                                        <span className="text-sm text-center px-4">
                                            {placeholderText || defaultPlaceholderText}
                                        </span>
                                        {showHelpText && (
                                            <span className="text-xs text-zinc-500">
                                                {helpText || defaultHelpText}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                            <input
                                type="file"
                                accept={[...acceptedImageTypes, ...acceptedVideoTypes].join(',')}
                                onChange={handleFileInput}
                                className="hidden"
                                disabled={isUploading}
                            />
                        </label>
                    )}
                </>
            )}
        </div>
    );
}
