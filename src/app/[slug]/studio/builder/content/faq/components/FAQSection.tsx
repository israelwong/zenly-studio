'use client';

import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { ZenButton, ZenInput, ZenTextarea } from '@/components/ui/zen';
import { ZenCard, ZenCardContent } from '@/components/ui/zen';
import { Edit, Trash2, GripVertical, HelpCircle } from 'lucide-react';
import { IdentidadData, FAQItem } from '../../../profile/identidad/types';
import {
    obtenerFAQ,
    crearFAQ,
    actualizarFAQ,
    eliminarFAQ,
    toggleFAQ,
    reordenarFAQ
} from '@/lib/actions/studio/builder/profile/identidad';
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
    onLocalUpdate: (data: Partial<IdentidadData>) => void;
    loading?: boolean;
    studioSlug: string;
}

export interface FAQSectionRef {
    openModal: () => void;
}

export const FAQSection = forwardRef<FAQSectionRef, FAQSectionProps>(({
    onLocalUpdate,
    loading = false,
    studioSlug
}, ref) => {
    const [showFAQModal, setShowFAQModal] = useState(false);
    const [editingFAQ, setEditingFAQ] = useState<FAQItem | null>(null);
    const [nuevaPregunta, setNuevaPregunta] = useState('');
    const [nuevaRespuesta, setNuevaRespuesta] = useState('');
    const [faqItems, setFaqItems] = useState<FAQItem[]>([]);
    const [loadingFAQ, setLoadingFAQ] = useState(true);
    const [togglingItems, setTogglingItems] = useState<Set<string>>(new Set());
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [faqToDelete, setFaqToDelete] = useState<FAQItem | null>(null);

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
                await reordenarFAQ(studioSlug, faqIds);
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
                // Crear FAQ optimista local
                const tempFAQ: FAQItem = {
                    id: `temp-${Date.now()}`, // ID temporal
                    pregunta: nuevaPregunta.trim(),
                    respuesta: nuevaRespuesta.trim(),
                    orden: faqItems.length,
                    is_active: true
                };

                const updatedFAQ = [...faqItems, tempFAQ];
                setFaqItems(updatedFAQ);
                onLocalUpdate({ faq: updatedFAQ });

                // Limpiar formulario inmediatamente
                setNuevaPregunta('');
                setNuevaRespuesta('');
                setShowFAQModal(false);

                // Crear en servidor
                const newFAQ = await crearFAQ(studioSlug, {
                    pregunta: tempFAQ.pregunta,
                    respuesta: tempFAQ.respuesta
                });

                // Reemplazar FAQ temporal con la real
                const finalFAQ = updatedFAQ.map(faq =>
                    faq.id === tempFAQ.id ? newFAQ : faq
                );
                setFaqItems(finalFAQ);
                onLocalUpdate({ faq: finalFAQ });

                toast.success('FAQ creada correctamente');
            } catch (error) {
                console.error('Error creando FAQ:', error);
                // Revertir cambio en caso de error
                const revertedFAQ = faqItems.filter(faq => faq.id !== `temp-${Date.now()}`);
                setFaqItems(revertedFAQ);
                onLocalUpdate({ faq: revertedFAQ });
                toast.error('Error al crear la FAQ');
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
                const updatedFAQ = await actualizarFAQ(studioSlug, editingFAQ.id, {
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
        // Guardar FAQ original para rollback
        const originalFAQ = faqItems.find(faq => faq.id === faqId);

        try {
            // Eliminación optimista local
            const updatedFAQ = faqItems.filter(faq => faq.id !== faqId);
            setFaqItems(updatedFAQ);
            onLocalUpdate({ faq: updatedFAQ });

            // Eliminar en servidor
            await eliminarFAQ(studioSlug, faqId);
            toast.success('FAQ eliminada correctamente');
        } catch (error) {
            console.error('Error eliminando FAQ:', error);
            // Revertir cambio en caso de error
            if (originalFAQ) {
                const revertedFAQ = [...faqItems, originalFAQ].sort((a, b) => a.orden - b.orden);
                setFaqItems(revertedFAQ);
                onLocalUpdate({ faq: revertedFAQ });
            }
            toast.error('Error al eliminar la FAQ');
        } finally {
            setShowDeleteModal(false);
            setFaqToDelete(null);
        }
    };

    const handleConfirmDelete = (faq: FAQItem) => {
        setFaqToDelete(faq);
        setShowDeleteModal(true);
    };

    const handleCancelDelete = () => {
        setShowDeleteModal(false);
        setFaqToDelete(null);
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
                await toggleFAQ(studioSlug, faqId, !faq.is_active);
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

    // Exponer método para abrir modal desde el padre
    useImperativeHandle(ref, () => ({
        openModal: () => setShowFAQModal(true)
    }));

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
                                    onClick={() => handleConfirmDelete(faq)}
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
        <>
            <div>
                {loading || loadingFAQ ? (
                    <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="animate-pulse">
                                <div className="border border-zinc-800 rounded-lg p-4">
                                    <div className="flex items-start gap-3">
                                        <div className="w-6 h-6 bg-zinc-700/50 rounded"></div>
                                        <div className="flex-1 space-y-2">
                                            <div className="h-5 w-3/4 bg-zinc-700/50 rounded"></div>
                                            <div className="h-4 w-full bg-zinc-700/50 rounded"></div>
                                            <div className="h-4 w-5/6 bg-zinc-700/50 rounded"></div>
                                        </div>
                                        <div className="flex gap-2">
                                            <div className="w-8 h-8 bg-zinc-700/50 rounded"></div>
                                            <div className="w-8 h-8 bg-zinc-700/50 rounded"></div>
                                            <div className="w-8 h-8 bg-zinc-700/50 rounded"></div>
                                        </div>
                                    </div>
                                </div>
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
                    <div className="text-center py-8 text-zinc-500">
                        <HelpCircle className="h-12 w-12 mx-auto mb-4 text-zinc-600" />
                        <p>No hay preguntas frecuentes agregadas</p>
                        <p className="text-sm">Agrega tu primera FAQ para comenzar</p>
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
            </div>

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

            {/* Modal de confirmación para eliminar FAQ */}
            {showDeleteModal && faqToDelete && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-full max-w-md mx-4">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-red-900/20 flex items-center justify-center">
                                <Trash2 className="h-5 w-5 text-red-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white">
                                    Eliminar FAQ
                                </h3>
                                <p className="text-sm text-zinc-400">
                                    Esta acción no se puede deshacer
                                </p>
                            </div>
                        </div>

                        <div className="mb-6">
                            <p className="text-zinc-300 mb-2">
                                ¿Estás seguro de que quieres eliminar esta pregunta frecuente?
                            </p>
                            <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
                                <p className="text-white font-medium text-sm">
                                    {faqToDelete.pregunta}
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <ZenButton
                                onClick={() => handleDeleteFAQ(faqToDelete.id)}
                                disabled={loadingFAQ}
                                loading={loadingFAQ}
                                loadingText="Eliminando..."
                                variant="destructive"
                                size="sm"
                                className="flex-1"
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Eliminar
                            </ZenButton>
                            <ZenButton
                                variant="outline"
                                onClick={handleCancelDelete}
                                disabled={loadingFAQ}
                                size="sm"
                                className="flex-1"
                            >
                                Cancelar
                            </ZenButton>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
});

FAQSection.displayName = 'FAQSection';
