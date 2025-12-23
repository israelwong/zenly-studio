"use server";

import { prisma } from "@/lib/prisma";
import { ActionResponse } from "@/types";
import { EventContractData, ServiceCategory } from "@/types/contracts";
import type { CondicionesComercialesData } from "@/app/[slug]/studio/config/contratos/components/types";

// Tipo extendido que incluye condiciones comerciales
export interface EventContractDataWithConditions extends EventContractData {
  condicionesData?: CondicionesComercialesData;
}

// Obtener datos del evento para el contrato
export async function getEventContractData(
  studioSlug: string,
  eventId: string
): Promise<ActionResponse<EventContractDataWithConditions>> {
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
          select: {
            id: true,
            name: true,
            event_date: true,
            contact: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
              },
            },
            event_type: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        event_type: {
          select: {
            id: true,
            name: true,
          },
        },
        cotizacion: {
          select: {
            id: true,
            name: true,
            price: true,
            discount: true,
            status: true,
            selected_by_prospect: true,
            tyc_accepted: true,
            condiciones_comerciales_id: true,
            condiciones_comerciales: {
              select: {
                id: true,
                name: true,
                description: true,
                discount_percentage: true,
                advance_percentage: true,
                advance_type: true,
                advance_amount: true,
              },
            },
            cotizacion_items: {
              include: {
                items: {
                  include: {
                    service_categories: true,
                  },
                },
                service_categories: true,
              },
              orderBy: {
                order: "asc",
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

    console.log('[getEventContractData] Datos obtenidos:', {
      eventId: event.id,
      eventDate: event.event_date,
      promiseEventDate: event.promise?.event_date,
      promiseName: event.promise?.name,
      cotizacion: {
        id: event.cotizacion.id,
        name: event.cotizacion.name,
        price: event.cotizacion.price,
        discount: event.cotizacion.discount,
        status: event.cotizacion.status,
        selected_by_prospect: event.cotizacion.selected_by_prospect,
        tyc_accepted: event.cotizacion.tyc_accepted,
        condiciones_comerciales_id: event.cotizacion.condiciones_comerciales_id,
        tiene_condiciones_comerciales: !!event.cotizacion.condiciones_comerciales,
      },
      condicionesComerciales: event.cotizacion.condiciones_comerciales ? {
        id: event.cotizacion.condiciones_comerciales.id,
        name: event.cotizacion.condiciones_comerciales.name,
        description: event.cotizacion.condiciones_comerciales.description,
        discount_percentage: event.cotizacion.condiciones_comerciales.discount_percentage,
        advance_percentage: event.cotizacion.condiciones_comerciales.advance_percentage,
        advance_type: event.cotizacion.condiciones_comerciales.advance_type,
        advance_amount: event.cotizacion.condiciones_comerciales.advance_amount,
      } : null,
      itemsCount: event.cotizacion.cotizacion_items.length,
      firstItem: event.cotizacion.cotizacion_items[0] ? {
        name: event.cotizacion.cotizacion_items[0].name,
        name_snapshot: event.cotizacion.cotizacion_items[0].name_snapshot,
        unit_price: event.cotizacion.cotizacion_items[0].unit_price,
        unit_price_snapshot: event.cotizacion.cotizacion_items[0].unit_price_snapshot,
        subtotal: event.cotizacion.cotizacion_items[0].subtotal,
        quantity: event.cotizacion.cotizacion_items[0].quantity,
      } : null,
    });

    // Formatear fecha - leer de promise.event_date primero, luego event.event_date
    const eventDate = event.promise?.event_date || event.event_date;
    const fechaEvento = eventDate
      ? new Date(eventDate).toLocaleDateString("es-ES", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
      : "Fecha por definir";

    // Ordenar items por categoría (usando snapshots o relaciones)
    const itemsOrdenados = event.cotizacion.cotizacion_items
      .map((item) => {
        // Obtener nombre de categoría desde snapshot o relación
        const categoryName = item.category_name_snapshot ||
          item.items?.service_categories?.name ||
          item.service_categories?.name ||
          "Sin categoría";
        
        // Obtener orden de categoría para ordenar
        const categoryOrder = item.items?.service_categories?.order ??
          item.service_categories?.order ??
          999;

        return {
          item,
          categoryName,
          categoryOrder,
        };
      })
      .sort((a, b) => {
        // Primero por orden de categoría
        if (a.categoryOrder !== b.categoryOrder) {
          return a.categoryOrder - b.categoryOrder;
        }
        // Luego por nombre de categoría
        return a.categoryName.localeCompare(b.categoryName);
      });

    // Agrupar servicios por categoría
    const serviciosPorCategoria = itemsOrdenados.reduce(
      (acc, { item, categoryName }) => {
        if (!acc[categoryName]) {
          acc[categoryName] = [];
        }

        // Calcular precio: usar subtotal si está disponible, sino calcular desde unit_price
        const precioUnitario = Number(item.unit_price_snapshot || item.unit_price || 0);
        const subtotal = Number(item.subtotal || 0);
        const precio = subtotal > 0 ? subtotal : precioUnitario * item.quantity;

        acc[categoryName].push({
          nombre: item.name_snapshot || item.name || "Servicio sin nombre",
          descripcion: item.description_snapshot || item.description || undefined,
          precio: precio,
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
    const totalContrato = Number(event.cotizacion.price);
    // Calcular descuento: puede ser porcentaje o monto fijo
    let descuento = 0;
    if (event.cotizacion.condiciones_comerciales) {
      const condiciones = event.cotizacion.condiciones_comerciales;
      if (condiciones.discount_percentage) {
        // Descuento porcentual
        descuento = totalContrato * (Number(condiciones.discount_percentage) / 100);
      } else if (event.cotizacion.discount) {
        // Descuento fijo desde la cotización
        descuento = Number(event.cotizacion.discount);
      }
    } else if (event.cotizacion.discount) {
      // Descuento directo en la cotización
      descuento = Number(event.cotizacion.discount);
    }
    const totalFinal = totalContrato - descuento;

    // Preparar datos de condiciones comerciales si existen
    let condicionesData: CondicionesComercialesData | undefined;
    if (event.cotizacion.condiciones_comerciales) {
      const cc = event.cotizacion.condiciones_comerciales;
      
      // Calcular monto de anticipo
      let montoAnticipoCalculado: number | undefined;
      if (cc.advance_percentage && cc.advance_type === "percentage") {
        montoAnticipoCalculado = totalFinal * (Number(cc.advance_percentage) / 100);
      } else if (cc.advance_amount) {
        montoAnticipoCalculado = Number(cc.advance_amount);
      }
      
      condicionesData = {
        nombre: cc.name,
        descripcion: cc.description || undefined,
        porcentaje_anticipo: cc.advance_percentage || undefined,
        tipo_anticipo: (cc.advance_type as "percentage" | "fixed_amount") || undefined,
        monto_anticipo: montoAnticipoCalculado,
        porcentaje_descuento: cc.discount_percentage || undefined,
        total_contrato: totalContrato,
        total_final: totalFinal,
        descuento_aplicado: descuento,
        // TODO: Agregar condiciones_metodo_pago si están disponibles en la relación
        condiciones_metodo_pago: undefined,
      };
    }

    const contractData: EventContractDataWithConditions = {
      nombre_cliente: event.promise.contact.name,
      fecha_evento: fechaEvento,
      tipo_evento: event.event_type?.name || event.promise.event_type?.name || "Evento",
      nombre_evento: event.promise.name || "Sin nombre",
      total_contrato: new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
      }).format(totalFinal),
      condiciones_pago:
        event.cotizacion.condiciones_comerciales?.description || "No especificadas",
      nombre_studio: studio.studio_name,
      servicios_incluidos: serviciosIncluidos,
      condicionesData,
    };

    console.log('[getEventContractData] ContractData generado:', {
      nombre_cliente: contractData.nombre_cliente,
      fecha_evento: contractData.fecha_evento,
      tipo_evento: contractData.tipo_evento,
      nombre_evento: contractData.nombre_evento,
      total_contrato: contractData.total_contrato,
      condiciones_pago: contractData.condiciones_pago,
      nombre_studio: contractData.nombre_studio,
      servicios_incluidos_count: contractData.servicios_incluidos.length,
      cotizacion_status: event.cotizacion.status,
      cotizacion_selected_by_prospect: event.cotizacion.selected_by_prospect,
      cotizacion_tyc_accepted: event.cotizacion.tyc_accepted,
      tiene_condiciones_comerciales: !!event.cotizacion.condiciones_comerciales,
      condiciones_comerciales_id: event.cotizacion.condiciones_comerciales_id,
      condiciones_comerciales_name: event.cotizacion.condiciones_comerciales?.name,
      condicionesData: condicionesData ? {
        nombre: condicionesData.nombre,
        tiene_descripcion: !!condicionesData.descripcion,
        tiene_anticipo: condicionesData.porcentaje_anticipo !== undefined || condicionesData.monto_anticipo !== undefined,
        tiene_descuento: condicionesData.porcentaje_descuento !== undefined,
      } : null,
    });

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
      html += `<li>${servicio.nombre}</li>`;

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
