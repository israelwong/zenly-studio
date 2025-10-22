'use client';

import React, { useState, useCallback } from 'react';
import { Plus, ArrowRight, Package, GripVertical } from 'lucide-react';
import { ZenCard, ZenButton, ZenBadge } from '@/components/ui/zen';
import { formatearMoneda } from '@/lib/actions/studio/builder/catalogo/calcular-precio';
import { actualizarOrdenTiposEvento } from '@/lib/actions/studio/negocio/tipos-evento.actions';
import { toast } from 'sonner';
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { TipoEventoData } from '@/lib/actions/schemas/tipos-evento-schemas';
import type { PaqueteFromDB } from '@/lib/actions/schemas/paquete-schemas';

interface TiposEventoListProps {
    studioSlug: string;
    tiposEvento: TipoEventoData[];
    paquetes: PaqueteFromDB[];
    onNavigateToTipoEvento: (tipoEvento: TipoEventoData) => void;
    onTiposEventoChange: (tiposEvento: TipoEventoData[]) => void;
    onPaquetesChange: (paquetes: PaqueteFromDB[]) => void;
}

// Componente para tipo de evento arrastrable
interface SortableTipoEventoCardProps {
    tipo: TipoEventoData & { paquetesCount: number; precioPromedio: number };
    onNavigateToTipoEvento: (tipoEvento: TipoEventoData) => void;
}

function SortableTipoEventoCard({ tipo, onNavigateToTipoEvento }: SortableTipoEventoCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: tipo.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={isDragging ? "opacity-50" : ""}
        >
            <ZenCard
                className="p-4 hover:bg-zinc-800/80 transition-colors group cursor-pointer"
                onClick={() => onNavigateToTipoEvento(tipo)}
            >
                <div className="flex items-start gap-3">
                    {/* Drag Handle */}
                    <button
                        {...attributes}
                        {...listeners}
                        className="p-1 text-zinc-500 hover:text-zinc-300 cursor-grab active:cursor-grabbing flex-shrink-0 mt-1"
                        title="Arrastra para reordenar"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <GripVertical className="w-4 h-4" />
                    </button>

                    {/* Contenido */}
                    <div className="flex-1">
                        <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-3">
                                {tipo.icono && (
                                    <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
                                        <span className="text-sm">{tipo.icono}</span>
                                    </div>
                                )}
                                <h3 className="font-semibold text-zinc-100 break-words">
                                    {tipo.nombre}
                                </h3>
                            </div>
                        </div>
                        {tipo.descripcion && (
                            <p className="text-xs text-zinc-400 break-words mb-2">
                                {tipo.descripcion}
                            </p>
                        )}
                        <div className="text-xs text-zinc-500 flex items-center gap-2">
                            <span>
                                {tipo.paquetesCount} paquete{tipo.paquetesCount !== 1 ? "s" : ""}
                            </span>
                            {tipo.precioPromedio > 0 && (
                                <>
                                    <span>•</span>
                                    <span className="text-emerald-400">
                                        {formatearMoneda(tipo.precioPromedio)} promedio
                                    </span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Arrow */}
                    <div className="flex items-center flex-shrink-0">
                        <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
                    </div>
                </div>
            </ZenCard>
        </div>
    );
}

export function TiposEventoList({
    studioSlug,
    tiposEvento,
    paquetes,
    onNavigateToTipoEvento,
    onTiposEventoChange,
    onPaquetesChange
}: TiposEventoListProps) {
    const [loading, setLoading] = useState(false);
    const [localTiposEvento, setLocalTiposEvento] = useState<TipoEventoData[]>(tiposEvento);

    // Configurar sensores para drag & drop
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Evita activación accidental
            },
        })
    );

    // Sincronizar estado local con props
    React.useEffect(() => {
        setLocalTiposEvento(tiposEvento);
    }, [tiposEvento]);

    // Manejar drag & drop
    const handleDragEnd = useCallback(
        async (event: DragEndEvent) => {
            const { active, over } = event;

            if (!over || !active) return;

            const activeId = String(active.id);
            const overId = String(over.id);

            if (activeId === overId) return;

            const activeIndex = localTiposEvento.findIndex(tipo => tipo.id === activeId);
            const overIndex = localTiposEvento.findIndex(tipo => tipo.id === overId);

            if (activeIndex === -1 || overIndex === -1) return;

            // Guardar estado original para revertir en caso de error
            const originalTipos = [...localTiposEvento];

            // Actualizar estado local inmediatamente (optimistic update)
            const newTipos = [...localTiposEvento];
            const [movedTipo] = newTipos.splice(activeIndex, 1);
            newTipos.splice(overIndex, 0, movedTipo);
            setLocalTiposEvento(newTipos);

            try {
                // Actualizar en el backend
                const result = await actualizarOrdenTiposEvento(studioSlug, {
                    tipos: newTipos.map((tipo, index) => ({
                        id: tipo.id,
                        orden: index
                    }))
                });

                if (result.success) {
                    toast.success('Orden actualizado exitosamente');
                    onTiposEventoChange(newTipos);
                } else {
                    toast.error(result.error || 'Error al actualizar el orden');
                    setLocalTiposEvento(originalTipos);
                }
            } catch (error) {
                console.error('Error updating order:', error);
                toast.error('Error al actualizar la posición');
                setLocalTiposEvento(originalTipos);
            }
        },
        [localTiposEvento, studioSlug, onTiposEventoChange]
    );

    // Calcular estadísticas por tipo de evento
    const tiposConStats = localTiposEvento.map(tipo => {
        const paquetesDelTipo = paquetes.filter(p => p.event_types?.name === tipo.nombre);
        const precioPromedio = paquetesDelTipo.length > 0
            ? paquetesDelTipo.reduce((sum, p) => sum + (p.precio || 0), 0) / paquetesDelTipo.length
            : 0;

        return {
            ...tipo,
            paquetesCount: paquetesDelTipo.length,
            precioPromedio
        };
    });

    const handleCrearTipoEvento = () => {
        // TODO: Implementar modal de creación de tipo de evento
        console.log('Crear nuevo tipo de evento');
    };


    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-zinc-100">Tipos de Evento</h2>
                    <p className="text-sm text-zinc-400 mt-1">
                        Organiza tus paquetes según el tipo de evento (arrastra para reordenar)
                    </p>
                </div>
                <ZenButton
                    onClick={handleCrearTipoEvento}
                    variant="primary"
                    className="gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Nuevo Tipo
                </ZenButton>
            </div>

            {/* Lista de tipos de evento con drag & drop */}
            {localTiposEvento.length === 0 ? (
                <ZenCard className="p-12 text-center">
                    <Package className="w-12 h-12 text-zinc-500 mx-auto mb-4" />
                    <p className="text-zinc-400 mb-4">Sin tipos de evento configurados</p>
                    <ZenButton onClick={handleCrearTipoEvento} variant="primary">
                        <Plus className="w-4 h-4" />
                        Crear primer tipo de evento
                    </ZenButton>
                </ZenCard>
            ) : (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={localTiposEvento.map(tipo => tipo.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="space-y-2">
                            {tiposConStats.map((tipo) => (
                                <SortableTipoEventoCard
                                    key={tipo.id}
                                    tipo={tipo}
                                    onNavigateToTipoEvento={onNavigateToTipoEvento}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            )}
        </div>
    );
}
