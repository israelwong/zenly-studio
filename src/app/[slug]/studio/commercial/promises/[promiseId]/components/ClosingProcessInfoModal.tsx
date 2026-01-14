'use client';

import React from 'react';
import { Info, CheckCircle2, FileText, CreditCard, XCircle } from 'lucide-react';
import { ZenDialog, ZenBadge } from '@/components/ui/zen';

interface ClosingProcessInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onCancel?: () => void;
  cotizacionName?: string;
  isLoading?: boolean;
}

export function ClosingProcessInfoModal({
  isOpen,
  onClose,
  onConfirm,
  onCancel,
  cotizacionName,
  isLoading = false,
}: ClosingProcessInfoModalProps) {
  const handleConfirm = () => {
    if (isLoading) return; // No permitir confirmar si ya está procesando
    onConfirm();
  };

  const handleCancel = () => {
    if (isLoading) return; // No permitir cancelar si está procesando
    onCancel?.();
    onClose();
  };

  const handleClose = () => {
    if (isLoading) return; // No permitir cerrar si está procesando
    onClose();
  };

  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={handleClose}
      title="¿Pasar cotización a proceso de cierre?"
      description={
        isLoading
          ? 'Procesando y redirigiendo...'
          : cotizacionName
            ? `Estás a punto de pasar "${cotizacionName}" al proceso de cierre.`
            : 'Estás a punto de pasar esta cotización al proceso de cierre.'
      }
      maxWidth="lg"
      onSave={handleConfirm}
      onCancel={handleCancel}
      saveLabel={isLoading ? 'Procesando...' : 'Continuar'}
      cancelLabel="Cancelar"
      closeOnClickOutside={false}
      isLoading={isLoading}
    >
      <div className="space-y-6">
        {/* Información principal */}
        <div className="bg-gradient-to-br from-zinc-800/60 to-zinc-800/40 border border-zinc-700/50 rounded-lg p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
              <Info className="h-5 w-5 text-blue-400" />
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <p className="text-sm font-semibold text-zinc-200 mb-2">¿Qué pasará?</p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-sm text-zinc-300">
                        La cotización cambiará a estado{' '}
                        <ZenBadge variant="info" size="sm" className="inline-flex">
                          En Cierre
                        </ZenBadge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <FileText className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-zinc-300">
                        Podrás gestionar el contrato y registro de pago desde el panel de proceso de cierre
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CreditCard className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-zinc-300">
                        Solo puede haber una cotización en proceso de cierre por promesa
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Información sobre cancelación */}
        <div className="bg-zinc-800/30 border border-zinc-700/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
              <XCircle className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-zinc-200 mb-1">
                ¿Necesitas cancelar el cierre?
              </p>
              <p className="text-xs text-zinc-400">
                Puedes cancelar el proceso de cierre en cualquier momento desde el panel de cierre. 
                La cotización regresará a su estado anterior automáticamente.
              </p>
            </div>
          </div>
        </div>
      </div>
    </ZenDialog>
  );
}
