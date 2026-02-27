'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle, Settings2, PackagePlus } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription, ZenButton, ZenBadge } from '@/components/ui/zen';
import { CotizacionForm } from '../../../../components/CotizacionForm';
import { CotizacionDetailSheet } from '@/components/promise/CotizacionDetailSheet';
import { PromiseShareOptionsModal } from '../../../components/PromiseShareOptionsModal';
import { pasarACierre, type PasarACierreOptions } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import { getPromiseShareSettings } from '@/lib/actions/studio/commercial/promises/promise-share-settings.actions';
import { ConfirmarCierreModal } from '../../../components/ConfirmarCierreModal';
import { toast } from 'sonner';
import { startTransition } from 'react';
import { getStudioPageTitle, STUDIO_PAGE_NAMES } from '@/lib/utils/studio-page-title';
import { usePromiseFocusMode } from '../../../context/PromiseFocusModeContext';
import type { PublicCotizacion } from '@/types/public-promise';

interface EditarCotizacionClientProps {
  initialCotizacion: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    status: string;
    promise_id: string | null;
    contact_id: string | null;
    contact_name?: string | null;
    evento_id: string | null;
    revision_of_id?: string | null;
    revision_number?: number | null;
    revision_status?: string | null;
    condiciones_comerciales_id?: string | null;
    condiciones_comerciales_metodo_pago_id?: string | null;
    selected_by_prospect?: boolean;
    selected_at?: Date | null;
    negociacion_precio_original?: number | null;
    negociacion_precio_personalizado?: number | null;
    items: Array<{
      item_id: string | null;
      quantity: number;
      unit_price: number;
      subtotal: number;
      cost: number;
      expense: number;
      order: number;
      id: string;
      billing_type?: 'HOUR' | 'SERVICE' | 'UNIT' | null;
      name: string | null;
      description: string | null;
      category_name: string | null;
      seccion_name: string | null;
      name_snapshot?: string | null;
      description_snapshot?: string | null;
      category_name_snapshot?: string | null;
      seccion_name_snapshot?: string | null;
      name_raw?: string | null;
      description_raw?: string | null;
      category_name_raw?: string | null;
      seccion_name_raw?: string | null;
      categoria_id?: string | null;
      original_item_id?: string | null;
    }>;
  } | null;
  initialCondicionComercial: {
    id: string;
    name: string;
    description: string | null;
    advance_percentage: number | null;
    advance_type: string | null;
    advance_amount: number | null;
    discount_percentage: number | null;
  } | null;
  /** Estado de ruta de la promesa (pendiente | cierre | autorizada) para enlace "Regresar" directo. */
  promiseState?: 'pendiente' | 'cierre' | 'autorizada' | null;
}

export function EditarCotizacionClient({
  initialCotizacion,
  initialCondicionComercial,
  promiseState,
}: EditarCotizacionClientProps) {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const studioSlug = params.slug as string;
  const promiseId = params.promiseId as string;
  const cotizacionId = params.cotizacionId as string;
  const contactId = searchParams.get('contactId');
  const fromCierre = searchParams.get('from') === 'cierre';
  const focusMode = usePromiseFocusMode();

  // Destino de retorno: cierre si la cotización está en cierre (o from=cierre), sino detalle de promesa
  const isFromCierreFlow = fromCierre || initialCotizacion?.status === 'en_cierre' || initialCotizacion?.status === 'cierre';
  const backHref = isFromCierreFlow
    ? `/${studioSlug}/studio/commercial/promises/${promiseId}/cierre`
    : `/${studioSlug}/studio/commercial/promises/${promiseId}`;

  const [isFormLoading, setIsFormLoading] = useState(false);
  const [showConfirmarCierreModal, setShowConfirmarCierreModal] = useState(false);
  const [isPassingToCierre, setIsPassingToCierre] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewCotizacion, setPreviewCotizacion] = useState<PublicCotizacion | null>(null);
  const previewDataRef = useRef<(() => PublicCotizacion | null) | null>(null);
  const [showShareOptionsModal, setShowShareOptionsModal] = useState(false);
  const [shareSettings, setShareSettings] = useState({ show_items_prices: true, show_categories_subtotals: false });
  const guardarComoPaqueteRef = useRef<(() => void) | null>(null);
  const [isSavingAsPaquete, setIsSavingAsPaquete] = useState(false);

  React.useEffect(() => {
    document.title = getStudioPageTitle(STUDIO_PAGE_NAMES.COTIZACION);
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

  const cotizacionStatus = initialCotizacion?.status || null;
  const cotizacionName = initialCotizacion?.name || '';
  const selectedByProspect = initialCotizacion?.selected_by_prospect || false;
  const condicionComercial = initialCondicionComercial;

  const handlePasarACierreClick = () => {
    if (!promiseId) {
      toast.error('No se puede pasar a cierre sin una promesa asociada');
      return;
    }
    setShowConfirmarCierreModal(true);
  };

  const handleConfirmarCierreConfirm = async (payload: PasarACierreOptions) => {
    if (!promiseId) return;
    setIsPassingToCierre(true);
    try {
      const result = await pasarACierre(studioSlug, cotizacionId, payload);
      if (result.success) {
        setShowConfirmarCierreModal(false);
        toast.success(`${STUDIO_PAGE_NAMES.COTIZACION} pasada a proceso de cierre`);
        window.dispatchEvent(new CustomEvent('close-overlays'));
        startTransition(() => {
          router.push(backHref);
        });
      } else {
        toast.error(result.error || 'Error al pasar cotización a cierre');
        throw new Error(result.error ?? 'Error al pasar cotización a cierre');
      }
    } catch (error) {
      console.error('[handlePasarACierre] Error:', error);
      if (!(error instanceof Error) || !error.message?.includes('Error al pasar')) {
        toast.error('Error al pasar cotización a cierre');
      }
      throw error;
    } finally {
      setIsPassingToCierre(false);
    }
  };

  // Verificar si la cotizaciรณn ya estรก en cierre o autorizada
  const isInCierre = cotizacionStatus === 'en_cierre';
  const isAlreadyAuthorized =
    cotizacionStatus === 'autorizada' ||
    cotizacionStatus === 'aprobada' ||
    cotizacionStatus === 'approved';
  
  const canShowPasarACierre = !isInCierre && !isAlreadyAuthorized;

  if (!initialCotizacion) {
    return null; // El skeleton se muestra en loading.tsx
  }

  const backLabel = 'Propuestas';

  const headerContent = (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-3">
        {isPassingToCierre ? (
          <span className="inline-flex items-center gap-2 rounded-md text-zinc-500 opacity-50 cursor-not-allowed" aria-hidden>
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">{backLabel}</span>
          </span>
        ) : (
          <Link
            href={backHref}
            onClick={() => window.dispatchEvent(new CustomEvent('close-overlays'))}
            className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors text-sm font-medium"
            aria-label="Volver a Propuestas"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            <span>{backLabel}</span>
          </Link>
        )}
        <div>
          <div className="flex items-center gap-2">
            <ZenCardTitle>Editar Cotización</ZenCardTitle>
            {condicionComercial && !fromCierre && (
              <ZenBadge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                {condicionComercial.name}
              </ZenBadge>
            )}
          </div>
          {!fromCierre && (
            <ZenCardDescription>
              {condicionComercial?.description || 'Actualiza la información de la cotización'}
            </ZenCardDescription>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <ZenButton
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => guardarComoPaqueteRef.current?.()}
          disabled={isFormLoading || isSavingAsPaquete}
          className="gap-1.5"
        >
          <PackagePlus className="h-4 w-4" />
          {isSavingAsPaquete ? 'Creando paquete...' : 'Guardar como paquete'}
        </ZenButton>
        <ZenButton
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowShareOptionsModal(true)}
          className="gap-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
        >
          <Settings2 className="h-4 w-4" />
          Visualización y automatización
        </ZenButton>
        {false && canShowPasarACierre && (
          <ZenButton
            variant="primary"
            size="md"
            onClick={handlePasarACierreClick}
            disabled={isFormLoading || isPassingToCierre}
            loading={isPassingToCierre}
            className="bg-emerald-600 hover:bg-emerald-700 text-white focus-visible:ring-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Pasar a Cierre
          </ZenButton>
        )}
      </div>
    </div>
  );

  const handleOpenPreview = useCallback(() => {
    const data = previewDataRef.current?.() ?? null;
    if (!data) {
      toast.info('Completa los datos de la cotización para ver la vista previa');
      return;
    }
    setPreviewCotizacion(data);
    setIsPreviewOpen(true);
  }, []);

  const formContent = (
    <CotizacionForm
      studioSlug={studioSlug}
      cotizacionId={cotizacionId}
      promiseId={promiseId}
      contactId={contactId || null}
      redirectOnSuccess={fromCierre ? undefined : undefined}
      onAfterSave={fromCierre ? () => startTransition(() => router.push(backHref)) : undefined}
      onLoadingChange={setIsFormLoading}
      condicionComercialPreAutorizada={condicionComercial}
      isPreAutorizada={selectedByProspect}
      isAlreadyAuthorized={isAlreadyAuthorized}
      isDisabled={isPassingToCierre}
      hideVisibilityToggle={fromCierre}
      getPreviewDataRef={previewDataRef}
      onRequestPreview={handleOpenPreview}
      hideGuardarComoPaqueteInSidebar={true}
      getGuardarComoPaqueteHandlerRef={guardarComoPaqueteRef}
      onSavingAsPaqueteChange={setIsSavingAsPaquete}
    />
  );

  return (
    <div className={focusMode ? 'w-full' : 'w-full max-w-7xl mx-auto'}>
      {focusMode ? (
        <>
          <div className="border-b border-zinc-800 px-6 py-4">
            {headerContent}
          </div>
          <div>{formContent}</div>
        </>
      ) : (
        <ZenCard variant="default" padding="none">
          <ZenCardHeader className="border-b border-zinc-800">
            {headerContent}
          </ZenCardHeader>
          <ZenCardContent className="p-6">
            {formContent}
          </ZenCardContent>
        </ZenCard>
      )}

      <ConfirmarCierreModal
        isOpen={showConfirmarCierreModal}
        onClose={() => setShowConfirmarCierreModal(false)}
        onConfirm={handleConfirmarCierreConfirm}
        studioSlug={studioSlug}
        cotizacionId={cotizacionId}
        promiseId={promiseId}
        cotizacionName={cotizacionName}
        isLoading={isPassingToCierre}
      />

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
        />
      )}

      <PromiseShareOptionsModal
        key={promiseId}
        isOpen={showShareOptionsModal}
        onClose={() => setShowShareOptionsModal(false)}
        studioSlug={studioSlug}
        promiseId={promiseId}
        contactName={initialCotizacion?.contact_name ?? undefined}
        scope="single"
        defaultTab="visualizacion"
        onSuccess={() => {
          loadShareSettings();
        }}
      />
    </div>
  );
}
