'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MoreVertical, Loader2, Check, Calendar } from 'lucide-react';
import { ZenCardHeader, ZenCardTitle, ZenCardDescription, ZenButton, ZenBadge, ZenDropdownMenu, ZenDropdownMenuTrigger, ZenDropdownMenuContent, ZenDropdownMenuItem } from '@/components/ui/zen';
import { createPromiseLog } from '@/lib/actions/studio/commercial/promises/promise-logs.actions';
import type { EventoDetalle } from '@/lib/actions/studio/business/events';
import type { EventPipelineStage } from '@/lib/actions/schemas/events-schemas';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { tieneGoogleCalendarHabilitado } from '@/lib/integrations/google/clients/calendar/helpers';
import { GoogleBundleModal } from '@/components/shared/integrations/GoogleBundleModal';

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
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [savedNameFeedback, setSavedNameFeedback] = useState(false);
  const [googleCalendarConectado, setGoogleCalendarConectado] = useState(false);
  const [showGoogleBundleModal, setShowGoogleBundleModal] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const currentStage = pipelineStages.find((s) => s.id === currentPipelineStageId);

  useEffect(() => {
    tieneGoogleCalendarHabilitado(studioSlug).then(setGoogleCalendarConectado).catch(() => setGoogleCalendarConectado(false));
  }, [studioSlug]);
  const isArchived = currentStage?.slug === 'archivado';

  const displayName = eventData.promise?.name || eventData.name || 'Evento sin nombre';

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  const handleStartEditName = () => {
    setEditNameValue(displayName);
    setIsEditingName(true);
  };

  const handleUpdateName = async () => {
    const trimmed = editNameValue.trim();
    if (trimmed === displayName || !trimmed) {
      setIsEditingName(false);
      setEditNameValue(displayName);
      return;
    }
    setIsSavingName(true);
    try {
      const { actualizarNombreEvento } = await import('@/lib/actions/studio/business/events/events.actions');
      const result = await actualizarNombreEvento(studioSlug, {
        event_id: eventId,
        name: trimmed,
      });
      if (result.success) {
        if (result.data) onEventUpdated(result.data);
        setIsEditingName(false);
        setSavedNameFeedback(true);
        toast.success('Nombre actualizado');
        setTimeout(() => setSavedNameFeedback(false), 1500);
        if (eventData.promise_id) {
          createPromiseLog(studioSlug, {
            promise_id: eventData.promise_id,
            content: `Nombre del evento actualizado: '${displayName}' ➔ '${trimmed}'`,
            log_type: 'user_note',
            origin_context: 'EVENT',
          }).catch(() => {});
        }
      } else {
        toast.error(result.error || 'Error al guardar');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar el nombre');
    } finally {
      setIsSavingName(false);
    }
  };

  const handleNameBlur = () => {
    handleUpdateName();
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      (e.target as HTMLInputElement).blur();
    }
    if (e.key === 'Escape') {
      setEditNameValue(displayName);
      setIsEditingName(false);
    }
  };

  const handlePipelineStageChange = async (newStageId: string) => {
    if (!eventId || newStageId === currentPipelineStageId) return;

    setIsChangingStage(true);
    try {
      const { moveEvent, obtenerEventoDetalle } = await import('@/lib/actions/studio/business/events/events.actions');
      const result = await moveEvent(studioSlug, {
        event_id: eventId,
        new_stage_id: newStageId,
      });

      if (result.success) {
        toast.success('Etapa actualizada correctamente');
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
    <>
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
            <div className="flex flex-wrap items-center gap-2">
              {isEditingName ? (
                <input
                  ref={nameInputRef}
                  type="text"
                  value={editNameValue}
                  onChange={(e) => setEditNameValue(e.target.value)}
                  onBlur={handleNameBlur}
                  onKeyDown={handleNameKeyDown}
                  disabled={isSavingName}
                  className={cn(
                    'min-w-[120px] max-w-[320px] rounded px-1 py-0.5 text-lg font-semibold leading-tight',
                    'bg-zinc-800/80 text-zinc-100 placeholder-zinc-500',
                    'border border-zinc-600 focus:border-emerald-500/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/40',
                    'disabled:opacity-60'
                  )}
                  placeholder="Nombre del evento"
                />
              ) : (
                <ZenCardTitle
                  className="mb-0 cursor-pointer rounded px-1 py-0.5 hover:bg-zinc-800/60 transition-colors"
                  onClick={handleStartEditName}
                >
                  {displayName}
                </ZenCardTitle>
              )}
              {isSavingName && (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-zinc-400" />
              )}
              {savedNameFeedback && !isSavingName && (
                <Check className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
              )}
              {eventData.event_type?.name && (
                <ZenBadge variant="success" size="sm" className="shrink-0">
                  {eventData.event_type.name}
                </ZenBadge>
              )}
            </div>
            <ZenCardDescription>
              Detalle del evento
            </ZenCardDescription>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {googleCalendarConectado ? (
            <ZenBadge variant="outline" className="gap-1 px-2 py-0.5 bg-emerald-950/30 text-emerald-400 border-emerald-800/50 text-[10px] sm:text-xs shrink-0">
              <Calendar className="h-3 w-3 shrink-0" aria-hidden />
              Google Calendar conectado
            </ZenBadge>
          ) : (
            <ZenButton
              variant="ghost"
              size="sm"
              className="inline-flex items-center rounded-md border font-medium gap-1 px-2 py-0.5 bg-zinc-800/50 text-zinc-400 border-zinc-700 hover:bg-zinc-700/50 hover:text-zinc-300 text-[10px] sm:text-xs shrink-0"
              onClick={() => setShowGoogleBundleModal(true)}
            >
              <Calendar className="h-3 w-3 shrink-0" aria-hidden />
              Conectar Google Calendar
            </ZenButton>
          )}
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
                <ZenDropdownMenuItem
                  onClick={onCancelClick}
                  className="text-red-400 focus:text-red-300 focus:bg-red-950/20"
                >
                  Cancelar evento
                </ZenDropdownMenuItem>
              )}
            </ZenDropdownMenuContent>
          </ZenDropdownMenu>
        </div>
      </div>
    </ZenCardHeader>
    <GoogleBundleModal
      isOpen={showGoogleBundleModal}
      onClose={() => {
        setShowGoogleBundleModal(false);
        tieneGoogleCalendarHabilitado(studioSlug).then(setGoogleCalendarConectado).catch(() => setGoogleCalendarConectado(false));
      }}
      studioSlug={studioSlug}
    />
    </>
  );
};
