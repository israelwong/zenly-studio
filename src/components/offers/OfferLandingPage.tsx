"use client";

import { useEffect, useState } from "react";
import { BlockRenderer } from "@/components/shared/content-blocks";
import { ContentBlock } from "@/types/content-blocks";
import { CTAConfig, LeadFormFieldsConfig } from "@/lib/actions/schemas/offer-schemas";
import { ZenButton, ZenDialog } from "@/components/ui/zen";
import Link from "next/link";
import { trackOfferVisit } from "@/lib/actions/studio/offers/offer-visits.actions";
import { OfferLeadForm } from "./OfferLeadForm";

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
  // Datos del leadform para modal
  leadformData?: {
    studioId: string;
    title?: string | null;
    description?: string | null;
    successMessage: string;
    successRedirectUrl?: string | null;
    fieldsConfig: LeadFormFieldsConfig;
    eventTypeId?: string | null;
    enableInterestDate?: boolean;
    validateWithCalendar?: boolean;
    emailRequired?: boolean;
    coverUrl?: string | null;
    coverType?: string | null;
  };
  // Modo preview: deshabilitar tracking
  isPreview?: boolean;
  // Modo edit: deshabilitar botones (en editor interno)
  isEditMode?: boolean;
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
  leadformData,
  isPreview: isPreviewProp = false,
  isEditMode = false,
}: OfferLandingPageProps) {
  const [showLeadFormModal, setShowLeadFormModal] = useState(false);
  const [isPreviewFromUrl, setIsPreviewFromUrl] = useState(false);

  // Alias para evitar conflictos con el estado interno
  const isPreviewFromProp = isPreviewProp;

  // Detectar preview desde URL (solo si no viene como prop)
  useEffect(() => {
    if (!isPreviewFromProp && typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      setIsPreviewFromUrl(urlParams.get("preview") === "true");
    }
  }, [isPreviewFromProp]);

  // Usar prop o URL param
  const isPreview = isPreviewFromProp || isPreviewFromUrl;

  // Tracking de visitas (solo si NO es preview)
  useEffect(() => {
    // Si es preview, no trackear visitas ni eventos
    if (isPreview) {
      return;
    }

    // Verificar si ya se trackeó en esta sesión de navegador
    const sessionTrackKey = `offer_landing_tracked_${offerId}`;
    const alreadyTracked = sessionStorage.getItem(sessionTrackKey);

    if (alreadyTracked) {
      return;
    }

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

      // Marcar como trackeado en sessionStorage (se borra al cerrar pestaña)
      sessionStorage.setItem(sessionTrackKey, 'true');

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
  }, [offerId, offerSlug, onTrackView, isPreview]);

  const leadformUrl = `/${studioSlug}/offer/${offerSlug}/leadform`;

  // Tracking de prospecto al abrir modal
  const handleOpenLeadForm = async () => {
    // Si es preview, solo abrir modal sin trackear
    if (isPreview) {
      setShowLeadFormModal(true);
      return;
    }

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

    // Registrar visita como prospecto (intención de contacto)
    // Usamos "leadform" como tipo ya que es la intención de ver el leadform
    await trackOfferVisit({
      offer_id: offerId,
      visit_type: "leadform", // Tracking de intención de contacto
      referrer: document.referrer || undefined,
      ...utmParams,
      session_id: sessionId,
    });

    // Disparar evento personalizado para GTM/Facebook Pixel
    if (typeof window !== "undefined") {
      const windowWithDataLayer = window as WindowWithDataLayer;
      const windowWithFbq = window as WindowWithFbq;

      // GTM - Evento de prospecto
      if (windowWithDataLayer.dataLayer) {
        windowWithDataLayer.dataLayer.push({
          event: "offer_leadform_intent",
          offer_id: offerId,
          offer_slug: offerSlug,
          ...utmParams,
        });
      }

      // Facebook Pixel - InitiateCheckout (intención)
      if (windowWithFbq.fbq) {
        windowWithFbq.fbq("track", "InitiateCheckout", {
          content_name: offerSlug,
          content_category: "offer",
          ...utmParams,
        });
      }
    }

    setShowLeadFormModal(true);
  };

  // Manejar cierre del modal después de envío exitoso
  const handleFormSuccess = () => {
    setShowLeadFormModal(false);
  };

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
              block.type === 'hero-contact' ||
              block.type === 'hero-offer' ||
              block.type === 'hero-portfolio';

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
                    onOpenLeadForm={leadformData ? handleOpenLeadForm : undefined}
                    isPreview={isPreview || isEditMode}
                  />
                )}
                <div className={isFullWidth ? '' : 'px-4'}>
                  <BlockRenderer
                    block={block}
                    context="offer"
                    onOpenLeadForm={leadformData ? handleOpenLeadForm : undefined}
                    isPreview={isPreview || isEditMode}
                  />
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
          onOpenLeadForm={leadformData ? handleOpenLeadForm : undefined}
          isPreview={isPreview || isEditMode}
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
            onOpenLeadForm={leadformData ? handleOpenLeadForm : undefined}
            isPreview={isPreview || isEditMode}
          />
        </div>
      )}

      {/* Modal de Leadform */}
      {leadformData && (
        <ZenDialog
          isOpen={showLeadFormModal}
          onClose={() => setShowLeadFormModal(false)}
          title={leadformData.title || "Solicita información"}
          description={leadformData.description || undefined}
          maxWidth="md"
          showCloseButton={true}
          closeOnClickOutside={true}
          onCancel={() => setShowLeadFormModal(false)}
          cancelLabel="Cerrar"
        >
          <OfferLeadForm
            studioSlug={studioSlug}
            studioId={leadformData.studioId}
            offerId={offerId}
            offerSlug={offerSlug}
            title={leadformData.title}
            description={leadformData.description}
            successMessage={leadformData.successMessage}
            successRedirectUrl={leadformData.successRedirectUrl}
            fieldsConfig={leadformData.fieldsConfig}
            eventTypeId={leadformData.eventTypeId}
            enableInterestDate={leadformData.enableInterestDate}
            validateWithCalendar={leadformData.validateWithCalendar}
            emailRequired={leadformData.emailRequired}
            coverUrl={leadformData.coverUrl}
            coverType={leadformData.coverType}
            isPreview={isPreview}
            onSuccess={handleFormSuccess}
            isModal={true}
          />
        </ZenDialog>
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
  onOpenLeadForm?: () => void;
  isPreview?: boolean;
}

function CTASection({
  buttons,
  leadformUrl,
  studioSlug, // eslint-disable-line @typescript-eslint/no-unused-vars
  offerId,
  isFloating = false,
  onOpenLeadForm,
  isPreview = false,
}: CTASectionProps) {
  const handleCTAClick = (e: React.MouseEvent) => {
    // Si es preview, no hacer nada
    if (isPreview) {
      e.preventDefault();
      return;
    }

    // Si hay modal disponible, usar modal en lugar de navegar
    if (onOpenLeadForm && !buttons.find(b => b.id === buttons[0]?.id)?.href) {
      e.preventDefault();
      onOpenLeadForm();
      return;
    }

    // Disparar evento de click en CTA (si navega a URL)
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
      {buttons.map((button) => {
        // Si hay modal y el botón no tiene href personalizado, usar botón con onClick
        if (onOpenLeadForm && !button.href) {
          return (
            <ZenButton
              key={button.id}
              variant={button.variant}
              size={isFloating ? "md" : "lg"}
              className="min-w-[200px]"
              onClick={handleCTAClick}
              disabled={isPreview}
            >
              {button.text}
            </ZenButton>
          );
        }

        // Si tiene href personalizado o no hay modal, usar Link
        return (
          <Link
            key={button.id}
            href={button.href || leadformUrl}
            onClick={handleCTAClick}
            className={isPreview ? 'pointer-events-none' : ''}
          >
            <ZenButton
              variant={button.variant}
              size={isFloating ? "md" : "lg"}
              className="min-w-[200px]"
              disabled={isPreview}
            >
              {button.text}
            </ZenButton>
          </Link>
        );
      })}
    </div>
  );
}
