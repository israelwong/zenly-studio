"use client";

import { OfferLandingPage } from "@/components/offers/OfferLandingPage";
import { useOfferEditor } from "../OfferEditorContext";

interface LandingPreviewProps {
  studioSlug: string;
}

/**
 * Preview del landing page usando el componente real público
 * Garantiza consistencia 1:1 con la vista real
 * 
 * ⚠️ TODO: Eliminar este wrapper cuando se migre a arquitectura unificada
 * El componente OfferLandingSection debería usarse directamente en LandingPageTab
 * 
 * Ver: docs/arquitectura-componentes-publicos.md
 */
export function LandingPreview({ studioSlug }: LandingPreviewProps) {
  const { formData, contentBlocks } = useOfferEditor();

  // CTA vacío para preview - sin botones hardcodeados
  const emptyCTA = {
    buttons: [],
  };

  return (
    <div className="overflow-hidden p-0.5">
      <OfferLandingPage
        studioSlug={studioSlug}
        offerId="preview"
        offerSlug={formData.slug || "preview"}
        contentBlocks={contentBlocks}
        ctaConfig={emptyCTA}
        onTrackView={() => { }} // No track en preview
      />
    </div>
  );
}
