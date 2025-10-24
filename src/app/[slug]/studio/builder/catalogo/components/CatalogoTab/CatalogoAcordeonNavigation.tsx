"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, Plus, Edit2, Trash2, Loader2 } from "lucide-react";
import { ZenButton } from "@/components/ui/zen";
import { ZenConfirmModal } from "@/components/ui/zen/overlays/ZenConfirmModal";
import { SeccionEditorModal, SeccionFormData } from "./secciones";
import { CategoriaEditorModal, CategoriaFormData } from "./categorias";
import { ItemEditorModal, ItemFormData } from "./items";
import { ConfiguracionPrecios, calcularPrecio as calcularPrecioSistema } from "@/lib/actions/studio/builder/catalogo/calcular-precio";
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
    obtenerCategoriasConStats,
    obtenerItemsConStats,
} from "@/lib/actions/studio/builder/catalogo";
import { obtenerConfiguracionPrecios } from "@/lib/actions/studio/builder/catalogo/utilidad.actions";

interface Seccion {
    id: string;
    name: string;
    order: number;
    createdAt: Date;
    categories?: Array<{ id: string; name: string }>;
    items?: number;
    mediaSize?: number;
}

interface Categoria {
    id: string;
    name: string;
    description?: string;
    order?: number;
    items?: number;
    mediaSize?: number;
}

interface Item {
    id: string;
    name: string;
    cost: number;
    tipoUtilidad?: 'servicio' | 'producto';
    order?: number;
    isNew?: boolean;
    isFeatured?: boolean;
    mediaSize?: number;
    gastos?: Array<{
        nombre: string;
        costo: number;
    }>;
}

interface CatalogoAcordeonNavigationProps {
    studioSlug: string;
    secciones: Seccion[];
    onNavigateToUtilidad?: () => void;
}

export function CatalogoAcordeonNavigation({
    studioSlug,
    secciones: initialSecciones,
    onNavigateToUtilidad,
}: CatalogoAcordeonNavigationProps) {
    // Estados de expansión
    const [seccionesExpandidas, setSeccionesExpandidas] = useState<Set<string>>(new Set());
    const [categoriasExpandidas, setCategoriasExpandidas] = useState<Set<string>>(new Set());

    // Datos
    const [secciones, setSecciones] = useState<Seccion[]>(initialSecciones);
    const [categoriasData, setCategoriasData] = useState<Record<string, Categoria[]>>({});
    const [itemsData, setItemsData] = useState<Record<string, Item[]>>({});
    const [preciosConfig, setPreciosConfig] = useState<ConfiguracionPrecios | null>(null);

    // Estados de carga
    const [isLoading, setIsLoading] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [loadingCategorias, setLoadingCategorias] = useState<Set<string>>(new Set());

    // Estados de modales
    const [isSeccionModalOpen, setIsSeccionModalOpen] = useState(false);
    const [seccionToEdit, setSeccionToEdit] = useState<Seccion | null>(null);
    const [isCategoriaModalOpen, setIsCategoriaModalOpen] = useState(false);
    const [categoriaToEdit, setCategoriaToEdit] = useState<Categoria | null>(null);
    const [selectedSeccionForCategoria, setSelectedSeccionForCategoria] = useState<string | null>(null);
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [itemToEdit, setItemToEdit] = useState<ItemFormData | null>(null);
    const [selectedCategoriaForItem, setSelectedCategoriaForItem] = useState<string | null>(null);

    // Estados de confirmación
    const [isDeleteSeccionModalOpen, setIsDeleteSeccionModalOpen] = useState(false);
    const [seccionToDelete, setSeccionToDelete] = useState<Seccion | null>(null);
    const [isDeleteCategoriaModalOpen, setIsDeleteCategoriaModalOpen] = useState(false);
    const [categoriaToDelete, setCategoriaToDelete] = useState<Categoria | null>(null);
    const [isDeleteItemModalOpen, setIsDeleteItemModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null);

    // Cargar configuración de precios
    useEffect(() => {
        const loadConfiguracionPrecios = async () => {
            try {
                const config = await obtenerConfiguracionPrecios(studioSlug);
                if (config) {
                    setPreciosConfig({
                        utilidad_servicio: typeof config.utilidad_servicio === 'string'
                            ? parseFloat(config.utilidad_servicio)
                            : config.utilidad_servicio,
                        utilidad_producto: typeof config.utilidad_producto === 'string'
                            ? parseFloat(config.utilidad_producto)
                            : config.utilidad_producto,
                        comision_venta: typeof config.comision_venta === 'string'
                            ? parseFloat(config.comision_venta)
                            : config.comision_venta,
                        sobreprecio: typeof config.sobreprecio === 'string'
                            ? parseFloat(config.sobreprecio)
                            : config.sobreprecio,
                    });
                }
            } catch (error) {
                console.error("Error loading configuración de precios:", error);
                setPreciosConfig({
                    utilidad_servicio: 0.30,
                    utilidad_producto: 0.40,
                    comision_venta: 0.10,
                    sobreprecio: 0.05,
                });
            }
        };

        const loadInitialData = async () => {
            try {
                setIsInitialLoading(true);
                setIsLoading(true);

                // Solo cargar categorías con contadores (sin items) para mostrar números correctos
                const categoriasPromises = secciones.map(async (seccion) => {
                    try {
                        const response = await obtenerCategoriasConStats(seccion.id);
                        if (response.success && response.data) {
                            const categorias = response.data.map(cat => ({
                                id: cat.id,
                                name: cat.name,
                                description: cat.description ?? undefined,
                                order: cat.order,
                                items: cat.totalItems || 0, // Contador de items sin cargar los items
                                mediaSize: cat.mediaSize,
                            }));

                            return { seccionId: seccion.id, categorias };
                        }
                        return { seccionId: seccion.id, categorias: [] };
                    } catch (error) {
                        console.error(`Error loading categorias for seccion ${seccion.id}:`, error);
                        return { seccionId: seccion.id, categorias: [] };
                    }
                });

                const categoriasResults = await Promise.all(categoriasPromises);

                // Construir el objeto de categorías
                const newCategoriasData: Record<string, Categoria[]> = {};
                categoriasResults.forEach(({ seccionId, categorias }) => {
                    newCategoriasData[seccionId] = categorias;
                });

                setCategoriasData(newCategoriasData);

                // Los items se cargarán bajo demanda cuando se expandan las categorías
                // Esto mantiene la carga inicial rápida pero con contadores correctos

            } catch (error) {
                console.error("Error loading initial data:", error);
                toast.error("Error al cargar datos iniciales");
            } finally {
                setIsLoading(false);
                setIsInitialLoading(false);
            }
        };

        loadConfiguracionPrecios();
        loadInitialData();
    }, [studioSlug, secciones]);

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


    const toggleCategoria = async (categoriaId: string) => {
        const isExpanded = categoriasExpandidas.has(categoriaId);

        if (isExpanded) {
            // Colapsar
            setCategoriasExpandidas(prev => {
                const newSet = new Set(prev);
                newSet.delete(categoriaId);
                return newSet;
            });
        } else {
            // Expandir y cargar items si no están cargados
            setCategoriasExpandidas(prev => new Set(prev).add(categoriaId));

            if (!itemsData[categoriaId]) {
                await loadItems(categoriaId);
            }
        }
    };

    const loadItems = async (categoriaId: string) => {
        try {
            setLoadingCategorias(prev => new Set(prev).add(categoriaId));
            const response = await obtenerItemsConStats(categoriaId);

            if (response.success && response.data) {
                const items = response.data.map(item => ({
                    id: item.id,
                    name: item.name,
                    cost: item.cost,
                    tipoUtilidad: item.tipoUtilidad,
                    order: item.order,
                    mediaSize: item.mediaSize,
                    gastos: item.gastos,
                }));

                setItemsData(prev => ({
                    ...prev,
                    [categoriaId]: items
                }));
            }
        } catch (error) {
            console.error("Error loading items:", error);
            toast.error("Error al cargar items");
        } finally {
            setLoadingCategorias(prev => {
                const newSet = new Set(prev);
                newSet.delete(categoriaId);
                return newSet;
            });
        }
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

            // Limpiar datos relacionados
            setCategoriasData(prev => {
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

                // Actualizar en todas las secciones que contengan esta categoría
                setCategoriasData(prev => {
                    const newData = { ...prev };
                    Object.keys(newData).forEach(seccionId => {
                        newData[seccionId] = newData[seccionId].map(c =>
                            c.id === data.id ? { ...c, name: data.name, description: data.description } : c
                        );
                    });
                    return newData;
                });

                toast.success("Categoría actualizada");
            } else {
                if (!selectedSeccionForCategoria) throw new Error("Sección no seleccionada");

                const response = await crearCategoria({
                    name: data.name,
                    description: data.description,
                    seccionId: selectedSeccionForCategoria,
                });

                if (!response.success) throw new Error(response.error);

                if (response.data) {
                    setCategoriasData(prev => ({
                        ...prev,
                        [selectedSeccionForCategoria]: [
                            ...(prev[selectedSeccionForCategoria] || []),
                            response.data as Categoria
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

            // Remover de todas las secciones
            setCategoriasData(prev => {
                const newData = { ...prev };
                Object.keys(newData).forEach(seccionId => {
                    newData[seccionId] = newData[seccionId].filter(c => c.id !== categoriaToDelete.id);
                });
                return newData;
            });

            // Limpiar items relacionados
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

    const handleEditItem = (item: ItemFormData) => {
        setItemToEdit(item);
        setIsItemModalOpen(true);
    };

    const handleDeleteItem = (item: { id: string; name: string }) => {
        setItemToDelete(item);
        setIsDeleteItemModalOpen(true);
    };

    const handleSaveItem = async (data: ItemFormData) => {
        try {
            if (data.id) {
                const response = await actualizarItem(data);
                if (!response.success) throw new Error(response.error);

                // Actualizar en todas las categorías que contengan este item
                setItemsData(prev => {
                    const newData = { ...prev };
                    Object.keys(newData).forEach(categoriaId => {
                        newData[categoriaId] = newData[categoriaId].map(i =>
                            i.id === data.id ? { ...i, name: data.name, cost: data.cost, tipoUtilidad: data.tipoUtilidad } : i
                        );
                    });
                    return newData;
                });

                toast.success("Item actualizado");
            } else {
                if (!selectedCategoriaForItem) throw new Error("Categoría no seleccionada");

                const response = await crearItem({
                    name: data.name,
                    cost: data.cost,
                    description: data.description,
                    categoriaeId: selectedCategoriaForItem,
                });

                if (!response.success) throw new Error(response.error);

                if (response.data) {
                    setItemsData(prev => ({
                        ...prev,
                        [selectedCategoriaForItem]: [
                            ...(prev[selectedCategoriaForItem] || []),
                            {
                                id: response.data!.id,
                                name: response.data!.name,
                                cost: response.data!.cost,
                                mediaSize: response.data!.mediaSize,
                            }
                        ]
                    }));
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

            // Remover de todas las categorías
            setItemsData(prev => {
                const newData = { ...prev };
                Object.keys(newData).forEach(categoriaId => {
                    newData[categoriaId] = newData[categoriaId].filter(i => i.id !== itemToDelete.id);
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

    const formatearMoneda = (valor: number) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN'
        }).format(valor);
    };


    // Skeleton components
    const AcordeonSkeleton = () => (
        <div className="space-y-4">
            {[1, 2, 3].map((i) => (
                <div key={i} className="border border-zinc-700 rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between p-4 bg-zinc-800/30">
                        <div className="flex items-center gap-3 flex-1">
                            <div className="w-2 h-2 bg-zinc-600 rounded-full animate-pulse"></div>
                            <div className="space-y-2">
                                <div className="h-4 w-32 bg-zinc-700 rounded animate-pulse"></div>
                                <div className="flex items-center gap-2">
                                    <div className="h-5 w-20 bg-zinc-700 rounded animate-pulse"></div>
                                    <div className="h-5 w-16 bg-zinc-700 rounded animate-pulse"></div>
                                </div>
                            </div>
                        </div>
                        <div className="w-4 h-4 bg-zinc-600 rounded animate-pulse"></div>
                    </div>
                </div>
            ))}
        </div>
    );

    const CategoriasSkeleton = () => (
        <div className="bg-zinc-900/50">
            {[1, 2].map((i) => (
                <div key={i} className={`${i > 1 ? 'border-t border-zinc-700/50' : ''}`}>
                    <div className="flex items-center justify-between p-3 pl-8">
                        <div className="flex items-center gap-3 flex-1">
                            <div className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-pulse"></div>
                            <div className="space-y-1">
                                <div className="h-3 w-24 bg-zinc-700 rounded animate-pulse"></div>
                                <div className="h-2 w-16 bg-zinc-700 rounded animate-pulse"></div>
                            </div>
                        </div>
                        <div className="w-3 h-3 bg-zinc-600 rounded animate-pulse"></div>
                    </div>
                </div>
            ))}
        </div>
    );

    const ItemsSkeleton = () => (
        <div className="bg-zinc-800/20 border-l-2 border-zinc-700/30 ml-8">
            {[1, 2, 3].map((i) => (
                <div key={i} className={`flex items-center justify-between p-2 pl-6 ${i > 1 ? 'border-t border-zinc-700/30' : ''}`}>
                    <div className="flex-1">
                        <div className="h-3 w-28 bg-zinc-700 rounded animate-pulse mb-1"></div>
                        <div className="h-2 w-16 bg-zinc-700 rounded animate-pulse"></div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="h-3 w-12 bg-zinc-700 rounded animate-pulse"></div>
                        <div className="flex items-center gap-1">
                            <div className="w-4 h-4 bg-zinc-700 rounded animate-pulse"></div>
                            <div className="w-4 h-4 bg-zinc-700 rounded animate-pulse"></div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );

    // Mostrar skeleton durante carga inicial
    if (isInitialLoading) {
        return (
            <div className="space-y-4">
                {/* Header con loading */}
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">Catálogo</h3>
                    <div className="flex items-center gap-2 text-zinc-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Cargando datos...</span>
                    </div>
                </div>

                <AcordeonSkeleton />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header con botón de crear sección */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Catálogo</h3>
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

            {/* Lista de secciones en acordeón */}
            <div className="space-y-2">
                {secciones
                    .sort((a, b) => (a.order || 0) - (b.order || 0))
                    .map((seccion) => {
                        const isSeccionExpandida = seccionesExpandidas.has(seccion.id);
                        const categorias = categoriasData[seccion.id] || [];
                        const totalItems = categorias.reduce((acc, cat) => acc + (cat.items || 0), 0);

                        return (
                            <div key={seccion.id} className="border border-zinc-700 rounded-lg overflow-hidden">
                                {/* Nivel 1: Sección */}
                                <div className="flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors bg-zinc-800/30">
                                    <button
                                        onClick={() => toggleSeccion(seccion.id)}
                                        className="flex items-center gap-3 flex-1 text-left"
                                    >
                                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                        <div>
                                            <h4 className="font-semibold text-white">{seccion.name}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs bg-zinc-700 text-zinc-400 px-2 py-1 rounded">
                                                    {categorias.length} {categorias.length === 1 ? 'categoría' : 'categorías'}
                                                </span>
                                                <span className="text-xs bg-zinc-700 text-zinc-400 px-2 py-1 rounded">
                                                    {totalItems} {totalItems === 1 ? 'item' : 'items'}
                                                </span>
                                            </div>
                                        </div>
                                        {isSeccionExpandida ? (
                                            <ChevronDown className="w-4 h-4 text-zinc-400" />
                                        ) : (
                                            <ChevronRight className="w-4 h-4 text-zinc-400" />
                                        )}
                                    </button>

                                    <div className="flex items-center gap-1">
                                        <ZenButton
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleCreateCategoria(seccion.id);
                                            }}
                                            variant="ghost"
                                            size="sm"
                                            className="w-8 h-8 p-0"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </ZenButton>
                                        <ZenButton
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleEditSeccion(seccion);
                                            }}
                                            variant="ghost"
                                            size="sm"
                                            className="w-8 h-8 p-0"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </ZenButton>
                                        <ZenButton
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteSeccion(seccion);
                                            }}
                                            variant="ghost"
                                            size="sm"
                                            className="w-8 h-8 p-0 text-red-400 hover:text-red-300"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </ZenButton>
                                    </div>
                                </div>

                                {isSeccionExpandida && (
                                    <div className="bg-zinc-900/50">
                                        {false ? (
                                            <CategoriasSkeleton />
                                        ) : (
                                            categorias
                                                .sort((a, b) => (a.order || 0) - (b.order || 0))
                                                .map((categoria, categoriaIndex) => {
                                                    const isCategoriaExpandida = categoriasExpandidas.has(categoria.id);
                                                    const items = itemsData[categoria.id] || [];

                                                    return (
                                                        <div key={categoria.id} className={`${categoriaIndex > 0 ? 'border-t border-zinc-700/50' : ''}`}>
                                                            {/* Nivel 2: Categoría */}
                                                            <div className="flex items-center justify-between p-3 pl-8 hover:bg-zinc-800/30 transition-colors">
                                                                <button
                                                                    onClick={() => toggleCategoria(categoria.id)}
                                                                    className="flex items-center gap-3 flex-1 text-left"
                                                                >
                                                                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                                                                    <div>
                                                                        <h5 className="text-sm font-medium text-zinc-300">{categoria.name}</h5>
                                                                        {categoria.description && (
                                                                            <p className="text-xs text-zinc-500 mt-1">{categoria.description}</p>
                                                                        )}
                                                                        <div className="flex items-center gap-2 mt-1">
                                                                            <span className="text-xs bg-zinc-700 text-zinc-400 px-2 py-0.5 rounded">
                                                                                {categoria.items || 0} {(categoria.items || 0) === 1 ? 'item' : 'items'}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    {isCategoriaExpandida ? (
                                                                        <ChevronDown className="w-3 h-3 text-zinc-400" />
                                                                    ) : (
                                                                        <ChevronRight className="w-3 h-3 text-zinc-400" />
                                                                    )}
                                                                </button>

                                                                <div className="flex items-center gap-1">
                                                                    <ZenButton
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleCreateItem(categoria.id);
                                                                        }}
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="w-6 h-6 p-0"
                                                                    >
                                                                        <Plus className="w-3 h-3" />
                                                                    </ZenButton>
                                                                    <ZenButton
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleEditCategoria(categoria);
                                                                        }}
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="w-6 h-6 p-0"
                                                                    >
                                                                        <Edit2 className="w-3 h-3" />
                                                                    </ZenButton>
                                                                    <ZenButton
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleDeleteCategoria(categoria);
                                                                        }}
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="w-6 h-6 p-0 text-red-400 hover:text-red-300"
                                                                    >
                                                                        <Trash2 className="w-3 h-3" />
                                                                    </ZenButton>
                                                                </div>
                                                            </div>

                                                            {isCategoriaExpandida && (
                                                                <div className="bg-zinc-800/20 border-l-2 border-zinc-700/30 ml-8">
                                                                    {loadingCategorias.has(categoria.id) ? (
                                                                        <ItemsSkeleton />
                                                                    ) : (
                                                                        items
                                                                            .sort((a, b) => (a.order || 0) - (b.order || 0))
                                                                            .map((item, itemIndex) => {
                                                                                const precios = preciosConfig ? calcularPrecioSistema(
                                                                                    item.cost,
                                                                                    item.gastos?.reduce((acc, g) => acc + g.costo, 0) || 0,
                                                                                    item.tipoUtilidad || 'servicio',
                                                                                    preciosConfig
                                                                                ) : { precio_final: 0 };

                                                                                return (
                                                                                    <div
                                                                                        key={item.id}
                                                                                        className={`flex items-center justify-between p-2 pl-6 ${itemIndex > 0 ? 'border-t border-zinc-700/30' : ''} hover:bg-zinc-700/20 transition-colors`}
                                                                                    >
                                                                                        {/* Nivel 3: Item */}
                                                                                        <div className="flex-1">
                                                                                            <div className="text-sm font-medium text-white leading-tight">{item.name}</div>
                                                                                            <div className="text-xs text-zinc-500 mt-1">
                                                                                                {item.tipoUtilidad === 'servicio' ? 'Servicio' : 'Producto'}
                                                                                            </div>
                                                                                        </div>

                                                                                        <div className="flex items-center gap-3">
                                                                                            <div className="text-right w-20">
                                                                                                <div className="text-sm font-medium text-white">{formatearMoneda(precios.precio_final)}</div>
                                                                                            </div>

                                                                                            <div className="flex items-center gap-1">
                                                                                                <ZenButton
                                                                                                    onClick={() => handleEditItem({
                                                                                                        id: item.id,
                                                                                                        name: item.name,
                                                                                                        cost: item.cost,
                                                                                                        description: '',
                                                                                                        tipoUtilidad: item.tipoUtilidad || 'servicio',
                                                                                                        categoriaId: categoria.id
                                                                                                    })}
                                                                                                    variant="ghost"
                                                                                                    size="sm"
                                                                                                    className="w-6 h-6 p-0"
                                                                                                >
                                                                                                    <Edit2 className="w-3 h-3" />
                                                                                                </ZenButton>
                                                                                                <ZenButton
                                                                                                    onClick={() => handleDeleteItem({ id: item.id, name: item.name })}
                                                                                                    variant="ghost"
                                                                                                    size="sm"
                                                                                                    className="w-6 h-6 p-0 text-red-400 hover:text-red-300"
                                                                                                >
                                                                                                    <Trash2 className="w-3 h-3" />
                                                                                                </ZenButton>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
            </div>

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
                studioSlug={studioSlug}
            />

            <ItemEditorModal
                isOpen={isItemModalOpen}
                onClose={() => {
                    setIsItemModalOpen(false);
                    setItemToEdit(null);
                    setSelectedCategoriaForItem(null);
                }}
                onSave={handleSaveItem}
                item={itemToEdit}
                studioSlug={studioSlug}
                categoriaId={selectedCategoriaForItem || ""}
                preciosConfig={preciosConfig || undefined}
            />

            {/* Modales de confirmación */}
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
    );
}
