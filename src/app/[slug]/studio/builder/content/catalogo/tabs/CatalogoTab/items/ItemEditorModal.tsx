"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import { ZenButton, ZenInput, ZenCard, ZenTextarea, ZenSelect, ZenSwitch } from "@/components/ui/zen";
import { ZenConfirmModal } from "@/components/ui/zen/overlays/ZenConfirmModal";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/shadcn/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/shadcn/tabs";
import Lightbox from "yet-another-react-lightbox";
import Video from "yet-another-react-lightbox/plugins/video";
import "yet-another-react-lightbox/styles.css";
import { toast } from "sonner";
import { Trash2, Upload, Loader2, GripVertical, Play, Save, Plus, Minus, Calculator, Image as ImageIcon } from "lucide-react";
import { calcularPrecio, formatearMoneda, type ConfiguracionPrecios, type ResultadoPrecio } from "@/lib/actions/studio/builder/catalogo/calcular-precio";
import { obtenerConfiguracionPrecios } from "@/lib/actions/studio/builder/catalogo/utilidad.actions";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { useStorageTracking } from "@/hooks/useStorageTracking";
import { useStorageRefresh } from "@/hooks/useStorageRefresh";
import {
    crearItem,
    actualizarItem,
} from "@/lib/actions/studio/builder/catalogo";
import { toggleItemPublish } from "@/lib/actions/studio/builder/catalogo/items.actions";
import {
    obtenerMediaItem,
    crearMediaItem,
    eliminarMediaItem,
    reordenarMediaItem
} from "@/lib/actions/studio/builder/catalogo/media-items.actions";
import { deleteFileStorage } from "@/lib/actions/shared/media.actions";
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
    sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { arrayMove } from "@dnd-kit/sortable";

interface MediaItem {
    id: string;
    url: string;
    fileName: string;
    isUploading?: boolean;
}

interface Gasto {
    nombre: string;
    costo: number;
}

export interface ItemFormData {
    id?: string;
    name: string;
    cost: number;
    description?: string;
    categoriaeId?: string;
    tipoUtilidad?: 'servicio' | 'producto';
    gastos?: Gasto[];
    status?: string;
}

interface ItemEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave?: (data: ItemFormData) => Promise<void>;
    onMediaChange?: (itemId: string, hasPhotos: boolean, hasVideos: boolean) => void;
    onStatusChange?: (itemId: string, status: string) => void;
    item?: ItemFormData;
    studioSlug: string;
    categoriaId: string;
    preciosConfig?: ConfiguracionPrecios;
}

/**
 * Modal para crear/editar items con gestión completa de multimedia
 * Incluye tabs para datos, fotos y videos con drag & drop
 */
export function ItemEditorModal({
    isOpen,
    onClose,
    onSave,
    onMediaChange,
    onStatusChange,
    item,
    studioSlug,
    categoriaId,
    preciosConfig,
}: ItemEditorModalProps) {
    // Estados del formulario
    const [formData, setFormData] = useState<ItemFormData>({
        name: "",
        cost: 0,
        description: "",
        categoriaeId: categoriaId,
        tipoUtilidad: "servicio",
        gastos: [],
    });

    // Estados para gastos
    const [gastos, setGastos] = useState<Gasto[]>([]);
    const [nuevoGastoNombre, setNuevoGastoNombre] = useState("");
    const [nuevoGastoCosto, setNuevoGastoCosto] = useState("");
    const [showDesglosePrecios, setShowDesglosePrecios] = useState(false);
    const [configuracion, setConfiguracion] = useState<ConfiguracionPrecios | null>(preciosConfig || null);

    // Tipos de utilidad disponibles
    const tiposUtilidad = [
        { value: "servicio", label: "Servicio" },
        { value: "producto", label: "Producto" }
    ];

    // Estados de multimedia
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

    // Estados de UI
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isDeleteFotoModalOpen, setIsDeleteFotoModalOpen] = useState(false);
    const [isDeleteVideoModalOpen, setIsDeleteVideoModalOpen] = useState(false);
    const [fotoToDelete, setFotoToDelete] = useState<string | null>(null);
    const [videoToDelete, setVideoToDelete] = useState<string | null>(null);
    const [isDeletingMedia, setIsDeletingMedia] = useState(false);

    // Hooks
    const { uploadFiles } = useMediaUpload();
    const { refreshStorageUsage } = useStorageTracking(studioSlug);
    const { triggerRefresh } = useStorageRefresh(studioSlug);

    // Cargar configuración de precios del estudio
    useEffect(() => {
        const cargarConfiguracion = async () => {
            if (!configuracion && !preciosConfig) {
                try {
                    const config = await obtenerConfiguracionPrecios(studioSlug);
                    if (config) {
                        setConfiguracion({
                            utilidad_servicio: parseFloat(config.utilidad_servicio),
                            utilidad_producto: parseFloat(config.utilidad_producto),
                            comision_venta: parseFloat(config.comision_venta),
                            sobreprecio: parseFloat(config.sobreprecio),
                        });
                    } else {
                        // Configuración por defecto si no existe
                        setConfiguracion({
                            utilidad_servicio: 0.30,
                            utilidad_producto: 0.40,
                            comision_venta: 0.10,
                            sobreprecio: 0.05,
                        });
                    }
                } catch (error) {
                    console.error("Error cargando configuración de precios:", error);
                    // Usar configuración por defecto en caso de error
                    setConfiguracion({
                        utilidad_servicio: 0.30,
                        utilidad_producto: 0.40,
                        comision_venta: 0.10,
                        sobreprecio: 0.05,
                    });
                }
            }
        };

        cargarConfiguracion();
    }, [studioSlug, preciosConfig, configuracion]);

    // Cálculo dinámico de precios
    const resultadoPrecio: ResultadoPrecio = useMemo(() => {
        if (!configuracion) {
            return {
                precio_final: 0,
                precio_base: 0,
                costo: 0,
                gasto: 0,
                utilidad_base: 0,
                subtotal: 0,
                monto_comision: 0,
                monto_sobreprecio: 0,
                porcentaje_utilidad: 0,
                porcentaje_comision: 0,
                porcentaje_sobreprecio: 0,
                utilidad_real: 0,
                porcentaje_utilidad_real: 0,
            };
        }

        const costoNum = formData.cost || 0;
        const gastosArray = gastos.map((g) => g.costo);
        const totalGastos = gastosArray.reduce((acc, g) => acc + g, 0);

        return calcularPrecio(
            costoNum,
            totalGastos,
            formData.tipoUtilidad || 'servicio',
            configuracion
        );
    }, [formData.cost, formData.tipoUtilidad, gastos, configuracion]);

    // Cargar media existente desde BD
    const cargarMediaExistente = async (itemId: string) => {
        try {
            const result = await obtenerMediaItem(itemId);
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

    // Reset form when modal opens/closes or item changes
    useEffect(() => {
        if (isOpen) {
            if (item) {
                setFormData({
                    id: item.id,
                    name: item.name,
                    cost: item.cost,
                    description: item.description || "",
                    categoriaeId: categoriaId,
                    tipoUtilidad: item.tipoUtilidad || "servicio",
                    gastos: item.gastos || [],
                    status: item.status || "active",
                });
                setGastos(item.gastos?.map((g) => ({ nombre: g.nombre, costo: g.costo })) || []);
                // Cargar media existente si es edición
                if (item.id) {
                    cargarMediaExistente(item.id);
                }
            } else {
                setFormData({
                    name: "",
                    cost: 0,
                    description: "",
                    categoriaeId: categoriaId,
                    tipoUtilidad: "servicio",
                    gastos: [],
                    status: "active",
                });
                setGastos([]);
                setFotos([]);
                setVideos([]);
            }
        }
    }, [isOpen, item, categoriaId]); // item.status también está incluido en item

    // Reset lightbox when sheet opens to prevent auto-opening
    useEffect(() => {
        if (isOpen) {
            setIsImageLightboxOpen(false);
            setIsVideoLightboxOpen(false);
        }
    }, [isOpen]);

    const handleInputChange = (field: keyof ItemFormData, value: string | number) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Funciones para manejar gastos
    const agregarGasto = () => {
        if (!nuevoGastoNombre.trim() || !nuevoGastoCosto) return;

        const nuevoGasto: Gasto = {
            nombre: nuevoGastoNombre.trim(),
            costo: parseFloat(nuevoGastoCosto) || 0,
        };

        const nuevosGastos = [...gastos, nuevoGasto];
        setGastos(nuevosGastos);
        setFormData(prev => ({
            ...prev,
            gastos: nuevosGastos
        }));

        setNuevoGastoNombre("");
        setNuevoGastoCosto("");
    };

    const eliminarGasto = (index: number) => {
        const nuevosGastos = gastos.filter((_, i) => i !== index);
        setGastos(nuevosGastos);
        setFormData(prev => ({
            ...prev,
            gastos: nuevosGastos
        }));
    };

    const handleSave = async () => {
        if (!formData.name.trim()) {
            toast.error("El nombre es requerido");
            return;
        }

        if (formData.cost < 0) {
            toast.error("El costo debe ser mayor o igual a 0");
            return;
        }

        try {
            setIsSaving(true);

            if (onSave) {
                // Usar callback del padre para mantener sincronización
                await onSave(formData);
            } else {
                // Fallback: llamar directamente a las acciones (comportamiento anterior)
                if (formData.id) {
                    const result = await actualizarItem({
                        id: formData.id,
                        name: formData.name,
                        cost: formData.cost,
                        tipoUtilidad: formData.tipoUtilidad,
                        gastos: formData.gastos || [],
                        status: formData.status,
                    });

                    if (!result.success) {
                        toast.error(result.error || "Error al actualizar el item");
                        return;
                    }

                    toast.success("Item actualizado");
                } else {
                    const result = await crearItem({
                        categoriaeId: categoriaId,
                        name: formData.name,
                        cost: formData.cost,
                        gastos: formData.gastos || [],
                        status: formData.status || 'active',
                    });

                    if (!result.success) {
                        toast.error(result.error || "Error al crear el item");
                        return;
                    }

                    setFormData(prev => ({ ...prev, id: result.data?.id }));
                    toast.success("Item creado");
                }
            }

            onClose();
        } catch (error) {
            console.error("Error saving item:", error);
            toast.error("Error al guardar el item");
        } finally {
            setIsSaving(false);
        }
    };

    const handleClose = () => {
        if (isSaving) return;
        onClose();
    };

    const handleTogglePublish = async () => {
        if (!formData.id) {
            toast.error("Primero debes guardar el item");
            return;
        }

        try {
            setIsSaving(true);
            const response = await toggleItemPublish(formData.id);

            if (response.success && response.data) {
                const newStatus = response.data.status || "active";
                setFormData(prev => ({
                    ...prev,
                    status: newStatus
                }));

                // Notificar cambio de estado al padre
                if (onStatusChange && formData.id) {
                    onStatusChange(formData.id, newStatus);
                }

                toast.success(
                    newStatus === "active"
                        ? "Item activado exitosamente"
                        : "Item desactivado exitosamente"
                );
            } else {
                throw new Error(response.error || "Error al cambiar estado");
            }
        } catch (error) {
            console.error("Error toggling publish:", error);
            toast.error("Error al cambiar estado del item");
        } finally {
            setIsSaving(false);
        }
    };

    // Helper para notificar cambios de media al padre
    const notifyMediaChange = (newFotos?: MediaItem[], newVideos?: MediaItem[]) => {
        if (onMediaChange && formData.id) {
            const currentFotos = newFotos !== undefined ? newFotos : fotos;
            const currentVideos = newVideos !== undefined ? newVideos : videos;
            const hasPhotos = currentFotos.length > 0;
            const hasVideos = currentVideos.length > 0;
            onMediaChange(formData.id, hasPhotos, hasVideos);
        }
    };

    // File upload handlers
    const handleFotosUpload = async (files: FileList) => {
        if (!files.length) return;
        if (!formData.id) {
            toast.error("Guarda el item primero antes de subir fotos");
            return;
        }

        setIsUploading(true);
        try {
            const fileArray = Array.from(files);
            const uploadedFiles = await uploadFiles(fileArray, studioSlug, `items/${formData.id}/fotos`);

            // Persistir en BD
            for (const foto of uploadedFiles) {
                const result = await crearMediaItem({
                    itemId: formData.id,
                    url: foto.url,
                    fileName: foto.fileName,
                    fileType: 'image',
                    size: foto.size,
                    order: fotos.length,
                    studioId: studioSlug,
                });

                if (!result.success) {
                    toast.error(`Error guardando ${foto.fileName}: ${result.error}`);
                }
            }

            const mediaItems = uploadedFiles.map(file => ({
                id: file.id,
                url: file.url,
                fileName: file.fileName,
            }));

            const updatedFotos = [...fotos, ...mediaItems];
            setFotos(updatedFotos);
            toast.success(`${uploadedFiles.length} foto(s) subida(s)`);

            // Actualizar storage tracking
            await refreshStorageUsage();
            triggerRefresh();

            // Notificar cambio de media al padre
            notifyMediaChange(updatedFotos, videos);
        } catch (error) {
            console.error("Error uploading photos:", error);
            toast.error("Error al subir las fotos");
        } finally {
            setIsUploading(false);
        }
    };

    const handleVideosUpload = async (files: FileList) => {
        if (!files.length) return;
        if (!formData.id) {
            toast.error("Guarda el item primero antes de subir videos");
            return;
        }

        setIsUploading(true);
        try {
            const fileArray = Array.from(files);
            const uploadedFiles = await uploadFiles(fileArray, studioSlug, `items/${formData.id}/videos`);

            // Persistir en BD
            for (const video of uploadedFiles) {
                const result = await crearMediaItem({
                    itemId: formData.id,
                    url: video.url,
                    fileName: video.fileName,
                    fileType: 'video',
                    size: video.size,
                    order: videos.length,
                    studioId: studioSlug,
                });

                if (!result.success) {
                    toast.error(`Error guardando ${video.fileName}: ${result.error}`);
                }
            }

            const mediaItems = uploadedFiles.map(file => ({
                id: file.id,
                url: file.url,
                fileName: file.fileName,
            }));

            const updatedVideos = [...videos, ...mediaItems];
            setVideos(updatedVideos);
            toast.success(`${uploadedFiles.length} video(s) subido(s)`);

            // Actualizar storage tracking
            await refreshStorageUsage();
            triggerRefresh();

            // Notificar cambio de media al padre
            notifyMediaChange(fotos, updatedVideos);
        } catch (error) {
            console.error("Error uploading videos:", error);
            toast.error("Error al subir los videos");
        } finally {
            setIsUploading(false);
        }
    };

    // Drag & Drop handlers
    const handleFotosDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDraggingFotos(false);
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            // Filtrar solo archivos de imagen
            const imageFiles = Array.from(files).filter(file =>
                file.type.startsWith('image/')
            );
            if (imageFiles.length > 0) {
                handleFotosUpload(imageFiles as unknown as FileList);
            } else {
                toast.error("Solo se permiten archivos de imagen en la pestaña de fotos");
            }
        }
    };

    const handleVideosDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDraggingVideos(false);
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            // Filtrar solo archivos de video
            const videoFiles = Array.from(files).filter(file =>
                file.type.startsWith('video/')
            );
            if (videoFiles.length > 0) {
                handleVideosUpload(videoFiles as unknown as FileList);
            } else {
                toast.error("Solo se permiten archivos de video en la pestaña de videos");
            }
        }
    };

    // Delete handlers
    const handleDeleteFoto = (id: string) => {
        setFotoToDelete(id);
        setIsDeleteFotoModalOpen(true);
    };

    const handleConfirmDeleteFoto = async () => {
        if (!fotoToDelete || !formData.id) {
            setIsDeleteFotoModalOpen(false);
            setFotoToDelete(null);
            return;
        }

        const foto = fotos.find(f => f.id === fotoToDelete);
        if (!foto) {
            setIsDeleteFotoModalOpen(false);
            setFotoToDelete(null);
            return;
        }

        try {
            setIsDeletingMedia(true);

            // Eliminar de Supabase
            const success = await deleteFileStorage({
                publicUrl: foto.url,
                studioSlug: studioSlug,
            });

            if (success.success) {
                // Eliminar de BD
                const dbResult = await eliminarMediaItem({
                    id: foto.id,
                    itemId: formData.id,
                });

                if (dbResult.success) {
                    // Ocultar solo después de éxito (no optimistic update)
                    const updatedFotos = fotos.filter(f => f.id !== fotoToDelete);
                    setFotos(updatedFotos);

                    toast.success("Foto eliminada");

                    // Actualizar storage tracking
                    await refreshStorageUsage();
                    triggerRefresh();

                    // Notificar cambio de media al padre
                    notifyMediaChange(updatedFotos, videos);

                    // Cerrar modal solo después de completar la eliminación
                    setIsDeleteFotoModalOpen(false);
                    setFotoToDelete(null);
                } else {
                    toast.error(`Error eliminando foto: ${dbResult.error}`);
                    setIsDeleteFotoModalOpen(false);
                    setFotoToDelete(null);
                }
            } else {
                toast.error("Error eliminando archivo de almacenamiento");
                setIsDeleteFotoModalOpen(false);
                setFotoToDelete(null);
            }
        } catch (error) {
            console.error("Error eliminando foto:", error);
            toast.error("Error al eliminar la foto");
            setIsDeleteFotoModalOpen(false);
            setFotoToDelete(null);
        } finally {
            setIsDeletingMedia(false);
        }
    };

    const handleDeleteVideo = (id: string) => {
        setVideoToDelete(id);
        setIsDeleteVideoModalOpen(true);
    };

    const handleConfirmDeleteVideo = async () => {
        if (!videoToDelete || !formData.id) {
            setIsDeleteVideoModalOpen(false);
            setVideoToDelete(null);
            return;
        }

        const video = videos.find(v => v.id === videoToDelete);
        if (!video) {
            setIsDeleteVideoModalOpen(false);
            setVideoToDelete(null);
            return;
        }

        try {
            setIsDeletingMedia(true);

            // Eliminar de Supabase
            const success = await deleteFileStorage({
                publicUrl: video.url,
                studioSlug: studioSlug,
            });

            if (success.success) {
                // Eliminar de BD
                const dbResult = await eliminarMediaItem({
                    id: video.id,
                    itemId: formData.id,
                });

                if (dbResult.success) {
                    // Ocultar solo después de éxito (no optimistic update)
                    const updatedVideos = videos.filter(v => v.id !== videoToDelete);
                    setVideos(updatedVideos);

                    toast.success("Video eliminado");

                    // Actualizar storage tracking
                    await refreshStorageUsage();
                    triggerRefresh();

                    // Notificar cambio de media al padre
                    notifyMediaChange(fotos, updatedVideos);

                    // Cerrar modal solo después de completar la eliminación
                    setIsDeleteVideoModalOpen(false);
                    setVideoToDelete(null);
                } else {
                    toast.error(`Error eliminando video: ${dbResult.error}`);
                    setIsDeleteVideoModalOpen(false);
                    setVideoToDelete(null);
                }
            } else {
                toast.error("Error eliminando archivo de almacenamiento");
                setIsDeleteVideoModalOpen(false);
                setVideoToDelete(null);
            }
        } catch (error) {
            console.error("Error eliminando video:", error);
            toast.error("Error al eliminar el video");
            setIsDeleteVideoModalOpen(false);
            setVideoToDelete(null);
        } finally {
            setIsDeletingMedia(false);
        }
    };

    // Reorder handlers
    const handleReorderFotos = async (newFotos: MediaItem[]) => {
        setFotos(newFotos);

        // Persistir nuevo orden en BD
        if (formData.id) {
            const mediaIds = newFotos.map(f => f.id);
            const result = await reordenarMediaItem(formData.id, mediaIds);

            if (!result.success) {
                toast.error(`Error reordenando fotos: ${result.error}`);
                // Revertir cambios locales
                await cargarMediaExistente(formData.id);
            } else {
                toast.success('Fotos reordenadas correctamente');
            }
        }
    };

    const handleReorderVideos = async (newVideos: MediaItem[]) => {
        setVideos(newVideos);

        // Persistir nuevo orden en BD
        if (formData.id) {
            const mediaIds = newVideos.map(v => v.id);
            const result = await reordenarMediaItem(formData.id, mediaIds);

            if (!result.success) {
                toast.error(`Error reordenando videos: ${result.error}`);
                // Revertir cambios locales
                await cargarMediaExistente(formData.id);
            } else {
                toast.success('Videos reordenados correctamente');
            }
        }
    };

    // Sortable Media Item Component
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
            transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${isDragging ? 1.08 : 1})` : undefined,
            transition: isDragging ? undefined : (transition || 'transform 250ms cubic-bezier(0.2, 0, 0, 1)'),
            opacity: isDragging ? 0.7 : 1,
            zIndex: isDragging ? 50 : 1,
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
                className={`aspect-square bg-zinc-900 border rounded-lg overflow-hidden group relative cursor-pointer ${isDragging
                    ? 'border-purple-500 shadow-2xl shadow-purple-500/50 ring-2 ring-purple-500/30'
                    : 'border-zinc-700 hover:border-zinc-600 hover:shadow-lg'
                    } transition-all duration-200 ease-out`}
                onClick={handleOpenLightbox}
            >
                {/* Drag handle */}
                <div
                    {...attributes}
                    {...listeners}
                    className="absolute top-1 left-1 bg-zinc-800/90 hover:bg-zinc-700/90 p-1.5 rounded-md cursor-grab active:cursor-grabbing z-10 backdrop-blur-sm transition-all duration-200 hover:scale-110"
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
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            onDelete(item.id);
                        }}
                        disabled={isUploading}
                        className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-600 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed z-20"
                        title="Eliminar"
                    >
                        <Trash2 className="w-3 h-3 text-white" />
                    </button>
                )}
            </div>
        );
    };

    // Media Grid Component
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
            useSensor(PointerSensor, {
                activationConstraint: {
                    distance: 8, // 8px de movimiento antes de activar
                },
            }),
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
                    className={`grid grid-cols-3 gap-3 p-4 rounded-lg border-2 border-dashed transition-all duration-300 ${isDragging
                        ? "border-purple-500 bg-purple-500/5 border-solid"
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
                <SheetContent className="w-full max-w-4xl p-0 bg-zinc-900 border-l border-zinc-800 overflow-y-auto">
                    <SheetHeader className="p-6 pb-4">
                        <SheetTitle className="text-xl font-semibold text-zinc-100">
                            {item ? "Editar Item" : "Nuevo Item"}
                        </SheetTitle>
                    </SheetHeader>

                    <Tabs defaultValue="datos" className="w-full px-6">
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

                        {/* Tab 1: Datos del Item */}
                        <TabsContent value="datos" className="space-y-6 mt-6 pb-6">
                            <form className="space-y-6">
                                {/* Nombre del Item */}
                                <div>
                                    <label className="block text-sm font-medium text-zinc-200 mb-2">
                                        Nombre del Item
                                    </label>
                                    <ZenTextarea
                                        label=""
                                        value={formData.name}
                                        onChange={(e) => handleInputChange("name", e.target.value)}
                                        placeholder="Ej: Sesión de fotos de 1 hora"
                                        disabled={isSaving}
                                        rows={2}
                                        maxLength={100}
                                    />
                                </div>

                                {/* Costo Base */}
                                <div>
                                    <label className="block text-sm font-medium text-zinc-200 mb-2">
                                        Costo Base (MXN)
                                    </label>
                                    <ZenInput
                                        type="number"
                                        value={formData.cost}
                                        onChange={(e) => handleInputChange("cost", parseFloat(e.target.value) || 0)}
                                        placeholder="0.00"
                                        disabled={isSaving}
                                        min="0"
                                        step="0.01"
                                    />
                                </div>

                                {/* Tipo de Utilidad */}
                                <div>
                                    <label className="block text-sm font-medium text-zinc-200 mb-2">
                                        Tipo de Utilidad
                                    </label>
                                    <ZenSelect
                                        value={formData.tipoUtilidad || "servicio"}
                                        onValueChange={(value) => handleInputChange("tipoUtilidad", value)}
                                        disabled={isSaving}
                                        options={tiposUtilidad}
                                    />
                                </div>

                                {/* Gastos Asociados */}
                                <div>
                                    <label className="block text-sm font-medium text-zinc-200 mb-2">
                                        Gastos Asociados
                                    </label>

                                    {/* Lista de gastos existentes */}
                                    {gastos.length > 0 && (
                                        <div className="space-y-2 mb-4">
                                            {gastos.map((gasto, index) => (
                                                <div key={index} className="flex items-center gap-2 p-2 bg-zinc-800 rounded-lg">
                                                    <span className="flex-1 text-sm text-zinc-300">
                                                        {gasto.nombre}: {formatearMoneda(gasto.costo)}
                                                    </span>
                                                    <ZenButton
                                                        type="button"
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() => eliminarGasto(index)}
                                                        disabled={isSaving}
                                                    >
                                                        <Minus className="w-3 h-3" />
                                                    </ZenButton>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Formulario para agregar gasto */}
                                    <div className="flex gap-2">
                                        <ZenInput
                                            placeholder="Nombre del gasto"
                                            value={nuevoGastoNombre}
                                            onChange={(e) => setNuevoGastoNombre(e.target.value)}
                                            disabled={isSaving}
                                            className="flex-1"
                                        />
                                        <ZenInput
                                            type="number"
                                            placeholder="Costo"
                                            value={nuevoGastoCosto}
                                            onChange={(e) => setNuevoGastoCosto(e.target.value)}
                                            disabled={isSaving}
                                            min="0"
                                            step="0.01"
                                            className="w-24"
                                        />
                                        <ZenButton
                                            type="button"
                                            onClick={agregarGasto}
                                            disabled={isSaving || !nuevoGastoNombre.trim() || !nuevoGastoCosto}
                                            size="sm"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </ZenButton>
                                    </div>
                                </div>

                                {/* Precio del Sistema */}
                                {configuracion && (
                                    <div>
                                        <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-zinc-200">Precio del Sistema</span>
                                                <span className="text-2xl font-bold text-emerald-400">
                                                    {formatearMoneda(resultadoPrecio.precio_final)}
                                                </span>
                                            </div>
                                            <div className="text-xs text-zinc-400 mt-1">
                                                Utilidad real: {resultadoPrecio.porcentaje_utilidad_real}%
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between mb-3">
                                            <label className="block text-sm font-medium text-zinc-200">
                                                Desglose de Precios
                                            </label>
                                            <ZenButton
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setShowDesglosePrecios(!showDesglosePrecios)}
                                                className="gap-2"
                                            >
                                                <Calculator className="w-4 h-4" />
                                                {showDesglosePrecios ? "Ocultar" : "Mostrar"}
                                            </ZenButton>
                                        </div>

                                        {showDesglosePrecios && (
                                            <ZenCard className="p-4 bg-zinc-800/50 border-zinc-700">
                                                <div className="space-y-4">
                                                    {/* Resumen de costos */}
                                                    <div className="space-y-2 py-3 border-b border-zinc-700">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-sm text-zinc-400">Costo Base</span>
                                                            <span className="text-sm font-medium text-zinc-200">
                                                                {formatearMoneda(resultadoPrecio.costo)}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-sm text-zinc-400">+ Gastos</span>
                                                            <span className="text-sm font-medium text-zinc-200">
                                                                {formatearMoneda(resultadoPrecio.gasto)}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between items-center pt-1 border-t border-zinc-600">
                                                            <span className="text-sm font-medium text-zinc-300">Subtotal Costos</span>
                                                            <span className="text-sm font-semibold text-zinc-100">
                                                                {formatearMoneda(resultadoPrecio.costo + resultadoPrecio.gasto)}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Desglose detallado */}
                                                    <div className="space-y-3">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-sm text-zinc-400">Utilidad Base ({resultadoPrecio.porcentaje_utilidad}%)</span>
                                                            <span className="text-sm font-medium text-emerald-400">{formatearMoneda(resultadoPrecio.utilidad_base)}</span>
                                                        </div>

                                                        <div className="flex justify-between items-center py-2 border-t border-zinc-700">
                                                            <span className="text-sm text-zinc-400">Subtotal</span>
                                                            <span className="text-sm font-medium text-zinc-200">{formatearMoneda(resultadoPrecio.subtotal)}</span>
                                                        </div>

                                                        <div className="flex justify-between items-center">
                                                            <span className="text-sm text-zinc-400">Comisión ({resultadoPrecio.porcentaje_comision}%)</span>
                                                            <span className="text-sm font-medium text-blue-400">{formatearMoneda(resultadoPrecio.monto_comision)}</span>
                                                        </div>

                                                        <div className="flex justify-between items-center">
                                                            <span className="text-sm text-zinc-400">Sobreprecio ({resultadoPrecio.porcentaje_sobreprecio}%)</span>
                                                            <span className="text-sm font-medium text-purple-400">{formatearMoneda(resultadoPrecio.monto_sobreprecio)}</span>
                                                        </div>

                                                        <div className="border-t border-zinc-600 pt-3">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-base font-semibold text-zinc-200">Precio Final</span>
                                                                <span className="text-xl font-bold text-emerald-400">{formatearMoneda(resultadoPrecio.precio_final)}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center mt-1">
                                                                <span className="text-xs text-zinc-500">Utilidad Real</span>
                                                                <span className="text-xs font-medium text-emerald-300">{resultadoPrecio.porcentaje_utilidad_real}%</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </ZenCard>
                                        )}
                                    </div>
                                )}


                                {/* Botones de acción */}
                                <div className="space-y-4 pt-4 border-t border-zinc-800">
                                    {/* Switch Activo */}
                                    {formData.id && (
                                        <div className="flex items-center justify-between">
                                            <ZenSwitch
                                                checked={formData.status === "active"}
                                                onCheckedChange={() => handleTogglePublish()}
                                                disabled={isSaving || isUploading}
                                                label="Activo"
                                            />
                                        </div>
                                    )}
                                    {/* Botones */}
                                    <div className="flex items-center gap-3 w-full">
                                        <SheetClose asChild>
                                            <ZenButton
                                                type="button"
                                                variant="secondary"
                                                onClick={handleClose}
                                                disabled={isSaving || isUploading}
                                                className="flex-1"
                                            >
                                                Cerrar
                                            </ZenButton>
                                        </SheetClose>
                                        <ZenButton
                                            onClick={handleSave}
                                            disabled={isSaving || isUploading || !formData.name.trim()}
                                            className="gap-2 flex-1"
                                        >
                                            {isSaving ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Save className="w-4 h-4" />
                                            )}
                                            {item ? "Actualizar" : "Crear"} Item
                                        </ZenButton>
                                    </div>
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
                                <ZenCard className="p-3 bg-blue-500/10 border-blue-500/30 space-y-2">
                                    <p className="text-xs text-blue-300">
                                        📸 Soportados: JPG, PNG, GIF (máx. 5MB cada una)
                                    </p>
                                    <div className="pt-2 border-t border-blue-500/20">
                                        <p className="text-xs text-blue-300 mb-2">
                                            Las fotos se mostrarán en el nombre del item con un icono interactivo. Al hacer click en el icono se abrirá el lightbox.
                                        </p>
                                        <p className="text-xs text-blue-300/80 mb-2">
                                            ⚠️ Cada imagen asociada ocupará espacio en tu cuota de almacenamiento.
                                        </p>
                                        <div className="flex items-center gap-2 text-sm text-zinc-300 bg-zinc-800/50 px-3 py-2 rounded border border-zinc-700">
                                            <span>Nombre del item</span>
                                            <ImageIcon className="h-3.5 w-3.5 text-zinc-500 cursor-pointer hover:text-blue-400 transition-colors" aria-label="Icono de foto" />
                                        </div>
                                    </div>
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
                                <ZenCard className="p-3 bg-purple-500/10 border-purple-500/30 space-y-2">
                                    <p className="text-xs text-purple-300">
                                        🎬 Soportados: MP4, MOV, AVI (máx. 100MB cada uno)
                                    </p>
                                    <div className="pt-2 border-t border-purple-500/20">
                                        <p className="text-xs text-purple-300 mb-2">
                                            Los videos se mostrarán en el nombre del item con un icono interactivo. Al hacer click en el icono se abrirá el lightbox.
                                        </p>
                                        <p className="text-xs text-purple-300/80 mb-2">
                                            ⚠️ Cada video asociado ocupará espacio en tu cuota de almacenamiento.
                                        </p>
                                        <div className="flex items-center gap-2 text-sm text-zinc-300 bg-zinc-800/50 px-3 py-2 rounded border border-zinc-700">
                                            <span>Nombre del item</span>
                                            <Play className="h-3.5 w-3.5 text-zinc-500 cursor-pointer hover:text-purple-400 transition-colors" aria-label="Icono de video" />
                                        </div>
                                    </div>
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

            {/* Modales de confirmación para eliminar media */}
            <ZenConfirmModal
                isOpen={isDeleteFotoModalOpen}
                onClose={() => {
                    if (!isDeletingMedia) {
                        setIsDeleteFotoModalOpen(false);
                        setFotoToDelete(null);
                    }
                }}
                onConfirm={handleConfirmDeleteFoto}
                title="Eliminar foto"
                description="¿Estás seguro de que deseas eliminar esta foto? Esta acción no se puede deshacer."
                confirmText="Eliminar"
                cancelText="Cancelar"
                variant="destructive"
                loading={isDeletingMedia}
                disabled={isDeletingMedia}
            />

            <ZenConfirmModal
                isOpen={isDeleteVideoModalOpen}
                onClose={() => {
                    if (!isDeletingMedia) {
                        setIsDeleteVideoModalOpen(false);
                        setVideoToDelete(null);
                    }
                }}
                onConfirm={handleConfirmDeleteVideo}
                title="Eliminar video"
                description="¿Estás seguro de que deseas eliminar este video? Esta acción no se puede deshacer."
                confirmText="Eliminar"
                cancelText="Cancelar"
                variant="destructive"
                loading={isDeletingMedia}
                disabled={isDeletingMedia}
            />

            {/* Inputs ocultos para file upload */}
            <input
                ref={fotosInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                multiple
                onChange={(e) => e.target.files && handleFotosUpload(e.target.files)}
                className="hidden"
            />
            <input
                ref={videosInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                multiple
                onChange={(e) => e.target.files && handleVideosUpload(e.target.files)}
                className="hidden"
            />

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