'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

interface UpdateGanttTaskInput {
  start_date: Date;
  end_date: Date;
}

/**
 * Actualiza solo las fechas de una tarea del Gantt (start_date, end_date)
 * Se ejecuta en el servidor para validar permisos y persistir en BD
 * Para actualizaciones completas (incluyendo isCompleted), usar actualizarGanttTask de events.actions.ts
 */
export async function actualizarGanttTaskFechas(
  studioSlug: string,
  eventId: string,
  taskId: string,
  data: UpdateGanttTaskInput
) {
  try {
    // Validar que las fechas sean válidas
    if (!data.start_date || !data.end_date) {
      return {
        success: false,
        error: 'Las fechas de inicio y fin son requeridas',
      };
    }

    const startDate = new Date(data.start_date);
    const endDate = new Date(data.end_date);

    if (startDate > endDate) {
      return {
        success: false,
        error: 'La fecha de inicio no puede ser posterior a la fecha de fin',
      };
    }

    // Actualizar la tarea en BD
    const updatedTask = await prisma.studio_gantt_event_tasks.update({
      where: { id: taskId },
      data: {
        start_date: startDate,
        end_date: endDate,
      },
    });

    // Revalidar la página para reflejar cambios
    revalidatePath(`/[slug]/studio/business/events/[eventId]/gantt`, 'page');

    return {
      success: true,
      data: updatedTask,
    };
  } catch (error) {
    console.error('Error updating gantt task:', error);
    return {
      success: false,
      error: 'Error al actualizar la tarea',
    };
  }
}

/**
 * Obtiene todas las tareas de un evento
 */
export async function obtenerGanttTareas(studioSlug: string, eventId: string) {
  try {
    const tareas = await prisma.studio_gantt_event_tasks.findMany({
      where: {
        cotizacion_item: {
          cotizaciones: {
            evento_id: eventId,
          },
        },
      },
      include: {
        cotizacion_item: true,
      },
    });

    return {
      success: true,
      data: tareas,
    };
  } catch (error) {
    console.error('Error fetching gantt tasks:', error);
    return {
      success: false,
      error: 'Error al obtener las tareas',
      data: [],
    };
  }
}
