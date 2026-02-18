'use client';

import React from 'react';
import { User, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ZenButton } from '@/components/ui/zen';

export interface LogisticsTaskCardTask {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  syncStatus: string;
  invitationStatus: string | null;
  tienePersonal: boolean;
  personalNombre?: string | null;
  personalEmail?: string | null;
  itemId?: string | null;
  itemName?: string | null;
  budgetAmount?: number | null;
  payrollState: { hasPayroll: boolean; status?: 'pendiente' | 'pagado' };
  isDraft: boolean;
}

interface LogisticsTaskCardProps {
  tarea: LogisticsTaskCardTask;
  googleCalendarConectado: boolean;
  onAssignPersonal?: (taskId: string, startDate: Date, endDate: Date, itemId?: string) => void;
  onInvitar?: (taskId: string) => void;
  onCancelarInvitacion?: (taskId: string) => void;
}

function invitationLabel(status: string | null): string {
  if (status === 'ACCEPTED' || status === 'PAID') return 'Aceptada';
  if (status === 'DECLINED') return 'Rechazada';
  if (status === 'PENDING') return 'Pendiente';
  return 'Pendiente';
}

export function LogisticsTaskCard({
  tarea,
  googleCalendarConectado,
  onAssignPersonal,
  onInvitar,
  onCancelarInvitacion,
}: LogisticsTaskCardProps) {
  const dateStr = `${format(tarea.startDate, 'dd MMM', { locale: es })} – ${format(tarea.endDate, 'dd MMM yyyy', { locale: es })}`;
  const invStatus = invitationLabel(tarea.invitationStatus);
  const payrollLed = !tarea.payrollState?.hasPayroll ? (
    <span className="h-1.5 w-1.5 rounded-full bg-zinc-500 shrink-0" title="Sin pago" />
  ) : tarea.payrollState.status === 'pagado' ? (
    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" title="Pagado" />
  ) : (
    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" title="Pago pendiente" />
  );
  const budgetStr =
    tarea.budgetAmount != null ? `$${Number(tarea.budgetAmount).toLocaleString('es-MX', { maximumFractionDigits: 0 })}` : null;
  const tieneInvitacionEnviada = tarea.invitationStatus != null;
  const mostrarBotonInvitar = googleCalendarConectado && tarea.tienePersonal && onInvitar && !tieneInvitacionEnviada;
  const mostrarBotonCancelar = googleCalendarConectado && tieneInvitacionEnviada && onCancelarInvitacion;

  return (
    <div className="rounded-lg p-2.5 border border-zinc-700/50 bg-zinc-800/30 hover:border-zinc-600/50 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-zinc-200 truncate">{tarea.name || tarea.itemName || 'Sin nombre'}</h4>
          <div className="mt-1.5 flex items-center gap-2 flex-wrap text-xs text-zinc-500">
            {googleCalendarConectado && (
              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${
                  invStatus === 'Aceptada'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : invStatus === 'Rechazada'
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-zinc-600/40 text-zinc-400'
                }`}
                title={`Invitación: ${invStatus}`}
              >
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M19 4H5c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H5V8h14v10z" />
                </svg>
                {invStatus}
              </span>
            )}
            <span className="text-zinc-600">·</span>
            <span className="inline-flex items-center gap-1.5">
              {payrollLed}
              {budgetStr != null && <span>{budgetStr}</span>}
            </span>
            <span className="text-zinc-600">·</span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3 shrink-0" />
              {dateStr}
            </span>
            {onAssignPersonal && (
              <>
                <span className="text-zinc-600">·</span>
                <ZenButton
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-zinc-500 hover:text-zinc-300 -mx-1"
                  onClick={() => onAssignPersonal(tarea.id, tarea.startDate, tarea.endDate, tarea.itemId ?? undefined)}
                >
                  <User className="h-3 w-3 mr-1 shrink-0" />
                  {tarea.tienePersonal ? (tarea.personalNombre ?? 'Reemplazar') : 'Asignar personal'}
                </ZenButton>
              </>
            )}
          </div>
        </div>
        {(mostrarBotonInvitar || mostrarBotonCancelar) && (
          <div className="shrink-0">
            {mostrarBotonInvitar && (
              <ZenButton variant="secondary" size="sm" onClick={() => onInvitar(tarea.id)} className="text-xs">
                Invitar
              </ZenButton>
            )}
            {mostrarBotonCancelar && (
              <ZenButton
                variant="ghost"
                size="sm"
                onClick={() => onCancelarInvitacion(tarea.id)}
                className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                Cancelar invitación
              </ZenButton>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
