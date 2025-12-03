"use client";

import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle } from "@/components/ui/zen";
import { MobilePreviewFull } from "@/app/[slug]/studio/components/MobilePreviewFull";
import { LandingEditor } from "../editors/LandingEditor";
import { LandingPreview } from "../previews/LandingPreview";

interface LandingPageTabProps {
  studioSlug: string;
}

export function LandingPageTab({ studioSlug }: LandingPageTabProps) {
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
            <LandingEditor studioSlug={studioSlug} />
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
            hideHeader={true}
          >
            <div className="h-full overflow-auto">
              <LandingPreview studioSlug={studioSlug} />
            </div>
          </MobilePreviewFull>
        </div>
      </div>
    </div>
  );
}
