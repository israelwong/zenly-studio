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
            Se detendrá la sincronización automática. Los permisos públicos de las carpetas se mantendrán.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="p-4 rounded-lg border bg-zinc-800/50 border-zinc-700">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <div className="text-sm font-medium text-zinc-200 mb-1">
                  Solo desconectar
                </div>
                <div className="text-xs text-zinc-400">
                  Mantener los permisos públicos de las carpetas. Solo se detendrá la sincronización automática.
                </div>
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

