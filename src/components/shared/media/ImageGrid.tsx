'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Trash2, GripVertical, ZoomIn, Upload } from 'lucide-react';
import { MediaItem, MediaBlockConfig } from '@/types/content-blocks';
import { formatBytes } from '@/lib/utils/storage';
import Lightbox from "yet-another-react-lightbox";
import Video from "yet-another-react-lightbox/plugins/video";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragStartEvent,
} from "@dnd-kit/core";
import {
    SortableContext,
    rectSortingStrategy,
    useSortable,
    sortableKeyboardCoordinates,
    arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Componente para mostrar thumbnail de video
function VideoThumbnail({ videoUrl, thumbnailUrl, alt, limitHeight = false, isPreview = false }: { videoUrl: string; thumbnailUrl?: string; alt: string; limitHeight?: boolean; isPreview?: boolean }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [thumbnailDataUrl, setThumbnailDataUrl] = useState<string | null>(null);
    const [hasThumbnail, setHasThumbnail] = useState(!!thumbnailUrl);

    useEffect(() => {
        // Si hay thumbnail_url, usarlo directamente
        if (thumbnailUrl) {
            setHasThumbnail(true);
            return;
        }

        // Si no hay thumbnail, intentar capturar el primer frame
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
                        setThumbnailDataUrl(dataUrl);
                        setHasThumbnail(true);
                    }
                };
                video.addEventListener('seeked', onSeeked, { once: true });
            } catch (error) {
                console.error('Error capturing video frame:', error);
            }
        };

        video.addEventListener('loadedmetadata', captureFrame, { once: true });
        video.load(); // Forzar carga del video

        return () => {
            video.removeEventListener('loadedmetadata', captureFrame);
        };
    }, [videoUrl, thumbnailUrl]);

    return (
        <>
            {/* Video oculto para capturar frame */}
            <video
                ref={videoRef}
                src={videoUrl}
                className="hidden"
                preload="metadata"
                muted
                crossOrigin="anonymous"
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Mostrar thumbnail si existe o fue capturado */}
            {hasThumbnail ? (
                <div className={isPreview ? "relative w-full" : "absolute inset-0"}>
                    {thumbnailUrl ? (
                        isPreview ? (
                            <img
                                src={thumbnailUrl}
                                alt={alt}
                                className="object-contain w-full h-auto"
                            />
                        ) : (
                            <Image
                                src={thumbnailUrl}
                                alt={alt}
                                fill
                                className="object-contain"
                                sizes="(max-width: 768px) 100vw, 50vw"
                            />
                        )
                    ) : thumbnailDataUrl ? (
                        isPreview ? (
                            <img
                                src={thumbnailDataUrl}
                                alt={alt}
                                className="object-contain w-full h-auto"
                            />
                        ) : (
                            <Image
                                src={thumbnailDataUrl}
                                alt={alt}
                                fill
                                className="object-contain"
                                sizes="(max-width: 768px) 100vw, 50vw"
                                unoptimized
                            />
                        )
                    ) : null}
                    {/* Indicador de video */}
                    <div className={isPreview ? "absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none" : "absolute inset-0 flex items-center justify-center bg-black/20"}>
                        <div className="bg-black/60 rounded-full p-2">
                            <svg
                                className="w-6 h-6 text-white"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        </div>
                    </div>
                </div>
            ) : (
                // Fallback: mostrar fondo con indicador mientras carga
                <div className={isPreview ? "relative w-full h-32 bg-zinc-900 flex items-center justify-center" : "absolute inset-0 bg-zinc-900 flex items-center justify-center"}>
                    <div className="bg-black/60 rounded-full p-2">
                        <svg
                            className="w-6 h-6 text-white"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path d="M8 5v14l11-7z" />
                        </svg>
                    </div>
                </div>
            )}
        </>
    );
}

interface ImageGridProps {
    media: MediaItem[];
    title?: string;
    description?: string;
    columns?: 1 | 2 | 3 | 4 | 5 | 6;
    gap?: 0 | 1 | 2 | 3 | 4 | 6 | 8;
    aspectRatio?: 'square' | 'video' | 'portrait' | 'landscape';
    showCaptions?: boolean;
    className?: string;
    onDelete?: (mediaId: string) => void;
    onReorder?: (reorderedMedia: MediaItem[]) => void;
    showDeleteButtons?: boolean;
    isEditable?: boolean; // Controla si se puede ordenar
    // MediaBlockConfig support
    config?: Partial<MediaBlockConfig>;
    lightbox?: boolean;
    showTitles?: boolean;
    showSizeLabel?: boolean;
    // Dropzone props
    onDrop?: (files: File[]) => void;
    onUploadClick?: () => void;
    // Upload state
    isUploading?: boolean;
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
    isEditable = true,
    config = {},
    lightbox = true,
    showTitles: _showTitles, // eslint-disable-line @typescript-eslint/no-unused-vars
    showSizeLabel = true,
    onDrop,
    onUploadClick,
    isUploading = false
}: ImageGridProps) {
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const [activeId, setActiveId] = useState<string | null>(null);

    // Drag and drop sensors con configuración mejorada para animaciones suaves
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Use config values if provided, otherwise use props
    const {
        columns: configColumns = columns,
        gap: configGap = gap,
        lightbox: configLightbox = lightbox,
        borderStyle = 'rounded'
    } = config;

    const borderStyleClass = borderStyle === 'rounded' ? 'rounded-lg' : 'rounded-none';

    const gapClass = {
        0: 'gap-0',
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

    // Detectar si hay múltiples videos para limitar altura
    const hasMultipleVideos = media.length > 1 && media.some(item => item.file_type === 'video');

    const handleImageClick = (index: number) => {
        if (configLightbox) {
            setLightboxIndex(index);
            setLightboxOpen(true);
        }
    };

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        setActiveId(String(active.id));
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

        setActiveId(null);
    };

    // Componente para cada imagen sortable con animaciones mejoradas
    function SortableImageItem({ item, index }: { item: MediaItem; index: number }) {
        const {
            attributes,
            listeners,
            setNodeRef,
            transform,
            transition,
            isDragging,
        } = useSortable({ id: item.id });

        const isActive = activeId === item.id;
        const isBeingReplaced = activeId !== null && activeId !== item.id;

        // Estilo con transformación suave usando CSS.Transform
        const style = {
            transform: CSS.Transform.toString(transform),
            transition: isDragging
                ? undefined // Sin transición mientras se arrastra para respuesta inmediata
                : transition || 'transform 300ms cubic-bezier(0.4, 0.0, 0.2, 1)', // Animación suave para empujar items
            zIndex: isDragging ? 1000 : isBeingReplaced ? 10 : 'auto',
            opacity: isDragging ? 0.8 : 1,
        };

        return (
            <div
                ref={setNodeRef}
                style={style}
                className={`relative group ${isDragging || isActive
                    ? 'scale-105 shadow-2xl z-50'
                    : isBeingReplaced
                        ? 'scale-[1.01]'
                        : 'scale-100'
                    } transition-all duration-300 ease-out`}
                {...(isEditable ? { ...attributes, ...listeners } : {})}
                suppressHydrationWarning
                onMouseDown={(e) => {
                    // Si el click es en el botón eliminar, no iniciar drag
                    if (e.target instanceof HTMLElement && e.target.closest('button[title="Eliminar imagen"]')) {
                        e.stopPropagation();
                        return;
                    }
                    // Si el click es en el botón de zoom, no iniciar drag
                    if (e.target instanceof HTMLElement && e.target.closest('button[title="Ver en pantalla completa"]')) {
                        e.stopPropagation();
                        return;
                    }
                }}
            >
                <div
                    className={`relative ${isEditable ? 'bg-zinc-800' : ''} ${borderStyleClass} overflow-hidden ${
                        isEditable 
                            ? 'aspect-square' 
                            : configColumns === 1 
                                ? '' // Si solo hay 1 item, no forzar aspecto - usar h-auto
                                : (item.file_type === 'video' ? '' : aspectClass)
                    } transition-all duration-200 ease-out ${isEditable
                        ? 'cursor-grab active:cursor-grabbing hover:scale-[1.02] hover:shadow-lg'
                        : 'cursor-pointer hover:scale-[1.02] hover:shadow-lg'
                        } ${isDragging ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}`}
                    style={item.file_type === 'video' && !isEditable ? (hasMultipleVideos ? { maxHeight: '400px', minHeight: '200px' } : {}) : {}}
                    onClick={!isEditable && configLightbox ? () => handleImageClick(index) : undefined}
                >
                    {item.file_type === 'video' ? (
                        configColumns === 1 ? (
                            <video
                                src={item.file_url}
                                className="w-full h-auto"
                                controls
                                poster={item.thumbnail_url}
                            />
                        ) : (
                            <VideoThumbnail
                                videoUrl={item.file_url}
                                thumbnailUrl={item.thumbnail_url}
                                alt={item.filename}
                                limitHeight={hasMultipleVideos}
                                isPreview={!isEditable}
                            />
                        )
                    ) : (
                        configColumns === 1 ? (
                            <Image
                                src={item.file_url}
                                alt={item.filename}
                                width={800}
                                height={600}
                                className="w-full h-auto object-contain"
                                sizes="100vw"
                            />
                        ) : (
                            <Image
                                src={item.file_url}
                                alt={item.filename}
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 100vw, 50vw"
                            />
                        )
                    )}

                    {/* Drag Handle */}
                    {isEditable && (
                        <div className="absolute top-2 left-2 bg-black/70 text-white p-1 rounded">
                            <GripVertical className="h-3 w-3" />
                        </div>
                    )}

                    {/* Zoom Button for Lightbox - Solo en modo no editable */}
                    {configLightbox && !isEditable && (
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

                    {/* Delete Button - Fuera del área dragable */}
                    {showDeleteButtons && onDelete && (
                        <button
                            onClick={(e) => {
                                console.log('Delete button clicked for item:', item.id);
                                console.log('Current media array:', media.map(m => m.id));
                                console.log('Item to delete:', item);
                                e.preventDefault();
                                e.stopPropagation();
                                onDelete(item.id);
                            }}
                            onMouseDown={(e) => {
                                e.stopPropagation();
                            }}
                            className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 z-30"
                            title="Eliminar imagen"
                            style={{
                                pointerEvents: 'auto',
                                touchAction: 'none'
                            }}
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

    // Removido: lógica que ocultaba el dropzone cuando no hay media
    // Ahora siempre mostramos el dropzone para permitir subir archivos

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

            {/* Grid con Dropzone integrado - Siguiendo patrón ItemEditorModal */}
            {isEditable ? (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    <div
                        className={`grid ${columnsClass} ${gapClass} ${configGap === 0 && media.length > 0 ? 'p-0' : 'p-4'} rounded-lg border-2 border-dashed transition-all duration-300 ease-out border-zinc-700 bg-zinc-800/30`}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                            e.preventDefault();
                            const files = Array.from(e.dataTransfer.files);
                            if (files.length > 0 && onDrop) {
                                onDrop(files);
                            }
                        }}
                    >
                        {/* Sortable Items existentes */}
                        <SortableContext
                            key={media.map(item => item.id).join('-')} // Forzar re-render cuando cambien los IDs
                            items={media.map(item => item.id)}
                            strategy={rectSortingStrategy}
                        >
                            {media.map((item, index) => (
                                <SortableImageItem
                                    key={item.id}
                                    item={item}
                                    index={index}
                                />
                            ))}
                        </SortableContext>

                        {/* Slot de Upload - Siempre visible en editor */}
                        {isEditable && (
                            <button
                                type="button"
                                className={`relative bg-zinc-800 ${borderStyleClass} text-center hover:bg-zinc-700 transition-colors ${media.length === 0 ? 'col-span-full h-32' : 'w-24 h-24'} border-2 border-dashed border-zinc-600 hover:border-emerald-500 cursor-pointer group disabled:opacity-50 disabled:cursor-not-allowed`}
                                onClick={() => {
                                    if (onUploadClick && !isUploading) {
                                        onUploadClick();
                                    }
                                }}
                                disabled={isUploading}
                            >
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="text-center">
                                        {isUploading ? (
                                            <>
                                                <div className="animate-spin rounded-full h-6 w-6 border-2 border-emerald-400 border-t-transparent mx-auto mb-1"></div>
                                                <div className="text-xs text-emerald-400">
                                                    Subiendo...
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="h-5 w-5 text-zinc-500 mx-auto mb-1 group-hover:text-emerald-400" />
                                                <div className="text-xs text-zinc-500 group-hover:text-emerald-400">
                                                    {media.length === 0 ? 'Arrastra aquí' : 'Agregar'}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </button>
                        )}
                    </div>
                </DndContext>
            ) : (
                // Si solo hay 1 item, no usar grid - renderizar directamente en full width
                media.length === 1 ? (
                    <div className="w-full" key={media[0].id}>
                        {media[0].file_type === 'video' ? (
                            <div className="relative w-full">
                                <video
                                    src={media[0].file_url}
                                    className="w-full h-auto rounded-lg"
                                    controls
                                    autoPlay
                                    muted
                                    playsInline
                                    loop
                                    poster={media[0].thumbnail_url}
                                />
                            </div>
                        ) : (
                            <div className="relative w-full">
                                <Image
                                    src={media[0].file_url}
                                    alt={media[0].filename}
                                    width={800}
                                    height={600}
                                    className="w-full h-auto object-contain rounded-lg"
                                    sizes="100vw"
                                />
                            </div>
                        )}
                    </div>
                ) : (
                    <div className={`grid ${columnsClass} ${gapClass}`} key={media.map(item => item.id).join('-')}>
                        {media.map((item, index) => (
                            <SortableImageItem
                                key={item.id}
                                item={item}
                                index={index}
                            />
                        ))}
                    </div>
                )
            )}

            {/* Lightbox - Solo en modo no editable */}
            {configLightbox && !isEditable && (
                <Lightbox
                    open={lightboxOpen}
                    close={() => setLightboxOpen(false)}
                    slides={media.map(item => {
                        if (item.file_type === 'video') {
                            return {
                                type: 'video' as const,
                                sources: [{
                                    src: item.file_url,
                                    type: 'video/mp4'
                                }],
                                poster: item.thumbnail_url || item.file_url,
                                autoPlay: true,
                                muted: false,
                                controls: true,
                                playsInline: true
                            };
                        }
                        return {
                            src: item.file_url,
                            alt: item.filename
                        };
                    })}
                    plugins={[Video, Zoom]}
                    video={{
                        controls: true,
                        playsInline: true,
                        autoPlay: true,
                        muted: false,
                        loop: false
                    }}
                    index={lightboxIndex}
                    on={{
                        view: ({ index }) => setLightboxIndex(index),
                    }}
                    controller={{
                        closeOnPullDown: true,
                        closeOnBackdropClick: true
                    }}
                    styles={{
                        container: {
                            backgroundColor: "rgba(0, 0, 0, .98)",
                            padding: 0
                        },
                        slide: {
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '100vw',
                            height: '100vh',
                            padding: 0,
                            margin: 0
                        } as React.CSSProperties & Partial<Record<`--yarl__${string}`, string | number>>
                    } as Record<string, React.CSSProperties & Partial<Record<`--yarl__${string}`, string | number>>>}
                />
            )}
        </div>
    );
}