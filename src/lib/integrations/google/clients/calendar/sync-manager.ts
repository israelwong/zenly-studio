'use server';

import { prisma } from '@/lib/prisma';
import { getGoogleCalendarClient } from './client';
import { obtenerOCrearCalendarioSecundario } from './calendar-manager';
import { obtenerTimezoneEstudio } from './timezone';

/**
 * Obtiene el email del colaborador asignado a una tarea
 * La asignación se hace a través de cotizacion_item.assigned_to_crew_member_id
 */
/**
 * Valida que un email sea válido
 */
function esEmailValido(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

async function obtenerEmailsColaboradores(
  cotizacionItemId: string | null
): Promise<Array<{ email: string }>> {
  if (!cotizacionItemId) return [];

  const cotizacionItem = await prisma.studio_cotizacion_items.findUnique({
    where: { id: cotizacionItemId },
    include: {
      assigned_to_crew_member: {
        select: { email: true },
      },
    },
  });

  // El email del crew member está directamente en el modelo
  // Validar que el email sea válido antes de agregarlo
  if (
    cotizacionItem?.assigned_to_crew_member?.email &&
    esEmailValido(cotizacionItem.assigned_to_crew_member.email)
  ) {
    return [{ email: cotizacionItem.assigned_to_crew_member.email }];
  }

  // Si el email no es válido, loguear advertencia
  if (
    cotizacionItem?.assigned_to_crew_member &&
    !cotizacionItem.assigned_to_crew_member.email
  ) {
    console.warn(
      `[Google Calendar] Crew member asignado no tiene email: ${cotizacionItem.assigned_to_crew_member}`
    );
  }

  return [];
}

/**
 * Obtiene el nombre del estudio
 */
async function obtenerNombreEstudio(studioSlug: string): Promise<string> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { studio_name: true },
    });
    return studio?.studio_name || 'Zenly Studio';
  } catch (error) {
    console.error('[Google Calendar] Error obteniendo nombre del estudio:', error);
    return 'Zenly Studio';
  }
}

/**
 * Construye la URL de la tarea en la aplicación
 */
function construirUrlTarea(
  studioSlug: string,
  eventId: string,
  taskId: string
): string {
  // URL base del scheduler del evento
  // La tarea se puede identificar por su ID en el contexto del scheduler
  return `/${studioSlug}/studio/business/events/${eventId}/scheduler#task-${taskId}`;
}

/**
 * Sincroniza una tarea de cronograma con Google Calendar
 * Implementa lógica UPSERT: actualiza si existe, crea si no existe
 *
 * @param taskId - ID de la tarea en la base de datos
 * @param studioSlug - Slug del estudio
 * @param userTimezone - Timezone del navegador del usuario (opcional)
 * @returns ID del evento en Google Calendar
 */
export async function sincronizarTareaConGoogle(
  taskId: string,
  studioSlug: string,
  userTimezone?: string
): Promise<string> {
  try {
    // Obtener la tarea con todas las relaciones necesarias
    const task = await prisma.studio_scheduler_event_tasks.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        name: true,
        description: true,
        start_date: true,
        end_date: true,
        google_calendar_id: true,
        google_event_id: true,
        cotizacion_item_id: true,
        scheduler_instance: {
          select: {
            event_id: true,
            event: {
              select: {
                id: true,
                promise: {
                  select: {
                    name: true,
                    status: true,
                  },
                },
                event_type: {
                  select: {
                    name: true,
                  },
                },
                studio: {
                  select: {
                    slug: true,
                  },
                },
              },
            },
          },
        },
        cotizacion_item: {
          select: {
            id: true,
            name: true,
            name_snapshot: true,
            assigned_to_crew_member: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!task) {
      throw new Error('Tarea no encontrada');
    }

    const eventId = task.scheduler_instance.event.id;
    const timezone = await obtenerTimezoneEstudio(studioSlug, userTimezone);
    const calendarId = await obtenerOCrearCalendarioSecundario(studioSlug);

    // Si no hay calendario secundario (no hay cuenta conectada), no sincronizar
    if (!calendarId) {
      throw new Error('No hay cuenta de Google Calendar conectada');
    }

    // Obtener nombre del item (más descriptivo que el nombre de la tarea)
    const itemName = task.cotizacion_item?.name || 
                     task.cotizacion_item?.name_snapshot || 
                     task.name;

    // Obtener información del evento
    const eventName = task.scheduler_instance.event.promise?.name || 'Evento sin nombre';
    const eventTypeName = task.scheduler_instance.event.event_type?.name || null;

    // Obtener emails de colaboradores desde cotizacion_item.assigned_to_crew_member
    const attendees = await obtenerEmailsColaboradores(task.cotizacion_item_id);

    // Si la tarea tiene google_event_id pero no tiene personal asignado, cancelar el evento
    if (task.google_event_id && attendees.length === 0) {
      console.log(
        `[Google Calendar] Tarea ${taskId} tiene evento pero no tiene personal, cancelando invitación...`
      );
      
      try {
        await eliminarEventoGoogle(calendarId, task.google_event_id);
        
        // Limpiar referencias de Google Calendar en la base de datos
        await prisma.studio_scheduler_event_tasks.update({
          where: { id: taskId },
          data: {
            google_event_id: null,
            google_calendar_id: null,
            invitation_status: null,
          },
        });
        
        console.log(
          `[Google Calendar] ✅ Evento ${task.google_event_id} cancelado para tarea ${taskId} (sin personal)`
        );
        
        // Retornar string vacío para indicar que no hay evento sincronizado
        // Esto permite que la función complete sin error pero sin crear/actualizar evento
        return '';
      } catch (error: any) {
        // Si el evento ya no existe (404), limpiar referencias y retornar
        if (error?.code === 404 || error?.response?.status === 404) {
          await prisma.studio_scheduler_event_tasks.update({
            where: { id: taskId },
            data: {
              google_event_id: null,
              google_calendar_id: null,
              invitation_status: null,
            },
          });
          console.log(
            `[Google Calendar] Evento ${task.google_event_id} ya no existe, referencias limpiadas`
          );
          return '';
        }
        // Otro tipo de error, relanzar
        throw error;
      }
    }

    // Log para debugging
    if (attendees.length > 0) {
      console.log(
        `[Google Calendar] Invitando a ${attendees.length} colaborador(es):`,
        attendees.map((a) => a.email).join(', ')
      );
    } else {
      console.warn(
        `[Google Calendar] No hay emails válidos para invitar en tarea ${taskId}`
      );
    }

    // Asunto simplificado: "Invitación: [nombre item]"
    const summary = `Invitación: ${itemName}`;

    // Descripción simplificada: "nombre tarea. tipo de evento nombre evento"
    const descriptionParts: string[] = [task.name];
    if (eventTypeName) {
      descriptionParts.push(eventTypeName);
    }
    descriptionParts.push(eventName);
    const description = descriptionParts.join('. ').trim();

    const eventData: any = {
      summary: summary,
      description: description.trim(),
      start: {
        dateTime: task.start_date.toISOString(),
        timeZone: timezone,
      },
      end: {
        dateTime: task.end_date.toISOString(),
        timeZone: timezone,
      },
    };

    // Solo agregar attendees si hay emails válidos
    if (attendees.length > 0) {
      eventData.attendees = attendees;
    }

    const { calendar } = await getGoogleCalendarClient(studioSlug);

    // Lógica UPSERT: Si ya tiene google_event_id, intentar actualizar
    if (task.google_event_id) {
      try {
        const updateParams: any = {
          calendarId: calendarId,
          eventId: task.google_event_id,
          requestBody: eventData,
        };

        // Solo enviar actualizaciones si hay attendees
        if (attendees.length > 0) {
          updateParams.sendUpdates = 'all';
        }

        const updatedEvent = await calendar.events.update(updateParams);

        // Verificar que el evento fue actualizado correctamente
        if (updatedEvent.data.id) {
          // Actualizar google_calendar_id en la BD para asegurar que apunte al calendario secundario correcto
          await prisma.studio_scheduler_event_tasks.update({
            where: { id: taskId },
            data: {
              google_calendar_id: calendarId,
            },
          });
          
          console.log(
            `[Google Calendar] ✅ Tarea ${taskId} actualizada en Google Calendar: ${updatedEvent.data.id}`
          );
          return updatedEvent.data.id;
        }
      } catch (error: any) {
        // Si el error es 404, el evento fue eliminado manualmente en Google
        if (error?.code === 404 || error?.response?.status === 404) {
          console.warn(
            `[Google Calendar] Evento ${task.google_event_id} no encontrado en Google, creando uno nuevo...`
          );
          // Continuar para crear uno nuevo
        } else {
          // Otro tipo de error, relanzar
          console.error(
            `[Google Calendar] Error actualizando evento para tarea ${taskId}:`,
            error
          );
          throw new Error(
            `Error al actualizar evento en Google Calendar: ${error?.message || 'Error desconocido'}`
          );
        }
      }
    }

    // Si no tiene google_event_id o el evento no existe, crear uno nuevo
    try {
      const insertParams: any = {
        calendarId: calendarId,
        requestBody: eventData,
      };

      // Solo enviar actualizaciones si hay attendees
      if (attendees.length > 0) {
        insertParams.sendUpdates = 'all';
      }

      const newEvent = await calendar.events.insert(insertParams);

      const newEventId = newEvent.data.id;

      if (!newEventId) {
        throw new Error('No se pudo obtener el ID del evento creado');
      }

      // Guardar google_event_id y google_calendar_id en la base de datos
      await prisma.studio_scheduler_event_tasks.update({
        where: { id: taskId },
        data: {
          google_calendar_id: calendarId,
          google_event_id: newEventId,
        },
      });

      console.log(
        `[Google Calendar] ✅ Tarea ${taskId} creada en Google Calendar: ${newEventId}`
      );

      return newEventId;
    } catch (error: any) {
      console.error(
        `[Google Calendar] Error creando evento para tarea ${taskId}:`,
        error
      );
      throw new Error(
        `Error al crear evento en Google Calendar: ${error?.message || 'Error desconocido'}`
      );
    }
  } catch (error: any) {
    console.error(
      `[Google Calendar] Error sincronizando tarea ${taskId}:`,
      error
    );
    throw error;
  }
}

/**
 * Elimina un evento de Google Calendar cuando se elimina una tarea
 *
 * @param calendarId - ID del calendario donde está el evento
 * @param eventId - ID del evento en Google Calendar
 * @returns true si se eliminó correctamente, false si no existía
 */
export async function eliminarEventoGoogle(
  calendarId: string,
  eventId: string
): Promise<boolean> {
  try {
    // Obtener studioSlug desde calendarId (necesitamos el cliente)
    // Como no tenemos studioSlug directamente, necesitamos buscarlo
    const studio = await prisma.studios.findFirst({
      where: { google_calendar_secondary_id: calendarId },
      select: { slug: true },
    });

    if (!studio) {
      throw new Error('Studio no encontrado para el calendario proporcionado');
    }

    const { calendar } = await getGoogleCalendarClient(studio.slug);

    await calendar.events.delete({
      calendarId: calendarId,
      eventId: eventId,
      sendUpdates: 'all', // Notificar a attendees que el evento fue cancelado
    });

    console.log(
      `[Google Calendar] ✅ Evento ${eventId} eliminado de Google Calendar`
    );

    return true;
  } catch (error: any) {
    // Si el error es 404, el evento ya no existe (no es crítico)
    if (error?.code === 404 || error?.response?.status === 404) {
      console.warn(
        `[Google Calendar] Evento ${eventId} ya no existe en Google Calendar`
      );
      return false; // No existe, pero no es un error crítico
    }

    // Otro tipo de error, relanzar
    console.error(
      `[Google Calendar] Error eliminando evento ${eventId}:`,
      error
    );
    throw new Error(
      `Error al eliminar evento de Google Calendar: ${error?.message || 'Error desconocido'}`
    );
  }
}

/**
 * Elimina un evento de Google Calendar usando el taskId
 * Versión más conveniente que busca el calendarId y eventId desde la tarea
 *
 * @param taskId - ID de la tarea en la base de datos
 * @returns true si se eliminó correctamente, false si no tenía evento o no existía
 */
export async function eliminarEventoGooglePorTarea(
  taskId: string
): Promise<boolean> {
  try {
    // Obtener la tarea con google_calendar_id, google_event_id y studioSlug
    const task = await prisma.studio_scheduler_event_tasks.findUnique({
      where: { id: taskId },
      select: {
        google_calendar_id: true,
        google_event_id: true,
        scheduler_instance: {
          select: {
            event: {
              select: {
                studio: {
                  select: {
                    slug: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Si no tiene google_event_id, no hay nada que eliminar
    if (!task?.google_event_id || !task?.google_calendar_id) {
      console.log(
        `[Google Calendar] Tarea ${taskId} no tiene evento en Google Calendar`
      );
      return false;
    }

    const studioSlug = task.scheduler_instance.event.studio.slug;

    // Actualizar el evento antes de eliminarlo para asegurar que tenga el formato correcto
    // Esto garantiza que el correo de cancelación tenga la misma información que la invitación
    try {
      await sincronizarTareaConGoogle(taskId, studioSlug);
      console.log(
        `[Google Calendar] Evento ${task.google_event_id} actualizado antes de cancelación`
      );
    } catch (error: any) {
      // Si falla la actualización, continuar con la eliminación de todas formas
      console.warn(
        `[Google Calendar] No se pudo actualizar evento antes de cancelación: ${error?.message}`
      );
    }

    // Eliminar el evento
    return await eliminarEventoGoogle(task.google_calendar_id, task.google_event_id);
  } catch (error: any) {
    console.error(
      `[Google Calendar] Error eliminando evento por tarea ${taskId}:`,
      error
    );
    throw error;
  }
}

/**
 * Sincroniza un evento principal (studio_events) con Google Calendar
 * Los eventos principales van al calendario primario del usuario
 *
 * @param eventId - ID del evento en la base de datos
 * @param studioSlug - Slug del estudio
 * @param userTimezone - Timezone del usuario (opcional)
 * @returns ID del evento en Google Calendar
 */
export async function sincronizarEventoPrincipal(
  eventId: string,
  studioSlug: string,
  userTimezone?: string
): Promise<string> {
  try {
    // Obtener el evento con todas las relaciones necesarias
    const event = await prisma.studio_events.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        event_date: true,
        google_event_id: true,
        promise: {
          select: {
            id: true,
            name: true,
            event_date: true,
            contact: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        event_type: {
          select: {
            name: true,
          },
        },
        studio: {
          select: {
            id: true,
            slug: true,
            studio_name: true,
            google_oauth_email: true,
          },
        },
        contact: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!event) {
      throw new Error('Evento no encontrado');
    }

    // Verificar que el estudio tenga Google Calendar conectado
    // Si no tiene google_oauth_email, usar "primary" que es el calendario primario del usuario autenticado
    const calendarId = event.studio.google_oauth_email || 'primary';
    const timezone = await obtenerTimezoneEstudio(studioSlug, userTimezone);
    const studioName = event.studio.studio_name || 'Zenly Studio';

    // Obtener información del evento
    const eventName = event.promise?.name || 'Evento sin nombre';
    const eventTypeName = event.event_type?.name || null;

    // Construir título: [nombre evento] - [tipo] (si existe)
    const summaryParts: string[] = [eventName];
    if (eventTypeName) {
      summaryParts.push(eventTypeName);
    }
    const summary = summaryParts.join(' - ');

    // Construir descripción
    const descriptionParts: string[] = [];
    descriptionParts.push('━━━━━━━━━━━━━━━━━━━━');
    descriptionParts.push('📋 INFORMACIÓN DEL EVENTO');
    descriptionParts.push('━━━━━━━━━━━━━━━━━━━━');
    
    if (eventTypeName) {
      descriptionParts.push(`🎯 Tipo de Evento: ${eventTypeName}`);
    }
    descriptionParts.push(`📅 Evento: ${eventName}`);
    descriptionParts.push(`🏢 Estudio: ${studioName}`);

    const description = descriptionParts.join('\n').trim();

    // Preparar datos del evento usando métodos UTC para evitar problemas de zona horaria
    const eventDate = event.promise?.event_date || event.event_date;
    // Normalizar fecha usando UTC con mediodía como buffer
    const eventDateNormalized = eventDate instanceof Date 
      ? new Date(Date.UTC(
          eventDate.getUTCFullYear(),
          eventDate.getUTCMonth(),
          eventDate.getUTCDate(),
          12, 0, 0
        ))
      : new Date(Date.UTC(
          new Date(eventDate).getUTCFullYear(),
          new Date(eventDate).getUTCMonth(),
          new Date(eventDate).getUTCDate(),
          12, 0, 0
        ));
    
    // Crear fecha de inicio y fin usando UTC
    const startDateTime = new Date(eventDateNormalized);
    // Duración por defecto: 1 hora, agregar usando UTC
    const endDateTime = new Date(Date.UTC(
      startDateTime.getUTCFullYear(),
      startDateTime.getUTCMonth(),
      startDateTime.getUTCDate(),
      startDateTime.getUTCHours() + 1,
      startDateTime.getUTCMinutes(),
      startDateTime.getUTCSeconds()
    ));

    const eventData: any = {
      summary: summary,
      description: description,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: timezone,
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: timezone,
      },
      // NO invitamos al cliente: el evento va al calendario del estudio
      // Solo las tareas operativas invitan al personal asignado
    };

    const { calendar } = await getGoogleCalendarClient(studioSlug);

    // Lógica UPSERT: Si ya tiene google_event_id, actualizar
    if (event.google_event_id) {
      try {
        const updateParams: any = {
          calendarId: calendarId,
          eventId: event.google_event_id,
          requestBody: eventData,
          // No hay attendees en eventos principales, no enviamos actualizaciones
        };

        const updatedEvent = await calendar.events.update(updateParams);

        if (updatedEvent.data.id) {
          console.log(
            `[Google Calendar] ✅ Evento principal ${eventId} actualizado en Google Calendar: ${updatedEvent.data.id}`
          );
          return updatedEvent.data.id;
        }
      } catch (error: any) {
        // Si el error es 404, el evento fue eliminado manualmente en Google
        if (error?.code === 404 || error?.response?.status === 404) {
          console.warn(
            `[Google Calendar] Evento ${event.google_event_id} no encontrado en Google, creando uno nuevo...`
          );
          // Continuar para crear uno nuevo
        } else {
          console.error(
            `[Google Calendar] Error actualizando evento principal ${eventId}:`,
            error
          );
          throw new Error(
            `Error al actualizar evento en Google Calendar: ${error?.message || 'Error desconocido'}`
          );
        }
      }
    }

    // Si no tiene google_event_id o el evento no existe, crear uno nuevo
    try {
      const insertParams: any = {
        calendarId: calendarId,
        requestBody: eventData,
        // No hay attendees en eventos principales, no enviamos actualizaciones
      };

      const newEvent = await calendar.events.insert(insertParams);

      const newEventId = newEvent.data.id;
      if (!newEventId) {
        throw new Error('No se pudo obtener el ID del evento creado');
      }

      // Guardar google_event_id en la base de datos
      await prisma.studio_events.update({
        where: { id: eventId },
        data: { google_event_id: newEventId },
      });

      console.log(
        `[Google Calendar] ✅ Evento principal ${eventId} creado en Google Calendar: ${newEventId}`
      );

      return newEventId;
    } catch (error: any) {
      console.error(
        `[Google Calendar] Error creando evento principal ${eventId}:`,
        error
      );
      throw new Error(
        `Error al crear evento en Google Calendar: ${error?.message || 'Error desconocido'}`
      );
    }
  } catch (error: any) {
    console.error(
      `[Google Calendar] Error sincronizando evento principal ${eventId}:`,
      error
    );
    throw error;
  }
}

/**
 * Elimina un evento principal de Google Calendar
 *
 * @param eventId - ID del evento en la base de datos
 * @returns true si se eliminó correctamente, false si no tenía evento o no existía
 */
export async function eliminarEventoPrincipalGoogle(
  eventId: string
): Promise<boolean> {
  try {
    const event = await prisma.studio_events.findUnique({
      where: { id: eventId },
      select: {
        google_event_id: true,
        studio: {
          select: {
            slug: true,
            google_oauth_email: true,
          },
        },
      },
    });

    if (!event?.google_event_id) {
      console.log(
        `[Google Calendar] Evento ${eventId} no tiene evento en Google Calendar`
      );
      return false;
    }

    // Si no tiene google_oauth_email, usar "primary" que es el calendario primario del usuario autenticado
    const calendarId = event.studio.google_oauth_email || 'primary';
    const studioSlug = event.studio.slug;

    // Actualizar el evento antes de eliminarlo para asegurar que tenga el formato correcto
    try {
      await sincronizarEventoPrincipal(eventId, studioSlug);
      console.log(
        `[Google Calendar] Evento ${event.google_event_id} actualizado antes de cancelación`
      );
    } catch (error: any) {
      console.warn(
        `[Google Calendar] No se pudo actualizar evento antes de cancelación: ${error?.message}`
      );
    }

    const { calendar } = await getGoogleCalendarClient(studioSlug);

    await calendar.events.delete({
      calendarId: calendarId,
      eventId: event.google_event_id,
      sendUpdates: 'all', // Notificar a attendees que el evento fue cancelado
    });

    console.log(
      `[Google Calendar] ✅ Evento principal ${eventId} eliminado de Google Calendar`
    );

    return true;
  } catch (error: any) {
    // Si el error es 404, el evento ya no existe (no es crítico)
    if (error?.code === 404 || error?.response?.status === 404) {
      console.warn(
        `[Google Calendar] Evento ${eventId} ya no existe en Google Calendar`
      );
      return false;
    }

    console.error(
      `[Google Calendar] Error eliminando evento principal ${eventId}:`,
      error
    );
    throw new Error(
      `Error al eliminar evento de Google Calendar: ${error?.message || 'Error desconocido'}`
    );
  }
}

