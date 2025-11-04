"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { ZenButton, ZenInput, ZenCard, ZenTextarea, ZenSelect, ZenSwitch } from "@/components/ui/zen";
import { ZenConfirmModal } from "@/components/ui/zen/overlays/ZenConfirmModal";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/shadcn/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/shadcn/tabs";
import { toast } from "sonner";
import { Loader2, Save, Plus, Minus, Calculator } from "lucide-react";
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
import { ImageGrid } from "@/components/shared/media/ImageGrid";
import { MediaItem } from "@/types/content-blocks";

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
 * Incluye tabs para datos y multimedia con drag & drop
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

    // Estados de multimedia unificado
    const [media, setMedia] = useState<MediaItem[]>([]);
    const [isLoadingMedia, setIsLoadingMedia] = useState(false);
    const loadedItemIdRef = useRef<string | null>(null);

    // File input ref
    const mediaInputRef = useRef<HTMLInputElement>(null);

    // Estados de UI
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isDeleteMediaModalOpen, setIsDeleteMediaModalOpen] = useState(false);
    const [mediaToDelete, setMediaToDelete] = useState<string | null>(null);
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
        setIsLoadingMedia(true);
        try {
            const result = await obtenerMediaItem(itemId);
            if (result.success && result.data) {
                const mediaItems: MediaItem[] = result.data.map((m) => ({
                    id: m.id,
                    file_url: m.file_url,
                    file_type: m.file_type === 'IMAGE' ? 'image' : 'video',
                    filename: m.filename,
                    storage_path: '', // No disponible en BD actual
                    storage_bytes: Number(m.storage_bytes),
                    display_order: m.display_order,
                }));

                setMedia(mediaItems);
            } else {
                setMedia([]);
            }
        } catch (error) {
            console.error("Error cargando media existente:", error);
            setMedia([]);
        } finally {
            setIsLoadingMedia(false);
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
                // Cargar media existente solo si el item.id cambió o es diferente al cargado
                if (item.id && item.id !== loadedItemIdRef.current) {
                    loadedItemIdRef.current = item.id;
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
                setMedia([]);
                setIsLoadingMedia(false);
                loadedItemIdRef.current = null;
            }
        }
    }, [isOpen, item, categoriaId]);

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
    const notifyMediaChange = (newMedia?: MediaItem[]) => {
        if (onMediaChange && formData.id) {
            const currentMedia = newMedia !== undefined ? newMedia : media;
            const hasPhotos = currentMedia.some(m => m.file_type === 'image');
            const hasVideos = currentMedia.some(m => m.file_type === 'video');
            onMediaChange(formData.id, hasPhotos, hasVideos);
        }
    };

    // File upload handler unificado
    const handleMediaUpload = async (files: File[]) => {
        if (!files.length) return;
        if (!formData.id) {
            toast.error("Guarda el item primero antes de subir archivos");
            return;
        }

        setIsUploading(true);
        try {
            const uploadedFiles = await uploadFiles(files, studioSlug, `items/${formData.id}/multimedia`);

            // Persistir en BD
            for (const file of uploadedFiles) {
                const fileType = file.fileName.match(/\.(mp4|mov|avi|webm)$/i) ? 'video' : 'image';
                const result = await crearMediaItem({
                    itemId: formData.id,
                    url: file.url,
                    fileName: file.fileName,
                    fileType,
                    size: file.size,
                    order: media.length,
                    studioId: studioSlug,
                });

                if (!result.success) {
                    toast.error(`Error guardando ${file.fileName}: ${result.error}`);
                }
            }

            const newMediaItems: MediaItem[] = uploadedFiles.map(file => {
                const fileType = file.fileName.match(/\.(mp4|mov|avi|webm)$/i) ? 'video' : 'image';
                return {
                    id: file.id,
                    file_url: file.url,
                    file_type: fileType,
                    filename: file.fileName,
                    storage_path: '', // No disponible en uploadFiles
                    storage_bytes: file.size,
                    display_order: media.length,
                };
            });

            const updatedMedia = [...media, ...newMediaItems];
            setMedia(updatedMedia);
            toast.success(`${uploadedFiles.length} archivo(s) subido(s)`);

            // Actualizar storage tracking
            await refreshStorageUsage();
            triggerRefresh();

            // Notificar cambio de media al padre
            notifyMediaChange(updatedMedia);
        } catch (error) {
            console.error("Error uploading media:", error);
            toast.error("Error al subir los archivos");
        } finally {
            setIsUploading(false);
        }
    };

    // Drag & Drop handler unificado
    const handleMediaDrop = (files: File[]) => {
        if (files.length > 0) {
            handleMediaUpload(files);
        }
    };

    // Delete handler unificado
    const handleDeleteMedia = (id: string) => {
        setMediaToDelete(id);
        setIsDeleteMediaModalOpen(true);
    };

    const handleConfirmDeleteMedia = async () => {
        if (!mediaToDelete || !formData.id) {
            setIsDeleteMediaModalOpen(false);
            setMediaToDelete(null);
            return;
        }

        const mediaItem = media.find(m => m.id === mediaToDelete);
        if (!mediaItem) {
            setIsDeleteMediaModalOpen(false);
            setMediaToDelete(null);
            return;
        }

        try {
            setIsDeletingMedia(true);

            // Eliminar de Supabase
            const success = await deleteFileStorage({
                publicUrl: mediaItem.file_url,
                studioSlug: studioSlug,
            });

            if (success.success) {
                // Eliminar de BD
                const dbResult = await eliminarMediaItem({
                    id: mediaItem.id,
                    itemId: formData.id,
                });

                if (dbResult.success) {
                    const updatedMedia = media.filter(m => m.id !== mediaToDelete);
                    setMedia(updatedMedia);

                    toast.success("Archivo eliminado");

                    // Actualizar storage tracking
                    await refreshStorageUsage();
                    triggerRefresh();

                    // Notificar cambio de media al padre
                    notifyMediaChange(updatedMedia);

                    setIsDeleteMediaModalOpen(false);
                    setMediaToDelete(null);
                } else {
                    toast.error(`Error eliminando archivo: ${dbResult.error}`);
                    setIsDeleteMediaModalOpen(false);
                    setMediaToDelete(null);
                }
            } else {
                toast.error("Error eliminando archivo de almacenamiento");
                setIsDeleteMediaModalOpen(false);
                setMediaToDelete(null);
            }
        } catch (error) {
            console.error("Error eliminando archivo:", error);
            toast.error("Error al eliminar el archivo");
            setIsDeleteMediaModalOpen(false);
            setMediaToDelete(null);
        } finally {
            setIsDeletingMedia(false);
        }
    };

    // Reorder handler unificado
    const handleReorderMedia = async (reorderedMedia: MediaItem[]) => {
        // Actualizar estado local primero (optimistic update)
        setMedia(reorderedMedia);

        // Persistir nuevo orden en BD
        if (formData.id) {
            const mediaIds = reorderedMedia.map(m => m.id);
            const result = await reordenarMediaItem(formData.id, mediaIds);

            if (!result.success) {
                toast.error(`Error reordenando archivos: ${result.error}`);
                // Revertir cambios locales solo si hay error
                await cargarMediaExistente(formData.id);
            } else {
                toast.success('Archivos reordenados correctamente');
                // No recargar, el estado local ya está actualizado
            }
        }
    };


    return (
        <>
            <Sheet
                open={isOpen}
                onOpenChange={(open) => {
                    if (!open) {
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
                        <TabsList className="grid w-full grid-cols-2 bg-zinc-800/50">
                            <TabsTrigger
                                value="datos"
                                className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400"
                            >
                                Datos
                            </TabsTrigger>
                            <TabsTrigger
                                value="multimedia"
                                className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400"
                            >
                                Multimedia
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

                        {/* Tab 2: Multimedia */}
                        <TabsContent value="multimedia" className="space-y-6 mt-6 pb-6">
                            <div className="space-y-4">
                                {/* Galería Multimedia */}
                                <div>
                                    <label className="block text-sm font-medium text-zinc-200 mb-3">
                                        Galería Multimedia
                                    </label>
                                    {isLoadingMedia ? (
                                        <div className="grid grid-cols-3 gap-4 p-4 rounded-lg border-2 border-dashed border-zinc-700 bg-zinc-800/30">
                                            <div className="aspect-square bg-zinc-800 rounded-lg flex items-center justify-center">
                                                <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                                            </div>
                                        </div>
                                    ) : (
                                        <ImageGrid
                                            media={media}
                                            onDelete={handleDeleteMedia}
                                            onReorder={handleReorderMedia}
                                            showDeleteButtons={true}
                                            isEditable={true}
                                            lightbox={false}
                                            columns={3}
                                            gap={4}
                                            aspectRatio="square"
                                            onDrop={handleMediaDrop}
                                            onUploadClick={() => mediaInputRef.current?.click()}
                                            isUploading={isUploading}
                                        />
                                    )}
                                </div>

                                {/* Info */}
                                <ZenCard className="p-3 bg-emerald-500/10 border-emerald-500/30 space-y-2">
                                    <p className="text-xs text-emerald-300">
                                        📸🎬 Soportados: JPG, PNG, GIF, MP4, MOV, AVI
                                    </p>
                                    <div className="pt-2 border-t border-emerald-500/20">
                                        <p className="text-xs text-emerald-300 mb-2">
                                            Los archivos multimedia se mostrarán en el nombre del item con iconos interactivos. El prospecto podrá ver una galería con lightbox al hacer click.
                                        </p>
                                        <p className="text-xs text-emerald-300/80 mb-2">
                                            ⚠️ Cada archivo asociado ocupará espacio en tu cuota de almacenamiento.
                                        </p>
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

            {/* Modal de confirmación para eliminar media */}
            <ZenConfirmModal
                isOpen={isDeleteMediaModalOpen}
                onClose={() => {
                    if (!isDeletingMedia) {
                        setIsDeleteMediaModalOpen(false);
                        setMediaToDelete(null);
                    }
                }}
                onConfirm={handleConfirmDeleteMedia}
                title="Eliminar archivo"
                description="¿Estás seguro de que deseas eliminar este archivo? Esta acción no se puede deshacer."
                confirmText="Eliminar"
                cancelText="Cancelar"
                variant="destructive"
                loading={isDeletingMedia}
                disabled={isDeletingMedia}
            />

            {/* Input oculto para file upload */}
            <input
                ref={mediaInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime"
                multiple
                onChange={(e) => e.target.files && handleMediaUpload(Array.from(e.target.files))}
                className="hidden"
            />
        </>
    );
}