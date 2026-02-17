'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, RotateCcw } from 'lucide-react';
import { ZenButton, ZenBadge, ZenConfirmModal } from '@/components/ui/zen';
import { obtenerConteoTareasDraft, cancelarCambiosPendientes } from '@/lib/actions/studio/business/events/scheduler-actions';
import { PublicationSummarySheet } from './PublicationSummarySheet';
import { toast } from 'sonner';

interface PublicationBarProps {
  studioSlug: string;
  eventId: string;
  onPublished?: () => void;
}

export function PublicationBar({ studioSlug, eventId, onPublished }: PublicationBarProps) {
  const [draftCount, setDraftCount] = useState(0);
  const [checking, setChecking] = useState(true);
  const [showSummarySheet, setShowSummarySheet] = useState(false);
  const [mostrarConfirmRevertir, setMostrarConfirmRevertir] = useState(false);
  const [loading, setLoading] = useState(false);
  const isMountedRef = useRef(true);

  const checkDraftCount = useCallback(async () => {
    if (!isMountedRef.current) return;

    try {
      const result = await obtenerConteoTareasDraft(studioSlug, eventId);
      if (result.success && result.count !== undefined && isMountedRef.current) {
        setDraftCount(result.count);
      } else if (result.error) {
        console.error('[PublicationBar] Error obteniendo conteo:', result.error);
      }
    } catch (error) {
      console.error('[PublicationBar] Error obteniendo conteo de tareas DRAFT:', error);
    } finally {
      if (isMountedRef.current) {
        setChecking(false);
      }
    }
  }, [studioSlug, eventId]);

  useEffect(() => {
    isMountedRef.current = true;
    checkDraftCount();

    // Escuchar eventos personalizados para actualizar el conteo
    const handleTaskUpdate = () => {
      if (isMountedRef.current) {
        checkDraftCount();
      }
    };

    window.addEventListener('scheduler-task-updated', handleTaskUpdate);
    window.addEventListener('scheduler-task-created', handleTaskUpdate);
    window.addEventListener('scheduler-structure-changed', handleTaskUpdate);

    return () => {
      isMountedRef.current = false;
      window.removeEventListener('scheduler-task-updated', handleTaskUpdate);
      window.removeEventListener('scheduler-task-created', handleTaskUpdate);
      window.removeEventListener('scheduler-structure-changed', handleTaskUpdate);
    };
  }, [checkDraftCount]);

  const handleOpenSummary = () => {
    setShowSummarySheet(true);
  };

  const handlePublished = () => {
    setShowSummarySheet(false);
    setDraftCount(0);
    onPublished?.();
    checkDraftCount();
  };

  const handleConfirmarRevertir = async () => {
    setMostrarConfirmRevertir(false);
    setLoading(true);
    try {
      const result = await cancelarCambiosPendientes(studioSlug, eventId);

      if (result.success) {
        toast.success(`${result.revertidas || 0} cambio(s) revertido(s)`);
        setDraftCount(0);
        onPublished?.();
        checkDraftCount();
      } else {
        toast.error(result.error || 'Error al revertir cambios');
      }
    } catch (error) {
      console.error('Error revirtiendo cambios:', error);
      toast.error('Error al revertir cambios');
    } finally {
      setLoading(false);
    }
  };

  // Mostrar solo si ya terminó de verificar Y hay tareas DRAFT
  // Durante la carga inicial (checking === true), no mostrar nada
  if (checking) {
    return null;
  }

  // Si no hay tareas DRAFT después de verificar, no mostrar
  if (draftCount === 0) {
    return null;
  }

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50" role="status" aria-label="Cambios sin publicar">
        <div className="bg-zinc-900/95 backdrop-blur-sm border border-amber-800/40 rounded-xl shadow-2xl px-5 py-4 flex items-center gap-4 min-w-[500px]">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex items-center gap-2">
              <div className="relative" aria-hidden>
                <div className="h-2 w-2 bg-amber-400 rounded-full animate-pulse" />
                <div className="absolute inset-0 h-2 w-2 bg-amber-400 rounded-full animate-ping opacity-75" />
              </div>
              <span className="text-xs font-medium text-amber-400/90 uppercase tracking-wider">
                Modo Edición
              </span>
              <span className="text-zinc-500">·</span>
              <span className="text-sm text-white font-medium">
                {draftCount} {draftCount === 1 ? 'cambio sin publicar' : 'cambios sin publicar'}
              </span>
            </div>
            <div className="h-6 w-px bg-zinc-700/50" />
          </div>

          <div className="flex items-center gap-2">
            <ZenButton
              variant="outline"
              size="sm"
              onClick={() => setMostrarConfirmRevertir(true)}
              disabled={loading}
              className="gap-2 bg-amber-950/20 border-amber-800/30 text-amber-400 hover:bg-amber-950/30 hover:border-amber-700/50 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              Revertir cambios
            </ZenButton>

            <ZenButton
              variant="primary"
              size="sm"
              onClick={handleOpenSummary}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Ver resumen
            </ZenButton>
          </div>
        </div>
      </div>

      <PublicationSummarySheet
        open={showSummarySheet}
        onOpenChange={setShowSummarySheet}
        studioSlug={studioSlug}
        eventId={eventId}
        onPublished={handlePublished}
      />

      <ZenConfirmModal
        isOpen={mostrarConfirmRevertir}
        onClose={() => setMostrarConfirmRevertir(false)}
        onConfirm={handleConfirmarRevertir}
        title="Revertir cambios"
        description="Se cancelarán todos los cambios pendientes y se restaurarán las tareas como estaban antes de ser modificadas. Esta acción no se puede deshacer."
        confirmText="Sí, revertir cambios"
        cancelText="Cancelar"
        variant="destructive"
        loading={loading}
      />
    </>
  );
}

