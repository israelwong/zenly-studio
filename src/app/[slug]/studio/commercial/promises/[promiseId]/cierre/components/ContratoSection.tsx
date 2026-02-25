'use client';

import React, { memo, useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Loader2, Eye, Trash2 } from 'lucide-react';
import { ZenConfirmModal } from '@/components/ui/zen';
import { getDateOnlyInTimezone, toUtcDateOnly } from '@/lib/utils/date-only';
import { formatDisplayDate } from '@/lib/utils/date-formatter';
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
  onCancelarContrato?: () => Promise<void> | void;
  onRegenerateContract?: () => Promise<void>;
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
  onCancelarContrato,
  onRegenerateContract,
  studioSlug,
  promiseId,
  cotizacionId,
  eventTypeId,
  condicionesComerciales,
  promiseData,
}: ContratoSectionProps) {
  const [showContractPreview, setShowContractPreview] = useState(false);
  const [showCancelarContratoConfirm, setShowCancelarContratoConfirm] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [isCancellingContrato, setIsCancellingContrato] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
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

  const handleConfirmCancelarContrato = async () => {
    if (!onCancelarContrato) return;
    setIsCancellingContrato(true);
    try {
      await onCancelarContrato();
      setShowCancelarContratoConfirm(false);
    } finally {
      setIsCancellingContrato(false);
    }
  };

  const handleConfirmRegenerate = async () => {
    if (!onRegenerateContract) return;
    setIsRegenerating(true);
    try {
      await onRegenerateContract();
      setShowRegenerateConfirm(false);
    } finally {
      setIsRegenerating(false);
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
      contratoEstado = 'Contrato firmado';
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
          contratoEstado = 'Contrato firmado';
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
    // Flujo manual del estudio: si ya está firmado, mostrar Contrato firmado
    if (contratoFirmado) {
      contratoIcon = <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />;
      contratoEstado = 'Contrato firmado';
      contratoColor = 'text-emerald-400';
      contratoBoton = null;
    } else if (tieneContratoGenerado) {
      contratoIcon = <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />;
      contratoEstado = '';
      contratoColor = 'text-emerald-400';
      contratoBoton = 'Editar';
    } else {
      contratoIcon = <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />;
      contratoEstado = 'Clic aquí para seleccionar una plantilla de contrato';
      contratoColor = 'text-amber-400';
      contratoBoton = 'Definir';
    }
  }
  const handleOpenPreview = (e: React.MouseEvent) => {
    if (contratoFirmado && contractData?.contract_template_id) {
      e.stopPropagation();
      handleViewContract();
    }
  };

  const headerTitle = contratoFirmado ? 'Contrato firmado' : 'Contrato Digital';

  return (
    <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg overflow-hidden">
      {/* Header alineado con otros cards */}
      <div className="flex items-center justify-between gap-2 py-2.5 px-3 border-b border-zinc-700/50">
        <div className="flex items-center gap-2 min-w-0">
          {loadingRegistro ? (
            <Loader2 className="h-4 w-4 text-zinc-500 shrink-0 animate-spin" />
          ) : (
            contratoIcon
          )}
          <span className={`text-xs uppercase tracking-wide font-semibold truncate ${contratoFirmado ? 'text-emerald-400' : 'text-zinc-400'}`}>
            {headerTitle}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {contratoBoton && contratoBoton !== 'Definir' && !contratoFirmado && (
            <button
              onClick={onContratoButtonClick}
              className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              {contratoBoton}
            </button>
          )}
          {tieneContratoGenerado && onRegenerateContract && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (contratoFirmado) {
                  setShowRegenerateConfirm(true);
                } else {
                  handleConfirmRegenerate();
                }
              }}
              disabled={isRegenerating}
              className="text-xs text-amber-400 hover:text-amber-300 transition-colors disabled:opacity-50"
              title="Regenerar contrato"
              aria-label="Regenerar contrato"
            >
              {isRegenerating ? (
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              ) : (
                'Regenerar'
              )}
            </button>
          )}
          {contratoFirmado && onCancelarContrato && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowCancelarContratoConfirm(true);
              }}
              className="p-1.5 rounded-md text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
              title="Cancelar contrato"
              aria-label="Cancelar contrato"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Contenido */}
      <div className="p-3 space-y-2">
        {contratoFirmado && contractData?.contract_template_id && (
          <div className="space-y-1">
            <button
              type="button"
              onClick={handleOpenPreview}
              className="flex items-center gap-1.5 text-xs text-white hover:text-zinc-200 transition-colors w-full text-left cursor-pointer"
            >
              <Eye className="h-3.5 w-3.5 shrink-0" />
              Clic para ver preview
            </button>
            {contractData.contract_version != null && (
              <p className="text-xs text-zinc-500">
                Versión del contrato: {contractData.contract_version}
              </p>
            )}
            {contractData.contract_signed_at && (() => {
              const studioTz = 'America/Mexico_City';
              const dayInTz = getDateOnlyInTimezone(contractData.contract_signed_at, studioTz);
              const normalized = dayInTz ?? toUtcDateOnly(contractData.contract_signed_at);
              const textoFirma = normalized
                ? formatDisplayDate(normalized, { day: 'numeric', month: 'long', year: 'numeric' })
                : '—';
              return (
                <p className="text-xs text-zinc-500">
                  Firmado el: {textoFirma}
                </p>
              );
            })()}
          </div>
        )}
        {contratoEstado && !contratoFirmado && (
          <div className={`text-xs ${contratoColor}`}>
            {contratoBoton === 'Definir' ? (
              <button
                type="button"
                onClick={onContratoButtonClick}
                className="text-left w-full text-emerald-400 hover:text-emerald-300 transition-colors font-medium cursor-pointer"
              >
                {contratoEstado}
              </button>
            ) : (
              <p>{contratoEstado}</p>
            )}
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
        {!contratoFirmado && !contratoEstado && contractData?.contrato_definido && contractData?.contract_version && (
          <p className="text-xs text-zinc-500">Versión {contractData.contract_version}</p>
        )}

      {/* Card de gestión de contrato */}
      {contratoBoton && contractData?.contract_template_id && (
        <div className="pt-2 border-t border-zinc-700/50">
          <ContratoGestionCard
            studioSlug={studioSlug}
            promiseId={promiseId}
            cotizacionId={cotizacionId}
            eventTypeId={eventTypeId}
            selectedTemplateId={contractData?.contract_template_id}
            contractContent={contractData?.contract_content}
            condicionesComerciales={condicionesComerciales}
            promiseData={promiseData}
            onSuccess={onContratoSuccess}
            showOptionsModal={showContratoOptionsModal}
            onCloseOptionsModal={onCloseContratoOptionsModal}
            isContractSigned={contratoFirmado}
          />
        </div>
      )}
      </div>

      <ZenConfirmModal
        isOpen={showCancelarContratoConfirm}
        onClose={() => !isCancellingContrato && setShowCancelarContratoConfirm(false)}
        onConfirm={handleConfirmCancelarContrato}
        title="Cancelar contrato"
        description="¿Estás seguro de que deseas cancelar el contrato? Se quitará la plantilla y el contenido. Esta acción no se puede deshacer."
        confirmText="Cancelar contrato"
        cancelText="No, mantener"
        variant="destructive"
        loading={isCancellingContrato}
      />

      <ZenConfirmModal
        isOpen={showRegenerateConfirm}
        onClose={() => !isRegenerating && setShowRegenerateConfirm(false)}
        onConfirm={handleConfirmRegenerate}
        title="Regenerar contrato"
        description={
          <ul className="list-disc list-inside space-y-1.5 text-zinc-300">
            <li>La firma actual del cliente quedará <strong>invalidada</strong>.</li>
            <li>Se generará una nueva versión del contrato con los datos actuales.</li>
            <li>El cliente deberá <strong>firmar nuevamente</strong> desde el enlace de cierre.</li>
          </ul>
        }
        confirmText="Sí, regenerar"
        cancelText="Cancelar"
        variant="destructive"
        loading={isRegenerating}
      />

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
    prevProps.isClienteNuevo === nextProps.isClienteNuevo &&
    prevProps.onCancelarContrato === nextProps.onCancelarContrato &&
    prevProps.onRegenerateContract === nextProps.onRegenerateContract
  );
});

