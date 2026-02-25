"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";

export interface PromiseShareSettings {
  show_packages: boolean;
  show_categories_subtotals: boolean;
  show_items_prices: boolean;
  min_days_to_hire: number;
  show_standard_conditions: boolean;
  show_offer_conditions: boolean;
  portafolios: boolean;
  allow_online_authorization: boolean;
  auto_generate_contract: boolean;
  allow_recalc: boolean;
  rounding_mode: 'exact' | 'charm';
}

/** Defaults del estudio + capacidad (para modal global desde Kanban). */
export interface StudioGlobalSettings extends PromiseShareSettings {
  max_events_per_day: number;
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
        promise_share_default_portafolios: true,
        promise_share_default_auto_generate_contract: true,
        promise_share_default_allow_online_authorization: true,
        promise_share_default_allow_recalc: true,
        promise_share_default_rounding_mode: true,
        max_events_per_day: true,
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
        share_portafolios: true,
        share_auto_generate_contract: true,
        share_allow_online_authorization: true,
        share_allow_recalc: true,
        share_rounding_mode: true,
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
      promise.share_show_offer_conditions === null &&
      promise.share_portafolios === null &&
      promise.share_auto_generate_contract === null &&
      promise.share_allow_online_authorization === null &&
      promise.share_allow_recalc === null &&
      promise.share_rounding_mode === null;

    // Usar overrides si existen, sino usar defaults del studio
    const settings: PromiseShareSettings = {
      show_packages: promise.share_show_packages ?? studio.promise_share_default_show_packages,
      show_categories_subtotals: promise.share_show_categories_subtotals ?? studio.promise_share_default_show_categories_subtotals,
      show_items_prices: promise.share_show_items_prices ?? studio.promise_share_default_show_items_prices,
      min_days_to_hire: promise.share_min_days_to_hire ?? studio.promise_share_default_min_days_to_hire,
      show_standard_conditions: promise.share_show_standard_conditions ?? studio.promise_share_default_show_standard_conditions,
      show_offer_conditions: promise.share_show_offer_conditions ?? studio.promise_share_default_show_offer_conditions,
      portafolios: promise.share_portafolios ?? studio.promise_share_default_portafolios,
      allow_online_authorization: promise.share_allow_online_authorization ?? studio.promise_share_default_allow_online_authorization,
      auto_generate_contract: promise.share_auto_generate_contract ?? studio.promise_share_default_auto_generate_contract,
      allow_recalc: promise.share_allow_recalc ?? studio.promise_share_default_allow_recalc,
      rounding_mode: (promise.share_rounding_mode ?? studio.promise_share_default_rounding_mode) === 'exact' ? 'exact' : 'charm',
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
    portafolios: boolean;
    allow_online_authorization: boolean;
    auto_generate_contract: boolean;
    allow_recalc: boolean;
    rounding_mode: 'exact' | 'charm';
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
          promise_share_default_portafolios: settings.portafolios,
          promise_share_default_auto_generate_contract: settings.auto_generate_contract,
          promise_share_default_allow_online_authorization: settings.allow_online_authorization,
          promise_share_default_allow_recalc: settings.allow_recalc,
          promise_share_default_rounding_mode: settings.rounding_mode,
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
          share_portafolios: null,
          share_auto_generate_contract: null,
          share_allow_online_authorization: null,
          share_allow_recalc: null,
          share_rounding_mode: null,
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
          share_portafolios: settings.portafolios,
          share_auto_generate_contract: settings.auto_generate_contract,
          share_allow_online_authorization: settings.allow_online_authorization,
          share_allow_recalc: settings.allow_recalc,
          share_rounding_mode: settings.rounding_mode,
        },
      });
    }

    revalidatePath(`/${studioSlug}/studio/commercial/promises/${promiseId}`);
    revalidatePath(`/${studioSlug}/promise/${promiseId}`);
    revalidateTag(`public-promise-${studioSlug}-${promiseId}`, 'max');
    revalidateTag(`public-promise-route-state-${studioSlug}-${promiseId}`, 'max');

    return { success: true };
  } catch (error) {
    console.error("[PROMISE_SHARE_SETTINGS] Error actualizando settings:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al actualizar preferencias",
    };
  }
}

/**
 * Obtener solo los defaults del estudio (para scope global desde Kanban).
 * Incluye max_events_per_day para capacidad y conflict resolution.
 */
export async function getStudioShareDefaults(studioSlug: string): Promise<{
  success: boolean;
  data?: StudioGlobalSettings;
  error?: string;
}> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: {
        promise_share_default_show_packages: true,
        promise_share_default_show_categories_subtotals: true,
        promise_share_default_show_items_prices: true,
        promise_share_default_min_days_to_hire: true,
        promise_share_default_show_standard_conditions: true,
        promise_share_default_show_offer_conditions: true,
        promise_share_default_portafolios: true,
        promise_share_default_auto_generate_contract: true,
        promise_share_default_allow_online_authorization: true,
        promise_share_default_allow_recalc: true,
        promise_share_default_rounding_mode: true,
        max_events_per_day: true,
      },
    });

    if (!studio) {
      return { success: false, error: "Studio no encontrado" };
    }

    const data: StudioGlobalSettings = {
      show_packages: studio.promise_share_default_show_packages,
      show_categories_subtotals: studio.promise_share_default_show_categories_subtotals,
      show_items_prices: studio.promise_share_default_show_items_prices,
      min_days_to_hire: studio.promise_share_default_min_days_to_hire,
      show_standard_conditions: studio.promise_share_default_show_standard_conditions ?? true,
      show_offer_conditions: studio.promise_share_default_show_offer_conditions ?? false,
      portafolios: studio.promise_share_default_portafolios ?? true,
      allow_online_authorization: studio.promise_share_default_allow_online_authorization ?? true,
      auto_generate_contract: studio.promise_share_default_auto_generate_contract ?? false,
      allow_recalc: studio.promise_share_default_allow_recalc ?? true,
      rounding_mode: studio.promise_share_default_rounding_mode === "exact" ? "exact" : "charm",
      max_events_per_day: studio.max_events_per_day ?? 1,
    };

    return { success: true, data };
  } catch (error) {
    console.error("[getStudioShareDefaults] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al obtener configuración del estudio",
    };
  }
}

/**
 * Actualizar defaults globales del estudio (scope global desde Kanban).
 * Solo escribe en studios; no toca promesas.
 */
export async function updateStudioGlobalSettings(
  studioSlug: string,
  settings: StudioGlobalSettings
): Promise<{ success: boolean; error?: string }> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return { success: false, error: "Studio no encontrado" };
    }

    const maxEvents = settings.max_events_per_day ?? 1;
    if (maxEvents < 1) {
      return { success: false, error: "max_events_per_day debe ser al menos 1" };
    }

    await prisma.studios.update({
      where: { id: studio.id },
      data: {
        promise_share_default_show_packages: settings.show_packages,
        promise_share_default_show_categories_subtotals: settings.show_categories_subtotals,
        promise_share_default_show_items_prices: settings.show_items_prices,
        promise_share_default_min_days_to_hire: settings.min_days_to_hire,
        promise_share_default_show_standard_conditions: settings.show_standard_conditions,
        promise_share_default_show_offer_conditions: settings.show_offer_conditions,
        promise_share_default_portafolios: settings.portafolios,
        promise_share_default_auto_generate_contract: settings.auto_generate_contract,
        promise_share_default_allow_online_authorization: settings.allow_online_authorization,
        promise_share_default_allow_recalc: settings.allow_recalc,
        promise_share_default_rounding_mode: settings.rounding_mode,
        max_events_per_day: maxEvents,
      },
    });

    revalidatePath(`/${studioSlug}/studio/commercial/promises`);
    return { success: true };
  } catch (error) {
    console.error("[updateStudioGlobalSettings] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al actualizar configuración",
    };
  }
}
