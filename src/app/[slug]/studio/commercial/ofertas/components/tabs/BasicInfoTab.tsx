"use client";

import { useState, useEffect } from "react";
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenSwitch, ZenButton } from "@/components/ui/zen";
import { MobilePreviewOffer } from "@/app/[slug]/studio/components/MobilePreviewOffer";
import { BasicInfoEditor } from "../editors/BasicInfoEditor";
import { OfferCardPreview } from "../previews/OfferCardPreview";
import { useOfferEditor } from "../OfferEditorContext";
import { checkOfferSlugExists } from "@/lib/actions/studio/offers/offers.actions";

interface BasicInfoTabProps {
  studioSlug: string;
  mode: "create" | "edit";
  offerId?: string;
  onSave?: () => void;
  onCancel?: () => void;
  isSaving?: boolean;
  savedOfferId?: string | null;
}

export function BasicInfoTab({ studioSlug, mode, offerId, onSave, onCancel, isSaving, savedOfferId }: BasicInfoTabProps) {
  // Usar savedOfferId si está disponible (después del primer guardado), sino offerId
  const currentOfferId = savedOfferId || offerId;
  const { formData, updateFormData } = useOfferEditor();

  const [nameError, setNameError] = useState<string | null>(null);
  const [isValidatingSlug, setIsValidatingSlug] = useState(false);
  const [slugHint, setSlugHint] = useState<string | null>(null);

  // Validar slug único cuando cambia
  useEffect(() => {
    const validateSlug = async () => {
      if (!formData.slug || !formData.slug.trim()) {
        setNameError(null);
        setSlugHint(null);
        setIsValidatingSlug(false);
        return;
      }

      setIsValidatingSlug(true);
      setNameError(null);

      try {
        // Excluir la oferta actual si estamos editando o si ya se guardó (tiene ID)
        const slugExists = await checkOfferSlugExists(
          studioSlug,
          formData.slug,
          currentOfferId || undefined
        );

        if (slugExists) {
          setNameError("Ya existe una oferta con este nombre");
          setSlugHint(null);
        } else {
          setNameError(null);
          setSlugHint(`Slug: ${formData.slug}`);
        }
      } catch (error) {
        console.error("Error validating slug:", error);
        setNameError(null);
        setSlugHint(null);
      } finally {
        setIsValidatingSlug(false);
      }
    };

    const timeoutId = setTimeout(() => {
      validateSlug();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData.slug, studioSlug, currentOfferId]);

  const showActionButtons = !savedOfferId && mode === "create";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Col 1: Editor */}
      <div>
        <ZenCard>
          <ZenCardHeader>
            <ZenCardTitle>
              Información <span className="text-xs font-normal text-zinc-600">(Paso 1 de 3)</span>
            </ZenCardTitle>
          </ZenCardHeader>
          <ZenCardContent>
            <BasicInfoEditor
              studioSlug={studioSlug}
              nameError={nameError}
              isValidatingSlug={isValidatingSlug}
              slugHint={slugHint}
            />

            {/* Botones de acción solo antes de guardar */}
            {showActionButtons && (
              <div className="flex items-center gap-3 pt-6 mt-6 border-t border-zinc-800">
                <ZenButton
                  variant="ghost"
                  onClick={onCancel}
                  disabled={isSaving}
                >
                  Cancelar
                </ZenButton>
                <ZenButton
                  onClick={onSave}
                  loading={isSaving}
                  disabled={isSaving}
                  className="flex-1"
                >
                  Crear Oferta
                </ZenButton>
              </div>
            )}
          </ZenCardContent>
        </ZenCard>
      </div>

      {/* Col 2: Preview */}
      <div className="hidden lg:block">
        <div className="sticky top-6">
          <MobilePreviewOffer
            data={{
              studio_name: "Tu Estudio",
              slogan: "Vista previa",
              logo_url: null,
            }}
            loading={false}
          >
            <OfferCardPreview
              name={formData.name}
              description={formData.description}
              coverMediaUrl={formData.cover_media_url}
              coverMediaType={formData.cover_media_type}
            />
          </MobilePreviewOffer>
        </div>
      </div>
    </div>
  );
}
