"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { ZenButton, ZenInput, ZenCard, ZenTextarea, ZenSwitch } from "@/components/ui/zen";
import { ZenConfirmModal } from "@/components/ui/zen/overlays/ZenConfirmModal";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/shadcn/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/shadcn/tabs";
import { toast } from "sonner";
import { Loader2, Save, X, Calculator } from "lucide-react";
import { calcularPrecio, formatearMoneda, type ConfiguracionPrecios, type ResultadoPrecio } from "@/lib/actions/studio/catalogo/calcular-precio";
import { obtenerConfiguracionPrecios } from "@/lib/actions/studio/catalogo/utilidad.actions";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { useStorageTracking } from "@/hooks/useStorageTracking";
import { useStorageRefresh } from "@/hooks/useStorageRefresh";
import { useConfiguracionPreciosUpdateListener } from "@/hooks/useConfiguracionPreciosRefresh";
import {
    crearItem,
    actualizarItem,
} from "@/lib/actions/studio/catalogo";
import { toggleItemPublish } from "@/lib/actions/studio/catalogo/items.actions";
import {
    obtenerMediaItem,
    crearMediaItem,
    eliminarMediaItem,
    reordenarMediaItem
} from "@/lib/actions/studio/catalogo/media-items.actions";
import { deleteFileStorage } from "@/lib/actions/shared/media.actions";
import { ImageGrid } from "@/components/shared/media/ImageGrid";
import { PrecioDesglose } from "@/components/shared/precio";
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
    showOverlay?: boolean;
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
    showOverlay = true,
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
    const [nuevoGasto, setNuevoGasto] = useState("");
    const [showDesglosePrecios, setShowDesglosePrecios] = useState(false);
    const [configuracion, setConfiguracion] = useState<ConfiguracionPrecios | null>(preciosConfig || null);

    // Estados iniciales para detectar cambios
    const [initialFormData, setInitialFormData] = useState<ItemFormData | null>(null);
    const [initialGastos, setInitialGastos] = useState<Gasto[]>([]);
    const [showConfirmClose, setShowConfirmClose] = useState(false);
    const [localIsOpen, setLocalIsOpen] = useState(isOpen);

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
                        const parseValue = (val: string | undefined, def: number): number => {
                            if (val === undefined || val === '') return def;
                            const parsed = parseFloat(val);
                            return isNaN(parsed) ? def : parsed;
                        };

                        setConfiguracion({
                            utilidad_servicio: parseValue(config.utilidad_servicio, 0.30),
                            utilidad_producto: parseValue(config.utilidad_producto, 0.40),
                            comision_venta: parseValue(config.comision_venta, 0.10),
                            sobreprecio: parseValue(config.sobreprecio, 0.05),
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

    // Función helper para parsear valores de configuración
    const parseConfigValue = (val: string | undefined, def: number): number => {
        if (val === undefined || val === '') return def;
        const parsed = parseFloat(val);
        return isNaN(parsed) ? def : parsed;
    };

    // Función helper para convertir configuración de string a número
    const convertirConfiguracion = (config: {
        utilidad_servicio?: string;
        utilidad_producto?: string;
        comision_venta?: string;
        sobreprecio?: string;
    }): ConfiguracionPrecios => {
        return {
            utilidad_servicio: parseConfigValue(config.utilidad_servicio, 0.30),
            utilidad_producto: parseConfigValue(config.utilidad_producto, 0.40),
            comision_venta: parseConfigValue(config.comision_venta, 0.10),
            sobreprecio: parseConfigValue(config.sobreprecio, 0.05),
        };
    };

    // Actualizar configuración cuando cambia la prop preciosConfig
    useEffect(() => {
        if (preciosConfig) {
            setConfiguracion(preciosConfig);
        }
    }, [preciosConfig]);

    // Escuchar actualizaciones de configuración de precios desde otros componentes
    useConfiguracionPreciosUpdateListener(studioSlug, useCallback(async (eventDetail) => {
        if (eventDetail) {
            // Si viene la configuración completa en el evento, usarla directamente
            if (eventDetail.utilidad_servicio !== undefined || eventDetail.utilidad_producto !== undefined) {
                setConfiguracion(prev => ({
                    utilidad_servicio: eventDetail.utilidad_servicio ?? prev?.utilidad_servicio ?? 0.30,
                    utilidad_producto: eventDetail.utilidad_producto ?? prev?.utilidad_producto ?? 0.40,
                    comision_venta: eventDetail.comision_venta ?? prev?.comision_venta ?? 0.10,
                    sobreprecio: eventDetail.sobreprecio ?? prev?.sobreprecio ?? 0.05,
                }));
            } else {
                // Si no viene completa, recargar desde el servidor
                try {
                    const config = await obtenerConfiguracionPrecios(studioSlug);
                    if (config) {
                        setConfiguracion(convertirConfiguracion(config));
                    }
                } catch (error) {
                    console.error("Error recargando configuración de precios:", error);
                }
            }
        }
    }, [studioSlug]));

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

    // Sincronizar estado local con prop isOpen
    useEffect(() => {
        setLocalIsOpen(isOpen);
    }, [isOpen]);

    // Reset form when modal opens/closes or item changes
    useEffect(() => {
        if (isOpen) {
            // Resetear desglose de precios al abrir
            setShowDesglosePrecios(false);

            if (item) {
                // Asegurar que los gastos se carguen correctamente
                const gastosDelItem = item.gastos && Array.isArray(item.gastos) && item.gastos.length > 0
                    ? item.gastos
                    : [];

                const initialData: ItemFormData = {
                    id: item.id,
                    name: item.name,
                    cost: item.cost,
                    description: item.description || "",
                    categoriaeId: categoriaId,
                    tipoUtilidad: (item.tipoUtilidad || "servicio") as 'servicio' | 'producto',
                    gastos: gastosDelItem,
                    status: item.status || "active",
                };
                const initialGastosData = gastosDelItem.map((g) => ({ nombre: g.nombre, costo: g.costo }));

                setFormData(initialData);
                setGastos(initialGastosData);
                setInitialFormData(initialData);
                setInitialGastos(initialGastosData);

                // Cargar media existente solo si el item.id cambió o es diferente al cargado
                if (item.id && item.id !== loadedItemIdRef.current) {
                    loadedItemIdRef.current = item.id;
                    cargarMediaExistente(item.id);
                }
            } else {
                const initialData = {
                    name: "",
                    cost: 0,
                    description: "",
                    categoriaeId: categoriaId,
                    tipoUtilidad: "servicio" as const,
                    gastos: [] as Gasto[],
                    status: "active",
                } satisfies ItemFormData;

                setFormData(initialData);
                setGastos([]);
                setInitialFormData(initialData);
                setInitialGastos([]);
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
    const parsearGastos = (input: string): Gasto[] => {
        const gastosParseados: Gasto[] = [];

        // Si tiene comas, separar por comas
        if (input.includes(',')) {
            const partes = input.split(',').map(p => p.trim()).filter(p => p);
            for (const parte of partes) {
                // Buscar el último número en la parte
                const match = parte.match(/^(.+?)\s+(\d+(?:\.\d+)?)$/);
                if (match) {
                    gastosParseados.push({
                        nombre: match[1].trim(),
                        costo: parseFloat(match[2]) || 0,
                    });
                }
            }
        } else {
            // Sin comas: formato "nombre precio"
            const match = input.trim().match(/^(.+?)\s+(\d+(?:\.\d+)?)$/);
            if (match) {
                gastosParseados.push({
                    nombre: match[1].trim(),
                    costo: parseFloat(match[2]) || 0,
                });
            }
        }

        return gastosParseados;
    };

    const agregarGasto = () => {
        if (!nuevoGasto.trim()) return;

        const gastosParseados = parsearGastos(nuevoGasto);
        if (gastosParseados.length === 0) return;

        const nuevosGastos = [...gastos, ...gastosParseados];
        setGastos(nuevosGastos);
        setFormData(prev => ({
            ...prev,
            gastos: nuevosGastos
        }));

        setNuevoGasto("");
    };

    const handleGastoKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            agregarGasto();
        }
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

            // Asegurar que los gastos estén sincronizados con el estado actual
            const formDataConGastos = {
                ...formData,
                gastos: gastos.length > 0 ? gastos : (formData.gastos || [])
            };

            if (onSave) {
                // Usar callback del padre para mantener sincronización
                await onSave(formDataConGastos);
            } else {
                // Fallback: llamar directamente a las acciones (comportamiento anterior)
                if (formDataConGastos.id) {
                    const result = await actualizarItem({
                        id: formDataConGastos.id,
                        name: formDataConGastos.name,
                        cost: formDataConGastos.cost,
                        tipoUtilidad: formDataConGastos.tipoUtilidad,
                        gastos: formDataConGastos.gastos || [],
                        status: formDataConGastos.status,
                    });

                    if (!result.success) {
                        toast.error(result.error || "Error al actualizar el item");
                        return;
                    }

                    toast.success("Item actualizado");
                } else {
                    const result = await crearItem({
                        categoriaeId: categoriaId,
                        name: formDataConGastos.name,
                        cost: formDataConGastos.cost,
                        gastos: formDataConGastos.gastos || [],
                        status: formDataConGastos.status || 'active',
                    });

                    if (!result.success) {
                        toast.error(result.error || "Error al crear el item");
                        return;
                    }

                    setFormData(prev => ({ ...prev, id: result.data?.id }));
                    toast.success("Item creado");
                }
            }

            // Actualizar estado inicial después de guardar
            setInitialFormData({ ...formDataConGastos });
            setInitialGastos([...gastos]);

            setLocalIsOpen(false);
            onClose();
        } catch (error) {
            console.error("Error saving item:", error);
            toast.error("Error al guardar el item");
        } finally {
            setIsSaving(false);
        }
    };

    // Detectar si hay cambios sin guardar
    const hasUnsavedChanges = (): boolean => {
        if (!initialFormData) return false;

        // Comparar formData
        const formChanged =
            formData.name !== initialFormData.name ||
            formData.cost !== initialFormData.cost ||
            formData.description !== (initialFormData.description || "") ||
            formData.tipoUtilidad !== initialFormData.tipoUtilidad;

        // Comparar gastos
        const gastosChanged =
            gastos.length !== initialGastos.length ||
            gastos.some((g, i) => {
                const initial = initialGastos[i];
                return !initial || g.nombre !== initial.nombre || g.costo !== initial.costo;
            });

        return formChanged || gastosChanged;
    };

    const handleClose = () => {
        if (isSaving) return;

        if (hasUnsavedChanges()) {
            setShowConfirmClose(true);
        } else {
            setLocalIsOpen(false);
            onClose();
        }
    };

    const handleConfirmClose = () => {
        setShowConfirmClose(false);
        setLocalIsOpen(false);
        onClose();
    };

    const handleCancelClose = () => {
        setShowConfirmClose(false);
        setLocalIsOpen(true);
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
                open={localIsOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        if (hasUnsavedChanges()) {
                            setShowConfirmClose(true);
                            // Mantener el Sheet abierto hasta que se confirme
                            setLocalIsOpen(true);
                        } else {
                            setLocalIsOpen(false);
                            onClose();
                        }
                    } else {
                        setLocalIsOpen(true);
                    }
                }}
                modal={showOverlay}
            >
                <SheetContent 
                    className="w-full max-w-4xl p-0 bg-zinc-900 border-l border-zinc-800 overflow-y-auto"
                    showOverlay={showOverlay}
                >
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
                                    <div className="flex gap-2">
                                        <ZenButton
                                            type="button"
                                            variant={formData.tipoUtilidad === 'servicio' ? 'primary' : 'outline'}
                                            size="md"
                                            onClick={() => handleInputChange("tipoUtilidad", "servicio")}
                                            disabled={isSaving}
                                            className="flex-1"
                                        >
                                            Servicio
                                            {configuracion && (
                                                <span className="text-xs opacity-80 ml-1">
                                                    ({configuracion.utilidad_servicio > 1
                                                        ? configuracion.utilidad_servicio.toFixed(0)
                                                        : (configuracion.utilidad_servicio * 100).toFixed(0)}%)
                                                </span>
                                            )}
                                        </ZenButton>
                                        <ZenButton
                                            type="button"
                                            variant={formData.tipoUtilidad === 'producto' ? 'primary' : 'outline'}
                                            size="md"
                                            onClick={() => handleInputChange("tipoUtilidad", "producto")}
                                            disabled={isSaving}
                                            className="flex-1"
                                        >
                                            Producto
                                            {configuracion && (
                                                <span className="text-xs opacity-80 ml-1">
                                                    ({configuracion.utilidad_producto > 1
                                                        ? configuracion.utilidad_producto.toFixed(0)
                                                        : (configuracion.utilidad_producto * 100).toFixed(0)}%)
                                                </span>
                                            )}
                                        </ZenButton>
                                    </div>
                                </div>

                                {/* Gastos Asociados */}
                                <ZenCard className="p-4 bg-zinc-800/30 border-zinc-700">
                                    <label className="block text-sm font-medium text-zinc-200 mb-3">
                                        Gastos Asociados
                                    </label>

                                    {/* Lista de gastos como badges */}
                                    {gastos.length > 0 && (
                                        <div className="mb-4">
                                            <div className="flex flex-wrap gap-2 mb-3">
                                                {gastos.map((gasto, index) => (
                                                    <div
                                                        key={index}
                                                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-zinc-800/50 border border-zinc-700 rounded-full"
                                                    >
                                                        <span className="text-sm text-zinc-300">
                                                            {gasto.nombre}
                                                        </span>
                                                        <span className="text-sm font-medium text-zinc-400">
                                                            {formatearMoneda(gasto.costo)}
                                                        </span>
                                                        <ZenButton
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => eliminarGasto(index)}
                                                            disabled={isSaving}
                                                            className="h-5 w-5 p-0 -mr-1 text-red-400 hover:text-red-300"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </ZenButton>
                                                    </div>
                                                ))}
                                            </div>
                                            {gastos.length > 0 && (
                                                <div className="flex justify-between items-center pt-2 border-t border-zinc-800">
                                                    <span className="text-sm text-zinc-400">Total</span>
                                                    <span className="text-sm font-medium text-zinc-200">
                                                        {formatearMoneda(gastos.reduce((acc, g) => acc + g.costo, 0))}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Input único para agregar gastos */}
                                    <ZenInput
                                        placeholder="Ej: comida 300 (Enter) o comida 500, agua 200 (Enter)"
                                        value={nuevoGasto}
                                        onChange={(e) => setNuevoGasto(e.target.value)}
                                        onKeyDown={handleGastoKeyDown}
                                        disabled={isSaving}
                                        size="md"
                                        hint="Formato: nombre precio o nombre1 precio1, nombre2 precio2"
                                    />
                                </ZenCard>

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
                                            <PrecioDesglose
                                                resultado={resultadoPrecio}
                                                tipoUtilidad={formData.tipoUtilidad}
                                            />
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

            {/* Modal de confirmación para cambios sin guardar */}
            <ZenConfirmModal
                isOpen={showConfirmClose}
                onClose={handleCancelClose}
                onConfirm={handleConfirmClose}
                title="¿Descartar cambios?"
                description="Tienes cambios sin guardar. ¿Estás seguro de que deseas cerrar y descartar los cambios?"
                confirmText="Descartar"
                cancelText="Cancelar"
                variant="destructive"
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