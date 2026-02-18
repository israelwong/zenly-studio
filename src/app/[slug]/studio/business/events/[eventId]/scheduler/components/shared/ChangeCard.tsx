'use client';

import React from 'react';
import { Check, X, User } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ZenButton, ZenCheckbox } from '@/components/ui/zen';

export type TipoCambio = 'nueva' | 'modificada' | 'eliminada';

export interface ChangeCardTarea {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  status: string;
  category: string;
  sectionName: string;
  sectionId: string | null;
  categoryId: string | null;
  tienePersonal: boolean;
  personalNombre?: string;
  personalEmail?: string;
  tipoCambio: TipoCambio;
  cambioAnterior?: {
    sync_status: string;
    invitation_status?: string | null;
    google_event_id?: string | null;
    personalNombre?: string | null;
  };
  invitationStatus?: string | null;
  payrollState?: { hasPayroll: boolean; status?: 'pendiente' | 'pagado' };
  itemId?: string;
  itemName?: string;
}

interface ChangeCardProps {
  tarea: ChangeCardTarea;
  tipoGrupo: TipoCambio;
  googleCalendarConectado: boolean;
  showCheckbox?: boolean;
  selected?: boolean;
  onSelect?: (checked: boolean) => void;
  onAprobar?: (taskId: string) => void;
  onDescartar?: (taskId: string) => void;
  onAssignPersonal?: (taskId: string, startDate: Date, endDate: Date, itemId?: string) => void;
}

/** Badge de invitación como elemento principal de decisión: Pendiente, Enviada, Aceptada */
function getInvitationBadge(
  invitationStatus: string | null | undefined,
  cambioAnterior: ChangeCardTarea['cambioAnterior'],
  tienePersonal: boolean,
  googleCalendarConectado: boolean,
  tipoCambio: TipoCambio
): { label: string; variant: 'pending' | 'sent' | 'accepted' | 'declined' | 'action' } {
  if (tipoCambio === 'eliminada' && cambioAnterior?.google_event_id) {
    return { label: 'Cancelar en Google', variant: 'action' };
  }
  if (tipoCambio === 'modificada' && cambioAnterior?.google_event_id) {
    return { label: 'Actualizar invitación', variant: 'action' };
  }
  switch (invitationStatus) {
    case 'ACCEPTED':
      return { label: 'Aceptada', variant: 'accepted' };
    case 'DECLINED':
      return { label: 'Rechazada', variant: 'declined' };
    case 'PAID':
      return { label: 'Pagado', variant: 'accepted' };
    case 'PENDING':
      return { label: 'Enviada', variant: 'sent' };
    default:
      if (tienePersonal && googleCalendarConectado) return { label: 'Pendiente (enviar)', variant: 'pending' };
      return { label: 'Pendiente', variant: 'pending' };
  }
}

export function ChangeCard({
  tarea,
  tipoGrupo,
  googleCalendarConectado,
  showCheckbox,
  selected,
  onSelect,
  onAprobar,
  onDescartar,
  onAssignPersonal,
}: ChangeCardProps) {
  const isEliminada = tipoGrupo === 'eliminada';
  const tieneCambioPersonal =
    tipoGrupo === 'modificada' &&
    tarea.cambioAnterior?.personalNombre &&
    tarea.personalNombre !== tarea.cambioAnterior.personalNombre;

  const invitationBadge = getInvitationBadge(
    tarea.invitationStatus,
    tarea.cambioAnterior,
    tarea.tienePersonal,
    googleCalendarConectado,
    tipoGrupo
  );
  const dateStr = `${format(tarea.startDate, 'dd MMM', { locale: es })} – ${format(tarea.endDate, 'dd MMM yyyy', { locale: es })}`;

  const badgeClass =
    invitationBadge.variant === 'accepted'
      ? 'text-[10px] font-medium px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
      : invitationBadge.variant === 'sent'
        ? 'text-[10px] font-medium px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/40'
        : invitationBadge.variant === 'action'
          ? 'text-[10px] font-medium px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40'
          : invitationBadge.variant === 'declined'
            ? 'text-[10px] font-medium px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/40'
            : 'text-[10px] font-medium px-2 py-0.5 rounded bg-zinc-500/20 text-zinc-400 border border-zinc-500/40';

  const payrollLed =
    !tarea.payrollState?.hasPayroll ? (
      <span className="h-1.5 w-1.5 rounded-full bg-zinc-500 shrink-0" title="Sin pago" />
    ) : tarea.payrollState.status === 'pagado' ? (
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" title="Pagado" />
    ) : (
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" title="Pago pendiente" />
    );

  const cardContent = (
    <div
      className={
        isEliminada
          ? 'rounded-lg p-2.5 border border-zinc-700/50 bg-zinc-800/30'
          : 'rounded-lg p-2.5 border border-zinc-700/50 bg-zinc-800/30 hover:border-zinc-600/50 transition-colors'
      }
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <h4 className={`text-sm font-medium text-zinc-200 truncate ${isEliminada ? 'line-through' : ''}`}>
            {tarea.name || tarea.itemName}
          </h4>
          <span className={badgeClass}>{invitationBadge.label}</span>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {onAprobar && !isEliminada && (
            <ZenButton
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10"
              onClick={() => onAprobar(tarea.id)}
              aria-label="Aprobar: sincronizar con Google y enviar invitación"
            >
              <Check className="h-4 w-4" />
            </ZenButton>
          )}
          {onDescartar && (
            <ZenButton
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
              onClick={() => onDescartar(tarea.id)}
              aria-label="Descartar: revertir cambios para coincidir con Google"
            >
              <X className="h-4 w-4" />
            </ZenButton>
          )}
        </div>
      </div>
      <footer className="mt-1.5 flex items-center gap-2 flex-wrap text-xs text-zinc-500">
        <span className="flex items-center gap-1">{payrollLed}</span>
        <span className="text-zinc-600">·</span>
        <span>{dateStr}</span>
        {(tieneCambioPersonal || tarea.tienePersonal || onAssignPersonal) && (
          <>
            <span className="text-zinc-600">·</span>
            {onAssignPersonal ? (
              <ZenButton
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-zinc-500 hover:text-zinc-300 -mx-1"
                onClick={() => onAssignPersonal(tarea.id, tarea.startDate, tarea.endDate, tarea.itemId)}
              >
                <User className="h-3 w-3 mr-1 shrink-0" />
                {tieneCambioPersonal
                  ? `${tarea.cambioAnterior!.personalNombre} ➔ ${tarea.personalNombre || 'Sin asignar'}`
                  : tarea.tienePersonal && tarea.personalNombre
                    ? tarea.personalNombre
                    : 'Asignar personal'}
              </ZenButton>
            ) : (
              <span>
                {tieneCambioPersonal
                  ? `👤 ${tarea.cambioAnterior!.personalNombre} ➔ ${tarea.personalNombre || 'Sin asignar'}`
                  : tarea.tienePersonal && tarea.personalNombre
                    ? `👤 ${tarea.personalNombre}`
                    : null}
              </span>
            )}
          </>
        )}
      </footer>
    </div>
  );

  if (showCheckbox && onSelect) {
    return (
      <div className="flex items-start gap-2.5">
        <ZenCheckbox
          checked={selected}
          onCheckedChange={(c) => onSelect(c === true)}
          className="mt-2 shrink-0"
          aria-label={`Aprobar: ${tarea.name || tarea.itemName}`}
        />
        <div className="flex-1 min-w-0">{cardContent}</div>
      </div>
    );
  }
  return cardContent;
}
