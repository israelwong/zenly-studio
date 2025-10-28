'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Trash2, Upload, Loader2 } from 'lucide-react';
import { MediaItem } from '@/types/content-blocks';
import { formatBytes } from '@/lib/utils/storage';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { toast } from 'sonner';

interface ImageSingleProps {
    media?: MediaItem;
    title?: string;
    description?: string;
    className?: string;
    aspectRatio?: 'square' | 'video' | 'portrait' | 'landscape' | 'auto';
    showCaption?: boolean;
    onDelete?: (mediaId: string) => void;
    showDeleteButton?: boolean;
    onMediaChange?: (media: MediaItem | null) => void;
    studioSlug?: string;
    category?: string;
    subcategory?: string;
    // Opción para usar sistema externo de upload
    onDrop?: (files: File[]) => void | Promise<void>;
    isUploading?: boolean;
    showSizeLabel?: boolean;
    showBorder?: boolean;
}

export function ImageSingle({
    media,
    title,
    description,
    className = '',
    aspectRatio = 'square',
    showCaption = false,
    onDelete,
    showDeleteButton = false,
    onMediaChange,
    studioSlug,
    category = 'posts',
    subcategory = 'content',
    onDrop,
    isUploading = false,
    showSizeLabel = true,
    showBorder = true
}: ImageSingleProps) {
    const [isDragOver, setIsDragOver] = useState(false);
    const [imageError, setImageError] = useState(false);
    const { uploadFiles, isUploading: internalIsUploading } = useMediaUpload();

    const aspectRatioClasses = {
        square: 'aspect-square',
        video: 'aspect-video',
        portrait: 'aspect-[3/4]',
        landscape: 'aspect-[4/3]',
        auto: 'aspect-auto'
    };

    const aspectClass = aspectRatioClasses[aspectRatio];

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);

        console.log('ImageSingle handleDrop called');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            // Filtrar solo archivos de imagen
            const imageFiles = Array.from(files).filter(file =>
                file.type.startsWith('image/')
            );

            console.log('Files received:', files.length, 'Image files:', imageFiles.length);

            if (imageFiles.length === 0) {
                toast.error('Solo se permiten archivos de imagen');
                return;
            }

            if (imageFiles.length > 1) {
                toast.error('Solo se puede subir una imagen a la vez');
                return;
            }

            // Si hay un sistema externo de upload, usarlo
            if (onDrop) {
                console.log('Using external onDrop system');
                onDrop(imageFiles);
                return;
            }

            // Si no hay sistema externo, usar el interno
            console.log('Using internal upload system');
            handleImageUpload(imageFiles as unknown as FileList);
        }
    };

    const handleImageUpload = async (files: FileList) => {
        if (!files.length) return;
        if (!studioSlug) {
            toast.error('No se puede subir sin configuración de studio');
            return;
        }

        try {
            const fileArray = Array.from(files);
            const uploadedFiles = await uploadFiles(fileArray, studioSlug, category, subcategory);

            if (uploadedFiles.length > 0 && onMediaChange) {
                // Convertir UploadedFile a MediaItem siguiendo el patrón de MediaUploadZone
                const uploadedFile = uploadedFiles[0];
                const mediaItem: MediaItem = {
                    id: uploadedFile.id,
                    file_url: uploadedFile.url,
                    file_type: 'image',
                    filename: uploadedFile.fileName,
                    storage_path: uploadedFile.url,
                    storage_bytes: fileArray[0]?.size || uploadedFile.size
                };
                onMediaChange(mediaItem);
                toast.success('Imagen subida correctamente');
            }
        } catch (error) {
            console.error("Error uploading image:", error);
            toast.error('Error al subir la imagen');
        }
    };

    const handleImageError = () => {
        setImageError(true);
    };

    const handleDelete = () => {
        if (onDelete && media) {
            onDelete(media.id);
        }
        if (onMediaChange) {
            onMediaChange(null);
        }
    };

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Header */}
            {(title || description) && (
                <div className="text-center">
                    {title && (
                        <h3 className="text-xl font-semibold text-zinc-300 mb-2">
                            {title}
                        </h3>
                    )}
                    {description && (
                        <p className="text-zinc-500">
                            {description}
                        </p>
                    )}
                </div>
            )}

            {/* Image Container */}
            <div
                className={`relative bg-zinc-800 rounded-lg overflow-hidden group ${aspectClass} ${showBorder
                    ? (isDragOver ? 'border-2 border-emerald-500 bg-emerald-500/10' : 'border-2 border-dashed border-zinc-700')
                    : ''
                    }`}
                onDragOver={showBorder ? handleDragOver : undefined}
                onDragLeave={showBorder ? handleDragLeave : undefined}
                onDrop={showBorder ? handleDrop : undefined}
            >
                {/* Loading State */}
                {(isUploading || internalIsUploading) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-800/80 z-20">
                        <div className="text-center">
                            <Loader2 className="h-8 w-8 text-emerald-400 animate-spin mx-auto mb-2" />
                            <p className="text-sm text-zinc-300">Subiendo imagen...</p>
                        </div>
                    </div>
                )}

                {/* Image or Placeholder */}
                {media && !imageError ? (
                    <>
                        {aspectRatio === 'auto' ? (
                            <Image
                                src={media.file_url}
                                alt={media.filename}
                                width={800}
                                height={600}
                                className="w-full h-auto object-contain"
                                sizes="(max-width: 768px) 100vw, 80vw"
                                onError={handleImageError}
                            />
                        ) : (
                        <Image
                            src={media.file_url}
                            alt={media.filename}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, 80vw"
                            onError={handleImageError}
                        />
                        )}

                        {/* Storage Size Label */}
                        {media.storage_bytes && showSizeLabel && (
                            <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                                {formatBytes(media.storage_bytes)}
                            </div>
                        )}

                        {/* Delete Button */}
                        {showDeleteButton && (
                            <button
                                onClick={handleDelete}
                                className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 z-10"
                                title="Eliminar imagen"
                            >
                                <Trash2 className="h-3 w-3" />
                            </button>
                        )}
                    </>
                ) : (
                    /* Placeholder */
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                            <Upload className="h-8 w-8 text-zinc-500 mx-auto mb-2" />
                            <p className="text-sm text-zinc-500">
                                {imageError ? 'Error al cargar imagen' : 'Arrastra una imagen aquí'}
                            </p>
                            <p className="text-xs text-zinc-600 mt-1">
                                Solo archivos de imagen
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Caption */}
            {showCaption && media?.filename && (
                <div className="text-center">
                    <p className="text-sm text-zinc-400">
                        {media.filename}
                    </p>
                </div>
            )}
        </div>
    );
}