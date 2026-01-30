'use server';

import { prisma } from '@/lib/prisma';
import { withRetry } from '@/lib/database/retry-helper';
import { headers } from 'next/headers';
import { trackContentEvent } from '@/lib/actions/studio/analytics/analytics.actions';

/**
 * Trackear visita a página de promesa pública
 * Solo trackea si NO es preview mode
 *
 * IMPORTANTE: Esta acción (y trackContentEvent) NUNCA deben llamar a revalidatePath
 * ni revalidateTag. Se ejecutan al cargar la vista y causarían un bucle infinito de refresco.
 */
export async function trackPromisePageView(
  studioId: string,
  promiseId: string,
  sessionId: string,
  isPreview: boolean = false
) {
  // eslint-disable-next-line no-console -- DEBUG: identificar bucle de POST (quitar en producción)
  console.log('🚀 Ejecutando Action: trackPromisePageView');
  if (isPreview) {
    return { success: true, skipped: true, reason: 'preview_mode' };
  }

  // Validar parámetros
  if (!studioId || studioId.trim() === '') {
    console.error('[trackPromisePageView] Invalid studioId:', studioId);
    return { success: false, error: 'Invalid studioId' };
  }

  if (!promiseId || promiseId.trim() === '') {
    console.error('[trackPromisePageView] Invalid promiseId:', promiseId);
    return { success: false, error: 'Invalid promiseId' };
  }

  if (!sessionId || sessionId.trim() === '') {
    console.error('[trackPromisePageView] Invalid sessionId:', sessionId);
    return { success: false, error: 'Invalid sessionId' };
  }

  try {
    const headersList = await headers();
    const ip_address = headersList.get('x-forwarded-for')?.split(',')[0] ||
      headersList.get('x-real-ip') ||
      'unknown';

    const result = await trackContentEvent({
      studioId,
      contentType: 'PROMISE',
      contentId: promiseId,
      eventType: 'PAGE_VIEW',
      sessionId,
      metadata: {
        promise_id: promiseId,
        is_preview: false,
        ip_address,
      },
    });

    if (!result.success) {
      console.error('[trackPromisePageView] trackContentEvent failed:', result.error);
    }

    return result;
  } catch (error) {
    console.error('[trackPromisePageView] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Trackear click en cotización
 */
export async function trackCotizacionClick(
  studioId: string,
  promiseId: string,
  cotizacionId: string,
  cotizacionName: string,
  sessionId: string
) {
  // Validar parámetros
  if (!studioId || studioId.trim() === '') {
    console.error('[trackCotizacionClick] Invalid studioId:', studioId);
    return { success: false, error: 'Invalid studioId' };
  }

  if (!promiseId || promiseId.trim() === '') {
    console.error('[trackCotizacionClick] Invalid promiseId:', promiseId);
    return { success: false, error: 'Invalid promiseId' };
  }

  if (!sessionId || sessionId.trim() === '') {
    console.error('[trackCotizacionClick] Invalid sessionId:', sessionId);
    return { success: false, error: 'Invalid sessionId' };
  }

  try {
    const result = await trackContentEvent({
      studioId,
      contentType: 'PROMISE',
      contentId: promiseId,
      eventType: 'COTIZACION_CLICK',
      sessionId,
      metadata: {
        cotizacion_id: cotizacionId,
        cotizacion_name: cotizacionName,
        promise_id: promiseId,
      },
    });

    if (!result.success) {
      console.error('[trackCotizacionClick] trackContentEvent failed:', result.error);
    }

    return result;
  } catch (error) {
    console.error('[trackCotizacionClick] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Trackear click en paquete
 */
export async function trackPaqueteClick(
  studioId: string,
  promiseId: string,
  paqueteId: string,
  paqueteName: string,
  sessionId: string
) {
  // Validar parámetros
  if (!studioId || studioId.trim() === '') {
    console.error('[trackPaqueteClick] Invalid studioId:', studioId);
    return { success: false, error: 'Invalid studioId' };
  }

  if (!promiseId || promiseId.trim() === '') {
    console.error('[trackPaqueteClick] Invalid promiseId:', promiseId);
    return { success: false, error: 'Invalid promiseId' };
  }

  if (!sessionId || sessionId.trim() === '') {
    console.error('[trackPaqueteClick] Invalid sessionId:', sessionId);
    return { success: false, error: 'Invalid sessionId' };
  }

  try {
    const result = await trackContentEvent({
      studioId,
      contentType: 'PROMISE',
      contentId: promiseId,
      eventType: 'PAQUETE_CLICK',
      sessionId,
      metadata: {
        paquete_id: paqueteId,
        paquete_name: paqueteName,
        promise_id: promiseId,
      },
    });

    if (!result.success) {
      console.error('[trackPaqueteClick] trackContentEvent failed:', result.error);
    }

    return result;
  } catch (error) {
    console.error('[trackPaqueteClick] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Obtener estadísticas de visitas a una promesa
 * Optimizado: Usa agregaciones SQL y limita resultados
 */
export async function getPromiseViewStats(promiseId: string) {
  try {
    // Optimizado: Limitar a últimos 500 registros para evitar queries lentas
    const allViews = await withRetry(
      () => prisma.studio_content_analytics.findMany({
      where: {
        content_type: 'PROMISE',
        content_id: promiseId,
        event_type: 'PAGE_VIEW',
      },
      orderBy: {
        created_at: 'desc',
      },
      take: 500, // Reducido de 1000 a 500 para mejor performance
      select: {
        created_at: true,
        ip_address: true,
        user_agent: true,
        metadata: true,
      },
    }),
      { maxRetries: 3, baseDelay: 1000, maxDelay: 5000 }
    );

    // Filtrar visitas que NO son preview
    const realViews = allViews.filter((view) => {
      const metadata = view.metadata as Record<string, unknown> | null;
      // Excluir si is_preview es explícitamente true
      return !metadata || metadata.is_preview !== true;
    });

    // Calcular estadísticas
    const totalViews = realViews.length;
    const uniqueIPs = new Set(realViews.map(v => v.ip_address).filter(Boolean));
    const uniqueViews = uniqueIPs.size;
    const lastView = realViews[0]?.created_at || null;
    const recentViews = realViews.slice(0, 10).map((v) => ({
      date: v.created_at,
      ip: v.ip_address || 'unknown',
      userAgent: v.user_agent || null,
    }));

    return {
      success: true,
      data: {
        totalViews,
        uniqueViews,
        lastView,
        recentViews,
      },
    };
  } catch (error) {
    console.error('[getPromiseViewStats] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener estadísticas de visitas',
      data: {
        totalViews: 0,
        uniqueViews: 0,
        lastView: null,
        recentViews: [],
      },
    };
  }
}

/**
 * Obtener estadísticas de clicks en cotizaciones de una promesa
 * Optimizado: Limita resultados y ordena por fecha
 */
export async function getCotizacionClickStats(promiseId: string) {
  try {
    // Optimizado: Limitar a últimos 2000 clicks para evitar queries lentas
    const clicks = await prisma.studio_content_analytics.findMany({
      where: {
        content_type: 'PROMISE',
        content_id: promiseId,
        event_type: 'COTIZACION_CLICK',
      },
      orderBy: {
        created_at: 'desc',
      },
      take: 2000, // Limitar a últimos 2000 clicks
      select: {
        metadata: true,
        created_at: true,
      },
    });

    // Agrupar por cotizacion_id
    const statsByCotizacion = clicks.reduce((acc, click) => {
      const metadata = click.metadata as Record<string, unknown>;
      const cotizacionId = metadata?.cotizacion_id as string;
      if (!cotizacionId) return acc;

      if (!acc[cotizacionId]) {
        acc[cotizacionId] = {
          cotizacionId,
          cotizacionName: (metadata?.cotizacion_name as string) || 'Sin nombre',
          clicks: 0,
          lastClick: null,
        };
      }

      acc[cotizacionId].clicks++;
      if (!acc[cotizacionId].lastClick || click.created_at > acc[cotizacionId].lastClick!) {
        acc[cotizacionId].lastClick = click.created_at;
      }

      return acc;
    }, {} as Record<string, { cotizacionId: string; cotizacionName: string; clicks: number; lastClick: Date | null }>);

    return {
      success: true,
      data: Object.values(statsByCotizacion),
    };
  } catch (error) {
    console.error('[getCotizacionClickStats] Error:', error);
    return {
      success: false,
      error: 'Error al obtener estadísticas de clicks',
      data: [],
    };
  }
}

/**
 * Obtener estadísticas de clicks en paquetes de una promesa
 * Optimizado: Limita resultados y ordena por fecha
 */
export async function getPaqueteClickStats(promiseId: string) {
  try {
    // Optimizado: Limitar a últimos 2000 clicks para evitar queries lentas
    const clicks = await prisma.studio_content_analytics.findMany({
      where: {
        content_type: 'PROMISE',
        content_id: promiseId,
        event_type: 'PAQUETE_CLICK',
      },
      orderBy: {
        created_at: 'desc',
      },
      take: 2000, // Reducido de 5000 a 2000 para mejor performance
      select: {
        metadata: true,
        created_at: true,
      },
    });

    // Agrupar por paquete_id
    const statsByPaquete = clicks.reduce((acc, click) => {
      const metadata = click.metadata as Record<string, unknown>;
      const paqueteId = metadata?.paquete_id as string;
      if (!paqueteId) return acc;

      if (!acc[paqueteId]) {
        acc[paqueteId] = {
          paqueteId,
          paqueteName: (metadata?.paquete_name as string) || 'Sin nombre',
          clicks: 0,
          lastClick: null,
        };
      }

      acc[paqueteId].clicks++;
      if (!acc[paqueteId].lastClick || click.created_at > acc[paqueteId].lastClick!) {
        acc[paqueteId].lastClick = click.created_at;
      }

      return acc;
    }, {} as Record<string, { paqueteId: string; paqueteName: string; clicks: number; lastClick: Date | null }>);

    return {
      success: true,
      data: Object.values(statsByPaquete),
    };
  } catch (error) {
    console.error('[getPaqueteClickStats] Error:', error);
    return {
      success: false,
      error: 'Error al obtener estadísticas de clicks',
      data: [],
    };
  }
}

/**
 * Obtener clicks de una cotización específica
 */
export async function getCotizacionClicks(cotizacionId: string) {
  try {
    const count = await prisma.studio_content_analytics.count({
      where: {
        event_type: 'COTIZACION_CLICK',
        metadata: {
          path: ['cotizacion_id'],
          equals: cotizacionId,
        },
      },
    });

    return {
      success: true,
      data: { clicks: count },
    };
  } catch (error) {
    console.error('[getCotizacionClicks] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener clicks',
      data: { clicks: 0 },
    };
  }
}

/**
 * ✅ OPTIMIZACIÓN: Obtener todas las estadísticas de una promesa en una sola acción
 * Ejecuta las 3 queries en paralelo usando Promise.all
 */
export async function getPromiseStats(promiseId: string) {
  try {
    const [viewsResult, cotizacionesResult, paquetesResult] = await Promise.all([
      getPromiseViewStats(promiseId),
      getCotizacionClickStats(promiseId),
      getPaqueteClickStats(promiseId),
    ]);

    return {
      success: true,
      data: {
        views: viewsResult.success && viewsResult.data
          ? {
              totalViews: viewsResult.data.totalViews,
              uniqueViews: viewsResult.data.uniqueViews,
              lastView: viewsResult.data.lastView,
            }
          : {
              totalViews: 0,
              uniqueViews: 0,
              lastView: null,
            },
        cotizaciones: cotizacionesResult.success && cotizacionesResult.data
          ? cotizacionesResult.data
          : [],
        paquetes: paquetesResult.success && paquetesResult.data
          ? paquetesResult.data
          : [],
      },
    };
  } catch (error) {
    console.error('[getPromiseStats] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener estadísticas',
      data: {
        views: {
          totalViews: 0,
          uniqueViews: 0,
          lastView: null,
        },
        cotizaciones: [],
        paquetes: [],
      },
    };
  }
}
