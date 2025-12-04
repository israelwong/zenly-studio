"use client";

import { useState, useEffect } from "react";
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle } from "@/components/ui/zen";
import { MobilePreviewFull } from "@/components/previews";
import { LeadFormEditor } from "../editors/LeadFormEditor";
import { OfferLeadForm } from "@/components/offers/OfferLeadForm";
import { useOfferEditor } from "../OfferEditorContext";
import { getStudioIdBySlug } from "@/lib/actions/studio/offers/offers.actions";

interface LeadFormTabProps {
  studioSlug: string;
  studioId?: string;
}

export function LeadFormTab({ studioSlug, studioId: initialStudioId }: LeadFormTabProps) {
  const [studioId, setStudioId] = useState<string>(initialStudioId || "");
  const { formData, leadformData } = useOfferEditor();

  useEffect(() => {
    if (!initialStudioId) {
      const loadStudioId = async () => {
        const id = await getStudioIdBySlug(studioSlug);
        if (id) {
          setStudioId(id);
        }
      };
      loadStudioId();
    }
  }, [studioSlug, initialStudioId]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Col 1: Editor */}
      <div>
        <ZenCard>
          <ZenCardHeader>
            <ZenCardTitle>
              Formulario de Contacto <span className="text-xs font-normal text-zinc-600">(Paso 3 de 3)</span>
            </ZenCardTitle>
          </ZenCardHeader>
          <ZenCardContent>
            <LeadFormEditor />
          </ZenCardContent>
        </ZenCard>
      </div>

      {/* Col 2: Preview */}
      <div className="hidden lg:block">
        <div className="sticky top-6">
          <MobilePreviewFull
            data={null}
            contentVariant="custom"
            activeTab="inicio"
            loading={false}
            onClose={() => { }}
            isEditMode={true}
            hidePortfolioHeader={true}
          >
            <div className="h-full overflow-auto">
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
            </div>
          </MobilePreviewFull>
        </div>
      </div>
    </div>
  );
}
