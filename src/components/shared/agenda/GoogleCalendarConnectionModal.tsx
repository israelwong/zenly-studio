'use client';

import { Calendar, CalendarCheck, Users, ExternalLink } from 'lucide-react';
import { ZenButton } from '@/components/ui/zen';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/shadcn/dialog';

interface GoogleCalendarConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: () => void;
  connecting?: boolean;
}

export function GoogleCalendarConnectionModal({
  isOpen,
  onClose,
  onConnect,
  connecting = false,
}: GoogleCalendarConnectionModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl text-zinc-100 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-emerald-400" />
            Sincroniza tu flujo de trabajo con Google
          </DialogTitle>
          <DialogDescription className="text-zinc-400 pt-2">
            Conecta tu cuenta de Google Calendar para sincronizar automáticamente tus eventos y
            tareas. Puedes usar una cuenta diferente a la de tu inicio de sesión.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Sección 1: Calendario Principal */}
          <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <Calendar className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-zinc-200 mb-1">
                  Calendario Principal
                </h3>
                <p className="text-xs text-zinc-400 mb-2">
                  Visualización de alto nivel de tu actividad comercial:
                </p>
                <ul className="space-y-1 text-xs text-zinc-400">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    Citas con prospectos
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    Reuniones con clientes
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    Fechas de eventos confirmados
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Sección 2: Calendario de Tareas */}
          <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <CalendarCheck className="h-4 w-4 text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-zinc-200 mb-1">
                  Calendario de Tareas
                </h3>
                <p className="text-xs text-zinc-400 mb-2">
                  Gestión operativa del equipo:
                </p>
                <div className="text-xs text-zinc-400 space-y-1">
                  <p>
                    Se creará un calendario llamado{' '}
                    <span className="text-zinc-300 font-medium">"Tareas De ZEN"</span> donde se
                    mostrarán exclusivamente las tareas asignadas a tu equipo de trabajo:
                  </p>
                  <ul className="space-y-1 mt-2 ml-4">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                      Cronogramas de eventos
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                      Tareas de post-producción
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Nota sobre cuenta diferente */}
          <div className="p-3 bg-zinc-800/30 rounded-lg border border-zinc-700/50">
            <p className="text-xs text-zinc-400 flex items-start gap-2">
              <ExternalLink className="h-3.5 w-3.5 text-zinc-500 mt-0.5 flex-shrink-0" />
              <span>
                Puedes usar una cuenta de Google diferente a la de tu inicio de sesión. Esto te
                permite separar tu calendario personal del calendario de trabajo.
              </span>
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <ZenButton variant="outline" onClick={onClose} disabled={connecting}>
            Cancelar
          </ZenButton>
          <ZenButton
            variant="primary"
            onClick={onConnect}
            loading={connecting}
            loadingText="Conectando..."
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Entendido, conectar cuenta
          </ZenButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

