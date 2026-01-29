'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle } from '@/components/ui/zen';
import { DatosRequeridosSection } from './DatosRequeridosSection';
import { ContratoSection } from './ContratoSection';
import { ContractPreviewForPromiseModal } from './contratos/ContractPreviewForPromiseModal';
import { getContractTemplate } from '@/lib/actions/studio/business/contracts/templates.actions';
import type { ContractTemplate } from '@/types/contracts';
import type { CotizacionListItem } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import { Eye } from 'lucide-react';

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

export function ContratoDigitalCard({
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
  const [showContractPreview, setShowContractPreview] = useState(false);
  const [contractTemplate, setContractTemplate] = useState<ContractTemplate | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(false);

  const tieneContratoDefinido = contractData?.contrato_definido && contractData?.contract_template_id;

  const loadTemplate = useCallback(async () => {
    if (!contractData?.contract_template_id) return;
    setLoadingTemplate(true);
    try {
      const result = await getContractTemplate(studioSlug, contractData.contract_template_id);
      if (result.success && result.data) {
        setContractTemplate(result.data);
      }
    } catch (error) {
      console.error('[ContratoDigitalCard] Error loading template:', error);
    } finally {
      setLoadingTemplate(false);
    }
  }, [contractData?.contract_template_id, studioSlug]);

  // Cargar template cuando hay template_id para el preview
  useEffect(() => {
    if (contractData?.contrato_definido && contractData?.contract_template_id) {
      const shouldLoad = !contractTemplate || contractTemplate.id !== contractData.contract_template_id;
      if (shouldLoad) {
        loadTemplate();
      }
    } else {
      setContractTemplate(null);
    }
  }, [contractData?.contract_template_id, contractData?.contrato_definido, contractTemplate, loadTemplate]);

  const handlePreviewClick = () => {
    if (contractData?.contract_template_id && contractTemplate) {
      setShowContractPreview(true);
    } else if (contractData?.contract_template_id) {
      loadTemplate().then(() => {
        setShowContractPreview(true);
      });
    }
  };

  return (
    <ZenCard className="h-auto">
      <ZenCardHeader className="border-b border-zinc-800 py-3 px-4">
        <div className="flex items-center justify-between">
          <ZenCardTitle className="text-sm">Contrato Digital</ZenCardTitle>
          {tieneContratoDefinido && (
            <button
              onClick={handlePreviewClick}
              className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
            >
              <Eye className="h-3 w-3" />
              Preview
            </button>
          )}
        </div>
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

      {/* Modal Preview de Contrato */}
      {tieneContratoDefinido && contractTemplate && (
        <ContractPreviewForPromiseModal
          isOpen={showContractPreview}
          onClose={() => setShowContractPreview(false)}
          onConfirm={() => setShowContractPreview(false)}
          onEdit={() => {}}
          studioSlug={studioSlug}
          promiseId={promiseId}
          cotizacionId={cotizacion.id}
          template={contractTemplate}
          customContent={contractData?.contract_content}
          condicionesComerciales={condicionesComerciales || undefined}
          isContractSigned={!!contractData?.contract_signed_at}
        />
      )}
    </ZenCard>
  );
}
