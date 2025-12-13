"use server";

import { prisma } from "@/lib/prisma";

// Tipos para cotizaciones públicas
interface PublicCotizacionServicio {
  id: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  quantity: number;
}

interface PublicCotizacion {
  id: string;
  name: string;
  description: string | null;
  price: number;
  discount: number | null;
  servicios: PublicCotizacionServicio[];
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
interface PublicPaqueteServicio {
  id: string;
  name: string;
  description: string | null;
  category: string;
}

interface PublicPaquete {
  id: string;
  name: string;
  description: string | null;
  price: number;
  servicios: PublicPaqueteServicio[];
  tiempo_minimo_contratacion: number | null;
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
      name: string;
      logo_url: string | null;
    };
    cotizaciones: PublicCotizacion[];
    paquetes: PublicPaquete[];
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
        logo_url: true,
      },
    });

    if (!studio) {
      return {
        success: false,
        error: "Studio no encontrado",
      };
    }

    // 2. Obtener la promesa con sus cotizaciones
    const promise = await prisma.studio_promises.findFirst({
      where: {
        id: promiseId,
        studio_id: studio.id,
      },
      include: {
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
                  name: true,
                  description: true,
                  category_name: true,
                  unit_price: true,
                  quantity: true,
                  subtotal: true,
                },
                orderBy: {
                  position: 'asc',
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
                      name: true,
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
        error: "Promesa no encontrada",
      };
    }

    // 3. Obtener paquetes disponibles para el tipo de evento
    const paquetes = promise.event_type_id
      ? await prisma.studio_paquetes.findMany({
          where: {
            studio_id: studio.id,
            event_type_id: promise.event_type_id,
            status: 'active',
          },
          include: {
            paquete_items: {
              select: {
                id: true,
                quantity: true,
                items: {
                  select: {
                    id: true,
                    name: true,
                    service_categories: {
                      select: {
                        name: true,
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
          orderBy: {
            precio: 'asc',
          },
        })
      : [];

    // 4. Mapear cotizaciones
    const mappedCotizaciones: PublicCotizacion[] = promise.quotes.map((cot) => ({
      id: cot.id,
      name: cot.name,
      description: cot.description,
      price: cot.price,
      discount: cot.discount,
      servicios: cot.cotizacion_items.map((item) => ({
        id: item.id,
        name: item.name || 'Servicio',
        description: item.description,
        category: item.category_name || 'General',
        price: item.unit_price,
        quantity: item.quantity,
      })),
      condiciones_comerciales: cot.condiciones_comerciales
        ? {
            metodo_pago: cot.condiciones_comerciales_metodo_pago?.metodos_pago?.name || null,
            condiciones: cot.condiciones_comerciales.description || null,
          }
        : null,
      paquete_origen: cot.paquete
        ? {
            id: cot.paquete.id,
            name: cot.paquete.name,
          }
        : null,
    }));

    // 5. Mapear paquetes
    const mappedPaquetes: PublicPaquete[] = paquetes.map((paq) => ({
      id: paq.id,
      name: paq.name,
      description: paq.description,
      price: paq.precio || 0,
      servicios: paq.paquete_items.map((item) => ({
        id: item.items.id,
        name: item.items.name,
        description: null, // Los items no tienen descripción directa
        category: item.items.service_categories.name,
      })),
      tiempo_minimo_contratacion: null, // Este campo no existe en el schema actual
    }));

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
          name: studio.name,
          logo_url: studio.logo_url,
        },
        cotizaciones: mappedCotizaciones,
        paquetes: mappedPaquetes,
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

