'use client';

import React, { useState, useEffect, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, MapPin, Video, CalendarClock, Trash2 } from 'lucide-react';
import { ZenCard, ZenCardHeader, ZenCardTitle, ZenCardContent, ZenButton, ZenInput, ZenSelect } from '@/components/ui/zen';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover';
import { ZenCalendar } from '@/components/ui/zen';
import {
  obtenerAgendamientoPorPromise,
  crearAgendamiento,
  actualizarAgendamiento,
  eliminarAgendamiento,
} from '@/lib/actions/shared/agenda-unified.actions';
import type { AgendaItem } from '@/lib/actions/shared/agenda-unified.actions';
import { formatDisplayDate } from '@/lib/utils/date-formatter';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const HORAS: { value: string; label: string }[] = [];
for (let h = 8; h <= 20; h++) {
  HORAS.push({ value: `${String(h).padStart(2, '0')}:00`, label: `${h}:00` });
  if (h < 20) HORAS.push({ value: `${String(h).padStart(2, '0')}:30`, label: `${h}:30` });
}

interface PromiseAppointmentCardProps {
  studioSlug: string;
  promiseId: string;
  eventoId?: string | null;
  /** Datos iniciales del servidor. Si está definido (null o item), no se hace fetch en mount ni skeleton. */
  initialAgendamiento?: AgendaItem | null;
}

export function PromiseAppointmentCard({
  studioSlug,
  promiseId,
  eventoId,
  initialAgendamiento: initialAgendamientoProp,
}: PromiseAppointmentCardProps) {
  const router = useRouter();
  const hasInitial = initialAgendamientoProp !== undefined;
  const [agendamiento, setAgendamiento] = useState<AgendaItem | null>(hasInitial ? (initialAgendamientoProp ?? null) : null);
  const [loading, setLoading] = useState(!hasInitial);
  const [submitting, setSubmitting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState('');
  const [typeScheduling, setTypeScheduling] = useState<'presencial' | 'virtual'>('presencial');
  const [concept, setConcept] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const loadAgendamiento = async () => {
    setLoading(true);
    try {
      const result = await obtenerAgendamientoPorPromise(studioSlug, promiseId);
      if (result.success) setAgendamiento(result.data || null);
    } catch (error) {
      console.error('[PromiseAppointmentCard] Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasInitial) return;
    loadAgendamiento();
  }, [studioSlug, promiseId, hasInitial]);

  useEffect(() => {
    const handler = () => loadAgendamiento();
    window.addEventListener('agenda-updated', handler);
    return () => window.removeEventListener('agenda-updated', handler);
  }, [studioSlug, promiseId]);

  useEffect(() => {
    if (agendamiento && editMode) {
      const d = agendamiento.date instanceof Date ? agendamiento.date : new Date(agendamiento.date);
      setDate(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0)));
      setTime(agendamiento.time || '');
      setTypeScheduling((agendamiento.type_scheduling as 'presencial' | 'virtual') || 'presencial');
      setConcept(agendamiento.concept || agendamiento.description || '');
    } else if (!agendamiento) {
      setDate(undefined);
      setTime('');
      setTypeScheduling('presencial');
      setConcept('');
      setEditMode(false);
    }
  }, [agendamiento, editMode]);

  const isDisabled = !!eventoId;
  // Solo considerar cita "activa" (no cancelada) para bloquear formulario y mostrar resumen
  const hasAgenda = !!agendamiento && agendamiento.status !== 'cancelado';
  const tipoPresencial = agendamiento?.type_scheduling === 'presencial';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!date) newErrors.date = 'Fecha requerida';
    if (!typeScheduling) newErrors.type = 'Tipo requerido';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const payload = {
        contexto: 'promise' as const,
        promise_id: promiseId,
        date: date!,
        time: time || undefined,
        concept: concept.trim() || (typeScheduling === 'presencial' ? 'Cita presencial' : 'Cita virtual'),
        description: concept.trim() || undefined,
        type_scheduling: typeScheduling,
      };
      if (hasAgenda && agendamiento?.id && editMode) {
        const result = await actualizarAgendamiento(studioSlug, {
          id: agendamiento.id,
          ...payload,
        });
        if (result.success) {
          setAgendamiento(result.data || null);
          setEditMode(false);
          toast.success('Cita actualizada');
          window.dispatchEvent(new CustomEvent('agenda-updated'));
          startTransition(() => router.refresh());
        } else {
          toast.error(result.error || 'Error al actualizar');
        }
      } else {
        const result = await crearAgendamiento(studioSlug, payload);
        if (result.success) {
          setAgendamiento(result.data || null);
          toast.success('Cita agendada');
          window.dispatchEvent(new CustomEvent('agenda-updated'));
          startTransition(() => router.refresh());
        } else {
          toast.error(result.error || 'Error al crear');
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelarCita = async () => {
    if (!agendamiento?.id) return;
    setSubmitting(true);
    try {
      const result = await eliminarAgendamiento(studioSlug, agendamiento.id);
      if (result.success) {
        setAgendamiento(null);
        toast.success('Cita cancelada');
        window.dispatchEvent(new CustomEvent('agenda-updated'));
        startTransition(() => router.refresh());
      } else {
        toast.error(result.error || 'Error al cancelar');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error al cancelar');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <ZenCard variant="outlined" className="border-zinc-800">
        <ZenCardHeader className="border-b border-zinc-800 py-2 px-3 flex-shrink-0">
          <div className="h-4 w-36 bg-zinc-800 rounded animate-pulse" />
        </ZenCardHeader>
        <ZenCardContent className="p-2">
          <div className="h-9 w-full bg-zinc-800/50 rounded animate-pulse" />
        </ZenCardContent>
      </ZenCard>
    );
  }

  return (
    <ZenCard variant="outlined" className="border-zinc-800">
      <ZenCardHeader className="border-b border-zinc-800 py-2 px-3 flex-shrink-0">
        <ZenCardTitle className="text-sm font-medium text-zinc-300">
          Cita comercial
        </ZenCardTitle>
      </ZenCardHeader>
      <ZenCardContent className="p-2.5 space-y-2">
        {hasAgenda && !editMode ? (
          <>
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              {tipoPresencial ? (
                <MapPin className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
              ) : (
                <Video className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
              )}
              <span className="truncate">
                {tipoPresencial ? 'Presencial' : 'Virtual'} · {formatDisplayDate(agendamiento.date)}
                {agendamiento.time ? ` · ${agendamiento.time}` : ''}
              </span>
            </div>
            {agendamiento.concept && (
              <p className="text-xs text-zinc-500 truncate">{agendamiento.concept}</p>
            )}
            {!isDisabled && (
              <div className="flex gap-1.5 pt-0.5">
                <ZenButton
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditMode(true)}
                  disabled={submitting}
                  className="flex-1 gap-1 h-7 text-xs border-zinc-700 text-zinc-300"
                  title="Cambiar fecha, hora o tipo de cita"
                >
                  <CalendarClock className="h-3 w-3 shrink-0" />
                  Reprogramar
                </ZenButton>
                <ZenButton
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCancelarCita}
                  disabled={submitting}
                  className="gap-1 h-7 text-xs border-red-900/50 text-red-400 hover:bg-red-950/30"
                >
                  <Trash2 className="h-3 w-3 shrink-0" />
                  Cancelar cita
                </ZenButton>
              </div>
            )}
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-0.5">
                <label className="text-xs text-zinc-500">Fecha</label>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <ZenButton
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full justify-start h-8 text-xs border-zinc-700"
                    >
                      <Calendar className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                      {date
                        ? new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
                        : 'Elegir'}
                    </ZenButton>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-zinc-900 border-zinc-700" align="start" sideOffset={4}>
                    <ZenCalendar
                      mode="single"
                      selected={date}
                      onSelect={(d) => {
                        if (d) {
                          setDate(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0)));
                          setCalendarOpen(false);
                        }
                      }}
                      locale={es}
                    />
                  </PopoverContent>
                </Popover>
                {errors.date && <p className="text-[10px] text-red-400">{errors.date}</p>}
              </div>
              <div className="space-y-0.5">
                <label className="text-xs text-zinc-500">Hora</label>
                <ZenSelect
                  value={time}
                  onValueChange={setTime}
                  options={HORAS}
                  placeholder="Hora"
                  className="h-8 text-xs"
                  disableSearch
                />
              </div>
            </div>
            <div className="space-y-0.5">
              <label className="text-xs text-zinc-500">Tipo</label>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setTypeScheduling('presencial')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1 h-8 rounded border text-xs',
                    typeScheduling === 'presencial'
                      ? 'bg-emerald-600/20 border-emerald-600 text-emerald-400'
                      : 'border-zinc-700 text-zinc-400 hover:bg-zinc-800'
                  )}
                >
                  <MapPin className="h-3.5 w-3.5" /> Presencial
                </button>
                <button
                  type="button"
                  onClick={() => setTypeScheduling('virtual')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1 h-8 rounded border text-xs',
                    typeScheduling === 'virtual'
                      ? 'bg-emerald-600/20 border-emerald-600 text-emerald-400'
                      : 'border-zinc-700 text-zinc-400 hover:bg-zinc-800'
                  )}
                >
                  <Video className="h-3.5 w-3.5" /> Virtual
                </button>
              </div>
            </div>
            <div className="space-y-0.5">
              <label className="text-xs text-zinc-500">Asunto</label>
              <ZenInput
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
                placeholder="Nombre o descripción"
                className="h-8 text-xs border-zinc-700 bg-zinc-900"
              />
            </div>
            <div className="flex gap-1.5 pt-0.5">
              {editMode && (
                <ZenButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditMode(false)}
                  disabled={submitting}
                  className="h-7 text-xs"
                >
                  Cerrar
                </ZenButton>
              )}
              <ZenButton
                type="submit"
                variant="primary"
                size="sm"
                disabled={submitting || !date || isDisabled}
                loading={submitting}
                className={cn('h-7 text-xs', editMode ? 'flex-1' : 'w-full')}
              >
                {hasAgenda && editMode ? 'Actualizar' : 'Crear agendamiento'}
              </ZenButton>
            </div>
          </form>
        )}
      </ZenCardContent>
    </ZenCard>
  );
}
