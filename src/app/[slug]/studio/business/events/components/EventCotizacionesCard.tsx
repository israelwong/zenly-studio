'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Plus, Calendar, MoreVertical, Eye, Edit, X, Loader2 } from 'lucide-react';
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
} from '@/components/ui/zen';
import { formatNumber, formatDate } from '@/lib/actions/utils/formatting';
import { cancelarCotizacion, cancelarCotizacionYEvento, getCotizacionById } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import { ResumenCotizacion } from '@/app/[slug]/studio/commercial/promises/[promiseId]/cotizacion/[cotizacionId]/autorizar/components/ResumenCotizacion';
import { toast } from 'sonner';

// Helper para formatear montos con separadores de miles
const formatAmount = (amount: number): string => {
  return `$${formatNumber(amount, 2)}`;
};

interface CotizacionAprobada {
  id: string;
  name: string;
  price: number;
  discount?: number | null;
  status: string;
  created_at: Date;
  updated_at: Date;
  promise_id: string | null;
}

interface EventCotizacionesCardProps {
  studioSlug: string;
  eventId: string;
  promiseId?: string | null;
  cotizaciones: CotizacionAprobada[];
  onUpdated?: () => void;
}

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
  const [cotizacionCompleta, setCotizacionCompleta] = useState<{
    id: string;
    name: string;
    description: string | null;
    price: number;
    status: string;
    items: Array<{ item_id: string; quantity: number }>;
  } | null>(null);

  const cotizacionesAprobadas = cotizaciones.filter(
    (c) => c.status === 'autorizada' || c.status === 'aprobada' || c.status === 'approved'
  );

  // Calcular total a pagar considerando descuentos
  const totalAprobado = cotizacionesAprobadas.reduce((sum, c) => {
    const totalPagar = Number(c.price) - (c.discount ? Number(c.discount) : 0);
    return sum + totalPagar;
  }, 0);

  const handleAnexarCotizacion = () => {
    if (!promiseId) {
      return;
    }
    router.push(`/${studioSlug}/studio/commercial/promises/${promiseId}`);
  };

  const handleGestionarGantt = () => {
    router.push(`/${studioSlug}/studio/business/events/${eventId}/gantt`);
  };

  const handleVer = async (cotizacion: CotizacionAprobada) => {
    setLoadingCotizacionId(cotizacion.id);
    try {
      const result = await getCotizacionById(cotizacion.id, studioSlug);
      if (result.success && result.data) {
        setCotizacionCompleta({
          id: result.data.id,
          name: result.data.name,
          description: result.data.description,
          price: result.data.price,
          status: result.data.status,
          items: result.data.items,
        });
        setShowViewModal(true);
      } else {
        toast.error(result.error || 'Error al cargar la cotización');
      }
    } catch (error) {
      console.error('Error loading cotizacion:', error);
      toast.error('Error al cargar la cotización');
    } finally {
      setLoadingCotizacionId(null);
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
              onClick={handleGestionarGantt}
              className="h-6 px-2 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-950/20"
            >
              <Calendar className="h-3 w-3 mr-1" />
              Gantt
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
                  return (
                    <div
                      key={cotizacion.id}
                      className="flex items-start gap-4 p-4 pr-12 bg-zinc-900 rounded border border-zinc-800 relative group"
                    >
                      <FileText className="h-4 w-4 text-zinc-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0 relative">
                        <p className="text-sm font-medium text-zinc-100 truncate">
                          {cotizacion.name}
                        </p>
                        <div className="mt-1 space-y-1">
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
      {showViewModal && (
        <ZenDialog
          isOpen={showViewModal}
          onClose={() => {
            setShowViewModal(false);
            setCotizacionCompleta(null);
          }}
          title="Resumen de Cotización"
          maxWidth="5xl"
        >
          {cotizacionCompleta && (
            <ResumenCotizacion
              cotizacion={cotizacionCompleta}
              studioSlug={studioSlug}
              promiseId={cotizacionesAprobadas.find((c) => c.id === cotizacionCompleta.id)?.promise_id || undefined}
              onEditar={handleEditarDesdeModal}
            />
          )}
        </ZenDialog>
      )}
    </ZenCard>
  );
}

