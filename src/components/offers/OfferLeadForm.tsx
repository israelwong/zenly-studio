"use client";

/**
 * Componente de formulario de contacto para ofertas
 * 
 * ⚠️ TODO: Migrar a components/sections/offers/OfferLeadFormSection.tsx
 * cuando se agreguen más secciones públicas (pagos, calendario)
 * 
 * Este componente debe ser reutilizable en:
 * - Vista pública: /[slug]/offer/[offerId]/leadform
 * - Vista editor: /[slug]/studio/commercial/ofertas (preview)
 * 
 * Ver: docs/arquitectura-componentes-publicos.md
 */

import { useEffect } from "react";
import Image from "next/image";
import { ZenButton, ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle } from "@/components/ui/zen";
import { submitOfferLeadform } from "@/lib/actions/studio/offers/offer-submissions.actions";
import { trackOfferVisit } from "@/lib/actions/studio/offers/offer-visits.actions";
import { LeadFormFieldsConfig } from "@/lib/actions/schemas/offer-schemas";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { OfferLeadFormFields } from "@/components/shared/forms";

// Tipos para objetos globales de tracking
interface WindowWithDataLayer extends Window {
  dataLayer?: Array<Record<string, unknown>>;
}

interface WindowWithFbq extends Window {
  fbq?: (command: string, eventName: string, eventData?: Record<string, unknown>) => void;
}

interface OfferLeadFormProps {
  studioSlug: string;
  offerId: string;
  offerSlug: string;
  studioId: string;
  title?: string | null;
  description?: string | null;
  successMessage: string;
  successRedirectUrl?: string | null;
  fieldsConfig: LeadFormFieldsConfig;
  eventTypeId?: string | null; // ID del tipo de evento asociado (pre-seleccionado)
  enableInterestDate?: boolean;
  validateWithCalendar?: boolean;
  emailRequired?: boolean;
  coverUrl?: string | null;
  coverType?: string | null;
  isPreview?: boolean;
  onSuccess?: () => void; // Callback cuando se envía exitosamente (para cerrar modal)
  isModal?: boolean; // Indica si está dentro de un modal
}

/**
 * Componente de leadform para ofertas
 */
export function OfferLeadForm({
  studioSlug,
  offerId,
  offerSlug,
  studioId,
  title,
  description,
  successMessage,
  successRedirectUrl,
  fieldsConfig,
  eventTypeId = null,
  enableInterestDate,
  validateWithCalendar = false,
  emailRequired = false,
  coverUrl,
  coverType,
  isPreview = false,
  onSuccess,
  isModal = false,
}: OfferLeadFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Verificar si viene de éxito
  const isSuccess = searchParams.get("success") === "true";

  // Verificar si es preview desde URL
  const isPreviewFromUrl = searchParams.get("preview") === "true";

  // Combinar preview de prop y URL
  const effectiveIsPreview = isPreview || isPreviewFromUrl;

  useEffect(() => {
    // Verificar si es preview (no trackear)
    const urlParams = new URLSearchParams(window.location.search);
    const isPreview = urlParams.get("preview") === "true";

    // Si es preview, no trackear visitas ni eventos
    if (isPreview || isSuccess) {
      return;
    }

    // Verificar si ya se trackeó en esta sesión de navegador
    const sessionTrackKey = `offer_leadform_tracked_${offerId}`;
    const alreadyTracked = sessionStorage.getItem(sessionTrackKey);

    if (alreadyTracked) {
      return;
    }

    // Registrar visita al cargar el leadform
    const trackVisit = async () => {
      const utmParams = {
        utm_source: urlParams.get("utm_source") || undefined,
        utm_medium: urlParams.get("utm_medium") || undefined,
        utm_campaign: urlParams.get("utm_campaign") || undefined,
        utm_term: urlParams.get("utm_term") || undefined,
        utm_content: urlParams.get("utm_content") || undefined,
      };

      let sessionId = localStorage.getItem(`offer_session_${offerId}`);
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem(`offer_session_${offerId}`, sessionId);
      }

      await trackOfferVisit({
        offer_id: offerId,
        visit_type: "leadform",
        referrer: document.referrer || undefined,
        ...utmParams,
        session_id: sessionId,
      });

      // Marcar como trackeado en sessionStorage (se borra al cerrar pestaña)
      sessionStorage.setItem(sessionTrackKey, 'true');

      // Disparar evento personalizado
      if (typeof window !== "undefined") {
        const windowWithDataLayer = window as WindowWithDataLayer;
        const windowWithFbq = window as WindowWithFbq;

        if (windowWithDataLayer.dataLayer) {
          windowWithDataLayer.dataLayer.push({
            event: "offer_leadform_view",
            offer_id: offerId,
            offer_slug: offerSlug,
            ...utmParams,
          });
        }

        if (windowWithFbq.fbq) {
          windowWithFbq.fbq("track", "ViewContent", {
            content_name: `${offerSlug}_leadform`,
            content_category: "leadform",
            ...utmParams,
          });
        }
      }
    };

    trackVisit();
  }, [offerId, offerSlug, isSuccess]);

  // Handler para submit del formulario compartido
  const handleFormSubmit = async (data: {
    name: string;
    phone: string;
    email: string;
    interest_date?: string;
  }) => {
    // Si es preview, no enviar (ya se maneja en el componente compartido)
    if (effectiveIsPreview) {
      return;
    }

    // Obtener parámetros UTM de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = localStorage.getItem(`offer_session_${offerId}`);

    // Preparar datos del formulario
    const customFields: Record<string, unknown> = {};
    fieldsConfig.fields?.forEach((field) => {
      if (data[field.id as keyof typeof data]) {
        customFields[field.id] = data[field.id as keyof typeof data];
      }
    });

    const result = await submitOfferLeadform(studioSlug, {
      offer_id: offerId,
      name: data.name,
      phone: data.phone,
      email: data.email || "",
      event_type_id: eventTypeId || undefined,
      custom_fields: customFields,
      utm_source: urlParams.get("utm_source") || undefined,
      utm_medium: urlParams.get("utm_medium") || undefined,
      utm_campaign: urlParams.get("utm_campaign") || undefined,
      utm_term: urlParams.get("utm_term") || undefined,
      utm_content: urlParams.get("utm_content") || undefined,
      session_id: sessionId || undefined,
      is_test: effectiveIsPreview, // Marcar como prueba si viene de preview
    });

    if (!result.success) {
      toast.error(result.error || "Error al enviar el formulario");
      throw new Error(result.error || "Error al enviar el formulario");
    }

    // Disparar eventos de conversión (solo si NO es preview)
    if (!effectiveIsPreview && typeof window !== "undefined") {
      const windowWithDataLayer = window as WindowWithDataLayer;
      const windowWithFbq = window as WindowWithFbq;

      if (windowWithDataLayer.dataLayer) {
        windowWithDataLayer.dataLayer.push({
          event: "offer_form_success",
          offer_id: offerId,
          contact_id: result.data?.contact_id,
        });
      }

      if (windowWithFbq.fbq) {
        windowWithFbq.fbq("track", "Lead", {
          content_name: offerSlug,
          value: 0,
          currency: "MXN",
        });
      }
    }

    toast.success(successMessage);

    // Si hay callback onSuccess (modal), usarlo en lugar de redirigir
    if (onSuccess) {
      onSuccess();
      // Si hay redirect URL, redirigir después de cerrar modal
      if (successRedirectUrl) {
        setTimeout(() => {
          window.location.href = successRedirectUrl;
        }, 500);
      } else if (result.data?.redirect_url) {
        const redirectUrl = result.data.redirect_url;
        if (redirectUrl) {
          setTimeout(() => {
            router.push(redirectUrl);
          }, 500);
        }
      }
      return;
    }

    // Redirigir según configuración (modo página dedicada)
    if (successRedirectUrl) {
      window.location.href = successRedirectUrl;
    } else if (result.data?.redirect_url) {
      const redirectUrl = result.data.redirect_url;
      if (redirectUrl) {
        router.push(redirectUrl);
      }
    } else {
      // Redirigir a la misma página con parámetro de éxito
      router.push(`/${studioSlug}/offer/${offerSlug}/leadform?success=true`);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <ZenCard className="max-w-md w-full">
          <ZenCardHeader>
            <ZenCardTitle className="text-center text-emerald-400">
              ¡Gracias!
            </ZenCardTitle>
          </ZenCardHeader>
          <ZenCardContent className="text-center space-y-4">
            <p className="text-zinc-300">{successMessage}</p>
            <ZenButton
              variant="outline"
              onClick={() => router.push(`/${studioSlug}`)}
            >
              Volver al inicio
            </ZenButton>
          </ZenCardContent>
        </ZenCard>
      </div>
    );
  }

  return (
    <div className={`relative bg-zinc-950 ${!coverUrl && !isModal ? 'min-h-screen' : ''}`}>
      {/* Hero Cover */}
      {coverUrl && (
        <div className="absolute inset-0 h-[40vh] md:h-[45vh] overflow-hidden">
          {coverType === 'video' ? (
            <video
              src={coverUrl}
              className="w-full h-full object-cover"
              autoPlay
              loop
              muted
              playsInline
            />
          ) : (
            <Image
              src={coverUrl}
              alt="Cover"
              fill
              className="object-cover"
              priority
              unoptimized
            />
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-linear-to-b from-zinc-900/50 via-zinc-950/40 to-zinc-950" />
        </div>
      )}

      {/* Formulario superpuesto */}
      <div className={`relative z-10 ${isModal ? 'p-0' : 'p-4 pb-12'} ${coverUrl && !isModal ? 'pt-[20vh] md:pt-[15vh]' : !isModal ? 'min-h-screen flex items-center justify-center' : ''}`}>
        <ZenCard className={`max-w-lg w-full ${isModal ? 'bg-transparent shadow-none border-0' : 'bg-zinc-950/50 backdrop-blur-md shadow-2xl border-zinc-800/50'}`}>
          {!isModal && (
            <ZenCardHeader>
              <ZenCardTitle>{title || "Solicita información"}</ZenCardTitle>
              {description && (
                <p className="text-sm text-zinc-400 mt-2">{description}</p>
              )}
            </ZenCardHeader>
          )}
          <ZenCardContent className={`${isModal ? 'pt-0' : ''}`}>
            <OfferLeadFormFields
              fieldsConfig={fieldsConfig}
              emailRequired={emailRequired}
              enableInterestDate={enableInterestDate}
              validateWithCalendar={validateWithCalendar}
              eventTypeId={eventTypeId}
              studioId={studioId}
              isPreview={isPreview}
              onSubmit={handleFormSubmit}
              submitLabel="Enviar solicitud"
            />
            {!isModal && (
              <div className="mt-4">
                <ZenButton
                  variant="ghost"
                  className="w-full"
                  onClick={() => router.back()}
                >
                  Cancelar
                </ZenButton>
              </div>
            )}
          </ZenCardContent>
        </ZenCard>
      </div>
    </div>
  );
}
