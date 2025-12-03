"use client";

import { OfferLeadForm } from "@/components/offers/OfferLeadForm";
import { useOfferEditor } from "../OfferEditorContext";

interface LeadFormPreviewProps {
  studioSlug: string;
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
export function LeadFormPreview({ studioSlug }: LeadFormPreviewProps) {
  const { formData, leadformData } = useOfferEditor();

  return (
    <div className="bg-zinc-950 min-h-screen p-4">
      <OfferLeadForm
        studioSlug={studioSlug}
        offerId="preview"
        offerSlug={formData.slug || "preview"}
        title={leadformData.title}
        description={leadformData.description}
        successMessage={leadformData.success_message}
        successRedirectUrl={leadformData.success_redirect_url}
        fieldsConfig={leadformData.fields_config}
        subjectOptions={leadformData.subject_options}
        enableInterestDate={leadformData.enable_interest_date}
        isPreview={true}
      />
    </div>
  );
}
