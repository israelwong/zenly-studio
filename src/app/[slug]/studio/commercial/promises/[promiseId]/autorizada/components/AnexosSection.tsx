'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { startTransition } from 'react';
import { Plus, MoreVertical, FileCheck, Trash2, Clock, Copy, Gift, Ticket, Globe, Lock } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenButton, ZenBadge, ZenDropdownMenu, ZenDropdownMenuTrigger, ZenDropdownMenuContent, ZenDropdownMenuItem } from '@/components/ui/zen';
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
import { deleteCotizacion, toggleCotizacionVisibility, duplicateCotizacion } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import { ConfirmarCierreModal } from '../../components/ConfirmarCierreModal';
import { pasarACierre, type PasarACierreOptions } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [cierreModalCotizacion, setCierreModalCotizacion] = useState<{ id: string; name: string } | null>(null);
  const [isPassingToCierre, setIsPassingToCierre] = useState(false);
  const [confirmDeleteAnnex, setConfirmDeleteAnnex] = useState<{ id: string; name: string } | null>(null);
  const [togglingVisibilityId, setTogglingVisibilityId] = useState<string | null>(null);
  /** Optimista: visible_to_client por id mientras se hace toggle (se limpia al terminar). */
  const [optimisticVisibility, setOptimisticVisibility] = useState<Record<string, boolean>>({});
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  /** Id del anexo cuyo menú está abierto; al abrir el modal de cierre se pone null para cerrar el menú de inmediato. */
  const [dropdownOpenId, setDropdownOpenId] = useState<string | null>(null);
  const [previewAnexoId, setPreviewAnexoId] = useState<string | null>(null);
  const [previewCotizacion, setPreviewCotizacion] = useState<PublicCotizacion | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const handleEliminarClick = (annexId: string, name: string) => {
    setDropdownOpenId(null);
    setConfirmDeleteAnnex({ id: annexId, name });
  };

  const handleEliminarConfirm = async () => {
    if (!confirmDeleteAnnex) return;
    const { id, name: _name } = confirmDeleteAnnex;
    setConfirmDeleteAnnex(null);
    setDeletingId(id);
    try {
      const result = await deleteCotizacion(id, studioSlug);
      if (result.success) {
        toast.success('Propuesta eliminada');
        startTransition(() => onRefresh());
      } else {
        toast.error(result.error ?? 'Error al eliminar');
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleDuplicar = async (e: React.MouseEvent, anexo: CotizacionListItem) => {
    e.preventDefault();
    e.stopPropagation();
    if (!parentCotizacionId || duplicatingId) return;
    setDropdownOpenId(null);
    setDuplicatingId(anexo.id);
    try {
      const result = await duplicateCotizacion(anexo.id, studioSlug, { parentCotizacionId });
      if (result.success) {
        toast.success('Propuesta duplicada');
        startTransition(() => onRefresh());
      } else {
        toast.error(result.error ?? 'Error al duplicar');
      }
    } finally {
      setDuplicatingId(null);
    }
  };

  const handleCierreConfirm = async (payload: PasarACierreOptions) => {
    if (!cierreModalCotizacion) return;
    setIsPassingToCierre(true);
    try {
      const result = await pasarACierre(studioSlug, cierreModalCotizacion.id, payload);
      if (result.success) {
        toast.success('Propuesta pasada a cierre');
        setCierreModalCotizacion(null);
        startTransition(() => onRefresh());
      } else {
        toast.error(result.error ?? 'Error al pasar a cierre');
        throw new Error(result.error);
      }
    } finally {
      setIsPassingToCierre(false);
    }
  };

  const handlePasarACierreClick = (anexo: CotizacionListItem) => {
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
            <div className="space-y-2">
              {anexos.map((anexo) => {
                const isAutorizada =
                  anexo.status === 'autorizada' || anexo.status === 'aprobada' || anexo.status === 'approved';
                const canEliminar = !isAutorizada;
                const canPasarCierre =
                  anexo.status !== 'en_cierre' && anexo.status !== 'autorizada' && anexo.status !== 'aprobada' && anexo.status !== 'approved';
                const href = `${basePath}/cotizacion/${anexo.id}?from=autorizada&isAnnex=true`;
                const cardClass = 'p-3 border rounded-lg transition-colors relative no-underline text-inherit block bg-zinc-800/50 border-zinc-700 cursor-pointer hover:bg-zinc-800';
                const visible = optimisticVisibility[anexo.id] ?? anexo.visible_to_client;
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
                    {duplicatingId === anexo.id && (
                      <div className="absolute inset-0 bg-zinc-900/80 rounded-lg flex items-center justify-center z-10">
                        <span className="text-sm text-zinc-300">Duplicando...</span>
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
                            setOptimisticVisibility((prev) => ({ ...prev, [anexo.id]: nextVisible }));
                            setTogglingVisibilityId(anexo.id);
                            toggleCotizacionVisibility(anexo.id, studioSlug).then((result) => {
                              if (result.success) {
                                toast.success(nextVisible ? 'Visible para el prospecto' : 'Ocultada del prospecto');
                                startTransition(() => onRefresh());
                              } else {
                                setOptimisticVisibility((prev) => ({ ...prev, [anexo.id]: visible }));
                                toast.error(result.error ?? 'Error al cambiar visibilidad');
                              }
                            }).finally(() => {
                              setTogglingVisibilityId(null);
                              setOptimisticVisibility((prev) => { const next = { ...prev }; delete next[anexo.id]; return next; });
                            });
                          }}
                          loading={togglingVisibilityId === anexo.id}
                          disabled={togglingVisibilityId !== null && togglingVisibilityId !== anexo.id}
                          className={
                            visible
                              ? 'text-emerald-400 bg-emerald-950/50 border-emerald-600/50 hover:bg-emerald-500/10 h-7 px-2 text-xs relative z-10'
                              : 'text-zinc-400 border-zinc-600 hover:bg-zinc-800/50 h-7 px-2 text-xs relative z-10'
                          }
                          loadingText={visible ? 'Despublicando' : 'Publicando'}
                          title={visible ? 'Ocultar del prospecto' : 'Mostrar al prospecto'}
                        >
                          {visible ? 'Publicada' : 'No publicada'}
                        </ZenButton>
                        <ZenBadge
                          variant={getStatusVariant(anexo.status)}
                          className="text-[10px] px-1.5 py-0.5 rounded-full"
                        >
                          {STATUS_LABELS[anexo.status] ?? anexo.status}
                        </ZenBadge>
                        <ZenDropdownMenu
                          open={dropdownOpenId === anexo.id}
                          onOpenChange={(open) => setDropdownOpenId(open ? anexo.id : null)}
                        >
                          <ZenDropdownMenuTrigger asChild>
                            <ZenButton variant="ghost" size="sm" className="h-6 w-6 p-0" disabled={!!duplicatingId}>
                              <MoreVertical className="h-4 w-4 text-zinc-400" />
                            </ZenButton>
                          </ZenDropdownMenuTrigger>
                          <ZenDropdownMenuContent align="end">
                            {parentCotizacionId && (
                              <ZenDropdownMenuItem
                                onClick={(e) => handleDuplicar(e, anexo)}
                                disabled={duplicatingId === anexo.id}
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                {duplicatingId === anexo.id ? 'Duplicando...' : 'Duplicar'}
                              </ZenDropdownMenuItem>
                            )}
                            {canPasarCierre && (
                              <ZenDropdownMenuItem
                                onClick={(e) => {
                                  e.preventDefault();
                                  handlePasarACierreClick(anexo);
                                }}
                              >
                                <FileCheck className="h-4 w-4 mr-2" />
                                Pasar a Cierre
                              </ZenDropdownMenuItem>
                            )}
                            {canEliminar && (
                              <ZenDropdownMenuItem
                                onClick={(e) => { e.preventDefault(); handleEliminarClick(anexo.id, anexo.name); }}
                                disabled={deletingId === anexo.id}
                                className="text-red-400 focus:text-red-300"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                {deletingId === anexo.id ? 'Eliminando...' : 'Eliminar'}
                              </ZenDropdownMenuItem>
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
                    {/* Footer: precio lista (tachado si hay descuento) + precio final + Vista previa (1:1 con cotización card) */}
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
              })}
            </div>
          )}
        </ZenCardContent>
      </ZenCard>

      {cierreModalCotizacion && (
        <ConfirmarCierreModal
          isOpen={!!cierreModalCotizacion}
          onClose={() => setCierreModalCotizacion(null)}
          onConfirm={handleCierreConfirm}
          studioSlug={studioSlug}
          cotizacionId={cierreModalCotizacion.id}
          promiseId={promiseId}
          cotizacionName={cierreModalCotizacion.name}
          isLoading={isPassingToCierre}
          progressMessage={isPassingToCierre ? 'Pasando a cierre...' : undefined}
          isAnnexContext
        />
      )}

      <AlertDialog open={!!confirmDeleteAnnex} onOpenChange={(open) => !open && setConfirmDeleteAnnex(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar propuesta adicional?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar esta propuesta? Esta acción no se puede deshacer y se borrarán todos los ítems configurados.
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
