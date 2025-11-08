'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, Trash2 } from 'lucide-react';
import { ZenDialog, ZenButton, ZenConfirmModal } from '@/components/ui/zen';
import { ZenInput } from '@/components/ui/zen';
import { toast } from 'sonner';
import { createPromiseLog, deletePromiseLog } from '@/lib/actions/studio/builder/commercial/promises';
import { formatDateTime } from '@/lib/actions/utils/formatting';
import { usePromiseLogs } from '@/hooks/usePromiseLogs';
import type { PromiseLog } from '@/lib/actions/studio/builder/commercial/promises/promise-logs.actions';

interface PromiseLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  studioSlug: string;
  promiseId: string | null;
  contactId?: string | null;
  onLogAdded?: (newLog?: PromiseLog) => void;
  onLogDeleted?: (logId: string) => void;
}

export function PromiseLogsModal({
  isOpen,
  onClose,
  studioSlug,
  promiseId,
  contactId,
  onLogAdded,
  onLogDeleted,
}: PromiseLogsModalProps) {
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [deletingLogId, setDeletingLogId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { logsOldestFirst, loading, addLog, removeLog, refetch } = usePromiseLogs({
    promiseId: isOpen && promiseId ? promiseId : null,
    enabled: isOpen,
  });

  // Para el modal, usamos logsOldestFirst (más vieja a más nueva) para trazabilidad
  const logs = logsOldestFirst;
  const isInitialLoading = loading && logs.length === 0;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && logs.length > 0) {
      // Pequeño delay para asegurar que el DOM esté actualizado
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
  }, [isOpen, logs.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !promiseId) return;

    const messageToSend = message.trim();
    setMessage('');
    setSending(true);

    try {
      const result = await createPromiseLog(studioSlug, {
        promise_id: promiseId,
        content: messageToSend,
        log_type: 'note',
      });

      if (result.success && result.data) {
        // Actualización optimista: agregar inmediatamente
        addLog(result.data);
        toast.success('Nota agregada');
        // Notificar al componente padre para actualizar el preview
        onLogAdded?.(result.data);
      } else {
        toast.error(result.error || 'Error al agregar nota');
        setMessage(messageToSend);
      }
    } catch (error) {
      console.error('Error creating log:', error);
      toast.error('Error al agregar nota');
      setMessage(messageToSend);
    } finally {
      setSending(false);
    }
  };

  const handleDeleteLog = async (logId: string) => {
    setDeletingLogId(logId);
    try {
      const result = await deletePromiseLog(studioSlug, logId);
      if (result.success) {
        // Actualización optimista: remover inmediatamente
        removeLog(logId);
        toast.success('Nota eliminada');
        // Notificar al componente padre para actualizar el preview
        onLogDeleted?.(logId);
      } else {
        toast.error(result.error || 'Error al eliminar nota');
      }
    } catch (error) {
      console.error('Error deleting log:', error);
      toast.error('Error al eliminar nota');
    } finally {
      setDeletingLogId(null);
      setShowDeleteModal(false);
    }
  };

  const isUserNote = (log: PromiseLog): boolean => {
    return log.log_type === 'note' && log.user_id !== null;
  };

  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Bitácora de Notas"
      description="Gestiona todas las notas de esta promesa"
      maxWidth="2xl"
    >
      <div className="flex flex-col" style={{ height: '600px' }}>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 min-h-0">
          {isInitialLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" />
                  <div className="h-16 w-full bg-zinc-800 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-zinc-500 text-center">
                No hay notas aún. Escribe algo para comenzar.
              </p>
            </div>
          ) : (
            <>
              {logs.map((log) => {
                const canDelete = isUserNote(log);
                const authorLabel = canDelete ? 'Usuario' : 'Sistema';
                
                return (
                  <div key={log.id} className="space-y-1 group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <span>{authorLabel}</span>
                        <span>•</span>
                        <span>{formatDateTime(log.created_at)}</span>
                      </div>
                      {canDelete && (
                        <ZenButton
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingLogId(log.id);
                            setShowDeleteModal(true);
                          }}
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-red-400"
                          disabled={deletingLogId === log.id}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </ZenButton>
                      )}
                    </div>
                    <div className="bg-zinc-800/50 rounded-lg p-3 text-sm text-zinc-200">
                      {log.content}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="pt-4 border-t border-zinc-800 mt-auto">
          <div className="flex gap-2">
            <ZenInput
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escribe una nota..."
              disabled={sending || !promiseId}
              className="flex-1"
            />
            <ZenButton
              type="submit"
              disabled={!message.trim() || sending || !promiseId}
              loading={sending}
              size="sm"
            >
              <Send className="h-4 w-4" />
            </ZenButton>
          </div>
        </form>
      </div>

      <ZenConfirmModal
        isOpen={showDeleteModal && deletingLogId !== null}
        onClose={() => {
          setShowDeleteModal(false);
          setDeletingLogId(null);
        }}
        onConfirm={() => {
          if (deletingLogId) {
            handleDeleteLog(deletingLogId);
          }
        }}
        title="Eliminar Nota"
        description="¿Estás seguro de eliminar esta nota? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="destructive"
        loading={deletingLogId !== null}
      />
    </ZenDialog>
  );
}

