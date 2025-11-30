'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Calendar, MoreVertical, Eye, Edit, X, Loader2, CheckCircle2, Users } from 'lucide-react';
import {
  ZenCard,
  ZenCardHeader,
  ZenCardTitle,
  ZenCardContent,
  ZenButton,
  ZenDropdownMenu,
  ZenDropdownMenuTrigger,
  ZenDropdownMenuContent,
  ZenDropdownMenuItem,
  ZenDropdownMenuSeparator,
  ZenConfirmModal,
  ZenDialog,
  ZenAvatar,
  ZenAvatarFallback,
  ZenBadge,
} from '@/components/ui/zen';
import { formatNumber, formatDate } from '@/lib/actions/utils/formatting';
import { cancelarCotizacion, cancelarCotizacionYEvento, getCotizacionById } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import { ResumenCotizacion } from '@/app/[slug]/studio/commercial/promises/[promiseId]/cotizacion/[cotizacionId]/autorizar/components/ResumenCotizacion';
import { ResumenCotizacionAutorizada, type CotizacionItem as ResumenCotizacionItem } from './ResumenCotizacionAutorizada';
import { AutorizarRevisionModal } from './AutorizarRevisionModal';
import { InfoCrearRevisionModal } from './InfoCrearRevisionModal';
import { toast } from 'sonner';
import type { EventoDetalle } from '@/lib/actions/studio/business/events';

// Helper para formatear montos con separadores de miles
const formatAmount = (amount: number): string => {
  return `$${formatNumber(amount, 2)}`;
};

// Helper para obtener iniciales
const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

// Tipo extendido con items y relaciones
type CotizacionAprobada = NonNullable<EventoDetalle['cotizaciones']>[number];
type CotizacionItem = NonNullable<CotizacionAprobada['cotizacion_items']>[number];

interface EventCotizacionesCardProps {
  studioSlug: string;
  eventId: string;
  promiseId?: string | null;
  cotizaciones?: EventoDetalle['cotizaciones'];
  onUpdated?: () => void;
}

// Stats calculados por cotización
interface CotizacionStats {
  totalItems: number;
  completedTasks: number;
  totalTasks: number;
  assignedCrew: number;
  totalRequiringCrew: number;
  crewMembers: Array<{
    id: string;
    name: string;
    tipo: string;
  }>;
}

// Calcular stats de una cotización
const calculateCotizacionStats = (cotizacion: CotizacionAprobada | undefined): CotizacionStats => {
  if (!cotizacion?.cotizacion_items) {
    return {
      totalItems: 0,
      completedTasks: 0,
      totalTasks: 0,
      assignedCrew: 0,
      totalRequiringCrew: 0,
      crewMembers: [],
    };
  }

  const items = cotizacion.cotizacion_items as CotizacionItem[] | undefined;
  if (!items) {
    return {
      totalItems: 0,
      completedTasks: 0,
      totalTasks: 0,
      assignedCrew: 0,
      totalRequiringCrew: 0,
      crewMembers: [],
    };
  }

  const totalItems = items.length;

  // Items con tarea del scheduler
  const itemsWithTasks = items.filter((item) => item.scheduler_task);
  const totalTasks = itemsWithTasks.length;
  const completedTasks = itemsWithTasks.filter((item) => item.scheduler_task?.completed_at).length;

  // Items que requieren crew (típicamente servicios operativos)
  const itemsRequiringCrew = items.filter((item) =>
    item.profit_type === 'servicio' || item.profit_type_snapshot === 'servicio'
  );
  const totalRequiringCrew = itemsRequiringCrew.length;
  const assignedCrew = itemsRequiringCrew.filter((item) => item.assigned_to_crew_member_id).length;

  // Crew members únicos
  const crewMap = new Map<string, { id: string; name: string; tipo: string }>();
  items.forEach((item) => {
    if (item.assigned_to_crew_member) {
      crewMap.set(item.assigned_to_crew_member.id, {
        id: item.assigned_to_crew_member.id,
        name: item.assigned_to_crew_member.name,
        tipo: item.assigned_to_crew_member.tipo,
      });
    }
  });

  return {
    totalItems,
    completedTasks,
    totalTasks,
    assignedCrew,
    totalRequiringCrew,
    crewMembers: Array.from(crewMap.values()),
  };
};

export function EventCotizacionesCard({
  studioSlug,
  eventId,
  promiseId,
  cotizaciones,
  onUpdated,
}: EventCotizacionesCardProps) {
  const router = useRouter();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelandoCotizacionId, setCancelandoCotizacionId] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [loadingCotizacionId, setLoadingCotizacionId] = useState<string | null>(null);
  const [cotizacionCompleta, setCotizacionCompleta] = useState<CotizacionAprobada | null>(null);
  const [showInfoCrearRevisionModal, setShowInfoCrearRevisionModal] = useState(false);
  const [cotizacionParaRevision, setCotizacionParaRevision] = useState<CotizacionAprobada | null>(null);
  const [showAutorizarRevisionModal, setShowAutorizarRevisionModal] = useState(false);
  const [revisionParaAutorizar, setRevisionParaAutorizar] = useState<CotizacionAprobada | null>(null);

  const cotizacionesAprobadas = (cotizaciones || []).filter(
    (c) => c.status === 'autorizada' || c.status === 'aprobada' || c.status === 'approved'
  ) as CotizacionAprobada[];

  // Separar cotizaciones activas de revisiones pendientes
  const cotizacionesActivas = cotizacionesAprobadas.filter(
    (c) => !c.revision_status || c.revision_status === 'active'
  );
  const revisionesPendientes = (cotizaciones || []).filter(
    (c) => c.revision_status === 'pending_revision' && c.status === 'pendiente'
  ) as CotizacionAprobada[];

  // Calcular total a pagar considerando descuentos (solo cotizaciones activas)
  const totalAprobado = cotizacionesActivas.reduce((sum, c) => {
    const totalPagar = Number(c.price) - (c.discount ? Number(c.discount) : 0);
    return sum + totalPagar;
  }, 0);

  const handleCrearRevision = (cotizacion: CotizacionAprobada) => {
    setCotizacionParaRevision(cotizacion);
    setShowInfoCrearRevisionModal(true);
  };

  const handleAutorizarRevision = (revision: CotizacionAprobada) => {
    setRevisionParaAutorizar(revision);
    setShowAutorizarRevisionModal(true);
  };

  const handleRevisionAutorizada = () => {
    setShowAutorizarRevisionModal(false);
    setRevisionParaAutorizar(null);
    onUpdated?.();
  };

  const handleAnexarCotizacion = () => {
    if (!promiseId) {
      return;
    }
    router.push(`/${studioSlug}/studio/commercial/promises/${promiseId}`);
  };

  const handleGestionarScheduler = () => {
    router.push(`/${studioSlug}/studio/business/events/${eventId}/scheduler`);
  };

  const handleVer = (cotizacion: CotizacionAprobada) => {
    // Usar datos directamente de la cotización que ya tenemos
    // Si tiene cotizacion_items, es autorizada y usamos ResumenCotizacionAutorizada
    // Si no, cargamos datos básicos y usamos ResumenCotizacion
    if (cotizacion.cotizacion_items && cotizacion.cotizacion_items.length > 0) {
      // Cotización autorizada: usar datos guardados directamente
      setCotizacionCompleta(cotizacion);
      setShowViewModal(true);
    } else {
      // Cotización no autorizada: cargar datos básicos para ResumenCotizacion
      setLoadingCotizacionId(cotizacion.id);
      getCotizacionById(cotizacion.id, studioSlug)
        .then((result) => {
          if (result.success && result.data) {
            setCotizacionCompleta({
              ...cotizacion,
              description: result.data.description,
            } as CotizacionAprobada);
            setShowViewModal(true);
          } else {
            toast.error(result.error || 'Error al cargar la cotización');
          }
        })
        .catch((error) => {
          console.error('Error loading cotizacion:', error);
          toast.error('Error al cargar la cotización');
        })
        .finally(() => {
          setLoadingCotizacionId(null);
        });
    }
  };

  const handleEditarDesdeModal = () => {
    if (!cotizacionCompleta) return;
    const cotizacion = cotizacionesAprobadas.find((c) => c.id === cotizacionCompleta.id);
    if (cotizacion && cotizacion.promise_id) {
      setShowViewModal(false);
      handleEditar(cotizacion);
    }
  };

  const handleEditar = (cotizacion: CotizacionAprobada) => {
    if (!cotizacion.promise_id) {
      toast.error('No hay promesa asociada');
      return;
    }

    // Si la cotización está autorizada/aprobada, redirigir a crear revisión en lugar de editar
    // porque updateCotizacion() bloquea edición de cotizaciones autorizadas
    if (cotizacion.status === 'aprobada' || cotizacion.status === 'autorizada' || cotizacion.status === 'approved') {
      // Si no tiene revision_status o es 'active', sugerir crear revisión
      if (!cotizacion.revision_status || cotizacion.revision_status === 'active') {
        handleCrearRevision(cotizacion);
        return;
      }
    }

    router.push(`/${studioSlug}/studio/commercial/promises/${cotizacion.promise_id}/cotizacion/${cotizacion.id}`);
  };

  const handleCancelarClick = (cotizacionId: string) => {
    setCancelandoCotizacionId(cotizacionId);
    setShowCancelModal(true);
  };

  const handleCancelConfirm = async () => {
    if (!cancelandoCotizacionId) return;

    setIsCancelling(true);
    try {
      const esUnicaCotizacion = cotizacionesAprobadas.length === 1;

      let result;
      if (esUnicaCotizacion) {
        // Cancelar cotización y evento
        result = await cancelarCotizacionYEvento(studioSlug, cancelandoCotizacionId);
      } else {
        // Solo cancelar cotización
        result = await cancelarCotizacion(studioSlug, cancelandoCotizacionId);
      }

      if (result.success) {
        toast.success('Cotización cancelada correctamente');
        setShowCancelModal(false);
        setCancelandoCotizacionId(null);
        onUpdated?.();

        // Si se canceló el evento, redirigir a lista de eventos
        if (esUnicaCotizacion) {
          router.push(`/${studioSlug}/studio/business/events`);
        }
      } else {
        toast.error(result.error || 'Error al cancelar cotización');
      }
    } catch (error) {
      console.error('Error cancelando cotización:', error);
      toast.error('Error al cancelar cotización');
    } finally {
      setIsCancelling(false);
    }
  };

  const cotizacionACancelar = cancelandoCotizacionId
    ? cotizacionesAprobadas.find((c) => c.id === cancelandoCotizacionId)
    : null;
  const esUnicaCotizacion = cotizacionesAprobadas.length === 1;

  return (
    <ZenCard>
      <ZenCardHeader className="border-b border-zinc-800 py-2 px-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <ZenCardTitle className="text-sm font-medium flex items-center pt-1">
            Cotizaciones
          </ZenCardTitle>
          <div className="flex items-center gap-2">
            {promiseId && (
              <ZenButton
                variant="ghost"
                size="sm"
                onClick={handleAnexarCotizacion}
                className="h-6 px-2 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/20"
              >
                <Plus className="h-3 w-3 mr-1" />
                Anexar
              </ZenButton>
            )}
            <ZenButton
              variant="ghost"
              size="sm"
              onClick={handleGestionarScheduler}
              className="h-6 px-2 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-950/20"
            >
              <Calendar className="h-3 w-3 mr-1" />
              Scheduler
            </ZenButton>
          </div>
        </div>
      </ZenCardHeader>
      <ZenCardContent className="p-4">
        <div className="space-y-4">
          {/* Lista de cotizaciones */}
          {cotizacionesAprobadas.length > 0 ? (
            <>
              <div className="space-y-3">
                {cotizacionesAprobadas.map((cotizacion) => {
                  const isMenuOpen = openMenuId === cotizacion.id;
                  const isLoading = loadingCotizacionId === cotizacion.id;
                  const stats = calculateCotizacionStats(cotizacion);

                  return (
                    <div
                      key={cotizacion.id}
                      className="flex items-start gap-4 p-4 pr-12 bg-zinc-900 rounded border border-zinc-800 relative group"
                    >
                      <div className="flex-1 min-w-0 relative">
                        <p className="text-sm font-medium text-zinc-100 truncate mb-2">
                          {cotizacion.name}
                        </p>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-zinc-400">Precio:</span>
                            <span className="text-zinc-300">{formatAmount(cotizacion.price)}</span>
                          </div>
                          {cotizacion.discount ? (
                            <>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-zinc-400">Descuento:</span>
                                <span className="text-red-400">-{formatAmount(cotizacion.discount)}</span>
                              </div>
                              <div className="flex items-center justify-between text-xs border-t border-zinc-700 pt-1">
                                <span className="font-medium text-emerald-400">Total a pagar:</span>
                                <span className="font-medium text-emerald-400">
                                  {formatAmount(cotizacion.price - cotizacion.discount)}
                                </span>
                              </div>
                            </>
                          ) : null}
                        </div>

                        {/* Stats de progreso */}
                        {(stats.totalTasks > 0 || stats.totalRequiringCrew > 0) && (
                          <div className="mt-2 pt-2 border-t border-zinc-800 space-y-1.5">
                            {/* Stats de tareas */}
                            {stats.totalTasks > 0 && (
                              <div className="flex items-center gap-2 text-xs">
                                <CheckCircle2 className="h-3 w-3 text-emerald-400 flex-shrink-0" />
                                <span className="text-zinc-400">Tareas:</span>
                                <span className={`font-medium ${stats.completedTasks === stats.totalTasks ? 'text-emerald-400' : 'text-zinc-300'}`}>
                                  {stats.completedTasks}/{stats.totalTasks}
                                </span>
                              </div>
                            )}

                            {/* Stats de asignaciones */}
                            {stats.totalRequiringCrew > 0 && (
                              <div className="flex items-center gap-2 text-xs">
                                <Users className="h-3 w-3 text-blue-400 flex-shrink-0" />
                                <span className="text-zinc-400">Crew:</span>
                                <span className={`font-medium ${stats.assignedCrew === stats.totalRequiringCrew ? 'text-emerald-400' : stats.assignedCrew > 0 ? 'text-blue-400' : 'text-zinc-500'}`}>
                                  {stats.assignedCrew}/{stats.totalRequiringCrew}
                                </span>
                              </div>
                            )}

                            {/* Dream Team - Mini avatares */}
                            {stats.crewMembers.length > 0 && (
                              <div className="flex items-center gap-1.5 mt-1.5">
                                <span className="text-[10px] text-zinc-500">Equipo:</span>
                                <div className="flex items-center gap-1">
                                  {stats.crewMembers.slice(0, 4).map((member) => (
                                    <ZenAvatar key={member.id} className="h-5 w-5 border border-zinc-700" title={member.name}>
                                      <ZenAvatarFallback className="bg-blue-600/20 text-blue-400 text-[10px]">
                                        {getInitials(member.name)}
                                      </ZenAvatarFallback>
                                    </ZenAvatar>
                                  ))}
                                  {stats.crewMembers.length > 4 && (
                                    <span className="text-[10px] text-zinc-500 ml-0.5" title={`${stats.crewMembers.length - 4} miembros más`}>
                                      +{stats.crewMembers.length - 4}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        <p className="text-xs text-zinc-500 mt-2">
                          Autorizada: {formatDate(cotizacion.updated_at)}
                        </p>
                        {/* Spinner de carga */}
                        {isLoading && (
                          <div className="absolute inset-0 bg-zinc-900/90 rounded flex items-center justify-center gap-2 z-10">
                            <Loader2 className="h-4 w-4 text-emerald-400 animate-spin" />
                            <span className="text-xs text-emerald-400 font-medium">
                              Generando vista previa de la cotización
                            </span>
                          </div>
                        )}
                      </div>
                      {/* Menú dropdown */}
                      <div className="absolute top-3 right-3 z-20">
                        <ZenDropdownMenu
                          open={isMenuOpen}
                          onOpenChange={(open) => setOpenMenuId(open ? cotizacion.id : null)}
                        >
                          <ZenDropdownMenuTrigger asChild>
                            <ZenButton
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-zinc-400 hover:text-zinc-300"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </ZenButton>
                          </ZenDropdownMenuTrigger>
                          <ZenDropdownMenuContent align="end">
                            <ZenDropdownMenuItem
                              onClick={() => {
                                handleVer(cotizacion);
                                setOpenMenuId(null);
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Ver
                            </ZenDropdownMenuItem>
                            <ZenDropdownMenuSeparator />
                            <ZenDropdownMenuItem
                              onClick={() => {
                                handleEditar(cotizacion);
                                setOpenMenuId(null);
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </ZenDropdownMenuItem>
                            <ZenDropdownMenuSeparator />
                            <ZenDropdownMenuItem
                              onClick={() => {
                                handleCancelarClick(cotizacion.id);
                                setOpenMenuId(null);
                              }}
                              className="text-red-400 focus:text-red-300 focus:bg-red-950/20"
                            >
                              <X className="mr-2 h-4 w-4" />
                              Cancelar
                            </ZenDropdownMenuItem>
                          </ZenDropdownMenuContent>
                        </ZenDropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Revisiones pendientes */}
              {revisionesPendientes.length > 0 && (
                <div className="mt-6 pt-4 border-t border-zinc-800">
                  <p className="text-xs font-medium text-zinc-400 mb-3">Revisiones Pendientes</p>
                  <div className="space-y-3">
                    {revisionesPendientes.map((revision) => {
                      const isMenuOpen = openMenuId === revision.id;
                      return (
                        <div
                          key={revision.id}
                          className="flex items-start gap-4 p-4 pr-12 bg-blue-950/20 rounded border border-blue-500/30 relative group"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <ZenBadge variant="outline" className="text-xs text-blue-400 border-blue-500/50">
                                Revisión #{revision.revision_number || 1}
                              </ZenBadge>
                              <p className="text-sm font-medium text-zinc-100 truncate">
                                {revision.name}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-zinc-400">Precio:</span>
                                <span className="text-zinc-300">{formatAmount(revision.price)}</span>
                              </div>
                            </div>
                            <p className="text-xs text-zinc-500 mt-2">
                              Pendiente de autorización
                            </p>
                          </div>
                          {/* Menú dropdown para revisiones */}
                          <div className="absolute top-3 right-3 z-20">
                            <ZenDropdownMenu
                              open={isMenuOpen}
                              onOpenChange={(open) => setOpenMenuId(open ? revision.id : null)}
                            >
                              <ZenDropdownMenuTrigger asChild>
                                <ZenButton
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-zinc-400 hover:text-zinc-300"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </ZenButton>
                              </ZenDropdownMenuTrigger>
                              <ZenDropdownMenuContent align="end">
                                <ZenDropdownMenuItem
                                  onClick={() => {
                                    handleVer(revision);
                                    setOpenMenuId(null);
                                  }}
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  Ver
                                </ZenDropdownMenuItem>
                                {promiseId && (
                                  <>
                                    <ZenDropdownMenuSeparator />
                                    <ZenDropdownMenuItem
                                      onClick={() => {
                                        handleAutorizarRevision(revision);
                                        setOpenMenuId(null);
                                      }}
                                    >
                                      <CheckCircle2 className="mr-2 h-4 w-4" />
                                      Autorizar Revisión
                                    </ZenDropdownMenuItem>
                                  </>
                                )}
                              </ZenDropdownMenuContent>
                            </ZenDropdownMenu>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Resumen - Total aprobado */}
              {totalAprobado > 0 && (
                <div className="grid grid-cols-1 gap-2 text-xs pt-2 border-t border-zinc-800">
                  <div className="p-2 bg-emerald-900/20 rounded border border-emerald-500/30">
                    <p className="text-zinc-400">Total aprobado</p>
                    <p className="font-semibold text-emerald-400">{formatAmount(totalAprobado)}</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-xs text-zinc-500 mb-2">
                No hay cotizaciones aprobadas
              </p>
              {!promiseId && (
                <p className="text-xs text-zinc-600">
                  Asocia una promesa para ver cotizaciones
                </p>
              )}
            </div>
          )}

        </div>
      </ZenCardContent>

      {/* Modal de confirmación para cancelar */}
      {showCancelModal && cotizacionACancelar && (
        <ZenConfirmModal
          isOpen={showCancelModal}
          onClose={() => {
            if (!isCancelling) {
              setShowCancelModal(false);
              setCancelandoCotizacionId(null);
            }
          }}
          onConfirm={handleCancelConfirm}
          title="Cancelar cotización"
          description={
            esUnicaCotizacion
              ? '¿Deseas cancelar la cotización y el evento?'
              : 'Solo se cancelará la cotización seleccionada pero el evento se mantendrá activo porque existen cotizaciones aprobadas.'
          }
          confirmText="Cancelar cotización"
          cancelText="No cancelar"
          variant="destructive"
          loading={isCancelling}
          loadingText="Cancelando..."
        />
      )}

      {/* Modal para ver resumen de cotización */}
      {showViewModal && cotizacionCompleta && (
        <ZenDialog
          isOpen={showViewModal}
          onClose={() => {
            setShowViewModal(false);
            setCotizacionCompleta(null);
          }}
          title="Resumen de Cotización"
          maxWidth="5xl"
        >
          {cotizacionCompleta.cotizacion_items && cotizacionCompleta.cotizacion_items.length > 0 ? (
            // Cotización autorizada: mostrar datos guardados
            <ResumenCotizacionAutorizada
              cotizacion={{
                id: cotizacionCompleta.id,
                name: cotizacionCompleta.name,
                description: null, // Los items tienen su propia descripción
                price: cotizacionCompleta.price,
                discount: cotizacionCompleta.discount,
                status: cotizacionCompleta.status,
                cotizacion_items: cotizacionCompleta.cotizacion_items as ResumenCotizacionItem[],
              }}
              studioSlug={studioSlug}
              promiseId={cotizacionCompleta.promise_id || undefined}
              onEditar={handleEditarDesdeModal}
            />
          ) : (
            // Cotización no autorizada: usar componente original que carga catálogo
            <ResumenCotizacion
              cotizacion={{
                id: cotizacionCompleta.id,
                name: cotizacionCompleta.name,
                description: null, // No disponible en EventoDetalle
                price: cotizacionCompleta.price,
                status: cotizacionCompleta.status,
                items: cotizacionCompleta.cotizacion_items?.map((item) => ({
                  item_id: item.item_id || '',
                  quantity: item.quantity,
                })) || [],
              }}
              studioSlug={studioSlug}
              promiseId={cotizacionCompleta.promise_id || undefined}
              onEditar={handleEditarDesdeModal}
            />
          )}
        </ZenDialog>
      )}

      {/* Modal informativo que crea revisión directamente */}
      {cotizacionParaRevision && (
        <InfoCrearRevisionModal
          isOpen={showInfoCrearRevisionModal}
          onClose={() => {
            setShowInfoCrearRevisionModal(false);
            setCotizacionParaRevision(null);
          }}
          onConfirm={() => {
            setShowInfoCrearRevisionModal(false);
            setCotizacionParaRevision(null);
            onUpdated?.();
          }}
          cotizacion={cotizacionParaRevision}
          studioSlug={studioSlug}
        />
      )}

      {/* Modal para autorizar revisión */}
      {revisionParaAutorizar && promiseId && (
        <AutorizarRevisionModal
          isOpen={showAutorizarRevisionModal}
          onClose={() => {
            setShowAutorizarRevisionModal(false);
            setRevisionParaAutorizar(null);
          }}
          studioSlug={studioSlug}
          revision={revisionParaAutorizar}
          promiseId={promiseId}
          onSuccess={handleRevisionAutorizada}
        />
      )}
    </ZenCard>
  );
}

