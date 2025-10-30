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
    obtenerPerfilesPersonal,
    crearPerfilPersonal,
    actualizarPerfilPersonal,
    eliminarPerfilPersonal,
    actualizarOrdenPerfilesPersonal
} from '@/lib/actions/studio/config/personal.actions';
import type { PerfilPersonalData } from '@/lib/actions/schemas/personal-schemas';

interface PerfilesModalProps {
    isOpen: boolean;
    onClose: () => void;
    studioSlug: string;
    onPerfilesChange?: (perfiles: PerfilPersonalData[]) => void;
}

interface SortablePerfilItemProps {
    perfil: PerfilPersonalData;
    onEdit: (perfil: PerfilPersonalData) => void;
    onDelete: (perfil: PerfilPersonalData) => void;
    isEditing: boolean;
    editandoNombre: string;
    onEditChange: (nombre: string) => void;
    onSaveEdit: () => void;
    onCancelEdit: () => void;
}

function SortablePerfilItem({
    perfil,
    onEdit,
    onDelete,
    isEditing,
    editandoNombre,
    onEditChange,
    onSaveEdit,
    onCancelEdit
}: SortablePerfilItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: perfil.id });

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

            {/* Contenido del perfil */}
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
                            <p className="text-white font-medium">{perfil.nombre}</p>
                            {perfil.descripcion && (
                                <p className="text-zinc-400 text-xs">{perfil.descripcion}</p>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            <ZenButton
                                variant="ghost"
                                size="sm"
                                onClick={() => onEdit(perfil)}
                                className="h-8 w-8 p-0 text-blue-400 hover:bg-blue-900/20"
                            >
                                <Edit2 className="h-3 w-3" />
                            </ZenButton>
                            <ZenButton
                                variant="ghost"
                                size="sm"
                                onClick={() => onDelete(perfil)}
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

export function PerfilesModal({ isOpen, onClose, studioSlug, onPerfilesChange }: PerfilesModalProps) {
    const [perfiles, setPerfiles] = useState<PerfilPersonalData[]>([]);
    const [loading, setLoading] = useState(true);
    const [nuevoPerfil, setNuevoPerfil] = useState('');
    const [editandoId, setEditandoId] = useState<string | null>(null);
    const [editandoNombre, setEditandoNombre] = useState('');
    const [eliminandoId, setEliminandoId] = useState<string | null>(null);
    const [eliminandoNombre, setEliminandoNombre] = useState('');

    // Ref para evitar dependencias en useCallback
    const onPerfilesChangeRef = useRef(onPerfilesChange);
    onPerfilesChangeRef.current = onPerfilesChange;

    // Configurar sensores para drag & drop
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Cargar perfiles
    const cargarPerfiles = useCallback(async () => {
        try {
            setLoading(true);
            const result = await obtenerPerfilesPersonal(studioSlug);

            if (result.success && result.data) {
                setPerfiles(result.data);
                onPerfilesChangeRef.current?.(result.data);
            } else {
                toast.error(result.error || 'Error al cargar perfiles');
            }
        } catch (error) {
            console.error('Error al cargar perfiles:', error);
            toast.error('Error al cargar perfiles');
        } finally {
            setLoading(false);
        }
    }, [studioSlug]);

    useEffect(() => {
        if (isOpen) {
            cargarPerfiles();
        }
    }, [isOpen, cargarPerfiles]);

    // Crear nuevo perfil
    const handleCrearPerfil = async () => {
        if (!nuevoPerfil.trim()) {
            toast.error('El nombre del perfil es requerido');
            return;
        }

        try {
            const result = await crearPerfilPersonal(studioSlug, {
                nombre: nuevoPerfil.trim(),
                descripcion: '',
                orden: perfiles.length,
                isActive: true
            });

            if (result.success && result.data) {
                toast.success('Perfil creado exitosamente');
                setNuevoPerfil('');
                const nuevosPerfiles = [...perfiles, result.data!];
                setPerfiles(nuevosPerfiles);
                onPerfilesChangeRef.current?.(nuevosPerfiles);
            } else {
                toast.error(result.error || 'Error al crear perfil');
            }
        } catch (error) {
            console.error('Error al crear perfil:', error);
            toast.error('Error al crear perfil');
        }
    };

    // Editar perfil
    const handleEditarPerfil = (perfil: PerfilPersonalData) => {
        setEditandoId(perfil.id);
        setEditandoNombre(perfil.nombre);
    };

    const handleGuardarEdicion = async () => {
        if (!editandoId || !editandoNombre.trim()) return;

        try {
            const result = await actualizarPerfilPersonal(studioSlug, editandoId, {
                nombre: editandoNombre.trim()
            });

            if (result.success) {
                toast.success('Perfil actualizado exitosamente');
                setEditandoId(null);
                setEditandoNombre('');
                const perfilesActualizados = perfiles.map(perfil =>
                    perfil.id === editandoId
                        ? { ...perfil, nombre: editandoNombre.trim() }
                        : perfil
                );
                setPerfiles(perfilesActualizados);
                onPerfilesChangeRef.current?.(perfilesActualizados);
            } else {
                toast.error(result.error || 'Error al actualizar perfil');
            }
        } catch (error) {
            console.error('Error al actualizar perfil:', error);
            toast.error('Error al actualizar perfil');
        }
    };

    const handleCancelarEdicion = () => {
        setEditandoId(null);
        setEditandoNombre('');
    };

    // Eliminar perfil
    const handleEliminarPerfil = (perfil: PerfilPersonalData) => {
        setEliminandoId(perfil.id);
        setEliminandoNombre(perfil.nombre);
    };

    const handleConfirmarEliminacion = async () => {
        if (!eliminandoId) return;

        try {
            const result = await eliminarPerfilPersonal(studioSlug, eliminandoId);
            if (result.success) {
                toast.success('Perfil eliminado exitosamente');
                const perfilesActualizados = perfiles.filter(perfil => perfil.id !== eliminandoId);
                setPerfiles(perfilesActualizados);
                onPerfilesChangeRef.current?.(perfilesActualizados);
                setEliminandoId(null);
                setEliminandoNombre('');
            } else {
                toast.error(result.error || 'Error al eliminar perfil');
            }
        } catch (error) {
            console.error('Error al eliminar perfil:', error);
            toast.error('Error al eliminar perfil');
        }
    };

    // Drag & Drop
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (active.id !== over?.id) {
            const oldIndex = perfiles.findIndex(perfil => perfil.id === active.id);
            const newIndex = perfiles.findIndex(perfil => perfil.id === over?.id);

            const newPerfiles = arrayMove(perfiles, oldIndex, newIndex);
            setPerfiles(newPerfiles);
            onPerfilesChangeRef.current?.(newPerfiles);

            // Actualizar orden en el servidor
            try {
                const perfilesConOrden = newPerfiles.map((perfil, index) => ({
                    id: perfil.id,
                    orden: index
                }));

                actualizarOrdenPerfilesPersonal(studioSlug, { perfiles: perfilesConOrden });
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
                        <DialogTitle className="text-white">Gestionar Perfiles</DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Organiza los perfiles de personal de tu estudio
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* Crear nuevo perfil */}
                        <div className="flex items-center gap-2">
                            <ZenInput
                                placeholder="Nuevo perfil..."
                                value={nuevoPerfil}
                                onChange={(e) => setNuevoPerfil(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleCrearPerfil()}
                                className="flex-1"
                            />
                            <ZenButton
                                variant="primary"
                                onClick={handleCrearPerfil}
                                disabled={!nuevoPerfil.trim()}
                                className="px-3"
                            >
                                <Plus className="h-4 w-4" />
                            </ZenButton>
                        </div>

                        {/* Lista de perfiles con drag & drop */}
                        {loading ? (
                            <div className="space-y-3">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="h-16 bg-zinc-800/50 rounded-lg animate-pulse" />
                                ))}
                            </div>
                        ) : perfiles.length > 0 ? (
                            <div className="max-h-80 overflow-y-auto">
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragEnd={handleDragEnd}
                                >
                                    <SortableContext
                                        items={perfiles.map(perfil => perfil.id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        <div className="space-y-2">
                                            {perfiles.map((perfil) => (
                                                <SortablePerfilItem
                                                    key={perfil.id}
                                                    perfil={perfil}
                                                    onEdit={handleEditarPerfil}
                                                    onDelete={handleEliminarPerfil}
                                                    isEditing={editandoId === perfil.id}
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
                                <p className="text-zinc-400 text-sm">No hay perfiles creados</p>
                                <p className="text-zinc-500 text-xs mt-1">
                                    Crea tu primer perfil arriba
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
                            Eliminar Perfil
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-zinc-400">
                            ¿Estás seguro de que quieres eliminar el perfil &quot;{eliminandoNombre}&quot;?
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
