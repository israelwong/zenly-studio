import { useState, useEffect } from 'react';
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

  // Sincronizar con item prop cuando cambie
  useEffect(() => {
    setLocalItem(initialItem);
  }, [
    initialItem.id,
    initialItem.assigned_to_crew_member_id,
    initialItem.gantt_task?.completed_at,
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
   * Actualizar completion status localmente y sincronizar
   */
  const updateCompletionStatus = async (
    isCompleted: boolean,
    syncFn: () => Promise<void>
  ) => {
    // 1. Actualización optimista inmediata
    if (!localItem.gantt_task) return;

    // Preservar todos los campos del gantt_task original y solo actualizar los necesarios
    const updatedItem = {
      ...localItem,
      gantt_task: {
        ...localItem.gantt_task, // Preservar todos los campos originales
        completed_at: isCompleted ? new Date().toISOString() : null,
        status: isCompleted ? 'COMPLETED' : 'PENDING',
        progress_percent: isCompleted ? 100 : (localItem.gantt_task.progress_percent || 0),
      },
    } as CotizacionItem;

    setLocalItem(updatedItem);

    // 2. Notificar al padre inmediatamente para actualizar stats
    if (onItemUpdate) {
      onItemUpdate(updatedItem);
    }

    // 3. Ejecutar server action (sin refrescar página)
    await syncFn();
  };

  return {
    localItem,
    updateCrewMember,
    updateCompletionStatus,
  };
}
