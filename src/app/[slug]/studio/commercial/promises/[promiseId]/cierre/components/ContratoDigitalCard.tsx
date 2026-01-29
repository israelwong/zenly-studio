'use client';

import React, { memo } from 'react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle } from '@/components/ui/zen';
import { DatosRequeridosSection } from './DatosRequeridosSection';
import { ContratoSection } from './ContratoSection';
import type { CotizacionListItem } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';

interface ContratoDigitalCardProps {
  cotizacion: CotizacionListItem;
  studioSlug: string;
  promiseId: string;
  contractData: {
    contract_template_id?: string | null;
    contract_content?: string | null;
    contract_version?: number;
    contract_signed_at?: Date | null;
    contrato_definido?: boolean;
    ultima_version_info?: {
      version: number;
      change_reason: string | null;
      change_type: string;
      created_at: Date;
    } | null;
  } | null;
  loadingRegistro: boolean;
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
  onCancelarContrato?: () => Promise<void> | void;
  onRegenerateContract?: () => Promise<void>;
  onEditarDatosClick: () => void;
}

function ContratoDigitalCardInner({
  cotizacion,
  studioSlug,
  promiseId,
  contractData,
  loadingRegistro,
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
}: ContratoDigitalCardProps) {
  return (
    <ZenCard className="h-auto">
      <ZenCardHeader className="border-b border-zinc-800 py-3 px-4">
        <ZenCardTitle className="text-sm">Contrato Digital</ZenCardTitle>
      </ZenCardHeader>
      <ZenCardContent className="p-4 space-y-4">
        {/* DATOS REQUERIDOS PARA CONTRATO */}
        <DatosRequeridosSection
          promiseData={promiseData}
          onEditarClick={onEditarDatosClick}
        />

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
