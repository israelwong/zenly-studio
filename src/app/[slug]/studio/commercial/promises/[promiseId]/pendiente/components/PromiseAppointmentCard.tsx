'use client';

import React, { useState, useEffect, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, MapPin, Video, CalendarClock, Trash2 } from 'lucide-react';
import { ZenCard, ZenCardHeader, ZenCardTitle, ZenCardContent, ZenButton, ZenInput, ZenSelect } from '@/components/ui/zen';
import { AgendaSubjectInput } from '@/components/shared/agenda';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover';
import { ZenCalendar } from '@/components/ui/zen';
import {
  obtenerAgendamientoPorPromise,
  crearAgendamiento,
  actualizarAgendamiento,
  eliminarAgendamiento,
} from '@/lib/actions/shared/agenda-unified.actions';
import type { AgendaItem } from '@/lib/actions/shared/agenda-unified.actions';
import { formatDisplayDate, formatDisplayDateLong } from '@/lib/utils/date-formatter';
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
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState('');
  const [typeScheduling, setTypeScheduling] = useState<'presencial' | 'virtual'>('presencial');
  const [concept, setConcept] = useState('');
  const [linkMeetingUrl, setLinkMeetingUrl] = useState('');
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
      setLinkMeetingUrl(agendamiento.location_url ?? agendamiento.link_meeting_url ?? '');
    } else if (!agendamiento) {
      setDate(undefined);
      setTime('');
      setTypeScheduling('presencial');
      setConcept('');
      setLinkMeetingUrl('');
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
        ...(typeScheduling === 'virtual' && linkMeetingUrl.trim()
          ? { link_meeting_url: linkMeetingUrl.trim(), location_url: linkMeetingUrl.trim() }
          : {}),
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
          setIsFormVisible(false);
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
        setIsFormVisible(false);
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
      <ZenCard variant="outlined" className="border-zinc-800 bg-zinc-900/50 transition-all duration-200">
        <ZenCardHeader className="border-b border-zinc-800 py-2 px-3 shrink-0">
          <div className="h-4 w-36 bg-zinc-800 rounded animate-pulse" />
        </ZenCardHeader>
        <ZenCardContent className="p-2">
          <div className="h-9 w-full bg-zinc-800/50 rounded animate-pulse" />
        </ZenCardContent>
      </ZenCard>
    );
  }

  // Estado vacío compacto (mismo diseño que recordatorio)
  if (!hasAgenda && !editMode && !isFormVisible) {
    return (
      <ZenCard variant="outlined" className="border border-dashed border-zinc-700/80 bg-zinc-900/30 transition-all duration-200 hover:border-zinc-600/60">
        <ZenCardContent className="px-4 py-3 flex flex-row items-center justify-between gap-3 min-h-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-zinc-800/80">
              <CalendarClock className="h-4 w-4 text-zinc-500" aria-hidden />
            </div>
            <p className="text-xs text-zinc-400 truncate">Agendar cita</p>
          </div>
          <ZenButton
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 w-9 shrink-0 p-0 text-zinc-400 hover:bg-emerald-500/10 hover:text-emerald-400"
            onClick={() => setIsFormVisible(true)}
            title="Crear agendamiento"
            aria-label="Crear agendamiento"
          >
            <span className="text-lg font-light leading-none">+</span>
          </ZenButton>
        </ZenCardContent>
      </ZenCard>
    );
  }

  // Resumen: cita activa (mismo patrón que recordatorio activo)
  if (hasAgenda && !editMode) {
    return (
      <ZenCard variant="outlined" className="border-zinc-800 bg-zinc-900/50 transition-all duration-200">
        <ZenCardHeader className="border-b border-zinc-800 py-2 px-3 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <ZenCardTitle className="text-sm font-medium">Cita comercial</ZenCardTitle>
            {!isDisabled && (
              <div className="flex items-center gap-1 shrink-0">
                <ZenButton
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-zinc-400 hover:text-zinc-200"
                  onClick={() => setEditMode(true)}
                  title="Reprogramar"
                >
                  Reprogramar
                </ZenButton>
                <ZenButton
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10"
                  onClick={handleCancelarCita}
                  disabled={submitting}
                  loading={submitting}
                  title="Cancelar cita"
                  aria-label="Cancelar cita"
                >
                  <Trash2 className="h-4 w-4" />
                </ZenButton>
              </div>
            )}
          </div>
        </ZenCardHeader>
        <ZenCardContent className="p-3">
          {agendamiento?.concept && (
            <p className="text-xs text-zinc-400 truncate" title={agendamiento.concept}>
              {agendamiento.concept}
            </p>
          )}
          <div className="flex items-center gap-2 text-xs mt-1">
            {tipoPresencial ? (
              <MapPin className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
            ) : (
              <Video className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
            )}
            <span className="text-zinc-400 truncate">
              {tipoPresencial ? 'Presencial' : 'Virtual'}
              {agendamiento?.time ? ` · ${agendamiento.time}` : ''}
            </span>
          </div>
          <p className="text-xs font-medium text-emerald-400/90 mt-1">
            {agendamiento?.date && formatDisplayDateLong(agendamiento.date)}
          </p>
        </ZenCardContent>
      </ZenCard>
    );
  }

  // Formulario (crear o editar)
  return (
    <ZenCard variant="outlined" className="border-zinc-800 bg-zinc-900/50 transition-all duration-200">
      <ZenCardHeader className="border-b border-zinc-800 py-2 px-3 shrink-0">
        <ZenCardTitle className="text-sm font-medium">Cita comercial</ZenCardTitle>
      </ZenCardHeader>
      <ZenCardContent className="p-2.5 space-y-2">
          <form onSubmit={handleSubmit} className="space-y-2 text-sm">
            <AgendaSubjectInput
              context="COMMERCIAL"
              studioSlug={studioSlug}
              value={concept}
              onChange={setConcept}
              label="Asunto"
              placeholder="Nombre o descripción"
            />
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
            {typeScheduling === 'virtual' && (
              <div className="space-y-0.5">
                <label className="text-xs text-zinc-500 flex items-center gap-1">
                  <Video className="h-3 w-3" />
                  Link de reunión virtual
                </label>
                <ZenInput
                  type="url"
                  value={linkMeetingUrl}
                  onChange={(e) => setLinkMeetingUrl(e.target.value)}
                  placeholder="https://meet.google.com/... o https://zoom.us/..."
                  className="h-8 text-xs border-zinc-700 bg-zinc-900"
                />
              </div>
            )}
            <div className="flex gap-2 pt-3">
              <ZenButton
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => editMode ? setEditMode(false) : setIsFormVisible(false)}
                disabled={submitting}
                className="h-7 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              >
                {editMode ? 'Cerrar' : 'Cancelar'}
              </ZenButton>
              <ZenButton
                type="submit"
                variant="primary"
                size="sm"
                disabled={submitting || !date || isDisabled}
                loading={submitting}
                className="flex-1 h-7 text-xs"
              >
                {hasAgenda && editMode ? 'Actualizar' : 'Agendar cita'}
              </ZenButton>
            </div>
          </form>
      </ZenCardContent>
    </ZenCard>
  );
}
