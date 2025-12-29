'use client';

import React, { useState, useEffect } from 'react';
import { ZenButton } from '@/components/ui/zen';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/shadcn/dialog';
import { obtenerConteoContactosSincronizados } from '@/lib/integrations/google';
import { Skeleton } from '@/components/ui/shadcn/Skeleton';

interface GoogleContactsDisconnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (eliminarContactos: boolean) => Promise<void>;
  studioSlug: string;
  isDisconnecting?: boolean;
}

export function GoogleContactsDisconnectModal({
  isOpen,
  onClose,
  onConfirm,
  studioSlug,
  isDisconnecting = false,
}: GoogleContactsDisconnectModalProps) {
  const [eliminarContactos, setEliminarContactos] = useState(false);
  const [contactosSincronizados, setContactosSincronizados] = useState<number | null>(null);
  const [cargandoConteo, setCargandoConteo] = useState(false);

  // Cargar conteo de contactos cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      cargarConteoContactos();
    } else {
      // Reset al cerrar
      setEliminarContactos(false);
      setContactosSincronizados(null);
    }
  }, [isOpen, studioSlug]);

  const cargarConteoContactos = async () => {
    setCargandoConteo(true);
    try {
      const result = await obtenerConteoContactosSincronizados(studioSlug);
      if (result.success && result.total !== undefined) {
        setContactosSincronizados(result.total);
      } else {
        setContactosSincronizados(0);
      }
    } catch (error) {
      console.error('Error cargando conteo de contactos:', error);
      setContactosSincronizados(0);
    } finally {
      setCargandoConteo(false);
    }
  };

  const handleConfirm = async () => {
    await onConfirm(eliminarContactos);
  };

  const handleClose = () => {
    setEliminarContactos(false);
    setContactosSincronizados(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        handleClose();
      }
    }}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md" overlayZIndex={10100} style={{ zIndex: 10100 }}>
        <DialogHeader>
          <DialogTitle className="text-zinc-100">
            Desconectar Google Contacts
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            {cargandoConteo ? (
              'Cargando información...'
            ) : contactosSincronizados !== null && contactosSincronizados > 0 ? (
              <>
                Tienes <span className="text-zinc-200 font-medium">{contactosSincronizados}</span>{' '}
                {contactosSincronizados === 1 ? 'contacto sincronizado' : 'contactos sincronizados'} en
                tu Google Contacts. ¿Qué deseas hacer con estos contactos?
              </>
            ) : contactosSincronizados === 0 ? (
              'No tienes contactos sincronizados actualmente. ¿Qué deseas hacer al desconectar?'
            ) : (
              '¿Estás seguro de que deseas desconectar Google Contacts? Los contactos dejarán de sincronizarse automáticamente.'
            )}
          </DialogDescription>
        </DialogHeader>

        {cargandoConteo ? (
          <div className="space-y-3 py-4">
            <div className="p-4 rounded-lg border bg-zinc-800/50 border-zinc-700">
              <div className="flex items-start gap-3">
                <Skeleton className="h-4 w-4 rounded-full mt-1" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            </div>
            <div className="p-4 rounded-lg border bg-zinc-800/50 border-zinc-700">
              <div className="flex items-start gap-3">
                <Skeleton className="h-4 w-4 rounded-full mt-1" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-5/6" />
                </div>
              </div>
            </div>
          </div>
        ) : contactosSincronizados !== null && (
          <div className="space-y-3 py-4">
            <div
              className={`p-4 rounded-lg border cursor-pointer transition-colors ${!eliminarContactos
                ? 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
                : 'bg-zinc-800 border-zinc-600'
                }`}
              onClick={() => setEliminarContactos(false)}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  checked={!eliminarContactos}
                  onChange={() => setEliminarContactos(false)}
                  className="mt-1 h-4 w-4 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-zinc-900 border-zinc-600 bg-zinc-800"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-zinc-200 mb-1">
                    Solo desconectar
                  </div>
                  <div className="text-xs text-zinc-400">
                    Mantener los contactos actuales en tu Google Contacts. Solo se detendrá la
                    sincronización automática.
                  </div>
                </div>
              </div>
            </div>

            <div
              className={`p-4 rounded-lg border cursor-pointer transition-colors ${eliminarContactos
                ? 'bg-red-950/20 border-red-900/50 hover:border-red-900/70'
                : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
                }`}
              onClick={() => setEliminarContactos(true)}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  checked={eliminarContactos}
                  onChange={() => setEliminarContactos(true)}
                  className="mt-1 h-4 w-4 text-red-600 focus:ring-red-500 focus:ring-offset-zinc-900 border-zinc-600 bg-zinc-800"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-zinc-200 mb-1">
                    Eliminar y desconectar
                  </div>
                  <div className="text-xs text-zinc-400">
                    Al elegir esta opción, se eliminarán de tu Google Contacts todos los contactos
                    y personal del equipo que fueron sincronizados desde ZEN. Esta acción no se puede
                    deshacer.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <ZenButton
            variant="outline"
            onClick={handleClose}
            disabled={isDisconnecting}
          >
            Cancelar
          </ZenButton>
          <ZenButton
            variant="destructive"
            onClick={handleConfirm}
            loading={isDisconnecting}
            loadingText={
              eliminarContactos && contactosSincronizados && contactosSincronizados > 0
                ? 'Eliminando contactos...'
                : 'Desconectando...'
            }
          >
            {eliminarContactos ? 'Eliminar y Desconectar' : 'Desconectar'}
          </ZenButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

