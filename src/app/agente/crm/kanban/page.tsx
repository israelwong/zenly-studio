'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/browser';
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    PointerSensor,
    useSensor,
    useSensors,
    closestCorners,
    pointerWithin,
    getFirstCollision,
    CollisionDetection,
} from '@dnd-kit/core';
import {
    DraggableLeadCard,
    DroppableColumn,
    KanbanHeader,
    KanbanFilters,
    KanbanSummary,
    LoadingState,
    ErrorState
} from './components';
import { Lead, KanbanColumn } from './types';


export default function AgentKanbanPage() {
    const [columns, setColumns] = useState<KanbanColumn[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStudio, setFilterStudio] = useState('all');
    const [filterPriority, setFilterPriority] = useState('all');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeLead, setActiveLead] = useState<Lead | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);

    // Configuración de sensores para drag and drop
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    // Estrategia de colisiones personalizada para soportar columnas vacías
    const collisionDetection: CollisionDetection = (args) => {
        const pointerIntersections = pointerWithin(args);

        if (pointerIntersections.length > 0) {
            const overId = getFirstCollision(pointerIntersections, 'id');
            if (overId != null) {
                return [{ id: overId }];
            }
        }
        // Fallback a closestCorners (más estable que closestCenter para layouts irregulares)
        return closestCorners(args);
    };

    const fetchKanbanData = useCallback(async () => {
        const supabase = createClient();

        try {
            setError(null);
            setLoading(true);
            console.log('🔍 Cargando datos del Kanban...');

            // Verificar autenticación (temporalmente opcional ya que RLS está deshabilitado)
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            console.log('🔍 Estado de autenticación:', { user: user?.email, authError });

            if (authError) {
                console.warn('⚠️ Error de autenticación (continuando sin autenticación):', authError);
            }

            if (!user) {
                console.warn('⚠️ Usuario no autenticado (continuando sin autenticación)');
            }

            // Obtener pipeline stages
            console.log('📋 Obteniendo pipeline stages...');
            const { data: stages, error: stagesError } = await supabase
                .from('platform_pipeline_stages')
                .select('*')
                .eq('isActive', true)
                .order('orden', { ascending: true });

            if (stagesError) {
                console.error('❌ Error obteniendo stages:', stagesError);
                setError('Error al cargar las etapas del pipeline');
                setLoading(false);
                return;
            }

            console.log('✅ Pipeline stages obtenidos:', stages?.length || 0);

            // Obtener leads con sus etapas
            console.log('📋 Obteniendo leads...');
            const { data: leads, error: leadsError } = await supabase
                .from('platform_leads')
                .select(`
                    id,
                    nombre,
                    email,
                    telefono,
                    nombreEstudio,
                    studioId,
                    fechaUltimoContacto,
                    planInteres,
                    presupuestoMensual,
                    puntaje,
                    prioridad,
                    createdAt,
                    updatedAt,
                    etapaId,
                    canalAdquisicionId,
                    agentId,
                    platform_canales_adquisicion (
                        id,
                        nombre
                    ),
                    platform_agents (
                        id,
                        nombre
                    )
                `)
                .order('createdAt', { ascending: false });

            if (leadsError) {
                console.error('❌ Error obteniendo leads:', leadsError);
                setError('Error al cargar los leads');
                setLoading(false);
                return;
            }

            console.log('✅ Leads obtenidos:', leads?.length || 0);

            // Obtener información de suscripciones para los estudios
            console.log('📋 Obteniendo información de suscripciones...');
            const studioIds = [...new Set((leads || []).map(lead => lead.studioId).filter(Boolean))];

            let subscriptionsData: Array<{
                studio_id: string;
                status: string;
                plans: {
                    id: string;
                    name: string;
                    price_monthly: number | null;
                    price_yearly: number | null;
                };
            }> = [];
            if (studioIds.length > 0) {
                const { data: subscriptions, error: subscriptionsError } = await supabase
                    .from('subscriptions')
                    .select(`
                        studio_id,
                        status,
                        plans (
                            id,
                            name,
                            price_monthly,
                            price_yearly
                        )
                    `)
                    .in('studio_id', studioIds)
                    .eq('status', 'active');

                if (subscriptionsError) {
                    console.warn('⚠️ Error obteniendo suscripciones:', subscriptionsError);
                } else {
                    subscriptionsData = (subscriptions || []) as unknown as typeof subscriptionsData;
                    console.log('✅ Suscripciones obtenidas:', subscriptionsData.length);
                }
            }

            // Crear un mapa de studio_id -> precio de suscripción
            const subscriptionMap = new Map();
            subscriptionsData.forEach(sub => {
                if (sub.plans) {
                    const price = sub.plans.price_monthly ? Number(sub.plans.price_monthly) :
                        sub.plans.price_yearly ? Number(sub.plans.price_yearly) / 12 : 0;
                    subscriptionMap.set(sub.studio_id, price);
                }
            });

            // Mapear leads al formato esperado
            const mappedLeads: Lead[] = (leads || []).map(lead => {
                const subscriptionPrice = lead.studioId ? subscriptionMap.get(lead.studioId) : null;
                return {
                    id: lead.id,
                    name: lead.nombre,
                    email: lead.email,
                    phone: lead.telefono,
                    studio: lead.nombreEstudio || 'Sin estudio',
                    stage: lead.etapaId || 'Sin etapa',
                    value: lead.presupuestoMensual ? Number(lead.presupuestoMensual) : 0,
                    priority: lead.prioridad === 'alta' ? 'high' : lead.prioridad === 'media' ? 'medium' : 'low',
                    lastActivity: lead.fechaUltimoContacto ? new Date(lead.fechaUltimoContacto).toLocaleDateString() : 'Sin actividad',
                    assignedAgent: (lead.platform_agents as unknown as { nombre: string } | null)?.nombre || (lead.agentId ? 'Agente asignado' : 'Sin asignar'),
                    source: (lead.platform_canales_adquisicion as unknown as { nombre: string } | null)?.nombre || 'Sin canal',
                    notes: `Lead con ${lead.planInteres || 'plan no especificado'}`,
                    etapaId: lead.etapaId,
                    hasSubscription: subscriptionPrice !== null && subscriptionPrice > 0,
                    subscriptionPrice: subscriptionPrice,
                    createdAt: lead.createdAt,
                    updatedAt: lead.updatedAt
                };
            });

            // Crear columnas del Kanban
            const kanbanColumns: KanbanColumn[] = (stages || []).map(stage => {
                const stageLeads = mappedLeads.filter(lead => lead.etapaId === stage.id);
                const totalSubscriptionValue = stageLeads.reduce((sum, lead) => {
                    return sum + (lead.subscriptionPrice || 0);
                }, 0);

                return {
                    id: stage.id,
                    title: stage.nombre,
                    color: stage.color || '#3B82F6',
                    stage: stage,
                    leads: stageLeads,
                    totalSubscriptionValue
                };
            });

            // Agregar columna para leads sin etapa asignada
            const leadsWithoutStage = mappedLeads.filter(lead => !lead.etapaId);
            if (leadsWithoutStage.length > 0) {
                const totalSubscriptionValueWithoutStage = leadsWithoutStage.reduce((sum, lead) => {
                    return sum + (lead.subscriptionPrice || 0);
                }, 0);

                kanbanColumns.unshift({
                    id: 'sin-etapa',
                    title: 'Sin Etapa',
                    color: '#6B7280',
                    stage: {
                        id: 'sin-etapa',
                        nombre: 'Sin Etapa',
                        descripcion: 'Leads sin etapa asignada',
                        color: '#6B7280',
                        orden: -1,
                        isActive: true
                    },
                    leads: leadsWithoutStage,
                    totalSubscriptionValue: totalSubscriptionValueWithoutStage
                });
            }

            setColumns(kanbanColumns);
            console.log('✅ Kanban configurado con', kanbanColumns.length, 'columnas');

        } catch (error) {
            console.error('❌ Error inesperado:', error);
            setError('Error inesperado al cargar los datos del Kanban');
        } finally {
            setLoading(false);
        }
    }, []);

    // Función para actualizar la etapa de un lead usando API route
    const updateLeadStage = useCallback(async (leadId: string, newStageId: string | undefined, oldStageId?: string) => {
        try {
            setIsUpdating(true);
            console.log(`🔄 Actualizando lead ${leadId} de etapa ${oldStageId} a etapa ${newStageId}`);

            // Llamar a la API route
            const response = await fetch(`/api/leads/${leadId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    etapaId: newStageId || null,
                    oldStageId: oldStageId
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Error al actualizar el lead');
            }

            const updatedLead = await response.json();
            console.log('✅ Lead actualizado exitosamente:', updatedLead);

        } catch (error) {
            console.error('❌ Error actualizando lead:', error);
            throw error;
        } finally {
            setIsUpdating(false);
        }
    }, []);

    useEffect(() => {
        fetchKanbanData();
    }, [fetchKanbanData]);

    // Función para manejar el inicio del drag
    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const lead = columns
            .flatMap(col => col.leads)
            .find(lead => lead.id === active.id);

        if (lead) {
            setActiveLead(lead);
        }
    };

    // Función para manejar el final del drag
    const handleDragEnd = async (event: DragEndEvent) => {
        setActiveLead(null);
        const { active, over } = event;

        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        if (activeId === overId) return;

        const findContainer = (id: string) => {
            // Primero verificar si el ID es directamente una etapa/columna
            const columnExists = columns.find(col => col.id === id);
            if (columnExists) {
                return id;
            }

            // Finalmente, buscar en qué columna está el lead
            for (const column of columns) {
                if (column.leads.some(lead => lead.id === id)) {
                    return column.id;
                }
            }
            return null;
        };

        const activeContainer = findContainer(activeId);
        let overContainer: string | null = null;

        // Determinar el contenedor de destino usando la información de data si está disponible
        if (over.data?.current?.type === 'column') {
            overContainer = over.data.current.etapaId;
        } else {
            overContainer = findContainer(overId);
        }

        // Si no se encontró contenedor, verificar si overId es directamente una etapa
        if (!overContainer) {
            const esEtapaValida = columns.some(col => col.id === overId);
            if (esEtapaValida) {
                overContainer = overId;
            }
        }

        console.log('🔍 Drag End Debug:');
        console.log('activeId:', activeId);
        console.log('overId:', overId);
        console.log('activeContainer:', activeContainer);
        console.log('overContainer:', overContainer);

        if (!activeContainer || !overContainer) {
            console.log('❌ No se encontraron contenedores válidos');
            return;
        }

        // Si el lead se mueve a la misma columna, no hacer nada
        if (activeContainer === overContainer) return;

        try {
            // ACTUALIZACIÓN OPTIMISTA: Actualizar el estado local inmediatamente
            setColumns(prevColumns => {
                const newColumns = [...prevColumns];

                // Encontrar las columnas de origen y destino
                const sourceColumnIndex = newColumns.findIndex(col => col.id === activeContainer);
                const targetColumnIndex = newColumns.findIndex(col => col.id === overContainer);

                if (sourceColumnIndex === -1 || targetColumnIndex === -1) return prevColumns;

                const sourceColumn = newColumns[sourceColumnIndex];
                const targetColumn = newColumns[targetColumnIndex];

                // Remover el lead de la columna de origen
                const leadToMove = sourceColumn.leads.find(lead => lead.id === activeId);
                if (!leadToMove) return prevColumns;

                newColumns[sourceColumnIndex] = {
                    ...sourceColumn,
                    leads: sourceColumn.leads.filter(lead => lead.id !== activeId)
                };

                // Agregar el lead a la columna de destino
                newColumns[targetColumnIndex] = {
                    ...targetColumn,
                    leads: [...targetColumn.leads, { ...leadToMove, etapaId: overContainer }]
                };

                return newColumns;
            });

            // Actualizar en la base de datos (sin actualización optimista adicional)
            await updateLeadStage(
                activeId,
                overContainer === 'sin-etapa' ? undefined : overContainer,
                activeContainer === 'sin-etapa' ? undefined : activeContainer
            );

        } catch (error) {
            console.error('❌ Error moviendo lead:', error);

            // REVERTIR CAMBIOS: Si falla la API, revertir al estado anterior
            setColumns(prevColumns => {
                const newColumns = [...prevColumns];

                // Encontrar las columnas de origen y destino
                const sourceColumnIndex = newColumns.findIndex(col => col.id === overContainer);
                const targetColumnIndex = newColumns.findIndex(col => col.id === activeContainer);

                if (sourceColumnIndex === -1 || targetColumnIndex === -1) return prevColumns;

                const sourceColumn = newColumns[sourceColumnIndex];
                const targetColumn = newColumns[targetColumnIndex];

                // Remover el lead de la columna de destino (donde se movió optimísticamente)
                const leadToRevert = sourceColumn.leads.find(lead => lead.id === activeId);
                if (!leadToRevert) return prevColumns;

                newColumns[sourceColumnIndex] = {
                    ...sourceColumn,
                    leads: sourceColumn.leads.filter(lead => lead.id !== activeId)
                };

                // Devolver el lead a la columna de origen
                newColumns[targetColumnIndex] = {
                    ...targetColumn,
                    leads: [...targetColumn.leads, { ...leadToRevert, etapaId: activeContainer }]
                };

                return newColumns;
            });
        }
    };


    const filteredColumns = columns.map(column => ({
        ...column,
        leads: column.leads.filter(lead => {
            const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                lead.studio.toLowerCase().includes(searchTerm.toLowerCase()) ||
                lead.email.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStudio = filterStudio === 'all' || lead.studio === filterStudio;
            const matchesPriority = filterPriority === 'all' || lead.priority === filterPriority;

            return matchesSearch && matchesStudio && matchesPriority;
        })
    }));

    const studios = Array.from(new Set(columns.flatMap(col => col.leads.map(lead => lead.studio))));

    if (loading) {
        return <LoadingState />;
    }

    if (error) {
        return (
            <ErrorState
                error={error}
                onRetry={() => {
                    setError(null);
                    setLoading(true);
                    fetchKanbanData();
                }}
            />
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <KanbanHeader onNewLead={() => {
                // TODO: Implementar navegación a nuevo lead
                console.log('Nuevo lead clicked');
            }} />

            {/* Filtros */}
            <KanbanFilters
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                filterStudio={filterStudio}
                onStudioChange={setFilterStudio}
                filterPriority={filterPriority}
                onPriorityChange={setFilterPriority}
                studios={studios}
            />

            {/* Kanban Board */}
            <DndContext
                sensors={sensors}
                collisionDetection={collisionDetection}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                    {filteredColumns.map((column) => (
                        <DroppableColumn
                            key={column.id}
                            column={column}
                            isUpdating={isUpdating}
                        />
                    ))}
                </div>

                <DragOverlay>
                    {activeLead ? (
                        <DraggableLeadCard lead={activeLead} isUpdating={false} />
                    ) : null}
                </DragOverlay>
            </DndContext>

            {/* Resumen */}
            <KanbanSummary columns={filteredColumns} />
        </div>
    );
}