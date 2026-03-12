'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription, ZenButton, ZenBadge } from '@/components/ui/zen';
import { CotizacionForm } from '../../../../components/CotizacionForm';
import { CotizacionDetailSheet } from '@/components/promise/CotizacionDetailSheet';
import { ConfirmarCierreModal } from '../../../components/ConfirmarCierreModal';
import { getPromiseShareSettings } from '@/lib/actions/studio/commercial/promises/promise-share-settings.actions';
import { autorizarAnexoDirecto } from '@/lib/actions/studio/commercial/promises/cotizaciones-cierre.actions';
import type { PasarACierreOptions } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import { toast } from 'sonner';
import type { PublicCotizacion } from '@/types/public-promise';

interface NuevaCotizacionClientProps {
  studioSlug: string;
  promiseId: string;
  packageId: string | null;
  contactId: string | null;
  /** Si true, se crea una propuesta adicional (anexo) vinculada a parentCotizacionId. */
  isAnnex?: boolean;
  /** ID de la cotización principal cuando isAnnex es true. */
  parentCotizacionId?: string | null;
  /** URL a la que redirigir tras guardar (ej. ficha del evento). */
  returnUrl?: string | null;
}

export function NuevaCotizacionClient({
  studioSlug,
  promiseId,
  packageId,
  contactId,
  isAnnex = false,
  parentCotizacionId = null,
  returnUrl = null,
}: NuevaCotizacionClientProps) {
  const router = useRouter();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewCotizacion, setPreviewCotizacion] = useState<PublicCotizacion | null>(null);
  const previewDataRef = useRef<(() => PublicCotizacion | null) | null>(null);
  const guardarComoPaqueteRef = useRef<(() => void) | null>(null);
  const saveHandlersRef = useRef<{ onSaveDraft: () => void; onSavePublish: () => void } | null>(null);
  const skipRedirectAnnexAndOpenCierreModalRef = useRef(false);
  const [cierreModalAnnexId, setCierreModalAnnexId] = useState<string | null>(null);
  const [previewFooterState, setPreviewFooterState] = useState<{
    loading: boolean;
    savingIntent: 'draft' | 'publish' | null;
    isEditMode: boolean;
    condicionIdsVisiblesSize: number;
  } | null>(null);
  const [shareSettings, setShareSettings] = useState({ show_items_prices: true, show_categories_subtotals: false });

  useEffect(() => {
    document.title = 'Zenly Studio - Nueva Cotización';
  }, []);

  const loadShareSettings = useCallback(async () => {
    if (!promiseId || !studioSlug) return;
    const result = await getPromiseShareSettings(studioSlug, promiseId);
    if (result.success && result.data) {
      setShareSettings({
        show_items_prices: result.data.show_items_prices ?? true,
        show_categories_subtotals: result.data.show_categories_subtotals ?? false,
      });
    }
  }, [promiseId, studioSlug]);

  useEffect(() => {
    loadShareSettings();
  }, [loadShareSettings]);

  const handleOpenPreview = useCallback(() => {
    const data = previewDataRef.current?.() ?? null;
    if (!data) {
      toast.info('Completa los datos de la cotización para ver la vista previa');
      return;
    }
    setPreviewCotizacion(data);
    setIsPreviewOpen(true);
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto">
      <ZenCard variant="default" padding="none">
        <ZenCardHeader className="border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <ZenButton
              variant="ghost"
              size="sm"
              onClick={() => {
                if (returnUrl) {
                  router.push(returnUrl);
                } else if (isAnnex && promiseId && studioSlug) {
                  router.push(`/${studioSlug}/studio/commercial/promises/${promiseId}/autorizada`);
                } else {
                  router.back();
                }
              }}
              className="p-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </ZenButton>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <ZenCardTitle className="mb-0">
                  {isAnnex ? 'Nueva propuesta adicional' : 'Nueva Cotización'}
                </ZenCardTitle>
                {isAnnex && (
                  <ZenBadge variant="warning" size="sm" className="text-amber-100 bg-amber-500/35 border-amber-400/60 shrink-0 px-2 py-1 text-xs">
                    Anexo
                  </ZenBadge>
                )}
              </div>
              <ZenCardDescription>
                {isAnnex
                  ? 'La propuesta se sumará al evento actual. Completa los datos y guarda.'
                  : packageId
                    ? 'Crear cotización desde paquete'
                    : 'Crear cotización personalizada'}
              </ZenCardDescription>
            </div>
          </div>
        </ZenCardHeader>
        <ZenCardContent className="p-6">
          <CotizacionForm
            studioSlug={studioSlug}
            promiseId={promiseId}
            packageId={packageId}
            contactId={contactId}
            redirectOnSuccess={returnUrl ?? (isAnnex ? undefined : `/${studioSlug}/studio/commercial/promises/${promiseId}`)}
            returnPathOverride={returnUrl ?? (isAnnex ? `/${studioSlug}/studio/commercial/promises/${promiseId}/autorizada` : undefined)}
            getPreviewDataRef={previewDataRef}
            onRequestPreview={handleOpenPreview}
            hideGuardarComoPaqueteInSidebar={true}
            getGuardarComoPaqueteHandlerRef={guardarComoPaqueteRef}
            getSaveHandlersRef={saveHandlersRef}
            onPreviewFooterStateChange={setPreviewFooterState}
            promiseState={isAnnex ? 'autorizada' : 'pendiente'}
            isAnnex={isAnnex}
            parentCotizacionId={parentCotizacionId ?? undefined}
            skipRedirectAnnexAndOpenCierreModalRef={isAnnex ? skipRedirectAnnexAndOpenCierreModalRef : undefined}
            onAnnexSaveSuccessOpenCierreModal={isAnnex ? (id) => setCierreModalAnnexId(id) : undefined}
          />
        </ZenCardContent>
      </ZenCard>

      {previewCotizacion && (
        <CotizacionDetailSheet
          cotizacion={previewCotizacion}
          isOpen={isPreviewOpen}
          onClose={() => {
            setIsPreviewOpen(false);
            setPreviewCotizacion(null);
          }}
          promiseId={promiseId}
          studioSlug={studioSlug}
          showItemsPrices={shareSettings.show_items_prices}
          showCategoriesSubtotals={shareSettings.show_categories_subtotals}
          isPreviewMode
          studioFooterActions={
            isPreviewOpen && saveHandlersRef.current && previewFooterState
              ? {
                  onSaveDraft: saveHandlersRef.current.onSaveDraft,
                  onSavePublish: saveHandlersRef.current.onSavePublish,
                  onGuardarComoPaquete: () => guardarComoPaqueteRef.current?.(),
                  loading: previewFooterState.loading,
                  savingIntent: previewFooterState.savingIntent,
                  isSavingAsPaquete: false,
                  isEditMode: false,
                  saveDisabledTitle:
                    previewFooterState.condicionIdsVisiblesSize === 0
                      ? 'Selecciona al menos una condición visible para el cliente'
                      : undefined,
                  condicionIdsVisiblesSize: previewFooterState.condicionIdsVisiblesSize,
                }
              : null
          }
        />
      )}

      {isAnnex && cierreModalAnnexId && promiseId && (
        <ConfirmarCierreModal
          isOpen={!!cierreModalAnnexId}
          onClose={() => {
            setCierreModalAnnexId(null);
            // No redirigir: si se cierra o "Seguir editando", el usuario se queda en el formulario
          }}
          onConfirm={async (payload: PasarACierreOptions) => {
            const result = await autorizarAnexoDirecto(studioSlug, promiseId, cierreModalAnnexId, payload);
            if (!result.success) throw new Error(result.error);
            setCierreModalAnnexId(null);
            // Redirigir siempre a la ficha del evento: returnUrl (prioridad) o evento_id de la respuesta
            if (returnUrl) {
              router.replace(returnUrl);
            } else if (result.data?.evento_id) {
              router.replace(`/${studioSlug}/studio/business/events/${result.data.evento_id}`);
            } else {
              router.replace(`/${studioSlug}/studio/commercial/promises/${promiseId}/autorizada`);
            }
          }}
          studioSlug={studioSlug}
          cotizacionId={cierreModalAnnexId}
          promiseId={promiseId}
          isAnnexContext
        />
      )}
    </div>
  );
}
