'use client';

import React, { useState, useEffect } from 'react';
import { ZenButton, ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle } from '@/components/ui/zen';
import { Phone, Plus, GripVertical, Edit3, Trash2 } from 'lucide-react';
import { Telefono } from '../../types';
import { TelefonoModal } from './TelefonoModal';
import { toast } from 'sonner';
import { crearTelefono, actualizarTelefono, eliminarTelefono } from '@/lib/actions/studio/builder/contacto';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TelefonosSectionProps {
    telefonos: Telefono[];
    onLocalUpdate: (data: Partial<{ telefonos: Telefono[] }>) => void;
    studioSlug: string;
    loading?: boolean;
}

interface SortableTelefonoItemProps {
    telefono: Telefono;
    onToggle: (id: string, is_active: boolean) => void;
    onEdit: (telefono: Telefono) => void;
    onDelete: (id: string) => void;
}

function SortableTelefonoItem({ telefono, onToggle, onEdit, onDelete }: SortableTelefonoItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: telefono.id! });

    const style = {
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`py-2 border-b border-zinc-800 last:border-b-0 ${isDragging ? 'shadow-lg' : ''} ${!telefono.is_active ? 'opacity-50' : ''}`}
        >
            {/* Fila 1: Icono drag | Etiqueta + Teléfono | Switch | Iconos */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                    <div className="p-1 cursor-grab hover:bg-zinc-700 rounded transition-colors" {...attributes} {...listeners}>
                        <GripVertical className="h-4 w-4 text-zinc-500" />
                    </div>
                    <div className="flex flex-col">
                        {telefono.etiqueta && (
                            <span className="text-sm text-zinc-400 font-medium">
                                {telefono.etiqueta}
                            </span>
                        )}
                        <p className="text-white font-medium text-lg">{telefono.numero}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={telefono.is_active ?? true}
                            onChange={(e) => onToggle(telefono.id!, e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-zinc-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600"></div>
                    </label>

                    <button
                        onClick={() => onEdit(telefono)}
                        className="p-2 text-zinc-400 hover:text-blue-400 transition-colors"
                        title="Editar"
                    >
                        <Edit3 className="h-4 w-4" />
                    </button>

                    <button
                        onClick={() => onDelete(telefono.id!)}
                        className="p-2 text-zinc-400 hover:text-red-400 transition-colors"
                        title="Eliminar"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Fila 2: Etiqueta | Badges de WhatsApp y Llamadas */}
            <div className="flex items-center gap-2 mt-2">
                {telefono.tipo === 'llamadas' && (
                    <span className="text-xs bg-blue-900/30 text-blue-400 px-2 py-1 rounded">
                        Llamadas
                    </span>
                )}
                {telefono.tipo === 'whatsapp' && (
                    <span className="text-xs bg-green-900/30 text-green-400 px-2 py-1 rounded">
                        WhatsApp
                    </span>
                )}
                {telefono.tipo === 'ambos' && (
                    <>
                        <span className="text-xs bg-blue-900/30 text-blue-400 px-2 py-1 rounded">
                            Llamadas
                        </span>
                        <span className="text-xs bg-green-900/30 text-green-400 px-2 py-1 rounded">
                            WhatsApp
                        </span>
                    </>
                )}
            </div>
        </div>
    );
}

export function TelefonosSection({ telefonos: initialTelefonos, onLocalUpdate, studioSlug, loading = false }: TelefonosSectionProps) {
    const [telefonos, setTelefonos] = useState<Telefono[]>(initialTelefonos);
    const [telefonoModal, setTelefonoModal] = useState<{ open: boolean; telefono?: Telefono }>({ open: false });
    const [isReorderingTelefonos, setIsReorderingTelefonos] = useState(false);

    // Sync with parent data
    useEffect(() => {
        setTelefonos(initialTelefonos);
    }, [initialTelefonos]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleTelefonoSave = async (telefono: Telefono) => {
        try {
            if (telefono.id) {
                // Actualizar teléfono existente
                await actualizarTelefono(telefono.id, {
                    numero: telefono.numero,
                    tipo: telefono.tipo === 'whatsapp' ? 'WHATSAPP' :
                        telefono.tipo === 'llamadas' ? 'LLAMADAS' : 'AMBOS',
                    etiqueta: telefono.etiqueta,
                    is_active: telefono.is_active
                });
                const updated = telefonos.map(t => t.id === telefono.id ? telefono : t);
                setTelefonos(updated);
                onLocalUpdate({ telefonos: updated });
                toast.success('Teléfono actualizado exitosamente');
            } else {
                // Crear nuevo teléfono
                const nuevoTelefono = await crearTelefono(studioSlug, {
                    numero: telefono.numero,
                    tipo: telefono.tipo === 'whatsapp' ? 'WHATSAPP' :
                        telefono.tipo === 'llamadas' ? 'LLAMADAS' : 'AMBOS',
                    etiqueta: telefono.etiqueta,
                    is_active: telefono.is_active ?? true
                });
                // Usar el teléfono completo devuelto por la base de datos
                const updated = [...telefonos, {
                    id: nuevoTelefono.id,
                    numero: nuevoTelefono.number,
                    tipo: (nuevoTelefono.type === 'WHATSAPP' ? 'whatsapp' :
                        nuevoTelefono.type === 'LLAMADAS' ? 'llamadas' : 'ambos') as 'llamadas' | 'whatsapp' | 'ambos',
                    etiqueta: nuevoTelefono.label || undefined,
                    is_active: nuevoTelefono.is_active
                }];
                setTelefonos(updated);
                onLocalUpdate({ telefonos: updated }); // cspell:ignore telefonos
                toast.success('Teléfono agregado exitosamente');
            }
        } catch (error) {
            console.error('Error saving telefono:', error);
            toast.error('Error al guardar teléfono');
        } finally {
            setTelefonoModal({ open: false });
        }
    };

    const handleTelefonoDelete = async (id: string) => {
        try {
            await eliminarTelefono(id);
            const updated = telefonos.filter(t => t.id !== id);
            setTelefonos(updated);
            onLocalUpdate({ telefonos: updated });
            toast.success('Teléfono eliminado exitosamente');
        } catch (error) {
            console.error('Error deleting telefono:', error);
            toast.error('Error al eliminar teléfono');
        }
    };

    const handleTelefonoToggle = async (id: string, is_active: boolean) => {
        try {
            const telefono = telefonos.find(t => t.id === id);
            if (telefono) {
                await actualizarTelefono(id, {
                    numero: telefono.numero,
                    tipo: telefono.tipo === 'whatsapp' ? 'WHATSAPP' :
                        telefono.tipo === 'llamadas' ? 'LLAMADAS' : 'AMBOS',
                    etiqueta: telefono.etiqueta,
                    is_active
                });
                const updated = telefonos.map(t => t.id === id ? { ...t, is_active } : t);
                setTelefonos(updated);
                onLocalUpdate({ telefonos: updated });
                toast.success(`Teléfono ${is_active ? 'activado' : 'desactivado'} exitosamente`);
            }
        } catch (error) {
            console.error('Error toggling telefono:', error);
            toast.error('Error al cambiar estado del teléfono');
        }
    };

    const handleTelefonosDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        setIsReorderingTelefonos(true);
        try {
            const oldIndex = telefonos.findIndex(t => t.id === active.id);
            const newIndex = telefonos.findIndex(t => t.id === over.id);
            const reorderedTelefonos = arrayMove(telefonos, oldIndex, newIndex);

            setTelefonos(reorderedTelefonos);
            onLocalUpdate({ telefonos: reorderedTelefonos });
            toast.success('Orden actualizado exitosamente');
        } catch (error) {
            console.error('Error reordering telefonos:', error);
            toast.error('Error al actualizar orden');
        } finally {
            setIsReorderingTelefonos(false);
        }
    };

    return (
        <>
            <ZenCard variant="default" padding="none">
                <ZenCardHeader className="border-b border-zinc-800">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Phone className="h-5 w-5 text-green-400" />
                            <ZenCardTitle>Teléfonos</ZenCardTitle>
                        </div>
                        <ZenButton
                            variant="outline"
                            size="sm"
                            onClick={() => setTelefonoModal({ open: true })}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Agregar Teléfono
                        </ZenButton>
                    </div>
                </ZenCardHeader>
                <ZenCardContent className="p-6">
                    {loading ? (
                        <div className="space-y-4">
                            {/* Leyenda informativa skeleton */}
                            <div className="mb-6 p-4 bg-blue-900/20 border border-blue-800/30 rounded-lg animate-pulse">
                                <div className="h-16 bg-zinc-700/30 rounded"></div>
                            </div>
                            {/* Items skeleton */}
                            <div className="space-y-3">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="py-3 border-b border-zinc-800 animate-pulse">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3 flex-1">
                                                <div className="w-6 h-6 bg-zinc-700/50 rounded"></div>
                                                <div className="flex flex-col gap-2 flex-1">
                                                    <div className="h-4 w-24 bg-zinc-700/50 rounded"></div>
                                                    <div className="h-6 w-40 bg-zinc-700/50 rounded"></div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-9 h-5 bg-zinc-700/50 rounded-full"></div>
                                                <div className="w-8 h-8 bg-zinc-700/50 rounded"></div>
                                                <div className="w-8 h-8 bg-zinc-700/50 rounded"></div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 mt-2">
                                            <div className="h-5 w-16 bg-zinc-700/50 rounded"></div>
                                            <div className="h-5 w-20 bg-zinc-700/50 rounded"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Leyenda informativa */}
                            <div className="mb-6 p-4 bg-blue-900/20 border border-blue-800/30 rounded-lg">
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5">
                                        <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm text-blue-200 font-medium mb-1">
                                            Número principal en perfil público
                                        </p>
                                        <p className="text-xs text-blue-300/80 leading-relaxed">
                                            El <strong>primer teléfono activo</strong> aparecerá como botón principal para llamadas y/o WhatsApp en tu perfil público. Arrastra para reordenar la prioridad.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {telefonos.length === 0 ? (
                                <div className="text-center py-8 text-zinc-500">
                                    <Phone className="h-12 w-12 mx-auto mb-4 text-zinc-600" />
                                    <p>No hay teléfonos agregados</p>
                                    <p className="text-sm">Agrega al menos un número de contacto</p>
                                </div>
                            ) : (
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragEnd={handleTelefonosDragEnd}
                                >
                                    <SortableContext
                                        items={telefonos.map(t => t.id!)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        <div className="space-y-3">
                                            {telefonos.map((telefono) => (
                                                <SortableTelefonoItem
                                                    key={telefono.id}
                                                    telefono={telefono}
                                                    onToggle={handleTelefonoToggle}
                                                    onEdit={(telefono) => setTelefonoModal({ open: true, telefono })}
                                                    onDelete={handleTelefonoDelete}
                                                />
                                            ))}
                                        </div>
                                    </SortableContext>
                                </DndContext>
                            )}

                            {/* Indicador de reordenamiento */}
                            {isReorderingTelefonos && (
                                <div className="flex items-center justify-center py-2">
                                    <div className="h-4 w-4 animate-spin mr-2 border-2 border-green-500 border-t-transparent rounded-full"></div>
                                    <span className="text-sm text-zinc-400">Actualizando orden...</span>
                                </div>
                            )}
                        </>
                    )}
                </ZenCardContent>
            </ZenCard>

            {/* Modal */}
            <TelefonoModal
                isOpen={telefonoModal.open}
                onClose={() => setTelefonoModal({ open: false })}
                onSave={handleTelefonoSave}
                telefono={telefonoModal.telefono}
            />
        </>
    );
}
