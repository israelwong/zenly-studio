"use server";

import { prisma } from "@/lib/prisma";
import { ActionResponse } from "@/types";
import { EventContractData, ServiceCategory } from "@/types/contracts";

// Obtener datos del evento para el contrato
export async function getEventContractData(
  studioSlug: string,
  eventId: string
): Promise<ActionResponse<EventContractData>> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true, studio_name: true },
    });

    if (!studio) {
      return { success: false, error: "Studio no encontrado" };
    }

    const event = await prisma.studio_events.findFirst({
      where: {
        id: eventId,
        studio_id: studio.id,
      },
      include: {
        promise: {
          include: {
            contact: true,
            event_type: true,
          },
        },
        event_type: true,
        cotizacion: {
          include: {
            condiciones_comerciales: true,
            cotizacion_items: {
              include: {
                category: true,
              },
              orderBy: {
                category: {
                  name: "asc",
                },
              },
            },
          },
        },
      },
    });

    if (!event) {
      return { success: false, error: "Evento no encontrado" };
    }

    if (!event.promise) {
      return { success: false, error: "El evento no tiene una promesa asociada" };
    }

    if (!event.cotizacion) {
      return { success: false, error: "El evento no tiene una cotización autorizada" };
    }

    // Formatear fecha
    const fechaEvento = event.event_date
      ? new Date(event.event_date).toLocaleDateString("es-ES", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
      : "Fecha por definir";

    // Agrupar servicios por categoría
    const serviciosPorCategoria = event.cotizacion.cotizacion_items.reduce(
      (acc, item) => {
        const categoryName = item.category?.name || "Sin categoría";

        if (!acc[categoryName]) {
          acc[categoryName] = [];
        }

        acc[categoryName].push({
          nombre: item.name,
          descripcion: item.description || undefined,
          precio: item.unit_price * item.quantity,
        });

        return acc;
      },
      {} as Record<string, Array<{ nombre: string; descripcion?: string; precio: number }>>
    );

    const serviciosIncluidos: ServiceCategory[] = Object.entries(serviciosPorCategoria).map(
      ([categoria, servicios]) => ({
        categoria,
        servicios,
      })
    );

    // Calcular total
    const totalContrato = event.cotizacion.price;
    const descuento = event.cotizacion.condiciones_comerciales?.descuento || 0;
    const totalFinal = totalContrato - descuento;

    const contractData: EventContractData = {
      nombre_cliente: event.promise.contact.name,
      fecha_evento: fechaEvento,
      tipo_evento: event.event_type?.name || event.promise.event_type?.name || "Evento",
      nombre_evento: event.promise.name || "Sin nombre",
      total_contrato: new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
      }).format(totalFinal),
      condiciones_pago:
        event.cotizacion.condiciones_comerciales?.descripcion || "No especificadas",
      nombre_studio: studio.studio_name,
      servicios_incluidos: serviciosIncluidos,
    };

    return { success: true, data: contractData };
  } catch (error) {
    console.error("Error al obtener datos del evento:", error);
    return { success: false, error: "Error al obtener datos del evento" };
  }
}

// Renderizar contenido del contrato con variables
export async function renderContractContent(
  content: string,
  eventData: EventContractData
): Promise<ActionResponse<string>> {
  try {
    let rendered = content;

    // Reemplazar variables simples
    const variables: Record<string, string> = {
      "@nombre_cliente": eventData.nombre_cliente,
      "@fecha_evento": eventData.fecha_evento,
      "@tipo_evento": eventData.tipo_evento,
      "@nombre_evento": eventData.nombre_evento,
      "@total_contrato": eventData.total_contrato,
      "@condiciones_pago": eventData.condiciones_pago,
      "@nombre_studio": eventData.nombre_studio,
    };

    Object.entries(variables).forEach(([key, value]) => {
      rendered = rendered.replaceAll(key, value);
    });

    // Renderizar bloque especial de servicios
    if (rendered.includes("[SERVICIOS_INCLUIDOS]")) {
      const serviciosHtml = renderServiciosBlock(eventData.servicios_incluidos);
      rendered = rendered.replace("[SERVICIOS_INCLUIDOS]", serviciosHtml);
    }

    return { success: true, data: rendered };
  } catch (error) {
    console.error("Error al renderizar contenido:", error);
    return { success: false, error: "Error al renderizar contenido" };
  }
}

// Renderizar bloque de servicios
function renderServiciosBlock(servicios: ServiceCategory[]): string {
  if (servicios.length === 0) {
    return "<p><em>No hay servicios incluidos</em></p>";
  }

  let html = '<div class="servicios-incluidos">';

  servicios.forEach((categoria) => {
    html += `
      <div class="servicio-categoria mb-5">
        <h3 class="font-semibold text-zinc-300 mb-2">${categoria.categoria}</h3>
        <ul class="list-disc list-inside space-y-1 text-zinc-400">
    `;

    categoria.servicios.forEach((servicio) => {
      const precio = servicio.precio > 0
        ? ` - ${new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(servicio.precio)}`
        : "";

      html += `<li>${servicio.nombre}${precio}</li>`;

      if (servicio.descripcion) {
        html += `<p class="text-sm text-zinc-500 ml-6">${servicio.descripcion}</p>`;
      }
    });

    html += `
        </ul>
      </div>
    `;
  });

  html += "</div>";

  return html;
}
