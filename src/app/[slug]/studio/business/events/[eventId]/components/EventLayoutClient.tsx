'use client';

import React, { useState, useEffect, useMemo, useCallback, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Archive, ArchiveRestore } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenButton } from '@/components/ui/zen';
import { CancelationWithFundsModal } from '@/components/shared/cancelation/CancelationWithFundsModal';
import type { EventoDetalle } from '@/lib/actions/studio/business/events';
import type { EventPipelineStage } from '@/lib/actions/schemas/events-schemas';
import type { EventoResumenData } from '@/lib/actions/studio/commercial/promises/evento-resumen.actions';
import { sanitizeEventDataForClient } from '@/lib/utils/sanitize-cotizacion-for-client';
import { EventPanel } from '../../components/EventPanel';
import { EventDetailHeader } from './EventDetailHeader';
import { EventDetailToolbar } from './EventDetailToolbar';
import { ContractTemplateManagerModal } from '@/components/shared/contracts/ContractTemplateManagerModal';
import { CrewMembersManager } from '@/components/shared/crew-members/CrewMembersManager';
import { ArchiveEventModal } from './ArchiveEventModal';
import { UnarchiveEventModal } from './UnarchiveEventModal';
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
  const [isPending, startTransition] = useTransition();

  const isBaseRoute = pathname && !pathname.includes('/scheduler') && pathname.endsWith(`/events/${eventId}`);
  const isSchedulerRoute = pathname != null && pathname.includes('/scheduler');
  const [eventData, setEventData] = useState<EventoDetalle>(initialEventData);

  /** Blindaje: nunca sobrescribir con data vacía/corrupta. Si el fetch devuelve sin nombre/financials cuando teníamos datos, mantener anterior. */
  const setEventDataSafe = useCallback((newData: EventoDetalle | null) => {
    if (newData == null) return;
    const hasValidName = !!(newData.promise?.name ?? newData.name);
    const hasValidId = !!newData.id;
    setEventData((prev) => {
      if (!hasValidId) return prev;
      if (!hasValidName && prev?.promise?.name) return prev;
      return sanitizeEventDataForClient(newData);
    });
  }, []);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cotizacionesCount, setCotizacionesCount] = useState(initialCotizacionesCount ?? 0);
  const [contratosCount, setContratosCount] = useState(initialContratosCount ?? 0);
  const [templatesModalOpen, setTemplatesModalOpen] = useState(false);
  const [crewManagerOpen, setCrewManagerOpen] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showUnarchiveModal, setShowUnarchiveModal] = useState(false);

  const { archivadoStage, firstActiveStage, isArchived } = useMemo(() => {
    const archivado = pipelineStages.find((s) => s.slug === 'archivado');
    const firstActive = pipelineStages.find((s) => s.slug !== 'archivado');
    const currentStage = pipelineStages.find((s) => s.id === eventData?.stage_id);
    return {
      archivadoStage: archivado ?? null,
      firstActiveStage: firstActive ?? null,
      isArchived: currentStage?.slug === 'archivado',
    };
  }, [eventData?.stage_id, pipelineStages]);

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
    const targetSlug = eventData?.promise_id ? 'canceled' : undefined;
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
      <ZenCard
        variant="default"
        padding="none"
        className={isArchived ? 'ring-1 ring-amber-500/50 border-amber-500/40' : undefined}
      >
        <EventDetailHeader
          studioSlug={studioSlug}
          eventId={eventId}
          eventData={eventData}
          pipelineStages={pipelineStages}
          currentPipelineStageId={eventData?.stage_id || null}
          loading={isPending}
          onEventUpdated={(updatedData) => {
            setEventData(sanitizeEventDataForClient(updatedData));
          }}
          onCancelClick={handleCancelClick}
        />
        {!isSchedulerRoute && (
          <EventDetailToolbar
            studioSlug={studioSlug}
            eventId={eventId}
            promiseId={eventData?.promise?.id || null}
            parentCotizacionId={eventData?.cotizacion?.id ?? null}
            contactId={eventData?.promise?.contact?.id || null}
            contactPhone={eventData?.promise?.contact?.phone || null}
            contactName={eventData?.promise?.contact?.name || null}
            hasContract={contratosCount > 0}
            rightContent={
              <div className="flex items-center gap-2">
                {archivadoStage && !isArchived && (
                  <ZenButton
                    variant="outline"
                    size="sm"
                    onClick={() => setShowArchiveModal(true)}
                    className="gap-1.5 px-2.5 py-1.5 h-7 text-xs text-zinc-400 border-zinc-600 hover:bg-zinc-800 hover:text-zinc-200"
                  >
                    <Archive className="h-3.5 w-3.5" />
                    Archivar
                  </ZenButton>
                )}
                {firstActiveStage && isArchived && (
                  <ZenButton
                    variant="outline"
                    size="sm"
                    onClick={() => setShowUnarchiveModal(true)}
                    className="gap-1.5 px-2.5 py-1.5 h-7 text-xs text-amber-400 border-amber-500/50 hover:bg-amber-950/30 hover:text-amber-300"
                  >
                    <ArchiveRestore className="h-3.5 w-3.5" />
                    Desarchivar
                  </ZenButton>
                )}
              </div>
            }
          />
        )}
        <ZenCardContent className={isSchedulerRoute ? 'p-0' : 'p-6'}>
          {isBaseRoute ? (
            <EventPanel
              studioSlug={studioSlug}
              eventId={eventId}
              eventData={eventData}
              initialResumen={initialResumen}
              hasContract={contratosCount > 0}
              onEventDataChange={(data) => setEventData(sanitizeEventDataForClient(data))}
              onEventUpdated={() => {
                startTransition(async () => {
                  const { obtenerEventoDetalle } = await import('@/lib/actions/studio/business/events/events.actions');
                  const result = await obtenerEventoDetalle(studioSlug, eventId);
                  if (result.success && result.data) {
                    setEventDataSafe(result.data);
                  }
                });
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

      {archivadoStage && (
        <ArchiveEventModal
          open={showArchiveModal}
          onOpenChange={setShowArchiveModal}
          studioSlug={studioSlug}
          eventId={eventId}
          archivadoStage={archivadoStage}
          balanceDue={eventData?.pending_amount ?? 0}
          onArchived={async () => {
            const { obtenerEventoDetalle } = await import('@/lib/actions/studio/business/events/events.actions');
            const result = await obtenerEventoDetalle(studioSlug, eventId);
            if (result.success && result.data) {
              setEventDataSafe(result.data);
            }
          }}
        />
      )}
      {firstActiveStage && (
        <UnarchiveEventModal
          open={showUnarchiveModal}
          onOpenChange={setShowUnarchiveModal}
          studioSlug={studioSlug}
          eventId={eventId}
          firstActiveStage={firstActiveStage}
          onUnarchived={async () => {
            const { obtenerEventoDetalle } = await import('@/lib/actions/studio/business/events/events.actions');
            const result = await obtenerEventoDetalle(studioSlug, eventId);
            if (result.success && result.data) {
              setEventDataSafe(result.data);
            }
          }}
        />
      )}
    </div>
  );
}
