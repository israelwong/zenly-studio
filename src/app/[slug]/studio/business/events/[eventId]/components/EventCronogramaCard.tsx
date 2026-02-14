'use client';

import React from 'react';
import { Calendar, Clock, Lock } from 'lucide-react';
import {
  ZenCard,
  ZenCardHeader,
  ZenCardTitle,
  ZenCardContent,
  ZenButton,
} from '@/components/ui/zen';
import { formatDate } from '@/lib/actions/utils/formatting';
import type { EventoDetalle } from '@/lib/actions/studio/business/events';

interface EventCronogramaCardProps {
  studioSlug: string;
  eventId: string;
  eventData: EventoDetalle;
  onUpdated?: () => void;
}

export function EventCronogramaCard({
  studioSlug,
  eventId,
  eventData,
  onUpdated,
}: EventCronogramaCardProps) {
  const handleViewCronograma = () => {
    window.location.href = `/${studioSlug}/studio/business/events/${eventId}/scheduler`;
  };

  const scheduler = eventData?.scheduler ?? null;
  const tasks = scheduler?.tasks ?? [];
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t?.status === 'completed' || t?.progress_percent === 100).length;

  const allClassified =
    totalTasks === 0 ||
    tasks.every(
      (t) =>
        (t as { catalog_category_id?: string | null }).catalog_category_id &&
        (t as { category?: string }).category !== 'UNASSIGNED'
    );
  const pendingClassify =
    totalTasks > 0
      ? tasks.filter(
          (t) =>
            !(t as { catalog_category_id?: string | null }).catalog_category_id ||
            (t as { category?: string }).category === 'UNASSIGNED'
        ).length
      : 0;
  const hasNoScheduler = !scheduler;

  return (
    <ZenCard>
      <ZenCardHeader className="border-b border-zinc-800 py-2 px-3 shrink-0">
        <div className="flex items-center justify-between">
          <ZenCardTitle className="text-sm font-medium flex items-center pt-1">
            Cronograma
          </ZenCardTitle>
          {allClassified ? (
            <ZenButton
              variant="ghost"
              size="sm"
              onClick={handleViewCronograma}
              className="h-6 px-2 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/20 shrink-0"
            >
              <Calendar className="h-3 w-3 mr-1" />
              Gestionar Cronograma
            </ZenButton>
          ) : (
            <span className="flex items-center gap-1 h-6 px-2 text-[10px] text-amber-400/90 shrink-0" title="Clasifica los ítems pendientes para continuar">
              <Lock className="h-3 w-3" />
              {pendingClassify} pendiente{pendingClassify !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </ZenCardHeader>
      <ZenCardContent className="p-4">
        {scheduler ? (
          <div className="space-y-3">
            {scheduler.start_date && scheduler.end_date && (
              <div className="flex items-start gap-2.5">
                <Clock className="h-4 w-4 text-zinc-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-zinc-400 mb-0.5">Rango de fechas</p>
                  <p className="text-xs text-zinc-300">
                    {formatDate(scheduler.start_date)} - {formatDate(scheduler.end_date)}
                  </p>
                </div>
              </div>
            )}
            {totalTasks > 0 && (
              <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
                <p className="text-xs text-zinc-400">
                  {completedTasks} de {totalTasks} tareas completadas
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4 space-y-3">
            <p className="text-xs text-zinc-500">
              {hasNoScheduler ? 'Crear cronograma' : 'No hay cronograma configurado'}
            </p>
            {hasNoScheduler && (
              <ZenButton
                variant="outline"
                size="sm"
                onClick={handleViewCronograma}
                className="gap-2"
              >
                <Calendar className="h-3.5 w-3.5" />
                Crear cronograma
              </ZenButton>
            )}
          </div>
        )}
        {totalTasks > 0 && !allClassified && (
          <p className="text-[10px] text-zinc-500 pt-2 border-t border-zinc-800 mt-2">
            Clasifica los ítems pendientes para continuar.
          </p>
        )}
      </ZenCardContent>
    </ZenCard>
  );
}

