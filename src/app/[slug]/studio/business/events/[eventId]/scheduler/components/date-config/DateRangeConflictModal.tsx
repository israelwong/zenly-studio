'use client';

import { AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/shadcn/dialog';
import { ZenButton } from '@/components/ui/zen';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface DateRangeConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflictCount: number;
  proposedRange: { from: Date; to: Date };
}

export function DateRangeConflictModal({
  isOpen,
  onClose,
  conflictCount,
  proposedRange,
}: DateRangeConflictModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-zinc-900 border-zinc-800" overlayZIndex={10060}>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/10">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <DialogTitle className="text-zinc-300">No se puede actualizar el rango</DialogTitle>
              <DialogDescription className="text-zinc-400">
                Hay {conflictCount} tarea{conflictCount !== 1 ? 's' : ''} asignada{conflictCount !== 1 ? 's' : ''} fuera del nuevo rango
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Rango propuesto */}
          <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
            <p className="text-sm text-zinc-400 mb-2">Rango que intentas configurar:</p>
            <p className="text-sm font-medium text-zinc-300">
              {format(proposedRange.from, "d 'de' MMMM, yyyy", { locale: es })} - {format(proposedRange.to, "d 'de' MMMM, yyyy", { locale: es })}
            </p>
          </div>

          {/* Instrucciones */}
          <div className="p-4 bg-blue-950/20 border border-blue-800/30 rounded-lg">
            <p className="text-sm text-blue-300">
              <strong>¿Qué puedes hacer?</strong>
            </p>
            <ul className="mt-2 space-y-1 text-sm text-blue-300/80">
              <li>• Ajusta las fechas de las tareas para que estén dentro del nuevo rango</li>
              <li>• O amplía el rango para incluir todas las tareas asignadas</li>
            </ul>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
          <ZenButton
            variant="primary"
            onClick={onClose}
          >
            Entendido
          </ZenButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
