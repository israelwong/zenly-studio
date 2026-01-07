'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ZenCard, ZenCardContent, ZenConfirmModal } from '@/components/ui/zen';
import { obtenerEventoDetalle, cancelarEvento, getEventPipelineStages, obtenerCotizacionesAutorizadasCount, type EventoDetalle } from '@/lib/actions/studio/business/events';
import type { EventPipelineStage } from '@/lib/actions/schemas/events-schemas';
import { EventPanel } from '../components/EventPanel';
import { EventDetailSkeleton } from './components/EventDetailSkeleton';
import { EventDetailHeader } from './components/EventDetailHeader';
import { EventDetailToolbar } from './components/EventDetailToolbar';
import { ContractTemplateManagerModal } from '@/components/shared/contracts/ContractTemplateManagerModal';
import { getAllEventContracts } from '@/lib/actions/studio/business/contracts/contracts.actions';
import { toast } from 'sonner';

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const studioSlug = params.slug as string;
  const eventId = params.eventId as string;
  const [loading, setLoading] = useState(true);
  const [pipelineStages, setPipelineStages] = useState<EventPipelineStage[]>([]);
  const [eventData, setEventData] = useState<EventoDetalle | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cotizacionesCount, setCotizacionesCount] = useState(0);
  const [contratosCount, setContratosCount] = useState(0);
  const [templatesModalOpen, setTemplatesModalOpen] = useState(false);

  useEffect(() => {
    document.title = 'ZEN Studio - Evento';
  }, []);

  useEffect(() => {
    const loadEvent = async () => {
      try {
        setLoading(true);
        const result = await obtenerEventoDetalle(studioSlug, eventId);

        if (result.success && result.data) {
          setEventData(result.data);

          // Obtener número de cotizaciones autorizadas asociadas al evento
          const countResult = await obtenerCotizacionesAutorizadasCount(studioSlug, eventId);
          if (countResult.success && countResult.count !== undefined) {
            setCotizacionesCount(countResult.count);
          }

          // Verificar si existe un contrato activo (solo debe haber 1)
          const contractsResult = await getAllEventContracts(studioSlug, eventId);
          if (contractsResult.success && contractsResult.data) {
            // Contar solo contratos activos (no cancelados)
            // Un evento solo debe tener 1 contrato activo a la vez
            const activeContracts = contractsResult.data.filter(
              (c) => c.status !== 'CANCELLED'
            );
            setContratosCount(activeContracts.length > 0 ? 1 : 0);
          }
        } else {
          toast.error(result.error || 'Evento no encontrado');
          router.push(`/${studioSlug}/studio/business/events`);
        }
      } catch (error) {
        console.error('Error loading event:', error);
        toast.error('Error al cargar el evento');
        router.push(`/${studioSlug}/studio/business/events`);
      } finally {
        setLoading(false);
      }
    };

    if (eventId && studioSlug) {
      loadEvent();
    }
  }, [eventId, studioSlug]);

  // Cargar pipeline stages
  useEffect(() => {
    const loadPipelineStages = async () => {
      try {
        const result = await getEventPipelineStages(studioSlug);
        if (result.success && result.data) {
          setPipelineStages(result.data);
        }
      } catch (error) {
        console.error('Error cargando pipeline stages:', error);
      }
    };
    loadPipelineStages();
  }, [studioSlug]);

  const handleCancelClick = () => {
    setShowCancelModal(true);
  };

  const handleCancelConfirm = async () => {
    setIsCancelling(true);
    try {
      const result = await cancelarEvento(studioSlug, eventId);
      if (result.success) {
        toast.success('Evento cancelado correctamente');
        setShowCancelModal(false);

        // Redirigir a la promesa asociada si existe, sino a la lista de eventos
        if (eventData?.promise_id) {
          router.push(`/${studioSlug}/studio/commercial/promises/${eventData.promise_id}`);
        } else {
          router.push(`/${studioSlug}/studio/business/events`);
        }
      } else {
        toast.error(result.error || 'Error al cancelar evento');
        setShowCancelModal(false);
      }
    } catch (error) {
      console.error('Error cancelando evento:', error);
      toast.error('Error al cancelar evento');
      setShowCancelModal(false);
    } finally {
      setIsCancelling(false);
    }
  };

  if (loading) {
    return <EventDetailSkeleton />;
  }

  if (!eventData) {
    return null;
  }

  return (
    <div className="w-full max-w-7xl mx-auto">
      <ZenCard variant="default" padding="none">
        <EventDetailHeader
          studioSlug={studioSlug}
          eventId={eventId}
          eventData={eventData}
          pipelineStages={pipelineStages}
          currentPipelineStageId={eventData?.stage_id || null}
          loading={loading}
          onEventUpdated={(updatedData) => {
            setEventData(updatedData);
          }}
          onCancelClick={handleCancelClick}
        />
        <EventDetailToolbar
          studioSlug={studioSlug}
          eventId={eventId}
          promiseId={eventData?.promise?.id || null}
          contactId={eventData?.promise?.contact?.id || null}
          contactPhone={eventData?.promise?.contact?.phone || null}
          contactName={eventData?.promise?.contact?.name || null}
        />
        <ZenCardContent className="p-6">
          <EventPanel
            studioSlug={studioSlug}
            eventId={eventId}
            eventData={eventData}
            onEventUpdated={async () => {
              const result = await obtenerEventoDetalle(studioSlug, eventId);
              if (result.success && result.data) {
                setEventData(result.data);
              }
            }}
          />
        </ZenCardContent>
      </ZenCard>

      <ZenConfirmModal
        isOpen={showCancelModal}
        onClose={() => {
          if (!isCancelling) {
            setShowCancelModal(false);
          }
        }}
        onConfirm={handleCancelConfirm}
        title="Cancelar Evento"
        description={
          <div className="space-y-3">
            <p className="text-sm text-zinc-300 font-medium">
              Al cancelar este evento, se realizarán las siguientes acciones:
            </p>
            <ul className="text-sm text-zinc-400 space-y-2 list-disc list-inside">
              <li>El evento cambiará a estado <strong className="text-zinc-300">Cancelado</strong></li>
              {cotizacionesCount > 0 && (
                <li>
                  Se cancelarán todas las cotizaciones asociadas ({cotizacionesCount} cotización{cotizacionesCount > 1 ? 'es' : ''}).
                  Las cotizaciones no se eliminarán, solo cambiarán su estado a <strong className="text-zinc-300">cancelada</strong>
                </li>
              )}
              {eventData?.promise_id && (
                <>
                  <li>La promesa regresará a la etapa <strong className="text-zinc-300">Pendiente</strong></li>
                  <li>Se agregará la etiqueta <strong className="text-zinc-300">Cancelada</strong> a la promesa</li>
                </>
              )}
              {contratosCount > 0 && (
                <li>
                  Se cancelará el contrato asociado.
                  El contrato no se eliminará, solo cambiará su estado a <strong className="text-zinc-300">cancelado</strong> (se mantendrá para estadísticas)
                </li>
              )}
              <li>Se eliminará el agendamiento asociado al evento</li>
            </ul>
            <p className="text-sm text-amber-400 font-medium pt-2 border-t border-zinc-800">
              ⚠️ Esta acción no se puede deshacer. ¿Deseas continuar?
            </p>
          </div>
        }
        confirmText="Sí, cancelar evento"
        cancelText="No cancelar"
        variant="destructive"
        loading={isCancelling}
      />

      {/* Modal de plantillas de contrato */}
      <ContractTemplateManagerModal
        isOpen={templatesModalOpen}
        onClose={() => setTemplatesModalOpen(false)}
        studioSlug={studioSlug}
        eventTypeId={eventData?.promise?.event_type_id || undefined}
      />
    </div>
  );
}
