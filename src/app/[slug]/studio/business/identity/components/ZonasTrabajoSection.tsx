'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ZenButton, ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle } from '@/components/ui/zen';
import { MapPin, Plus, GripVertical, Edit3, Trash2 } from 'lucide-react';
import { ZonaTrabajo } from '../../types';
import { ZonaTrabajoModal } from './ZonaTrabajoModal';
import { crearZonaTrabajo, actualizarZonaTrabajo, eliminarZonaTrabajo, reordenarZonasTrabajo } from '@/lib/actions/studio/profile/zonas-trabajo';
import { toast } from 'sonner';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';

interface ZonasTrabajoSectionProps {
    studioSlug: string;
    zonasCobertura?: ZonaTrabajo[]; // Data from parent (builder-profile)
    onLocalUpdate?: (data: Partial<{ zonas_trabajo: ZonaTrabajo[] }>) => void;
    loading?: boolean;
    onDataChange?: () => Promise<void>;
}

interface SortableZonaItemProps {
    zona: ZonaTrabajo;
    onEdit: (zona: ZonaTrabajo) => void;
    onDelete: (zonaId: string) => void;
}

function SortableZonaItem({ zona, onEdit, onDelete }: SortableZonaItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: zona.id! });

    const style = {
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`py-2 border-b border-zinc-800 last:border-b-0 ${isDragging ? 'shadow-lg' : ''}`}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-1 cursor-grab hover:bg-zinc-700 rounded transition-colors" {...attributes} {...listeners}>
                        <GripVertical className="h-4 w-4 text-zinc-500" />
                    </div>
                    <span className="text-zinc-300">{zona.nombre}</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onEdit(zona)}
                        className="p-2 text-zinc-400 hover:text-blue-400 transition-colors"
                        title="Editar"
                    >
                        <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => onDelete(zona.id!)}
                        className="p-2 text-zinc-400 hover:text-red-400 transition-colors"
                        title="Eliminar"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}

export function ZonasTrabajoSection({ studioSlug, zonasCobertura = [], onLocalUpdate, loading = false }: ZonasTrabajoSectionProps) {
    const [zonasTrabajo, setZonasTrabajo] = useState<ZonaTrabajo[]>(zonasCobertura || []);
    const [loadingZonas, setLoadingZonas] = useState(false);
    const [isReorderingZonas, setIsReorderingZonas] = useState(false);
    const [zonaModal, setZonaModal] = useState<{ open: boolean; zona?: ZonaTrabajo }>({ open: false });

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Sync with parent data
    useEffect(() => {
        if (zonasCobertura) {
            setZonasTrabajo(zonasCobertura);
        }
    }, [zonasCobertura]);

    const handleZonaSave = async (zona: ZonaTrabajo) => {
        try {
            if (zona.id) {
                // Actualizar zona existente
                const result = await actualizarZonaTrabajo(studioSlug, zona.id, { nombre: zona.nombre });
                if (result.success && result.zona) {
                    const updated = zonasTrabajo.map(z => z.id === zona.id ? result.zona : z);
                    setZonasTrabajo(updated);
                    onLocalUpdate?.({ zonas_trabajo: updated });
                    toast.success('Zona actualizada exitosamente');
                    await onDataChange?.();
                } else {
                    toast.error(result.error || 'Error al actualizar la zona');
                    return;
                }
            } else {
                // Crear nueva zona
                const result = await crearZonaTrabajo(studioSlug, { nombre: zona.nombre });
                if (result.success && result.zona) {
                    const updated = [...zonasTrabajo, result.zona];
                    setZonasTrabajo(updated);
                    onLocalUpdate?.({ zonas_trabajo: updated });
                    toast.success('Zona creada exitosamente');
                } else {
                    toast.error(result.error || 'Error al crear la zona');
                    return;
                }
            }
            setZonaModal({ open: false });
        } catch (error) {
            console.error('Error saving zona:', error);
            toast.error('Error al guardar zona');
        }
    };

    const handleZonaDelete = async (zonaId: string) => {
        try {
            const result = await eliminarZonaTrabajo(studioSlug, zonaId);
            if (result.success) {
                const updated = zonasTrabajo.filter(z => z.id !== zonaId);
                setZonasTrabajo(updated);
                onLocalUpdate({ zonas_trabajo: updated });
                toast.success('Zona eliminada exitosamente');
                await onDataChange?.();
            } else {
                toast.error(result.error || 'Error al eliminar la zona');
            }
        } catch (error) {
            console.error('Error deleting zona:', error);
            toast.error('Error al eliminar zona');
        }
    };

    const handleZonasDragEnd = (event: { active: { id: string | number }; over: { id: string | number } | null }) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = zonasTrabajo.findIndex(z => z.id === active.id.toString());
        const newIndex = zonasTrabajo.findIndex(z => z.id === over.id.toString());
        const reorderedZonas = arrayMove(zonasTrabajo, oldIndex, newIndex);

        // Actualizar estado local primero
        setZonasTrabajo(reorderedZonas);
        onLocalUpdate({ zonas_trabajo: reorderedZonas });

        // Actualizar en el servidor de forma asíncrona
        const updateServerOrder = async () => {
            setIsReorderingZonas(true);
            try {
                const zonasOrdenadas = reorderedZonas.map((zona, index) => ({
                    id: zona.id!,
                    orden: index
                }));

                const result = await reordenarZonasTrabajo(studioSlug, zonasOrdenadas);
                if (result.success) {
                    toast.success('Orden actualizado exitosamente');
                    await onDataChange?.();
                } else {
                    toast.error(result.error || 'Error al actualizar orden');
                    // Revertir cambios locales si falla
                    setZonasTrabajo(zonasTrabajo);
                    onLocalUpdate({ zonas_trabajo: zonasTrabajo });
                }
            } catch (error) {
                console.error('Error reordering zonas:', error);
                toast.error('Error al actualizar orden');
                // Revertir cambios locales si falla
                setZonasTrabajo(zonasTrabajo);
                onLocalUpdate({ zonas_trabajo: zonasTrabajo });
            } finally {
                setIsReorderingZonas(false);
            }
        };

        updateServerOrder();
    };

    return (
        <ZenCard variant="default" padding="none">
            <ZenCardHeader className="border-b border-zinc-800">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-purple-400" />
                        <ZenCardTitle>Zonas de Trabajo</ZenCardTitle>
                    </div>
                    <ZenButton
                        variant="outline"
                        size="sm"
                        onClick={() => setZonaModal({ open: true })}
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar Zona
                    </ZenButton>
                </div>
            </ZenCardHeader>
            <ZenCardContent className="p-6">
                {loading ? (
                    <div className="space-y-2">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-b-0 animate-pulse">
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 bg-zinc-700/50 rounded"></div>
                                    <div className="h-5 w-32 bg-zinc-700/50 rounded"></div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-zinc-700/50 rounded"></div>
                                    <div className="w-8 h-8 bg-zinc-700/50 rounded"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : loadingZonas ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="h-6 w-6 animate-spin border-2 border-purple-500 border-t-transparent rounded-full"></div>
                        <span className="ml-2 text-zinc-400">Cargando zonas...</span>
                    </div>
                ) : zonasTrabajo.length === 0 ? (
                    <div className="text-center py-8 text-zinc-500">
                        <MapPin className="h-12 w-12 mx-auto mb-4 text-zinc-600" />
                        <p>No hay zonas de trabajo</p>
                        <p className="text-sm">Agrega las zonas donde trabajas</p>
                    </div>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleZonasDragEnd}
                    >
                        <SortableContext
                            items={zonasTrabajo.map(z => z.id!)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="space-y-2">
                                {zonasTrabajo.map((zona) => (
                                    <SortableZonaItem
                                        key={zona.id}
                                        zona={zona}
                                        onEdit={(zona) => setZonaModal({ open: true, zona })}
                                        onDelete={handleZonaDelete}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                )}

                {/* Indicador de reordenamiento */}
                {isReorderingZonas && (
                    <div className="flex items-center justify-center py-2">
                        <div className="h-4 w-4 animate-spin mr-2 border-2 border-purple-500 border-t-transparent rounded-full"></div>
                        <span className="text-sm text-zinc-400">Actualizando orden...</span>
                    </div>
                )}
            </ZenCardContent>

            {/* Modal */}
            <ZonaTrabajoModal
                isOpen={zonaModal.open}
                onClose={() => setZonaModal({ open: false })}
                onSave={handleZonaSave}
                zona={zonaModal.zona}
            />
        </ZenCard>
    );
}
