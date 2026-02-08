'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Logs } from 'lucide-react';
import { ZenButton } from '@/components/ui/zen';
import { usePromiseLogs } from '@/hooks/usePromiseLogs';
import { usePromiseLogsRealtime } from '@/hooks/usePromiseLogsRealtime';
import { BitacoraSheet } from '@/components/shared/bitacora';
import type { PromiseLog } from '@/lib/actions/studio/commercial/promises/promise-logs.actions';

interface PromiseNotesButtonProps {
  studioSlug: string;
  promiseId: string;
  contactId?: string | null;
}

export function PromiseNotesButton({
  studioSlug,
  promiseId,
  contactId,
}: PromiseNotesButtonProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const { logs, addLog, removeLog, refetch } = usePromiseLogs({
    promiseId: promiseId,
    enabled: true,
  });

  // ✅ OPTIMIZACIÓN: Ordenar desc solo para preview usando useMemo
  const logsRecentFirst = useMemo(() => {
    return [...logs].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [logs]);

  // Callbacks para realtime
  const handleLogInserted = useCallback((log: PromiseLog) => {
    addLog(log);
  }, [addLog]);

  const handleLogUpdated = useCallback((log: PromiseLog) => {
    refetch();
  }, [refetch]);

  const handleLogDeleted = useCallback((logId: string) => {
    removeLog(logId);
  }, [removeLog]);

  const handleLogsReload = useCallback(() => {
    refetch();
  }, [refetch]);

  // Suscribirse a cambios en tiempo real
  usePromiseLogsRealtime({
    studioSlug,
    promiseId: promiseId,
    onLogInserted: handleLogInserted,
    onLogUpdated: handleLogUpdated,
    onLogDeleted: handleLogDeleted,
    onLogsReload: handleLogsReload,
    enabled: !!promiseId,
  });

  return (
    <>
      <ZenButton
        variant="ghost"
        size="sm"
        className="gap-1.5 px-2.5 py-1.5 h-7 text-xs"
        title="Bitácora"
        onClick={() => setIsSheetOpen(true)}
      >
        <Logs className="h-3.5 w-3.5 shrink-0" />
        <span>Bitácora</span>
      </ZenButton>

      <BitacoraSheet
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        studioSlug={studioSlug}
        promiseId={promiseId}
        context="PROMISE"
        contactId={contactId}
        onLogAdded={(newLog) => {
          if (newLog) {
            addLog(newLog);
          }
        }}
        onLogDeleted={(logId) => {
          removeLog(logId);
        }}
      />
    </>
  );
}

