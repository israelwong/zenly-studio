'use client';

import { useState, useEffect } from 'react';
import { Loader2, MessageSquare, CheckCircle2, X, Clock, AlertCircle } from 'lucide-react';
import { ZenDialog, ZenButton, ZenBadge, ZenCard, ZenCardContent, ZenTextarea } from '@/components/ui/zen';
import { getContractModificationRequests, respondContractModification } from '@/lib/actions/studio/business/contracts/contracts.actions';
import { toast } from 'sonner';
import { formatDate } from '@/lib/actions/utils/formatting';
import type { ContractModificationRequest } from '@/types/contracts';

interface ContractModificationRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  studioSlug: string;
  contractId: string;
  onRequestResponded?: () => void;
}

export function ContractModificationRequestsModal({
  isOpen,
  onClose,
  studioSlug,
  contractId,
  onRequestResponded,
}: ContractModificationRequestsModalProps) {
  const [requests, setRequests] = useState<ContractModificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');
  const [responseStatus, setResponseStatus] = useState<'approved' | 'rejected' | null>(null);

  useEffect(() => {
    if (isOpen && contractId) {
      loadRequests();
    }
  }, [isOpen, contractId]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const result = await getContractModificationRequests(studioSlug, contractId);
      if (result.success && result.data) {
        setRequests(result.data);
      } else {
        toast.error(result.error || 'Error al cargar solicitudes');
      }
    } catch (error) {
      console.error('Error loading requests:', error);
      toast.error('Error al cargar solicitudes');
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (requestId: string, status: 'approved' | 'rejected') => {
    if (!responseText.trim() || responseText.trim().length < 10) {
      toast.error('La respuesta debe tener al menos 10 caracteres');
      return;
    }

    setRespondingTo(requestId);
    try {
      const result = await respondContractModification(studioSlug, contractId, {
        request_id: requestId,
        status,
        response: responseText.trim(),
      });

      if (result.success) {
        toast.success(status === 'approved' ? 'Solicitud aprobada' : 'Solicitud rechazada');
        setResponseText('');
        setResponseStatus(null);
        setRespondingTo(null);
        await loadRequests();
        if (onRequestResponded) {
          onRequestResponded();
        }
      } else {
        toast.error(result.error || 'Error al responder solicitud');
      }
    } catch (error) {
      console.error('Error responding to request:', error);
      toast.error('Error al responder solicitud');
    } finally {
      setRespondingTo(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <ZenBadge variant="warning" className="rounded-full">Pendiente</ZenBadge>;
      case 'approved':
        return <ZenBadge variant="success" className="rounded-full">Aprobada</ZenBadge>;
      case 'rejected':
        return <ZenBadge variant="destructive" className="rounded-full">Rechazada</ZenBadge>;
      case 'completed':
        return <ZenBadge variant="default" className="rounded-full">Completada</ZenBadge>;
      default:
        return <ZenBadge variant="default" className="rounded-full">{status}</ZenBadge>;
    }
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Solicitudes de Modificación"
      description={`${pendingCount} solicitud(es) pendiente(s) de ${requests.length} total`}
      maxWidth="lg"
      onCancel={onClose}
      cancelLabel="Cerrar"
    >
      <div className="space-y-4 max-h-[70vh] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-400">No hay solicitudes de modificación</p>
          </div>
        ) : (
          requests.map((request) => (
            <ZenCard key={request.id}>
              <ZenCardContent className="p-4">
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusBadge(request.status)}
                        <span className="text-xs text-zinc-500">
                          {request.requested_by === 'client' ? 'Cliente' : 'Estudio'}
                        </span>
                        <span className="text-xs text-zinc-500">
                          • {formatDate(request.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-300 whitespace-pre-wrap">
                        {request.message}
                      </p>
                    </div>
                  </div>

                  {/* Response */}
                  {request.response && (
                    <div className="pt-3 border-t border-zinc-800">
                      <p className="text-xs text-zinc-500 mb-1">Respuesta del estudio:</p>
                      <p className="text-sm text-zinc-400 whitespace-pre-wrap">
                        {request.response}
                      </p>
                    </div>
                  )}

                  {/* Actions (solo para pendientes) */}
                  {request.status === 'pending' && (
                    <div className="pt-3 border-t border-zinc-800 space-y-3">
                      {respondingTo === request.id ? (
                        <div className="space-y-3">
                          <ZenTextarea
                            label="Respuesta"
                            value={responseText}
                            onChange={(e) => setResponseText(e.target.value)}
                            placeholder="Escribe tu respuesta al cliente..."
                            minRows={3}
                            maxLength={1000}
                            required
                          />
                          <div className="flex items-center gap-2">
                            <ZenButton
                              size="sm"
                              variant="primary"
                              onClick={() => handleRespond(request.id, 'approved')}
                              disabled={!responseText.trim() || responseText.trim().length < 10}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Aprobar
                            </ZenButton>
                            <ZenButton
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRespond(request.id, 'rejected')}
                              disabled={!responseText.trim() || responseText.trim().length < 10}
                            >
                              <X className="h-4 w-4 mr-2" />
                              Rechazar
                            </ZenButton>
                            <ZenButton
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                setRespondingTo(null);
                                setResponseText('');
                                setResponseStatus(null);
                              }}
                            >
                              Cancelar
                            </ZenButton>
                          </div>
                        </div>
                      ) : (
                        <ZenButton
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setRespondingTo(request.id);
                            setResponseText('');
                            setResponseStatus(null);
                          }}
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Responder
                        </ZenButton>
                      )}
                    </div>
                  )}
                </div>
              </ZenCardContent>
            </ZenCard>
          ))
        )}
      </div>
    </ZenDialog>
  );
}

