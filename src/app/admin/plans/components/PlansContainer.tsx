'use client';

import React, { useState, useMemo } from 'react';
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
    rectSortingStrategy,
} from '@dnd-kit/sortable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import { Input } from '@/components/ui/shadcn/input';
import { ZenButton } from '@/components/ui/zen';
import { Badge } from '@/components/ui/shadcn/badge';
import Link from 'next/link';
import {
    Search,
    Filter,
    Plus,
    SortAsc,
    SortDesc
} from 'lucide-react';
import { PlanCardWrapper } from './PlanCardWrapper';
import { DuplicatePlanModal } from './DuplicatePlanModal';
import { DeletePlanModal } from './DeletePlanModal';
import { Plan } from '../types';
import { ServiceWithPlanConfig } from '../types/plan-services';
import { toast } from 'sonner';

interface PlansContainerProps {
    plans: Plan[];
    onPlanDelete: (planId: string) => void;
    onPlanUpdate: (updatedPlan: Plan) => void;
    onPlansReorder?: (reorderedPlans: Plan[]) => void;
}

type FilterType = 'all' | 'active' | 'inactive' | 'popular';
type SortType = 'name' | 'price' | 'studios' | 'orden';

export function PlansContainer({
    plans,
    onPlanDelete,
    onPlanUpdate,
    onPlansReorder
}: PlansContainerProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState<FilterType>('all');
    const [sortBy, setSortBy] = useState<SortType>('orden');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);
    const [showDuplicateModal, setShowDuplicateModal] = useState(false);
    const [planToDuplicate, setPlanToDuplicate] = useState<Plan | null>(null);
    const [isDuplicating, setIsDuplicating] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [planToDelete, setPlanToDelete] = useState<Plan | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Drag and Drop sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Filtrar y ordenar planes
    const filteredAndSortedPlans = useMemo(() => {
        const filtered = plans.filter(plan => {
            // Filtro de búsqueda
            const matchesSearch = plan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                plan.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (plan.description && plan.description.toLowerCase().includes(searchTerm.toLowerCase()));

            if (!matchesSearch) return false;

            // Filtro por estado
            switch (filter) {
                case 'active':
                    return plan.active;
                case 'inactive':
                    return !plan.active;
                case 'popular':
                    return plan.popular;
                default:
                    return true;
            }
        });

        // Ordenar
        filtered.sort((a, b) => {
            let aValue: string | number, bValue: string | number;

            switch (sortBy) {
                case 'name':
                    aValue = a.name.toLowerCase();
                    bValue = b.name.toLowerCase();
                    break;
                case 'price':
                    aValue = a.price_monthly || 0;
                    bValue = b.price_monthly || 0;
                    break;
                case 'studios':
                    aValue = a._count?.projects || 0;
                    bValue = b._count?.projects || 0;
                    break;
                case 'orden':
                default:
                    aValue = a.orden;
                    bValue = b.orden;
                    break;
            }

            if (sortOrder === 'asc') {
                return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
            } else {
                return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
            }
        });

        return filtered;
    }, [plans, searchTerm, filter, sortBy, sortOrder]);

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            // Usar todos los planes activos, no solo los filtrados
            const activePlans = plans.filter(plan => plan.active).sort((a, b) => a.orden - b.orden);

            const oldIndex = activePlans.findIndex((item) => item.id === active.id);
            const newIndex = activePlans.findIndex((item) => item.id === over.id);

            if (oldIndex === -1 || newIndex === -1) {
                toast.error('Error: No se pudo encontrar el plan en la lista');
                return;
            }

            const reorderedPlans = arrayMove(activePlans, oldIndex, newIndex);

            // ACTUALIZACIÓN OPTIMISTA: Actualizar el estado local inmediatamente
            const optimisticallyUpdatedPlans = reorderedPlans.map((plan, index) => ({
                ...plan,
                orden: index + 1
            }));

            // Actualizar el estado local inmediatamente para una experiencia fluida
            if (onPlansReorder) {
                onPlansReorder(optimisticallyUpdatedPlans);
            }

            // Mostrar indicador de actualización
            setIsUpdatingOrder(true);

            try {
                // Actualizar el orden en la base de datos en segundo plano
                const updatePromises = reorderedPlans.map((plan, index) =>
                    fetch(`/api/plans/${plan.id}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            orden: index + 1
                        }),
                    })
                );

                await Promise.all(updatePromises);

                // Mostrar mensaje de éxito
                toast.success('Orden de planes actualizado exitosamente');
            } catch (error) {
                console.error('Error updating plan order:', error);

                // REVERTIR CAMBIOS: Si falla la API, revertir al estado anterior
                if (onPlansReorder) {
                    onPlansReorder(plans); // Revertir al estado original
                }

                toast.error('Error al actualizar el orden de los planes. Se revirtieron los cambios.');
            } finally {
                // Ocultar indicador de actualización
                setIsUpdatingOrder(false);
            }
        }
    };

    const handleEdit = (plan: Plan) => {
        // Navegar a la página de edición
        window.location.href = `/admin/plans/${plan.id}/edit`;
    };

    const handleDelete = (plan: Plan) => {
        setPlanToDelete(plan);
        setShowDeleteModal(true);
    };

    const handleConfirmDelete = async () => {
        if (!planToDelete) return;

        try {
            setIsDeleting(true);

            const response = await fetch(`/api/plans/${planToDelete.id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Error al eliminar el plan');
            }

            toast.success('Plan eliminado exitosamente');

            // Cerrar modal y limpiar estado
            setShowDeleteModal(false);
            setPlanToDelete(null);

            // Notificar al componente padre
            onPlanDelete(planToDelete.id);
        } catch (error) {
            console.error('Error deleting plan:', error);
            toast.error(error instanceof Error ? error.message : 'Error al eliminar el plan');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleCloseDeleteModal = () => {
        if (!isDeleting) {
            setShowDeleteModal(false);
            setPlanToDelete(null);
        }
    };

    const handleDuplicate = (plan: Plan) => {
        setPlanToDuplicate(plan);
        setShowDuplicateModal(true);
    };

    const handleConfirmDuplicate = async (duplicateData: {
        name: string;
        slug: string;
        active: boolean;
        popular: boolean;
    }) => {
        if (!planToDuplicate) return;

        try {
            setIsDuplicating(true);

            // Crear el objeto del plan duplicado
            const duplicatedPlan = {
                name: duplicateData.name,
                slug: duplicateData.slug,
                description: planToDuplicate.description, // Usar la descripción del plan original
                price_monthly: planToDuplicate.price_monthly,
                price_yearly: planToDuplicate.price_yearly,
                popular: duplicateData.popular,
                active: duplicateData.active,
                orden: Math.max(...plans.map(p => p.orden || 0)) + 1, // Último orden + 1
                // No incluir stripe_price_id ni stripe_product_id - se generarán automáticamente
            };

            const response = await fetch('/api/plans', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(duplicatedPlan),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Error al duplicar el plan');
            }

            const newPlan = await response.json();

            // Si el plan original tenía servicios configurados, duplicarlos
            if (planToDuplicate.id) {
                try {
                    const servicesResponse = await fetch(`/api/plans/${planToDuplicate.id}/services`);
                    if (servicesResponse.ok) {
                        const services = await servicesResponse.json();
                        const activeServices = services.filter((service: ServiceWithPlanConfig) => service.planService?.active);

                        // Configurar los mismos servicios en el plan duplicado
                        for (const service of activeServices) {
                            await fetch(`/api/plans/${newPlan.id}/services`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                    service_id: service.id,
                                    active: true,
                                    limite: service.planService?.limite,
                                    unidad: service.planService?.unidad
                                }),
                            });
                        }
                    }
                } catch (servicesError) {
                    console.warn('Error duplicando servicios del plan:', servicesError);
                    // No fallar la duplicación si hay error con los servicios
                }
            }

            toast.success('Plan duplicado exitosamente');

            // Cerrar modal y limpiar estado
            setShowDuplicateModal(false);
            setPlanToDuplicate(null);

            // Navegar a la página de edición del plan duplicado
            window.location.href = `/admin/plans/${newPlan.id}/edit`;
        } catch (error) {
            console.error('Error duplicating plan:', error);
            toast.error(error instanceof Error ? error.message : 'Error al duplicar el plan');
        } finally {
            setIsDuplicating(false);
        }
    };

    const handleCloseDuplicateModal = () => {
        if (!isDuplicating) {
            setShowDuplicateModal(false);
            setPlanToDuplicate(null);
        }
    };

    const handleToggleActive = async (planId: string) => {
        const plan = plans.find(p => p.id === planId);
        if (!plan) return;

        try {
            const response = await fetch(`/api/plans/${planId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    active: !plan.active
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Error al actualizar el plan');
            }

            const updatedPlan = await response.json();
            onPlanUpdate(updatedPlan);
            toast.success(`Plan ${updatedPlan.active ? 'activado' : 'desactivado'} exitosamente`);
        } catch (error) {
            console.error('Error toggling plan active status:', error);
            toast.error(error instanceof Error ? error.message : 'Error al actualizar el plan');
        }
    };

    const handleTogglePopular = async (planId: string) => {
        const plan = plans.find(p => p.id === planId);
        if (!plan) return;

        try {
            const response = await fetch(`/api/plans/${planId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    popular: !plan.popular
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Error al actualizar el plan');
            }

            const updatedPlan = await response.json();
            onPlanUpdate(updatedPlan);
            toast.success(`Plan ${updatedPlan.popular ? 'marcado como popular' : 'desmarcado como popular'} exitosamente`);
        } catch (error) {
            console.error('Error toggling plan popular status:', error);
            toast.error(error instanceof Error ? error.message : 'Error al actualizar el plan');
        }
    };

    const toggleSort = (newSortBy: SortType) => {
        if (sortBy === newSortBy) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(newSortBy);
            setSortOrder('asc');
        }
    };

    return (
        <div className="space-y-6">
            {/* Filtros y Búsqueda */}
            <Card>
                <CardHeader>
                    <CardTitle>Filtros y Búsqueda</CardTitle>
                    <CardDescription>
                        Encuentra planes específicos usando los filtros
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col gap-4 md:flex-row md:items-center">
                        {/* Búsqueda */}
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar por nombre, slug o descripción..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-8"
                                />
                            </div>
                        </div>

                        {/* Filtros */}
                        <div className="flex gap-2 flex-wrap">
                            <ZenButton
                                variant={filter === 'all' ? 'primary' : 'outline'}
                                onClick={() => setFilter('all')}
                                size="sm"
                                icon={Filter}
                                iconPosition="left"
                            >
                                Todos ({plans.length})
                            </ZenButton>
                            <ZenButton
                                variant={filter === 'active' ? 'primary' : 'outline'}
                                onClick={() => setFilter('active')}
                                size="sm"
                            >
                                Activos ({plans.filter(p => p.active).length})
                            </ZenButton>
                            <ZenButton
                                variant={filter === 'inactive' ? 'primary' : 'outline'}
                                onClick={() => setFilter('inactive')}
                                size="sm"
                            >
                                Inactivos ({plans.filter(p => !p.active).length})
                            </ZenButton>
                            <ZenButton
                                variant={filter === 'popular' ? 'primary' : 'outline'}
                                onClick={() => setFilter('popular')}
                                size="sm"
                            >
                                Populares ({plans.filter(p => p.popular).length})
                            </ZenButton>
                        </div>
                    </div>

                    {/* Ordenamiento */}
                    <div className="flex gap-2 mt-4 pt-4 border-t">
                        <span className="text-sm font-medium text-muted-foreground mr-2">Ordenar por:</span>
                        {[
                            { key: 'orden' as SortType, label: 'Orden' },
                            { key: 'name' as SortType, label: 'Nombre' },
                            { key: 'price' as SortType, label: 'Precio' },
                            { key: 'studios' as SortType, label: 'Estudios' }
                        ].map((sort) => (
                            <ZenButton
                                key={sort.key}
                                variant={sortBy === sort.key ? 'primary' : 'ghost'}
                                size="sm"
                                onClick={() => toggleSort(sort.key)}
                                className="text-xs"
                            >
                                {sort.label}
                                {sortBy === sort.key && (
                                    sortOrder === 'asc' ?
                                        <SortAsc className="ml-1 h-3 w-3" /> :
                                        <SortDesc className="ml-1 h-3 w-3" />
                                )}
                            </ZenButton>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Lista de Planes */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Lista de Planes</CardTitle>
                            <CardDescription>
                                Gestiona todos los planes de la plataforma. Arrastra las tarjetas para cambiar el orden en que se muestran a los prospectos.
                                {isUpdatingOrder && (
                                    <span className="ml-2 inline-flex items-center text-blue-500">
                                        <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Actualizando orden...
                                    </span>
                                )}
                            </CardDescription>
                        </div>
                        <Badge variant="outline">
                            {filteredAndSortedPlans.length} planes
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    {filteredAndSortedPlans.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-muted-foreground mb-4">
                                {searchTerm || filter !== 'all' ?
                                    'No se encontraron planes con los filtros aplicados' :
                                    'No hay planes creados aún'
                                }
                            </div>
                            {!searchTerm && filter === 'all' && (
                                <ZenButton asChild icon={Plus} iconPosition="left">
                                    <Link href="/admin/plans/new">
                                        Crear primer plan
                                    </Link>
                                </ZenButton>
                            )}
                        </div>
                    ) : (
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={filteredAndSortedPlans.map(plan => plan.id)}
                                strategy={rectSortingStrategy}
                                disabled={isUpdatingOrder}
                            >
                                <div className={`grid gap-6 md:grid-cols-2 lg:grid-cols-3 ${isUpdatingOrder ? 'opacity-75 pointer-events-none' : ''}`}>
                                    {filteredAndSortedPlans.map((plan) => (
                                        <PlanCardWrapper
                                            key={plan.id}
                                            plan={plan}
                                            onEdit={handleEdit}
                                            onDelete={handleDelete}
                                            onDuplicate={handleDuplicate}
                                            onToggleActive={handleToggleActive}
                                            onTogglePopular={handleTogglePopular}
                                        />
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                    )}
                </CardContent>
            </Card>

            {/* Modal de duplicación */}
            <DuplicatePlanModal
                isOpen={showDuplicateModal}
                onClose={handleCloseDuplicateModal}
                onConfirm={handleConfirmDuplicate}
                plan={planToDuplicate}
                isDuplicating={isDuplicating}
            />

            {/* Modal de eliminación */}
            <DeletePlanModal
                isOpen={showDeleteModal}
                onClose={handleCloseDeleteModal}
                onConfirm={handleConfirmDelete}
                plan={planToDelete}
                isDeleting={isDeleting}
            />
        </div>
    );
}
