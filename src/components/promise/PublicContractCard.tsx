'use client';

import { memo } from 'react';
import { FileText, CheckCircle2, Edit2, RefreshCw } from 'lucide-react';
import { ZenCard, ZenCardHeader, ZenCardContent, ZenButton, ZenBadge } from '@/components/ui/zen';

interface PublicContractCardProps {
  contract: {
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
  } | null;
  isContractSigned: boolean;
  isRegeneratingContract: boolean;
  isUpdatingData: boolean;
  onEditData: () => void;
  onViewContract: () => void;
}

export const PublicContractCard = memo(function PublicContractCard({
  contract,
  isContractSigned,
  isRegeneratingContract,
  isUpdatingData,
  onEditData,
  onViewContract,
}: PublicContractCardProps) {
  const hasContract = !!contract?.content;
  const hasContractTemplate = !!contract?.template_id;

  return (
    <ZenCard>
      <ZenCardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <FileText className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                Contrato Digital
              </h2>
              <div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {isContractSigned
                    ? 'Contrato firmado y autorizado'
                    : hasContract || hasContractTemplate
                      ? 'Listo para revisión y firma'
                      : 'En proceso de generación'}
                </p>
                {contract?.version && (
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Versión {contract.version}
                  </p>
                )}
              </div>
            </div>
          </div>
          {isRegeneratingContract ? (
            <ZenBadge variant="info" className="text-xs hidden md:flex">
              <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
              Regenerando contrato
            </ZenBadge>
          ) : isContractSigned ? (
            <ZenBadge variant="success" className="text-xs hidden md:flex">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Firmado
            </ZenBadge>
          ) : (hasContract || hasContractTemplate) ? (
            <ZenBadge variant="info" className="text-xs hidden md:flex">
              Pendiente de firma
            </ZenBadge>
          ) : (
            <ZenBadge variant="warning" className="text-xs hidden md:flex">
              Pendiente de generación
            </ZenBadge>
          )}
        </div>
      </ZenCardHeader>
      <ZenCardContent>
        {(hasContract || hasContractTemplate) ? (
          <div className="space-y-4">
            {isRegeneratingContract ? (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />
                  <div>
                    <p className="text-sm font-medium text-blue-300">
                      Regenerando contrato con información actualizada
                    </p>
                    <p className="text-xs text-blue-400/80 mt-1">
                      El contrato se actualizará automáticamente cuando termine el proceso.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-4">
                <p className="text-sm text-zinc-300 leading-relaxed">
                  {isContractSigned
                    ? 'Tu contrato ha sido firmado correctamente..'
                    : 'Revisa detalladamente tu contrato y confirma tu aceptación firmándolo digitalmente para continuar con el proceso.'}
                </p>
                {contract?.version && (
                  <p className="text-xs text-zinc-500 mt-2 pt-2 border-t border-zinc-700/50">
                    Estás revisando la versión {contract.version} del contrato
                  </p>
                )}
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3">
              {!isContractSigned && !isRegeneratingContract && (
                <ZenButton
                  variant="outline"
                  onClick={onEditData}
                  className="w-full sm:w-auto"
                  disabled={isUpdatingData}
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Actualizar datos
                </ZenButton>
              )}
              <ZenButton
                variant="primary"
                onClick={onViewContract}
                className="flex-1"
                disabled={isRegeneratingContract}
              >
                <FileText className="w-4 h-4 mr-2" />
                {isContractSigned ? 'Ver firmado' : 'Revisar y firmar'}
              </ZenButton>
            </div>
          </div>
        ) : (
          <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-zinc-700/50 mb-3">
              <FileText className="w-6 h-6 text-zinc-400" />
            </div>
            <p className="text-sm text-zinc-300 font-medium mb-1">
              Contrato en proceso de generación
            </p>
            <p className="text-xs text-zinc-400">
              El estudio está preparando tu contrato. Te notificaremos cuando esté listo para revisión.
            </p>
          </div>
        )}
      </ZenCardContent>
    </ZenCard>
  );
}, (prevProps, nextProps) => {
  // Comparación personalizada para evitar re-renders innecesarios
  return (
    prevProps.contract?.version === nextProps.contract?.version &&
    prevProps.contract?.content === nextProps.contract?.content &&
    prevProps.contract?.template_id === nextProps.contract?.template_id &&
    prevProps.isContractSigned === nextProps.isContractSigned &&
    prevProps.isRegeneratingContract === nextProps.isRegeneratingContract &&
    prevProps.isUpdatingData === nextProps.isUpdatingData
  );
});

