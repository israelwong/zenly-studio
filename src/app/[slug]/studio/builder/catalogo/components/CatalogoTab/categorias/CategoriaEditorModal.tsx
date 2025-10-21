"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { ZenButton, ZenCard, ZenTextarea } from "@/components/ui/zen";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/shadcn/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/shadcn/tabs";
import Lightbox from "yet-another-react-lightbox";
import Video from "yet-another-react-lightbox/plugins/video";
import "yet-another-react-lightbox/styles.css";
import { toast } from "sonner";
import { Trash2, Upload, Loader2, GripVertical, Play } from "lucide-react";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { useStorageTracking } from "@/hooks/useStorageTracking";
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
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
    crearMediaCategoria,
    eliminarMediaCategoria,
    obtenerMediaCategoria,
    reordenarMediaCategoria,
} from "@/lib/actions/studio/builder/catalogo/media-categorias.actions";

interface MediaItem {
    id: string;
    url: string;
    fileName: string;
    size: number;
    isUploading?: boolean;
    progress?: number;
}

interface CategoriaEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: CategoriaFormData) => Promise<void>;
    studioSlug?: string;
    categoria?: {
        id: string;
        name: string;
        description?: string | null;
    } | null;
}

export interface CategoriaFormData {
    id?: string;
    name: string;
    description?: string;
}

/**
 * Modal para crear o editar una categoría del catálogo
 * Modo CREATE: categoria = null
 * Modo EDIT: categoria = { id, name, ... }
 * 
 * Estructura:
 * - Tab 1: Datos (nombre, descripción)
 * - Tab 2: Fotos (galería de imágenes)
 * - Tab 3: Videos (galería de videos)
 */
export function CategoriaEditorModal({
    isOpen,
    onClose,
    onSave,
    studioSlug = "default",
    categoria,
}: CategoriaEditorModalProps) {
    const [formData, setFormData] = useState<CategoriaFormData>({
        name: "",
        description: "",
    });
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [activeTab, setActiveTab] = useState("datos");

    // Media states
    const [fotos, setFotos] = useState<MediaItem[]>([]);
    const [videos, setVideos] = useState<MediaItem[]>([]);
    const [isDraggingFotos, setIsDraggingFotos] = useState(false);
    const [isDraggingVideos, setIsDraggingVideos] = useState(false);

    // Lightbox states - completamente independiente del Sheet
    const [isImageLightboxOpen, setIsImageLightboxOpen] = useState(false);
    const [isVideoLightboxOpen, setIsVideoLightboxOpen] = useState(false);
    const [imageSlides, setImageSlides] = useState<Array<{ src: string; alt: string }>>([]);
    const [videoSlides, setVideoSlides] = useState<Array<{
        type: 'video';
        width: number;
        height: number;
        poster: string;
        sources: Array<{ src: string; type: string }>;
    }>>([]);
    const [lightboxIndex, setLightboxIndex] = useState(0);

    // File inputs refs
    const fotosInputRef = useRef<HTMLInputElement>(null);
    const videosInputRef = useRef<HTMLInputElement>(null);

    // Storage tracking hook
    const { addMediaSize, removeMediaSize, refreshStorageUsage } = useStorageTracking(studioSlug);

    // Media upload hook
    const { uploadFiles, deleteFile, isUploading } = useMediaUpload(
        (bytes, operation) => {
            if (operation === 'add') {
                addMediaSize(bytes);
            } else {
                removeMediaSize(bytes);
            }
        }
    );

    const isEditMode = !!categoria;

    // Cargar datos si es modo edición
    useEffect(() => {
        if (categoria) {
            setFormData({
                id: categoria.id,
                name: categoria.name,
                description: categoria.description || "",
            });
            cargarMediaExistente(categoria.id);
        } else {
            setFormData({
                name: "",
                description: "",
            });
        }
        setErrors({});
        setActiveTab("datos");
        setFotos([]);
        setVideos([]);
    }, [categoria, isOpen]);

    const handleChange = (field: keyof CategoriaFormData, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.name.trim()) {
            newErrors.name = "El nombre es requerido";
        } else if (formData.name.length > 100) {
            newErrors.name = "Máximo 100 caracteres";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            toast.error("Por favor corrige los errores del formulario");
            return;
        }

        setIsSaving(true);

        try {
            await onSave(formData);
            toast.success(
                isEditMode ? "Categoría actualizada correctamente" : "Categoría creada correctamente"
            );
            onClose();
        } catch (error) {
            console.error("Error guardando categoría:", error);
            toast.error(
                error instanceof Error ? error.message : "Error al guardar la categoría"
            );
        } finally {
            setIsSaving(false);
        }
    };

    const handleClose = () => {
        if (!isSaving && !isUploading) {
            onClose();
        }
    };

    // Cargar media existente desde BD
    const cargarMediaExistente = async (categoryId: string) => {
        try {
            const result = await obtenerMediaCategoria(categoryId);
            if (result.success && result.data) {
                const fotosExistentes = result.data
                    .filter((m) => m.file_type === 'IMAGE')
                    .map((m) => ({
                        id: m.id,
                        url: m.file_url,
                        fileName: m.filename,
                        size: Number(m.storage_bytes),
                    }));

                const videosExistentes = result.data
                    .filter((m) => m.file_type === 'VIDEO')
                    .map((m) => ({
                        id: m.id,
                        url: m.file_url,
                        fileName: m.filename,
                        size: Number(m.storage_bytes),
                    }));

                setFotos(fotosExistentes);
                setVideos(videosExistentes);
            }
        } catch (error) {
            console.error("Error cargando media existente:", error);
        }
    };

    // Helper para formatear tamaño
    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
    };

    // Manejar archivos seleccionados (fotos)
    const handleFotosSelected = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        if (!formData.id) {
            toast.error("Guarda la categoría primero antes de subir fotos");
            return;
        }

        const fileArray = Array.from(files);
        const uploadedFotos = await uploadFiles(fileArray, studioSlug, "categorias", `${formData.id}/fotos`);

        // Persistir en BD
        for (const foto of uploadedFotos) {
            const result = await crearMediaCategoria({
                categoryId: formData.id,
                studioId: studioSlug,
                url: foto.url,
                fileName: foto.fileName,
                fileType: 'image',
                size: foto.size,
                mimeType: 'image/jpeg',
            });

            if (!result.success) {
                toast.error(`Error guardando ${foto.fileName}: ${result.error}`);
            }
        }

        // Refrescar storage después de guardar
        await refreshStorageUsage();
        setFotos(prev => [...prev, ...uploadedFotos]);
    };

    // Manejar archivos seleccionados (videos)
    const handleVideosSelected = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        if (!formData.id) {
            toast.error("Guarda la categoría primero antes de subir videos");
            return;
        }

        const fileArray = Array.from(files);
        const uploadedVideos = await uploadFiles(fileArray, studioSlug, "categorias", `${formData.id}/videos`);

        // Persistir en BD
        for (const video of uploadedVideos) {
            const result = await crearMediaCategoria({
                categoryId: formData.id,
                studioId: studioSlug,
                url: video.url,
                fileName: video.fileName,
                fileType: 'video',
                size: video.size,
                mimeType: 'video/mp4',
            });

            if (!result.success) {
                toast.error(`Error guardando ${video.fileName}: ${result.error}`);
            }
        }

        setVideos(prev => [...prev, ...uploadedVideos]);
        await refreshStorageUsage();
    };

    // Eliminar foto
    const handleDeleteFoto = async (id: string) => {
        const foto = fotos.find(f => f.id === id);
        if (!foto || !formData.id) return;

        // Eliminar de Supabase
        const success = await deleteFile(foto.url, studioSlug, foto.size);
        if (success) {
            // Eliminar de BD
            const dbResult = await eliminarMediaCategoria({
                id: foto.id,
                categoryId: formData.id,
            });

            if (dbResult.success) {
                setFotos(fotos.filter(f => f.id !== id));
                await refreshStorageUsage();
            } else {
                toast.error(`Error eliminando foto: ${dbResult.error}`);
            }
        }
    };

    // Eliminar video
    const handleDeleteVideo = async (id: string) => {
        const video = videos.find(v => v.id === id);
        if (!video || !formData.id) return;

        // Eliminar de Supabase
        const success = await deleteFile(video.url, studioSlug, video.size);
        if (success) {
            // Eliminar de BD
            const dbResult = await eliminarMediaCategoria({
                id: video.id,
                categoryId: formData.id,
            });

            if (dbResult.success) {
                setVideos(videos.filter(v => v.id !== id));
                await refreshStorageUsage();
            } else {
                toast.error(`Error eliminando video: ${dbResult.error}`);
            }
        }
    };

    // Manejar drag & drop (fotos)
    const handleFotosDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDraggingFotos(false);
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            // Filtrar solo archivos de imagen
            const imageFiles = Array.from(files).filter(file =>
                file.type.startsWith('image/')
            );
            if (imageFiles.length > 0) {
                await handleFotosSelected(imageFiles as unknown as FileList);
            } else {
                toast.error("Solo se permiten archivos de imagen en la pestaña de fotos");
            }
        }
    };

    // Manejar drag & drop (videos)
    const handleVideosDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDraggingVideos(false);
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            // Filtrar solo archivos de video
            const videoFiles = Array.from(files).filter(file =>
                file.type.startsWith('video/')
            );
            if (videoFiles.length > 0) {
                await handleVideosSelected(videoFiles as unknown as FileList);
            } else {
                toast.error("Solo se permiten archivos de video en la pestaña de videos");
            }
        }
    };

    // Reordenar fotos y persistir en BD
    const handleReorderFotos = async (newFotos: typeof fotos) => {
        setFotos(newFotos);

        // Persistir nuevo orden en BD
        if (formData.id) {
            const mediaIds = newFotos.map(f => f.id);
            const result = await reordenarMediaCategoria(formData.id, mediaIds);

            if (!result.success) {
                toast.error(`Error reordenando fotos: ${result.error}`);
                // Revertir cambios locales
                await cargarMediaExistente(formData.id);
            } else {
                toast.success('Fotos reordenadas correctamente');
            }
        }
    };

    // Reordenar videos y persistir en BD
    const handleReorderVideos = async (newVideos: typeof videos) => {
        setVideos(newVideos);

        // Persistir nuevo orden en BD
        if (formData.id) {
            const mediaIds = newVideos.map(v => v.id);
            const result = await reordenarMediaCategoria(formData.id, mediaIds);

            if (!result.success) {
                toast.error(`Error reordenando videos: ${result.error}`);
                // Revertir cambios locales
                await cargarMediaExistente(formData.id);
            } else {
                toast.success('Videos reordenados correctamente');
            }
        }
    };

    // Componente: Thumbnail Grid con Drag-and-Drop
    const SortableMediaItem = ({ item, type, onDelete }: {
        item: MediaItem;
        type: 'foto' | 'video';
        onDelete: (id: string) => void;
    }) => {
        const {
            attributes,
            listeners,
            setNodeRef,
            transform,
            transition,
            isDragging,
        } = useSortable({ id: item.id });

        const style = {
            transform: CSS.Transform.toString(transform),
            transition,
            opacity: isDragging ? 0.5 : 1,
        };

        const handleOpenLightbox = () => {
            if (type === 'foto') {
                // Lightbox para imágenes
                const slides = fotos.map(f => ({
                    src: f.url,
                    alt: f.fileName
                }));
                const index = fotos.findIndex(f => f.id === item.id);

                setImageSlides(slides);
                setLightboxIndex(Math.max(0, index));
                setIsImageLightboxOpen(true);
            } else {
                // Lightbox para videos
                const slides = videos.map(v => ({
                    type: 'video' as const,
                    width: 800,
                    height: 450,
                    poster: v.url, // Usar el video como poster temporal
                    sources: [
                        {
                            src: v.url,
                            type: 'video/mp4'
                        }
                    ]
                }));
                const index = videos.findIndex(v => v.id === item.id);

                setVideoSlides(slides);
                setLightboxIndex(Math.max(0, index));
                setIsVideoLightboxOpen(true);
            }
        };

        return (
            <div
                ref={setNodeRef}
                style={style}
                className="aspect-square bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden group relative cursor-pointer"
                onClick={handleOpenLightbox}
            >
                {/* Drag handle */}
                <div
                    {...attributes}
                    {...listeners}
                    className="absolute top-1 left-1 bg-zinc-800/80 hover:bg-zinc-700 p-1 rounded cursor-grab active:cursor-grabbing z-10"
                >
                    <GripVertical className="w-4 h-4 text-zinc-400" />
                </div>

                {/* Preview - Show actual image */}
                {type === 'foto' ? (
                    <Image
                        src={item.url}
                        alt={item.fileName}
                        layout="fill"
                        objectFit="cover"
                    />
                ) : (
                    <div className="w-full h-full bg-zinc-800 flex items-center justify-center relative">
                        <video
                            src={item.url}
                            className="w-full h-full object-cover"
                            muted
                            preload="metadata"
                            onError={(e) => {
                                // Si el video no se puede cargar, mostrar fallback
                                const target = e.target as HTMLVideoElement;
                                target.style.display = 'none';
                                const fallback = target.nextElementSibling as HTMLElement;
                                if (fallback) fallback.style.display = 'flex';
                            }}
                        />
                        <div className="absolute inset-0 bg-zinc-800 flex items-center justify-center" style={{ display: 'none' }}>
                            <span className="text-xs text-zinc-500">🎬 {item.fileName}</span>
                        </div>
                        {/* Play icon overlay */}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                                <Play className="w-4 h-4 text-white ml-0.5" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Uploading indicator */}
                {item.isUploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                    </div>
                )}

                {/* Delete button */}
                {!item.isUploading && (
                    <button
                        type="button"
                        onClick={() => onDelete(item.id)}
                        disabled={isUploading}
                        className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-600 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Trash2 className="w-4 h-4 text-white" />
                    </button>
                )}

                {/* Size info */}
                <div className="absolute bottom-1 left-1 right-1 bg-black/60 px-1 py-0.5 rounded text-xs text-zinc-300 truncate">
                    {formatFileSize(item.size)}
                </div>
            </div>
        );
    };

    const MediaGrid = ({
        items,
        onDelete,
        isDragging,
        setIsDragging,
        type,
        onUploadClick,
        onDrop,
        onReorder,
    }: {
        items: MediaItem[];
        onDelete: (id: string) => void;
        isDragging: boolean;
        setIsDragging: (value: boolean) => void;
        type: 'foto' | 'video';
        onUploadClick: () => void;
        onDrop: (e: React.DragEvent) => void;
        onReorder: (newItems: MediaItem[]) => void;
    }) => {
        const sensors = useSensors(
            useSensor(PointerSensor),
            useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
        );

        const handleDragEnd = (event: DragEndEvent) => {
            const { active, over } = event;

            if (over && active.id !== over.id) {
                const oldIndex = items.findIndex(item => item.id === active.id);
                const newIndex = items.findIndex(item => item.id === over.id);

                if (oldIndex !== -1 && newIndex !== -1) {
                    const newItems = arrayMove(items, oldIndex, newIndex);
                    onReorder(newItems);
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
                    onDrop={onDrop}
                >
                    {/* Slot: Subir */}
                    <button
                        type="button"
                        onClick={onUploadClick}
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
                                {type === 'foto' ? 'Subir Fotos' : 'Subir Videos'}
                            </span>
                        </div>
                    </button>

                    {/* Sortable Thumbnails */}
                    <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                        {items.map((item) => (
                            <SortableMediaItem
                                key={item.id}
                                item={item}
                                type={type}
                                onDelete={onDelete}
                            />
                        ))}
                    </SortableContext>
                </div>
            </DndContext>
        );
    };

    return (
        <>
            <Sheet
                open={isOpen}
                onOpenChange={(open) => {
                    // Only handle close (when open = false), let parent handle open
                    // Don't close Sheet if lightbox is open
                    if (!open && !isImageLightboxOpen && !isVideoLightboxOpen) {
                        onClose();
                    }
                }}
                modal={false}
            >
                <SheetContent className="w-full max-w-md bg-zinc-900 border-zinc-800 overflow-y-auto p-0">
                    <SheetHeader className="p-6 pb-4">
                        <SheetTitle className="text-xl font-bold text-zinc-100">
                            {isEditMode ? "Editar Categoría" : "Nueva Categoría"}
                        </SheetTitle>
                    </SheetHeader>

                    {/* Hidden file inputs */}
                    <input
                        ref={fotosInputRef}
                        type="file"
                        multiple
                        accept="image/jpeg,image/png,image/gif"
                        onChange={(e) => handleFotosSelected(e.target.files)}
                        className="hidden"
                    />
                    <input
                        ref={videosInputRef}
                        type="file"
                        multiple
                        accept="video/mp4,video/webm"
                        onChange={(e) => handleVideosSelected(e.target.files)}
                        className="hidden"
                    />

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full px-6">
                        {/* Tab Navigation */}
                        <TabsList className="grid w-full grid-cols-3 bg-zinc-800/50">
                            <TabsTrigger
                                value="datos"
                                className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400"
                            >
                                Datos
                            </TabsTrigger>
                            <TabsTrigger
                                value="fotos"
                                className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400"
                            >
                                Fotos
                            </TabsTrigger>
                            <TabsTrigger
                                value="videos"
                                className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400"
                            >
                                Videos
                            </TabsTrigger>
                        </TabsList>

                        {/* Tab 1: Datos */}
                        <TabsContent value="datos" className="space-y-6 mt-6 pb-6">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Nombre */}
                                <div>
                                    <ZenTextarea
                                        label="Nombre de la categoría"
                                        name="name"
                                        value={formData.name}
                                        onChange={(e) => handleChange("name", e.target.value)}
                                        placeholder="Ej: Retratos"
                                        required
                                        error={errors.name}
                                        disabled={isSaving || isUploading}
                                        maxLength={100}
                                        rows={2}
                                    />
                                </div>

                                {/* Descripción */}
                                <div>
                                    <ZenTextarea
                                        label="Descripción"
                                        name="description"
                                        value={formData.description}
                                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleChange("description", e.target.value)}
                                        placeholder="Describe esta categoría del catálogo..."
                                        minRows={3}
                                        maxLength={500}
                                        disabled={isSaving || isUploading}
                                        hint="Describe brevemente qué tipo de servicios incluye esta categoría"
                                        error={errors.description}
                                    />
                                </div>

                                {/* Información adicional */}
                                <ZenCard className="p-3 bg-zinc-800/50 border-zinc-700">
                                    <p className="text-xs text-zinc-400">
                                        💡 <strong>Tip:</strong> Las categorías te permiten agrupar servicios dentro de una sección
                                    </p>
                                </ZenCard>

                                {/* Botones de acción */}
                                <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                                    <ZenButton
                                        type="button"
                                        variant="secondary"
                                        onClick={handleClose}
                                        disabled={isSaving || isUploading}
                                    >
                                        Cancelar
                                    </ZenButton>
                                    <ZenButton
                                        type="submit"
                                        variant="primary"
                                        loading={isSaving}
                                        loadingText={isEditMode ? "Actualizando..." : "Creando..."}
                                        disabled={isUploading}
                                    >
                                        {isEditMode ? "Actualizar" : "Crear Categoría"}
                                    </ZenButton>
                                </div>
                            </form>
                        </TabsContent>

                        {/* Tab 2: Fotos */}
                        <TabsContent value="fotos" className="space-y-6 mt-6 pb-6">
                            <div className="space-y-4">
                                {/* Galería de Fotos */}
                                <div>
                                    <label className="block text-sm font-medium text-zinc-200 mb-3">
                                        Galería de Fotos
                                    </label>
                                    <MediaGrid
                                        items={fotos}
                                        onDelete={handleDeleteFoto}
                                        isDragging={isDraggingFotos}
                                        setIsDragging={setIsDraggingFotos}
                                        type="foto"
                                        onUploadClick={() => fotosInputRef.current?.click()}
                                        onDrop={handleFotosDrop}
                                        onReorder={handleReorderFotos}
                                    />
                                </div>

                                {/* Info */}
                                <ZenCard className="p-3 bg-blue-500/10 border-blue-500/30">
                                    <p className="text-xs text-blue-300">
                                        📸 Soportados: JPG, PNG, GIF (máx. 5MB cada una)
                                    </p>
                                </ZenCard>

                                {/* Botones de acción */}
                                <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                                    <SheetClose asChild>
                                        <ZenButton
                                            type="button"
                                            variant="secondary"
                                            onClick={handleClose}
                                            disabled={isSaving || isUploading}
                                        >
                                            Cerrar
                                        </ZenButton>
                                    </SheetClose>
                                </div>
                            </div>
                        </TabsContent>

                        {/* Tab 3: Videos */}
                        <TabsContent value="videos" className="space-y-6 mt-6 pb-6">
                            <div className="space-y-4">
                                {/* Galería de Videos */}
                                <div>
                                    <label className="block text-sm font-medium text-zinc-200 mb-3">
                                        Galería de Videos
                                    </label>
                                    <MediaGrid
                                        items={videos}
                                        onDelete={handleDeleteVideo}
                                        isDragging={isDraggingVideos}
                                        setIsDragging={setIsDraggingVideos}
                                        type="video"
                                        onUploadClick={() => videosInputRef.current?.click()}
                                        onDrop={handleVideosDrop}
                                        onReorder={handleReorderVideos}
                                    />
                                </div>

                                {/* Info */}
                                <ZenCard className="p-3 bg-blue-500/10 border-blue-500/30">
                                    <p className="text-xs text-blue-300">
                                        🎬 Soportados: MP4, WebM (máx. 100MB cada uno)
                                    </p>
                                </ZenCard>

                                {/* Botones de acción */}
                                <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                                    <SheetClose asChild>
                                        <ZenButton
                                            type="button"
                                            variant="secondary"
                                            onClick={handleClose}
                                            disabled={isSaving || isUploading}
                                        >
                                            Cerrar
                                        </ZenButton>
                                    </SheetClose>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </SheetContent>
            </Sheet>

            {/* Lightbox para imágenes */}
            <Lightbox
                open={isImageLightboxOpen}
                close={() => setIsImageLightboxOpen(false)}
                slides={imageSlides}
                index={lightboxIndex}
                on={{
                    view: ({ index }) => setLightboxIndex(index),
                }}
            />

            {/* Lightbox para videos */}
            <Lightbox
                open={isVideoLightboxOpen}
                close={() => setIsVideoLightboxOpen(false)}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                slides={videoSlides as any}
                index={lightboxIndex}
                plugins={[Video]}
                video={{
                    controls: true,
                    playsInline: true,
                    autoPlay: true,
                    loop: false,
                    muted: false,
                    disablePictureInPicture: false,
                    disableRemotePlayback: false,
                    controlsList: "nodownload nofullscreen noremoteplayback",
                    crossOrigin: "anonymous",
                    preload: "metadata",
                }}
                on={{
                    view: ({ index }) => setLightboxIndex(index),
                }}
            />
        </>
    );
}
