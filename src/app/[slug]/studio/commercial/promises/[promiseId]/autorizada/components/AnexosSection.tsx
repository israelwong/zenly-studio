'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { startTransition } from 'react';
import { Plus, MoreVertical, FileCheck, Trash2, XCircle, RotateCcw, Clock, Copy, Gift, Ticket, Globe, Lock, FileText, Loader2 } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenButton, ZenBadge, ZenDropdownMenu, ZenDropdownMenuTrigger, ZenDropdownMenuContent, ZenDropdownMenuItem, ZenDropdownMenuSeparator } from '@/components/ui/zen';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/shadcn/alert-dialog';
import { deleteCotizacion, toggleCotizacionVisibility, duplicateCotizacion, cancelarCotizacion, quitarCancelacionCotizacion } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import { createPromiseLog } from '@/lib/actions/studio/commercial/promises/promise-logs.actions';
import { ConfirmarCierreModal } from '../../components/ConfirmarCierreModal';
import { CancelationWithFundsModal } from '@/components/shared/cancelation/CancelationWithFundsModal';
import { autorizarAnexoDirecto } from '@/lib/actions/studio/commercial/promises/cotizaciones-cierre.actions';
import type { PasarACierreOptions } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import type { CotizacionListItem } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import { getQuoteDetailForPreview } from '@/lib/actions/public/promesas.actions';
import { CotizacionDetailSheet } from '@/components/promise/CotizacionDetailSheet';
import type { PublicCotizacion } from '@/types/public-promise';
import { toast } from 'sonner';

const STATUS_LABELS: Record<string, string> = {
  pendiente: 'Pendiente',
  en_cierre: 'En cierre',
  autorizada: 'Autorizada',
  aprobada: 'Aprobada',
  cancelada: 'Cancelada',
};

function getStatusVariant(status: string): 'default' | 'destructive' | 'secondary' | 'success' | 'warning' | 'info' {
  if (status === 'en_cierre') return 'info';
  if (status === 'autorizada' || status === 'aprobada' || status === 'approved') return 'success';
  if (status === 'cancelada') return 'destructive';
  return 'secondary';
}

interface AnexosSectionProps {
  anexos: CotizacionListItem[];
  studioSlug: string;
  promiseId: string;
  /** ID de la cotización principal autorizada; usado para el link "Nueva propuesta" (parentId). */
  parentCotizacionId: string | null;
  /** evento_id de la cotización principal (para contexto; no crear evento nuevo en cierre anexo). */
  eventoIdPrincipal: string | null;
  onRefresh: () => void;
}

export function AnexosSection({
  anexos,
  studioSlug,
  promiseId,
  parentCotizacionId,
  eventoIdPrincipal,
  onRefresh,
}: AnexosSectionProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [cierreModalCotizacion, setCierreModalCotizacion] = useState<{ id: string; name: string } | null>(null);
  const [isPassingToCierre, setIsPassingToCierre] = useState(false);
  const [confirmDeleteAnnex, setConfirmDeleteAnnex] = useState<{ id: string; name: string } | null>(null);
  const [confirmRestoreAnnex, setConfirmRestoreAnnex] = useState<{ id: string; name: string } | null>(null);
  const [cancelAnnexWithFunds, setCancelAnnexWithFunds] = useState<{ id: string; name: string } | null>(null);
  const [cancellingAnnexId, setCancellingAnnexId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [togglingVisibilityId, setTogglingVisibilityId] = useState<string | null>(null);
  /** Valor que se está aplicando en el servidor; el switch no se desbloquea hasta que anexos refleje este valor. */
  const pendingVisibilityTargetRef = useRef<boolean | null>(null);
  /** Longitud de anexos al iniciar duplicado; se desbloquea cuando la lista crece (nuevo ítem). */
  const anexosLengthWhenDuplicatingRef = useRef<number>(0);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  /** Id del anexo cuyo menú está abierto; al abrir el modal de cierre se pone null para cerrar el menú de inmediato. */
  const [dropdownOpenId, setDropdownOpenId] = useState<string | null>(null);
  const [previewAnexoId, setPreviewAnexoId] = useState<string | null>(null);
  const [previewCotizacion, setPreviewCotizacion] = useState<PublicCotizacion | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Desbloquear el switch de visibilidad solo cuando los datos refrescados reflejen el valor del servidor
  useEffect(() => {
    if (!togglingVisibilityId || pendingVisibilityTargetRef.current === null) return;
    const anexo = anexos.find((a) => a.id === togglingVisibilityId);
    if (anexo && (anexo.visible_to_client ?? false) === pendingVisibilityTargetRef.current) {
      setTogglingVisibilityId(null);
      pendingVisibilityTargetRef.current = null;
    }
  }, [anexos, togglingVisibilityId]);

  // Desbloquear "Eliminando..." solo cuando el anexo ya no esté en la lista (lista actualizada)
  useEffect(() => {
    if (!deletingId) return;
    if (!anexos.some((a) => a.id === deletingId)) {
      setDeletingId(null);
    }
  }, [anexos, deletingId]);

  // Desbloquear "Restaurando..." solo cuando el anexo figure como pendiente en la lista
  useEffect(() => {
    if (!restoringId) return;
    const anexo = anexos.find((a) => a.id === restoringId);
    if (anexo && anexo.status === 'pendiente') {
      setRestoringId(null);
    }
  }, [anexos, restoringId]);

  // Desbloquear "Duplicando..." cuando la lista crece (nuevo ítem añadido)
  useEffect(() => {
    if (!duplicatingId) return;
    if (anexos.length > anexosLengthWhenDuplicatingRef.current) {
      setDuplicatingId(null);
    }
  }, [anexos, duplicatingId]);

  // Desbloquear "Cancelando..." cuando el anexo figure como cancelada en la lista
  useEffect(() => {
    if (!cancellingAnnexId) return;
    const anexo = anexos.find((a) => a.id === cancellingAnnexId);
    if (anexo && anexo.status === 'cancelada') {
      setCancellingAnnexId(null);
    }
  }, [anexos, cancellingAnnexId]);

  const handleEliminarClick = (annexId: string, name: string) => {
    setDropdownOpenId(null);
    setConfirmDeleteAnnex({ id: annexId, name });
  };

  const handleRestaurarClick = (anexo: CotizacionListItem) => {
    setDropdownOpenId(null);
    setConfirmRestoreAnnex({ id: anexo.id, name: anexo.name });
  };

  const handleEliminarConfirm = async () => {
    if (!confirmDeleteAnnex) return;
    const { id, name: _name } = confirmDeleteAnnex;
    setDeletingId(id);
    setConfirmDeleteAnnex(null);
    try {
      const result = await deleteCotizacion(id, studioSlug);
      if (result.success) {
        toast.success('Propuesta eliminada');
        startTransition(() => onRefresh());
        // deletingId se limpia en useEffect cuando anexos deje de contener este id
      } else {
        toast.error(result.error ?? 'Error al eliminar');
        setDeletingId(null);
      }
    } catch {
      setDeletingId(null);
    }
  };

  /** Cancelar: Caso A (pendiente) → cancelar directo sin modal. Caso B (autorizado) → intentar sin datos; si hay pagos, abrir CancelationWithFundsModal. */
  const handleCancelarAnexoClick = async (anexo: CotizacionListItem) => {
    setDropdownOpenId(null);
    setCancellingAnnexId(anexo.id);
    try {
      const result = await cancelarCotizacion(studioSlug, anexo.id);
      if (result.success) {
        toast.success('Propuesta cancelada');
        await createPromiseLog(studioSlug, {
          promise_id: promiseId!,
          content: `Propuesta "${anexo.name}" cancelada.`,
          log_type: 'system',
          metadata: { cotizacion_id: anexo.id, action: 'anexo_cancelado' },
        }).catch(() => {});
        startTransition(() => onRefresh());
      } else if (result.error?.includes('Hay pagos confirmados') || result.error?.includes('destino del dinero')) {
        setCancelAnnexWithFunds({ id: anexo.id, name: anexo.name });
      } else {
        toast.error(result.error ?? 'Error al cancelar');
      }
    } finally {
      setCancellingAnnexId(null);
    }
  };

  const handleCancelAnnexWithFundsConfirm = async (data: { reason: string; requestedBy: 'estudio' | 'cliente'; fundDestination: 'retain' | 'refund' }) => {
    if (!cancelAnnexWithFunds || !promiseId) return;
    const { id, name } = cancelAnnexWithFunds;
    setCancellingAnnexId(id);
    setCancelAnnexWithFunds(null);
    try {
      const result = await cancelarCotizacion(studioSlug, id, {
        motivo: data.reason,
        solicitante: data.requestedBy,
        destinoFondos: data.fundDestination,
      });
      if (result.success) {
        toast.success('Propuesta cancelada');
        await createPromiseLog(studioSlug, {
          promise_id: promiseId,
          content: `Propuesta "${name}" cancelada. Motivo: ${data.reason}. Destino de fondos: ${data.fundDestination === 'refund' ? 'Devolución' : 'Retenido por política'}.`,
          log_type: 'system',
          metadata: { cotizacion_id: id, action: 'anexo_cancelado_con_fondos', fund_destination: data.fundDestination },
        });
        startTransition(() => onRefresh());
        // cancellingAnnexId se limpia en useEffect cuando el anexo tenga status cancelada
      } else {
        toast.error(result.error ?? 'Error al cancelar');
        setCancellingAnnexId(null);
      }
    } catch {
      setCancellingAnnexId(null);
    }
  };

  const handleRestaurarConfirm = async () => {
    if (!confirmRestoreAnnex) return;
    const anexo = anexos.find((a) => a.id === confirmRestoreAnnex.id);
    setConfirmRestoreAnnex(null);
    if (!anexo) return;
    setRestoringId(anexo.id);
    try {
      const result = await quitarCancelacionCotizacion(anexo.id, studioSlug);
      if (result.success) {
        toast.success('Propuesta restaurada');
        if (promiseId) {
          await createPromiseLog(studioSlug, {
            promise_id: promiseId,
            content: `Propuesta "${anexo.name}" restaurada (pendiente).`,
            log_type: 'system',
            metadata: { cotizacion_id: anexo.id, action: 'anexo_restaurado' },
          }).catch(() => {});
        }
        startTransition(() => onRefresh());
        // restoringId se limpia en useEffect cuando el anexo tenga status pendiente
      } else {
        toast.error(result.error ?? 'Error al restaurar');
        setRestoringId(null);
      }
    } catch {
      setRestoringId(null);
    }
  };

  const handleDuplicar = async (e: React.MouseEvent, anexo: CotizacionListItem) => {
    e.preventDefault();
    e.stopPropagation();
    if (!parentCotizacionId || duplicatingId) return;
    setDropdownOpenId(null);
    anexosLengthWhenDuplicatingRef.current = anexos.length;
    setDuplicatingId(anexo.id);
    try {
      const result = await duplicateCotizacion(anexo.id, studioSlug, { parentCotizacionId });
      if (result.success) {
        toast.success('Propuesta duplicada');
        startTransition(() => onRefresh());
        // duplicatingId se limpia en useEffect cuando anexos.length aumente
      } else {
        toast.error(result.error ?? 'Error al duplicar');
        setDuplicatingId(null);
      }
    } catch {
      setDuplicatingId(null);
    }
  };

  const handleAutorizarAnexoConfirm = async (payload: PasarACierreOptions) => {
    if (!cierreModalCotizacion) return;
    setIsPassingToCierre(true);
    try {
      const result = await autorizarAnexoDirecto(studioSlug, promiseId, cierreModalCotizacion.id, payload);
      if (result.success) {
        toast.success('Propuesta autorizada');
        setCierreModalCotizacion(null);
        if (eventoIdPrincipal) {
          router.replace(`/${studioSlug}/studio/business/events/${eventoIdPrincipal}`);
        } else {
          startTransition(() => onRefresh());
        }
      } else {
        toast.error(result.error ?? 'Error al autorizar');
        throw new Error(result.error);
      }
    } finally {
      setIsPassingToCierre(false);
    }
  };

  const handleAutorizarAnexoClick = (anexo: CotizacionListItem) => {
    setDropdownOpenId(null);
    setCierreModalCotizacion({ id: anexo.id, name: anexo.name });
  };

  const handleLoadPreview = async (e: React.MouseEvent, anexo: CotizacionListItem) => {
    e.preventDefault();
    e.stopPropagation();
    if (loadingPreview) return;
    setPreviewAnexoId(anexo.id);
    setLoadingPreview(true);
    setPreviewCotizacion(null);
    try {
      const result = await getQuoteDetailForPreview(studioSlug, anexo.id);
      if (result.success && result.data) {
        setPreviewCotizacion(result.data);
      } else {
        toast.error(result.error ?? 'No se pudo cargar la vista previa');
        setPreviewAnexoId(null);
      }
    } catch {
      toast.error('Error al cargar la vista previa');
      setPreviewAnexoId(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  const basePath = `/${studioSlug}/studio/commercial/promises/${promiseId}`;
  const nuevaAnexoHref =
    parentCotizacionId
      ? `${basePath}/cotizacion/nueva?isAnnex=true&parentId=${encodeURIComponent(parentCotizacionId)}`
      : null;

  return (
    <>
      <ZenCard className="h-full flex flex-col">
        <ZenCardHeader className="border-b border-zinc-800 py-3 px-4 shrink-0 h-[52px] flex flex-col justify-center overflow-hidden">
          <div className="flex items-center justify-between h-full">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <ZenCardTitle className="text-sm font-medium mb-0 leading-none">
                Propuestas adicionales
              </ZenCardTitle>
              <ZenBadge variant="warning" className="text-[10px] px-1.5 py-0 rounded-full shrink-0">
                Anexos
              </ZenBadge>
            </div>
            <div className="flex items-center shrink-0">
              {nuevaAnexoHref ? (
                <Link
                  href={nuevaAnexoHref}
                  className="inline-flex items-center justify-center rounded-md hover:bg-zinc-800/80 transition-colors h-6 w-6"
                  title="Nueva propuesta adicional"
                  aria-label="Nueva propuesta adicional"
                >
                  <Plus className="h-3.5 w-3.5 text-white" />
                </Link>
              ) : (
                <ZenButton variant="ghost" size="sm" className="h-6 w-6 p-0" disabled title="Nueva propuesta adicional">
                  <Plus className="h-3.5 w-3.5 text-white" />
                </ZenButton>
              )}
            </div>
          </div>
        </ZenCardHeader>
        <ZenCardContent className="p-4 flex flex-col flex-1 overflow-y-auto">
          {anexos.length === 0 ? (
            <div className="py-8 px-6 text-center text-zinc-500 border border-dashed border-zinc-700 rounded-lg">
              <p className="text-sm">No hay propuestas adicionales.</p>
              <p className="text-xs mt-1">Crea una para ofrecer servicios extra (horas extra, sesiones posteriores, álbumes impresos, etc.).</p>
              {nuevaAnexoHref ? (
                <ZenButton variant="ghost" size="sm" className="mt-3 text-zinc-400 hover:text-zinc-300" asChild>
                  <Link href={nuevaAnexoHref}>
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Crear propuesta adicional
                  </Link>
                </ZenButton>
              ) : (
                <ZenButton variant="ghost" size="sm" className="mt-3 text-zinc-500" disabled>
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Crear propuesta adicional
                </ZenButton>
              )}
            </div>
          ) : (
            <div className="space-y-4 transition-opacity duration-200">
              {(() => {
                const anexosContratados = anexos.filter(
                  (a) => a.status === 'autorizada' || a.status === 'aprobada' || a.status === 'approved'
                );
                const propuestasDisponibles = anexos.filter(
                  (a) => a.status !== 'autorizada' && a.status !== 'aprobada' && a.status !== 'approved'
                );

                const renderAnexoCard = (anexo: CotizacionListItem, options: { isContratado: boolean }) => {
                const isAutorizada =
                  anexo.status === 'autorizada' || anexo.status === 'aprobada' || anexo.status === 'approved';
                const isCancelada = anexo.status === 'cancelada';
                const canAutorizar =
                  (anexo.status === 'pendiente' || anexo.status === 'negociacion') && !!eventoIdPrincipal;
                const showDuplicar = !!parentCotizacionId && !isCancelada;
                const href = `${basePath}/cotizacion/${anexo.id}?from=autorizada&isAnnex=true`;
                const isCardBusy = deletingId === anexo.id || restoringId === anexo.id || cancellingAnnexId === anexo.id;
                const menuDisabled = !!deletingId || !!restoringId || !!cancellingAnnexId || !!duplicatingId || togglingVisibilityId !== null;
                const visible = anexo.visible_to_client ?? false;
                const cardClass = `p-3 border rounded-lg transition-colors relative no-underline text-inherit block bg-zinc-800/50 border-zinc-700 cursor-pointer hover:bg-zinc-800 ${isCardBusy ? 'opacity-50 pointer-events-none' : ''}`;
                const cortesiasCount = anexo.cortesias_count_snapshot ?? (Array.isArray(anexo.items_cortesia) ? anexo.items_cortesia.length : 0);
                const hasDuration = anexo.event_duration != null && anexo.event_duration > 0;
                const hasCortesias = cortesiasCount > 0;
                const hasBono = anexo.bono_especial != null && anexo.bono_especial > 0;
                const precioFinal = anexo.total_a_pagar ?? anexo.price;
                const precioLista = anexo.precio_calculado ?? anexo.snap_precio_lista ?? null;
                const mostrarListaTachado = precioLista != null && precioLista > precioFinal;
                const formatPrecio = (n: number) => n.toLocaleString('es-MX', { minimumFractionDigits: 2 });

                return (
                  <Link
                    key={anexo.id}
                    href={href}
                    className={cardClass}
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest?.('[data-quote-actions]')) {
                        e.preventDefault();
                        e.stopPropagation();
                      }
                    }}
                    onPointerDown={(e) => {
                      if ((e.target as HTMLElement).closest?.('[data-quote-actions]')) {
                        e.preventDefault();
                        e.stopPropagation();
                      }
                    }}
                  >
                    {(duplicatingId === anexo.id || isCardBusy) && (
                      <div className="absolute inset-0 bg-zinc-900/80 rounded-lg flex items-center justify-center z-20 transition-opacity duration-200">
                        <span className="flex items-center gap-2 text-sm text-zinc-300">
                          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                          {deletingId === anexo.id ? 'Eliminando...' : restoringId === anexo.id ? 'Restaurando...' : cancellingAnnexId === anexo.id ? 'Cancelando...' : 'Duplicando...'}
                        </span>
                      </div>
                    )}
                    {/* Header: nombre + Publicada/No publicada + badge estado + menú (1:1 con cotización) */}
                    <div className="flex items-center gap-2">
                      <h4 className="flex-1 min-w-0 text-sm font-medium truncate text-zinc-200">
                        {anexo.name}
                      </h4>
                      <div className="flex items-center gap-1.5 shrink-0" data-quote-actions onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                        <ZenButton
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (togglingVisibilityId) return;
                            const nextVisible = !visible;
                            setTogglingVisibilityId(anexo.id);
                            pendingVisibilityTargetRef.current = nextVisible;
                            toggleCotizacionVisibility(anexo.id, studioSlug).then((result) => {
                              if (result.success) {
                                toast.success(nextVisible ? 'Visible para el prospecto' : 'Ocultada del prospecto');
                                startTransition(() => onRefresh());
                              } else {
                                toast.error(result.error ?? 'Error al cambiar visibilidad');
                                setTogglingVisibilityId(null);
                                pendingVisibilityTargetRef.current = null;
                              }
                            });
                          }}
                          loading={togglingVisibilityId === anexo.id}
                          disabled={togglingVisibilityId !== null}
                          className={
                            visible
                              ? 'text-emerald-400 bg-emerald-950/50 border-emerald-600/50 hover:bg-emerald-500/10 h-6 px-1.5 text-xs rounded-full relative z-10'
                              : 'text-zinc-400 border-zinc-600 hover:bg-zinc-800/50 h-6 px-1.5 text-xs rounded-full relative z-10'
                          }
                          loadingText={visible ? 'Despublicando...' : 'Publicando...'}
                          title={visible ? 'Ocultar del prospecto' : 'Mostrar al prospecto'}
                        >
                          {togglingVisibilityId === anexo.id ? (visible ? 'Despublicando...' : 'Publicando...') : visible ? 'Publicada' : 'No publicada'}
                        </ZenButton>
                        <ZenBadge
                          variant={getStatusVariant(anexo.status)}
                          size="sm"
                          className="h-6 px-1.5 text-xs rounded-full flex items-center"
                        >
                          {isCardBusy
                            ? (deletingId === anexo.id ? 'Eliminando...' : restoringId === anexo.id ? 'Restaurando...' : 'Cancelando...')
                            : (STATUS_LABELS[anexo.status] ?? anexo.status)}
                        </ZenBadge>
                        <ZenDropdownMenu
                          open={dropdownOpenId === anexo.id}
                          onOpenChange={(open) => !menuDisabled && setDropdownOpenId(open ? anexo.id : null)}
                        >
                          <ZenDropdownMenuTrigger asChild>
                            <ZenButton variant="ghost" size="sm" className="h-6 w-6 p-0" disabled={menuDisabled}>
                              <MoreVertical className="h-4 w-4 text-zinc-400" />
                            </ZenButton>
                          </ZenDropdownMenuTrigger>
                          <ZenDropdownMenuContent align="end">
                            {/* Orden: Autorizar (arriba, emerald, check), Duplicar, divisor, Cancelar */}
                            {canAutorizar && (
                              <ZenDropdownMenuItem
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleAutorizarAnexoClick(anexo);
                                }}
                                className="text-emerald-400 focus:text-emerald-300 focus:bg-emerald-950/20"
                              >
                                <FileCheck className="h-4 w-4 mr-2" />
                                Autorizar
                              </ZenDropdownMenuItem>
                            )}
                            {showDuplicar && (
                              <ZenDropdownMenuItem
                                onClick={(e) => handleDuplicar(e, anexo)}
                                disabled={duplicatingId === anexo.id}
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                {duplicatingId === anexo.id ? 'Duplicando...' : 'Duplicar'}
                              </ZenDropdownMenuItem>
                            )}
                            {!isCancelada && (
                              <>
                                <ZenDropdownMenuSeparator className="bg-emerald-500/20" />
                                <ZenDropdownMenuItem
                                  onClick={(e) => { e.preventDefault(); handleCancelarAnexoClick(anexo); }}
                                  className="text-red-400 focus:text-red-300"
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Cancelar
                                </ZenDropdownMenuItem>
                              </>
                            )}
                            {isCancelada && (
                              <>
                                <ZenDropdownMenuItem
                                  onClick={(e) => { e.preventDefault(); handleRestaurarClick(anexo); }}
                                  disabled={restoringId === anexo.id}
                                >
                                  <RotateCcw className="h-4 w-4 mr-2" />
                                  {restoringId === anexo.id ? 'Restaurando...' : 'Restaurar'}
                                </ZenDropdownMenuItem>
                                <ZenDropdownMenuSeparator />
                                <ZenDropdownMenuItem
                                  onClick={(e) => { e.preventDefault(); handleEliminarClick(anexo.id, anexo.name); }}
                                  disabled={deletingId === anexo.id}
                                  className="text-red-400 focus:text-red-300"
                                >
                                  {deletingId === anexo.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin shrink-0" /> : <Trash2 className="h-4 w-4 mr-2" />}
                                  {deletingId === anexo.id ? 'Eliminando...' : 'Eliminar'}
                                </ZenDropdownMenuItem>
                              </>
                            )}
                          </ZenDropdownMenuContent>
                        </ZenDropdownMenu>
                      </div>
                    </div>
                    <div className="w-full border-b border-zinc-700/60 my-2 min-w-0" aria-hidden />
                    {/* Cuerpo: descripción, Horas/Cortesías/Bonos, tiempo entrega, condiciones, Actualizado (1:1 con cotización) */}
                    <div className="min-w-0 space-y-2">
                      {anexo.description && (
                        <p className="text-xs line-clamp-1 text-zinc-400">{anexo.description}</p>
                      )}
                      {(() => {
                        const independent = anexo.anexo_entrega_independent ?? false;
                        const dias = anexo.anexo_entrega_dias != null && anexo.anexo_entrega_dias >= 0 ? anexo.anexo_entrega_dias : null;
                        const timing = anexo.anexo_entrega_timing === 'before' || anexo.anexo_entrega_timing === 'after' ? anexo.anexo_entrega_timing : null;
                        if (!independent) {
                          const N = anexo.parent_delivery_days;
                          return (
                            <div className="w-full border-b border-zinc-700/60 pb-2 min-w-0">
                              <p className="text-xs text-zinc-400">
                                Tiempo incluido en el plazo definido en las políticas de entrega{N != null && N > 0 ? ` de ${N} días` : ''}
                              </p>
                            </div>
                          );
                        }
                        if (dias != null && timing) {
                          return (
                            <div className="w-full border-b border-zinc-700/60 pb-2 min-w-0">
                              <p className="text-xs text-amber-200/90">
                                {dias} días {timing === 'before' ? 'antes' : 'después'} de la entrega principal
                              </p>
                            </div>
                          );
                        }
                        return null;
                      })()}
                      {(hasDuration || hasCortesias || hasBono) && (
                        <div className="flex items-center flex-nowrap gap-0 text-sm text-zinc-400">
                          {hasDuration && (
                            <>
                              <span className="inline-flex items-center gap-1 shrink-0" title="Duración">
                                <Clock className="h-3.5 w-3.5 text-zinc-500" />
                                <span>{anexo.event_duration} hrs</span>
                              </span>
                              {(hasCortesias || hasBono) && <span className="text-zinc-500 px-1">·</span>}
                            </>
                          )}
                          {hasCortesias && (
                            <>
                              <span className="inline-flex items-center gap-1 shrink-0 text-emerald-500">
                                <Gift className="h-3.5 w-3.5" />
                                <span>{cortesiasCount} Cortesía{cortesiasCount !== 1 ? 's' : ''}</span>
                              </span>
                              {hasBono && <span className="text-zinc-500 px-1">·</span>}
                            </>
                          )}
                          {hasBono && (
                            <span className="inline-flex items-center gap-1 shrink-0 text-amber-500" title="Bono especial">
                              <Ticket className="h-3.5 w-3.5" />
                              <span>Bono: ${Number(anexo.bono_especial).toLocaleString('es-MX', { minimumFractionDigits: 0 })}</span>
                            </span>
                          )}
                        </div>
                      )}
                      {anexo.condiciones_visibles_detalle && anexo.condiciones_visibles_detalle.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {anexo.condiciones_visibles_detalle.map((c) => (
                            <span
                              key={c.id}
                              className="inline-flex items-center gap-1 px-1.5 py-px rounded-full text-[11px] bg-zinc-800/80 text-zinc-400 border border-zinc-700/50 max-w-[100px] min-w-0"
                              title={c.name}
                            >
                              {c.is_public ? (
                                <Globe className="h-2.5 w-2.5 shrink-0 text-zinc-500" />
                              ) : (
                                <Lock className="h-2.5 w-2.5 shrink-0 text-zinc-500" />
                              )}
                              <span className="truncate">{c.name}</span>
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-zinc-500">
                        Actualizado: {new Date(anexo.updated_at).toLocaleDateString('es-MX', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    {/* Footer: precio + Ver Documento (contratados) o Vista previa (propuestas) */}
                    <div
                      data-quote-actions
                      className="mt-3 pt-3 border-t border-zinc-700 flex items-center justify-between gap-2 flex-wrap"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      onPointerDown={(e) => { e.stopPropagation(); }}
                    >
                      <div className="flex items-baseline gap-2">
                        {mostrarListaTachado && (
                          <span className="text-sm font-light line-through shrink-0 text-zinc-500">
                            ${formatPrecio(precioLista)}
                          </span>
                        )}
                        <span className="text-base font-bold tabular-nums text-emerald-400">
                          ${formatPrecio(precioFinal)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 relative z-10">
                        {options.isContratado && anexo.evento_id ? (
                          <ZenButton
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-zinc-400 bg-zinc-900/50 hover:bg-zinc-800 hover:text-zinc-200 relative z-10"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              router.push(`/${studioSlug}/studio/business/events/${anexo.evento_id}`);
                            }}
                          >
                            <FileText className="h-3.5 w-3.5 mr-1" />
                            Ver documento
                          </ZenButton>
                        ) : null}
                        <ZenButton
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-zinc-400 bg-zinc-900/50 hover:bg-zinc-800 hover:text-zinc-200 relative z-10"
                          onClick={(e) => handleLoadPreview(e, anexo)}
                          disabled={!!duplicatingId}
                          loading={loadingPreview && previewAnexoId === anexo.id}
                          loadingText="Cargando..."
                        >
                          Vista previa
                        </ZenButton>
                      </div>
                    </div>
                  </Link>
                );
                };

                return (
                  <>
                    {anexosContratados.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Contratados</p>
                        {anexosContratados.map((anexo) => (
                          <React.Fragment key={anexo.id}>{renderAnexoCard(anexo, { isContratado: true })}</React.Fragment>
                        ))}
                      </div>
                    )}
                    {propuestasDisponibles.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mt-4">Propuestas disponibles</p>
                        {propuestasDisponibles.map((anexo) => (
                          <React.Fragment key={anexo.id}>{renderAnexoCard(anexo, { isContratado: false })}</React.Fragment>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </ZenCardContent>
      </ZenCard>

      {cierreModalCotizacion && (
        <ConfirmarCierreModal
          isOpen={!!cierreModalCotizacion}
          onClose={() => setCierreModalCotizacion(null)}
          onConfirm={handleAutorizarAnexoConfirm}
          studioSlug={studioSlug}
          cotizacionId={cierreModalCotizacion.id}
          promiseId={promiseId}
          cotizacionName={cierreModalCotizacion.name}
          isLoading={isPassingToCierre}
          progressMessage={isPassingToCierre ? 'Autorizando anexo...' : undefined}
          isAnnexContext
        />
      )}

      <AlertDialog open={!!confirmDeleteAnnex} onOpenChange={(open) => !open && setConfirmDeleteAnnex(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar permanentemente este anexo? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEliminarConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmRestoreAnnex} onOpenChange={(open) => !open && setConfirmRestoreAnnex(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar anexo</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Deseas restaurar este anexo a estado pendiente?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestaurarConfirm}>
              Restaurar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CancelationWithFundsModal
        isOpen={!!cancelAnnexWithFunds}
        onClose={() => setCancelAnnexWithFunds(null)}
        onConfirm={handleCancelAnnexWithFundsConfirm}
        title="Cancelar"
        description={
          <p className="text-sm text-zinc-400">
            Hay pagos registrados. Indica el motivo de la cancelación, quién la solicita y el destino del dinero (Devolución al cliente o Retenido por política).
          </p>
        }
        isLoading={false}
        saveLabel="Sí, cancelar"
        cancelLabel="No cancelar"
        showFundDestination
      />

      {previewAnexoId && promiseId && (
        <CotizacionDetailSheet
          cotizacion={previewCotizacion}
          isOpen={!!previewAnexoId}
          onClose={() => {
            setPreviewAnexoId(null);
            setPreviewCotizacion(null);
          }}
          promiseId={promiseId}
          studioSlug={studioSlug}
          isPreviewMode
          mostrarBotonAutorizar={false}
          isLoadingPreview={loadingPreview && !previewCotizacion}
        />
      )}
    </>
  );
}
