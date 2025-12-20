import { useCallback, useEffect, useRef } from 'react';
import { trackContentEvent, type ContentType, type AnalyticsEventType } from '@/lib/actions/studio/analytics/analytics.actions';
import { useAuth } from '@/contexts/AuthContext';

interface UseContentAnalyticsProps {
  studioId: string;
  contentType: ContentType;
  contentId: string;
  sessionId?: string;
  ownerUserId?: string | null; // platform_user_id del owner para excluir tracking
}

/**
 * Hook para facilitar el tracking de analytics en componentes
 * Provee funciones optimizadas para trackear eventos sin bloquear la UI
 */
export function useContentAnalytics({
  studioId,
  contentType,
  contentId,
  sessionId,
  ownerUserId
}: UseContentAnalyticsProps) {
  const { user } = useAuth();
  const trackedEventsRef = useRef<Set<string>>(new Set());

  /**
   * Trackear un evento (non-blocking)
   * Se ejecuta en background sin esperar respuesta
   * NO trackea si el usuario es el dueño del estudio
   */
  const track = useCallback(async (
    eventType: AnalyticsEventType,
    metadata?: Record<string, unknown>
  ) => {
    // Excluir tracking del dueño del estudio
    if (user?.id && ownerUserId && user.id === ownerUserId) {
      console.debug('[Analytics] Skipping tracking - studio owner');
      return;
    }

    // Ejecutar en background sin bloquear UI
    trackContentEvent({
      studioId,
      contentType,
      contentId,
      eventType,
      userId: user?.id,
      sessionId,
      metadata
    }).catch(err => {
      // Log silencioso - no interrumpir experiencia del usuario
      console.debug('[Analytics] Failed to track event:', eventType, err);
    });
  }, [studioId, contentType, contentId, user?.id, sessionId, ownerUserId]);

  /**
   * Trackear un evento solo una vez por sesión/montaje
   * Útil para PAGE_VIEW, FEED_VIEW, etc.
   */
  const trackOnce = useCallback((
    eventType: AnalyticsEventType,
    metadata?: Record<string, unknown>
  ) => {
    const key = `${eventType}:${contentId}`;
    if (!trackedEventsRef.current.has(key)) {
      trackedEventsRef.current.add(key);
      track(eventType, metadata);
    }
  }, [track, contentId]);

  /**
   * Helpers específicos para eventos comunes
   */
  const trackModalOpen = useCallback(() => track('MODAL_OPEN'), [track]);
  const trackModalClose = useCallback(() => track('MODAL_CLOSE'), [track]);
  const trackLinkCopy = useCallback(() => track('LINK_COPY'), [track]);
  const trackMediaClick = useCallback((mediaId?: string) =>
    track('MEDIA_CLICK', mediaId ? { media_id: mediaId } : undefined),
    [track]
  );
  const trackCarouselNext = useCallback(() => track('CAROUSEL_NEXT'), [track]);
  const trackCarouselPrev = useCallback(() => track('CAROUSEL_PREV'), [track]);
  const trackCTAClick = useCallback((ctaType?: string) =>
    track('CTA_CLICK', ctaType ? { cta_type: ctaType } : undefined),
    [track]
  );

  return {
    track,
    trackOnce,
    trackModalOpen,
    trackModalClose,
    trackLinkCopy,
    trackMediaClick,
    trackCarouselNext,
    trackCarouselPrev,
    trackCTAClick
  };
}

/**
 * Hook para trackear tiempo en página
 * Trackea automáticamente TIME_30S y TIME_60S
 */
export function useTimeTracking({
  studioId,
  contentType,
  contentId,
  sessionId,
  ownerUserId
}: UseContentAnalyticsProps) {
  const { track } = useContentAnalytics({ studioId, contentType, contentId, sessionId, ownerUserId });
  const tracked30sRef = useRef(false);
  const tracked60sRef = useRef(false);

  useEffect(() => {
    // Trackear 30 segundos
    const timer30s = setTimeout(() => {
      if (!tracked30sRef.current) {
        tracked30sRef.current = true;
        track('TIME_30S');
      }
    }, 30000);

    // Trackear 60 segundos
    const timer60s = setTimeout(() => {
      if (!tracked60sRef.current) {
        tracked60sRef.current = true;
        track('TIME_60S');
      }
    }, 60000);

    return () => {
      clearTimeout(timer30s);
      clearTimeout(timer60s);
    };
  }, [track]);
}

/**
 * Hook para trackear scroll
 * Trackea automáticamente SCROLL_50 y SCROLL_100
 */
export function useScrollTracking({
  studioId,
  contentType,
  contentId,
  sessionId,
  ownerUserId,
  elementRef
}: UseContentAnalyticsProps & { elementRef: React.RefObject<HTMLElement> }) {
  const { track } = useContentAnalytics({ studioId, contentType, contentId, sessionId, ownerUserId });
  const tracked50Ref = useRef(false);
  const tracked100Ref = useRef(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleScroll = () => {
      const scrollPercent = (element.scrollTop / (element.scrollHeight - element.clientHeight)) * 100;

      if (scrollPercent >= 50 && !tracked50Ref.current) {
        tracked50Ref.current = true;
        track('SCROLL_50');
      }

      if (scrollPercent >= 90 && !tracked100Ref.current) {
        tracked100Ref.current = true;
        track('SCROLL_100');
      }
    };

    element.addEventListener('scroll', handleScroll, { passive: true });
    return () => element.removeEventListener('scroll', handleScroll);
  }, [track, elementRef]);
}
