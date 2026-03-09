'use client';

import { useState, useEffect } from 'react';
import { ZenDialog, ZenButton, ZenTextarea } from '@/components/ui/zen';

interface CancelPromiseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (motivo: string) => void | Promise<void>;
  title?: string;
  description?: string;
  confirmText?: string;
}

export function CancelPromiseModal({
  isOpen,
  onClose,
  onConfirm,
  title = '¿Deseas cancelar esta promesa?',
  description = 'Indica el motivo de la cancelación. Se registrará en la bitácora y se eliminarán los recordatorios y citas agendadas asociadas. Las cotizaciones se mantendrán intactas.',
  confirmText = 'Confirmar cancelación',
}: CancelPromiseModalProps) {
  const [motivo, setMotivo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setMotivo('');
      setIsSubmitting(false);
      setError(null);
    }
  }, [isOpen]);

  const handleClose = () => {
    if (isSubmitting) return;
    setMotivo('');
    setError(null);
    onClose();
  };

  const handleConfirm = async () => {
    const trimmed = motivo.trim();
    if (!trimmed) {
      setError('El motivo es obligatorio');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const result = onConfirm(trimmed);
      if (result instanceof Promise) {
        await result;
      }
      handleClose();
    } catch (err) {
      console.error('CancelPromiseModal onConfirm error:', err);
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
      maxWidth="md"
    >
      <div className="space-y-4">
        <ZenTextarea
          value={motivo}
          onChange={(e) => {
            setMotivo(e.target.value);
            if (error) setError(null);
          }}
          placeholder="Motivo de la cancelación (obligatorio)"
          rows={4}
          className="resize-none"
          error={error ?? undefined}
        />
        <div className="flex justify-end gap-2">
          <ZenButton variant="outline" onClick={handleClose} disabled={isSubmitting}>
            No, mantener
          </ZenButton>
          <ZenButton variant="destructive" onClick={handleConfirm} loading={isSubmitting}>
            {confirmText}
          </ZenButton>
        </div>
      </div>
    </ZenDialog>
  );
}
