'use client';

import React from 'react';
import { ZenButton } from '@/components/ui/zen';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/shadcn/dialog';

interface GoogleDriveDisconnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (limpiarPermisos: boolean) => Promise<void>;
  studioSlug: string;
  isDisconnecting?: boolean;
  canRevokePermissions?: boolean; // Si tiene permisos de escritura (drive completo, no solo readonly)
}

export function GoogleDriveDisconnectModal({
  isOpen,
  onClose,
  onConfirm,
  studioSlug,
  isDisconnecting = false,
  canRevokePermissions = true,
}: GoogleDriveDisconnectModalProps) {
  const handleConfirm = async () => {
    // Siempre desconectar sin revocar permisos (limpiarPermisos = false)
    await onConfirm(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md" overlayZIndex={10100}>
        <DialogHeader>
          <DialogTitle className="text-zinc-100">
            Desconectar Google Drive
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            ¿Estás seguro de que deseas desconectar Google Drive?
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="p-4 rounded-lg border bg-zinc-800/50 border-zinc-700">
            <div className="space-y-2">
              <div className="text-sm font-medium text-zinc-200">
                Al desconectar:
              </div>
              <div className="text-xs text-zinc-400 space-y-1.5">
                <p>• Se detendrá la sincronización automática de carpetas y entregables.</p>
                <p>• Los permisos públicos de las carpetas existentes se mantendrán en Google Drive.</p>
                <p>• Las carpetas vinculadas dejarán de actualizarse automáticamente desde ZEN.</p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <ZenButton
            variant="outline"
            onClick={onClose}
            disabled={isDisconnecting}
          >
            Cancelar
          </ZenButton>
          <ZenButton
            variant="destructive"
            onClick={handleConfirm}
            loading={isDisconnecting}
            loadingText="Desconectando..."
          >
            Desconectar
          </ZenButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

