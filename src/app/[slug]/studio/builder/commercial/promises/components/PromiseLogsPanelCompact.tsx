'use client';

import React, { useState } from 'react';
import { MessageSquare, ChevronRight } from 'lucide-react';
import { ZenCard, ZenCardHeader, ZenCardTitle, ZenCardContent, ZenButton } from '@/components/ui/zen';
import { formatDateTime } from '@/lib/actions/utils/formatting';
import { usePromiseLogs } from '@/hooks/usePromiseLogs';
import { PromiseLogsModal } from './PromiseLogsModal';

interface PromiseLogsPanelCompactProps {
  studioSlug: string;
  promiseId: string | null;
  contactId?: string | null;
  isSaved: boolean;
}

export function PromiseLogsPanelCompact({
  studioSlug,
  promiseId,
  contactId,
  isSaved,
}: PromiseLogsPanelCompactProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { logsRecentFirst, loading, addLog, removeLog, refetch } = usePromiseLogs({
    promiseId: isSaved && promiseId ? promiseId : null,
    enabled: isSaved,
  });

  if (!isSaved || !promiseId) {
    return null;
  }

  // Mostrar las 2 notas más recientes (ya están ordenadas de más reciente a más vieja)
  const lastTwoLogs = logsRecentFirst.slice(0, 2);
  const hasMoreLogs = logsRecentFirst.length > 2;

  return (
    <>
      <ZenCard>
        <ZenCardHeader className="border-b border-zinc-800 py-2 px-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <ZenCardTitle className="text-sm font-medium flex items-center pt-1">
              Notas
            </ZenCardTitle>
            {logsRecentFirst.length > 0 && (
              <ZenButton
                variant="ghost"
                size="sm"
                onClick={() => setIsModalOpen(true)}
                className="h-6 px-2 text-xs text-zinc-400 hover:text-zinc-300"
              >
                Ver todas
              </ZenButton>
            )}
          </div>
        </ZenCardHeader>
        <ZenCardContent className="p-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-3 w-32 bg-zinc-800 rounded animate-pulse" />
                  <div className="h-12 w-full bg-zinc-800 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : lastTwoLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6">
              <MessageSquare className="h-8 w-8 text-zinc-600 mb-2" />
              <p className="text-xs text-zinc-500 text-center">
                No hay notas aún
              </p>
              <ZenButton
                variant="ghost"
                size="sm"
                onClick={() => setIsModalOpen(true)}
                className="mt-3 text-xs"
              >
                Agregar nota
              </ZenButton>
            </div>
          ) : (
            <div className="space-y-3">
              {lastTwoLogs.map((log) => {
                const isUserNote = log.log_type === 'note' && log.user_id !== null;
                const authorLabel = isUserNote ? 'Usuario' : 'Sistema';
                
                return (
                  <div
                    key={log.id}
                    className="space-y-1 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setIsModalOpen(true)}
                  >
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <span>{authorLabel}</span>
                      <span>•</span>
                      <span>{formatDateTime(log.created_at)}</span>
                    </div>
                    <div className="bg-zinc-800/50 rounded-lg p-2.5 text-xs text-zinc-200 line-clamp-2">
                      {log.content}
                    </div>
                  </div>
                );
              })}
              {hasMoreLogs && (
                <ZenButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsModalOpen(true)}
                  className="w-full text-xs text-zinc-400 hover:text-zinc-300"
                >
                  Ver {logsRecentFirst.length - 2} nota(s) más
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </ZenButton>
              )}
            </div>
          )}
        </ZenCardContent>
      </ZenCard>

      <PromiseLogsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        studioSlug={studioSlug}
        promiseId={promiseId}
        contactId={contactId}
        onLogAdded={(newLog) => {
          if (newLog) {
            addLog(newLog);
          } else {
            refetch();
          }
        }}
        onLogDeleted={(logId) => {
          removeLog(logId);
        }}
      />
    </>
  );
}

