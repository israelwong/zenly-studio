'use client';

import React, { useState } from 'react';
import {
  ZenCard,
  ZenCardHeader,
  ZenCardTitle,
  ZenCardContent,
  ZenButton,
  ZenDialog,
  ZenBadge,
} from '@/components/ui/zen';
import { FileText, Eye, CheckCircle2, Loader2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { signContract } from '@/lib/actions/cliente/contract.actions';

interface ClientContractViewCardProps {
  studioSlug: string;
  contactId: string;
  contract: {
    id: string;
    content: string;
    status: string;
    created_at: Date | string;
    signed_at?: Date | string | null;
  };
  cotizacionStatus: string;
  onSuccess?: () => void;
}

export function ClientContractViewCard({
  studioSlug,
  contactId,
  contract,
  cotizacionStatus,
  onSuccess,
}: ClientContractViewCardProps) {
  const [showViewModal, setShowViewModal] = useState(false);
  const [showSignModal, setShowSignModal] = useState(false);
  const [isSigning, setIsSigning] = useState(false);

  const handleSign = async () => {
    setIsSigning(true);
    try {
      // Obtener IP del cliente
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipResponse.json();
      const clientIp = ipData.ip || '0.0.0.0';

      const result = await signContract(studioSlug, contactId, {
        contract_id: contract.id,
        ip_address: clientIp,
      });

      if (result.success) {
        toast.success('Contrato firmado exitosamente');
        setShowSignModal(false);
        onSuccess?.();
      } else {
        toast.error(result.error || 'Error al firmar contrato');
      }
    } catch (error) {
      console.error('Error signing contract:', error);
      toast.error('Error al firmar contrato');
    } finally {
      setIsSigning(false);
    }
  };

  const getStatusBadge = () => {
    if (contract.status === 'SIGNED') {
      return (
        <ZenBadge variant="success" className="text-xs">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Firmado
        </ZenBadge>
      );
    }
    if (contract.status === 'PUBLISHED') {
      return (
        <ZenBadge variant="info" className="text-xs">
          <Clock className="w-3 h-3 mr-1" />
          Pendiente de Firma
        </ZenBadge>
      );
    }
    return (
      <ZenBadge variant="secondary" className="text-xs">
        {contract.status}
      </ZenBadge>
    );
  };

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <>
      <ZenCard>
        <ZenCardHeader className="border-b border-zinc-800">
          <ZenCardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-500" />
            Tu Contrato
          </ZenCardTitle>
        </ZenCardHeader>
        <ZenCardContent className="p-6">
          <div className="space-y-4">
            {/* Estado del contrato */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Estado:</span>
              {getStatusBadge()}
            </div>

            {/* Fecha de creación */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-400">Generado:</span>
              <span className="text-zinc-300">{formatDate(contract.created_at)}</span>
            </div>

            {/* Fecha de firma (si está firmado) */}
            {contract.signed_at && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">Firmado:</span>
                <span className="text-zinc-300">{formatDate(contract.signed_at)}</span>
              </div>
            )}

            {/* Mensaje informativo */}
            {contract.status === 'PUBLISHED' && (
              <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
                <p className="text-sm text-blue-400 mb-2">
                  <strong>Tu contrato está listo</strong>
                </p>
                <p className="text-sm text-zinc-300">
                  Revisa el contrato y fírmalo para continuar con el proceso. 
                  Una vez firmado, el studio autorizará tu evento.
                </p>
              </div>
            )}

            {contract.status === 'SIGNED' && (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4">
                <p className="text-sm text-emerald-400 mb-2">
                  <strong>¡Contrato firmado!</strong>
                </p>
                <p className="text-sm text-zinc-300">
                  Tu contrato ha sido firmado exitosamente. El studio está revisando 
                  tu información y pronto autorizará tu evento.
                </p>
              </div>
            )}

            {/* Botones de acción */}
            <div className="flex gap-3">
              <ZenButton
                variant="outline"
                onClick={() => setShowViewModal(true)}
                className="flex-1"
              >
                <Eye className="w-4 h-4 mr-2" />
                Ver Contrato
              </ZenButton>

              {contract.status === 'PUBLISHED' && (
                <ZenButton
                  onClick={() => setShowSignModal(true)}
                  className="flex-1"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Firmar
                </ZenButton>
              )}
            </div>
          </div>
        </ZenCardContent>
      </ZenCard>

      {/* Modal para ver contrato */}
      <ZenDialog
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        title="Contrato de Servicios"
        description="Revisa cuidadosamente el contenido del contrato"
        maxWidth="4xl"
      >
        <div className="overflow-y-auto max-h-[60vh] p-6 bg-white text-black rounded-lg">
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: contract.content }}
          />
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <ZenButton
            variant="ghost"
            onClick={() => setShowViewModal(false)}
          >
            Cerrar
          </ZenButton>
          {contract.status === 'PUBLISHED' && (
            <ZenButton
              onClick={() => {
                setShowViewModal(false);
                setShowSignModal(true);
              }}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Firmar Contrato
            </ZenButton>
          )}
        </div>
      </ZenDialog>

      {/* Modal de confirmación de firma */}
      <ZenDialog
        isOpen={showSignModal}
        onClose={() => setShowSignModal(false)}
        title="Firmar Contrato"
        description="Confirma que has leído y aceptas los términos del contrato"
        maxWidth="md"
      >
        <div className="space-y-4">
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4">
              <p className="text-sm text-amber-400 mb-2">
                <strong>Importante:</strong>
              </p>
              <ul className="text-sm text-zinc-300 space-y-1 list-disc list-inside">
                <li>Al firmar, aceptas todos los términos y condiciones del contrato</li>
                <li>Este documento tiene validez legal</li>
                <li>Se registrará tu dirección IP para validez legal</li>
                <li>Una vez firmado, no podrás modificar el contrato</li>
              </ul>
            </div>

          <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
            <p className="text-sm text-zinc-300">
              ¿Has leído y comprendido todos los términos del contrato?
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <ZenButton
            variant="ghost"
            onClick={() => setShowSignModal(false)}
            disabled={isSigning}
          >
            Cancelar
          </ZenButton>
          <ZenButton
            onClick={handleSign}
            disabled={isSigning}
          >
            {isSigning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Firmando...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Sí, Firmar Contrato
              </>
            )}
          </ZenButton>
        </div>
      </ZenDialog>
    </>
  );
}

