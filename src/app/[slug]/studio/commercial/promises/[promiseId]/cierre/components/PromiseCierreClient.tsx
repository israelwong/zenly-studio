'use client';

import React, { useState, useCallback, useMemo, useEffect, memo } from 'react';
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
import { getPrecioListaStudio, getAjusteCierre } from '@/lib/utils/promise-public-financials';
import { Loader2 } from 'lucide-react';
import { ContratoDigitalCard } from './ContratoDigitalCard';
import { ActivacionOperativaCard } from './ActivacionOperativaCard';
import { ContractTemplateSimpleSelectorModal } from './contratos/ContractTemplateSimpleSelectorModal';
import { ContractPreviewForPromiseModal } from './contratos/ContractPreviewForPromiseModal';
import { ContractEditorModal } from '@/components/shared/contracts/ContractEditorModal';
import { CierreActionButtons } from './CierreActionButtons';
import { ZenConfirmModal } from '@/components/ui/zen';
import { AutorizacionProgressOverlay } from '@/components/promise/AutorizacionProgressOverlay';
import { CotizacionCardSkeleton, ContratoDigitalCardSkeleton, ActivacionOperativaCardSkeleton, CierreActionButtonsSkeleton } from './PromiseCierreSkeleton';
import { SeguimientoMinimalCard } from '../../components/SeguimientoMinimalCard';
import { PromiseAppointmentCard } from '../../pendiente/components/PromiseAppointmentCard';

interface PromiseCierreClientProps {
  initialCotizacionEnCierre: CotizacionListItem | null;
  /** Métodos de pago inyectados desde el servidor (cache); evita fetch en cliente y re-request en cada remount */
  initialMetodosPago?: Array<{ id: string; payment_method_name: string }>;
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
  auditoriaRentabilidad: { utilidadNeta: number; margenPorcentaje: number } | null;
  pagoData: { pago_monto?: number | null } | null;
  onAnticipoUpdated: () => void;
  onPreviewClick: () => void;
  loadingCotizacion: boolean;
  onDefinirCondiciones: () => void;
  onQuitarCondiciones: () => void;
  isRemovingCondiciones: boolean;
  onMetadataUpdated?: () => void;
  isRefreshingMetadata?: boolean;
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
  auditoriaRentabilidad,
  pagoData,
  onAnticipoUpdated,
  onPreviewClick,
  loadingCotizacion,
  onDefinirCondiciones,
  onQuitarCondiciones,
  isRemovingCondiciones,
  onMetadataUpdated,
  isRefreshingMetadata,
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
          auditoriaRentabilidad={auditoriaRentabilidad}
          pagoData={pagoData}
          onAnticipoUpdated={onAnticipoUpdated}
          onPreviewClick={onPreviewClick}
          loadingCotizacion={loadingCotizacion}
          onDefinirCondiciones={onDefinirCondiciones}
          onQuitarCondiciones={onQuitarCondiciones}
          isRemovingCondiciones={isRemovingCondiciones}
          onMetadataUpdated={onMetadataUpdated}
          isRefreshingMetadata={isRefreshingMetadata}
        />
      )}
      {/* Recordatorio y agenda: mismos componentes que en pendientes para flujo fluido */}
      {promiseId && (
        <>
          <SeguimientoMinimalCard studioSlug={studioSlug} promiseId={promiseId} />
          <PromiseAppointmentCard studioSlug={studioSlug} promiseId={promiseId} />
        </>
      )}
    </div>
  );
});

interface CierreColumn3Props {
  cotizacion: CotizacionListItemType;
  studioSlug: string;
  promiseId: string;
  contratoIsLoading: boolean;
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
  onCancelarContrato: (motivo?: string) => void | Promise<void>;
  onRegenerateContract: () => void | Promise<void>;
  onEditarDatosClick: () => void;
  contratoOmitido: boolean;
  onContratoOmitido: () => Promise<void> | void;
  onRevocarOmitido: () => Promise<void> | void;
  updatingSwitch?: boolean;
  onAutorizar: () => void;
  onCancelarCierre: () => void;
  isAuthorizing: boolean;
  puedeAutorizar: boolean;
  /** Card de activación: contrato firmado pero estudio no ha confirmado pago */
  pagoData?: { pago_confirmado_estudio?: boolean; pago_concepto?: string | null; pago_monto?: number | null; pago_fecha?: Date | null; pago_metodo_id?: string | null } | null;
  anticipoMonto?: number;
  onPagoConfirmSuccess?: () => void;
  metodosPago?: Array<{ id: string; payment_method_name: string }>;
  pagoUpdatePending?: boolean;
  onPagoTransitionPendingChange?: (pending: boolean) => void;
  pagoConfirmadoLocal?: boolean;
  onPagoConfirmadoOptimistic?: (checked: boolean) => void;
  pagoCardKey?: string;
  pagoStagingValid?: boolean;
  onPagoStagingChange?: (staging: unknown[], isValid: boolean) => void;
  firmaRequerida?: boolean;
  onFirmaRequeridaChange?: (value: boolean) => void;
  /** true cuando se exige confirmación de pago para autorizar (firma requerida + contrato firmado) */
  requiereConfirmacionPago?: boolean;
}

const CierreColumn3 = memo(function CierreColumn3({
  cotizacion,
  studioSlug,
  promiseId,
  contratoIsLoading,
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
  contratoOmitido,
  onContratoOmitido,
  onRevocarOmitido,
  updatingSwitch = false,
  onAutorizar,
  onCancelarCierre,
  isAuthorizing,
  puedeAutorizar,
  pagoData,
  anticipoMonto = 0,
  onPagoConfirmSuccess,
  metodosPago = [],
  pagoUpdatePending = false,
  onPagoTransitionPendingChange,
  pagoConfirmadoLocal = false,
  onPagoConfirmadoOptimistic,
  pagoCardKey,
  pagoStagingValid = true,
  onPagoStagingChange,
  firmaRequerida = true,
  onFirmaRequeridaChange,
  requiereConfirmacionPago = false,
}: CierreColumn3Props) {
  return (
    <div className="lg:col-span-1 flex flex-col h-full space-y-6">
      <ContratoDigitalCard
            cotizacion={cotizacion}
            studioSlug={studioSlug}
            promiseId={promiseId}
            contractData={contractData}
            loadingRegistro={loadingRegistro}
            isLoading={contratoIsLoading}
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
            contratoOmitido={contratoOmitido}
            onContratoOmitido={onContratoOmitido}
            onRevocarOmitido={onRevocarOmitido}
            updatingSwitch={updatingSwitch}
            firmaRequerida={firmaRequerida}
            onFirmaRequeridaChange={onFirmaRequeridaChange}
          />
      {cotizacion?.status === 'en_cierre' &&
        (contratoIsLoading ? (
          <ActivacionOperativaCardSkeleton />
        ) : onPagoConfirmSuccess ? (
          <ActivacionOperativaCard
            key={pagoCardKey}
            studioSlug={studioSlug}
            cotizacionId={cotizacion.id}
            anticipoMonto={anticipoMonto}
            pagoData={pagoData ?? null}
            onSuccess={onPagoConfirmSuccess}
            metodosPago={metodosPago}
            onTransitionPendingChange={onPagoTransitionPendingChange}
            onPagoConfirmadoOptimistic={onPagoConfirmadoOptimistic}
            onStagingChange={onPagoStagingChange}
          />
        ) : null)}
      {contratoIsLoading ? (
        <CierreActionButtonsSkeleton />
      ) : (
        <CierreActionButtons
          onAutorizar={onAutorizar}
          onCancelarCierre={onCancelarCierre}
          isAuthorizing={isAuthorizing}
          loadingRegistro={contratoIsLoading}
          puedeAutorizar={puedeAutorizar}
          pagoConfirmadoLocal={pagoConfirmadoLocal}
          requiereConfirmacionPago={requiereConfirmacionPago}
          pagoUpdatePending={pagoUpdatePending}
          pagoStagingValid={pagoStagingValid}
        />
      )}
    </div>
  );
});

export function PromiseCierreClient({
  initialCotizacionEnCierre,
  initialMetodosPago = [],
}: PromiseCierreClientProps) {
  const params = useParams();
  const router = useRouter();
  const studioSlug = params.slug as string;
  const promiseId = params.promiseId as string;
  const { promiseData: contextPromiseData } = usePromiseContext();

  const [showEditModal, setShowEditModal] = useState(false);
  const [cotizacionEnCierre, setCotizacionEnCierre] = React.useState(initialCotizacionEnCierre);
  const [pagoUpdatePending, setPagoUpdatePending] = useState(false);
  const [pagoConfirmadoLocal, setPagoConfirmadoLocal] = useState(false);
  const [pagoStagingValid, setPagoStagingValid] = useState(true);
  const [pagoStagingData, setPagoStagingData] = useState<unknown[]>([]);

  const handleEditSuccess = useCallback(() => {
    // ✅ OPTIMIZACIÓN: Cerrar modal primero, luego refresh sin recarga completa
    setShowEditModal(false);
    router.refresh(); // En lugar de window.location.reload()
  }, [router]);

  const [reloadingCotizaciones, setReloadingCotizaciones] = useState(false);

  const reloadCotizacionEnCierre = useCallback(async () => {
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
  }, [promiseId]);

  const handleCierreCancelado = useCallback(() => {
    reloadCotizacionEnCierre();
  }, [reloadCotizacionEnCierre]);

  const handleMetadataUpdated = useCallback(() => {
    reloadCotizacionEnCierre();
  }, [reloadCotizacionEnCierre]);

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
    pagoStagingData,
    pagoConfirmadoLocal,
  });

  // Sincronizar pagoConfirmadoLocal desde servidor solo cuando no hay transición en curso
  useEffect(() => {
    if (!pagoUpdatePending && cierreLogic.pagoData) {
      setPagoConfirmadoLocal(cierreLogic.pagoData.pago_confirmado_estudio === true);
    }
  }, [pagoUpdatePending, cierreLogic.pagoData?.pago_confirmado_estudio]);

  // Skeletons atómicos: columna 2 (cotización) y columna 3 (contrato) con carga atómica
  const showSkeletons = useMemo(() => {
    const { loadingRegistro, condicionesData, hasLoadedRegistroOnce, loadingCotizacion } = cierreLogic;
    const showCotizacionSkeleton = loadingRegistro || loadingCotizacion || (!hasLoadedRegistroOnce && condicionesData == null);
    // Contrato: carga atómica (loadingRegistro || loadingCotizacion)
    const contratoIsLoading = loadingRegistro || loadingCotizacion;
    return { showCotizacionSkeleton, contratoIsLoading };
  }, [cierreLogic.loadingRegistro, cierreLogic.loadingCotizacion, cierreLogic.condicionesData, cierreLogic.hasLoadedRegistroOnce]);

  // Desglose idéntico al de la tarjeta (SSOT servidor) para el modal "Ver cotización" — paridad con Resumen de Cierre y contrato.
  const resumenCierreOverride = useMemo(() => {
    const dc = cierreLogic.desgloseCierre;
    const cond = cierreLogic.condicionesData?.condiciones_comerciales;
    const precioBase = cotizacionEnCierre?.price ?? 0;
    const negPrecio = cierreLogic.negociacionData?.negociacion_precio_personalizado;
    const totalNegociado = negPrecio != null && Number(negPrecio) > 0 ? Math.round(Number(negPrecio)) : null;
    if (!dc || !cond) return null;
    const discountPct = cond.discount_percentage ?? 0;
    const descuentoCondicionMonto = discountPct > 0 ? Math.round(precioBase * discountPct / 100) : 0;
    const precioFinalCierre = totalNegociado ?? Math.round(precioBase - descuentoCondicionMonto);
    const montoCortesias = dc.cortesias_monto ?? 0;
    const montoBono = dc.bono_especial ?? 0;
    const tieneConcesiones = montoCortesias > 0 || montoBono > 0 || descuentoCondicionMonto > 0;
    const precioLista = getPrecioListaStudio({ price: precioBase, precio_calculado: dc.precio_calculado });
    const ajusteCierre = getAjusteCierre(precioBase, precioLista, montoCortesias, montoBono);
    const isFixed = cond.advance_type === 'fixed_amount' || cond.advance_type === 'amount';
    const anticipoFromCondition = isFixed && cond.advance_amount != null
      ? Number(cond.advance_amount)
      : (cond.advance_percentage != null ? Math.round(precioFinalCierre * (Number(cond.advance_percentage) / 100)) : 0);
    const anticipoOverride = cierreLogic.pagoData?.pago_monto != null ? Number(cierreLogic.pagoData.pago_monto) : null;
    const anticipo = anticipoOverride ?? anticipoFromCondition;
    const diferido = Math.max(0, precioFinalCierre - anticipo);
    return {
      precioLista,
      montoCortesias,
      cortesiasCount: dc.cortesias_count ?? 0,
      montoBono,
      ajusteCierre,
      descuentoCondicionMonto,
      descuentoCondicionPct: discountPct > 0 ? discountPct : undefined,
      precioFinalCierre,
      tieneConcesiones,
      advanceType: (isFixed ? 'fixed_amount' : 'percentage') as 'percentage' | 'fixed_amount',
      anticipoPorcentaje: cond.advance_percentage ?? null,
      anticipo,
      diferido,
      anticipoModificado: anticipoOverride != null && Math.abs(anticipoOverride - anticipoFromCondition) >= 0.01,
    };
  }, [cierreLogic.desgloseCierre, cierreLogic.condicionesData?.condiciones_comerciales, cierreLogic.pagoData?.pago_monto, cierreLogic.negociacionData?.negociacion_precio_personalizado, cotizacionEnCierre?.price]);

  // Early returns solo después de todos los hooks (regla de React).
  if (!contextPromiseData) {
    return null;
  }
  if (!initialCotizacionEnCierre && !cierreLogic.isAuthorizing) {
    return null;
  }

  const overlay = (
    <AutorizacionProgressOverlay
      show={cierreLogic.isAuthorizing}
      progress={cierreLogic.authorizationProgress}
      error={cierreLogic.authorizationError}
      successReceived={cierreLogic.authorizationSuccess}
      onClose={() => {
        cierreLogic.setIsAuthorizing(false);
        cierreLogic.setAuthorizationError(null);
        cierreLogic.setAuthorizationEventoId(null);
        cierreLogic.setAuthorizationSuccess(false);
      }}
    />
  );

  return (
    <>
      {initialCotizacionEnCierre ? (
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
              auditoriaRentabilidad={cierreLogic.auditoriaRentabilidad ?? null}
              pagoData={cierreLogic.pagoData}
              onAnticipoUpdated={cierreLogic.handlePagoSuccess}
              onPreviewClick={cierreLogic.handleOpenPreview}
              loadingCotizacion={cierreLogic.loadingCotizacion}
              onDefinirCondiciones={cierreLogic.handleDefinirCondiciones}
              onQuitarCondiciones={cierreLogic.handleQuitarCondiciones}
              isRemovingCondiciones={cierreLogic.isRemovingCondiciones}
              onMetadataUpdated={handleMetadataUpdated}
              isRefreshingMetadata={reloadingCotizaciones}
            />
          )}

          {/* Columna 3: Contrato, Pago, Acciones — memoizada; skeleton solo en mount inicial */}
          <CierreColumn3
            cotizacion={cotizacionEnCierre}
            studioSlug={studioSlug}
            promiseId={promiseId}
            contratoIsLoading={showSkeletons.contratoIsLoading}
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
            contratoOmitido={cierreLogic.contratoOmitido}
            onContratoOmitido={cierreLogic.handleContratoOmitido}
            onRevocarOmitido={cierreLogic.handleRevocarOmitido}
            updatingSwitch={cierreLogic.updatingSwitch}
            onAutorizar={cierreLogic.handleAutorizar}
            onCancelarCierre={cierreLogic.handleOpenCancelModal}
            isAuthorizing={cierreLogic.isAuthorizing}
            puedeAutorizar={cierreLogic.puedeAutorizar}
            pagoData={cierreLogic.pagoData}
            anticipoMonto={resumenCierreOverride?.anticipo ?? 0}
            onPagoConfirmSuccess={cierreLogic.handlePagoSuccess}
            metodosPago={initialMetodosPago}
            pagoUpdatePending={pagoUpdatePending}
            onPagoTransitionPendingChange={setPagoUpdatePending}
            pagoConfirmadoLocal={pagoConfirmadoLocal}
            onPagoConfirmadoOptimistic={setPagoConfirmadoLocal}
            pagoCardKey={cotizacionEnCierre ? `pago-${cotizacionEnCierre.id}-${cierreLogic.pagoData?.pago_confirmado_estudio}` : undefined}
            pagoStagingValid={pagoStagingValid}
            onPagoStagingChange={(staging, isValid) => {
              setPagoStagingValid(isValid);
              setPagoStagingData(staging);
            }}
            firmaRequerida={cierreLogic.contractData?.firma_requerida !== false}
            onFirmaRequeridaChange={cierreLogic.handleFirmaRequeridaChange}
            requiereConfirmacionPago={
              (cierreLogic.contractData?.firma_requerida !== false) &&
              !!cierreLogic.contractData?.contract_signed_at
            }
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
                anticipoOverride={cierreLogic.pagoData?.pago_monto != null ? Number(cierreLogic.pagoData.pago_monto) : null}
                resumenCierreOverride={resumenCierreOverride}
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
            loading={false}
            disabled={cierreLogic.isAuthorizing}
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
              </div>
            }
            confirmText={cierreLogic.isAuthorizing ? 'Autorizando...' : 'Sí, autorizar y crear evento'}
            cancelText="Cancelar"
          />

        </>
      )}
        </>
      ) : null}
      {overlay}
    </>
  );
}
