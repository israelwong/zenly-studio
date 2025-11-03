"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, Plus, Edit2, Trash2, Loader2, GripVertical, Copy, MoreHorizontal, List, Star, CheckCircle, XCircle, Eye, EyeOff } from "lucide-react";
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
import { reorderPaquetes } from "@/lib/actions/studio/builder/paquetes/paquetes.actions";
import type { TipoEventoData } from "@/lib/actions/schemas/tipos-evento-schemas";
import type { PaqueteFromDB } from "@/lib/actions/schemas/paquete-schemas";

interface PaquetesTipoEventoListProps {
    studioSlug: string;
    tiposEvento: TipoEventoData[];
    paquetes: PaqueteFromDB[];
    onTiposEventoChange: (newTiposEvento: TipoEventoData[]) => void;
    onPaquetesChange: (newPaquetes: PaqueteFromDB[]) => void;
}

export function PaquetesTipoEventoList({
    studioSlug,
    tiposEvento: initialTiposEvento,
    paquetes: initialPaquetes,
    onTiposEventoChange,
    onPaquetesChange,
}: PaquetesTipoEventoListProps) {
    const router = useRouter();

    // Estados de expansión
    const [tiposEventoExpandidos, setTiposEventoExpandidos] = useState<Set<string>>(new Set());

    // Datos
    const [tiposEvento, setTiposEvento] = useState<TipoEventoData[]>(initialTiposEvento);
    const [paquetesData, setPaquetesData] = useState<Record<string, PaqueteFromDB[]>>({});

    // Estados de carga
    const [isLoading, setIsLoading] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);

    // Estado para trackear paquetes que se están duplicando (placeholder temporal)
    const [duplicatingPaquetes, setDuplicatingPaquetes] = useState<Map<string, { eventTypeId: string; nombre: string }>>(new Map());

    // Estados para drag & drop
    const [activeId, setActiveId] = useState<string | null>(null);
    const [isDraggingTipoEvento, setIsDraggingTipoEvento] = useState(false);


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
        const activeId = event.active.id as string;
        console.log("🚀 Drag start:", activeId);
        setActiveId(activeId);

        // Detectar si se está arrastrando un tipo de evento
        const isTipoEvento = tiposEvento.some(tipo => tipo.id === activeId);
        setIsDraggingTipoEvento(isTipoEvento);
        console.log("📁 Arrastrando tipo de evento:", isTipoEvento);
    };

    // Función para manejar drag over - expandir tipos de evento automáticamente
    const handleDragOver = useCallback(async (event: DragOverEvent) => {
        const { over, active } = event;
        if (!over) return;

        const overId = String(over.id);
        const activeId = String(active.id);

        // Si se está arrastrando un tipo de evento, contraer todos los tipos de evento
        const isDraggingTipoEvento = tiposEvento.some(tipo => tipo.id === activeId);
        if (isDraggingTipoEvento) {
            console.log("📁 Arrastrando tipo de evento - contrayendo todos los tipos de evento");
            setTiposEventoExpandidos(new Set());
            return;
        }

        // Buscar si el overId corresponde a un tipo de evento
        let tipoEventoId = null;

        // Verificar si es el EmptyTipoEventoDropZone
        if (overId.startsWith("tipo-evento-")) {
            tipoEventoId = overId.replace("tipo-evento-", "");
        } else {
            // Verificar si es directamente el ID de un tipo de evento
            if (tiposEvento.some(tipo => tipo.id === overId)) {
                tipoEventoId = overId;
            }
        }

        // Si encontramos un tipo de evento y está contraído, expandirlo
        if (tipoEventoId && !tiposEventoExpandidos.has(tipoEventoId)) {
            console.log("🔍 Expandiendo tipo de evento automáticamente:", tipoEventoId);
            setTiposEventoExpandidos(prev => new Set([...prev, tipoEventoId]));
        }
    }, [tiposEventoExpandidos, tiposEvento]);

    const handleDragEnd = useCallback(
        async (event: DragEndEvent) => {
            const { active, over } = event;

            if (!over || !active) return;

            const activeId = String(active.id);
            const overId = String(over.id);

            if (activeId === overId) return;

            console.log("🔍 Debug drag end:", {
                activeId,
                overId,
                tiposEventoIds: tiposEvento.map(t => t.id),
                paquetesIds: Object.values(paquetesData).flat().map(p => p.id)
            });

            // Verificar si se está arrastrando un tipo de evento
            const activeTipoEvento = tiposEvento.find(tipo => tipo.id === activeId);
            if (activeTipoEvento) {
                console.log("📁 Arrastrando tipo de evento:", activeTipoEvento.nombre);
                // Reordenamiento de tipos de evento
                const overTipoEvento = tiposEvento.find(tipo => tipo.id === overId);
                if (!overTipoEvento) {
                    console.log("❌ No se encontró el tipo de evento destino");
                    setActiveId(null);
                    setIsDraggingTipoEvento(false);
                    return;
                }
                console.log("📁 Soltando sobre tipo de evento:", overTipoEvento.nombre);

                const activeIndex = tiposEvento.findIndex(tipo => tipo.id === activeId);
                const overIndex = tiposEvento.findIndex(tipo => tipo.id === overId);

                if (activeIndex === -1 || overIndex === -1) return;

                const newTiposEvento = arrayMove(tiposEvento, activeIndex, overIndex);
                const tiposConOrden = newTiposEvento.map((tipo, index) => ({
                    ...tipo,
                    orden: index
                }));

                setTiposEvento(tiposConOrden);
                onTiposEventoChange(tiposConOrden);

                // Actualizar en el backend
                try {
                    const { actualizarOrdenTiposEvento } = await import('@/lib/actions/studio/negocio/tipos-evento.actions');
                    const result = await actualizarOrdenTiposEvento(studioSlug, {
                        tipos: tiposConOrden.map(tipo => ({
                            id: tipo.id,
                            orden: tipo.orden || 0
                        }))
                    });

                    if (result.success) {
                        toast.success("Orden de tipos de evento actualizado");
                    } else {
                        toast.error(result.error || "Error al actualizar el orden");
                        // Revertir cambios si falla el backend
                        setTiposEvento(tiposEvento);
                        onTiposEventoChange(tiposEvento);
                    }
                } catch (error) {
                    console.error("Error actualizando orden de tipos:", error);
                    toast.error("Error al actualizar el orden");
                    // Revertir cambios si falla el backend
                    setTiposEvento(tiposEvento);
                    onTiposEventoChange(tiposEvento);
                }

                setActiveId(null);
                setIsDraggingTipoEvento(false);
                return;
            }

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
                        // El preview se actualiza automáticamente a través de onPaquetesChange
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
                    const { actualizarPaquete } = await import('@/lib/actions/studio/builder/paquetes/paquetes.actions');
                    const result = await actualizarPaquete(studioSlug, activeId, {
                        event_type_id: overTipoEventoId,
                        position: paquetesDestino.length
                    });

                    if (result.success) {
                        toast.success(`Paquete movido a ${tiposEvento.find(t => t.id === overTipoEventoId)?.nombre}`);
                        // El preview se actualiza automáticamente a través de onPaquetesChange
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
            setIsDraggingTipoEvento(false);
        },
        [paquetesData, initialPaquetes, onPaquetesChange, tiposEvento, studioSlug, onTiposEventoChange]
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

    // Handlers para paquetes - usar navegación en lugar de modal
    const handleEditPaquete = (paquete: PaqueteFromDB) => {
        router.push(`/${studioSlug}/studio/builder/content/paquetes/${paquete.id}/editar`);
    };

    const handleCrearPaquete = () => {
        router.push(`/${studioSlug}/studio/builder/content/paquetes/nuevo`);
    };

    const handleDuplicatePaquete = async (paquete: PaqueteFromDB) => {
        // Generar ID temporal para el placeholder
        const tempId = `duplicating-${Date.now()}-${Math.random()}`;

        // Agregar placeholder inmediatamente
        setDuplicatingPaquetes(prev => new Map(prev).set(tempId, {
            eventTypeId: paquete.event_type_id,
            nombre: paquete.name
        }));

        // Crear placeholder temporal en la lista
        const placeholderPaquete: PaqueteFromDB = {
            id: tempId,
            studio_id: paquete.studio_id,
            event_type_id: paquete.event_type_id,
            name: paquete.name,
            description: null,
            cover_url: null,
            is_featured: false,
            cost: paquete.cost,
            expense: paquete.expense,
            utilidad: paquete.utilidad,
            precio: paquete.precio,
            status: 'active',
            position: (paquetesData[paquete.event_type_id]?.length || 0),
            created_at: new Date(),
            updated_at: new Date(),
            event_types: paquete.event_types,
        };

        // Agregar placeholder al estado local inmediatamente
        setPaquetesData(prev => ({
            ...prev,
            [paquete.event_type_id]: [...(prev[paquete.event_type_id] || []), placeholderPaquete]
        }));

        try {
            // Importar la función de duplicación existente
            const { duplicarPaquete } = await import('@/lib/actions/studio/builder/paquetes/paquetes.actions');

            const result = await duplicarPaquete(studioSlug, paquete.id);

            if (result.success && result.data) {
                const paqueteDuplicado = result.data;

                // Remover placeholder de duplicating
                setDuplicatingPaquetes(prev => {
                    const newMap = new Map(prev);
                    newMap.delete(tempId);
                    return newMap;
                });

                // Reemplazar placeholder con el paquete real
                setPaquetesData(prev => ({
                    ...prev,
                    [paquete.event_type_id]: (prev[paquete.event_type_id] || []).map(p =>
                        p.id === tempId ? paqueteDuplicado : p
                    )
                }));

                // Actualizar el estado global (esto ya actualiza el preview localmente)
                onPaquetesChange([...initialPaquetes.filter(p => p.id !== tempId), paqueteDuplicado]);
                toast.success("Paquete duplicado correctamente");
            } else {
                // Remover placeholder en caso de error
                setDuplicatingPaquetes(prev => {
                    const newMap = new Map(prev);
                    newMap.delete(tempId);
                    return newMap;
                });
                setPaquetesData(prev => ({
                    ...prev,
                    [paquete.event_type_id]: (prev[paquete.event_type_id] || []).filter(p => p.id !== tempId)
                }));
                toast.error(result.error || "Error al duplicar paquete");
            }
        } catch (error) {
            // Remover placeholder en caso de error
            setDuplicatingPaquetes(prev => {
                const newMap = new Map(prev);
                newMap.delete(tempId);
                return newMap;
            });
            setPaquetesData(prev => ({
                ...prev,
                [paquete.event_type_id]: (prev[paquete.event_type_id] || []).filter(p => p.id !== tempId)
            }));
            console.error("Error duplicando paquete:", error);
            toast.error("Error al duplicar paquete");
        }
    };

    const handleToggleFeatured = async (paquete: PaqueteFromDB) => {
        const newFeaturedValue = !paquete.is_featured;

        try {
            setIsLoading(true);
            const { actualizarPaquete } = await import('@/lib/actions/studio/builder/paquetes/paquetes.actions');

            // Si se va a destacar y no está publicado, publicarlo también
            const updateData: { is_featured: boolean; status?: string } = {
                is_featured: newFeaturedValue
            };
            if (newFeaturedValue && paquete.status !== 'active') {
                updateData.status = 'active';
            }

            const result = await actualizarPaquete(studioSlug, paquete.id, updateData);

            if (result.success && result.data) {
                const updatedPaquete = result.data;

                // Si se destacó, quitar destacado de otros paquetes del mismo tipo en el estado local
                if (newFeaturedValue) {
                    setPaquetesData(prev => ({
                        ...prev,
                        [paquete.event_type_id]: (prev[paquete.event_type_id] || []).map(p =>
                            p.id === paquete.id ? updatedPaquete :
                                (p.is_featured ? { ...p, is_featured: false } : p)
                        )
                    }));
                } else {
                    // Si se quitó el destacado, solo actualizar este paquete
                    setPaquetesData(prev => ({
                        ...prev,
                        [paquete.event_type_id]: (prev[paquete.event_type_id] || []).map(p =>
                            p.id === paquete.id ? updatedPaquete : p
                        )
                    }));
                }

                // Actualizar estado global
                const updatedPaquetes = initialPaquetes.map(p =>
                    p.id === paquete.id ? updatedPaquete :
                        (p.event_type_id === paquete.event_type_id && p.is_featured && newFeaturedValue)
                            ? { ...p, is_featured: false }
                            : p
                );
                onPaquetesChange(updatedPaquetes);

                const message = newFeaturedValue
                    ? (paquete.status !== 'active' ? "Paquete destacado y publicado" : "Paquete destacado")
                    : "Destacado removido";
                toast.success(message);
            } else {
                toast.error(result.error || "Error al actualizar destacado");
            }
        } catch (error) {
            console.error("Error actualizando destacado:", error);
            toast.error("Error al actualizar destacado");
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleStatus = async (paquete: PaqueteFromDB) => {
        const newStatus = paquete.status === 'active' ? 'inactive' : 'active';

        try {
            setIsLoading(true);
            const { actualizarPaquete } = await import('@/lib/actions/studio/builder/paquetes/paquetes.actions');

            // Si se va a despublicar y está destacado, quitar destacado también
            const updateData: { status: string; is_featured?: boolean } = {
                status: newStatus
            };
            if (newStatus === 'inactive' && paquete.is_featured) {
                updateData.is_featured = false;
            }

            const result = await actualizarPaquete(studioSlug, paquete.id, updateData);

            if (result.success && result.data) {
                const updatedPaquete = result.data;

                // Actualizar estado local
                setPaquetesData(prev => ({
                    ...prev,
                    [paquete.event_type_id]: (prev[paquete.event_type_id] || []).map(p =>
                        p.id === paquete.id ? updatedPaquete : p
                    )
                }));

                // Actualizar estado global
                const updatedPaquetes = initialPaquetes.map(p =>
                    p.id === paquete.id ? updatedPaquete : p
                );
                onPaquetesChange(updatedPaquetes);

                const message = newStatus === 'active'
                    ? "Paquete publicado"
                    : (paquete.is_featured ? "Paquete despublicado y destacado removido" : "Paquete despublicado");
                toast.success(message);
            } else {
                toast.error(result.error || "Error al actualizar estado");
            }
        } catch (error) {
            console.error("Error actualizando estado:", error);
            toast.error("Error al actualizar estado");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeletePaquete = (paquete: PaqueteFromDB) => {
        // Prevenir múltiples aperturas del modal
        if (isDeletePaqueteModalOpen) return;

        setPaqueteToDelete(paquete);
        setIsDeletePaqueteModalOpen(true);
    };

    const handleConfirmDeletePaquete = async () => {
        if (!paqueteToDelete) return;

        const paqueteIdToDelete = paqueteToDelete.id;
        const eventTypeId = paqueteToDelete.event_type_id;

        try {
            setIsLoading(true);
            // Importar la función de eliminación existente
            const { eliminarPaquete } = await import('@/lib/actions/studio/builder/paquetes/paquetes.actions');

            const result = await eliminarPaquete(studioSlug, paqueteIdToDelete);

            if (result.success) {
                // Cerrar el modal primero antes de actualizar el estado para evitar parpadeos
                setIsDeletePaqueteModalOpen(false);
                setPaqueteToDelete(null);

                // Actualizar el estado local
                setPaquetesData(prev => ({
                    ...prev,
                    [eventTypeId]: (prev[eventTypeId] || []).filter(p => p.id !== paqueteIdToDelete)
                }));

                // Actualizar el estado global (esto ya actualiza el preview localmente)
                const updatedPaquetes = initialPaquetes.filter(p => p.id !== paqueteIdToDelete);
                onPaquetesChange(updatedPaquetes);

                toast.success("Paquete eliminado correctamente");
            } else {
                toast.error(result.error || "Error al eliminar paquete");
                setIsLoading(false);
            }
        } catch (error) {
            console.error("Error eliminando paquete:", error);
            toast.error("Error al eliminar paquete");
            setIsLoading(false);
        }
    };

    // Componente droppable para tipos de evento
    const DroppableTipoEvento = ({ tipoEvento, children }: { tipoEvento: TipoEventoData; children: React.ReactNode }) => {
        const { setNodeRef, isOver } = useDroppable({
            id: `tipo-evento-${tipoEvento.id}`,
            disabled: isDraggingTipoEvento, // Desactivar cuando se arrastra un tipo de evento
        });

        return (
            <div
                ref={setNodeRef}
                className={`border border-zinc-700 rounded-lg overflow-hidden transition-colors ${isOver && !isDraggingTipoEvento ? 'border-purple-500 bg-purple-500/10' : ''
                    }`}
            >
                {children}
            </div>
        );
    };

    // Componente para zonas de drop vacías
    const EmptyTipoEventoDropZone = ({ tipoEvento }: { tipoEvento: TipoEventoData }) => {
        const { setNodeRef, isOver } = useDroppable({
            id: `tipo-evento-${tipoEvento.id}`,
            disabled: isDraggingTipoEvento, // Desactivar cuando se arrastra un tipo de evento
        });

        return (
            <div
                ref={setNodeRef}
                className={`text-center py-8 min-h-[100px] flex items-center justify-center m-4 transition-colors ${isOver && !isDraggingTipoEvento
                    ? 'bg-purple-500/10'
                    : ''
                    }`}
            >
                <div className="text-center">
                    <div className="text-zinc-500 mb-3">
                        <List className="h-8 w-8 mx-auto" />
                    </div>
                    <p className="text-sm text-zinc-400">
                        {isOver && !isDraggingTipoEvento ? 'Suelta aquí para agregar a este tipo de evento' : 'Este tipo de evento no tiene paquetes asociados'}
                    </p>
                </div>
            </div>
        );
    };

    // Componente completo para tipo de evento con sortable
    const TipoEventoItem = ({ tipoEvento }: { tipoEvento: TipoEventoData }) => {
        const {
            attributes,
            listeners,
            setNodeRef,
            transform,
            transition,
            isDragging,
        } = useSortable({ id: tipoEvento.id });

        const style = {
            transform: CSS.Transform.toString(transform),
            transition,
            opacity: isDragging ? 0.5 : 1,
        };

        const isTipoEventoExpandido = tiposEventoExpandidos.has(tipoEvento.id);
        const paquetesDelTipo = paquetesData[tipoEvento.id] || [];

        return (
            <div ref={setNodeRef} style={style} className="relative">
                <div className="border border-zinc-700 rounded-lg overflow-hidden">
                    <DroppableTipoEvento tipoEvento={tipoEvento}>
                        {/* Header del tipo de evento */}
                        <div className="flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors bg-zinc-800/30">
                            <div className="flex items-center gap-3 flex-1 text-left">
                                <button
                                    {...attributes}
                                    {...listeners}
                                    className="p-1 hover:bg-zinc-700 rounded cursor-grab active:cursor-grabbing mr-2"
                                    title="Arrastrar para reordenar tipos de evento"
                                >
                                    <GripVertical className="h-4 w-4 text-zinc-500" />
                                </button>
                                <button
                                    onClick={() => toggleTipoEvento(tipoEvento.id)}
                                    className="flex items-center gap-3 flex-1 text-left"
                                >
                                    <div>
                                        <div className="flex items-center gap-2">
                                            {isTipoEventoExpandido ? (
                                                <ChevronDown className="w-4 h-4 text-zinc-400" />
                                            ) : (
                                                <ChevronRight className="w-4 h-4 text-zinc-400" />
                                            )}
                                            <h4 className="font-semibold text-white">{tipoEvento.nombre}</h4>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs bg-zinc-700 text-zinc-400 px-2 py-1 rounded">
                                                {paquetesDelTipo.length} {paquetesDelTipo.length === 1 ? 'paquete' : 'paquetes'}
                                            </span>
                                        </div>
                                    </div>
                                </button>
                            </div>
                            <div className="flex items-center gap-1">
                                <ZenButton
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleCrearPaquete();
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
                                    <EmptyTipoEventoDropZone tipoEvento={tipoEvento} />
                                ) : (
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
                                )}
                            </div>
                        )}
                    </DroppableTipoEvento>
                </div>
            </div>
        );
    };

    // Componente sortable para paquetes
    const SortablePaquete = ({ paquete, paqueteIndex }: { paquete: PaqueteFromDB; paqueteIndex: number }) => {
        const isDuplicating = duplicatingPaquetes.has(paquete.id);

        // Siempre llamar useSortable (regla de hooks)
        const {
            attributes,
            listeners,
            setNodeRef,
            transform,
            transition,
            isDragging,
        } = useSortable({ id: paquete.id, disabled: isDuplicating });

        const style = {
            transform: CSS.Transform.toString(transform),
            transition,
            opacity: isDragging ? 0.5 : 1,
        };

        const coverUrl = paquete.cover_url;
        const hasCover = !!coverUrl && typeof coverUrl === 'string' && coverUrl.trim() !== '';
        const videoRef = useRef<HTMLVideoElement>(null);

        // Función robusta para detectar si es video (incluso con query strings)
        const isVideo = hasCover && (() => {
            if (!coverUrl) return false;
            const urlLower = coverUrl.toLowerCase();
            // Remover query string y fragmentos para validar extensión
            const urlPath = urlLower.split('?')[0].split('#')[0];
            // Verificar extensión de video
            const videoExtensions = ['.mp4', '.mov', '.webm', '.avi', '.m4v', '.mkv'];
            return videoExtensions.some(ext => urlPath.endsWith(ext));
        })();

        // Efecto para posicionar el video en el primer frame
        useEffect(() => {
            if (!isVideo || !videoRef.current) return;

            const video = videoRef.current;

            const handleLoadedMetadata = () => {
                try {
                    // Posicionar en el primer frame
                    if (video.readyState >= 2) {
                        video.currentTime = 0.1;
                    }
                } catch (error) {
                    console.error('Error setting video currentTime:', error);
                }
            };

            // Si ya está cargado, establecer el frame directamente
            if (video.readyState >= 2) {
                video.currentTime = 0.1;
            } else {
                video.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
            }

            return () => {
                video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            };
        }, [isVideo, coverUrl]);

        // Si está duplicando, mostrar placeholder
        if (isDuplicating) {
            const duplicatingInfo = duplicatingPaquetes.get(paquete.id);
            return (
                <div
                    className={`flex items-center justify-between py-3 px-2 pl-10 ${paqueteIndex > 0 ? 'border-t border-zinc-700/30' : ''} bg-zinc-800/50`}
                >
                    <div className="flex items-center gap-3 flex-1">
                        <div className="p-1 mr-2">
                            <Loader2 className="h-4 w-4 text-purple-400 animate-spin" />
                        </div>
                        <div className="flex-1">
                            <div className="text-sm text-zinc-400 leading-tight">
                                Duplicando &ldquo;{duplicatingInfo?.nombre || paquete.name}&rdquo;...
                            </div>
                            <div className="text-xs text-zinc-600 mt-1">
                                Creando copia del paquete
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div
                ref={setNodeRef}
                style={style}
                className={`flex items-center justify-between py-3 px-2 pl-10 ${paqueteIndex > 0 ? 'border-t border-zinc-700/30' : ''} hover:bg-zinc-700/20 transition-colors`}
            >
                <div className="flex items-center gap-3 flex-1">
                    <button
                        {...attributes}
                        {...listeners}
                        className="p-1 hover:bg-zinc-600 rounded cursor-grab active:cursor-grabbing mr-2"
                        title="Arrastrar para reordenar"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <GripVertical className="h-4 w-4 text-zinc-500" />
                    </button>
                    {/* Thumbnail del paquete */}
                    <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-800 border border-dashed border-zinc-600 relative">
                        {hasCover ? (
                            isVideo ? (
                                <video
                                    ref={videoRef}
                                    src={coverUrl || undefined}
                                    className="w-full h-full object-cover"
                                    muted
                                    playsInline
                                    preload="metadata"
                                    crossOrigin="anonymous"
                                />
                            ) : (
                                <Image
                                    src={coverUrl}
                                    alt={paquete.name}
                                    fill
                                    className="object-cover"
                                    sizes="48px"
                                    unoptimized
                                    onError={(e) => {
                                        console.error('Error cargando imagen thumbnail:', coverUrl, e);
                                    }}
                                />
                            )
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <div className="w-6 h-6 bg-zinc-700/50 rounded" />
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => handleEditPaquete(paquete)}
                        className="flex items-center gap-3 flex-1 text-left hover:opacity-80 transition-opacity cursor-pointer"
                    >
                        <div className="flex-1">
                            <div className="flex items-center gap-1.5">
                                {/* Indicadores de estado */}
                                {paquete.status === 'active' && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-600/20 text-emerald-400 border border-emerald-600/30">
                                        <CheckCircle className="h-2.5 w-2.5" />
                                        Publicado
                                    </span>
                                )}
                                {paquete.status !== 'active' && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-zinc-600/20 text-zinc-400 border border-zinc-600/30">
                                        <XCircle className="h-2.5 w-2.5" />
                                        No publicado
                                    </span>
                                )}
                                {paquete.is_featured && (
                                    <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-amber-600/20 border border-amber-600/30">
                                        <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                                    </span>
                                )}
                            </div>
                            <div className="text-sm text-white leading-tight mt-1">
                                {paquete.name}
                            </div>
                        </div>
                    </button>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-right w-20">
                        <div className="text-sm font-medium text-white">
                            ${paquete.precio?.toLocaleString() || '0'}
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <ZenDropdownMenu>
                            <ZenDropdownMenuTrigger asChild>
                                <ZenButton
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <MoreHorizontal className="h-4 w-4" />
                                </ZenButton>
                            </ZenDropdownMenuTrigger>
                            <ZenDropdownMenuContent align="end" className="w-48">
                                <ZenDropdownMenuItem onClick={() => handleDuplicatePaquete(paquete)}>
                                    <Copy className="h-4 w-4 mr-2" />
                                    Duplicar paquete
                                </ZenDropdownMenuItem>
                                <ZenDropdownMenuSeparator />
                                <ZenDropdownMenuItem
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleToggleFeatured(paquete);
                                    }}
                                    className={paquete.is_featured ? "text-amber-400 focus:text-amber-300" : ""}
                                >
                                    <Star className={`h-4 w-4 mr-2 ${paquete.is_featured ? 'fill-amber-400 text-amber-400' : ''}`} />
                                    {paquete.is_featured ? 'Quitar destacado' : 'Destacar paquete'}
                                </ZenDropdownMenuItem>
                                <ZenDropdownMenuSeparator />
                                <ZenDropdownMenuItem
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleToggleStatus(paquete);
                                    }}
                                    className={paquete.status === 'active' ? "text-emerald-400 focus:text-emerald-300" : ""}
                                >
                                    {paquete.status === 'active' ? (
                                        <>
                                            <EyeOff className="h-4 w-4 mr-2" />
                                            No publicar
                                        </>
                                    ) : (
                                        <>
                                            <Eye className="h-4 w-4 mr-2" />
                                            Publicar
                                        </>
                                    )}
                                </ZenDropdownMenuItem>
                                <ZenDropdownMenuSeparator />
                                <ZenDropdownMenuItem
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleDeletePaquete(paquete);
                                    }}
                                    className="text-red-400 focus:text-red-300"
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Eliminar paquete
                                </ZenDropdownMenuItem>
                            </ZenDropdownMenuContent>
                        </ZenDropdownMenu>
                    </div>
                </div>
            </div>
        );
    };

    // Skeleton components
    const AcordeonSkeleton = () => (
        <div className="space-y-2">
            {[1, 2, 3].map((i) => (
                <div key={i} className="border border-zinc-700 rounded-lg overflow-hidden animate-pulse">
                    {/* Header del tipo de evento skeleton */}
                    <div className="flex items-center justify-between p-4 bg-zinc-800/30">
                        <div className="flex items-center gap-3 flex-1">
                            {/* GripVertical skeleton */}
                            <div className="w-4 h-4 bg-zinc-700 rounded mr-2"></div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    {/* Chevron skeleton */}
                                    <div className="w-4 h-4 bg-zinc-700 rounded"></div>
                                    {/* Nombre skeleton */}
                                    <div className="h-5 bg-zinc-700 rounded w-40"></div>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                    {/* Badge skeleton */}
                                    <div className="h-5 bg-zinc-700 rounded w-20"></div>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            {/* Botones de acción skeleton */}
                            <div className="w-8 h-8 bg-zinc-700 rounded"></div>
                            <div className="w-8 h-8 bg-zinc-700 rounded"></div>
                        </div>
                    </div>
                    {/* Contenido expandido skeleton (opcional) */}
                    {i === 1 && (
                        <div className="bg-zinc-900/50 p-2 space-y-1">
                            {[1, 2].map((j) => (
                                <div key={j} className="flex items-center justify-between p-2 pl-10 border-t border-zinc-700/30">
                                    <div className="flex items-center gap-3 flex-1">
                                        <div className="w-4 h-4 bg-zinc-700 rounded mr-2"></div>
                                        <div className="flex-1">
                                            <div className="h-4 bg-zinc-700 rounded w-32 mb-1"></div>
                                            <div className="h-3 bg-zinc-700 rounded w-16"></div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="h-4 bg-zinc-700 rounded w-16"></div>
                                        <div className="w-8 h-8 bg-zinc-700 rounded"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
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
            onDragOver={handleDragOver}
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

                {/* Lista de tipos de evento con drag & drop */}
                <SortableContext
                    items={tiposEvento.map(t => t.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="space-y-2">
                        {tiposEvento
                            .sort((a, b) => (a.orden || 0) - (b.orden || 0))
                            .map((tipoEvento) => (
                                <TipoEventoItem key={tipoEvento.id} tipoEvento={tipoEvento} />
                            ))}
                    </div>
                </SortableContext>
            </div>

            <DragOverlay>
                {activeId ? (
                    <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 opacity-90">
                        <div className="flex items-center gap-3">
                            <GripVertical className="h-4 w-4 text-zinc-500" />
                            <span className="font-medium text-white">
                                {tiposEvento.find(t => t.id === activeId)?.nombre ||
                                    Object.values(paquetesData).flat().find(p => p.id === activeId)?.name || 'Elemento'}
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

            {isDeletePaqueteModalOpen && (
                <ZenConfirmModal
                    isOpen={isDeletePaqueteModalOpen}
                    onClose={() => {
                        if (!isLoading) {
                            setIsDeletePaqueteModalOpen(false);
                            setPaqueteToDelete(null);
                        }
                    }}
                    onConfirm={handleConfirmDeletePaquete}
                    title="Eliminar paquete"
                    description={`¿Estás seguro de que deseas eliminar el paquete "${paqueteToDelete?.name}"? Esta acción no se puede deshacer.`}
                    confirmText="Eliminar"
                    cancelText="Cancelar"
                    variant="destructive"
                    loading={isLoading}
                    disabled={isLoading}
                />
            )}

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

        </DndContext>
    );
}
