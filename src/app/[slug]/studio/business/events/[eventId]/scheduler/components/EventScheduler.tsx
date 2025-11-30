'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { type DateRange } from 'react-day-picker';
import type { EventoDetalle } from '@/lib/actions/studio/business/events/events.actions';
import type { SeccionData } from '@/lib/actions/schemas/catalogo-schemas';
import { SchedulerPanel } from './SchedulerPanel';
import { actualizarSchedulerTaskFechas } from '@/lib/actions/studio/business/events/scheduler-actions';
import { crearSchedulerTask, eliminarSchedulerTask, actualizarSchedulerTask } from '@/lib/actions/studio/business/events';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { SchedulerAgrupacionCell } from './SchedulerAgrupacionCell';
import { AssignCrewBeforeCompleteModal } from './AssignCrewBeforeCompleteModal';

type CotizacionItem = NonNullable<NonNullable<EventoDetalle['cotizaciones']>[0]['cotizacion_items']>[0];

interface CreatedSchedulerTask {
  id: string;
  name: string;
  start_date: Date;
  end_date: Date;
  status: string;
  progress_percent: number;
  completed_at: Date | null;
  cotizacion_item: {
    id: string;
    assigned_to_crew_member_id: string | null;
  };
}

interface ItemMetadata {
  seccionNombre: string;
  categoriaNombre: string;
  servicioNombre: string;
  servicioId: string;
}

interface EventSchedulerProps {
  studioSlug: string;
  eventId: string;
  eventData: EventoDetalle;
  dateRange?: DateRange;
  secciones: SeccionData[];
  onDataChange?: (data: EventoDetalle) => void;
}

export function EventScheduler({
  studioSlug,
  eventId,
  eventData,
  dateRange,
  secciones,
  onDataChange,
}: EventSchedulerProps) {
  const router = useRouter();

  // Estado local para actualizaciones optimistas
  const [localEventData, setLocalEventData] = useState(eventData);
  const [assignCrewModalOpen, setAssignCrewModalOpen] = useState(false);
  const [pendingTaskCompletion, setPendingTaskCompletion] = useState<{
    taskId: string;
    itemId: string;
    itemName: string;
    costoTotal: number;
  } | null>(null);

  // Callback para actualizar un item específico en localEventData
  const handleItemUpdate = useCallback((updatedItem: CotizacionItem) => {
    let updatedData: EventoDetalle;
    setLocalEventData(prev => {
      const newData = {
        ...prev,
        cotizaciones: prev.cotizaciones?.map(cotizacion => ({
          ...cotizacion,
          cotizacion_items: cotizacion.cotizacion_items?.map(item => {
            if (item.id === updatedItem.id) {
              // Asegurar que el item actualizado tenga todos los campos necesarios
              // Especialmente importante para scheduler_task cuando se completa
              // Preservar todos los campos del scheduler_task original y mergear con los actualizados
              const mergedSchedulerTask = updatedItem.scheduler_task && item.scheduler_task
                ? {
                  ...item.scheduler_task, // Preservar campos originales (start_date, end_date, etc.)
                  ...updatedItem.scheduler_task, // Sobrescribir con campos actualizados (completed_at, status, progress_percent, etc.)
                }
                : (updatedItem.scheduler_task || item.scheduler_task);

              // Mergear el item completo preservando todos los campos originales
              // y sobrescribiendo solo los campos actualizados
              const mergedItem = {
                ...item, // Preservar todos los campos originales del item
                ...updatedItem, // Sobrescribir con campos actualizados
                // Asegurar que assigned_to_crew_member_id se preserve correctamente
                assigned_to_crew_member_id: updatedItem.assigned_to_crew_member_id !== undefined
                  ? updatedItem.assigned_to_crew_member_id
                  : item.assigned_to_crew_member_id,
                assigned_to_crew_member: updatedItem.assigned_to_crew_member !== undefined
                  ? updatedItem.assigned_to_crew_member
                  : item.assigned_to_crew_member,
                scheduler_task: mergedSchedulerTask,
              };
              return mergedItem;
            }
            return item;
          }),
        })),
      };
      updatedData = newData;
      return newData;
    });

    // Notificar al padre para actualizar stats inmediatamente
    if (updatedData! && onDataChange) {
      onDataChange(updatedData);
    }
  }, [onDataChange]);

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
        let updatedData: EventoDetalle;
        setLocalEventData(prev => {
          const newData = { ...prev };

          newData.cotizaciones = prev.cotizaciones?.map(cotizacion => ({
            ...cotizacion,
            cotizacion_items: cotizacion.cotizacion_items?.map(item => {
              if (item.scheduler_task?.id === taskId) {
                return {
                  ...item,
                  scheduler_task: item.scheduler_task ? {
                    ...item.scheduler_task,
                    start_date: startDate,
                    end_date: endDate,
                  } : null,
                };
              }
              return item;
            }),
          }));

          updatedData = newData;
          return newData;
        });

        // Notificar al padre del cambio
        if (updatedData! && onDataChange) {
          onDataChange(updatedData);
        }

        const result = await actualizarSchedulerTaskFechas(studioSlug, eventId, taskId, {
          start_date: startDate,
          end_date: endDate,
        });

        if (!result.success) {
          toast.error(result.error || 'Error al actualizar la tarea');
          throw new Error(result.error);
        }

        toast.success('Tarea actualizada correctamente');
      } catch (error) {
        throw error;
      }
    },
    [studioSlug, eventId, router, onDataChange]
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
        let updatedData: EventoDetalle;
        setLocalEventData(prev => {
          const newData = { ...prev };

          // Buscar y actualizar el item en las cotizaciones
          newData.cotizaciones = prev.cotizaciones?.map(cotizacion => ({
            ...cotizacion,
            cotizacion_items: cotizacion.cotizacion_items?.map(item => {
              // Encontrar el item correcto por item_id del catálogo
              if (item.item_id === catalogItemId && result.data) {
                const taskData = result.data as CreatedSchedulerTask;
                return {
                  ...item,
                  scheduler_task_id: taskData.id,
                  scheduler_task: {
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

          updatedData = newData;
          return newData;
        });

        // Notificar al padre del cambio
        if (updatedData! && onDataChange) {
          onDataChange(updatedData);
        }

        toast.success('Slot asignado correctamente');
      } catch (error) {
        toast.error('Error al asignar el slot');
      }
    },
    [studioSlug, eventId, router, onDataChange]
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
        let updatedData: EventoDetalle;
        setLocalEventData(prev => {
          const newData = { ...prev };

          newData.cotizaciones = prev.cotizaciones?.map(cotizacion => ({
            ...cotizacion,
            cotizacion_items: cotizacion.cotizacion_items?.map(item => {
              if (item.scheduler_task?.id === taskId) {
                return {
                  ...item,
                  scheduler_task_id: null,
                  scheduler_task: null,
                };
              }
              return item;
            }),
          }));

          updatedData = newData;
          return newData;
        });

        // Notificar al padre del cambio
        if (updatedData! && onDataChange) {
          onDataChange(updatedData);
        }

        toast.success('Slot vaciado correctamente');
      } catch (error) {
        toast.error('Error al vaciar el slot');
      }
    },
    [studioSlug, eventId, router, onDataChange]
  );

  // Manejar toggle de completado desde TaskBar
  const handleTaskToggleComplete = useCallback(
    async (taskId: string, isCompleted: boolean) => {
      // Si se está desmarcando, proceder normalmente
      if (!isCompleted) {
        try {
          const result = await actualizarSchedulerTask(studioSlug, eventId, taskId, {
            isCompleted: false,
          });

          if (!result.success) {
            toast.error(result.error || 'Error al actualizar el estado');
            return;
          }

          // Actualización optimista
          let updatedDataUncomplete: EventoDetalle;
          setLocalEventData(prev => {
            const newData = {
              ...prev,
              cotizaciones: prev.cotizaciones?.map(cotizacion => ({
                ...cotizacion,
                cotizacion_items: cotizacion.cotizacion_items?.map(item => {
                  if (item.scheduler_task?.id === taskId) {
                    return {
                      ...item,
                      scheduler_task: item.scheduler_task ? {
                        ...item.scheduler_task,
                        completed_at: null,
                      } : null,
                    };
                  }
                  return item;
                }),
              })),
            };
            updatedDataUncomplete = newData;
            return newData;
          });

          // Notificar al padre para actualizar stats
          if (updatedDataUncomplete! && onDataChange) {
            onDataChange(updatedDataUncomplete);
          }

          toast.success('Tarea marcada como pendiente');
        } catch (error) {
          toast.error('Error al actualizar el estado');
        }
        return;
      }

      // Si se está completando, buscar el item asociado
      let itemFound: CotizacionItem | null = null;
      for (const cotizacion of localEventData.cotizaciones || []) {
        itemFound = cotizacion.cotizacion_items?.find(
          (item) => item.scheduler_task?.id === taskId
        ) || null;
        if (itemFound) break;
      }

      if (!itemFound) {
        toast.error('No se encontró el item asociado a la tarea');
        return;
      }

      // Calcular costo
      const costoUnitario = itemFound.cost ?? itemFound.cost_snapshot ?? 0;
      const costoTotal = costoUnitario * (itemFound.quantity || 1);
      const itemName = itemFound.name || itemFound.name_snapshot || 'Tarea sin nombre';

      // Si no hay personal asignado y tiene costo, mostrar modal
      if (!itemFound.assigned_to_crew_member_id && costoTotal > 0) {
        setPendingTaskCompletion({
          taskId,
          itemId: itemFound.id,
          itemName,
          costoTotal,
        });
        setAssignCrewModalOpen(true);
        return;
      }

      // Si hay personal o no tiene costo, proceder normalmente
      try {
        const result = await actualizarGanttTask(studioSlug, eventId, taskId, {
          isCompleted: true,
        });

        if (!result.success) {
          toast.error(result.error || 'Error al actualizar el estado');
          return;
        }

        // Actualización optimista
        let updatedData: EventoDetalle;
        setLocalEventData(prev => {
          const newData = {
            ...prev,
            cotizaciones: prev.cotizaciones?.map(cotizacion => ({
              ...cotizacion,
              cotizacion_items: cotizacion.cotizacion_items?.map(item => {
                if (item.scheduler_task?.id === taskId) {
                  return {
                    ...item,
                    scheduler_task: item.scheduler_task ? {
                      ...item.scheduler_task,
                      completed_at: isCompleted ? new Date().toISOString() : null,
                      status: isCompleted ? 'COMPLETED' : 'PENDING',
                      progress_percent: isCompleted ? 100 : (item.scheduler_task.progress_percent || 0),
                    } : null,
                  };
                }
                return item;
              }),
            })),
          };
          updatedData = newData;
          return newData;
        });

        // Notificar al padre para actualizar stats
        if (updatedData! && onDataChange) {
          onDataChange(updatedData);
        }

        // Mostrar toast según resultado de nómina
        if (result.payrollResult) {
          if (result.payrollResult.success && result.payrollResult.personalNombre) {
            toast.success(`Tarea completada. Se generó pago de nómina para ${result.payrollResult.personalNombre}`);
          } else {
            toast.warning(`Tarea completada. No se generó pago de nómina: ${result.payrollResult.error || 'Sin personal asignado'}`);
          }
        } else if (!itemFound.assigned_to_crew_member_id) {
          toast.warning('Tarea completada. No se generó pago porque no hay personal asignado.');
        } else {
          toast.success('Tarea completada');
        }
      } catch (error) {
        toast.error('Error al actualizar el estado');
      }
    },
    [studioSlug, eventId, router, onDataChange, localEventData]
  );

  // Handler para asignar y completar desde el modal
  const handleAssignAndComplete = useCallback(
    async (crewMemberId: string) => {
      if (!pendingTaskCompletion) return;

      try {
        // Asignar personal
        const { asignarCrewAItem } = await import('@/lib/actions/studio/business/events');
        const assignResult = await asignarCrewAItem(
          studioSlug,
          pendingTaskCompletion.itemId,
          crewMemberId
        );

        if (!assignResult.success) {
          toast.error(assignResult.error || 'Error al asignar personal');
          return;
        }

        // Obtener el crew member completo para actualizar el item
        const { obtenerCrewMembers } = await import('@/lib/actions/studio/business/events');
        const crewResult = await obtenerCrewMembers(studioSlug);
        const crewMember = crewResult.success && crewResult.data
          ? crewResult.data.find(m => m.id === crewMemberId)
          : null;

        // Actualizar estado local del item con crew member completo
        setLocalEventData(prev => ({
          ...prev,
          cotizaciones: prev.cotizaciones?.map(cotizacion => ({
            ...cotizacion,
            cotizacion_items: cotizacion.cotizacion_items?.map(item => {
              if (item.id === pendingTaskCompletion.itemId) {
                return {
                  ...item,
                  assigned_to_crew_member_id: crewMemberId,
                  assigned_to_crew_member: crewMember ? {
                    id: crewMember.id,
                    name: crewMember.name,
                    tipo: crewMember.tipo as 'OPERATIVO' | 'ADMINISTRATIVO' | 'PROVEEDOR',
                  } : null,
                };
              }
              return item;
            }),
          })),
        }));

        // Completar la tarea (esto creará la nómina automáticamente)
        const result = await actualizarGanttTask(studioSlug, eventId, pendingTaskCompletion.taskId, {
          isCompleted: true,
        });

        if (!result.success) {
          toast.error(result.error || 'Error al completar la tarea');
          return;
        }

        // Actualización optimista
        let updatedData: EventoDetalle;
        setLocalEventData(prev => {
          const newData = {
            ...prev,
            cotizaciones: prev.cotizaciones?.map(cotizacion => ({
              ...cotizacion,
              cotizacion_items: cotizacion.cotizacion_items?.map(item => {
                if (item.scheduler_task?.id === pendingTaskCompletion.taskId) {
                  return {
                    ...item,
                    scheduler_task: item.scheduler_task ? {
                      ...item.scheduler_task,
                      completed_at: new Date().toISOString(),
                      status: 'COMPLETED',
                      progress_percent: 100,
                    } : null,
                  };
                }
                return item;
              }),
            })),
          };
          updatedData = newData;
          return newData;
        });

        // Notificar al padre
        if (updatedData! && onDataChange) {
          onDataChange(updatedData);
        }

        // Mostrar toast con información de nómina
        if (result.payrollResult?.success && result.payrollResult.personalNombre) {
          toast.success(`Personal asignado y tarea completada. Se generó pago de nómina para ${result.payrollResult.personalNombre}`);
        } else {
          toast.warning(`Tarea completada. No se generó pago de nómina: ${result.payrollResult?.error || 'Error desconocido'}`);
        }
        setAssignCrewModalOpen(false);
        setPendingTaskCompletion(null);
      } catch (error) {
        toast.error('Error al asignar y completar');
      }
    },
    [studioSlug, eventId, router, onDataChange, pendingTaskCompletion]
  );

  // Handler para completar sin pago desde el modal
  const handleCompleteWithoutPayment = useCallback(async () => {
    if (!pendingTaskCompletion) return;

    try {
      const result = await actualizarGanttTask(studioSlug, eventId, pendingTaskCompletion.taskId, {
        isCompleted: true,
      });

      if (!result.success) {
        toast.error(result.error || 'Error al actualizar el estado');
        return;
      }

      // Actualización optimista
      let updatedData: EventoDetalle;
      setLocalEventData(prev => {
        const newData = {
          ...prev,
          cotizaciones: prev.cotizaciones?.map(cotizacion => ({
            ...cotizacion,
            cotizacion_items: cotizacion.cotizacion_items?.map(item => {
              if (item.scheduler_task?.id === pendingTaskCompletion.taskId) {
                return {
                  ...item,
                  scheduler_task: item.scheduler_task ? {
                    ...item.scheduler_task,
                    completed_at: new Date().toISOString(),
                    status: 'COMPLETED',
                    progress_percent: 100,
                  } : null,
                };
              }
              return item;
            }),
          })),
        };
        updatedData = newData;
        return newData;
      });

      // Notificar al padre para actualizar stats
      if (updatedData! && onDataChange) {
        onDataChange(updatedData);
      }

      toast.warning('Tarea completada. No se generó pago porque no hay personal asignado.');
      setAssignCrewModalOpen(false);
      setPendingTaskCompletion(null);
    } catch (error) {
      toast.error('Error al completar la tarea');
    }
  }, [studioSlug, eventId, router, onDataChange, pendingTaskCompletion]);

  // Renderizar item en sidebar
  const renderSidebarItem = (item: CotizacionItem, metadata: ItemMetadata) => {
    const isCompleted = !!item.scheduler_task?.completed_at;

    // Construir objeto crew member con category basado en tipo
    const assignedCrewMember = item.assigned_to_crew_member ? {
      id: item.assigned_to_crew_member.id,
      name: item.assigned_to_crew_member.name,
      tipo: item.assigned_to_crew_member.tipo,
      category: {
        id: item.assigned_to_crew_member.tipo || '',
        name: item.assigned_to_crew_member.tipo || 'Sin categoría',
      },
    } : null;

    return (
      <SchedulerAgrupacionCell
        servicio={metadata.servicioNombre}
        isCompleted={isCompleted}
        assignedCrewMember={assignedCrewMember}
      />
    );
  };

  if (!dateRange?.from || !dateRange?.to) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] border border-zinc-800 rounded-lg bg-zinc-900/20">
        <p className="text-zinc-400 text-lg font-medium">Define la fecha de inicio y término de tu proyecto</p>
        <p className="text-zinc-600 text-sm mt-2">Usa el botón de configuración de rango arriba</p>
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
      <SchedulerPanel
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
        onItemUpdate={handleItemUpdate}
      />

      {/* Modal para asignar personal antes de completar (desde TaskBar) */}
      {pendingTaskCompletion && (
        <AssignCrewBeforeCompleteModal
          isOpen={assignCrewModalOpen}
          onClose={() => {
            setAssignCrewModalOpen(false);
            setPendingTaskCompletion(null);
          }}
          onCompleteWithoutPayment={handleCompleteWithoutPayment}
          onAssignAndComplete={handleAssignAndComplete}
          studioSlug={studioSlug}
          itemId={pendingTaskCompletion.itemId}
          itemName={pendingTaskCompletion.itemName}
          costoTotal={pendingTaskCompletion.costoTotal}
        />
      )}
    </div>
  );
}

