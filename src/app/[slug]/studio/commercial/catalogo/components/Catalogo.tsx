'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Plus, ChevronDown, ChevronRight, Edit2, Trash2, Loader2, GripVertical, Copy, MoreHorizontal, Eye, EyeOff, Clock, Package, DollarSign, Hash, ListMinus, Cloud } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenButton, ZenDialog, ZenBadge } from '@/components/ui/zen';
import {
    ZenDropdownMenu,
    ZenDropdownMenuContent,
    ZenDropdownMenuItem,
    ZenDropdownMenuTrigger,
    ZenDropdownMenuSeparator,
} from '@/components/ui/zen';
import { ZenConfirmModal } from '@/components/ui/zen/overlays/ZenConfirmModal';
import { SeccionEditorModal, SeccionFormData, CategoriaEditorModal, CategoriaFormData, CatalogoSkeleton } from './';
import { ItemEditorModal, ItemFormData } from '@/components/shared/catalogo/ItemEditorModal';
import { RentabilidadForm } from '@/components/shared/configuracion/RentabilidadForm';
import { ConfiguracionPrecios, calcularPrecio as calcularPrecioSistema } from '@/lib/actions/studio/catalogo/calcular-precio';
import {
    crearSeccion,
    actualizarSeccion,
    eliminarSeccion,
    crearCategoria,
    actualizarCategoria,
    eliminarCategoria,
    crearItem,
    actualizarItem,
    eliminarItem,
} from '@/lib/actions/studio/catalogo';
import { obtenerConfiguracionPrecios } from '@/lib/actions/studio/catalogo/utilidad.actions';
import { useConfiguracionPreciosUpdateListener } from '@/hooks/useConfiguracionPreciosRefresh';
import { reordenarItems, moverItemACategoria, toggleItemPublish, reordenarCategorias, reordenarSecciones } from '@/lib/actions/studio/catalogo';
import { obtenerCatalogo } from '@/lib/actions/studio/config/catalogo.actions';
import { obtenerSeccionesConStats } from '@/lib/actions/studio/catalogo';
import { toast } from 'sonner';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragStartEvent,
    DragOverEvent,
    DragOverlay,
    useDroppable,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Seccion {
    id: string;
    name: string;
    order: number;
    createdAt: Date;
    categories?: Array<{ id: string; name: string }>;
    items?: number;
}

interface Categoria {
    id: string;
    name: string;
    description?: string;
    order?: number;
    items?: number;
}

type OperationalCategoryItem = 'PRODUCTION' | 'POST_PRODUCTION' | 'DELIVERY' | 'DIGITAL_DELIVERY' | 'PHYSICAL_DELIVERY' | 'LOGISTICS';

interface Item {
    id: string;
    name: string;
    cost: number;
    description?: string;
    tipoUtilidad?: 'servicio' | 'producto';
    billing_type?: 'HOUR' | 'SERVICE' | 'UNIT';
    operational_category?: OperationalCategoryItem | null;
    order?: number;
    isNew?: boolean;
    isFeatured?: boolean;
    categoriaId?: string;
    status?: string;
    gastos?: Array<{
        nombre: string;
        costo: number;
    }>;
}

export default function Catalogo() {
    const params = useParams();
    const studioSlug = params.slug as string;

    const [secciones, setSecciones] = useState<Seccion[]>([]);
    const [isUtilidadModalOpen, setIsUtilidadModalOpen] = useState(false);

    // Estados de expansión - inicializar todas las secciones expandidas
    const [seccionesExpandidas, setSeccionesExpandidas] = useState<Set<string>>(new Set());
    const [categoriasExpandidas, setCategoriasExpandidas] = useState<Set<string>>(new Set());

    // Datos
    const [categoriasData, setCategoriasData] = useState<Record<string, Categoria[]>>({});
    const [itemsData, setItemsData] = useState<Record<string, Item[]>>({});
    const [preciosConfig, setPreciosConfig] = useState<ConfiguracionPrecios | null>(null);

    // Estados de carga
    const [isLoading, setIsLoading] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const loadedRef = useRef(false);

    // Estados para drag & drop
    const [activeId, setActiveId] = useState<string | null>(null);

    // Configuración de sensores para drag & drop
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Estados de modales
    const [isSeccionModalOpen, setIsSeccionModalOpen] = useState(false);
    const [seccionToEdit, setSeccionToEdit] = useState<Seccion | null>(null);
    const [isCategoriaModalOpen, setIsCategoriaModalOpen] = useState(false);
    const [categoriaToEdit, setCategoriaToEdit] = useState<Categoria | null>(null);
    const [selectedSeccionForCategoria, setSelectedSeccionForCategoria] = useState<string | null>(null);
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [itemToEdit, setItemToEdit] = useState<Item | null>(null);
    const [selectedCategoriaForItem, setSelectedCategoriaForItem] = useState<string | null>(null);

    // Estados de confirmación de eliminación
    const [isDeleteSeccionModalOpen, setIsDeleteSeccionModalOpen] = useState(false);
    const [seccionToDelete, setSeccionToDelete] = useState<Seccion | null>(null);
    const [isDeleteCategoriaModalOpen, setIsDeleteCategoriaModalOpen] = useState(false);
    const [categoriaToDelete, setCategoriaToDelete] = useState<Categoria | null>(null);
    const [isDeleteItemModalOpen, setIsDeleteItemModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<Item | null>(null);

    // Función para cargar configuración de precios
    const loadConfiguracionPrecios = useCallback(async () => {
        try {
            console.log('[Catalogo] 🔄 Recargando configuración de precios...');
            const response = await obtenerConfiguracionPrecios(studioSlug);
            if (response) {
                const parseValue = (val: string | undefined, defaultValue: number): number => {
                    return val ? parseFloat(val) : defaultValue;
                };

                const newConfig = {
                    utilidad_servicio: parseValue(response.utilidad_servicio, 0.30),
                    utilidad_producto: parseValue(response.utilidad_producto, 0.40),
                    comision_venta: parseValue(response.comision_venta, 0.10),
                    sobreprecio: parseValue(response.sobreprecio, 0.05),
                };

                console.log('[Catalogo] ✅ Configuración actualizada:', newConfig);
                setPreciosConfig(newConfig);
            }
        } catch (error) {
            console.error("Error loading price config:", error);
        }
    }, [studioSlug]);

    // Escuchar actualizaciones de configuración de precios
    useConfiguracionPreciosUpdateListener(studioSlug, loadConfiguracionPrecios);

    // Función para cargar datos
    const loadData = useCallback(async () => {
        try {
            console.log('📦 loadData iniciado para studioSlug:', studioSlug);
            setIsInitialLoading(true);

            const catalogoResponse = await obtenerCatalogo(studioSlug, false);

            if (catalogoResponse.success && catalogoResponse.data) {
                const newCategoriasData: Record<string, Categoria[]> = {};
                const newItemsData: Record<string, Item[]> = {};

                catalogoResponse.data.forEach((seccion) => {
                    newCategoriasData[seccion.id] = seccion.categorias.map(cat => ({
                        id: cat.id,
                        name: cat.nombre,
                        description: undefined,
                        order: cat.orden,
                        items: cat.servicios.length,
                    }));

                    seccion.categorias.forEach(cat => {
                        newItemsData[cat.id] = cat.servicios.map(servicio => {
                            const tipoUtilidad: 'servicio' | 'producto' =
                                servicio.tipo_utilidad === 'service' ? 'servicio'
                                    : servicio.tipo_utilidad === 'product' ? 'producto'
                                        : 'servicio';
                            return {
                                id: servicio.id,
                                name: servicio.nombre,
                                cost: servicio.costo,
                                tipoUtilidad,
                                billing_type: (servicio.billing_type || 'SERVICE') as 'HOUR' | 'SERVICE' | 'UNIT',
                                operational_category: servicio.operational_category ?? undefined,
                                order: servicio.orden,
                                status: servicio.status || "active",
                                isNew: false,
                                isFeatured: false,
                                categoriaId: cat.id,
                                gastos: servicio.gastos?.map(g => ({
                                    nombre: g.nombre,
                                    costo: g.costo,
                                })) || [],
                            };
                        });
                    });
                });

                setCategoriasData(newCategoriasData);
                setItemsData(newItemsData);
                console.log('✅ Datos cargados correctamente');
            } else {
                console.error('❌ Error en catalogoResponse:', catalogoResponse.error);
                toast.error(catalogoResponse.error || "Error al cargar el catálogo");
            }
        } catch (error) {
            console.error("❌ Error loading data:", error);
            toast.error("Error al cargar datos");
        } finally {
            console.log('🏁 loadData finalizado, estableciendo isInitialLoading a false');
            setIsInitialLoading(false);
        }
    }, [studioSlug]);

    // Cargar datos del catálogo (secciones con stats)
    useEffect(() => {
        const loadCatalogoData = async () => {
            try {
                const resultSecciones = await obtenerSeccionesConStats(studioSlug);

                if (resultSecciones.success && resultSecciones.data) {
                    const seccionesTransformadas = resultSecciones.data.map((seccion: {
                        id: string;
                        name: string;
                        order: number;
                        createdAt: Date;
                        totalCategorias?: number;
                        totalItems?: number;
                    }) => ({
                        id: seccion.id,
                        name: seccion.name,
                        order: seccion.order,
                        createdAt: seccion.createdAt,
                        categories: seccion.totalCategorias ? Array(seccion.totalCategorias).fill(null) : [],
                        items: seccion.totalItems ?? 0,
                    }));
                    setSecciones(seccionesTransformadas);
                    // Inicializar secciones expandidas después de cargar
                    setSeccionesExpandidas(new Set(seccionesTransformadas.map(s => s.id)));
                }

            } catch (error) {
                console.error('Error cargando datos del catálogo:', error);
                toast.error('Error al cargar el catálogo');
            }
        };

        loadCatalogoData();
    }, [studioSlug]);

    // Carga inicial al montar y cuando cambia studioSlug
    useEffect(() => {
        console.log('🔵 Catalogo useEffect ejecutado, loadedRef.current:', loadedRef.current, 'studioSlug:', studioSlug);
        if (!studioSlug) return;

        if (!loadedRef.current) {
            console.log('🟢 Iniciando carga inicial de datos...');
            loadedRef.current = true;
        } else {
            console.log('🟡 Recargando datos por cambio de studioSlug...');
            loadedRef.current = false; // Resetear para permitir recarga
        }

        loadConfiguracionPrecios().catch(err => console.error('Error en loadConfiguracionPrecios:', err));
        loadData().catch(err => console.error('Error en loadData:', err));
    }, [studioSlug, loadConfiguracionPrecios, loadData]);

    const toggleSeccion = (seccionId: string) => {
        const isExpanded = seccionesExpandidas.has(seccionId);

        if (isExpanded) {
            // Colapsar
            setSeccionesExpandidas(prev => {
                const newSet = new Set(prev);
                newSet.delete(seccionId);
                return newSet;
            });
        } else {
            // Expandir (las categorías ya están cargadas)
            setSeccionesExpandidas(prev => new Set(prev).add(seccionId));
        }
    };

    const toggleCategoria = (categoriaId: string) => {
        const isExpanded = categoriasExpandidas.has(categoriaId);

        if (isExpanded) {
            // Colapsar
            setCategoriasExpandidas(prev => {
                const newSet = new Set(prev);
                newSet.delete(categoriaId);
                return newSet;
            });
        } else {
            // Expandir (items ya están cargados desde el inicio, sin consulta adicional)
            setCategoriasExpandidas(prev => new Set(prev).add(categoriaId));
        }
    };

    // Funciones de drag & drop
    const handleDragStart = (event: DragStartEvent) => {
        const activeId = event.active.id as string;
        setActiveId(activeId);

        // Verificar si se está arrastrando una categoría
        const isCategoria = Object.values(categoriasData).some(categorias =>
            categorias.some(cat => cat.id === activeId)
        );

        // Si se está arrastrando una categoría, colapsar todas las categorías
        // para hacer el reordenamiento más limpio y menos caótico
        if (isCategoria && categoriasExpandidas.size > 0) {
            setCategoriasExpandidas(new Set());
        }
    };

    // Función para manejar drag over - expandir categorías automáticamente solo cuando se arrastra un item
    const handleDragOver = useCallback((event: DragOverEvent) => {
        const { over, active } = event;
        if (!over || !active) return;

        const activeId = String(active.id);
        const overId = String(over.id);

        // Verificar qué tipo de elemento se está arrastrando
        const isItem = Object.values(itemsData).some(items =>
            items.some(item => item.id === activeId)
        );
        const isCategoria = Object.values(categoriasData).some(categorias =>
            categorias.some(cat => cat.id === activeId)
        );
        const isSeccion = secciones.some(sec => sec.id === activeId);

        // Solo expandir categorías si se está arrastrando un item
        // Si se está reordenando una categoría o sección, no expandir nada
        if (!isItem || isCategoria || isSeccion) {
            return;
        }

        // Buscar si el overId corresponde a una categoría
        let categoriaId = null;

        // Verificar si es el EmptyCategoryDropZone
        if (overId.startsWith("categoria-")) {
            categoriaId = overId.replace("categoria-", "");
        } else {
            // Verificar si es directamente el ID de una categoría
            for (const [, categorias] of Object.entries(categoriasData)) {
                if (categorias.some(cat => cat.id === overId)) {
                    categoriaId = overId;
                    break;
                }
            }
        }

        // Si encontramos una categoría y está contraída, expandirla (items ya están cargados)
        if (categoriaId && !categoriasExpandidas.has(categoriaId)) {
            setCategoriasExpandidas(prev => new Set([...prev, categoriaId]));
        }
    }, [categoriasExpandidas, categoriasData, itemsData, secciones]);

    // Nueva función unificada de drag & drop siguiendo la guía
    const handleDragEnd = useCallback(
        async (event: DragEndEvent) => {
            const { active, over } = event;

            if (!over || !active) return;

            const activeId = String(active.id);
            const overId = String(over.id);

            if (activeId === overId) return;

            // Verificar si se está arrastrando una sección sobre otra sección
            const activeSeccion = secciones.find(sec => sec.id === activeId);
            const overSeccion = secciones.find(sec => sec.id === overId);

            if (activeSeccion && overSeccion) {
                // Reordenamiento de secciones
                const activeIndex = secciones.findIndex(sec => sec.id === activeId);
                const overIndex = secciones.findIndex(sec => sec.id === overId);

                if (activeIndex === -1 || overIndex === -1) {
                    setActiveId(null);
                    return;
                }

                // Guardar estado original para revertir en caso de error
                const originalSecciones = [...secciones];

                try {
                    // Reordenar localmente
                    const newSecciones = arrayMove(secciones, activeIndex, overIndex);
                    const seccionesConOrder = newSecciones.map((sec, index) => ({
                        ...sec,
                        order: index
                    }));

                    setSecciones(seccionesConOrder);

                    // Actualizar en el backend
                    const seccionIds = newSecciones.map(sec => sec.id);
                    const response = await reordenarSecciones(studioSlug, seccionIds);

                    if (!response.success) {
                        throw new Error(response.error);
                    }

                    toast.success("Orden de secciones actualizado");
                } catch (error) {
                    console.error("Error reordenando secciones:", error);
                    toast.error("Error al actualizar el orden de secciones");
                    // Revertir cambios
                    setSecciones(originalSecciones);
                } finally {
                    setActiveId(null);
                }
                return;
            }

            // Verificar qué tipo de elemento se está arrastrando
            let activeCategoria = null;
            let activeSeccionId = null;
            for (const [seccionId, categorias] of Object.entries(categoriasData)) {
                activeCategoria = categorias.find(cat => cat.id === activeId);
                if (activeCategoria) {
                    activeSeccionId = seccionId;
                    break;
                }
            }

            // Si se está arrastrando una categoría, manejar reordenamiento de categorías
            if (activeCategoria && activeSeccionId) {
                // Verificar si se está soltando sobre otra categoría de la misma sección
                const categoriasSeccion = categoriasData[activeSeccionId] || [];
                const overCategoria = categoriasSeccion.find(cat => cat.id === overId);

                if (overCategoria) {
                    // Reordenamiento de categorías dentro de la misma sección
                    const activeIndex = categoriasSeccion.findIndex(cat => cat.id === activeId);
                    const overIndex = categoriasSeccion.findIndex(cat => cat.id === overId);

                    if (activeIndex === -1 || overIndex === -1) {
                        setActiveId(null);
                        return;
                    }

                    // Guardar estado original para revertir en caso de error
                    const originalCategoriasData = JSON.parse(JSON.stringify(categoriasData));

                    try {
                        // Reordenar localmente
                        const newCategorias = arrayMove(categoriasSeccion, activeIndex, overIndex);
                        const categoriasConOrder = newCategorias.map((cat, index) => ({
                            ...cat,
                            order: index
                        }));

                        setCategoriasData(prev => ({
                            ...prev,
                            [activeSeccionId]: categoriasConOrder
                        }));

                        // Actualizar en el backend
                        const categoriaIds = newCategorias.map(cat => cat.id);
                        const response = await reordenarCategorias(categoriaIds);

                        if (!response.success) {
                            throw new Error(response.error);
                        }

                        toast.success("Orden de categorías actualizado");
                    } catch (error) {
                        console.error("Error reordenando categorías:", error);
                        toast.error("Error al actualizar el orden de categorías");
                        // Revertir cambios
                        setCategoriasData(originalCategoriasData);
                    } finally {
                        setActiveId(null);
                    }
                    return;
                }
            }

            console.log("🔍 Debug drag end:", {
                activeId,
                overId,
                activeType: "item",
            });

            // Determinar si se está arrastrando a una categoría vacía
            const isDroppingOnEmptyCategory = overId.startsWith("categoria-");
            let targetCategoriaId = null;
            let overItem = null;

            if (isDroppingOnEmptyCategory) {
                // Extraer el ID de la categoría del ID del drop zone
                targetCategoriaId = overId.replace("categoria-", "");
            } else {
                // Buscar el item sobre el que se está soltando
                for (const [categoriaId, items] of Object.entries(itemsData)) {
                    overItem = items.find(item => item.id === overId);
                    if (overItem) {
                        targetCategoriaId = categoriaId;
                        break;
                    }
                }
            }

            if (!targetCategoriaId) {
                console.log("❌ No se pudo determinar la categoría destino");
                setActiveId(null);
                return;
            }

            // Buscar el item que se está arrastrando
            let activeItem = null;
            let activeCategoriaId = null;
            for (const [categoriaId, items] of Object.entries(itemsData)) {
                activeItem = items.find(item => item.id === activeId);
                if (activeItem) {
                    activeCategoriaId = categoriaId;
                    break;
                }
            }

            if (!activeItem || !activeCategoriaId) {
                console.log("❌ No se pudo encontrar el item activo");
                setActiveId(null);
                return;
            }

            // Determinar si es reordenamiento dentro de la misma categoría
            const isReordering = activeCategoriaId === targetCategoriaId;

            console.log("📁 Tipo de operación:", {
                isReordering,
                fromCategory: activeCategoriaId,
                toCategory: targetCategoriaId,
                activeItem: activeItem.name,
                overItem: overItem?.name,
            });

            // Guardar estado original para revertir en caso de error
            const originalItemsData = JSON.parse(JSON.stringify(itemsData));
            const originalCategoriasData = JSON.parse(JSON.stringify(categoriasData));

            try {

                if (isReordering) {
                    // Reordenamiento dentro de la misma categoría
                    const items = itemsData[activeCategoriaId] || [];
                    const activeIndex = items.findIndex(item => item.id === activeId);
                    const overIndex = items.findIndex(item => item.id === overId);

                    if (activeIndex === -1 || overIndex === -1) {
                        setActiveId(null);
                        return;
                    }

                    const newItems = arrayMove(items, activeIndex, overIndex);
                    const itemsConOrder = newItems.map((item, index) => ({
                        ...item,
                        order: index
                    }));

                    setItemsData(prev => ({
                        ...prev,
                        [activeCategoriaId]: itemsConOrder
                    }));

                    const itemIds = newItems.map(i => i.id);
                    const response = await reordenarItems(itemIds);

                    if (!response.success) {
                        throw new Error(response.error);
                    }

                    toast.success("Orden de items actualizado");
                } else {
                    // Movimiento entre categorías
                    const targetItems = itemsData[targetCategoriaId] || [];
                    let newIndex = targetItems.length;

                    if (!isDroppingOnEmptyCategory && overItem) {
                        // Si se suelta sobre un item, insertar en su posición
                        const overIndex = targetItems.findIndex(item => item.id === overId);
                        newIndex = overIndex === -1 ? targetItems.length : overIndex;
                    }

                    // Actualizar estado local inmediatamente (optimistic update)
                    // Actualizar categoriaId cuando se mueve a otra categoría
                    const newItem = {
                        ...activeItem,
                        order: newIndex,
                        categoriaId: targetCategoriaId // Actualizar categoriaId al mover entre categorías
                    };

                    // Remover de categoría origen
                    setItemsData(prev => ({
                        ...prev,
                        [activeCategoriaId]: prev[activeCategoriaId]?.filter(i => i.id !== activeId) || []
                    }));

                    // Agregar a categoría destino
                    setItemsData(prev => ({
                        ...prev,
                        [targetCategoriaId]: [...(prev[targetCategoriaId] || []), newItem]
                    }));

                    // Actualizar contadores de categorías
                    setCategoriasData(prev => {
                        const newData = { ...prev };
                        Object.keys(newData).forEach(seccionId => {
                            newData[seccionId] = newData[seccionId].map(cat => {
                                if (cat.id === activeCategoriaId) {
                                    return { ...cat, items: Math.max(0, (cat.items || 0) - 1) };
                                }
                                if (cat.id === targetCategoriaId) {
                                    return { ...cat, items: (cat.items || 0) + 1 };
                                }
                                return cat;
                            });
                        });
                        return newData;
                    });

                    // Actualizar en el backend
                    const response = await moverItemACategoria(activeId, targetCategoriaId);

                    if (!response.success) {
                        throw new Error(response.error);
                    }

                    const targetCategoriaName = Object.values(categoriasData).flat().find(c => c.id === targetCategoriaId)?.name || 'nueva categoría';
                    toast.success(`Item movido a ${targetCategoriaName}`);
                }
            } catch (error) {
                console.error("Error en drag & drop:", error);
                toast.error("Error al actualizar la posición del item");

                // Revertir cambios
                setItemsData(originalItemsData);
                setCategoriasData(originalCategoriasData);
            } finally {
                setActiveId(null);
            }
        },
        [secciones, itemsData, categoriasData, studioSlug]
    );

    // Componente para zonas de drop vacías
    const EmptyCategoryDropZone = ({ categoria }: { categoria: Categoria }) => {
        const { setNodeRef, isOver } = useDroppable({
            id: `categoria-${categoria.id}`,
        });

        return (
            <div
                ref={setNodeRef}
                className={`text-center py-8 min-h-[100px] flex items-center justify-center border-2 border-dashed rounded-lg m-4 transition-colors ${isOver
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-zinc-700 bg-zinc-800/30'
                    }`}
            >
                <div className="text-center">
                    <div className="text-zinc-500 mb-2">
                        <Plus className="h-8 w-8 mx-auto" />
                    </div>
                    <p className="text-sm text-zinc-400">
                        {isOver ? 'Suelta aquí para agregar a esta categoría' : 'Arrastra items aquí para agregarlos a esta categoría'}
                    </p>
                </div>
            </div>
        );
    };

    // Componentes sortables
    const SortableSeccion = ({ seccion }: { seccion: Seccion }) => {
        const {
            attributes,
            listeners,
            setNodeRef,
            transform,
            transition,
            isDragging,
        } = useSortable({ id: seccion.id });

        const style = {
            transform: CSS.Transform.toString(transform),
            transition,
            opacity: isDragging ? 0.5 : 1,
        };

        const isSeccionExpandida = seccionesExpandidas.has(seccion.id);
        const categorias = categoriasData[seccion.id] || [];

        return (
            <div ref={setNodeRef} style={style} className="relative">
                <div className="border border-zinc-700 rounded-lg overflow-hidden">
                    {/* Header de la sección */}
                    <div className="flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors bg-zinc-800/30">
                        <div className="flex items-center gap-3 flex-1 text-left">
                            <button
                                {...attributes}
                                {...listeners}
                                className="p-1 hover:bg-zinc-700 rounded cursor-grab active:cursor-grabbing mr-2"
                                title="Arrastrar para reordenar"
                            >
                                <GripVertical className="h-4 w-4 text-zinc-500" />
                            </button>
                            <button
                                onClick={() => toggleSeccion(seccion.id)}
                                className="flex items-center gap-3 flex-1 text-left"
                            >
                                {isSeccionExpandida ? (
                                    <ChevronDown className="w-4 h-4 text-zinc-400" />
                                ) : (
                                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                                )}
                                <div>
                                    <h4 className="font-semibold text-white">{seccion.name}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs bg-zinc-700 text-zinc-400 px-2 py-1 rounded">
                                            {categorias.length} {categorias.length === 1 ? 'categoría' : 'categorías'}
                                        </span>
                                        <span className="text-xs bg-zinc-700 text-zinc-400 px-2 py-1 rounded">
                                            {categorias.reduce((acc, cat) => acc + (cat.items || 0), 0)} {categorias.reduce((acc, cat) => acc + (cat.items || 0), 0) === 1 ? 'item' : 'items'}
                                        </span>
                                    </div>
                                </div>
                            </button>
                        </div>
                        <div className="flex items-center gap-1">
                            <ZenButton
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleCreateCategoria(seccion.id);
                                }}
                                variant="ghost"
                                size="sm"
                                className="w-8 h-8 p-0"
                                title="Agregar categoría"
                            >
                                <Plus className="w-4 h-4" />
                            </ZenButton>
                            <ZenDropdownMenu>
                                <ZenDropdownMenuTrigger asChild>
                                    <ZenButton
                                        variant="ghost"
                                        size="sm"
                                        className="w-8 h-8 p-0"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <MoreHorizontal className="w-4 h-4" />
                                    </ZenButton>
                                </ZenDropdownMenuTrigger>
                                <ZenDropdownMenuContent align="end" className="w-48">
                                    <ZenDropdownMenuItem onClick={() => handleEditSeccion(seccion)}>
                                        <Edit2 className="h-4 w-4 mr-2" />
                                        Editar sección
                                    </ZenDropdownMenuItem>
                                    <ZenDropdownMenuSeparator />
                                    <ZenDropdownMenuItem
                                        onClick={() => handleDeleteSeccion(seccion)}
                                        className="text-red-400 focus:text-red-300"
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Eliminar sección
                                    </ZenDropdownMenuItem>
                                </ZenDropdownMenuContent>
                            </ZenDropdownMenu>
                        </div>
                    </div>

                    {/* Contenido de la sección */}
                    {isSeccionExpandida && (
                        <div className="bg-zinc-900/50">
                            {categorias.length === 0 ? (
                                <div className="p-8 text-center text-zinc-500">
                                    <p>No hay categorías en esta sección</p>
                                    <ZenButton
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleCreateCategoria(seccion.id)}
                                        className="mt-2"
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Crear categoría
                                    </ZenButton>
                                </div>
                            ) : (
                                <SortableContext
                                    items={categorias.map(c => c.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {categorias
                                        .sort((a, b) => (a.order || 0) - (b.order || 0))
                                        .map((categoria, categoriaIndex) => (
                                            <SortableCategoria
                                                key={categoria.id}
                                                categoria={categoria}
                                                categoriaIndex={categoriaIndex}
                                            />
                                        ))}
                                </SortableContext>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const SortableCategoria = ({
        categoria,
        categoriaIndex
    }: {
        categoria: Categoria;
        categoriaIndex: number;
    }) => {
        const {
            attributes,
            listeners,
            setNodeRef,
            transform,
            transition,
            isDragging,
        } = useSortable({ id: categoria.id });

        const style = {
            transform: CSS.Transform.toString(transform),
            transition,
            opacity: isDragging ? 0.5 : 1,
        };

        const isCategoriaExpandida = categoriasExpandidas.has(categoria.id);
        const items = itemsData[categoria.id] || [];

        return (
            <div ref={setNodeRef} style={style} className={`${categoriaIndex > 0 ? 'border-t border-zinc-700/50' : ''}`}>
                <div className="flex items-center justify-between p-3 pl-8 hover:bg-zinc-800/30 transition-colors">
                    <div className="flex items-center gap-3 flex-1 text-left">
                        <button
                            {...attributes}
                            {...listeners}
                            className="p-1 hover:bg-zinc-700 rounded cursor-grab active:cursor-grabbing mr-2"
                            title="Arrastrar para reordenar"
                        >
                            <GripVertical className="h-4 w-4 text-zinc-500" />
                        </button>
                        <button
                            onClick={() => toggleCategoria(categoria.id)}
                            className="flex items-center gap-3 flex-1 text-left"
                        >
                            {isCategoriaExpandida ? (
                                <ChevronDown className="w-4 h-4 text-zinc-400" />
                            ) : (
                                <ChevronRight className="w-4 h-4 text-zinc-400" />
                            )}
                            <div>
                                <h5 className="text-sm font-medium text-zinc-300">{categoria.name}</h5>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs bg-zinc-700 text-zinc-400 px-2 py-1 rounded">
                                        {categoria.items || 0} {categoria.items === 1 ? 'item' : 'items'}
                                    </span>
                                </div>
                            </div>
                        </button>
                    </div>
                    <div className="flex items-center gap-1">
                        <ZenButton
                            onClick={(e) => {
                                e.stopPropagation();
                                handleCreateItem(categoria.id);
                            }}
                            variant="ghost"
                            size="sm"
                            className="w-8 h-8 p-0"
                            title="Agregar item"
                        >
                            <Plus className="w-4 h-4" />
                        </ZenButton>
                        <ZenDropdownMenu>
                            <ZenDropdownMenuTrigger asChild>
                                <ZenButton
                                    variant="ghost"
                                    size="sm"
                                    className="w-8 h-8 p-0"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <MoreHorizontal className="w-4 h-4" />
                                </ZenButton>
                            </ZenDropdownMenuTrigger>
                            <ZenDropdownMenuContent align="end" className="w-48">
                                <ZenDropdownMenuItem onClick={() => handleEditCategoria(categoria)}>
                                    <Edit2 className="h-4 w-4 mr-2" />
                                    Editar categoría
                                </ZenDropdownMenuItem>
                                <ZenDropdownMenuSeparator />
                                <ZenDropdownMenuItem
                                    onClick={() => handleDeleteCategoria(categoria)}
                                    className="text-red-400 focus:text-red-300"
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Eliminar categoría
                                </ZenDropdownMenuItem>
                            </ZenDropdownMenuContent>
                        </ZenDropdownMenu>
                    </div>
                </div>

                {/* Contenido de la categoría */}
                {isCategoriaExpandida && (
                    <div className="bg-zinc-800/20 border-l-2 border-zinc-700/30 ml-12">
                        {items.length === 0 ? (
                            <EmptyCategoryDropZone categoria={categoria} />
                        ) : (
                            <SortableContext
                                items={items.map(i => i.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                {items
                                    .sort((a, b) => (a.order || 0) - (b.order || 0))
                                    .map((item, itemIndex) => (
                                        <SortableItem
                                            key={item.id}
                                            item={item}
                                            itemIndex={itemIndex}
                                        />
                                    ))}
                            </SortableContext>
                        )}
                    </div>
                )}
            </div>
        );
    };



    const SortableItem = ({
        item,
        itemIndex
    }: {
        item: Item;
        itemIndex: number;
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

        const precios = preciosConfig ? calcularPrecioSistema(
            item.cost,
            item.gastos?.reduce((acc, g) => acc + g.costo, 0) || 0,
            item.tipoUtilidad || 'servicio',
            preciosConfig
        ) : { precio_final: 0 };

        const isInactive = item.status !== "active";

        return (
            <div
                ref={setNodeRef}
                style={style}
                className={`flex items-center justify-between p-2 pl-6 ${itemIndex > 0 ? 'border-t border-zinc-700/30' : ''} ${isItemModalOpen && itemToEdit?.id === item.id
                    ? 'bg-zinc-700/40'
                    : 'hover:bg-zinc-700/20'
                    } transition-colors cursor-pointer`}
                onClick={() => handleEditItem(item)}
            >
                <div className="flex items-center gap-2 flex-1 text-left py-1">
                    <button
                        {...attributes}
                        {...listeners}
                        className={`p-1 hover:bg-zinc-600 rounded cursor-grab active:cursor-grabbing ${isInactive ? 'opacity-50' : ''}`}
                        title="Arrastrar para reordenar"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <GripVertical className={`h-4 w-4 ${isInactive ? 'text-zinc-500' : 'text-zinc-500'}`} />
                    </button>

                    <div className="flex-1 min-w-0">
                        <div className={`text-sm font-light leading-tight ${isInactive ? 'text-zinc-500' : 'text-zinc-300'}`}>
                            <span className="break-words">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            {/* Badge de tipo (Servicio/Producto) */}
                            <ZenBadge
                                variant="outline"
                                size="sm"
                                className={`px-1 py-0 text-[10px] font-light rounded-sm ${isInactive
                                    ? 'border-zinc-500 text-zinc-500'
                                    : (item.tipoUtilidad || 'servicio') === 'servicio'
                                        ? 'border-blue-600 text-blue-400'
                                        : 'border-purple-600 text-purple-400'
                                    }`}
                            >
                                {(item.tipoUtilidad || 'servicio') === 'servicio' ? 'Servicio' : 'Producto'}
                            </ZenBadge>
                            {/* Badge categoría operativa (cronograma) - siempre visible; gris si sin definir */}
                            <ZenBadge
                                variant="outline"
                                size="sm"
                                className={`px-1 py-0 text-[10px] font-light rounded-sm inline-flex items-center gap-0.5 ${isInactive
                                    ? 'border-zinc-500 text-zinc-500'
                                    : !item.operational_category || item.operational_category === 'LOGISTICS'
                                        ? 'bg-zinc-500/10 border-zinc-500/50 text-zinc-400'
                                        : item.operational_category === 'PRODUCTION'
                                            ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-400'
                                            : item.operational_category === 'POST_PRODUCTION'
                                                ? 'bg-amber-500/10 border-amber-500/50 text-amber-400'
                                                : item.operational_category === 'PHYSICAL_DELIVERY'
                                                    ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                                                    : 'bg-sky-500/10 border-sky-500/50 text-sky-400'
                                    }`}
                            >
                                {(!item.operational_category || item.operational_category === 'LOGISTICS') ? <ListMinus className="h-2.5 w-2.5 shrink-0 pr-0.5" /> : (item.operational_category === 'DIGITAL_DELIVERY' || item.operational_category === 'DELIVERY') ? <Cloud className="h-2.5 w-2.5 shrink-0 pr-0.5" /> : item.operational_category === 'PHYSICAL_DELIVERY' ? <Package className="h-2.5 w-2.5 shrink-0 pr-0.5" /> : <ListMinus className="h-2.5 w-2.5 shrink-0 pr-0.5" />}
                                {(!item.operational_category || item.operational_category === 'LOGISTICS') ? 'Sin definir' : item.operational_category === 'PRODUCTION' ? 'Producción' : item.operational_category === 'POST_PRODUCTION' ? 'Posproducción' : item.operational_category === 'PHYSICAL_DELIVERY' ? 'Entregable Físico' : 'Entregable Digital'}
                            </ZenBadge>
                            {/* Badge de tipo de facturación (solo para servicios, productos siempre son UNIT) */}
                            {item.billing_type && (item.tipoUtilidad || 'servicio') === 'servicio' && (
                                <ZenBadge
                                    variant="outline"
                                    size="sm"
                                    className={`px-1 py-0 text-[10px] font-light rounded-sm flex items-center gap-0.5 ${isInactive
                                        ? 'border-zinc-500 text-zinc-500'
                                        : item.billing_type === 'HOUR'
                                            ? 'border-amber-600 text-amber-400'
                                            : item.billing_type === 'UNIT'
                                                ? 'border-purple-600 text-purple-400'
                                                : 'border-emerald-600 text-emerald-400'
                                        }`}
                                >
                                    {item.billing_type === 'HOUR' ? (
                                        <>
                                            <Clock className="w-2.5 h-2.5" />
                                            Por Hora
                                        </>
                                    ) : item.billing_type === 'UNIT' ? (
                                        <>
                                            <Hash className="w-2.5 h-2.5" />
                                            Por Unidad
                                        </>
                                    ) : (
                                        <>
                                            <DollarSign className="w-2.5 h-2.5" />
                                            Fijo
                                        </>
                                    )}
                                </ZenBadge>
                            )}
                            <span className={`text-xs ${isInactive ? 'text-zinc-500' : 'text-green-400'}`}>
                                ${precios.precio_final.toLocaleString()}
                                {item.billing_type === 'HOUR' && (
                                    <span className="ml-0.5">/h</span>
                                )}
                            </span>
                            {isInactive && (
                                <ZenBadge
                                    variant="outline"
                                    size="sm"
                                    className="px-1 py-0 text-[10px] font-light rounded-full border-zinc-600 text-zinc-500 bg-zinc-800/50"
                                >
                                    Inactivo
                                </ZenBadge>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">

                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <ZenDropdownMenu>
                            <ZenDropdownMenuTrigger asChild>
                                <ZenButton
                                    variant="ghost"
                                    size="sm"
                                    className={`h-8 w-8 p-0 ${isInactive ? 'text-zinc-500 hover:text-zinc-400' : ''}`}
                                >
                                    <MoreHorizontal className={`h-4 w-4 ${isInactive ? 'text-zinc-500' : ''}`} />
                                </ZenButton>
                            </ZenDropdownMenuTrigger>
                            <ZenDropdownMenuContent align="end" className="w-48">
                                <ZenDropdownMenuItem onClick={() => handleTogglePublish(item)}>
                                    {item.status === "active" ? (
                                        <>
                                            <EyeOff className="h-4 w-4 mr-2" />
                                            Desactivar
                                        </>
                                    ) : (
                                        <>
                                            <Eye className="h-4 w-4 mr-2" />
                                            Activar
                                        </>
                                    )}
                                </ZenDropdownMenuItem>
                                <ZenDropdownMenuSeparator />
                                <ZenDropdownMenuItem onClick={() => handleDuplicateItem(item)}>
                                    <Copy className="h-4 w-4 mr-2" />
                                    Duplicar
                                </ZenDropdownMenuItem>
                                <ZenDropdownMenuSeparator />
                                <ZenDropdownMenuItem
                                    onClick={() => handleDeleteItem(item)}
                                    className="text-red-400 focus:text-red-300"
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Eliminar
                                </ZenDropdownMenuItem>
                            </ZenDropdownMenuContent>
                        </ZenDropdownMenu>
                    </div>
                </div>
            </div>
        );
    };

    // Handlers para secciones
    const handleCreateSeccion = () => {
        setSeccionToEdit(null);
        setIsSeccionModalOpen(true);
    };

    const handleEditSeccion = (seccion: Seccion) => {
        setSeccionToEdit(seccion);
        setIsSeccionModalOpen(true);
    };

    const handleDeleteSeccion = (seccion: Seccion) => {
        setSeccionToDelete(seccion);
        setIsDeleteSeccionModalOpen(true);
    };

    const handleSaveSeccion = async (data: SeccionFormData) => {
        try {
            if (data.id) {
                const response = await actualizarSeccion(studioSlug, data);
                if (!response.success) throw new Error(response.error);

                setSecciones(prev => prev.map(s =>
                    s.id === data.id ? { ...s, name: data.name } : s
                ));
                toast.success("Sección actualizada");
            } else {
                const response = await crearSeccion(studioSlug, data);
                if (!response.success) throw new Error(response.error);

                if (response.data) {
                    setSecciones(prev => [...prev, response.data as Seccion]);
                    toast.success("Sección creada");
                }
            }

            setIsSeccionModalOpen(false);
            setSeccionToEdit(null);
        } catch (error) {
            console.error("Error guardando sección:", error);
            toast.error(error instanceof Error ? error.message : "Error al guardar sección");
        }
    };

    const handleConfirmDeleteSeccion = async () => {
        if (!seccionToDelete) return;

        try {
            setIsLoading(true);
            const response = await eliminarSeccion(studioSlug, seccionToDelete.id);
            if (!response.success) throw new Error(response.error);

            setSecciones(prev => prev.filter(s => s.id !== seccionToDelete.id));
            setCategoriasData(prev => {
                const newData = { ...prev };
                delete newData[seccionToDelete.id];
                return newData;
            });
            setItemsData(prev => {
                const newData = { ...prev };
                delete newData[seccionToDelete.id];
                return newData;
            });

            toast.success("Sección eliminada correctamente");
        } catch (error) {
            console.error("Error eliminando sección:", error);
            toast.error(error instanceof Error ? error.message : "Error al eliminar sección");
        } finally {
            setIsLoading(false);
            setIsDeleteSeccionModalOpen(false);
            setSeccionToDelete(null);
        }
    };

    // Handlers para categorías
    const handleCreateCategoria = (seccionId: string) => {
        setSelectedSeccionForCategoria(seccionId);
        setCategoriaToEdit(null);
        setIsCategoriaModalOpen(true);
    };

    const handleEditCategoria = (categoria: Categoria) => {
        setCategoriaToEdit(categoria);
        setIsCategoriaModalOpen(true);
    };

    const handleDeleteCategoria = (categoria: Categoria) => {
        setCategoriaToDelete(categoria);
        setIsDeleteCategoriaModalOpen(true);
    };

    const handleSaveCategoria = async (data: CategoriaFormData) => {
        try {
            if (data.id) {
                const response = await actualizarCategoria(data);
                if (!response.success) throw new Error(response.error);

                // Actualizar en el estado local
                setCategoriasData(prev => {
                    const newData = { ...prev };
                    Object.keys(newData).forEach(seccionId => {
                        newData[seccionId] = newData[seccionId].map(cat =>
                            cat.id === data.id ? { ...cat, name: data.name } : cat
                        );
                    });
                    return newData;
                });
                toast.success("Categoría actualizada");
            } else {
                const response = await crearCategoria({
                    ...data,
                    seccionId: selectedSeccionForCategoria!,
                });
                if (!response.success) throw new Error(response.error);

                if (response.data) {
                    const newCategoria = {
                        id: response.data.id,
                        name: response.data.name,
                        description: undefined, // CategoriaData no incluye description
                        order: response.data.order,
                        items: 0,
                    };

                    setCategoriasData(prev => ({
                        ...prev,
                        [selectedSeccionForCategoria!]: [
                            ...(prev[selectedSeccionForCategoria!] || []),
                            newCategoria
                        ]
                    }));
                    toast.success("Categoría creada");
                }
            }

            setIsCategoriaModalOpen(false);
            setCategoriaToEdit(null);
            setSelectedSeccionForCategoria(null);
        } catch (error) {
            console.error("Error guardando categoría:", error);
            toast.error(error instanceof Error ? error.message : "Error al guardar categoría");
        }
    };

    const handleConfirmDeleteCategoria = async () => {
        if (!categoriaToDelete) return;

        try {
            setIsLoading(true);
            const response = await eliminarCategoria(categoriaToDelete.id);
            if (!response.success) throw new Error(response.error);

            // Actualizar estado local
            setCategoriasData(prev => {
                const newData = { ...prev };
                Object.keys(newData).forEach(seccionId => {
                    newData[seccionId] = newData[seccionId].filter(cat => cat.id !== categoriaToDelete.id);
                });
                return newData;
            });

            setItemsData(prev => {
                const newData = { ...prev };
                delete newData[categoriaToDelete.id];
                return newData;
            });

            toast.success("Categoría eliminada correctamente");
        } catch (error) {
            console.error("Error eliminando categoría:", error);
            toast.error(error instanceof Error ? error.message : "Error al eliminar categoría");
        } finally {
            setIsLoading(false);
            setIsDeleteCategoriaModalOpen(false);
            setCategoriaToDelete(null);
        }
    };

    // Handlers para items
    const handleCreateItem = (categoriaId: string) => {
        setSelectedCategoriaForItem(categoriaId);
        setItemToEdit(null);
        setIsItemModalOpen(true);
    };

    const handleEditItem = (item: Item) => {
        setItemToEdit(item);
        setIsItemModalOpen(true);
    };

    const handleDeleteItem = (item: Item) => {
        setItemToDelete(item);
        setIsDeleteItemModalOpen(true);
    };

    const handleDuplicateItem = async (item: Item) => {
        try {
            setIsLoading(true);

            // Crear el item duplicado con nombre modificado
            const duplicatedItemData = {
                name: `${item.name} (Copia)`,
                cost: item.cost,
                description: item.description,
                categoriaeId: item.categoriaId || '',
                billing_type: item.billing_type || 'SERVICE',
                gastos: item.gastos || [],
                studioSlug: studioSlug,
            };

            const response = await crearItem(duplicatedItemData);

            if (response.success && response.data) {
                // Actualizar el estado local
                const newItem: Item = {
                    id: response.data.id,
                    name: response.data.name,
                    cost: response.data.cost,
                    tipoUtilidad: response.data.tipoUtilidad,
                    billing_type: (response.data.billing_type || 'SERVICE') as 'HOUR' | 'SERVICE' | 'UNIT',
                    order: response.data.order,
                    status: response.data.status,
                    isNew: false,
                    isFeatured: false,
                    categoriaId: item.categoriaId,
                    gastos: response.data.gastos,
                };

                setItemsData(prev => ({
                    ...prev,
                    [item.categoriaId || '']: [...(prev[item.categoriaId || ''] || []), newItem]
                }));

                // Actualizar contador de categoría
                setCategoriasData(prev => {
                    const newData = { ...prev };
                    Object.keys(newData).forEach(seccionId => {
                        newData[seccionId] = newData[seccionId].map(cat => {
                            if (cat.id === item.categoriaId) {
                                return { ...cat, items: (cat.items || 0) + 1 };
                            }
                            return cat;
                        });
                    });
                    return newData;
                });

                toast.success("Item duplicado exitosamente");
            } else {
                throw new Error(response.error || "Error al duplicar item");
            }
        } catch (error) {
            console.error("Error duplicando item:", error);
            toast.error("Error al duplicar item");
        } finally {
            setIsLoading(false);
        }
    };

    const handleTogglePublish = async (item: Item) => {
        try {
            setIsLoading(true);
            const response = await toggleItemPublish(item.id);

            if (response.success && response.data) {
                // Actualizar estado local
                setItemsData(prev => {
                    const newData = { ...prev };
                    Object.keys(newData).forEach(categoriaId => {
                        newData[categoriaId] = newData[categoriaId].map(i =>
                            i.id === item.id ? { ...i, status: response.data?.status || "active" } : i
                        );
                    });
                    return newData;
                });

                // Actualizar también itemToEdit para que el modal refleje los cambios
                setItemToEdit(prev => prev && prev.id === item.id ? {
                    ...prev,
                    status: response.data?.status || "active"
                } : prev);

                toast.success(
                    response.data.status === "active"
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
            setIsLoading(false);
        }
    };

    const handleSaveItem = async (data: ItemFormData) => {
        try {
            if (data.id) {
                const response = await actualizarItem(data);
                if (!response.success) throw new Error(response.error);

                // Actualizar en el estado local (incluir operational_category)
                setItemsData(prev => {
                    const newData = { ...prev };
                    Object.keys(newData).forEach(categoriaId => {
                        newData[categoriaId] = newData[categoriaId].map(item =>
                            item.id === data.id ? {
                                ...item,
                                name: data.name,
                                cost: data.cost,
                                tipoUtilidad: data.tipoUtilidad || item.tipoUtilidad || 'servicio',
                                billing_type: data.billing_type || item.billing_type || 'SERVICE',
                                operational_category: data.operational_category ?? item.operational_category ?? undefined,
                                status: (data as unknown as { status?: string }).status || item.status || 'active',
                                gastos: data.gastos || [],
                            } : item
                        );
                    });
                    return newData;
                });

                // Actualizar también itemToEdit para que el modal refleje los cambios
                setItemToEdit(prev => prev ? {
                    ...prev,
                    name: data.name,
                    cost: data.cost,
                    tipoUtilidad: data.tipoUtilidad || prev.tipoUtilidad || 'servicio',
                    billing_type: data.billing_type || prev.billing_type || 'SERVICE',
                    operational_category: data.operational_category ?? prev.operational_category ?? undefined,
                    status: (data as unknown as { status?: string }).status || prev.status || 'active',
                    gastos: data.gastos || [],
                } : null);
                    toast.success("Item actualizado");
                await loadData();
            } else {
                const response = await crearItem({
                    ...data,
                    categoriaeId: selectedCategoriaForItem!,
                    studioSlug: studioSlug,
                });
                if (!response.success) throw new Error(response.error);

                if (response.data) {
                    const newItem: Item = {
                        id: response.data.id,
                        name: response.data.name,
                        cost: response.data.cost,
                        tipoUtilidad: response.data.tipoUtilidad as 'servicio' | 'producto',
                        billing_type: (response.data.billing_type || 'SERVICE') as 'HOUR' | 'SERVICE' | 'UNIT',
                        operational_category: response.data.operational_category ?? undefined,
                        order: response.data.order,
                        status: response.data.status || 'active',
                        isNew: false,
                        isFeatured: false,
                        categoriaId: selectedCategoriaForItem!,
                        gastos: response.data.gastos,
                    };

                    setItemsData(prev => ({
                        ...prev,
                        [selectedCategoriaForItem!]: [
                            ...(prev[selectedCategoriaForItem!] || []),
                            newItem
                        ]
                    }));

                    // Actualizar contador en categorías
                    setCategoriasData(prev => {
                        const newData = { ...prev };
                        Object.keys(newData).forEach(seccionId => {
                            newData[seccionId] = newData[seccionId].map(cat =>
                                cat.id === selectedCategoriaForItem ? { ...cat, items: (cat.items || 0) + 1 } : cat
                            );
                        });
                        return newData;
                    });

                    toast.success("Item creado");
                }
                await loadData();
            }

            setIsItemModalOpen(false);
            setItemToEdit(null);
            setSelectedCategoriaForItem(null);
        } catch (error) {
            console.error("Error guardando item:", error);
            toast.error(error instanceof Error ? error.message : "Error al guardar item");
        }
    };

    const handleConfirmDeleteItem = async () => {
        if (!itemToDelete) return;

        try {
            setIsLoading(true);
            const response = await eliminarItem(itemToDelete.id);
            if (!response.success) throw new Error(response.error);

            // Actualizar estado local
            setItemsData(prev => {
                const newData = { ...prev };
                Object.keys(newData).forEach(categoriaId => {
                    newData[categoriaId] = newData[categoriaId].filter(item => item.id !== itemToDelete.id);
                });
                return newData;
            });

            // Actualizar contador en categorías
            setCategoriasData(prev => {
                const newData = { ...prev };
                Object.keys(newData).forEach(seccionId => {
                    newData[seccionId] = newData[seccionId].map(cat => {
                        // Encontrar la categoría que contiene el item eliminado
                        const categoriaId = Object.keys(itemsData).find(id =>
                            itemsData[id].some(item => item.id === itemToDelete.id)
                        );
                        if (categoriaId === cat.id) {
                            return { ...cat, items: Math.max(0, (cat.items || 0) - 1) };
                        }
                        return cat;
                    });
                });
                return newData;
            });

            toast.success("Item eliminado correctamente");
        } catch (error) {
            console.error("Error eliminando item:", error);
            toast.error(error instanceof Error ? error.message : "Error al eliminar item");
        } finally {
            setIsLoading(false);
            setIsDeleteItemModalOpen(false);
            setItemToDelete(null);
        }
    };

    if (isInitialLoading) {
        return <CatalogoSkeleton />;
    }

    return (
        <>
            {/* Modal de Márgenes */}
            <ZenDialog
                isOpen={isUtilidadModalOpen}
                onClose={() => setIsUtilidadModalOpen(false)}
                title="Configuración de Rentabilidad"
                description="Gestiona los márgenes de utilidad, comisiones y sobreprecios"
                maxWidth="2xl"
                closeOnClickOutside={false}
            >
                <RentabilidadForm
                    studioSlug={studioSlug}
                    onClose={() => setIsUtilidadModalOpen(false)}
                />
            </ZenDialog>

            <div className="space-y-4">
                {/* Header con botón de crear sección */}
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">Diseña la estructura de tu catálogo comercial</h3>
                    <ZenButton
                        onClick={handleCreateSeccion}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Nueva Sección
                    </ZenButton>
                </div>

                {/* Lista de secciones con drag & drop unificado */}
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={[
                            ...secciones.map(s => s.id),
                            ...Object.values(categoriasData).flat().map(c => c.id),
                            ...Object.values(itemsData).flat().map(i => i.id)
                        ]}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="space-y-2">
                            {secciones
                                .sort((a, b) => (a.order || 0) - (b.order || 0))
                                .map((seccion) => (
                                    <SortableSeccion key={seccion.id} seccion={seccion} />
                                ))}
                        </div>
                    </SortableContext>

                    <DragOverlay>
                        {activeId ? (
                            <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 opacity-90">
                                <div className="flex items-center gap-3">
                                    <GripVertical className="h-4 w-4 text-zinc-500" />
                                    <span className="font-medium text-white">
                                        {secciones.find(s => s.id === activeId)?.name ||
                                            categoriasData[Object.keys(categoriasData).find(key =>
                                                categoriasData[key].some(c => c.id === activeId)
                                            ) || '']?.find(c => c.id === activeId)?.name ||
                                            itemsData[Object.keys(itemsData).find(key =>
                                                itemsData[key].some(i => i.id === activeId)
                                            ) || '']?.find(i => i.id === activeId)?.name}
                                    </span>
                                </div>
                            </div>
                        ) : null}
                    </DragOverlay>
                </DndContext>

                {/* Modales */}
                <SeccionEditorModal
                    isOpen={isSeccionModalOpen}
                    onClose={() => {
                        setIsSeccionModalOpen(false);
                        setSeccionToEdit(null);
                    }}
                    onSave={handleSaveSeccion}
                    seccion={seccionToEdit}
                />

                <CategoriaEditorModal
                    isOpen={isCategoriaModalOpen}
                    onClose={() => {
                        setIsCategoriaModalOpen(false);
                        setCategoriaToEdit(null);
                        setSelectedSeccionForCategoria(null);
                    }}
                    onSave={handleSaveCategoria}
                    categoria={categoriaToEdit}
                />

                <ItemEditorModal
                    isOpen={isItemModalOpen}
                    onClose={() => {
                        setIsItemModalOpen(false);
                        setItemToEdit(null);
                        setSelectedCategoriaForItem(null);
                    }}
                    onSave={handleSaveItem}
                    onStatusChange={(itemId: string, status: string) => {
                        // Actualizar status en el estado local
                        setItemsData(prev => {
                            const newData = { ...prev };
                            Object.keys(newData).forEach(categoriaId => {
                                newData[categoriaId] = newData[categoriaId].map(item =>
                                    item.id === itemId ? {
                                        ...item,
                                        status: status
                                    } : item
                                );
                            });
                            return newData;
                        });

                        // Actualizar también itemToEdit para que el modal refleje los cambios
                        setItemToEdit(prev => prev && prev.id === itemId ? {
                            ...prev,
                            status: status
                        } : prev);
                    }}
                    item={itemToEdit ? {
                        id: itemToEdit.id,
                        name: itemToEdit.name,
                        cost: itemToEdit.cost,
                        tipoUtilidad: itemToEdit.tipoUtilidad || 'servicio',
                        billing_type: itemToEdit.billing_type || 'SERVICE',
                        operational_category: itemToEdit.operational_category ?? null,
                        description: '',
                        gastos: itemToEdit.gastos || [],
                        status: itemToEdit.status || 'active'
                    } as ItemFormData : undefined}
                    categoriaId={selectedCategoriaForItem || ''}
                    studioSlug={studioSlug}
                />

                <ZenConfirmModal
                    isOpen={isDeleteSeccionModalOpen}
                    onClose={() => {
                        setIsDeleteSeccionModalOpen(false);
                        setSeccionToDelete(null);
                    }}
                    onConfirm={handleConfirmDeleteSeccion}
                    title="Eliminar sección"
                    description={`¿Estás seguro de que deseas eliminar la sección "${seccionToDelete?.name}"? Esta acción no se puede deshacer.`}
                    confirmText="Eliminar"
                    cancelText="Cancelar"
                    variant="destructive"
                    loading={isLoading}
                />

                <ZenConfirmModal
                    isOpen={isDeleteCategoriaModalOpen}
                    onClose={() => {
                        setIsDeleteCategoriaModalOpen(false);
                        setCategoriaToDelete(null);
                    }}
                    onConfirm={handleConfirmDeleteCategoria}
                    title="Eliminar categoría"
                    description={`¿Estás seguro de que deseas eliminar la categoría "${categoriaToDelete?.name}"? Esta acción no se puede deshacer.`}
                    confirmText="Eliminar"
                    cancelText="Cancelar"
                    variant="destructive"
                    loading={isLoading}
                />

                <ZenConfirmModal
                    isOpen={isDeleteItemModalOpen}
                    onClose={() => {
                        setIsDeleteItemModalOpen(false);
                        setItemToDelete(null);
                    }}
                    onConfirm={handleConfirmDeleteItem}
                    title="Eliminar item"
                    description={`¿Estás seguro de que deseas eliminar el item "${itemToDelete?.name}"? Esta acción no se puede deshacer.`}
                    confirmText="Eliminar"
                    cancelText="Cancelar"
                    variant="destructive"
                    loading={isLoading}
                />
            </div>
        </>
    );
}
