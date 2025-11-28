'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { type DateRange } from 'react-day-picker';
import type { EventoDetalle } from '@/lib/actions/studio/business/events/events.actions';
import type { SeccionData } from '@/lib/actions/schemas/catalogo-schemas';
import { SchedulerV2 } from './SchedulerV2';
import { actualizarGanttTask } from '@/lib/actions/studio/business/events/gantt-actions';
import { crearGanttTask, eliminarGanttTask, actualizarGanttTask as actualizarGanttTaskComplete } from '@/lib/actions/studio/business/events';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { GanttAgrupacionCell } from './GanttAgrupacionCell';

type CotizacionItem = NonNullable<NonNullable<EventoDetalle['cotizaciones']>[0]['cotizacion_items']>[0];

interface ItemMetadata {
  seccionNombre: string;
  categoriaNombre: string;
  servicioNombre: string;
  servicioId: string;
}

interface EventGanttSchedulerV2Props {
  studioSlug: string;
  eventId: string;
  eventData: EventoDetalle;
  dateRange?: DateRange;
  secciones: SeccionData[];
}

export function EventGanttSchedulerV2({
  studioSlug,
  eventId,
  eventData,
  dateRange,
  secciones,
}: EventGanttSchedulerV2Props) {
  const router = useRouter();
  
  // Estado local para actualizaciones optimistas
  const [localEventData, setLocalEventData] = useState(eventData);

  // Construir map de items desde cotizaciones aprobadas
  // Usar localEventData para reflejar cambios inmediatamente
  const itemsMap = useMemo(() => {
    const map = new Map<string, CotizacionItem>();

    localEventData.cotizaciones?.forEach((cotizacion) => {
      if (cotizacion.status === 'autorizada' || cotizacion.status === 'aprobada' || cotizacion.status === 'approved') {
        cotizacion.cotizacion_items?.forEach((item) => {
          // Indexar por item_id para que coincida con servicio.id del catálogo
          if (item.item_id) {
            map.set(item.item_id, item);
          }
        });
      }
    });

    return map;
  }, [localEventData.cotizaciones]);

  // Filtrar secciones del catálogo para mostrar solo items que están en la cotización
  const seccionesFiltradasConItems = useMemo(() => {
    return secciones
      .map((seccion) => ({
        ...seccion,
        categorias: seccion.categorias
          .map((categoria) => ({
            ...categoria,
            servicios: categoria.servicios.filter((servicio) => itemsMap.has(servicio.id)),
          }))
          .filter((categoria) => categoria.servicios.length > 0),
      }))
      .filter((seccion) => seccion.categorias.length > 0);
  }, [secciones, itemsMap]);

  // Manejar actualización de tareas
  const handleTaskUpdate = useCallback(
    async (taskId: string, startDate: Date, endDate: Date) => {
      try {
        // Actualización optimista: actualizar el estado local primero
        setLocalEventData(prev => {
          const newData = { ...prev };
          
          newData.cotizaciones = prev.cotizaciones?.map(cotizacion => ({
            ...cotizacion,
            cotizacion_items: cotizacion.cotizacion_items?.map(item => {
              if (item.gantt_task?.id === taskId) {
                return {
                  ...item,
                  gantt_task: item.gantt_task ? {
                    ...item.gantt_task,
                    start_date: startDate,
                    end_date: endDate,
                  } : null,
                };
              }
              return item;
            }),
          }));

          return newData;
        });

        const result = await actualizarGanttTask(studioSlug, eventId, taskId, {
          start_date: startDate,
          end_date: endDate,
        });

        if (!result.success) {
          toast.error(result.error || 'Error al actualizar la tarea');
          throw new Error(result.error);
        }

        toast.success('Tarea actualizada correctamente');
        router.refresh();
      } catch (error) {
        console.error('Error updating task:', error);
        throw error;
      }
    },
    [studioSlug, eventId, router]
  );

  // Manejar creación de tareas (click en slot vacío)
  const handleTaskCreate = useCallback(
    async (itemId: string, catalogItemId: string, itemName: string, startDate: Date) => {
      try {
        // Crear tarea con 1 día de duración por defecto
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate()); // Mismo día inicialmente

        const result = await crearGanttTask(studioSlug, eventId, {
          itemId,
          name: itemName,
          startDate,
          endDate,
        });

        if (!result.success) {
          toast.error(result.error || 'Error al crear la tarea');
          return;
        }

        // Actualización optimista: agregar la tarea al estado local inmediatamente
        setLocalEventData(prev => {
          const newData = { ...prev };
          
          // Buscar y actualizar el item en las cotizaciones
          newData.cotizaciones = prev.cotizaciones?.map(cotizacion => ({
            ...cotizacion,
            cotizacion_items: cotizacion.cotizacion_items?.map(item => {
              // Encontrar el item correcto por item_id del catálogo
              if (item.item_id === catalogItemId && result.data) {
                const taskData = result.data as any;
                return {
                  ...item,
                  gantt_task_id: taskData.id,
                  gantt_task: {
                    id: taskData.id,
                    name: itemName,
                    start_date: startDate,
                    end_date: endDate,
                    status: 'PENDING',
                    progress_percent: 0,
                    completed_at: null,
                    assigned_to_user_id: null,
                    depends_on_task_id: null,
                  },
                };
              }
              return item;
            }),
          }));

          return newData;
        });

        toast.success('Slot asignado correctamente');
        router.refresh();
      } catch (error) {
        console.error('Error creating task:', error);
        toast.error('Error al asignar el slot');
      }
    },
    [studioSlug, eventId, router]
  );

  // Manejar eliminación de tareas (vaciar slot)
  const handleTaskDelete = useCallback(
    async (taskId: string) => {
      try {
        const result = await eliminarGanttTask(studioSlug, eventId, taskId);

        if (!result.success) {
          toast.error(result.error || 'Error al eliminar la tarea');
          return;
        }

        // Actualización optimista: remover la tarea del estado local
        setLocalEventData(prev => {
          const newData = { ...prev };
          
          newData.cotizaciones = prev.cotizaciones?.map(cotizacion => ({
            ...cotizacion,
            cotizacion_items: cotizacion.cotizacion_items?.map(item => {
              if (item.gantt_task?.id === taskId) {
                return {
                  ...item,
                  gantt_task_id: null,
                  gantt_task: null,
                };
              }
              return item;
            }),
          }));

          return newData;
        });

        toast.success('Slot vaciado correctamente');
        router.refresh();
      } catch (error) {
        console.error('Error deleting task:', error);
        toast.error('Error al vaciar el slot');
      }
    },
    [studioSlug, eventId, router]
  );

  // Manejar toggle de completado desde TaskBar
  const handleTaskToggleComplete = useCallback(
    async (taskId: string, isCompleted: boolean) => {
      try {
        const result = await actualizarGanttTaskComplete(studioSlug, eventId, taskId, {
          isCompleted,
        });

        if (!result.success) {
          toast.error(result.error || 'Error al actualizar el estado');
          return;
        }

        // Actualización optimista: actualizar completed_at
        setLocalEventData(prev => {
          const newData = { ...prev };
          
          newData.cotizaciones = prev.cotizaciones?.map(cotizacion => ({
            ...cotizacion,
            cotizacion_items: cotizacion.cotizacion_items?.map(item => {
              if (item.gantt_task?.id === taskId) {
                return {
                  ...item,
                  gantt_task: item.gantt_task ? {
                    ...item.gantt_task,
                    completed_at: isCompleted ? new Date() : null,
                  } : null,
                };
              }
              return item;
            }),
          }));

          return newData;
        });

        toast.success(isCompleted ? 'Tarea completada' : 'Tarea marcada como pendiente');
        router.refresh();
      } catch (error) {
        console.error('Error toggling complete:', error);
        toast.error('Error al actualizar el estado');
      }
    },
    [studioSlug, eventId, router]
  );

  // Renderizar item en sidebar
  const renderSidebarItem = useCallback(
    (item: CotizacionItem, metadata: ItemMetadata) => {
      const isCompleted = !!item.gantt_task?.completed_at;
      
      return (
        <GanttAgrupacionCell
          servicio={metadata.servicioNombre}
          isCompleted={isCompleted}
          assignedCrewMember={item.assigned_to_crew_member}
        />
      );
    },
    []
  );

  if (!dateRange?.from || !dateRange?.to) {
    return (
      <div className="flex items-center justify-center h-[400px] border border-zinc-800 rounded-lg bg-zinc-900/20">
        <p className="text-zinc-600">Configura el rango de fechas para usar el scheduler</p>
      </div>
    );
  }

  if (itemsMap.size === 0 || seccionesFiltradasConItems.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] border border-zinc-800 rounded-lg bg-zinc-900/20">
        <p className="text-zinc-600">No hay items para mostrar en el scheduler</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <SchedulerV2
        secciones={seccionesFiltradasConItems}
        itemsMap={itemsMap}
        studioSlug={studioSlug}
        eventId={eventId}
        dateRange={dateRange}
        onTaskUpdate={handleTaskUpdate}
        onTaskCreate={handleTaskCreate}
        onTaskDelete={handleTaskDelete}
        onTaskToggleComplete={handleTaskToggleComplete}
        renderSidebarItem={renderSidebarItem}
      />
    </div>
  );
}

