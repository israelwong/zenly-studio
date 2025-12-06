"use client";

import { useEffect } from "react";
import { BlockRenderer } from "@/components/shared/content-blocks";
import { ContentBlock } from "@/types/content-blocks";
import { CTAConfig } from "@/lib/actions/schemas/offer-schemas";
import { ZenButton } from "@/components/ui/zen";
import Link from "next/link";
import { trackOfferVisit } from "@/lib/actions/studio/offers/offer-visits.actions";

// Tipos para objetos globales de tracking
interface WindowWithDataLayer extends Window {
  dataLayer?: Array<Record<string, unknown>>;
}

interface WindowWithFbq extends Window {
  fbq?: (command: string, eventName: string, eventData?: Record<string, unknown>) => void;
}

interface OfferLandingPageProps {
  studioSlug: string;
  offerId: string;
  offerSlug: string;
  contentBlocks: ContentBlock[];
  ctaConfig: CTAConfig;
  onTrackView?: () => void;
}

/**
 * Componente de landing page pública para ofertas
 * 
 * ⚠️ TODO: Migrar a components/sections/offers/OfferLandingSection.tsx
 * cuando se agreguen más secciones públicas (pagos, calendario)
 * 
 * Este componente debe ser reutilizable en:
 * - Vista pública: /[slug]/offer/[offerId]
 * - Vista editor: /[slug]/studio/commercial/ofertas (preview)
 * 
 * Ver: docs/arquitectura-componentes-publicos.md
 */
export function OfferLandingPage({
  studioSlug,
  offerId,
  offerSlug,
  contentBlocks,
  ctaConfig,
  onTrackView,
}: OfferLandingPageProps) {
  useEffect(() => {
    // Registrar visita al cargar la página
    const trackVisit = async () => {
      // Obtener parámetros UTM de la URL
      const urlParams = new URLSearchParams(window.location.search);
      const utmParams = {
        utm_source: urlParams.get("utm_source") || undefined,
        utm_medium: urlParams.get("utm_medium") || undefined,
        utm_campaign: urlParams.get("utm_campaign") || undefined,
        utm_term: urlParams.get("utm_term") || undefined,
        utm_content: urlParams.get("utm_content") || undefined,
      };

      // Obtener session_id de localStorage o generar uno nuevo
      let sessionId = localStorage.getItem(`offer_session_${offerId}`);
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem(`offer_session_${offerId}`, sessionId);
      }

      await trackOfferVisit({
        offer_id: offerId,
        visit_type: "landing",
        referrer: document.referrer || undefined,
        ...utmParams,
        session_id: sessionId,
      });

      // Disparar evento personalizado para GTM/Facebook Pixel
      if (typeof window !== "undefined") {
        const windowWithDataLayer = window as WindowWithDataLayer;
        const windowWithFbq = window as WindowWithFbq;

        // GTM
        if (windowWithDataLayer.dataLayer) {
          windowWithDataLayer.dataLayer.push({
            event: "offer_landing_view",
            offer_id: offerId,
            offer_slug: offerSlug,
            ...utmParams,
          });
        }

        // Facebook Pixel
        if (windowWithFbq.fbq) {
          windowWithFbq.fbq("track", "ViewContent", {
            content_name: offerSlug,
            content_category: "offer",
            ...utmParams,
          });
        }
      }

      onTrackView?.();
    };

    trackVisit();
  }, [offerId, offerSlug, onTrackView]);

  const leadformUrl = `/${studioSlug}/offer/${offerSlug}/leadform`;

  return (
    <div className="text-zinc-100">
      {/* Renderizar content blocks */}
      <div className="space-y-0">
        {contentBlocks
          .sort((a, b) => (a.order || 0) - (b.order || 0))
          .map((block, index) => {
            // Insertar CTAs según configuración
            const shouldShowCTAsBefore =
              ctaConfig.buttons.some(
                (btn) => btn.position === "top" && index === 0
              ) ||
              ctaConfig.buttons.some(
                (btn) => btn.position === "middle" && index === Math.floor(contentBlocks.length / 2)
              );

            // Determinar si el bloque es fullwidth (carousel/hero)
            const isFullWidth =
              (block.type === 'gallery' || block.type === 'media-gallery') &&
              (block.config as { mode?: string })?.mode === 'slide' ||
              block.type === 'hero' ||
              block.type === 'hero-image' ||
              block.type === 'hero-video' ||
              block.type === 'hero-text' ||
              block.type === 'hero-contact';

            return (
              <div key={block.id}>
                {shouldShowCTAsBefore && (
                  <CTASection
                    buttons={ctaConfig.buttons.filter(
                      (btn) =>
                        btn.position === "top" ||
                        (btn.position === "middle" &&
                          index === Math.floor(contentBlocks.length / 2))
                    )}
                    leadformUrl={leadformUrl}
                    studioSlug={studioSlug}
                    offerId={offerId}
                  />
                )}
                <div className={isFullWidth ? '' : 'px-4'}>
                  <BlockRenderer block={block} />
                </div>
              </div>
            );
          })}
      </div>

      {/* CTAs al final */}
      {ctaConfig.buttons.some((btn) => btn.position === "bottom") && (
        <CTASection
          buttons={ctaConfig.buttons.filter((btn) => btn.position === "bottom")}
          leadformUrl={leadformUrl}
          studioSlug={studioSlug}
          offerId={offerId}
        />
      )}

      {/* CTA flotante */}
      {ctaConfig.buttons.some((btn) => btn.position === "floating") && (
        <div className="fixed bottom-6 right-6 z-50">
          <CTASection
            buttons={ctaConfig.buttons.filter(
              (btn) => btn.position === "floating"
            )}
            leadformUrl={leadformUrl}
            studioSlug={studioSlug}
            offerId={offerId}
            isFloating
          />
        </div>
      )}
    </div>
  );
}

interface CTASectionProps {
  buttons: Array<{
    id: string;
    text: string;
    variant: "primary" | "secondary" | "outline";
    position: "top" | "middle" | "bottom" | "floating";
    href?: string;
  }>;
  leadformUrl: string;
  studioSlug: string;
  offerId: string;
  isFloating?: boolean;
}

function CTASection({
  buttons,
  leadformUrl,
  studioSlug, // eslint-disable-line @typescript-eslint/no-unused-vars
  offerId,
  isFloating = false,
}: CTASectionProps) {
  const handleCTAClick = () => {
    // Disparar evento de click en CTA
    if (typeof window !== "undefined") {
      const windowWithDataLayer = window as WindowWithDataLayer;
      const windowWithFbq = window as WindowWithFbq;

      // GTM
      if (windowWithDataLayer.dataLayer) {
        windowWithDataLayer.dataLayer.push({
          event: "offer_cta_click",
          offer_id: offerId,
        });
      }

      // Facebook Pixel
      if (windowWithFbq.fbq) {
        windowWithFbq.fbq("track", "InitiateCheckout", {
          content_name: "offer_cta",
        });
      }
    }
  };

  return (
    <div
      className={`flex flex-wrap gap-4 ${isFloating ? "justify-end" : "justify-center py-8 px-4"
        }`}
    >
      {buttons.map((button) => (
        <Link
          key={button.id}
          href={button.href || leadformUrl}
          onClick={handleCTAClick}
        >
          <ZenButton
            variant={button.variant}
            size={isFloating ? "md" : "lg"}
            className="min-w-[200px]"
          >
            {button.text}
          </ZenButton>
        </Link>
      ))}
    </div>
  );
}
