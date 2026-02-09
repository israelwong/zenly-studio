'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { obtenerCatalogo } from '@/lib/actions/studio/config/catalogo.actions';
import type { SeccionData } from '@/lib/actions/schemas/catalogo-schemas';
import { COTIZACION_ITEMS_SELECT_STANDARD } from '@/lib/actions/studio/commercial/promises/cotizacion-structure.utils';
import { ordenarPorEstructuraCanonica } from '@/lib/logic/event-structure-master';

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

    // Normalizar fechas usando métodos UTC para evitar problemas de zona horaria
    const startDate = data.start_date instanceof Date 
        ? new Date(Date.UTC(data.start_date.getUTCFullYear(), data.start_date.getUTCMonth(), data.start_date.getUTCDate(), 12, 0, 0))
        : new Date(Date.UTC(new Date(data.start_date).getUTCFullYear(), new Date(data.start_date).getUTCMonth(), new Date(data.start_date).getUTCDate(), 12, 0, 0));
    const endDate = data.end_date instanceof Date 
        ? new Date(Date.UTC(data.end_date.getUTCFullYear(), data.end_date.getUTCMonth(), data.end_date.getUTCDate(), 12, 0, 0))
        : new Date(Date.UTC(new Date(data.end_date).getUTCFullYear(), new Date(data.end_date).getUTCMonth(), new Date(data.end_date).getUTCDate(), 12, 0, 0));

    // Comparar solo fechas (sin hora) usando UTC
    const startDateOnly = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()));
    const endDateOnly = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate()));

    if (startDateOnly > endDateOnly) {
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

    // Verificar si las fechas realmente cambiaron comparando solo fechas (sin hora) usando UTC
    const currentStartDateOnly = new Date(Date.UTC(
      currentTask.start_date.getUTCFullYear(),
      currentTask.start_date.getUTCMonth(),
      currentTask.start_date.getUTCDate()
    ));
    const currentEndDateOnly = new Date(Date.UTC(
      currentTask.end_date.getUTCFullYear(),
      currentTask.end_date.getUTCMonth(),
      currentTask.end_date.getUTCDate()
    ));
    const datesChanged =
      currentStartDateOnly.getTime() !== startDateOnly.getTime() ||
      currentEndDateOnly.getTime() !== endDateOnly.getTime();

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
      select: {
        id: true,
        start_date: true,
        end_date: true,
        scheduler_instance_id: true,
      },
    });

    // Smart Dates: si el nuevo end_date supera el de la instancia, expandir el rango
    const instance = await prisma.studio_scheduler_event_instances.findUnique({
      where: { id: updatedTask.scheduler_instance_id },
      select: { id: true, end_date: true },
    });
    if (instance) {
      const taskEndOnly = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate()));
      const instanceEndOnly = new Date(Date.UTC(instance.end_date.getUTCFullYear(), instance.end_date.getUTCMonth(), instance.end_date.getUTCDate()));
      if (taskEndOnly > instanceEndOnly) {
        await prisma.studio_scheduler_event_instances.update({
          where: { id: instance.id },
          data: { end_date: taskEndOnly },
        });
      }
    }

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
 * Obtiene todas las tareas de un evento (por instancia del scheduler vinculada al evento).
 * Para el Asistente: rellena catalog_category_id desde el ítem (service_category_id) cuando la tarea no lo tiene.
 */
export async function obtenerSchedulerTareas(studioSlug: string, eventId: string) {
  try {
    const tareas = await prisma.studio_scheduler_event_tasks.findMany({
      where: {
        scheduler_instance: {
          event_id: eventId,
        },
      },
      select: {
        id: true,
        name: true,
        duration_days: true,
        category: true,
        catalog_category_id: true,
        catalog_category: { select: { id: true, name: true } },
        status: true,
        progress_percent: true,
        start_date: true,
        end_date: true,
        cotizacion_item_id: true,
        cotizacion_item: {
          select: {
            internal_delivery_days: true,
            service_category_id: true,
            items: { select: { service_category_id: true } },
          },
        },
      },
      orderBy: [{ category: 'asc' }, { start_date: 'asc' }],
    });

    const data = tareas.map((t) => {
      const fromItem = t.cotizacion_item?.service_category_id ?? t.cotizacion_item?.items?.service_category_id ?? null;
      return {
        ...t,
        catalog_category_id: t.catalog_category_id ?? fromItem ?? null,
      };
    });

    return {
      success: true,
      data,
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

/** Categorías de tarea válidas para tareas manuales (sin ítem de cotización) */
const MANUAL_TASK_CATEGORIES = [
  'PLANNING',
  'PRODUCTION',
  'POST_PRODUCTION',
  'REVIEW',
  'DELIVERY',
  'WARRANTY',
] as const;

/**
 * Crea una tarea manual en el Scheduler (sin cotizacion_item_id).
 * La fecha de inicio se determina por cascada: última tarea de esa categoría en la instancia.
 */
export async function crearTareaManualScheduler(
  studioSlug: string,
  eventId: string,
  params: {
    sectionId: string;
    stage: string;
    name: string;
    durationDays: number;
    catalog_category_id?: string | null;
    /** Costo estimado (budget_amount). Opcional. */
    budget_amount?: number | null;
  }
): Promise<{
  success: boolean;
  data?: {
    id: string;
    name: string;
    start_date: Date;
    end_date: Date;
    category: string;
    catalog_category_id: string | null;
    catalog_category_nombre: string | null;
    budget_amount: number | null;
    status: string;
    progress_percent: number;
    completed_at: Date | null;
    cotizacion_item_id: null;
    assigned_to_crew_member_id: string | null;
    assigned_to_crew_member: { id: string; name: string; email: string | null; tipo: string } | null;
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

    const category =
      MANUAL_TASK_CATEGORIES.includes(params.stage as (typeof MANUAL_TASK_CATEGORIES)[number])
        ? (params.stage as (typeof MANUAL_TASK_CATEGORIES)[number])
        : 'PLANNING';

    const durationDays = Math.max(1, Math.min(365, Math.round(params.durationDays) || 1));

    let instance = await prisma.studio_scheduler_event_instances.findUnique({
      where: { event_id: eventId },
      select: { id: true, start_date: true, end_date: true },
    });

    if (!instance) {
      const event = await prisma.studio_events.findUnique({
        where: { id: eventId },
        select: { event_date: true },
      });
      if (!event) {
        return { success: false, error: 'Evento no encontrado' };
      }
      const startDate = new Date(event.event_date);
      const endDate = new Date(event.event_date);
      endDate.setUTCDate(endDate.getUTCDate() + 30);
      instance = await prisma.studio_scheduler_event_instances.create({
        data: {
          event_id: eventId,
          event_date: event.event_date,
          start_date: startDate,
          end_date: endDate,
        },
        select: { id: true, start_date: true, end_date: true },
      });
    }

    const lastTaskInCategory = await prisma.studio_scheduler_event_tasks.findFirst({
      where: {
        scheduler_instance_id: instance.id,
        category,
      },
      orderBy: { end_date: 'desc' },
      select: { end_date: true },
    });

    const toUTCNoon = (d: Date) =>
      new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0));

    const startDate = lastTaskInCategory
      ? (() => {
          const next = new Date(lastTaskInCategory.end_date);
          next.setUTCDate(next.getUTCDate() + 1);
          return toUTCNoon(next);
        })()
      : toUTCNoon(instance.start_date);

    const endDate = new Date(startDate);
    endDate.setUTCDate(endDate.getUTCDate() + durationDays - 1);

    const task = await prisma.studio_scheduler_event_tasks.create({
      data: {
        scheduler_instance_id: instance.id,
        cotizacion_item_id: null,
        name: params.name.trim() || 'Tarea manual',
        duration_days: durationDays,
        category,
        start_date: startDate,
        end_date: toUTCNoon(endDate),
        sync_status: 'DRAFT',
        catalog_category_id: params.catalog_category_id ?? null,
        budget_amount: params.budget_amount != null && params.budget_amount >= 0 ? params.budget_amount : null,
      },
      select: {
        id: true,
        name: true,
        start_date: true,
        end_date: true,
        category: true,
        catalog_category_id: true,
        budget_amount: true,
        status: true,
        progress_percent: true,
        completed_at: true,
        catalog_category: { select: { name: true } },
        assigned_to_crew_member_id: true,
        assigned_to_crew_member: {
          select: { id: true, name: true, email: true, tipo: true },
        },
      },
    });

    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}/scheduler`);
    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}`);

    return {
      success: true,
      data: {
        id: task.id,
        name: task.name,
        start_date: task.start_date,
        end_date: task.end_date,
        category: task.category,
        catalog_category_id: task.catalog_category_id,
        catalog_category_nombre: task.catalog_category?.name ?? null,
        budget_amount: task.budget_amount != null ? Number(task.budget_amount) : null,
        status: task.status,
        progress_percent: task.progress_percent ?? 0,
        completed_at: task.completed_at,
        cotizacion_item_id: null,
        assigned_to_crew_member_id: task.assigned_to_crew_member_id,
        assigned_to_crew_member: task.assigned_to_crew_member
          ? {
              id: task.assigned_to_crew_member.id,
              name: task.assigned_to_crew_member.name,
              email: task.assigned_to_crew_member.email ?? null,
              tipo: task.assigned_to_crew_member.tipo,
            }
          : null,
      },
    };
  } catch (error) {
    console.error('[crearTareaManualScheduler] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al crear la tarea',
    };
  }
}

/**
 * Actualiza el costo estimado (budget_amount) de una tarea manual del scheduler.
 */
export async function actualizarCostoTareaManual(
  studioSlug: string,
  eventId: string,
  taskId: string,
  amount: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const task = await prisma.studio_scheduler_event_tasks.findFirst({
      where: {
        id: taskId,
        cotizacion_item_id: null,
        scheduler_instance: { event_id: eventId, event: { studio: { slug: studioSlug } } },
      },
      select: { id: true },
    });
    if (!task) {
      return { success: false, error: 'Tarea manual no encontrada' };
    }
    const value = amount < 0 ? 0 : amount;
    await prisma.studio_scheduler_event_tasks.update({
      where: { id: taskId },
      data: { budget_amount: value },
    });
    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}/scheduler`);
    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}`);
    return { success: true };
  } catch (error) {
    console.error('[actualizarCostoTareaManual] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar costo',
    };
  }
}

/**
 * Elimina una tarea manual del scheduler (cotizacion_item_id null).
 * No revalida path para permitir actualización optimista en cliente.
 */
export async function eliminarTareaManual(
  studioSlug: string,
  eventId: string,
  taskId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const task = await prisma.studio_scheduler_event_tasks.findFirst({
      where: {
        id: taskId,
        cotizacion_item_id: null,
        scheduler_instance: { event_id: eventId, event: { studio: { slug: studioSlug } } },
      },
      select: { id: true },
    });
    if (!task) {
      return { success: false, error: 'Tarea manual no encontrada' };
    }
    await prisma.studio_scheduler_event_tasks.delete({
      where: { id: taskId },
    });
    return { success: true };
  } catch (error) {
    console.error('[eliminarTareaManual] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al eliminar la tarea',
    };
  }
}

/**
 * Actualiza el nombre de una tarea manual del scheduler.
 */
export async function actualizarNombreTareaManual(
  studioSlug: string,
  eventId: string,
  taskId: string,
  name: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const task = await prisma.studio_scheduler_event_tasks.findFirst({
      where: {
        id: taskId,
        cotizacion_item_id: null,
        scheduler_instance: { event_id: eventId, event: { studio: { slug: studioSlug } } },
      },
      select: { id: true },
    });
    if (!task) {
      return { success: false, error: 'Tarea manual no encontrada' };
    }
    const trimmed = (name ?? '').trim() || 'Tarea manual';
    await prisma.studio_scheduler_event_tasks.update({
      where: { id: taskId },
      data: { name: trimmed },
    });
    return { success: true };
  } catch (error) {
    console.error('[actualizarNombreTareaManual] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar el nombre',
    };
  }
}

/**
 * Asigna o quita personal (crew) en una tarea del scheduler (para tareas manuales).
 */
export async function asignarCrewATareaScheduler(
  studioSlug: string,
  eventId: string,
  taskId: string,
  crewMemberId: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const task = await prisma.studio_scheduler_event_tasks.findFirst({
      where: {
        id: taskId,
        scheduler_instance: { event_id: eventId },
      },
      select: { id: true, scheduler_instance_id: true },
    });
    if (!task) {
      return { success: false, error: 'Tarea no encontrada' };
    }
    if (crewMemberId) {
      const member = await prisma.studio_crew_members.findFirst({
        where: {
          id: crewMemberId,
          studio: { slug: studioSlug },
        },
        select: { id: true },
      });
      if (!member) {
        return { success: false, error: 'Colaborador no encontrado' };
      }
    }
    const data = { assigned_to_crew_member_id: crewMemberId };
    await prisma.studio_scheduler_event_tasks.update({
      where: { id: taskId },
      data,
    });
    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}/scheduler`);
    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}`);
    return { success: true };
  } catch (error) {
    console.error('[asignarCrewATareaScheduler] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al asignar personal',
    };
  }
}

/**
 * Reordena una tarea manual (subir o bajar) dentro de su misma etapa y categoría,
 * permitiendo intercambiar con ítems comerciales (mismo catalog_category_id efectivo).
 */
export async function reordenarTareaManualScheduler(
  studioSlug: string,
  eventId: string,
  taskId: string,
  direction: 'up' | 'down'
): Promise<{ success: boolean; error?: string }> {
  try {
    const task = await prisma.studio_scheduler_event_tasks.findFirst({
      where: {
        id: taskId,
        cotizacion_item_id: null,
        scheduler_instance: { event_id: eventId },
      },
      select: { id: true, category: true, order: true, catalog_category_id: true, scheduler_instance_id: true },
    });
    if (!task) {
      return { success: false, error: 'Tarea no encontrada' };
    }

    const targetCatId = task.catalog_category_id ?? null;
    const allInStage = await prisma.studio_scheduler_event_tasks.findMany({
      where: {
        scheduler_instance_id: task.scheduler_instance_id,
        category: task.category,
      },
      select: {
        id: true,
        order: true,
        catalog_category_id: true,
        cotizacion_item_id: true,
        cotizacion_item: { select: { service_category_id: true } },
      },
      orderBy: [{ order: 'asc' }, { start_date: 'asc' }],
    });

    const siblings = allInStage.filter((t) => {
      const effective = t.cotizacion_item_id ? t.cotizacion_item?.service_category_id ?? null : t.catalog_category_id;
      return (effective ?? null) === targetCatId;
    });

    const idx = siblings.findIndex((s) => s.id === taskId);
    if (idx < 0) return { success: false, error: 'Tarea no encontrada' };
    if (direction === 'up' && idx === 0) return { success: true };
    if (direction === 'down' && idx === siblings.length - 1) return { success: true };

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const other = siblings[swapIdx]!;
    await prisma.$transaction([
      prisma.studio_scheduler_event_tasks.update({
        where: { id: taskId },
        data: { order: other.order },
      }),
      prisma.studio_scheduler_event_tasks.update({
        where: { id: other.id },
        data: { order: task.order },
      }),
    ]);

    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}/scheduler`);
    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}`);
    return { success: true };
  } catch (error) {
    console.error('[reordenarTareaManualScheduler] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al reordenar',
    };
  }
}

/**
 * Mueve una tarea manual a otra etapa (y opcionalmente a una categoría del catálogo).
 */
export async function moverTareaManualCategoria(
  studioSlug: string,
  eventId: string,
  taskId: string,
  category: string,
  catalogCategoryId?: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const validCategory = MANUAL_TASK_CATEGORIES.includes(category as (typeof MANUAL_TASK_CATEGORIES)[number])
      ? (category as (typeof MANUAL_TASK_CATEGORIES)[number])
      : 'PLANNING';

    const task = await prisma.studio_scheduler_event_tasks.findFirst({
      where: {
        id: taskId,
        cotizacion_item_id: null,
        scheduler_instance: { event_id: eventId },
      },
      select: { id: true, scheduler_instance_id: true },
    });
    if (!task) {
      return { success: false, error: 'Tarea no encontrada' };
    }

    const maxOrder = await prisma.studio_scheduler_event_tasks.aggregate({
      where: {
        scheduler_instance_id: task.scheduler_instance_id,
        cotizacion_item_id: null,
        category: validCategory,
        catalog_category_id: catalogCategoryId ?? null,
      },
      _max: { order: true },
    });
    const newOrder = (maxOrder._max.order ?? -1) + 1;

    await prisma.studio_scheduler_event_tasks.update({
      where: { id: taskId },
      data: {
        category: validCategory,
        catalog_category_id: catalogCategoryId ?? null,
        order: newOrder,
      },
    });

    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}/scheduler`);
    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}`);
    return { success: true };
  } catch (error) {
    console.error('[moverTareaManualCategoria] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al mover la tarea',
    };
  }
}

const CLASIFICAR_TASK_CATEGORIES = ['PLANNING', 'PRODUCTION', 'POST_PRODUCTION', 'REVIEW', 'DELIVERY', 'WARRANTY'] as const;

/**
 * Asigna categoría de catálogo y fase a cualquier tarea del scheduler (asistente de curaduría).
 * También actualiza la fuente de verdad: service_category_id en studio_cotizacion_items cuando
 * la tarea está ligada a un ítem de cotización, para que la sincronización no pierda la categorización.
 */
export async function clasificarTareaScheduler(
  studioSlug: string,
  eventId: string,
  taskId: string,
  category: string,
  catalogCategoryId: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const validCategory = CLASIFICAR_TASK_CATEGORIES.includes(category as (typeof CLASIFICAR_TASK_CATEGORIES)[number])
      ? (category as (typeof CLASIFICAR_TASK_CATEGORIES)[number])
      : 'PLANNING';

    const task = await prisma.studio_scheduler_event_tasks.findFirst({
      where: {
        id: taskId,
        scheduler_instance: { event_id: eventId },
      },
      select: { id: true, cotizacion_item_id: true },
    });
    if (!task) {
      return { success: false, error: 'Tarea no encontrada' };
    }

    await prisma.studio_scheduler_event_tasks.update({
      where: { id: taskId },
      data: {
        category: validCategory,
        catalog_category_id: catalogCategoryId,
      },
    });

    if (task.cotizacion_item_id && catalogCategoryId) {
      await prisma.studio_cotizacion_items.update({
        where: { id: task.cotizacion_item_id },
        data: { service_category_id: catalogCategoryId },
      });
    }

    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}/scheduler`);
    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}`);
    return { success: true };
  } catch (error) {
    console.error('[clasificarTareaScheduler] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al clasificar la tarea',
    };
  }
}

/**
 * Duplica una tarea manual (misma sección/etapa, nombre, costo, duración; estado PENDING).
 */
export async function duplicarTareaManualScheduler(
  studioSlug: string,
  eventId: string,
  taskId: string
): Promise<{
  success: boolean;
  data?: { id: string; task: { id: string; name: string; start_date: Date; end_date: Date; category: string; order: number; budget_amount: number | null; status: string } };
  error?: string;
}> {
  try {
    const task = await prisma.studio_scheduler_event_tasks.findFirst({
      where: {
        id: taskId,
        cotizacion_item_id: null,
        scheduler_instance: { event_id: eventId },
      },
      select: {
        id: true,
        scheduler_instance_id: true,
        name: true,
        start_date: true,
        end_date: true,
        duration_days: true,
        category: true,
        order: true,
        budget_amount: true,
        catalog_category_id: true,
      },
    });
    if (!task) {
      return { success: false, error: 'Tarea no encontrada' };
    }

    const maxOrder = await prisma.studio_scheduler_event_tasks.aggregate({
      where: {
        scheduler_instance_id: task.scheduler_instance_id,
        cotizacion_item_id: null,
        category: task.category,
        catalog_category_id: task.catalog_category_id ?? null,
      },
      _max: { order: true },
    });
    const newOrder = (maxOrder._max.order ?? -1) + 1;

    const lastInCategory = await prisma.studio_scheduler_event_tasks.findFirst({
      where: {
        scheduler_instance_id: task.scheduler_instance_id,
        category: task.category,
      },
      orderBy: { end_date: 'desc' },
      select: { end_date: true },
    });
    const toUTCNoon = (d: Date) =>
      new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0));
    const startDate = lastInCategory
      ? (() => {
          const next = new Date(lastInCategory.end_date);
          next.setUTCDate(next.getUTCDate() + 1);
          return toUTCNoon(next);
        })()
      : task.start_date;
    const endDate = new Date(startDate);
    endDate.setUTCDate(endDate.getUTCDate() + (task.duration_days || 1) - 1);

    const created = await prisma.studio_scheduler_event_tasks.create({
      data: {
        scheduler_instance_id: task.scheduler_instance_id,
        cotizacion_item_id: null,
        name: `${task.name} (copia)`,
        duration_days: task.duration_days || 1,
        category: task.category,
        catalog_category_id: task.catalog_category_id ?? null,
        start_date: startDate,
        end_date: toUTCNoon(endDate),
        sync_status: 'DRAFT',
        status: 'PENDING',
        progress_percent: 0,
        order: newOrder,
        budget_amount: task.budget_amount,
      },
      select: { id: true, name: true, start_date: true, end_date: true, category: true, order: true, budget_amount: true, status: true },
    });

    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}/scheduler`);
    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}`);

    return {
      success: true,
      data: {
        id: created.id,
        task: {
          id: created.id,
          name: created.name,
          start_date: created.start_date,
          end_date: created.end_date,
          category: created.category,
          order: created.order,
          budget_amount: created.budget_amount != null ? Number(created.budget_amount) : null,
          status: created.status,
        },
      },
    };
  } catch (error) {
    console.error('[duplicarTareaManualScheduler] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al duplicar la tarea',
    };
  }
}

/** Datos mínimos que la vista Scheduler necesita (ítems, tareas, crew, costos, sync, categorías). Paridad con Card: catalog_category_id en primer nivel (effectiveCatalogCategoryId). */
export interface SchedulerCotizacionItem {
  id: string;
  item_id: string | null;
  name: string | null;
  name_snapshot: string;
  quantity: number;
  order: number;
  cost?: number | null;
  cost_snapshot?: number;
  profit_type?: string | null;
  profit_type_snapshot?: string | null;
  /** Categoría efectiva para orden canónico: task.catalog_category_id ?? service_category_id ?? items.service_category_id. Mismo shape que Card. */
  catalog_category_id?: string | null;
  /** Categoría del ítem en el catálogo (para fallback cuando la tarea no tiene catalog_category_id). */
  service_category_id?: string | null;
  /** Resuelto: service_category_id del ítem o del item del catálogo (items.service_category_id). */
  resolved_service_category_id?: string | null;
  seccion_name: string | null;
  category_name: string | null;
  seccion_name_snapshot: string | null;
  category_name_snapshot: string | null;
  assigned_to_crew_member_id?: string | null;
  assigned_to_crew_member?: { id: string; name: string; tipo: string } | null;
  scheduler_task: {
    id: string;
    name: string;
    start_date: Date;
    end_date: Date;
    status: string;
    progress_percent: number | null;
    completed_at: Date | null;
    category: string;
    catalog_category_id: string | null;
    /** Nombre de la categoría del catálogo (para Asistente y fallback). */
    catalog_category?: { id: string; name: string } | null;
    order: number;
    assigned_to_crew_member_id: string | null;
    assigned_to_crew_member: { id: string; name: string; email: string | null; tipo: string } | null;
    sync_status?: string;
    invitation_status?: string | null;
  } | null;
}

/** Payload completo de obtenerTareasScheduler (evento + secciones). */
export interface TareasSchedulerPayload {
  id: string;
  name: string;
  event_date: Date | null;
  promise?: { id: string; name: string | null; event_date: Date | null } | null;
  cotizaciones: Array<{
    id: string;
    name: string | null;
    status: string;
    cotizacion_items: SchedulerCotizacionItem[];
  }>;
  scheduler: {
    id: string;
    start_date: Date | null;
    end_date: Date | null;
    tasks: Array<{
      id: string;
      name: string;
      start_date: Date;
      end_date: Date;
      status: string;
      progress_percent: number | null;
      completed_at: Date | null;
      cotizacion_item_id: string | null;
      category: string;
      catalog_category_id: string | null;
      catalog_category_nombre?: string | null;
      order: number;
      budget_amount: unknown;
      assigned_to_crew_member_id: string | null;
      assigned_to_crew_member: { id: string; name: string; email: string | null; tipo: string } | null;
    }>;
  } | null;
  secciones: SeccionData[];
}

/** Lo que la vista Scheduler necesita: evento + cotizaciones + scheduler (sin secciones). Acepta EventoDetalle o payload de obtenerTareasScheduler. */
export type SchedulerData = Omit<TareasSchedulerPayload, 'secciones'>;

/** Ítem mínimo que comparten EventoDetalle y SchedulerData para la vista (evita undefined en hijos). */
export type SchedulerItemForView = SchedulerCotizacionItem;

/**
 * Carga atómica para el Scheduler: solo datos necesarios (ítems, tareas, secciones).
 * No usa obtenerEventoDetalle para evitar profundidad de relaciones y timeouts.
 */
export async function obtenerTareasScheduler(
  studioSlug: string,
  eventId: string,
  cotizacionId?: string | null
): Promise<{ success: boolean; data?: TareasSchedulerPayload; error?: string }> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });
    if (!studio) return { success: false, error: 'Studio no encontrado' };

    const event = await prisma.studio_events.findFirst({
      where: { id: eventId, studio_id: studio.id },
      select: {
        id: true,
        event_date: true,
        cotizacion_id: true,
        promise_id: true,
        promise: { select: { id: true, name: true, event_date: true } },
      },
    });
    if (!event) return { success: false, error: 'Evento no encontrado' };

    const [schedulerInstance, cotizacionesRows, seccionesResult] = await Promise.all([
      prisma.studio_scheduler_event_instances.findFirst({
        where: { event_id: eventId },
        select: {
          id: true,
          start_date: true,
          end_date: true,
          tasks: {
            select: {
              id: true,
              name: true,
              start_date: true,
              end_date: true,
              status: true,
              progress_percent: true,
              completed_at: true,
              cotizacion_item_id: true,
              category: true,
              catalog_category_id: true,
              catalog_category: {
                select: { id: true, name: true },
              },
              order: true,
              budget_amount: true,
              assigned_to_crew_member_id: true,
              assigned_to_crew_member: {
                select: { id: true, name: true, email: true, tipo: true },
              },
            },
            orderBy: [{ category: 'asc' }, { start_date: 'asc' }],
          },
        },
      }),
      prisma.studio_cotizaciones.findMany({
        where: {
          OR: [
            { evento_id: eventId },
            ...(event.cotizacion_id ? [{ id: event.cotizacion_id }] : []),
          ],
          status: { in: ['autorizada', 'aprobada', 'approved'] },
        },
        select: {
          id: true,
          name: true,
          status: true,
          cotizacion_items: {
            // Paridad con Card: orden inicial por category + start_date se aplica en JS (orderItemsLikeCard). Select idéntico en campos de estructura (catalog_category_id, service_category_id, items.service_category_id).
            orderBy: [{ order: 'asc' }],
            select: {
              ...COTIZACION_ITEMS_SELECT_STANDARD,
              cost: true,
              cost_snapshot: true,
              profit_type: true,
              profit_type_snapshot: true,
              service_category_id: true,
              service_categories: {
                select: {
                  id: true,
                  name: true,
                  order: true,
                  section_categories: { select: { service_sections: { select: { id: true, name: true, order: true } } } },
                },
              },
              items: {
                select: {
                  order: true,
                  service_category_id: true,
                  service_categories: {
                    select: {
                      id: true,
                      name: true,
                      order: true,
                      section_categories: { select: { service_sections: { select: { id: true, name: true, order: true } } } },
                    },
                  },
                },
              },
              assigned_to_crew_member_id: true,
              assigned_to_crew_member: {
                select: { id: true, name: true, tipo: true },
              },
              scheduler_task: {
                select: {
                  id: true,
                  name: true,
                  start_date: true,
                  end_date: true,
                  status: true,
                  progress_percent: true,
                  completed_at: true,
                  category: true,
                  catalog_category_id: true,
                  catalog_category: {
                    select: { id: true, name: true },
                  },
                  order: true,
                  assigned_to_crew_member_id: true,
                  assigned_to_crew_member: {
                    select: { id: true, name: true, email: true, tipo: true },
                  },
                  sync_status: true,
                  invitation_status: true,
                },
              },
            },
          },
        },
      }),
      obtenerCatalogo(studioSlug, true),
    ]);

    const secciones = seccionesResult.success && seccionesResult.data ? seccionesResult.data : [];
    const getCategoryId = (item: (typeof cotizacionesRows)[0]['cotizacion_items'][0]): string | null =>
      item.scheduler_task?.catalog_category_id ?? item.service_category_id ?? item.items?.service_category_id ?? null;
    const getName = (item: (typeof cotizacionesRows)[0]['cotizacion_items'][0]): string | null =>
      item.scheduler_task?.name ?? item.name ?? item.name_snapshot ?? null;

    // Paridad con Card (obtenerSchedulerTareas): mismo orderBy [category asc, start_date asc] para orden inicial.
    const orderItemsLikeCard = <T extends { scheduler_task?: { category?: string; start_date?: Date } | null }>(items: T[]): T[] =>
      [...items].sort((a, b) => {
        const catA = a.scheduler_task?.category ?? 'PLANNING';
        const catB = b.scheduler_task?.category ?? 'PLANNING';
        if (catA !== catB) return catA.localeCompare(catB);
        const dateA = a.scheduler_task?.start_date ? new Date(a.scheduler_task.start_date).getTime() : 0;
        const dateB = b.scheduler_task?.start_date ? new Date(b.scheduler_task.start_date).getTime() : 0;
        return dateA - dateB;
      });

    let cotizaciones = cotizacionesRows.map((c) => {
      const withSameOrderAsCard = orderItemsLikeCard(c.cotizacion_items);
      const orderedItems =
        secciones.length > 0
          ? ordenarPorEstructuraCanonica(withSameOrderAsCard, secciones, getCategoryId, getName)
          : withSameOrderAsCard;
      return {
        id: c.id,
        name: c.name,
        status: c.status,
        cotizacion_items: orderedItems.map((item) => {
          const resolved_service_category_id = item.service_category_id ?? item.items?.service_category_id ?? null;
          const effectiveCatalogCategoryId = item.scheduler_task?.catalog_category_id ?? resolved_service_category_id;
          return {
            id: item.id,
            item_id: item.item_id,
            name: item.scheduler_task?.name ?? item.name ?? item.name_snapshot ?? null,
            name_snapshot: item.name_snapshot,
            quantity: item.quantity,
            order: item.order,
            cost: item.cost,
            cost_snapshot: item.cost_snapshot,
            profit_type: item.profit_type,
            profit_type_snapshot: item.profit_type_snapshot,
            service_category_id: item.service_category_id,
            resolved_service_category_id,
            catalog_category_id: effectiveCatalogCategoryId,
            seccion_name: item.seccion_name,
            category_name: item.category_name,
            seccion_name_snapshot: item.seccion_name_snapshot,
            category_name_snapshot: item.category_name_snapshot,
            assigned_to_crew_member_id: item.assigned_to_crew_member_id,
            assigned_to_crew_member: item.assigned_to_crew_member,
            scheduler_task: item.scheduler_task
              ? {
                  ...item.scheduler_task,
                  catalog_category_id: effectiveCatalogCategoryId ?? item.scheduler_task.catalog_category_id,
                  catalog_category: item.scheduler_task.catalog_category,
                  progress_percent: item.scheduler_task.progress_percent,
                  completed_at: item.scheduler_task.completed_at,
                  assigned_to_crew_member: item.scheduler_task.assigned_to_crew_member,
                  sync_status: item.scheduler_task.sync_status,
                  invitation_status: item.scheduler_task.invitation_status,
                }
              : null,
          };
        }),
      };
    });

    if (cotizacionId) {
      cotizaciones = cotizaciones.filter((c) => c.id === cotizacionId);
    }

    const tasks = schedulerInstance?.tasks ?? [];
    const payload: TareasSchedulerPayload = {
      id: event.id,
      name: event.promise?.name ?? 'Evento',
      event_date: event.event_date || event.promise?.event_date || null,
      promise: event.promise
        ? {
            id: event.promise.id,
            name: event.promise.name,
            event_date: event.promise.event_date,
          }
        : null,
      cotizaciones,
      scheduler: schedulerInstance
        ? {
            id: schedulerInstance.id,
            start_date: schedulerInstance.start_date,
            end_date: schedulerInstance.end_date,
            tasks: tasks.map((t) => ({
              ...t,
              catalog_category_nombre: t.catalog_category?.name ?? null,
              progress_percent: t.progress_percent,
              completed_at: t.completed_at,
              budget_amount: t.budget_amount != null ? Number(t.budget_amount) : null,
              assigned_to_crew_member: t.assigned_to_crew_member,
            })),
          }
        : null,
      secciones: seccionesResult.success && seccionesResult.data ? seccionesResult.data : [],
    };

    return { success: true, data: payload };
  } catch (error) {
    console.error('[obtenerTareasScheduler] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al cargar tareas del scheduler',
    };
  }
}
