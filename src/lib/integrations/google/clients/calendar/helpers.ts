'use server';

import { prisma } from '@/lib/prisma';

/**
 * Verifica si un estudio tiene Google Calendar habilitado
 * @param studioSlug - Slug del estudio
 * @returns true si tiene Google conectado y scope de Calendar
 */
export async function tieneGoogleCalendarHabilitado(
  studioSlug: string
): Promise<boolean> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: {
        is_google_connected: true,
        google_oauth_refresh_token: true,
        google_oauth_scopes: true,
      },
    });

    if (!studio?.is_google_connected || !studio?.google_oauth_refresh_token) {
      return false;
    }

    // Verificar que tenga scope de Calendar
    if (!studio.google_oauth_scopes) {
      return false;
    }

    try {
      const scopes = JSON.parse(studio.google_oauth_scopes) as string[];
      return (
        scopes.includes('https://www.googleapis.com/auth/calendar') ||
        scopes.includes('https://www.googleapis.com/auth/calendar.events')
      );
    } catch {
      // Si no es JSON válido, no tiene Calendar habilitado
      return false;
    }
  } catch (error) {
    console.error(
      '[Google Calendar] Error verificando conexión Google:',
      error
    );
    return false;
  }
}

/**
 * Ejecuta sincronización con Google Calendar en background
 * No bloquea la respuesta de la operación principal
 */
export async function sincronizarTareaEnBackground(
  taskId: string,
  studioSlug: string
): Promise<void> {
  setTimeout(async () => {
    try {
      const { sincronizarTareaConGoogle } = await import('./sync-manager');
      await sincronizarTareaConGoogle(taskId, studioSlug);
    } catch (error) {
      console.error(
        '[Google Calendar] Error sincronizando tarea (no crítico):',
        error
      );
    }
  }, 0);
}

/**
 * Elimina evento de Google Calendar en background
 * No bloquea la respuesta de la operación principal
 */
export async function eliminarEventoEnBackground(
  calendarId: string,
  eventId: string
): Promise<void> {
  setTimeout(async () => {
    try {
      const { eliminarEventoGoogle } = await import('./sync-manager');
      await eliminarEventoGoogle(calendarId, eventId);
    } catch (error) {
      console.error(
        '[Google Calendar] Error eliminando evento (no crítico):',
        error
      );
    }
  }, 0);
}

/**
 * Elimina evento de Google Calendar por taskId en background
 */
export async function eliminarEventoPorTareaEnBackground(taskId: string) {
  setTimeout(async () => {
    try {
      const { eliminarEventoGooglePorTarea } = await import('./sync-manager');
      await eliminarEventoGooglePorTarea(taskId);
    } catch (error) {
      console.error(
        '[Google Calendar] Error eliminando evento por tarea en background (no crítico):',
        error
      );
    }
  }, 0);
}

/**
 * Sincroniza un evento principal con Google Calendar en background
 */
export async function sincronizarEventoPrincipalEnBackground(
  eventId: string,
  studioSlug: string,
  userTimezone?: string
) {
  setTimeout(async () => {
    try {
      const { sincronizarEventoPrincipal } = await import('./sync-manager');
      await sincronizarEventoPrincipal(eventId, studioSlug, userTimezone);
    } catch (error) {
      console.error(
        '[Google Calendar] Error sincronizando evento principal en background (no crítico):',
        error
      );
    }
  }, 0);
}

/**
 * Elimina un evento principal de Google Calendar en background
 */
export async function eliminarEventoPrincipalEnBackground(eventId: string) {
  setTimeout(async () => {
    try {
      const { eliminarEventoPrincipalGoogle } = await import('./sync-manager');
      await eliminarEventoPrincipalGoogle(eventId);
    } catch (error) {
      console.error(
        '[Google Calendar] Error eliminando evento principal en background (no crítico):',
        error
      );
    }
  }, 0);
}

/**
 * Sincroniza todos los eventos principales que no estén sincronizados
 * @param studioSlug - Slug del estudio
 * @returns Resumen de sincronización
 */
export async function sincronizarTodosEventosPrincipales(
  studioSlug: string
): Promise<{
  success: boolean;
  sincronizados?: number;
  total?: number;
  errores?: number;
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

    // Verificar que tenga Google Calendar habilitado
    const tieneCalendar = await tieneGoogleCalendarHabilitado(studioSlug);
    if (!tieneCalendar) {
      return {
        success: false,
        error: 'Google Calendar no está conectado. Ve a Configuración → Integraciones para activarlo.',
      };
    }

    // Obtener todos los eventos activos que no tienen google_event_id
    const eventos = await prisma.studio_events.findMany({
      where: {
        studio_id: studio.id,
        status: 'ACTIVE',
        google_event_id: null,
      },
      select: {
        id: true,
      },
    });

    const total = eventos.length;
    let sincronizados = 0;
    let errores = 0;

    // Sincronizar cada evento
    const { sincronizarEventoPrincipal } = await import('./sync-manager');
    
    for (const evento of eventos) {
      try {
        await sincronizarEventoPrincipal(evento.id, studioSlug);
        sincronizados++;
      } catch (error) {
        console.error(
          `[Google Calendar] Error sincronizando evento ${evento.id}:`,
          error
        );
        errores++;
      }
    }

    return {
      success: true,
      sincronizados,
      total,
      errores,
    };
  } catch (error) {
    console.error('[Google Calendar] Error sincronizando eventos:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al sincronizar eventos',
    };
  }
}

/**
 * Cuenta cuántos eventos principales están pendientes de sincronizar
 * @param studioSlug - Slug del estudio
 * @returns Número de eventos pendientes
 */
export async function contarEventosPendientesSincronizar(
  studioSlug: string
): Promise<{ success: boolean; pendientes?: number; error?: string }> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Contar eventos activos que no tienen google_event_id
    const pendientes = await prisma.studio_events.count({
      where: {
        studio_id: studio.id,
        status: 'ACTIVE',
        google_event_id: null,
      },
    });

    return { success: true, pendientes };
  } catch (error) {
    console.error('[Google Calendar] Error contando eventos pendientes:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al contar eventos pendientes',
    };
  }
}
