'use client';

import React, { useState, useRef } from 'react';
import { X, AlertCircle, Upload, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface MediaItem {
    file_url: string;
    file_type: string;
    filename: string;
    thumbnail_url?: string;
}

interface PaqueteCoverDropzoneProps {
    media: MediaItem[];
    onDropFiles: (files: File[]) => Promise<void>;
    onRemoveMedia: () => void;
    isUploading?: boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB para imágenes
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

export function PaqueteCoverDropzone({
    media,
    onDropFiles,
    onRemoveMedia,
    isUploading = false
}: PaqueteCoverDropzoneProps) {
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const dragCounter = useRef(0);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Validar archivo antes de procesar (solo imágenes)
    const validateFile = (file: File): string | null => {
        const isImage = ACCEPTED_IMAGE_TYPES.includes(file.type);

        if (!isImage) {
            return `Tipo de archivo no permitido. Solo se permiten imágenes (JPG, PNG, WEBP, GIF).`;
        }

        if (file.size > MAX_FILE_SIZE) {
            const maxSizeMB = MAX_FILE_SIZE / (1024 * 1024);
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
            const errorMsg = 'Solo se puede subir 1 archivo. Por favor, selecciona solo una imagen.';
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
                    "grid rounded-lg border-2 border-dashed transition-all duration-200 bg-zinc-800/30 overflow-hidden",
                    currentMedia ? "grid-cols-[120px_1fr] gap-0" : "grid-cols-1",
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
                    <div className="relative bg-zinc-900 overflow-hidden group pt-1" style={{ height: '120px', width: '120px', margin: 0 }}>
                        <Image
                            src={currentMedia.file_url}
                            alt={currentMedia.filename}
                            fill
                            className="object-cover"
                            sizes="120px"
                        />

                        {isUploading && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <div className="animate-spin rounded-full h-6 w-6 border-2 border-emerald-400 border-t-transparent"></div>
                            </div>
                        )}

                        {!isUploading && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRemoveMedia();
                                }}
                                className="absolute top-1 right-1 p-1.5 bg-red-500/90 hover:bg-red-500 rounded-full text-white transition-all opacity-0 group-hover:opacity-100 shadow-lg"
                                title="Eliminar carátula"
                            >
                                <X className="h-3 w-3" />
                            </button>
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
                        input.accept = ACCEPTED_IMAGE_TYPES.join(',');
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
                        currentMedia ? "h-full min-h-[120px]" : "h-32",
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
                                    ) : (
                                        <ImageIcon className="h-6 w-6 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
                                    )}
                                </div>
                                <div className="text-sm font-medium text-zinc-300">
                                    {isDragging
                                        ? 'Suelta el archivo aquí'
                                        : currentMedia
                                            ? 'Haz clic o arrastra para reemplazar'
                                            : 'Arrastra una imagen aquí'}
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
