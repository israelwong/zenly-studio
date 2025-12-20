"use client";

import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle } from "@/components/ui/zen";
import { MobilePreviewFull } from "@/components/previews";
import { LandingEditor } from "../editors/LandingEditor";
import { OfferLandingPage } from "@/components/offers/OfferLandingPage";
import { useOfferEditor } from "../OfferEditorContext";

interface LandingPageTabProps {
  studioSlug: string;
  offerSlug?: string;
  offerId?: string;
  onSave?: () => void | Promise<void>;
  onCancel?: () => void;
}

export function LandingPageTab({ studioSlug, offerSlug, offerId, onSave, onCancel }: LandingPageTabProps) {
  const { formData, contentBlocks } = useOfferEditor();

  // CTA vacío para preview - sin botones hardcodeados
  const emptyCTA = {
    buttons: [],
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Col 1: Editor */}
      <div>
        <ZenCard>
          <ZenCardHeader>
            <ZenCardTitle>
              Landing Page <span className="text-xs font-normal text-zinc-600">(Paso 2 de 3)</span>
            </ZenCardTitle>
          </ZenCardHeader>
          <ZenCardContent>
            <LandingEditor
              studioSlug={studioSlug}
              offerSlug={offerSlug}
              offerId={offerId}
              onSave={onSave}
              onCancel={onCancel}
            />
          </ZenCardContent>
        </ZenCard>
      </div>

      {/* Col 2: Preview */}
      <div className="hidden lg:block">
        <div className="sticky top-6">
          <MobilePreviewFull
            loading={false}
            isEditMode={true}
            hideHeader={true}
          >
            <div className="h-full overflow-auto">
              <div className="overflow-hidden">
                <OfferLandingPage
                  studioSlug={studioSlug}
                  offerId="preview"
                  offerSlug={formData.slug || "preview"}
                  contentBlocks={contentBlocks}
                  ctaConfig={emptyCTA}
                  onTrackView={() => { }} // No track en preview
                  isPreview={true} // Deshabilitar tracking
                  isEditMode={true} // Deshabilitar botones en editor
                />
              </div>
            </div>
          </MobilePreviewFull>
        </div>
      </div>
    </div>
  );
}
