'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import { Button } from '@/components/ui/shadcn/button';
import { ZenInput } from '@/components/ui/zen';
import {
    Search,
    Plus,
    Settings
} from 'lucide-react';
import { toast } from 'sonner';
import { ServiceCategory } from '../types';
import { ServiceCategoryModal } from './ServiceCategoryModal';
import { ServiceCategoryCard } from './ServiceCategoryCard';
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
} from '@dnd-kit/sortable';

export function ServiceCategoriesPageClient() {
    const [categories, setCategories] = useState<ServiceCategory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null);
    const [isReordering, setIsReordering] = useState(false);

    // Configurar sensores para drag and drop
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            setIsLoading(true);
            const response = await fetch('/api/service-categories');
            if (response.ok) {
                const data = await response.json();
                setCategories(data);
            } else {
                throw new Error('Error al cargar categorías');
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
            toast.error('Error al cargar categorías');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreate = () => {
        setEditingCategory(null);
        setShowModal(true);
    };

    const handleEdit = (category: ServiceCategory) => {
        setEditingCategory(category);
        setShowModal(true);
    };

    const handleDelete = async (categoryId: string) => {
        if (!confirm('¿Estás seguro de que quieres eliminar esta categoría?')) {
            return;
        }

        try {
            const response = await fetch(`/api/service-categories/${categoryId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Error al eliminar categoría');
            }

            setCategories(prev => prev.filter(c => c.id !== categoryId));
            toast.success('Categoría eliminada exitosamente');
        } catch (error) {
            console.error('Error deleting category:', error);
            toast.error('Error al eliminar categoría');
        }
    };

    const handleToggleActive = async (category: ServiceCategory) => {
        try {
            const response = await fetch(`/api/service-categories/${category.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    active: !category.active
                }),
            });

            if (!response.ok) {
                throw new Error('Error al actualizar categoría');
            }

            const updatedCategory = await response.json();
            setCategories(prev =>
                prev.map(c => c.id === category.id ? updatedCategory : c)
            );
            toast.success(`Categoría ${updatedCategory.active ? 'activada' : 'desactivada'} exitosamente`);
        } catch (error) {
            console.error('Error toggling category:', error);
            toast.error('Error al actualizar categoría');
        }
    };

    const handleModalSave = (savedCategory: ServiceCategory) => {
        if (editingCategory) {
            // Actualizar categoría existente localmente
            setCategories(prev =>
                prev.map(c => c.id === savedCategory.id ? savedCategory : c)
            );
            toast.success('Categoría actualizada exitosamente');
        } else {
            // Agregar nueva categoría al principio de la lista
            setCategories(prev => [savedCategory, ...prev]);
            toast.success('Categoría creada exitosamente');
        }
        setShowModal(false);
        setEditingCategory(null);
    };

    // Función para actualizar la posición de una categoría
    const updateCategoryPosition = useCallback(async (categoryId: string, newPosition: number) => {
        try {
            console.log(`Updating category ${categoryId} to position ${newPosition}`);

            const response = await fetch(`/api/service-categories/${categoryId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    posicion: newPosition
                }),
            });

            console.log('Response status:', response.status);
            console.log('Response ok:', response.ok);

            if (!response.ok) {
                const errorData = await response.json();
                console.error('API Error:', errorData);
                throw new Error(errorData.error || 'Error al actualizar posición de la categoría');
            }

            const result = await response.json();
            console.log('Category position updated successfully:', result);
            return result;
        } catch (error) {
            console.error('Error updating category position:', error);
            throw error;
        }
    }, []);

    // Función para manejar el reordenamiento
    const handleDragEnd = useCallback(async (event: DragEndEvent) => {
        if (isReordering) return; // Prevenir múltiples operaciones

        const { active, over } = event;

        if (!over || active.id === over.id) {
            return;
        }

        const oldIndex = categories.findIndex(category => category.id === active.id);
        const newIndex = categories.findIndex(category => category.id === over.id);

        if (oldIndex === -1 || newIndex === -1) {
            return;
        }

        // Actualizar estado local inmediatamente para feedback visual
        const reorderedCategories = arrayMove(categories, oldIndex, newIndex);
        setCategories(reorderedCategories);

        try {
            setIsReordering(true);

            // Actualizar posiciones secuencialmente para evitar saturar la BD
            for (let i = 0; i < reorderedCategories.length; i++) {
                const category = reorderedCategories[i];
                const newPosition = i + 1; // Posiciones empiezan en 1

                if (category.posicion !== newPosition) {
                    await updateCategoryPosition(category.id, newPosition);
                    // Pequeño delay para evitar saturar la BD
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }

            toast.success('Orden de categorías actualizado exitosamente');
        } catch (error) {
            console.error('Error reordering categories:', error);
            toast.error('Error al actualizar el orden de las categorías');

            // Revertir cambios locales si falla
            setCategories(categories);
        } finally {
            setIsReordering(false);
        }
    }, [categories, isReordering, updateCategoryPosition]);

    const filteredCategories = categories.filter(category =>
        category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        category.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isLoading) {
        return (
            <Card className="border border-border bg-card shadow-sm">
                <CardHeader className="border-b border-zinc-800">
                    <CardTitle className="text-lg font-semibold text-white">Categorías de Servicios</CardTitle>
                    <div className="text-sm text-zinc-400">
                        Cargando categorías...
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-zinc-800">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex items-center justify-between p-4 animate-pulse">
                                <div className="flex items-center space-x-4">
                                    <div className="h-4 w-4 bg-zinc-700 rounded"></div>
                                    <div className="h-4 w-6 bg-zinc-700 rounded"></div>
                                    <div className="h-4 w-4 bg-zinc-700 rounded-full"></div>
                                    <div className="h-4 bg-zinc-700 rounded w-32"></div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <div className="h-6 w-16 bg-zinc-700 rounded"></div>
                                    <div className="h-6 w-16 bg-zinc-700 rounded"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Filtros */}
            <Card>
                <CardHeader>
                    <CardTitle>Filtros y Búsqueda</CardTitle>
                </CardHeader>
                <CardContent>
                    <ZenInput
                        placeholder="Buscar por nombre o descripción..."
                        icon={Search}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </CardContent>
            </Card>

            {/* Lista de Categorías */}
            <Card className="border border-border bg-card shadow-sm">
                <CardHeader className="border-b border-zinc-800">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-semibold text-white">Categorías de Servicios</CardTitle>
                        <Button onClick={handleCreate}>
                            <Plus className="h-4 w-4 mr-2" />
                            Nueva Categoría
                        </Button>
                    </div>
                    <div className="text-sm text-zinc-400">
                        {isReordering ? (
                            <span className="flex items-center space-x-2">
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
                                <span>Actualizando posición...</span>
                            </span>
                        ) : (
                            "Arrastra para reordenar las categorías de servicios"
                        )}
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {filteredCategories.length === 0 ? (
                        <div className="text-center py-12">
                            <Settings className="h-12 w-12 text-zinc-400 mx-auto mb-4" />
                            <p className="text-lg font-medium mb-2 text-white">
                                {searchTerm ? 'No se encontraron categorías' : 'No hay categorías creadas'}
                            </p>
                            <p className="text-zinc-400 mb-4">
                                {searchTerm
                                    ? 'Intenta con otros términos de búsqueda'
                                    : 'Crea tu primera categoría para comenzar'
                                }
                            </p>
                            {!searchTerm && (
                                <Button onClick={handleCreate}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Crear Primera Categoría
                                </Button>
                            )}
                        </div>
                    ) : (
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={filteredCategories.map(category => category.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                <div className={`divide-y divide-zinc-800 ${isReordering ? 'pointer-events-none opacity-50' : ''}`}>
                                    {filteredCategories.map((category) => (
                                        <ServiceCategoryCard
                                            key={category.id}
                                            category={category}
                                            onEdit={handleEdit}
                                            onDelete={handleDelete}
                                            onToggleActive={handleToggleActive}
                                        />
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                    )}
                </CardContent>
            </Card>

            {/* Modal */}
            <ServiceCategoryModal
                isOpen={showModal}
                onClose={() => {
                    setShowModal(false);
                    setEditingCategory(null);
                }}
                category={editingCategory}
                onSave={handleModalSave}
                existingCategories={categories}
            />
        </div>
    );
}
