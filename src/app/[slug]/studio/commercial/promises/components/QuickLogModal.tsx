'use client';

import { useState, useCallback } from 'react';
import { ZenDialog } from '@/components/ui/zen';
import { createPromiseLog } from '@/lib/actions/studio/commercial/promises';
import { toast } from 'sonner';

export interface QuickLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  studioSlug: string;
  promiseId: string;
  /** Llamado con el log recién creado para actualización optimista (ej. last_log en la card). */
  onSaved?: (newLog: { id: string; content: string; created_at: Date }) => void;
}

export function QuickLogModal({ isOpen, onClose, studioSlug, promiseId, onSaved }: QuickLogModalProps) {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = useCallback(async () => {
    const trimmed = content.trim();
    if (!trimmed) {
      toast.error('Escribe el contenido de la nota');
      return;
    }
    setIsLoading(true);
    try {
      const result = await createPromiseLog(studioSlug, {
        promise_id: promiseId,
        content: trimmed,
        log_type: 'user_note',
      });
      if (result.success && result.data) {
        toast.success('Nota agregada');
        setContent('');
        onSaved?.({ id: result.data.id, content: result.data.content, created_at: result.data.created_at });
        onClose();
      } else {
        toast.error(result.error ?? 'Error al guardar la nota');
      }
    } catch {
      toast.error('Error al guardar la nota');
    } finally {
      setIsLoading(false);
    }
  }, [studioSlug, promiseId, content, onSaved, onClose]);

  const handleClose = useCallback(() => {
    if (!isLoading) {
      setContent('');
      onClose();
    }
  }, [isLoading, onClose]);

  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Agregar nota"
      description="Registra un comentario o seguimiento para esta promesa."
      onSave={handleSave}
      onCancel={handleClose}
      saveLabel="Guardar nota"
      cancelLabel="Cancelar"
      isLoading={isLoading}
      saveDisabled={!content.trim()}
      maxWidth="md"
      closeOnClickOutside={false}
    >
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Escribe tu nota..."
        className="w-full min-h-[120px] rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 resize-y"
        disabled={isLoading}
        autoFocus
      />
    </ZenDialog>
  );
}
