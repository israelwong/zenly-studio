/**
 * Handler para webhooks de ManyChat
 */

"use server";

import { prisma } from "@/lib/prisma";
import { decryptToken } from "@/lib/utils/encryption";
import { ManyChatClient } from "./client";
import type { ManyChatWebhookPayload } from "./types";
import { createClient } from "@/lib/supabase/server";

/**
 * Procesa un webhook de ManyChat
 */
export async function handleManyChatWebhook(
  studioId: string,
  payload: ManyChatWebhookPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Obtener configuración de ManyChat del studio
    const config = await prisma.studio_manychat_config.findUnique({
      where: { studio_id: studioId },
    });

    if (!config || !config.is_connected) {
      return {
        success: false,
        error: "ManyChat no está conectado para este studio",
      };
    }

    // 2. Desencriptar API Key
    const apiKey = await decryptToken(config.api_key);

    // 3. Obtener información del suscriptor desde ManyChat
    const client = new ManyChatClient(apiKey);
    const subscriber = await client.getSubscriber(payload.subscriber_id);

    // 4. Buscar contacto en ZENLY por manychat_user_id o teléfono
    let contact = await prisma.studio_contacts.findFirst({
      where: {
        studio_id: studioId,
        OR: [
          { manychat_user_id: payload.subscriber_id },
          { phone: subscriber.phone_number },
        ],
      },
    });

    // 5. Si no existe el contacto, crearlo
    if (!contact && subscriber.phone_number) {
      contact = await prisma.studio_contacts.create({
        data: {
          studio_id: studioId,
          name: `${subscriber.first_name || ""} ${subscriber.last_name || ""}`.trim() || "Sin nombre",
          phone: subscriber.phone_number,
          manychat_user_id: payload.subscriber_id,
          manychat_synced_at: new Date(),
        },
      });
    } else if (contact && !contact.manychat_user_id) {
      // Actualizar manychat_user_id si no estaba vinculado
      contact = await prisma.studio_contacts.update({
        where: { id: contact.id },
        data: {
          manychat_user_id: payload.subscriber_id,
          manychat_synced_at: new Date(),
        },
      });
    }

    if (!contact) {
      return {
        success: false,
        error: "No se pudo identificar o crear el contacto",
      };
    }

    // 6. Determinar entity_type y entity_id desde custom_fields
    const customFields = payload.custom_fields || {};
    let entityType: "promise" | "event" | "general" = "general";
    let entityId: string | null = null;

    if (customFields.zen_promise_id) {
      entityType = "promise";
      entityId = customFields.zen_promise_id;
    } else if (customFields.zen_event_id) {
      entityType = "event";
      entityId = customFields.zen_event_id;
    }

    // 7. Crear registro de conversación
    const conversation = await prisma.studio_conversations.create({
      data: {
        studio_id: studioId,
        contact_id: contact.id,
        manychat_message_id: `${payload.subscriber_id}_${Date.now()}`, // ID único temporal
        entity_type: entityType,
        entity_id: entityId,
        message_text: payload.message?.text || "",
        message_type: (payload.message?.type as any) || "text",
        media_url: payload.message?.media_url,
        direction: "inbound",
        sender_type: "contact",
        manychat_tags: payload.tags ? { tags: payload.tags } : null,
        manychat_flow_id: payload.flow_id,
        sent_at: new Date(),
      },
    });

    // 8. Emitir evento Realtime
    const supabase = createClient();
    await supabase.rpc("realtime_send", {
      channel: `studio:${studioId}:conversations:${contact.id}`,
      event: "INSERT",
      payload: {
        operation: "INSERT",
        id: conversation.id,
        studio_id: studioId,
        contact_id: contact.id,
        entity_type: entityType,
        entity_id: entityId,
        message_text: conversation.message_text,
        sent_at: conversation.sent_at,
      },
    });

    // 9. Actualizar last_sync_at en config
    await prisma.studio_manychat_config.update({
      where: { id: config.id },
      data: { last_sync_at: new Date() },
    });

    return { success: true };
  } catch (error) {
    console.error("[handleManyChatWebhook] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}
