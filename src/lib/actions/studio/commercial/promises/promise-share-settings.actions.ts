"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export interface PromiseShareSettings {
  show_packages: boolean;
  show_categories_subtotals: boolean;
  show_items_prices: boolean;
  min_days_to_hire: number;
  show_standard_conditions: boolean;
  show_offer_conditions: boolean;
}

/**
 * Obtener preferencias de compartir para una promesa
 * Combina defaults del studio con overrides de la promesa
 */
export async function getPromiseShareSettings(
  studioSlug: string,
  promiseId: string
): Promise<{
  success: boolean;
  data?: PromiseShareSettings & {
    has_cotizacion: boolean;
    remember_preferences: boolean; // true si usa defaults del studio
  };
  error?: string;
}> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: {
        id: true,
        promise_share_default_show_packages: true,
        promise_share_default_show_categories_subtotals: true,
        promise_share_default_show_items_prices: true,
        promise_share_default_min_days_to_hire: true,
        promise_share_default_show_standard_conditions: true,
        promise_share_default_show_offer_conditions: true,
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
      select: {
        share_show_packages: true,
        share_show_categories_subtotals: true,
        share_show_items_prices: true,
        share_min_days_to_hire: true,
        share_show_standard_conditions: true,
        share_show_offer_conditions: true,
        quotes: {
          where: {
            archived: false,
          },
          select: {
            id: true,
          },
          take: 1,
        },
      },
    });

    if (!promise) {
      return { success: false, error: "Promesa no encontrada" };
    }

    const hasCotizacion = promise.quotes.length > 0;
    const rememberPreferences =
      promise.share_show_packages === null &&
      promise.share_show_categories_subtotals === null &&
      promise.share_show_items_prices === null &&
      promise.share_min_days_to_hire === null &&
      promise.share_show_standard_conditions === null &&
      promise.share_show_offer_conditions === null;

    // Usar overrides si existen, sino usar defaults del studio
    const settings: PromiseShareSettings = {
      show_packages: promise.share_show_packages ?? studio.promise_share_default_show_packages,
      show_categories_subtotals: promise.share_show_categories_subtotals ?? studio.promise_share_default_show_categories_subtotals,
      show_items_prices: promise.share_show_items_prices ?? studio.promise_share_default_show_items_prices,
      min_days_to_hire: promise.share_min_days_to_hire ?? studio.promise_share_default_min_days_to_hire,
      show_standard_conditions: promise.share_show_standard_conditions ?? studio.promise_share_default_show_standard_conditions,
      show_offer_conditions: promise.share_show_offer_conditions ?? studio.promise_share_default_show_offer_conditions,
    };

    return {
      success: true,
      data: {
        ...settings,
        has_cotizacion: hasCotizacion,
        remember_preferences: rememberPreferences,
      },
    };
  } catch (error) {
    console.error("[PROMISE_SHARE_SETTINGS] Error obteniendo settings:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al obtener preferencias",
    };
  }
}

/**
 * Actualizar preferencias de compartir para una promesa
 */
export async function updatePromiseShareSettings(
  studioSlug: string,
  promiseId: string,
  settings: {
    show_packages: boolean;
    show_categories_subtotals: boolean;
    show_items_prices: boolean;
    min_days_to_hire: number;
    show_standard_conditions: boolean;
    show_offer_conditions: boolean;
    remember_preferences: boolean;
  }
): Promise<{
  success: boolean;
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

    const promise = await prisma.studio_promises.findFirst({
      where: {
        id: promiseId,
        studio_id: studio.id,
      },
      select: { id: true },
    });

    if (!promise) {
      return { success: false, error: "Promesa no encontrada" };
    }

    if (settings.remember_preferences) {
      // Guardar en defaults del studio y limpiar overrides de la promesa
      await prisma.studios.update({
        where: { id: studio.id },
        data: {
          promise_share_default_show_packages: settings.show_packages,
          promise_share_default_show_categories_subtotals: settings.show_categories_subtotals,
          promise_share_default_show_items_prices: settings.show_items_prices,
          promise_share_default_min_days_to_hire: settings.min_days_to_hire,
          promise_share_default_show_standard_conditions: settings.show_standard_conditions,
          promise_share_default_show_offer_conditions: settings.show_offer_conditions,
        },
      });

      await prisma.studio_promises.update({
        where: { id: promiseId },
        data: {
          share_show_packages: null,
          share_show_categories_subtotals: null,
          share_show_items_prices: null,
          share_min_days_to_hire: null,
          share_show_standard_conditions: null,
          share_show_offer_conditions: null,
        },
      });
    } else {
      // Guardar como override específico de la promesa
      await prisma.studio_promises.update({
        where: { id: promiseId },
        data: {
          share_show_packages: settings.show_packages,
          share_show_categories_subtotals: settings.show_categories_subtotals,
          share_show_items_prices: settings.show_items_prices,
          share_min_days_to_hire: settings.min_days_to_hire,
          share_show_standard_conditions: settings.show_standard_conditions,
          share_show_offer_conditions: settings.show_offer_conditions,
        },
      });
    }

    revalidatePath(`/${studioSlug}/studio/commercial/promises/${promiseId}`);
    revalidatePath(`/${studioSlug}/promise/${promiseId}`);

    return { success: true };
  } catch (error) {
    console.error("[PROMISE_SHARE_SETTINGS] Error actualizando settings:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al actualizar preferencias",
    };
  }
}
