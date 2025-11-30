'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, MoreVertical, Loader2 } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription, ZenButton, ZenDropdownMenu, ZenDropdownMenuTrigger, ZenDropdownMenuContent, ZenDropdownMenuItem, ZenDropdownMenuSeparator, ZenConfirmModal } from '@/components/ui/zen';
import { obtenerEventoDetalle, cancelarEvento, getEventPipelineStages, moveEvent, obtenerCotizacionesAutorizadasCount, type EventoDetalle } from '@/lib/actions/studio/business/events';
import type { EventPipelineStage } from '@/lib/actions/schemas/events-schemas';
import { EventPanel } from '../components/EventPanel';
import { toast } from 'sonner';

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const studioSlug = params.slug as string;
  const eventId = params.eventId as string;
  const [loading, setLoading] = useState(true);
  const [pipelineStages, setPipelineStages] = useState<EventPipelineStage[]>([]);
  const [currentPipelineStageId, setCurrentPipelineStageId] = useState<string | null>(null);
  const [isChangingStage, setIsChangingStage] = useState(false);
  const [eventData, setEventData] = useState<EventoDetalle | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cotizacionesCount, setCotizacionesCount] = useState(0);

  useEffect(() => {
    const loadEvent = async () => {
      try {
        setLoading(true);
        const result = await obtenerEventoDetalle(studioSlug, eventId);

        if (result.success && result.data) {
          setEventData(result.data);
          setCurrentPipelineStageId(result.data.stage_id);

          // Obtener número de cotizaciones autorizadas asociadas al evento
          const countResult = await obtenerCotizacionesAutorizadasCount(studioSlug, eventId);
          if (countResult.success && countResult.count !== undefined) {
            setCotizacionesCount(countResult.count);
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

    if (eventId) {
      loadEvent();
    }
  }, [eventId, studioSlug, router]);

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

  const handlePipelineStageChange = async (newStageId: string) => {
    if (!eventId || newStageId === currentPipelineStageId) return;

    setIsChangingStage(true);
    try {
      const result = await moveEvent(studioSlug, {
        event_id: eventId,
        new_stage_id: newStageId,
      });

      if (result.success) {
        setCurrentPipelineStageId(newStageId);
        toast.success('Etapa actualizada correctamente');
        // Recargar datos del evento
        const eventResult = await obtenerEventoDetalle(studioSlug, eventId);
        if (eventResult.success && eventResult.data) {
          setEventData(eventResult.data);
        }
      } else {
        toast.error(result.error || 'Error al cambiar etapa');
      }
    } catch (error) {
      console.error('Error cambiando etapa:', error);
      toast.error('Error al cambiar etapa');
    } finally {
      setIsChangingStage(false);
    }
  };

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
        router.push(`/${studioSlug}/studio/business/events`);
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
    return (
      <div className="w-full max-w-7xl mx-auto">
        <ZenCard variant="default" padding="none">
          <ZenCardHeader className="border-b border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-zinc-800 rounded animate-pulse" />
                <div className="space-y-2">
                  <div className="h-6 w-48 bg-zinc-800 rounded animate-pulse" />
                  <div className="h-4 w-64 bg-zinc-800 rounded animate-pulse" />
                </div>
              </div>
            </div>
          </ZenCardHeader>
          <ZenCardContent className="p-6">
            <div className="text-center py-12 text-zinc-400">
              Cargando evento...
            </div>
          </ZenCardContent>
        </ZenCard>
      </div>
    );
  }

  if (!eventData) {
    return null;
  }

  const currentStage = pipelineStages.find((s) => s.id === currentPipelineStageId);
  const isArchived = currentStage?.slug === 'archivado';

  return (
    <div className="w-full max-w-7xl mx-auto">
      <ZenCard variant="default" padding="none">
        <ZenCardHeader className="border-b border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ZenButton
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/${studioSlug}/studio/business/events`)}
                className="p-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </ZenButton>
              <div>
                <ZenCardTitle>{eventData.name || 'Evento sin nombre'}</ZenCardTitle>
                <ZenCardDescription>
                  Detalle del evento
                </ZenCardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {pipelineStages.length > 0 && currentPipelineStageId && (
                <div className="relative flex items-center">
                  <select
                    value={currentPipelineStageId}
                    onChange={(e) => handlePipelineStageChange(e.target.value)}
                    disabled={isChangingStage || loading}
                    className={`pl-3 pr-8 py-1.5 text-sm bg-zinc-900 border rounded-lg text-zinc-100 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed appearance-none ${isChangingStage
                      ? "border-zinc-700 focus:ring-blue-500/50 focus:border-blue-500"
                      : isArchived
                        ? "border-amber-500 focus:ring-amber-500/50 focus:border-amber-500"
                        : "border-zinc-700 focus:ring-blue-500/50 focus:border-blue-500"
                      }`}
                  >
                    {isChangingStage ? (
                      <option value={currentPipelineStageId}>Actualizando estado...</option>
                    ) : (
                      pipelineStages.map((stage) => (
                        <option key={stage.id} value={stage.id}>
                          {stage.name}
                        </option>
                      ))
                    )}
                  </select>
                  {isChangingStage ? (
                    <Loader2 className="absolute right-2 h-4 w-4 animate-spin text-zinc-400 pointer-events-none" />
                  ) : (
                    <div className="absolute right-2 pointer-events-none">
                      <svg className="h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  )}
                </div>
              )}
              <ZenDropdownMenu>
                <ZenDropdownMenuTrigger asChild>
                  <ZenButton
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </ZenButton>
                </ZenDropdownMenuTrigger>
                <ZenDropdownMenuContent align="end">
                  {eventData.status !== 'CANCELLED' && (
                    <>
                      <ZenDropdownMenuItem
                        onClick={handleCancelClick}
                        className="text-red-400 focus:text-red-300 focus:bg-red-950/20"
                      >
                        Cancelar evento
                      </ZenDropdownMenuItem>
                      <ZenDropdownMenuSeparator />
                    </>
                  )}
                </ZenDropdownMenuContent>
              </ZenDropdownMenu>
            </div>
          </div>
        </ZenCardHeader>
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
          cotizacionesCount > 0
            ? `Se cancelarán todas las cotizaciones asociadas a este evento (${cotizacionesCount} cotización${cotizacionesCount > 1 ? 'es' : ''}). Las cotizaciones no se eliminarán, solo cambiarán su estado a "cancelada".`
            : '¿Estás seguro de cancelar este evento?'
        }
        confirmText="Cancelar evento"
        cancelText="No cancelar"
        variant="destructive"
        loading={isCancelling}
      />
    </div>
  );
}
