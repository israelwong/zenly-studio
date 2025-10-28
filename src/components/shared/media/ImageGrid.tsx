'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Trash2 } from 'lucide-react';
import { MediaItem, MediaBlockConfig } from '@/types/content-blocks';
import { formatBytes } from '@/lib/utils/storage';
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";

interface ImageGridProps {
    media: MediaItem[];
    title?: string;
    description?: string;
    columns?: 1 | 2 | 3 | 4 | 5 | 6;
    gap?: 1 | 2 | 3 | 4 | 6 | 8;
    aspectRatio?: 'square' | 'video' | 'portrait' | 'landscape';
    showCaptions?: boolean;
    className?: string;
    onDelete?: (mediaId: string) => void;
    showDeleteButtons?: boolean;
    // MediaBlockConfig support
    config?: Partial<MediaBlockConfig>;
    lightbox?: boolean;
    showTitles?: boolean;
    showSizeLabel?: boolean;
}

export function ImageGrid({
    media,
    title,
    description,
    columns = 3,
    gap = 4,
    aspectRatio = 'square',
    showCaptions = false,
    className = '',
    onDelete,
    showDeleteButtons = false,
    config = {},
    lightbox = true,
    showTitles = false,
    showSizeLabel = true
}: ImageGridProps) {
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);

    // Use config values if provided, otherwise use props
    const {
        columns: configColumns = columns,
        gap: configGap = gap,
        showTitles: configShowTitles = showTitles,
        lightbox: configLightbox = lightbox
    } = config;

    const gapClass = {
        1: 'gap-1',
        2: 'gap-2',
        3: 'gap-3',
        4: 'gap-4',
        6: 'gap-6',
        8: 'gap-8'
    }[configGap] || 'gap-4';

    const columnsClass = {
        1: 'grid-cols-1',
        2: 'grid-cols-2',
        3: 'grid-cols-3',
        4: 'grid-cols-4',
        5: 'grid-cols-5',
        6: 'grid-cols-6'
    }[configColumns] || 'grid-cols-3';

    const aspectRatioClasses = {
        square: 'aspect-square',
        video: 'aspect-video',
        portrait: 'aspect-[3/4]',
        landscape: 'aspect-[4/3]'
    };

    const aspectClass = aspectRatioClasses[aspectRatio];

    const handleImageClick = (index: number) => {
        if (configLightbox) {
            setLightboxIndex(index);
            setLightboxOpen(true);
        }
    };

    if (!media || media.length === 0) {
        return (
            <div className={`text-center py-8 ${className}`}>
                <p className="text-zinc-500">No hay imágenes disponibles</p>
            </div>
        );
    }

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

            {/* Grid */}
            <div className={`grid ${columnsClass} ${gapClass}`}>
                {media.map((item, index) => (
                    <div
                        key={item.id}
                        className="relative group cursor-pointer"
                        onClick={() => handleImageClick(index)}
                    >
                        <div className={`relative bg-zinc-800 rounded-lg overflow-hidden ${aspectClass}`}>
                            <Image
                                src={item.file_url}
                                alt={item.filename}
                                fill
                                className="object-cover transition-transform group-hover:scale-105"
                                sizes={`(max-width: 768px) ${100 / configColumns}vw, ${80 / configColumns}vw`}
                            />

                            {/* Storage Size Label */}
                            {item.storage_bytes && showSizeLabel && (
                                <div className="absolute top-1 left-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                                    {formatBytes(item.storage_bytes)}
                                </div>
                            )}

                            {/* Delete Button */}
                            {showDeleteButtons && onDelete && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete(item.id);
                                    }}
                                    className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 z-10"
                                    title="Eliminar imagen"
                                >
                                    <Trash2 className="h-2.5 w-2.5" />
                                </button>
                            )}
                        </div>

                        {/* Overlay for lightbox */}
                        {configLightbox && (
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center">
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                    </svg>
                                </div>
                            </div>
                        )}

                        {/* Caption */}
                        {(showCaptions || configShowTitles) && item.filename && (
                            <div className="mt-2">
                                <p className="text-sm text-zinc-400 truncate">
                                    {item.filename}
                                </p>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Lightbox */}
            {configLightbox && (
                <Lightbox
                    open={lightboxOpen}
                    close={() => setLightboxOpen(false)}
                    slides={media.map(item => ({
                        src: item.file_url,
                        alt: item.filename
                    }))}
                    index={lightboxIndex}
                    on={{
                        view: ({ index }) => setLightboxIndex(index),
                    }}
                />
            )}
        </div>
    );
}