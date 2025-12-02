"use client";

import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle } from "@/components/ui/zen";
import { MobilePreviewFull } from "@/app/[slug]/studio/components/MobilePreviewFull";
import { LeadFormEditor } from "../editors/LeadFormEditor";
import { LeadFormPreview } from "../previews/LeadFormPreview";

interface LeadFormTabProps {
  studioSlug: string;
}

export function LeadFormTab({ studioSlug }: LeadFormTabProps) {
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
              <LeadFormPreview studioSlug={studioSlug} />
            </div>
          </MobilePreviewFull>
        </div>
      </div>
    </div>
  );
}
