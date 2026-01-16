'use server';

import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';
import { trackContentEvent } from '@/lib/actions/studio/analytics/analytics.actions';

/**
 * Trackear visita a página de promesa pública
 * Solo trackea si NO es preview mode
 */
export async function trackPromisePageView(
  studioId: string,
  promiseId: string,
  sessionId: string,
  isPreview: boolean = false
) {
  if (isPreview) {
    return { success: true, skipped: true, reason: 'preview_mode' };
  }

  const headersList = await headers();
  const ip_address = headersList.get('x-forwarded-for')?.split(',')[0] ||
    headersList.get('x-real-ip') ||
    'unknown';

  return trackContentEvent({
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
  return trackContentEvent({
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
  return trackContentEvent({
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
}

/**
 * Obtener estadísticas de visitas a una promesa
 * Optimizado: Usa agregaciones SQL y limita resultados
 */
export async function getPromiseViewStats(promiseId: string) {
  try {
    // Optimizado: Limitar a últimos 500 registros para evitar queries lentas
    const allViews = await prisma.studio_content_analytics.findMany({
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
    });

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
