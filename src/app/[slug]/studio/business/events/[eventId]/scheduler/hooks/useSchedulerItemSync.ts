import { useState, useEffect, useMemo } from 'react';
import type { EventoDetalle } from '@/lib/actions/studio/business/events/events.actions';

type CotizacionItem = NonNullable<NonNullable<EventoDetalle['cotizaciones']>[0]['cotizacion_items']>[0];

interface CrewMemberUpdate {
  id: string;
  name: string;
  tipo: string;
}

/**
 * Hook para sincronizar el estado de un item del scheduler
 * Combina actualización optimista (UI inmediata) con sincronización del servidor
 */
export function useSchedulerItemSync(
  initialItem: CotizacionItem,
  onItemUpdate?: (updatedItem: CotizacionItem) => void
) {
  const [localItem, setLocalItem] = useState(initialItem);

  // Extraer valores clave del scheduler_task para detectar cambios (incluye fechas para sincronización bidireccional)
  const taskKey = useMemo(() => {
    const st = initialItem.scheduler_task;
    const start = st?.start_date != null ? (st.start_date instanceof Date ? st.start_date.getTime() : new Date(st.start_date).getTime()) : null;
    const end = st?.end_date != null ? (st.end_date instanceof Date ? st.end_date.getTime() : new Date(st.end_date).getTime()) : null;
    const days = (st as { duration_days?: number })?.duration_days ?? null;
    return JSON.stringify({
      completed_at: st?.completed_at,
      status: st?.status,
      progress_percent: st?.progress_percent,
      id: st?.id,
      start_date: start,
      end_date: end,
      duration_days: days,
    });
  }, [
    initialItem.scheduler_task?.completed_at,
    initialItem.scheduler_task?.status,
    initialItem.scheduler_task?.progress_percent,
    initialItem.scheduler_task?.id,
    initialItem.scheduler_task?.start_date,
    initialItem.scheduler_task?.end_date,
    (initialItem.scheduler_task as { duration_days?: number })?.duration_days,
  ]);

  // Sincronizar con item prop cuando cambie
  useEffect(() => {
    setLocalItem(initialItem);
  }, [
    initialItem.id,
    initialItem.assigned_to_crew_member_id,
    taskKey,
  ]);

  /**
   * Actualizar crew member localmente (optimista) y sincronizar con servidor
   */
  const updateCrewMember = async (
    crewMemberId: string | null,
    crewMember: CrewMemberUpdate | null,
    syncFn: () => Promise<void>
  ) => {
    // 1. Actualización optimista inmediata
    let updatedItem: CotizacionItem;
    if (crewMemberId && crewMember) {
      updatedItem = {
        ...localItem,
        assigned_to_crew_member_id: crewMemberId,
        assigned_to_crew_member: {
          id: crewMember.id,
          name: crewMember.name,
          tipo: crewMember.tipo as 'OPERATIVO' | 'ADMINISTRATIVO' | 'PROVEEDOR',
        },
      } as CotizacionItem;
    } else {
      updatedItem = {
        ...localItem,
        assigned_to_crew_member_id: null,
        assigned_to_crew_member: null,
      };
    }

    setLocalItem(updatedItem);

    // 2. Notificar al padre inmediatamente para actualizar EventScheduler
    if (onItemUpdate) {
      onItemUpdate(updatedItem);
    }

    // 3. Ejecutar server action (sin refrescar página)
    await syncFn();
  };

  /**
   * Actualizar fechas (start_date, end_date, duration_days) del scheduler_task y sincronizar con servidor.
   * Mismo patrón que manual tasks: anclaje en start_date, end_date = addDays(start, duration - 1).
   */
  const updateSchedulerTaskDates = async (
    startDate: Date,
    endDate: Date,
    durationDays: number,
    syncFn: () => Promise<void>
  ) => {
    if (!localItem.scheduler_task) return;

    const updatedItem: CotizacionItem = {
      ...localItem,
      scheduler_task: {
        ...localItem.scheduler_task,
        start_date: startDate,
        end_date: endDate,
        duration_days: durationDays,
      } as CotizacionItem['scheduler_task'],
    };

    setLocalItem(updatedItem);

    if (onItemUpdate) {
      onItemUpdate(updatedItem);
    }

    await syncFn();
  };

  /**
   * Actualizar completion status localmente y sincronizar
   */
  const updateCompletionStatus = async (
    isCompleted: boolean,
    syncFn: () => Promise<void>
  ) => {
    // 1. Actualización optimista inmediata
    // Usar callback de estado para garantizar el estado más reciente
    let updatedItem: CotizacionItem;
    setLocalItem(prev => {
      if (!prev.scheduler_task) {
        updatedItem = prev;
        return prev;
      }

      // Preservar todos los campos del scheduler_task original y solo actualizar los necesarios
      // IMPORTANTE: Preservar assigned_to_crew_member del estado anterior
      updatedItem = {
        ...prev,
        scheduler_task: {
          ...prev.scheduler_task, // Preservar todos los campos originales
          completed_at: isCompleted ? new Date().toISOString() : null,
          status: isCompleted ? 'COMPLETED' : 'PENDING',
          progress_percent: isCompleted ? 100 : (prev.scheduler_task.progress_percent || 0),
        },
      } as CotizacionItem;

      return updatedItem;
    });

    // 2. Notificar al padre inmediatamente para actualizar stats
    if (onItemUpdate && updatedItem!) {
      onItemUpdate(updatedItem);
    }

    // 3. Ejecutar server action (sin refrescar página)
    await syncFn();
  };

  return {
    localItem,
    updateCrewMember,
    updateCompletionStatus,
    updateSchedulerTaskDates,
  };
}
