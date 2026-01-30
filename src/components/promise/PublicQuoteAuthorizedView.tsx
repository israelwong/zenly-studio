'use client';

import { useState, useCallback, useEffect, useRef, startTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle2, Building2, Copy, Check } from 'lucide-react';
import { ZenButton, ZenDialog, ZenCard } from '@/components/ui/zen';
import { PublicPromiseDataForm } from './PublicPromiseDataForm';
import { PublicContractView } from './PublicContractView';
import { PublicContractCard } from './PublicContractCard';
import { ContractStepCardSkeleton } from '@/app/[slug]/promise/[promiseId]/cierre/CierrePageSkeleton';
import { PublicQuoteFinancialCard } from './PublicQuoteFinancialCard';
import { PublicPromisePageHeader } from './PublicPromisePageHeader';
import { BankInfoModal } from '@/components/shared/BankInfoModal';
import { updatePublicPromiseData, getPublicPromiseData, getPublicCotizacionContract } from '@/lib/actions/public/promesas.actions';
import { regeneratePublicContract } from '@/lib/actions/public/cotizaciones.actions';
import { obtenerInfoBancariaStudio } from '@/lib/actions/cliente/pagos.actions';
import type { CotizacionChangeInfo } from '@/hooks/useCotizacionesRealtime';
import { useCotizacionesRealtime } from '@/hooks/useCotizacionesRealtime';
import { usePromiseNavigation } from '@/hooks/usePromiseNavigation';
import { toast } from 'sonner';
import type { PublicCotizacion } from '@/types/public-promise';
import { RealtimeUpdateNotification } from './RealtimeUpdateNotification';

interface PublicQuoteAuthorizedViewProps {
  cotizacion: PublicCotizacion;
  promiseId: string;
  studioSlug: string;
  promise: {
    contact_name: string;
    contact_phone: string;
    contact_email: string | null;
    contact_address: string | null;
    event_type_name: string | null;
    event_type_cover_image_url?: string | null;
    event_type_cover_video_url?: string | null;
    event_type_cover_media_type?: 'image' | 'video' | null;
    event_type_cover_design_variant?: 'solid' | 'gradient' | null;
    event_date: Date | null;
    event_location: string | null;
    event_name: string | null;
  };
  studio: {
    studio_name: string;
    representative_name?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    id?: string;
  };
  cotizacionPrice: number;
  eventTypeId?: string | null;
  /** Espejo comercial: si viene del cierre, controla paso de firma y visibilidad de precios/desglose */
  shareSettings?: {
    auto_generate_contract: boolean;
    show_items_prices: boolean;
    show_categories_subtotals: boolean;
  };
}

export function PublicQuoteAuthorizedView({
  cotizacion: initialCotizacion,
  promiseId,
  studioSlug,
  promise: initialPromise,
  studio,
  cotizacionPrice,
  eventTypeId,
  shareSettings,
}: PublicQuoteAuthorizedViewProps) {
  const router = useRouter();
  const [showContractView, setShowContractView] = useState(false);
  const [showEditDataModal, setShowEditDataModal] = useState(false);
  const [showSuccessDataModal, setShowSuccessDataModal] = useState(false);
  const [hasFormChanges, setHasFormChanges] = useState(false);
  const [isUpdatingData, setIsUpdatingData] = useState(false);
  const [isRegeneratingContract, setIsRegeneratingContract] = useState(false);
  const [cotizacion, setCotizacion] = useState<PublicCotizacion>(initialCotizacion);
  const [promise, setPromise] = useState(initialPromise);
  const [showBankInfoModal, setShowBankInfoModal] = useState(false);
  const [bankInfo, setBankInfo] = useState<{ banco?: string | null; titular?: string | null; clabe?: string | null } | null>(null);
  const [loadingBankInfo, setLoadingBankInfo] = useState(false);
  const [copiedClabe, setCopiedClabe] = useState(false);
  
  // Estado de actualización para notificaciones (solo insert/delete, no cambios de estatus)
  const [pendingUpdate, setPendingUpdate] = useState<{ 
    count: number; 
    type: 'quote' | 'promise' | 'both';
    changeType?: 'price' | 'description' | 'name' | 'inserted' | 'deleted' | 'general';
    requiresManualUpdate?: boolean;
  } | null>(null);

  // Estado separado para el contrato (se actualiza independientemente)
  const [contractData, setContractData] = useState<{
    template_id: string | null;
    content: string | null;
    version?: number;
    signed_at?: Date | null;
    condiciones_comerciales: {
      id: string;
      name: string;
      description: string | null;
      advance_percentage: number | null;
      advance_type: string | null;
      advance_amount: number | null;
      discount_percentage: number | null;
    } | null;
  } | null>(initialCotizacion.contract ? {
    template_id: initialCotizacion.contract.template_id,
    content: initialCotizacion.contract.content,
    version: initialCotizacion.contract.version,
    signed_at: initialCotizacion.contract.signed_at,
    condiciones_comerciales: initialCotizacion.contract.condiciones_comerciales,
  } : null);

  // Usar contractData si existe, sino usar el de cotizacion (para compatibilidad inicial)
  const currentContract = contractData || (cotizacion as any).contract;

  // Verificar si hay contrato disponible
  // El contrato está disponible si hay contract_content (generado)
  // Si solo hay template_id pero no content, el contrato aún no se ha generado
  const hasContract = !!currentContract?.content;
  const hasContractTemplate = !!currentContract?.template_id;
  const isContractGenerated = cotizacion.status === 'contract_generated' || cotizacion.status === 'contract_signed';
  // IMPORTANTE: Verificar firma desde la tabla temporal (contract.signed_at)
  // ⚠️ Usar useMemo para asegurar estabilidad de valores entre renders
  const isContractSigned = useMemo(() => !!currentContract?.signed_at, [currentContract?.signed_at]);
  const isEnCierre = useMemo(() => cotizacion.status === 'en_cierre', [cotizacion.status]);

  // Obtener condiciones comerciales (priorizar desde contract, sino desde cotizacion directamente)
  // Esto cubre el caso cuando el contrato fue generado manualmente por el estudio
  // También considerar condiciones comerciales directamente de la cotización si tiene campos completos (ej: negociación)
  const condicionesComerciales = currentContract?.condiciones_comerciales ||
    (cotizacion.condiciones_comerciales &&
      'id' in cotizacion.condiciones_comerciales &&
      'advance_type' in cotizacion.condiciones_comerciales
      ? {
        id: cotizacion.condiciones_comerciales.id!,
        name: cotizacion.condiciones_comerciales.name!,
        description: cotizacion.condiciones_comerciales.description ?? null,
        advance_percentage: cotizacion.condiciones_comerciales.advance_percentage ?? null,
        advance_type: cotizacion.condiciones_comerciales.advance_type!,
        advance_amount: cotizacion.condiciones_comerciales.advance_amount ?? null,
        discount_percentage: cotizacion.condiciones_comerciales.discount_percentage ?? null,
      }
      : null);

  // Cargar contrato inicialmente si no está disponible
  useEffect(() => {
    // Si no hay contractData pero hay template_id o el estado indica que debería haber contrato
    const shouldLoadContract = !contractData && (
      initialCotizacion.contract?.template_id ||
      initialCotizacion.status === 'contract_generated' ||
      initialCotizacion.status === 'contract_signed' ||
      initialCotizacion.status === 'en_cierre'
    );

    if (shouldLoadContract) {
      updateContractLocally();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo al montar

  // Cargar información bancaria automáticamente cuando el contrato esté firmado
  useEffect(() => {
    if (isContractSigned && !bankInfo && !loadingBankInfo && studio.id) {
      setLoadingBankInfo(true);
      obtenerInfoBancariaStudio(studio.id)
        .then((result) => {
          if (result.success && result.data) {
            setBankInfo({
              banco: result.data.banco,
              titular: result.data.titular,
              clabe: result.data.clabe,
            });
          }
        })
        .catch((error) => {
          console.error('[PublicQuoteAuthorizedView] Error loading bank info:', error);
        })
        .finally(() => {
          setLoadingBankInfo(false);
        });
    }
  }, [isContractSigned, bankInfo, loadingBankInfo, studio.id]);

  const handleShowBankInfo = useCallback(async () => {
    if (!studio.id) {
      toast.error('No se pudo obtener información del estudio');
      return;
    }

    if (bankInfo) {
      setShowBankInfoModal(true);
      return;
    }

    setLoadingBankInfo(true);
    try {
      const result = await obtenerInfoBancariaStudio(studio.id);
      if (result.success && result.data) {
        setBankInfo({
          banco: result.data.banco,
          titular: result.data.titular,
          clabe: result.data.clabe,
        });
        setShowBankInfoModal(true);
      } else {
        toast.error('No se pudo cargar la información bancaria');
      }
    } catch (error) {
      console.error('[PublicQuoteAuthorizedView] Error loading bank info:', error);
      toast.error('Error al cargar información bancaria');
    } finally {
      setLoadingBankInfo(false);
    }
  }, [studio.id, bankInfo]);

  const reloadCotizacionData = useCallback(async () => {
    try {
      const result = await getPublicPromiseData(studioSlug, promiseId);
      if (result.success && result.data) {
        const updatedCotizacion = result.data.cotizaciones.find(c => c.id === cotizacion.id);
        if (updatedCotizacion) {
          setCotizacion(updatedCotizacion);
          // Sincronizar contractData con la cotización actualizada
          const contract = (updatedCotizacion as any).contract;
          if (contract) {
            setContractData({
              template_id: contract.template_id,
              content: contract.content,
              version: contract.version,
              signed_at: contract.signed_at,
              condiciones_comerciales: contract.condiciones_comerciales,
            });
          } else {
            setContractData(null);
          }
        }
        if (result.data.promise) {
          setPromise(result.data.promise);
        }
      }
    } catch (error) {
      console.error('[PublicQuoteAuthorizedView] Error reloading data:', error);
    }
  }, [studioSlug, promiseId, cotizacion.id]);

  // Actualizar solo el contrato localmente (sin recargar toda la cotización)
  const updateContractLocally = useCallback(async () => {
    try {
      const result = await getPublicCotizacionContract(studioSlug, cotizacion.id);
      if (result.success && result.data) {
        // Actualizar solo el estado del contrato, sin tocar cotizacion
        const contractUpdate = {
          template_id: result.data.template_id,
          content: result.data.content,
          version: result.data.version || 1,
          signed_at: result.data.signed_at,
          condiciones_comerciales: result.data.condiciones_comerciales,
        };
        setContractData(contractUpdate);
      }
    } catch (error) {
      console.error('[PublicQuoteAuthorizedView] Error updating contract locally:', error);
    }
  }, [studioSlug, cotizacion.id]);

  // ⚠️ TAREA 1: Hook de navegación para prevenir race conditions (debe ir antes de los callbacks que lo usan)
  const { isNavigating, setNavigating, getIsNavigating, clearNavigating } = usePromiseNavigation();

  // ⚠️ TAREA 3: Optimistic update - Guardar estado anterior para rollback
  const previousContractDataRef = useRef<typeof contractData>(null);

  // Callback optimista ANTES de la Server Action
  const handleContractSignedOptimistic = useCallback(() => {
    // Guardar estado anterior para rollback
    previousContractDataRef.current = contractData;
    
    // ⚠️ OPTIMISTIC UPDATE: Actualizar estado inmediatamente
    if (contractData) {
      setContractData({
        ...contractData,
        signed_at: new Date(), // Actualizar inmediatamente
      });
    }
  }, [contractData]);

  // ⚠️ TAREA 4: Callback cuando se firma el contrato (después de Server Action exitosa)
  // El optimistic update (onContractSignedOptimistic) ya puso signed_at antes de la action,
  // así que al cerrar el modal el card de Pago ya se muestra; este refetch sincroniza con el servidor.
  const handleContractSigned = useCallback(async () => {
    try {
      setNavigating('post-sign');

      const result = await getPublicCotizacionContract(studioSlug, cotizacion.id);
      if (result.success && result.data) {
        const contractUpdate = {
          template_id: result.data.template_id,
          content: result.data.content,
          version: result.data.version || 1,
          signed_at: result.data.signed_at,
          condiciones_comerciales: result.data.condiciones_comerciales,
        };

        startTransition(() => {
          setContractData(contractUpdate);
          clearNavigating(500);
        });
      } else {
        clearNavigating(0);
      }
    } catch (error) {
      console.error('[PublicQuoteAuthorizedView] Error updating contract after signing:', error);
      clearNavigating(0);
    }
  }, [studioSlug, cotizacion.id, setNavigating, clearNavigating]);

  // ⚠️ TAREA 3: Rollback si la Server Action falla
  const handleContractSignedRollback = useCallback(() => {
    if (previousContractDataRef.current) {
      setContractData(previousContractDataRef.current);
      previousContractDataRef.current = null;
    }
  }, []);

  // ⚠️ SIN LÓGICA DE REDIRECCIÓN: El Gatekeeper en el layout maneja toda la redirección
  // Solo mantener lógica de actualización local del contrato si es necesario
  const handleContractUpdated = useCallback(async (updatedCotizacionId: string, changeInfo?: CotizacionChangeInfo) => {
    // Solo procesar si es la cotización actual y hay cambios en el contrato
    if (updatedCotizacionId === cotizacion.id) {
      // ⚠️ Toast si el contrato fue actualizado por el estudio
      if (changeInfo?.camposCambiados?.includes('contract_content') || changeInfo?.camposCambiados?.includes('contract_template_id')) {
        toast.info('El estudio ha actualizado tu contrato', {
          description: 'Los cambios se han aplicado automáticamente',
        });
      }
      // Actualizar contrato localmente si hay cambios
      if (changeInfo?.camposCambiados && changeInfo.camposCambiados.length > 0) {
        updateContractLocally();
      }
    }
  }, [cotizacion.id, updateContractLocally]);

  // Handler para cuando se inserta una nueva cotización (mostrar notificación)
  const handleCotizacionInserted = useCallback((changeInfo?: CotizacionChangeInfo) => {
    console.log('[PublicQuoteAuthorizedView] Nueva cotización insertada', { changeInfo });
    setPendingUpdate((prev) => {
      if (!prev) {
        return { count: 1, type: 'quote', changeType: 'inserted', requiresManualUpdate: true };
      }
      return { 
        count: prev.count + 1, 
        type: prev.type === 'quote' ? 'quote' : 'both',
        changeType: 'inserted',
        requiresManualUpdate: true 
      };
    });
  }, []);

  // Handler para cuando se elimina una cotización (mostrar notificación)
  const handleCotizacionDeleted = useCallback((cotizacionId: string) => {
    console.log('[PublicQuoteAuthorizedView] Cotización eliminada', { cotizacionId });
    setPendingUpdate((prev) => {
      if (!prev) {
        return { count: 1, type: 'quote', changeType: 'deleted', requiresManualUpdate: true };
      }
      return { 
        count: prev.count + 1, 
        type: prev.type === 'quote' ? 'quote' : 'both',
        changeType: 'deleted',
        requiresManualUpdate: true 
      };
    });
  }, []);

  // Función para recargar datos cuando el usuario hace clic en el botón
  const handleManualReload = useCallback(async () => {
    try {
      const result = await getPublicPromiseData(studioSlug, promiseId);
      if (result.success && result.data) {
        const updatedCotizacion = result.data.cotizaciones.find(c => c.id === cotizacion.id);
        if (updatedCotizacion) {
          setCotizacion(updatedCotizacion);
          const contract = (updatedCotizacion as any).contract;
          if (contract) {
            setContractData({
              template_id: contract.template_id,
              content: contract.content,
              version: contract.version,
              signed_at: contract.signed_at,
              condiciones_comerciales: contract.condiciones_comerciales,
            });
          } else {
            setContractData(null);
          }
        }
        if (result.data.promise) {
          setPromise(result.data.promise);
        }
        setPendingUpdate(null);
      }
    } catch (error) {
      console.error('[PublicQuoteAuthorizedView] Error en recarga manual:', error);
    }
  }, [studioSlug, promiseId, cotizacion.id]);

  // ✅ REALTIME: Escuchar cambios en cotizaciones para actualizar el contrato cuando se genere
  // Usar ref para mantener callbacks estables
  const updateContractLocallyRef = useRef(updateContractLocally);
  updateContractLocallyRef.current = updateContractLocally;
  
  useCotizacionesRealtime({
    studioSlug,
    promiseId,
    ignoreCierreEvents: false, // Escuchar studio_cotizaciones_cierre (generar, actualizar, cancelar contrato)
    onCotizacionUpdated: (cotizacionId, changeInfo) => {
      if (cotizacionId !== cotizacion.id || getIsNavigating()) return;

      const info = changeInfo as { contractSignedAt?: Date | null; camposCambiados?: string[] } | undefined;
      // Evento de cierre: siempre refrescar contrato (cubre generar, actualizar y cancelar contrato)
      const isCierreEvent = info && 'contractSignedAt' in info;
      if (isCierreEvent) {
        setTimeout(() => updateContractLocallyRef.current(), 500);
        return;
      }

      // Evento en studio_cotizaciones: actualizar si hay cambios de contrato
      if (!contractData?.content && hasContractTemplate) {
        setTimeout(() => updateContractLocallyRef.current(), 500);
        return;
      }
      const camposCambiados = info?.camposCambiados || [];
      const hasContractChanges = camposCambiados.some((campo: string) =>
        campo.includes('contrato') || campo.includes('contract') ||
        campo.includes('contrato_definido') || campo.includes('contract_content')
      );
      if (hasContractChanges) {
        setTimeout(() => updateContractLocallyRef.current(), 500);
      }
    },
  });

  const handleUpdateData = async (data: {
    contact_name: string;
    contact_phone: string;
    contact_email: string;
    contact_address: string;
    event_name: string;
    event_location: string;
  }) => {
    // ⚠️ TAREA 3: Cerrar overlays antes de actualizar
    window.dispatchEvent(new CustomEvent('close-overlays'));
    
    setIsUpdatingData(true);
    try {
      // 1. Actualizar datos de la promesa
      const updateResult = await updatePublicPromiseData(studioSlug, promiseId, {
        contact_name: data.contact_name,
        contact_phone: data.contact_phone,
        contact_email: data.contact_email,
        contact_address: data.contact_address,
        event_name: data.event_name,
        event_location: data.event_location,
      });

      if (!updateResult.success) {
        toast.error('Error al actualizar datos', {
          description: updateResult.error || 'Por favor, intenta de nuevo.',
        });
        setIsUpdatingData(false);
        return;
      }

      // Actualizar estado local de promise
      setPromise({
        ...promise,
        contact_name: data.contact_name,
        contact_phone: data.contact_phone,
        contact_email: data.contact_email,
        contact_address: data.contact_address,
        event_name: data.event_name,
        event_location: data.event_location,
      });

      // 2. Si hay contrato generado (pero no firmado), regenerarlo
      if ((hasContract || hasContractTemplate) && !isContractSigned) {
        setIsRegeneratingContract(true);
        setIsUpdatingData(false); // Ya terminó la actualización de datos

        const regenerateResult = await regeneratePublicContract(
          studioSlug,
          promiseId,
          cotizacion.id
        );

        if (!regenerateResult.success) {
          toast.warning('Datos actualizados, pero hubo un error al regenerar el contrato', {
            description: regenerateResult.error || 'El estudio puede regenerarlo manualmente.',
          });
          setIsRegeneratingContract(false);
        } else {
          // Actualizar solo el contrato localmente después de regenerar
          await updateContractLocally();
          setIsRegeneratingContract(false);
          setShowSuccessDataModal(true);
        }
      } else {
        setShowSuccessDataModal(true);
      }

      // 3. Cerrar modal de edición
      setShowEditDataModal(false);
    } catch (error) {
      console.error('Error en handleUpdateData:', error);
      toast.error('Error al actualizar datos', {
        description: 'Por favor, intenta de nuevo o contacta al estudio.',
      });
      setIsRegeneratingContract(false);
    } finally {
      setIsUpdatingData(false);
    }
  };

  return (
    <>
      {/* Notificación de cambios - Solo para insert/delete, no para cambios de estatus */}
      <RealtimeUpdateNotification
        pendingUpdate={pendingUpdate}
        onUpdate={handleManualReload}
        onDismiss={() => setPendingUpdate(null)}
      />

      {/* Header evolutivo con asesoría profesional */}
      <PublicPromisePageHeader
        prospectName={promise.contact_name}
        eventName={promise.event_name}
        eventTypeName={promise.event_type_name}
        eventDate={promise.event_date}
        variant="cierre"
        isContractSigned={isContractSigned}
        coverImageUrl={promise.event_type_cover_image_url}
        coverVideoUrl={promise.event_type_cover_video_url}
        coverMediaType={promise.event_type_cover_media_type}
        coverDesignVariant={promise.event_type_cover_design_variant}
      />

      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Resumen financiero (totales del servidor - SSoT); respeta show_items_prices / show_categories_subtotals */}
        <div className="mb-8">
          <PublicQuoteFinancialCard
            cotizacionName={cotizacion.name}
            cotizacionDescription={cotizacion.description}
            cotizacionPrice={cotizacion.price}
            cotizacionDiscount={cotizacion.discount}
            condicionesComerciales={condicionesComerciales}
            negociacionPrecioOriginal={cotizacion.negociacion_precio_original}
            negociacionPrecioPersonalizado={cotizacion.negociacion_precio_personalizado}
            totalAPagar={cotizacion.totalAPagar}
            anticipo={cotizacion.anticipo}
            diferido={cotizacion.diferido}
            descuentoAplicado={cotizacion.descuentoAplicado}
            ahorroTotal={cotizacion.negociacion_precio_personalizado != null && cotizacion.negociacion_precio_original != null
              ? cotizacion.negociacion_precio_original - cotizacion.negociacion_precio_personalizado
              : undefined}
            showItemsPrices={shareSettings?.show_items_prices ?? true}
            showCategoriesSubtotals={shareSettings?.show_categories_subtotals ?? true}
          />
        </div>

        {/* Flujo reorganizado: Paso principal destacado */}
        <div className="relative space-y-6">
          {/* PASO PRINCIPAL: Firma de Contrato - solo si el estudio tiene habilitado auto_generate_contract */}
          {(isContractGenerated || isEnCierre) && (shareSettings == null || shareSettings.auto_generate_contract === true) && (
            <div className="relative">
              {/* Línea conectora al siguiente paso - solo si el contrato está firmado */}
              {isContractSigned && (
                <div className="absolute left-[19px] top-10 w-0.5 h-[calc(100%+1.5rem)] bg-emerald-500/30 z-0" />
              )}

              <div className="flex items-start gap-4">
                {/* Número del paso - más grande y destacado */}
                <div className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center relative z-10 transition-all duration-300 ${isContractSigned
                  ? 'bg-emerald-500/20 border-2 border-emerald-500 scale-110'
                  : 'bg-blue-500/20 border-2 border-blue-500 ring-2 ring-blue-500/30'
                  }`}>
                  {isContractSigned ? (
                    <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                  ) : (
                    <span className="text-base font-bold text-blue-400">1</span>
                  )}
                </div>

                {/* Contenido */}
                <div className="flex-1 min-w-0">
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-zinc-100 mb-1">
                      {isContractSigned
                        ? 'Contrato Firmado ✓'
                        : 'Firma tu Contrato Digital'}
                    </h3>
                    <p className="text-sm text-zinc-400">
                      {isContractSigned
                        ? '¡Excelente! Tu contrato ha sido firmado exitosamente.'
                        : 'Revisa y firma tu contrato digital para oficializar tu reserva'}
                    </p>
                  </div>
                  {hasContract ? (
                    <PublicContractCard
                      contract={currentContract || null}
                      isContractSigned={isContractSigned}
                      isRegeneratingContract={isRegeneratingContract}
                      isUpdatingData={isUpdatingData}
                      onEditData={() => {
                        window.dispatchEvent(new CustomEvent('close-overlays'));
                        setShowEditDataModal(true);
                      }}
                      onViewContract={() => {
                        window.dispatchEvent(new CustomEvent('close-overlays'));
                        setShowContractView(true);
                      }}
                    />
                  ) : (
                    <ContractStepCardSkeleton />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* PASO 2: Realiza tu Pago - SOLO visible si el contrato está firmado */}
          {isContractSigned && (
            <div className="relative">
              <div className="flex items-start gap-4">
                {/* Número del paso */}
                <div className="shrink-0 w-10 h-10 rounded-full bg-blue-500/20 border-2 border-blue-500 flex items-center justify-center relative z-10">
                  <span className="text-sm font-bold text-blue-400">2</span>
                </div>

                {/* Contenido */}
                <div className="flex-1 min-w-0">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-zinc-100 mb-1">
                      Realiza tu Anticipo
                    </h3>
                    <p className="text-sm text-zinc-400">
                      ¡Listo! Ahora puedes realizar tu anticipo a esta cuenta:
                    </p>
                  </div>
                  <ZenCard>
                    <div className="p-6">
                      {loadingBankInfo ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-5 w-5 animate-spin text-blue-400 mr-2" />
                          <p className="text-sm text-zinc-400">Cargando información bancaria...</p>
                        </div>
                      ) : bankInfo ? (
                        <div className="space-y-4">
                          <div className="space-y-3 text-sm">
                            {bankInfo.banco && (
                              <div>
                                <span className="text-zinc-400">Banco:</span>
                                <p className="text-zinc-100 font-medium mt-1">{bankInfo.banco}</p>
                              </div>
                            )}

                            {bankInfo.titular && (
                              <div>
                                <span className="text-zinc-400">Titular:</span>
                                <p className="text-zinc-100 font-medium mt-1">{bankInfo.titular}</p>
                              </div>
                            )}

                            {bankInfo.clabe ? (
                              <div>
                                <span className="text-zinc-400">CLABE Interbancaria:</span>
                                <div className="flex items-center gap-2 mt-1 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
                                  <p className="text-zinc-100 font-mono text-base font-bold flex-1">
                                    {bankInfo.clabe}
                                  </p>
                                  <ZenButton
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      navigator.clipboard.writeText(bankInfo.clabe!);
                                      setCopiedClabe(true);
                                      toast.success('CLABE copiada al portapapeles');
                                      setTimeout(() => setCopiedClabe(false), 2000);
                                    }}
                                    className="shrink-0"
                                  >
                                    {copiedClabe ? (
                                      <Check className="h-4 w-4 text-emerald-400" />
                                    ) : (
                                      <Copy className="h-4 w-4" />
                                    )}
                                  </ZenButton>
                                </div>
                              </div>
                            ) : (
                              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                                <p className="text-sm text-yellow-400">
                                  Información bancaria no disponible. Contacta al estudio.
                                </p>
                              </div>
                            )}
                          </div>

                          {bankInfo.clabe && (
                            <div className="pt-4 border-t border-zinc-800">
                              <p className="text-xs text-zinc-500">
                                💡 Usa esta CLABE para realizar transferencias SPEI. Recuerda guardar tu comprobante de pago.
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                          <p className="text-sm text-yellow-400">
                            No se pudo cargar la información bancaria. Contacta al estudio.
                          </p>
                        </div>
                      )}
                    </div>
                  </ZenCard>
                  <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <p className="text-sm text-blue-400 text-center">
                      ✅ Una vez confirmado tu pago por el estudio, tendrás acceso a tu portal de cliente
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Vista de Contrato - solo si firma habilitada (Espejo comercial) */}
      {((hasContract && currentContract?.content) || (hasContractTemplate && currentContract?.template_id)) && (isContractGenerated || isEnCierre) && (shareSettings == null || shareSettings.auto_generate_contract === true) && (
        <PublicContractView
          isOpen={showContractView}
          onClose={() => setShowContractView(false)}
          onContractSigned={handleContractSigned}
          onContractSignedOptimistic={handleContractSignedOptimistic}
          onContractSignedRollback={handleContractSignedRollback}
          cotizacionId={cotizacion.id}
          promiseId={promiseId}
          studioSlug={studioSlug}
          contractContent={currentContract?.content || null}
          contractTemplateId={currentContract?.template_id || null}
          contractVersion={currentContract?.version}
          condicionesComerciales={condicionesComerciales}
          promise={promise}
          studio={studio}
          totalAPagar={cotizacion.totalAPagar}
          anticipo={cotizacion.anticipo}
          diferido={cotizacion.diferido}
          descuentoAplicado={cotizacion.descuentoAplicado}
          cotizacionPrice={cotizacionPrice}
          isSigned={isContractSigned}
          eventTypeId={eventTypeId}
        />
      )}

      {/* Modal para editar datos */}
      <ZenDialog
        isOpen={showEditDataModal}
        onClose={() => {
          if (!isUpdatingData) {
            setShowEditDataModal(false);
            setHasFormChanges(false);
          }
        }}
        title="Actualizar mis datos"
        description="Actualiza tu información de contacto y del evento. El contrato se regenerará automáticamente con los nuevos datos."
        maxWidth="2xl"
        onSave={() => {
          const form = document.querySelector('form');
          if (form) {
            form.requestSubmit();
          }
        }}
        onCancel={() => {
          if (!isUpdatingData) {
            setShowEditDataModal(false);
            setHasFormChanges(false);
          }
        }}
        saveLabel={isUpdatingData ? 'Guardando...' : 'Actualizar datos'}
        cancelLabel="Cancelar"
        isLoading={isUpdatingData}
        saveDisabled={!hasFormChanges}
        zIndex={10060}
      >
        <PublicPromiseDataForm
          promiseId={promiseId}
          studioSlug={studioSlug}
          initialData={promise}
          onSubmit={handleUpdateData}
          isSubmitting={isUpdatingData}
          showEventTypeAndDate={true}
          onHasChangesChange={setHasFormChanges}
        />
      </ZenDialog>

      {/* Modal de éxito tras actualizar datos */}
      <ZenDialog
        isOpen={showSuccessDataModal}
        onClose={() => setShowSuccessDataModal(false)}
        title="Datos actualizados correctamente"
        description="Ya están disponibles en el contrato para revisión y firma."
        maxWidth="sm"
        onCancel={() => setShowSuccessDataModal(false)}
        cancelLabel="Entendido"
        showCloseButton={true}
        zIndex={10061}
      >
        <div className="py-2" />
      </ZenDialog>

      {/* Modal de información bancaria */}
      {bankInfo && (
        <BankInfoModal
          isOpen={showBankInfoModal}
          onClose={() => setShowBankInfoModal(false)}
          bankInfo={bankInfo}
          studioName={studio.studio_name}
        />
      )}
    </>
  );
}

