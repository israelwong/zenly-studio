'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MoreVertical, Loader2, MessageSquare, ExternalLink, FileText } from 'lucide-react';
import { ZenCardHeader, ZenCardTitle, ZenCardDescription, ZenButton, ZenDropdownMenu, ZenDropdownMenuTrigger, ZenDropdownMenuContent, ZenDropdownMenuItem, ZenDropdownMenuSeparator } from '@/components/ui/zen';
import type { EventoDetalle } from '@/lib/actions/studio/business/events';
import type { EventPipelineStage } from '@/lib/actions/schemas/events-schemas';

interface EventDetailHeaderProps {
  studioSlug: string;
  eventData: EventoDetalle;
  pipelineStages: EventPipelineStage[];
  currentPipelineStageId: string | null;
  isChangingStage: boolean;
  loading: boolean;
  onPipelineStageChange: (newStageId: string) => void;
  onCancelClick: () => void;
  onLogsClick: () => void;
  onTemplatesClick: () => void;
}

export function EventDetailHeader({
  studioSlug,
  eventData,
  pipelineStages,
  currentPipelineStageId,
  isChangingStage,
  loading,
  onPipelineStageChange,
  onCancelClick,
  onLogsClick,
  onTemplatesClick,
}: EventDetailHeaderProps) {
  const router = useRouter();
  const currentStage = pipelineStages.find((s) => s.id === currentPipelineStageId);
  const isArchived = currentStage?.slug === 'archivado';

  const handlePortalCliente = () => {
    const clientPhone = eventData?.promise?.contact?.phone;
    if (!clientPhone) return;

    const loginUrl = `/${studioSlug}/cliente/login?phone=${encodeURIComponent(clientPhone)}`;
    window.open(loginUrl, '_blank');
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
          {/* Botón de plantillas de contrato */}
          <ZenButton
            variant="ghost"
            size="sm"
            onClick={onTemplatesClick}
            className="gap-2 text-zinc-400 hover:text-zinc-300 hover:bg-zinc-950/50 px-3"
          >
            <FileText className="h-4 w-4" />
            <span className="text-xs font-medium">Plantillas de contrato</span>
          </ZenButton>
          <div className="h-6 w-px bg-zinc-700 mx-1" />

          {/* Botón de bitácora */}
          {eventData?.promise?.id && (
            <>
              <ZenButton
                variant="ghost"
                size="sm"
                onClick={onLogsClick}
                className="gap-2 text-zinc-400 hover:text-zinc-300 hover:bg-zinc-950/50 px-3"
              >
                <MessageSquare className="h-4 w-4" />
                <span className="text-xs font-medium">Bitácora</span>
              </ZenButton>
              <div className="h-6 w-px bg-zinc-700 mx-1" />
            </>
          )}

          {/* Botón Portal Cliente */}
          {eventData?.promise?.contact?.phone && (
            <>
              <ZenButton
                variant="ghost"
                size="sm"
                onClick={handlePortalCliente}
                className="gap-2 text-zinc-400 hover:text-zinc-300 hover:bg-zinc-950/50 px-3"
              >
                <ExternalLink className="h-4 w-4" />
                <span className="text-xs font-medium">Portal Cliente</span>
              </ZenButton>
              <div className="h-6 w-px bg-zinc-700 mx-1" />
            </>
          )}

          {pipelineStages.length > 0 && currentPipelineStageId && (
            <>
              <div className="relative flex items-center">
                <select
                  value={currentPipelineStageId}
                  onChange={(e) => onPipelineStageChange(e.target.value)}
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
}
