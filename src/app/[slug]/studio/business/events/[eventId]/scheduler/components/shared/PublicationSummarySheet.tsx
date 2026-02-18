'use client';

import React, { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/shadcn/sheet';
import { Skeleton } from '@/components/ui/shadcn/Skeleton';
import { ZenButton } from '@/components/ui/zen';
import {
  obtenerEstructuraCompletaLogistica,
  asignarCrewATareaScheduler,
  invitarPendientesEvento,
  invitarTareaEvento,
} from '@/lib/actions/studio/business/events/scheduler-actions';
import { asignarCrewAItem } from '@/lib/actions/studio/business/events';
import { tieneGoogleCalendarHabilitado } from '@/lib/integrations/google/clients/calendar/helpers';
import { toast } from 'sonner';
import { LogisticsTaskCard } from './LogisticsTaskCard';
import { GoogleBundleModal } from '@/components/shared/integrations/GoogleBundleModal';

const STAGE_BORDER: Record<string, string> = {
  PLANNING: 'border-l-blue-500',
  PRODUCTION: 'border-l-purple-500',
  POST_PRODUCTION: 'border-l-amber-500',
  DELIVERY: 'border-l-emerald-500',
};
import { SelectCrewModal } from '../crew-assignment/SelectCrewModal';

interface PublicationSummarySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studioSlug: string;
  eventId: string;
  onPublished?: () => void;
  /** Orden canónico de IDs de sección (mismo que Scheduler). */
  sectionOrder?: string[];
  /** Orden de categorías por stage (JSONB). */
  catalogCategoryOrderByStage?: Record<string, string[]> | null;
}

function PublicationSheetSkeleton() {
  return (
    <div className="flex-1 flex flex-col min-h-0 px-6 py-4 gap-4">
      <div className="flex-1 min-h-0 overflow-y-auto space-y-5">
        {[1, 2].map((sectionIdx) => (
          <div key={sectionIdx} className="space-y-3">
            <div className="border-b border-zinc-800 pb-1">
              <Skeleton className="h-3 w-32 rounded" />
            </div>
            {[1, 2].map((catIdx) => (
              <div key={catIdx} className="space-y-2">
                <div className="pl-0.5">
                  <Skeleton className="h-3 w-24 rounded" />
                </div>
                <div className="border-l-4 border-l-zinc-600 pl-2.5 space-y-2">
                  {[1, 2, 3].map((cardIdx) => (
                    <div
                      key={cardIdx}
                      className="rounded-lg p-2.5 border border-zinc-700/50 bg-zinc-800/30"
                    >
                      <Skeleton className="h-4 w-[85%] rounded mb-1.5" />
                      <div className="flex items-center gap-2 flex-wrap">
                        <Skeleton className="h-3 w-20 rounded" />
                        <Skeleton className="h-3 w-3 rounded shrink-0" />
                        <Skeleton className="h-3 w-24 rounded" />
                        <Skeleton className="h-3 w-3 rounded shrink-0" />
                        <Skeleton className="h-5 w-14 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
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
  sectionOrder,
  catalogCategoryOrderByStage,
}: PublicationSummarySheetProps) {
  const [loading, setLoading] = useState(false);
  const [loadingEstructura, setLoadingEstructura] = useState(true);
  const [googleCalendarConectado, setGoogleCalendarConectado] = useState(false);
  const [showGoogleBundleModal, setShowGoogleBundleModal] = useState(false);
  const [assignCrewForTask, setAssignCrewForTask] = useState<{ taskId: string; itemId?: string; startDate: Date; endDate: Date } | null>(null);
  const [estructura, setEstructura] = useState<{
    secciones: Array<{
      sectionId: string;
      sectionName: string;
      order: number;
      categorias: Array<{
        categoryId: string;
        stageKey: string;
        categoryLabel: string;
        tareas: Array<{
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
        }>;
      }>;
    }>;
  } | null>(null);

  useEffect(() => {
    if (open) {
      cargarEstructura();
      verificarGoogleCalendar();
    }
  }, [open, studioSlug, eventId]);

  const cargarEstructura = async () => {
    setLoadingEstructura(true);
    try {
      const result = await obtenerEstructuraCompletaLogistica(
        studioSlug,
        eventId,
        sectionOrder ?? undefined,
        catalogCategoryOrderByStage ?? null
      );
      if (result.success && result.data) {
        setEstructura(result.data);
      } else {
        toast.error(result.error || 'Error al cargar estructura');
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error cargando estructura:', error);
      toast.error('Error al cargar panel');
      onOpenChange(false);
    } finally {
      setLoadingEstructura(false);
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

  const handleInvitarPendientes = async () => {
    setLoading(true);
    try {
      const result = await invitarPendientesEvento(studioSlug, eventId);
      if (result.success) {
        const { invitadas = 0, failedTasks = [] } = result;
        if (failedTasks.length > 0) {
          toast.warning(`${invitadas} invitación(es) enviada(s). ${failedTasks.length} fallaron.`);
        } else if (invitadas > 0) {
          toast.success(`${invitadas} invitación(es) enviada(s) a Google Calendar.`);
        } else {
          toast.info('No hay tareas pendientes de invitar (todas tienen personal asignado e invitación enviada o no aplican).');
        }
        await cargarEstructura();
        onPublished?.();
      } else {
        toast.error(result.error ?? 'Error al invitar pendientes');
      }
    } catch (error) {
      console.error('Error invitando pendientes:', error);
      toast.error('Error al enviar invitaciones');
    } finally {
      setLoading(false);
    }
  };

  const handleInvitarTarea = async (taskId: string) => {
    setLoading(true);
    try {
      const result = await invitarTareaEvento(studioSlug, eventId, taskId);
      if (result.success) {
        toast.success('Invitación enviada');
        await cargarEstructura();
        onPublished?.();
      } else {
        toast.error(result.error ?? 'Error al invitar');
      }
    } catch (error) {
      console.error('Error invitando:', error);
      toast.error('Error al enviar invitación');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelarInvitacion = (_taskId: string) => {
    toast.info('Cancelar invitación próximamente');
  };

  const handleAssignCrewSelect = async (crewMemberId: string | null) => {
    if (!assignCrewForTask) return;
    setLoading(true);
    try {
      const result = assignCrewForTask.itemId
        ? await asignarCrewAItem(studioSlug, assignCrewForTask.itemId, crewMemberId)
        : await asignarCrewATareaScheduler(studioSlug, eventId, assignCrewForTask.taskId, crewMemberId);
      setAssignCrewForTask(null);
      if (result.success) {
        if (result.googleSyncFailed) toast.warning('Personal asignado; revisa sincronización con Google.');
        else toast.success('Personal asignado');
        await cargarEstructura();
        onPublished?.();
      } else {
        toast.error(result.error ?? 'Error al asignar');
      }
    } catch (error) {
      console.error('Error asignando personal:', error);
      toast.error('Error al asignar personal');
      setAssignCrewForTask(null);
    } finally {
      setLoading(false);
    }
  };


  const hayPendientesInvitar = estructura?.secciones?.some((s) =>
    s.categorias.some((c) =>
      c.tareas.some((t) => t.tienePersonal && t.invitationStatus === null)
    )
  ) ?? false;

  const { costoTotal, totalPagado, totalPendiente } = (() => {
    let costo = 0;
    let pagado = 0;
    let pendiente = 0;
    estructura?.secciones?.forEach((s) =>
      s.categorias.forEach((c) =>
        c.tareas.forEach((t) => {
          const monto = t.budgetAmount ?? 0;
          costo += monto;
          if (t.payrollState?.hasPayroll) {
            if (t.payrollState.status === 'pagado') pagado += monto;
            else pendiente += monto;
          }
        })
      )
    );
    return { costoTotal: costo, totalPagado: pagado, totalPendiente: pendiente };
  })();

  const fmt = (n: number) => `$${Number(n).toLocaleString('es-MX', { maximumFractionDigits: 0 })}`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg bg-zinc-900 border-zinc-800 p-0"
        overlayStyle={{ zIndex: 50 }}
        style={{ zIndex: 51 }}
      >
        <div className="flex flex-col h-full">
          <SheetHeader className="px-4 pt-4 pb-2 border-b border-zinc-800/80">
            <SheetTitle className="text-base">Panel de Gestión Logística</SheetTitle>
            <SheetDescription className="text-xs">
              Invitaciones y revisión
            </SheetDescription>
          </SheetHeader>

          {!googleCalendarConectado && (
            <div className="px-4 py-2 flex items-center justify-between gap-2 bg-amber-500/10 border-b border-amber-500/20">
              <span className="text-xs text-amber-200">Google Calendar está desconectado.</span>
              <ZenButton
                variant="secondary"
                size="sm"
                onClick={() => setShowGoogleBundleModal(true)}
                className="shrink-0 text-xs"
              >
                Conectar ahora
              </ZenButton>
            </div>
          )}

          {loadingEstructura ? (
            <PublicationSheetSkeleton />
          ) : estructura ? (
            <div className="flex-1 flex flex-col min-h-0 px-6 py-4 gap-4">
              <div className="flex-1 min-h-0 overflow-y-auto space-y-5">
                {estructura.secciones.map((seccion) => (
                  <div key={seccion.sectionId} className="space-y-3">
                    <h2 className="text-sm font-semibold text-white uppercase tracking-[0.15em] border-b border-zinc-800 pb-1">
                      {seccion.sectionName}
                    </h2>
                    {seccion.categorias.map((cat) => {
                      const stageBorder = STAGE_BORDER[cat.stageKey] ?? 'border-l-zinc-600';
                      return (
                        <div key={cat.categoryId} className="space-y-2">
                          <h3 className="text-xs font-medium text-zinc-300 uppercase tracking-wider pl-0.5">
                            {cat.categoryLabel}
                          </h3>
                          <div className={`border-l-4 pl-2.5 ${stageBorder} space-y-2`}>
                            {cat.tareas.map((tarea) => (
                              <LogisticsTaskCard
                                key={tarea.id}
                                tarea={tarea}
                                googleCalendarConectado={googleCalendarConectado}
                                onAssignPersonal={() =>
                                  setAssignCrewForTask({
                                    taskId: tarea.id,
                                    itemId: tarea.itemId ?? undefined,
                                    startDate: tarea.startDate,
                                    endDate: tarea.endDate,
                                  })
                                }
                                onInvitar={googleCalendarConectado ? handleInvitarTarea : undefined}
                                onCancelarInvitacion={googleCalendarConectado ? handleCancelarInvitacion : undefined}
                                onConectarGoogle={() => setShowGoogleBundleModal(true)}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-zinc-400">
              No hay tareas en este evento
            </div>
          )}

          <SheetFooter className="border-t border-zinc-800 px-4 py-3 flex-col">
            <div className="flex flex-nowrap items-center gap-2 w-full text-xs min-w-0">
              <span className="text-zinc-400 shrink-0">
                Costo total <span className="font-medium text-zinc-200">{fmt(costoTotal)}</span>
              </span>
              <span className="text-zinc-600 shrink-0">|</span>
              <span className="text-zinc-400 shrink-0">
                Pagado <span className="text-emerald-400 font-medium">{fmt(totalPagado)}</span>
                <span className="text-zinc-600 mx-1">·</span>
                Pendiente <span className="text-amber-400 font-medium">{fmt(totalPendiente)}</span>
              </span>
              {googleCalendarConectado && hayPendientesInvitar && (
                <>
                  <span className="text-zinc-600 shrink-0">|</span>
                  <ZenButton
                    variant="primary"
                    size="sm"
                    onClick={handleInvitarPendientes}
                    disabled={loading}
                    loading={loading}
                    className="shrink-0"
                  >
                    Invitar a todos
                  </ZenButton>
                </>
              )}
              <span className="text-zinc-600 shrink-0 ml-auto">|</span>
              <ZenButton
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className="shrink-0"
              >
                Cerrar
              </ZenButton>
            </div>
          </SheetFooter>
        </div>

        {assignCrewForTask && (
          <SelectCrewModal
            isOpen={!!assignCrewForTask}
            onClose={() => setAssignCrewForTask(null)}
            onSelect={handleAssignCrewSelect}
            studioSlug={studioSlug}
            currentMemberId={null}
            title="Asignar personal"
            description="Selecciona un miembro del equipo para asignar a esta tarea."
            eventId={eventId}
            taskStartDate={assignCrewForTask.startDate}
            taskEndDate={assignCrewForTask.endDate}
            taskId={assignCrewForTask.taskId}
          />
        )}

        <GoogleBundleModal
          isOpen={showGoogleBundleModal}
          onClose={() => {
            setShowGoogleBundleModal(false);
            verificarGoogleCalendar();
          }}
          studioSlug={studioSlug}
        />
      </SheetContent>
    </Sheet>
  );
}
