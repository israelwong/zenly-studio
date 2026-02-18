'use client';

import React from 'react';
import { User, Calendar, Clock, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ZenButton } from '@/components/ui/zen';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/shadcn/tooltip';

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
  billingType?: 'HOUR' | 'SERVICE' | 'UNIT' | null;
  durationHours?: number | null;
  payrollState: { hasPayroll: boolean; status?: 'pendiente' | 'pagado' };
  isDraft: boolean;
  taskStatus: string;
}

interface LogisticsTaskCardProps {
  tarea: LogisticsTaskCardTask;
  googleCalendarConectado: boolean;
  onAssignPersonal?: (taskId: string, startDate: Date, endDate: Date, itemId?: string) => void;
  onInvitar?: (taskId: string) => void;
  onCancelarInvitacion?: (taskId: string) => void;
  onConectarGoogle?: () => void;
}

/** Texto de estado de invitación: delante del nombre del usuario. */
function invitacionEstadoTexto(invitationStatus: string | null, tieneInvitacionEnviada: boolean): string {
  if (!tieneInvitacionEnviada) return 'Pendiente de invitar';
  if (invitationStatus === 'ACCEPTED' || invitationStatus === 'PAID') return 'Aceptó';
  if (invitationStatus === 'DECLINED') return 'Canceló';
  if (invitationStatus === 'PENDING') return 'Invitado';
  return 'Invitado';
}

function taskStatusLabel(endDate: Date, taskStatus: string): 'Atrasada' | 'En progreso' | 'Finalizada' {
  if (taskStatus === 'COMPLETED') return 'Finalizada';
  const now = new Date();
  if (new Date(endDate) < now) return 'Atrasada';
  return 'En progreso';
}

export function LogisticsTaskCard({
  tarea,
  googleCalendarConectado,
  onAssignPersonal,
  onInvitar,
  onCancelarInvitacion,
  onConectarGoogle,
}: LogisticsTaskCardProps) {
  const fmt = (n: number) => `$${Number(n).toLocaleString('es-MX', { maximumFractionDigits: 0 })}`;
  const totalStr = tarea.budgetAmount != null ? `${fmt(tarea.budgetAmount)} MXN` : null;
  const tieneInvitacionEnviada = tarea.invitationStatus != null;
  const textoInvitacion = invitacionEstadoTexto(tarea.invitationStatus, tieneInvitacionEnviada);
  const mostrarBotonInvitar = googleCalendarConectado && tarea.tienePersonal && onInvitar && !tieneInvitacionEnviada;
  const mostrarBotonCancelar = googleCalendarConectado && tieneInvitacionEnviada && onCancelarInvitacion;

  // Desglose según tipo: HOUR = costo/h × horas; SERVICE/UNIT = costo × cantidad
  const tooltipDesglose = ((): string | null => {
    if (tarea.budgetAmount == null) return null;
    const bt = tarea.billingType ?? 'SERVICE';
    const costo = tarea.costoUnitario ?? 0;
    const q = tarea.quantity ?? 1;
    const horas = tarea.durationHours ?? null;
    if (bt === 'HOUR' && horas != null && horas > 0 && costo > 0) {
      return `${fmt(costo)}/h × ${horas} h`;
    }
    if ((bt === 'SERVICE' || bt === 'UNIT') && costo > 0) {
      return `${fmt(costo)} × ${q}`;
    }
    return `Total ${fmt(tarea.budgetAmount)}`;
  })();

  const pagado = tarea.payrollState?.status === 'pagado';
  const IconPago = pagado ? CheckCircle2 : Clock;
  const colorIconPago = pagado ? 'text-emerald-400' : 'text-amber-400';

  const estatusTarea = taskStatusLabel(tarea.endDate, tarea.taskStatus);
  const estatusTareaColor =
    estatusTarea === 'Finalizada'
      ? 'text-emerald-400'
      : estatusTarea === 'Atrasada'
        ? 'text-red-400'
        : 'text-blue-400';

  const fechaStr = `${format(tarea.startDate, 'd MMM', { locale: es })} – ${format(tarea.endDate, 'd MMM yyyy', { locale: es })}`;

  return (
    <div className="rounded-lg p-3 border border-zinc-700/50 bg-zinc-800/30 hover:border-zinc-600/50 transition-colors">
      {/* Nivel superior: solo nombre de tarea */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-[13px] font-medium text-zinc-200 leading-snug break-words min-w-0 flex-1">
          {tarea.name || tarea.itemName || 'Sin nombre'}
        </h4>
      </div>

      {/* Nivel inferior: [User | Asignar/nombre] [Invitar si conectado] | [icon pago] [monto] | [fechas] */}
      <div className="flex items-center gap-4 flex-wrap text-[11px] text-zinc-500 min-w-0">
        {/* 1. Icon User + Asignar personal o nombre + (solo si conectado) Invitar */}
        <span className="flex items-center gap-1.5 shrink-0 flex-wrap">
          <User className="h-3.5 w-3.5 shrink-0 text-zinc-500" aria-hidden />
          {onAssignPersonal ? (
            <ZenButton
              variant="ghost"
              size="sm"
              className={`h-5 text-[11px] -mx-1 shrink-0 ${
                tarea.tienePersonal ? 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10' : 'text-zinc-500 hover:text-zinc-300'
              }`}
              onClick={() => onAssignPersonal(tarea.id, tarea.startDate, tarea.endDate, tarea.itemId ?? undefined)}
            >
              {tarea.tienePersonal ? (tarea.personalNombre ?? 'Reemplazar') : 'Asignar personal'}
            </ZenButton>
          ) : (
            <span className={tarea.tienePersonal ? 'text-emerald-400' : 'text-zinc-500'}>
              {tarea.tienePersonal ? (tarea.personalNombre ?? '—') : 'Sin asignar'}
            </span>
          )}
          {!googleCalendarConectado && onConectarGoogle ? (
            <ZenButton
              variant="ghost"
              size="sm"
              onClick={onConectarGoogle}
              className="h-5 text-[11px] -mx-1 shrink-0 text-zinc-500 hover:text-zinc-300"
            >
              Conectar
            </ZenButton>
          ) : null}
          {googleCalendarConectado && mostrarBotonInvitar && onInvitar ? (
            <ZenButton variant="secondary" size="sm" onClick={() => onInvitar(tarea.id)} className="h-5 text-[11px] shrink-0">
              Invitar
            </ZenButton>
          ) : googleCalendarConectado && mostrarBotonCancelar && onCancelarInvitacion ? (
            <>
              {tarea.tienePersonal && (
                <span className="text-zinc-500 shrink-0">{textoInvitacion}</span>
              )}
              <ZenButton
                variant="ghost"
                size="sm"
                onClick={() => onCancelarInvitacion(tarea.id)}
                className="h-5 text-[11px] -mx-1 shrink-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                Cancelar
              </ZenButton>
            </>
          ) : googleCalendarConectado && tarea.tienePersonal ? (
            <span className="text-zinc-500 shrink-0">{textoInvitacion}</span>
          ) : null}
        </span>

        <span className="h-4 w-px bg-zinc-700 shrink-0" aria-hidden />

        {/* Icon reloj (pendiente) o ok (pagado) + monto */}
        <span className="flex items-center gap-1.5 shrink-0">
          <IconPago className={`h-3.5 w-3.5 shrink-0 ${colorIconPago}`} aria-hidden />
          {totalStr != null ? (
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <span className="text-zinc-400 cursor-help underline decoration-dotted underline-offset-1">
                  {totalStr}
                </span>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                sideOffset={6}
                className="bg-zinc-800 text-zinc-200 border border-zinc-700 z-[100]"
              >
                {tooltipDesglose ?? totalStr}
              </TooltipContent>
            </Tooltip>
          ) : (
            <span className="text-zinc-400">—</span>
          )}
        </span>

        <span className="h-4 w-px bg-zinc-700 shrink-0" aria-hidden />

        {/* Estatus operativo: Atrasada / En progreso / Finalizada (después de monto) */}
        <span className={`shrink-0 text-[11px] font-medium ${estatusTareaColor}`}>
          {estatusTarea}
        </span>
      </div>

      {/* Fila independiente: rango de fechas */}
      <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 mt-1.5">
        <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {fechaStr}
      </div>
    </div>
  );
}
