'use client';

import React, { memo, useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Loader2, Trash2, MoreVertical, RefreshCw, Pencil } from 'lucide-react';
import {
  ZenBadge,
  ZenConfirmModal,
  ZenDropdownMenu,
  ZenDropdownMenuContent,
  ZenDropdownMenuItem,
  ZenDropdownMenuTrigger,
  ZenSwitch,
} from '@/components/ui/zen';
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
  onCancelarContrato?: (motivo?: string) => Promise<void> | void;
  onRegenerateContract?: () => Promise<void>;
  /** Si true, la tarjeta muestra estado "Omitido" (contrato no se generará al autorizar) */
  contratoOmitido?: boolean;
  onContratoOmitido?: () => void;
  onRevocarOmitido?: () => void;
  /** Si true, se exige firma del cliente antes de autorizar; si false, se puede autorizar sin firma. */
  firmaRequerida?: boolean;
  onFirmaRequeridaChange?: (value: boolean) => void;
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
  contratoOmitido = false,
  onContratoOmitido,
  onRevocarOmitido,
  firmaRequerida = true,
  onFirmaRequeridaChange,
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
  const [motivoCancelacion, setMotivoCancelacion] = useState('');

  // Calcular estado del contrato solo cuando la carga haya terminado (evita parpadeo de estados)
  const tieneContratoGenerado = !loadingRegistro && contractData?.contrato_definido && contractData?.contract_template_id;
  const contratoFirmado = !loadingRegistro && !!contractData?.contract_signed_at;

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
      await onCancelarContrato(contratoFirmado ? motivoCancelacion : undefined);
      setShowCancelarContratoConfirm(false);
      setMotivoCancelacion('');
    } finally {
      setIsCancellingContrato(false);
    }
  };

  const handleOpenCancelarModal = () => {
    setMotivoCancelacion('');
    setShowCancelarContratoConfirm(true);
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

  // Durante la carga, mostrar estado neutral
  if (loadingRegistro) {
    contratoIcon = <Loader2 className="h-4 w-4 text-zinc-500 shrink-0 animate-spin" />;
    contratoEstado = 'Cargando...';
    contratoColor = 'text-zinc-500';
    contratoBoton = null;
  } else if (isClienteNuevo) {
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
      contratoIcon = <AlertCircle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />;
      contratoEstado = 'En espera de firma del cliente';
      contratoColor = 'text-blue-400';
      contratoBoton = 'Editar';
    } else {
      contratoIcon = <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />;
      contratoEstado = 'Clic aquí para seleccionar una plantilla de contrato';
      contratoColor = 'text-amber-400';
      contratoBoton = 'Definir';
    }
  }

  const headerTitle = loadingRegistro
    ? 'Contrato Digital'
    : contratoOmitido
      ? 'Contrato omitido'
      : contratoFirmado
        ? 'Contrato firmado'
        : 'Contrato Digital';

  return (
    <div
      className={`bg-zinc-800/30 border border-zinc-700/50 rounded-lg overflow-hidden transition-all duration-200 ${
        contratoOmitido ? 'opacity-75 grayscale' : ''
      }`}
    >
      {/* Contrato firmado: card informativo sin header — todo el div abre preview */}
      {contratoFirmado && contractData?.contract_template_id ? (
        <div
          role="button"
          tabIndex={0}
          onClick={handleViewContract}
          onKeyDown={(e) => e.key === 'Enter' && handleViewContract()}
          className="p-3 space-y-1 rounded-lg hover:bg-zinc-700/30 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <span className="text-xs uppercase tracking-wide font-semibold text-emerald-400 truncate">
                Contrato firmado
              </span>
            </div>
            {(onRegenerateContract || onCancelarContrato) && (
              <ZenDropdownMenu>
                <ZenDropdownMenuTrigger asChild>
                  <button
                    type="button"
                    onClick={(e) => e.stopPropagation()}
                    className="h-7 min-w-[2rem] flex items-center justify-center rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50 transition-colors shrink-0"
                    title="Opciones de contrato"
                    aria-label="Opciones de contrato"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </ZenDropdownMenuTrigger>
                <ZenDropdownMenuContent align="end" className="min-w-[10rem]">
                  {onRegenerateContract && (
                    <ZenDropdownMenuItem
                      className="cursor-pointer text-amber-400 focus:text-amber-300"
                      onSelect={() => setShowRegenerateConfirm(true)}
                      disabled={isRegenerating}
                    >
                      {isRegenerating ? (
                        <Loader2 className="h-4 w-4 animate-spin shrink-0 mr-2" />
                      ) : (
                        <RefreshCw className="h-4 w-4 shrink-0 mr-2" />
                      )}
                      Regenerar contrato
                    </ZenDropdownMenuItem>
                  )}
                  {onCancelarContrato && (
                    <ZenDropdownMenuItem
                      className="cursor-pointer text-rose-400 focus:text-rose-300 focus:bg-rose-500/10"
                      onSelect={handleOpenCancelarModal}
                    >
                      <Trash2 className="h-4 w-4 shrink-0 mr-2" />
                      Cancelar contrato
                    </ZenDropdownMenuItem>
                  )}
                </ZenDropdownMenuContent>
              </ZenDropdownMenu>
            )}
          </div>
          {(() => {
            const version = contractData.contract_version != null ? `v${contractData.contract_version}` : '';
            const studioTz = 'America/Mexico_City';
            const dayInTz = contractData.contract_signed_at
              ? getDateOnlyInTimezone(contractData.contract_signed_at, studioTz)
              : null;
            const normalized = dayInTz ?? (contractData.contract_signed_at ? toUtcDateOnly(contractData.contract_signed_at) : null);
            const textoFirma = normalized
              ? formatDisplayDate(normalized, { day: 'numeric', month: 'long', year: 'numeric' })
              : '';
            const firmada = textoFirma ? `Firmada ${textoFirma}` : '';
            const line = [version, firmada].filter(Boolean).join(' · ');
            return line ? <p className="text-xs text-zinc-400">{line}</p> : null;
          })()}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2 py-2.5 px-3 border-b border-zinc-700/50">
            <div className="flex items-center gap-2 min-w-0">
              {contratoIcon}
              <span className={`text-xs uppercase tracking-wide font-semibold truncate ${loadingRegistro ? 'text-zinc-500' : 'text-zinc-400'}`}>
                {headerTitle}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {tieneContratoGenerado &&
                ((contratoBoton && contratoBoton !== 'Definir' && !contratoOmitido && onContratoButtonClick) ||
                  onRegenerateContract ||
                  onCancelarContrato) && (
                <ZenDropdownMenu>
                  <ZenDropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="h-7 min-w-[2rem] flex items-center justify-center rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50 transition-colors shrink-0"
                      title="Opciones de contrato"
                      aria-label="Opciones de contrato"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </ZenDropdownMenuTrigger>
                  <ZenDropdownMenuContent align="end" className="min-w-[10rem]">
                    {contratoBoton && contratoBoton !== 'Definir' && !contratoOmitido && onContratoButtonClick && (
                      <ZenDropdownMenuItem
                        className="cursor-pointer text-emerald-400 focus:text-emerald-300"
                        onSelect={() => onContratoButtonClick()}
                      >
                        <Pencil className="h-4 w-4 shrink-0 mr-2" />
                        Editar
                      </ZenDropdownMenuItem>
                    )}
                    {onRegenerateContract && (
                      <ZenDropdownMenuItem
                        className="cursor-pointer text-amber-400 focus:text-amber-300"
                        onSelect={() => setShowRegenerateConfirm(true)}
                        disabled={isRegenerating}
                      >
                        {isRegenerating ? (
                          <Loader2 className="h-4 w-4 animate-spin shrink-0 mr-2" />
                        ) : (
                          <RefreshCw className="h-4 w-4 shrink-0 mr-2" />
                        )}
                        Regenerar
                      </ZenDropdownMenuItem>
                    )}
                    {onCancelarContrato && (
                      <ZenDropdownMenuItem
                        className="cursor-pointer text-rose-400 focus:text-rose-300 focus:bg-rose-500/10"
                        onSelect={handleOpenCancelarModal}
                      >
                        <Trash2 className="h-4 w-4 shrink-0 mr-2" />
                        Eliminar
                      </ZenDropdownMenuItem>
                    )}
                  </ZenDropdownMenuContent>
                </ZenDropdownMenu>
              )}
            </div>
          </div>

          <div className="p-3 space-y-2">
        {contratoOmitido && !tieneContratoGenerado && (
          <p className="text-xs text-zinc-500">Contrato omitido. Puedes autorizar sin generar contrato.</p>
        )}
        {contratoEstado && !contratoFirmado && !contratoOmitido && (
          <div className="text-xs">
            {contratoBoton === 'Definir' ? (
              <button
                type="button"
                onClick={onContratoButtonClick}
                className="text-left w-full text-emerald-400 hover:text-emerald-300 transition-colors font-medium cursor-pointer"
              >
                {contratoEstado}
              </button>
            ) : contratoEstado === 'En espera de firma del cliente' ? (
              <div className="flex flex-wrap items-center gap-2">
                <ZenBadge variant="warning" size="sm" className="rounded-full bg-amber-500/10 text-amber-400 border-amber-500/30 px-2 py-0.5 text-[10px] font-medium shrink-0">
                  {contratoEstado}
                </ZenBadge>
                {contractData?.contrato_definido && contractData?.contract_version && (
                  <ZenBadge variant="secondary" size="sm" className="rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0">
                    Versión {contractData.contract_version}
                  </ZenBadge>
                )}
              </div>
            ) : (
              <p className={contratoColor}>{contratoEstado}</p>
            )}
            {contractData?.contrato_definido && contractData?.contract_version && contratoEstado !== 'En espera de firma del cliente' && (
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
        {!contratoOmitido && tieneContratoGenerado && onFirmaRequeridaChange && (
          <div className="flex items-center justify-between gap-2 py-1 pt-2 border-t border-zinc-700/50">
            <span className="text-xs text-zinc-400">Firma requerida</span>
            <div className="scale-90 origin-right shrink-0">
              <ZenSwitch
                checked={firmaRequerida !== false}
                onCheckedChange={(checked) => onFirmaRequeridaChange(!!checked)}
              />
            </div>
          </div>
        )}
      </div>
        </>
      )}

      <ZenConfirmModal
        isOpen={showCancelarContratoConfirm}
        onClose={() => {
          if (!isCancellingContrato) {
            setShowCancelarContratoConfirm(false);
            setMotivoCancelacion('');
          }
        }}
        onConfirm={handleConfirmCancelarContrato}
        title={contratoFirmado ? "⚠️ Cancelar contrato firmado" : "Cancelar contrato"}
        description={
          contratoFirmado ? (
            <div className="space-y-3">
              <p className="text-zinc-300">
                Este contrato ya fue <strong className="text-rose-400">firmado por el cliente</strong>. 
                La cancelación invalidará la firma y revertirá el proceso.
              </p>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-zinc-300">
                  Motivo de la cancelación <span className="text-rose-400">*</span>
                </label>
                <textarea
                  value={motivoCancelacion}
                  onChange={(e) => setMotivoCancelacion(e.target.value)}
                  placeholder="Explica por qué se cancela este contrato firmado (mínimo 10 caracteres)"
                  className="w-full min-h-[80px] px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-300 placeholder:text-zinc-500 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 resize-none"
                  disabled={isCancellingContrato}
                />
                <p className="text-xs text-zinc-500">
                  {motivoCancelacion.length}/10 caracteres mínimos
                </p>
              </div>
            </div>
          ) : (
            "¿Estás seguro de que deseas cancelar el contrato? Se quitará la plantilla y el contenido. Esta acción no se puede deshacer."
          )
        }
        confirmText="Cancelar contrato"
        cancelText="No, mantener"
        variant="destructive"
        loading={isCancellingContrato}
        disabled={contratoFirmado && motivoCancelacion.trim().length < 10}
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
    prevProps.onRegenerateContract === nextProps.onRegenerateContract &&
    prevProps.contratoOmitido === nextProps.contratoOmitido
  );
});

