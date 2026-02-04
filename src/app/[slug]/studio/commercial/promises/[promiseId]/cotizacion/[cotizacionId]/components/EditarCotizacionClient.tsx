'use client';

import React, { useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, MoreVertical, Archive, Trash2, CheckCircle } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription, ZenButton, ZenConfirmModal, ZenDropdownMenu, ZenDropdownMenuTrigger, ZenDropdownMenuContent, ZenDropdownMenuItem, ZenDropdownMenuSeparator, ZenBadge } from '@/components/ui/zen';
import { CotizacionForm } from '../../../../components/CotizacionForm';
import { archiveCotizacion, deleteCotizacion, pasarACierre } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import { ClosingProcessInfoModal } from '../../../components/ClosingProcessInfoModal';
import { toast } from 'sonner';
import { startTransition } from 'react';

interface EditarCotizacionClientProps {
  initialCotizacion: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    status: string;
    promise_id: string | null;
    contact_id: string | null;
    evento_id: string | null;
    revision_of_id?: string | null;
    revision_number?: number | null;
    revision_status?: string | null;
    condiciones_comerciales_id?: string | null;
    condiciones_comerciales_metodo_pago_id?: string | null;
    selected_by_prospect?: boolean;
    selected_at?: Date | null;
    negociacion_precio_original?: number | null;
    negociacion_precio_personalizado?: number | null;
    items: Array<{
      item_id: string;
      quantity: number;
      unit_price: number;
      subtotal: number;
      cost: number;
      expense: number;
      order: number;
      id: string;
      name: string | null;
      description: string | null;
      category_name: string | null;
      seccion_name: string | null;
      name_snapshot?: string | null;
      description_snapshot?: string | null;
      category_name_snapshot?: string | null;
      seccion_name_snapshot?: string | null;
      name_raw?: string | null;
      description_raw?: string | null;
      category_name_raw?: string | null;
      seccion_name_raw?: string | null;
    }>;
  } | null;
  initialCondicionComercial: {
    id: string;
    name: string;
    description: string | null;
    advance_percentage: number | null;
    advance_type: string | null;
    advance_amount: number | null;
    discount_percentage: number | null;
  } | null;
}

export function EditarCotizacionClient({
  initialCotizacion,
  initialCondicionComercial,
}: EditarCotizacionClientProps) {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const studioSlug = params.slug as string;
  const promiseId = params.promiseId as string;
  const cotizacionId = params.cotizacionId as string;
  const contactId = searchParams.get('contactId');
  const fromCierre = searchParams.get('from') === 'cierre';

  const [isMounted, setIsMounted] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [showClosingProcessInfoModal, setShowClosingProcessInfoModal] = useState(false);
  const [isPassingToCierre, setIsPassingToCierre] = useState(false);

  React.useEffect(() => {
    setIsMounted(true);
    document.title = 'Zenly Studio - Cotizaciรณn';
  }, []);

  const cotizacionStatus = initialCotizacion?.status || null;
  const cotizacionName = initialCotizacion?.name || '';
  const selectedByProspect = initialCotizacion?.selected_by_prospect || false;
  const condicionComercial = initialCondicionComercial;

  const handlePasarACierreClick = () => {
    if (!promiseId) {
      toast.error('No se puede pasar a cierre sin una promesa asociada');
      return;
    }
    setShowClosingProcessInfoModal(true);
  };

  const handlePasarACierre = async () => {
    if (!promiseId) {
      toast.error('No se puede pasar a cierre sin una promesa asociada');
      return;
    }

    setShowClosingProcessInfoModal(false);
    setIsPassingToCierre(true);
    try {
      const result = await pasarACierre(studioSlug, cotizacionId);
      if (result.success) {
        toast.success('Cotizaciรณn pasada a proceso de cierre');
        window.dispatchEvent(new CustomEvent('close-overlays'));
        startTransition(() => {
          router.push(`/${studioSlug}/studio/commercial/promises/${promiseId}`);
        });
      } else {
        toast.error(result.error || 'Error al pasar cotizaciรณn a cierre');
      }
    } catch (error) {
      console.error('[handlePasarACierre] Error:', error);
      toast.error('Error al pasar cotizaciรณn a cierre');
    } finally {
      setIsPassingToCierre(false);
    }
  };

  // Verificar si la cotizaciรณn ya estรก en cierre o autorizada
  const isInCierre = cotizacionStatus === 'en_cierre';
  const isAlreadyAuthorized =
    cotizacionStatus === 'autorizada' ||
    cotizacionStatus === 'aprobada' ||
    cotizacionStatus === 'approved';
  
  const canShowPasarACierre = !isInCierre && !isAlreadyAuthorized;

  if (!initialCotizacion) {
    return null; // El skeleton se muestra en loading.tsx
  }

  return (
    <div className="w-full max-w-7xl mx-auto">
      <ZenCard variant="default" padding="none">
        <ZenCardHeader className="border-b border-zinc-800">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <ZenButton
                variant="ghost"
                size="sm"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('close-overlays'));
                  startTransition(() => {
                    if (fromCierre) {
                      // Si viene de cierre, usar router.back() para regresar a la ruta anterior
                      router.back();
                    } else {
                      // Si no viene de cierre, navegar explícitamente al detalle de la promesa
                      router.push(`/${studioSlug}/studio/commercial/promises/${promiseId}`);
                    }
                  });
                }}
                disabled={isPassingToCierre}
                className="p-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </ZenButton>
              <div>
                <div className="flex items-center gap-2">
                  <ZenCardTitle>Editar Cotización</ZenCardTitle>
                  {condicionComercial && !fromCierre && (
                    <ZenBadge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                      {condicionComercial.name}
                    </ZenBadge>
                  )}
                </div>
                {!fromCierre && (
                  <ZenCardDescription>
                    {condicionComercial?.description || 'Actualiza la información de la cotización'}
                  </ZenCardDescription>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {canShowPasarACierre && (
                <ZenButton
                  variant="primary"
                  size="md"
                  onClick={handlePasarACierreClick}
                  disabled={isFormLoading || isActionLoading || isPassingToCierre}
                  loading={isPassingToCierre}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white focus-visible:ring-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Pasar a Cierre
                </ZenButton>
              )}
              {!isInCierre && isMounted && (
                <ZenDropdownMenu>
                  <ZenDropdownMenuTrigger asChild>
                    <ZenButton
                      variant="ghost"
                      size="md"
                      disabled={isFormLoading || isActionLoading || isPassingToCierre}
                      className="h-9 w-9 p-0"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </ZenButton>
                  </ZenDropdownMenuTrigger>
                  <ZenDropdownMenuContent align="end">
                    <ZenDropdownMenuItem
                      onClick={() => setShowArchiveModal(true)}
                      disabled={isActionLoading || isPassingToCierre}
                    >
                      <Archive className="h-4 w-4 mr-2" />
                      Archivar
                    </ZenDropdownMenuItem>
                    <ZenDropdownMenuSeparator />
                    <ZenDropdownMenuItem
                      onClick={() => setShowDeleteModal(true)}
                      disabled={isActionLoading || isPassingToCierre}
                      className="text-red-400 focus:text-red-300"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar
                    </ZenDropdownMenuItem>
                  </ZenDropdownMenuContent>
                </ZenDropdownMenu>
              )}
            </div>
          </div>
        </ZenCardHeader>
        <ZenCardContent className="p-6">
          <CotizacionForm
            studioSlug={studioSlug}
            cotizacionId={cotizacionId}
            promiseId={promiseId}
            contactId={contactId || null}
            redirectOnSuccess={fromCierre ? undefined : undefined} // Dejar que la lógica de estado maneje la redirección
            onAfterSave={fromCierre ? () => router.back() : undefined}
            onLoadingChange={setIsFormLoading}
            condicionComercialPreAutorizada={condicionComercial}
            isPreAutorizada={selectedByProspect}
            isAlreadyAuthorized={isAlreadyAuthorized}
            isDisabled={isPassingToCierre}
            hideVisibilityToggle={fromCierre}
          />
        </ZenCardContent>
      </ZenCard>

      <ZenConfirmModal
        isOpen={showArchiveModal}
        onClose={() => setShowArchiveModal(false)}
        onConfirm={async () => {
          setIsActionLoading(true);
          try {
            const result = await archiveCotizacion(cotizacionId, studioSlug);
            if (result.success) {
              toast.success('Cotizaciรณn archivada exitosamente');
              setShowArchiveModal(false);
              window.dispatchEvent(new CustomEvent('close-overlays'));
              if (fromCierre) {
                startTransition(() => {
                  router.back();
                });
              } else {
                startTransition(() => {
                  router.push(`/${studioSlug}/studio/commercial/promises/${promiseId}`);
                });
              }
            } else {
              toast.error(result.error || 'Error al archivar cotizaciรณn');
            }
          } catch {
            toast.error('Error al archivar cotizaciรณn');
          } finally {
            setIsActionLoading(false);
          }
        }}
        title="Archivar Cotizaciรณn"
        description="ยฟEstรกs seguro de archivar esta cotizaciรณn? Podrรกs desarchivarla mรกs tarde."
        confirmText="Archivar"
        cancelText="Cancelar"
        variant="default"
        loading={isActionLoading}
      />

      <ZenConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={async () => {
          setIsActionLoading(true);
          try {
            const result = await deleteCotizacion(cotizacionId, studioSlug);
            if (result.success) {
              toast.success('Cotizaciรณn eliminada exitosamente');
              setShowDeleteModal(false);
              window.dispatchEvent(new CustomEvent('close-overlays'));
              if (fromCierre) {
                startTransition(() => {
                  router.back();
                });
              } else {
                startTransition(() => {
                  router.push(`/${studioSlug}/studio/commercial/promises/${promiseId}`);
                });
              }
            } else {
              toast.error(result.error || 'Error al eliminar cotizaciรณn');
            }
          } catch {
            toast.error('Error al eliminar cotizaciรณn');
          } finally {
            setIsActionLoading(false);
          }
        }}
        title="Eliminar Cotizaciรณn"
        description="ยฟEstรกs seguro de eliminar esta cotizaciรณn? Esta acciรณn no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="destructive"
        loading={isActionLoading}
      />

      <ClosingProcessInfoModal
        isOpen={showClosingProcessInfoModal}
        onClose={() => setShowClosingProcessInfoModal(false)}
        onConfirm={handlePasarACierre}
        onCancel={() => setShowClosingProcessInfoModal(false)}
        cotizacionName={cotizacionName}
        isLoading={isPassingToCierre}
      />
    </div>
  );
}
