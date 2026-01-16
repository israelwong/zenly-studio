"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { obtenerCatalogo } from "@/lib/actions/studio/config/catalogo.actions";
import { obtenerConfiguracionPrecios } from "@/lib/actions/studio/config/configuracion-precios.actions";
import { calcularPrecio } from "@/lib/actions/studio/catalogo/calcular-precio";
import { DEFAULT_AVISO_PRIVACIDAD_TITLE, DEFAULT_AVISO_PRIVACIDAD_VERSION, DEFAULT_AVISO_PRIVACIDAD_CONTENT } from "@/lib/constants/aviso-privacidad-default";
import type { PublicSeccionData, PublicCategoriaData, PublicServicioData, PublicCotizacion } from "@/types/public-promise";
import type { SeccionData } from "@/lib/actions/schemas/catalogo-schemas";
import { construirEstructuraJerarquicaCotizacion } from "@/lib/actions/studio/commercial/promises/cotizacion-structure.utils";

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

/**
 * Obtener aviso de privacidad activo para promesa pública
 */
export async function obtenerAvisoPrivacidadPublico(
  studioSlug: string
): Promise<{
  success: boolean;
  data?: {
    id: string;
    title: string;
    content: string;
    version: string;
    updated_at: Date;
  };
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

    let aviso = await prisma.studio_avisos_privacidad.findFirst({
      where: {
        studio_id: studio.id,
        is_active: true,
      },
      select: {
        id: true,
        title: true,
        content: true,
        version: true,
        updated_at: true,
      },
    });

    // Si no existe, crear uno por defecto (lazy creation)
    if (!aviso) {
      const nuevoAviso = await prisma.studio_avisos_privacidad.create({
        data: {
          studio_id: studio.id,
          title: DEFAULT_AVISO_PRIVACIDAD_TITLE,
          content: DEFAULT_AVISO_PRIVACIDAD_CONTENT,
          version: DEFAULT_AVISO_PRIVACIDAD_VERSION,
          is_active: true,
        },
        select: {
          id: true,
          title: true,
          content: true,
          version: true,
          updated_at: true,
        },
      });
      aviso = nuevoAviso;
    }

    return {
      success: true,
      data: aviso as {
        id: string;
        title: string;
        content: string;
        version: string;
        updated_at: Date;
      },
    };
  } catch (error) {
    console.error("Error al obtener aviso de privacidad público:", error);
    return {
      success: false,
      error: "Error al obtener aviso de privacidad",
    };
  }
}

// Usar el tipo exportado de public-promise.ts en lugar de duplicar la interfaz

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
  itemsData: Map<string, {
    price?: number;
    quantity?: number;
    description?: string | null;
    name_snapshot?: string | null;
    description_snapshot?: string | null;
    category_name_snapshot?: string | null;
    seccion_name_snapshot?: string | null;
  }>,
  itemsMedia?: Map<string, Array<{ id: string; file_url: string; file_type: 'IMAGE' | 'VIDEO'; thumbnail_url?: string | null }>>
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
              const media = itemsMedia?.get(servicio.id);
              return {
                id: servicio.id,
                // Usar snapshots si están disponibles, sino fallback al catálogo
                name: itemData?.name_snapshot || servicio.nombre,
                name_snapshot: itemData?.name_snapshot,
                description: itemData?.description_snapshot || itemData?.description || null,
                description_snapshot: itemData?.description_snapshot,
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
                // Incluir multimedia si existe
                ...(media && media.length > 0 ? { media } : {}),
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
      contact_address: string | null;
      event_type_id: string | null;
      event_type_name: string | null;
      event_name: string | null;
      event_date: Date | null;
      event_location: string | null;
    };
    studio: {
      studio_name: string;
      slogan: string | null;
      logo_url: string | null;
      id: string;
      representative_name: string | null;
      phone: string | null;
      email: string | null;
      address: string | null;
      promise_share_default_show_packages: boolean;
      promise_share_default_show_categories_subtotals: boolean;
      promise_share_default_show_items_prices: boolean;
      promise_share_default_min_days_to_hire: number;
      promise_share_default_show_standard_conditions: boolean;
      promise_share_default_show_offer_conditions: boolean;
      promise_share_default_portafolios: boolean;
      promise_share_default_auto_generate_contract: boolean;
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
      auto_generate_contract: boolean;
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
        representative_name: true,
        phone: true,
        email: true,
        address: true,
        promise_share_default_show_packages: true,
        promise_share_default_show_categories_subtotals: true,
        promise_share_default_show_items_prices: true,
        promise_share_default_min_days_to_hire: true,
        promise_share_default_show_standard_conditions: true,
        promise_share_default_show_offer_conditions: true,
        promise_share_default_portafolios: true,
        promise_share_default_auto_generate_contract: true,
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
        name: true,
        event_type_id: true,
        event_date: true,
        event_location: true,
        share_show_packages: true,
        share_show_categories_subtotals: true,
        share_show_items_prices: true,
        share_min_days_to_hire: true,
        share_show_standard_conditions: true,
        share_show_offer_conditions: true,
        share_auto_generate_contract: true,
        contact: {
          select: {
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
        quotes: {
          where: {
            visible_to_client: true,
            status: { 
              in: ['pendiente', 'negociacion', 'en_cierre', 'contract_generated', 'contract_signed'],
            },
          },
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            discount: true,
            status: true,
            selected_by_prospect: true,
            visible_to_client: true,
            order: true,
            negociacion_precio_original: true,
            negociacion_precio_personalizado: true,
            cotizacion_items: {
              select: {
                id: true,
                item_id: true,
                // Snapshots (prioridad - inmutables)
                name_snapshot: true,
                description_snapshot: true,
                category_name_snapshot: true,
                seccion_name_snapshot: true,
                // Campos operacionales (fallback - mutables)
                name: true,
                description: true,
                category_name: true,
                seccion_name: true,
                unit_price: true,
                quantity: true,
                subtotal: true,
                status: true,
                order: true,
                is_courtesy: true,
              },
              orderBy: {
                order: 'asc',
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
            paquete: {
              select: {
                id: true,
                name: true,
              },
            },
            cotizacion_cierre: {
              select: {
                contract_template_id: true,
                contract_content: true,
                contract_version: true,
                contrato_definido: true,
                contract_signed_at: true,
                condiciones_comerciales_id: true,
                condiciones_comerciales_definidas: true,
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
    const shareSettings: {
      show_packages: boolean;
      show_categories_subtotals: boolean;
      show_items_prices: boolean;
      min_days_to_hire: number;
      show_standard_conditions: boolean;
      show_offer_conditions: boolean;
      portafolios: boolean;
      auto_generate_contract: boolean;
    } = {
      show_packages: promise.share_show_packages ?? studio.promise_share_default_show_packages,
      show_categories_subtotals: promise.share_show_categories_subtotals ?? studio.promise_share_default_show_categories_subtotals,
      show_items_prices: promise.share_show_items_prices ?? studio.promise_share_default_show_items_prices,
      min_days_to_hire: promise.share_min_days_to_hire ?? studio.promise_share_default_min_days_to_hire,
      show_standard_conditions: promise.share_show_standard_conditions ?? studio.promise_share_default_show_standard_conditions,
      show_offer_conditions: promise.share_show_offer_conditions ?? studio.promise_share_default_show_offer_conditions,
      portafolios: studio.promise_share_default_portafolios,
      auto_generate_contract: promise.share_auto_generate_contract ?? studio.promise_share_default_auto_generate_contract,
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

    // 5. Obtener multimedia de todos los items únicos de cotizaciones y paquetes
    const allItemIds = new Set<string>();
    promise.quotes.forEach((cot) => {
      cot.cotizacion_items.forEach((item) => {
        if (item.item_id) allItemIds.add(item.item_id);
      });
    });
    paquetes.forEach((paq) => {
      // Incluir TODOS los items del paquete para obtener multimedia, no solo los filtrados
      paq.paquete_items.forEach((item) => {
        if (item.item_id) allItemIds.add(item.item_id);
      });
    });

    // Obtener multimedia de items (solo si hay item_ids)
    const itemsMediaMap = new Map<string, Array<{ id: string; file_url: string; file_type: 'IMAGE' | 'VIDEO'; thumbnail_url?: string | null }>>();

    if (allItemIds.size > 0) {
      const itemsMediaData = await prisma.studio_item_media.findMany({
        where: {
          item_id: { in: Array.from(allItemIds) },
          studio_id: studio.id,
        },
        select: {
          id: true,
          item_id: true,
          file_url: true,
          file_type: true,
          display_order: true,
        },
        orderBy: {
          display_order: 'asc',
        },
      });

      // Crear mapa de multimedia por item_id
      itemsMediaData.forEach((media) => {
        if (!itemsMediaMap.has(media.item_id)) {
          itemsMediaMap.set(media.item_id, []);
        }
        itemsMediaMap.get(media.item_id)!.push({
          id: media.id,
          file_url: media.file_url,
          file_type: media.file_type as 'IMAGE' | 'VIDEO',
          thumbnail_url: undefined, // No existe en el schema
        });
      });
    }

    // 6. Mapear cotizaciones con estructura jerárquica usando función centralizada
    // Ordenar explícitamente por order antes de mapear
    const quotesOrdenadas = promise.quotes.slice().sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));

    // Tipo para cotizacion_item basado en la query
    type CotizacionItem = {
      id: string;
      item_id: string | null;
      name_snapshot: string | null;
      description_snapshot: string | null;
      category_name_snapshot: string | null;
      seccion_name_snapshot: string | null;
      name: string | null;
      description: string | null;
      category_name: string | null;
      seccion_name: string | null;
      unit_price: number;
      quantity: number;
      subtotal: number;
      status: string;
      order: number;
    };

    const mappedCotizaciones: PublicCotizacion[] = (quotesOrdenadas as any[]).map((cot: any) => {
      const cotizacionMedia: Array<{ id: string; file_url: string; file_type: 'IMAGE' | 'VIDEO'; thumbnail_url?: string | null }> = [];

      // Agregar multimedia de todos los items
      (cot.cotizacion_items as CotizacionItem[]).forEach((item: CotizacionItem) => {
        if (item.item_id) {
          const itemMedia = itemsMediaMap.get(item.item_id);
          if (itemMedia) {
            cotizacionMedia.push(...itemMedia);
          }
        }
      });

      // Filtrar items con item_id válido
      const itemsFiltrados = (cot.cotizacion_items as CotizacionItem[]).filter((item: CotizacionItem) => item.item_id !== null);

      // Usar función centralizada para construir estructura jerárquica
      const estructura = construirEstructuraJerarquicaCotizacion(
        itemsFiltrados.map((item: CotizacionItem) => ({
          item_id: item.item_id!,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.subtotal,
          order: item.order,
          // Snapshots primero, luego campos operacionales
          name_snapshot: item.name_snapshot,
          description_snapshot: item.description_snapshot,
          category_name_snapshot: item.category_name_snapshot,
          seccion_name_snapshot: item.seccion_name_snapshot,
          name: item.name,
          description: item.description,
          category_name: item.category_name,
          seccion_name: item.seccion_name,
          id: item.id,
        })),
        {
          incluirPrecios: true,
          incluirDescripciones: true,
          ordenarPor: 'insercion',
        }
      );

      // Convertir formato de EstructuraJerarquica a PublicSeccionData[]
      const servicios: PublicSeccionData[] = estructura.secciones.map(seccion => ({
        id: seccion.nombre,
        nombre: seccion.nombre,
        orden: seccion.orden,
        categorias: seccion.categorias.map(categoria => ({
          id: categoria.nombre,
          nombre: categoria.nombre,
          orden: categoria.orden,
          servicios: categoria.items.map(item => {
            const itemMedia = item.item_id ? itemsMediaMap.get(item.item_id) : undefined;
            const originalItem = itemsFiltrados.find(i => i.id === item.id);
            return {
              id: item.item_id || item.id || '',
              name: item.nombre,
              name_snapshot: item.nombre, // Ya viene del snapshot
              description: item.descripcion || null,
              description_snapshot: item.descripcion || null, // Ya viene del snapshot
              price: item.unit_price,
              quantity: item.cantidad,
              is_courtesy: (item as any).is_courtesy || originalItem?.is_courtesy || false,
              ...(itemMedia && itemMedia.length > 0 ? { media: itemMedia } : {}),
            };
          }),
        })),
      }));

      const condicionesComerciales = (cot as any)['condiciones_comerciales'];

      return {
        id: cot.id,
        name: cot.name,
        description: cot.description,
        price: cot.price,
        discount: cot.discount,
        status: cot.status,
        order: cot.order ?? 0,
        servicios: servicios,
        condiciones_comerciales: condicionesComerciales
          ? {
            metodo_pago: cot.condiciones_comerciales_metodo_pago?.[0]?.metodos_pago?.payment_method_name || null,
            condiciones: condicionesComerciales.description || null,
            // Para cotizaciones en negociación, incluir datos completos de la condición comercial
            ...(cot.status === 'negociacion' ? {
              id: condicionesComerciales.id,
              name: condicionesComerciales.name,
              description: condicionesComerciales.description,
              advance_percentage: condicionesComerciales.advance_percentage ? Number(condicionesComerciales.advance_percentage) : null,
              advance_type: condicionesComerciales.advance_type,
              advance_amount: condicionesComerciales.advance_amount ? Number(condicionesComerciales.advance_amount) : null,
              discount_percentage: condicionesComerciales.discount_percentage ? Number(condicionesComerciales.discount_percentage) : null,
            } : {}),
          }
          : null,
        paquete_origen: cot.paquete
          ? {
            id: cot.paquete.id,
            name: cot.paquete.name,
          }
          : null,
        selected_by_prospect: cot.selected_by_prospect || false,
        negociacion_precio_original: (cot as any).negociacion_precio_original 
          ? Number((cot as any).negociacion_precio_original) 
          : null,
        negociacion_precio_personalizado: (cot as any).negociacion_precio_personalizado 
          ? Number((cot as any).negociacion_precio_personalizado) 
          : null,
        items_media: cotizacionMedia.length > 0 ? cotizacionMedia : undefined,
        // Información del contrato si está disponible
        // El contrato se almacena en studio_cotizaciones_cierre (tabla temporal)
        // Se muestra si hay contrato_definido y contract_template_id (igual que en el estudio)
        // O si hay condiciones comerciales definidas (para mostrar el desglose financiero)
        // También incluir condiciones comerciales de la cotización directamente si el contrato fue generado manualmente
        contract: (() => {
          const cierre = cot.cotizacion_cierre as any;
          const hasContract = (cierre?.contrato_definido && cierre?.contract_template_id) ||
            (cierre?.condiciones_comerciales && cierre?.condiciones_comerciales_definidas) ||
            (cierre?.contract_template_id || cierre?.contract_content);

          if (!hasContract) return undefined;

          return {
            template_id: cierre?.contract_template_id || null,
            content: cierre?.contract_content || null,
            version: cierre?.contract_version ?? 1,
            signed_at: cierre?.contract_signed_at || null,
            // Priorizar condiciones comerciales de cotizacion_cierre, sino usar las de la cotización directamente
            condiciones_comerciales: (cierre?.condiciones_comerciales ? {
              id: cierre.condiciones_comerciales.id,
              name: cierre.condiciones_comerciales.name,
              description: cierre.condiciones_comerciales.description,
              advance_percentage: cierre.condiciones_comerciales.advance_percentage ? Number(cierre.condiciones_comerciales.advance_percentage) : null,
              advance_type: cierre.condiciones_comerciales.advance_type,
              advance_amount: cierre.condiciones_comerciales.advance_amount ? Number(cierre.condiciones_comerciales.advance_amount) : null,
              discount_percentage: cierre.condiciones_comerciales.discount_percentage ? Number(cierre.condiciones_comerciales.discount_percentage) : null,
            } : null),
          };
        })(),
      };
    });

    // 7. Mapear paquetes con estructura jerárquica (igual que ResumenCotizacionAutorizada)
    const mappedPaquetes: PublicPaquete[] = paquetes.map((paq) => {
      // Crear Set de item_ids incluidos en el paquete
      const itemIds = new Set<string>();
      const itemsData = new Map<string, { description?: string | null; quantity?: number; price?: number }>();
      const paqueteMedia: Array<{ id: string; file_url: string; file_type: 'IMAGE' | 'VIDEO'; thumbnail_url?: string | null }> = [];

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

          // Agregar multimedia del item a la lista agregada
          const itemMedia = itemsMediaMap.get(item.item_id);
          if (itemMedia && itemMedia.length > 0) {
            paqueteMedia.push(...itemMedia);
          }
        }
      });

      const serviciosFiltrados = filtrarCatalogoPorItems(catalogo, itemIds, itemsData, itemsMediaMap);

      return {
        id: paq.id,
        name: paq.name,
        description: paq.description,
        price: paq.precio || 0,
        cover_url: paq.cover_url,
        recomendado: paq.is_featured || false,
        servicios: serviciosFiltrados,
        tiempo_minimo_contratacion: null, // Este campo no existe en el schema actual
        items_media: paqueteMedia.length > 0 ? paqueteMedia : undefined,
      };
    });

    // 8. Obtener portafolios según tipo de evento (si está habilitado)
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

    // 9. Validar que haya contenido disponible (cotizaciones o paquetes)
    if (mappedCotizaciones.length === 0 && mappedPaquetes.length === 0) {
      return {
        success: false,
        error: "No hay cotizaciones ni paquetes disponibles para mostrar",
      };
    }

    // 10. Obtener condiciones comerciales disponibles y términos y condiciones
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

    // Crear objeto share_settings con tipo explícito usando valores directamente
    const shareSettingsObj: {
      show_packages: boolean;
      show_categories_subtotals: boolean;
      show_items_prices: boolean;
      min_days_to_hire: number;
      show_standard_conditions: boolean;
      show_offer_conditions: boolean;
      portafolios: boolean;
      auto_generate_contract: boolean;
    } = {
      show_packages: promise.share_show_packages ?? studio.promise_share_default_show_packages,
      show_categories_subtotals: promise.share_show_categories_subtotals ?? studio.promise_share_default_show_categories_subtotals,
      show_items_prices: promise.share_show_items_prices ?? studio.promise_share_default_show_items_prices,
      min_days_to_hire: promise.share_min_days_to_hire ?? studio.promise_share_default_min_days_to_hire,
      show_standard_conditions: promise.share_show_standard_conditions ?? studio.promise_share_default_show_standard_conditions,
      show_offer_conditions: promise.share_show_offer_conditions ?? studio.promise_share_default_show_offer_conditions,
      portafolios: studio.promise_share_default_portafolios,
      auto_generate_contract: promise.share_auto_generate_contract ?? studio.promise_share_default_auto_generate_contract,
    };

    return {
      success: true,
      data: {
        promise: {
          id: promise.id,
          contact_name: promise.contact.name,
          contact_phone: promise.contact.phone,
          contact_email: promise.contact.email,
          contact_address: promise.contact.address,
          event_type_id: promise.event_type?.id || null,
          event_type_name: promise.event_type?.name || null,
          event_name: promise.name,
          event_date: promise.event_date,
          event_location: promise.event_location,
        },
        studio: {
          studio_name: studio.studio_name,
          slogan: studio.slogan,
          logo_url: studio.logo_url,
          id: studio.id,
          representative_name: studio.representative_name,
          phone: studio.phone,
          email: studio.email,
          address: studio.address,
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
        share_settings: shareSettingsObj,
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

/**
 * Actualizar datos de promesa desde página pública
 * Actualiza contacto y datos del evento
 */
export async function updatePublicPromiseData(
  studioSlug: string,
  promiseId: string,
  data: {
    contact_name: string;
    contact_phone: string;
    contact_email: string | null;
    contact_address: string | null;
    event_name: string | null;
    event_location: string | null;
    // event_date es read-only, no se actualiza
  }
): Promise<{
  success: boolean;
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
    const promise = await prisma.studio_promises.findFirst({
      where: {
        id: promiseId,
        studio_id: studio.id,
      },
      include: {
        contact: {
          select: {
            id: true,
            phone: true,
            email: true,
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

    if (!promise.contact?.id) {
      return {
        success: false,
        error: "La promesa no tiene contacto asociado",
      };
    }

    // 2.5. Validar duplicados de teléfono y correo
    const newPhone = data.contact_phone.trim();
    const newEmail = data.contact_email?.trim() || null;

    // Validar teléfono duplicado (si está cambiando)
    if (newPhone !== promise.contact.phone) {
      const existingContactByPhone = await prisma.studio_contacts.findFirst({
        where: {
          studio_id: studio.id,
          phone: newPhone,
          id: { not: promise.contact.id }, // Excluir el contacto actual
        },
        select: { id: true },
      });

      if (existingContactByPhone) {
        return {
          success: false,
          error: "Este teléfono ya está registrado para otro contacto en este estudio",
        };
      }
    }

    // Validar email duplicado (si está cambiando y se proporciona)
    if (newEmail && newEmail !== promise.contact.email) {
      const existingContactByEmail = await prisma.studio_contacts.findFirst({
        where: {
          studio_id: studio.id,
          email: newEmail,
          id: { not: promise.contact.id }, // Excluir el contacto actual
        },
        select: { id: true },
      });

      if (existingContactByEmail) {
        return {
          success: false,
          error: "Este correo electrónico ya está registrado para otro contacto en este estudio",
        };
      }
    }

    // 3. Validar datos requeridos
    if (!data.contact_name?.trim()) {
      return {
        success: false,
        error: "El nombre del contacto es requerido",
      };
    }

    if (!data.contact_phone?.trim()) {
      return {
        success: false,
        error: "El teléfono del contacto es requerido",
      };
    }

    if (!data.contact_email?.trim()) {
      return {
        success: false,
        error: "El correo del contacto es requerido",
      };
    }

    if (!data.contact_address?.trim()) {
      return {
        success: false,
        error: "La dirección del contacto es requerida",
      };
    }

    if (!data.event_name?.trim()) {
      return {
        success: false,
        error: "El nombre del evento es requerido",
      };
    }

    if (!data.event_location?.trim()) {
      return {
        success: false,
        error: "La locación del evento es requerida",
      };
    }

    // 4. Actualizar contacto y promesa en una transacción
    // En este punto, todos los campos están validados y no son null
    const contactEmail = data.contact_email?.trim() || '';
    const contactAddress = data.contact_address?.trim() || '';
    const eventName = data.event_name?.trim() || '';
    const eventLocation = data.event_location?.trim() || '';

    await prisma.$transaction(async (tx) => {
      // Actualizar contacto
      await tx.studio_contacts.update({
        where: { id: promise.contact.id },
        data: {
          name: data.contact_name.trim(),
          phone: data.contact_phone.trim(),
          email: contactEmail || null,
          address: contactAddress || null,
        },
      });

      // Actualizar promesa
      await tx.studio_promises.update({
        where: { id: promiseId },
        data: {
          name: eventName || null,
          event_location: eventLocation || null,
        },
      });
    });

    // 5. Revalidar paths
    revalidatePath(`/${studioSlug}/promise/${promiseId}`);

    return {
      success: true,
    };
  } catch (error) {
    console.error("[updatePublicPromiseData] Error:", error);
    return {
      success: false,
      error: "Error al actualizar datos",
    };
  }
}

/**
 * Obtener solo los datos del contrato de una cotización específica (para actualización local)
 */
export async function getPublicCotizacionContract(
  studioSlug: string,
  cotizacionId: string
): Promise<{
  success: boolean;
  data?: {
    template_id: string | null;
    content: string | null;
    version: number;
    signed_at: Date | null;
    condiciones_comerciales: {
      id: string;
      name: string;
      description: string | null;
      advance_percentage: number | null;
      advance_type: string | null;
      advance_amount: number | null;
      discount_percentage: number | null;
    } | null;
  };
  error?: string;
}> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: "Studio no encontrado" };
    }

    const cotizacion = await prisma.studio_cotizaciones.findFirst({
      where: {
        id: cotizacionId,
        studio_id: studio.id,
      },
      select: {
        id: true,
        cotizacion_cierre: {
          select: {
            contract_template_id: true,
            contract_content: true,
            contract_version: true,
            contract_signed_at: true,
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
      },
    });

    if (!cotizacion || !cotizacion.cotizacion_cierre) {
      return { success: false, error: "Cotización o contrato no encontrado" };
    }

    const cierre = cotizacion.cotizacion_cierre;

    return {
      success: true,
      data: {
        template_id: cierre.contract_template_id,
        content: cierre.contract_content,
        version: cierre.contract_version || 1,
        signed_at: cierre.contract_signed_at,
        condiciones_comerciales: cierre.condiciones_comerciales ? {
          id: cierre.condiciones_comerciales.id,
          name: cierre.condiciones_comerciales.name,
          description: cierre.condiciones_comerciales.description,
          advance_percentage: cierre.condiciones_comerciales.advance_percentage ? Number(cierre.condiciones_comerciales.advance_percentage) : null,
          advance_type: cierre.condiciones_comerciales.advance_type,
          advance_amount: cierre.condiciones_comerciales.advance_amount ? Number(cierre.condiciones_comerciales.advance_amount) : null,
          discount_percentage: cierre.condiciones_comerciales.discount_percentage ? Number(cierre.condiciones_comerciales.discount_percentage) : null,
        } : null,
      },
    };
  } catch (error) {
    console.error("[getPublicCotizacionContract] Error:", error);
    return {
      success: false,
      error: "Error al obtener datos del contrato",
    };
  }
}

