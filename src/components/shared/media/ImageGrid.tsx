'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Trash2, GripVertical, ZoomIn } from 'lucide-react';
import { MediaItem, MediaBlockConfig } from '@/types/content-blocks';
import { formatBytes } from '@/lib/utils/storage';
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    SortableContext,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { arrayMove } from "@dnd-kit/sortable";

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
    onReorder?: (reorderedMedia: MediaItem[]) => void;
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
    onReorder,
    showDeleteButtons = false,
    config = {},
    lightbox = true,
    showTitles = false,
    showSizeLabel = true
}: ImageGridProps) {
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);

    // Drag and drop sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor)
    );

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

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = media.findIndex(item => item.id === active.id);
            const newIndex = media.findIndex(item => item.id === over.id);

            if (oldIndex !== -1 && newIndex !== -1) {
                const reorderedMedia = arrayMove(media, oldIndex, newIndex);
                onReorder?.(reorderedMedia);
            }
        }
    };

    // Componente para cada imagen sortable
    function SortableImageItem({ item, index }: { item: MediaItem; index: number }) {
        const {
            attributes,
            listeners,
            setNodeRef,
            transform,
            transition,
            isDragging,
        } = useSortable({ id: item.id });

        const style = {
            transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
            transition,
        };

        return (
            <div
                ref={setNodeRef}
                style={style}
                className={`relative group ${isDragging ? 'opacity-50' : ''}`}
                {...attributes}
                {...listeners}
            >
                <div className={`relative bg-zinc-800 rounded-lg overflow-hidden ${aspectClass} cursor-grab active:cursor-grabbing`}>
                    <Image
                        src={item.file_url}
                        alt={item.filename}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 50vw"
                    />

                    {/* Drag Handle */}
                    <div className="absolute top-2 left-2 bg-black/70 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        <GripVertical className="h-3 w-3" />
                    </div>

                    {/* Zoom Button for Lightbox */}
                    {configLightbox && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleImageClick(index);
                            }}
                            className="absolute top-2 right-2 bg-black/70 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10"
                            title="Ver en pantalla completa"
                        >
                            <ZoomIn className="h-3 w-3" />
                        </button>
                    )}

                    {/* Storage Size Label */}
                    {item.storage_bytes && showSizeLabel && (
                        <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
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
                            className="absolute bottom-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 z-10"
                            title="Eliminar imagen"
                        >
                            <Trash2 className="h-3 w-3" />
                        </button>
                    )}
                    </div>

                    {/* Caption */}
                    {showCaptions && item.filename && (
                        <div className="mt-2 text-center">
                            <p className="text-sm text-zinc-400 truncate">
                                {item.filename}
                            </p>
                        </div>
                    )}
            </div>
        );
    }

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

            {/* Sortable Grid */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={media.map(item => item.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <div className={`grid ${columnsClass} ${gapClass}`}>
                        {media.map((item, index) => (
                            <SortableImageItem
                                key={item.id}
                                item={item}
                                index={index}
                            />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>

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