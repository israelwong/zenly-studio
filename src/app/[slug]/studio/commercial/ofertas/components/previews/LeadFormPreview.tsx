"use client";

import { OfferLeadForm } from "@/components/offers/OfferLeadForm";
import { useOfferEditor } from "../OfferEditorContext";

interface LeadFormPreviewProps {
  studioSlug: string;
  studioId: string;
}

/**
 * Preview del leadform usando el componente real público
 * isPreview=true deshabilita el submit real
 * 
 * ⚠️ TODO: Eliminar este wrapper cuando se migre a arquitectura unificada
 * El componente OfferLeadFormSection debería usarse directamente en LeadFormTab
 * 
 * Ver: docs/arquitectura-componentes-publicos.md
 */
export function LeadFormPreview({ studioSlug, studioId }: LeadFormPreviewProps) {
  const { formData, leadformData } = useOfferEditor();

  return (
    <OfferLeadForm
      studioSlug={studioSlug}
      studioId={studioId}
      offerId="preview"
      offerSlug={formData.slug || "preview"}
      title={leadformData.title}
      description={leadformData.description}
      successMessage={leadformData.success_message}
      successRedirectUrl={leadformData.success_redirect_url}
      fieldsConfig={leadformData.fields_config}
      selectedEventTypeIds={leadformData.selected_event_type_ids}
      enableInterestDate={leadformData.enable_interest_date}
      validateWithCalendar={leadformData.validate_with_calendar}
      emailRequired={leadformData.email_required}
      coverUrl={formData.cover_media_url}
      coverType={formData.cover_media_type}
      isPreview={true}
    />
  );
}
