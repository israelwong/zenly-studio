'use client';

import React, { useRef } from 'react';
import { Trash2, Play } from 'lucide-react';
import { MediaBlockConfig } from '@/types/content-blocks';
import { formatBytes } from '@/lib/utils/storage';

interface VideoSingleProps {
    src: string;
    config?: Partial<MediaBlockConfig>;
    className?: string;
    storageBytes?: number;
    onDelete?: () => void;
    showDeleteButton?: boolean;
    showSizeLabel?: boolean;
}

export function VideoSingle({
    src,
    config = {},
    className = '',
    storageBytes,
    onDelete,
    showDeleteButton = false,
    showSizeLabel = true
}: VideoSingleProps) {
    const videoRef = useRef<HTMLVideoElement>(null);

    const {
        autoPlay = true,
        muted = true,
        loop = true,
        poster,
        maxWidth = 'max-w-screen-md'
    } = config;

    // No renderizar si no hay src válido
    if (!src || src.trim() === '') {
        return (
            <div className={`${maxWidth} mx-auto ${className}`}>
                <div className="w-full h-48 bg-zinc-800 rounded-lg flex items-center justify-center">
                    <p className="text-zinc-500">No hay video disponible</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`${maxWidth} mx-auto ${className}`}>
            <div className="relative group">
                <video
                    ref={videoRef}
                    className="w-full rounded-lg"
                    preload="auto"
                    autoPlay={autoPlay}
                    loop={loop}
                    muted={muted}
                    playsInline
                    poster={poster}
                    controls
                >
                    <source src={src} />
                    Tu navegador no soporta el elemento de video.
                </video>

                {/* Storage Size Label */}
                {storageBytes && showSizeLabel && (
                    <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                        {formatBytes(storageBytes)}
                    </div>
                )}

                {/* Delete Button */}
                {showDeleteButton && onDelete && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                        className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 z-10"
                        title="Eliminar video"
                    >
                        <Trash2 className="h-3 w-3" />
                    </button>
                )}
            </div>
        </div>
    );
}
