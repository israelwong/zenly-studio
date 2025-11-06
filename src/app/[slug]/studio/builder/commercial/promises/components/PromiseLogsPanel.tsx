'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare } from 'lucide-react';
import { ZenInput, ZenButton } from '@/components/ui/zen';
import { toast } from 'sonner';
import { getPromiseLogs, createPromiseLog } from '@/lib/actions/studio/builder/commercial/prospects';
import { formatDateTime } from '@/lib/actions/utils/formatting';
import type { PromiseLog } from '@/lib/actions/studio/builder/commercial/prospects/promise-logs.actions';

interface PromiseLogsPanelProps {
  studioSlug: string;
  promiseId: string | null;
  contactId?: string | null;
}

export function PromiseLogsPanel({
  studioSlug,
  promiseId,
  contactId,
}: PromiseLogsPanelProps) {
  const [logs, setLogs] = useState<PromiseLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadLogs = async () => {
    if (!promiseId) {
      setIsInitialLoading(false);
      return;
    }

    try {
      setLoading(true);
      const result = await getPromiseLogs(promiseId);
      if (result.success && result.data) {
        setLogs(result.data);
      } else {
        toast.error(result.error || 'Error al cargar bitácora');
      }
    } catch (error) {
      console.error('Error loading logs:', error);
      toast.error('Error al cargar bitácora');
    } finally {
      setLoading(false);
      setIsInitialLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [promiseId]);

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

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
        setLogs((prev) => [result.data!, ...prev]);
        toast.success('Nota agregada');
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

  if (isInitialLoading) {
    return (
      <div className="flex flex-col h-[500px] bg-zinc-900/50 rounded-lg border border-zinc-800">
        <div className="p-4 border-b border-zinc-800">
          <div className="h-5 w-32 bg-zinc-800 rounded animate-pulse" />
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" />
              <div className="h-16 w-full bg-zinc-800 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!promiseId) {
    return (
      <div className="flex flex-col h-[600px] bg-zinc-900/50 rounded-lg border border-zinc-800">
        <div className="p-3 border-b border-zinc-800" />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-zinc-500 text-center px-4">
            Guarda la promesa para comenzar a agregar notas en la bitácora
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[600px] bg-zinc-900/50 rounded-lg border border-zinc-800">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-zinc-500 text-center">
              No hay notas aún. Escribe algo para comenzar.
            </p>
          </div>
        ) : (
          <>
            {logs.map((log) => (
              <div key={log.id} className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <span>{log.user?.full_name || 'Sistema'}</span>
                  <span>•</span>
                  <span>{formatDateTime(log.created_at)}</span>
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-3 text-sm text-zinc-200">
                  {log.content}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-zinc-800">
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
  );
}

