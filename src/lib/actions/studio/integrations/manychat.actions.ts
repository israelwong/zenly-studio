/**
 * Server Actions para integración ManyChat
 */

"use server";

import { prisma } from "@/lib/prisma";
import { encryptToken, decryptToken } from "@/lib/utils/encryption";
import { ManyChatClient } from "@/lib/integrations/manychat/client";
import type { ActionResponse } from "@/types";

/**
 * Valida la conexión con ManyChat
 */
export async function validateManyChatConnection(
  studioSlug: string,
  apiKey: string
): Promise<ActionResponse<{ pageId: string; pageName: string }>> {
  try {
    const client = new ManyChatClient(apiKey);
    const accountInfo = await client.getAccountInfo();

    return {
      success: true,
      data: {
        pageId: accountInfo.page_id,
        pageName: accountInfo.page_name,
      },
    };
  } catch (error) {
    console.error("[validateManyChatConnection] Error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo conectar con ManyChat. Verifica tu API Key.",
    };
  }
}

/**
 * Conecta ManyChat al studio
 */
export async function connectManyChat(
  studioSlug: string,
  apiKey: string
): Promise<ActionResponse<{ webhookUrl: string }>> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: "Studio no encontrado" };
    }

    // Validar conexión
    const validation = await validateManyChatConnection(studioSlug, apiKey);
    if (!validation.success || !validation.data) {
      return validation;
    }

    // Encriptar API Key
    const encryptedApiKey = await encryptToken(apiKey);

    // Generar webhook URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://zenly.mx";
    const webhookUrl = `${baseUrl}/api/webhooks/manychat?studio=${studioSlug}`;

    // Guardar configuración
    await prisma.studio_manychat_config.upsert({
      where: { studio_id: studio.id },
      create: {
        studio_id: studio.id,
        api_key: encryptedApiKey,
        page_id: validation.data.pageId,
        is_connected: true,
        connected_at: new Date(),
        webhook_url: webhookUrl,
      },
      update: {
        api_key: encryptedApiKey,
        page_id: validation.data.pageId,
        is_connected: true,
        connected_at: new Date(),
        webhook_url: webhookUrl,
      },
    });

    return {
      success: true,
      data: { webhookUrl },
    };
  } catch (error) {
    console.error("[connectManyChat] Error:", error);
    return {
      success: false,
      error: "Error al conectar ManyChat",
    };
  }
}

/**
 * Desconecta ManyChat del studio
 */
export async function disconnectManyChat(
  studioSlug: string
): Promise<ActionResponse<void>> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: "Studio no encontrado" };
    }

    await prisma.studio_manychat_config.updateMany({
      where: { studio_id: studio.id },
      data: {
        is_connected: false,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("[disconnectManyChat] Error:", error);
    return {
      success: false,
      error: "Error al desconectar ManyChat",
    };
  }
}

/**
 * Obtiene el estado de conexión de ManyChat
 */
export async function getManyChatStatus(
  studioSlug: string
): Promise<
  ActionResponse<{
    isConnected: boolean;
    connectedAt: Date | null;
    lastSyncAt: Date | null;
    webhookUrl: string | null;
  }>
> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
      include: {
        manychat_config: true,
      },
    });

    if (!studio) {
      return { success: false, error: "Studio no encontrado" };
    }

    const config = studio.manychat_config;

    return {
      success: true,
      data: {
        isConnected: config?.is_connected || false,
        connectedAt: config?.connected_at || null,
        lastSyncAt: config?.last_sync_at || null,
        webhookUrl: config?.webhook_url || null,
      },
    };
  } catch (error) {
    console.error("[getManyChatStatus] Error:", error);
    return {
      success: false,
      error: "Error al obtener estado de ManyChat",
    };
  }
}

/**
 * Sincroniza contactos con ManyChat
 */
export async function syncContactsWithManyChat(
  studioSlug: string
): Promise<ActionResponse<{ synced: number; created: number }>> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      include: {
        manychat_config: {
          where: { is_connected: true },
        },
      },
    });

    if (!studio || !studio.manychat_config) {
      return {
        success: false,
        error: "ManyChat no está conectado",
      };
    }

    const config = studio.manychat_config;
    const apiKey = await decryptToken(config.api_key);
    const client = new ManyChatClient(apiKey);

    // Obtener todos los contactos del studio
    const contacts = await prisma.studio_contacts.findMany({
      where: {
        studio_id: studio.id,
        is_test: false,
      },
      select: {
        id: true,
        phone: true,
        name: true,
        manychat_user_id: true,
      },
    });

    let synced = 0;
    let created = 0;

    for (const contact of contacts) {
      try {
        if (contact.manychat_user_id) {
          // Ya está sincronizado, solo actualizar campos
          await client.updateSubscriberCustomFields(contact.manychat_user_id, {
            zen_contact_id: contact.id,
            zen_studio_slug: studioSlug,
          });
          synced++;
        } else if (contact.phone) {
          // Buscar en ManyChat por teléfono
          const subscriber = await client.findSubscriberByPhone(contact.phone);

          if (subscriber) {
            // Vincular manychat_user_id
            await prisma.studio_contacts.update({
              where: { id: contact.id },
              data: {
                manychat_user_id: subscriber.id,
                manychat_synced_at: new Date(),
              },
            });
            synced++;
          } else {
            // Crear nuevo suscriptor en ManyChat
            const newSubscriber = await client.createSubscriber({
              phone_number: contact.phone,
              first_name: contact.name.split(" ")[0] || "",
              last_name: contact.name.split(" ").slice(1).join(" ") || "",
              custom_fields: {
                zen_contact_id: contact.id,
                zen_studio_slug: studioSlug,
              },
            });

            await prisma.studio_contacts.update({
              where: { id: contact.id },
              data: {
                manychat_user_id: newSubscriber.id,
                manychat_synced_at: new Date(),
              },
            });
            created++;
          }
        }
      } catch (error) {
        console.error(
          `[syncContactsWithManyChat] Error sincronizando contacto ${contact.id}:`,
          error
        );
        // Continuar con el siguiente contacto
      }
    }

    // Actualizar last_sync_at
    await prisma.studio_manychat_config.update({
      where: { id: config.id },
      data: { last_sync_at: new Date() },
    });

    return {
      success: true,
      data: { synced, created },
    };
  } catch (error) {
    console.error("[syncContactsWithManyChat] Error:", error);
    return {
      success: false,
      error: "Error al sincronizar contactos",
    };
  }
}
