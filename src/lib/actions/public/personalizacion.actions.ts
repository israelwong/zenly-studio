"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * Solicitar personalización de cotización o paquete
 * Crea notificación y log en promesa
 */
export async function solicitarPersonalizacion(
  promiseId: string,
  itemId: string,
  itemType: 'cotizacion' | 'paquete',
  mensaje: string,
  studioSlug: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // 1. Validar que la promesa existe y obtener datos necesarios
    const promise = await prisma.studio_promises.findFirst({
      where: {
        id: promiseId,
        studio: {
          slug: studioSlug,
        },
      },
      include: {
        contact: {
          select: {
            name: true,
            phone: true,
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
            studio_name: true,
          },
        },
      },
    });

    if (!promise) {
      return {
        success: false,
        error: "Promesa no encontrada",
      };
    }

    // 2. Obtener información del item (cotización o paquete)
    let itemName = '';
    if (itemType === 'cotizacion') {
      const cotizacion = await prisma.studio_cotizaciones.findUnique({
        where: { id: itemId },
        select: { name: true },
      });
      itemName = cotizacion?.name || 'Cotización';
    } else {
      const paquete = await prisma.studio_paquetes.findUnique({
        where: { id: itemId },
        select: { name: true },
      });
      itemName = paquete?.name || 'Paquete';
    }

    // 3. Crear notificación para el usuario del estudio
    await prisma.studio_notifications.create({
      data: {
        studio_id: promise.studio_id,
        type: 'promise_personalizacion',
        title: `Solicitud de personalización - ${promise.contact.name}`,
        message: `${promise.contact.name} solicita personalizar "${itemName}" para su ${promise.event_type?.name || 'evento'}${mensaje ? `: ${mensaje}` : ''}`,
        action_url: `/studio/${studioSlug}/manager/promises/${promiseId}`,
        metadata: {
          promise_id: promiseId,
          contact_name: promise.contact.name,
          item_id: itemId,
          item_type: itemType,
          item_name: itemName,
          mensaje: mensaje || null,
        },
      },
    });

    // 4. Agregar log a la promesa
    const currentLogs = (promise.logs as any[]) || [];
    const newLog = {
      timestamp: new Date().toISOString(),
      action: 'personalizacion_solicitada',
      description: `Cliente solicitó personalización de ${itemType}: "${itemName}"${mensaje ? ` - Mensaje: ${mensaje}` : ''}`,
      user: 'Cliente',
      metadata: {
        item_id: itemId,
        item_type: itemType,
        item_name: itemName,
        mensaje: mensaje || null,
      },
    };

    await prisma.studio_promises.update({
      where: { id: promiseId },
      data: {
        logs: [...currentLogs, newLog],
        updated_at: new Date(),
      },
    });

    // 5. Revalidar rutas
    revalidatePath(`/${studioSlug}/studio/manager/promises`);
    revalidatePath(`/${studioSlug}/studio/manager/promises/${promiseId}`);

    return {
      success: true,
    };
  } catch (error) {
    console.error("[solicitarPersonalizacion] Error:", error);
    return {
      success: false,
      error: "Error al procesar solicitud",
    };
  }
}
