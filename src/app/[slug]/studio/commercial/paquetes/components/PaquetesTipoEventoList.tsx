"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { startTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, Plus, Edit2, Trash2, Loader2, GripVertical, Copy, MoreHorizontal, List, Star, CheckCircle, XCircle, Eye, EyeOff, HardDrive, Clock, Lock, Gift, Tag } from "lucide-react";
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
import { TipoEventoQuickAddModal } from "@/components/shared/tipos-evento/TipoEventoQuickAddModal";
import { reorderPaquetes, obtenerPaquetes } from "@/lib/actions/studio/paquetes/paquetes.actions";
import type { TipoEventoData } from "@/lib/actions/schemas/tipos-evento-schemas";
import type { PaqueteFromDB } from "@/lib/actions/schemas/paquete-schemas";

interface PaquetesTipoEventoListProps {
    studioSlug: string;
    tiposEvento: TipoEventoData[];
    paquetes: PaqueteFromDB[];
    onTiposEventoChange: (newTiposEvento: TipoEventoData[]) => void;
    onPaquetesChange: (newPaquetes: PaqueteFromDB[]) => void;
    isNavigating?: string | null;
    setIsNavigating?: (routeId: string | null) => void;
}

export function PaquetesTipoEventoList({
    studioSlug,
    tiposEvento: initialTiposEvento,
    paquetes: initialPaquetes,
    onTiposEventoChange,
    onPaquetesChange,
    isNavigating,
    setIsNavigating,
}: PaquetesTipoEventoListProps) {
    const router = useRouter();

    // Estados de expansión
    const [tiposEventoExpandidos, setTiposEventoExpandidos] = useState<Set<string>>(new Set());

    // Datos
    const [tiposEvento, setTiposEvento] = useState<TipoEventoData[]>(() => {
        // Ordenar por 'order' al inicializar
        return [...initialTiposEvento].sort((a, b) => (a.orden || 0) - (b.orden || 0));
    });
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

                // Ordenar paquetes dentro de cada tipo por 'order'
                Object.keys(paquetesPorTipo).forEach(tipoEventoId => {
                    paquetesPorTipo[tipoEventoId].sort((a, b) => {
                        const orderA = (a as { order?: number }).order ?? 0;
                        const orderB = (b as { order?: number }).order ?? 0;
                        return orderA - orderB;
                    });
                });

                setPaquetesData(paquetesPorTipo);

                // Expandir todos los tipos de evento por defecto solo en la carga inicial
                const allTipoEventoIds = new Set(initialTiposEvento.map(t => t.id));
                setTiposEventoExpandidos(allTipoEventoIds);

            } catch (error) {
                console.error("Error loading initial data:", error);
                toast.error("Error al cargar datos iniciales");
            } finally {
                setIsLoading(false);
                setIsInitialLoading(false);
            }
        };

        loadInitialData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Solo ejecutar una vez al montar el componente

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

        const activeIdValue = String(active.id);

        // Actualizar activeId para que los componentes sortable puedan detectar el drag
        setActiveId(activeIdValue);

        if (!over) {
            return;
        }

        const overId = String(over.id);

        // Si se está arrastrando un tipo de evento, contraer todos los tipos de evento
        const isDraggingTipoEvento = tiposEvento.some(tipo => tipo.id === activeIdValue);
        if (isDraggingTipoEvento) {
            console.log("📁 Arrastrando tipo de evento - contrayendo todos los tipos de evento");
            setTiposEventoExpandidos(new Set());
            setIsDraggingTipoEvento(true);
            return;
        }

        setIsDraggingTipoEvento(false);

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
                        // Recargar paquetes para obtener el nuevo order de los tipos de evento
                        const paquetesResult = await obtenerPaquetes(studioSlug);
                        if (paquetesResult.success && paquetesResult.data) {
                            const paquetesActualizados = paquetesResult.data;
                            const paquetesPorTipo: Record<string, PaqueteFromDB[]> = {};
                            paquetesActualizados.forEach(paquete => {
                                const tipoEventoId = paquete.event_type_id || 'sin-tipo';
                                if (!paquetesPorTipo[tipoEventoId]) {
                                    paquetesPorTipo[tipoEventoId] = [];
                                }
                                paquetesPorTipo[tipoEventoId].push(paquete);
                            });

                            // Ordenar paquetes dentro de cada tipo por 'order'
                            Object.keys(paquetesPorTipo).forEach(tipoEventoId => {
                                paquetesPorTipo[tipoEventoId].sort((a, b) => {
                                    const orderA = (a as { order?: number }).order ?? 0;
                                    const orderB = (b as { order?: number }).order ?? 0;
                                    return orderA - orderB;
                                });
                            });

                            setPaquetesData(paquetesPorTipo);
                            // Actualizar preview con datos completos del backend (incluye nuevo order de tipos)
                            onPaquetesChange(paquetesActualizados);
                        }
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

            if (!activePaquete || !activeTipoEventoId) {
                setActiveId(null);
                setIsDraggingTipoEvento(false);
                return;
            }

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

                // Actualización optimista inmediata (como en CatalogoTab)
                const newPaquetes = arrayMove(paquetes, activeIndex, overIndex);
                const paquetesConOrder = newPaquetes.map((paquete, index) => ({
                    ...paquete,
                    order: index
                }));

                // Actualizar estado local inmediatamente para feedback visual instantáneo
                setPaquetesData(prev => ({
                    ...prev,
                    [activeTipoEventoId]: paquetesConOrder
                }));

                // Actualizar el estado global de paquetes inmediatamente
                const paquetesGlobalesActualizados = initialPaquetes.map(paquete => {
                    const paqueteActualizado = paquetesConOrder.find(p => p.id === paquete.id);
                    return paqueteActualizado ? { ...paquete, order: paqueteActualizado.order } : paquete;
                });
                onPaquetesChange(paquetesGlobalesActualizados);

                // Actualizar en el backend en segundo plano
                try {
                    const result = await reorderPaquetes(studioSlug, paquetesConOrder.map(p => p.id));
                    if (result.success) {
                        // Recargar paquetes del backend para obtener datos actualizados (order, etc.)
                        const paquetesResult = await obtenerPaquetes(studioSlug);
                        if (paquetesResult.success && paquetesResult.data) {
                            // Actualizar estado local con datos del backend
                            const paquetesActualizados = paquetesResult.data;
                            const paquetesPorTipo: Record<string, PaqueteFromDB[]> = {};
                            paquetesActualizados.forEach(paquete => {
                                const tipoEventoId = paquete.event_type_id || 'sin-tipo';
                                if (!paquetesPorTipo[tipoEventoId]) {
                                    paquetesPorTipo[tipoEventoId] = [];
                                }
                                paquetesPorTipo[tipoEventoId].push(paquete);
                            });

                            // Ordenar paquetes dentro de cada tipo por 'order'
                            Object.keys(paquetesPorTipo).forEach(tipoEventoId => {
                                paquetesPorTipo[tipoEventoId].sort((a, b) => {
                                    const orderA = (a as { order?: number }).order ?? 0;
                                    const orderB = (b as { order?: number }).order ?? 0;
                                    return orderA - orderB;
                                });
                            });

                            setPaquetesData(paquetesPorTipo);
                            // Actualizar preview con datos completos del backend
                            onPaquetesChange(paquetesActualizados);
                        }
                        toast.success("Orden de paquetes actualizado");
                    } else {
                        toast.error(result.error || "Error al actualizar el orden");
                        // Revertir cambios si falla el backend
                        setPaquetesData(prev => ({
                            ...prev,
                            [activeTipoEventoId]: paquetes
                        }));
                        onPaquetesChange(initialPaquetes);
                    }
                } catch (error) {
                    console.error("Error actualizando orden:", error);
                    toast.error("Error al actualizar el orden");
                    // Revertir cambios si falla el backend
                    setPaquetesData(prev => ({
                        ...prev,
                        [activeTipoEventoId]: paquetes
                    }));
                    onPaquetesChange(initialPaquetes);
                }
            } else if (isMovingBetweenTypes) {
                // Movimiento entre diferentes tipos de evento
                const paquetesOrigen = paquetesData[activeTipoEventoId] || [];
                const paquetesDestino = paquetesData[overTipoEventoId] || [];

                const paqueteAMover = paquetesOrigen.find(paquete => paquete.id === activeId);
                if (!paqueteAMover) return;

                // Actualización optimista: actualizar estado local inmediatamente
                const paqueteActualizadoOptimistic = {
                    ...paqueteAMover,
                    event_type_id: overTipoEventoId,
                    order: paquetesDestino.length,
                    // Actualizar event_types si está disponible
                    event_types: tiposEvento.find(t => t.id === overTipoEventoId) ? {
                        id: overTipoEventoId,
                        name: tiposEvento.find(t => t.id === overTipoEventoId)!.nombre,
                        order: tiposEvento.find(t => t.id === overTipoEventoId)!.orden || 0
                    } : paqueteAMover.event_types
                };

                // Remover del tipo de evento origen
                const nuevosPaquetesOrigen = paquetesOrigen.filter(paquete => paquete.id !== activeId);
                // Agregar al tipo de evento destino inmediatamente
                const nuevosPaquetesDestino = [...paquetesDestino, paqueteActualizadoOptimistic];

                // Actualizar estado local inmediatamente para feedback visual instantáneo
                setPaquetesData(prev => ({
                    ...prev,
                    [activeTipoEventoId]: nuevosPaquetesOrigen,
                    [overTipoEventoId]: nuevosPaquetesDestino
                }));

                // Actualizar estado global inmediatamente
                const paquetesActualizadosOptimistic = initialPaquetes.map(paquete =>
                    paquete.id === activeId ? paqueteActualizadoOptimistic : paquete
                );
                onPaquetesChange(paquetesActualizadosOptimistic);

                // Actualizar en el backend en segundo plano
                try {
                    const { actualizarPaquete } = await import('@/lib/actions/studio/paquetes/paquetes.actions');
                    const result = await actualizarPaquete(studioSlug, activeId, {
                        event_type_id: overTipoEventoId,
                        order: paquetesDestino.length
                    });

                    if (result.success && result.data) {
                        // Recargar todos los paquetes para asegurar orden correcto
                        const paquetesResult = await obtenerPaquetes(studioSlug);
                        if (paquetesResult.success && paquetesResult.data) {
                            const paquetesActualizados = paquetesResult.data;
                            const paquetesPorTipo: Record<string, PaqueteFromDB[]> = {};
                            paquetesActualizados.forEach(paquete => {
                                const tipoEventoId = paquete.event_type_id || 'sin-tipo';
                                if (!paquetesPorTipo[tipoEventoId]) {
                                    paquetesPorTipo[tipoEventoId] = [];
                                }
                                paquetesPorTipo[tipoEventoId].push(paquete);
                            });

                            // Ordenar paquetes dentro de cada tipo por 'order'
                            Object.keys(paquetesPorTipo).forEach(tipoEventoId => {
                                paquetesPorTipo[tipoEventoId].sort((a, b) => {
                                    const orderA = (a as { order?: number }).order ?? 0;
                                    const orderB = (b as { order?: number }).order ?? 0;
                                    return orderA - orderB;
                                });
                            });

                            setPaquetesData(paquetesPorTipo);
                            // Actualizar preview con datos completos del backend
                            onPaquetesChange(paquetesActualizados);
                        }

                        toast.success(`Paquete movido a ${tiposEvento.find(t => t.id === overTipoEventoId)?.nombre}`);
                    } else {
                        // Revertir cambios si falla el backend
                        setPaquetesData(prev => ({
                            ...prev,
                            [activeTipoEventoId]: paquetesOrigen,
                            [overTipoEventoId]: paquetesDestino
                        }));
                        onPaquetesChange(initialPaquetes);
                        toast.error(result.error || "Error al mover el paquete");
                    }
                } catch (error) {
                    console.error("Error moviendo paquete:", error);
                    // Revertir cambios si falla el backend
                    setPaquetesData(prev => ({
                        ...prev,
                        [activeTipoEventoId]: paquetesOrigen,
                        [overTipoEventoId]: paquetesDestino
                    }));
                    onPaquetesChange(initialPaquetes);
                    toast.error("Error al mover el paquete");
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

    const handleCloseCreateModal = useCallback(() => {
        setIsCreateTipoEventoModalOpen(false);
    }, []);

    const handleTipoEventoCreated = useCallback((newTipoEvento: TipoEventoData) => {
        // Cerrar modal primero para evitar parpadeos
        setIsCreateTipoEventoModalOpen(false);

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

        toast.success("Tipo de evento creado correctamente");
    }, [tiposEvento, onTiposEventoChange]);

    // Sincronizar tiposEvento cuando cambian desde el padre, pero no si estamos en medio de una operación
    useEffect(() => {
        // Solo sincronizar si los IDs son diferentes (evitar sincronización innecesaria)
        const currentIds = tiposEvento.map(t => t.id).sort().join(',');
        const newIds = initialTiposEvento.map(t => t.id).sort().join(',');

        if (currentIds !== newIds && !isCreateTipoEventoModalOpen && !isEditTipoEventoModalOpen) {
            // Ordenar por 'order' antes de establecer
            const tiposOrdenados = [...initialTiposEvento].sort((a, b) => (a.orden || 0) - (b.orden || 0));
            setTiposEvento(tiposOrdenados);
        }
    }, [initialTiposEvento, isCreateTipoEventoModalOpen, isEditTipoEventoModalOpen, tiposEvento]);

    // Sincronizar paquetes cuando cambian desde el padre
    useEffect(() => {
        const paquetesPorTipo: Record<string, PaqueteFromDB[]> = {};
        initialPaquetes.forEach(paquete => {
            const tipoEventoId = paquete.event_type_id || 'sin-tipo';
            if (!paquetesPorTipo[tipoEventoId]) {
                paquetesPorTipo[tipoEventoId] = [];
            }
            paquetesPorTipo[tipoEventoId].push(paquete);
        });

        // Ordenar paquetes dentro de cada tipo por 'order'
        Object.keys(paquetesPorTipo).forEach(tipoEventoId => {
            paquetesPorTipo[tipoEventoId].sort((a, b) => {
                const orderA = (a as { order?: number }).order ?? 0;
                const orderB = (b as { order?: number }).order ?? 0;
                return orderA - orderB;
            });
        });

        setPaquetesData(paquetesPorTipo);
    }, [initialPaquetes]);

    const handleEditTipoEvento = (tipoEvento: TipoEventoData) => {
        setEditingTipoEvento(tipoEvento);
        setIsEditTipoEventoModalOpen(true);
    };

    const handleTipoEventoUpdated = (updatedTipoEvento: TipoEventoData) => {
        // Cerrar modal primero para evitar parpadeos
        setIsEditTipoEventoModalOpen(false);
        setEditingTipoEvento(null);

        // Actualizar el estado local del componente
        setTiposEvento(prev => prev.map(tipo =>
            tipo.id === updatedTipoEvento.id ? updatedTipoEvento : tipo
        ));

        // Actualizar el estado global (para sincronizar con otros componentes)
        const updatedTiposEvento = tiposEvento.map(tipo =>
            tipo.id === updatedTipoEvento.id ? updatedTipoEvento : tipo
        );
        onTiposEventoChange(updatedTiposEvento);

        toast.success("Tipo de evento actualizado correctamente");
    };

    const handleDeleteTipoEvento = (tipoEvento: TipoEventoData) => {
        setTipoEventoToDelete(tipoEvento);
        setIsDeleteTipoEventoModalOpen(true);
    };

    const handleConfirmDeleteTipoEvento = async () => {
        if (!tipoEventoToDelete) return;

        // Cerrar modal primero para evitar parpadeos
        setIsDeleteTipoEventoModalOpen(false);
        const tipoEventoIdToDelete = tipoEventoToDelete.id;

        try {
            setIsLoading(true);
            // Importar la función de eliminación existente
            const { eliminarTipoEvento } = await import('@/lib/actions/studio/negocio/tipos-evento.actions');

            const result = await eliminarTipoEvento(tipoEventoIdToDelete);

            if (result.success) {
                // Actualizar el estado local del componente
                setTiposEvento(prev => prev.filter(t => t.id !== tipoEventoIdToDelete));

                // Actualizar el estado global (para sincronizar con otros componentes)
                const updatedTiposEvento = tiposEvento.filter(t => t.id !== tipoEventoIdToDelete);
                onTiposEventoChange(updatedTiposEvento);

                // También eliminar los paquetes asociados del estado local
                setPaquetesData(prev => {
                    const newData = { ...prev };
                    delete newData[tipoEventoIdToDelete];
                    return newData;
                });

                // Actualizar paquetes globales (eliminar los que pertenecen a este tipo)
                const updatedPaquetes = initialPaquetes.filter(p => p.event_type_id !== tipoEventoIdToDelete);
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
            setTipoEventoToDelete(null);
        }
    };

    // Handlers para paquetes - usar navegación en lugar de modal
    const handleEditPaquete = (paquete: PaqueteFromDB) => {
        const routeId = paquete.id;
        
        // Cerrar overlays globales antes de navegar
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('close-overlays'));
        }
        
        // Activar flag de navegación
        if (setIsNavigating) {
            setIsNavigating(routeId);
        }

        // Usar startTransition para dar prioridad a la navegación
        startTransition(() => {
            router.push(`/${studioSlug}/studio/commercial/paquetes/${routeId}/editar`);
            
            // Limpiar flag después de un delay
            setTimeout(() => {
                if (setIsNavigating) {
                    setIsNavigating(null);
                }
            }, 1000);
        });
    };

    const handleCrearPaquete = (eventTypeId?: string) => {
        const url = eventTypeId
            ? `/${studioSlug}/studio/commercial/paquetes/nuevo?eventTypeId=${eventTypeId}`
            : `/${studioSlug}/studio/commercial/paquetes/nuevo`;
        const routeId = 'nuevo';
        
        // Cerrar overlays globales antes de navegar
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('close-overlays'));
        }
        
        // Activar flag de navegación
        if (setIsNavigating) {
            setIsNavigating(routeId);
        }

        // Usar startTransition para dar prioridad a la navegación
        startTransition(() => {
            router.push(url);
            
            // Limpiar flag después de un delay
            setTimeout(() => {
                if (setIsNavigating) {
                    setIsNavigating(null);
                }
            }, 1000);
        });
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
            const { duplicarPaquete } = await import('@/lib/actions/studio/paquetes/paquetes.actions');

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
            const { actualizarPaquete } = await import('@/lib/actions/studio/paquetes/paquetes.actions');

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

                // Actualizar estado global con paquete completo del backend
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
            const { actualizarPaquete } = await import('@/lib/actions/studio/paquetes/paquetes.actions');

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

                // Actualizar estado local con paquete completo del backend
                setPaquetesData(prev => ({
                    ...prev,
                    [paquete.event_type_id]: (prev[paquete.event_type_id] || []).map(p =>
                        p.id === paquete.id ? updatedPaquete : p
                    )
                }));

                // Actualizar estado global con paquete completo del backend
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
            const { eliminarPaquete } = await import('@/lib/actions/studio/paquetes/paquetes.actions');

            const result = await eliminarPaquete(studioSlug, paqueteIdToDelete);

            if (result.success) {
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
            }
        } catch (error) {
            console.error("Error eliminando paquete:", error);
            toast.error("Error al eliminar paquete");
        } finally {
            // SIEMPRE cerrar modal y resetear estado (éxito o error)
            setIsLoading(false);
            setIsDeletePaqueteModalOpen(false);
            setPaqueteToDelete(null);
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
                className={`border rounded-lg overflow-hidden transition-all duration-200 ${isOver && !isDraggingTipoEvento
                    ? 'border-purple-500 bg-purple-500/20 shadow-lg shadow-purple-500/20'
                    : 'border-zinc-700'
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
                className={`text-center py-4 min-h-[60px] flex items-center justify-center m-2 rounded-lg transition-all duration-200 ${isOver && !isDraggingTipoEvento
                    ? 'bg-purple-500/20 border-2 border-dashed border-purple-500'
                    : 'bg-transparent'
                    }`}
            >
                <div className="text-center">
                    <div className={`mb-2 transition-colors ${isOver && !isDraggingTipoEvento ? 'text-purple-400' : 'text-zinc-500'}`}>
                        <List className="h-5 w-5 mx-auto" />
                    </div>
                    <p className={`text-xs transition-colors ${isOver && !isDraggingTipoEvento
                        ? 'text-purple-300 font-medium'
                        : 'text-zinc-400'
                        }`}>
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
        const isEmpty = paquetesDelTipo.length === 0;
        const isCollapsedEmpty = !isTipoEventoExpandido && isEmpty;

        return (
            <div ref={setNodeRef} style={style} className="relative">
                <div className="border border-zinc-700 rounded-lg overflow-hidden">
                    <DroppableTipoEvento tipoEvento={tipoEvento}>
                        {/* Header del tipo de evento */}
                        <div className={`flex items-center justify-between hover:bg-zinc-800/50 transition-colors bg-zinc-800/30 ${isCollapsedEmpty ? 'p-2' : 'p-4'}`}>
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
                                    <EmptyTipoEventoDropZone tipoEvento={tipoEvento} />
                                ) : (
                                    <SortableContext
                                        items={paquetesDelTipo.map(p => p.id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        <div className="space-y-1">
                                            {paquetesDelTipo
                                                .sort((a, b) => {
                                                    // Usar order del schema (que viene del backend) o position como fallback
                                                    const orderA = (a as { order?: number }).order ?? (a.position || 0);
                                                    const orderB = (b as { order?: number }).order ?? (b.position || 0);
                                                    return orderA - orderB;
                                                })
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
            isOver,
        } = useSortable({
            id: paquete.id,
            disabled: isDuplicating,
        });

        // Determinar si otro elemento está siendo arrastrado sobre este
        const isOverItem = isOver && activeId && activeId !== paquete.id;

        // Determinar dirección del empuje (basado en si el elemento activo está arriba o abajo)
        const getDragDirection = () => {
            if (!activeId || !isOverItem) return null;

            // Buscar el índice del elemento activo en el mismo tipo de evento
            const tipoEventoId = paquete.event_type_id;
            const paquetesDelTipo = paquetesData[tipoEventoId] || [];

            // Ordenar por order para obtener índices correctos
            const paquetesOrdenados = [...paquetesDelTipo].sort((a, b) => {
                const orderA = (a as { order?: number }).order ?? 0;
                const orderB = (b as { order?: number }).order ?? 0;
                return orderA - orderB;
            });

            const activeIndex = paquetesOrdenados.findIndex(p => p.id === activeId);
            const currentIndex = paquetesOrdenados.findIndex(p => p.id === paquete.id);

            if (activeIndex === -1 || currentIndex === -1) return null;

            // Si el elemento activo está arriba del actual, empuja hacia abajo
            // Si está abajo, empuja hacia arriba
            return activeIndex < currentIndex ? 'down' : 'up';
        };

        const dragDirection = getDragDirection();

        const style = {
            transform: CSS.Transform.toString(transform),
            transition: isDragging ? 'none' : transition, // Sin transición mientras se arrastra para feedback inmediato
            opacity: isDragging ? 0.5 : 1,
        };

        const coverUrl = paquete.cover_url;
        const hasCover = !!coverUrl && typeof coverUrl === 'string' && coverUrl.trim() !== '';
        const videoRef = useRef<HTMLVideoElement>(null);

        // Obtener tamaño del archivo desde la DB (cover_storage_bytes)
        const fileSize = paquete.cover_storage_bytes ? Number(paquete.cover_storage_bytes) : null;

        // Función para formatear bytes
        const formatBytes = (bytes: number): string => {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
        };

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

        // Efecto para posicionar el video en el primer frame visible
        useEffect(() => {
            if (!isVideo || !videoRef.current || !coverUrl) return;

            const video = videoRef.current;
            let timeoutId: NodeJS.Timeout | null = null;
            let attempts = 0;
            const maxAttempts = 5;

            const setVideoFrame = () => {
                try {
                    // Asegurar que el video esté pausado
                    video.pause();

                    // Intentar establecer el frame a 1 segundo (más confiable que 2)
                    if (video.readyState >= 2) {
                        video.currentTime = 1;
                    } else if (video.readyState >= 1) {
                        // Si solo tiene metadatos, intentar igual
                        video.currentTime = 1;
                    }
                } catch (error) {
                    console.error('Error setting video currentTime:', error);
                    attempts++;
                    if (attempts < maxAttempts) {
                        // Reintentar después de un breve delay
                        timeoutId = setTimeout(setVideoFrame, 300);
                    }
                }
            };

            const handleLoadedMetadata = () => {
                video.pause();
                setVideoFrame();
            };

            const handleLoadedData = () => {
                video.pause();
                setVideoFrame();
            };

            const handleCanPlay = () => {
                video.pause();
                setVideoFrame();
            };

            const handleSeeked = () => {
                video.pause();
            };

            const handleLoadedMetadataError = () => {
                // Si falla, intentar con frame 0
                try {
                    video.pause();
                    video.currentTime = 0;
                } catch (e) {
                    console.error('Error setting video to frame 0:', e);
                }
            };

            // Limpiar eventos previos si existen
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('loadeddata', handleLoadedData);
            video.removeEventListener('canplay', handleCanPlay);
            video.removeEventListener('seeked', handleSeeked);
            video.removeEventListener('error', handleLoadedMetadataError);

            // Asegurar que el video esté pausado desde el inicio
            video.pause();

            // Si ya está cargado, establecer el frame directamente
            if (video.readyState >= 2) {
                video.pause();
                video.currentTime = 1;
            } else {
                video.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
                video.addEventListener('loadeddata', handleLoadedData, { once: true });
                video.addEventListener('canplay', handleCanPlay, { once: true });
                video.addEventListener('seeked', handleSeeked, { once: true });
                video.addEventListener('error', handleLoadedMetadataError, { once: true });

                // Fallback: intentar después de un delay
                timeoutId = setTimeout(() => {
                    if (video.readyState >= 2) {
                        video.pause();
                        setVideoFrame();
                    } else if (video.readyState >= 1) {
                        video.pause();
                        video.currentTime = 0;
                    }
                }, 800);
            }

            return () => {
                video.removeEventListener('loadedmetadata', handleLoadedMetadata);
                video.removeEventListener('loadeddata', handleLoadedData);
                video.removeEventListener('canplay', handleCanPlay);
                video.removeEventListener('seeked', handleSeeked);
                video.removeEventListener('error', handleLoadedMetadataError);
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
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
                className={`flex items-center justify-between py-3 px-2 pl-10 transition-all duration-200 ${paqueteIndex > 0 ? 'border-t border-zinc-700/30' : ''
                    } ${isDragging
                        ? 'bg-purple-500/10 border-l-2 border-purple-500 shadow-lg z-50'
                        : isOverItem
                            ? dragDirection === 'down'
                                ? 'border-t-2 border-purple-500 bg-purple-500/10 pt-4'
                                : 'border-b-2 border-purple-500 bg-purple-500/10 pb-4'
                            : 'hover:bg-zinc-700/20'
                    }`}
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
                                    onLoadedMetadata={(e) => {
                                        const video = e.currentTarget;
                                        video.pause();
                                        if (video.readyState >= 2) {
                                            video.currentTime = 1;
                                        }
                                    }}
                                    onLoadedData={(e) => {
                                        e.currentTarget.pause();
                                    }}
                                    onCanPlay={(e) => {
                                        e.currentTarget.pause();
                                    }}
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
                            <div className="flex items-center gap-1.5 flex-wrap">
                                {paquete.status === 'active' ? (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-600/20 text-emerald-400 border border-emerald-600/30">
                                        <CheckCircle className="h-2.5 w-2.5" />
                                        Publicado
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-zinc-600/20 text-zinc-400 border border-zinc-600/30">
                                        <XCircle className="h-2.5 w-2.5" />
                                        No publicado
                                    </span>
                                )}
                                {paquete.visibility === 'private' && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-red-600/20 text-red-400 border border-red-600/30">
                                        <Lock className="h-2.5 w-2.5" />
                                        Privado
                                    </span>
                                )}
                                {paquete.is_featured && (
                                    <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-amber-600/20 border border-amber-600/30">
                                        <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                                    </span>
                                )}
                                {Array.isArray(paquete.items_cortesia) && paquete.items_cortesia.length > 0 && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/10 text-purple-400/70 border border-purple-500/20">
                                        <Gift className="h-2.5 w-2.5" />
                                        {paquete.items_cortesia.length}
                                    </span>
                                )}
                                {typeof paquete.bono_especial === 'number' && paquete.bono_especial > 0 && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-400/70 border border-amber-500/20">
                                        <Tag className="h-2.5 w-2.5" />
                                        -${paquete.bono_especial.toLocaleString()}
                                    </span>
                                )}
                            </div>
                            <div className="text-sm text-white leading-tight mt-1">
                                {paquete.name}
                            </div>
                            <div className="text-xs text-zinc-400 leading-relaxed mt-1 line-clamp-2">
                                {paquete.description && paquete.description.trim()
                                    ? paquete.description
                                    : 'Pendiente de descripción'}
                            </div>
                            {paquete.base_hours && paquete.base_hours > 0 && (
                                <div className="flex items-center gap-1 mt-1">
                                    <Clock className="h-3 w-3 text-zinc-400" />
                                    <span className="text-xs text-zinc-400">
                                        {paquete.base_hours} {paquete.base_hours === 1 ? 'hora' : 'horas'} base
                                    </span>
                                </div>
                            )}
                            {fileSize !== null && (
                                <div className="flex items-center gap-1 mt-1">
                                    <HardDrive className="h-3 w-3 text-zinc-400" />
                                    <span className="text-xs text-zinc-400">
                                        {formatBytes(fileSize)}
                                    </span>
                                </div>
                            )}
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
                    <h3 className="text-lg font-semibold text-white">Crea y organiza tus paquetes de servicios</h3>
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
                {/* Header con botón de crear */}
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">Crea y organiza tus paquetes de servicios</h3>
                    <ZenButton
                        variant="outline"
                        size="sm"
                        onClick={handleCreateTipoEvento}
                        className="flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Nuevo tipo de evento
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
                    (() => {
                        const activePaquete = Object.values(paquetesData).flat().find(p => p.id === activeId);
                        const activeTipoEvento = tiposEvento.find(t => t.id === activeId);

                        if (activePaquete) {
                            // Overlay minimalista que mantiene consistencia visual sin cargar recursos pesados
                            // Usar solo texto y estructura básica para mejor performance
                            return (
                                <div className="flex items-center justify-between py-3 px-2 pl-10 bg-zinc-800/95 border-2 border-purple-500 rounded-lg shadow-xl shadow-purple-500/20 backdrop-blur-sm min-w-[300px] opacity-95">
                                    <div className="flex items-center gap-3 flex-1">
                                        <GripVertical className="h-4 w-4 text-purple-400 flex-shrink-0" />
                                        {/* Placeholder simple sin carga de imagen para mejor performance */}
                                        <div className="w-16 h-16 rounded-lg flex-shrink-0 bg-zinc-700 border border-zinc-600" />
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm text-zinc-300 leading-tight font-light truncate">
                                                {activePaquete.name}
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs text-zinc-400">
                                                    ${(activePaquete.precio || activePaquete.cost || 0).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        } else if (activeTipoEvento) {
                            // Overlay para tipo de evento
                            return (
                                <div className="bg-zinc-800/95 border-2 border-purple-500 rounded-lg p-4 shadow-xl shadow-purple-500/20 backdrop-blur-sm">
                                    <div className="flex items-center gap-3">
                                        <GripVertical className="h-4 w-4 text-purple-400" />
                                        <span className="font-medium text-white">
                                            {activeTipoEvento.nombre}
                                        </span>
                                    </div>
                                </div>
                            );
                        }
                        return null;
                    })()
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
            {isCreateTipoEventoModalOpen && (
                <TipoEventoQuickAddModal
                    key="create-tipo-evento-modal"
                    isOpen={isCreateTipoEventoModalOpen}
                    onClose={handleCloseCreateModal}
                    onSuccess={handleTipoEventoCreated}
                    studioSlug={studioSlug}
                />
            )}

            {/* Modal para editar tipo de evento */}
            {isEditTipoEventoModalOpen && editingTipoEvento && (
                <TipoEventoQuickAddModal
                    key={`edit-tipo-evento-modal-${editingTipoEvento.id}`}
                    isOpen={isEditTipoEventoModalOpen}
                    onClose={() => {
                        setIsEditTipoEventoModalOpen(false);
                        setEditingTipoEvento(null);
                    }}
                    onSuccess={handleTipoEventoUpdated}
                    studioSlug={studioSlug}
                    tipoEvento={editingTipoEvento}
                />
            )}

        </DndContext>
    );
}
