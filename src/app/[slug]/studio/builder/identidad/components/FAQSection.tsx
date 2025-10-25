'use client';

import React, { useState, useEffect } from 'react';
import { ZenButton, ZenInput, ZenTextarea } from '@/components/ui/zen';
import { ZenCard, ZenCardContent } from '@/components/ui/zen';
import { Plus, X, Save, Check, Edit, Trash2, GripVertical } from 'lucide-react';
import { IdentidadData, FAQItem } from '../types';
import {
    obtenerFAQ,
    crearFAQ,
    actualizarFAQ,
    eliminarFAQ,
    toggleFAQ,
    reordenarFAQ
} from '@/lib/actions/studio/builder/identidad';
import { toast } from 'sonner';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface FAQSectionProps {
    data: IdentidadData;
    onLocalUpdate: (data: Partial<IdentidadData>) => void;
    loading?: boolean;
    onSave: () => Promise<void>;
    isSaving: boolean;
    saveSuccess: boolean;
    studioSlug: string;
}

export function FAQSection({
    data,
    onLocalUpdate,
    loading = false,
    onSave,
    isSaving,
    saveSuccess,
    studioSlug
}: FAQSectionProps) {
    const [showFAQModal, setShowFAQModal] = useState(false);
    const [editingFAQ, setEditingFAQ] = useState<FAQItem | null>(null);
    const [nuevaPregunta, setNuevaPregunta] = useState('');
    const [nuevaRespuesta, setNuevaRespuesta] = useState('');
    const [faqItems, setFaqItems] = useState<FAQItem[]>([]);
    const [loadingFAQ, setLoadingFAQ] = useState(true);
    const [togglingItems, setTogglingItems] = useState<Set<string>>(new Set());

    // Sensores para drag and drop
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Manejar drag end para reordenar FAQ
    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (active.id !== over?.id) {
            const oldIndex = faqItems.findIndex(item => item.id === active.id);
            const newIndex = faqItems.findIndex(item => item.id === over?.id);

            const newOrder = arrayMove(faqItems, oldIndex, newIndex);
            setFaqItems(newOrder); // Optimistic update

            try {
                // Reordenar en backend
                const faqIds = newOrder.map(faq => faq.id);
                await reordenarFAQ(faqIds);
                toast.success("Orden de FAQ actualizado");

                // Actualizar datos locales
                onLocalUpdate({ faq: newOrder });
            } catch (error) {
                console.error('Error reordenando FAQ:', error);
                toast.error("Error al reordenar las FAQ");
                setFaqItems(faqItems); // Revert on error
            }
        }
    };

    // Cargar FAQ al montar el componente
    useEffect(() => {
        const cargarFAQ = async () => {
            try {
                setLoadingFAQ(true);
                const faq = await obtenerFAQ(studioSlug);
                setFaqItems(faq);
                onLocalUpdate({ faq });
            } catch (error) {
                console.error('Error cargando FAQ:', error);
                toast.error('Error al cargar las FAQ');
            } finally {
                setLoadingFAQ(false);
            }
        };

        cargarFAQ();
    }, [studioSlug, onLocalUpdate]);

    const handleAddFAQ = async () => {
        if (nuevaPregunta.trim() && nuevaRespuesta.trim()) {
            try {
                setLoadingFAQ(true);
                const newFAQ = await crearFAQ(studioSlug, {
                    pregunta: nuevaPregunta.trim(),
                    respuesta: nuevaRespuesta.trim()
                });

                const updatedFAQ = [...faqItems, newFAQ];
                setFaqItems(updatedFAQ);
                onLocalUpdate({ faq: updatedFAQ });

                setNuevaPregunta('');
                setNuevaRespuesta('');
                setShowFAQModal(false);
                toast.success('FAQ creada correctamente');
            } catch (error) {
                console.error('Error creando FAQ:', error);
                toast.error('Error al crear la FAQ');
            } finally {
                setLoadingFAQ(false);
            }
        }
    };

    const handleEditFAQ = (faq: FAQItem) => {
        setEditingFAQ(faq);
        setNuevaPregunta(faq.pregunta);
        setNuevaRespuesta(faq.respuesta);
        setShowFAQModal(true);
    };

    const handleUpdateFAQ = async () => {
        if (editingFAQ && nuevaPregunta.trim() && nuevaRespuesta.trim()) {
            try {
                setLoadingFAQ(true);
                const updatedFAQ = await actualizarFAQ(editingFAQ.id, {
                    pregunta: nuevaPregunta.trim(),
                    respuesta: nuevaRespuesta.trim()
                });

                const updatedFAQList = faqItems.map(faq =>
                    faq.id === editingFAQ.id ? updatedFAQ : faq
                );
                setFaqItems(updatedFAQList);
                onLocalUpdate({ faq: updatedFAQList });

                setEditingFAQ(null);
                setNuevaPregunta('');
                setNuevaRespuesta('');
                setShowFAQModal(false);
                toast.success('FAQ actualizada correctamente');
            } catch (error) {
                console.error('Error actualizando FAQ:', error);
                toast.error('Error al actualizar la FAQ');
            } finally {
                setLoadingFAQ(false);
            }
        }
    };

    const handleDeleteFAQ = async (faqId: string) => {
        try {
            setLoadingFAQ(true);
            await eliminarFAQ(faqId);
            const updatedFAQ = faqItems.filter(faq => faq.id !== faqId);
            setFaqItems(updatedFAQ);
            onLocalUpdate({ faq: updatedFAQ });
            toast.success('FAQ eliminada correctamente');
        } catch (error) {
            console.error('Error eliminando FAQ:', error);
            toast.error('Error al eliminar la FAQ');
        } finally {
            setLoadingFAQ(false);
        }
    };

    const handleToggleActive = async (faqId: string) => {
        try {
            const faq = faqItems.find(f => f.id === faqId);
            if (faq) {
                // Marcar item como cargando
                setTogglingItems(prev => new Set(prev).add(faqId));

                // Actualización optimista local
                const updatedFAQ = faqItems.map(f =>
                    f.id === faqId ? { ...f, is_active: !f.is_active } : f
                );
                setFaqItems(updatedFAQ);
                onLocalUpdate({ faq: updatedFAQ });

                // Llamada al servidor en segundo plano
                await toggleFAQ(faqId, !faq.is_active);
                toast.success(`FAQ ${!faq.is_active ? 'activada' : 'desactivada'} correctamente`);
            }
        } catch (error) {
            console.error('Error toggleando FAQ:', error);
            const faq = faqItems.find(f => f.id === faqId);
            // Revertir cambio en caso de error
            const revertedFAQ = faqItems.map(f =>
                f.id === faqId ? { ...f, is_active: faq?.is_active || false } : f
            );
            setFaqItems(revertedFAQ);
            onLocalUpdate({ faq: revertedFAQ });
            toast.error('Error al cambiar el estado de la FAQ');
        } finally {
            // Remover item de carga
            setTogglingItems(prev => {
                const newSet = new Set(prev);
                newSet.delete(faqId);
                return newSet;
            });
        }
    };

    const handleCancelModal = () => {
        setShowFAQModal(false);
        setEditingFAQ(null);
        setNuevaPregunta('');
        setNuevaRespuesta('');
    };

    // Componente sortable para cada FAQ item
    function SortableFAQItem({ faq, index }: { faq: FAQItem; index: number }) {
        const {
            attributes,
            listeners,
            setNodeRef,
            transform,
            transition,
            isDragging,
        } = useSortable({ id: faq.id });

        const style = {
            transform: CSS.Transform.toString(transform),
            transition,
            opacity: isDragging ? 0.5 : 1,
        };

        return (
            <div
                ref={setNodeRef}
                style={style}
                className={`${isDragging ? 'shadow-lg border-blue-500' : ''}`}
            >
                <ZenCard variant="default" padding="none">
                    <ZenCardContent className="p-4">
                        <div className="flex items-start gap-3">
                            <div className="flex items-center gap-2 text-zinc-400 text-sm">
                                <div
                                    {...attributes}
                                    {...listeners}
                                    className="cursor-grab hover:bg-zinc-800 p-1 rounded transition-colors"
                                    title="Arrastrar para reordenar"
                                >
                                    <GripVertical className="h-4 w-4" />
                                </div>
                                <span>{index + 1}</span>
                            </div>

                            <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2">
                                    <h4 className="font-medium text-white">
                                        {faq.pregunta}
                                    </h4>
                                    <span className={`px-2 py-1 rounded-full text-xs ${faq.is_active
                                        ? 'bg-green-500/20 text-green-400'
                                        : 'bg-zinc-500/20 text-zinc-400'
                                        }`}>
                                        {faq.is_active ? 'Activa' : 'Inactiva'}
                                    </span>
                                </div>
                                <p className="text-zinc-300 text-sm">
                                    {faq.respuesta}
                                </p>
                            </div>

                            <div className="flex items-center gap-1">
                                <ZenButton
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleEditFAQ(faq)}
                                    disabled={loading || loadingFAQ}
                                    className="p-2"
                                >
                                    <Edit className="h-4 w-4" />
                                </ZenButton>
                                <ZenButton
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleToggleActive(faq.id)}
                                    disabled={loading || loadingFAQ || togglingItems.has(faq.id)}
                                    loading={togglingItems.has(faq.id)}
                                    loadingText="..."
                                    className="p-2"
                                >
                                    <span className="text-xs">
                                        {faq.is_active ? 'Ocultar' : 'Mostrar'}
                                    </span>
                                </ZenButton>
                                <ZenButton
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeleteFAQ(faq.id)}
                                    disabled={loading || loadingFAQ}
                                    className="p-2 text-red-400 hover:text-red-300"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </ZenButton>
                            </div>
                        </div>
                    </ZenCardContent>
                </ZenCard>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header con botón agregar */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        Preguntas Frecuentes
                    </h3>
                    <p className="text-sm text-zinc-400 mt-1">
                        Agrega preguntas y respuestas que aparecerán en tu perfil público
                    </p>
                </div>
                <ZenButton
                    onClick={() => setShowFAQModal(true)}
                    disabled={loading}
                    size="sm"
                    variant="primary"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar FAQ
                </ZenButton>
            </div>

            {/* Lista de FAQ */}
            {loadingFAQ ? (
                <div className="space-y-3">
                    {[...Array(2)].map((_, i) => (
                        <div key={i} className="animate-pulse">
                            <div className="h-20 bg-zinc-700 rounded-lg"></div>
                        </div>
                    ))}
                </div>
            ) : faqItems.length > 0 ? (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={faqItems.map(item => item.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="space-y-3">
                            {faqItems.map((faq, index) => (
                                <SortableFAQItem
                                    key={faq.id}
                                    faq={faq}
                                    index={index}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            ) : (
                <ZenCard variant="default" padding="none">
                    <ZenCardContent className="p-8 text-center">
                        <div className="text-zinc-400 mb-4">
                            <Plus className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>No hay preguntas frecuentes agregadas</p>
                            <p className="text-sm">Agrega tu primera FAQ para comenzar</p>
                        </div>
                        <ZenButton
                            onClick={() => setShowFAQModal(true)}
                            disabled={loading}
                            variant="outline"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Agregar Primera FAQ
                        </ZenButton>
                    </ZenCardContent>
                </ZenCard>
            )}

            {/* Modal para agregar/editar FAQ */}
            {showFAQModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-semibold text-white mb-4">
                            {editingFAQ ? 'Editar FAQ' : 'Agregar Nueva FAQ'}
                        </h3>

                        <div className="space-y-4">
                            <ZenInput
                                label="Pregunta"
                                value={nuevaPregunta}
                                onChange={(e) => setNuevaPregunta(e.target.value)}
                                placeholder="¿Cuál es el tiempo de entrega de las fotos?"
                                required
                            />

                            <ZenTextarea
                                label="Respuesta"
                                value={nuevaRespuesta}
                                onChange={(e) => setNuevaRespuesta(e.target.value)}
                                placeholder="El tiempo de entrega es de 15-20 días hábiles..."
                                rows={4}
                                required
                            />
                        </div>

                        <div className="flex gap-3 mt-6">
                            <ZenButton
                                onClick={editingFAQ ? handleUpdateFAQ : handleAddFAQ}
                                disabled={!nuevaPregunta.trim() || !nuevaRespuesta.trim() || loadingFAQ}
                                loading={loadingFAQ}
                                loadingText={editingFAQ ? 'Actualizando...' : 'Agregando...'}
                                size="sm"
                            >
                                {editingFAQ ? 'Actualizar' : 'Agregar'}
                            </ZenButton>
                            <ZenButton
                                variant="outline"
                                onClick={handleCancelModal}
                                disabled={loadingFAQ}
                                size="sm"
                            >
                                Cancelar
                            </ZenButton>
                        </div>
                    </div>
                </div>
            )}

            {/* Información sobre drag and drop */}
            {faqItems.length > 1 && (
                <div className="mt-6 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-900/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <GripVertical className="h-4 w-4 text-purple-400" />
                        </div>
                        <div className="space-y-2">
                            <h4 className="text-white font-medium text-sm">Reordenar FAQ</h4>
                            <div className="text-xs text-zinc-400 space-y-1">
                                <p>• Arrastra las FAQ usando el icono <GripVertical className="inline h-3 w-3 mx-1" /> para reordenarlas</p>
                                <p>• El orden se guarda automáticamente</p>
                                <p>• Las FAQ aparecerán en tu perfil público en este orden</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Botón de Guardar */}
            {faqItems.length > 0 && (
                <div className="pt-4">
                    <div className="flex justify-end">
                        <ZenButton
                            onClick={onSave}
                            disabled={loading || isSaving}
                            loading={isSaving}
                            loadingText="Guardando..."
                            variant="primary"
                            size="sm"
                        >
                            {saveSuccess ? (
                                <>
                                    <Check className="h-4 w-4 mr-2" />
                                    Guardado
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Guardar Cambios
                                </>
                            )}
                        </ZenButton>
                    </div>
                </div>
            )}
        </div>
    );
}