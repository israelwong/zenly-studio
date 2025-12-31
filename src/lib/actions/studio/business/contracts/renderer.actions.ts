"use server";

import { prisma } from "@/lib/prisma";
import { ActionResponse } from "@/types";
import { EventContractData, ServiceCategory } from "@/types/contracts";
import type { CondicionesComercialesData } from "@/app/[slug]/studio/config/contratos/components/types";
import { renderCondicionesComercialesBlock } from "@/app/[slug]/studio/config/contratos/components/utils/contract-renderer";
import { construirEstructuraJerarquicaCotizacion, COTIZACION_ITEMS_SELECT_STANDARD } from "@/lib/actions/studio/commercial/promises/cotizacion-structure.utils";

// Tipo extendido que incluye condiciones comerciales y datos adicionales
export interface EventContractDataWithConditions extends EventContractData {
  email_cliente?: string;
  telefono_cliente?: string;
  subtotal?: number;
  descuento?: number;
  total?: number;
  cotizacionData?: {
    secciones: Array<{
      nombre: string;
      orden: number;
      categorias: Array<{
        nombre: string;
        orden: number;
        items: Array<{
          nombre: string;
          descripcion?: string;
          cantidad: number;
          subtotal: number;
        }>;
      }>;
    }>;
    total: number;
  };
  condicionesData?: CondicionesComercialesData;
}

// Helper: Obtener event_id real desde promise_id o event_id
export async function getRealEventId(
  studioSlug: string,
  eventIdOrPromiseId: string
): Promise<ActionResponse<string>> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: "Studio no encontrado" };
    }

    // Buscar primero como event_id
    let event = await prisma.studio_events.findFirst({
      where: {
        id: eventIdOrPromiseId,
        studio_id: studio.id,
      },
      select: { id: true },
    });

    // Si no se encuentra, buscar por promise_id
    if (!event) {
      event = await prisma.studio_events.findFirst({
        where: {
          promise_id: eventIdOrPromiseId,
          studio_id: studio.id,
        },
        select: { id: true },
      });
    }

    if (!event) {
      return { success: false, error: "Evento no encontrado" };
    }

    return { success: true, data: event.id };
  } catch (error) {
    console.error('[getRealEventId] Error:', error);
    return { success: false, error: "Error al obtener event_id" };
  }
}

// Obtener datos de la promesa para preview de contrato (antes de crear evento)
export async function getPromiseContractData(
  studioSlug: string,
  promiseId: string,
  cotizacionId: string,
  condicionesComerciales?: {
    id: string;
    name: string;
    description?: string | null;
    discount_percentage?: number | null;
    advance_percentage?: number | null;
    advance_type?: string | null;
    advance_amount?: number | null;
  }
): Promise<ActionResponse<EventContractDataWithConditions>> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true, studio_name: true },
    });

    if (!studio) {
      return { success: false, error: "Studio no encontrado" };
    }

    const promise = await prisma.studio_promises.findFirst({
      where: {
        id: promiseId,
        studio_id: studio.id,
      },
      include: {
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
    });

    if (!promise) {
      return { success: false, error: "Promesa no encontrada" };
    }

    const cotizacion = await prisma.studio_cotizaciones.findFirst({
      where: {
        id: cotizacionId,
        studio_id: studio.id,
      },
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
          select: COTIZACION_ITEMS_SELECT_STANDARD,
          orderBy: {
            order: "asc",
          },
        },
      },
    });

    if (!cotizacion) {
      return { success: false, error: "Cotización no encontrada" };
    }

    // Formatear fecha
    const eventDate = promise.event_date;
    const fechaEvento = eventDate
      ? new Date(eventDate).toLocaleDateString("es-ES", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
      : "Fecha por definir";

    // Construir estructura jerárquica usando función centralizada
    const estructura = construirEstructuraJerarquicaCotizacion(
      cotizacion.cotizacion_items,
      {
        incluirDescripciones: true,
        ordenarPor: 'incremental',
      }
    );

    // Calcular totales
    const subtotal = cotizacion.price;
    const descuento = cotizacion.discount || 0;
    const total = subtotal - descuento;
    const secciones = estructura.secciones;

    // Usar condiciones comerciales pasadas o de la cotización
    const condiciones = condicionesComerciales || cotizacion.condiciones_comerciales;

    // Calcular anticipo si hay condiciones
    let montoAnticipo: number | undefined;
    let totalFinal = total;
    let descuentoAplicado = descuento;

    if (condiciones) {
      if (condiciones.discount_percentage) {
        descuentoAplicado = (subtotal * condiciones.discount_percentage) / 100;
        totalFinal = subtotal - descuentoAplicado;
      }

      if (condiciones.advance_type === "percentage" && condiciones.advance_percentage) {
        montoAnticipo = (totalFinal * condiciones.advance_percentage) / 100;
      } else if (condiciones.advance_type === "fixed_amount" && condiciones.advance_amount) {
        montoAnticipo = condiciones.advance_amount;
      }
    }

    // Convertir secciones a formato legacy para [SERVICIOS_INCLUIDOS]
    const serviciosLegacy: any[] = [];
    secciones.forEach(seccion => {
      seccion.categorias.forEach(categoria => {
        serviciosLegacy.push({
          categoria: categoria.nombre,
          servicios: categoria.items.map(item => ({
            nombre: item.nombre,
            descripcion: item.descripcion,
            precio: item.subtotal,
          })),
        });
      });
    });

    const eventData: EventContractDataWithConditions = {
      nombre_studio: studio.studio_name,
      nombre_representante: studio.representative_name || undefined,
      telefono_studio: studio.phone || undefined,
      correo_studio: studio.email,
      direccion_studio: studio.address || undefined,
      nombre_cliente: promise.contact?.name || "Cliente",
      email_cliente: promise.contact?.email || "",
      telefono_cliente: promise.contact?.phone || "",
      direccion_cliente: promise.contact?.address || undefined,
      nombre_evento: promise.name || "Evento",
      tipo_evento: promise.event_type?.name || "Evento",
      fecha_evento: fechaEvento,
      servicios_incluidos: serviciosLegacy, // Formato legacy para [SERVICIOS_INCLUIDOS]
      total_contrato: `$${totalFinal.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`,
      condiciones_pago: condiciones?.description || "Por definir",
      subtotal,
      descuento: descuentoAplicado,
      total: totalFinal,
      cotizacionData: {
        secciones: secciones,
        total: totalFinal,
      },
      condicionesData: condiciones ? {
        nombre: condiciones.name,
        descripcion: condiciones.description || undefined,
        porcentaje_descuento: condiciones.discount_percentage || undefined,
        porcentaje_anticipo: condiciones.advance_percentage || undefined,
        tipo_anticipo: (condiciones.advance_type as "percentage" | "fixed_amount") || undefined,
        monto_anticipo: montoAnticipo,
        total_contrato: subtotal,
        total_final: totalFinal,
        descuento_aplicado: descuentoAplicado,
      } : undefined,
    };

    return { success: true, data: eventData };
  } catch (error) {
    console.error('[getPromiseContractData] Error:', error);
    return { success: false, error: "Error al obtener datos de la promesa" };
  }
}

// Obtener datos del evento para el contrato
export async function getEventContractData(
  studioSlug: string,
  eventId: string
): Promise<ActionResponse<EventContractDataWithConditions>> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { 
        id: true, 
        studio_name: true,
        representative_name: true,
        phone: true,
        email: true,
        address: true,
      },
    });

    if (!studio) {
      return { success: false, error: "Studio no encontrado" };
    }

    // El eventId puede ser un promise_id, obtener el event_id real
    const realEventIdResult = await getRealEventId(studioSlug, eventId);
    if (!realEventIdResult.success || !realEventIdResult.data) {
      return { success: false, error: realEventIdResult.error || "Evento no encontrado" };
    }

    const realEventId = realEventIdResult.data;

    const event = await prisma.studio_events.findFirst({
      where: {
        id: realEventId,
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
                address: true,
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
        contracts: {
          where: {
            status: "SIGNED",
          },
          orderBy: {
            signed_at: "desc",
          },
          take: 1,
          select: {
            signed_at: true,
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

    // Buscar cotización aprobada del evento (puede estar en la relación directa o por evento_id)
    let cotizacionAprobada = event.cotizacion;

    // Si no hay en la relación directa, buscar por evento_id
    if (!cotizacionAprobada) {
      const cotizacionPorEvento = await prisma.studio_cotizaciones.findFirst({
        where: {
          evento_id: realEventId,
          status: { in: ['aprobada', 'autorizada', 'approved'] },
          archived: false,
        },
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
        orderBy: {
          created_at: 'desc', // Tomar la más reciente si hay múltiples
        },
      });

      cotizacionAprobada = cotizacionPorEvento;
    }

    if (!cotizacionAprobada) {
      return { success: false, error: "El evento no tiene una cotización autorizada" };
    }

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
    const itemsOrdenados = cotizacionAprobada.cotizacion_items
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
    const totalContrato = Number(cotizacionAprobada.price);
    // Calcular descuento: puede ser porcentaje o monto fijo
    let descuento = 0;
    if (cotizacionAprobada.condiciones_comerciales) {
      const condiciones = cotizacionAprobada.condiciones_comerciales;
      if (condiciones.discount_percentage) {
        // Descuento porcentual
        descuento = totalContrato * (Number(condiciones.discount_percentage) / 100);
      } else if (cotizacionAprobada.discount) {
        // Descuento fijo desde la cotización
        descuento = Number(cotizacionAprobada.discount);
      }
    } else if (cotizacionAprobada.discount) {
      // Descuento directo en la cotización
      descuento = Number(cotizacionAprobada.discount);
    }
    const totalFinal = totalContrato - descuento;

    // Preparar datos de condiciones comerciales si existen
    let condicionesData: CondicionesComercialesData | undefined;
    if (cotizacionAprobada.condiciones_comerciales) {
      const cc = cotizacionAprobada.condiciones_comerciales;

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

    // Formatear fecha de firma si existe
    const fechaFirmaCliente = event.contracts?.[0]?.signed_at
      ? new Date(event.contracts[0].signed_at).toLocaleDateString("es-ES", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : undefined;

    const contractData: EventContractDataWithConditions = {
      nombre_cliente: event.promise.contact.name,
      email_cliente: event.promise.contact.email || undefined,
      telefono_cliente: event.promise.contact.phone || undefined,
      direccion_cliente: event.promise.contact.address || undefined,
      fecha_evento: fechaEvento,
      tipo_evento: event.event_type?.name || event.promise.event_type?.name || "Evento",
      nombre_evento: event.promise.name || "Sin nombre",
      total_contrato: new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
      }).format(totalFinal),
      condiciones_pago:
        cotizacionAprobada.condiciones_comerciales?.description || "No especificadas",
      nombre_studio: studio.studio_name,
      nombre_representante: studio.representative_name || undefined,
      telefono_studio: studio.phone || undefined,
      correo_studio: studio.email,
      direccion_studio: studio.address || undefined,
      fecha_firma_cliente: fechaFirmaCliente,
      servicios_incluidos: serviciosIncluidos,
      condicionesData,
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
  eventData: EventContractData,
  condicionesData?: CondicionesComercialesData
): Promise<ActionResponse<string>> {
  try {
    let rendered = content;

    // Variables de cliente (se convertirán a mayúsculas)
    const clienteVars: Record<string, string> = {
      "@nombre_cliente": eventData.nombre_cliente.toUpperCase(),
      "@email_cliente": (eventData.email_cliente || "").toUpperCase(),
      "@telefono_cliente": (eventData.telefono_cliente || "").toUpperCase(),
      "@direccion_cliente": (eventData.direccion_cliente || "").toUpperCase(),
    };

    // Variables de estudio (se convertirán a mayúsculas)
    const studioVars: Record<string, string> = {
      "@nombre_studio": eventData.nombre_studio.toUpperCase(),
      "@nombre_representante": (eventData.nombre_representante || "").toUpperCase(),
      "@telefono_studio": (eventData.telefono_studio || "").toUpperCase(),
      "@correo_studio": (eventData.correo_studio || "").toUpperCase(),
      "@direccion_studio": (eventData.direccion_studio || "").toUpperCase(),
    };

    // Variables de negocio/comerciales (sin mayúsculas)
    const comercialesVars: Record<string, string> = {
      "@total_contrato": eventData.total_contrato,
      "@condiciones_pago": eventData.condiciones_pago,
    };

    // Variables de evento (sin mayúsculas)
    const eventoVars: Record<string, string> = {
      "@fecha_evento": eventData.fecha_evento,
      "@tipo_evento": eventData.tipo_evento,
      "@nombre_evento": eventData.nombre_evento,
      "@fecha_firma_cliente": eventData.fecha_firma_cliente || "",
    };

    // Combinar todas las variables
    const variables: Record<string, string> = {
      ...clienteVars,
      ...studioVars,
      ...comercialesVars,
      ...eventoVars,
    };

    // También soportar sintaxis {variable} con las mismas conversiones
    const braceVariables: Record<string, string> = {
      "{nombre_cliente}": eventData.nombre_cliente.toUpperCase(),
      "{email_cliente}": (eventData.email_cliente || "").toUpperCase(),
      "{telefono_cliente}": (eventData.telefono_cliente || "").toUpperCase(),
      "{direccion_cliente}": (eventData.direccion_cliente || "").toUpperCase(),
      "{fecha_evento}": eventData.fecha_evento,
      "{tipo_evento}": eventData.tipo_evento,
      "{nombre_evento}": eventData.nombre_evento,
      "{total_contrato}": eventData.total_contrato,
      "{condiciones_pago}": eventData.condiciones_pago,
      "{nombre_studio}": eventData.nombre_studio.toUpperCase(),
      "{nombre_representante}": (eventData.nombre_representante || "").toUpperCase(),
      "{telefono_studio}": (eventData.telefono_studio || "").toUpperCase(),
      "{correo_studio}": (eventData.correo_studio || "").toUpperCase(),
      "{direccion_studio}": (eventData.direccion_studio || "").toUpperCase(),
      "{fecha_firma_cliente}": eventData.fecha_firma_cliente || "",
    };

    // Reemplazar variables @variable
    Object.entries(variables).forEach(([key, value]) => {
      rendered = rendered.replaceAll(key, value);
    });

    // Reemplazar variables {variable}
    Object.entries(braceVariables).forEach(([key, value]) => {
      rendered = rendered.replaceAll(key, value);
    });

    // Renderizar bloque de condiciones comerciales
    if (condicionesData) {
      const condicionesHtml = renderCondicionesComercialesBlock(condicionesData);
      rendered = rendered.replace("@condiciones_comerciales", condicionesHtml);
      rendered = rendered.replace("{condiciones_comerciales}", condicionesHtml);
    } else {
      // Placeholder si no hay datos
      const placeholder =
        '<div class="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg"><p class="text-zinc-500 italic">No hay condiciones comerciales disponibles</p></div>';
      rendered = rendered.replace("@condiciones_comerciales", placeholder);
      rendered = rendered.replace("{condiciones_comerciales}", placeholder);
    }

    // Renderizar bloque especial de servicios
    if (rendered.includes("[SERVICIOS_INCLUIDOS]")) {
      const servicios = eventData.servicios_incluidos || [];
      const serviciosHtml = renderServiciosBlock(servicios);
      rendered = rendered.replace("[SERVICIOS_INCLUIDOS]", serviciosHtml);
    }

    return { success: true, data: rendered };
  } catch (error) {
    console.error("Error al renderizar contenido:", error);
    return { success: false, error: "Error al renderizar contenido" };
  }
}

// Renderizar bloque de servicios
function renderServiciosBlock(servicios: ServiceCategory[] | undefined | null): string {
  if (!servicios || servicios.length === 0) {
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
