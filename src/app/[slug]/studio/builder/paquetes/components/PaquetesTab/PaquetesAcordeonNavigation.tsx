"use client";

import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, Plus, Edit2, Trash2, Loader2, GripVertical, Copy, MoreHorizontal } from "lucide-react";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragStartEvent,
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
import { ZenButton } from "@/components/ui/zen";
import {
    ZenDropdownMenu,
    ZenDropdownMenuContent,
    ZenDropdownMenuItem,
    ZenDropdownMenuTrigger,
    ZenDropdownMenuSeparator,
} from "@/components/ui/zen";
import { ZenConfirmModal } from "@/components/ui/zen/overlays/ZenConfirmModal";
import { TipoEventoForm } from "@/app/[slug]/studio/configuracion/operacion/tipos/components/TipoEventoFormSimple";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/shadcn/dialog";
import { PaqueteFormularioAvanzado } from "./PaqueteFormularioAvanzado";
import { reorderPaquetes } from "@/lib/actions/studio/builder/catalogo/paquetes.actions";
import type { TipoEventoData } from "@/lib/actions/schemas/tipos-evento-schemas";
import type { PaqueteFromDB } from "@/lib/actions/schemas/paquete-schemas";

interface PaquetesAcordeonNavigationProps {
    studioSlug: string;
    tiposEvento: TipoEventoData[];
    paquetes: PaqueteFromDB[];
    onNavigateToTipoEvento: (tipoEvento: TipoEventoData) => void;
    onTiposEventoChange: (newTiposEvento: TipoEventoData[]) => void;
    onPaquetesChange: (newPaquetes: PaqueteFromDB[]) => void;
}

export function PaquetesAcordeonNavigation({
    studioSlug,
    tiposEvento: initialTiposEvento,
    paquetes: initialPaquetes,
    onNavigateToTipoEvento,
    onTiposEventoChange,
    onPaquetesChange,
}: PaquetesAcordeonNavigationProps) {
    // Estados de expansión
    const [tiposEventoExpandidos, setTiposEventoExpandidos] = useState<Set<string>>(new Set());

    // Datos
    const [tiposEvento, setTiposEvento] = useState<TipoEventoData[]>(initialTiposEvento);
    const [paquetes, setPaquetes] = useState<PaqueteFromDB[]>(initialPaquetes);
    const [paquetesData, setPaquetesData] = useState<Record<string, PaqueteFromDB[]>>({});

    // Estados de carga
    const [isLoading, setIsLoading] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [loadingPaquetes, setLoadingPaquetes] = useState<Set<string>>(new Set());

    // Estados para drag & drop
    const [activeId, setActiveId] = useState<string | null>(null);

    // Estados para modal de edición de paquetes
    const [showForm, setShowForm] = useState(false);
    const [editingPaquete, setEditingPaquete] = useState<PaqueteFromDB | null>(null);

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
    const [isDeleteTipoEventoModalOpen, setIsDeleteTipoEventoModalOpen] = useState(false);
    const [tipoEventoToDelete, setTipoEventoToDelete] = useState<TipoEventoData | null>(null);
    const [isDeletePaqueteModalOpen, setIsDeletePaqueteModalOpen] = useState(false);
    const [paqueteToDelete, setPaqueteToDelete] = useState<PaqueteFromDB | null>(null);
    const [isCreateTipoEventoModalOpen, setIsCreateTipoEventoModalOpen] = useState(false);
    const [isEditTipoEventoModalOpen, setIsEditTipoEventoModalOpen] = useState(false);
    const [editingTipoEvento, setEditingTipoEvento] = useState<TipoEventoData | null>(null);

    // Cargar datos iniciales
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                setIsLoading(true);

                // Organizar paquetes por tipo de evento
                const paquetesPorTipo: Record<string, PaqueteFromDB[]> = {};
                initialPaquetes.forEach(paquete => {
                    const tipoEventoId = paquete.event_type_id || 'sin-tipo';
                    if (!paquetesPorTipo[tipoEventoId]) {
                        paquetesPorTipo[tipoEventoId] = [];
                    }
                    paquetesPorTipo[tipoEventoId].push(paquete);
                });

                setPaquetesData(paquetesPorTipo);

            } catch (error) {
                console.error("Error loading initial data:", error);
                toast.error("Error al cargar datos iniciales");
            } finally {
                setIsLoading(false);
                setIsInitialLoading(false);
            }
        };

        loadInitialData();
    }, [initialTiposEvento, initialPaquetes]);

    const toggleTipoEvento = (tipoEventoId: string) => {
        const isExpanded = tiposEventoExpandidos.has(tipoEventoId);

        if (isExpanded) {
            // Colapsar
            setTiposEventoExpandidos(prev => {
                const newSet = new Set(prev);
                newSet.delete(tipoEventoId);
                return newSet;
            });
        } else {
            // Expandir
            setTiposEventoExpandidos(prev => new Set(prev).add(tipoEventoId));
        }
    };

    // Funciones de drag & drop
    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = useCallback(
        async (event: DragEndEvent) => {
            const { active, over } = event;

            if (!over || !active) return;

            const activeId = String(active.id);
            const overId = String(over.id);

            if (activeId === overId) return;

            // Buscar el paquete que se está arrastrando
            let activePaquete = null;
            let activeTipoEventoId = null;
            for (const [tipoEventoId, paquetes] of Object.entries(paquetesData)) {
                activePaquete = paquetes.find(paquete => paquete.id === activeId);
                if (activePaquete) {
                    activeTipoEventoId = tipoEventoId;
                    break;
                }
            }

            if (!activePaquete || !activeTipoEventoId) return;

            // Buscar el paquete sobre el que se está soltando o si es un tipo de evento
            let overPaquete = null;
            let overTipoEventoId = null;

            // Verificar si se está soltando sobre un tipo de evento
            if (overId.startsWith('tipo-evento-')) {
                overTipoEventoId = overId.replace('tipo-evento-', '');
            } else {
                // Buscar el paquete sobre el que se está soltando
                for (const [tipoEventoId, paquetes] of Object.entries(paquetesData)) {
                    overPaquete = paquetes.find(paquete => paquete.id === overId);
                    if (overPaquete) {
                        overTipoEventoId = tipoEventoId;
                        break;
                    }
                }
            }

            if (!overTipoEventoId) return;

            // Determinar si es reordenamiento dentro del mismo tipo de evento o movimiento entre tipos
            const isReordering = activeTipoEventoId === overTipoEventoId;
            const isMovingBetweenTypes = activeTipoEventoId !== overTipoEventoId;

            if (isReordering && overPaquete) {
                // Reordenamiento dentro del mismo tipo de evento
                const paquetes = paquetesData[activeTipoEventoId] || [];
                const activeIndex = paquetes.findIndex(paquete => paquete.id === activeId);
                const overIndex = paquetes.findIndex(paquete => paquete.id === overId);

                if (activeIndex === -1 || overIndex === -1) return;

                const newPaquetes = arrayMove(paquetes, activeIndex, overIndex);
                const paquetesConOrder = newPaquetes.map((paquete, index) => ({
                    ...paquete,
                    position: index
                }));

                setPaquetesData(prev => ({
                    ...prev,
                    [activeTipoEventoId]: paquetesConOrder
                }));

                // Actualizar el estado global de paquetes
                const paquetesGlobalesActualizados = initialPaquetes.map(paquete => {
                    const paqueteActualizado = paquetesConOrder.find(p => p.id === paquete.id);
                    return paqueteActualizado ? { ...paquete, position: paqueteActualizado.position } : paquete;
                });
                onPaquetesChange(paquetesGlobalesActualizados);

                // Actualizar en el backend
                try {
                    const result = await reorderPaquetes(studioSlug, paquetesConOrder.map(p => p.id));
                    if (result.success) {
                        toast.success("Orden de paquetes actualizado");
                    } else {
                        toast.error(result.error || "Error al actualizar el orden");
                        // Revertir cambios si falla el backend
                        setPaquetesData(prev => ({
                            ...prev,
                            [activeTipoEventoId]: paquetes
                        }));
                    }
                } catch (error) {
                    console.error("Error actualizando orden:", error);
                    toast.error("Error al actualizar el orden");
                    // Revertir cambios si falla el backend
                    setPaquetesData(prev => ({
                        ...prev,
                        [activeTipoEventoId]: paquetes
                    }));
                }
            } else if (isMovingBetweenTypes) {
                // Movimiento entre diferentes tipos de evento
                const paquetesOrigen = paquetesData[activeTipoEventoId] || [];
                const paquetesDestino = paquetesData[overTipoEventoId] || [];

                const paqueteAMover = paquetesOrigen.find(paquete => paquete.id === activeId);
                if (!paqueteAMover) return;

                // Remover del tipo de evento origen
                const nuevosPaquetesOrigen = paquetesOrigen.filter(paquete => paquete.id !== activeId);

                // Agregar al tipo de evento destino
                const paqueteActualizado = {
                    ...paqueteAMover,
                    event_type_id: overTipoEventoId,
                    position: paquetesDestino.length
                };

                const nuevosPaquetesDestino = [...paquetesDestino, paqueteActualizado];

                setPaquetesData(prev => ({
                    ...prev,
                    [activeTipoEventoId]: nuevosPaquetesOrigen,
                    [overTipoEventoId]: nuevosPaquetesDestino
                }));

                // Actualizar el estado global de paquetes
                const paquetesActualizados = initialPaquetes.map(paquete =>
                    paquete.id === activeId
                        ? { ...paquete, event_type_id: overTipoEventoId, position: paquetesDestino.length }
                        : paquete
                );
                onPaquetesChange(paquetesActualizados);

                // Actualizar en el backend
                try {
                    // Actualizar el paquete con el nuevo event_type_id y posición
                    const { actualizarPaquete } = await import('@/lib/actions/studio/builder/catalogo/paquetes.actions');
                    const result = await actualizarPaquete(studioSlug, activeId, {
                        event_type_id: overTipoEventoId,
                        position: paquetesDestino.length
                    });

                    if (result.success) {
                        toast.success(`Paquete movido a ${tiposEvento.find(t => t.id === overTipoEventoId)?.nombre}`);
                    } else {
                        toast.error(result.error || "Error al mover el paquete");
                        // Revertir cambios si falla el backend
                        setPaquetesData(prev => ({
                            ...prev,
                            [activeTipoEventoId]: paquetesOrigen,
                            [overTipoEventoId]: paquetesDestino
                        }));
                        onPaquetesChange(initialPaquetes);
                    }
                } catch (error) {
                    console.error("Error moviendo paquete:", error);
                    toast.error("Error al mover el paquete");
                    // Revertir cambios si falla el backend
                    setPaquetesData(prev => ({
                        ...prev,
                        [activeTipoEventoId]: paquetesOrigen,
                        [overTipoEventoId]: paquetesDestino
                    }));
                    onPaquetesChange(initialPaquetes);
                }
            }

            setActiveId(null);
        },
        [paquetesData, initialPaquetes, onPaquetesChange, tiposEvento, studioSlug]
    );

    // Handlers para tipos de evento - usar las mismas funciones que el sistema existente
    const handleCreateTipoEvento = () => {
        setIsCreateTipoEventoModalOpen(true);
    };

    const handleTipoEventoCreated = (newTipoEvento: TipoEventoData) => {
        // Actualizar el estado local del componente
        setTiposEvento(prev => [...prev, newTipoEvento]);

        // Actualizar el estado global (para sincronizar con otros componentes)
        const updatedTiposEvento = [...tiposEvento, newTipoEvento];
        onTiposEventoChange(updatedTiposEvento);

        // Inicializar paquetes vacíos para el nuevo tipo
        setPaquetesData(prev => ({
            ...prev,
            [newTipoEvento.id]: []
        }));

        setIsCreateTipoEventoModalOpen(false);
        toast.success("Tipo de evento creado correctamente");
    };

    const handleEditTipoEvento = (tipoEvento: TipoEventoData) => {
        setEditingTipoEvento(tipoEvento);
        setIsEditTipoEventoModalOpen(true);
    };

    const handleTipoEventoUpdated = (updatedTipoEvento: TipoEventoData) => {
        // Actualizar el estado local del componente
        setTiposEvento(prev => prev.map(tipo =>
            tipo.id === updatedTipoEvento.id ? updatedTipoEvento : tipo
        ));

        // Actualizar el estado global (para sincronizar con otros componentes)
        const updatedTiposEvento = tiposEvento.map(tipo =>
            tipo.id === updatedTipoEvento.id ? updatedTipoEvento : tipo
        );
        onTiposEventoChange(updatedTiposEvento);

        setIsEditTipoEventoModalOpen(false);
        setEditingTipoEvento(null);
        toast.success("Tipo de evento actualizado correctamente");
    };

    const handleDeleteTipoEvento = (tipoEvento: TipoEventoData) => {
        setTipoEventoToDelete(tipoEvento);
        setIsDeleteTipoEventoModalOpen(true);
    };

    const handleConfirmDeleteTipoEvento = async () => {
        if (!tipoEventoToDelete) return;

        try {
            setIsLoading(true);
            // Importar la función de eliminación existente
            const { eliminarTipoEvento } = await import('@/lib/actions/studio/negocio/tipos-evento.actions');

            const result = await eliminarTipoEvento(tipoEventoToDelete.id);

            if (result.success) {
                // Actualizar el estado local del componente
                setTiposEvento(prev => prev.filter(t => t.id !== tipoEventoToDelete.id));

                // Actualizar el estado global (para sincronizar con otros componentes)
                const updatedTiposEvento = tiposEvento.filter(t => t.id !== tipoEventoToDelete.id);
                onTiposEventoChange(updatedTiposEvento);

                // También eliminar los paquetes asociados del estado local
                setPaquetesData(prev => {
                    const newData = { ...prev };
                    delete newData[tipoEventoToDelete.id];
                    return newData;
                });

                // Actualizar paquetes globales (eliminar los que pertenecen a este tipo)
                const updatedPaquetes = initialPaquetes.filter(p => p.event_type_id !== tipoEventoToDelete.id);
                onPaquetesChange(updatedPaquetes);

                toast.success("Tipo de evento eliminado correctamente");
            } else {
                toast.error(result.error || "Error al eliminar tipo de evento");
            }
        } catch (error) {
            console.error("Error eliminando tipo de evento:", error);
            toast.error("Error al eliminar tipo de evento");
        } finally {
            setIsLoading(false);
            setIsDeleteTipoEventoModalOpen(false);
            setTipoEventoToDelete(null);
        }
    };

    // Handlers para paquetes - usar las mismas funciones que PaquetesPorTipo
    const handleEditPaquete = (paquete: PaqueteFromDB) => {
        setEditingPaquete(paquete);
        setShowForm(true);
    };

    const handleCrearPaquete = (tipoEventoId: string) => {
        setEditingPaquete(null);
        setShowForm(true);
        // TODO: Pasar el tipoEventoId al formulario
    };

    const handleSavePaquete = (savedPaquete: PaqueteFromDB) => {
        if (editingPaquete) {
            // Actualizar paquete existente
            const newPaquetes = paquetes.map((p) =>
                p.id === editingPaquete.id ? savedPaquete : p
            );
            onPaquetesChange(newPaquetes);

            // Actualizar también el estado local paquetesData
            setPaquetesData(prev => {
                const newData = { ...prev };
                // Buscar y actualizar en el tipo de evento correspondiente
                Object.keys(newData).forEach(tipoEventoId => {
                    const paquetesDelTipo = newData[tipoEventoId];
                    const index = paquetesDelTipo.findIndex(p => p.id === editingPaquete.id);
                    if (index !== -1) {
                        newData[tipoEventoId] = paquetesDelTipo.map(p =>
                            p.id === editingPaquete.id ? savedPaquete : p
                        );
                    }
                });
                return newData;
            });
        } else {
            // Crear nuevo paquete
            const newPaquetes = [...paquetes, savedPaquete];
            onPaquetesChange(newPaquetes);

            // Agregar también al estado local paquetesData
            setPaquetesData(prev => {
                const newData = { ...prev };
                const tipoEventoId = savedPaquete.event_type_id || 'sin-tipo';
                if (!newData[tipoEventoId]) {
                    newData[tipoEventoId] = [];
                }
                newData[tipoEventoId] = [...newData[tipoEventoId], savedPaquete];
                return newData;
            });
        }
        setShowForm(false);
        setEditingPaquete(null);
    };

    const handleCancelPaquete = () => {
        setShowForm(false);
        setEditingPaquete(null);
    };

    const handleDuplicatePaquete = async (paquete: PaqueteFromDB) => {
        try {
            setIsLoading(true);
            // Importar la función de duplicación existente
            const { duplicarPaquete } = await import('@/lib/actions/studio/builder/catalogo/paquetes.actions');

            const result = await duplicarPaquete(studioSlug, paquete.id);

            if (result.success && result.data) {
                // Actualizar el estado local
                const paqueteDuplicado = result.data;
                setPaquetesData(prev => ({
                    ...prev,
                    [paquete.event_type_id]: [...(prev[paquete.event_type_id] || []), paqueteDuplicado]
                }));

                // Actualizar el estado global
                onPaquetesChange([...initialPaquetes, paqueteDuplicado]);
                toast.success("Paquete duplicado correctamente");
            } else {
                toast.error(result.error || "Error al duplicar paquete");
            }
        } catch (error) {
            console.error("Error duplicando paquete:", error);
            toast.error("Error al duplicar paquete");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeletePaquete = (paquete: PaqueteFromDB) => {
        setPaqueteToDelete(paquete);
        setIsDeletePaqueteModalOpen(true);
    };

    const handleConfirmDeletePaquete = async () => {
        if (!paqueteToDelete) return;

        try {
            setIsLoading(true);
            // Importar la función de eliminación existente
            const { eliminarPaquete } = await import('@/lib/actions/studio/builder/catalogo/paquetes.actions');

            const result = await eliminarPaquete(studioSlug, paqueteToDelete.id);

            if (result.success) {
                // Actualizar el estado local
                setPaquetesData(prev => ({
                    ...prev,
                    [paqueteToDelete.event_type_id]: (prev[paqueteToDelete.event_type_id] || []).filter(p => p.id !== paqueteToDelete.id)
                }));

                // Actualizar el estado global
                const updatedPaquetes = initialPaquetes.filter(p => p.id !== paqueteToDelete.id);
                onPaquetesChange(updatedPaquetes);

                toast.success("Paquete eliminado correctamente");
            } else {
                toast.error(result.error || "Error al eliminar paquete");
            }
        } catch (error) {
            console.error("Error eliminando paquete:", error);
            toast.error("Error al eliminar paquete");
        } finally {
            setIsLoading(false);
            setIsDeletePaqueteModalOpen(false);
            setPaqueteToDelete(null);
        }
    };

    // Componente droppable para tipos de evento
    const DroppableTipoEvento = ({ tipoEvento, children }: { tipoEvento: TipoEventoData; children: React.ReactNode }) => {
        const { setNodeRef, isOver } = useDroppable({
            id: `tipo-evento-${tipoEvento.id}`,
        });

        return (
            <div
                ref={setNodeRef}
                className={`border border-zinc-700 rounded-lg overflow-hidden transition-colors ${isOver ? 'border-purple-500 bg-purple-500/10' : ''
                    }`}
            >
                {children}
            </div>
        );
    };

    // Componente sortable para paquetes
    const SortablePaquete = ({ paquete, paqueteIndex }: { paquete: PaqueteFromDB; paqueteIndex: number }) => {
        const {
            attributes,
            listeners,
            setNodeRef,
            transform,
            transition,
            isDragging,
        } = useSortable({ id: paquete.id });

        const style = {
            transform: CSS.Transform.toString(transform),
            transition,
            opacity: isDragging ? 0.5 : 1,
        };

        return (
            <div
                ref={setNodeRef}
                style={style}
                className={`flex items-center justify-between p-3 pl-8 ${paqueteIndex > 0 ? 'border-t border-zinc-700/50' : ''} hover:bg-zinc-700/20 transition-colors`}
            >
                <div className="flex items-center gap-3 flex-1 text-left">
                    <button
                        {...attributes}
                        {...listeners}
                        className="p-1 hover:bg-zinc-600 rounded cursor-grab active:cursor-grabbing mr-2"
                        title="Arrastrar para reordenar"
                    >
                        <GripVertical className="h-4 w-4 text-zinc-500" />
                    </button>
                    <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                    <div>
                        <h5 className="text-sm font-medium text-zinc-300">{paquete.name}</h5>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs bg-zinc-700 text-zinc-400 px-2 py-1 rounded">
                                ${paquete.precio?.toLocaleString() || '0'}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <ZenDropdownMenu>
                        <ZenDropdownMenuTrigger asChild>
                            <ZenButton
                                variant="ghost"
                                size="sm"
                                className="w-8 h-8 p-0"
                            >
                                <MoreHorizontal className="w-4 h-4" />
                            </ZenButton>
                        </ZenDropdownMenuTrigger>
                        <ZenDropdownMenuContent align="end" className="w-48">
                            <ZenDropdownMenuItem onClick={() => handleEditPaquete(paquete)}>
                                <Edit2 className="h-4 w-4 mr-2" />
                                Editar paquete
                            </ZenDropdownMenuItem>
                            <ZenDropdownMenuItem onClick={() => handleDuplicatePaquete(paquete)}>
                                <Copy className="h-4 w-4 mr-2" />
                                Duplicar paquete
                            </ZenDropdownMenuItem>
                            <ZenDropdownMenuSeparator />
                            <ZenDropdownMenuItem
                                onClick={() => handleDeletePaquete(paquete)}
                                className="text-red-400 focus:text-red-300"
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Eliminar paquete
                            </ZenDropdownMenuItem>
                        </ZenDropdownMenuContent>
                    </ZenDropdownMenu>
                </div>
            </div>
        );
    };

    // Skeleton components
    const AcordeonSkeleton = () => (
        <div className="space-y-2">
            {[1, 2, 3].map((i) => (
                <div key={i} className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 animate-pulse">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-4 h-4 bg-zinc-700 rounded"></div>
                            <div className="h-4 bg-zinc-700 rounded w-32"></div>
                        </div>
                        <div className="h-4 bg-zinc-700 rounded w-16"></div>
                    </div>
                </div>
            ))}
        </div>
    );

    if (isInitialLoading) {
        return (
            <div className="space-y-4">
                {/* Header con loading */}
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">Paquetes</h3>
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
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="space-y-4">
                {/* Header con botón de crear tipo de evento */}
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">Paquetes</h3>
                    <ZenButton
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                        onClick={handleCreateTipoEvento}
                    >
                        <Plus className="w-4 h-4" />
                        Nuevo Tipo de Evento
                    </ZenButton>
                </div>

                {/* Lista de tipos de evento con acordeón */}
                <div className="space-y-2">
                    {tiposEvento
                        .sort((a, b) => (a.orden || 0) - (b.orden || 0))
                        .map((tipoEvento) => {
                            const isTipoEventoExpandido = tiposEventoExpandidos.has(tipoEvento.id);
                            const paquetesDelTipo = paquetesData[tipoEvento.id] || [];

                            return (
                                <DroppableTipoEvento key={tipoEvento.id} tipoEvento={tipoEvento}>
                                    {/* Header del tipo de evento */}
                                    <div className="flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors bg-zinc-800/30">
                                        <div className="flex items-center gap-3 flex-1 text-left">
                                            <button
                                                onClick={() => toggleTipoEvento(tipoEvento.id)}
                                                className="flex items-center gap-3 flex-1 text-left"
                                            >
                                                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                                <div>
                                                    <h4 className="font-semibold text-white">{tipoEvento.nombre}</h4>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-xs bg-zinc-700 text-zinc-400 px-2 py-1 rounded">
                                                            {paquetesDelTipo.length} {paquetesDelTipo.length === 1 ? 'paquete' : 'paquetes'}
                                                        </span>
                                                    </div>
                                                </div>
                                                {isTipoEventoExpandido ? (
                                                    <ChevronDown className="w-4 h-4 text-zinc-400" />
                                                ) : (
                                                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                                                )}
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <ZenButton
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleCrearPaquete(tipoEvento.id);
                                                }}
                                                variant="ghost"
                                                size="sm"
                                                className="w-8 h-8 p-0"
                                                title="Agregar paquete"
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
                                                    <ZenDropdownMenuItem onClick={() => handleEditTipoEvento(tipoEvento)}>
                                                        <Edit2 className="h-4 w-4 mr-2" />
                                                        Editar tipo de evento
                                                    </ZenDropdownMenuItem>
                                                    <ZenDropdownMenuSeparator />
                                                    <ZenDropdownMenuItem
                                                        onClick={() => handleDeleteTipoEvento(tipoEvento)}
                                                        className="text-red-400 focus:text-red-300"
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                        Eliminar tipo de evento
                                                    </ZenDropdownMenuItem>
                                                </ZenDropdownMenuContent>
                                            </ZenDropdownMenu>
                                        </div>
                                    </div>

                                    {/* Contenido del tipo de evento */}
                                    {isTipoEventoExpandido && (
                                        <div className="bg-zinc-900/50">
                                            {paquetesDelTipo.length === 0 ? (
                                                <div className="p-8 text-center text-zinc-500">
                                                    <p>No hay paquetes en este tipo de evento</p>
                                                    <ZenButton
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleCrearPaquete(tipoEvento.id)}
                                                        className="mt-2"
                                                    >
                                                        <Plus className="h-4 w-4 mr-2" />
                                                        Crear paquete
                                                    </ZenButton>
                                                </div>
                                            ) : (
                                                <SortableContext
                                                    items={paquetesDelTipo.map(p => p.id)}
                                                    strategy={verticalListSortingStrategy}
                                                >
                                                    <div className="space-y-1">
                                                        {paquetesDelTipo
                                                            .sort((a, b) => (a.position || 0) - (b.position || 0))
                                                            .map((paquete, paqueteIndex) => (
                                                                <SortablePaquete
                                                                    key={paquete.id}
                                                                    paquete={paquete}
                                                                    paqueteIndex={paqueteIndex}
                                                                />
                                                            ))}
                                                    </div>
                                                </SortableContext>
                                            )}
                                        </div>
                                    )}
                                </DroppableTipoEvento>
                            );
                        })}
                </div>
            </div>

            <DragOverlay>
                {activeId ? (
                    <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 opacity-90">
                        <div className="flex items-center gap-3">
                            <GripVertical className="h-4 w-4 text-zinc-500" />
                            <span className="font-medium text-white">
                                {Object.values(paquetesData).flat().find(p => p.id === activeId)?.name || 'Paquete'}
                            </span>
                        </div>
                    </div>
                ) : null}
            </DragOverlay>

            {/* Modales de confirmación */}
            <ZenConfirmModal
                isOpen={isDeleteTipoEventoModalOpen}
                onClose={() => {
                    setIsDeleteTipoEventoModalOpen(false);
                    setTipoEventoToDelete(null);
                }}
                onConfirm={handleConfirmDeleteTipoEvento}
                title="Eliminar tipo de evento"
                description={`¿Estás seguro de que deseas eliminar el tipo de evento "${tipoEventoToDelete?.nombre}"? Esta acción no se puede deshacer.`}
                confirmText="Eliminar"
                cancelText="Cancelar"
                variant="destructive"
                loading={isLoading}
            />

            <ZenConfirmModal
                isOpen={isDeletePaqueteModalOpen}
                onClose={() => {
                    setIsDeletePaqueteModalOpen(false);
                    setPaqueteToDelete(null);
                }}
                onConfirm={handleConfirmDeletePaquete}
                title="Eliminar paquete"
                description={`¿Estás seguro de que deseas eliminar el paquete "${paqueteToDelete?.name}"? Esta acción no se puede deshacer.`}
                confirmText="Eliminar"
                cancelText="Cancelar"
                variant="destructive"
                loading={isLoading}
            />

            {/* Modal para crear tipo de evento */}
            <TipoEventoForm
                isOpen={isCreateTipoEventoModalOpen}
                onClose={() => setIsCreateTipoEventoModalOpen(false)}
                onSuccess={handleTipoEventoCreated}
                studioSlug={studioSlug}
            />

            {/* Modal para editar tipo de evento */}
            <TipoEventoForm
                isOpen={isEditTipoEventoModalOpen}
                onClose={() => {
                    setIsEditTipoEventoModalOpen(false);
                    setEditingTipoEvento(null);
                }}
                onSuccess={handleTipoEventoUpdated}
                studioSlug={studioSlug}
                tipoEvento={editingTipoEvento}
            />

            {/* Modal para crear/editar paquete */}
            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-700">
                    <DialogHeader>
                        <DialogTitle className="text-white">
                            {editingPaquete ? 'Editar Paquete' : 'Nuevo Paquete'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingPaquete ? 'Edita los detalles de tu paquete.' : 'Crea un nuevo paquete para tu estudio.'}
                        </DialogDescription>
                    </DialogHeader>
                    <PaqueteFormularioAvanzado
                        studioSlug={studioSlug}
                        paquete={editingPaquete}
                        onSave={handleSavePaquete}
                        onCancel={handleCancelPaquete}
                    />
                </DialogContent>
            </Dialog>
        </DndContext>
    );
}
