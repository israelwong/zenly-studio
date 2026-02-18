'use client';

import React from 'react';
import { User } from 'lucide-react';
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
  costoUnitario?: number | null;
  quantity?: number | null;
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

function invitationResponseLabel(status: string | null): string {
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
  const fmt = (n: number) => `$${Number(n).toLocaleString('es-MX', { maximumFractionDigits: 0 })}`;
  const budgetWithBreakdown =
    tarea.budgetAmount != null &&
    tarea.costoUnitario != null &&
    tarea.quantity != null &&
    tarea.quantity > 0;
  const budgetStr =
    tarea.budgetAmount != null
      ? budgetWithBreakdown
        ? `${fmt(tarea.costoUnitario)}×${tarea.quantity} ${fmt(tarea.budgetAmount)} MXN`
        : `${fmt(tarea.budgetAmount)} MXN`
      : null;
  const tieneInvitacionEnviada = tarea.invitationStatus != null;
  const invResponse = invitationResponseLabel(tarea.invitationStatus);
  const mostrarBotonInvitar = googleCalendarConectado && tarea.tienePersonal && onInvitar && !tieneInvitacionEnviada;
  const mostrarBotonCancelar = googleCalendarConectado && tieneInvitacionEnviada && onCancelarInvitacion;

  const badgePago =
    !tarea.payrollState?.hasPayroll ? null : tarea.payrollState.status === 'pagado' ? (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/90 text-white">
        Pagado
      </span>
    ) : (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border border-amber-500/60 text-amber-400 bg-transparent">
        Pendiente
      </span>
    );

  return (
    <div className="rounded-lg p-2.5 border border-zinc-700/50 bg-zinc-800/30 hover:border-zinc-600/50 transition-colors">
      <h4 className="text-sm font-medium text-zinc-200 truncate mb-1.5">
        {tarea.name || tarea.itemName || 'Sin nombre'}
      </h4>
      <div className="flex items-center gap-3 flex-wrap text-xs">
        {/* Staff: icon + nombre en esmeralda si asignado */}
        <span className="flex items-center gap-1.5 min-w-0">
          <User className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
          {onAssignPersonal ? (
            <ZenButton
              variant="ghost"
              size="sm"
              className={`h-6 text-xs -mx-1 shrink-0 ${
                tarea.tienePersonal ? 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10' : 'text-zinc-500 hover:text-zinc-300'
              }`}
              onClick={() => onAssignPersonal(tarea.id, tarea.startDate, tarea.endDate, tarea.itemId ?? undefined)}
            >
              {tarea.tienePersonal ? (tarea.personalNombre ?? 'Reemplazar') : 'Asignar personal'}
            </ZenButton>
          ) : (
            <span className={tarea.tienePersonal ? 'text-emerald-400 truncate' : 'text-zinc-500'}>
              {tarea.tienePersonal ? (tarea.personalNombre ?? '—') : 'Sin asignar'}
            </span>
          )}
        </span>

        <span className="text-zinc-600 shrink-0">|</span>

        {/* Presupuesto: costo×cantidad más tenue, total más visible */}
        <span className="shrink-0">
          {budgetStr != null ? (
            budgetWithBreakdown ? (
              <>
                <span className="text-zinc-600">{`${fmt(tarea.costoUnitario!)}×${tarea.quantity}`}</span>
                <span className="text-zinc-400">{` ${fmt(tarea.budgetAmount!)} MXN`}</span>
              </>
            ) : (
              <span className="text-zinc-400">{budgetStr}</span>
            )
          ) : (
            <span className="text-zinc-400">—</span>
          )}
        </span>

        <span className="text-zinc-600 shrink-0">|</span>

        {/* Badge estado pago */}
        <span className="shrink-0">{badgePago ?? <span className="text-zinc-600 text-[10px]">Sin pago</span>}</span>

        {(mostrarBotonInvitar || mostrarBotonCancelar) && (
          <>
            <span className="text-zinc-600 shrink-0">|</span>
            <span className="flex items-center gap-2 shrink-0 ml-auto">
              {mostrarBotonInvitar && (
                <ZenButton variant="secondary" size="sm" onClick={() => onInvitar(tarea.id)} className="text-xs">
                  Invitar
                </ZenButton>
              )}
              {mostrarBotonCancelar && (
                <>
                  <ZenButton
                    variant="ghost"
                    size="sm"
                    onClick={() => onCancelarInvitacion(tarea.id)}
                    className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    Cancelar
                  </ZenButton>
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] ${
                      invResponse === 'Aceptada'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : invResponse === 'Rechazada'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-zinc-600/40 text-zinc-400'
                    }`}
                  >
                    {invResponse}
                  </span>
                </>
              )}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
