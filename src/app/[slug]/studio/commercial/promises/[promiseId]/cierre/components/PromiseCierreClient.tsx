'use client';

import React, { useState, useCallback, useMemo, memo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { EventInfoCard } from '@/components/shared/promises';
import { EventFormModal } from '@/components/shared/promises';
import { usePromiseContext } from '../../context/PromiseContext';
import { getCotizacionesByPromiseId } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import type { CotizacionListItem } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import { usePromiseCierreLogic } from './usePromiseCierreLogic';
import { CotizacionCard } from './CotizacionCard';
import { CondicionesComercialeSelectorSimpleModal } from '../../components/condiciones-comerciales/CondicionesComercialeSelectorSimpleModal';
import { ResumenCotizacion } from '@/components/shared/cotizaciones';
import { ZenDialog } from '@/components/ui/zen';
import { Loader2 } from 'lucide-react';
import { ContratoDigitalCard } from './ContratoDigitalCard';
import { ContractTemplateSimpleSelectorModal } from './contratos/ContractTemplateSimpleSelectorModal';
import { ContractPreviewForPromiseModal } from './contratos/ContractPreviewForPromiseModal';
import { ContractEditorModal } from '@/components/shared/contracts/ContractEditorModal';
import { CierreActionButtons } from './CierreActionButtons';
import { ZenConfirmModal } from '@/components/ui/zen';
import { AutorizacionProgressOverlay } from '@/components/promise/AutorizacionProgressOverlay';
import { CotizacionCardSkeleton, ContratoDigitalCardSkeleton } from './PromiseCierreSkeleton';

interface PromiseCierreClientProps {
  initialCotizacionEnCierre: CotizacionListItem | null;
}

/** Skeletons por columna: sticky — una vez que pasan a false no vuelven a true (salvo cambio de promiseId/cotización). */
function useShowSkeletons(
  loadingRegistro: boolean,
  condicionesData: unknown,
  contractData: {
    contract_content?: string | null;
    contrato_definido?: boolean;
  } | null,
  hasLoadedRegistroOnce: boolean
) {
  return useMemo(() => {
    const showCotizacionSkeleton = !hasLoadedRegistroOnce && loadingRegistro && condicionesData == null;
    const showContratoSkeleton =
      !hasLoadedRegistroOnce &&
      ((loadingRegistro && contractData == null) ||
        (contractData != null && !!contractData.contrato_definido && (contractData.contract_content == null || contractData.contract_content === '')));
    return {
      showCotizacionSkeleton,
      showContratoSkeleton,
    };
  }, [loadingRegistro, condicionesData, contractData, hasLoadedRegistroOnce]);
}

type CotizacionListItemType = CotizacionListItem;

interface CierreColumn2Props {
  cotizacion: CotizacionListItemType;
  studioSlug: string;
  promiseId: string;
  showSkeleton: boolean;
  condicionesData: { condiciones_comerciales_id?: string | null; condiciones_comerciales_definidas?: boolean; condiciones_comerciales?: { id: string; name: string; description?: string | null; discount_percentage?: number | null; advance_type?: string; advance_percentage?: number | null; advance_amount?: number | null } | null } | null;
  loadingRegistro: boolean;
  negociacionData: { negociacion_precio_original?: number | null; negociacion_precio_personalizado?: number | null };
  desgloseCierre: { precio_calculado: number | null; bono_especial: number | null; cortesias_monto: number; cortesias_count: number } | null;
  pagoData: { pago_monto?: number | null } | null;
  onAnticipoUpdated: () => void;
  onPreviewClick: () => void;
  loadingCotizacion: boolean;
  onDefinirCondiciones: () => void;
  onQuitarCondiciones: () => void;
  isRemovingCondiciones: boolean;
}

const CierreColumn2 = memo(function CierreColumn2({
  cotizacion,
  studioSlug,
  promiseId,
  showSkeleton,
  condicionesData,
  loadingRegistro,
  negociacionData,
  desgloseCierre,
  pagoData,
  onAnticipoUpdated,
  onPreviewClick,
  loadingCotizacion,
  onDefinirCondiciones,
  onQuitarCondiciones,
  isRemovingCondiciones,
}: CierreColumn2Props) {
  return (
    <div className="lg:col-span-1 flex flex-col h-full space-y-6">
      {showSkeleton ? (
        <CotizacionCardSkeleton />
      ) : (
        <CotizacionCard
          cotizacion={cotizacion}
          studioSlug={studioSlug}
          promiseId={promiseId}
          condicionesData={condicionesData}
          loadingRegistro={loadingRegistro}
          negociacionData={negociacionData}
          desgloseCierre={desgloseCierre}
          pagoData={pagoData}
          onAnticipoUpdated={onAnticipoUpdated}
          onPreviewClick={onPreviewClick}
          loadingCotizacion={loadingCotizacion}
          onDefinirCondiciones={onDefinirCondiciones}
          onQuitarCondiciones={onQuitarCondiciones}
          isRemovingCondiciones={isRemovingCondiciones}
        />
      )}
    </div>
  );
});

interface CierreColumn3Props {
  cotizacion: CotizacionListItemType;
  studioSlug: string;
  promiseId: string;
  showContratoSkeleton: boolean;
  eventTypeId: string | null;
  contractData: {
    contract_template_id?: string | null;
    contract_content?: string | null;
    contract_version?: number;
    contract_signed_at?: Date | null;
    contrato_definido?: boolean;
    ultima_version_info?: { version: number; change_reason: string | null; change_type: string; created_at: Date } | null;
  } | null;
  loadingRegistro: boolean;
  condicionesComerciales: { id: string; name: string; description?: string | null; discount_percentage?: number | null; advance_type?: string; advance_percentage?: number | null; advance_amount?: number | null; } | null | undefined;
  promiseData: { name: string; phone: string; email: string | null; address: string | null; event_date: Date | null; event_name: string | null; event_type_name: string | null; event_location?: string | null; duration_hours?: number | null };
  onContratoButtonClick: () => void;
  showContratoOptionsModal: boolean;
  onCloseContratoOptionsModal: () => void;
  onContratoSuccess: () => void | Promise<void>;
  onCancelarContrato: () => void | Promise<void>;
  onRegenerateContract: () => void | Promise<void>;
  onEditarDatosClick: () => void;
  onAutorizar: () => void;
  onCancelarCierre: () => void;
  isAuthorizing: boolean;
  puedeAutorizar: boolean;
}

const CierreColumn3 = memo(function CierreColumn3({
  cotizacion,
  studioSlug,
  promiseId,
  showContratoSkeleton,
  eventTypeId,
  contractData,
  loadingRegistro,
  condicionesComerciales,
  promiseData,
  onContratoButtonClick,
  showContratoOptionsModal,
  onCloseContratoOptionsModal,
  onContratoSuccess,
  onCancelarContrato,
  onRegenerateContract,
  onEditarDatosClick,
  onAutorizar,
  onCancelarCierre,
  isAuthorizing,
  puedeAutorizar,
}: CierreColumn3Props) {
  return (
    <div className="lg:col-span-1 flex flex-col h-full space-y-6">
      {showContratoSkeleton ? (
        <ContratoDigitalCardSkeleton />
      ) : (
        <ContratoDigitalCard
            cotizacion={cotizacion}
            studioSlug={studioSlug}
            promiseId={promiseId}
            contractData={contractData}
            loadingRegistro={loadingRegistro}
            eventTypeId={eventTypeId}
            condicionesComerciales={condicionesComerciales}
            promiseData={promiseData}
            onContratoButtonClick={onContratoButtonClick}
            showContratoOptionsModal={showContratoOptionsModal}
            onCloseContratoOptionsModal={onCloseContratoOptionsModal}
            onContratoSuccess={onContratoSuccess}
            onCancelarContrato={onCancelarContrato}
            onRegenerateContract={async () => { await onRegenerateContract(); }}
            onEditarDatosClick={onEditarDatosClick}
          />
        )}
      <CierreActionButtons
        onAutorizar={onAutorizar}
        onCancelarCierre={onCancelarCierre}
        isAuthorizing={isAuthorizing}
        loadingRegistro={loadingRegistro}
        puedeAutorizar={puedeAutorizar}
      />
    </div>
  );
});

export function PromiseCierreClient({
  initialCotizacionEnCierre,
}: PromiseCierreClientProps) {
  const params = useParams();
  const router = useRouter();
  const studioSlug = params.slug as string;
  const promiseId = params.promiseId as string;
  const { promiseData: contextPromiseData } = usePromiseContext();

  // ⚠️ CRITICAL: Early returns MUST be before any hooks
  // Si no hay datos del contexto, no mostrar nada (el skeleton se muestra en loading.tsx)
  if (!contextPromiseData) {
    return null;
  }

  // Si no hay cotización en cierre, no mostrar nada (el layout redirigirá)
  if (!initialCotizacionEnCierre) {
    return null;
  }

  const [showEditModal, setShowEditModal] = useState(false);
  const [cotizacionEnCierre, setCotizacionEnCierre] = React.useState(initialCotizacionEnCierre);

  const handleEditSuccess = useCallback(() => {
    // ✅ OPTIMIZACIÓN: Cerrar modal primero, luego refresh sin recarga completa
    setShowEditModal(false);
    router.refresh(); // En lugar de window.location.reload()
  }, [router]);

  const [reloadingCotizaciones, setReloadingCotizaciones] = useState(false);

  const handleCierreCancelado = useCallback(() => {
    // ✅ OPTIMIZACIÓN: Estado de carga local solo para esta sección
    const reloadCotizaciones = async () => {
      setReloadingCotizaciones(true);
      try {
        const result = await getCotizacionesByPromiseId(promiseId);
        if (result.success && result.data) {
          const enCierre = result.data.find(c => c.status === 'en_cierre');
          const aprobada = result.data.find(
            c => (c.status === 'aprobada' || c.status === 'approved') && !c.evento_id
          );
          setCotizacionEnCierre(enCierre || aprobada || null);
        }
      } catch (error) {
        console.error('Error reloading cotizaciones:', error);
      } finally {
        setReloadingCotizaciones(false);
      }
    };
    reloadCotizaciones();
  }, [promiseId]);

  // Memoizar promiseData para evitar recreación en cada render
  const memoizedPromiseData = useMemo(() => {
    if (!contextPromiseData) {
      return {
        name: '',
        phone: '',
        email: null,
        address: null,
        event_date: null,
        event_name: null,
        event_type_name: null,
        event_location: null,
        duration_hours: null,
      };
    }
    return {
      name: contextPromiseData.name,
      phone: contextPromiseData.phone,
      email: contextPromiseData.email,
      address: contextPromiseData.address || null,
      event_date: contextPromiseData.event_date || null,
      event_name: contextPromiseData.event_name || null,
      event_type_name: contextPromiseData.event_type_name || null,
      event_location: contextPromiseData.event_location || null,
      duration_hours: contextPromiseData.duration_hours ?? null,
    };
  }, [
    contextPromiseData?.name,
    contextPromiseData?.phone,
    contextPromiseData?.email,
    contextPromiseData?.address,
    contextPromiseData?.event_date?.getTime(),
    contextPromiseData?.event_name,
    contextPromiseData?.event_type_name,
    contextPromiseData?.event_location,
    contextPromiseData?.duration_hours,
  ]);

  // Memoizar cotizacion dummy para evitar recreación
  const dummyCotizacion = useMemo((): CotizacionListItem => ({
    id: '',
    name: '',
    price: 0,
    status: 'pendiente',
    description: null,
    created_at: new Date(),
    updated_at: new Date(),
    order: null,
    archived: false,
    visible_to_client: false,
    revision_of_id: null,
    revision_number: null,
    revision_status: null,
    selected_by_prospect: false,
    selected_at: null,
    discount: null,
    evento_id: null,
    condiciones_comerciales_id: null,
  }), []);

  // Hook para manejar toda la lógica del proceso de cierre
  // Los hooks deben llamarse siempre, pero solo usamos los datos si están disponibles
  const cierreLogic = usePromiseCierreLogic({
    cotizacion: cotizacionEnCierre || dummyCotizacion,
    promiseData: memoizedPromiseData,
    studioSlug,
    promiseId,
    onCierreCancelado: handleCierreCancelado,
    contactId: contextPromiseData?.contact_id,
    eventTypeId: contextPromiseData?.event_type_id || null,
    acquisitionChannelId: contextPromiseData?.acquisition_channel_id || null,
  });

  // Skeletons por columna: contrato sigue en skeleton hasta tener content o saber que no hay contrato (evita bloque vacío ~2s).
  const showSkeletons = useShowSkeletons(
    cierreLogic.loadingRegistro,
    cierreLogic.condicionesData,
    cierreLogic.contractData,
    cierreLogic.hasLoadedRegistroOnce
  );

  return (
    <>
      <div className="space-y-6">
        {/* Layout de 3 columnas: Info + Cotización/Condiciones + Proceso de Cierre */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-start">
          {/* Columna 1: Información */}
          <div className="lg:col-span-1 flex flex-col h-full">
            <EventInfoCard
              studioSlug={studioSlug}
              contactId={contextPromiseData.contact_id}
              contactData={{
                name: contextPromiseData.name,
                phone: contextPromiseData.phone,
                email: contextPromiseData.email,
                address: contextPromiseData.address || null,
              }}
              eventData={{
                event_type_id: contextPromiseData.event_type_id,
                event_type_name: contextPromiseData.event_type_name || null,
                event_location: contextPromiseData.event_location || null,
                event_name: contextPromiseData.event_name || null,
                duration_hours: contextPromiseData.duration_hours ?? null,
                event_date: contextPromiseData.event_date || null,
                interested_dates: Array.isArray(contextPromiseData.interested_dates) ? (contextPromiseData.interested_dates[0] ?? null) : (contextPromiseData.interested_dates ?? null),
              }}
              acquisitionData={{
                acquisition_channel_id: contextPromiseData.acquisition_channel_id,
                acquisition_channel_name: contextPromiseData.acquisition_channel_name || null,
                social_network_id: contextPromiseData.social_network_id,
                social_network_name: contextPromiseData.social_network_name || null,
                referrer_contact_id: contextPromiseData.referrer_contact_id,
                referrer_name: contextPromiseData.referrer_name,
                referrer_contact_name: contextPromiseData.referrer_contact_name,
                referrer_contact_email: contextPromiseData.referrer_contact_email,
              }}
              promiseId={promiseId}
              promiseData={promiseId ? {
                id: promiseId,
                name: contextPromiseData.name,
                phone: contextPromiseData.phone,
                email: contextPromiseData.email || null,
                address: contextPromiseData.address || null,
                event_type_id: contextPromiseData.event_type_id,
                event_location: contextPromiseData.event_location || null,
                event_name: contextPromiseData.event_name || null,
                duration_hours: contextPromiseData.duration_hours ?? null,
                interested_dates: Array.isArray(contextPromiseData.interested_dates) ? (contextPromiseData.interested_dates[0] ?? null) : (contextPromiseData.interested_dates ?? null),
                acquisition_channel_id: contextPromiseData.acquisition_channel_id || null,
                social_network_id: contextPromiseData.social_network_id || null,
                referrer_contact_id: contextPromiseData.referrer_contact_id || null,
                referrer_name: contextPromiseData.referrer_name || null,
              } : null}
              onEdit={() => setShowEditModal(true)}
              context="promise"
            />
          </div>

          {/* Columna 2: Cotización — memoizada; skeleton solo en mount inicial */}
          {cotizacionEnCierre && (
            <CierreColumn2
              cotizacion={cotizacionEnCierre}
              studioSlug={studioSlug}
              promiseId={promiseId}
              showSkeleton={showSkeletons.showCotizacionSkeleton}
              condicionesData={cierreLogic.condicionesData}
              loadingRegistro={cierreLogic.loadingRegistro}
              negociacionData={cierreLogic.negociacionData}
              desgloseCierre={cierreLogic.desgloseCierre ?? null}
              pagoData={cierreLogic.pagoData}
              onAnticipoUpdated={cierreLogic.handlePagoSuccess}
              onPreviewClick={cierreLogic.handleOpenPreview}
              loadingCotizacion={cierreLogic.loadingCotizacion}
              onDefinirCondiciones={cierreLogic.handleDefinirCondiciones}
              onQuitarCondiciones={cierreLogic.handleQuitarCondiciones}
              isRemovingCondiciones={cierreLogic.isRemovingCondiciones}
            />
          )}

          {/* Columna 3: Contrato, Pago, Acciones — memoizada; skeleton solo en mount inicial */}
          <CierreColumn3
            cotizacion={cotizacionEnCierre}
            studioSlug={studioSlug}
            promiseId={promiseId}
            showContratoSkeleton={showSkeletons.showContratoSkeleton}
            eventTypeId={contextPromiseData.event_type_id || null}
            contractData={cierreLogic.contractData}
            loadingRegistro={cierreLogic.loadingRegistro}
            condicionesComerciales={cierreLogic.condicionesData?.condiciones_comerciales ?? null}
            promiseData={cierreLogic.localPromiseData}
            onContratoButtonClick={cierreLogic.handleContratoButtonClick}
            showContratoOptionsModal={cierreLogic.showContratoOptionsModal}
            onCloseContratoOptionsModal={cierreLogic.handleCloseContratoOptions}
            onContratoSuccess={cierreLogic.handleContratoSuccess}
            onCancelarContrato={cierreLogic.handleCancelarContrato}
            onRegenerateContract={cierreLogic.handleRegenerateContract}
            onEditarDatosClick={cierreLogic.handleEditarDatosClick}
            onAutorizar={cierreLogic.handleAutorizar}
            onCancelarCierre={cierreLogic.handleOpenCancelModal}
            isAuthorizing={cierreLogic.isAuthorizing}
            puedeAutorizar={cierreLogic.puedeAutorizar}
          />
        </div>
      </div>

      {/* Modal de edición */}
      {promiseId && (
        <>
          <EventFormModal
            isOpen={showEditModal}
            onClose={() => setShowEditModal(false)}
            studioSlug={studioSlug}
            context="promise"
            initialData={{
              id: contextPromiseData.contact_id || undefined,
              name: contextPromiseData.name,
              phone: contextPromiseData.phone,
              email: contextPromiseData.email || undefined,
              address: contextPromiseData.address || undefined,
              event_type_id: contextPromiseData.event_type_id || undefined,
              event_location: contextPromiseData.event_location || undefined,
              event_location_id: contextPromiseData.event_location_id ?? undefined,
              event_name: contextPromiseData.event_name || undefined,
              duration_hours: contextPromiseData.duration_hours ?? undefined,
              event_date: contextPromiseData.event_date || undefined,
              interested_dates: Array.isArray(contextPromiseData.interested_dates) ? (contextPromiseData.interested_dates[0] ?? undefined) : (contextPromiseData.interested_dates ?? undefined),
              acquisition_channel_id: contextPromiseData.acquisition_channel_id || undefined,
              social_network_id: contextPromiseData.social_network_id || undefined,
              referrer_contact_id: contextPromiseData.referrer_contact_id || undefined,
              referrer_name: contextPromiseData.referrer_name || undefined,
            }}
            onSuccess={handleEditSuccess}
          />
          {cotizacionEnCierre && (
            <EventFormModal
              isOpen={cierreLogic.showEditPromiseModal}
              onClose={() => cierreLogic.setShowEditPromiseModal(false)}
              studioSlug={studioSlug}
              context="promise"
              initialData={{
                id: contextPromiseData.contact_id || undefined,
                name: contextPromiseData.name,
                phone: contextPromiseData.phone,
                email: contextPromiseData.email || undefined,
                address: contextPromiseData.address || undefined,
                event_type_id: contextPromiseData.event_type_id || undefined,
                event_location: contextPromiseData.event_location || undefined,
                event_location_id: contextPromiseData.event_location_id ?? undefined,
                event_name: contextPromiseData.event_name || undefined,
                duration_hours: contextPromiseData.duration_hours ?? undefined,
                event_date: contextPromiseData.event_date || undefined,
                interested_dates: Array.isArray(contextPromiseData.interested_dates) ? (contextPromiseData.interested_dates[0] ?? undefined) : (contextPromiseData.interested_dates ?? undefined),
                acquisition_channel_id: contextPromiseData.acquisition_channel_id || undefined,
                social_network_id: contextPromiseData.social_network_id || undefined,
                referrer_contact_id: contextPromiseData.referrer_contact_id || undefined,
                referrer_name: contextPromiseData.referrer_name || undefined,
              }}
              onSuccess={async () => {
                cierreLogic.setShowEditPromiseModal(false);
                // Refrescar datos de la promesa
                router.refresh();
              }}
            />
          )}
        </>
      )}

      {/* Modales del proceso de cierre */}
      {cotizacionEnCierre && (
        <>
          {/* Modal Condiciones Comerciales */}
          <CondicionesComercialeSelectorSimpleModal
            isOpen={cierreLogic.showCondicionesModal}
            onClose={() => cierreLogic.setShowCondicionesModal(false)}
            studioSlug={studioSlug}
            cotizacionId={cotizacionEnCierre.id}
            selectedId={cierreLogic.condicionesData?.condiciones_comerciales_id}
            onSuccess={cierreLogic.handleCondicionesSuccess}
          />

          {/* Modal Preview de Cotización */}
          <ZenDialog
            isOpen={cierreLogic.showCotizacionPreview}
            onClose={() => {
              cierreLogic.setShowCotizacionPreview(false);
            }}
            title={`Cotización: ${cotizacionEnCierre.name}`}
            description="Vista previa completa de la cotización"
            maxWidth="4xl"
            onCancel={() => {
              cierreLogic.setShowCotizacionPreview(false);
            }}
            cancelLabel="Cerrar"
            zIndex={10070}
          >
            {cierreLogic.loadingCotizacion ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
              </div>
            ) : cierreLogic.cotizacionCompleta ? (
              <ResumenCotizacion
                cotizacion={cierreLogic.cotizacionCompleta}
                event_duration={cierreLogic.cotizacionCompleta.event_duration ?? null}
                promiseDurationHours={contextPromiseData.duration_hours ?? null}
                studioSlug={studioSlug}
                promiseId={promiseId}
                condicionesComerciales={(cierreLogic.condicionesData?.condiciones_comerciales ?? null) as React.ComponentProps<typeof ResumenCotizacion>['condicionesComerciales']}
                negociacionPrecioOriginal={cierreLogic.negociacionData.negociacion_precio_original}
                negociacionPrecioPersonalizado={cierreLogic.negociacionData.negociacion_precio_personalizado}
              />
            ) : (
              <div className="text-center py-8 text-zinc-400">
                No se pudo cargar la cotización
              </div>
            )}
          </ZenDialog>

          {/* Modal Selector de Plantilla de Contrato */}
          <ContractTemplateSimpleSelectorModal
            isOpen={cierreLogic.showContratoModal}
            onClose={() => cierreLogic.setShowContratoModal(false)}
            studioSlug={studioSlug}
            onSelect={cierreLogic.handleTemplateSelected}
          />

          {/* Modal Preview de Contrato */}
          {cierreLogic.selectedTemplate && (
            <ContractPreviewForPromiseModal
              isOpen={cierreLogic.showContratoPreview}
              onClose={() => {
                cierreLogic.setShowContratoPreview(false);
                cierreLogic.setSelectedTemplate(null);
              }}
              template={cierreLogic.selectedTemplate}
              condicionesComerciales={cierreLogic.condicionesData?.condiciones_comerciales || undefined}
              studioSlug={studioSlug}
              promiseId={promiseId}
              cotizacionId={cotizacionEnCierre.id}
              onConfirm={cierreLogic.handlePreviewConfirm}
              onEdit={cierreLogic.handleEditFromPreview}
            />
          )}

          {/* Modal Editor: personalizar contrato para este cliente */}
          {cierreLogic.selectedTemplate && (
            <ContractEditorModal
              isOpen={cierreLogic.showContractEditor}
              onClose={() => cierreLogic.setShowContractEditor(false)}
              mode="edit-event-contract"
              studioSlug={studioSlug}
              initialContent={cierreLogic.contractData?.contract_content ?? cierreLogic.selectedTemplate.content ?? ''}
              onSave={cierreLogic.handleSaveCustomContract}
              title="Personalizar Contrato"
              description="Personaliza el contrato para este cliente. Los cambios solo aplicarán a esta cotización."
              saveLabel="Guardar y volver a preview"
              zIndex={10090}
            />
          )}

          {/* Modal Confirmar Cancelar Cierre */}
          <ZenConfirmModal
            isOpen={cierreLogic.showCancelModal}
            onClose={() => {
              cierreLogic.setShowCancelModal(false);
              if (cierreLogic.isCancelling) {
                cierreLogic.setIsCancelling(false);
              }
            }}
            onConfirm={cierreLogic.handleCancelarCierre}
            title="¿Cancelar proceso de cierre?"
            description={
              <div className="space-y-3">
                <p className="text-sm text-zinc-300">
                  Al cancelar el proceso de cierre:
                </p>
                <ul className="text-sm text-zinc-400 space-y-2 list-disc list-inside">
                  <li>La cotización regresará a estado <strong className="text-zinc-300">Pendiente</strong></li>
                  <li>Se eliminarán todas las definiciones guardadas (condiciones, contrato, pago)</li>
                </ul>
                <p className="text-sm text-zinc-400 mt-3">
                  ¿Deseas continuar?
                </p>
              </div>
            }
            confirmText={cierreLogic.isCancelling ? 'Cancelando...' : 'Sí, cancelar cierre'}
            cancelText="No, mantener cierre"
            variant="destructive"
            loading={cierreLogic.isCancelling}
          />

          {/* Modal Confirmar Autorizar: se muestra al hacer click en "Autorizar y Crear Evento" */}
          <ZenConfirmModal
            isOpen={cierreLogic.showConfirmAutorizarModal}
            onClose={() => cierreLogic.setShowConfirmAutorizarModal(false)}
            onConfirm={cierreLogic.handleConfirmAutorizar}
            title="¿Autorizar cotización y crear evento?"
            description={
              <div className="space-y-3">
                <p className="text-sm text-zinc-300">
                  Al autorizar esta cotización:
                </p>
                <ul className="text-sm text-zinc-400 space-y-2 list-disc list-inside">
                  <li>Se creará el evento asociado a esta cotización</li>
                  <li>La cotización pasará a estado <strong className="text-zinc-300">Autorizada</strong></li>
                  {cierreLogic.contractData?.contrato_definido && (
                    <li>Se generará el contrato con la plantilla seleccionada</li>
                  )}
                  {cierreLogic.pagoData?.pago_registrado && (
                    <li>Se registrará el pago inicial definido</li>
                  )}
                  <li>Otras cotizaciones de esta promesa serán archivadas</li>
                </ul>
                <p className="text-sm text-zinc-400 mt-3">
                  ¿Deseas continuar?
                </p>
              </div>
            }
            confirmText={cierreLogic.isAuthorizing ? 'Autorizando...' : 'Sí, autorizar y crear evento'}
            cancelText="Cancelar"
          />

          {/* Overlay de progreso de autorización */}
          <AutorizacionProgressOverlay
            show={cierreLogic.isAuthorizing}
            currentTask={cierreLogic.currentTask}
            completedTasks={cierreLogic.completedTasks}
            error={cierreLogic.authorizationError}
            eventoId={cierreLogic.authorizationEventoId}
            studioSlug={studioSlug}
            promiseId={promiseId}
            onClose={() => {
              cierreLogic.setIsAuthorizing(false);
              cierreLogic.setAuthorizationError(null);
              cierreLogic.setAuthorizationEventoId(null);
            }}
          />
        </>
      )}
    </>
  );
}
