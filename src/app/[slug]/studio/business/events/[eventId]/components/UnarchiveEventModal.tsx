'use client';

import React, { useState } from 'react';
import { ArchiveRestore } from 'lucide-react';
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

interface UnarchiveEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studioSlug: string;
  eventId: string;
  firstActiveStage: EventPipelineStage;
  onUnarchived: () => void;
}

export function UnarchiveEventModal({
  open,
  onOpenChange,
  studioSlug,
  eventId,
  firstActiveStage,
  onUnarchived,
}: UnarchiveEventModalProps) {
  const [unarchiving, setUnarchiving] = useState(false);

  const handleConfirm = async () => {
    setUnarchiving(true);
    try {
      const result = await moveEvent(studioSlug, {
        event_id: eventId,
        new_stage_id: firstActiveStage.id,
      });
      if (result.success) {
        toast.success('Evento reactivado. Volverá a aparecer en tu panel operativo.');
        onOpenChange(false);
        onUnarchived();
      } else {
        toast.error(result.error ?? 'Error al desarchivar');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error al desarchivar');
    } finally {
      setUnarchiving(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-white">
            <ArchiveRestore className="h-5 w-5 text-amber-400" />
            Desarchivar evento
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <p className="text-sm text-zinc-400">
              ¿Deseas reactivar este evento? Volverá a aparecer en tu panel operativo.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-3 sm:gap-4">
          <AlertDialogCancel
            disabled={unarchiving}
            className="border-zinc-600 text-zinc-300 hover:bg-zinc-800"
          >
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={unarchiving}
            className="bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500/50"
          >
            {unarchiving ? 'Reactivando...' : 'Confirmar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
