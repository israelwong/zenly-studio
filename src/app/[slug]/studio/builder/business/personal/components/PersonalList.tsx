'use client';

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { Plus, Settings, Users } from 'lucide-react';
import {
    ZenButton,
    ZenBadge,
    ZenCard,
    ZenCardContent,
    ZenCardHeader,
    ZenCardTitle
} from '@/components/ui/zen';
import { PersonalItem } from './PersonalItem';
import { PersonalForm } from './PersonalForm';
import { CategoriasModal } from './CategoriasModal';
import { PerfilesModal } from './PerfilesModal';
import {
    obtenerPersonal,
    eliminarPersonal,
    obtenerCategoriasPersonal,
    actualizarPersonal,
    actualizarPosicionPersonal
} from '@/lib/actions/studio/config/personal.actions';
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    useDroppable,
} from '@dnd-kit/core';
import {
    // arrayMove no es necesario con la nueva implementación
    SortableContext,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { PersonalData, CategoriaPersonalData } from '@/lib/actions/schemas/personal-schemas';

// Componente para zona de drop en categorías vacías
const EmptyCategoryDropZone = ({ categoria }: { categoria: CategoriaPersonalData }) => {
    const { setNodeRef, isOver } = useDroppable({
        id: `category-${categoria.id}`, // ID especial para categorías vacías
    });

    return (
        <div
            ref={setNodeRef}
            className={`text-center py-8 min-h-[100px] flex items-center justify-center border-2 border-dashed rounded-lg m-4 transition-colors ${isOver
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-zinc-700 bg-zinc-800/30'
                }`}
        >
            <div className="text-center">
                <div className="text-zinc-500 mb-2">
                    <Users className="h-8 w-8 mx-auto" />
                </div>
                <p className="text-sm text-zinc-400">
                    {isOver ? 'Suelta aquí para agregar a esta categoría' : 'Arrastra personal aquí para agregarlo a esta categoría'}
                </p>
            </div>
        </div>
    );
};

interface PersonalListProps {
    studioSlug: string;
    initialPersonal: PersonalData[];
    onPersonalChange: (personal: PersonalData[]) => void;
}

export function PersonalList({
    studioSlug,
    initialPersonal,
    onPersonalChange
}: PersonalListProps) {
    const [personal, setPersonal] = useState<PersonalData[]>(initialPersonal);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingPersonal, setEditingPersonal] = useState<PersonalData | null>(null);
    const [categorias, setCategorias] = useState<CategoriaPersonalData[]>([]);
    const [isCategoriasModalOpen, setIsCategoriasModalOpen] = useState(false);
    const [isPerfilesModalOpen, setIsPerfilesModalOpen] = useState(false);

    // Configurar sensores para drag & drop
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Evita activación accidental
            },
        })
    );

    // Sincronizar personal local con las props del padre
    useEffect(() => {
        setPersonal(initialPersonal);
    }, [initialPersonal]);

    // Cargar categorías para debug
    useEffect(() => {
        const cargarCategorias = async () => {
            const result = await obtenerCategoriasPersonal(studioSlug);
            if (result.success && result.data) {
                setCategorias(result.data);
            }
        };
        cargarCategorias();
    }, [studioSlug]);

    // Función para actualizar personal tanto local como en el padre
    const updatePersonal = useCallback((newPersonal: PersonalData[]) => {
        setPersonal(newPersonal);
        onPersonalChange(newPersonal);
    }, [onPersonalChange]);

    // Función para recargar datos desde el servidor
    const recargarPersonal = useCallback(async () => {
        try {
            const result = await obtenerPersonal(studioSlug);
            if (result.success && result.data) {
                updatePersonal(result.data);
            }
        } catch (error) {
            console.error('Error recargando personal:', error);
        }
    }, [studioSlug, updatePersonal]);

    const handleEliminar = async (personalId: string) => {
        try {
            const result = await eliminarPersonal(studioSlug, personalId);
            if (result.success) {
                toast.success('Personal eliminado exitosamente');
                recargarPersonal();
            } else {
                toast.error(result.error || 'Error al eliminar personal');
            }
        } catch (error) {
            console.error('Error al eliminar:', error);
            toast.error('Error al eliminar personal');
        }
    };

    // Manejar drag & drop siguiendo el patrón nested-drag-drop de la documentación
    const handleDragEnd = useCallback(async (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over || !active) return;

        const activeId = String(active.id);
        const overId = String(over.id);

        if (activeId === overId) return;

        const activePersonal = personal.find((p) => p.id === activeId);
        if (!activePersonal) return;

        // Verificar si se está arrastrando a una categoría vacía
        const isDroppingOnEmptyCategory = overId.startsWith("category-");
        let targetCategoryId = null;
        let overPersonal = null;

        if (isDroppingOnEmptyCategory) {
            // Extraer el ID de la categoría del ID del drop zone
            targetCategoryId = overId.replace("category-", "");
        } else {
            overPersonal = personal.find((p) => p.id === overId);
            if (!overPersonal) return;
            targetCategoryId = overPersonal.categoriaId;
        }

        // Determinar si es reordenamiento dentro de la misma categoría
        const isReordering = activePersonal.categoriaId === targetCategoryId;

        let newIndex = 0;

        if (isReordering) {
            // Reordenamiento dentro de la misma categoría
            const categoryPersonal = personal.filter(
                (p) => p.categoriaId === activePersonal.categoriaId
            );

            const activeIndex = categoryPersonal.findIndex((p) => p.id === activeId);
            const overIndex = categoryPersonal.findIndex((p) => p.id === overId);

            if (activeIndex === -1 || overIndex === -1) return;

            newIndex = overIndex;
        } else {
            // Movimiento entre categorías
            const targetCategoryPersonal = personal.filter(
                (p) => p.categoriaId === targetCategoryId
            );

            if (isDroppingOnEmptyCategory) {
                // Si se suelta en una categoría vacía, insertar al final
                newIndex = targetCategoryPersonal.length;
            } else {
                // Si se suelta sobre un personal, insertar en su posición
                const overIndex = targetCategoryPersonal.findIndex(
                    (p) => p.id === overId
                );
                newIndex = overIndex === -1 ? targetCategoryPersonal.length : overIndex;
            }
        }

        // Guardar estado original para revertir en caso de error
        const originalPersonal = [...personal];

        // Actualizar estado local inmediatamente (optimistic update) - PATRÓN DE LA DOCUMENTACIÓN
        setPersonal((currentPersonal) => {
            const newPersonal = [...currentPersonal];

            // Remover el personal de su posición actual
            const activeIndex = newPersonal.findIndex((p) => p.id === activeId);
            if (activeIndex === -1) return currentPersonal;

            const [movedPersonal] = newPersonal.splice(activeIndex, 1);

            // Actualizar la categoría del personal movido
            movedPersonal.categoriaId = targetCategoryId;
            movedPersonal.categoria = categorias.find((c) => c.id === targetCategoryId) || movedPersonal.categoria;

            // Encontrar la nueva posición de inserción
            const targetCategoryPersonal = newPersonal.filter(
                (p) => p.categoriaId === targetCategoryId
            );
            const insertIndex = Math.min(newIndex, targetCategoryPersonal.length);

            // Insertar en la nueva posición
            newPersonal.splice(insertIndex, 0, movedPersonal);

            // Reindexar posiciones en ambas categorías
            const sourceCategoryPersonal = newPersonal.filter(
                (p) => p.categoriaId === activePersonal.categoriaId
            );
            const finalTargetCategoryPersonal = newPersonal.filter(
                (p) => p.categoriaId === targetCategoryId
            );

            // Actualizar posiciones en categoría origen (índices basados en 0)
            sourceCategoryPersonal.forEach((persona, index) => {
                persona.orden = index;
            });

            // Actualizar posiciones en categoría destino (índices basados en 0)
            finalTargetCategoryPersonal.forEach((persona, index) => {
                persona.orden = index;
            });

            return newPersonal;
        });

        try {
            // Actualizar en el backend - IGUAL QUE EN SERVICES
            await actualizarPosicionPersonal(studioSlug, activeId, newIndex + 1, targetCategoryId);

            toast.success(
                isReordering
                    ? "Orden actualizado exitosamente"
                    : "Personal movido exitosamente"
            );
        } catch (error) {
            console.error("Error updating personal position:", error);
            toast.error("Error al actualizar la posición del personal");
            // Revertir cambios
            setPersonal(originalPersonal);
        }
    }, [personal, categorias, studioSlug]);

    const handleEdit = (personal: PersonalData) => {
        setEditingPersonal(personal);
        setIsFormOpen(true);
    };

    const handleToggleStatus = async (personalId: string, isActive: boolean) => {
        try {
            const newStatus = isActive ? 'activo' : 'inactivo';
            const result = await actualizarPersonal(studioSlug, personalId, { status: newStatus });

            if (result.success && result.data) {
                // Actualizar estado local
                const updatedPersonal = personal.map(p =>
                    p.id === personalId
                        ? { ...p, status: newStatus }
                        : p
                );
                setPersonal(updatedPersonal);
                updatePersonal(updatedPersonal);

                toast.success(`Personal ${isActive ? 'activado' : 'desactivado'} exitosamente`);
            } else {
                toast.error('Error al actualizar el estatus');
            }
        } catch (error) {
            console.error('Error al cambiar estatus:', error);
            toast.error('Error al actualizar el estatus');
        }
    };

    const handleFormSuccess = () => {
        setIsFormOpen(false);
        setEditingPersonal(null);
        recargarPersonal();
    };

    const handleFormClose = () => {
        setIsFormOpen(false);
        setEditingPersonal(null);
    };

    const handleNuevoPersonal = () => {
        setEditingPersonal(null);
        setIsFormOpen(true);
    };

    // Agrupar por categoría
    const personalAgrupado = personal.reduce((acc, persona) => {
        const categoriaNombre = persona.categoria.nombre;
        if (!acc[categoriaNombre]) {
            acc[categoriaNombre] = [];
        }
        acc[categoriaNombre].push(persona);
        return acc;
    }, {} as Record<string, PersonalData[]>);



    return (
        <div className="space-y-6">
            {/* Header con botones de gestión */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Users className="h-6 w-6 text-blue-400" />
                    <ZenBadge variant="secondary">
                        {personal.length} {personal.length === 1 ? 'persona' : 'personas'}
                    </ZenBadge>
                </div>

                <div className="flex items-center gap-3">
                    {/* Botón Nuevo Personal */}
                    <ZenButton
                        variant="primary"
                        className="flex items-center gap-2"
                        onClick={() => handleNuevoPersonal()}
                    >
                        <Plus className="h-4 w-4" />
                        Nuevo Personal
                    </ZenButton>

                    {/* Botón Gestionar Categorías */}
                    <ZenButton
                        variant="outline"
                        className="flex items-center gap-2"
                        onClick={() => setIsCategoriasModalOpen(true)}
                    >
                        <Settings className="h-4 w-4" />
                        Categorías
                    </ZenButton>

                    {/* Botón Gestionar Perfiles */}
                    <ZenButton
                        variant="outline"
                        className="flex items-center gap-2"
                        onClick={() => setIsPerfilesModalOpen(true)}
                    >
                        <Users className="h-4 w-4" />
                        Perfiles
                    </ZenButton>

                </div>
            </div>


            {/* Lista de categorías (con o sin personal) */}
            {categorias.length > 0 ? (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={personal.map(p => p.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="space-y-6">
                            {categorias.map((categoria) => {
                                const personalCategoria = personalAgrupado[categoria.nombre] || [];
                                const tienePersonal = personalCategoria.length > 0;

                                return (
                                    <ZenCard key={categoria.id} variant="default" padding="none">
                                        <ZenCardHeader>
                                            <div className="flex items-center gap-3">
                                                <ZenCardTitle className="flex items-center gap-2">
                                                    {categoria.nombre}
                                                </ZenCardTitle>
                                                <ZenBadge variant="outline" className="text-xs">
                                                    {personalCategoria.length} persona{personalCategoria.length !== 1 ? 's' : ''}
                                                </ZenBadge>
                                            </div>
                                        </ZenCardHeader>
                                        <ZenCardContent>
                                            {tienePersonal ? (
                                                <div className="grid gap-3">
                                                    {personalCategoria.map((persona) => (
                                                        <PersonalItem
                                                            key={persona.id}
                                                            personal={persona}
                                                            onEdit={handleEdit}
                                                            onDelete={handleEliminar}
                                                            onToggleStatus={handleToggleStatus}
                                                        />
                                                    ))}
                                                </div>
                                            ) : (
                                                <EmptyCategoryDropZone categoria={categoria} />
                                            )}
                                        </ZenCardContent>
                                    </ZenCard>
                                );
                            })}
                        </div>
                    </SortableContext>
                </DndContext>
            ) : (
                <ZenCard>
                    <ZenCardContent className="text-center py-12">
                        <Users className="h-12 w-12 text-zinc-500 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-white mb-2">No hay categorías de personal</h3>
                        <p className="text-zinc-400 mb-6">Primero crea categorías para organizar tu equipo</p>
                        <ZenButton
                            variant="primary"
                            onClick={() => setIsCategoriasModalOpen(true)}
                            className="flex items-center gap-2"
                        >
                            <Settings className="h-4 w-4" />
                            Gestionar Categorías
                        </ZenButton>
                    </ZenCardContent>
                </ZenCard>
            )}

            {/* Modal de formulario */}
            <PersonalForm
                isOpen={isFormOpen}
                onClose={handleFormClose}
                onSuccess={handleFormSuccess}
                studioSlug={studioSlug}
                personal={editingPersonal}
            />

            {/* Modal de gestión de categorías */}
            <CategoriasModal
                isOpen={isCategoriasModalOpen}
                onClose={() => setIsCategoriasModalOpen(false)}
                studioSlug={studioSlug}
                onCategoriasChange={(nuevasCategorias) => {
                    setCategorias(nuevasCategorias);
                }}
            />

            {/* Modal de gestión de perfiles */}
            <PerfilesModal
                isOpen={isPerfilesModalOpen}
                onClose={() => setIsPerfilesModalOpen(false)}
                studioSlug={studioSlug}
                onPerfilesChange={(nuevosPerfiles) => {
                    // Opcional: manejar cambios en perfiles si es necesario
                    console.log('Perfiles actualizados:', nuevosPerfiles);
                }}
            />
        </div>
    );
}

