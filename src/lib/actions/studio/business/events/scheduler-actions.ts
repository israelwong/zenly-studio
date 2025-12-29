'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

interface UpdateSchedulerTaskInput {
  start_date: Date;
  end_date: Date;
}

/**
 * Actualiza solo las fechas de una tarea del Scheduler (start_date, end_date)
 * Se ejecuta en el servidor para validar permisos y persistir en BD
 * Para actualizaciones completas (incluyendo isCompleted), usar actualizarSchedulerTask de events.actions.ts
 */
export async function actualizarSchedulerTaskFechas(
  studioSlug: string,
  eventId: string,
  taskId: string,
  data: UpdateSchedulerTaskInput
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

    // Obtener la tarea actual para verificar si las fechas realmente cambiaron
    const currentTask = await prisma.studio_scheduler_event_tasks.findUnique({
      where: { id: taskId },
      select: {
        start_date: true,
        end_date: true,
        sync_status: true,
      },
    });

    if (!currentTask) {
      return {
        success: false,
        error: 'Tarea no encontrada',
      };
    }

    // Verificar si las fechas realmente cambiaron
    const datesChanged =
      currentTask.start_date.getTime() !== startDate.getTime() ||
      currentTask.end_date.getTime() !== endDate.getTime();

    // Si las fechas cambiaron y la tarea estaba sincronizada, marcar como DRAFT
    const updateData: {
      start_date: Date;
      end_date: Date;
      sync_status?: 'DRAFT';
    } = {
      start_date: startDate,
      end_date: endDate,
    };

    if (datesChanged && (currentTask.sync_status === 'INVITED' || currentTask.sync_status === 'PUBLISHED')) {
      // Si estaba sincronizada/publicada y cambió, volver a DRAFT
      updateData.sync_status = 'DRAFT';
    }

    // Actualizar la tarea en BD
    const updatedTask = await prisma.studio_scheduler_event_tasks.update({
      where: { id: taskId },
      data: updateData,
    });

    // Revalidar la página para reflejar cambios
    revalidatePath(`/[slug]/studio/business/events/[eventId]/scheduler`, 'page');

    return {
      success: true,
      data: updatedTask,
    };
  } catch (error) {
    console.error('Error updating scheduler task:', error);
    return {
      success: false,
      error: 'Error al actualizar la tarea',
    };
  }
}

/**
 * Obtiene todas las tareas de un evento
 */
export async function obtenerSchedulerTareas(studioSlug: string, eventId: string) {
  try {
    const tareas = await prisma.studio_scheduler_event_tasks.findMany({
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
    console.error('Error fetching scheduler tasks:', error);
    return {
      success: false,
      error: 'Error al obtener las tareas',
      data: [],
    };
  }
}

/**
 * Publica el cronograma de un evento
 * Opción 1: Solo Publicar - Cambia estado DRAFT a PUBLISHED (visible en plataforma)
 * Opción 2: Publicar e Invitar - Cambia a INVITED y sincroniza con Google Calendar
 */
export async function publicarCronograma(
  studioSlug: string,
  eventId: string,
  enviarInvitaciones: boolean = true
): Promise<{ success: boolean; publicado?: number; sincronizado?: number; error?: string }> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Obtener todas las tareas DRAFT del evento
    const tareasDraft = await prisma.studio_scheduler_event_tasks.findMany({
      where: {
        scheduler_instance: {
          event_id: eventId,
        },
        sync_status: 'DRAFT',
      },
      include: {
        cotizacion_item: {
          select: {
            id: true,
            assigned_to_crew_member_id: true,
            assigned_to_crew_member: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (tareasDraft.length === 0) {
      return {
        success: true,
        publicado: 0,
        sincronizado: 0,
      };
    }

    let publicado = 0;
    let sincronizado = 0;

    // Verificar si hay Google Calendar conectado
    const { tieneGoogleCalendarHabilitado, sincronizarTareaEnBackground } =
      await import('@/lib/integrations/google/clients/calendar/helpers');

    const tieneGoogle = await tieneGoogleCalendarHabilitado(studioSlug);

    // PATRÓN STAGING: Aplicar todos los cambios de golpe
    if (tieneGoogle && enviarInvitaciones) {
      // Sincronizar cada tarea que tenga personal asignado
      for (const tarea of tareasDraft) {
        try {
          // Si no tiene item asociado, es una tarea eliminada que necesita cancelación
          if (!tarea.cotizacion_item_id && tarea.google_event_id) {
            // Cancelar en Google Calendar y eliminar la tarea
            const { eliminarEventoEnBackground } = await import('@/lib/integrations/google/clients/calendar/helpers');
            if (tarea.google_calendar_id && tarea.google_event_id) {
              await eliminarEventoEnBackground(tarea.google_calendar_id, tarea.google_event_id);
            }
            // Eliminar la tarea después de cancelar (ahora sí, porque se está publicando)
            await prisma.studio_scheduler_event_tasks.delete({
              where: { id: tarea.id },
            });
            publicado++;
          } else if (tarea.cotizacion_item?.assigned_to_crew_member_id) {
            // Solo sincronizar si tiene personal asignado
            await sincronizarTareaEnBackground(tarea.id, studioSlug);
            sincronizado++;

            // Actualizar estado a INVITED
            await prisma.studio_scheduler_event_tasks.update({
              where: { id: tarea.id },
              data: {
                sync_status: 'INVITED',
                invitation_status: 'PENDING',
              },
            });
          } else {
            // Sin personal asignado
            // Si tiene google_event_id, fue invitada anteriormente, cancelar invitación
            if (tarea.google_event_id && tarea.google_calendar_id) {
              const { eliminarEventoEnBackground } = await import('@/lib/integrations/google/clients/calendar/helpers');
              await eliminarEventoEnBackground(tarea.google_calendar_id, tarea.google_event_id);
              
              // Limpiar referencias de Google Calendar
              await prisma.studio_scheduler_event_tasks.update({
                where: { id: tarea.id },
                data: {
                  sync_status: 'PUBLISHED',
                  google_event_id: null,
                  google_calendar_id: null,
                  invitation_status: null,
                },
              });
            } else {
              // Sin personal y sin evento previo, solo marcar como PUBLISHED
              await prisma.studio_scheduler_event_tasks.update({
                where: { id: tarea.id },
                data: {
                  sync_status: 'PUBLISHED',
                },
              });
            }
            publicado++;
          }
        } catch (error) {
          console.error(`[Publicar Cronograma] Error sincronizando tarea ${tarea.id}:`, error);
          // Continuar con las demás tareas aunque una falle
        }
      }
    } else {
      // Sin Google Calendar, procesar tareas (eliminar las que fueron marcadas como eliminadas)
      for (const tarea of tareasDraft) {
        try {
          // Si no tiene item asociado, es una tarea eliminada, eliminarla completamente
          if (!tarea.cotizacion_item_id) {
            await prisma.studio_scheduler_event_tasks.delete({
              where: { id: tarea.id },
            });
            publicado++;
          } else {
            // Tareas normales, solo marcar como PUBLISHED
            await prisma.studio_scheduler_event_tasks.update({
              where: { id: tarea.id },
              data: {
                sync_status: 'PUBLISHED',
              },
            });
            publicado++;
          }
        } catch (error) {
          console.error(`[Publicar Cronograma] Error procesando tarea ${tarea.id}:`, error);
          // Continuar con las demás tareas aunque una falle
        }
      }
    }

    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}/scheduler`);
    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}`);

    return {
      success: true,
      publicado,
      sincronizado,
    };
  } catch (error) {
    console.error('[Publicar Cronograma] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al publicar cronograma',
    };
  }
}

/**
 * Cancela todos los cambios pendientes (revertir tareas DRAFT)
 * PATRÓN STAGING: Permite revertir todos los cambios sin publicar
 */
export async function cancelarCambiosPendientes(
  studioSlug: string,
  eventId: string
): Promise<{ success: boolean; revertidas?: number; error?: string }> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Obtener todas las tareas DRAFT del evento
    const tareasDraft = await prisma.studio_scheduler_event_tasks.findMany({
      where: {
        scheduler_instance: {
          event_id: eventId,
        },
        sync_status: 'DRAFT',
      },
      select: {
        id: true,
        google_event_id: true,
        cotizacion_item_id: true,
      },
    });

    if (tareasDraft.length === 0) {
      return {
        success: true,
        revertidas: 0,
      };
    }

    let revertidas = 0;

    // Revertir cada tarea DRAFT
    for (const tarea of tareasDraft) {
      try {
        // Si no tiene item asociado, es una tarea eliminada (staging), eliminarla completamente
        if (!tarea.cotizacion_item_id) {
          await prisma.studio_scheduler_event_tasks.delete({
            where: { id: tarea.id },
          });
          revertidas++;
        } else if (tarea.google_event_id) {
          // Si tiene google_event_id, estaba publicada antes, restaurar a estado anterior
          // Buscar el estado anterior desde activity_log o restaurar a PUBLISHED/INVITED
          // Por simplicidad, restaurar a PUBLISHED si tenía google_event_id
          await prisma.studio_scheduler_event_tasks.update({
            where: { id: tarea.id },
            data: {
              sync_status: 'PUBLISHED',
            },
          });
          revertidas++;
        } else {
          // Tarea nueva sin google_event_id, eliminarla (no se había publicado)
          await prisma.studio_scheduler_event_tasks.delete({
            where: { id: tarea.id },
          });
          revertidas++;
        }
      } catch (error) {
        console.error(`[Cancelar Cambios] Error revirtiendo tarea ${tarea.id}:`, error);
        // Continuar con las demás tareas aunque una falle
      }
    }

    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}/scheduler`);
    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}`);

    return {
      success: true,
      revertidas,
    };
  } catch (error) {
    console.error('[Cancelar Cambios] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al cancelar cambios',
    };
  }
}

/**
 * Obtiene el conteo de tareas DRAFT para mostrar en la barra de publicación
 */
export async function obtenerConteoTareasDraft(
  studioSlug: string,
  eventId: string
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    // Contar tareas con sync_status DRAFT
    // Nota: sync_status tiene @default(DRAFT), por lo que todas las tareas tienen un valor
    const count = await prisma.studio_scheduler_event_tasks.count({
      where: {
        scheduler_instance: {
          event_id: eventId,
        },
        sync_status: 'DRAFT',
      },
    });

    return {
      success: true,
      count,
    };
  } catch (error) {
    console.error('[Conteo Tareas DRAFT] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al contar tareas',
    };
  }
}

/**
 * Obtiene el resumen detallado de cambios pendientes de publicación
 */
export async function obtenerResumenCambiosPendientes(
  studioSlug: string,
  eventId: string
): Promise<{
  success: boolean;
  data?: {
    total: number;
    conPersonal: number;
    sinPersonal: number;
    yaInvitadas: number;
    eliminadas: number;
    tareas: Array<{
      id: string;
      name: string;
      startDate: Date;
      endDate: Date;
      status: string;
      category: string;
      tienePersonal: boolean;
      personalNombre?: string;
      personalEmail?: string;
      tipoCambio: 'nueva' | 'modificada' | 'eliminada';
      cambioAnterior?: {
        sync_status: string;
        invitation_status?: string | null;
        google_event_id?: string | null;
        personalNombre?: string | null;
      };
      itemId?: string;
      itemName?: string;
    }>;
  };
  error?: string;
}> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Obtener todas las tareas DRAFT del evento
    const tareasDraft = await prisma.studio_scheduler_event_tasks.findMany({
      where: {
        scheduler_instance: {
          event_id: eventId,
        },
        sync_status: 'DRAFT',
      },
      include: {
        cotizacion_item: {
          select: {
            id: true,
            name_snapshot: true,
            assigned_to_crew_member_id: true,
            assigned_to_crew_member: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        activity_log: {
          select: {
            id: true,
            action: true,
            created_at: true,
            old_value: true,
            new_value: true,
          },
          orderBy: {
            created_at: 'desc',
          },
          take: 20, // Aumentar para mejor detección
        },
      },
      orderBy: {
        start_date: 'asc',
      },
    });

    // Obtener IDs de personal que necesitamos buscar desde activity_log
    const personalIdsAnteriores = new Set<string>();
    tareasDraft.forEach((tarea) => {
      if (tarea.activity_log && tarea.activity_log.length > 0) {
        tarea.activity_log.forEach((log) => {
          if (
            log.action === 'UPDATED' &&
            log.old_value &&
            typeof log.old_value === 'object' &&
            'assigned_to_crew_member_id' in log.old_value &&
            log.old_value.assigned_to_crew_member_id !== null
          ) {
            const oldValue = log.old_value as any;
            if (oldValue.assigned_to_crew_member_id) {
              personalIdsAnteriores.add(oldValue.assigned_to_crew_member_id);
            }
          }
        });
      }
    });

    // Obtener nombres de personal anterior
    const personalAnteriorMap = new Map<string, string>();
    if (personalIdsAnteriores.size > 0) {
      const personalAnterior = await prisma.studio_crew_members.findMany({
        where: {
          id: {
            in: Array.from(personalIdsAnteriores),
          },
        },
        select: {
          id: true,
          name: true,
        },
      });
      personalAnterior.forEach((p) => {
        personalAnteriorMap.set(p.id, p.name);
      });
    }

    // Obtener tareas que ya fueron invitadas previamente (tienen invitation_status)
    const tareasYaInvitadas = await prisma.studio_scheduler_event_tasks.findMany({
      where: {
        scheduler_instance: {
          event_id: eventId,
        },
        sync_status: 'DRAFT',
        invitation_status: {
          not: null,
        },
      },
      select: {
        id: true,
      },
    });

    const idsYaInvitadas = new Set(tareasYaInvitadas.map((t) => t.id));

    const tareas = tareasDraft.map((tarea) => {
      // Determinar tipo de cambio basado en activity_log y estado actual
      let tipoCambio: 'nueva' | 'modificada' | 'personal_asignado' | 'personal_desasignado' | 'slot_vaciado' = 'nueva';
      const cambioAnterior: {
        sync_status: string;
        invitation_status?: string | null;
        google_event_id?: string | null;
        personalNombre?: string | null;
      } = {
        sync_status: 'DRAFT',
        invitation_status: tarea.invitation_status || null,
        google_event_id: tarea.google_event_id || null,
      };

      // Si tiene google_event_id pero está en DRAFT, fue modificada/desasignada
      if (tarea.google_event_id) {
        tipoCambio = 'modificada';
        cambioAnterior.google_event_id = tarea.google_event_id;
      }

      // Si ya fue invitada previamente, es modificada
      if (idsYaInvitadas.has(tarea.id)) {
        tipoCambio = 'modificada';
        cambioAnterior.invitation_status = tarea.invitation_status || null;
      }

      // Verificar desasignación de personal o slot vaciado (se agrupan como "modificada")
      if (tarea.activity_log && tarea.activity_log.length > 0) {
        const logDesasignacion = tarea.activity_log.find(
          (log) => 
            log.action === 'UPDATED' && 
            log.old_value && 
            typeof log.old_value === 'object' &&
            'assigned_to_crew_member_id' in log.old_value &&
            log.old_value.assigned_to_crew_member_id !== null &&
            (!tarea.cotizacion_item?.assigned_to_crew_member_id || 
             (log.new_value && typeof log.new_value === 'object' && 
              'assigned_to_crew_member_id' in log.new_value && 
              log.new_value.assigned_to_crew_member_id === null))
        );

        if (logDesasignacion) {
          // Personal desasignado = modificada
          tipoCambio = 'modificada';
          if (logDesasignacion.old_value && typeof logDesasignacion.old_value === 'object') {
            const oldValue = logDesasignacion.old_value as any;
            if (oldValue.assigned_to_crew_member_id) {
              cambioAnterior.personalNombre = personalAnteriorMap.get(oldValue.assigned_to_crew_member_id) || oldValue.personalNombre || null;
            } else {
              cambioAnterior.personalNombre = oldValue.personalNombre || null;
            }
          }
        }
      }

      // Si tiene google_event_id pero no tiene personal, es slot vaciado o desasignado (modificada)
      if (tarea.google_event_id && !tarea.cotizacion_item?.assigned_to_crew_member_id && tipoCambio === 'nueva') {
        // Si no tiene item asociado, es slot vaciado = modificada
        if (!tarea.cotizacion_item_id) {
          tipoCambio = 'modificada';
        } else {
          // Si tiene item pero no personal, verificar si antes tenía personal
          const logConPersonalAnterior = tarea.activity_log?.find(
            (log) => 
              log.action === 'UPDATED' && 
              log.old_value && 
              typeof log.old_value === 'object' &&
              'assigned_to_crew_member_id' in log.old_value &&
              log.old_value.assigned_to_crew_member_id !== null
          );
          if (logConPersonalAnterior) {
            // Personal desasignado = modificada
            tipoCambio = 'modificada';
            const oldValue = logConPersonalAnterior.old_value as any;
            if (oldValue.assigned_to_crew_member_id) {
              cambioAnterior.personalNombre = personalAnteriorMap.get(oldValue.assigned_to_crew_member_id) || oldValue.personalNombre || null;
            }
          } else {
            // Slot vaciado = modificada
            tipoCambio = 'modificada';
          }
        }
      }

      // Si tiene google_event_id y está en DRAFT, necesita cancelación (puede ser eliminación/modificación)
      if (tarea.google_event_id && tarea.sync_status === 'DRAFT') {
        // Si no tiene item asociado, fue eliminada (slot vaciado)
        if (!tarea.cotizacion_item_id) {
          tipoCambio = 'eliminada';
          // Buscar personal anterior en activity_log si la tarea fue eliminada
          if (tarea.activity_log && tarea.activity_log.length > 0) {
            const logConPersonal = tarea.activity_log.find(
              (log) => 
                (log.action === 'UPDATED' || log.action === 'ASSIGNED') && 
                log.old_value && 
                typeof log.old_value === 'object' &&
                'assigned_to_crew_member_id' in log.old_value &&
                log.old_value.assigned_to_crew_member_id !== null
            );
            if (logConPersonal) {
              const oldValue = logConPersonal.old_value as any;
              if (oldValue.assigned_to_crew_member_id) {
                cambioAnterior.personalNombre = personalAnteriorMap.get(oldValue.assigned_to_crew_member_id) || oldValue.personalNombre || null;
              }
            }
          }
        }
      }

      return {
        id: tarea.id,
        name: tarea.name,
        startDate: tarea.start_date,
        endDate: tarea.end_date,
        status: tarea.status,
        category: tarea.category,
        tienePersonal: !!tarea.cotizacion_item?.assigned_to_crew_member_id,
        personalNombre: tarea.cotizacion_item?.assigned_to_crew_member?.name || undefined,
        personalEmail: tarea.cotizacion_item?.assigned_to_crew_member?.email || undefined,
        tipoCambio,
        cambioAnterior,
        itemId: tarea.cotizacion_item?.id,
        itemName: tarea.cotizacion_item?.name_snapshot,
      };
    });

    // Las tareas eliminadas ya no existen en la BD, pero podemos detectar
    // tareas que necesitan cancelación (tienen google_event_id pero están en DRAFT)
    // Estas incluyen eliminaciones, modificaciones y desasignaciones

    const conPersonal = tareas.filter((t) => t.tienePersonal).length;
    const sinPersonal = tareas.length - conPersonal;
    const yaInvitadas = tareas.filter((t) => idsYaInvitadas.has(t.id)).length;
    
    // Contar tipos de cambio
    const eliminadas = tareas.filter((t) => t.tipoCambio === 'eliminada').length;

    return {
      success: true,
      data: {
        total: tareas.length,
        conPersonal,
        sinPersonal,
        yaInvitadas,
        eliminadas,
        tareas,
      },
    };
  } catch (error) {
    console.error('[Resumen Cambios] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener resumen',
    };
  }
}

/**
 * Verifica si un colaborador tiene tareas en un rango de fechas específico
 * Retorna el número de tareas que se solapan con el rango
 */
export async function verificarConflictosColaborador(
  studioSlug: string,
  eventId: string,
  crewMemberId: string,
  startDate: Date,
  endDate: Date,
  excludeTaskId?: string
): Promise<{ success: boolean; conflictCount?: number; error?: string }> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Buscar tareas del colaborador que se solapen con el rango de fechas
    const conflictTasks = await prisma.studio_scheduler_event_tasks.findMany({
      where: {
        scheduler_instance: {
          event_id: eventId,
        },
        cotizacion_item: {
          assigned_to_crew_member_id: crewMemberId,
        },
        // Excluir la tarea actual si se está editando
        ...(excludeTaskId ? { id: { not: excludeTaskId } } : {}),
        // Verificar solapamiento de fechas
        OR: [
          // La tarea empieza dentro del rango
          {
            start_date: {
              gte: startDate,
              lte: endDate,
            },
          },
          // La tarea termina dentro del rango
          {
            end_date: {
              gte: startDate,
              lte: endDate,
            },
          },
          // La tarea contiene completamente el rango
          {
            start_date: { lte: startDate },
            end_date: { gte: endDate },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        start_date: true,
        end_date: true,
      },
    });

    return {
      success: true,
      conflictCount: conflictTasks.length,
    };
  } catch (error) {
    console.error('[Verificar Conflictos] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al verificar conflictos',
    };
  }
}
