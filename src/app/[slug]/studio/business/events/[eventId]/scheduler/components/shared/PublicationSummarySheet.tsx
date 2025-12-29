'use client';

import React, { useState, useEffect } from 'react';
import { Upload, Calendar, User, CheckCircle2, XCircle, Trash2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/shadcn/sheet';
import { Skeleton } from '@/components/ui/shadcn/Skeleton';
import { ZenButton, ZenBadge, ZenCheckbox } from '@/components/ui/zen';
import { obtenerResumenCambiosPendientes, publicarCronograma } from '@/lib/actions/studio/business/events/scheduler-actions';
import { tieneGoogleCalendarHabilitado } from '@/lib/integrations/google/clients/calendar/helpers';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface PublicationSummarySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studioSlug: string;
  eventId: string;
  onPublished?: () => void;
}

function PublicationSheetSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
      {/* Stats Skeleton */}
      <div className="grid grid-cols-4 gap-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-zinc-800/50 rounded-lg p-2 border border-zinc-700">
            <Skeleton className="h-3 w-3/4 mb-0.5" />
            <Skeleton className="h-5 w-1/2" />
          </div>
        ))}
      </div>

      {/* Task List Skeleton */}
      <div className="space-y-4">
        {[...Array(2)].map((_, sectionIndex) => (
          <div key={sectionIndex}>
            <div className="flex items-center gap-2 mb-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <div className="space-y-2">
              {[...Array(3)].map((_, itemIndex) => (
                <div key={itemIndex} className="bg-zinc-800/30 rounded-lg p-3 border border-zinc-700/50">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Skeleton className="h-4 w-3/4 flex-1" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                  <div className="flex flex-col gap-1 text-xs">
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PublicationSummarySheet({
  open,
  onOpenChange,
  studioSlug,
  eventId,
  onPublished,
}: PublicationSummarySheetProps) {
  const [loading, setLoading] = useState(false);
  const [loadingResumen, setLoadingResumen] = useState(true);
  const [googleCalendarConectado, setGoogleCalendarConectado] = useState(false);
  const [enviarInvitaciones, setEnviarInvitaciones] = useState(true);
  const [resumen, setResumen] = useState<{
    total: number;
    conPersonal: number;
    sinPersonal: number;
    yaInvitadas: number;
    eliminadas: number;
    tareas: Array<{
      id: string;
      name: string;
      startDate: Date;
      endDate: Date;
      status: string;
      category: string;
      tienePersonal: boolean;
      personalNombre?: string;
      personalEmail?: string;
      tipoCambio: 'nueva' | 'modificada' | 'eliminada';
      cambioAnterior?: {
        sync_status: string;
        invitation_status?: string | null;
        google_event_id?: string | null;
        personalNombre?: string | null;
      };
      itemId?: string;
      itemName?: string;
    }>;
  } | null>(null);

  useEffect(() => {
    if (open) {
      cargarResumen();
      verificarGoogleCalendar();
    }
  }, [open, studioSlug, eventId]);

  // Resetear checkbox cuando se abre el sheet y hay condiciones para mostrar
  useEffect(() => {
    if (open && googleCalendarConectado && resumen && resumen.conPersonal > 0) {
      setEnviarInvitaciones(true);
    }
  }, [open, googleCalendarConectado, resumen]);

  const cargarResumen = async () => {
    setLoadingResumen(true);
    try {
      const result = await obtenerResumenCambiosPendientes(studioSlug, eventId);
      if (result.success && result.data) {
        setResumen(result.data);
      } else {
        toast.error(result.error || 'Error al cargar resumen');
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error cargando resumen:', error);
      toast.error('Error al cargar resumen de cambios');
      onOpenChange(false);
    } finally {
      setLoadingResumen(false);
    }
  };

  const verificarGoogleCalendar = async () => {
    try {
      const conectado = await tieneGoogleCalendarHabilitado(studioSlug);
      setGoogleCalendarConectado(conectado);
    } catch (error) {
      console.error('Error verificando Google Calendar:', error);
      setGoogleCalendarConectado(false);
    }
  };

  const handlePublicar = async () => {
    setLoading(true);
    try {
      const result = await publicarCronograma(studioSlug, eventId, enviarInvitaciones);

      if (result.success) {
        const total = (result.publicado || 0) + (result.sincronizado || 0);
        if (result.sincronizado && result.sincronizado > 0) {
          toast.success(
            `${result.sincronizado} tarea(s) sincronizada(s) con Google Calendar. ${result.publicado || 0} publicada(s) sin sincronizar.`
          );
        } else {
          toast.success(`${result.publicado || 0} tarea(s) publicada(s) correctamente`);
        }
        onPublished?.();
        onOpenChange(false);
      } else {
        toast.error(result.error || 'Error al publicar cronograma');
      }
    } catch (error) {
      console.error('Error publicando cronograma:', error);
      toast.error('Error al publicar cronograma');
    } finally {
      setLoading(false);
    }
  };


  const mostrarCheckbox = googleCalendarConectado && resumen && resumen.conPersonal > 0;
  const tareasASincronizar = resumen ? resumen.conPersonal : 0;

  // Agrupar tareas por tipo de cambio (solo 3 grupos)
  const tareasAgrupadas = resumen
    ? {
      nuevas: resumen.tareas.filter((t) => t.tipoCambio === 'nueva'),
      modificadas: resumen.tareas.filter((t) => t.tipoCambio === 'modificada'),
      eliminadas: resumen.tareas.filter((t) => t.tipoCambio === 'eliminada'),
    }
    : { nuevas: [], modificadas: [], eliminadas: [] };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg bg-zinc-900 border-zinc-800 p-0"
        overlayStyle={{ zIndex: 50 }}
        style={{ zIndex: 51 }}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <SheetHeader className="px-6 pt-6 pb-4">
            <SheetTitle>Resumen de Cambios Pendientes</SheetTitle>
            <SheetDescription>
              Revisa los cambios antes de publicar el cronograma
            </SheetDescription>
          </SheetHeader>

          {/* Contenido scrollable */}
          {loadingResumen ? (
            <PublicationSheetSkeleton />
          ) : resumen ? (
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
              {/* Stats - Grid de 4 columnas */}
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-zinc-800/50 rounded-lg p-2 border border-zinc-700">
                  <div className="text-xs text-zinc-400 mb-0.5">Total</div>
                  <div className="text-lg font-bold text-white">{resumen.total}</div>
                </div>
                <div className="bg-emerald-950/20 rounded-lg p-2 border border-emerald-800/30">
                  <div className="text-xs text-emerald-400 mb-0.5">Con personal</div>
                  <div className="text-lg font-bold text-emerald-400">{resumen.conPersonal}</div>
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-2 border border-zinc-700">
                  <div className="text-xs text-zinc-400 mb-0.5">Sin personal</div>
                  <div className="text-lg font-bold text-white">{resumen.sinPersonal}</div>
                </div>
                <div className="bg-blue-950/20 rounded-lg p-2 border border-blue-800/30">
                  <div className="text-xs text-blue-400 mb-0.5">Ya invitadas</div>
                  <div className="text-lg font-bold text-blue-400">{resumen.yaInvitadas}</div>
                </div>
              </div>

              {/* Lista de tareas agrupadas */}
              <div className="space-y-4 max-h-[400px] overflow-y-auto">
                {/* Nuevas */}
                {tareasAgrupadas.nuevas.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      <h3 className="text-sm font-semibold text-zinc-300">Nuevas</h3>
                      <ZenBadge variant="outline" size="sm">
                        {tareasAgrupadas.nuevas.length}
                      </ZenBadge>
                    </div>
                    <div className="space-y-2">
                      {tareasAgrupadas.nuevas.map((tarea) => (
                        <div
                          key={tarea.id}
                          className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700 hover:border-zinc-600 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h4 className="font-medium text-white text-sm">{tarea.name}</h4>
                            <ZenBadge variant="outline" size="sm">
                              {tarea.category}
                            </ZenBadge>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-zinc-400">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3 w-3" />
                              {format(tarea.startDate, 'dd MMM', { locale: es })} -{' '}
                              {format(tarea.endDate, 'dd MMM yyyy', { locale: es })}
                            </div>
                            {tarea.tienePersonal && (
                              <div className="flex items-center gap-1.5">
                                <User className="h-3 w-3" />
                                {tarea.personalNombre || 'Personal asignado'}
                              </div>
                            )}
                          </div>
                          {tarea.tienePersonal && googleCalendarConectado && (
                            <p className="text-xs text-emerald-400 mt-2 font-medium">
                              Se enviará invitación
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Modificadas */}
                {tareasAgrupadas.modificadas.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <XCircle className="h-4 w-4 text-amber-400" />
                      <h3 className="text-sm font-semibold text-zinc-300">Modificadas</h3>
                      <ZenBadge variant="outline" size="sm">
                        {tareasAgrupadas.modificadas.length}
                      </ZenBadge>
                    </div>
                    <div className="space-y-2">
                      {tareasAgrupadas.modificadas.map((tarea) => (
                        <div
                          key={tarea.id}
                          className={`rounded-lg p-3 border transition-colors ${tarea.cambioAnterior?.personalNombre || tarea.cambioAnterior?.google_event_id
                            ? 'bg-red-950/20 border-red-800/30 hover:border-red-700/50'
                            : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
                            }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1">
                              <h4 className="font-medium text-white text-sm">{tarea.name}</h4>
                              {tarea.cambioAnterior?.personalNombre && (
                                <p className="text-xs text-red-400 mt-1">
                                  Personal anterior: {tarea.cambioAnterior.personalNombre}
                                </p>
                              )}
                            </div>
                            <ZenBadge variant="outline" size="sm">
                              {tarea.category}
                            </ZenBadge>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-zinc-400">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3 w-3" />
                              {format(tarea.startDate, 'dd MMM', { locale: es })} -{' '}
                              {format(tarea.endDate, 'dd MMM yyyy', { locale: es })}
                            </div>
                            {tarea.tienePersonal && (
                              <div className="flex items-center gap-1.5">
                                <User className="h-3 w-3" />
                                {tarea.personalNombre || 'Personal asignado'}
                              </div>
                            )}
                            {tarea.cambioAnterior?.google_event_id && (
                              <span className="text-amber-400 text-xs">Requiere cancelación en Google Calendar</span>
                            )}
                          </div>
                          {tarea.cambioAnterior?.google_event_id && tarea.cambioAnterior?.personalNombre && (
                            <p className="text-xs text-red-400 mt-2 font-medium">
                              Cancelará la invitación para {tarea.cambioAnterior.personalNombre}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Eliminadas */}
                {tareasAgrupadas.eliminadas.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Trash2 className="h-4 w-4 text-red-500" />
                      <h3 className="text-sm font-semibold text-zinc-300">Tareas eliminadas</h3>
                      <ZenBadge variant="outline" size="sm">
                        {tareasAgrupadas.eliminadas.length}
                      </ZenBadge>
                    </div>
                    <div className="space-y-2">
                      {tareasAgrupadas.eliminadas.map((tarea) => (
                        <div
                          key={tarea.id}
                          className="bg-red-950/20 rounded-lg p-3 border border-red-800/30 hover:border-red-700/50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1">
                              <h4 className="font-medium text-white text-sm line-through">{tarea.name || tarea.itemName}</h4>
                              {tarea.cambioAnterior?.personalNombre && (
                                <p className="text-xs text-red-400 mt-1">
                                  Personal anterior: {tarea.cambioAnterior.personalNombre}
                                </p>
                              )}
                            </div>
                            <ZenBadge variant="destructive" size="sm">
                              Eliminada
                            </ZenBadge>
                          </div>
                          {tarea.cambioAnterior?.google_event_id && (
                            <p className="text-xs text-amber-400 mt-1">
                              Requiere cancelación en Google Calendar
                            </p>
                          )}
                          {tarea.cambioAnterior?.google_event_id && tarea.cambioAnterior?.personalNombre && (
                            <p className="text-xs text-red-400 mt-2 font-medium">
                              Cancelará la invitación para {tarea.cambioAnterior.personalNombre}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-zinc-400">
              No hay cambios pendientes
            </div>
          )}

          {/* Footer */}
          <SheetFooter className="border-t border-zinc-800 px-6 pt-4 pb-6 gap-3 flex-col">
            {mostrarCheckbox && (
              <div className="w-full space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/30 border border-zinc-700/50">
                  <ZenCheckbox
                    checked={enviarInvitaciones}
                    onCheckedChange={(checked) => setEnviarInvitaciones(checked === true)}
                    label="Enviar invitaciones a personal"
                    disabled={loading}
                    className="mt-0.5"
                  />
                </div>
                {enviarInvitaciones && (
                  <div className="space-y-2 p-3 rounded-lg bg-emerald-950/10 border border-emerald-800/20">
                    <div className="flex items-center gap-2">
                      <ZenBadge variant="outline" className="bg-emerald-950/20 border-emerald-800/30 text-emerald-400">
                        {tareasASincronizar} {tareasASincronizar === 1 ? 'tarea se sincronizará' : 'tareas se sincronizarán'} en Google Calendar
                      </ZenBadge>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Solo se invitará a personas que no hayan sido invitadas previamente.
                    </p>
                  </div>
                )}
              </div>
            )}
            <div className="flex items-center gap-2 w-full">
              <ZenButton
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className="shrink-0"
              >
                Cerrar
              </ZenButton>
              <ZenButton
                variant="primary"
                onClick={handlePublicar}
                disabled={loading}
                loading={loading}
                className="gap-2 flex-1"
              >
                <Upload className="h-4 w-4" />
                Publicar cambios
              </ZenButton>
            </div>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}
