'use client';

import React, { useState, useCallback } from 'react';
import { Plus, ArrowRight, Package, GripVertical, Edit2, MoreHorizontal } from 'lucide-react';
import { ZenCard, ZenButton, ZenDropdownMenu, ZenDropdownMenuContent, ZenDropdownMenuItem, ZenDropdownMenuTrigger } from '@/components/ui/zen';
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
import { TipoEventoForm } from '@/app/[slug]/studio/configuracion/operacion/tipos/components/TipoEventoFormSimple';
import type { TipoEventoData } from '@/lib/actions/schemas/tipos-evento-schemas';

interface PaqueteData {
    id: string;
    event_type_id: string;
}

interface TiposEventoListProps {
    studioSlug: string;
    tiposEvento: TipoEventoData[];
    paquetes: PaqueteData[];
    onNavigateToTipoEvento: (tipoEvento: TipoEventoData) => void;
    onTiposEventoChange: (tiposEvento: TipoEventoData[]) => void;
}

// Componente para tipo de evento arrastrable
interface SortableTipoEventoCardProps {
    tipo: TipoEventoData & { paquetesCount: number; precioPromedio: number };
    onNavigateToTipoEvento: (tipoEvento: TipoEventoData) => void;
    onEditTipoEvento: (tipoEvento: TipoEventoData) => void;
}

function SortableTipoEventoCard({ tipo, onNavigateToTipoEvento, onEditTipoEvento }: SortableTipoEventoCardProps) {
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

                    {/* Actions */}
                    <div className="flex items-center flex-shrink-0 gap-2">
                        <ZenDropdownMenu>
                            <ZenDropdownMenuTrigger asChild>
                                <ZenButton
                                    variant="ghost"
                                    size="sm"
                                    className="w-8 h-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <MoreHorizontal className="w-4 h-4" />
                                </ZenButton>
                            </ZenDropdownMenuTrigger>
                            <ZenDropdownMenuContent align="end" className="w-48">
                                <ZenDropdownMenuItem onClick={() => onEditTipoEvento(tipo)}>
                                    <Edit2 className="h-4 w-4 mr-2" />
                                    Editar tipo de evento
                                </ZenDropdownMenuItem>
                            </ZenDropdownMenuContent>
                        </ZenDropdownMenu>

                        <div className="flex items-center">
                            <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
                        </div>
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
    onTiposEventoChange
}: TiposEventoListProps) {
    const [localTiposEvento, setLocalTiposEvento] = useState<TipoEventoData[]>(tiposEvento);
    const [isReordering, setIsReordering] = useState(false);

    // Estados para modal de edición
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingTipoEvento, setEditingTipoEvento] = useState<TipoEventoData | null>(null);

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
                setIsReordering(true);

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
            } finally {
                setIsReordering(false);
            }
        },
        [localTiposEvento, studioSlug, onTiposEventoChange]
    );

    // Funciones para manejar la edición
    const handleEditTipoEvento = (tipoEvento: TipoEventoData) => {
        setEditingTipoEvento(tipoEvento);
        setShowEditModal(true);
    };

    const handleTipoEventoUpdated = (updatedTipoEvento: TipoEventoData) => {
        const updatedTipos = localTiposEvento.map(tipo =>
            tipo.id === updatedTipoEvento.id ? updatedTipoEvento : tipo
        );
        setLocalTiposEvento(updatedTipos);
        onTiposEventoChange(updatedTipos);
        setShowEditModal(false);
        setEditingTipoEvento(null);
        toast.success("Tipo de evento actualizado correctamente");
    };

    const handleCancelEdit = () => {
        setShowEditModal(false);
        setEditingTipoEvento(null);
    };

    // Calcular estadísticas reales de paquetes por tipo de evento
    const tiposConStats = localTiposEvento.map(tipo => {
        const paquetesDelTipo = paquetes.filter(paquete => paquete.event_type_id === tipo.id);
        const paquetesCount = paquetesDelTipo.length;

        return {
            ...tipo,
            paquetesCount,
            precioPromedio: 0 // No relevante
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
                <div className="pr-4">
                    <h2 className="text-2xl font-bold text-zinc-100">Tipos de Evento</h2>
                    <div className="text-sm text-zinc-400 mt-1">
                        {isReordering ? (
                            <div className="flex items-center space-x-2">
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
                                <span>Actualizando orden...</span>
                            </div>
                        ) : (
                            "Organiza por tipo de evento (arrastra para reordenar)"
                        )}
                    </div>
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
                                    onEditTipoEvento={handleEditTipoEvento}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            )}

            {/* Modal de edición de tipo de evento */}
            <TipoEventoForm
                isOpen={showEditModal}
                onClose={handleCancelEdit}
                onSuccess={handleTipoEventoUpdated}
                studioSlug={studioSlug}
                tipoEvento={editingTipoEvento}
            />
        </div>
    );
}
