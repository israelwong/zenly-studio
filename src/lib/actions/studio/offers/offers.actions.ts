"use server";

import { prisma } from "@/lib/prisma";
import { retryDatabaseOperation } from "@/lib/actions/utils/database-retry";
import {
  CreateOfferSchema,
  UpdateOfferSchema,
  type CreateOfferData,
  type UpdateOfferData,
} from "@/lib/actions/schemas/offer-schemas";
import type {
  OfferResponse,
  OfferListResponse,
  StudioOffer,
} from "@/types/offers";
import { getOfferContentBlocks, batchUpdateOfferContentBlocks } from "./offer-content-blocks.actions";

/**
 * Validar si un slug existe en el studio (excluyendo una oferta específica si se proporciona)
 */
export async function checkOfferSlugExists(
  studioSlug: string,
  slug: string,
  excludeOfferId?: string
): Promise<boolean> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return false;
    }

    const existing = await prisma.studio_offers.findUnique({
      where: {
        studio_id_slug: {
          studio_id: studio.id,
          slug: slug,
        },
      },
      select: { id: true },
    });

    // Si no existe, o si existe pero es la misma oferta que estamos editando, no hay conflicto
    return !!(existing && (!excludeOfferId || existing.id !== excludeOfferId));
  } catch (error) {
    console.error("Error checking offer slug:", error);
    return false;
  }
}

/**
 * Crear nueva oferta comercial
 */
export async function createOffer(
  studioSlug: string,
  data: CreateOfferData
): Promise<OfferResponse> {
  try {
    const validatedData = CreateOfferSchema.parse(data);

    return await retryDatabaseOperation(async () => {
      // Obtener estudio por slug
      const studio = await prisma.studios.findUnique({
        where: { slug: studioSlug },
        select: { id: true },
      });

      if (!studio) {
        return { success: false, error: "Estudio no encontrado" };
      }

      // Verificar que el slug sea único para este estudio
      const existingOffer = await prisma.studio_offers.findUnique({
        where: {
          studio_id_slug: {
            studio_id: studio.id,
            slug: validatedData.slug,
          },
        },
      });

      if (existingOffer) {
        return { success: false, error: "Ya existe una oferta con este slug" };
      }

      // Crear oferta con landing page y leadform
      const offer = await prisma.studio_offers.create({
        data: {
          studio_id: studio.id,
          name: validatedData.name,
          description: validatedData.description || null,
          objective: validatedData.objective,
          slug: validatedData.slug,
          cover_media_url: validatedData.cover_media_url || null,
          cover_media_type: validatedData.cover_media_type || null,
          is_active: validatedData.is_active,
          landing_page: {
            create: {
              cta_config: validatedData.landing_page.cta_config,
            },
          },
          leadform: {
            create: {
              title: validatedData.leadform.title || null,
              description: validatedData.leadform.description || null,
              success_message: validatedData.leadform.success_message,
              success_redirect_url: validatedData.leadform.success_redirect_url || null,
              fields_config: validatedData.leadform.fields_config,
              subject_options: validatedData.leadform.subject_options || null,
              enable_interest_date: validatedData.leadform.enable_interest_date,
              validate_with_calendar: validatedData.leadform.validate_with_calendar,
            },
          },
        },
        include: {
          landing_page: true,
          leadform: true,
        },
      });

      // Guardar content blocks en las nuevas tablas
      if (validatedData.landing_page.content_blocks && validatedData.landing_page.content_blocks.length > 0) {
        const blocksResult = await batchUpdateOfferContentBlocks(
          offer.id,
          studio.id,
          validatedData.landing_page.content_blocks
        );
        if (!blocksResult.success) {
          console.error("Error saving content blocks:", blocksResult.error);
        }
      }

      const mappedOffer: StudioOffer = {
        id: offer.id,
        studio_id: offer.studio_id,
        name: offer.name,
        description: offer.description,
        objective: offer.objective as "presencial" | "virtual",
        slug: offer.slug,
        cover_media_url: offer.cover_media_url,
        cover_media_type: offer.cover_media_type as "image" | "video" | null,
        is_active: offer.is_active,
        created_at: offer.created_at,
        updated_at: offer.updated_at,
        landing_page: offer.landing_page
          ? {
            id: offer.landing_page.id,
            offer_id: offer.landing_page.offer_id,
            content_blocks: offer.landing_page.content_blocks as unknown[],
            cta_config: offer.landing_page.cta_config as {
              buttons: Array<{
                id: string;
                text: string;
                variant: "primary" | "secondary" | "outline";
                position: "top" | "middle" | "bottom" | "floating";
                href?: string;
              }>;
            },
            created_at: offer.landing_page.created_at,
            updated_at: offer.landing_page.updated_at,
          }
          : undefined,
        leadform: offer.leadform
          ? {
            id: offer.leadform.id,
            offer_id: offer.leadform.offer_id,
            title: offer.leadform.title,
            description: offer.leadform.description,
            success_message: offer.leadform.success_message,
            success_redirect_url: offer.leadform.success_redirect_url,
            fields_config: offer.leadform.fields_config as {
              fields: Array<{
                id: string;
                type: string;
                label: string;
                required: boolean;
                placeholder?: string;
                options?: string[];
              }>;
            },
            created_at: offer.leadform.created_at,
            updated_at: offer.leadform.updated_at,
          }
          : undefined,
      };

      return { success: true, data: mappedOffer };
    });
  } catch (error) {
    console.error("[createOffer] Error:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al crear la oferta" };
  }
}

/**
 * Actualizar oferta existente
 */
export async function updateOffer(
  offerId: string,
  studioSlug: string,
  data: UpdateOfferData
): Promise<OfferResponse> {
  try {
    const validatedData = UpdateOfferSchema.parse(data);

    return await retryDatabaseOperation(async () => {
      // Obtener estudio por slug
      const studio = await prisma.studios.findUnique({
        where: { slug: studioSlug },
        select: { id: true },
      });

      if (!studio) {
        return { success: false, error: "Estudio no encontrado" };
      }

      // Verificar que la oferta pertenezca al estudio
      const existingOffer = await prisma.studio_offers.findFirst({
        where: {
          id: offerId,
          studio_id: studio.id,
        },
      });

      if (!existingOffer) {
        return { success: false, error: "Oferta no encontrada" };
      }

      // Si se cambia el slug, verificar que sea único
      if (validatedData.slug && validatedData.slug !== existingOffer.slug) {
        const slugExists = await prisma.studio_offers.findUnique({
          where: {
            studio_id_slug: {
              studio_id: studio.id,
              slug: validatedData.slug,
            },
          },
        });

        if (slugExists) {
          return { success: false, error: "Ya existe una oferta con este slug" };
        }
      }

      // Actualizar oferta
      const updateData: {
        name?: string;
        description?: string | null;
        objective?: string;
        slug?: string;
        cover_media_url?: string | null;
        cover_media_type?: string | null;
        is_active?: boolean;
        landing_page?: {
          update: {
            content_blocks?: unknown;
            cta_config?: unknown;
          };
        };
        leadform?: {
          update: {
            title?: string | null;
            description?: string | null;
            success_message?: string;
            success_redirect_url?: string | null;
            fields_config?: unknown;
            subject_options?: unknown;
            enable_interest_date?: boolean;
            validate_with_calendar?: boolean;
          };
        };
      } = {};

      if (validatedData.name !== undefined) updateData.name = validatedData.name;
      if (validatedData.description !== undefined)
        updateData.description = validatedData.description || null;
      if (validatedData.objective !== undefined)
        updateData.objective = validatedData.objective;
      if (validatedData.slug !== undefined) updateData.slug = validatedData.slug;
      // Siempre incluir cover_media_url y cover_media_type si están presentes en validatedData
      if ('cover_media_url' in validatedData)
        updateData.cover_media_url = validatedData.cover_media_url ?? null;
      if ('cover_media_type' in validatedData)
        updateData.cover_media_type = validatedData.cover_media_type ?? null;
      if (validatedData.is_active !== undefined)
        updateData.is_active = validatedData.is_active;

      if (validatedData.landing_page) {
        updateData.landing_page = {
          update: {
            cta_config: validatedData.landing_page.cta_config,
          },
        };
      }

      if (validatedData.leadform) {
        updateData.leadform = {
          update: {
            title: validatedData.leadform.title || null,
            description: validatedData.leadform.description || null,
            success_message: validatedData.leadform.success_message,
            success_redirect_url: validatedData.leadform.success_redirect_url || null,
            fields_config: validatedData.leadform.fields_config,
            subject_options: validatedData.leadform.subject_options || null,
            enable_interest_date: validatedData.leadform.enable_interest_date,
            validate_with_calendar: validatedData.leadform.validate_with_calendar,
          },
        };
      }

      const offer = await prisma.studio_offers.update({
        where: { id: offerId },
        data: updateData,
        include: {
          landing_page: true,
          leadform: true,
        },
      });

      // Actualizar content blocks si se proporcionaron
      if (validatedData.landing_page?.content_blocks) {
        const blocksResult = await batchUpdateOfferContentBlocks(
          offerId,
          studio.id,
          validatedData.landing_page.content_blocks
        );
        if (!blocksResult.success) {
          console.error("Error updating content blocks:", blocksResult.error);
        }
      }

      // Obtener content blocks desde las nuevas tablas
      const contentBlocksResult = await getOfferContentBlocks(offerId);
      const contentBlocks = contentBlocksResult.success ? contentBlocksResult.data || [] : [];

      const mappedOffer: StudioOffer = {
        id: offer.id,
        studio_id: offer.studio_id,
        name: offer.name,
        description: offer.description,
        objective: offer.objective as "presencial" | "virtual",
        slug: offer.slug,
        cover_media_url: offer.cover_media_url,
        cover_media_type: offer.cover_media_type as "image" | "video" | null,
        is_active: offer.is_active,
        created_at: offer.created_at,
        updated_at: offer.updated_at,
        landing_page: offer.landing_page
          ? {
            id: offer.landing_page.id,
            offer_id: offer.landing_page.offer_id,
            content_blocks: offer.landing_page.content_blocks as unknown[],
            cta_config: offer.landing_page.cta_config as {
              buttons: Array<{
                id: string;
                text: string;
                variant: "primary" | "secondary" | "outline";
                position: "top" | "middle" | "bottom" | "floating";
                href?: string;
              }>;
            },
            created_at: offer.landing_page.created_at,
            updated_at: offer.landing_page.updated_at,
          }
          : undefined,
        leadform: offer.leadform
          ? {
            id: offer.leadform.id,
            offer_id: offer.leadform.offer_id,
            title: offer.leadform.title,
            description: offer.leadform.description,
            success_message: offer.leadform.success_message,
            success_redirect_url: offer.leadform.success_redirect_url,
            fields_config: offer.leadform.fields_config as {
              fields: Array<{
                id: string;
                type: string;
                label: string;
                required: boolean;
                placeholder?: string;
                options?: string[];
              }>;
            },
            created_at: offer.leadform.created_at,
            updated_at: offer.leadform.updated_at,
          }
          : undefined,
      };

      return { success: true, data: mappedOffer };
    });
  } catch (error) {
    console.error("[updateOffer] Error:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al actualizar la oferta" };
  }
}

/**
 * Obtener oferta por ID y slug del estudio
 */
export async function getOffer(
  offerId: string,
  studioSlug: string
): Promise<OfferResponse> {
  try {
    return await retryDatabaseOperation(async () => {
      const studio = await prisma.studios.findUnique({
        where: { slug: studioSlug },
        select: { id: true },
      });

      if (!studio) {
        return { success: false, error: "Estudio no encontrado" };
      }

      const offer = await prisma.studio_offers.findFirst({
        where: {
          id: offerId,
          studio_id: studio.id,
        },
        include: {
          landing_page: true,
          leadform: true,
        },
      });

      if (!offer) {
        return { success: false, error: "Oferta no encontrada" };
      }

      // Obtener content blocks desde las nuevas tablas
      const contentBlocksResult = await getOfferContentBlocks(offerId);
      const contentBlocks = contentBlocksResult.success ? contentBlocksResult.data || [] : [];

      const mappedOffer: StudioOffer = {
        id: offer.id,
        studio_id: offer.studio_id,
        name: offer.name,
        description: offer.description,
        objective: offer.objective as "presencial" | "virtual",
        slug: offer.slug,
        cover_media_url: offer.cover_media_url,
        cover_media_type: offer.cover_media_type as "image" | "video" | null,
        is_active: offer.is_active,
        created_at: offer.created_at,
        updated_at: offer.updated_at,
        landing_page: offer.landing_page
          ? {
            id: offer.landing_page.id,
            offer_id: offer.landing_page.offer_id,
            content_blocks: contentBlocks,
            cta_config: offer.landing_page.cta_config as {
              buttons: Array<{
                id: string;
                text: string;
                variant: "primary" | "secondary" | "outline";
                position: "top" | "middle" | "bottom" | "floating";
                href?: string;
              }>;
            },
            created_at: offer.landing_page.created_at,
            updated_at: offer.landing_page.updated_at,
          }
          : undefined,
        leadform: offer.leadform
          ? {
            id: offer.leadform.id,
            offer_id: offer.leadform.offer_id,
            title: offer.leadform.title,
            description: offer.leadform.description,
            success_message: offer.leadform.success_message,
            success_redirect_url: offer.leadform.success_redirect_url,
            fields_config: offer.leadform.fields_config as {
              fields: Array<{
                id: string;
                type: string;
                label: string;
                required: boolean;
                placeholder?: string;
                options?: string[];
              }>;
            },
            created_at: offer.leadform.created_at,
            updated_at: offer.leadform.updated_at,
          }
          : undefined,
      };

      return { success: true, data: mappedOffer };
    });
  } catch (error) {
    console.error("[getOffer] Error:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al obtener la oferta" };
  }
}

/**
 * Obtener oferta pública por slug o ID (para landing page pública)
 */
export async function getPublicOffer(
  offerIdentifier: string,
  studioSlug: string
): Promise<OfferResponse> {
  try {
    return await retryDatabaseOperation(async () => {
      const studio = await prisma.studios.findUnique({
        where: { slug: studioSlug },
        select: { id: true },
      });

      if (!studio) {
        return { success: false, error: "Estudio no encontrado" };
      }

      // Intentar buscar por ID primero, luego por slug
      let offer = await prisma.studio_offers.findFirst({
        where: {
          id: offerIdentifier,
          studio_id: studio.id,
          is_active: true,
        },
        include: {
          landing_page: true,
          leadform: true,
        },
      });

      // Si no se encuentra por ID, buscar por slug
      if (!offer) {
        offer = await prisma.studio_offers.findFirst({
          where: {
            slug: offerIdentifier,
            studio_id: studio.id,
            is_active: true,
          },
          include: {
            landing_page: true,
            leadform: true,
          },
        });
      }

      if (!offer) {
        return { success: false, error: "Oferta no encontrada" };
      }

      // Obtener content blocks desde las nuevas tablas
      const contentBlocksResult = await getOfferContentBlocks(offer.id);
      const contentBlocks = contentBlocksResult.success ? contentBlocksResult.data || [] : [];

      const mappedOffer: StudioOffer = {
        id: offer.id,
        studio_id: offer.studio_id,
        name: offer.name,
        description: offer.description,
        objective: offer.objective as "presencial" | "virtual",
        slug: offer.slug,
        cover_media_url: offer.cover_media_url,
        cover_media_type: offer.cover_media_type as "image" | "video" | null,
        is_active: offer.is_active,
        created_at: offer.created_at,
        updated_at: offer.updated_at,
        landing_page: offer.landing_page
          ? {
            id: offer.landing_page.id,
            offer_id: offer.landing_page.offer_id,
            content_blocks: contentBlocks,
            cta_config: offer.landing_page.cta_config as {
              buttons: Array<{
                id: string;
                text: string;
                variant: "primary" | "secondary" | "outline";
                position: "top" | "middle" | "bottom" | "floating";
                href?: string;
              }>;
            },
            created_at: offer.landing_page.created_at,
            updated_at: offer.landing_page.updated_at,
          }
          : undefined,
        leadform: offer.leadform
          ? {
            id: offer.leadform.id,
            offer_id: offer.leadform.offer_id,
            title: offer.leadform.title,
            description: offer.leadform.description,
            success_message,
            success_message: offer.leadform.success_message,
            success_redirect_url: offer.leadform.success_redirect_url,
            fields_config: offer.leadform.fields_config as {
              fields: Array<{
                id: string;
                type: string;
                label: string;
                required: boolean;
                placeholder?: string;
                options?: string[];
              }>;
            },
            created_at: offer.leadform.created_at,
            updated_at: offer.leadform.updated_at,
          }
          : undefined,
      };

      return { success: true, data: mappedOffer };
    });
  } catch (error) {
    console.error("[getPublicOffer] Error:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al obtener la oferta" };
  }
}

/**
 * Listar ofertas de un estudio
 */
export async function listOffers(
  studioSlug: string,
  options?: { include_inactive?: boolean }
): Promise<OfferListResponse> {
  try {
    return await retryDatabaseOperation(async () => {
      const studio = await prisma.studios.findUnique({
        where: { slug: studioSlug },
        select: { id: true },
      });

      if (!studio) {
        return { success: false, error: "Estudio no encontrado" };
      }

      const offers = await prisma.studio_offers.findMany({
        where: {
          studio_id: studio.id,
          ...(options?.include_inactive ? {} : { is_active: true }),
        },
        include: {
          landing_page: true,
          leadform: true,
        },
        orderBy: {
          created_at: "desc",
        },
      });

      // Obtener content blocks para cada oferta
      const mappedOffers: StudioOffer[] = await Promise.all(
        offers.map(async (offer) => {
          const contentBlocksResult = await getOfferContentBlocks(offer.id);
          const contentBlocks = contentBlocksResult.success ? contentBlocksResult.data || [] : [];

          return {
            id: offer.id,
            studio_id: offer.studio_id,
            name: offer.name,
            description: offer.description,
            objective: offer.objective as "presencial" | "virtual",
            slug: offer.slug,
            cover_media_url: offer.cover_media_url,
            cover_media_type: offer.cover_media_type as "image" | "video" | null,
            is_active: offer.is_active,
            created_at: offer.created_at,
            updated_at: offer.updated_at,
            landing_page: offer.landing_page
              ? {
                id: offer.landing_page.id,
                offer_id: offer.landing_page.offer_id,
                content_blocks: contentBlocks,
                cta_config: offer.landing_page.cta_config as {
                  buttons: Array<{
                    id: string;
                    text: string;
                    variant: "primary" | "secondary" | "outline";
                    position: "top" | "middle" | "bottom" | "floating";
                    href?: string;
                  }>;
                },
                created_at: offer.landing_page.created_at,
                updated_at: offer.landing_page.updated_at,
              }
              : undefined,
            leadform: offer.leadform
              ? {
                id: offer.leadform.id,
                offer_id: offer.leadform.offer_id,
                title: offer.leadform.title,
                description: offer.leadform.description,
                success_message: offer.leadform.success_message,
                success_redirect_url: offer.leadform.success_redirect_url,
                fields_config: offer.leadform.fields_config as {
                  fields: Array<{
                    id: string;
                    type: string;
                    label: string;
                    required: boolean;
                    placeholder?: string;
                    options?: string[];
                  }>;
                },
                created_at: offer.leadform.created_at,
                updated_at: offer.leadform.updated_at,
              }
              : undefined,
          };
        })
      );

      return { success: true, data: mappedOffers };
    });
  } catch (error) {
    console.error("[listOffers] Error:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al listar las ofertas" };
  }
}

/**
 * Eliminar oferta
 */
export async function deleteOffer(
  offerId: string,
  studioSlug: string
): Promise<{ success: boolean; error?: string }> {
  try {
    return await retryDatabaseOperation(async () => {
      const studio = await prisma.studios.findUnique({
        where: { slug: studioSlug },
        select: { id: true },
      });

      if (!studio) {
        return { success: false, error: "Estudio no encontrado" };
      }

      const offer = await prisma.studio_offers.findFirst({
        where: {
          id: offerId,
          studio_id: studio.id,
        },
      });

      if (!offer) {
        return { success: false, error: "Oferta no encontrada" };
      }

      await prisma.studio_offers.delete({
        where: { id: offerId },
      });

      return { success: true };
    });
  } catch (error) {
    console.error("[deleteOffer] Error:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al eliminar la oferta" };
  }
}

/**
 * Duplicar oferta
 */
export async function duplicateOffer(
  offerId: string,
  studioSlug: string
): Promise<OfferResponse> {
  try {
    return await retryDatabaseOperation(async () => {
      const studio = await prisma.studios.findUnique({
        where: { slug: studioSlug },
        select: { id: true },
      });

      if (!studio) {
        return { success: false, error: "Estudio no encontrado" };
      }

      // Obtener oferta original con sus relaciones
      const original = await prisma.studio_offers.findFirst({
        where: {
          id: offerId,
          studio_id: studio.id,
        },
        include: {
          landing_page: true,
          leadform: true,
        },
      });

      if (!original) {
        return { success: false, error: "Oferta no encontrada" };
      }

      // Generar slug único para la oferta duplicada
      let newSlug = `${original.slug}-copia`;
      let counter = 1;

      while (true) {
        const existing = await prisma.studio_offers.findUnique({
          where: {
            studio_id_slug: {
              studio_id: studio.id,
              slug: newSlug,
            },
          },
        });

        if (!existing) {
          break;
        }

        counter++;
        newSlug = `${original.slug}-copia-${counter}`;
      }

      // Obtener content blocks de la oferta original
      const originalContentBlocksResult = await getOfferContentBlocks(original.id);
      const originalContentBlocks = originalContentBlocksResult.success ? originalContentBlocksResult.data || [] : [];

      // Crear oferta duplicada
      const duplicatedOffer = await prisma.studio_offers.create({
        data: {
          studio_id: original.studio_id,
          name: `${original.name} (Copia)`,
          description: original.description,
          objective: original.objective,
          slug: newSlug,
          is_active: false, // Duplicada inactiva por defecto
          landing_page: original.landing_page
            ? {
              create: {
                cta_config: original.landing_page.cta_config,
              },
            }
            : undefined,
          leadform: original.leadform
            ? {
              create: {
                title: original.leadform.title,
                description: original.leadform.description,
                success_message: original.leadform.success_message,
                success_redirect_url: original.leadform.success_redirect_url,
                fields_config: original.leadform.fields_config,
              },
            }
            : undefined,
        },
        include: {
          landing_page: true,
          leadform: true,
        },
      });

      // Copiar content blocks a la oferta duplicada
      if (originalContentBlocks.length > 0) {
        const blocksResult = await batchUpdateOfferContentBlocks(
          duplicatedOffer.id,
          studio.id,
          originalContentBlocks.map(block => ({ ...block, id: undefined })) // Remover IDs para crear nuevos
        );
        if (!blocksResult.success) {
          console.error("Error copying content blocks:", blocksResult.error);
        }
      }

      // Obtener content blocks de la oferta duplicada
      const duplicatedContentBlocksResult = await getOfferContentBlocks(duplicatedOffer.id);
      const duplicatedContentBlocks = duplicatedContentBlocksResult.success ? duplicatedContentBlocksResult.data || [] : [];

      const mappedOffer: StudioOffer = {
        id: duplicatedOffer.id,
        studio_id: duplicatedOffer.studio_id,
        name: duplicatedOffer.name,
        description: duplicatedOffer.description,
        objective: duplicatedOffer.objective as "presencial" | "virtual",
        slug: duplicatedOffer.slug,
        cover_media_url: duplicatedOffer.cover_media_url,
        cover_media_type: duplicatedOffer.cover_media_type as "image" | "video" | null,
        is_active: duplicatedOffer.is_active,
        created_at: duplicatedOffer.created_at,
        updated_at: duplicatedOffer.updated_at,
        landing_page: duplicatedOffer.landing_page
          ? {
            id: duplicatedOffer.landing_page.id,
            offer_id: duplicatedOffer.landing_page.offer_id,
            content_blocks: duplicatedContentBlocks,
            cta_config: duplicatedOffer.landing_page.cta_config as {
              buttons: Array<{
                id: string;
                text: string;
                variant: "primary" | "secondary" | "outline";
                position: "top" | "middle" | "bottom" | "floating";
                href?: string;
              }>;
            },
            created_at: duplicatedOffer.landing_page.created_at,
            updated_at: duplicatedOffer.landing_page.updated_at,
          }
          : undefined,
        leadform: duplicatedOffer.leadform
          ? {
            id: duplicatedOffer.leadform.id,
            offer_id: duplicatedOffer.leadform.offer_id,
            title: duplicatedOffer.leadform.title,
            description: duplicatedOffer.leadform.description,
            success_message: duplicatedOffer.leadform.success_message,
            success_redirect_url: duplicatedOffer.leadform.success_redirect_url,
            fields_config: duplicatedOffer.leadform.fields_config as {
              fields: Array<{
                id: string;
                type: string;
                label: string;
                required: boolean;
                placeholder?: string;
                options?: string[];
              }>;
            },
            created_at: duplicatedOffer.leadform.created_at,
            updated_at: duplicatedOffer.leadform.updated_at,
          }
          : undefined,
      };

      return { success: true, data: mappedOffer };
    });
  } catch (error) {
    console.error("[duplicateOffer] Error:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al duplicar la oferta" };
  }
}
