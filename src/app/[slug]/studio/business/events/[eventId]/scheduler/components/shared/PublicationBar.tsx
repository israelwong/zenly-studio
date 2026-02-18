'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LayoutDashboard } from 'lucide-react';
import { ZenButton } from '@/components/ui/zen';
import { obtenerMetricasLogisticasEvento } from '@/lib/actions/studio/business/events/scheduler-actions';
import { PublicationSummarySheet } from './PublicationSummarySheet';

interface PublicationBarProps {
  studioSlug: string;
  eventId: string;
  onPublished?: () => void;
  sectionOrder?: string[];
  catalogCategoryOrderByStage?: Record<string, string[]> | null;
}

export function PublicationBar({
  studioSlug,
  eventId,
  onPublished,
  sectionOrder,
  catalogCategoryOrderByStage,
}: PublicationBarProps) {
  const [metrics, setMetrics] = useState<{
    totalTareas: number;
    personalAsignado: number;
    personalPendiente: number;
    invitacionesAceptadas: number;
    invitacionesPendientes: number;
    invitacionesRechazadas: number;
    draftCount: number;
  } | null>(null);
  const [checking, setChecking] = useState(true);
  const [showSummarySheet, setShowSummarySheet] = useState(false);
  const isMountedRef = useRef(true);

  const checkMetrics = useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      const result = await obtenerMetricasLogisticasEvento(studioSlug, eventId);
      if (result.success && result.data && isMountedRef.current) {
        setMetrics(result.data);
      } else if (result.error) {
        console.error('[PublicationBar] Error métricas:', result.error);
      }
    } catch (error) {
      console.error('[PublicationBar] Error obteniendo métricas:', error);
    } finally {
      if (isMountedRef.current) setChecking(false);
    }
  }, [studioSlug, eventId]);

  useEffect(() => {
    isMountedRef.current = true;
    checkMetrics();
    const handleUpdate = () => { if (isMountedRef.current) checkMetrics(); };
    window.addEventListener('scheduler-task-updated', handleUpdate);
    window.addEventListener('scheduler-task-created', handleUpdate);
    window.addEventListener('scheduler-structure-changed', handleUpdate);
    return () => {
      isMountedRef.current = false;
      window.removeEventListener('scheduler-task-updated', handleUpdate);
      window.removeEventListener('scheduler-task-created', handleUpdate);
      window.removeEventListener('scheduler-structure-changed', handleUpdate);
    };
  }, [checkMetrics]);

  const handleOpenSummary = () => setShowSummarySheet(true);
  const handlePublished = () => {
    setShowSummarySheet(false);
    onPublished?.();
    checkMetrics();
  };

  if (checking || !metrics) return null;
  if (metrics.totalTareas === 0) return null;

  return (
    <>
      <div className="fixed bottom-14 left-1/2 -translate-x-1/2 z-50" role="status" aria-label="Panel de gestión logística">
        <div className="bg-zinc-900/90 backdrop-blur-md border border-white/15 rounded-xl shadow-2xl shadow-black/40 ring-1 ring-white/10 px-5 py-4 flex items-center gap-4 min-w-[520px]">
          <div className="flex items-center gap-4 flex-1 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500">Tareas</span>
              <span className="text-sm font-semibold text-white">{metrics.totalTareas}</span>
            </div>
            <div className="h-5 w-px bg-zinc-700/50" />
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500">Invitaciones</span>
              <span className="text-sm text-emerald-400 font-medium">{metrics.invitacionesAceptadas} ok</span>
              <span className="text-sm text-amber-400">{metrics.invitacionesPendientes} pend.</span>
              {metrics.invitacionesRechazadas > 0 && (
                <span className="text-sm text-red-400">{metrics.invitacionesRechazadas} rech.</span>
              )}
            </div>
            <div className="h-5 w-px bg-zinc-700/50" />
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500">Personal</span>
              <span className="text-sm text-emerald-400 font-medium">{metrics.personalAsignado}</span>
              <span className="text-zinc-500">/</span>
              <span className="text-sm text-zinc-400">{metrics.personalPendiente} pend.</span>
            </div>
          </div>

          <ZenButton variant="primary" size="sm" onClick={handleOpenSummary} className="gap-2 shrink-0">
            <LayoutDashboard className="h-4 w-4" />
            Panel logístico
          </ZenButton>
        </div>
      </div>

      <PublicationSummarySheet
        open={showSummarySheet}
        onOpenChange={setShowSummarySheet}
        studioSlug={studioSlug}
        eventId={eventId}
        onPublished={handlePublished}
        sectionOrder={sectionOrder}
        catalogCategoryOrderByStage={catalogCategoryOrderByStage}
      />
    </>
  );
}
