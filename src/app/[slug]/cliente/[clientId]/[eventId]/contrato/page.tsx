'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useClientAuth } from '@/hooks/useClientAuth';
import { Loader2, FileText, CheckCircle2, Download, X, Clock, User, Calendar, Edit } from 'lucide-react';
import { ZenCard, ZenCardHeader, ZenCardTitle, ZenCardContent, ZenButton, ZenBadge, ZenConfirmModal, ZenDialog, ZenTextarea } from '@/components/ui/zen';
import { getEventContractForClient, signEventContract, requestContractCancellationByClient, confirmContractCancellationByClient, rejectContractCancellationByClient, requestContractModificationByClient, regenerateEventContract } from '@/lib/actions/studio/business/contracts/contracts.actions';
import { getEventContractData, renderContractContent, getRealEventId } from '@/lib/actions/studio/business/contracts/renderer.actions';
import { generatePDFFromElement, generateContractFilename } from '@/lib/utils/pdf-generator';
import { CONTRACT_PREVIEW_STYLES } from '@/lib/utils/contract-styles';
import { toast } from 'sonner';
import { formatDate } from '@/lib/actions/utils/formatting';
import { ClientProfileModal } from '@/app/[slug]/cliente/[clientId]/components/ClientProfileModal';
import { EventInfoModal } from '../components/EventInfoModal';
import { useEvento } from '../context/EventoContext';
import type { EventContract } from '@/types/contracts';
import { createClient } from '@/lib/supabase/client';
import { createRealtimeChannel, subscribeToChannel, setupRealtimeAuth } from '@/lib/realtime/core';
import { actualizarPerfilCliente } from '@/lib/actions/cliente/perfil.actions';

export default function EventoContratoPage() {
  const params = useParams();
  const { cliente, isAuthenticated, isLoading: authLoading } = useClientAuth();
  const { evento } = useEvento();
  const slug = params?.slug as string;
  const clientId = params?.clientId as string;
  const eventId = params?.eventId as string;

  const [contract, setContract] = useState<EventContract | null>(null);
  const [renderedContent, setRenderedContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSigning, setIsSigning] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [eventData, setEventData] = useState<any>(null);
  const printableRef = useRef<HTMLDivElement>(null);
  const [showCancellationModal, setShowCancellationModal] = useState(false);
  const [showCancellationConfirmModal, setShowCancellationConfirmModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showEventInfoModal, setShowEventInfoModal] = useState(false);
  const [showModificationRequestModal, setShowModificationRequestModal] = useState(false);
  const [modificationMessage, setModificationMessage] = useState('');
  const [isRequestingModification, setIsRequestingModification] = useState(false);
  // Estados locales para datos del cliente (se actualizan cuando cliente cambia o se actualiza el perfil)
  const [currentClientName, setCurrentClientName] = useState(cliente?.name || '');
  const [currentClientPhone, setCurrentClientPhone] = useState(cliente?.phone || '');
  const [currentClientEmail, setCurrentClientEmail] = useState(cliente?.email || null);
  const [currentClientAddress, setCurrentClientAddress] = useState(cliente?.address || null);
  const [currentClientAvatarUrl, setCurrentClientAvatarUrl] = useState(cliente?.avatar_url || null);
  const supabase = createClient();
  const promisesChannelRef = useRef<any>(null);
  const contactsChannelRef = useRef<any>(null);
  const contractRef = useRef<EventContract | null>(null);

  // Mantener referencia actualizada del contrato
  useEffect(() => {
    contractRef.current = contract;
  }, [contract]);

  // Actualizar estados locales cuando cliente cambia
  useEffect(() => {
    if (cliente) {
      setCurrentClientName(cliente.name || '');
      setCurrentClientPhone(cliente.phone || '');
      setCurrentClientEmail(cliente.email || null);
      setCurrentClientAddress(cliente.address || null);
      setCurrentClientAvatarUrl(cliente.avatar_url || null);
    }
  }, [cliente]);

  const loadContract = useCallback(async () => {
    if (!slug || !eventId || !cliente?.id) return;

    setLoading(true);
    try {
      const contractResult = await getEventContractForClient(slug, eventId, cliente.id);

      if (contractResult.success && contractResult.data) {
        setContract(contractResult.data);

        // Obtener datos del evento para renderizar
        const dataResult = await getEventContractData(slug, eventId);
        if (dataResult.success && dataResult.data) {
          setEventData(dataResult.data);

          // Renderizar contenido
          const renderResult = await renderContractContent(
            contractResult.data.content,
            dataResult.data,
            dataResult.data.condicionesData
          );
          if (renderResult.success && renderResult.data) {
            setRenderedContent(renderResult.data);
          } else {
            toast.error(renderResult.error || 'Error al renderizar el contrato');
          }
        } else {
          toast.error(dataResult.error || 'Error al obtener datos del evento');
        }
      } else {
        toast.error(contractResult.error || 'No hay contrato disponible para este evento');
      }
    } catch (error) {
      toast.error('Error al cargar el contrato');
    } finally {
      setLoading(false);
    }
  }, [slug, eventId, cliente?.id]);

  useEffect(() => {
    if (isAuthenticated && cliente?.id && eventId && slug) {
      loadContract();
    }
  }, [isAuthenticated, cliente?.id, eventId, slug, loadContract]);

  // Configurar realtime para escuchar cambios en datos de contacto y evento
  useEffect(() => {
    if (!slug || !eventId || !cliente?.id) return;

    const setupRealtime = async () => {
      try {
        const requiresAuth = false;
        const authResult = await setupRealtimeAuth(supabase, requiresAuth);

        if (!authResult.success && requiresAuth) {
          return;
        }

        // Canal para promises (cambios en nombre/sede del evento)
        const promisesChannel = createRealtimeChannel(supabase, {
          channelName: `studio:${slug}:promises`,
          isPrivate: false,
          requiresAuth: false,
          self: true,
          ack: true,
        });

        promisesChannel
          .on('broadcast', { event: 'UPDATE' }, (payload: unknown) => {
            const p = payload as any;
            const promiseNew = p.record || p.new || p.payload?.record || p.payload?.new;
            const promiseOld = p.old || p.old_record || p.payload?.old || p.payload?.old_record;

            // Verificar si es el promise del evento actual
            // eventId puede ser promise_id o event_id, pero en promises siempre es promise_id
            // Comparar directamente con eventId (que puede ser promise_id) o con el id del evento del contexto
            const isCurrentPromise = promiseNew && (
              promiseNew.id === eventId || 
              (evento && promiseNew.id === evento.id)
            );

            if (isCurrentPromise) {
              // Verificar si cambió nombre o sede del evento
              const nameChanged = promiseNew.name !== promiseOld?.name;
              const locationChanged = promiseNew.event_location !== promiseOld?.event_location;

              if (nameChanged || locationChanged) {
                // Regenerar contrato con datos actualizados
                // Solo si el contrato existe y no está firmado
                const currentContract = contractRef.current;
                if (currentContract && currentContract.status !== 'SIGNED' && currentContract.status !== 'CANCELLED') {
                  setTimeout(async () => {
                    try {
                      // Obtener el event_id real (puede ser promise_id o event_id)
                      const realEventIdResult = await getRealEventId(slug, eventId);
                      if (realEventIdResult.success && realEventIdResult.data) {
                        const changeReason = nameChanged && locationChanged
                          ? "Regeneración automática: cliente actualizó nombre y sede del evento"
                          : nameChanged
                          ? "Regeneración automática: cliente actualizó nombre del evento"
                          : "Regeneración automática: cliente actualizó sede del evento";
                        const regenerateResult = await regenerateEventContract(slug, realEventIdResult.data, changeReason);
                        if (regenerateResult.success) {
                          // Recargar contrato después de regenerar
                          await loadContract();
                        }
                      }
                    } catch (error) {
                      console.error('[EventoContratoPage] Error regenerando contrato:', error);
                      // Fallback: solo recargar
                      loadContract();
                    }
                  }, 200);
                } else {
                  // Si está firmado, solo recargar (no regenerar)
                  loadContract();
                }
              }
            }
          });

        // Canal para contacts (cambios en datos del cliente)
        const contactsChannel = createRealtimeChannel(supabase, {
          channelName: `studio:${slug}:contacts`,
          isPrivate: false,
          requiresAuth: false,
          self: true,
          ack: true,
        });

        contactsChannel
          .on('broadcast', { event: 'UPDATE' }, (payload: unknown) => {
            const p = payload as any;
            const contactNew = p.record || p.new || p.payload?.record || p.payload?.new;
            const contactOld = p.old || p.old_record || p.payload?.old || p.payload?.old_record;

            // Verificar si es el contacto del cliente actual
            if (contactNew && contactNew.id === cliente?.id) {
              // Verificar si cambió algún campo relevante para el contrato
              const nameChanged = contactNew.name !== contactOld?.name;
              const phoneChanged = contactNew.phone !== contactOld?.phone;
              const emailChanged = contactNew.email !== contactOld?.email;
              const addressChanged = contactNew.address !== contactOld?.address;

              if (nameChanged || phoneChanged || emailChanged || addressChanged) {
                // Regenerar contrato con datos actualizados
                // Solo si el contrato existe y no está firmado
                const currentContract = contractRef.current;
                if (currentContract && currentContract.status !== 'SIGNED' && currentContract.status !== 'CANCELLED') {
                  setTimeout(async () => {
                    try {
                      // Obtener el event_id real (puede ser promise_id o event_id)
                      const realEventIdResult = await getRealEventId(slug, eventId);
                      if (realEventIdResult.success && realEventIdResult.data) {
                        // Construir mensaje descriptivo de qué cambió
                        const fieldsChanged: string[] = [];
                        if (nameChanged) fieldsChanged.push('nombre');
                        if (phoneChanged) fieldsChanged.push('teléfono');
                        if (emailChanged) fieldsChanged.push('email');
                        if (addressChanged) fieldsChanged.push('dirección');
                        const changeReason = `Regeneración automática: cliente actualizó ${fieldsChanged.join(', ')}`;
                        const regenerateResult = await regenerateEventContract(slug, realEventIdResult.data, changeReason);
                        if (regenerateResult.success) {
                          // Recargar contrato después de regenerar
                          await loadContract();
                        }
                      }
                    } catch (error) {
                      console.error('[EventoContratoPage] Error regenerando contrato:', error);
                      // Fallback: solo recargar
                      loadContract();
                    }
                  }, 200);
                } else {
                  // Si está firmado, solo recargar (no regenerar)
                  loadContract();
                }
              }
            }
          });

        await Promise.all([
          subscribeToChannel(promisesChannel),
          subscribeToChannel(contactsChannel),
        ]);
        
        // Guardar ambos canales
        promisesChannelRef.current = promisesChannel;
        contactsChannelRef.current = contactsChannel;
      } catch (error) {
        console.error('[EventoContratoPage] Error configurando realtime:', error);
      }
    };

    setupRealtime();

    return () => {
      if (promisesChannelRef.current) {
        supabase.removeChannel(promisesChannelRef.current);
        promisesChannelRef.current = null;
      }
      if (contactsChannelRef.current) {
        supabase.removeChannel(contactsChannelRef.current);
        contactsChannelRef.current = null;
      }
    };
  }, [slug, eventId, cliente?.id, contract, supabase, loadContract, evento]);

  // Configurar realtime para escuchar cambios en contratos
  useEffect(() => {
    if (!slug || !contract?.id) return;

    const setupRealtime = async () => {
      try {
        const requiresAuth = false;
        const authResult = await setupRealtimeAuth(supabase, requiresAuth);

        if (!authResult.success && requiresAuth) {
          return;
        }

        const contractsChannel = createRealtimeChannel(supabase, {
          channelName: `studio:${slug}:contracts`,
          isPrivate: false,
          requiresAuth: false,
          self: true,
          ack: true,
        });

        contractsChannel
          .on('broadcast', { event: 'UPDATE' }, (payload: unknown) => {
            const p = payload as any;
            const contractNew = p.record || p.new || p.payload?.record || p.payload?.new;

            // Verificar si es el contrato del evento actual
            if (contractNew && contractNew.id === contract.id) {
              // Solo recargar si el contrato está publicado (el cliente solo ve contratos publicados)
              if (contractNew.status === 'PUBLISHED' || contractNew.status === 'SIGNED') {
                // Recargar contrato después de un pequeño delay para asegurar que la BD está actualizada
                setTimeout(() => {
                  loadContract();
                }, 300);
              }
            }
          })
          .on('broadcast', { event: '*' }, (payload: unknown) => {
            const p = payload as any;
            const operation = p.operation || p.event;
            if (operation === 'UPDATE') {
              const contractNew = p.record || p.new || p.payload?.record || p.payload?.new;
              if (contractNew && contractNew.id === contract.id) {
                if (contractNew.status === 'PUBLISHED' || contractNew.status === 'SIGNED') {
                  setTimeout(() => {
                    loadContract();
                  }, 300);
                }
              }
            }
          });

        await subscribeToChannel(contractsChannel);
      } catch (error) {
        console.error('[EventoContratoPage] Error configurando realtime para contratos:', error);
      }
    };

    setupRealtime();
  }, [slug, contract?.id, supabase, loadContract]);

  const handleSign = async () => {
    if (!contract || !slug) return;

    setIsSigning(true);
    try {
      const result = await signEventContract(slug, contract.id);

      if (result.success) {
        toast.success('Contrato firmado correctamente');
        await loadContract();
      } else {
        toast.error(result.error || 'Error al firmar contrato');
      }
    } catch (error) {
      toast.error('Error al firmar contrato');
    } finally {
      setIsSigning(false);
    }
  };

  const handleExportPDF = async () => {
    if (!eventData || !renderedContent || !printableRef.current) {
      toast.error('No hay datos del contrato disponibles');
      return;
    }

    setIsExportingPDF(true);
    try {
      const filename = generateContractFilename(
        eventData.nombre_evento || 'Contrato',
        eventData.nombre_cliente || 'Cliente'
      );

      await generatePDFFromElement(printableRef.current, {
        filename,
        margin: 0.75,
      });

      toast.success('Contrato exportado a PDF correctamente');
    } catch (error) {
      toast.error('Error al exportar PDF');
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleRequestCancellation = () => {
    if (!contract || contract.status !== 'SIGNED') {
      toast.error('Solo se puede solicitar cancelación de contratos firmados');
      return;
    }
    setCancellationReason('');
    setShowCancellationModal(true);
  };

  const handleCancellationConfirm = async () => {
    if (!contract || !slug || !cliente?.id || !cancellationReason.trim() || cancellationReason.trim().length < 10) {
      toast.error('El motivo debe tener al menos 10 caracteres');
      return;
    }

    setIsCancelling(true);
    try {
      const result = await requestContractCancellationByClient(slug, contract.id, cliente.id, {
        reason: cancellationReason.trim(),
      });

      if (result.success) {
        toast.success('Solicitud de cancelación enviada al estudio');
        setShowCancellationModal(false);
        setCancellationReason('');
        await loadContract();
      } else {
        toast.error(result.error || 'Error al solicitar cancelación');
      }
    } catch (error) {
      console.error('Error requesting cancellation:', error);
      toast.error('Error al solicitar cancelación');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleConfirmCancellation = async () => {
    if (!contract || !slug || !cliente?.id) return;

    setIsCancelling(true);
    try {
      const result = await confirmContractCancellationByClient(slug, contract.id, cliente.id);

      if (result.success) {
        toast.success('Contrato cancelado correctamente');
        setShowCancellationConfirmModal(false);
        await loadContract();
      } else {
        toast.error(result.error || 'Error al confirmar cancelación');
      }
    } catch (error) {
      console.error('Error confirming cancellation:', error);
      toast.error('Error al confirmar cancelación');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleRejectCancellation = async () => {
    if (!contract || !slug || !cliente?.id) return;

    setIsCancelling(true);
    try {
      const result = await rejectContractCancellationByClient(slug, contract.id, cliente.id);

      if (result.success) {
        toast.success('Solicitud de cancelación rechazada');
        await loadContract();
      } else {
        toast.error(result.error || 'Error al rechazar cancelación');
      }
    } catch (error) {
      console.error('Error rejecting cancellation:', error);
      toast.error('Error al rechazar cancelación');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleRequestModification = async () => {
    if (!contract || !slug || !cliente?.id || !modificationMessage.trim() || modificationMessage.trim().length < 20) {
      toast.error('El mensaje debe tener al menos 20 caracteres');
      return;
    }

    setIsRequestingModification(true);
    const loadingToast = toast.loading('Enviando solicitud de modificación...');

    try {
      const result = await requestContractModificationByClient(slug, contract.id, cliente.id, {
        message: modificationMessage.trim(),
      });

      if (result.success) {
        toast.success('Solicitud de modificación enviada al estudio', { id: loadingToast });
        setShowModificationRequestModal(false);
        setModificationMessage('');
        await loadContract();
      } else {
        toast.error(result.error || 'Error al enviar solicitud de modificación', { id: loadingToast });
      }
    } catch (error) {
      console.error('Error requesting modification:', error);
      toast.error('Error al enviar solicitud de modificación', { id: loadingToast });
    } finally {
      setIsRequestingModification(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 text-emerald-500 animate-spin" />
          <p className="text-zinc-400 text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !cliente) {
    return null;
  }

  if (loading) {
    return (
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-100 mb-2">Contrato</h1>
        <p className="text-zinc-400">Cargando contrato...</p>
        <ZenCard className="mt-6">
          <ZenCardContent className="p-12">
            <div className="flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
            </div>
          </ZenCardContent>
        </ZenCard>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-100 mb-2">Contrato</h1>
        <p className="text-zinc-400">No hay contrato disponible para este evento</p>
        <ZenCard className="mt-6">
          <ZenCardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-400">
              El estudio aún no ha publicado un contrato para este evento.
            </p>
          </ZenCardContent>
        </ZenCard>
      </div>
    );
  }

  const isSigned = contract.status === 'SIGNED';
  const isPublished = contract.status === 'PUBLISHED';
  const isCancellationRequestedByStudio = contract.status === 'CANCELLATION_REQUESTED_BY_STUDIO';
  const isCancellationRequestedByClient = contract.status === 'CANCELLATION_REQUESTED_BY_CLIENT';
  const isCancelled = contract.status === 'CANCELLED';

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100 mb-2">Contrato</h1>
          <p className="text-zinc-400">
            {isSigned ? 'Contrato firmado' : isPublished ? 'Revisa y firma el contrato' : 'Contrato en revisión'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isSigned && (
            <ZenBadge variant="outline" className="text-emerald-400 border-emerald-500/30 bg-emerald-950/20">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Firmado
            </ZenBadge>
          )}
          {isPublished && (
            <ZenBadge variant="outline" className="text-blue-400 border-blue-500/30 bg-blue-950/20">
              <FileText className="h-3 w-3 mr-1" />
              Publicado
            </ZenBadge>
          )}
        </div>
      </div>

      {/* Sección: ¿Necesitas actualizar información? */}
      {isPublished && (
        <ZenCard className="mb-6">
          <ZenCardHeader>
            <ZenCardTitle>¿Necesitas actualizar información?</ZenCardTitle>
          </ZenCardHeader>
          <ZenCardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-lg">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-zinc-400" />
                <div>
                  <p className="text-sm font-medium text-zinc-200">Datos de contacto</p>
                  <p className="text-xs text-zinc-400">
                    Nombre, teléfono, email, dirección
                  </p>
                </div>
              </div>
              <ZenButton
                size="sm"
                variant="outline"
                onClick={() => setShowProfileModal(true)}
              >
                Modificar
              </ZenButton>
            </div>

            <div className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-zinc-400" />
                <div>
                  <p className="text-sm font-medium text-zinc-200">Datos del evento</p>
                  <p className="text-xs text-zinc-400">Nombre del evento, sede</p>
                </div>
              </div>
              <ZenButton
                size="sm"
                variant="outline"
                onClick={() => setShowEventInfoModal(true)}
              >
                Modificar
              </ZenButton>
            </div>

            {isPublished && !isSigned && (
              <ZenButton
                variant="outline"
                size="sm"
                onClick={() => setShowModificationRequestModal(true)}
                className="w-full text-blue-400 border-blue-500/30 hover:bg-blue-950/20"
              >
                <Edit className="h-4 w-4 mr-2" />
                Solicitar modificación del contrato
              </ZenButton>
            )}
          </ZenCardContent>
        </ZenCard>
      )}

      <ZenCard>
        <ZenCardHeader className="border-b border-zinc-800">
          <div className="flex items-center justify-between">
            <ZenCardTitle className="text-lg">
              Contrato - Versión {contract.version}
            </ZenCardTitle>
            <div className="flex items-center gap-2">
              <ZenButton
                variant="outline"
                size="sm"
                onClick={handleExportPDF}
                disabled={isExportingPDF}
              >
                {isExportingPDF ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Descargar PDF
              </ZenButton>
              {isPublished && !isSigned && (
                <ZenButton
                  variant="primary"
                  size="sm"
                  onClick={handleSign}
                  disabled={isSigning}
                >
                  {isSigning ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  Firmar contrato
                </ZenButton>
              )}
              {isSigned && !isCancellationRequestedByStudio && !isCancellationRequestedByClient && !isCancelled && (
                <ZenButton
                  variant="outline"
                  size="sm"
                  onClick={handleRequestCancellation}
                  className="text-red-400 border-red-500/30 hover:bg-red-950/20"
                >
                  <X className="h-4 w-4 mr-2" />
                  Solicitar cancelación
                </ZenButton>
              )}
              {isCancellationRequestedByStudio && (
                <>
                  <ZenButton
                    variant="primary"
                    size="sm"
                    onClick={() => setShowCancellationConfirmModal(true)}
                    disabled={isCancelling}
                  >
                    {isCancelling ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                    )}
                    Confirmar cancelación
                  </ZenButton>
                  <ZenButton
                    variant="outline"
                    size="sm"
                    onClick={handleRejectCancellation}
                    disabled={isCancelling}
                    className="text-zinc-400"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Rechazar
                  </ZenButton>
                </>
              )}
              {isCancellationRequestedByClient && (
                <ZenBadge variant="outline" className="text-orange-400 border-orange-500/30 bg-orange-950/20">
                  <Clock className="h-3 w-3 mr-1" />
                  Esperando confirmación del estudio
                </ZenBadge>
              )}
              {isCancelled && (
                <ZenBadge variant="outline" className="text-red-400 border-red-500/30 bg-red-950/20">
                  <X className="h-3 w-3 mr-1" />
                  Cancelado
                </ZenBadge>
              )}
            </div>
          </div>
        </ZenCardHeader>
        <ZenCardContent className="p-6">
          {renderedContent ? (
            <>
              <style dangerouslySetInnerHTML={{ __html: CONTRACT_PREVIEW_STYLES }} />
              <div
                className="contract-preview scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent"
                dangerouslySetInnerHTML={{ __html: renderedContent }}
              />
            </>
          ) : (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
            </div>
          )}

          {isSigned && contract.signed_at && (
            <div className="mt-6 pt-6 border-t border-zinc-800">
              <p className="text-sm text-zinc-500">
                Firmado el {formatDate(contract.signed_at)}
              </p>
            </div>
          )}
        </ZenCardContent>
      </ZenCard>

      {/* Hidden Printable Version - Sin clases Tailwind para PDF */}
      {renderedContent && (
        <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
          <div
            ref={printableRef}
            style={{
              backgroundColor: '#ffffff',
              color: '#000000',
              padding: '32px',
              width: '210mm',
              minHeight: '297mm',
              fontFamily: 'Arial, sans-serif',
              fontSize: '14px',
              lineHeight: '1.6'
            }}
            dangerouslySetInnerHTML={{ __html: renderedContent }}
          />
        </div>
      )}

      {/* Modal de solicitud de cancelación */}
      <ZenDialog
        isOpen={showCancellationModal}
        onClose={() => {
          if (!isCancelling) {
            setShowCancellationModal(false);
            setCancellationReason('');
          }
        }}
        title="Solicitar Cancelación de Contrato"
        description="Ingresa el motivo de la cancelación. El estudio deberá confirmar para completar la cancelación."
        maxWidth="md"
        onCancel={() => {
          if (!isCancelling) {
            setShowCancellationModal(false);
            setCancellationReason('');
          }
        }}
        cancelLabel="Cancelar"
        onSave={handleCancellationConfirm}
        saveLabel="Enviar Solicitud"
        isLoading={isCancelling}
      >
        <div className="space-y-4">
          <ZenTextarea
            label="Motivo de cancelación"
            required
            value={cancellationReason}
            onChange={(e) => setCancellationReason(e.target.value)}
            placeholder="Describe el motivo de la cancelación (mínimo 10 caracteres)"
            minRows={4}
            maxLength={1000}
            disabled={isCancelling}
            error={cancellationReason.length > 0 && cancellationReason.length < 10 ? 'El motivo debe tener al menos 10 caracteres' : undefined}
            hint="El estudio recibirá una notificación y deberá confirmar la cancelación"
          />
          <div className="p-3 bg-amber-950/20 border border-amber-800/30 rounded-lg">
            <p className="text-xs text-amber-300">
              ⚠️ El estudio recibirá una notificación y deberá confirmar la cancelación para que se complete.
            </p>
          </div>
        </div>
      </ZenDialog>

      {/* Modal de confirmación de cancelación (cuando el studio solicita) */}
      <ZenConfirmModal
        isOpen={showCancellationConfirmModal}
        onClose={() => {
          if (!isCancelling) {
            setShowCancellationConfirmModal(false);
          }
        }}
        onConfirm={handleConfirmCancellation}
        title="Confirmar Cancelación"
        description={
          <div className="space-y-2">
            <p>El estudio ha solicitado cancelar el contrato.</p>
            {contract?.cancellation_reason && (
              <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-800 mt-3">
                <p className="text-sm font-medium text-zinc-300 mb-1">Motivo:</p>
                <p className="text-sm text-zinc-400">{contract.cancellation_reason}</p>
              </div>
            )}
            <p className="text-amber-400 font-medium mt-3">
              ⚠️ Esta acción no se puede deshacer. El contrato quedará cancelado por mutuo acuerdo.
            </p>
            <p>¿Deseas confirmar la cancelación?</p>
          </div>
        }
        confirmText="Sí, confirmar cancelación"
        cancelText="Cancelar"
        variant="destructive"
        loading={isCancelling}
      />

      {/* Modal de perfil de cliente */}
      {cliente && (
        <ClientProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          cliente={cliente}
          slug={slug}
          initialName={currentClientName}
          initialPhone={currentClientPhone}
          initialEmail={currentClientEmail}
          initialAddress={currentClientAddress}
          initialAvatarUrl={currentClientAvatarUrl}
          onUpdate={async (name, phone, email, address, avatarUrl) => {
            // Actualizar perfil primero
            const { actualizarPerfilCliente } = await import('@/lib/actions/cliente/perfil.actions');
            const result = await actualizarPerfilCliente(slug, {
              name,
              phone,
              email: email || '',
              address: address || '',
              avatar_url: avatarUrl || '',
            });

            if (result.success && result.data) {
              // Actualizar estados locales con los nuevos valores
              setCurrentClientName(result.data.name);
              setCurrentClientPhone(result.data.phone);
              setCurrentClientEmail(result.data.email);
              setCurrentClientAddress(result.data.address);
              setCurrentClientAvatarUrl(result.data.avatar_url);
              // Recargar contrato después de actualizar
              await loadContract();
            } else {
              toast.error(result.message || 'Error al actualizar el perfil');
            }
          }}
        />
      )}

      {/* Modal de información del evento */}
      {eventId && clientId && evento && (
        <EventInfoModal
          isOpen={showEventInfoModal}
          onClose={() => setShowEventInfoModal(false)}
          eventId={eventId}
          clientId={clientId}
          initialName={evento.name}
          initialLocation={evento.event_location}
          onUpdate={async () => {
            // Recargar contrato después de actualizar evento
            await loadContract();
          }}
        />
      )}

      {/* Modal de solicitud de modificación de contrato */}
      <ZenDialog
        isOpen={showModificationRequestModal}
        onClose={() => {
          if (!isRequestingModification) {
            setShowModificationRequestModal(false);
            setModificationMessage('');
          }
        }}
        title="Solicitar Modificación del Contrato"
        description="Describe los cambios que necesitas en el contrato. El estudio revisará tu solicitud."
        maxWidth="md"
        onCancel={() => {
          if (!isRequestingModification) {
            setShowModificationRequestModal(false);
            setModificationMessage('');
          }
        }}
        cancelLabel="Cancelar"
        onSave={handleRequestModification}
        saveLabel="Enviar Solicitud"
        isLoading={isRequestingModification}
      >
        <div className="space-y-4">
          <ZenTextarea
            label="Detalles de la modificación"
            required
            value={modificationMessage}
            onChange={(e) => setModificationMessage(e.target.value)}
            placeholder="Ej: 'Cambiar la fecha del evento al 15 de marzo', 'Ajustar la cantidad del servicio X a 3 unidades', 'Eliminar la cláusula Y'."
            minRows={5}
            maxLength={1500}
            disabled={isRequestingModification}
            error={modificationMessage.length > 0 && modificationMessage.length < 20 ? 'La descripción debe tener al menos 20 caracteres' : undefined}
            hint="El estudio recibirá una notificación con tu solicitud."
          />
          <div className="p-3 bg-blue-950/20 border border-blue-800/30 rounded-lg">
            <p className="text-xs text-blue-300">
              ℹ️ El estudio revisará tu solicitud y se pondrá en contacto contigo para discutir los cambios.
            </p>
          </div>
        </div>
      </ZenDialog>
    </div>
  );
}

