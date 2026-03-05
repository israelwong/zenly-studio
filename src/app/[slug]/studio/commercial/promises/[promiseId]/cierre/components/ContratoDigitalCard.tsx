'use client';

import React, { memo } from 'react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenSwitch } from '@/components/ui/zen';
import { DatosRequeridosSection } from './DatosRequeridosSection';
import { ContratoSection } from './ContratoSection';
import { ContratoDigitalCardSkeleton } from './PromiseCierreSkeleton';
import type { CotizacionListItem } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';

interface ContratoDigitalCardProps {
  cotizacion: CotizacionListItem | null;
  studioSlug: string;
  promiseId: string;
  contractData: {
    contract_template_id?: string | null;
    contract_content?: string | null;
    contract_version?: number;
    contract_signed_at?: Date | null;
    contrato_definido?: boolean;
    firma_requerida?: boolean;
    ultima_version_info?: {
      version: number;
      change_reason: string | null;
      change_type: string;
      created_at: Date;
    } | null;
  } | null;
  firmaRequerida?: boolean;
  onFirmaRequeridaChange?: (value: boolean) => void;
  loadingRegistro: boolean;
  /** Carga atómica: mientras true, muestra skeleton en lugar del contenido */
  isLoading?: boolean;
  eventTypeId: string | null;
  condicionesComerciales: {
    id: string;
    name: string;
    description?: string | null;
    discount_percentage?: number | null;
    advance_type?: string;
    advance_percentage?: number | null;
    advance_amount?: number | null;
  } | null | undefined;
  promiseData: {
    name: string;
    phone: string;
    email: string | null;
    address: string | null;
    event_date: Date | null;
    event_name: string | null;
    event_type_name: string | null;
    event_location?: string | null;
    duration_hours?: number | null;
  };
  onContratoButtonClick: () => void;
  showContratoOptionsModal: boolean;
  onCloseContratoOptionsModal: () => void;
  onContratoSuccess: () => void;
  onCancelarContrato?: (motivo?: string) => Promise<void> | void;
  onRegenerateContract?: () => Promise<void>;
  onEditarDatosClick: () => void;
  contratoOmitido?: boolean;
  onContratoOmitido?: () => void;
  onRevocarOmitido?: () => void;
}

function ContratoDigitalCardInner({
  cotizacion,
  studioSlug,
  promiseId,
  contractData,
  loadingRegistro,
  isLoading = false,
  eventTypeId,
  condicionesComerciales,
  promiseData,
  onContratoButtonClick,
  showContratoOptionsModal,
  onCloseContratoOptionsModal,
  onContratoSuccess,
  onCancelarContrato,
  onRegenerateContract,
  onEditarDatosClick,
  contratoOmitido = false,
  onContratoOmitido,
  onRevocarOmitido,
  firmaRequerida = true,
  onFirmaRequeridaChange,
}: ContratoDigitalCardProps) {
  if (isLoading || !cotizacion) {
    return <ContratoDigitalCardSkeleton />;
  }

  const incluirContrato = !contratoOmitido;
  const contratoFirmado = !!contractData?.contract_signed_at;
  const switchDisabled = contratoFirmado;
  
  const pendientes: string[] = [];
  if (!promiseData.email?.trim()) pendientes.push('correo');
  if (!promiseData.address?.trim()) pendientes.push('dirección');
  if (!promiseData.event_name?.trim()) pendientes.push('nombre del evento');
  if (!promiseData.event_location?.trim() && !promiseData.address?.trim()) pendientes.push('locación');
  if (!promiseData.event_date) pendientes.push('fecha del evento');
  const mostrarMensajeBloqueo = incluirContrato && pendientes.length > 0;
  const textoPendientes =
    pendientes.length === 1
      ? pendientes[0]
      : pendientes.length === 2
        ? `${pendientes[0]} y ${pendientes[1]}`
        : pendientes.slice(0, -1).join(', ') + ' y ' + pendientes[pendientes.length - 1];

  return (
    <ZenCard className="h-auto">
      <ZenCardHeader className="border-b border-zinc-800 py-3 px-4">
        <div className="flex flex-col gap-3 w-full">
          <div className="relative group">
            <ZenSwitch
              checked={incluirContrato}
              onCheckedChange={(checked) => {
                if (switchDisabled) return;
                if (checked) onRevocarOmitido?.();
                else onContratoOmitido?.();
              }}
              label="Incluir Contrato Digital"
              labelClassName="text-sm text-zinc-300"
              variant="emerald"
              className="w-full"
              disabled={switchDisabled}
            />
            {switchDisabled && (
              <div className="absolute inset-0 cursor-not-allowed" title="No se puede excluir un contrato que ya ha sido firmado por el cliente" />
            )}
          </div>
          {switchDisabled && (
            <p className="text-xs text-emerald-400/80 flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Contrato firmado por el cliente
            </p>
          )}
        </div>
      </ZenCardHeader>
      <ZenCardContent className="p-4 space-y-4">
        {mostrarMensajeBloqueo && (
          <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-md px-3 py-2">
            Completa {textoPendientes} para poder generar el contrato.
          </p>
        )}
        {/* DATOS REQUERIDOS — en gris cuando contrato omitido */}
        <div
          className={`transition-all duration-200 ${contratoOmitido ? 'opacity-75 grayscale' : ''}`}
        >
          <DatosRequeridosSection
            promiseData={promiseData}
            onEditarClick={onEditarDatosClick}
            contratoOmitido={contratoOmitido}
          />
        </div>

        {/* CONTRATO DIGITAL */}
        <ContratoSection
          contractData={contractData}
          loadingRegistro={loadingRegistro}
          cotizacionStatus={cotizacion.status}
          isClienteNuevo={cotizacion.selected_by_prospect === true}
          onContratoButtonClick={onContratoButtonClick}
          showContratoOptionsModal={showContratoOptionsModal}
          onCloseContratoOptionsModal={onCloseContratoOptionsModal}
          onContratoSuccess={onContratoSuccess}
          onCancelarContrato={onCancelarContrato}
          onRegenerateContract={onRegenerateContract}
          contratoOmitido={contratoOmitido}
          onContratoOmitido={onContratoOmitido}
          onRevocarOmitido={onRevocarOmitido}
          firmaRequerida={firmaRequerida}
          onFirmaRequeridaChange={onFirmaRequeridaChange}
          studioSlug={studioSlug}
          promiseId={promiseId}
          cotizacionId={cotizacion.id}
          eventTypeId={eventTypeId || null}
          condicionesComerciales={condicionesComerciales}
          promiseData={promiseData}
        />
      </ZenCardContent>
    </ZenCard>
  );
}

export const ContratoDigitalCard = memo(ContratoDigitalCardInner);
