'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

/**
 * Crear nómina automáticamente cuando se completa una tarea
 * Solo se crea si:
 * - La tarea tiene crew member asignado
 * - El item tiene costo > 0
 * - No existe nómina previa para este item
 */
export async function crearNominaDesdeTareaCompletada(
  studioSlug: string,
  eventId: string,
  taskId: string
): Promise<{ success: boolean; error?: string; data?: { nominaId: string } }> {
  try {
    // Obtener studio
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Obtener tarea con item y crew member
    const task = await prisma.studio_gantt_event_tasks.findFirst({
      where: {
        id: taskId,
        gantt_instance: {
          event_id: eventId,
        },
      },
      include: {
        cotizacion_item: {
          include: {
            cotizaciones: {
              select: {
                evento_id: true,
              },
            },
          },
        },
      },
    });

    if (!task || !task.cotizacion_item) {
      return { success: false, error: 'Tarea o item no encontrado' };
    }

    const item = task.cotizacion_item;

    // Validar que tiene crew member asignado
    if (!item.assigned_to_crew_member_id) {
      return { success: false, error: 'La tarea no tiene personal asignado' };
    }

    // Validar que tiene costo
    const costo = item.cost ?? item.cost_snapshot ?? 0;
    if (costo <= 0) {
      return { success: false, error: 'El item no tiene costo definido' };
    }

    // Verificar que no existe nómina previa para este item
    const nominaExistente = await prisma.studio_nominas.findFirst({
      where: {
        studio_id: studio.id,
        evento_id: eventId,
        personal_id: item.assigned_to_crew_member_id,
        payroll_services: {
          some: {
            quote_service_id: item.id,
          },
        },
      },
      select: { id: true },
    });

    if (nominaExistente) {
      // Ya existe nómina para este item, no crear duplicado
      return {
        success: true,
        data: { nominaId: nominaExistente.id },
      };
    }

    // Obtener usuario actual (studio_users.id)
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      return { success: false, error: 'Usuario no autenticado' };
    }

    // Buscar studio_users por platform_user_id relacionado con el usuario autenticado
    const platformUserProfile = await prisma.platform_user_profiles.findFirst({
      where: {
        supabaseUserId: authUser.id,
      },
      select: { id: true },
    });

    if (!platformUserProfile) {
      return { success: false, error: 'Perfil de usuario no encontrado' };
    }

    // Buscar studio_users que tenga este platform_user_id
    const studioUser = await prisma.studio_users.findFirst({
      where: {
        studio_id: studio.id,
        platform_user_id: platformUserProfile.id,
        is_active: true,
      },
      select: { id: true },
    });

    if (!studioUser) {
      return {
        success: false,
        error: 'Usuario de studio no encontrado. Contacta al administrador.',
      };
    }

    const userId = studioUser.id;

    // Obtener nombre del servicio/item
    const servicioNombre =
      item.name || item.name_snapshot || 'Servicio sin nombre';

    // Calcular costo total (costo unitario * cantidad)
    const costoTotal = costo * (item.quantity || 1);

    // Crear nómina y servicio en transacción
    const resultado = await prisma.$transaction(async (tx) => {
      // Crear nómina
      const nomina = await tx.studio_nominas.create({
        data: {
          studio_id: studio.id,
          evento_id: eventId,
          personal_id: item.assigned_to_crew_member_id,
          user_id: userId,
          status: 'pendiente',
          concept: servicioNombre,
          description: `Nómina generada automáticamente al completar tarea: ${task.name || 'Tarea sin nombre'}`,
          gross_amount: costoTotal,
          net_amount: costoTotal,
          total_cost_snapshot: costoTotal,
          expense_total_snapshot: 0,
          deductions: 0,
          payment_type: 'individual',
          services_included: 1,
          assignment_date: new Date(),
        },
      });

      // Crear relación con servicio
      await tx.studio_nomina_servicios.create({
        data: {
          payroll_id: nomina.id,
          quote_service_id: item.id,
          service_name: servicioNombre,
          assigned_cost: costoTotal,
          assigned_quantity: item.quantity || 1,
          category_name: item.category_name_snapshot || null,
          section_name: item.seccion_name_snapshot || null,
        },
      });

      return nomina;
    });

    // Revalidar rutas relacionadas
    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}`);
    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}/scheduler`);

    return {
      success: true,
      data: { nominaId: resultado.id },
    };
  } catch (error) {
    console.error('[PAYROLL] Error creando nómina desde tarea completada:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Error al crear nómina automáticamente',
    };
  }
}
