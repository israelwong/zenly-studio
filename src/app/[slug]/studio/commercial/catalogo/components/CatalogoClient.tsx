'use client';

import React, { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus, ChevronDown, ChevronRight, Edit2, Trash2, Loader2, GripVertical, Copy, MoreHorizontal, Eye, EyeOff, Clock, DollarSign, Hash, MoveVertical, Link, X } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenButton, ZenDialog, ZenBadge } from '@/components/ui/zen';
import {
    ZenDropdownMenu,
    ZenDropdownMenuContent,
    ZenDropdownMenuItem,
    ZenDropdownMenuTrigger,
    ZenDropdownMenuSeparator,
} from '@/components/ui/zen';
import { ZenConfirmModal } from '@/components/ui/zen/overlays/ZenConfirmModal';
import { SeccionEditorModal, SeccionFormData, CategoriaEditorModal, CategoriaFormData } from './';
import { ItemEditorModal, ItemFormData } from '@/components/shared/catalogo/ItemEditorModal';
import { ItemLinksModal } from './ItemLinksModal';
import { SmartLinkBar } from './SmartLinkBar';
import { CatalogSortableItem } from './CatalogSortableItem';
import { UtilidadForm } from '@/components/shared/configuracion/UtilidadForm';
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
import { useConfiguracionPreciosUpdateListener } from '@/hooks/useConfiguracionPreciosRefresh';
import { reordenarItems, moverItemACategoria, toggleItemPublish, reordenarCategorias, reordenarSecciones } from '@/lib/actions/studio/catalogo';
import { getServiceLinks, updateServiceLinks, clearAllLinksForItem, type ServiceLinksMap } from '@/lib/actions/studio/config/item-links.actions';
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
import { cn } from '@/lib/utils';

interface Seccion {
    id: string;
    name: string;
    order: number;
    createdAt?: Date;
    categories?: Array<{ id: string; name: string }>;
    items?: number;
    totalCategorias?: number;
    totalItems?: number;
}

interface Categoria {
    id: string;
    name: string;
    description?: string;
    order?: number;
    items?: number;
}

interface Item {
    id: string;
    name: string;
    cost: number;
    description?: string;
    tipoUtilidad?: 'servicio' | 'producto';
    billing_type?: 'HOUR' | 'SERVICE' | 'UNIT';
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

interface CatalogoClientProps {
    studioSlug: string;
    initialCatalogo: Array<{
        id: string;
        nombre: string;
        orden: number;
        categorias: Array<{
            id: string;
            nombre: string;
            orden: number;
            servicios: Array<{
                id: string;
                nombre: string;
                costo: number;
                tipo_utilidad: string;
                billing_type: string;
                orden: number;
                status: string;
                gastos: Array<{
                    id: string;
                    nombre: string;
                    costo: number;
                }>;
            }>;
        }>;
    }>;
    initialPreciosConfig: ConfiguracionPrecios | null;
}

export function CatalogoClient({
    studioSlug,
    initialCatalogo,
    initialPreciosConfig,
}: CatalogoClientProps) {
    // Procesar datos iniciales del catálogo completo
    const [secciones, setSecciones] = useState<Seccion[]>(() => {
        return initialCatalogo.map(s => ({
            id: s.id,
            name: s.nombre,
            order: s.orden,
            totalCategorias: s.categorias.length,
            totalItems: s.categorias.reduce((acc, cat) => acc + cat.servicios.length, 0),
            items: s.categorias.reduce((acc, cat) => acc + cat.servicios.length, 0),
        }));
    });
    const [isUtilidadModalOpen, setIsUtilidadModalOpen] = useState(false);

    // Exponer función para abrir modal desde el header
    React.useEffect(() => {
        (window as any).__catalogoOpenUtilidad = () => setIsUtilidadModalOpen(true);
        return () => {
            delete (window as any).__catalogoOpenUtilidad;
        };
    }, []);

    // Estados de expansión - inicializar todas las secciones y categorías expandidas
    const [seccionesExpandidas, setSeccionesExpandidas] = useState<Set<string>>(
        new Set(initialCatalogo.map(s => s.id))
    );
    const [categoriasExpandidas, setCategoriasExpandidas] = useState<Set<string>>(() => {
        const todasCategorias = new Set<string>();
        initialCatalogo.forEach(seccion => {
            seccion.categorias.forEach(cat => {
                todasCategorias.add(cat.id);
            });
        });
        return todasCategorias;
    });

    // Datos - inicializar desde catálogo completo
    const [categoriasData, setCategoriasData] = useState<Record<string, Categoria[]>>(() => {
        const data: Record<string, Categoria[]> = {};
        initialCatalogo.forEach(seccion => {
            data[seccion.id] = seccion.categorias.map(cat => ({
                id: cat.id,
                name: cat.nombre,
                order: cat.orden,
                items: cat.servicios.length,
            }));
        });
        return data;
    });
    const [itemsData, setItemsData] = useState<Record<string, Item[]>>(() => {
        const data: Record<string, Item[]> = {};
        initialCatalogo.forEach(seccion => {
            seccion.categorias.forEach(cat => {
                data[cat.id] = cat.servicios.map(servicio => {
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
        return data;
    });
    const [preciosConfig, setPreciosConfig] = useState<ConfiguracionPrecios | null>(initialPreciosConfig);

    // Estados de carga
    const [isLoading, setIsLoading] = useState(false);

    // Estados para drag & drop
    const [activeId, setActiveId] = useState<string | null>(null);

    // Configuración de sensores para drag & drop: distancia mínima evita que un clic se interprete como arrastre
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 10 },
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
    const [isMoveItemModalOpen, setIsMoveItemModalOpen] = useState(false);
    const [itemToMove, setItemToMove] = useState<Item | null>(null);
    const [selectedCategoriaId, setSelectedCategoriaId] = useState<string | null>(null);
    const [serviceLinksMap, setServiceLinksMap] = useState<ServiceLinksMap>({});
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [linkModalItemId, setLinkModalItemId] = useState<Item | null>(null);

    // Smart Link Bar: modo selección en canvas
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
    const [hoverHighlightGroupIds, setHoverHighlightGroupIds] = useState<Set<string> | null>(null);
    const [isSavingLinks, setIsSavingLinks] = useState(false);

    // Ítems que son "hijos" de algún padre (para badge y hover)
    const linkedIdsSet = React.useMemo(
        () => new Set(Object.values(serviceLinksMap).flat()),
        [serviceLinksMap]
    );

    // Padre (nombre corto) por ítem hijo para badge
    const parentNameByLinkedId = React.useMemo(() => {
        const flatItems = Object.values(itemsData).flat();
        const idToName = (id: string) => flatItems.find((i) => i.id === id)?.name ?? id;
        const out: Record<string, string> = {};
        Object.entries(serviceLinksMap).forEach(([sourceId, linkedIds]) => {
            const parentName = idToName(sourceId);
            linkedIds.forEach((linkedId) => {
                out[linkedId] = parentName;
            });
        });
        return out;
    }, [serviceLinksMap, itemsData]);

    // Grupo (padre + hermanos) para highlight al hover
    const getGroupIds = useCallback(
        (itemId: string): string[] => {
            if (serviceLinksMap[itemId]) return [itemId, ...serviceLinksMap[itemId]];
            const entry = Object.entries(serviceLinksMap).find(([, ids]) => ids.includes(itemId));
            if (entry) return [entry[0], ...entry[1]];
            return [];
        },
        [serviceLinksMap]
    );

    const getSeccionIdForItem = useCallback(
        (item: Item): string | undefined => {
            const catId = item.categoriaId;
            if (!catId) return undefined;
            return Object.keys(categoriasData).find((secId) =>
                (categoriasData[secId] ?? []).some((c) => c.id === catId)
            );
        },
        [categoriasData]
    );

    const handleToggleSmartLinkSelection = useCallback(
        (item: Item) => {
            const secId = getSeccionIdForItem(item);
            const groupIds = getGroupIds(item.id);

            setSelectedIds((prev) => {
                const has = prev.includes(item.id);
                if (has) {
                    const next = prev.filter((id) => id !== item.id);
                    if (next.length === 0) setSelectedSectionId(null);
                    return next;
                }
                if (prev.length === 0) {
                    setSelectedSectionId(secId ?? null);
                    if (groupIds.length > 0) {
                        const isParent = (serviceLinksMap[item.id]?.length ?? 0) > 0;
                        const groupName = isParent ? item.name : (parentNameByLinkedId[item.id] ?? item.name);
                        toast.info(`Editando grupo: ${groupName}`);
                        return groupIds;
                    }
                    return [item.id];
                }
                if (secId !== selectedSectionId) return prev;
                return [...prev, item.id];
            });
        },
        [getSeccionIdForItem, selectedSectionId, getGroupIds, serviceLinksMap, parentNameByLinkedId]
    );

    // Si la selección actual coincide exactamente con un grupo existente, tenemos su sourceId para "Desvincular"
    const existingGroupSourceId = React.useMemo(() => {
        if (selectedIds.length === 0) return null;
        const selectedSet = new Set(selectedIds);
        for (const [sourceId, linkedIds] of Object.entries(serviceLinksMap)) {
            const groupSet = new Set([sourceId, ...linkedIds]);
            if (groupSet.size === selectedSet.size && [...groupSet].every((id) => selectedSet.has(id))) return sourceId;
        }
        return null;
    }, [selectedIds, serviceLinksMap]);

    const router = useRouter();
    const handleClearLinksForItem = useCallback(
        async (itemId: string) => {
            try {
                const result = await clearAllLinksForItem(studioSlug, itemId);
                if (result.success) {
                    const res = await getServiceLinks(studioSlug);
                    if (res.success && res.data) setServiceLinksMap(res.data);
                    router.refresh();
                    toast.success('Vínculos del ítem eliminados');
                } else {
                    toast.error(result.error ?? 'Error al desvincular');
                }
            } catch (err) {
                console.error('[CatalogoClient] clearLinksForItem:', err);
                toast.error('Error al romper vínculo');
            }
        },
        [studioSlug, router]
    );

    /** Activa modo Smart Link y carga el grupo del ítem en selectedIds (desde el badge "Editar vínculo"). */
    const handleEditLinkFromBadge = useCallback(
        (item: Item) => {
            const groupIds = getGroupIds(item.id);
            if (groupIds.length === 0) return;
            setIsSelectionMode(true);
            setSelectedIds(groupIds);
            setSelectedSectionId(getSeccionIdForItem(item) ?? null);
            const isParent = (serviceLinksMap[item.id]?.length ?? 0) > 0;
            const groupName = isParent ? item.name : (parentNameByLinkedId[item.id] ?? item.name);
            toast.info(`Editando grupo: ${groupName}`);
        },
        [getGroupIds, getSeccionIdForItem, serviceLinksMap, parentNameByLinkedId]
    );

    // Función para cargar configuración de precios
    const loadConfiguracionPrecios = useCallback(async () => {
        try {
            const { obtenerConfiguracionPrecios } = await import('@/lib/actions/studio/catalogo/utilidad.actions');
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

                setPreciosConfig(newConfig);
            }
        } catch (error) {
            console.error("Error loading price config:", error);
        }
    }, [studioSlug]);

    // Cargar mapa de vínculos (padre → hijos) para mostrar badge y modal
    React.useEffect(() => {
        if (!studioSlug) return;
        getServiceLinks(studioSlug).then(result => {
            if (result.success && result.data) setServiceLinksMap(result.data);
        });
    }, [studioSlug]);

    // Escuchar actualizaciones de configuración de precios
    useConfiguracionPreciosUpdateListener(studioSlug, loadConfiguracionPrecios);

    // ... resto de la lógica del componente (handlers, drag & drop, etc.)
    // Por ahora, voy a mantener la estructura básica y agregar los handlers necesarios

    const toggleSeccion = (seccionId: string) => {
        const isExpanded = seccionesExpandidas.has(seccionId);

        if (isExpanded) {
            setSeccionesExpandidas(prev => {
                const newSet = new Set(prev);
                newSet.delete(seccionId);
                return newSet;
            });
        } else {
            setSeccionesExpandidas(prev => new Set(prev).add(seccionId));
        }
    };

    const toggleCategoria = (categoriaId: string) => {
        const isExpanded = categoriasExpandidas.has(categoriaId);

        if (isExpanded) {
            setCategoriasExpandidas(prev => {
                const newSet = new Set(prev);
                newSet.delete(categoriaId);
                return newSet;
            });
        } else {
            setCategoriasExpandidas(prev => new Set(prev).add(categoriaId));
        }
    };

    // Handlers básicos (simplificados por ahora)
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
                const response = await actualizarSeccion(studioSlug, {
                    id: data.id,
                    name: data.name,
                    description: data.description,
                });
                if (!response.success) throw new Error(response.error);

                setSecciones(prev => prev.map(s =>
                    s.id === data.id ? { ...s, name: data.name } : s
                ));
                toast.success("Sección actualizada");
            } else {
                const response = await crearSeccion(studioSlug, {
                    name: data.name,
                    description: data.description,
                });
                if (!response.success) throw new Error(response.error);

                if (response.data) {
                    setSecciones(prev => [...prev, {
                        id: response.data!.id,
                        name: response.data!.name,
                        order: response.data!.order,
                        totalCategorias: 0,
                        totalItems: 0,
                    }]);
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
                const response = await actualizarCategoria({
                    id: data.id,
                    name: data.name,
                });
                if (!response.success) throw new Error(response.error);

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
                    name: data.name,
                    seccionId: selectedSeccionForCategoria!,
                });
                if (!response.success) throw new Error(response.error);

                if (response.data) {
                    const newCategoria = {
                        id: response.data.id,
                        name: response.data.name,
                        description: undefined,
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

    const handleItemTogglePublish = useCallback(
        async (item: Item) => {
            try {
                setIsLoading(true);
                const response = await toggleItemPublish(item.id);
                if (response.success && response.data) {
                    setItemsData(prev => {
                        const newData = { ...prev };
                        Object.keys(newData).forEach(categoriaId => {
                            newData[categoriaId] = newData[categoriaId].map(i =>
                                i.id === item.id ? { ...i, status: response.data?.status || 'active' } : i
                            );
                        });
                        return newData;
                    });
                    setItemToEdit(prev =>
                        prev && prev.id === item.id ? { ...prev, status: response.data?.status || 'active' } : prev
                    );
                    toast.success(
                        response.data.status === 'active' ? 'Item activado exitosamente' : 'Item desactivado exitosamente'
                    );
                }
            } catch (error) {
                console.error('Error toggling publish:', error);
                toast.error('Error al cambiar estado del item');
            } finally {
                setIsLoading(false);
            }
        },
        []
    );

    const handleItemDuplicate = useCallback(async (item: Item) => {
        try {
            setIsLoading(true);
            const response = await crearItem({
                name: `${item.name} (Copia)`,
                cost: item.cost,
                description: item.description,
                categoriaeId: item.categoriaId || '',
                billing_type: item.billing_type || 'SERVICE',
                gastos: item.gastos || [],
                studioSlug: studioSlug,
            });
            if (response.success && response.data) {
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
                    [item.categoriaId || '']: [...(prev[item.categoriaId || ''] || []), newItem],
                }));
                setCategoriasData(prev => {
                    const newData = { ...prev };
                    Object.keys(newData).forEach(seccionId => {
                        newData[seccionId] = newData[seccionId].map(cat =>
                            cat.id === item.categoriaId ? { ...cat, items: (cat.items || 0) + 1 } : cat
                        );
                    });
                    return newData;
                });
                toast.success('Item duplicado exitosamente');
            }
        } catch (error) {
            console.error('Error duplicando item:', error);
            toast.error('Error al duplicar item');
        } finally {
            setIsLoading(false);
        }
    }, [studioSlug]);

    const handleOpenMoveItemModal = useCallback((item: Item) => {
        setItemToMove(item);
        setSelectedCategoriaId(null);
        setIsMoveItemModalOpen(true);
    }, []);

    const handleSaveItem = async (data: ItemFormData) => {
        try {
            if (data.id) {
                const response = await actualizarItem(data);
                if (!response.success) throw new Error(response.error);

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
                                status: (data as unknown as { status?: string }).status || item.status || 'active',
                                gastos: data.gastos || [],
                            } : item
                        );
                    });
                    return newData;
                });

                setItemToEdit(prev => prev ? {
                    ...prev,
                    name: data.name,
                    cost: data.cost,
                    tipoUtilidad: data.tipoUtilidad || prev.tipoUtilidad || 'servicio',
                    billing_type: data.billing_type || prev.billing_type || 'SERVICE',
                    status: (data as unknown as { status?: string }).status || prev.status || 'active',
                    gastos: data.gastos || [],
                } : null);
                toast.success("Item actualizado");
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

            setItemsData(prev => {
                const newData = { ...prev };
                Object.keys(newData).forEach(categoriaId => {
                    newData[categoriaId] = newData[categoriaId].filter(item => item.id !== itemToDelete.id);
                });
                return newData;
            });

            setCategoriasData(prev => {
                const newData = { ...prev };
                Object.keys(newData).forEach(seccionId => {
                    newData[seccionId] = newData[seccionId].map(cat => {
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

    const handleMoveItem = async () => {
        if (!itemToMove || !selectedCategoriaId) return;

        // No mover si es la misma categoría
        if (itemToMove.categoriaId === selectedCategoriaId) {
            toast.info("El item ya está en esta categoría");
            setIsMoveItemModalOpen(false);
            setItemToMove(null);
            setSelectedCategoriaId(null);
            return;
        }

        setIsLoading(true);
        try {
            const response = await moverItemACategoria(itemToMove.id, selectedCategoriaId);

            if (response.success) {
                const categoriaOrigenId = itemToMove.categoriaId;
                const categoriaDestinoId = selectedCategoriaId;

                // Actualizar itemsData: remover de origen, agregar a destino
                setItemsData(prev => {
                    const newData = { ...prev };
                    
                    // Remover de categoría origen
                    if (categoriaOrigenId && newData[categoriaOrigenId]) {
                        newData[categoriaOrigenId] = newData[categoriaOrigenId].filter(i => i.id !== itemToMove.id);
                    }
                    
                    // Agregar a categoría destino
                    const movedItem = {
                        ...itemToMove,
                        categoriaId: categoriaDestinoId
                    };
                    newData[categoriaDestinoId] = [...(newData[categoriaDestinoId] || []), movedItem];
                    
                    return newData;
                });

                // Actualizar contadores de categorías
                setCategoriasData(prev => {
                    const newData = { ...prev };
                    Object.keys(newData).forEach(seccionId => {
                        newData[seccionId] = newData[seccionId].map(cat => {
                            if (cat.id === categoriaOrigenId) {
                                return { ...cat, items: Math.max(0, (cat.items || 0) - 1) };
                            }
                            if (cat.id === categoriaDestinoId) {
                                return { ...cat, items: (cat.items || 0) + 1 };
                            }
                            return cat;
                        });
                    });
                    return newData;
                });

                const categoriaDestino = Object.values(categoriasData).flat().find(c => c.id === categoriaDestinoId);
                toast.success(`Item movido a "${categoriaDestino?.name || 'nueva categoría'}"`);
                
                setIsMoveItemModalOpen(false);
                setItemToMove(null);
                setSelectedCategoriaId(null);
            } else {
                toast.error(response.error || "Error al mover item");
            }
        } catch (error) {
            console.error("Error moviendo item:", error);
            toast.error(error instanceof Error ? error.message : "Error al mover item");
        } finally {
            setIsLoading(false);
        }
    };

    // Drag & drop handlers (simplificados)
    const handleDragStart = (event: DragStartEvent) => {
        const activeId = event.active.id as string;
        setActiveId(activeId);

        const isCategoria = Object.values(categoriasData).some(categorias =>
            categorias.some(cat => cat.id === activeId)
        );

        if (isCategoria && categoriasExpandidas.size > 0) {
            setCategoriasExpandidas(new Set());
        }
    };

    const handleDragOver = useCallback((event: DragOverEvent) => {
        const { over, active } = event;
        if (!over || !active) return;

        const activeId = String(active.id);
        const overId = String(over.id);

        const isItem = Object.values(itemsData).some(items =>
            items.some(item => item.id === activeId)
        );
        const isCategoria = Object.values(categoriasData).some(categorias =>
            categorias.some(cat => cat.id === activeId)
        );
        const isSeccion = secciones.some(sec => sec.id === activeId);

        if (!isItem || isCategoria || isSeccion) {
            return;
        }

        let categoriaId = null;

        if (overId.startsWith("categoria-")) {
            categoriaId = overId.replace("categoria-", "");
        } else {
            for (const [, categorias] of Object.entries(categoriasData)) {
                if (categorias.some(cat => cat.id === overId)) {
                    categoriaId = overId;
                    break;
                }
            }
        }

        if (categoriaId && !categoriasExpandidas.has(categoriaId)) {
            setCategoriasExpandidas(prev => new Set([...prev, categoriaId]));
        }
    }, [categoriasExpandidas, categoriasData, itemsData, secciones]);

    const handleDragEnd = useCallback(
        async (event: DragEndEvent) => {
            const { active, over } = event;

            if (!over || !active) return;

            const activeId = String(active.id);
            const overId = String(over.id);

            if (activeId === overId) return;

            // Reordenamiento de secciones
            const activeSeccion = secciones.find(sec => sec.id === activeId);
            const overSeccion = secciones.find(sec => sec.id === overId);

            if (activeSeccion && overSeccion) {
                const activeIndex = secciones.findIndex(sec => sec.id === activeId);
                const overIndex = secciones.findIndex(sec => sec.id === overId);

                if (activeIndex === -1 || overIndex === -1) {
                    setActiveId(null);
                    return;
                }

                const originalSecciones = [...secciones];

                try {
                    const newSecciones = arrayMove(secciones, activeIndex, overIndex);
                    const seccionesConOrder = newSecciones.map((sec, index) => ({
                        ...sec,
                        order: index
                    }));

                    setSecciones(seccionesConOrder);

                    const seccionIds = newSecciones.map(sec => sec.id);
                    const response = await reordenarSecciones(studioSlug, seccionIds);

                    if (!response.success) {
                        throw new Error(response.error);
                    }

                    toast.success("Orden de secciones actualizado");
                } catch (error) {
                    console.error("Error reordenando secciones:", error);
                    toast.error("Error al actualizar el orden de secciones");
                    setSecciones(originalSecciones);
                } finally {
                    setActiveId(null);
                }
                return;
            }

            // Reordenamiento de categorías
            let activeCategoria = null;
            let activeSeccionId = null;
            for (const [seccionId, categorias] of Object.entries(categoriasData)) {
                activeCategoria = categorias.find(cat => cat.id === activeId);
                if (activeCategoria) {
                    activeSeccionId = seccionId;
                    break;
                }
            }

            if (activeCategoria && activeSeccionId) {
                const categoriasSeccion = categoriasData[activeSeccionId] || [];
                const overCategoria = categoriasSeccion.find(cat => cat.id === overId);

                if (overCategoria) {
                    const activeIndex = categoriasSeccion.findIndex(cat => cat.id === activeId);
                    const overIndex = categoriasSeccion.findIndex(cat => cat.id === overId);

                    if (activeIndex === -1 || overIndex === -1) {
                        setActiveId(null);
                        return;
                    }

                    const originalCategoriasData = JSON.parse(JSON.stringify(categoriasData));

                    try {
                        const newCategorias = arrayMove(categoriasSeccion, activeIndex, overIndex);
                        const categoriasConOrder = newCategorias.map((cat, index) => ({
                            ...cat,
                            order: index
                        }));

                        setCategoriasData(prev => ({
                            ...prev,
                            [activeSeccionId]: categoriasConOrder
                        }));

                        const categoriaIds = newCategorias.map(cat => cat.id);
                        const response = await reordenarCategorias(categoriaIds);

                        if (!response.success) {
                            throw new Error(response.error);
                        }

                        toast.success("Orden de categorías actualizado");
                    } catch (error) {
                        console.error("Error reordenando categorías:", error);
                        toast.error("Error al actualizar el orden de categorías");
                        setCategoriasData(originalCategoriasData);
                    } finally {
                        setActiveId(null);
                    }
                    return;
                }
            }

            // Reordenamiento de items
            const isDroppingOnEmptyCategory = overId.startsWith("categoria-");
            let targetCategoriaId = null;
            let overItem = null;

            if (isDroppingOnEmptyCategory) {
                targetCategoriaId = overId.replace("categoria-", "");
            } else {
                for (const [categoriaId, items] of Object.entries(itemsData)) {
                    overItem = items.find(item => item.id === overId);
                    if (overItem) {
                        targetCategoriaId = categoriaId;
                        break;
                    }
                }
            }

            if (!targetCategoriaId) {
                setActiveId(null);
                return;
            }

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
                setActiveId(null);
                return;
            }

            const isReordering = activeCategoriaId === targetCategoriaId;

            const originalItemsData = JSON.parse(JSON.stringify(itemsData));
            const originalCategoriasData = JSON.parse(JSON.stringify(categoriasData));

            try {
                if (isReordering) {
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
                    const targetItems = itemsData[targetCategoriaId] || [];
                    let newIndex = targetItems.length;

                    if (!isDroppingOnEmptyCategory && overItem) {
                        const overIndex = targetItems.findIndex(item => item.id === overId);
                        newIndex = overIndex === -1 ? targetItems.length : overIndex;
                    }

                    const newItem = {
                        ...activeItem,
                        order: newIndex,
                        categoriaId: targetCategoriaId
                    };

                    setItemsData(prev => ({
                        ...prev,
                        [activeCategoriaId]: prev[activeCategoriaId]?.filter(i => i.id !== activeId) || []
                    }));

                    setItemsData(prev => ({
                        ...prev,
                        [targetCategoriaId]: [...(prev[targetCategoriaId] || []), newItem]
                    }));

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

                setItemsData(originalItemsData);
                setCategoriasData(originalCategoriasData);
            } finally {
                setActiveId(null);
            }
        },
        [secciones, itemsData, categoriasData, studioSlug]
    );

    // Componente EmptyCategoryDropZone
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

    // Componente SortableSeccion
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
                                className="h-8 w-8 p-0 rounded-md"
                                title="Agregar categoría"
                            >
                                <Plus className="size-4 shrink-0" />
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
                                        <Plus className="size-[12px] shrink-0" />
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
                                                seccionId={seccion.id}
                                                isSelectionMode={isSelectionMode}
                                                selectedIds={selectedIds}
                                                selectedSectionId={selectedSectionId}
                                                onToggleSelect={handleToggleSmartLinkSelection}
                                                hoverHighlightGroupIds={hoverHighlightGroupIds}
                                                onHoverGroup={(ids) => {
                                                    setHoverHighlightGroupIds((prev) => {
                                                        const next = ids ? new Set(ids) : null;
                                                        if (prev === null && next === null) return prev;
                                                        if (prev === null || next === null) return next;
                                                        if (prev.size !== next.size) return next;
                                                        for (const id of next) if (!prev.has(id)) return next;
                                                        return prev;
                                                    });
                                                }}
                                                getGroupIds={getGroupIds}
                                                serviceLinksMap={serviceLinksMap}
                                                linkedIdsSet={linkedIdsSet}
                                                parentNameByLinkedId={parentNameByLinkedId}
                                                itemsData={itemsData}
                                                onClearLinksForItem={handleClearLinksForItem}
                                                onEditLinkFromBadge={handleEditLinkFromBadge}
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

    // Componente SortableCategoria
    const SortableCategoria = ({
        categoria,
        categoriaIndex,
        seccionId,
        isSelectionMode,
        selectedIds,
        selectedSectionId,
        onToggleSelect,
        hoverHighlightGroupIds,
        onHoverGroup,
        getGroupIds,
        serviceLinksMap,
        linkedIdsSet,
        parentNameByLinkedId,
        itemsData: itemsDataProp,
        onClearLinksForItem,
        onEditLinkFromBadge,
    }: {
        categoria: Categoria;
        categoriaIndex: number;
        seccionId: string;
        isSelectionMode: boolean;
        selectedIds: string[];
        selectedSectionId: string | null;
        onToggleSelect: (item: Item) => void;
        hoverHighlightGroupIds: Set<string> | null;
        onHoverGroup: (ids: string[] | null) => void;
        getGroupIds: (itemId: string) => string[];
        serviceLinksMap: ServiceLinksMap;
        linkedIdsSet: Set<string>;
        parentNameByLinkedId: Record<string, string>;
        itemsData: Record<string, Item[]>;
        onClearLinksForItem: (itemId: string) => void | Promise<void>;
        onEditLinkFromBadge: (item: Item) => void;
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
                            className="h-8 w-8 p-0 rounded-md"
                            title="Agregar item"
                        >
                            <Plus className="size-4 shrink-0" />
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

                {isCategoriaExpandida && (
                    <div className="bg-zinc-800/20 border-l-2 border-zinc-700/30 ml-12">
                        {items.length === 0 ? (
                            <EmptyCategoryDropZone categoria={categoria} />
                        ) : (
                            // ⚠️ VIRTUALIZACIÓN: Si items.length > 50, considerar usar Virtua
                            // Ejemplo: import { Virtuoso } from 'react-virtuoso';
                            // <Virtuoso
                            //   data={items.sort((a, b) => (a.order || 0) - (b.order || 0))}
                            //   itemContent={(index, item) => <SortableItem item={item} itemIndex={index} />}
                            //   style={{ height: '400px' }}
                            // />
                            <SortableContext
                                items={items.map(i => i.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                {items
                                    .sort((a, b) => (a.order || 0) - (b.order || 0))
                                    .map((item, itemIndex) => (
                                        <CatalogSortableItem
                                            key={item.id}
                                            item={item}
                                            itemIndex={itemIndex}
                                            seccionId={seccionId}
                                            isSelectionMode={isSelectionMode}
                                            selectedIds={selectedIds}
                                            selectedSectionId={selectedSectionId}
                                            onToggleSelect={onToggleSelect}
                                            hoverHighlightGroupIds={hoverHighlightGroupIds}
                                            onHoverGroup={onHoverGroup}
                                            getGroupIds={getGroupIds}
                                            serviceLinksMap={serviceLinksMap}
                                            linkedIdsSet={linkedIdsSet}
                                            parentNameByLinkedId={parentNameByLinkedId}
                                            allItemsFlat={Object.values(itemsDataProp).flat()}
                                            onClearLinksForItem={onClearLinksForItem}
                                            onEditLinkFromBadge={onEditLinkFromBadge}
                                            onEditItem={handleEditItem}
                                            onDeleteItem={handleDeleteItem}
                                            onTogglePublish={handleItemTogglePublish}
                                            onDuplicateItem={handleItemDuplicate}
                                            onMoveItem={handleOpenMoveItemModal}
                                            isItemModalOpen={isItemModalOpen}
                                            itemToEdit={itemToEdit}
                                            preciosConfig={preciosConfig}
                                        />
                                    ))}
                            </SortableContext>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <>
            {/* Modal de Márgenes */}
            <ZenDialog
                isOpen={isUtilidadModalOpen}
                onClose={() => setIsUtilidadModalOpen(false)}
                title="Márgenes de Utilidad"
                description="Gestiona los márgenes de utilidad, comisiones y sobreprecios"
                maxWidth="2xl"
                closeOnClickOutside={false}
            >
                <UtilidadForm
                    studioSlug={studioSlug}
                    onClose={() => setIsUtilidadModalOpen(false)}
                />
            </ZenDialog>

            <ItemLinksModal
                isOpen={isLinkModalOpen}
                onClose={() => { setIsLinkModalOpen(false); setLinkModalItemId(null); }}
                studioSlug={studioSlug}
                sourceItemId={linkModalItemId?.id ?? ''}
                sourceItemName={linkModalItemId?.name ?? ''}
                allItems={(() => {
                    if (!linkModalItemId?.categoriaId) return [];
                    const sourceSectionId = Object.keys(categoriasData).find(secId =>
                        (categoriasData[secId] ?? []).some(c => c.id === linkModalItemId.categoriaId)
                    );
                    if (!sourceSectionId) return [];
                    const categoryIdsInSection = (categoriasData[sourceSectionId] ?? []).map(c => c.id);
                    return categoryIdsInSection.flatMap(catId =>
                        (itemsData[catId] ?? []).map(i => ({ id: i.id, name: i.name }))
                    );
                })()}
                currentLinkedIds={linkModalItemId ? (serviceLinksMap[linkModalItemId.id] ?? []) : []}
                onSaved={() => getServiceLinks(studioSlug).then(r => r.success && r.data && setServiceLinksMap(r.data))}
            />

            <SmartLinkBar
                isSelectionMode={isSelectionMode}
                onActivate={() => {
                    setIsSelectionMode(true);
                    setSelectedIds([]);
                    setSelectedSectionId(null);
                }}
                selectedCount={selectedIds.length}
                selectedItems={selectedIds.map((id) => {
                    const it = Object.values(itemsData).flat().find((i) => i.id === id);
                    return it ? { id: it.id, name: it.name } : { id, name: id };
                })}
                existingGroupSourceId={existingGroupSourceId}
                onCancel={() => {
                    setIsSelectionMode(false);
                    setSelectedIds([]);
                    setSelectedSectionId(null);
                }}
                    onConfirm={async (parentId) => {
                        const linkedIds = selectedIds.filter((id) => id !== parentId);
                        if (linkedIds.length === 0) return;
                        setIsSavingLinks(true);
                        try {
                            const result = await updateServiceLinks(studioSlug, parentId, linkedIds);
                            if (result.success) {
                                const res = await getServiceLinks(studioSlug);
                                if (res.success && res.data) setServiceLinksMap(res.data);
                                setIsSelectionMode(false);
                                setSelectedIds([]);
                                setSelectedSectionId(null);
                                toast.success('Smart Link guardado');
                            } else {
                                toast.error(result.error ?? 'Error al guardar vínculos');
                            }
                        } catch (e) {
                            toast.error('Error al guardar vínculos');
                        } finally {
                            setIsSavingLinks(false);
                        }
                    }}
                    onUnlink={async (sourceId) => {
                        setIsSavingLinks(true);
                        try {
                            const result = await updateServiceLinks(studioSlug, sourceId, []);
                            if (result.success) {
                                const res = await getServiceLinks(studioSlug);
                                if (res.success && res.data) setServiceLinksMap(res.data);
                                setSelectedIds([]);
                                setSelectedSectionId(null);
                                toast.success('Grupo desvinculado');
                            } else {
                                toast.error(result.error ?? 'Error al desvincular');
                            }
                        } catch (e) {
                            toast.error('Error al desvincular');
                        } finally {
                            setIsSavingLinks(false);
                        }
                    }}
                isSaving={isSavingLinks}
            />

            <div className="space-y-4">
                {/* Header con botón de crear sección */}
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">Diseña la estructura de tu catálogo comercial</h3>
                    <div className="flex items-center gap-2">
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
                    key={itemToEdit?.id ?? 'item-editor-closed'}
                    isOpen={isItemModalOpen}
                    onClose={() => {
                        setIsItemModalOpen(false);
                        setItemToEdit(null);
                        setSelectedCategoriaForItem(null);
                    }}
                    onSave={handleSaveItem}
                    onStatusChange={(itemId: string, status: string) => {
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

                        setItemToEdit(prev => prev && prev.id === itemId ? {
                            ...prev,
                            status: status
                        } : prev);
                    }}
                    item={isItemModalOpen && itemToEdit ? {
                        id: itemToEdit.id,
                        name: itemToEdit.name,
                        cost: itemToEdit.cost,
                        tipoUtilidad: itemToEdit.tipoUtilidad || 'servicio',
                        billing_type: itemToEdit.billing_type || 'SERVICE',
                        description: '',
                        gastos: itemToEdit.gastos || [],
                        status: itemToEdit.status || 'active'
                    } as ItemFormData : undefined}
                    categoriaId={selectedCategoriaForItem ?? ''}
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

                {/* Modal para mover item */}
                <ZenDialog
                    isOpen={isMoveItemModalOpen}
                    onClose={() => {
                        setIsMoveItemModalOpen(false);
                        setItemToMove(null);
                        setSelectedCategoriaId(null);
                    }}
                    title="Mover item"
                    description={`Selecciona la categoría destino para "${itemToMove?.name}"`}
                    maxWidth="md"
                >
                    <div className="space-y-4">
                        <div className="max-h-96 overflow-y-auto space-y-2">
                            {secciones
                                .sort((a, b) => (a.order || 0) - (b.order || 0))
                                .map((seccion) => {
                                    const categoriasDeSeccion = categoriasData[seccion.id] || [];
                                    if (categoriasDeSeccion.length === 0) return null;

                                    return (
                                        <div key={seccion.id} className="space-y-1">
                                            <div className="text-sm font-medium text-zinc-400 px-2 py-1">
                                                {seccion.name}
                                            </div>
                                            {categoriasDeSeccion
                                                .sort((a, b) => (a.order || 0) - (b.order || 0))
                                                .map((categoria) => {
                                                    const isSelected = selectedCategoriaId === categoria.id;
                                                    const isCurrentCategory = itemToMove?.categoriaId === categoria.id;
                                                    
                                                    return (
                                                        <button
                                                            key={categoria.id}
                                                            onClick={() => !isCurrentCategory && setSelectedCategoriaId(categoria.id)}
                                                            disabled={isCurrentCategory}
                                                            className={`w-full text-left px-4 py-2 rounded-md text-sm transition-colors ${
                                                                isCurrentCategory
                                                                    ? 'bg-zinc-800/50 text-zinc-500 cursor-not-allowed'
                                                                    : isSelected
                                                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                                                    : 'hover:bg-zinc-800/50 text-zinc-300'
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <ChevronRight className="h-4 w-4" />
                                                                <span>{categoria.name}</span>
                                                                {isCurrentCategory && (
                                                                    <span className="text-xs text-zinc-500 ml-auto">(Actual)</span>
                                                                )}
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                        </div>
                                    );
                                })}
                        </div>
                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                            <ZenButton
                                variant="ghost"
                                onClick={() => {
                                    setIsMoveItemModalOpen(false);
                                    setItemToMove(null);
                                    setSelectedCategoriaId(null);
                                }}
                                disabled={isLoading}
                            >
                                Cancelar
                            </ZenButton>
                            <ZenButton
                                variant="primary"
                                onClick={handleMoveItem}
                                disabled={!selectedCategoriaId || isLoading}
                                loading={isLoading}
                            >
                                Mover
                            </ZenButton>
                        </div>
                    </div>
                </ZenDialog>
            </div>
        </>
    );
}
