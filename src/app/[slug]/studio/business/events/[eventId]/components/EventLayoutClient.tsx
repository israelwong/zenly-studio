'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Users } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenButton } from '@/components/ui/zen';
import { CancelationWithFundsModal } from '@/components/shared/cancelation/CancelationWithFundsModal';
import type { EventoDetalle } from '@/lib/actions/studio/business/events';
import type { EventPipelineStage } from '@/lib/actions/schemas/events-schemas';
import type { EventoResumenData } from '@/lib/actions/studio/commercial/promises/evento-resumen.actions';
import { EventPanel } from '../../components/EventPanel';
import { EventDetailHeader } from './EventDetailHeader';
import { EventDetailToolbar } from './EventDetailToolbar';
import { ContractTemplateManagerModal } from '@/components/shared/contracts/ContractTemplateManagerModal';
import { CrewMembersManager } from '@/components/shared/crew-members/CrewMembersManager';
import { getAllEventContracts } from '@/lib/actions/studio/business/contracts/contracts.actions';
import { toast } from 'sonner';

interface EventLayoutClientProps {
  studioSlug: string;
  eventId: string;
  eventData: EventoDetalle;
  pipelineStages: EventPipelineStage[];
  initialResumen?: EventoResumenData | null;
  initialCotizacionesCount?: number;
  initialContratosCount?: number;
  children: React.ReactNode;
}

export function EventLayoutClient({
  studioSlug,
  eventId,
  eventData: initialEventData,
  pipelineStages,
  initialResumen,
  initialCotizacionesCount,
  initialContratosCount,
  children,
}: EventLayoutClientProps) {
  const router = useRouter();
  const pathname = usePathname();

  const isBaseRoute = pathname && !pathname.includes('/scheduler') && pathname.endsWith(`/events/${eventId}`);
  const isSchedulerRoute = pathname != null && pathname.includes('/scheduler');
  const [eventData, setEventData] = useState<EventoDetalle>(initialEventData);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cotizacionesCount, setCotizacionesCount] = useState(initialCotizacionesCount ?? 0);
  const [contratosCount, setContratosCount] = useState(initialContratosCount ?? 0);
  const [templatesModalOpen, setTemplatesModalOpen] = useState(false);
  const [crewManagerOpen, setCrewManagerOpen] = useState(false);

  useEffect(() => {
    document.title = 'Zenly Studio - Evento';
    window.dispatchEvent(new CustomEvent('close-overlays'));
  }, []);

  useEffect(() => {
    if (initialCotizacionesCount !== undefined && initialContratosCount !== undefined) return;
    const loadAdditionalData = async () => {
      const { obtenerCotizacionesAutorizadasCount } = await import('@/lib/actions/studio/business/events/events.actions');
      const countResult = await obtenerCotizacionesAutorizadasCount(studioSlug, eventId);
      if (countResult.success && countResult.count !== undefined) setCotizacionesCount(countResult.count);
      const contractsResult = await getAllEventContracts(studioSlug, eventId);
      if (contractsResult.success && contractsResult.data) {
        const active = contractsResult.data.filter((c) => c.status !== 'CANCELLED');
        setContratosCount(active.length > 0 ? 1 : 0);
      }
    };
    loadAdditionalData();
  }, [studioSlug, eventId, initialCotizacionesCount, initialContratosCount]);

  const handleCancelClick = () => setShowCancelModal(true);

  const handleCancelConfirm = async (data: { reason: string; requestedBy: 'estudio' | 'cliente'; fundDestination: 'retain' | 'refund' }) => {
    const targetSlug = eventData?.promise_id ? 'pending' : undefined;
    setIsCancelling(true);
    try {
      const { cancelarEvento } = await import('@/lib/actions/studio/business/events/events.actions');
      const result = await cancelarEvento(studioSlug, eventId, {
        promiseTargetStageSlug: targetSlug,
        cancelReason: data.reason,
        cancelRequestedBy: data.requestedBy,
        fundDestination: data.fundDestination,
      });
      if (result.success) {
        toast.success('Evento cancelado correctamente');
        setShowCancelModal(false);

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
  return (
    <div className="w-full max-w-7xl mx-auto">
      <ZenCard variant="default" padding="none">
        <EventDetailHeader
          studioSlug={studioSlug}
          eventId={eventId}
          eventData={eventData}
          pipelineStages={pipelineStages}
          currentPipelineStageId={eventData?.stage_id || null}
          loading={false}
          onEventUpdated={(updatedData) => {
            setEventData(updatedData);
          }}
          onCancelClick={handleCancelClick}
        />
        {!isSchedulerRoute && (
          <EventDetailToolbar
            studioSlug={studioSlug}
            eventId={eventId}
            promiseId={eventData?.promise?.id || null}
            contactId={eventData?.promise?.contact?.id || null}
            contactPhone={eventData?.promise?.contact?.phone || null}
            contactName={eventData?.promise?.contact?.name || null}
            rightContent={
              <ZenButton
                variant="ghost"
                size="sm"
                onClick={() => setCrewManagerOpen(true)}
                className="gap-2"
              >
                <Users className="h-4 w-4" />
                Personal
              </ZenButton>
            }
          />
        )}
        <ZenCardContent className="p-6">
          {isBaseRoute ? (
            <EventPanel
              studioSlug={studioSlug}
              eventId={eventId}
              eventData={eventData}
              initialResumen={initialResumen}
              onEventUpdated={async () => {
                const { obtenerEventoDetalle } = await import('@/lib/actions/studio/business/events/events.actions');
                const result = await obtenerEventoDetalle(studioSlug, eventId);
                if (result.success && result.data) {
                  setEventData(result.data);
                }
              }}
            />
          ) : (
            children
          )}
        </ZenCardContent>
      </ZenCard>

      <CancelationWithFundsModal
        isOpen={showCancelModal}
        onClose={() => !isCancelling && setShowCancelModal(false)}
        onConfirm={(data) => void handleCancelConfirm(data)}
        title="Cancelar Evento"
        description={
          <div className="space-y-3">
            <p className="text-sm text-zinc-400">
              Al cancelar este evento: pasará a estado <strong className="text-zinc-300">Cancelado</strong>
              {cotizacionesCount > 0 && `, se cancelarán ${cotizacionesCount} cotización(es) asociada(s)`}
              {eventData?.promise_id && ', se actualizará la promesa a etapa pendiente con etiqueta Cancelada'}
              {contratosCount > 0 && ', se cancelará el contrato asociado'}
              . Se eliminará el agendamiento.
            </p>
            <p className="text-sm text-zinc-400">
              Indica el motivo, quién solicita la cancelación y el destino de los pagos confirmados.
            </p>
          </div>
        }
        isLoading={isCancelling}
        saveLabel="Sí, cancelar evento"
        cancelLabel="No cancelar"
      />

      <ContractTemplateManagerModal
        isOpen={templatesModalOpen}
        onClose={() => setTemplatesModalOpen(false)}
        studioSlug={studioSlug}
        eventTypeId={eventData?.promise?.event_type_id || undefined}
      />

      <CrewMembersManager
        studioSlug={studioSlug}
        mode="manage"
        isOpen={crewManagerOpen}
        onClose={() => setCrewManagerOpen(false)}
      />
    </div>
  );
}
