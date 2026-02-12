'use client';

import { useState, useEffect } from 'react';

const EVENT_NAME = 'scheduler-note-updated';

/**
 * Sincroniza el indicador de notas (Sidebar/Grid) en tiempo real al añadir una nota en el Sheet.
 * Escucha scheduler-note-updated y marca hasNotes=true cuando el taskId coincide.
 */
export function useTaskNotesSync(taskId: string | null | undefined, initialCount: number = 0) {
  const [hasNotes, setHasNotes] = useState(initialCount > 0);

  useEffect(() => {
    setHasNotes(initialCount > 0);
  }, [initialCount]);

  useEffect(() => {
    if (!taskId) return;
    const handler = (e: CustomEvent<{ taskId: string }>) => {
      if (e.detail?.taskId === taskId) setHasNotes(true);
    };
    window.addEventListener(EVENT_NAME, handler as EventListener);
    return () => window.removeEventListener(EVENT_NAME, handler as EventListener);
  }, [taskId]);

  return hasNotes;
}
