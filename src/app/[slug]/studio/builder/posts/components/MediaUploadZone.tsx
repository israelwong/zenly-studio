"use client";

import React, { useCallback, useState, useRef } from "react";
import { Upload, Video, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useMediaUpload } from "@/hooks/useMediaUpload";
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

interface MediaItem {
    id: string;
    file_url: string;
    file_type: 'image' | 'video';
    filename: string;
    storage_path: string;
    storage_bytes?: number;
    isUploading?: boolean;
}

// Función para formatear bytes a formato legible
const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

interface MediaUploadZoneProps {
    media: MediaItem[];
    onMediaChange: (media: MediaItem[]) => void;
    studioSlug: string;
    postId?: string; // CUID temporal para nuevos posts
}

export function MediaUploadZone({ media, onMediaChange, studioSlug, postId }: MediaUploadZoneProps) {
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Hook de upload
    const { uploadFiles, isUploading } = useMediaUpload();

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        await handleFileUpload(files);

        // Limpiar input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleFileUpload = async (files: FileList | File[]) => {
        if (!files.length) return;

        try {
            const fileArray = Array.from(files);
            // Usar postId si está disponible para la ruta de upload
            const uploadPath = postId ? `posts/${postId}` : `posts/${studioSlug}`;
            const uploadedFiles = await uploadFiles(fileArray, studioSlug, uploadPath);

            // Convertir a formato MediaItem
            const mediaItems: MediaItem[] = uploadedFiles.map((file, index) => ({
                id: file.id,
                file_url: file.url,
                file_type: file.fileName.toLowerCase().includes('.mp4') || file.fileName.toLowerCase().includes('.mov') ? 'video' as const : 'image' as const,
                filename: file.fileName,
                storage_path: file.url, // Por ahora usar URL como path
                storage_bytes: fileArray[index]?.size || 0, // Agregar tamaño del archivo
                isUploading: false,
            }));

            onMediaChange([...media, ...mediaItems]);
            toast.success(`${uploadedFiles.length} archivo(s) subido(s)`);
        } catch (error) {
            console.error("Error uploading files:", error);
            toast.error("Error al subir archivos");
        }
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            await handleFileUpload(files);
        }
    };

    const removeMedia = (mediaId: string) => {
        console.log('removeMedia called with ID:', mediaId);
        console.log('Current media:', media);
        const filteredMedia = media.filter(m => m.id !== mediaId);
        console.log('Filtered media:', filteredMedia);
        onMediaChange(filteredMedia);
    };

    const handleReorder = (newItems: MediaItem[]) => {
        onMediaChange(newItems);
    };

    // Componente SortableMediaItem
    const SortableMediaItem = ({ item }: { item: MediaItem }) => {
        const {
            attributes,
            listeners,
            setNodeRef,
            transform,
            transition,
            isDragging: isItemDragging,
        } = useSortable({ id: item.id });

        const style = {
            transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
            transition,
            opacity: isItemDragging ? 0.5 : 1,
        };

        return (
            <div
                ref={setNodeRef}
                style={style}
                className="relative group"
                {...attributes}
                {...listeners}
            >
                <div className="aspect-square bg-zinc-800 rounded-lg overflow-hidden cursor-grab">
                    {item.file_type === 'image' ? (
                        <img
                            src={item.file_url}
                            alt={item.filename}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-zinc-700">
                            <Video className="h-6 w-6 text-zinc-400" />
                        </div>
                    )}

                    {/* Overlay de carga */}
                    {item.isUploading && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <Loader2 className="h-6 w-6 text-white animate-spin" />
                        </div>
                    )}

                    {/* Tamaño del archivo */}
                    {item.storage_bytes && (
                        <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                            {formatBytes(item.storage_bytes)}
                        </div>
                    )}
                </div>

                {/* Botón de eliminar */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        console.log('Delete button clicked for item:', item.id);
                        removeMedia(item.id);
                    }}
                    className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-80 hover:opacity-100 transition-all duration-200 shadow-lg z-10"
                    title="Eliminar imagen"
                >
                    <X className="h-3 w-3" />
                </button>

                {/* Nombre del archivo */}
                <p className="text-xs text-zinc-400 mt-1 truncate">
                    {item.filename}
                </p>
            </div>
        );
    };

    // Componente MediaGrid
    const MediaGrid = () => {
        const sensors = useSensors(
            useSensor(PointerSensor),
            useSensor(KeyboardSensor)
        );

        const handleDragEnd = (event: DragEndEvent) => {
            const { active, over } = event;

            if (over && active.id !== over.id) {
                const oldIndex = media.findIndex(item => item.id === active.id);
                const newIndex = media.findIndex(item => item.id === over.id);

                if (oldIndex !== -1 && newIndex !== -1) {
                    const newItems = arrayMove(media, oldIndex, newIndex);
                    handleReorder(newItems);
                }
            }
        };

        return (
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <div
                    className={`grid grid-cols-3 gap-3 p-4 rounded-lg border-2 border-dashed transition-all ${isDragging
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-zinc-700 bg-zinc-800/30"
                        }`}
                    onDragEnter={() => setIsDragging(true)}
                    onDragLeave={() => setIsDragging(false)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                >
                    {/* Slot: Subir */}
                    <button
                        type="button"
                        onClick={handleUploadClick}
                        disabled={isUploading}
                        className="aspect-square bg-zinc-800 border-2 border-dashed border-zinc-700 rounded-lg flex items-center justify-center cursor-pointer hover:bg-zinc-700 hover:border-zinc-600 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <div className="flex flex-col items-center gap-2">
                            {isUploading ? (
                                <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                            ) : (
                                <Upload className="w-6 h-6 text-zinc-400 group-hover:text-zinc-200" />
                            )}
                            <span className="text-xs text-zinc-500 group-hover:text-zinc-300 text-center">
                                Subir Media
                            </span>
                        </div>
                    </button>

                    {/* Sortable Thumbnails */}
                    <SortableContext items={media.map(i => i.id)} strategy={verticalListSortingStrategy}>
                        {media.map((item) => (
                            <SortableMediaItem
                                key={item.id}
                                item={item}
                            />
                        ))}
                    </SortableContext>
                </div>
            </DndContext>
        );
    };

    return (
        <div className="space-y-4">
            <MediaGrid />

            {/* Input oculto para file upload */}
            <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
            />
        </div>
    );
}
