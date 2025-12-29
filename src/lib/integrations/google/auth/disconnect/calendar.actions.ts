'use server';

import { prisma } from '@/lib/prisma';
import {
  eliminarEventoGoogle,
  eliminarEventoPrincipalGoogle,
} from '@/lib/integrations/google/clients/calendar/sync-manager';
import { obtenerOCrearCalendarioSecundario } from '@/lib/integrations/google/clients/calendar/calendar-manager';
import { createClient } from '@/lib/supabase/server';
import { StudioRole } from '@prisma/client';

export interface DesvincularRecursoGoogleResult {
  success: boolean;
  eventosEliminados?: number;
  error?: string;
}

/**
 * Verifica si el usuario tiene permisos de ADMIN o OWNER en el studio
 */
async function verificarPermisosDesconexion(
  studioSlug: string
): Promise<{ tienePermiso: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { tienePermiso: false, error: 'Usuario no autenticado' };
    }

    // Buscar usuario en la base de datos
    const dbUser = await prisma.users.findUnique({
      where: { supabase_id: user.id },
      select: { id: true },
    });

    if (!dbUser) {
      return { tienePermiso: false, error: 'Usuario no encontrado' };
    }

    // Buscar studio
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { tienePermiso: false, error: 'Studio no encontrado' };
    }

    // Verificar rol del usuario en el studio
    const userRole = await prisma.user_studio_roles.findFirst({
      where: {
        user_id: dbUser.id,
        studio_id: studio.id,
        is_active: true,
      },
      select: { role: true },
    });

    if (!userRole) {
      return {
        tienePermiso: false,
        error: 'No tienes permisos para desconectar Google Calendar',
      };
    }

    // Solo OWNER y ADMIN pueden desconectar
    if (userRole.role !== StudioRole.OWNER && userRole.role !== StudioRole.ADMIN) {
      return {
        tienePermiso: false,
        error: 'Solo los administradores pueden desconectar Google Calendar',
      };
    }

    return { tienePermiso: true };
  } catch (error) {
    console.error('[verificarPermisosDesconexion] Error:', error);
    return {
      tienePermiso: false,
      error: 'Error al verificar permisos',
    };
  }
}

/**
 * Cuenta cuántos eventos están sincronizados con Google Calendar
 */
async function contarEventosSincronizados(
  studioId: string
): Promise<{ tareas: number; eventos: number }> {
  // Contar tareas con google_event_id
  const tareasCount = await prisma.studio_scheduler_event_tasks.count({
    where: {
      scheduler_instance: {
        event: {
          studio_id: studioId,
        },
      },
      google_event_id: {
        not: null,
      },
    },
  });

  // Contar eventos principales con google_event_id
  const eventosCount = await prisma.studio_events.count({
    where: {
      studio_id: studioId,
      google_event_id: {
        not: null,
      },
    },
  });

  return { tareas: tareasCount, eventos: eventosCount };
}

/**
 * Elimina eventos de Google Calendar en lotes (para evitar timeouts)
 */
async function eliminarEventosEnLotes(
  studioSlug: string,
  limpiarEventos: boolean
): Promise<{ tareasEliminadas: number; eventosEliminados: number }> {
  if (!limpiarEventos) {
    return { tareasEliminadas: 0, eventosEliminados: 0 };
  }

  const studio = await prisma.studios.findUnique({
    where: { slug: studioSlug },
    select: { id: true, google_calendar_secondary_id: true },
  });

  if (!studio) {
    throw new Error('Studio no encontrado');
  }

  let tareasEliminadas = 0;
  let eventosEliminados = 0;

  // Obtener calendario secundario (para tareas)
  let calendarId: string | null = null;
  if (studio.google_calendar_secondary_id) {
    calendarId = studio.google_calendar_secondary_id;
  } else {
    try {
      calendarId = await obtenerOCrearCalendarioSecundario(studioSlug);
    } catch (error) {
      console.warn(
        '[Desconexión] No se pudo obtener calendario secundario, continuando sin eliminar tareas'
      );
    }
  }

  // Eliminar tareas en lotes de 20
  const BATCH_SIZE = 20;
  let hasMore = true;
  let offset = 0;

  while (hasMore) {
    const tareas = await prisma.studio_scheduler_event_tasks.findMany({
      where: {
        scheduler_instance: {
          event: {
            studio_id: studio.id,
          },
        },
        google_event_id: {
          not: null,
        },
        google_calendar_id: {
          not: null,
        },
      },
      select: {
        id: true,
        google_calendar_id: true,
        google_event_id: true,
      },
      take: BATCH_SIZE,
      skip: offset,
    });

    if (tareas.length === 0) {
      hasMore = false;
      break;
    }

    // Eliminar eventos de Google Calendar
    for (const tarea of tareas) {
      if (tarea.google_calendar_id && tarea.google_event_id) {
        try {
          const eliminado = await eliminarEventoGoogle(
            tarea.google_calendar_id,
            tarea.google_event_id
          );
          if (eliminado) {
            tareasEliminadas++;
          }
        } catch (error: any) {
          // Si es 404, el evento ya no existe (no es crítico)
          if (error?.code !== 404 && error?.response?.status !== 404) {
            console.error(
              `[Desconexión] Error eliminando tarea ${tarea.id}:`,
              error
            );
          }
        }
      }
    }

    // Limpiar campos en la base de datos
    await prisma.studio_scheduler_event_tasks.updateMany({
      where: {
        id: {
          in: tareas.map((t) => t.id),
        },
      },
      data: {
        google_event_id: null,
        google_calendar_id: null,
      },
    });

    offset += BATCH_SIZE;
    hasMore = tareas.length === BATCH_SIZE;
  }

  // Eliminar eventos principales en lotes
  hasMore = true;
  offset = 0;

  while (hasMore) {
    const eventos = await prisma.studio_events.findMany({
      where: {
        studio_id: studio.id,
        google_event_id: {
          not: null,
        },
      },
      select: {
        id: true,
        google_event_id: true,
      },
      take: BATCH_SIZE,
      skip: offset,
    });

    if (eventos.length === 0) {
      hasMore = false;
      break;
    }

    // Eliminar eventos de Google Calendar
    for (const evento of eventos) {
      if (evento.google_event_id) {
        try {
          const eliminado = await eliminarEventoPrincipalGoogle(evento.id);
          if (eliminado) {
            eventosEliminados++;
          }
        } catch (error: any) {
          // Si es 404, el evento ya no existe (no es crítico)
          if (error?.code !== 404 && error?.response?.status !== 404) {
            console.error(
              `[Desconexión] Error eliminando evento ${evento.id}:`,
              error
            );
          }
        }
      }
    }

    // Limpiar campos en la base de datos
    await prisma.studio_events.updateMany({
      where: {
        id: {
          in: eventos.map((e) => e.id),
        },
      },
      data: {
        google_event_id: null,
      },
    });

    offset += BATCH_SIZE;
    hasMore = eventos.length === BATCH_SIZE;
  }

  console.log(
    `[Google Sync] Cleaned ${tareasEliminadas} tasks and ${eventosEliminados} events during disconnect`
  );

  return { tareasEliminadas, eventosEliminados };
}

/**
 * Desvincula Google Calendar de un Studio con opción de limpiar eventos
 */
export async function desvincularRecursoGoogle(
  studioSlug: string,
  limpiarEventos: boolean = false
): Promise<DesvincularRecursoGoogleResult> {
  try {
    // Verificar permisos
    const permisos = await verificarPermisosDesconexion(studioSlug);
    if (!permisos.tienePermiso) {
      return {
        success: false,
        error: permisos.error || 'No tienes permisos para esta acción',
      };
    }

    // Obtener studio con configuración actual
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: {
        id: true,
        google_integrations_config: true,
        google_oauth_scopes: true,
      },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Contar eventos sincronizados (para auditoría)
    const conteo = await contarEventosSincronizados(studio.id);
    const totalEventos = conteo.tareas + conteo.eventos;

    console.log(
      `[Desconexión] Studio ${studioSlug} tiene ${conteo.tareas} tareas y ${conteo.eventos} eventos sincronizados`
    );

    // Si se solicita limpiar eventos, eliminarlos
    let eventosEliminados = 0;
    if (limpiarEventos && totalEventos > 0) {
      const resultado = await eliminarEventosEnLotes(studioSlug, limpiarEventos);
      eventosEliminados = resultado.tareasEliminadas + resultado.eventosEliminados;
    } else if (!limpiarEventos) {
      // Si no se eliminan eventos, solo limpiar google_event_id de la DB
      await prisma.studio_scheduler_event_tasks.updateMany({
        where: {
          scheduler_instance: {
            event: {
              studio_id: studio.id,
            },
          },
          google_event_id: {
            not: null,
          },
        },
        data: {
          google_event_id: null,
          google_calendar_id: null,
        },
      });

      await prisma.studio_events.updateMany({
        where: {
          studio_id: studio.id,
          google_event_id: {
            not: null,
          },
        },
        data: {
          google_event_id: null,
        },
      });
    }

    // Obtener configuración existente de integraciones
    let integrationsConfig: any = {};
    if (studio.google_integrations_config) {
      try {
        integrationsConfig =
          typeof studio.google_integrations_config === 'string'
            ? JSON.parse(studio.google_integrations_config)
            : studio.google_integrations_config;
      } catch {
        integrationsConfig = {};
      }
    }

    // Actualizar configuración: deshabilitar Calendar pero mantener otros recursos
    integrationsConfig = {
      ...integrationsConfig,
      calendar: {
        enabled: false,
        secondaryCalendarId: null,
      },
    };

    // Obtener scopes existentes y remover Calendar
    let scopesFinales: string[] = [];
    if (studio.google_oauth_scopes) {
      try {
        const scopes = JSON.parse(studio.google_oauth_scopes) as string[];
        scopesFinales = scopes.filter(
          (scope) => !scope.includes('calendar') && !scope.includes('calendar.events')
        );
      } catch {
        // Si no se puede parsear, mantener vacío
      }
    }

    // Determinar si aún hay otros recursos conectados
    const hasDriveScope = scopesFinales.some(
      (scope) => scope.includes('drive.readonly') || scope.includes('drive')
    );
    const hasContactsScope = scopesFinales.some(
      (scope) => scope.includes('contacts')
    );

    // Si no hay otros recursos, limpiar todo
    // Si hay otros recursos, solo limpiar Calendar
    const updateData: any = {
      google_integrations_config: integrationsConfig,
      google_calendar_secondary_id: null, // Limpiar el calendario secundario
    };

    if (!hasDriveScope && !hasContactsScope) {
      // No hay otros recursos, limpiar todo
      updateData.google_oauth_refresh_token = null;
      updateData.google_oauth_email = null;
      updateData.google_oauth_name = null;
      updateData.google_oauth_scopes = null;
      updateData.is_google_connected = false;
    } else {
      // Hay otros recursos, solo actualizar scopes y config
      updateData.google_oauth_scopes = JSON.stringify(scopesFinales);
    }

    // Actualizar studio
    await prisma.studios.update({
      where: { slug: studioSlug },
      data: updateData,
    });

    console.log(
      `[Desconexión] ✅ Google Calendar desconectado de ${studioSlug}. Eventos eliminados: ${eventosEliminados}`
    );

    // Disparar evento personalizado para que AppHeader actualice el estado
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('google-calendar-connection-changed'));
    }

    return {
      success: true,
      eventosEliminados,
    };
  } catch (error) {
    console.error('[desvincularRecursoGoogle] Error:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Error al desvincular Google Calendar',
    };
  }
}

/**
 * Obtiene el conteo de eventos sincronizados (para mostrar en el modal)
 */
export async function obtenerConteoEventosSincronizados(
  studioSlug: string
): Promise<{ success: boolean; total?: number; error?: string }> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    const conteo = await contarEventosSincronizados(studio.id);
    const total = conteo.tareas + conteo.eventos;

    return { success: true, total };
  } catch (error) {
    console.error('[obtenerConteoEventosSincronizados] Error:', error);
    return {
      success: false,
      error: 'Error al obtener conteo de eventos',
    };
  }
}

