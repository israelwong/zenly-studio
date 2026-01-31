'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, Trash2, MessageSquare } from 'lucide-react';
import { WhatsAppIcon } from '@/components/ui/icons/WhatsAppIcon';
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
import { usePromiseLogsRealtime } from '@/hooks/usePromiseLogsRealtime';
import type { PromiseLog } from '@/lib/actions/studio/commercial/promises/promise-logs.actions';
import { cn } from '@/lib/utils';

interface BitacoraSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studioSlug: string;
  promiseId: string | null;
  contactId?: string | null;
  onLogAdded?: (newLog?: PromiseLog) => void;
  onLogDeleted?: (logId: string) => void;
}

export function BitacoraSheet({
  open,
  onOpenChange,
  studioSlug,
  promiseId,
  contactId,
  onLogAdded,
  onLogDeleted,
}: BitacoraSheetProps) {
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [deletingLogId, setDeletingLogId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { logs, loading, addLog, removeLog, refetch } = usePromiseLogs({
    promiseId: open && promiseId ? promiseId : null,
    enabled: open,
  });

  // ✅ OPTIMIZACIÓN: Realtime para actualizaciones colaborativas
  usePromiseLogsRealtime({
    studioSlug,
    promiseId: open && promiseId ? promiseId : null,
    enabled: open, // Solo activo cuando el sheet está abierto
    onLogInserted: (newLog) => {
      addLog(newLog);
    },
    onLogDeleted: (logId) => {
      removeLog(logId);
    },
    onLogsReload: () => {
      // Recargar desde servidor para obtener logs completos con user
      refetch();
    },
  });

  // ✅ OPTIMIZACIÓN: Los logs ya vienen ordenados asc desde el servidor
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
        onLogAdded?.(result.data);
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
        onLogDeleted?.(logId);
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
        <SheetContent side="right" className="w-full sm:max-w-md bg-zinc-900 border-l border-zinc-800 flex flex-col p-0">
          <SheetHeader className="border-b border-zinc-800 pb-4 px-6 pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600/20 rounded-lg">
                <MessageSquare className="h-5 w-5 text-blue-400" />
              </div>
              <div className="flex-1">
                <SheetTitle className="text-xl font-semibold text-white">
                  Bitácora
                </SheetTitle>
                <SheetDescription className="text-zinc-400">
                  Historial de comentarios y notas
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 min-h-0">
            {isInitialLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-3 w-20 bg-zinc-800 rounded animate-pulse" />
                    <div className="h-12 w-full bg-zinc-800 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <MessageSquare className="h-12 w-12 text-zinc-700 mb-3" />
                <p className="text-sm text-zinc-500">
                  No hay notas aún
                </p>
                <p className="text-xs text-zinc-600 mt-1">
                  Escribe algo para comenzar
                </p>
              </div>
            ) : (
              <>
                {/* ✅ OPTIMIZACIÓN: Indicador si se alcanzó el límite de 100 logs */}
                {logs.length >= 100 && (
                  <div className="bg-blue-600/10 border border-blue-600/20 rounded-lg p-2.5 mb-2">
                    <p className="text-xs text-blue-400 text-center">
                      Mostrando los 100 registros más recientes
                    </p>
                  </div>
                )}
                {logs.map((log) => {
                  const canDelete = isUserNote(log);
                  const authorLabel = log.user?.full_name || (canDelete ? 'Tú' : 'Sistema');
                  const isSystem = !canDelete;
                  const isWhatsApp = log.log_type === 'whatsapp_sent';

                  return (
                    <div
                      key={log.id}
                      className={cn(
                        "group relative rounded-lg p-3 transition-colors",
                        isSystem ? "bg-zinc-800/30" : "bg-zinc-800/50 hover:bg-zinc-800/60"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            {isWhatsApp && (
                              <WhatsAppIcon className="h-3.5 w-3.5 text-emerald-400 shrink-0" size={14} />
                            )}
                            <span className={cn(
                              "text-xs font-medium",
                              isSystem ? "text-zinc-500" : "text-zinc-300"
                            )}>
                              {authorLabel}
                            </span>
                            <span className="text-zinc-600">•</span>
                            <span className="text-xs text-zinc-600">
                              {formatDateTime(log.created_at)}
                            </span>
                          </div>
                          <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap break-words">
                            {log.content}
                          </p>
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
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-red-400 flex-shrink-0"
                            disabled={deletingLogId === log.id}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </ZenButton>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input fijo */}
          <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900">
            <form onSubmit={handleSubmit} className="flex gap-2 items-center w-full">
              <div className="flex-1 min-w-0">
                <ZenInput
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Escribe una nota..."
                  disabled={sending || !promiseId}
                  className="h-9 w-full"
                  size="sm"
                />
              </div>
              <ZenButton
                type="submit"
                disabled={!message.trim() || sending || !promiseId}
                loading={sending}
                size="sm"
                className="flex-shrink-0 h-9"
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
