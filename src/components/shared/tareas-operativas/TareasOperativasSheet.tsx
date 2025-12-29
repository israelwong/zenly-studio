'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CheckSquare2, ExternalLink, Filter, Calendar as CalendarIcon, RefreshCw } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/shadcn/sheet';
import { obtenerTareasOperativas, obtenerContadorTareasPendientes } from '@/lib/actions/studio/business/events/tareas-operativas.actions';
import type { TareaOperativa } from '@/lib/actions/studio/business/events/tareas-operativas.actions';
import { limpiarTareasGoogleSinPersonal, obtenerEstadisticasTareasGoogle } from '@/lib/actions/studio/business/events/limpiar-tareas-google.actions';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/shadcn/Skeleton';
import { ZenButton, ZenBadge } from '@/components/ui/zen';
import { obtenerOCrearCalendarioSecundario } from '@/lib/integrations/google/clients/calendar/calendar-manager';
import { tieneGoogleCalendarHabilitado } from '@/lib/integrations/google/clients/calendar/helpers';
import { obtenerEstadoConexion } from '@/lib/integrations/google';
import { AlertTriangle, Trash2, Settings } from 'lucide-react';

interface TareasOperativasSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studioSlug: string;
}

export function TareasOperativasSheet({
  open,
  onOpenChange,
  studioSlug,
}: TareasOperativasSheetProps) {
  const router = useRouter();
  const [tareas, setTareas] = useState<TareaOperativa[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEventId, setFilterEventId] = useState<string | undefined>(undefined);
  const [googleCalendarUrl, setGoogleCalendarUrl] = useState<string | null>(null);
  const [hasCalendarEnabled, setHasCalendarEnabled] = useState<boolean | null>(null); // null = verificando, true/false = resultado
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [googleName, setGoogleName] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [estadisticas, setEstadisticas] = useState<{
    totalConGoogle: number;
    conPersonal: number;
    sinPersonal: number;
    sinItem: number;
  } | null>(null);
  const [limpiando, setLimpiando] = useState(false);

  const loadTareas = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }
    try {
      const result = await obtenerTareasOperativas(studioSlug, filterEventId);

      if (result.success && result.data) {
        setTareas(result.data);
      } else {
        if (showLoading) {
          toast.error(result.error || 'Error al cargar tareas');
        }
      }
    } catch (error) {
      console.error('Error loading tareas:', error);
      if (showLoading) {
        toast.error('Error al cargar tareas');
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      } else {
        setIsRefreshing(false);
      }
    }
  }, [studioSlug, filterEventId]);

  const loadGoogleCalendarInfo = useCallback(async () => {
    try {
      const enabled = await tieneGoogleCalendarHabilitado(studioSlug);
      setHasCalendarEnabled(enabled);

      // Obtener información de la cuenta conectada
      const connectionStatus = await obtenerEstadoConexion(studioSlug);
      if (connectionStatus.success && connectionStatus.email) {
        setGoogleEmail(connectionStatus.email);
        setGoogleName(connectionStatus.name || null);
      }

      if (enabled) {
        try {
          const calendarId = await obtenerOCrearCalendarioSecundario(studioSlug);
          // URL para abrir el calendario en Google Calendar
          setGoogleCalendarUrl(`https://calendar.google.com/calendar/u/0/r?cid=${encodeURIComponent(calendarId)}`);
        } catch (error) {
          console.error('Error obteniendo calendario:', error);
        }
      }
    } catch (error) {
      console.error('Error verificando Google Calendar:', error);
      // Si hay error, asumir que no está conectado (pero ya verificamos)
      setHasCalendarEnabled(false);
    }
  }, [studioSlug]);

  const loadEstadisticas = useCallback(async () => {
    try {
      const result = await obtenerEstadisticasTareasGoogle(studioSlug);
      if (result.success && result.data) {
        setEstadisticas(result.data);
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  }, [studioSlug]);

  const handleLimpiarTareas = useCallback(async () => {
    if (!confirm('¿Deseas limpiar las tareas que tienen Google Calendar pero ya no tienen personal asignado?')) {
      return;
    }

    setLimpiando(true);
    try {
      const result = await limpiarTareasGoogleSinPersonal(studioSlug);
      if (result.success) {
        toast.success(`Se limpiaron ${result.limpiadas || 0} tareas huérfanas`);
        await loadTareas(false);
        await loadEstadisticas();
      } else {
        toast.error(result.error || 'Error al limpiar tareas');
      }
    } catch (error) {
      console.error('Error limpiando tareas:', error);
      toast.error('Error al limpiar tareas');
    } finally {
      setLimpiando(false);
    }
  }, [studioSlug, loadTareas, loadEstadisticas]);

  // Efecto principal: cargar datos cuando se abre el sheet
  useEffect(() => {
    if (!open) {
      return;
    }

    // Cargar datos iniciales solo cuando se abre el sheet
    setLoading(true);
    loadTareas();
    loadGoogleCalendarInfo();
    loadEstadisticas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Recargar cuando cambia el filtro
  useEffect(() => {
    if (open) {
      loadTareas();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterEventId, open]);

  const handleViewEvent = (eventId: string) => {
    router.push(`/${studioSlug}/studio/business/events/${eventId}`);
    onOpenChange(false);
  };

  const handleViewTask = (eventId: string, taskId: string) => {
    router.push(`/${studioSlug}/studio/business/events/${eventId}/scheduler#task-${taskId}`);
    onOpenChange(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
      case 'IN_PROGRESS':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      case 'PENDING':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      default:
        return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/50';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'MEDIUM':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'LOW':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      default:
        return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/50';
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateTime = (date: Date) => {
    return new Date(date).toLocaleString('es-MX', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateRange = (startDate: Date, endDate: Date) => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Si es el mismo día, mostrar solo una fecha con hora
    if (start.toDateString() === end.toDateString()) {
      return formatDateTime(start);
    }

    // Si es rango, mostrar ambas fechas
    const startStr = formatDate(start);
    const endStr = formatDate(end);
    return `${startStr} - ${endStr}`;
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      PENDING: 'Pendiente',
      IN_PROGRESS: 'En progreso',
      COMPLETED: 'Conformada',
      CANCELLED: 'Cancelada',
    };
    return statusMap[status] || status;
  };

  // Obtener eventos únicos para el filtro
  const eventosUnicos = Array.from(
    new Map(tareas.map((t) => [t.event.id, t.event])).values()
  );

  // Agrupar tareas por evento
  const tareasPorEvento = tareas.reduce((acc, tarea) => {
    const eventId = tarea.event.id;
    if (!acc[eventId]) {
      acc[eventId] = {
        event: tarea.event,
        tareas: [],
      };
    }
    acc[eventId].tareas.push(tarea);
    return acc;
  }, {} as Record<string, { event: TareaOperativa['event']; tareas: TareaOperativa[] }>);

  const gruposEventos = Object.values(tareasPorEvento);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl bg-zinc-900 border-l border-zinc-800 overflow-y-auto p-0"
      >
        <div className="p-0">
          <SheetHeader className="border-b border-zinc-800 pb-4 px-5 pt-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="p-2 bg-purple-600/20 rounded-lg shrink-0">
                  <CheckSquare2 className="h-4 w-4 text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <SheetTitle className="text-lg font-semibold text-white">
                      Tareas Operativas
                    </SheetTitle>
                    {googleEmail && (
                      <ZenBadge variant="success" size="sm" className="shrink-0">
                        Activo
                      </ZenBadge>
                    )}
                  </div>
                  {googleEmail ? (
                    <SheetDescription className="text-xs text-zinc-400">
                      Sincronizando con{' '}
                      <span className="text-zinc-300 font-medium break-all">{googleEmail}</span>
                    </SheetDescription>
                  ) : (
                    <SheetDescription className="text-xs text-zinc-400">
                      Tareas sincronizadas con Google Calendar
                    </SheetDescription>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <ZenButton
                  variant="ghost"
                  size="sm"
                  onClick={() => loadTareas(false)}
                  disabled={isRefreshing}
                  className="h-8 w-8 p-0 border-0"
                  title="Actualizar"
                >
                  <RefreshCw className={`h-4 w-4 text-zinc-400 ${isRefreshing ? 'animate-spin' : ''}`} />
                </ZenButton>
                {googleCalendarUrl && (
                  <ZenButton
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(googleCalendarUrl, '_blank')}
                    className="h-8 px-3 text-xs text-purple-400 hover:text-purple-300 border-0"
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                    Abrir en Google
                  </ZenButton>
                )}
              </div>
            </div>
          </SheetHeader>

          <div className="p-5 space-y-4">
            {/* Filtros */}
            {eventosUnicos.length > 0 && (
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-zinc-400" />
                <select
                  value={filterEventId || ''}
                  onChange={(e) => setFilterEventId(e.target.value || undefined)}
                  className="flex-1 px-3 py-2 text-sm bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                >
                  <option value="">Todos los eventos</option>
                  {eventosUnicos.map((evento) => (
                    <option key={evento.id} value={evento.id}>
                      {evento.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Estado de conexión - Solo mostrar si se verificó y NO está conectado */}
            {hasCalendarEnabled === false && (
              <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-3">
                <p className="text-sm text-yellow-400">
                  Google Calendar no está conectado. Ve a{' '}
                  <button
                    onClick={() => {
                      onOpenChange(false);
                      router.push(`/${studioSlug}/studio/config/integraciones`);
                    }}
                    className="underline hover:text-yellow-300"
                  >
                    Configuración → Integraciones
                  </button>{' '}
                  para activarlo.
                </p>
              </div>
            )}

            {/* Estadísticas y limpieza */}
            {estadisticas && (estadisticas.sinPersonal > 0 || estadisticas.sinItem > 0) && (
              <div className="bg-amber-500/10 border border-amber-500/50 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-amber-400 font-medium mb-1">
                      Tareas huérfanas detectadas
                    </p>
                    <div className="text-xs text-amber-400/80 space-y-1">
                      {estadisticas.sinPersonal > 0 && (
                        <p>• {estadisticas.sinPersonal} tarea(s) sin personal asignado</p>
                      )}
                      {estadisticas.sinItem > 0 && (
                        <p>• {estadisticas.sinItem} tarea(s) sin item asociado</p>
                      )}
                    </div>
                    <ZenButton
                      variant="outline"
                      size="sm"
                      onClick={handleLimpiarTareas}
                      disabled={limpiando}
                      loading={limpiando}
                      className="mt-2 gap-2 text-amber-400 border-amber-500/50 hover:bg-amber-500/20"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Limpiar tareas huérfanas
                    </ZenButton>
                  </div>
                </div>
              </div>
            )}

            {/* Lista de tareas */}
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full bg-zinc-800" />
                ))}
              </div>
            ) : tareas.length === 0 ? (
              <div className="text-center py-12">
                <CheckSquare2 className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
                <p className="text-zinc-400 mb-2">No hay tareas asignadas al personal</p>
                <p className="text-sm text-zinc-500">
                  Las tareas aparecerán aquí cuando sean asignadas. Se sincronizarán automáticamente con Google Calendar
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {gruposEventos.map((grupo) => (
                  <div key={grupo.event.id} className="space-y-3">
                    {/* Encabezado del evento */}
                    <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
                      <h3 className="text-sm font-semibold text-zinc-200">
                        {grupo.event.name}
                      </h3>
                      <ZenBadge variant="secondary" size="sm" className="text-xs">
                        {grupo.tareas.length} {grupo.tareas.length === 1 ? 'tarea' : 'tareas'}
                      </ZenBadge>
                    </div>

                    {/* Tareas del evento */}
                    <div className="space-y-2 pl-2">
                      {grupo.tareas.map((tarea) => (
                        <div
                          key={tarea.id}
                          className="bg-zinc-800/30 border border-zinc-700/50 rounded-md p-3 hover:border-zinc-600 hover:bg-zinc-800/50 transition-colors cursor-pointer"
                          onClick={() => handleViewTask(tarea.event.id, tarea.id)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1.5">
                                <h4 className="text-sm font-medium text-zinc-200 truncate">
                                  {tarea.name}
                                </h4>
                                <ZenBadge
                                  variant="secondary"
                                  size="sm"
                                  className={`text-xs border shrink-0 ${getStatusColor(tarea.status)}`}
                                >
                                  {getStatusLabel(tarea.status)}
                                </ZenBadge>
                              </div>

                              <div className="flex items-center gap-3 text-xs text-zinc-400">
                                {tarea.cotizacion_item?.assigned_to_crew_member && (
                                  <span>
                                    Asignada a{' '}
                                    <span className="text-zinc-300 font-medium">
                                      {tarea.cotizacion_item.assigned_to_crew_member.name}
                                    </span>
                                  </span>
                                )}
                                <span className="text-zinc-600">•</span>
                                <div className="flex items-center gap-1">
                                  <CalendarIcon className="h-3 w-3" />
                                  <span>
                                    {new Date(tarea.start_date).toDateString() === new Date(tarea.end_date).toDateString()
                                      ? formatDateTime(new Date(tarea.start_date))
                                      : formatDateRange(new Date(tarea.start_date), new Date(tarea.end_date))}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {tarea.google_event_id && (
                              <ZenButton
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (tarea.google_calendar_id && tarea.google_event_id) {
                                    window.open(
                                      `https://calendar.google.com/calendar/u/0/r/eventedit/${tarea.google_event_id}`,
                                      '_blank'
                                    );
                                  }
                                }}
                              >
                                <ExternalLink className="h-3.5 w-3.5 text-purple-400" />
                              </ZenButton>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

