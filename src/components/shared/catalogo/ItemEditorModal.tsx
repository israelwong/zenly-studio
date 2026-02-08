"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ZenButton, ZenInput, ZenCard, ZenTextarea, ZenSwitch } from "@/components/ui/zen";
import { ZenConfirmModal } from "@/components/ui/zen/overlays/ZenConfirmModal";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from "@/components/ui/shadcn/sheet";
import { toast } from "sonner";
import { Loader2, Save, X, Calculator, Clock, Package, DollarSign, Hash, Sparkles, Lock } from "lucide-react";
import { calcularPrecio, formatearMoneda, type ConfiguracionPrecios, type ResultadoPrecio } from "@/lib/actions/studio/catalogo/calcular-precio";
import { obtenerConfiguracionPrecios } from "@/lib/actions/studio/catalogo/utilidad.actions";
import { useConfiguracionPreciosUpdateListener } from "@/hooks/useConfiguracionPreciosRefresh";
import {
    crearItem,
    actualizarItem,
} from "@/lib/actions/studio/catalogo";
import { toggleItemPublish } from "@/lib/actions/studio/catalogo/items.actions";
import { PrecioDesglose } from "@/components/shared/precio";

interface Gasto {
    nombre: string;
    costo: number;
}

/** Categoría operativa para Workflows Inteligentes (cronograma/checklists) */
export type OperationalCategoryForm = 'PRODUCTION' | 'POST_PRODUCTION' | 'DELIVERY' | 'LOGISTICS' | null;

export interface ItemFormData {
    id?: string;
    name: string;
    cost: number | undefined;
    description?: string;
    categoriaeId?: string;
    tipoUtilidad?: 'servicio' | 'producto';
    billing_type?: 'HOUR' | 'SERVICE' | 'UNIT';
    operational_category?: OperationalCategoryForm;
    gastos?: Gasto[];
    status?: string;
}

export type ItemEditorContext = 'catalogo' | 'paquetes' | 'cotizaciones';

interface ItemEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave?: (
        data: ItemFormData,
        options?: {
            saveToCatalog?: boolean;
        }
    ) => Promise<void>;
    onMediaChange?: (itemId: string, hasPhotos: boolean, hasVideos: boolean) => void;
    onStatusChange?: (itemId: string, status: string) => void;
    item?: ItemFormData;
    studioSlug: string;
    categoriaId: string;
    preciosConfig?: ConfiguracionPrecios;
    showOverlay?: boolean;
    /** Desde paquetes o cotizaciones: muestra aviso de que los cambios aplican al catálogo global */
    context?: ItemEditorContext;
}

/**
 * Modal para crear/editar items del catálogo
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
    context = 'catalogo',
}: ItemEditorModalProps) {
    const router = useRouter();

    // Estados del formulario
    const [formData, setFormData] = useState<ItemFormData>({
        name: "",
        cost: undefined,
        description: "",
        categoriaeId: categoriaId,
        tipoUtilidad: "servicio",
        billing_type: "SERVICE",
        operational_category: null,
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

    // Estados de UI
    const [isSaving, setIsSaving] = useState(false);
    
    // Estados para contexto de cotizaciones
    const [saveToCatalog, setSaveToCatalog] = useState(false);

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

        const costoNum = formData.cost ?? 0;
        const gastosArray = gastos.map((g) => g.costo);
        const totalGastos = gastosArray.reduce((acc, g) => acc + g, 0);

        return calcularPrecio(
            costoNum,
            totalGastos,
            formData.tipoUtilidad || 'servicio',
            configuracion
        );
    }, [formData.cost, formData.tipoUtilidad, gastos, configuracion]);


    // Sincronizar estado local con prop isOpen
    useEffect(() => {
        setLocalIsOpen(isOpen);
    }, [isOpen]);

    // Reset form when modal opens/closes or item changes
    useEffect(() => {
        if (isOpen) {
            // Resetear desglose de precios al abrir
            setShowDesglosePrecios(false);
            
            // Resetear estados de cotización cuando se abre
            if (context === 'cotizaciones') {
                setSaveToCatalog(false);
            }

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
                    billing_type: (item.billing_type || "SERVICE") as 'HOUR' | 'SERVICE' | 'UNIT',
                    operational_category: (item as ItemFormData).operational_category ?? null,
                    gastos: gastosDelItem,
                    status: item.status || "active",
                };
                const initialGastosData = gastosDelItem.map((g) => ({ nombre: g.nombre, costo: g.costo }));

                setFormData(initialData);
                setGastos(initialGastosData);
                setInitialFormData(initialData);
                setInitialGastos(initialGastosData);
            } else {
                const initialData = {
                    name: "",
                    cost: undefined,
                    description: "",
                    categoriaeId: categoriaId,
                    tipoUtilidad: "servicio" as const,
                    billing_type: "SERVICE" as const,
                    operational_category: null as OperationalCategoryForm,
                    gastos: [] as Gasto[],
                    status: "active",
                } satisfies ItemFormData;

                setFormData(initialData);
                setGastos([]);
                setInitialFormData(initialData);
                setInitialGastos([]);
            }
        }
    }, [isOpen, item, categoriaId]);

    const handleInputChange = (field: keyof ItemFormData, value: string | number | null) => {
        setFormData(prev => {
            const newData = {
                ...prev,
                [field]: value
            };
            
            // Si cambia a producto, establecer billing_type a UNIT automáticamente
            if (field === 'tipoUtilidad' && value === 'producto') {
                newData.billing_type = 'UNIT';
            }
            // Si cambia a servicio y no tiene billing_type, establecer SERVICE por defecto
            if (field === 'tipoUtilidad' && value === 'servicio' && !prev.billing_type) {
                newData.billing_type = 'SERVICE';
            }
            
            return newData;
        });
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

        const costoFinal = formData.cost ?? 0;
        if (costoFinal < 0) {
            toast.error("El costo debe ser mayor o igual a 0");
            return;
        }

        try {
            setIsSaving(true);

            // Asegurar que los gastos están sincronizados con el estado actual
            // Convertir cost undefined a 0 para guardar
            const formDataConGastos = {
                ...formData,
                cost: formData.cost ?? 0,
                gastos: gastos.length > 0 ? gastos : (formData.gastos || [])
            };

            if (onSave) {
                // Usar callback del padre para mantener sincronización
                if (context === 'cotizaciones') {
                    // Pasar opciones adicionales cuando es contexto de cotización
                    await onSave(formDataConGastos, {
                        saveToCatalog: saveToCatalog,
                    });
                } else {
                    // Comportamiento estándar para otros contextos
                    await onSave(formDataConGastos);
                }
            } else {
                // Fallback: llamar directamente a las acciones (comportamiento anterior)
                if (formDataConGastos.id) {
                    const result = await actualizarItem({
                        id: formDataConGastos.id,
                        name: formDataConGastos.name,
                        cost: formDataConGastos.cost,
                        tipoUtilidad: formDataConGastos.tipoUtilidad,
                        billing_type: formDataConGastos.billing_type,
                        operational_category: formDataConGastos.operational_category ?? undefined,
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
                        studioSlug,
                        name: formDataConGastos.name,
                        cost: formDataConGastos.cost,
                        tipoUtilidad: formDataConGastos.tipoUtilidad,
                        billing_type: formDataConGastos.billing_type || (formDataConGastos.tipoUtilidad === 'producto' ? 'UNIT' : 'SERVICE'),
                        operational_category: formDataConGastos.operational_category ?? undefined,
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

            router.refresh();
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
            formData.tipoUtilidad !== initialFormData.tipoUtilidad ||
            formData.billing_type !== initialFormData.billing_type;

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
                        <SheetDescription className="sr-only">
                            {item ? "Formulario para editar el item del catálogo" : "Formulario para crear un nuevo item en el catálogo"}
                        </SheetDescription>
                    </SheetHeader>

                    {/* Tarjeta informativa para nuevo item en cotizaciones */}
                    {context === 'cotizaciones' && !item && (
                        <div className="mx-6 mb-1 rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-2.5">
                            <div className="flex items-start gap-2.5">
                                <Sparkles className="w-3.5 h-3.5 text-blue-400 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 space-y-0.5">
                                    <h4 className="text-sm font-semibold text-blue-200">
                                        Modo: Ítem al vuelo
                                    </h4>
                                    <p className="text-xs text-blue-200/80 leading-relaxed">
                                        Este ítem se creará específicamente para esta cotización (Snapshot). Al guardar, podrás elegir si también deseas agregarlo permanentemente a tu catálogo global.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {context === 'paquetes' && item && (
                        <div className="mx-6 mb-0 rounded-lg border border-amber-600/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-200/90">
                            Editar con cuidado: se modificará el ítem en el catálogo. En paquetes, el cálculo dinámico usará los nuevos datos; el precio personalizado guardado no cambia.
                        </div>
                    )}
                    {context === 'cotizaciones' && item && (
                        <div className="mx-6 mb-0 rounded-lg border border-blue-600/50 bg-blue-500/10 px-4 py-3 text-sm text-blue-200/90">
                            <strong>Modo Edición de Cotización:</strong> Puedes elegir si los cambios son solo para este cliente o si afectan a todo el catálogo.
                        </div>
                    )}

                    <div className="px-6 pb-6">
                        <form className={`space-y-6 ${context === 'cotizaciones' && !item ? 'mt-2' : 'mt-6'}`}>
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
                                        value={formData.cost ?? ''}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            if (value === '') {
                                                handleInputChange("cost", undefined);
                                            } else {
                                                const numValue = parseFloat(value);
                                                if (!isNaN(numValue)) {
                                                    handleInputChange("cost", numValue);
                                                }
                                            }
                                        }}
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

                                {/* Tipo de Facturación (solo para servicios) */}
                                {formData.tipoUtilidad === 'servicio' && (
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-200 mb-2">
                                            Tipo de Facturación
                                        </label>
                                        <div className="flex gap-2">
                                            <ZenButton
                                                type="button"
                                                variant={formData.billing_type === 'SERVICE' ? 'primary' : 'outline'}
                                                size="md"
                                                onClick={() => handleInputChange("billing_type", "SERVICE")}
                                                disabled={isSaving}
                                                className="flex-1"
                                                title="Precio único por el trabajo total"
                                            >
                                                Fijo
                                            </ZenButton>
                                            <ZenButton
                                                type="button"
                                                variant={formData.billing_type === 'HOUR' ? 'primary' : 'outline'}
                                                size="md"
                                                onClick={() => handleInputChange("billing_type", "HOUR")}
                                                disabled={isSaving}
                                                className="flex-1"
                                                title="Multiplicado por las horas del evento"
                                            >
                                                Hora
                                            </ZenButton>
                                            <ZenButton
                                                type="button"
                                                variant={formData.billing_type === 'UNIT' ? 'primary' : 'outline'}
                                                size="md"
                                                onClick={() => handleInputChange("billing_type", "UNIT")}
                                                disabled={isSaving}
                                                className="flex-1"
                                                title="Multiplicado por la cantidad definida (ej. fotos, km, impresiones)"
                                            >
                                                Unidad
                                            </ZenButton>
                                        </div>
                                        <p className="text-xs text-zinc-400 mt-2">
                                            {formData.billing_type === 'HOUR' 
                                                ? "Se multiplica automáticamente por la duración del evento"
                                                : formData.billing_type === 'UNIT'
                                                ? "Multiplicado por la cantidad definida (ej. fotos, km, impresiones)"
                                                : "Precio único por el trabajo total"
                                            }
                                        </p>
                                    </div>
                                )}

                                {/* Flujo de trabajo interno (categoría operativa) - solo estudio */}
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <label className="text-sm font-medium text-zinc-200">
                                            Flujo de Trabajo Interno
                                        </label>
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-700/60 text-zinc-400 border border-zinc-600/50">
                                            <Lock className="h-2.5 w-2.5" />
                                            Solo Estudio
                                        </span>
                                    </div>
                                    <p className="text-xs text-zinc-500 mb-2">
                                        Configuración interna: No visible para el cliente ni afecta cotizaciones. Define la generación automática de tareas y checklists.
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            { value: "", label: "Sin definir" },
                                            { value: "PRODUCTION", label: "Producción" },
                                            { value: "POST_PRODUCTION", label: "Postproducción" },
                                            { value: "DELIVERY", label: "Entregable" },
                                        ].map(({ value, label }) => {
                                            const current = formData.operational_category ?? "";
                                            const selected = current === value;
                                            const base = "inline-flex items-center px-2.5 py-1 text-xs font-light rounded-sm border transition-all duration-150 disabled:opacity-50";
                                            const unselected = "bg-zinc-500/5 border-zinc-500/20 text-zinc-500 hover:bg-zinc-500/10";
                                            const selectedStyles =
                                                value === ""
                                                    ? "bg-zinc-500/10 border-zinc-500/50 text-zinc-400"
                                                    : value === "PRODUCTION"
                                                        ? "bg-indigo-500/10 border-indigo-500/50 text-indigo-400"
                                                        : value === "POST_PRODUCTION"
                                                            ? "bg-amber-500/10 border-amber-500/50 text-amber-400"
                                                            : "bg-emerald-500/10 border-emerald-500/50 text-emerald-400";
                                            return (
                                                <button
                                                    key={value || "none"}
                                                    type="button"
                                                    disabled={isSaving}
                                                    onClick={() => handleInputChange("operational_category", value || null)}
                                                    className={`${base} ${selected ? selectedStyles : unselected} ${selected ? "ring-1 ring-white/10" : "hover:scale-[1.02] active:scale-[0.98]"}`}
                                                >
                                                    {label}
                                                </button>
                                            );
                                        })}
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

                                {/* Precio del Sistema (Solo lectura) */}
                                {configuracion && (
                                    <div>
                                        <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-zinc-200">
                                                    Precio Calculado
                                                </span>
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
                                    {formData.id && context !== 'cotizaciones' && (
                                        <div className="flex items-center justify-between">
                                            <ZenSwitch
                                                checked={formData.status === "active"}
                                                onCheckedChange={() => handleTogglePublish()}
                                                disabled={isSaving}
                                                label="Activo"
                                            />
                                        </div>
                                    )}
                                    
                                    {/* Checkbox para guardar en catálogo (solo en contexto de cotización) */}
                                    {context === 'cotizaciones' && item?.id && (
                                        <div className="space-y-3 p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-lg border border-blue-500/30">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                                                <h4 className="text-sm font-semibold text-blue-200">
                                                    Actualización del Catálogo
                                                </h4>
                                            </div>
                                            <div className="space-y-2">
                                                <ZenSwitch
                                                    checked={saveToCatalog}
                                                    onCheckedChange={setSaveToCatalog}
                                                    disabled={isSaving}
                                                    label="Actualizar también en el catálogo global"
                                                    variant="blue"
                                                />
                                                <p className="text-xs text-zinc-400 leading-relaxed pl-1">
                                                    {saveToCatalog ? (
                                                        <span>
                                                            <span className="text-blue-300 font-medium">Los cambios se aplicarán globalmente.</span> Todos los paquetes y cotizaciones futuras usarán los nuevos datos.
                                                        </span>
                                                    ) : (
                                                        <span>
                                                            <span className="text-amber-300 font-medium">Modo Snapshot activado.</span> Los cambios solo afectarán a esta cotización. El catálogo original permanecerá intacto.
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Botones */}
                                    <div className="flex items-center gap-3 w-full">
                                        <SheetClose asChild>
                                            <ZenButton
                                                type="button"
                                                variant="secondary"
                                                onClick={handleClose}
                                                disabled={isSaving}
                                                className="flex-1"
                                            >
                                                Cerrar
                                            </ZenButton>
                                        </SheetClose>
                                        <ZenButton
                                            onClick={handleSave}
                                            disabled={isSaving || !formData.name.trim()}
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
                    </div>
                </SheetContent>
            </Sheet>

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
        </>
    );
}
