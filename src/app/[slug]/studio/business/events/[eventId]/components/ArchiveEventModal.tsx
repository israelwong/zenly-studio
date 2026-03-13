'use client';

import React, { useState } from 'react';
import { Archive, AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/shadcn/alert-dialog';
import { moveEvent } from '@/lib/actions/studio/business/events';
import { toast } from 'sonner';
import type { EventPipelineStage } from '@/lib/actions/schemas/events-schemas';

function formatearMoneda(n: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

interface ArchiveEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studioSlug: string;
  eventId: string;
  archivadoStage: EventPipelineStage;
  balanceDue: number;
  onArchived: () => void;
}

export function ArchiveEventModal({
  open,
  onOpenChange,
  studioSlug,
  eventId,
  archivadoStage,
  balanceDue,
  onArchived,
}: ArchiveEventModalProps) {
  const [archiving, setArchiving] = useState(false);
  const hasDebt = balanceDue > 0;

  const handleConfirm = async () => {
    setArchiving(true);
    try {
      const result = await moveEvent(studioSlug, {
        event_id: eventId,
        new_stage_id: archivadoStage.id,
      });
      if (result.success) {
        toast.success('Evento archivado y movido al historial');
        onOpenChange(false);
        onArchived();
      } else {
        toast.error(result.error ?? 'Error al archivar');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error al archivar');
    } finally {
      setArchiving(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-white">
            <Archive className="h-5 w-5 text-zinc-400" />
            Archivar evento
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm">
              {hasDebt ? (
                <div className="flex items-start gap-2 rounded-lg bg-red-950/30 border border-red-800/50 p-3 text-red-200">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <p>
                    ¿Estás seguro de que deseas archivar el evento? Aún tienes pagos pendientes que no han sido saldados (
                    <span className="font-semibold">{formatearMoneda(balanceDue)}</span>).
                  </p>
                </div>
              ) : (
                <p className="text-zinc-400">
                  ¿Estás seguro de que deseas archivar el evento? Se moverá al historial.
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-3 sm:gap-4">
          <AlertDialogCancel
            disabled={archiving}
            className="border-zinc-600 text-zinc-300 hover:bg-zinc-800"
          >
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={archiving}
            className={
              hasDebt
                ? 'bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500/50'
                : 'bg-zinc-700 hover:bg-zinc-600 text-white'
            }
          >
            {archiving ? 'Archivando...' : 'Confirmar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
