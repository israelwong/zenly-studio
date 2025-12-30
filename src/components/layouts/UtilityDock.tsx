'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, ContactRound, CalendarCheck } from 'lucide-react';
import { ZenButton } from '@/components/ui/zen';
import { obtenerEstadoConexion } from '@/lib/integrations/google';

interface UtilityDockProps {
  studioSlug: string;
  onAgendaClick?: () => void;
  onContactsClick?: () => void;
  onTareasOperativasClick?: () => void;
}

export function UtilityDock({
  studioSlug,
  onAgendaClick,
  onContactsClick,
  onTareasOperativasClick,
}: UtilityDockProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [hasGoogleCalendar, setHasGoogleCalendar] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    let isMountedRef = true;

    const checkConnection = () => {
      if (!isMountedRef) return;

      obtenerEstadoConexion(studioSlug)
        .then((result) => {
          if (!isMountedRef) return;

          if (result.success && result.isConnected) {
            const hasCalendarScope =
              result.scopes?.some(
                (scope) =>
                  scope.includes('calendar') || scope.includes('calendar.events')
              ) || false;
            setHasGoogleCalendar(hasCalendarScope);
          } else {
            setHasGoogleCalendar(false);
          }
        })
        .catch(() => {
          if (!isMountedRef) return;
          setHasGoogleCalendar(false);
        });
    };

    checkConnection();

    const handleConnectionChange = () => {
      if (isMountedRef) {
        checkConnection();
      }
    };
    window.addEventListener('google-calendar-connection-changed', handleConnectionChange);

    return () => {
      isMountedRef = false;
      window.removeEventListener('google-calendar-connection-changed', handleConnectionChange);
    };
  }, [isMounted, studioSlug]);

  return (
    <aside className="w-12 shrink-0 border-l border-zinc-800 bg-zinc-950/50 flex flex-col items-center py-4 gap-2 z-20">
      {/* Agenda */}
      {onAgendaClick && (
        <ZenButton
          variant="ghost"
          size="icon"
          className="rounded-full h-10 w-10 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors"
          onClick={onAgendaClick}
          title="Agenda"
        >
          <Calendar className="h-5 w-5" />
          <span className="sr-only">Agenda</span>
        </ZenButton>
      )}

      {/* Tareas Operativas - Solo si Google Calendar está conectado */}
      {onTareasOperativasClick && isMounted && hasGoogleCalendar && (
        <ZenButton
          variant="ghost"
          size="icon"
          className="rounded-full h-10 w-10 text-purple-400 hover:text-purple-300 hover:bg-purple-900/20 transition-colors"
          onClick={onTareasOperativasClick}
          title="Tareas Operativas"
        >
          <CalendarCheck className="h-5 w-5" />
          <span className="sr-only">Tareas Operativas</span>
        </ZenButton>
      )}

      {/* Divider */}
      {onContactsClick && <div className="w-8 h-px bg-zinc-800 my-2" />}

      {/* Contactos */}
      {onContactsClick && (
        <ZenButton
          variant="ghost"
          size="icon"
          className="rounded-full h-10 w-10 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors"
          onClick={onContactsClick}
          title="Contactos"
        >
          <ContactRound className="h-5 w-5" />
          <span className="sr-only">Contactos</span>
        </ZenButton>
      )}
    </aside>
  );
}

