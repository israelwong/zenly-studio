'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Loader2, CheckCircle2, Building2, Copy, Check } from 'lucide-react';
import { ZenButton, ZenDialog, ZenCard } from '@/components/ui/zen';
import { PublicPromiseDataForm } from './PublicPromiseDataForm';
import { PublicContractView } from './PublicContractView';
import { PublicContractCard } from './PublicContractCard';
import { PublicQuoteFinancialCard } from './PublicQuoteFinancialCard';
import { BankInfoModal } from '@/components/shared/BankInfoModal';
import { updatePublicPromiseData, getPublicPromiseData, getPublicCotizacionContract } from '@/lib/actions/public/promesas.actions';
import { regeneratePublicContract } from '@/lib/actions/public/cotizaciones.actions';
import { obtenerInfoBancariaStudio } from '@/lib/actions/cliente/pagos.actions';
import { useCotizacionesRealtime } from '@/hooks/useCotizacionesRealtime';
import { usePromiseNavigation } from '@/hooks/usePromiseNavigation';
import { toast } from 'sonner';
import type { PublicCotizacion } from '@/types/public-promise';
import confetti from 'canvas-confetti';

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
}

export function PublicQuoteAuthorizedView({
  cotizacion: initialCotizacion,
  promiseId,
  studioSlug,
  promise: initialPromise,
  studio,
  cotizacionPrice,
  eventTypeId,
}: PublicQuoteAuthorizedViewProps) {
  const [showContractView, setShowContractView] = useState(false);
  const [showEditDataModal, setShowEditDataModal] = useState(false);
  const [isUpdatingData, setIsUpdatingData] = useState(false);
  const [isRegeneratingContract, setIsRegeneratingContract] = useState(false);
  const [cotizacion, setCotizacion] = useState<PublicCotizacion>(initialCotizacion);
  const [promise, setPromise] = useState(initialPromise);
  const [showBankInfoModal, setShowBankInfoModal] = useState(false);
  const [bankInfo, setBankInfo] = useState<{ banco?: string | null; titular?: string | null; clabe?: string | null } | null>(null);
  const [loadingBankInfo, setLoadingBankInfo] = useState(false);
  const [copiedClabe, setCopiedClabe] = useState(false);
  const confettiFiredRef = useRef(false);

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
  const isContractSigned = !!currentContract?.signed_at;
  const isEnCierre = cotizacion.status === 'en_cierre';

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

  // Efecto Confetti: Disparar celebración solo una vez al ingresar a la página
  // Solo se dispara cuando la cotización está recién autorizada (en_cierre pero sin contrato firmado)
  useEffect(() => {
    if (confettiFiredRef.current) return;

    // Solo disparar confetti si estamos en estado de cierre (recién autorizado)
    // y el contrato aún no está firmado (primera vez que ven esta página)
    if (isEnCierre && !isContractSigned) {
      confettiFiredRef.current = true;

      // Delay de 1 segundo para que la página cargue completamente y sea más impactante
      const timer = setTimeout(() => {
        // Disparar confetti desde el centro superior de la pantalla
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.3 },
        });
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isEnCierre, isContractSigned]);

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

  // Callback cuando se firma el contrato
  const handleContractSigned = useCallback(async () => {
    try {
      // Recargar datos del contrato para obtener contract_signed_at actualizado
      const result = await getPublicCotizacionContract(studioSlug, cotizacion.id);
      if (result.success && result.data) {
        const contractUpdate = {
          template_id: result.data.template_id,
          content: result.data.content,
          version: result.data.version || 1,
          signed_at: result.data.signed_at, // Incluir fecha de firma
          condiciones_comerciales: result.data.condiciones_comerciales,
        };
        setContractData(contractUpdate);
      }
    } catch (error) {
      console.error('[PublicQuoteAuthorizedView] Error updating contract after signing:', error);
    }
  }, [studioSlug, cotizacion.id]);

  // ⚠️ TAREA 1: Hook de navegación para prevenir race conditions
  const { isNavigating, setNavigating, getIsNavigating, clearNavigating } = usePromiseNavigation();

  // Escuchar cambios en tiempo real de cotizaciones_cierre (cuando el estudio edita el contrato)
  // ⚠️ TAREA 1: Bloquear sincronización durante navegación
  useCotizacionesRealtime({
    studioSlug,
    promiseId,
    onCotizacionUpdated: useCallback((updatedCotizacionId: string) => {
      // ⚠️ CRÍTICO: Bloquear sincronización si estamos navegando
      if (getIsNavigating()) {
        console.log('[PublicQuoteAuthorizedView] Ignorando actualización de realtime durante navegación');
        return;
      }

      // Si la cotización actualizada es la que estamos mostrando, actualizar solo el contrato localmente
      if (updatedCotizacionId === cotizacion.id) {
        updateContractLocally();
      }
    }, [cotizacion.id, updateContractLocally, getIsNavigating]),
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
          toast.success('Datos actualizados y contrato regenerado correctamente');
          setIsRegeneratingContract(false);
        }
      } else {
        toast.success('Datos actualizados correctamente');
      }

      // 3. Cerrar modal
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
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header emotivo de celebración */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 mb-4 animate-pulse">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          </div>
          <h2 className="text-3xl font-bold text-zinc-100 mb-3">
            ¡Fecha Reservada con Éxito!
          </h2>
          <p className="text-lg text-zinc-400">
            Tu evento ha quedado pre-agendado. Solo falta un paso para oficializarlo.
          </p>
        </div>

        {/* Flujo reorganizado: Paso principal destacado */}
        <div className="relative space-y-6">
          {/* PASO PRINCIPAL: Firma de Contrato */}
          {(isContractGenerated || isEnCierre) && (
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
                  <PublicContractCard
                    contract={currentContract || null}
                    isContractSigned={isContractSigned}
                    isRegeneratingContract={isRegeneratingContract}
                    isUpdatingData={isUpdatingData}
                    onEditData={() => {
                      // ⚠️ TAREA 3: Cerrar overlays antes de abrir modal de edición
                      window.dispatchEvent(new CustomEvent('close-overlays'));
                      setShowEditDataModal(true);
                    }}
                    onViewContract={() => {
                      // ⚠️ TAREA 3: Cerrar overlays antes de abrir vista de contrato
                      window.dispatchEvent(new CustomEvent('close-overlays'));
                      setShowContractView(true);
                    }}
                  />
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

      {/* Vista de Contrato */}
      {((hasContract && currentContract?.content) || (hasContractTemplate && currentContract?.template_id)) && (isContractGenerated || isEnCierre) && (
        <PublicContractView
          isOpen={showContractView}
          onClose={() => setShowContractView(false)}
          onContractSigned={handleContractSigned}
          cotizacionId={cotizacion.id}
          promiseId={promiseId}
          studioSlug={studioSlug}
          contractContent={currentContract?.content || null}
          contractTemplateId={currentContract?.template_id || null}
          contractVersion={currentContract?.version}
          condicionesComerciales={currentContract?.condiciones_comerciales || null}
          promise={promise}
          studio={studio}
          cotizacionPrice={cotizacionPrice}
          isSigned={isContractSigned}
          eventTypeId={eventTypeId}
        />
      )}

      {/* Modal para editar datos */}
      <ZenDialog
        isOpen={showEditDataModal}
        onClose={() => !isUpdatingData && setShowEditDataModal(false)}
        title="Actualizar mis datos"
        description="Actualiza tu información de contacto y del evento. El contrato se regenerará automáticamente con los nuevos datos."
        maxWidth="2xl"
        onSave={() => {
          const form = document.querySelector('form');
          if (form) {
            form.requestSubmit();
          }
        }}
        onCancel={() => !isUpdatingData && setShowEditDataModal(false)}
        saveLabel={isUpdatingData ? 'Guardando...' : 'Actualizar datos'}
        cancelLabel="Cancelar"
        isLoading={isUpdatingData}
        zIndex={10060}
      >
        <PublicPromiseDataForm
          promiseId={promiseId}
          studioSlug={studioSlug}
          initialData={promise}
          onSubmit={handleUpdateData}
          isSubmitting={isUpdatingData}
          showEventTypeAndDate={true}
        />
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

