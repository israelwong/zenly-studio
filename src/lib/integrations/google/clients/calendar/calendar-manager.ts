'use server';

import { prisma } from '@/lib/prisma';
import { getGoogleCalendarClient } from './client';
import { obtenerTimezoneEstudio } from './timezone';

/**
 * Obtiene o crea el calendario secundario "Tareas De ZEN" para un estudio.
 * Si el calendario fue eliminado manualmente en Google (error 404), crea uno nuevo.
 *
 * @param studioSlug - Slug del estudio
 * @returns ID del calendario secundario
 * @throws Error si no se puede conectar a Google o crear el calendario
 */
export async function obtenerOCrearCalendarioSecundario(
  studioSlug: string
): Promise<string> {
  // Obtener studio y su google_calendar_secondary_id
  const studio = await prisma.studios.findUnique({
    where: { slug: studioSlug },
    select: {
      id: true,
      google_calendar_secondary_id: true,
    },
  });

  if (!studio) {
    throw new Error('Studio no encontrado');
  }

  // Si ya existe ID guardado, verificar que sigue existiendo en Google
  if (studio.google_calendar_secondary_id) {
    try {
      const { calendar } = await getGoogleCalendarClient(studioSlug);

      // Intentar obtener el calendario para verificar que existe
      const calendarResponse = await calendar.calendars.get({
        calendarId: studio.google_calendar_secondary_id,
      });

      // Si existe, retornar el ID
      if (calendarResponse.data.id) {
        return calendarResponse.data.id;
      }
    } catch (error: any) {
      const errorCode = error?.code || error?.response?.status;
      const errorMessage = error?.message || 'Error desconocido';

      // Si el error es 404, el calendario fue eliminado manualmente
      if (errorCode === 404) {
        console.warn(
          `[Google Calendar] Calendario secundario ${studio.google_calendar_secondary_id} no encontrado en Google, creando uno nuevo...`
        );
        // Continuar para crear uno nuevo
      } else if (errorCode === 403 || errorMessage.includes('Insufficient Permission')) {
        // Si el error es 403 (permisos insuficientes), verificar scopes
        const studioWithScopes = await prisma.studios.findUnique({
          where: { slug: studioSlug },
          select: { google_oauth_scopes: true },
        });

        if (studioWithScopes?.google_oauth_scopes) {
          try {
            const scopes = JSON.parse(studioWithScopes.google_oauth_scopes) as string[];
            const hasFullCalendarScope = scopes.includes('https://www.googleapis.com/auth/calendar');
            const hasEventsOnlyScope = scopes.includes('https://www.googleapis.com/auth/calendar.events');

            // Si solo tiene calendar.events, no puede verificar calendarios pero puede usarlos
            // Asumir que el calendario existe y retornar el ID guardado
            if (!hasFullCalendarScope && hasEventsOnlyScope) {
              console.warn(
                `[Google Calendar] Solo tiene scope calendar.events, no se puede verificar calendario. Asumiendo que existe: ${studio.google_calendar_secondary_id}`
              );
              return studio.google_calendar_secondary_id;
            }
          } catch (parseError) {
            // Si no se puede parsear, continuar para intentar crear
          }
        }

        // Si tiene scope completo pero aún falla, es un error real de permisos
        throw new Error(
          'Permisos insuficientes para acceder al calendario. Se requiere el permiso completo de Google Calendar. Por favor, reconecta tu cuenta de Google con permisos completos de Calendar.'
        );
      } else {
        // Otro tipo de error, relanzar
        console.error(
          '[Google Calendar] Error verificando calendario secundario:',
          error
        );
        throw new Error(
          `Error al verificar calendario secundario: ${errorMessage}`
        );
      }
    }
  }

  // Si no existe o fue eliminado, crear uno nuevo
  try {
    const { calendar } = await getGoogleCalendarClient(studioSlug);

    // Verificar que tenga el scope completo de calendar (necesario para crear calendarios)
    const studioWithScopes = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { google_oauth_scopes: true },
    });

    if (studioWithScopes?.google_oauth_scopes) {
      try {
        const scopes = JSON.parse(studioWithScopes.google_oauth_scopes) as string[];
        const hasFullCalendarScope = scopes.includes('https://www.googleapis.com/auth/calendar');
        
        if (!hasFullCalendarScope) {
          throw new Error(
            'Se requiere el permiso completo de Google Calendar para crear calendarios. Por favor, reconecta tu cuenta de Google con permisos completos de Calendar.'
          );
        }
      } catch (parseError) {
        // Si no se puede parsear, continuar e intentar crear (fallará con error más claro)
      }
    }

    // Obtener timezone del estudio
    const timezone = await obtenerTimezoneEstudio(studioSlug);

    // Crear nuevo calendario
    const newCalendarResponse = await calendar.calendars.insert({
      requestBody: {
        summary: 'Tareas De ZEN',
        description: 'Tareas de cronograma y post-producción',
        timeZone: timezone,
      },
    });

    const newCalendarId = newCalendarResponse.data.id;

    if (!newCalendarId) {
      throw new Error('No se pudo obtener el ID del calendario creado');
    }

    // Guardar ID en la base de datos
    await prisma.studios.update({
      where: { id: studio.id },
      data: { google_calendar_secondary_id: newCalendarId },
    });

    console.log(
      `[Google Calendar] ✅ Calendario secundario creado: ${newCalendarId}`
    );

    return newCalendarId;
  } catch (error: any) {
    console.error('[Google Calendar] Error creando calendario secundario:', error);
    
    // Mejorar mensaje de error para permisos insuficientes
    if (error?.code === 403 || error?.response?.status === 403 || error?.message?.includes('Insufficient Permission')) {
      throw new Error(
        'Permisos insuficientes para crear calendarios. Se requiere el permiso completo de Google Calendar (no solo calendar.events). Por favor, reconecta tu cuenta de Google con permisos completos de Calendar.'
      );
    }
    
    throw new Error(
      `Error al crear calendario secundario: ${error?.message || 'Error desconocido'}`
    );
  }
}

