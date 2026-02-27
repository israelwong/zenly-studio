"use server";

import { prisma } from "@/lib/prisma";
import { ActionResponse } from "@/types";
import { EventContractData, ServiceCategory } from "@/types/contracts";
import type { CondicionesComercialesData, CotizacionRenderData } from "@/components/shared/contracts/types";
import { renderCondicionesComercialesBlock, type ContractRendererOptions } from "@/components/shared/contracts/utils/contract-renderer";
import { construirEstructuraJerarquicaCotizacion, COTIZACION_ITEMS_SELECT_STANDARD } from "@/lib/actions/studio/commercial/promises/cotizacion-structure.utils";
import { obtenerInfoBancariaTransferencia } from "@/lib/actions/shared/metodos-pago.actions";
import { calcularCantidadEfectiva } from "@/lib/utils/dynamic-billing-calc";
import { roundPrice } from "@/lib/utils/price-rounding";
import { formatItemQuantity } from "@/lib/utils/contract-item-formatter";
import { formatDisplayDateLong } from "@/lib/utils/date-formatter";
import { toUtcDateOnly, getDateOnlyInTimezone } from "@/lib/utils/date-only";

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
      select: { 
        id: true, 
        studio_name: true,
        representative_name: true,
        phone: true,
        email: true,
        address: true,
        timezone: true,
      },
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
        negociacion_precio_personalizado: true,
        negociacion_precio_original: true,
        event_duration: true,
        paquete_id: true, // ✅ Para identificar si viene de paquete y aplicar precio charm
        precio_calculado: true,
        bono_especial: true,
        items_cortesia: true,
        cotizacion_items: {
          select: {
            ...COTIZACION_ITEMS_SELECT_STANDARD,
            is_courtesy: true,
            service_category_id: true,
            service_categories: {
              select: {
                name: true,
                section_categories: {
                  select: {
                    service_sections: {
                      select: { name: true },
                    },
                  },
                },
              },
            },
          },
          orderBy: {
            order: "asc",
          },
        },
        cotizacion_cierre: {
          select: {
            contract_signed_at: true,
            pago_monto: true,
            condiciones_comerciales: {
              select: {
                id: true,
                name: true,
                description: true,
                advance_percentage: true,
                advance_type: true,
                advance_amount: true,
                discount_percentage: true,
              },
            },
          },
        },
        condicion_comercial_negociacion: {
          select: {
            id: true,
            name: true,
            description: true,
            advance_percentage: true,
            advance_type: true,
            advance_amount: true,
            discount_percentage: true,
          },
        },
        condiciones_comerciales: {
          select: {
            id: true,
            name: true,
            description: true,
            advance_percentage: true,
            advance_type: true,
            advance_amount: true,
            discount_percentage: true,
          },
        },
      },
    });

    if (!cotizacion) {
      return { success: false, error: "Cotizaci?n no encontrada" };
    }

    // Formatear fecha (SSoT: solo UTC, sin lógica local)
    const eventDate = promise.event_date;
    const fechaEvento = eventDate
      ? formatDisplayDateLong(toUtcDateOnly(eventDate))
      : "Fecha por definir";

    // Mapear items para usar relación service_categories cuando faltan snapshots
    const itemsMapeados = cotizacion.cotizacion_items.map((item: any) => {
      // Obtener nombres de categoría y sección desde snapshots o desde relación service_categories
      let categoryName = item.category_name_snapshot || item.category_name;
      let sectionName = item.seccion_name_snapshot || item.seccion_name;
      
      // Si faltan los snapshots pero hay service_category_id, obtener desde la relación
      if ((!categoryName || !sectionName) && item.service_category_id && item.service_categories) {
        categoryName = categoryName || item.service_categories.name;
        sectionName = sectionName || item.service_categories.section_categories?.service_sections?.name || null;
      }
      
      return {
        ...item,
        category_name_snapshot: categoryName || item.category_name_snapshot,
        seccion_name_snapshot: sectionName || item.seccion_name_snapshot,
        category_name: categoryName || item.category_name,
        seccion_name: sectionName || item.seccion_name,
      };
    });

    // Construir estructura jer?rquica usando funci?n centralizada
    const estructura = construirEstructuraJerarquicaCotizacion(
      itemsMapeados,
      {
        incluirDescripciones: true,
        ordenarPor: 'incremental',
      }
    );

    // ✅ OPTIMIZACIÓN: Identificar si viene de paquete para aplicar precio charm
    const esPaquete = !!cotizacion.paquete_id;
    
    // Calcular totales
    // El precio base es el precio de la cotizaci?n (puede incluir descuentos previos)
    // Para el c?lculo correcto, necesitamos el precio base antes de descuentos
    const precioBase = cotizacion.price;
    const descuentoExistente = cotizacion.discount || 0;
    // Si hay descuento en la cotizaci?n, el precio base real es precio + descuento
    const precioBaseReal = descuentoExistente > 0 ? precioBase + descuentoExistente : precioBase;
    
    const secciones = estructura.secciones;

    // Obtener horas de cobertura (prioridad: cotizacion.event_duration > promise.duration_hours)
    const eventDuration = cotizacion.event_duration ?? promise.duration_hours ?? null;
    
    // Crear mapa de item_id -> billing_type desde items originales
    const billingTypeMap = new Map<string, 'HOUR' | 'SERVICE' | 'UNIT'>();
    cotizacion.cotizacion_items.forEach(item => {
      if (item.item_id && item.billing_type) {
        billingTypeMap.set(item.item_id, item.billing_type as 'HOUR' | 'SERVICE' | 'UNIT');
      }
    });
    
    // Si billingTypeMap está vacío o incompleto, obtener billing_type desde el catálogo usando obtenerCatalogo
    const itemsSinBillingType = cotizacion.cotizacion_items.filter(
      item => item.item_id && !billingTypeMap.has(item.item_id!)
    );
    
    if (itemsSinBillingType.length > 0) {
      try {
        // Usar obtenerCatalogo como lo hace createCotizacion para mantener consistencia
        const { obtenerCatalogo } = await import('@/lib/actions/studio/config/catalogo.actions');
        const catalogoResult = await obtenerCatalogo(studioSlug);
        
        if (catalogoResult.success && catalogoResult.data) {
          // Crear mapa de item_id -> utility_type para fallback
          const utilityTypeMap = new Map<string, string>();
          
          catalogoResult.data.forEach(seccion => {
            seccion.categorias.forEach(categoria => {
              categoria.servicios.forEach(servicio => {
                // ✅ CORRECCIÓN: Si billing_type está definido, usarlo; sino usar utility_type como fallback
                if (servicio.billing_type) {
                  billingTypeMap.set(servicio.id, servicio.billing_type as 'HOUR' | 'SERVICE' | 'UNIT');
                } else if (servicio.tipo_utilidad) {
                  // Guardar utility_type para fallback después
                  utilityTypeMap.set(servicio.id, servicio.tipo_utilidad);
                }
              });
            });
          });
          
          // Aplicar fallback basado en utility_type para items sin billing_type
          utilityTypeMap.forEach((utilityType, itemId) => {
            if (!billingTypeMap.has(itemId)) {
              const utilityTypeLower = utilityType.toLowerCase();
              const fallbackBillingType = utilityTypeLower === 'product' || utilityTypeLower === 'producto'
                ? 'UNIT'
                : 'SERVICE';
              billingTypeMap.set(itemId, fallbackBillingType);
            }
          });
        }
      } catch (error) {
        console.error('[getPromiseContractData] Error obteniendo billing_type desde catálogo:', error);
      }
    }

    // Usar condiciones: 1) par?metro, 2) cotizacion_cierre, 3) condicion_comercial_negociacion, 4) condiciones_comerciales (cat?logo)
    const mapCond = (c: { id: string; name: string; description: string | null; discount_percentage?: number | null; advance_percentage?: number | null; advance_type?: string | null; advance_amount?: unknown }) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      discount_percentage: c.discount_percentage != null ? Number(c.discount_percentage) : null,
      advance_percentage: c.advance_percentage != null ? Number(c.advance_percentage) : null,
      advance_type: c.advance_type ?? null,
      advance_amount: c.advance_amount != null ? Number(c.advance_amount) : null,
    });
    let condiciones = condicionesComerciales ?? null;
    if (!condiciones && cotizacion.cotizacion_cierre?.condiciones_comerciales) {
      condiciones = mapCond(cotizacion.cotizacion_cierre.condiciones_comerciales);
    }
    if (!condiciones && (cotizacion as any).condicion_comercial_negociacion) {
      condiciones = mapCond((cotizacion as any).condicion_comercial_negociacion);
    }
    if (!condiciones && (cotizacion as any).condiciones_comerciales) {
      condiciones = mapCond((cotizacion as any).condiciones_comerciales);
    }
    
    // Si tenemos un ID de condiciones comerciales, obtener datos completos desde la base de datos
    // Esto asegura que siempre tengamos todos los campos necesarios (advance_type, advance_amount, etc.)
    const condicionId = condiciones?.id;
    
    if (condicionId) {
      const condicionCompleta = await prisma.studio_condiciones_comerciales.findUnique({
        where: { id: condicionId },
        select: {
          id: true,
          name: true,
          description: true,
          discount_percentage: true,
          advance_percentage: true,
          advance_type: true,
          advance_amount: true,
        },
      });
      if (condicionCompleta) {
        condiciones = {
          ...condicionCompleta,
          discount_percentage: condicionCompleta.discount_percentage ? Number(condicionCompleta.discount_percentage) : null,
          advance_percentage: condicionCompleta.advance_percentage ? Number(condicionCompleta.advance_percentage) : null,
          advance_amount: condicionCompleta.advance_amount ? Number(condicionCompleta.advance_amount) : null,
        };
      }
    }

    // Verificar si hay precio negociado (modo negociaci?n)
    const precioNegociado = cotizacion.negociacion_precio_personalizado 
      ? Number(cotizacion.negociacion_precio_personalizado) 
      : null;
    const precioOriginalNegociacion = cotizacion.negociacion_precio_original 
      ? Number(cotizacion.negociacion_precio_original) 
      : null;
    const esNegociacion = precioNegociado !== null && precioNegociado > 0;

    // Calcular anticipo si hay condiciones
    let montoAnticipo: number | undefined;
    let totalFinal = precioBase;
    let descuentoAplicado = descuentoExistente;
    let precioOriginalParaContrato = precioBaseReal;
    let ahorroTotal: number | undefined;

    if (esNegociacion && precioNegociado !== null) {
      // MODO NEGOCIACI?N: usar precio negociado como total final
      totalFinal = precioNegociado;
      precioOriginalParaContrato = precioOriginalNegociacion ?? precioBaseReal;
      ahorroTotal = precioOriginalParaContrato - precioNegociado;
      descuentoAplicado = 0; // No mostrar descuento en modo negociaci?n
    } else if (condiciones) {
      // MODO NORMAL: calcular descuento si hay porcentaje de descuento en condiciones comerciales
      if (condiciones.discount_percentage) {
        // El descuento se calcula sobre el precio base real (antes de cualquier descuento)
        descuentoAplicado = (precioBaseReal * condiciones.discount_percentage) / 100;
        totalFinal = precioBaseReal - descuentoAplicado;
      } else if (descuentoExistente > 0) {
        // Si ya hay descuento calculado desde la cotizaci?n, usarlo
        totalFinal = precioBase;
        descuentoAplicado = descuentoExistente;
      } else {
        // Sin descuento, el total final es el precio base
        totalFinal = precioBase;
        descuentoAplicado = 0;
      }
    }

    // Calcular anticipo basado en totalFinal (ya sea negociado o normal)
    // Herencia contractual: si el registro de cierre tiene pago_monto (ajuste manual), usarlo como monto_anticipo
    const registroCierre = cotizacion.cotizacion_cierre as { pago_monto?: unknown } | null;
    if (registroCierre?.pago_monto != null && Number(registroCierre.pago_monto) > 0) {
      montoAnticipo = Number(registroCierre.pago_monto);
    } else if (condiciones) {
      if (condiciones.advance_type === "percentage" && condiciones.advance_percentage) {
        montoAnticipo = (totalFinal * condiciones.advance_percentage) / 100;
      } else if (condiciones.advance_type === "fixed_amount" && condiciones.advance_amount) {
        montoAnticipo = condiciones.advance_amount;
      }
    }
    
    // ✅ OPTIMIZACIÓN: Aplicar precio charm si es paquete (después de calcular anticipo)
    let totalFinalParaContrato = totalFinal;
    if (esPaquete) {
      totalFinalParaContrato = roundPrice(totalFinal, 'charm');
      // Recalcular anticipo si es porcentaje (para mantener proporción con el nuevo total)
      if (condiciones && condiciones.advance_type === "percentage" && condiciones.advance_percentage) {
        montoAnticipo = (totalFinalParaContrato * condiciones.advance_percentage) / 100;
      }
    }

    // Fase 10.3: Desglose alineado con Resumen de Cierre (precio_calculado, monto_cortesias, bono_especial, ajuste_cierre).
    const precioCalculadoNum = cotizacion.precio_calculado != null ? Number(cotizacion.precio_calculado) : null;
    const bonoEspecialNum = cotizacion.bono_especial != null ? Number(cotizacion.bono_especial) : 0;
    const precioListaContrato = precioCalculadoNum != null && precioCalculadoNum > 0 ? precioCalculadoNum : precioBaseReal;
    const itemsCortesiaArr = Array.isArray((cotizacion as { items_cortesia?: unknown }).items_cortesia)
      ? ((cotizacion as { items_cortesia: string[] }).items_cortesia)
      : [];
    const itemsCortesiaIds = new Set(itemsCortesiaArr);
    const montoCortesiasContrato = cotizacion.cotizacion_items
      .filter((it: { id?: string; item_id?: string | null; is_courtesy?: boolean }) => {
        const esCortesia = it.is_courtesy === true || (it.id && itemsCortesiaIds.has(it.id)) || (it.item_id && itemsCortesiaIds.has(it.item_id));
        return esCortesia;
      })
      .reduce((sum: number, it: { subtotal?: number; unit_price?: number; quantity?: number }) => {
        const subtotal = Number(it.subtotal ?? 0);
        const fallback = (Number(it.unit_price ?? 0) * (it.quantity ?? 1));
        return sum + (subtotal > 0 ? subtotal : fallback);
      }, 0);
    const precioFinalCierreContrato = Number(cotizacion.price);
    const ajusteCierreContrato = precioFinalCierreContrato - Math.max(0, precioListaContrato - montoCortesiasContrato - bonoEspecialNum);
    const tieneConcesionesContrato = precioListaContrato > 0 && (montoCortesiasContrato > 0 || bonoEspecialNum > 0 || Math.abs(ajusteCierreContrato) >= 0.01);
    // Congruencia: el total impreso en el contrato debe ser EXACTAMENTE el precio de cierre autorizado.
    totalFinalParaContrato = precioFinalCierreContrato;
    if (condiciones && totalFinalParaContrato !== totalFinal) {
      if (condiciones.advance_type === "percentage" && condiciones.advance_percentage) {
        montoAnticipo = (totalFinalParaContrato * condiciones.advance_percentage) / 100;
      }
      // fixed_amount se mantiene
    }

    // Convertir secciones a formato legacy para [SERVICIOS_INCLUIDOS]
    const serviciosLegacy: any[] = [];
    secciones.forEach(seccion => {
      seccion.categorias.forEach(categoria => {
        serviciosLegacy.push({
          categoria: categoria.nombre,
          servicios: categoria.items.map(item => {
            const itemId = item.item_id || (item as any)['item_id'];
            const itemOriginal = cotizacion.cotizacion_items.find(
              (ci: { id?: string; item_id?: string | null }) =>
                (item.id && ci.id === item.id) || (itemId && ci.item_id === itemId)
            );
            const esCortesia = (itemOriginal as { is_courtesy?: boolean } | undefined)?.is_courtesy === true;
            const billingType = itemId ? (billingTypeMap.get(itemId) || 'SERVICE') : 'SERVICE';
            const cantidadBase = item.cantidad;
            let cantidadEfectiva = cantidadBase;
            if (billingType === 'HOUR' && eventDuration && eventDuration > 0) {
              cantidadEfectiva = calcularCantidadEfectiva(billingType, cantidadBase, eventDuration);
            }
            const servicio: any = {
              nombre: item.nombre,
              descripcion: item.descripcion,
              precio: esCortesia ? 0 : item.subtotal,
              cantidad: cantidadBase,
              cantidadEfectiva: cantidadEfectiva,
              billing_type: billingType,
              is_courtesy: esCortesia,
            };
            if (billingType === 'HOUR' && eventDuration && eventDuration > 0) {
              servicio.horas = eventDuration;
            }
            return servicio;
          }),
        });
      });
    });

    // Fecha de firma del cliente (la que se muestra en el contrato como "firmado el día X").
    // Usar día calendario en timezone del estudio para coincidir con la tarjeta del estudio (ej. jueves 29, 22:50).
    const studioTz = studio.timezone ?? 'America/Mexico_City';
    let fechaFirmaCliente: string | undefined;
    const todayUtc = (() => {
      const n = new Date();
      return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate(), 12, 0, 0));
    })();

    if (cotizacion.selected_by_prospect) {
      if (cotizacion.cotizacion_cierre?.contract_signed_at) {
        const signedAt = cotizacion.cotizacion_cierre.contract_signed_at;
        const dayInTz = getDateOnlyInTimezone(signedAt, studioTz);
        const normalized = dayInTz ?? toUtcDateOnly(signedAt);
        fechaFirmaCliente = normalized ? formatDisplayDateLong(normalized) : formatDisplayDateLong(todayUtc);
      } else {
        fechaFirmaCliente = formatDisplayDateLong(todayUtc);
      }
    } else {
      fechaFirmaCliente = formatDisplayDateLong(todayUtc);
    }

    // Obtener informaci?n bancaria del estudio
    let banco: string | undefined;
    let titular: string | undefined;
    let clabe: string | undefined;
    try {
      const bankInfoResult = await obtenerInfoBancariaTransferencia(studio.id);
      if (bankInfoResult.success && bankInfoResult.data) {
        banco = bankInfoResult.data.banco;
        titular = bankInfoResult.data.titular;
        clabe = bankInfoResult.data.clabe;
      }
    } catch (error) {
      console.error('[getPromiseContractData] Error obteniendo informaci?n bancaria:', error);
      // Continuar sin informaci?n bancaria si hay error
    }

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
      fecha_firma_cliente: fechaFirmaCliente,
      servicios_incluidos: serviciosLegacy, // Formato legacy para [SERVICIOS_INCLUIDOS]
      total_contrato: `$${totalFinalParaContrato.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`,
      condiciones_pago: condiciones?.description || "Por definir",
      banco,
      titular,
      clabe,
      subtotal: precioBaseReal,
      descuento: descuentoAplicado,
      total: totalFinalParaContrato,
      cotizacionData: {
        secciones: secciones.map(seccion => ({
          ...seccion,
          categorias: seccion.categorias.map(categoria => ({
            ...categoria,
            items: categoria.items.map(item => {
              const itemId = item.item_id || (item as any)['item_id'];
              
              // Buscar el item original en cotizacion_items
              const itemOriginal = cotizacion.cotizacion_items.find(
                ci => {
                  if (item.id && ci.id === item.id) return true;
                  if (itemId && ci.item_id === itemId) return true;
                  return false;
                }
              );
              
              // Obtener billing_type del mapa (ya incluye fallback basado en utility_type)
              const billingTypeFinal = itemId ? (billingTypeMap.get(itemId) || 'SERVICE') : 'SERVICE';
              const esHOUR = billingTypeFinal === 'HOUR';
              
              // ✅ CORRECCIÓN: Calcular cantidad base
              // Si es HOUR y hay eventDuration, verificar si quantity está guardado como efectiva
              let cantidadBase = itemOriginal?.quantity ?? item.cantidad;
              
              if (esHOUR && eventDuration && eventDuration > 0) {
                // Si cantidadBase es igual a eventDuration, probablemente está guardado como efectiva
                // Calcular cantidad base dividiendo por horas
                if (cantidadBase === eventDuration || cantidadBase > eventDuration) {
                  // Si es múltiplo exacto, dividir; sino usar 1 como base
                  cantidadBase = cantidadBase % eventDuration === 0 
                    ? cantidadBase / eventDuration 
                    : 1;
                }
              }
              
              // Calcular cantidad efectiva para items tipo HOUR
              let cantidadEfectiva = cantidadBase;
              if (esHOUR && eventDuration && eventDuration > 0) {
                cantidadEfectiva = calcularCantidadEfectiva(
                  billingTypeFinal,
                  cantidadBase,
                  eventDuration
                );
              }
              
              const esCortesia = (itemOriginal as { is_courtesy?: boolean } | undefined)?.is_courtesy === true;
              const itemData: any = {
                nombre: item.nombre,
                descripcion: item.descripcion,
                cantidad: cantidadBase,
                cantidadEfectiva: cantidadEfectiva,
                subtotal: esCortesia ? 0 : item.subtotal, // Fase 10.3: cortesía se muestra $0.00
                billing_type: billingTypeFinal,
                is_courtesy: esCortesia,
              };
              if (esHOUR && eventDuration && eventDuration > 0) {
                itemData.horas = eventDuration;
              }
              return itemData;
            }),
          })),
        })),
        total: totalFinalParaContrato,
      },
      condicionesData: (condiciones ? {
        nombre: condiciones.name,
        descripcion: condiciones.description || undefined,
        porcentaje_descuento: condiciones.discount_percentage || undefined,
        porcentaje_anticipo: condiciones.advance_percentage || undefined,
        tipo_anticipo: (condiciones.advance_type as "percentage" | "fixed_amount") || undefined,
        monto_anticipo: montoAnticipo,
        total_contrato: esNegociacion ? precioOriginalParaContrato : precioBaseReal,
        total_final: totalFinalParaContrato,
        descuento_aplicado: descuentoAplicado,
        es_negociacion: esNegociacion,
        precio_negociado: precioNegociado ?? undefined,
        precio_original: esNegociacion ? precioOriginalParaContrato : undefined,
        ahorro_total: ahorroTotal,
        tiene_concesiones: tieneConcesionesContrato,
        precio_lista: precioListaContrato,
        monto_cortesias: montoCortesiasContrato,
        monto_bono: bonoEspecialNum,
        ajuste_cierre: ajusteCierreContrato,
      } : {
        nombre: "Resumen de pago",
        total_final: totalFinalParaContrato,
        tiene_concesiones: tieneConcesionesContrato,
        precio_lista: precioListaContrato,
        monto_cortesias: montoCortesiasContrato,
        monto_bono: bonoEspecialNum,
        ajuste_cierre: ajusteCierreContrato,
      }) as CondicionesComercialesData,
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
        timezone: true,
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
            negociacion_precio_original: true,
            negociacion_precio_personalizado: true,
            // Snapshots inmutables (prioridad cuando existen)
            condiciones_comerciales_name_snapshot: true,
            condiciones_comerciales_description_snapshot: true,
            condiciones_comerciales_advance_percentage_snapshot: true,
            condiciones_comerciales_advance_type_snapshot: true,
            condiciones_comerciales_advance_amount_snapshot: true,
            condiciones_comerciales_discount_percentage_snapshot: true,
            // Relación catálogo + negociación (mismo fallback que getPromiseContractData)
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
            condicion_comercial_negociacion: {
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

    // Buscar cotizaci?n aprobada del evento (puede estar en la relaci?n directa o por evento_id)
    let cotizacionAprobada = event.cotizacion;

    // Si no hay en la relaci?n directa, buscar por evento_id
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
            negociacion_precio_original: true,
            negociacion_precio_personalizado: true,
            condiciones_comerciales_name_snapshot: true,
            condiciones_comerciales_description_snapshot: true,
            condiciones_comerciales_advance_percentage_snapshot: true,
            condiciones_comerciales_advance_type_snapshot: true,
            condiciones_comerciales_advance_amount_snapshot: true,
            condiciones_comerciales_discount_percentage_snapshot: true,
            event_duration: true,
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
            condicion_comercial_negociacion: {
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
              select: {
                ...COTIZACION_ITEMS_SELECT_STANDARD,
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
          created_at: 'desc', // Tomar la m?s reciente si hay m?ltiples
        },
      });

      cotizacionAprobada = cotizacionPorEvento;
    }

    if (!cotizacionAprobada) {
      return { success: false, error: "El evento no tiene una cotizaci?n autorizada" };
    }

    // Obtener horas de cobertura (prioridad: cotizacion.event_duration > promise.duration_hours)
    const eventDuration = cotizacionAprobada.event_duration ?? event.promise?.duration_hours ?? null;
    
    // Crear mapa de item_id -> billing_type desde items originales
    const billingTypeMap = new Map<string, 'HOUR' | 'SERVICE' | 'UNIT'>();
    cotizacionAprobada.cotizacion_items.forEach(item => {
      if (item.item_id && item.billing_type) {
        billingTypeMap.set(item.item_id, item.billing_type as 'HOUR' | 'SERVICE' | 'UNIT');
      }
    });

    // Construir cotizacionData (paridad con getPromiseContractData) para bloques @cotizacion_autorizada y @condiciones_comerciales
    const itemsParaEstructura = cotizacionAprobada.cotizacion_items.map((ci) => ({
      quantity: ci.quantity,
      subtotal: Number(ci.subtotal || 0),
      name_snapshot: (ci as { name_snapshot?: string | null }).name_snapshot ?? null,
      name: (ci as { name?: string | null }).name ?? (ci as { items?: { name?: string } }).items?.name ?? null,
      description_snapshot: (ci as { description_snapshot?: string | null }).description_snapshot ?? null,
      description: (ci as { description?: string | null }).description ?? (ci as { items?: { description?: string } }).items?.description ?? null,
      seccion_name_snapshot: (ci as { seccion_name_snapshot?: string | null }).seccion_name_snapshot ?? null,
      seccion_name: (ci as { seccion_name?: string | null }).seccion_name ?? null,
      category_name_snapshot: (ci as { category_name_snapshot?: string | null }).category_name_snapshot ?? (ci as { service_categories?: { name?: string } }).service_categories?.name ?? null,
      category_name: (ci as { category_name?: string | null }).category_name ?? (ci as { service_categories?: { name?: string } }).service_categories?.name ?? null,
      item_id: ci.item_id ?? null,
      order: (ci as { order?: number | null }).order ?? null,
      billing_type: (ci as { billing_type?: string | null }).billing_type ?? null,
    }));
    const estructuraEvent = construirEstructuraJerarquicaCotizacion(itemsParaEstructura, {
      incluirDescripciones: true,
      ordenarPor: "incremental",
    });
    const cotizacionData: CotizacionRenderData = {
      secciones: estructuraEvent.secciones.map((seccion) => ({
        nombre: seccion.nombre,
        orden: seccion.orden,
        categorias: seccion.categorias.map((categoria) => ({
          nombre: categoria.nombre,
          orden: categoria.orden,
          items: categoria.items.map((item) => {
            const itemId = (item as { item_id?: string | null }).item_id ?? null;
            const billingType = itemId ? (billingTypeMap.get(itemId) || "SERVICE") : "SERVICE";
            const cantidadBase = item.cantidad;
            let cantidadEfectiva = cantidadBase;
            if (billingType === "HOUR" && eventDuration && eventDuration > 0) {
              cantidadEfectiva = calcularCantidadEfectiva(billingType, cantidadBase, eventDuration);
            }
            const out: CotizacionRenderData["secciones"][0]["categorias"][0]["items"][0] = {
              nombre: item.nombre,
              descripcion: item.descripcion,
              cantidad: cantidadBase,
              subtotal: item.subtotal,
              billing_type: billingType,
              cantidadEfectiva,
            };
            if (billingType === "HOUR" && eventDuration && eventDuration > 0) {
              out.horas = eventDuration;
            }
            return out;
          }),
        })),
      })),
      total: estructuraEvent.total,
    };

    // Formatear fecha (SSoT: solo UTC, sin lógica local)
    const eventDate = event.promise?.event_date || event.event_date;
    const fechaEvento = eventDate
      ? formatDisplayDateLong(toUtcDateOnly(eventDate))
      : "Fecha por definir";

    // Ordenar items por categor?a (usando snapshots o relaciones)
    const itemsOrdenados = cotizacionAprobada.cotizacion_items
      .map((item) => {
        // Obtener nombre de categor?a desde snapshot o relaci?n
        const categoryName = item.category_name_snapshot ||
          item.items?.service_categories?.name ||
          item.service_categories?.name ||
          "Sin categor?a";

        // Obtener orden de categor?a para ordenar
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
        // Primero por orden de categor?a
        if (a.categoryOrder !== b.categoryOrder) {
          return a.categoryOrder - b.categoryOrder;
        }
        // Luego por nombre de categor?a
        return a.categoryName.localeCompare(b.categoryName);
      });

    // Agrupar servicios por categor?a
    const serviciosPorCategoria = itemsOrdenados.reduce(
      (acc, { item, categoryName }) => {
        if (!acc[categoryName]) {
          acc[categoryName] = [];
        }

        // Calcular precio: usar subtotal si est? disponible, sino calcular desde unit_price
        const precioUnitario = Number(item.unit_price_snapshot || item.unit_price || 0);
        const subtotal = Number(item.subtotal || 0);
        const precio = subtotal > 0 ? subtotal : precioUnitario * item.quantity;

        const servicio: any = {
          nombre: item.name_snapshot || item.name || "Servicio sin nombre",
          descripcion: item.description_snapshot || item.description || undefined,
          precio: precio,
        };
        
        // Si el item tiene billing_type HOUR y hay horas de cobertura, agregar multiplicador
        if (item.item_id) {
          const billingType = billingTypeMap.get(item.item_id);
          if (billingType === 'HOUR' && eventDuration && eventDuration > 0) {
            servicio.horas = eventDuration;
          }
        }

        acc[categoryName].push(servicio);

        return acc;
      },
      {} as Record<string, Array<{ nombre: string; descripcion?: string; precio: number; cantidad?: number; cantidadEfectiva?: number; billing_type?: 'HOUR' | 'SERVICE' | 'UNIT'; horas?: number }>>
    );

    const serviciosIncluidos: ServiceCategory[] = Object.entries(serviciosPorCategoria).map(
      ([categoria, servicios]) => ({
        categoria,
        servicios,
      })
    );

    // Verificar si hay precio negociado (modo negociaci?n)
    const precioNegociado = cotizacionAprobada.negociacion_precio_personalizado 
      ? Number(cotizacionAprobada.negociacion_precio_personalizado) 
      : null;
    const precioOriginalNegociacion = cotizacionAprobada.negociacion_precio_original 
      ? Number(cotizacionAprobada.negociacion_precio_original) 
      : null;
    const esNegociacion = precioNegociado !== null && precioNegociado > 0;

    // Calcular total
    const precioBase = Number(cotizacionAprobada.price);
    const descuentoExistente = cotizacionAprobada.discount ? Number(cotizacionAprobada.discount) : 0;
    const precioBaseReal = descuentoExistente > 0 ? precioBase + descuentoExistente : precioBase;
    
    // Fallback condiciones: snapshots → condicion_comercial_negociacion → condiciones_comerciales (catálogo)
    const tieneSnapshots = !!cotizacionAprobada.condiciones_comerciales_name_snapshot;
    type CondicionRow = { name: string; description?: string | null; discount_percentage?: unknown; advance_percentage?: unknown; advance_type?: string | null; advance_amount?: unknown };
    const cot = cotizacionAprobada as typeof cotizacionAprobada & { condicion_comercial_negociacion?: CondicionRow | null };
    let condiciones: CondicionRow | null = tieneSnapshots
      ? {
          name: cotizacionAprobada.condiciones_comerciales_name_snapshot || '',
          description: cotizacionAprobada.condiciones_comerciales_description_snapshot,
          discount_percentage: cotizacionAprobada.condiciones_comerciales_discount_percentage_snapshot,
          advance_percentage: cotizacionAprobada.condiciones_comerciales_advance_percentage_snapshot,
          advance_type: cotizacionAprobada.condiciones_comerciales_advance_type_snapshot,
          advance_amount:
            cotizacionAprobada.condiciones_comerciales_advance_amount_snapshot != null
              ? Number(cotizacionAprobada.condiciones_comerciales_advance_amount_snapshot)
              : null,
        }
      : null;
    if (!condiciones && cot.condicion_comercial_negociacion) condiciones = cot.condicion_comercial_negociacion;
    if (!condiciones && cotizacionAprobada.condiciones_comerciales) condiciones = cotizacionAprobada.condiciones_comerciales;
    
    // Calcular total final y descuento seg?n modo
    let totalFinal: number;
    let descuentoAplicado: number;
    let precioOriginalParaContrato: number;
    let ahorroTotal: number | undefined;

    if (esNegociacion && precioNegociado !== null) {
      // MODO NEGOCIACI?N: usar precio negociado como total final
      totalFinal = precioNegociado;
      precioOriginalParaContrato = precioOriginalNegociacion ?? precioBaseReal;
      ahorroTotal = precioOriginalParaContrato - precioNegociado;
      descuentoAplicado = 0; // No mostrar descuento en modo negociaci?n
    } else if (condiciones) {
      // MODO NORMAL: calcular descuento si hay porcentaje de descuento en condiciones comerciales
      if (condiciones.discount_percentage) {
        descuentoAplicado = (precioBaseReal * Number(condiciones.discount_percentage)) / 100;
        totalFinal = precioBaseReal - descuentoAplicado;
      } else if (descuentoExistente > 0) {
        descuentoAplicado = descuentoExistente;
        totalFinal = precioBase;
      } else {
        totalFinal = precioBase;
        descuentoAplicado = 0;
      }
      precioOriginalParaContrato = precioBaseReal;
    } else {
      // Sin condiciones comerciales
      totalFinal = precioBase;
      descuentoAplicado = descuentoExistente;
      precioOriginalParaContrato = precioBaseReal;
    }

    // Preparar datos de condiciones comerciales si existen
    let condicionesData: CondicionesComercialesData | undefined;
    if (condiciones) {
      // Calcular monto de anticipo basado en totalFinal (ya sea negociado o normal)
      let montoAnticipoCalculado: number | undefined;
      if (condiciones.advance_percentage && condiciones.advance_type === "percentage") {
        montoAnticipoCalculado = totalFinal * (Number(condiciones.advance_percentage) / 100);
      } else if (condiciones.advance_amount) {
        montoAnticipoCalculado = Number(condiciones.advance_amount);
      }

      condicionesData = {
        nombre: condiciones.name,
        descripcion: condiciones.description || undefined,
        porcentaje_anticipo: condiciones.advance_percentage || undefined,
        tipo_anticipo: (condiciones.advance_type as "percentage" | "fixed_amount") || undefined,
        monto_anticipo: montoAnticipoCalculado,
        porcentaje_descuento: condiciones.discount_percentage || undefined,
        total_contrato: esNegociacion ? precioOriginalParaContrato : precioBaseReal,
        total_final: totalFinal,
        descuento_aplicado: descuentoAplicado,
        // Campos para modo negociaci?n
        es_negociacion: esNegociacion,
        precio_negociado: precioNegociado ?? undefined,
        precio_original: esNegociacion ? precioOriginalParaContrato : undefined,
        ahorro_total: ahorroTotal,
        // TODO: Agregar condiciones_metodo_pago si est?n disponibles en la relaci?n
        condiciones_metodo_pago: undefined,
      };
    }

    // Total final del contrato (después de descuento/negociación) para el bloque de cotización
    cotizacionData.total = totalFinal;

    // Fecha de firma: día calendario en timezone del estudio (coincide con tarjeta del estudio).
    const studioTzEvent = studio.timezone ?? 'America/Mexico_City';
    const todayUtcBuild = (() => {
      const n = new Date();
      return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate(), 12, 0, 0));
    })();
    let fechaFirmaCliente: string | undefined;
    if (cotizacionAprobada.selected_by_prospect) {
      const signedAt = event.contracts?.[0]?.signed_at;
      const dayInTz = signedAt ? getDateOnlyInTimezone(signedAt, studioTzEvent) : null;
      const normalized = dayInTz ?? (signedAt ? toUtcDateOnly(signedAt) : null);
      fechaFirmaCliente = normalized ? formatDisplayDateLong(normalized) : undefined;
    } else {
      fechaFirmaCliente = formatDisplayDateLong(todayUtcBuild);
    }

    // Obtener informaci?n bancaria del estudio
    let banco: string | undefined;
    let titular: string | undefined;
    let clabe: string | undefined;
    try {
      const bankInfoResult = await obtenerInfoBancariaTransferencia(studio.id);
      if (bankInfoResult.success && bankInfoResult.data) {
        banco = bankInfoResult.data.banco;
        titular = bankInfoResult.data.titular;
        clabe = bankInfoResult.data.clabe;
      }
    } catch (error) {
      console.error('[getEventContractData] Error obteniendo informaci?n bancaria:', error);
      // Continuar sin informaci?n bancaria si hay error
    }

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
        condiciones?.description || "No especificadas",
      nombre_studio: studio.studio_name,
      nombre_representante: studio.representative_name || undefined,
      telefono_studio: studio.phone || undefined,
      correo_studio: studio.email,
      direccion_studio: studio.address || undefined,
      fecha_firma_cliente: fechaFirmaCliente,
      servicios_incluidos: serviciosIncluidos,
      banco,
      titular,
      clabe,
      cotizacionData,
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
  condicionesData?: CondicionesComercialesData,
  options?: ContractRendererOptions
): Promise<ActionResponse<string>> {
  try {
    let rendered = content;

    // Variables de cliente (se convertir?n a may?sculas)
    const clienteVars: Record<string, string> = {
      "@nombre_cliente": eventData.nombre_cliente.toUpperCase(),
      "@email_cliente": (eventData.email_cliente || "").toUpperCase(),
      "@telefono_cliente": (eventData.telefono_cliente || "").toUpperCase(),
      "@direccion_cliente": (eventData.direccion_cliente || "").toUpperCase(),
    };

    // Variables de estudio (se convertir?n a may?sculas)
    const studioVars: Record<string, string> = {
      "@nombre_studio": eventData.nombre_studio.toUpperCase(),
      "@nombre_representante": (eventData.nombre_representante || "").toUpperCase(),
      "@telefono_studio": (eventData.telefono_studio || "").toUpperCase(),
      "@correo_studio": (eventData.correo_studio || "").toUpperCase(),
      "@direccion_studio": (eventData.direccion_studio || "").toUpperCase(),
      "@banco": (eventData.banco || "").toUpperCase(),
      "@titular": (eventData.titular || "").toUpperCase(),
      "@clabe": eventData.clabe || "",
    };

    // Variables de negocio/comerciales (sin may?sculas)
    const comercialesVars: Record<string, string> = {
      "@total_contrato": eventData.total_contrato,
      "@condiciones_pago": eventData.condiciones_pago,
    };

    // Variables de evento (sin may?sculas)
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

    // Tambi?n soportar sintaxis {variable} con las mismas conversiones
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
      "{banco}": (eventData.banco || "").toUpperCase(),
      "{titular}": (eventData.titular || "").toUpperCase(),
      "{clabe}": eventData.clabe || "",
    };

    // Reemplazar variables @variable
    Object.entries(variables).forEach(([key, value]) => {
      rendered = rendered.replaceAll(key, value);
    });

    // Reemplazar variables {variable}
    Object.entries(braceVariables).forEach(([key, value]) => {
      rendered = rendered.replaceAll(key, value);
    });

    // Renderizar bloque de condiciones comerciales (options.isForPdf = true para PDF servidor)
    if (condicionesData) {
      const condicionesHtml = renderCondicionesComercialesBlock(condicionesData, options);
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
      let serviciosHtml = renderServiciosBlock(servicios);
      // Agregar divisor antes y despu?s del bloque de servicios
      serviciosHtml = '<div class="mb-6 pb-4 border-b border-zinc-800"></div>' + serviciosHtml + '<div class="mt-6 pt-4 border-t border-zinc-800"></div>';
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
      // ✅ UNIFICADO: Usar formatItemQuantity para renderizado consistente
      const billingType = servicio.billing_type || 'SERVICE';
      const quantity = servicio.cantidad || 1;
      const cantidadEfectiva = servicio.cantidadEfectiva;
      const eventDurationHours = servicio.horas || null;
      
      const formatted = formatItemQuantity({
        quantity,
        billingType,
        eventDurationHours,
        cantidadEfectiva,
      });
      
      let servicioTexto = servicio.nombre;
      if (formatted.displayText) {
        servicioTexto += ` <span class="text-zinc-500">${formatted.displayText}</span>`;
      }
      const esCortesia = (servicio as { is_courtesy?: boolean }).is_courtesy === true;
      if (esCortesia) {
        servicioTexto += ' <span class="text-zinc-500 italic">— $0.00 MXN (Cortesía / Beneficio)</span>';
      }
      html += `<li>${servicioTexto}</li>`;

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
