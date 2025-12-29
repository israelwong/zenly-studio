'use server';

import { prisma } from '@/lib/prisma';
import { getGoogleContactsClient, eliminarContactoGoogle } from '@/lib/integrations/google/clients/contacts.client';

const BATCH_SIZE = 20; // Procesar en lotes para evitar timeouts

export interface DesconectarGoogleContactsResult {
  success: boolean;
  error?: string;
  contactosEliminados?: number;
}

/**
 * Obtiene el conteo de contactos sincronizados con Google Contacts
 */
export async function obtenerConteoContactosSincronizados(
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

    // Contar contactos con google_contact_id
    const contactosCount = await prisma.studio_contacts.count({
      where: {
        studio_id: studio.id,
        google_contact_id: {
          not: null,
        },
      },
    });

    // Contar staff con google_contact_id
    const staffCount = await prisma.user_studio_roles.count({
      where: {
        studio_id: studio.id,
        google_contact_id: {
          not: null,
        },
      },
    });

    const total = contactosCount + staffCount;

    return { success: true, total };
  } catch (error) {
    console.error('[obtenerConteoContactosSincronizados] Error:', error);
    return { success: false, error: 'Error al contar contactos sincronizados' };
  }
}

/**
 * Elimina contactos de Google Contacts en lotes
 */
async function eliminarContactosEnLotes(
  studioSlug: string,
  eliminarContactos: boolean
): Promise<{ contactosEliminados: number }> {
  if (!eliminarContactos) {
    return { contactosEliminados: 0 };
  }

  const studio = await prisma.studios.findUnique({
    where: { slug: studioSlug },
    select: { id: true },
  });

  if (!studio) {
    throw new Error('Studio no encontrado');
  }

  let contactosEliminados = 0;

  // Eliminar contactos del estudio
  let hasMore = true;
  let offset = 0;

  while (hasMore) {
    const contactos = await prisma.studio_contacts.findMany({
      where: {
        studio_id: studio.id,
        google_contact_id: {
          not: null,
        },
      },
      select: {
        id: true,
        google_contact_id: true,
      },
      take: BATCH_SIZE,
      skip: offset,
    });

    if (contactos.length === 0) {
      hasMore = false;
      break;
    }

    // Eliminar contactos de Google Contacts
    for (const contacto of contactos) {
      if (contacto.google_contact_id) {
        try {
          const resultado = await eliminarContactoGoogle(studioSlug, contacto.google_contact_id);
          if (resultado.success) {
            contactosEliminados++;
          }
        } catch (error: any) {
          // Si es 404, el contacto ya no existe (no es crítico)
          if (error?.code !== 404 && error?.response?.status !== 404) {
            console.error(
              `[Desconexión] Error eliminando contacto ${contacto.id}:`,
              error
            );
          }
        }
      }
    }

    // Limpiar campos en la base de datos
    await prisma.studio_contacts.updateMany({
      where: {
        id: {
          in: contactos.map((c) => c.id),
        },
      },
      data: {
        google_contact_id: null,
      },
    });

    offset += BATCH_SIZE;
    hasMore = contactos.length === BATCH_SIZE;
  }

  // Eliminar staff sincronizado
  hasMore = true;
  offset = 0;

  while (hasMore) {
    const staff = await prisma.user_studio_roles.findMany({
      where: {
        studio_id: studio.id,
        google_contact_id: {
          not: null,
        },
      },
      select: {
        id: true,
        google_contact_id: true,
      },
      take: BATCH_SIZE,
      skip: offset,
    });

    if (staff.length === 0) {
      hasMore = false;
      break;
    }

    // Eliminar contactos de Google Contacts
    for (const member of staff) {
      if (member.google_contact_id) {
        try {
          const resultado = await eliminarContactoGoogle(studioSlug, member.google_contact_id);
          if (resultado.success) {
            contactosEliminados++;
          }
        } catch (error: any) {
          // Si es 404, el contacto ya no existe (no es crítico)
          if (error?.code !== 404 && error?.response?.status !== 404) {
            console.error(
              `[Desconexión] Error eliminando staff ${member.id}:`,
              error
            );
          }
        }
      }
    }

    // Limpiar campos en la base de datos
    await prisma.user_studio_roles.updateMany({
      where: {
        id: {
          in: staff.map((s) => s.id),
        },
      },
      data: {
        google_contact_id: null,
      },
    });

    offset += BATCH_SIZE;
    hasMore = staff.length === BATCH_SIZE;
  }

  console.log(
    `[Google Contacts] Cleaned ${contactosEliminados} contacts during disconnect`
  );

  return { contactosEliminados };
}

/**
 * Desconecta Google Contacts de un Studio con opción de eliminar contactos
 */
export async function desconectarGoogleContacts(
  studioSlug: string,
  eliminarContactos: boolean = false
): Promise<DesconectarGoogleContactsResult> {
  try {
    // Obtener studio
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

    // Verificar que tenga Contacts conectado
    let hasContactsScope = false;
    if (studio.google_oauth_scopes) {
      try {
        const scopes = JSON.parse(studio.google_oauth_scopes) as string[];
        hasContactsScope = scopes.includes('https://www.googleapis.com/auth/contacts');
      } catch {
        // Si no se puede parsear, continuar
      }
    }

    if (!hasContactsScope) {
      return { success: false, error: 'Google Contacts no está conectado' };
    }

    // Contar contactos sincronizados (para auditoría)
    const conteo = await obtenerConteoContactosSincronizados(studioSlug);
    const totalContactos = conteo.total || 0;

    console.log(
      `[Desconexión] Studio ${studioSlug} tiene ${totalContactos} contactos sincronizados`
    );

    // Si se solicita eliminar contactos, eliminarlos
    let contactosEliminados = 0;
    if (eliminarContactos && totalContactos > 0) {
      const resultado = await eliminarContactosEnLotes(studioSlug, eliminarContactos);
      contactosEliminados = resultado.contactosEliminados;
    } else if (!eliminarContactos) {
      // Si no se eliminan, solo limpiar google_contact_id de la DB
      await prisma.studio_contacts.updateMany({
        where: {
          studio_id: studio.id,
          google_contact_id: {
            not: null,
          },
        },
        data: {
          google_contact_id: null,
        },
      });

      await prisma.user_studio_roles.updateMany({
        where: {
          studio_id: studio.id,
          google_contact_id: {
            not: null,
          },
        },
        data: {
          google_contact_id: null,
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

    // Actualizar configuración: deshabilitar Contacts pero mantener otros recursos
    integrationsConfig = {
      ...integrationsConfig,
      contacts: {
        enabled: false,
        groupResourceName: null,
        lastSyncAt: null,
      },
    };

    // Obtener scopes existentes y remover Contacts
    let scopesFinales: string[] = [];
    if (studio.google_oauth_scopes) {
      try {
        const scopes = JSON.parse(studio.google_oauth_scopes) as string[];
        scopesFinales = scopes.filter(
          (scope) => !scope.includes('contacts')
        );
      } catch {
        // Si no se puede parsear, mantener vacío
      }
    }

    // Determinar si aún hay otros recursos conectados
    const hasDriveScope = scopesFinales.some(
      (scope) => scope.includes('drive.readonly') || scope.includes('drive')
    );
    const hasCalendarScope = scopesFinales.some(
      (scope) => scope.includes('calendar') || scope.includes('calendar.events')
    );

    // Si no hay otros recursos, limpiar todo
    // Si hay otros recursos, solo limpiar Contacts
    const updateData: any = {
      google_integrations_config: integrationsConfig,
    };

    if (!hasDriveScope && !hasCalendarScope) {
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
      `[Desconexión] ✅ Google Contacts desconectado de ${studioSlug}. Contactos eliminados: ${contactosEliminados}`
    );

    return {
      success: true,
      contactosEliminados,
    };
  } catch (error) {
    console.error('[desconectarGoogleContacts] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al desconectar Google Contacts',
    };
  }
}

