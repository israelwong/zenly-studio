'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, Trash2, MessageSquare } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/shadcn/sheet';
import { ZenButton, ZenInput, ZenConfirmModal } from '@/components/ui/zen';
import { toast } from 'sonner';
import { createPromiseLog, deletePromiseLog } from '@/lib/actions/studio/commercial/promises';
import { formatDateTime } from '@/lib/actions/utils/formatting';
import { usePromiseLogs } from '@/hooks/usePromiseLogs';
import type { PromiseLog } from '@/lib/actions/studio/commercial/promises/promise-logs.actions';

interface EventLogsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studioSlug: string;
  promiseId: string | null;
}

export function EventLogsSheet({
  open,
  onOpenChange,
  studioSlug,
  promiseId,
}: EventLogsSheetProps) {
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [deletingLogId, setDeletingLogId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { logsOldestFirst, loading, addLog, removeLog } = usePromiseLogs({
    promiseId: open && promiseId ? promiseId : null,
    enabled: open,
  });

  const logs = logsOldestFirst;
  const isInitialLoading = loading && logs.length === 0;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (open && logs.length > 0) {
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
  }, [open, logs.length]);

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
        addLog(result.data);
        toast.success('Nota agregada');
        setTimeout(() => scrollToBottom(), 100);
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
    setIsDeleting(true);
    try {
      const result = await deletePromiseLog(studioSlug, logId);
      if (result.success) {
        removeLog(logId);
        toast.success('Nota eliminada');
      } else {
        toast.error(result.error || 'Error al eliminar nota');
      }
    } catch (error) {
      console.error('Error deleting log:', error);
      toast.error('Error al eliminar nota');
    } finally {
      setIsDeleting(false);
      setDeletingLogId(null);
      setShowDeleteModal(false);
    }
  };

  const isUserNote = (log: PromiseLog): boolean => {
    return log.log_type === 'user_note' || log.log_type === 'note';
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-md bg-zinc-900 border-zinc-800 flex flex-col p-0">
          <SheetHeader className="px-4 py-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-400" />
              <SheetTitle className="text-zinc-200">Bitácora</SheetTitle>
            </div>
            <SheetDescription className="text-zinc-400">
              Historial de comentarios y notas del evento
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
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
                  const authorLabel = log.user?.full_name || (canDelete ? 'Usuario' : 'Sistema');

                  return (
                    <div key={log.id} className="space-y-1 group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                          <span className="font-medium text-zinc-400">{authorLabel}</span>
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

          {/* Input fijo en la parte inferior */}
          <div className="px-4 py-3 border-t border-zinc-800 bg-zinc-900">
            <form onSubmit={handleSubmit} className="flex gap-2">
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
                className="flex-shrink-0"
              >
                <Send className="h-4 w-4" />
              </ZenButton>
            </form>
          </div>
        </SheetContent>
      </Sheet>

      <ZenConfirmModal
        isOpen={showDeleteModal && deletingLogId !== null}
        onClose={() => {
          if (!isDeleting) {
            setShowDeleteModal(false);
            setDeletingLogId(null);
          }
        }}
        onConfirm={() => {
          if (deletingLogId && !isDeleting) {
            handleDeleteLog(deletingLogId);
          }
        }}
        title="Eliminar Nota"
        description="¿Estás seguro de eliminar esta nota? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="destructive"
        loading={isDeleting}
      />
    </>
  );
}
