"use client";

import { useState, useEffect } from "react";
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenSwitch, ZenButton } from "@/components/ui/zen";
import { BasicInfoEditor } from "../editors/BasicInfoEditor";
import { OfferCardPreview } from "@/components/previews";
import { useOfferEditor } from "../OfferEditorContext";
import { checkOfferSlugExists } from "@/lib/actions/studio/offers/offers.actions";
import { obtenerCondicionComercial } from "@/lib/actions/studio/config/condiciones-comerciales.actions";
import { obtenerTipoEventoPorId } from "@/lib/actions/studio/negocio/tipos-evento.actions";

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
  const [discountPercentage, setDiscountPercentage] = useState<number | null>(null);
  const [eventTypeName, setEventTypeName] = useState<string | null>(null);

  // Cargar discount_percentage cuando cambia business_term_id
  useEffect(() => {
    const loadDiscountPercentage = async () => {
      if (!formData.business_term_id) {
        setDiscountPercentage(null);
        return;
      }

      try {
        const result = await obtenerCondicionComercial(studioSlug, formData.business_term_id);
        if (result.success && result.data) {
          setDiscountPercentage(result.data.discount_percentage);
        } else {
          setDiscountPercentage(null);
        }
      } catch (error) {
        console.error("Error loading discount:", error);
        setDiscountPercentage(null);
      }
    };

    loadDiscountPercentage();
  }, [formData.business_term_id, studioSlug]);

  // Cargar nombre del tipo de evento cuando cambia event_type_id
  useEffect(() => {
    const loadEventTypeName = async () => {
      if (!formData.event_type_id) {
        setEventTypeName(null);
        return;
      }

      try {
        const result = await obtenerTipoEventoPorId(formData.event_type_id);
        if (result.success && result.data) {
          setEventTypeName(result.data.nombre);
        } else {
          setEventTypeName(null);
        }
      } catch (error) {
        console.error("Error loading event type:", error);
        setEventTypeName(null);
      }
    };

    loadEventTypeName();
  }, [formData.event_type_id]);

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
              mode={mode}
            />

            {/* Botones de acción */}
            <div className="flex items-center gap-3 pt-6 mt-6 border-t border-zinc-800">
              {mode === "create" && showActionButtons ? (
                <>
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
                </>
              ) : mode === "edit" ? (
                <>
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
                    disabled={isSaving || !!nameError}
                    className="flex-1"
                  >
                    Actualizar Oferta
                  </ZenButton>
                </>
              ) : null}
            </div>
          </ZenCardContent>
        </ZenCard>
      </div>

      {/* Col 2: Preview */}
      <div className="hidden lg:block">
        <div className="sticky top-6 space-y-6">
          {/* Preview Desktop */}
          <div>
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">
              Vista Desktop (Sidebar)
            </p>
            <OfferCardPreview
              name={formData.name}
              description={formData.description}
              coverMediaUrl={formData.cover_media_url}
              coverMediaType={formData.cover_media_type}
              discountPercentage={discountPercentage}
              validUntil={formData.end_date ? formData.end_date.toISOString() : null}
              isPermanent={formData.is_permanent}
              hasDateRange={formData.has_date_range}
              startDate={formData.start_date ? formData.start_date.toISOString() : null}
              eventTypeName={eventTypeName}
              variant="desktop"
            />
          </div>

          {/* Preview Mobile */}
          <div>
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">
              Vista Mobile (Carousel)
            </p>
            <OfferCardPreview
              name={formData.name}
              description={formData.description}
              coverMediaUrl={formData.cover_media_url}
              coverMediaType={formData.cover_media_type}
              discountPercentage={discountPercentage}
              validUntil={formData.end_date ? formData.end_date.toISOString() : null}
              isPermanent={formData.is_permanent}
              hasDateRange={formData.has_date_range}
              startDate={formData.start_date ? formData.start_date.toISOString() : null}
              eventTypeName={eventTypeName}
              variant="compact"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
