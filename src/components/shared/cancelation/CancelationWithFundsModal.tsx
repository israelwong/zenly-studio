'use client';

import React, { useState, useEffect } from 'react';
import { ZenDialog, ZenTextarea, ZenButton } from '@/components/ui/zen';

export interface CancelationWithFundsData {
  reason: string;
  requestedBy: 'estudio' | 'cliente';
  fundDestination: 'retain' | 'refund';
}

interface CancelationWithFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: CancelationWithFundsData) => void | Promise<void>;
  title: string;
  description: React.ReactNode;
  isLoading?: boolean;
  saveLabel?: string;
  cancelLabel?: string;
}

export function CancelationWithFundsModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  isLoading = false,
  saveLabel = 'Confirmar y cancelar',
  cancelLabel = 'Volver',
}: CancelationWithFundsModalProps) {
  const [reason, setReason] = useState('');
  const [requestedBy, setRequestedBy] = useState<'estudio' | 'cliente'>('estudio');
  const [fundDestination, setFundDestination] = useState<'retain' | 'refund'>('retain');

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setRequestedBy('estudio');
      setFundDestination('retain');
    }
  }, [isOpen]);

  const handleSave = async () => {
    const trimmed = reason.trim();
    if (!trimmed) return;
    await onConfirm({ reason: trimmed, requestedBy, fundDestination });
  };

  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={() => !isLoading && onClose()}
      title={title}
      description={description}
      saveLabel={isLoading ? 'Cancelando...' : saveLabel}
      onSave={() => void handleSave()}
      onCancel={onClose}
      cancelLabel={cancelLabel}
      isLoading={isLoading}
      saveDisabled={!reason.trim()}
      saveVariant="destructive"
      maxWidth="md"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">Motivo de la cancelación *</label>
          <ZenTextarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ej. Cliente solicitó cambio de fecha, evento pospuesto..."
            rows={3}
            className="bg-zinc-900 border-zinc-700"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">¿Quién solicita la cancelación? *</label>
          <div className="flex gap-3 w-full">
            <ZenButton
              type="button"
              variant={requestedBy === 'estudio' ? 'primary' : 'outline'}
              size="sm"
              className="flex-1"
              onClick={() => setRequestedBy('estudio')}
            >
              Estudio
            </ZenButton>
            <ZenButton
              type="button"
              variant={requestedBy === 'cliente' ? 'primary' : 'outline'}
              size="sm"
              className="flex-1"
              onClick={() => setRequestedBy('cliente')}
            >
              Cliente
            </ZenButton>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">Destino del dinero</label>
          <div className="space-y-2">
            <label className="flex items-start gap-3 p-3 rounded-lg border border-zinc-700 bg-zinc-800/50 cursor-pointer hover:bg-zinc-800/80">
              <input
                type="radio"
                name="destinoFondos"
                checked={fundDestination === 'retain'}
                onChange={() => setFundDestination('retain')}
                className="mt-1 text-emerald-500"
              />
              <div>
                <span className="font-medium text-zinc-200">Retener anticipo (No reembolsable)</span>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Los pagos quedarán como retenidos por cancelación. No cuentan en balance de eventos activos; siguen en reportes de ingresos.
                </p>
              </div>
            </label>
            <label className="flex items-start gap-3 p-3 rounded-lg border border-zinc-700 bg-zinc-800/50 cursor-pointer hover:bg-zinc-800/80">
              <input
                type="radio"
                name="destinoFondos"
                checked={fundDestination === 'refund'}
                onChange={() => setFundDestination('refund')}
                className="mt-1 text-emerald-500"
              />
              <div>
                <span className="font-medium text-zinc-200">Marcar para devolución</span>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Los pagos pasan a pendientes de reembolso. El cliente podrá ver el estado en su vista.
                </p>
              </div>
            </label>
          </div>
        </div>
      </div>
    </ZenDialog>
  );
}
