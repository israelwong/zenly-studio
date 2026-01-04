'use client';

import { useState, useCallback } from 'react';
import { Loader2, CheckCircle2, Building2 } from 'lucide-react';
import { ZenButton, ZenDialog, ZenCard } from '@/components/ui/zen';
import { PublicPromiseDataForm } from '@/components/shared/promise/PublicPromiseDataForm';
import { PublicContractView } from './PublicContractView';
import { PublicContractCard } from './PublicContractCard';
import { PublicQuoteFinancialCard } from './PublicQuoteFinancialCard';
import { BankInfoModal } from '@/components/shared/BankInfoModal';
import { updatePublicPromiseData, getPublicPromiseData, getPublicCotizacionContract } from '@/lib/actions/public/promesas.actions';
import { regeneratePublicContract } from '@/lib/actions/public/cotizaciones.actions';
import { obtenerInfoBancariaStudio } from '@/lib/actions/cliente/pagos.actions';
import { useCotizacionesRealtime } from '@/hooks/useCotizacionesRealtime';
import { toast } from 'sonner';
import type { PublicCotizacion } from '@/types/public-promise';

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

  // Estado separado para el contrato (se actualiza independientemente)
  const [contractData, setContractData] = useState<{
    template_id: string | null;
    content: string | null;
    version?: number;
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
  const condicionesComerciales = currentContract?.condiciones_comerciales || null;

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
        setContractData({
          template_id: result.data.template_id,
          content: result.data.content,
          version: result.data.version || 1,
          condiciones_comerciales: result.data.condiciones_comerciales,
        });
      }
    } catch (error) {
      console.error('[PublicQuoteAuthorizedView] Error updating contract locally:', error);
    }
  }, [studioSlug, cotizacion.id]);

  // Escuchar cambios en tiempo real de cotizaciones_cierre (cuando el estudio edita el contrato)
  useCotizacionesRealtime({
    studioSlug,
    promiseId,
    onCotizacionUpdated: useCallback((updatedCotizacionId: string) => {
      // Si la cotización actualizada es la que estamos mostrando, actualizar solo el contrato localmente
      if (updatedCotizacionId === cotizacion.id) {
        updateContractLocally();
      }
    }, [cotizacion.id, updateContractLocally]),
  });

  const handleUpdateData = async (data: {
    contact_name: string;
    contact_phone: string;
    contact_email: string;
    contact_address: string;
    event_name: string;
    event_location: string;
  }) => {
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
        {/* Header del proceso */}
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-zinc-100 mb-2">
            Proceso de Contratación
          </h2>
          <p className="text-zinc-400">
            Sigue estos 3 pasos para completar tu contratación
          </p>
        </div>

        {/* Flujo vertical con pasos */}
        <div className="relative space-y-6">
          {/* PASO 1: Cotización Autorizada */}
          <div className="relative">
            {/* Línea conectora al siguiente paso - verde porque está completado */}
            <div className="absolute left-[19px] top-10 w-0.5 h-[calc(100%+1.5rem)] bg-emerald-500/30 z-0" />

            <div className="flex items-start gap-4">
              {/* Número del paso */}
              <div className="shrink-0 w-10 h-10 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center relative z-10">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              </div>

              {/* Contenido */}
              <div className="flex-1 min-w-0">
                <div className="mb-2">
                  <h3 className="text-lg font-semibold text-zinc-100">
                    Paso 1: Cotización Autorizada
                  </h3>
                  <p className="text-sm text-zinc-400">
                    Has seleccionado tu cotización y condiciones comerciales
                  </p>
                </div>
                <PublicQuoteFinancialCard
                  cotizacionName={cotizacion.name}
                  cotizacionDescription={cotizacion.description}
                  cotizacionPrice={cotizacion.price}
                  cotizacionDiscount={cotizacion.discount}
                  condicionesComerciales={condicionesComerciales}
                />
              </div>
            </div>
          </div>

          {/* PASO 2: Firma de Contrato */}
          {(isContractGenerated || isEnCierre) && (
            <div className="relative">
              {/* Línea conectora al siguiente paso - verde si firmado, azul si pendiente */}
              <div className={`absolute left-[19px] top-10 w-0.5 h-[calc(100%+1.5rem)] z-0 ${isContractSigned ? 'bg-emerald-500/30' : 'bg-blue-500/30'
                }`} />

              <div className="flex items-start gap-4">
                {/* Número del paso */}
                <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center relative z-10 ${isContractSigned
                  ? 'bg-emerald-500/20 border-2 border-emerald-500'
                  : 'bg-blue-500/20 border-2 border-blue-500'
                  }`}>
                  {isContractSigned ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  ) : (
                    <span className="text-sm font-bold text-blue-400">2</span>
                  )}
                </div>

                {/* Contenido */}
                <div className="flex-1 min-w-0">
                  <div className="mb-2">
                    <h3 className="text-lg font-semibold text-zinc-100">
                      {isContractSigned
                        ? 'Paso 2: Firma de contrato'
                        : 'Paso 2: Firma de contrato pendiente'}
                    </h3>
                    <p className="text-sm text-zinc-400">
                      {isContractSigned
                        ? 'Contrato firmado exitosamente'
                        : 'Revisa y firma tu contrato digital'}
                    </p>
                  </div>
                  <PublicContractCard
                    contract={currentContract || null}
                    isContractSigned={isContractSigned}
                    isRegeneratingContract={isRegeneratingContract}
                    isUpdatingData={isUpdatingData}
                    onEditData={() => setShowEditDataModal(true)}
                    onViewContract={() => setShowContractView(true)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* PASO 3: Realiza tu Pago */}
          <div className="relative">
            <div className="flex items-start gap-4">
              {/* Número del paso */}
              <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center relative z-10 ${isContractSigned
                ? 'bg-blue-500/20 border-2 border-blue-500'
                : 'bg-zinc-800 border-2 border-zinc-700'
                }`}>
                <span className={`text-sm font-bold ${isContractSigned ? 'text-blue-400' : 'text-zinc-500'
                  }`}>3</span>
              </div>

              {/* Contenido */}
              <div className="flex-1 min-w-0">
                <div className="mb-2">
                  <h3 className="text-lg font-semibold text-zinc-100">
                    Paso 3: Realiza tu Pago
                  </h3>
                  <p className="text-sm text-zinc-400">
                    Realiza el pago de tu anticipo y confirma tu compromiso con el estudio
                  </p>
                </div>
                <ZenCard>
                  <div className="p-6">
                    {!isContractSigned && (
                      <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                        <p className="text-sm text-amber-400">
                          ⚠️ Primero debes firmar el contrato para continuar con el pago
                        </p>
                      </div>
                    )}
                    <p className="text-sm text-zinc-300 mb-4">
                      Consulta los datos bancarios del estudio para realizar tu transferencia SPEI.
                    </p>
                    <ZenButton
                      onClick={handleShowBankInfo}
                      disabled={loadingBankInfo || !isContractSigned}
                      variant={isContractSigned ? "primary" : "outline"}
                      className="w-full"
                    >
                      {loadingBankInfo ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Cargando...
                        </>
                      ) : (
                        <>
                          <Building2 className="h-4 w-4 mr-2" />
                          Ver Cuenta CLABE para Pago
                        </>
                      )}
                    </ZenButton>
                    {isContractSigned && (
                      <p className="text-xs text-zinc-500 mt-3 text-center">
                        💡 Recuerda guardar tu comprobante de pago
                      </p>
                    )}
                  </div>
                </ZenCard>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Vista de Contrato */}
      {((hasContract && currentContract?.content) || (hasContractTemplate && currentContract?.template_id)) && (isContractGenerated || isEnCierre) && (
        <PublicContractView
          isOpen={showContractView}
          onClose={() => setShowContractView(false)}
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

