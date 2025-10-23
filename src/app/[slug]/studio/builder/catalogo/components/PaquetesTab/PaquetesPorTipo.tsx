'use client';

import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Plus, Edit, Copy, Trash2, AlertTriangle, GripVertical } from 'lucide-react';
import { ZenCard, ZenButton } from '@/components/ui/zen';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/shadcn/dialog';
import { toast } from 'sonner';
import { eliminarPaquete, duplicarPaquete } from '@/lib/actions/studio/builder/catalogo/paquetes.actions';
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
import { PaqueteFormularioAvanzado, type PaqueteFormularioRef } from './PaqueteFormularioAvanzado';
import { formatearMoneda } from '@/lib/actions/studio/builder/catalogo/calcular-precio';
import type { TipoEventoData } from '@/lib/actions/schemas/tipos-evento-schemas';
import type { PaqueteFromDB } from '@/lib/actions/schemas/paquete-schemas';

interface PaquetesPorTipoProps {
    studioSlug: string;
    tipoEvento: TipoEventoData;
    paquetes: PaqueteFromDB[];
    onNavigateBack: () => void;
    onPaquetesChange: (paquetes: PaqueteFromDB[]) => void;
}

export function PaquetesPorTipo({
    studioSlug,
    tipoEvento,
    paquetes,
    onNavigateBack,
    onPaquetesChange
}: PaquetesPorTipoProps) {
    const [showForm, setShowForm] = useState(false);
    const [editingPaquete, setEditingPaquete] = useState<PaqueteFromDB | null>(null);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [pendingClose, setPendingClose] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showDuplicateModal, setShowDuplicateModal] = useState(false);
    const [selectedPaquete, setSelectedPaquete] = useState<PaqueteFromDB | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDuplicating, setIsDuplicating] = useState(false);
    const [localPaquetes, setLocalPaquetes] = useState<PaqueteFromDB[]>(paquetes);
    const [isReordering, setIsReordering] = useState(false);
    const [isHydrated, setIsHydrated] = useState(false);
    const formRef = useRef<PaqueteFormularioRef>(null);

    // Sincronizar el estado local cuando cambien las props
    useEffect(() => {
        setLocalPaquetes(paquetes);
    }, [paquetes]);

    // Evitar problemas de hidratación con @dnd-kit
    useEffect(() => {
        setIsHydrated(true);
    }, []);

    // Mostrar todos los paquetes sin filtrado
    const filteredPaquetes = localPaquetes;

    const handleCrearPaquete = () => {
        setEditingPaquete(null);
        setShowForm(true);
    };

    const handleSave = (savedPaquete: PaqueteFromDB) => {
        if (editingPaquete) {
            // Actualizar paquete existente
            const newPaquetes = paquetes.map((p) =>
                p.id === editingPaquete.id ? savedPaquete : p
            );
            onPaquetesChange(newPaquetes);
        } else {
            // Crear nuevo paquete
            const newPaquetes = [...paquetes, savedPaquete];
            onPaquetesChange(newPaquetes);
        }
        setShowForm(false);
        setEditingPaquete(null);
    };

    const handleCancel = () => {
        setShowForm(false);
        setEditingPaquete(null);
    };

    // Manejar intento de cierre del modal
    const handleModalClose = (open: boolean) => {
        if (!open && !pendingClose) {
            // Verificar si hay items seleccionados
            if (formRef.current?.hasSelectedItems()) {
                setShowConfirmDialog(true);
                return; // No cerrar el modal
            }
        }

        if (pendingClose) {
            setPendingClose(false);
        }

        setShowForm(open);
        if (!open) {
            setEditingPaquete(null);
        }
    };

    // Confirmar cierre
    const handleConfirmClose = () => {
        setShowConfirmDialog(false);
        setPendingClose(true);
        setShowForm(false);
        setEditingPaquete(null);
    };

    // Cancelar cierre
    const handleCancelClose = () => {
        setShowConfirmDialog(false);
    };

    const handleEditPaquete = (paquete: PaqueteFromDB) => {
        setEditingPaquete(paquete);
        setShowForm(true);
    };

    const handleDuplicatePaquete = (paquete: PaqueteFromDB) => {
        setSelectedPaquete(paquete);
        setShowDuplicateModal(true);
    };

    const handleDeletePaquete = (paquete: PaqueteFromDB) => {
        setSelectedPaquete(paquete);
        setShowDeleteModal(true);
    };

    const confirmDuplicate = async () => {
        if (!selectedPaquete) return;

        setIsDuplicating(true);
        try {
            const result = await duplicarPaquete(studioSlug, selectedPaquete.id);

            if (result.success && result.data) {
                toast.success('Paquete duplicado correctamente');
                const newPaquetes = [...paquetes, result.data];
                onPaquetesChange(newPaquetes);
                setShowDuplicateModal(false);
            } else {
                toast.error(result.error || 'Error al duplicar el paquete');
            }
        } catch (error) {
            toast.error('Error al duplicar el paquete');
            console.error(error);
        } finally {
            setIsDuplicating(false);
        }
    };

    const confirmDelete = async () => {
        if (!selectedPaquete) return;
        
        setIsDeleting(true);
        try {
            const result = await eliminarPaquete(studioSlug, selectedPaquete.id);

            if (result.success) {
                toast.success('Paquete eliminado correctamente');
                const newPaquetes = paquetes.filter(p => p.id !== selectedPaquete.id);
                onPaquetesChange(newPaquetes);
                setShowDeleteModal(false);
            } else {
                toast.error(result.error || 'Error al eliminar el paquete');
            }
        } catch (error) {
            toast.error('Error al eliminar el paquete');
            console.error(error);
        } finally {
            setIsDeleting(false);
        }
    };

    // Configuración de sensores para drag and drop
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Manejar el final del drag and drop
    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        // No permitir drag and drop si ya se está reordenando
        if (isReordering) {
            return;
        }

        if (over && active.id !== over.id) {
            const oldIndex = localPaquetes.findIndex((paquete) => paquete.id === active.id);
            const newIndex = localPaquetes.findIndex((paquete) => paquete.id === over.id);

            const newPaquetes = arrayMove(localPaquetes, oldIndex, newIndex);

            try {
                setIsReordering(true);

                // Actualizar el orden en el estado local primero
                setLocalPaquetes(newPaquetes);

                // Actualizar el orden en la base de datos
                // const paqueteIds = newPaquetes.map(paquete => paquete.id);
                // TODO: Implementar función para reordenar paquetes
                // const result = await reorderPaquetes(studioSlug, paqueteIds);

                // if (!result.success) {
                //     console.error('Error reordering paquetes:', result.error);
                //     // Revertir el cambio local si falla
                //     setLocalPaquetes(paquetes);
                // }
            } catch (error) {
                console.error('Error reordering paquetes:', error);
                // Revertir el cambio local si falla
                setLocalPaquetes(paquetes);
            } finally {
                setIsReordering(false);
            }
        }
    };

    // Componente sortable para cada paquete
    function SortablePaqueteItem({ paquete }: { paquete: PaqueteFromDB }) {
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
                className="group relative bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-3 hover:bg-zinc-800/70 hover:border-zinc-600/50 transition-all duration-200"
            >
                <div className="flex items-center justify-between">
                    {/* Información principal */}
                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-white truncate">
                            {paquete.name}
                        </h3>
                        <p className="text-xs text-zinc-400 mt-0.5">
                            {formatearMoneda(paquete.precio || 0)}
                        </p>
                    </div>

                    {/* Acciones minimalistas */}
                    <div className="flex items-center gap-1 ml-3">
                        <div
                            {...attributes}
                            {...listeners}
                            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded transition-colors cursor-grab active:cursor-grabbing"
                            title="Arrastrar para reordenar"
                        >
                            <GripVertical className="w-3.5 h-3.5" />
                        </div>
                        <button
                            onClick={() => handleEditPaquete(paquete)}
                            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded transition-colors"
                            title="Editar"
                        >
                            <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={() => handleDuplicatePaquete(paquete)}
                            disabled={isDuplicating}
                            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded transition-colors disabled:opacity-50"
                            title="Duplicar"
                        >
                            <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={() => handleDeletePaquete(paquete)}
                            disabled={isDeleting}
                            className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors disabled:opacity-50"
                            title="Eliminar"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header con breadcrumb */}
            <div className="flex items-center gap-4">
                <ZenButton
                    variant="secondary"
                    size="sm"
                    onClick={onNavigateBack}
                    className="flex items-center gap-2"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Volver
                </ZenButton>

                <div className="flex items-center gap-2 text-zinc-400">
                    <span>Paquetes</span>
                    <span>/</span>
                    <span className="text-white font-medium">{tipoEvento.nombre}</span>
                </div>
            </div>

            {/* Header del tipo de evento */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {tipoEvento.icono && (
                        <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center">
                            <span className="text-2xl">{tipoEvento.icono}</span>
                        </div>
                    )}
                    <div>
                        <h2 className="text-2xl font-bold text-white">{tipoEvento.nombre}</h2>
                        {tipoEvento.descripcion && (
                            <p className="text-zinc-400 mt-1">{tipoEvento.descripcion}</p>
                        )}
                    </div>
                </div>

                <ZenButton onClick={handleCrearPaquete}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nuevo Paquete
                </ZenButton>
            </div>


            {/* Lista de paquetes */}
            {filteredPaquetes.length === 0 ? (
                <ZenCard>
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Plus className="w-8 h-8 text-zinc-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">
                            No hay paquetes configurados
                        </h3>
                        <p className="text-zinc-400 mb-6">
                            Crea tu primer paquete para {tipoEvento.nombre}
                        </p>
                        <ZenButton onClick={handleCrearPaquete}>
                            <Plus className="w-4 h-4 mr-2" />
                            Crear Primer Paquete
                        </ZenButton>
                    </div>
                </ZenCard>
            ) : (
                // Evitar problemas de hidratación renderizando solo en el cliente
                !isHydrated ? (
                    <div className="space-y-2">
                        {filteredPaquetes.map((paquete) => (
                            <div key={paquete.id} className="group relative bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-3 hover:bg-zinc-800/70 hover:border-zinc-600/50 transition-all duration-200">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-sm font-medium text-white truncate">
                                            {paquete.name}
                                        </h3>
                                        <p className="text-xs text-zinc-400 mt-0.5">
                                            {formatearMoneda(paquete.precio || 0)}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1 ml-3">
                                        <div className="p-1.5 text-zinc-400">
                                            <GripVertical className="w-3.5 h-3.5" />
                                        </div>
                                        <button className="p-1.5 text-zinc-400">
                                            <Edit className="w-3.5 h-3.5" />
                                        </button>
                                        <button className="p-1.5 text-zinc-400">
                                            <Copy className="w-3.5 h-3.5" />
                                        </button>
                                        <button className="p-1.5 text-zinc-400">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-sm text-zinc-400">
                                {isReordering ? (
                                    <span className="flex items-center space-x-2">
                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
                                        <span>Actualizando posición...</span>
                                    </span>
                                ) : (
                                    "Arrastra para reordenar los paquetes"
                                )}
                            </p>
                        </div>
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={filteredPaquetes.map(paquete => paquete.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                <div className={`space-y-2 ${isReordering ? 'pointer-events-none opacity-50' : ''}`}>
                                    {filteredPaquetes.map((paquete) => (
                                        <SortablePaqueteItem
                                            key={paquete.id}
                                            paquete={paquete}
                                        />
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                    </div>
                )
            )}

            {/* Modal de formulario */}
            <Dialog open={showForm} onOpenChange={handleModalClose}>
                <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-700">
                    <DialogHeader>
                        <DialogTitle className="text-white">
                            {editingPaquete ? 'Editar Paquete' : 'Nuevo Paquete'}
                        </DialogTitle>
                    </DialogHeader>
                    <PaqueteFormularioAvanzado
                        ref={formRef}
                        studioSlug={studioSlug}
                        paquete={editingPaquete}
                        onSave={handleSave}
                        onCancel={handleCancel}
                    />
                </DialogContent>
            </Dialog>

            {/* Modal de confirmación de cierre */}
            <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-700">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-white">
                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                            ¿Estás seguro de cerrar?
                        </DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Se perderán todos los cambios realizados. Los items seleccionados y la configuración del paquete no se guardarán.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex gap-2">
                        <ZenButton
                            variant="secondary"
                            onClick={handleCancelClose}
                            className="flex-1"
                        >
                            Continuar editando
                        </ZenButton>
                        <ZenButton
                            variant="destructive"
                            onClick={handleConfirmClose}
                            className="flex-1"
                        >
                            Sí, cerrar
                        </ZenButton>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de confirmación para eliminar */}
            <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
                <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-700">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-white">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                            ¿Eliminar paquete?
                        </DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            ¿Estás seguro de que quieres eliminar &ldquo;{selectedPaquete?.name}&rdquo;? Esta acción no se puede deshacer.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex gap-2">
                        <ZenButton
                            variant="secondary"
                            onClick={() => setShowDeleteModal(false)}
                            className="flex-1"
                        >
                            Cancelar
                        </ZenButton>
                        <ZenButton
                            variant="destructive"
                            onClick={confirmDelete}
                            disabled={isDeleting}
                            className="flex-1"
                        >
                            {isDeleting ? 'Eliminando...' : 'Eliminar'}
                        </ZenButton>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de confirmación para duplicar */}
            <Dialog open={showDuplicateModal} onOpenChange={setShowDuplicateModal}>
                <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-700">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-white">
                            <Copy className="w-5 h-5 text-blue-500" />
                            ¿Duplicar paquete?
                        </DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Se creará una copia del paquete &ldquo;{selectedPaquete?.name}&rdquo; con el nombre &ldquo;{selectedPaquete?.name} (Copia)&rdquo;.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex gap-2">
                        <ZenButton
                            variant="secondary"
                            onClick={() => setShowDuplicateModal(false)}
                            className="flex-1"
                        >
                            Cancelar
                        </ZenButton>
                        <ZenButton
                            variant="primary"
                            onClick={confirmDuplicate}
                            disabled={isDuplicating}
                            className="flex-1"
                        >
                            {isDuplicating ? 'Duplicando...' : 'Duplicar'}
                        </ZenButton>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
