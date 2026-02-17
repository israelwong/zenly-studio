'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { validateStudio } from './helpers/studio-validator';

// ============================================================================
// TIPOS
// ============================================================================

type CrewCategory = {
  id: string;
  name: string;
  tipo: string;
  color: string | null;
  icono: string | null;
  order: number;
};

type CrewMember = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  tipo: string | null;
  status: string;
  fixed_salary: number | null;
  variable_salary: number | null;
};

// ============================================================================
// FUNCIONES PÚBLICAS
// ============================================================================

/**
 * Obtener crew members activos de un studio
 */
export async function obtenerCrewMembers(studioSlug: string): Promise<{
  success: boolean;
  data?: CrewMember[];
  error?: string;
}> {
  try {
    const validation = await validateStudio(studioSlug);
    if (!validation.success) {
      return { success: false, error: validation.error };
    }

    const crewMembers = await prisma.studio_crew_members.findMany({
      where: {
        studio_id: validation.studioId,
        status: 'activo',
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        tipo: true,
        status: true,
        fixed_salary: true,
        variable_salary: true,
      },
      orderBy: [{ name: 'asc' }],
    });

    return {
      success: true,
      data: crewMembers.map((member) => ({
        id: member.id,
        name: member.name,
        email: member.email,
        phone: member.phone,
        tipo: member.tipo,
        status: member.status,
        fixed_salary: member.fixed_salary ? Number(member.fixed_salary) : null,
        variable_salary: member.variable_salary ? Number(member.variable_salary) : null,
      })),
    };
  } catch (error) {
    console.error('[CREW] Error obteniendo crew members:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener crew members',
    };
  }
}

/**
 * Asignar crew member a un item de cotización
 * Incluye lógica de nómina automática y sincronización con Google Calendar
 */
export async function asignarCrewAItem(
  studioSlug: string,
  itemId: string,
  crewMemberId: string | null
): Promise<{
  success: boolean;
  payrollResult?: { success: boolean; personalNombre?: string; error?: string };
  googleSyncFailed?: boolean;
  error?: string;
}> {
  try {
    const validation = await validateStudio(studioSlug);
    if (!validation.success) {
      return { success: false, error: validation.error };
    }

    // Verificar que el item existe y pertenece al studio, obtener también el evento
    const item = await prisma.studio_cotizacion_items.findFirst({
      where: {
        id: itemId,
        cotizaciones: {
          studio_id: validation.studioId,
        },
      },
      select: {
        id: true,
        cotizacion_id: true,
        cotizaciones: {
          select: {
            evento_id: true,
          },
        },
      },
    });

    if (!item) {
      return { success: false, error: 'Item no encontrado' };
    }

    // Si se está asignando un crew member, verificar que existe
    if (crewMemberId) {
      const crewMember = await prisma.studio_crew_members.findFirst({
        where: {
          id: crewMemberId,
          studio_id: validation.studioId,
        },
      });

      if (!crewMember) {
        return { success: false, error: 'Crew member no encontrado' };
      }
    }

    // Actualizar el item
    await prisma.studio_cotizacion_items.update({
      where: { id: itemId },
      data: {
        assigned_to_crew_member_id: crewMemberId,
        assignment_date: crewMemberId ? new Date() : null,
      },
    });

    // Obtener eventId desde evento_id de la cotización
    const eventId = item.cotizaciones?.evento_id;

    // Si se asignó personal, verificar si la tarea está completada para crear/actualizar nómina
    let payrollResult: { success: boolean; personalNombre?: string; error?: string } | null = null;
    if (crewMemberId && eventId) {
      // Buscar la tarea asociada al item
      const task = await prisma.studio_scheduler_event_tasks.findFirst({
        where: {
          cotizacion_item_id: itemId,
          scheduler_instance: {
            event_id: eventId,
          },
        },
        select: {
          id: true,
          completed_at: true,
          status: true,
        },
      });

      // Si la tarea está completada, crear/actualizar nómina
      if (task && task.completed_at && task.status === 'COMPLETED') {
        try {
          // Importar dinámicamente para evitar dependencias circulares
          const { crearNominaDesdeTareaCompletada } = await import('./payroll-actions');

          // Obtener datos del item para la nómina
          const itemData = await prisma.studio_cotizacion_items.findUnique({
            where: { id: itemId },
            select: {
              cost: true,
              cost_snapshot: true,
              quantity: true,
              name: true,
              name_snapshot: true,
            },
          });

          const costo = itemData?.cost ?? itemData?.cost_snapshot ?? 0;
          const cantidad = itemData?.quantity ?? 1;
          const itemName = itemData?.name || itemData?.name_snapshot || 'Servicio sin nombre';

          const result = await crearNominaDesdeTareaCompletada(
            studioSlug,
            eventId,
            task.id,
            {
              itemId,
              personalId: crewMemberId,
              costo,
              cantidad,
              itemName,
            }
          );

          if (result.success && result.data) {
            // Obtener nombre del personal
            const crewMember = await prisma.studio_crew_members.findUnique({
              where: { id: crewMemberId },
              select: { name: true },
            });
            payrollResult = {
              success: true,
              personalNombre: crewMember?.name || result.data.personalNombre,
            };
          } else {
            console.warn('[CREW] ⚠️ No se pudo crear/actualizar nómina automática:', result.error);
            payrollResult = {
              success: false,
              error: result.error,
            };
          }
        } catch (error) {
          console.error('[CREW] ❌ Error creando/actualizando nómina automática (no crítico):', error);
          payrollResult = {
            success: false,
            error: error instanceof Error ? error.message : 'Error desconocido',
          };
        }
      }
    }

    revalidatePath(`/${studioSlug}/studio/business/events`);
    if (eventId) {
      revalidatePath(`/${studioSlug}/studio/business/events/${eventId}/gantt`);
      revalidatePath(`/${studioSlug}/studio/business/events/${eventId}/scheduler`);
    }

    let googleSyncFailed = false;
    if (eventId) {
      try {
        const task = await prisma.studio_scheduler_event_tasks.findFirst({
          where: {
            cotizacion_item_id: itemId,
            scheduler_instance: { event_id: eventId },
          },
          select: { id: true, sync_status: true },
        });

        if (task && (task.sync_status === 'INVITED' || task.sync_status === 'PUBLISHED')) {
          try {
            const { sincronizarTareaConGoogle } = await import(
              '@/lib/integrations/google/clients/calendar/sync-manager'
            );
            await sincronizarTareaConGoogle(task.id, studioSlug);
          } catch (err) {
            console.error('[asignarCrewAItem] Sync Google falló (personal ya guardado en BD):', err);
            googleSyncFailed = true;
          }
        }
      } catch (error) {
        console.error(
          '[Scheduler] Error en sincronización reactiva Google tras asignar crew (no crítico):',
          error
        );
      }
    }

    return {
      success: true,
      payrollResult: payrollResult || undefined,
      ...(googleSyncFailed ? { googleSyncFailed: true } : {}),
    };
  } catch (error) {
    console.error('[CREW] Error asignando crew a item:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al asignar crew member',
    };
  }
}

/**
 * Obtener categorías de crew members
 * Nota: El modelo studio_crew_categories no existe en el schema actual.
 * Esta función retorna un array vacío hasta que se implemente el modelo.
 */
export async function obtenerCategoriasCrew(studioSlug: string): Promise<{
  success: boolean;
  data?: CrewCategory[];
  error?: string;
}> {
  try {
    const validation = await validateStudio(studioSlug);
    if (!validation.success) {
      return { success: false, error: validation.error };
    }

    // TODO: Implementar cuando el modelo studio_crew_categories esté disponible
    // Por ahora retornamos array vacío ya que el modelo no existe en el schema
    const categorias: CrewCategory[] = [];

    return {
      success: true,
      data: categorias.map((cat: CrewCategory) => ({
        id: cat.id,
        name: cat.name,
        tipo: cat.tipo,
        color: cat.color,
        icono: cat.icono,
        order: cat.order,
      })),
    };
  } catch (error) {
    console.error('[CREW] Error obteniendo categorías crew:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener categorías',
    };
  }
}
