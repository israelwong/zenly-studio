'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useClientAuth } from '@/hooks/useClientAuth';
import { Loader2, FileText, Download, X, Clock, User, Calendar, Edit, Eye } from 'lucide-react';
import { ZenCard, ZenCardHeader, ZenCardTitle, ZenCardContent, ZenButton, ZenConfirmModal, ZenDialog, ZenTextarea, ZenSidebarTrigger } from '@/components/ui/zen';
import { getEventContractForClient, getAllEventContractsForClient, requestContractCancellationByClient, confirmContractCancellationByClient, rejectContractCancellationByClient, regenerateEventContract } from '@/lib/actions/studio/business/contracts/contracts.actions';
import { getEventContractData, getRealEventId } from '@/lib/actions/studio/business/contracts/renderer.actions';
import { generatePDFFromElement, generateContractFilename } from '@/lib/utils/pdf-generator';
import { ContractPreview } from '@/components/shared/contracts/ContractPreview';
import { toast } from 'sonner';
import { formatDate } from '@/lib/actions/utils/formatting';
import { obtenerDashboardInfo } from '@/lib/actions/cliente/dashboard.actions';

// Función para formatear fecha con hora incluyendo segundos
const formatDateTime = (date: Date | string): string => {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  } catch (error) {
    return 'Fecha no disponible';
  }
};
import { ClientProfileModal } from '@/app/[slug]/cliente/[clientId]/components/ClientProfileModal';
import { EventInfoModal } from '../components/EventInfoModal';
import { useEvento } from '../context/EventoContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import type { EventContract } from '@/types/contracts';
import { createClient } from '@/lib/supabase/client';
import { createRealtimeChannel, subscribeToChannel, setupRealtimeAuth } from '@/lib/realtime/core';
import { actualizarPerfilCliente } from '@/lib/actions/cliente/perfil.actions';

interface EventoContratoClientProps {
  initialContract: EventContract | null;
  initialAllContracts: EventContract[];
  initialCancelledContracts: EventContract[];
  initialEventData: EventContractDataWithConditions | null;
}

export default function EventoContratoPage({
  initialContract,
  initialAllContracts,
  initialCancelledContracts,
  initialEventData,
}: EventoContratoClientProps) {
  const params = useParams();
  const { cliente, isAuthenticated, isLoading: authLoading } = useClientAuth();
  const { evento, studioInfo } = useEvento();
  usePageTitle(studioInfo?.studio_name ? `${studioInfo.studio_name} - Contrato` : 'Contrato');
  const slug = params?.slug as string;
  const clientId = params?.clientId as string;
  const eventId = params?.eventId as string;

  const [contract, setContract] = useState<EventContract | null>(initialContract);
  const [allContracts, setAllContracts] = useState<EventContract[]>(initialAllContracts);
  const [cancelledContracts, setCancelledContracts] = useState<EventContract[]>(initialCancelledContracts);
  const [loading, setLoading] = useState(false);
  const [showCancelledContractModal, setShowCancelledContractModal] = useState(false);
  const [selectedCancelledContract, setSelectedCancelledContract] = useState<EventContract | null>(null);
  const [cancelledContractContent, setCancelledContractContent] = useState('');
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [eventData, setEventData] = useState<any>(initialEventData);
  const printableRef = useRef<HTMLDivElement>(null);
  const [showCancellationModal, setShowCancellationModal] = useState(false);
  const [showCancellationConfirmModal, setShowCancellationConfirmModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showEventInfoModal, setShowEventInfoModal] = useState(false);
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
      // Obtener contrato inmutable desde dashboard (usa snapshots)
      const dashboardResult = await obtenerDashboardInfo(eventId, cliente.id, slug);

      if (dashboardResult.success && dashboardResult.data?.contract?.content) {
        // Usar contrato inmutable desde snapshot
        const immutableContract = dashboardResult.data.contract;

        // Obtener datos del evento para renderizar
        const dataResult = await getEventContractData(slug, eventId);
        if (dataResult.success && dataResult.data) {
          setEventData(dataResult.data);
        }

        // Crear objeto EventContract compatible con el estado
        const contractFromSnapshot: EventContract = {
          id: immutableContract.id,
          content: immutableContract.content,
          status: immutableContract.status as any,
          created_at: immutableContract.created_at,
          updated_at: immutableContract.created_at,
          signed_at: immutableContract.signed_at || undefined,
          studio_id: '',
          event_id: eventId,
          template_id: '',
          version: 1,
          created_by: undefined,
          signed_by_client: !!immutableContract.signed_at,
          client_signature_url: undefined,
          cancelled_at: undefined,
          cancellation_reason: undefined,
        };

        setContract(contractFromSnapshot);
        setAllContracts([contractFromSnapshot]);
        setCancelledContracts([]);
      } else {
        // Fallback: cargar desde BD si no hay snapshot
        const allContractsResult = await getAllEventContractsForClient(slug, eventId, cliente.id);

        if (allContractsResult.success && allContractsResult.data) {
          setAllContracts(allContractsResult.data);

          const activeContracts = allContractsResult.data.filter((c: EventContract) => c.status !== 'CANCELLED');
          const cancelled = allContractsResult.data.filter((c: EventContract) => c.status === 'CANCELLED');

          setCancelledContracts(cancelled);
          const activeContract = activeContracts[0] || null;
          setContract(activeContract);

          if (activeContract) {
            const dataResult = await getEventContractData(slug, eventId);
            if (dataResult.success && dataResult.data) {
              setEventData(dataResult.data);
            }
          }
        } else {
          toast.error(allContractsResult.error || 'No hay contratos disponibles para este evento');
          setAllContracts([]);
          setCancelledContracts([]);
          setContract(null);
        }
      }
    } catch (error) {
      console.error('[EventoContratoPage] Error cargando contrato:', error);
      toast.error('Error al cargar los contratos');
      setAllContracts([]);
      setCancelledContracts([]);
      setContract(null);
    } finally {
      setLoading(false);
    }
  }, [slug, eventId, cliente?.id]);

  // Cargar contrato solo si no hay datos iniciales o si se necesita recargar
  useEffect(() => {
    if (isAuthenticated && cliente?.id && eventId && slug && !initialContract) {
      loadContract();
    }
  }, [isAuthenticated, cliente?.id, eventId, slug, loadContract, initialContract]);

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
    if (!slug || !eventId) return;

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

        const handleContractChange = (payload: unknown, operation: 'INSERT' | 'UPDATE') => {
          const p = payload as any;
          const contractNew = p.record || p.new || p.payload?.record || p.payload?.new;

          // Verificar si el contrato pertenece al evento actual
          if (contractNew && contractNew.event_id === eventId) {
            // Si es INSERT o UPDATE con status PUBLISHED/SIGNED, recargar
            if (operation === 'INSERT' || contractNew.status === 'PUBLISHED' || contractNew.status === 'SIGNED') {
              // Recargar contrato después de un pequeño delay para asegurar que la BD está actualizada
              setTimeout(() => {
                loadContract();
              }, 300);
            } else if (
              contractNew.status === 'CANCELLATION_REQUESTED_BY_CLIENT' ||
              contractNew.status === 'CANCELLATION_REQUESTED_BY_STUDIO' ||
              contractNew.status === 'CANCELLED'
            ) {
              // Solo actualizar el estado local sin recargar todo el componente
              setContract(contractNew as EventContract);
            }
          }
        };

        contractsChannel
          .on('broadcast', { event: 'INSERT' }, (payload: unknown) => {
            handleContractChange(payload, 'INSERT');
          })
          .on('broadcast', { event: 'UPDATE' }, (payload: unknown) => {
            handleContractChange(payload, 'UPDATE');
          })
          .on('broadcast', { event: '*' }, (payload: unknown) => {
            const p = payload as any;
            const operation = p.operation || p.event;
            if (operation === 'INSERT' || operation === 'UPDATE') {
              handleContractChange(payload, operation as 'INSERT' | 'UPDATE');
            }
          });

        await subscribeToChannel(contractsChannel);
      } catch (error) {
        console.error('[EventoContratoPage] Error configurando realtime para contratos:', error);
      }
    };

    setupRealtime();
  }, [slug, eventId, supabase, loadContract]);

  const handleExportPDF = async () => {
    if (!eventData || !contract || !printableRef.current) {
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

      if (result.success && result.data) {
        toast.success('Solicitud de cancelación enviada al estudio');
        setShowCancellationModal(false);
        setCancellationReason('');
        // Actualizar solo el estado local del contrato sin recargar todo
        setContract(result.data);
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
        // Cerrar el modal inmediatamente
        setShowCancellationConfirmModal(false);
        // Recargar después de cerrar el modal
        await loadContract();
      } else {
        toast.error(result.error || 'Error al confirmar cancelación');
      }
    } catch (error) {
      console.error('Error confirming cancellation:', error);
      toast.error('Error al confirmar cancelación');
    } finally {
      // Siempre resetear el estado de carga
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


  if (!isAuthenticated || !cliente) {
    return null;
  }

  if (authLoading || loading) {
    return (
      <>
        {/* Page Header Skeleton */}
        <div className="sticky top-0 z-20 bg-zinc-900/10 backdrop-blur-sm -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 pt-4 pb-4 mb-8 lg:static lg:bg-transparent lg:backdrop-blur-none">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <ZenSidebarTrigger className="lg:hidden" />
              <div className="min-w-0 flex-1">
                <div className="h-9 bg-zinc-800 rounded w-48 mb-2 animate-pulse" />
                <div className="h-5 bg-zinc-800 rounded w-64 animate-pulse" />
              </div>
            </div>
            <div className="h-8 w-8 bg-zinc-800 rounded animate-pulse shrink-0" />
          </div>
        </div>

        {/* Contract Card Skeleton */}
        <ZenCard>
          <ZenCardHeader className="border-b border-zinc-800">
            <div className="flex items-center justify-between gap-3">
              <div className="h-6 bg-zinc-800 rounded w-48 animate-pulse" />
              <div className="h-8 w-8 bg-zinc-800 rounded animate-pulse shrink-0" />
            </div>
          </ZenCardHeader>
          <ZenCardContent className="p-6">
            <div className="space-y-4">
              <div className="h-4 bg-zinc-800 rounded w-full animate-pulse" />
              <div className="h-4 bg-zinc-800 rounded w-5/6 animate-pulse" />
              <div className="h-4 bg-zinc-800 rounded w-4/5 animate-pulse" />
              <div className="h-4 bg-zinc-800 rounded w-full animate-pulse" />
              <div className="h-4 bg-zinc-800 rounded w-3/4 animate-pulse" />
              <div className="pt-4 space-y-3">
                <div className="h-4 bg-zinc-800 rounded w-full animate-pulse" />
                <div className="h-4 bg-zinc-800 rounded w-5/6 animate-pulse" />
              </div>
            </div>
          </ZenCardContent>
        </ZenCard>
      </>
    );
  }

  // Función para cargar contenido de contrato cancelado
  const loadCancelledContractContent = async (cancelledContract: EventContract) => {
    try {
      const dataResult = await getEventContractData(slug, eventId);
      if (dataResult.success && dataResult.data) {
        // El contenido se renderizará en el componente ContractPreview
        setCancelledContractContent(cancelledContract.content);
      }
    } catch (error) {
      toast.error('Error al cargar el contrato cancelado');
    }
  };

  const handleViewCancelledContract = async (cancelledContract: EventContract) => {
    setSelectedCancelledContract(cancelledContract);
    setShowCancelledContractModal(true);
    await loadCancelledContractContent(cancelledContract);
  };

  const isSigned = contract?.status === 'SIGNED';
  const isPublished = contract?.status === 'PUBLISHED';
  const isCancellationRequestedByStudio = contract?.status === 'CANCELLATION_REQUESTED_BY_STUDIO';
  const isCancellationRequestedByClient = contract?.status === 'CANCELLATION_REQUESTED_BY_CLIENT';
  const isCancelled = contract?.status === 'CANCELLED';

  return (
    <>
      {/* Page Header */}
      <div className="sticky top-0 z-20 bg-zinc-900/10 backdrop-blur-sm -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 pt-4 pb-4 mb-8 lg:static lg:bg-transparent lg:backdrop-blur-none">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <ZenSidebarTrigger className="lg:hidden" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-zinc-100 mb-2">Contrato</h1>
                  <p className="text-zinc-400">
                    {contract ? (
                      isCancelled
                        ? 'Contrato cancelado'
                        : isCancellationRequestedByClient || isCancellationRequestedByStudio
                          ? 'Cancelación en proceso'
                          : 'Contrato digital'
                    ) : (
                      'No hay contrato publicado'
                    )}
                  </p>
                </div>
                {/* Botón de descargar PDF - Desktop: a la altura del título */}
                {contract && (
                  <div className="hidden lg:block">
                    <ZenButton
                      variant="primary"
                      size="sm"
                      onClick={handleExportPDF}
                      disabled={isExportingPDF}
                      className="shrink-0"
                    >
                      {isExportingPDF ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Descargando...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Descargar PDF
                        </>
                      )}
                    </ZenButton>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contrato publicado */}
      {contract && (
        <ZenCard>
          <ZenCardHeader className="border-b border-zinc-800">
            <div className="flex items-center justify-between gap-3">
              <ZenCardTitle className="text-lg min-w-0 flex-1 truncate">
                Contrato - Versión {contract.version}
              </ZenCardTitle>
            </div>
          </ZenCardHeader>
          <ZenCardContent className="p-6">
            {contract && eventData ? (
              <ContractPreview
                content={contract.content}
                eventData={eventData}
                cotizacionData={eventData.cotizacionData}
                condicionesData={eventData.condicionesData}
                noCard={true}
                className="h-full"
              />
            ) : (
              <div className="space-y-4">
                <div className="h-4 bg-zinc-800 rounded w-full animate-pulse" />
                <div className="h-4 bg-zinc-800 rounded w-5/6 animate-pulse" />
                <div className="h-4 bg-zinc-800 rounded w-4/5 animate-pulse" />
                <div className="h-4 bg-zinc-800 rounded w-full animate-pulse" />
                <div className="h-4 bg-zinc-800 rounded w-3/4 animate-pulse" />
                <div className="pt-4 space-y-3">
                  <div className="h-4 bg-zinc-800 rounded w-full animate-pulse" />
                  <div className="h-4 bg-zinc-800 rounded w-5/6 animate-pulse" />
                </div>
              </div>
            )}

          </ZenCardContent>
        </ZenCard>
      )}

      {/* Contratos cancelados */}
      {cancelledContracts.length > 0 && (
        <div className="mt-6 space-y-3">
          {cancelledContracts.map((cancelledContract) => (
            <div
              key={cancelledContract.id}
              className="p-4 bg-zinc-900/30 border border-zinc-800/50 rounded-lg"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <X className="h-4 w-4 text-red-400" />
                    <span className="text-sm font-medium text-zinc-400">Contrato Cancelado</span>
                  </div>
                  {cancelledContract.cancelled_at && (
                    <p className="text-xs text-zinc-500 ml-6">
                      {formatDateTime(cancelledContract.cancelled_at)}
                    </p>
                  )}
                </div>
                <ZenButton
                  variant="ghost"
                  size="sm"
                  onClick={() => handleViewCancelledContract(cancelledContract)}
                  className="text-zinc-400 hover:text-zinc-300 shrink-0"
                >
                  <Eye className="h-4 w-4 mr-1.5" />
                  Ver
                </ZenButton>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Botón de descargar PDF - Mobile: al final del contenido del contrato */}
      {contract && (
        <div className="lg:hidden mt-6">
          <ZenButton
            variant="primary"
            size="lg"
            onClick={handleExportPDF}
            disabled={isExportingPDF}
            className="w-full"
          >
            {isExportingPDF ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Descargando...
              </>
            ) : (
              <>
                <Download className="h-5 w-5 mr-2" />
                Descargar PDF
              </>
            )}
          </ZenButton>
        </div>
      )}

      {/* Hidden Printable Version - Sin clases Tailwind para PDF */}
      {contract && eventData && (
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
          >
            <ContractPreview
              content={contract.content}
              eventData={eventData}
              cotizacionData={eventData.cotizacionData}
              condicionesData={eventData.condicionesData}
              noCard={true}
            />
          </div>
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

      {/* Modal para ver contrato cancelado */}
      <ZenDialog
        isOpen={showCancelledContractModal}
        onClose={() => {
          setShowCancelledContractModal(false);
          setSelectedCancelledContract(null);
          setCancelledContractContent('');
        }}
        title={selectedCancelledContract ? `Contrato Cancelado - Versión ${selectedCancelledContract.version}` : 'Contrato Cancelado'}
        description={
          selectedCancelledContract?.cancelled_at
            ? `Cancelado el ${formatDateTime(selectedCancelledContract.cancelled_at)}`
            : 'Contrato cancelado'
        }
        maxWidth="5xl"
        onCancel={() => {
          setShowCancelledContractModal(false);
          setSelectedCancelledContract(null);
          setCancelledContractContent('');
        }}
        cancelLabel="Cerrar"
      >
        {selectedCancelledContract && eventData && cancelledContractContent ? (
          <div className="h-[calc(90vh-200px)] min-h-[500px] overflow-y-auto p-4">
            <ContractPreview
              content={cancelledContractContent}
              eventData={eventData}
              cotizacionData={eventData.cotizacionData}
              condicionesData={eventData.condicionesData}
              noCard={true}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
          </div>
        )}
      </ZenDialog>
    </>
  );
}

