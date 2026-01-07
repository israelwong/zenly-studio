'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MoreVertical, Loader2 } from 'lucide-react';
import { ZenCardHeader, ZenCardTitle, ZenCardDescription, ZenButton, ZenDropdownMenu, ZenDropdownMenuTrigger, ZenDropdownMenuContent, ZenDropdownMenuItem, ZenDropdownMenuSeparator } from '@/components/ui/zen';
import { moveEvent, obtenerEventoDetalle } from '@/lib/actions/studio/business/events';
import type { EventoDetalle } from '@/lib/actions/studio/business/events';
import type { EventPipelineStage } from '@/lib/actions/schemas/events-schemas';
import { toast } from 'sonner';

interface EventDetailHeaderProps {
  studioSlug: string;
  eventId: string;
  eventData: EventoDetalle;
  pipelineStages: EventPipelineStage[];
  currentPipelineStageId: string | null;
  loading: boolean;
  onEventUpdated: (eventData: EventoDetalle) => void;
  onCancelClick: () => void;
}

export const EventDetailHeader = function EventDetailHeader({
  studioSlug,
  eventId,
  eventData,
  pipelineStages,
  currentPipelineStageId,
  loading,
  onEventUpdated,
  onCancelClick,
}: EventDetailHeaderProps) {
  const router = useRouter();
  const [isChangingStage, setIsChangingStage] = useState(false);
  const currentStage = pipelineStages.find((s) => s.id === currentPipelineStageId);
  const isArchived = currentStage?.slug === 'archivado';

  const handlePipelineStageChange = async (newStageId: string) => {
    if (!eventId || newStageId === currentPipelineStageId) return;

    setIsChangingStage(true);
    try {
      const result = await moveEvent(studioSlug, {
        event_id: eventId,
        new_stage_id: newStageId,
      });

      if (result.success) {
        toast.success('Etapa actualizada correctamente');
        // Recargar datos del evento
        const eventResult = await obtenerEventoDetalle(studioSlug, eventId);
        if (eventResult.success && eventResult.data) {
          onEventUpdated(eventResult.data);
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

  return (
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
        <div className="flex items-center gap-2">
          {pipelineStages.length > 0 && currentPipelineStageId && (
            <>
              <div className="relative flex items-center">
                <select
                  value={currentPipelineStageId || ''}
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
            </>
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
                    onClick={onCancelClick}
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
  );
};
