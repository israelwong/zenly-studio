'use client';

import React, { useState, useEffect } from 'react';
import { ImageIcon, Video, X, AlertCircle } from 'lucide-react';

interface HeroDropzoneProps {
    media: Array<{ file_url: string; file_type: string; filename: string }>;
    onDropFiles: (files: File[]) => Promise<void>;
    onRemoveMedia: () => void;
    isUploading?: boolean;
}

export default function HeroDropzone({
    media,
    onDropFiles,
    onRemoveMedia,
    isUploading = false
}: HeroDropzoneProps) {
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [previewFile, setPreviewFile] = useState<{ file: File; url: string; type: 'image' | 'video' } | null>(null);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        setError(null);

        const files = Array.from(e.dataTransfer.files);

        if (files.length === 0) return;

        if (files.length > 1) {
            setError('Solo se puede subir 1 archivo. Por favor, selecciona solo una imagen o video.');
            setTimeout(() => setError(null), 4000);
            return;
        }

        const file = files[0];
        // Crear preview inmediato
        const isVideo = file.type.startsWith('video/');
        const previewUrl = URL.createObjectURL(file);
        setPreviewFile({
            file,
            url: previewUrl,
            type: isVideo ? 'video' : 'image'
        });

        try {
            await onDropFiles(files);
        } finally {
            // Limpiar preview después del upload (se actualizará con el media real)
            setTimeout(() => {
                if (previewUrl) {
                    URL.revokeObjectURL(previewUrl);
                }
                setPreviewFile(null);
            }, 100);
        }
    };

    const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);

        if (files.length === 0) return;

        if (files.length > 1) {
            setError('Solo se puede subir 1 archivo. Por favor, selecciona solo una imagen o video.');
            setTimeout(() => setError(null), 4000);
            return;
        }

        const file = files[0];
        // Crear preview inmediato
        const isVideo = file.type.startsWith('video/');
        const previewUrl = URL.createObjectURL(file);
        setPreviewFile({
            file,
            url: previewUrl,
            type: isVideo ? 'video' : 'image'
        });

        try {
            await onDropFiles(files);
        } finally {
            // Limpiar preview después del upload
            setTimeout(() => {
                if (previewUrl) {
                    URL.revokeObjectURL(previewUrl);
                }
                setPreviewFile(null);
            }, 100);
        }

        // Reset input para permitir seleccionar el mismo archivo de nuevo
        e.target.value = '';
    };

    // Limpiar preview cuando el media real se actualiza
    useEffect(() => {
        if (media.length > 0 && previewFile) {
            // Si ya tenemos el media real, limpiar el preview
            setTimeout(() => {
                if (previewFile.url) {
                    URL.revokeObjectURL(previewFile.url);
                }
                setPreviewFile(null);
            }, 100);
        }
    }, [media, previewFile]);

    // Cleanup al desmontar
    useEffect(() => {
        return () => {
            if (previewFile?.url) {
                URL.revokeObjectURL(previewFile.url);
            }
        };
    }, [previewFile]);

    const currentMedia = previewFile ? null : media[0];
    const showPreview = previewFile || currentMedia;

    return (
        <div className="space-y-3">
            {/* Preview de media existente o preview temporal */}
            {showPreview && (
                <div className="relative">
                    {(previewFile?.type === 'video' || currentMedia?.file_type === 'video') ? (
                        <div className="relative aspect-video rounded-lg overflow-hidden bg-zinc-900">
                            <video
                                src={previewFile?.url || currentMedia?.file_url}
                                className="w-full h-full object-cover"
                                muted
                                loop
                                playsInline
                                key={previewFile?.url || currentMedia?.file_url}
                            />
                            {!previewFile && (
                                <button
                                    onClick={onRemoveMedia}
                                    className="absolute top-2 right-2 p-2 bg-red-500/80 hover:bg-red-500 rounded-full text-white transition-colors"
                                    title="Eliminar media"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="relative">
                            <img
                                src={previewFile?.url || currentMedia?.file_url}
                                alt={previewFile?.file.name || currentMedia?.filename}
                                className="w-full rounded-lg"
                                key={previewFile?.url || currentMedia?.file_url}
                            />
                            {!previewFile && (
                                <button
                                    onClick={onRemoveMedia}
                                    className="absolute top-2 right-2 p-2 bg-red-500/80 hover:bg-red-500 rounded-full text-white transition-colors"
                                    title="Eliminar media"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Mensaje de error */}
            {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Dropzone - siempre visible */}
            <div
                className={`border-2 border-dashed rounded-lg text-center transition-colors cursor-pointer ${
                    isDragging
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-zinc-700 hover:border-emerald-500'
                } ${currentMedia ? 'opacity-50 hover:opacity-100' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*,video/*';
                    input.onchange = (e: Event) => {
                        const target = e.target as HTMLInputElement;
                        const reactEvent = {
                            ...e,
                            target,
                            currentTarget: target,
                            nativeEvent: e,
                            isDefaultPrevented: () => e.defaultPrevented,
                            isPropagationStopped: () => false,
                            persist: () => {}
                        } as React.ChangeEvent<HTMLInputElement>;
                        handleFileInput(reactEvent);
                    };
                    input.click();
                }}
            >
                <div className="p-6 space-y-3">
                    {isUploading ? (
                        <>
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-400 border-t-transparent mx-auto"></div>
                            <div className="text-sm text-zinc-500">Subiendo archivo...</div>
                        </>
                    ) : (
                        <>
                            <div className="flex justify-center gap-4">
                                <ImageIcon className="h-8 w-8 text-zinc-500" />
                                <Video className="h-8 w-8 text-zinc-500" />
                            </div>
                            <div className="text-sm font-medium text-zinc-300">
                                {showPreview ? 'Arrastra otro archivo para reemplazar' : 'Arrastra imagen o video aquí'}
                            </div>
                            <div className="text-xs text-zinc-500">O haz clic para seleccionar (máximo 1 archivo)</div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

