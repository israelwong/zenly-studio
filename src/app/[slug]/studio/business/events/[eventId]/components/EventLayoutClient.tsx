'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Users } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenConfirmModal, ZenButton } from '@/components/ui/zen';
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

  const handleCancelConfirm = async () => {
    const targetSlug = eventData?.promise_id ? 'pending' : undefined;
    setIsCancelling(true);
    try {
      const { cancelarEvento } = await import('@/lib/actions/studio/business/events/events.actions');
      const result = await cancelarEvento(studioSlug, eventId, targetSlug ? { promiseTargetStageSlug: targetSlug } : undefined);
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

      <ZenConfirmModal
        isOpen={showCancelModal}
        onClose={() => !isCancelling && setShowCancelModal(false)}
        onConfirm={handleCancelConfirm}
        title="Cancelar Evento"
        headerDescription="Al cancelar este evento, se realizarán las siguientes acciones:"
        description={
          <div className="space-y-5">
            <div className="rounded-lg bg-zinc-800/40 border border-zinc-700/60 p-4">
              <ul className="text-sm text-zinc-400 space-y-2.5 list-none">
                <li className="flex gap-2">
                  <span className="text-zinc-500 shrink-0">•</span>
                  <span>El evento cambiará a estado <strong className="text-zinc-300">Cancelado</strong></span>
                </li>
                {cotizacionesCount > 0 && (
                  <li className="flex gap-2">
                    <span className="text-zinc-500 shrink-0">•</span>
                    <span>
                      Se cancelarán todas las cotizaciones asociadas ({cotizacionesCount} cotización{cotizacionesCount > 1 ? 'es' : ''}).
                      Las cotizaciones no se eliminarán, solo cambiarán su estado a <strong className="text-zinc-300">cancelada</strong>
                    </span>
                  </li>
                )}
                {eventData?.promise_id && (
                  <>
                    <li className="flex gap-2">
                      <span className="text-zinc-500 shrink-0">•</span>
                      <span>Se quitará la etiqueta <strong className="text-zinc-300">Aprobado</strong> de la promesa</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-zinc-500 shrink-0">•</span>
                      <span>Se agregará la etiqueta <strong className="text-zinc-300">Cancelada</strong> a la promesa</span>
                    </li>
                  </>
                )}
                {contratosCount > 0 && (
                  <li className="flex gap-2">
                    <span className="text-zinc-500 shrink-0">•</span>
                    <span>
                      Se cancelará el contrato asociado.
                      El contrato no se eliminará, solo cambiará su estado a <strong className="text-zinc-300">cancelado</strong> (se mantendrá para estadísticas)
                    </span>
                  </li>
                )}
                <li className="flex gap-2">
                  <span className="text-zinc-500 shrink-0">•</span>
                  <span>Se eliminará el agendamiento asociado al evento</span>
                </li>
              </ul>
            </div>
            <div className="rounded-lg bg-amber-950/20 border border-amber-800/40 p-3">
              <p className="text-sm text-amber-300 font-medium">
                ⚠️ Esta acción no se puede deshacer. ¿Deseas continuar?
              </p>
            </div>
          </div>
        }
        confirmText="Sí, cancelar evento"
        cancelText="No cancelar"
        variant="destructive"
        loading={isCancelling}
        contentClassName="sm:max-w-xl"
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
