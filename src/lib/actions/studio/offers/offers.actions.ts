"use server";

import { revalidatePath, unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { retryDatabaseOperation } from "@/lib/actions/utils/database-retry";
import { z } from "zod";
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
import type { ContentBlock } from "@/types/content-blocks";

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
          business_term_id: validatedData.business_term_id || null,
          event_type_id: validatedData.leadform.event_type_id || null,
          banner_destination: validatedData.banner_destination || "LANDING_THEN_LEADFORM",
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
              event_type_id: validatedData.leadform.event_type_id || null,
              selected_event_type_ids: validatedData.leadform.selected_event_type_ids || null,
              show_packages_after_submit: validatedData.leadform.show_packages_after_submit,
              email_required: validatedData.leadform.email_required,
              enable_interest_date: validatedData.leadform.enable_interest_date,
              validate_with_calendar: validatedData.leadform.validate_with_calendar,
              enable_event_name: validatedData.leadform.enable_event_name,
              event_name_required: validatedData.leadform.event_name_required,
              enable_event_duration: validatedData.leadform.enable_event_duration,
              event_duration_required: validatedData.leadform.event_duration_required,
            },
          },
        },
        include: {
          landing_page: true,
          leadform: true,
          business_term: true,
          event_type: true,
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

      // Verificar que la condición comercial exista y pertenezca al studio
      // NOTA: No modificamos la tabla de condiciones comerciales
      // Una condición puede ser usada por múltiples ofertas simultáneamente
      if (validatedData.business_term_id) {
        const businessTerm = await prisma.studio_condiciones_comerciales.findFirst({
          where: {
            id: validatedData.business_term_id,
            studio_id: studio.id,
          },
        });

        if (!businessTerm) {
          return {
            success: false,
            error: "Condición comercial no encontrada o no pertenece a este estudio",
          };
        }
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
        business_term_id: offer.business_term_id,
        event_type_id: offer.event_type_id,
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
            event_type_id: (offer.leadform as any).event_type_id as string | undefined,
            selected_event_type_ids: offer.leadform.selected_event_type_ids as string[] | undefined,
            show_packages_after_submit: (offer.leadform as any).show_packages_after_submit as boolean | undefined,
            email_required: (offer.leadform as any).email_required as boolean | undefined,
            enable_interest_date: offer.leadform.enable_interest_date,
            validate_with_calendar: offer.leadform.validate_with_calendar,
            enable_event_name: (offer.leadform as any).enable_event_name as boolean | undefined,
            event_name_required: (offer.leadform as any).event_name_required as boolean | undefined,
            enable_event_duration: (offer.leadform as any).enable_event_duration as boolean | undefined,
            event_duration_required: (offer.leadform as any).event_duration_required as boolean | undefined,
            created_at: offer.leadform.created_at,
            updated_at: offer.leadform.updated_at,
          }
          : undefined,
      };

      // ⚠️ CACHE: Invalidar caché del perfil público
      // import { revalidateTag } from 'next/cache';
      // revalidatePath(`/${studioSlug}`); // Ya existe arriba
      // revalidateTag(`studio-profile-offers-${studioSlug}`);

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
        business_term_id?: string | null;
        event_type_id?: string | null;
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
            use_event_types?: boolean;
            event_type_id?: string | null;
            selected_event_type_ids?: unknown;
            show_packages_after_submit?: boolean;
            email_required?: boolean;
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
      // Solo actualizar campos que están explícitamente presentes en data (no defaults de Zod)
      if ('is_active' in data)
        updateData.is_active = validatedData.is_active;
      if ('is_permanent' in data)
        updateData.is_permanent = validatedData.is_permanent;
      if ('has_date_range' in data)
        updateData.has_date_range = validatedData.has_date_range;
      if ('start_date' in data)
        updateData.start_date = validatedData.start_date ?? null;
      if ('end_date' in data)
        updateData.end_date = validatedData.end_date ?? null;
      if ('business_term_id' in validatedData)
        updateData.business_term_id = validatedData.business_term_id ?? null;
      if (validatedData.leadform?.event_type_id !== undefined)
        updateData.event_type_id = validatedData.leadform.event_type_id ?? null;
      if ('banner_destination' in validatedData)
        updateData.banner_destination = validatedData.banner_destination || "LANDING_THEN_LEADFORM";

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
            event_type_id: validatedData.leadform.event_type_id || null,
            selected_event_type_ids: validatedData.leadform.selected_event_type_ids || null,
            show_packages_after_submit: validatedData.leadform.show_packages_after_submit,
            email_required: validatedData.leadform.email_required,
            enable_interest_date: validatedData.leadform.enable_interest_date,
            validate_with_calendar: validatedData.leadform.validate_with_calendar,
            enable_event_name: validatedData.leadform.enable_event_name,
            event_name_required: validatedData.leadform.event_name_required,
            enable_event_duration: validatedData.leadform.enable_event_duration,
            event_duration_required: validatedData.leadform.event_duration_required,
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
          event_type: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Validar business_term_id si se proporcionó
      if ('business_term_id' in validatedData && validatedData.business_term_id) {
        const businessTerm = await prisma.studio_condiciones_comerciales.findFirst({
          where: {
            id: validatedData.business_term_id,
            studio_id: studio.id,
          },
        });

        if (!businessTerm) {
          return { success: false, error: "Condición comercial no encontrada o no pertenece a este estudio" };
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
        business_term_id: offer.business_term_id,
        event_type_id: offer.event_type_id,
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
            event_type_id: (offer.leadform as any).event_type_id as string | undefined,
            selected_event_type_ids: offer.leadform.selected_event_type_ids as string[] | undefined,
            show_packages_after_submit: (offer.leadform as any).show_packages_after_submit as boolean | undefined,
            email_required: (offer.leadform as any).email_required as boolean | undefined,
            enable_interest_date: offer.leadform.enable_interest_date,
            validate_with_calendar: offer.leadform.validate_with_calendar,
            enable_event_name: (offer.leadform as any).enable_event_name as boolean | undefined,
            event_name_required: (offer.leadform as any).event_name_required as boolean | undefined,
            enable_event_duration: (offer.leadform as any).enable_event_duration as boolean | undefined,
            event_duration_required: (offer.leadform as any).event_duration_required as boolean | undefined,
            created_at: offer.leadform.created_at,
            updated_at: offer.leadform.updated_at,
          }
          : undefined,
      };

      // Revalidar perfil público y página de oferta cuando se actualiza is_active
      if (validatedData.is_active !== undefined) {
        revalidatePath(`/${studioSlug}`);
        revalidatePath(`/${studioSlug}/offer/${mappedOffer.slug}`);
      }

      return { success: true, data: mappedOffer };
    });
  } catch (error) {
    console.error("[updateOffer] Error:", error);
    if (error instanceof z.ZodError) {
      console.error("[updateOffer] Validation errors:", error.errors);
      return { success: false, error: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') };
    }
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
        banner_destination: (offer.banner_destination as "LEADFORM_ONLY" | "LANDING_THEN_LEADFORM" | "LEADFORM_WITH_LANDING") || "LANDING_THEN_LEADFORM",
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
            event_type_id: (offer.leadform as any).event_type_id as string | undefined,
            selected_event_type_ids: offer.leadform.selected_event_type_ids as string[] | undefined,
            show_packages_after_submit: (offer.leadform as any).show_packages_after_submit as boolean | undefined,
            email_required: (offer.leadform as any).email_required as boolean | undefined,
            enable_interest_date: offer.leadform.enable_interest_date,
            validate_with_calendar: offer.leadform.validate_with_calendar,
            enable_event_name: (offer.leadform as any).enable_event_name as boolean | undefined,
            event_name_required: (offer.leadform as any).event_name_required as boolean | undefined,
            enable_event_duration: (offer.leadform as any).enable_event_duration as boolean | undefined,
            event_duration_required: (offer.leadform as any).event_duration_required as boolean | undefined,
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
 * ⚠️ STREAMING: Get basic public offer data (instantáneo)
 * Solo datos básicos: oferta + studio + landing_page básico (sin content blocks)
 */
export async function getPublicOfferBasicData(
  offerIdentifier: string,
  studioSlug: string
): Promise<{
  success: boolean;
  data?: {
    offer: {
      id: string;
      studio_id: string;
      name: string;
      description: string | null;
      slug: string;
      cover_media_url: string | null;
      cover_media_type: string | null;
      banner_destination: "LEADFORM_ONLY" | "LANDING_THEN_LEADFORM" | "LEADFORM_WITH_LANDING";
      landing_page: {
        id: string;
        offer_id: string;
        cta_config: {
          buttons: Array<{
            id: string;
            text: string;
            variant: "primary" | "secondary" | "outline";
            position: "top" | "middle" | "bottom" | "floating";
            href?: string;
          }>;
        };
      } | null;
      leadform: {
        id: string;
        offer_id: string;
        title: string | null;
        description: string | null;
        success_message: string;
        success_redirect_url: string | null;
        fields_config: {
          fields: Array<{
            id: string;
            type: string;
            label: string;
            required: boolean;
            placeholder?: string;
            options?: string[];
          }>;
        };
        event_type_id: string | null;
        event_type_name: string | null; // Nombre del tipo de evento (para evitar llamada adicional)
        enable_interest_date: boolean;
        validate_with_calendar: boolean;
        email_required: boolean | null;
        enable_event_name: boolean;
        event_name_required: boolean;
        enable_event_duration: boolean;
        event_duration_required: boolean;
        show_packages_after_submit: boolean;
      } | null;
      business_term: {
        id: string;
        name: string;
        description: string | null;
        discount_percentage: number | null;
        advance_percentage: number | null;
        advance_type: string | null;
        advance_amount: number | null;
      } | null;
    };
    studio: {
      id: string;
      studio_name: string;
      slogan: string | null;
      logo_url: string | null;
      gtm_id: string | null;
      facebook_pixel_id: string | null;
      representative_name: string | null;
      phone: string | null;
      email: string | null;
      address: string | null;
    };
  };
  error?: string;
}> {
  try {
    return await retryDatabaseOperation(async () => {
      const studio = await prisma.studios.findUnique({
        where: { slug: studioSlug },
        select: {
          id: true,
          studio_name: true,
          slogan: true,
          logo_url: true,
          gtm_id: true,
          facebook_pixel_id: true,
          representative_name: true,
          phone: true,
          email: true,
          address: true,
        },
      });

      if (!studio) {
        return { success: false, error: "Estudio no encontrado" };
      }

      // Buscar oferta por ID o slug
      let offer = await prisma.studio_offers.findFirst({
        where: {
          id: offerIdentifier,
          studio_id: studio.id,
          is_active: true,
        },
        select: {
          id: true,
          studio_id: true,
          name: true,
          description: true,
          slug: true,
          cover_media_url: true,
          cover_media_type: true,
          banner_destination: true,
          landing_page: {
            select: {
              id: true,
              offer_id: true,
              cta_config: true,
            },
          },
          leadform: {
            select: {
              id: true,
              offer_id: true,
              title: true,
              description: true,
              success_message: true,
              success_redirect_url: true,
              fields_config: true,
              event_type_id: true,
              enable_interest_date: true,
              validate_with_calendar: true,
              email_required: true,
              enable_event_name: true,
              event_name_required: true,
              enable_event_duration: true,
              event_duration_required: true,
              show_packages_after_submit: true,
              event_type: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          business_term: {
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
          select: {
            id: true,
            studio_id: true,
            name: true,
            description: true,
            slug: true,
            cover_media_url: true,
            cover_media_type: true,
            banner_destination: true,
            landing_page: {
              select: {
                id: true,
                offer_id: true,
                cta_config: true,
              },
            },
            leadform: {
              select: {
                id: true,
                offer_id: true,
                title: true,
                description: true,
                success_message: true,
                success_redirect_url: true,
                fields_config: true,
                event_type_id: true,
                enable_interest_date: true,
                validate_with_calendar: true,
                email_required: true,
                enable_event_name: true,
                event_name_required: true,
                enable_event_duration: true,
                event_duration_required: true,
                show_packages_after_submit: true,
              },
            },
            business_term: {
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
          },
        });
      }

      if (!offer) {
        return { success: false, error: "Oferta no encontrada" };
      }

      return {
        success: true,
        data: {
          offer: {
            id: offer.id,
            studio_id: offer.studio_id,
            name: offer.name,
            description: offer.description,
            slug: offer.slug,
            cover_media_url: offer.cover_media_url,
            cover_media_type: offer.cover_media_type,
            banner_destination: (offer.banner_destination as "LEADFORM_ONLY" | "LANDING_THEN_LEADFORM" | "LEADFORM_WITH_LANDING") || "LANDING_THEN_LEADFORM",
            landing_page: offer.landing_page ? {
              id: offer.landing_page.id,
              offer_id: offer.landing_page.offer_id,
              cta_config: offer.landing_page.cta_config as {
                buttons: Array<{
                  id: string;
                  text: string;
                  variant: "primary" | "secondary" | "outline";
                  position: "top" | "middle" | "bottom" | "floating";
                  href?: string;
                }>;
              },
            } : null,
            leadform: offer.leadform ? {
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
              event_type_id: offer.leadform.event_type_id,
              event_type_name: (offer.leadform as any).event_type?.name || null,
              enable_interest_date: offer.leadform.enable_interest_date,
              validate_with_calendar: offer.leadform.validate_with_calendar,
              email_required: offer.leadform.email_required,
              enable_event_name: (offer.leadform as any).enable_event_name || false,
              event_name_required: (offer.leadform as any).event_name_required || false,
              enable_event_duration: (offer.leadform as any).enable_event_duration || false,
              event_duration_required: (offer.leadform as any).event_duration_required || false,
              show_packages_after_submit: (offer.leadform as any).show_packages_after_submit || false,
            } : null,
            business_term: offer.business_term ? {
              id: offer.business_term.id,
              name: offer.business_term.name,
              description: offer.business_term.description,
              discount_percentage: offer.business_term.discount_percentage,
              advance_percentage: offer.business_term.advance_percentage,
              advance_type: offer.business_term.advance_type,
              advance_amount: offer.business_term.advance_amount,
            } : null,
          },
          studio: {
            id: studio.id,
            studio_name: studio.studio_name,
            slogan: studio.slogan,
            logo_url: studio.logo_url,
            gtm_id: studio.gtm_id,
            facebook_pixel_id: studio.facebook_pixel_id,
          },
        },
      };
    });
  } catch (error) {
    console.error("[getPublicOfferBasicData] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al obtener la oferta",
    };
  }
}

/**
 * ⚠️ METADATA LIGERA: Solo campos esenciales para SEO
 * Elimina la doble carga en generateMetadata
 */
export async function getPublicOfferMetadata(
  offerIdentifier: string,
  studioSlug: string
): Promise<{
  success: boolean;
  data?: {
    offer_name: string;
    offer_description: string | null;
    studio_name: string;
    logo_url: string | null;
  };
  error?: string;
}> {
  try {
    return await retryDatabaseOperation(async () => {
      const studio = await prisma.studios.findUnique({
        where: { slug: studioSlug },
        select: {
          id: true,
          studio_name: true,
          logo_url: true,
        },
      });

      if (!studio) {
        return { success: false, error: "Estudio no encontrado" };
      }

      // Buscar oferta por ID o slug
      let offer = await prisma.studio_offers.findFirst({
        where: {
          id: offerIdentifier,
          studio_id: studio.id,
          is_active: true,
        },
        select: {
          name: true,
          description: true,
        },
      });

      if (!offer) {
        offer = await prisma.studio_offers.findFirst({
          where: {
            slug: offerIdentifier,
            studio_id: studio.id,
            is_active: true,
          },
          select: {
            name: true,
            description: true,
          },
        });
      }

      if (!offer) {
        return { success: false, error: "Oferta no encontrada" };
      }

      return {
        success: true,
        data: {
          offer_name: offer.name,
          offer_description: offer.description,
          studio_name: studio.studio_name,
          logo_url: studio.logo_url,
        },
      };
    });
  } catch (error) {
    console.error("[getPublicOfferMetadata] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al obtener metadata",
    };
  }
}

/**
 * ⚠️ STREAMING: Get deferred content blocks (pesados, optimizado)
 * Rompe el JOIN profundo en queries planas paralelas
 */
export async function getPublicOfferDeferredContentBlocks(
  offerId: string
): Promise<{
  success: boolean;
  data?: ContentBlock[];
  error?: string;
}> {
  try {
    return await retryDatabaseOperation(async () => {
      // Query 1: Content blocks básicos (sin media)
      const blocks = await prisma.studio_offer_content_blocks.findMany({
        where: { offer_id: offerId },
        select: {
          id: true,
          type: true,
          title: true,
          description: true,
          presentation: true,
          config: true,
          order: true,
        },
        orderBy: { order: 'asc' },
      });

      if (blocks.length === 0) {
        return { success: true, data: [] };
      }

      // Query 2: Block media (paralela)
      const blockIds = blocks.map(b => b.id);
      const blockMedia = await prisma.studio_offer_content_block_media.findMany({
        where: { content_block_id: { in: blockIds } },
        select: {
          id: true,
          content_block_id: true,
          order: true,
          media_id: true,
        },
        orderBy: { order: 'asc' },
      });

      // Query 3: Media files (paralela)
      const mediaIds = blockMedia.map(bm => bm.media_id).filter((id): id is string => Boolean(id));
      const mediaFiles = mediaIds.length > 0
        ? await prisma.studio_offer_media.findMany({
            where: { id: { in: mediaIds } },
            select: {
              id: true,
              file_url: true,
              file_type: true,
              filename: true,
              storage_path: true,
              storage_bytes: true,
              thumbnail_url: true,
              display_order: true,
            },
          })
        : [];

      // Mapear media por ID
      const mediaMap = new Map(mediaFiles.map(m => [m.id, m]));

      // Construir block media por content block
      const blockMediaByBlock = new Map<string, typeof blockMedia>();
      blockMedia.forEach(bm => {
        if (!blockMediaByBlock.has(bm.content_block_id)) {
          blockMediaByBlock.set(bm.content_block_id, []);
        }
        blockMediaByBlock.get(bm.content_block_id)!.push(bm);
      });

      // Mapear content blocks con media
      return {
        success: true,
        data: blocks.map(block => {
          const blockMediaList = blockMediaByBlock.get(block.id) || [];
          return {
            id: block.id,
            type: block.type as ContentBlock['type'],
            title: block.title || undefined,
            description: block.description || undefined,
            presentation: block.presentation as ContentBlock['presentation'],
            order: block.order,
            config: (block.config as Record<string, unknown>) || undefined,
            media: blockMediaList.map(bm => {
              const media = mediaMap.get(bm.media_id);
              return media ? {
                id: media.id,
                file_url: media.file_url,
                file_type: media.file_type as 'image' | 'video',
                filename: media.filename,
                storage_path: media.storage_path,
                storage_bytes: Number(media.storage_bytes),
                thumbnail_url: media.thumbnail_url || undefined,
                display_order: bm.order,
              } : null;
            }).filter((m): m is NonNullable<typeof m> => m !== null),
          };
        }),
      };
    });
  } catch (error) {
    console.error("[getPublicOfferDeferredContentBlocks] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al obtener content blocks",
    };
  }
}

/**
 * Obtener oferta pública por slug o ID (para landing page pública)
 * @deprecated Use getPublicOfferBasicData + getPublicOfferDeferredContentBlocks instead
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
          business_term: {
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
            business_term: {
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
        business_term: offer.business_term ? {
          id: offer.business_term.id,
          name: offer.business_term.name,
          description: offer.business_term.description,
          discount_percentage: offer.business_term.discount_percentage,
          advance_percentage: offer.business_term.advance_percentage,
          advance_type: (offer.business_term as any).advance_type || 'percentage',
          advance_amount: (offer.business_term as any).advance_amount || null,
          type: 'offer' as const,
          override_standard: false,
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
            event_type_id: (offer.leadform as any).event_type_id as string | undefined,
            selected_event_type_ids: offer.leadform.selected_event_type_ids as string[] | undefined,
            show_packages_after_submit: (offer.leadform as any).show_packages_after_submit as boolean | undefined,
            email_required: (offer.leadform as any).email_required as boolean | undefined,
            enable_interest_date: offer.leadform.enable_interest_date,
            validate_with_calendar: offer.leadform.validate_with_calendar,
            enable_event_name: (offer.leadform as any).enable_event_name as boolean | undefined,
            event_name_required: (offer.leadform as any).event_name_required as boolean | undefined,
            enable_event_duration: (offer.leadform as any).enable_event_duration as boolean | undefined,
            event_duration_required: (offer.leadform as any).event_duration_required as boolean | undefined,
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
            business_term_id: offer.business_term_id,
            banner_destination: (offer.banner_destination as "LEADFORM_ONLY" | "LANDING_THEN_LEADFORM" | "LEADFORM_WITH_LANDING") || "LANDING_THEN_LEADFORM",
            business_term: offer.business_term
              ? {
                id: offer.business_term.id,
                name: offer.business_term.name,
                description: offer.business_term.description,
                discount_percentage: offer.business_term.discount_percentage,
                advance_percentage: offer.business_term.advance_percentage,
                type: offer.business_term.type as "standard" | "offer",
                override_standard: offer.business_term.override_standard,
              }
              : undefined,
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
 * Archivar oferta (desactivar)
 */
export async function archiveOffer(
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

      await prisma.studio_offers.update({
        where: { id: offerId },
        data: { is_active: false },
      });

      revalidatePath(`/${studioSlug}/studio/commercial/ofertas`);
      revalidatePath(`/${studioSlug}`);
      revalidatePath(`/${studioSlug}/offer/${offer.slug}`);

      // ⚠️ CACHE: Invalidar caché del perfil público
      // import { revalidateTag } from 'next/cache';
      // revalidateTag(`studio-profile-offers-${studioSlug}`);

      return { success: true };
    });
  } catch (error) {
    console.error("[archiveOffer] Error:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al archivar la oferta" };
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
          slug: true,
        },
      });

      if (!offer) {
        return { success: false, error: "Oferta no encontrada" };
      }

      // Verificar si tiene promesas asociadas
      const promisesCount = await prisma.studio_promises.count({
        where: {
          offer_id: offerId,
        },
      });

      if (promisesCount > 0) {
        return {
          success: false,
          error: `No se puede eliminar la oferta porque tiene ${promisesCount} promesa${promisesCount > 1 ? 's' : ''} asociada${promisesCount > 1 ? 's' : ''}. Puedes archivarla en su lugar.`,
        };
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

      revalidatePath(`/${studioSlug}/studio/commercial/ofertas`);
      revalidatePath(`/${studioSlug}`);
      revalidatePath(`/${studioSlug}/offer/${offer.slug}`);

      // ⚠️ CACHE: Invalidar caché del perfil público
      // import { revalidateTag } from 'next/cache';
      // revalidateTag(`studio-profile-offers-${studioSlug}`);

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
 * ⚠️ CACHE: Cacheado con tag por studio para invalidación granular
 */
export async function getPublicActiveOffers(studioSlug: string) {
  try {
    // ⚠️ CACHE: Cachear ofertas con tag por studio
    const getCachedOffers = unstable_cache(
      async () => {
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
          business_term: {
            select: {
              discount_percentage: true,
              description: true,
            },
          },
          leadform: {
            select: {
              event_type_id: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      // Obtener event_type_ids únicos
      const eventTypeIds = offers
        .map(o => o.leadform?.event_type_id)
        .filter((id): id is string => Boolean(id));

      // Fetch event types si hay IDs
      const eventTypesMap = new Map<string, string>();
      if (eventTypeIds.length > 0) {
        const eventTypes = await prisma.studio_event_types.findMany({
          where: { id: { in: eventTypeIds } },
          select: { id: true, name: true },
        });
        eventTypes.forEach(et => eventTypesMap.set(et.id, et.name));
      }

      return {
        success: true,
        data: offers.map(offer => ({
          id: offer.id,
          name: offer.name,
          description: offer.business_term?.description ?? offer.description,
          slug: offer.slug,
          cover_media_url: offer.cover_media_url,
          cover_media_type: offer.cover_media_type as "image" | "video" | null,
          discount_percentage: offer.business_term?.discount_percentage ?? null,
          is_permanent: offer.is_permanent,
          has_date_range: offer.has_date_range,
          start_date: offer.start_date,
          valid_until: offer.end_date,
          event_type_name: offer.leadform?.event_type_id
            ? eventTypesMap.get(offer.leadform.event_type_id) ?? null
            : null,
        })),
      };
        });
      },
      ['studio-profile-offers', studioSlug],
      {
        tags: [`studio-profile-offers-${studioSlug}`],
        revalidate: 300, // 5 minutos para ofertas (cambian más frecuentemente)
      }
    );

    return await getCachedOffers();
  } catch (error) {
    console.error("[getPublicActiveOffers] Error:", error);
    return { success: false, error: "Error al obtener ofertas públicas" };
  }
}
