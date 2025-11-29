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
  taskId: string,
  itemData?: {
    itemId: string;
    personalId: string;
    costo: number;
    cantidad: number;
    itemName?: string;
  }
): Promise<{ success: boolean; error?: string; data?: { nominaId: string; personalNombre: string; costoTotal: number } }> {
  console.log('[PAYROLL] 🔄 Iniciando creación de nómina desde tarea completada:', {
    studioSlug,
    eventId,
    taskId,
  });
  try {
    // Obtener studio
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Si se pasan datos del item, usarlos directamente (más eficiente)
    let itemId: string;
    let personalId: string;
    let costo: number;
    let cantidad: number;
    let itemName: string;

    if (itemData) {
      // Usar datos pasados desde el componente
      itemId = itemData.itemId;
      personalId = itemData.personalId;
      costo = itemData.costo;
      cantidad = itemData.cantidad;
      itemName = itemData.itemName || 'Servicio sin nombre';

      console.log('[PAYROLL] ✅ Usando datos del item pasados directamente:', {
        itemId,
        personalId,
        costo,
        cantidad,
      });
    } else {
      // Obtener datos desde la base de datos (fallback)
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
      itemId = item.id;
      personalId = item.assigned_to_crew_member_id || '';
      costo = item.cost ?? item.cost_snapshot ?? 0;
      cantidad = item.quantity || 1;
      itemName = item.name || item.name_snapshot || 'Servicio sin nombre';
    }

    // Validar que tiene crew member asignado
    if (!personalId) {
      console.log('[PAYROLL] ⚠️ Validación fallida: No tiene personal asignado');
      return { success: false, error: 'La tarea no tiene personal asignado' };
    }

    // Validar que tiene costo
    if (costo <= 0) {
      console.log('[PAYROLL] ⚠️ Validación fallida: No tiene costo definido', { costo });
      return { success: false, error: 'El item no tiene costo definido' };
    }

    console.log('[PAYROLL] ✅ Validaciones pasadas:', {
      personal_id: personalId,
      costo,
      item_id: itemId,
      cantidad,
    });

    // Verificar que no existe nómina previa para este item
    const nominaExistente = await prisma.studio_nominas.findFirst({
      where: {
        studio_id: studio.id,
        evento_id: eventId,
        personal_id: personalId,
        payroll_services: {
          some: {
            quote_service_id: itemId,
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

    // Obtener studio_users.id del usuario autenticado que completó la tarea
    // El personal_id ya está correctamente asignado
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    console.log('[PAYROLL] 🔍 Obteniendo usuario autenticado que completó la tarea:', {
      authUserExists: !!authUser,
      authUserId: authUser?.id,
    });

    let userId: string | null = null;

    if (authUser) {
      // Buscar platform_user_profiles del usuario autenticado
      const platformUserProfile = await prisma.platform_user_profiles.findFirst({
        where: {
          supabaseUserId: authUser.id,
        },
        select: { id: true },
      });

      if (platformUserProfile) {
        // Buscar studio_users del usuario autenticado
        const studioUser = await prisma.studio_users.findFirst({
          where: {
            studio_id: studio.id,
            platform_user_id: platformUserProfile.id,
            is_active: true,
          },
          select: { id: true },
        });

        if (studioUser) {
          console.log('[PAYROLL] ✅ Usuario autenticado encontrado:', { userId: studioUser.id });
          userId = studioUser.id;
        }
      }
    }

    // Fallback: si no se encuentra el usuario autenticado, usar el primer usuario activo del studio
    if (!userId) {
      const fallbackUser = await prisma.studio_users.findFirst({
        where: {
          studio_id: studio.id,
          is_active: true,
        },
        orderBy: { created_at: 'asc' },
        select: { id: true },
      });

      if (!fallbackUser) {
        console.error('[PAYROLL] ❌ No se encontró ningún usuario activo en el studio:', {
          studioId: studio.id,
        });
        return {
          success: false,
          error: 'No se encontró usuario válido para registrar la nómina. Contacta al administrador.',
        };
      }

      console.log('[PAYROLL] ⚠️ Usando usuario fallback (no se encontró usuario autenticado):', {
        userId: fallbackUser.id,
      });
      userId = fallbackUser.id;
    }

    // Obtener nombre del personal asignado
    const crewMember = await prisma.studio_crew_members.findUnique({
      where: { id: personalId },
      select: { name: true },
    });

    const personalNombre = crewMember?.name || 'Personal desconocido';

    // Crear nómina y servicio en transacción
    const resultado = await prisma.$transaction(async (tx) => {
      // Crear nómina
      // Obtener nombre de la tarea si no tenemos itemData
      let taskName = 'Tarea sin nombre';
      if (!itemData) {
        const task = await tx.studio_gantt_event_tasks.findUnique({
          where: { id: taskId },
          select: { name: true },
        });
        taskName = task?.name || taskName;
      }

      const nomina = await tx.studio_nominas.create({
        data: {
          studio_id: studio.id,
          evento_id: eventId,
          personal_id: personalId,
          user_id: userId,
          status: 'pendiente',
          concept: itemName,
          description: `Nómina generada automáticamente al completar tarea: ${taskName}`,
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
          quote_service_id: itemId,
          service_name: itemName,
          assigned_cost: costoTotal,
          assigned_quantity: cantidad,
          category_name: null, // Se puede obtener del item si es necesario
          section_name: null, // Se puede obtener del item si es necesario
        },
      });

      return nomina;
    });

    // Revalidar rutas relacionadas
    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}`);
    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}/scheduler`);

    console.log('[PAYROLL] ✅ Nómina creada exitosamente:', {
      nominaId: resultado.id,
      personal_id: personalId,
      costoTotal,
    });

    return {
      success: true,
      data: {
        nominaId: resultado.id,
        personalNombre,
        costoTotal,
      },
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

/**
 * Eliminar nómina automáticamente cuando se desmarca una tarea
 * Solo elimina si la nómina está en estado "pendiente"
 */
export async function eliminarNominaDesdeTareaDesmarcada(
  studioSlug: string,
  eventId: string,
  taskId: string
): Promise<{ success: boolean; error?: string }> {
  console.log('[PAYROLL] 🔄 Iniciando eliminación de nómina desde tarea desmarcada:', {
    studioSlug,
    eventId,
    taskId,
  });
  try {
    // Obtener studio
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Obtener tarea con item
    const task = await prisma.studio_gantt_event_tasks.findFirst({
      where: {
        id: taskId,
        gantt_instance: {
          event_id: eventId,
        },
      },
      include: {
        cotizacion_item: {
          select: {
            id: true,
            assigned_to_crew_member_id: true,
          },
        },
      },
    });

    if (!task || !task.cotizacion_item) {
      console.log('[PAYROLL] ⚠️ Tarea o item no encontrado');
      return { success: false, error: 'Tarea o item no encontrado' };
    }

    const item = task.cotizacion_item;

    // Buscar nómina asociada a este item
    const nomina = await prisma.studio_nominas.findFirst({
      where: {
        studio_id: studio.id,
        evento_id: eventId,
        personal_id: item.assigned_to_crew_member_id,
        status: 'pendiente', // Solo eliminar si está pendiente
        payroll_services: {
          some: {
            quote_service_id: item.id,
          },
        },
      },
      include: {
        payroll_services: {
          where: {
            quote_service_id: item.id,
          },
        },
      },
    });

    if (!nomina) {
      console.log('[PAYROLL] ℹ️ No se encontró nómina pendiente para eliminar');
      return { success: true }; // No hay nómina que eliminar, no es un error
    }

    // Solo eliminar si está en estado pendiente
    if (nomina.status !== 'pendiente') {
      console.log('[PAYROLL] ⚠️ La nómina no está en estado pendiente, no se puede eliminar:', {
        nominaId: nomina.id,
        status: nomina.status,
      });
      return {
        success: false,
        error: `No se puede eliminar nómina con estado: ${nomina.status}`,
      };
    }

    // Eliminar nómina (esto eliminará automáticamente los servicios relacionados por onDelete: Cascade)
    await prisma.studio_nominas.delete({
      where: { id: nomina.id },
    });

    console.log('[PAYROLL] ✅ Nómina eliminada exitosamente:', {
      nominaId: nomina.id,
      personal_id: item.assigned_to_crew_member_id,
    });

    // Revalidar rutas relacionadas
    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}`);
    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}/scheduler`);

    return { success: true };
  } catch (error) {
    console.error('[PAYROLL] Error eliminando nómina desde tarea desmarcada:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Error al eliminar nómina automáticamente',
    };
  }
}
