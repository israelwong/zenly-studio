'use server';

import { prisma } from '@/lib/prisma';
import {
  sincronizarContactoGoogle,
} from '@/lib/integrations/google/clients/contacts.client';
import { marcarContactosGoogleExpirado } from '@/lib/integrations/google/studio/status.actions';

/**
 * Sincroniza un Contacto del Estudio con Google Contacts
 * ⚠️ CRÍTICO: Valida que tenga name + phone antes de sincronizar
 */
export async function sincronizarContactoConGoogle(
  contactId: string,
  studioSlug: string
): Promise<{ success: boolean; googleContactId?: string; error?: string }> {
  try {
    // 1. Verificar que Contacts está conectado
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: {
        id: true,
        studio_name: true,
        google_integrations_config: true,
      },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Verificar configuración de Contacts
    let contactsConfig: any = null;
    if (studio.google_integrations_config) {
      try {
        const config =
          typeof studio.google_integrations_config === 'string'
            ? JSON.parse(studio.google_integrations_config)
            : studio.google_integrations_config;
        contactsConfig = config?.contacts;
      } catch {
        // Si no se puede parsear, continuar sin error
      }
    }

    if (!contactsConfig?.enabled) {
      // Contacts no está conectado, retornar success sin sincronizar
      return { success: true };
    }

    // 2. Obtener contacto de DB
    const contact = await prisma.studio_contacts.findUnique({
      where: { id: contactId },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        notes: true,
        status: true,
        google_contact_id: true,
        studio_id: true,
      },
    });

    if (!contact) {
      return { success: false, error: 'Contacto no encontrado' };
    }

    // Verificar que pertenece al studio
    if (contact.studio_id !== studio.id) {
      return { success: false, error: 'Contacto no pertenece al estudio' };
    }

    // ⚠️ CRÍTICO - Validación de Datos (Filtro de Calidad)
    // 3. Validar: ¿Tiene name Y phone? (email es opcional)
    if (!contact.name || !contact.phone) {
      return {
        success: false,
        error:
          'Contacto no tiene datos suficientes para sincronizar (requiere: name y phone)',
      };
    }

    // 4. Mapear contacto a formato Google Contacts
    const nameParts = contact.name.split(' ');
    const givenName = nameParts[0] || '';
    const familyName = nameParts.slice(1).join(' ') || '';

    const contactData = {
      names: [
        {
          displayName: contact.name,
          givenName,
          familyName,
        },
      ],
      phoneNumbers: [
        {
          value: contact.phone,
          type: 'work',
        },
      ],
      organizations: [
        {
          name: studio.studio_name,
          title: 'Cliente',
        },
      ],
      biographies: [
        {
          value: `Contacto de ${studio.studio_name}\nEstado: ${contact.status}\n${contact.notes || ''}`,
        },
      ],
    };

    // Añadir email si existe
    if (contact.email) {
      contactData.emailAddresses = [
        {
          value: contact.email,
          type: 'work',
        },
      ];
    }

    // Si tiene google_contact_id, es UPDATE
    if (contact.google_contact_id) {
      contactData.resourceName = contact.google_contact_id;
    }

    // 5. Obtener grupo de contactos del estudio
    const groupResourceName = contactsConfig.groupResourceName || null;

    // 6. Llamar a sincronizarContactoGoogle() con groupResourceName
    // (la asignación al grupo ocurre INMEDIATAMENTE después de crear)
    const result = await sincronizarContactoGoogle(
      studioSlug,
      contactData,
      groupResourceName
    );

    // 7. Guardar google_contact_id en studio_contacts
    await prisma.studio_contacts.update({
      where: { id: contactId },
      data: { google_contact_id: result.resourceName },
    });

    // 8. Retornar resultado
    return {
      success: true,
      googleContactId: result.resourceName,
    };
  } catch (error: any) {
    console.error('[sincronizarContactoConGoogle] Error:', error);
    const msg = error?.message || '';
    if (
      msg.includes('no disponible') ||
      msg.includes('Reconecta') ||
      msg.includes('invalid_grant') ||
      msg.includes('refresh')
    ) {
      await marcarContactosGoogleExpirado(studioSlug);
    }
    return {
      success: false,
      error: msg || 'Error al sincronizar contacto con Google',
    };
  }
}

/**
 * Sincroniza un Staff (user_studio_roles) con Google Contacts
 * ⚠️ CRÍTICO: Valida que tenga email antes de sincronizar
 */
export async function sincronizarStaffConGoogle(
  userStudioRoleId: string,
  studioSlug: string
): Promise<{ success: boolean; googleContactId?: string; error?: string }> {
  try {
    // 1. Verificar que Contacts está conectado
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: {
        id: true,
        studio_name: true,
        google_integrations_config: true,
      },
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Verificar configuración de Contacts
    let contactsConfig: any = null;
    if (studio.google_integrations_config) {
      try {
        const config =
          typeof studio.google_integrations_config === 'string'
            ? JSON.parse(studio.google_integrations_config)
            : studio.google_integrations_config;
        contactsConfig = config?.contacts;
      } catch {
        // Si no se puede parsear, continuar sin error
      }
    }

    if (!contactsConfig?.enabled) {
      // Contacts no está conectado, retornar success sin sincronizar
      return { success: true };
    }

    // 2. Obtener user_studio_roles con información de usuario
    const userStudioRole = await prisma.user_studio_roles.findUnique({
      where: { id: userStudioRoleId },
      select: {
        id: true,
        role: true,
        studio_id: true,
        google_contact_id: true,
        user: {
          select: {
            id: true,
            email: true,
            full_name: true,
            phone: true,
          },
        },
      },
    });

    if (!userStudioRole) {
      return { success: false, error: 'Rol de usuario no encontrado' };
    }

    // Verificar que pertenece al studio
    if (userStudioRole.studio_id !== studio.id) {
      return { success: false, error: 'Rol no pertenece al estudio' };
    }

    // ⚠️ CRÍTICO - Validación de Datos (Filtro de Calidad)
    // 3. Validar: ¿Tiene email? (full_name es preferido pero no bloqueante)
    if (!userStudioRole.user.email) {
      return {
        success: false,
        error:
          'Staff no tiene datos suficientes para sincronizar (requiere: email)',
      };
    }

    // 4. Mapear staff a formato Google Contacts
    const displayName = userStudioRole.user.full_name || userStudioRole.user.email;
    const nameParts = displayName.split(' ');
    const givenName = nameParts[0] || '';
    const familyName = nameParts.slice(1).join(' ') || '';

    // Mapear rol a título legible
    const roleTitles: Record<string, string> = {
      OWNER: 'Propietario',
      ADMIN: 'Administrador',
      MANAGER: 'Gerente',
      PHOTOGRAPHER: 'Fotógrafo',
      EDITOR: 'Editor',
      ASSISTANT: 'Asistente',
      PROVIDER: 'Proveedor',
      CLIENT: 'Cliente',
    };

    const contactData = {
      names: [
        {
          displayName,
          givenName,
          familyName,
        },
      ],
      emailAddresses: [
        {
          value: userStudioRole.user.email,
          type: 'work',
        },
      ],
      phoneNumbers: userStudioRole.user.phone
        ? [
            {
              value: userStudioRole.user.phone,
              type: 'work',
            },
          ]
        : [],
      organizations: [
        {
          name: studio.studio_name,
          title: roleTitles[userStudioRole.role] || userStudioRole.role,
        },
      ],
      biographies: [
        {
          value: `Personal de ${studio.studio_name} - Rol: ${userStudioRole.role}`,
        },
      ],
    };

    // Si tiene google_contact_id, es UPDATE
    if (userStudioRole.google_contact_id) {
      contactData.resourceName = userStudioRole.google_contact_id;
    }

    // 5. Obtener grupo de contactos del estudio
    const groupResourceName = contactsConfig.groupResourceName || null;

    // 6. Llamar a sincronizarContactoGoogle() con groupResourceName
    const result = await sincronizarContactoGoogle(
      studioSlug,
      contactData,
      groupResourceName
    );

    // 7. Guardar google_contact_id en user_studio_roles
    await prisma.user_studio_roles.update({
      where: { id: userStudioRoleId },
      data: { google_contact_id: result.resourceName },
    });

    // 8. Retornar resultado
    return {
      success: true,
      googleContactId: result.resourceName,
    };
  } catch (error: any) {
    console.error('[sincronizarStaffConGoogle] Error:', error);
    return {
      success: false,
      error: error?.message || 'Error al sincronizar staff con Google',
    };
  }
}

