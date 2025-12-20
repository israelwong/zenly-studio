"use server";

import { prisma } from "@/lib/prisma";
import { obtenerCatalogo } from "@/lib/actions/studio/config/catalogo.actions";
import { obtenerConfiguracionPrecios } from "@/lib/actions/studio/config/configuracion-precios.actions";
import { calcularPrecio } from "@/lib/actions/studio/catalogo/calcular-precio";
import type { PublicSeccionData, PublicCategoriaData, PublicServicioData } from "@/types/public-promise";
import type { SeccionData } from "@/lib/actions/schemas/catalogo-schemas";

/**
 * Obtener condiciones comerciales disponibles para promesa pública
 */
export async function obtenerCondicionesComercialesPublicas(
  studioSlug: string
): Promise<{
  success: boolean;
  data?: Array<{
    id: string;
    name: string;
    description: string | null;
    advance_percentage: number | null;
    advance_type?: string | null;
    advance_amount?: number | null;
    discount_percentage: number | null;
    type?: string;
    metodos_pago: Array<{
      id: string;
      metodo_pago_id: string;
      metodo_pago_name: string;
    }>;
  }>;
  error?: string;
}> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return {
        success: false,
        error: "Studio no encontrado",
      };
    }

    const condiciones = await prisma.studio_condiciones_comerciales.findMany({
      where: {
        studio_id: studio.id,
        status: 'active',
      },
      include: {
        condiciones_comerciales_metodo_pago: {
          include: {
            metodos_pago: {
              select: {
                id: true,
                payment_method_name: true,
              },
            },
          },
        },
      },
      orderBy: [
        { type: 'asc' }, // Primero 'standard', luego 'offer'
        { order: 'asc' }, // Luego por orden dentro de cada tipo
      ],
    });

    // Mapear todas las condiciones activas (mostrar incluso si no tienen métodos de pago)
    // Ordenar: primero standard, luego offer
    const condicionesOrdenadas = [...condiciones].sort((a, b) => {
      // Si ambos son del mismo tipo, ordenar por order
      if (a.type === b.type) {
        return (a.order || 0) - (b.order || 0);
      }
      // Standard primero (type === 'standard' viene antes que 'offer')
      if (a.type === 'standard') return -1;
      if (b.type === 'standard') return 1;
      return 0;
    });

    const condicionesMapeadas = condicionesOrdenadas.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      advance_percentage: c.advance_percentage,
      advance_type: c.advance_type,
      advance_amount: c.advance_amount,
      discount_percentage: c.discount_percentage,
      type: c.type,
      metodos_pago: c.condiciones_comerciales_metodo_pago.map((mp) => ({
        id: mp.id,
        metodo_pago_id: mp.metodo_pago_id,
        metodo_pago_name: mp.metodos_pago.payment_method_name,
      })),
    }));

    return {
      success: true,
      data: condicionesMapeadas,
    };
  } catch (error) {
    console.error("Error al obtener condiciones comerciales públicas:", error);
    return {
      success: false,
      error: "Error al obtener condiciones comerciales",
    };
  }
}

/**
 * Filtrar condiciones comerciales según preferencias de tipo
 */
export async function filtrarCondicionesPorPreferencias(
  studioSlug: string,
  condiciones: Array<{
    id: string;
    name: string;
    description: string | null;
    advance_percentage: number | null;
    advance_type?: string | null;
    advance_amount?: number | null;
    discount_percentage: number | null;
    type?: string;
    metodos_pago: Array<{
      id: string;
      metodo_pago_id: string;
      metodo_pago_name: string;
    }>;
  }>,
  showStandard: boolean,
  showOffer: boolean
): Promise<Array<{
  id: string;
  name: string;
  description: string | null;
  advance_percentage: number | null;
  advance_type?: string | null;
  advance_amount?: number | null;
  discount_percentage: number | null;
  type?: string;
  metodos_pago: Array<{
    id: string;
    metodo_pago_id: string;
    metodo_pago_name: string;
  }>;
}>> {
  if (condiciones.length === 0) return [];

  // Si las condiciones ya tienen el tipo, filtrar directamente
  // Si no tienen tipo, obtenerlo desde la base de datos
  const condicionesSinTipo = condiciones.filter(c => !c.type);

  if (condicionesSinTipo.length > 0) {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (studio) {
      const condicionesConTipo = await prisma.studio_condiciones_comerciales.findMany({
        where: {
          studio_id: studio.id,
          status: 'active',
          id: { in: condicionesSinTipo.map(c => c.id) },
        },
        select: {
          id: true,
          type: true,
        },
      });

      const tipoMap = new Map(condicionesConTipo.map(c => [c.id, c.type]));

      // Agregar tipo a las condiciones que no lo tienen
      condiciones.forEach(condicion => {
        if (!condicion.type) {
          condicion.type = tipoMap.get(condicion.id) || 'standard';
        }
      });
    }
  }

  return condiciones.filter((condicion) => {
    const tipo = condicion.type || 'standard';
    if (tipo === 'standard') {
      return showStandard;
    } else if (tipo === 'offer') {
      return showOffer;
    }
    return false;
  });
}

/**
 * Obtener términos y condiciones activos para promesa pública
 */
export async function obtenerTerminosCondicionesPublicos(
  studioSlug: string
): Promise<{
  success: boolean;
  data?: Array<{
    id: string;
    title: string;
    content: string;
    is_required: boolean;
  }>;
  error?: string;
}> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return {
        success: false,
        error: "Studio no encontrado",
      };
    }

    const terminos = await prisma.studio_terminos_condiciones.findMany({
      where: {
        studio_id: studio.id,
        is_active: true,
      },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        title: true,
        content: true,
        is_required: true,
      },
    });

    return {
      success: true,
      data: terminos,
    };
  } catch (error) {
    console.error("Error al obtener términos y condiciones públicos:", error);
    return {
      success: false,
      error: "Error al obtener términos y condiciones",
    };
  }
}

// Tipos para cotizaciones públicas
interface PublicCotizacion {
  id: string;
  name: string;
  description: string | null;
  price: number;
  discount: number | null;
  servicios: PublicSeccionData[];
  condiciones_comerciales: {
    metodo_pago: string | null;
    condiciones: string | null;
  } | null;
  paquete_origen: {
    id: string;
    name: string;
  } | null;
}

// Tipos para paquetes públicos
interface PublicPaquete {
  id: string;
  name: string;
  description: string | null;
  price: number;
  cover_url: string | null;
  recomendado: boolean;
  servicios: PublicSeccionData[];
  tiempo_minimo_contratacion: number | null;
}

/**
 * Filtrar catálogo para mostrar solo servicios incluidos en cotización/paquete
 * Igual que ResumenCotizacionAutorizada y CotizacionForm
 */
function filtrarCatalogoPorItems(
  catalogo: SeccionData[],
  itemIds: Set<string>,
  itemsData: Map<string, { price?: number; quantity?: number; description?: string | null }>
): PublicSeccionData[] {
  return catalogo
    .map((seccion) => ({
      id: seccion.id,
      nombre: seccion.nombre,
      orden: seccion.orden,
      categorias: seccion.categorias
        .map((categoria) => ({
          id: categoria.id,
          nombre: categoria.nombre,
          orden: categoria.orden,
          servicios: categoria.servicios
            .filter((servicio) => itemIds.has(servicio.id))
            .map((servicio) => {
              const itemData = itemsData.get(servicio.id);
              return {
                id: servicio.id,
                name: servicio.nombre,
                description: itemData?.description ?? null,
                // Para cotizaciones: incluir price y quantity
                // Para paquetes: incluir quantity si está disponible
                ...(itemData?.price !== undefined && itemData?.quantity !== undefined
                  ? {
                    price: itemData.price,
                    quantity: itemData.quantity,
                  }
                  : itemData?.quantity !== undefined
                    ? {
                      quantity: itemData.quantity,
                    }
                    : {}),
              };
            }),
        }))
        .filter((categoria) => categoria.servicios.length > 0),
    }))
    .filter((seccion) => seccion.categorias.length > 0);
}

/**
 * Obtener datos completos de promesa para página pública
 * Incluye cotizaciones y paquetes disponibles según tipo de evento
 */
export async function getPublicPromiseData(
  studioSlug: string,
  promiseId: string
): Promise<{
  success: boolean;
  data?: {
    promise: {
      id: string;
      contact_name: string;
      contact_phone: string;
      contact_email: string | null;
      event_type_id: string | null;
      event_type_name: string | null;
      event_date: Date | null;
      event_location: string | null;
    };
    studio: {
      studio_name: string;
      slogan: string | null;
      logo_url: string | null;
      id: string;
      promise_share_default_show_packages: boolean;
      promise_share_default_show_categories_subtotals: boolean;
      promise_share_default_show_items_prices: boolean;
      promise_share_default_min_days_to_hire: number;
      promise_share_default_show_standard_conditions: boolean;
      promise_share_default_show_offer_conditions: boolean;
      promise_share_default_portafolios: boolean;
    };
    cotizaciones: PublicCotizacion[];
    paquetes: PublicPaquete[];
    condiciones_comerciales?: Array<{
      id: string;
      name: string;
      description: string | null;
      advance_percentage: number | null;
      advance_type?: string | null;
      advance_amount?: number | null;
      discount_percentage: number | null;
      type?: string;
      metodos_pago: Array<{
        id: string;
        metodo_pago_id: string;
        metodo_pago_name: string;
      }>;
    }>;
    terminos_condiciones?: Array<{
      id: string;
      title: string;
      content: string;
      is_required: boolean;
    }>;
    share_settings: {
      show_packages: boolean;
      show_categories_subtotals: boolean;
      show_items_prices: boolean;
      min_days_to_hire: number;
      show_standard_conditions: boolean;
      show_offer_conditions: boolean;
      portafolios: boolean;
    };
    portafolios?: Array<{
      id: string;
      title: string;
      slug: string;
      description: string | null;
      cover_image_url: string | null;
      event_type?: {
        id: string;
        name: string;
      } | null;
    }>;
  };
  error?: string;
}> {
  try {
    // 1. Validar que el studio existe
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: {
        id: true,
        studio_name: true,
        slogan: true,
        logo_url: true,
        promise_share_default_show_packages: true,
        promise_share_default_show_categories_subtotals: true,
        promise_share_default_show_items_prices: true,
        promise_share_default_min_days_to_hire: true,
        promise_share_default_show_standard_conditions: true,
        promise_share_default_show_offer_conditions: true,
        promise_share_default_portafolios: true,
      },
    });

    if (!studio) {
      return {
        success: false,
        error: "Studio no encontrado",
      };
    }

    // 2. Obtener la promesa con sus cotizaciones y preferencias de compartir
    const promise = await prisma.studio_promises.findFirst({
      where: {
        id: promiseId,
        studio_id: studio.id,
      },
      select: {
        id: true,
        event_type_id: true,
        event_date: true,
        event_location: true,
        share_show_packages: true,
        share_show_categories_subtotals: true,
        share_show_items_prices: true,
        share_min_days_to_hire: true,
        share_show_standard_conditions: true,
        share_show_offer_conditions: true,
        contact: {
          select: {
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
        quotes: {
          where: {
            visible_to_client: true,
            archived: false,
          },
          include: {
            cotizacion_items: {
              select: {
                id: true,
                item_id: true,
                name: true,
                description: true,
                unit_price: true,
                quantity: true,
                subtotal: true,
                status: true,
              },
              orderBy: {
                order: 'asc',
              },
            },
            condiciones_comerciales: {
              select: {
                name: true,
                description: true,
                advance_percentage: true,
                discount_percentage: true,
              },
            },
            condiciones_comerciales_metodo_pago: {
              select: {
                metodos_pago: {
                  select: {
                    payment_method_name: true,
                  },
                },
              },
            },
            paquete: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    if (!promise) {
      return {
        success: false,
        error: "Promesa no encontrada o no tienes acceso a esta información",
      };
    }

    // Validar que la promesa tenga al menos cotizaciones o paquetes disponibles
    // Esto se verifica después de obtener las cotizaciones y paquetes

    // Obtener preferencias de compartir (combinar defaults del studio con overrides de la promesa)
    const shareSettings = {
      show_packages: promise.share_show_packages ?? studio.promise_share_default_show_packages,
      show_categories_subtotals: promise.share_show_categories_subtotals ?? studio.promise_share_default_show_categories_subtotals,
      show_items_prices: promise.share_show_items_prices ?? studio.promise_share_default_show_items_prices,
      min_days_to_hire: promise.share_min_days_to_hire ?? studio.promise_share_default_min_days_to_hire,
      show_standard_conditions: promise.share_show_standard_conditions ?? studio.promise_share_default_show_standard_conditions,
      show_offer_conditions: promise.share_show_offer_conditions ?? studio.promise_share_default_show_offer_conditions,
      portafolios: promise.share_portafolios ?? studio.promise_share_default_portafolios,
    };

    // 3. Obtener catálogo completo (incluir items inactivos para que coincidan con paquetes)
    const catalogoResult = await obtenerCatalogo(studioSlug, false); // false = incluir todos los items (activos e inactivos)
    if (!catalogoResult.success || !catalogoResult.data) {
      return {
        success: false,
        error: "Error al obtener catálogo",
      };
    }
    const catalogo = catalogoResult.data;

    // 4. Obtener configuración de precios para calcular precios del catálogo
    const configForm = await obtenerConfiguracionPrecios(studioSlug);
    const configPrecios = configForm ? {
      utilidad_servicio: parseFloat(configForm.utilidad_servicio || '0.30') / 100,
      utilidad_producto: parseFloat(configForm.utilidad_producto || '0.20') / 100,
      comision_venta: parseFloat(configForm.comision_venta || '0.10') / 100,
      sobreprecio: parseFloat(configForm.sobreprecio || '0.05') / 100,
    } : null;

    // 5. Obtener paquetes disponibles para el tipo de evento (solo si show_packages está habilitado)
    const paquetes = (shareSettings.show_packages && promise.event_type_id)
      ? await prisma.studio_paquetes.findMany({
        where: {
          studio_id: studio.id,
          event_type_id: promise.event_type_id,
          status: 'active',
        },
        select: {
          id: true,
          name: true,
          description: true,
          precio: true,
          cover_url: true,
          is_featured: true,
          paquete_items: {
            select: {
              id: true,
              item_id: true,
              quantity: true,
              precio_personalizado: true,
              status: true,
              visible_to_client: true,
              items: {
                select: {
                  id: true,
                  name: true,
                  cost: true,
                  expense: true,
                  utility_type: true,
                },
              },
            },
            orderBy: {
              order: 'asc',
            },
          },
        },
        orderBy: {
          precio: 'asc',
        },
      })
      : [];

    // 5. Mapear cotizaciones con estructura jerárquica (igual que ResumenCotizacionAutorizada)
    const mappedCotizaciones: PublicCotizacion[] = promise.quotes.map((cot) => {
      // Crear Set de item_ids incluidos en la cotización
      const itemIds = new Set<string>();
      const itemsData = new Map<string, { price: number; quantity: number; description: string | null }>();

      cot.cotizacion_items.forEach((item) => {
        // Solo incluir items con item_id válido (igual que paquetes)
        if (item.item_id) {
          itemIds.add(item.item_id);
          itemsData.set(item.item_id, {
            price: item.unit_price,
            quantity: item.quantity,
            description: item.description,
          });
        }
      });

      return {
        id: cot.id,
        name: cot.name,
        description: cot.description,
        price: cot.price,
        discount: cot.discount,
        servicios: filtrarCatalogoPorItems(catalogo, itemIds, itemsData),
        condiciones_comerciales: cot.condiciones_comerciales
          ? {
            metodo_pago: cot.condiciones_comerciales_metodo_pago?.[0]?.metodos_pago?.payment_method_name || null,
            condiciones: cot.condiciones_comerciales.description || null,
          }
          : null,
        paquete_origen: cot.paquete
          ? {
            id: cot.paquete.id,
            name: cot.paquete.name,
          }
          : null,
        selected_by_prospect: cot.selected_by_prospect || false,
      };
    });

    // 6. Mapear paquetes con estructura jerárquica (igual que ResumenCotizacionAutorizada)
    const mappedPaquetes: PublicPaquete[] = paquetes.map((paq) => {
      // Crear Set de item_ids incluidos en el paquete
      const itemIds = new Set<string>();
      const itemsData = new Map<string, { description?: string | null; quantity?: number; price?: number }>();

      // Verificar que paquete_items existe y tiene datos
      if (!paq.paquete_items || paq.paquete_items.length === 0) {
        return {
          id: paq.id,
          name: paq.name,
          description: paq.description,
          price: paq.precio || 0,
          cover_url: paq.cover_url,
          recomendado: paq.is_featured || false,
          servicios: [], // Retornar array vacío si no hay items
          tiempo_minimo_contratacion: null,
        };
      }

      // Mapear items del paquete (filtrar activos y visibles al cliente)
      paq.paquete_items.forEach((item) => {
        if (item.item_id && item.status === 'active' && item.visible_to_client !== false) {
          itemIds.add(item.item_id);

          // Calcular precio: usar precio_personalizado si existe, si no calcular desde catálogo
          let precioItem: number | undefined = undefined;

          if (item.precio_personalizado !== null && item.precio_personalizado !== undefined) {
            precioItem = item.precio_personalizado;
          } else if (item.items && configPrecios) {
            // Calcular precio desde catálogo
            const tipoUtilidad = item.items.utility_type?.toLowerCase() || 'service';
            const tipoUtilidadFinal = tipoUtilidad.includes('service') || tipoUtilidad.includes('servicio')
              ? 'servicio'
              : 'producto';

            const precios = calcularPrecio(
              item.items.cost || 0,
              item.items.expense || 0,
              tipoUtilidadFinal,
              configPrecios
            );

            precioItem = precios.precio_final;
          }

          itemsData.set(item.item_id, {
            description: null,
            quantity: item.quantity,
            price: precioItem,
          });
        }
      });

      const serviciosFiltrados = filtrarCatalogoPorItems(catalogo, itemIds, itemsData);

      return {
        id: paq.id,
        name: paq.name,
        description: paq.description,
        price: paq.precio || 0,
        cover_url: paq.cover_url,
        recomendado: paq.is_featured || false,
        servicios: serviciosFiltrados,
        tiempo_minimo_contratacion: null, // Este campo no existe en el schema actual
      };
    });

    // 7. Obtener portafolios según tipo de evento (si está habilitado)
    let portafolios: Array<{
      id: string;
      title: string;
      slug: string;
      description: string | null;
      cover_image_url: string | null;
      event_type?: {
        id: string;
        name: string;
      } | null;
    }> = [];

    if (shareSettings.portafolios && promise.event_type_id) {
      const portafoliosData = await prisma.studio_portfolios.findMany({
        where: {
          studio_id: studio.id,
          event_type_id: promise.event_type_id,
          is_published: true,
        },
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          cover_image_url: true,
          event_type: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [
          { is_featured: 'desc' },
          { order: 'asc' },
        ],
        take: 10, // Limitar a 10 portafolios
      });

      portafolios = portafoliosData.map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        description: p.description,
        cover_image_url: p.cover_image_url,
        event_type: p.event_type ? {
          id: p.event_type.id,
          name: p.event_type.name,
        } : null,
      }));
    }

    // 8. Validar que haya contenido disponible (cotizaciones o paquetes)
    if (mappedCotizaciones.length === 0 && mappedPaquetes.length === 0) {
      return {
        success: false,
        error: "No hay cotizaciones ni paquetes disponibles para mostrar",
      };
    }

    // 9. Obtener condiciones comerciales disponibles y términos y condiciones
    const [condicionesResult, terminosResult] = await Promise.all([
      obtenerCondicionesComercialesPublicas(studioSlug),
      obtenerTerminosCondicionesPublicos(studioSlug),
    ]);

    // Filtrar condiciones comerciales según preferencias
    let condicionesFiltradas = condicionesResult.success && condicionesResult.data ? condicionesResult.data : [];
    if (condicionesFiltradas.length > 0) {
      condicionesFiltradas = condicionesFiltradas.filter((condicion) => {
        const tipo = condicion.type || 'standard';
        if (tipo === 'standard') {
          return shareSettings.show_standard_conditions;
        } else if (tipo === 'offer') {
          return shareSettings.show_offer_conditions;
        }
        return false; // Si no tiene tipo, no mostrar
      });
    }

    return {
      success: true,
      data: {
        promise: {
          id: promise.id,
          contact_name: promise.contact.name,
          contact_phone: promise.contact.phone,
          contact_email: promise.contact.email,
          event_type_id: promise.event_type?.id || null,
          event_type_name: promise.event_type?.name || null,
          event_date: promise.event_date,
          event_location: promise.event_location,
        },
        studio: {
          studio_name: studio.studio_name,
          slogan: studio.slogan,
          logo_url: studio.logo_url,
          id: studio.id,
          promise_share_default_show_packages: studio.promise_share_default_show_packages,
          promise_share_default_show_categories_subtotals: studio.promise_share_default_show_categories_subtotals,
          promise_share_default_show_items_prices: studio.promise_share_default_show_items_prices,
          promise_share_default_min_days_to_hire: studio.promise_share_default_min_days_to_hire,
          promise_share_default_show_standard_conditions: studio.promise_share_default_show_standard_conditions,
          promise_share_default_show_offer_conditions: studio.promise_share_default_show_offer_conditions,
          promise_share_default_portafolios: studio.promise_share_default_portafolios,
        },
        cotizaciones: mappedCotizaciones,
        paquetes: mappedPaquetes,
        condiciones_comerciales: condicionesFiltradas.length > 0 ? condicionesFiltradas : undefined,
        terminos_condiciones: terminosResult.success && terminosResult.data ? terminosResult.data : undefined,
        share_settings: {
          show_packages: shareSettings.show_packages,
          show_categories_subtotals: shareSettings.show_categories_subtotals,
          show_items_prices: shareSettings.show_items_prices,
          min_days_to_hire: shareSettings.min_days_to_hire,
          show_standard_conditions: shareSettings.show_standard_conditions,
          show_offer_conditions: shareSettings.show_offer_conditions,
          portafolios: shareSettings.portafolios,
        },
        portafolios: portafolios.length > 0 ? portafolios : undefined,
      },
    };
  } catch (error) {
    console.error("[getPublicPromiseData] Error:", error);
    return {
      success: false,
      error: "Error al obtener datos de promesa",
    };
  }
}

/**
 * Obtener datos de promesa para preview público (legacy - mantener compatibilidad)
 * Valida que la promesa pertenezca al studio del slug
 * Solo expone datos necesarios para la vista pública
 */
export async function getPublicPromesaPreview(
  studioSlug: string,
  promesaId: string
): Promise<{
  success: boolean;
  data?: {
    promesa_id: string;
    contact_name: string;
    contact_phone: string;
    contact_email: string | null;
    event_type_name: string | null;
    interested_dates: string[] | null;
    acquisition_channel_name: string | null;
    social_network_name: string | null;
    referrer_name: string | null;
  };
  error?: string;
}> {
  try {
    // 1. Validar que el studio existe
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return {
        success: false,
        error: "Studio no encontrado",
      };
    }

    // 2. Obtener la promesa y validar que pertenece al studio
    const promesa = await prisma.studio_promises.findFirst({
      where: {
        id: promesaId,
        studio_id: studio.id, // Validación crítica de seguridad
      },
      include: {
        contact: {
          select: {
            name: true,
            phone: true,
            email: true,
            acquisition_channel: {
              select: {
                name: true,
              },
            },
            social_network: {
              select: {
                name: true,
              },
            },
            referrer_name: true,
          },
        },
        event_type: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!promesa) {
      return {
        success: false,
        error: "Promesa no encontrada o no tienes acceso",
      };
    }

    // 3. Retornar solo datos necesarios para el preview público
    return {
      success: true,
      data: {
        promesa_id: promesa.id,
        contact_name: promesa.contact.name,
        contact_phone: promesa.contact.phone,
        contact_email: promesa.contact.email,
        event_type_name: promesa.event_type?.name || null,
        interested_dates: promesa.tentative_dates
          ? (promesa.tentative_dates as string[])
          : null,
        acquisition_channel_name: promesa.contact.acquisition_channel?.name || null,
        social_network_name: promesa.contact.social_network?.name || null,
        referrer_name: promesa.contact.referrer_name || null,
      },
    };
  } catch (error) {
    console.error("[getPublicPromesaPreview] Error:", error);
    return {
      success: false,
      error: "Error al obtener promesa",
    };
  }
}

