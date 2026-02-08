'use client';

import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { type DateRange } from 'react-day-picker';
import type { EventoDetalle } from '@/lib/actions/studio/business/events/events.actions';
import type { SeccionData } from '@/lib/actions/schemas/catalogo-schemas';
import { STAGE_ORDER } from '../../utils/scheduler-section-stages';
import { SchedulerPanel } from './SchedulerPanel';
import { actualizarSchedulerTaskFechas } from '@/lib/actions/studio/business/events/scheduler-actions';
import { crearSchedulerTask, eliminarSchedulerTask, actualizarSchedulerTask } from '@/lib/actions/studio/business/events';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { SchedulerAgrupacionCell } from '../sidebar/SchedulerAgrupacionCell';
import { AssignCrewBeforeCompleteModal } from '../task-actions/AssignCrewBeforeCompleteModal';
import { ZenConfirmModal } from '@/components/ui/zen/overlays/ZenConfirmModal';

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

export const EventScheduler = React.memo(function EventScheduler({
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
  const [hasCrewPreference, setHasCrewPreference] = useState<boolean | null>(null);
  const [pendingTaskCompletion, setPendingTaskCompletion] = useState<{
    taskId: string;
    itemId: string;
    itemName: string;
    costoTotal: number;
  } | null>(null);
  const [showFixedSalaryConfirmModal, setShowFixedSalaryConfirmModal] = useState(false);
  const [pendingFixedSalaryTask, setPendingFixedSalaryTask] = useState<{
    taskId: string;
    itemId: string;
    skipPayment: boolean;
  } | null>(null);

  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => new Set(secciones.map((s) => s.id)));
  const [expandedStages, setExpandedStages] = useState<Set<string>>(() =>
    new Set(secciones.flatMap((s) => STAGE_ORDER.map((st) => `${s.id}-${st}`)))
  );

  useEffect(() => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      secciones.forEach((s) => next.add(s.id));
      return next;
    });
    setExpandedStages((prev) => {
      const next = new Set(prev);
      secciones.forEach((s) => STAGE_ORDER.forEach((st) => next.add(`${s.id}-${st}`)));
      return next;
    });
  }, [secciones]);

  // Sincronizar localEventData solo cuando eventData cambia desde el padre
  // Usar referencia para evitar actualizaciones innecesarias
  const eventDataRef = React.useRef(eventData);
  
  useEffect(() => {
    // Solo actualizar si eventData realmente cambió (comparación profunda de ID)
    if (eventDataRef.current?.id !== eventData?.id || 
        eventDataRef.current?.scheduler?.id !== eventData?.scheduler?.id) {
      eventDataRef.current = eventData;
      setLocalEventData(eventData);
    }
  }, [eventData?.id, eventData?.scheduler?.id]);

  // Cargar preferencia de crew al montar
  useEffect(() => {
    const loadCrewPreference = async () => {
      try {
        const { obtenerPreferenciaCrew } = await import('@/lib/actions/studio/crew/crew.actions');
        const result = await obtenerPreferenciaCrew(studioSlug);
        if (result.success) {
          setHasCrewPreference(result.has_crew);
        }
      } catch (error) {
        // Error silencioso
      }
    };
    loadCrewPreference();
  }, [studioSlug]);

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
              // IMPORTANTE: Crear un nuevo objeto para que React detecte el cambio
              const mergedSchedulerTask = updatedItem.scheduler_task && item.scheduler_task
                ? {
                  ...item.scheduler_task, // Preservar campos originales (start_date, end_date, etc.)
                  ...updatedItem.scheduler_task, // Sobrescribir con campos actualizados (completed_at, status, progress_percent, etc.)
                  // Asegurar que completed_at sea un nuevo valor (no undefined)
                  completed_at: updatedItem.scheduler_task.completed_at !== undefined
                    ? updatedItem.scheduler_task.completed_at
                    : item.scheduler_task.completed_at,
                  // Asegurar que status sea un nuevo valor
                  status: updatedItem.scheduler_task.status || item.scheduler_task.status,
                  // Asegurar que progress_percent sea un nuevo valor
                  progress_percent: updatedItem.scheduler_task.progress_percent !== undefined
                    ? updatedItem.scheduler_task.progress_percent
                    : item.scheduler_task.progress_percent,
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
      // Incluir cotizaciones aprobadas/autorizadas
      const isApproved = cotizacion.status === 'autorizada'
        || cotizacion.status === 'aprobada'
        || cotizacion.status === 'approved'
        || cotizacion.status === 'seleccionada';

      if (isApproved) {
        cotizacion.cotizacion_items?.forEach((item) => {
          // Indexar por item_id (si existe) O por el id del cotizacion_item
          // Esto permite soportar items creados desde catálogo o paquetes
          const key = item.item_id || item.id;
          map.set(key, item);
        });
      }
    });

    return map;
  }, [localEventData.cotizaciones]);

  // Construir estructura personalizada para items sin catálogo
  // Agrupar items por sección/categoría del snapshot
  const seccionesFiltradasConItems = useMemo(() => {
    // Primero intentar filtrar por catálogo normal
    const seccionesConCatalogo = secciones
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

    // Si hay items con catálogo, usar esa estructura
    if (seccionesConCatalogo.length > 0) {
      return seccionesConCatalogo;
    }

    // Si no hay match con catálogo (items sin item_id), crear estructura sintética
    // agrupando por seccion_name y category_name de los snapshots
    const itemsArray = Array.from(itemsMap.values());

    if (itemsArray.length === 0) {
      return [];
    }

    // Agrupar por sección y categoría
    const seccionesMap = new Map<string, Map<string, CotizacionItem[]>>();

    itemsArray.forEach((item) => {
      const seccionName = item.seccion_name_snapshot || item.seccion_name || 'Sin categoría';
      const categoryName = item.category_name_snapshot || item.category_name || 'Sin categoría';

      if (!seccionesMap.has(seccionName)) {
        seccionesMap.set(seccionName, new Map());
      }

      const categoriasMap = seccionesMap.get(seccionName)!;
      if (!categoriasMap.has(categoryName)) {
        categoriasMap.set(categoryName, []);
      }

      categoriasMap.get(categoryName)!.push(item);
    });

    // Convertir a estructura compatible con SchedulerPanel
    return Array.from(seccionesMap.entries()).map(([seccionName, categoriasMap], sIndex) => ({
      id: `seccion-${sIndex}`,
      nombre: seccionName,
      descripcion: null,
      orden: sIndex,
      categorias: Array.from(categoriasMap.entries()).map(([categoryName, items], cIndex) => ({
        id: `categoria-${sIndex}-${cIndex}`,
        nombre: categoryName,
        orden: cIndex,
        servicios: items.map((item, iIndex) => ({
          id: item.id, // Usar el id del cotizacion_item como key
          nombre: item.name || item.name_snapshot || 'Sin nombre',
          tipo: 'SERVICIO' as const,
          costo: item.cost || item.cost_snapshot || 0,
          gasto: 0,
          utilidad_tipo: item.profit_type || item.profit_type_snapshot || 'service',
          orden: iIndex,
          estado: 'active',
        })),
      })),
    }));
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

        // Disparar evento para actualizar PublicationBar
        if (result.success) {
          window.dispatchEvent(new CustomEvent('scheduler-task-updated'));
        }

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

        const result = await crearSchedulerTask(studioSlug, eventId, {
          itemId,
          name: itemName,
          startDate,
          endDate,
        });
        
        // Disparar evento para actualizar PublicationBar
        if (result.success) {
          window.dispatchEvent(new CustomEvent('scheduler-task-created'));
        }

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
        const result = await eliminarSchedulerTask(studioSlug, eventId, taskId);

        // Disparar evento para actualizar PublicationBar
        if (result.success) {
          window.dispatchEvent(new CustomEvent('scheduler-task-updated'));
        }

        if (!result.success) {
          toast.error(result.error || 'Error al eliminar la tarea');
          return;
        }

        // Actualización optimista: remover la tarea del estado local y limpiar personal asignado
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
                  // Limpiar personal asignado cuando se vacía el slot
                  assigned_to_crew_member_id: null,
                  assigned_to_crew_member: null,
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

  const handleDeleteStage = useCallback(
    async (sectionId: string, stageCategory: string, taskIds: string[]) => {
      try {
        for (const taskId of taskIds) {
          const result = await eliminarSchedulerTask(studioSlug, eventId, taskId);
          if (!result.success) {
            toast.error(result.error || 'Error al eliminar tarea');
            return;
          }
        }
        if (taskIds.length > 0) {
          window.dispatchEvent(new CustomEvent('scheduler-task-updated'));
          const idsSet = new Set(taskIds);
          setLocalEventData((prev) => {
            const updatedData: EventoDetalle = {
              ...prev,
              cotizaciones: prev.cotizaciones?.map((cotizacion) => ({
                ...cotizacion,
                cotizacion_items: cotizacion.cotizacion_items?.map((item) =>
                  item.scheduler_task && idsSet.has(item.scheduler_task.id)
                    ? {
                        ...item,
                        scheduler_task_id: null,
                        scheduler_task: null,
                        assigned_to_crew_member_id: null,
                        assigned_to_crew_member: null,
                      }
                    : item
                ),
              })),
            };
            if (onDataChange) queueMicrotask(() => onDataChange(updatedData));
            return updatedData;
          });
        }
        toast.success(taskIds.length > 0 ? 'Etapa y tareas eliminadas' : 'Etapa actualizada');
      } catch (error) {
        toast.error('Error al eliminar etapa');
      }
    },
    [studioSlug, eventId, onDataChange]
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

          // Disparar evento para actualizar PublicationBar
          if (result.success) {
            window.dispatchEvent(new CustomEvent('scheduler-task-updated'));
          }

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

      // Si tiene personal asignado, verificar si tiene sueldo fijo
      if (itemFound.assigned_to_crew_member_id) {
        try {
          const { obtenerCrewMembers } = await import('@/lib/actions/studio/business/events');
          const crewResult = await obtenerCrewMembers(studioSlug);
          const assignedMember = crewResult.success && crewResult.data
            ? crewResult.data.find(m => m.id === itemFound.assigned_to_crew_member_id)
            : null;

          const hasFixedSalary = assignedMember && assignedMember.fixed_salary !== null && assignedMember.fixed_salary > 0;

          if (hasFixedSalary) {
            // Mostrar modal de confirmación para sueldo fijo
            setPendingFixedSalaryTask({
              taskId,
              itemId: itemFound.id,
              skipPayment: false,
            });
            setShowFixedSalaryConfirmModal(true);
            return;
          }
        } catch (error) {
          console.error('Error al verificar tipo de salario:', error);
          // Continuar con el flujo normal si hay error
        }
      }

      // Si no hay personal asignado y tiene costo
      if (!itemFound.assigned_to_crew_member_id && costoTotal > 0) {
        // Si has_crew === false, completar directamente sin mostrar modal
        if (hasCrewPreference === false) {
          // Completar sin pago directamente
          try {
            const result = await actualizarSchedulerTask(studioSlug, eventId, taskId, {
              isCompleted: true,
            });

            // Disparar evento para actualizar PublicationBar
            if (result.success) {
              window.dispatchEvent(new CustomEvent('scheduler-task-updated'));
            }

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

            if (updatedData! && onDataChange) {
              onDataChange(updatedData);
            }

            toast.success('Tarea completada');
            return;
          } catch (error) {
            toast.error('Error al completar la tarea');
            return;
          }
        }

        // Si has_crew es null o true, mostrar modal
        setPendingTaskCompletion({
          taskId,
          itemId: itemFound.id,
          itemName,
          costoTotal,
        });
        setAssignCrewModalOpen(true);
        return;
      }

      // Si hay personal o no tiene costo, proceder normalmente (sin verificar sueldo fijo aquí, ya se verificó arriba)
      await completeTaskWithSkipPayment(taskId, false);
    },
    [studioSlug, eventId, router, onDataChange, localEventData]
  );

  // Función helper para completar tarea con opción de omitir nómina
  const completeTaskWithSkipPayment = useCallback(
    async (taskId: string, skipPayment: boolean) => {
      try {
        const result = await actualizarSchedulerTask(studioSlug, eventId, taskId, {
          isCompleted: true,
          skipPayroll: skipPayment,
        });

        // Disparar evento para actualizar PublicationBar
        if (result.success) {
          window.dispatchEvent(new CustomEvent('scheduler-task-updated'));
        }

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

        if (skipPayment) {
          toast.success('Tarea completada (sin generar pago de nómina)');
        } else if (result.payrollResult?.success && result.payrollResult.personalNombre) {
          toast.success(`Tarea completada. Pago de nómina generado para ${result.payrollResult.personalNombre}`);
        } else if (result.payrollResult?.error) {
          toast.warning(`Tarea completada. No se generó pago de nómina: ${result.payrollResult.error || 'Sin personal asignado'}`);
        } else {
          toast.success('Tarea completada');
        }
      } catch (error) {
        toast.error('Error al actualizar el estado');
      }
    },
    [studioSlug, eventId, onDataChange]
  );

  // Handler para asignar y completar desde el modal
  const handleAssignAndComplete = useCallback(
    async (crewMemberId: string, skipPayment: boolean = false) => {
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
          const errorMessage = assignResult.error || 'Error al asignar personal';
          toast.error(errorMessage);
          throw new Error(errorMessage);
        }

        // Si la asignación fue exitosa pero hay un error en payrollResult, solo loguear (no crítico)
        // La nómina se creará cuando se complete la tarea
        if (assignResult.payrollResult && !assignResult.payrollResult.success) {
          console.warn('Advertencia al asignar personal (nómina):', assignResult.payrollResult.error);
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

        // Completar la tarea (creará nómina automáticamente a menos que skipPayment sea true)
        const result = await actualizarSchedulerTask(studioSlug, eventId, pendingTaskCompletion.taskId, {
          isCompleted: true,
          skipPayroll: skipPayment,
        });

        // Disparar evento para actualizar PublicationBar
        if (result.success) {
          window.dispatchEvent(new CustomEvent('scheduler-task-updated'));
        }

        if (!result.success) {
          const errorMessage = result.error || 'Error al completar la tarea';
          toast.error(errorMessage);
          throw new Error(errorMessage);
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

        // Mostrar toast con información de nómina ANTES de notificar al padre
        // Esto evita que errores en onDataChange afecten el feedback al usuario
        if (skipPayment) {
          toast.success('Personal asignado y tarea completada (sin generar pago de nómina)');
        } else if (result.payrollResult?.success && result.payrollResult.personalNombre) {
          toast.success(`Personal asignado y tarea completada. Se generó pago de nómina para ${result.payrollResult.personalNombre}`);
        } else if (result.payrollResult?.error) {
          // Solo mostrar warning si hay un error específico de nómina
          toast.warning(`Tarea completada. No se generó pago de nómina: ${result.payrollResult.error}`);
        } else {
          // Si no hay información de nómina, asumir éxito
          toast.success('Personal asignado y tarea completada');
        }

        // Notificar al padre (puede lanzar error, pero no es crítico)
        // Hacerlo después de mostrar el toast para que el usuario vea el éxito
        try {
          if (updatedData! && onDataChange) {
            onDataChange(updatedData);
          }
        } catch (dataChangeError) {
          // Error en onDataChange no es crítico, solo loguear
          // No afecta la operación principal que ya se completó exitosamente
          console.warn('Error al notificar cambio de datos (no crítico):', dataChangeError);
        }

        setAssignCrewModalOpen(false);
        setPendingTaskCompletion(null);

        // Actualizar preferencia a true cuando se asigna personal
        setHasCrewPreference(true);
      } catch (error) {
        // Solo mostrar error si es un error crítico que no se manejó anteriormente
        const errorMessage = error instanceof Error ? error.message : '';
        // Si el error ya fue manejado con un toast específico, no mostrar otro
        // Los errores de asignar personal y completar tarea ya muestran su propio toast
        if (errorMessage &&
          !errorMessage.includes('Error al asignar personal') &&
          !errorMessage.includes('Error al completar la tarea')) {
          toast.error('Error al asignar y completar');
        }
        console.error('Error en handleAssignAndComplete:', error);
        // Re-lanzar el error para que el modal pueda manejarlo si es necesario
        throw error;
      }
    },
    [studioSlug, eventId, router, onDataChange, pendingTaskCompletion]
  );

  // Handler para completar sin pago desde el modal
  const handleCompleteWithoutPayment = useCallback(async () => {
    if (!pendingTaskCompletion) return;

    try {
      const result = await actualizarSchedulerTask(studioSlug, eventId, pendingTaskCompletion.taskId, {
        isCompleted: true,
      });

      // Disparar evento para actualizar PublicationBar
      if (result.success) {
        window.dispatchEvent(new CustomEvent('scheduler-task-updated'));
      }

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

      // Recargar preferencia de crew por si cambió
      const { obtenerPreferenciaCrew } = await import('@/lib/actions/studio/crew/crew.actions');
      const prefResult = await obtenerPreferenciaCrew(studioSlug);
      if (prefResult.success) {
        setHasCrewPreference(prefResult.has_crew);
      }
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
        hasSlot={!!item.scheduler_task}
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
        onDeleteStage={handleDeleteStage}
        expandedSections={expandedSections}
        expandedStages={expandedStages}
        onExpandedSectionsChange={setExpandedSections}
        onExpandedStagesChange={setExpandedStages}
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

      {/* Modal de confirmación para sueldo fijo (cuando ya tiene personal asignado) */}
      <ZenConfirmModal
        isOpen={showFixedSalaryConfirmModal}
        onClose={async () => {
          if (!pendingFixedSalaryTask) {
            setShowFixedSalaryConfirmModal(false);
            setPendingFixedSalaryTask(null);
            return;
          }
          // Al cerrar con el botón cancelar, completar sin pasar a pago
          await completeTaskWithSkipPayment(pendingFixedSalaryTask.taskId, true);
          setShowFixedSalaryConfirmModal(false);
          setPendingFixedSalaryTask(null);
        }}
        onConfirm={async () => {
          if (!pendingFixedSalaryTask) return;
          // Pasar a pago (skipPayment = false)
          await completeTaskWithSkipPayment(pendingFixedSalaryTask.taskId, false);
          setShowFixedSalaryConfirmModal(false);
          setPendingFixedSalaryTask(null);
        }}
        title="¿Deseas pasar a pago?"
        description={
          <div className="space-y-2">
            <p className="text-sm text-zinc-300">
              Este miembro del equipo cuenta con <strong className="text-amber-400">sueldo fijo</strong>.
            </p>
            <p className="text-sm text-zinc-400">
              ¿Deseas generar el pago de nómina para esta tarea?
            </p>
          </div>
        }
        confirmText="Sí, pasar a pago"
        cancelText="No, solo completar"
        variant="default"
      />
    </div>
  );
}, (prevProps, nextProps) => {
  // Comparación personalizada: solo re-renderizar si cambian datos relevantes
  const prevFrom = prevProps.dateRange?.from?.getTime();
  const prevTo = prevProps.dateRange?.to?.getTime();
  const nextFrom = nextProps.dateRange?.from?.getTime();
  const nextTo = nextProps.dateRange?.to?.getTime();

  const datesEqual = prevFrom === nextFrom && prevTo === nextTo;
  const eventDataEqual = prevProps.eventData === nextProps.eventData;
  const seccionesEqual = prevProps.secciones === nextProps.secciones;

  return datesEqual && eventDataEqual && seccionesEqual;
});

