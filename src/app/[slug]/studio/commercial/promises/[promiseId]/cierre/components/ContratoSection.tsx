'use client';

import React, { memo, useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Loader2, Eye } from 'lucide-react';
import { ContratoGestionCard } from './ContratoGestionCard';
import { ContractPreviewForPromiseModal } from './contratos/ContractPreviewForPromiseModal';
import { getContractTemplate } from '@/lib/actions/studio/business/contracts/templates.actions';
import type { ContractTemplate } from '@/types/contracts';

interface ContractData {
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
}

interface CondicionComercial {
  id: string;
  name: string;
  description?: string | null;
  discount_percentage?: number | null;
  advance_type?: string;
  advance_percentage?: number | null;
  advance_amount?: number | null;
}

interface ContratoSectionProps {
  contractData: ContractData | null;
  loadingRegistro: boolean;
  cotizacionStatus: string;
  isClienteNuevo: boolean;
  onContratoButtonClick: () => void;
  showContratoOptionsModal: boolean;
  onCloseContratoOptionsModal: () => void;
  onContratoSuccess: () => void;
  // Props para ContratoGestionCard
  studioSlug: string;
  promiseId: string;
  cotizacionId: string;
  eventTypeId: string | null;
  condicionesComerciales: CondicionComercial | null;
  promiseData: {
    name: string;
    phone: string;
    email: string | null;
    address: string | null;
    event_date: Date | null;
    event_name: string | null;
    event_type_name: string | null;
  };
}

export const ContratoSection = memo(function ContratoSection({
  contractData,
  loadingRegistro,
  cotizacionStatus,
  isClienteNuevo,
  onContratoButtonClick,
  showContratoOptionsModal,
  onCloseContratoOptionsModal,
  onContratoSuccess,
  studioSlug,
  promiseId,
  cotizacionId,
  eventTypeId,
  condicionesComerciales,
  promiseData,
}: ContratoSectionProps) {
  const [showContractPreview, setShowContractPreview] = useState(false);
  const [contractTemplate, setContractTemplate] = useState<ContractTemplate | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(false);

  // Calcular estado del contrato dentro del componente
  const tieneContratoGenerado = contractData?.contrato_definido && contractData?.contract_template_id;
  const contratoFirmado = !!contractData?.contract_signed_at;

  // Cargar template cuando hay template_id y se necesita para el preview
  useEffect(() => {
    if (contratoFirmado && contractData?.contract_template_id) {
      // Cargar template si no está cargado o si cambió el template_id
      const shouldLoad = !contractTemplate || contractTemplate.id !== contractData.contract_template_id;
      if (shouldLoad) {
        loadTemplate();
      }
    } else {
      // Limpiar template si no hay contrato firmado o no hay template_id
      setContractTemplate(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractData?.contract_template_id, contratoFirmado]);

  const loadTemplate = async () => {
    if (!contractData?.contract_template_id) return;
    setLoadingTemplate(true);
    try {
      const result = await getContractTemplate(studioSlug, contractData.contract_template_id);
      if (result.success && result.data) {
        setContractTemplate(result.data);
      }
    } catch (error) {
      console.error('[ContratoSection] Error loading template:', error);
    } finally {
      setLoadingTemplate(false);
    }
  };

  const handleViewContract = () => {
    if (contractData?.contract_template_id && contractTemplate) {
      setShowContractPreview(true);
    } else if (contractData?.contract_template_id) {
      // Si no hay template cargado, cargar primero
      loadTemplate().then(() => {
        setShowContractPreview(true);
      });
    }
  };

  let contratoIcon: React.ReactNode;
  let contratoEstado: string;
  let contratoColor: string;
  let contratoBoton: string | null = null;

  if (isClienteNuevo) {
    // Si el contrato está firmado (verificar desde tabla temporal)
    if (contratoFirmado) {
      contratoIcon = <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />;
      contratoEstado = 'Firmado por el cliente';
      contratoColor = 'text-emerald-400';
      contratoBoton = null;
    } else {
      switch (cotizacionStatus) {
        case 'contract_pending':
          contratoIcon = <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />;
          contratoEstado = 'Pendiente de confirmación del cliente';
          contratoColor = 'text-amber-400';
          contratoBoton = null;
          break;
        case 'contract_generated':
          contratoIcon = <AlertCircle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />;
          contratoEstado = 'Generado, esperando firma del cliente';
          contratoColor = 'text-blue-400';
          contratoBoton = null;
          break;
        case 'contract_signed':
          contratoIcon = <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />;
          contratoEstado = 'Firmado por el cliente';
          contratoColor = 'text-emerald-400';
          contratoBoton = null;
          break;
        case 'en_cierre':
          if (tieneContratoGenerado) {
            contratoIcon = <AlertCircle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />;
            contratoEstado = 'Generado, esperando firma del cliente';
            contratoColor = 'text-blue-400';
            contratoBoton = 'Editar';
          } else {
            contratoIcon = <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />;
            contratoEstado = 'Pendiente de generación';
            contratoColor = 'text-amber-400';
            contratoBoton = 'Generar';
          }
          break;
        default:
          if (tieneContratoGenerado) {
            contratoIcon = <AlertCircle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />;
            contratoEstado = 'Generado, esperando firma del cliente';
            contratoColor = 'text-blue-400';
            contratoBoton = 'Editar';
          } else {
            contratoIcon = <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />;
            contratoEstado = 'Pendiente de generación';
            contratoColor = 'text-amber-400';
            contratoBoton = 'Generar';
          }
      }
    }
  } else {
    if (tieneContratoGenerado) {
      contratoIcon = <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />;
      contratoEstado = '';
      contratoColor = 'text-emerald-400';
      contratoBoton = 'Editar';
    } else {
      contratoIcon = <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />;
      contratoEstado = 'No definido';
      contratoColor = 'text-amber-400';
      contratoBoton = 'Definir';
    }
  }
  return (
    <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-3">
      <div className="flex items-start gap-2">
        {loadingRegistro ? (
          <Loader2 className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5 animate-spin" />
        ) : (
          contratoIcon
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-zinc-400 uppercase tracking-wide font-semibold">
              Contrato Digital
            </span>
            {contratoBoton && (
              <button
                onClick={onContratoButtonClick}
                className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                {contratoBoton}
              </button>
            )}
            {contratoFirmado && contractData?.contract_template_id && (
              <button
                onClick={handleViewContract}
                className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
              >
                <Eye className="h-3 w-3" />
                Ver contrato
              </button>
            )}
          </div>
          {contratoEstado && (
            <div className={`text-xs ${contratoColor}`}>
              <p>{contratoEstado}</p>
              {contractData?.contrato_definido && contractData?.contract_version && (
                <p className="text-zinc-500 mt-0.5">
                  Versión {contractData.contract_version}
                  {contractData.contract_version > 1 && contractData.ultima_version_info && (
                    <>
                      {contractData.ultima_version_info.change_type === 'AUTO_REGENERATE' &&
                        contractData.ultima_version_info.change_reason?.includes('actualización de datos') && (
                          <span className="ml-1">• Regenerado por actualización de datos del cliente</span>
                        )}
                      {contractData.ultima_version_info.change_type === 'MANUAL_EDIT' && (
                        <span className="ml-1">• Editado manualmente por el estudio</span>
                      )}
                    </>
                  )}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Card de gestión de contrato */}
      {contratoBoton && contractData?.contract_template_id && (
        <div className="mt-2 pt-2 border-t border-zinc-700/50">
          <ContratoGestionCard
            studioSlug={studioSlug}
            promiseId={promiseId}
            cotizacionId={cotizacionId}
            eventTypeId={eventTypeId}
            selectedTemplateId={contractData?.contract_template_id}
            contractContent={contractData?.contract_content}
            condicionesComerciales={condicionesComerciales as any}
            promiseData={promiseData}
            onSuccess={onContratoSuccess}
            showOptionsModal={showContratoOptionsModal}
            onCloseOptionsModal={onCloseContratoOptionsModal}
            isContractSigned={contratoFirmado}
          />
        </div>
      )}

      {/* Modal Preview de Contrato Firmado */}
      {contratoFirmado && contractTemplate && (
        <ContractPreviewForPromiseModal
          isOpen={showContractPreview}
          onClose={() => setShowContractPreview(false)}
          onConfirm={() => setShowContractPreview(false)}
          onEdit={() => {}}
          studioSlug={studioSlug}
          promiseId={promiseId}
          cotizacionId={cotizacionId}
          template={contractTemplate}
          customContent={contractData?.contract_content}
          condicionesComerciales={condicionesComerciales || undefined}
          isContractSigned={true}
        />
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Comparación personalizada: solo re-renderizar si cambian datos del contrato
  return (
    prevProps.contractData?.contract_template_id === nextProps.contractData?.contract_template_id &&
    prevProps.contractData?.contract_content === nextProps.contractData?.contract_content &&
    prevProps.contractData?.contract_version === nextProps.contractData?.contract_version &&
    prevProps.contractData?.contract_signed_at === nextProps.contractData?.contract_signed_at &&
    prevProps.contractData?.contrato_definido === nextProps.contractData?.contrato_definido &&
    prevProps.loadingRegistro === nextProps.loadingRegistro &&
    prevProps.showContratoOptionsModal === nextProps.showContratoOptionsModal &&
    prevProps.cotizacionStatus === nextProps.cotizacionStatus &&
    prevProps.isClienteNuevo === nextProps.isClienteNuevo
  );
});

