'use server';

import { google } from 'googleapis';
import { obtenerCredencialesGoogle } from '@/lib/actions/platform/integrations/google.actions';
import { prisma } from '@/lib/prisma';
import { decryptToken } from '@/lib/utils/encryption';

/**
 * Obtiene un cliente autenticado de Google Contacts (People API) para un estudio.
 * Devuelve null si el refresh token es inválido (ej. invalid_grant); así la sync
 * puede fallar sin bloquear la operación principal (ej. updateContact).
 */
export async function getGoogleContactsClient(
  studioSlug: string
): Promise<{ people: ReturnType<typeof google.people>; oauth2Client: import('googleapis').auth.OAuth2 } | null> {
  // Obtener credenciales OAuth compartidas
  const credentialsResult = await obtenerCredencialesGoogle();
  if (!credentialsResult.success || !credentialsResult.data) {
    throw new Error(
      credentialsResult.error || 'Credenciales de Google no disponibles'
    );
  }

  const { clientId, clientSecret, redirectUri } = credentialsResult.data;

  // Obtener studio y su refresh token
  const studio = await prisma.studios.findUnique({
    where: { slug: studioSlug },
    select: {
      id: true,
      google_oauth_refresh_token: true,
      google_oauth_scopes: true,
    },
  });

  if (!studio) {
    throw new Error('Studio no encontrado');
  }

  if (!studio.google_oauth_refresh_token) {
    throw new Error('Studio no tiene Google conectado');
  }

  // Verificar que tenga scope de Contacts
  if (studio.google_oauth_scopes) {
    try {
      const scopes = JSON.parse(studio.google_oauth_scopes) as string[];
      const hasContactsScope = scopes.includes(
        'https://www.googleapis.com/auth/contacts'
      );
      if (!hasContactsScope) {
        throw new Error(
          'Studio no tiene permisos de Contacts. Por favor, reconecta tu cuenta de Google.'
        );
      }
    } catch (error) {
      // Si no se puede parsear, asumir que necesita reconectar
      throw new Error(
        'Error al verificar permisos de Contacts. Por favor, reconecta tu cuenta de Google.'
      );
    }
  }

  // Desencriptar refresh token
  let refreshToken: string;
  try {
    refreshToken = await decryptToken(studio.google_oauth_refresh_token);
  } catch (error) {
    throw new Error('Error al desencriptar refresh token');
  }

  // Crear OAuth2 client
  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );

  // Configurar refresh token
  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  // Refrescar access token (googleapis maneja automáticamente si es necesario)
  try {
    const { credentials } = await oauth2Client.refreshAccessToken();
    // Actualizar credenciales con el nuevo access_token si fue refrescado
    oauth2Client.setCredentials(credentials);
  } catch (error) {
    // No lanzar: permitir que la actualización del contacto en DB siga siendo exitosa.
    // El llamador debe comprobar null y omitir o fallar la sync con un mensaje controlado.
    console.error(
      '[getGoogleContactsClient] Token expirado o inválido. Reconecta Google para sincronizar contactos.'
    );
    return null;
  }

  // Crear cliente de People API
  const people = google.people({
    version: 'v1',
    auth: oauth2Client,
  });

  return { people, oauth2Client };
}

/**
 * Crea un cliente de Google Contacts directamente con tokens (sin leer DB)
 * Útil durante el callback OAuth cuando aún no se han guardado los tokens
 */
export async function createGoogleContactsClientWithTokens(
  refreshToken: string,
  accessToken?: string
): Promise<ReturnType<typeof google.people>> {
  // Obtener credenciales OAuth compartidas
  const credentialsResult = await obtenerCredencialesGoogle();
  if (!credentialsResult.success || !credentialsResult.data) {
    throw new Error(
      credentialsResult.error || 'Credenciales de Google no disponibles'
    );
  }

  const { clientId, clientSecret, redirectUri } = credentialsResult.data;

  // Crear OAuth2 client
  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );

  // Configurar tokens directamente
  oauth2Client.setCredentials({
    refresh_token: refreshToken,
    access_token: accessToken, // Si se proporciona, usarlo directamente
  });

  // Si tenemos access_token, no necesitamos refrescar
  // Si no, el cliente lo refrescará automáticamente cuando sea necesario
  if (!accessToken) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);
    } catch (error) {
      console.error('[createGoogleContactsClientWithTokens] Error refrescando token:', error);
      throw new Error('Error al refrescar access token');
    }
  }

  // Crear cliente de People API
  const people = google.people({
    version: 'v1',
    auth: oauth2Client,
  });

  return people;
}

/**
 * Busca un grupo de contactos existente por nombre
 */
async function buscarGrupoContactosPorNombre(
  people: ReturnType<typeof google.people>,
  nombreGrupo: string
): Promise<string | null> {
  try {
    const response = await people.contactGroups.list();
    const grupos = response.data.contactGroups || [];
    
    const grupoEncontrado = grupos.find(
      (grupo) => grupo.name === nombreGrupo
    );
    
    return grupoEncontrado?.resourceName || null;
  } catch (error) {
    console.error('[buscarGrupoContactosPorNombre] Error:', error);
    return null;
  }
}

/**
 * Crea un grupo de contactos "ZEN: [Studio Name]" o retorna el existente si ya existe
 * @param studioSlug - Slug del estudio (si se proporciona, lee tokens de DB)
 * @param studioName - Nombre del estudio
 * @param peopleClient - Cliente de People API ya inicializado (opcional, para evitar leer DB)
 */
export async function crearGrupoContactosZEN(
  studioSlug: string,
  studioName: string,
  peopleClient?: ReturnType<typeof google.people>
): Promise<{ resourceName: string }> {
  const client = !peopleClient ? await getGoogleContactsClient(studioSlug) : null;
  const people = peopleClient ?? client?.people ?? null;
  if (!people) {
    throw new Error(
      'Google Contacts no disponible. Reconecta tu cuenta para crear el grupo.'
    );
  }

  const nombreGrupo = `ZEN: ${studioName}`;

  try {
    // Intentar crear el grupo
    const group = await people.contactGroups.create({
      requestBody: {
        contactGroup: {
          name: nombreGrupo,
        },
      },
    });

    if (!group.data.resourceName) {
      throw new Error('No se pudo obtener el resourceName del grupo creado');
    }

    return { resourceName: group.data.resourceName };
  } catch (error: any) {
    // Si el error es 409 (Conflict) o indica que el nombre ya existe, buscar el grupo existente
    if (
      error?.code === 409 ||
      error?.status === 409 ||
      error?.message?.includes('already exists') ||
      error?.message?.includes('Contact group name already exists')
    ) {
      const resourceNameExistente = await buscarGrupoContactosPorNombre(people, nombreGrupo);
      
      if (resourceNameExistente) {
        return { resourceName: resourceNameExistente };
      } else {
        // Si no se encontró, lanzar el error original
        console.error(`[crearGrupoContactosZEN] ❌ Error: El grupo ya existe pero no se pudo encontrar`);
        throw new Error(`El grupo "${nombreGrupo}" ya existe pero no se pudo obtener su resourceName`);
      }
    }
    
    // Si es otro tipo de error, lanzarlo
    throw error;
  }
}

/**
 * Renombra un grupo de contactos existente
 * ⚠️ CRÍTICO: Usado cuando cambia el nombre del estudio
 */
export async function renombrarGrupoContactosZEN(
  studioSlug: string,
  groupResourceName: string,
  nuevoNombre: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await getGoogleContactsClient(studioSlug);
    if (!client) {
      return {
        success: false,
        error: 'Google Contacts no disponible. Reconecta tu cuenta.',
      };
    }

    await client.people.contactGroups.update({
      resourceName: groupResourceName,
      updateGroupFields: 'name',
      requestBody: {
        contactGroup: {
          name: `ZEN: ${nuevoNombre}`,
        },
      },
    });

    return { success: true };
  } catch (error: any) {
    console.error('[renombrarGrupoContactosZEN] Error:', error);
    return {
      success: false,
      error: error?.message || 'Error al renombrar grupo de contactos',
    };
  }
}

/**
 * Crea o actualiza un contacto en Google Contacts (UPSERT)
 * ⚠️ CRÍTICO: Asigna al grupo INMEDIATAMENTE después de crear para garantizar visibilidad
 */
export async function sincronizarContactoGoogle(
  studioSlug: string,
  contactData: {
    resourceName?: string; // Si existe, es UPDATE
    names: Array<{
      displayName: string;
      givenName?: string;
      familyName?: string;
    }>;
    emailAddresses?: Array<{ value: string; type: string }>;
    phoneNumbers: Array<{ value: string; type: string }>;
    organizations?: Array<{ name: string; title?: string }>;
    biographies?: Array<{ value: string }>;
  },
  groupResourceName?: string
): Promise<{ resourceName: string; etag: string }> {
  const client = await getGoogleContactsClient(studioSlug);
  if (!client) {
    throw new Error(
      'Google Contacts no disponible. Reconecta tu cuenta para sincronizar.'
    );
  }
  const { people } = client;

  if (contactData.resourceName) {
    // UPDATE: la API exige person.etag para concurrencia optimista
    const { data: currentPerson } = await people.people.get({
      resourceName: contactData.resourceName,
      personFields: 'metadata',
    });
    const etag = currentPerson?.etag;
    if (!etag) {
      throw new Error('No se pudo obtener etag del contacto en Google');
    }

    const updated = await people.people.updateContact({
      resourceName: contactData.resourceName,
      updatePersonFields:
        'names,emailAddresses,phoneNumbers,organizations,biographies',
      requestBody: {
        ...contactData,
        etag,
      },
    });

    if (!updated.data.resourceName || !updated.data.etag) {
      throw new Error('No se pudo obtener resourceName o etag del contacto actualizado');
    }

    return {
      resourceName: updated.data.resourceName,
      etag: updated.data.etag,
    };
  } else {
    // CREATE
    const created = await people.people.createContact({
      requestBody: contactData,
    });

    if (!created.data.resourceName) {
      throw new Error('No se pudo obtener el resourceName del contacto creado');
    }

    // ⚠️ CRÍTICO - Garantía de Visibilidad
    // Asignar a grupo INMEDIATAMENTE después de crear (mismo bloque try/catch)
    // Esto evita que Google archive el contacto en "Otros contactos"
    if (groupResourceName) {
      try {
        await people.contactGroups.members.modify({
          resourceName: groupResourceName,
          requestBody: {
            resourceNamesToAdd: [created.data.resourceName],
          },
        });
      } catch (error) {
        // Si falla la asignación, loguear pero no fallar la creación
        console.error(
          '[sincronizarContactoGoogle] Error asignando a grupo:',
          error
        );
        // El contacto se creó pero no está en el grupo - puede requerir acción manual
      }
    }

    const etag = created.data.etag || '';

    return {
      resourceName: created.data.resourceName,
      etag,
    };
  }
}

/**
 * Elimina un contacto de Google Contacts
 */
export async function eliminarContactoGoogle(
  studioSlug: string,
  resourceName: string
): Promise<{ success: boolean }> {
  const client = await getGoogleContactsClient(studioSlug);
  if (!client) {
    return { success: false };
  }

  await client.people.people.deleteContact({
    resourceName,
    deletePersonFields:
      'names,emailAddresses,phoneNumbers,organizations,biographies',
  });

  return { success: true };
}

