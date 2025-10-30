'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Plus, GripVertical, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import {
    ZenButton,
    ZenInput
} from '@/components/ui/zen';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/shadcn/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/shadcn/alert-dialog';
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
import {
    obtenerCategoriasPersonal,
    crearCategoriaPersonal,
    actualizarCategoriaPersonal,
    eliminarCategoriaPersonal,
    actualizarOrdenCategoriasPersonal
} from '@/lib/actions/studio/config/personal.actions';
import type { CategoriaPersonalData } from '@/lib/actions/schemas/personal-schemas';

interface CategoriasModalProps {
    isOpen: boolean;
    onClose: () => void;
    studioSlug: string;
    onCategoriasChange?: (categorias: CategoriaPersonalData[]) => void;
}

interface SortableCategoriaItemProps {
    categoria: CategoriaPersonalData;
    onEdit: (categoria: CategoriaPersonalData) => void;
    onDelete: (categoria: CategoriaPersonalData) => void;
    isEditing: boolean;
    editandoNombre: string;
    onEditChange: (nombre: string) => void;
    onSaveEdit: () => void;
    onCancelEdit: () => void;
}

function SortableCategoriaItem({
    categoria,
    onEdit,
    onDelete,
    isEditing,
    editandoNombre,
    onEditChange,
    onSaveEdit,
    onCancelEdit
}: SortableCategoriaItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: categoria.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700 hover:border-zinc-600 transition-colors"
        >
            {/* Drag Handle */}
            <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing text-zinc-400 hover:text-zinc-300"
            >
                <GripVertical className="h-4 w-4" />
            </div>

            {/* Nombre de la categoría */}
            <div className="flex-1">
                {isEditing ? (
                    <div className="flex items-center gap-2">
                        <ZenInput
                            value={editandoNombre}
                            onChange={(e) => onEditChange(e.target.value)}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter') onSaveEdit();
                                if (e.key === 'Escape') onCancelEdit();
                            }}
                            className="flex-1"
                            autoFocus
                        />
                        <ZenButton
                            variant="primary"
                            size="sm"
                            onClick={onSaveEdit}
                            disabled={!editandoNombre.trim()}
                        >
                            ✓
                        </ZenButton>
                        <ZenButton
                            variant="outline"
                            size="sm"
                            onClick={onCancelEdit}
                        >
                            ✕
                        </ZenButton>
                    </div>
                ) : (
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-white font-medium">{categoria.nombre}</p>
                            <p className="text-zinc-400 text-xs">
                                {categoria._count.personal} persona{categoria._count.personal !== 1 ? 's' : ''}
                            </p>
                        </div>
                        <div className="flex items-center gap-1">
                            <ZenButton
                                variant="ghost"
                                size="sm"
                                onClick={() => onEdit(categoria)}
                                className="h-8 w-8 p-0 text-blue-400 hover:bg-blue-900/20"
                            >
                                <Edit2 className="h-3 w-3" />
                            </ZenButton>
                            <ZenButton
                                variant="ghost"
                                size="sm"
                                onClick={() => onDelete(categoria)}
                                className="h-8 w-8 p-0 text-red-400 hover:bg-red-900/20"
                            >
                                <Trash2 className="h-3 w-3" />
                            </ZenButton>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export function CategoriasModal({ isOpen, onClose, studioSlug, onCategoriasChange }: CategoriasModalProps) {
    const [categorias, setCategorias] = useState<CategoriaPersonalData[]>([]);
    const [loading, setLoading] = useState(true);
    const [nuevaCategoria, setNuevaCategoria] = useState('');
    const [editandoId, setEditandoId] = useState<string | null>(null);
    const [editandoNombre, setEditandoNombre] = useState('');
    const [eliminandoId, setEliminandoId] = useState<string | null>(null);
    const [eliminandoNombre, setEliminandoNombre] = useState('');

    // Ref para evitar dependencias en useCallback
    const onCategoriasChangeRef = useRef(onCategoriasChange);
    onCategoriasChangeRef.current = onCategoriasChange;

    // Configurar sensores para drag & drop
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Cargar categorías
    const cargarCategorias = useCallback(async () => {
        try {
            setLoading(true);
            const result = await obtenerCategoriasPersonal(studioSlug);

            if (result.success && result.data) {
                setCategorias(result.data);
                onCategoriasChangeRef.current?.(result.data);
            } else {
                toast.error(result.error || 'Error al cargar categorías');
            }
        } catch (error) {
            console.error('Error al cargar categorías:', error);
            toast.error('Error al cargar categorías');
        } finally {
            setLoading(false);
        }
    }, [studioSlug]);

    useEffect(() => {
        if (isOpen) {
            cargarCategorias();
        }
    }, [isOpen, cargarCategorias]);

    // Crear nueva categoría
    const handleCrearCategoria = async () => {
        if (!nuevaCategoria.trim()) {
            toast.error('El nombre de la categoría es requerido');
            return;
        }

        try {
            const result = await crearCategoriaPersonal(studioSlug, {
                nombre: nuevaCategoria.trim(),
                tipo: 'OPERATIVO', // Por defecto
                descripcion: '',
                esDefault: false,
                orden: categorias.length,
                isActive: true
            });

            if (result.success && result.data) {
                toast.success('Categoría creada exitosamente');
                setNuevaCategoria('');
                const nuevasCategorias = [...categorias, result.data!];
                setCategorias(nuevasCategorias);
                onCategoriasChangeRef.current?.(nuevasCategorias);
            } else {
                toast.error(result.error || 'Error al crear categoría');
            }
        } catch (error) {
            console.error('Error al crear categoría:', error);
            toast.error('Error al crear categoría');
        }
    };

    // Editar categoría
    const handleEditarCategoria = (categoria: CategoriaPersonalData) => {
        setEditandoId(categoria.id);
        setEditandoNombre(categoria.nombre);
    };

    const handleGuardarEdicion = async () => {
        if (!editandoId || !editandoNombre.trim()) return;

        try {
            const result = await actualizarCategoriaPersonal(studioSlug, editandoId, {
                nombre: editandoNombre.trim()
            });

            if (result.success) {
                toast.success('Categoría actualizada exitosamente');
                setEditandoId(null);
                setEditandoNombre('');
                const categoriasActualizadas = categorias.map(cat =>
                    cat.id === editandoId
                        ? { ...cat, nombre: editandoNombre.trim() }
                        : cat
                );
                setCategorias(categoriasActualizadas);
                onCategoriasChangeRef.current?.(categoriasActualizadas);
            } else {
                toast.error(result.error || 'Error al actualizar categoría');
            }
        } catch (error) {
            console.error('Error al actualizar categoría:', error);
            toast.error('Error al actualizar categoría');
        }
    };

    const handleCancelarEdicion = () => {
        setEditandoId(null);
        setEditandoNombre('');
    };

    // Eliminar categoría
    const handleEliminarCategoria = (categoria: CategoriaPersonalData) => {
        setEliminandoId(categoria.id);
        setEliminandoNombre(categoria.nombre);
    };

    const handleConfirmarEliminacion = async () => {
        if (!eliminandoId) return;

        try {
            const result = await eliminarCategoriaPersonal(studioSlug, eliminandoId);
            if (result.success) {
                toast.success('Categoría eliminada exitosamente');
                const categoriasActualizadas = categorias.filter(cat => cat.id !== eliminandoId);
                setCategorias(categoriasActualizadas);
                onCategoriasChangeRef.current?.(categoriasActualizadas);
                setEliminandoId(null);
                setEliminandoNombre('');
            } else {
                toast.error(result.error || 'Error al eliminar categoría');
            }
        } catch (error) {
            console.error('Error al eliminar categoría:', error);
            toast.error('Error al eliminar categoría');
        }
    };

    // Drag & Drop
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (active.id !== over?.id) {
            const oldIndex = categorias.findIndex(cat => cat.id === active.id);
            const newIndex = categorias.findIndex(cat => cat.id === over?.id);

            const newCategorias = arrayMove(categorias, oldIndex, newIndex);
            setCategorias(newCategorias);
            onCategoriasChangeRef.current?.(newCategorias);

            // Actualizar orden en el servidor
            try {
                const categoriasConOrden = newCategorias.map((cat, index) => ({
                    id: cat.id,
                    orden: index
                }));

                actualizarOrdenCategoriasPersonal(studioSlug, { categorias: categoriasConOrden });
            } catch (error) {
                console.error('Error al actualizar orden:', error);
                toast.error('Error al actualizar orden');
            }
        }
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="max-w-md bg-zinc-900 border-zinc-700">
                    <DialogHeader>
                        <DialogTitle className="text-white">Gestionar Categorías</DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Organiza las categorías de personal de tu estudio
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* Crear nueva categoría */}
                        <div className="flex items-center gap-2">
                            <ZenInput
                                placeholder="Nueva categoría..."
                                value={nuevaCategoria}
                                onChange={(e) => setNuevaCategoria(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleCrearCategoria()}
                                className="flex-1"
                            />
                            <ZenButton
                                variant="primary"
                                onClick={handleCrearCategoria}
                                disabled={!nuevaCategoria.trim()}
                                className="px-3"
                            >
                                <Plus className="h-4 w-4" />
                            </ZenButton>
                        </div>

                        {/* Lista de categorías con drag & drop */}
                        {loading ? (
                            <div className="space-y-3">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="h-16 bg-zinc-800/50 rounded-lg animate-pulse" />
                                ))}
                            </div>
                        ) : categorias.length > 0 ? (
                            <div className="max-h-80 overflow-y-auto">
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragEnd={handleDragEnd}
                                >
                                    <SortableContext
                                        items={categorias.map(cat => cat.id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        <div className="space-y-2">
                                            {categorias.map((categoria) => (
                                                <SortableCategoriaItem
                                                    key={categoria.id}
                                                    categoria={categoria}
                                                    onEdit={handleEditarCategoria}
                                                    onDelete={handleEliminarCategoria}
                                                    isEditing={editandoId === categoria.id}
                                                    editandoNombre={editandoNombre}
                                                    onEditChange={setEditandoNombre}
                                                    onSaveEdit={handleGuardarEdicion}
                                                    onCancelEdit={handleCancelarEdicion}
                                                />
                                            ))}
                                        </div>
                                    </SortableContext>
                                </DndContext>
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <p className="text-zinc-400 text-sm">No hay categorías creadas</p>
                                <p className="text-zinc-500 text-xs mt-1">
                                    Crea tu primera categoría arriba
                                </p>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <ZenButton variant="outline" onClick={onClose}>
                            Cerrar
                        </ZenButton>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de confirmación de eliminación */}
            <AlertDialog open={!!eliminandoId} onOpenChange={() => setEliminandoId(null)}>
                <AlertDialogContent className="bg-zinc-900 border-zinc-700">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-white flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-red-400" />
                            Eliminar Categoría
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-zinc-400">
                            ¿Estás seguro de que quieres eliminar la categoría &quot;{eliminandoNombre}&quot;?
                            Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="border-zinc-600 text-zinc-300 hover:bg-zinc-700">
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmarEliminacion}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
