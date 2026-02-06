'use client';

import { useState, useEffect } from 'react';
import { ZenDialog, ZenButton, ZenTextarea } from '@/components/ui/zen';

interface ArchivePromiseModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Al confirmar se pasa el motivo (opcional). Si retorna Promise, el modal muestra loading hasta que resuelva. */
  onConfirm: (archiveReason?: string) => void | Promise<void>;
  title?: string;
  description?: string;
  confirmText?: string;
  /** Si la promesa tiene recordatorio asociado, se muestra aviso y el botón indica que se eliminará */
  hasReminder?: boolean;
}

export function ArchivePromiseModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Archivar promesa',
  description = 'El motivo se registrará en la bitácora de seguimiento de la promesa.',
  confirmText = 'Archivar',
  hasReminder = false,
}: ArchivePromiseModalProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setReason('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    if (isSubmitting) return;
    setReason('');
    onClose();
  };

  const handleConfirm = async () => {
    const trimmed = reason.trim() || undefined;
    setIsSubmitting(true);
    try {
      const result = onConfirm(trimmed);
      if (result instanceof Promise) {
        await result;
      }
      handleClose();
    } catch (err) {
      console.error('ArchivePromiseModal onConfirm error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      description={description}
      maxWidth="sm"
    >
      <div className="space-y-4">
        {hasReminder && (
          <p className="text-xs text-amber-400/90 bg-amber-500/10 border border-amber-500/20 rounded-md px-3 py-2">
            Se eliminará el recordatorio asociado a esta promesa.
          </p>
        )}
        <ZenTextarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Motivo (opcional)"
          rows={3}
          className="resize-none"
        />
        <div className="flex justify-end gap-2">
          <ZenButton variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancelar
          </ZenButton>
          <ZenButton variant="destructive" onClick={handleConfirm} loading={isSubmitting}>
            {confirmText}
          </ZenButton>
        </div>
      </div>
    </ZenDialog>
  );
}
