"use server";

import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { analyticsQueue } from "@/lib/analytics-queue";

export type ContentType = 'POST' | 'PORTFOLIO' | 'OFFER' | 'PACKAGE';

export type AnalyticsEventType =
  | 'PAGE_VIEW'
  | 'FEED_VIEW'
  | 'SIDEBAR_VIEW'     // Oferta visible en sidebar
  | 'OFFER_CLICK'      // Click en oferta
  | 'MODAL_OPEN'
  | 'MODAL_CLOSE'
  | 'NEXT_CONTENT'
  | 'PREV_CONTENT'
  | 'LINK_COPY'
  | 'SHARE_CLICK'
  | 'MEDIA_CLICK'
  | 'MEDIA_VIEW'
  | 'CAROUSEL_NEXT'
  | 'CAROUSEL_PREV'
  | 'CTA_CLICK'
  | 'WHATSAPP_CLICK'
  | 'FORM_VIEW'
  | 'FORM_SUBMIT'
  | 'SCROLL_50'
  | 'SCROLL_100'
  | 'TIME_30S'
  | 'TIME_60S';

interface TrackEventInput {
  studioId: string;
  contentType: ContentType;
  contentId: string;
  eventType: AnalyticsEventType;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

// Rate limiting cache
const rateLimitCache = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minuto
const MAX_EVENTS_PER_MINUTE = 30;

// Deduplicación cache
const eventDedupeCache = new Map<string, number>();
const DEDUPE_WINDOW = 3000; // 3 segundos

/**
 * Trackear evento de analytics de contenido
 * Server action para registrar interacciones con posts, portfolios, offers, packages
 * 
 * Optimizaciones:
 * - Rate limiting: Max 30 eventos/minuto por IP/usuario
 * - Deduplicación: Ignora eventos duplicados en 3s
 * - Batch writes: Usa queue para agrupar inserts
 */
export async function trackContentEvent(input: TrackEventInput) {
  try {
    // Validar que studio_id existe (prevenir foreign key constraint)
    if (!input.studioId || input.studioId.trim() === '') {
      console.debug('[Analytics] Invalid studioId, skipping');
      return { success: false, error: 'Invalid studioId' };
    }

    const headersList = await headers();

    // Obtener contexto del request
    const ip_address = headersList.get('x-forwarded-for')?.split(',')[0] ||
      headersList.get('x-real-ip') ||
      'unknown';
    const user_agent = headersList.get('user-agent') || undefined;
    const referrer = headersList.get('referer') || undefined;

    // Rate limiting por IP/usuario
    const rateLimitKey = input.userId || ip_address;
    const now = Date.now();
    const rateLimit = rateLimitCache.get(rateLimitKey);

    if (rateLimit) {
      if (now < rateLimit.resetAt) {
        if (rateLimit.count >= MAX_EVENTS_PER_MINUTE) {
          console.debug('[Analytics] Rate limit exceeded for', rateLimitKey);
          return { success: false, error: 'Rate limit exceeded' };
        }
        rateLimit.count++;
      } else {
        // Reset contador
        rateLimitCache.set(rateLimitKey, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
      }
    } else {
      rateLimitCache.set(rateLimitKey, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    }

    // Deduplicación de eventos
    const dedupeKey = `${input.contentId}:${input.eventType}:${input.sessionId || rateLimitKey}`;
    const lastTracked = eventDedupeCache.get(dedupeKey);

    if (lastTracked && now - lastTracked < DEDUPE_WINDOW) {
      console.debug('[Analytics] Duplicate event ignored', dedupeKey);
      return { success: true, deduplicated: true };
    }

    eventDedupeCache.set(dedupeKey, now);

    // Extraer UTM params del referrer si existe
    let utm_source, utm_medium, utm_campaign, utm_term, utm_content;
    if (referrer) {
      try {
        const url = new URL(referrer);
        utm_source = url.searchParams.get('utm_source') || undefined;
        utm_medium = url.searchParams.get('utm_medium') || undefined;
        utm_campaign = url.searchParams.get('utm_campaign') || undefined;
        utm_term = url.searchParams.get('utm_term') || undefined;
        utm_content = url.searchParams.get('utm_content') || undefined;
      } catch { }
    }

    // Agregar a queue (batch writes)
    analyticsQueue.add({
      studio_id: input.studioId,
      content_type: input.contentType,
      content_id: input.contentId,
      event_type: input.eventType,
      user_id: input.userId,
      ip_address,
      user_agent,
      session_id: input.sessionId,
      referrer,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
      metadata: input.metadata,
      created_at: new Date()
    });

    return { success: true };
  } catch (error) {
    console.error('❌ [trackContentEvent] Error:', error);
    // No fallar silenciosamente - analytics no debe romper la app
    return { success: false, error: 'Failed to track event' };
  }
}

// Limpiar caches periódicamente
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();

    // Limpiar rate limit cache
    for (const [key, value] of rateLimitCache.entries()) {
      if (now > value.resetAt) {
        rateLimitCache.delete(key);
      }
    }

    // Limpiar dedupe cache (eventos mayores a 5 minutos)
    for (const [key, timestamp] of eventDedupeCache.entries()) {
      if (now - timestamp > 300000) {
        eventDedupeCache.delete(key);
      }
    }
  }, 60000); // Cada minuto
}

/**
 * Obtener estadísticas agregadas de un contenido
 */
export async function getContentStats(
  studioId: string,
  contentType: ContentType,
  contentId: string
) {
  try {
    // Views únicos (por IP en últimas 24h)
    const uniqueViews24h = await prisma.studio_content_analytics.groupBy({
      by: ['ip_address'],
      where: {
        studio_id: studioId,
        content_type: contentType,
        content_id: contentId,
        event_type: 'MODAL_OPEN',
        created_at: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      },
      _count: true
    });

    // Total de eventos por tipo
    const eventCounts = await prisma.studio_content_analytics.groupBy({
      by: ['event_type'],
      where: {
        studio_id: studioId,
        content_type: contentType,
        content_id: contentId,
      },
      _count: true
    });

    // CTR (Click-Through Rate)
    const feedViews = eventCounts.find(e => e.event_type === 'FEED_VIEW')?._count || 0;
    const modalOpens = eventCounts.find(e => e.event_type === 'MODAL_OPEN')?._count || 0;
    const ctr = feedViews > 0 ? (modalOpens / feedViews) * 100 : 0;

    return {
      success: true,
      data: {
        uniqueViews24h: uniqueViews24h.length,
        totalViews: modalOpens,
        totalLinkCopies: eventCounts.find(e => e.event_type === 'LINK_COPY')?._count || 0,
        totalMediaClicks: eventCounts.find(e => e.event_type === 'MEDIA_CLICK')?._count || 0,
        ctr: Math.round(ctr * 100) / 100,
        eventCounts: eventCounts.map(e => ({
          eventType: e.event_type,
          count: e._count
        }))
      }
    };
  } catch (error) {
    console.error('❌ [getContentStats] Error:', error);
    return { success: false, error: 'Failed to get stats' };
  }
}

/**
 * Obtener analytics del studio (todos los contenidos)
 */
export async function getStudioAnalytics(
  studioId: string,
  dateFrom?: Date,
  dateTo?: Date
) {
  try {
    const whereClause: any = {
      studio_id: studioId,
    };

    if (dateFrom || dateTo) {
      whereClause.created_at = {};
      if (dateFrom) whereClause.created_at.gte = dateFrom;
      if (dateTo) whereClause.created_at.lte = dateTo;
    }

    // Top contenidos por interacciones
    const topContent = await prisma.studio_content_analytics.groupBy({
      by: ['content_type', 'content_id'],
      where: whereClause,
      _count: true,
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 10
    });

    // Eventos por tipo
    const eventsByType = await prisma.studio_content_analytics.groupBy({
      by: ['event_type'],
      where: whereClause,
      _count: true,
      orderBy: {
        _count: {
          id: 'desc'
        }
      }
    });

    // Contenidos por tipo
    const contentByType = await prisma.studio_content_analytics.groupBy({
      by: ['content_type'],
      where: whereClause,
      _count: true
    });

    return {
      success: true,
      data: {
        topContent: topContent.map(c => ({
          contentType: c.content_type,
          contentId: c.content_id,
          interactions: c._count
        })),
        eventsByType: eventsByType.map(e => ({
          eventType: e.event_type,
          count: e._count
        })),
        contentByType: contentByType.map(c => ({
          contentType: c.content_type,
          count: c._count
        }))
      }
    };
  } catch (error) {
    console.error('❌ [getStudioAnalytics] Error:', error);
    return { success: false, error: 'Failed to get analytics' };
  }
}
