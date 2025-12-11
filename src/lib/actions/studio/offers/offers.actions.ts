"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
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
          slug: validatedData.slug,
          cover_media_url: validatedData.cover_media_url || null,
          cover_media_type: validatedData.cover_media_type || null,
          is_active: validatedData.is_active,
          is_permanent: validatedData.is_permanent,
          has_date_range: validatedData.has_date_range,
          start_date: validatedData.start_date || null,
          end_date: validatedData.end_date || null,
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
              use_event_types: validatedData.leadform.use_event_types,
              selected_event_type_ids: validatedData.leadform.selected_event_type_ids || null,
              show_packages_after_submit: validatedData.leadform.show_packages_after_submit,
              email_required: validatedData.leadform.email_required,
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

      // Asociar business_term si se proporcionó
      if (validatedData.business_term_id) {
        await prisma.studio_condiciones_comerciales.update({
          where: { id: validatedData.business_term_id },
          data: {
            offer_id: offer.id,
            type: 'offer',
          },
        });
      }

      const mappedOffer: StudioOffer = {
        id: offer.id,
        studio_id: offer.studio_id,
        name: offer.name,
        description: offer.description,
        slug: offer.slug,
        cover_media_url: offer.cover_media_url,
        cover_media_type: offer.cover_media_type as "image" | "video" | null,
        is_active: offer.is_active,
        is_permanent: offer.is_permanent,
        has_date_range: offer.has_date_range,
        start_date: offer.start_date,
        end_date: offer.end_date,
        created_at: offer.created_at,
        updated_at: offer.updated_at,
        business_term_id: validatedData.business_term_id || null,
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
            subject_options: offer.leadform.subject_options as string[] | undefined,
            use_event_types: (offer.leadform as any).use_event_types as boolean | undefined,
            selected_event_type_ids: offer.leadform.selected_event_type_ids as string[] | undefined,
            show_packages_after_submit: (offer.leadform as any).show_packages_after_submit as boolean | undefined,
            email_required: (offer.leadform as any).email_required as boolean | undefined,
            enable_interest_date: offer.leadform.enable_interest_date,
            validate_with_calendar: offer.leadform.validate_with_calendar,
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
        slug?: string;
        cover_media_url?: string | null;
        cover_media_type?: string | null;
        is_active?: boolean;
        is_permanent?: boolean;
        has_date_range?: boolean;
        start_date?: Date | null;
        end_date?: Date | null;
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
      if (validatedData.slug !== undefined) updateData.slug = validatedData.slug;
      // Siempre incluir cover_media_url y cover_media_type si están presentes en validatedData
      if ('cover_media_url' in validatedData)
        updateData.cover_media_url = validatedData.cover_media_url ?? null;
      if ('cover_media_type' in validatedData)
        updateData.cover_media_type = validatedData.cover_media_type ?? null;
      if (validatedData.is_active !== undefined)
        updateData.is_active = validatedData.is_active;
      if (validatedData.is_permanent !== undefined)
        updateData.is_permanent = validatedData.is_permanent;
      if (validatedData.has_date_range !== undefined)
        updateData.has_date_range = validatedData.has_date_range;
      if ('start_date' in validatedData)
        updateData.start_date = validatedData.start_date ?? null;
      if ('end_date' in validatedData)
        updateData.end_date = validatedData.end_date ?? null;

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
            use_event_types: validatedData.leadform.use_event_types,
            selected_event_type_ids: validatedData.leadform.selected_event_type_ids || null,
            show_packages_after_submit: validatedData.leadform.show_packages_after_submit,
            email_required: validatedData.leadform.email_required,
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
          business_term: {
            select: {
              id: true,
              name: true,
              description: true,
              discount_percentage: true,
              advance_percentage: true,
              type: true,
              override_standard: true,
            },
          },
        },
      });

      // Manejar business_term_id
      if ('business_term_id' in validatedData) {
        const businessTermId = validatedData.business_term_id;

        // Primero, desasociar cualquier condición comercial existente de esta oferta
        await prisma.studio_condiciones_comerciales.updateMany({
          where: { offer_id: offerId },
          data: { offer_id: null },
        });

        // Si hay un business_term_id, asociarlo a esta oferta
        if (businessTermId) {
          await prisma.studio_condiciones_comerciales.update({
            where: { id: businessTermId },
            data: {
              offer_id: offerId,
              type: 'offer',
            },
          });
        }
      }

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
        slug: offer.slug,
        cover_media_url: offer.cover_media_url,
        cover_media_type: offer.cover_media_type as "image" | "video" | null,
        is_active: offer.is_active,
        is_permanent: offer.is_permanent,
        has_date_range: offer.has_date_range,
        start_date: offer.start_date,
        end_date: offer.end_date,
        created_at: offer.created_at,
        updated_at: offer.updated_at,
        business_term_id: offer.business_term?.id || null,
        business_term: offer.business_term ? {
          id: offer.business_term.id,
          name: offer.business_term.name,
          description: offer.business_term.description,
          discount_percentage: offer.business_term.discount_percentage,
          advance_percentage: offer.business_term.advance_percentage,
          type: offer.business_term.type as 'standard' | 'offer',
          override_standard: offer.business_term.override_standard,
        } : undefined,
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
            subject_options: offer.leadform.subject_options as string[] | undefined,
            use_event_types: (offer.leadform as any).use_event_types as boolean | undefined,
            selected_event_type_ids: offer.leadform.selected_event_type_ids as string[] | undefined,
            show_packages_after_submit: (offer.leadform as any).show_packages_after_submit as boolean | undefined,
            email_required: (offer.leadform as any).email_required as boolean | undefined,
            enable_interest_date: offer.leadform.enable_interest_date,
            validate_with_calendar: offer.leadform.validate_with_calendar,
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
          business_term: {
            select: {
              id: true,
              name: true,
              description: true,
              discount_percentage: true,
              advance_percentage: true,
              type: true,
              override_standard: true,
            },
          },
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
        slug: offer.slug,
        cover_media_url: offer.cover_media_url,
        cover_media_type: offer.cover_media_type as "image" | "video" | null,
        is_permanent: offer.is_permanent,
        has_date_range: offer.has_date_range,
        start_date: offer.start_date,
        end_date: offer.end_date,
        is_active: offer.is_active,
        created_at: offer.created_at,
        updated_at: offer.updated_at,
        business_term_id: offer.business_term?.id || null,
        business_term: offer.business_term ? {
          id: offer.business_term.id,
          name: offer.business_term.name,
          description: offer.business_term.description,
          discount_percentage: offer.business_term.discount_percentage,
          advance_percentage: offer.business_term.advance_percentage,
          type: offer.business_term.type as 'standard' | 'offer',
          override_standard: offer.business_term.override_standard,
        } : undefined,
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
            subject_options: offer.leadform.subject_options as string[] | undefined,
            use_event_types: (offer.leadform as any).use_event_types as boolean | undefined,
            selected_event_type_ids: offer.leadform.selected_event_type_ids as string[] | undefined,
            show_packages_after_submit: (offer.leadform as any).show_packages_after_submit as boolean | undefined,
            email_required: (offer.leadform as any).email_required as boolean | undefined,
            enable_interest_date: offer.leadform.enable_interest_date,
            validate_with_calendar: offer.leadform.validate_with_calendar,
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
        slug: offer.slug,
        cover_media_url: offer.cover_media_url,
        cover_media_type: offer.cover_media_type as "image" | "video" | null,
        is_active: offer.is_active,
        is_permanent: offer.is_permanent,
        has_date_range: offer.has_date_range,
        start_date: offer.start_date,
        end_date: offer.end_date,
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
            subject_options: offer.leadform.subject_options as string[] | undefined,
            use_event_types: (offer.leadform as any).use_event_types as boolean | undefined,
            selected_event_type_ids: offer.leadform.selected_event_type_ids as string[] | undefined,
            show_packages_after_submit: (offer.leadform as any).show_packages_after_submit as boolean | undefined,
            email_required: (offer.leadform as any).email_required as boolean | undefined,
            enable_interest_date: offer.leadform.enable_interest_date,
            validate_with_calendar: offer.leadform.validate_with_calendar,
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
        orderBy: [
          { order: "asc" },
          { created_at: "desc" },
        ],
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
            slug: offer.slug,
            cover_media_url: offer.cover_media_url,
            cover_media_type: offer.cover_media_type as "image" | "video" | null,
            is_active: offer.is_active,
            is_permanent: offer.is_permanent,
            has_date_range: offer.has_date_range,
            start_date: offer.start_date,
            end_date: offer.end_date,
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
      const supabase = await createClient();
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
        select: {
          id: true,
          cover_media_url: true,
        },
      });

      if (!offer) {
        return { success: false, error: "Oferta no encontrada" };
      }

      // Obtener todos los media asociados antes de eliminar
      const allMedia = await prisma.studio_offer_media.findMany({
        where: { offer_id: offerId },
        select: {
          storage_path: true,
          thumbnail_url: true,
        },
      });

      // Preparar paths para eliminar de Supabase Storage
      const pathsToDelete: string[] = [];

      // Agregar portada si existe (extraer path de la URL)
      if (offer.cover_media_url) {
        try {
          const coverUrl = new URL(offer.cover_media_url);
          const coverPath = coverUrl.pathname.split('/storage/v1/object/public/media/')[1];
          if (coverPath) {
            pathsToDelete.push(coverPath);
            // Si es imagen, también puede tener thumbnail
            if (coverPath.includes('/images/')) {
              const thumbPath = coverPath.replace('/images/', '/thumbnails/');
              pathsToDelete.push(thumbPath);
            }
          }
        } catch (err) {
          console.warn('[deleteOffer] No se pudo extraer el path de la portada:', err);
        }
      }

      // Agregar todos los media de los content blocks (usar storage_path directamente)
      for (const media of allMedia) {
        if (media.storage_path) {
          pathsToDelete.push(media.storage_path);
          // Si tiene thumbnail, agregarlo también
          if (media.thumbnail_url && media.storage_path.includes('/images/')) {
            const thumbPath = media.storage_path.replace('/images/', '/thumbnails/');
            pathsToDelete.push(thumbPath);
          }
        }
      }

      // Eliminar archivos físicos de Supabase Storage
      if (pathsToDelete.length > 0) {
        const { error: storageError } = await supabase.storage
          .from("media")
          .remove(pathsToDelete);

        if (storageError) {
          console.warn("[deleteOffer] Error eliminando archivos de storage (continuando):", storageError);
        }
      }

      // Eliminar registro de la oferta (los media se eliminarán por CASCADE)
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
        slug: duplicatedOffer.slug,
        cover_media_url: duplicatedOffer.cover_media_url,
        cover_media_type: duplicatedOffer.cover_media_type as "image" | "video" | null,
        is_active: duplicatedOffer.is_active,
        is_permanent: duplicatedOffer.is_permanent,
        has_date_range: duplicatedOffer.has_date_range,
        start_date: duplicatedOffer.start_date,
        end_date: duplicatedOffer.end_date,
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

/**
 * Obtener studio ID por slug (helper para componentes)
 */
export async function getStudioIdBySlug(studioSlug: string): Promise<string | null> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    return studio?.id || null;
  } catch (error) {
    console.error("[getStudioIdBySlug] Error:", error);
    return null;
  }
}

/**
 * Reordenar ofertas
 */
export async function reorderOffers(
  studioSlug: string,
  offerIds: string[]
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

      if (!offerIds || offerIds.length === 0) {
        return { success: false, error: "No hay ofertas para reordenar" };
      }

      // Verificar que todas las ofertas existan y pertenezcan al studio
      const existingOffers = await prisma.studio_offers.findMany({
        where: {
          id: { in: offerIds },
          studio_id: studio.id,
        },
        select: { id: true },
      });

      if (existingOffers.length !== offerIds.length) {
        return { success: false, error: "Algunas ofertas no fueron encontradas" };
      }

      // Actualizar el orden de cada oferta usando transacción
      await prisma.$transaction(
        offerIds.map((id, index) =>
          prisma.studio_offers.update({
            where: { id },
            data: { order: index },
          })
        )
      );

      return { success: true };
    });
  } catch (error) {
    console.error("[reorderOffers] Error:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al reordenar las ofertas" };
  }
}

/**
 * Obtener ofertas públicas activas de un estudio para mostrar en el perfil público
 */
export async function getPublicActiveOffers(studioSlug: string) {
  try {
    return await retryDatabaseOperation(async () => {
      const studio = await prisma.studios.findUnique({
        where: { slug: studioSlug },
        select: { id: true },
      });

      if (!studio) {
        return { success: false, error: "Estudio no encontrado" };
      }

      const now = new Date();

      const offers = await prisma.studio_offers.findMany({
        where: {
          studio_id: studio.id,
          is_active: true,
          OR: [
            // Ofertas permanentes
            { is_permanent: true },
            // Ofertas con rango de fechas válido
            {
              has_date_range: true,
              start_date: { lte: now },
              end_date: { gte: now },
            },
          ],
        },
        select: {
          id: true,
          name: true,
          description: true,
          slug: true,
          cover_media_url: true,
          cover_media_type: true,
          is_permanent: true,
          has_date_range: true,
          start_date: true,
          end_date: true,
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      return {
        success: true,
        data: offers.map(offer => ({
          id: offer.id,
          name: offer.name,
          description: offer.description,
          slug: offer.slug,
          cover_media_url: offer.cover_media_url,
          cover_media_type: offer.cover_media_type as "image" | "video" | null,
          is_permanent: offer.is_permanent,
          has_date_range: offer.has_date_range,
          start_date: offer.start_date,
          end_date: offer.end_date,
        })),
      };
    });
  } catch (error) {
    console.error("[getPublicActiveOffers] Error:", error);
    return { success: false, error: "Error al obtener ofertas públicas" };
  }
}
