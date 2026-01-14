'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, MoreVertical, Archive, Trash2 } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription, ZenButton, ZenConfirmModal, ZenDropdownMenu, ZenDropdownMenuTrigger, ZenDropdownMenuContent, ZenDropdownMenuItem, ZenDropdownMenuSeparator } from '@/components/ui/zen';
import { CotizacionForm } from '../../../components/CotizacionForm';
import { archiveCotizacion, deleteCotizacion, getCotizacionById, pasarACierre } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import { obtenerCondicionComercial } from '@/lib/actions/studio/config/condiciones-comerciales.actions';
import { ClosingProcessInfoModal } from '../../components/ClosingProcessInfoModal';
import { ZenBadge } from '@/components/ui/zen';
import { toast } from 'sonner';
import { CheckCircle } from 'lucide-react';

export default function EditarCotizacionPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const studioSlug = params.slug as string;
  const promiseId = params.promiseId as string;
  const cotizacionId = params.cotizacionId as string;
  const contactId = searchParams.get('contactId');

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    document.title = 'Zenly Studio - Cotización';
  }, []);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isFormLoading, setIsFormLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [cotizacionStatus, setCotizacionStatus] = useState<string | null>(null);
  const [cotizacionName, setCotizacionName] = useState<string>('');
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [condicionComercial, setCondicionComercial] = useState<{
    id: string;
    name: string;
    description: string | null;
    advance_percentage: number | null;
    advance_type: string | null;
    advance_amount: number | null;
    discount_percentage: number | null;
  } | null>(null);
  const [selectedByProspect, setSelectedByProspect] = useState(false);
  const [showClosingProcessInfoModal, setShowClosingProcessInfoModal] = useState(false);
  const [isPassingToCierre, setIsPassingToCierre] = useState(false);

  // Cargar estado de la cotización y condición comercial
  useEffect(() => {
    const loadCotizacionStatus = async () => {
      try {
        setIsLoadingStatus(true);
        const result = await getCotizacionById(cotizacionId, studioSlug);
        if (result.success && result.data) {
          setCotizacionStatus(result.data.status);
          setCotizacionName(result.data.name || '');
          setSelectedByProspect(result.data.selected_by_prospect || false);

          // Cargar condición comercial si existe
          if (result.data.condiciones_comerciales_id) {
            const condicionResult = await obtenerCondicionComercial(studioSlug, result.data.condiciones_comerciales_id);
            if (condicionResult.success && condicionResult.data) {
              setCondicionComercial({
                id: condicionResult.data.id,
                name: condicionResult.data.name,
                description: condicionResult.data.description,
                advance_percentage: condicionResult.data.advance_percentage,
                advance_type: condicionResult.data.advance_type,
                advance_amount: condicionResult.data.advance_amount,
                discount_percentage: condicionResult.data.discount_percentage,
              });
            }
          }
        }
      } catch (error) {
        console.error('Error loading cotizacion status:', error);
      } finally {
        setIsLoadingStatus(false);
      }
    };

    loadCotizacionStatus();
  }, [cotizacionId, studioSlug]);

  const handlePasarACierreClick = () => {
    if (!promiseId) {
      toast.error('No se puede pasar a cierre sin una promesa asociada');
      return;
    }

    // Siempre mostrar modal de confirmación
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
        toast.success('Cotización pasada a proceso de cierre');
        router.push(`/${studioSlug}/studio/commercial/promises/${promiseId}`);
      } else {
        toast.error(result.error || 'Error al pasar cotización a cierre');
      }
    } catch (error) {
      console.error('[handlePasarACierre] Error:', error);
      toast.error('Error al pasar cotización a cierre');
    } finally {
      setIsPassingToCierre(false);
    }
  };

  // Verificar si la cotización ya está en cierre o autorizada
  const isInCierre = cotizacionStatus === 'en_cierre';
  const isAlreadyAuthorized =
    cotizacionStatus === 'autorizada' ||
    cotizacionStatus === 'aprobada' ||
    cotizacionStatus === 'approved';
  
  // Solo mostrar botón "Pasar a Cierre" si:
  // 1. El estado ya se cargó (no está cargando)
  // 2. NO está en cierre
  // 3. NO está autorizada/aprobada
  const canShowPasarACierre = !isLoadingStatus && !isInCierre && !isAlreadyAuthorized;

  return (
    <div className="w-full max-w-7xl mx-auto">
      <ZenCard variant="default" padding="none">
        <ZenCardHeader className="border-b border-zinc-800">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <ZenButton
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                disabled={isPassingToCierre}
                className="p-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </ZenButton>
              <div>
                <div className="flex items-center gap-2">
                  <ZenCardTitle>Editar Cotización</ZenCardTitle>
                  {condicionComercial && (
                    <ZenBadge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                      {condicionComercial.name}
                    </ZenBadge>
                  )}
                </div>
                <ZenCardDescription>
                  {condicionComercial?.description || 'Actualiza la información de la cotización'}
                </ZenCardDescription>
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
            redirectOnSuccess={`/${studioSlug}/studio/commercial/promises/${promiseId}`}
            onLoadingChange={setIsFormLoading}
            condicionComercialPreAutorizada={condicionComercial}
            isPreAutorizada={selectedByProspect}
            isAlreadyAuthorized={isAlreadyAuthorized}
            isDisabled={isPassingToCierre}
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
              toast.success('Cotización archivada exitosamente');
              setShowArchiveModal(false);
              router.push(`/${studioSlug}/studio/commercial/promises/${promiseId}`);
            } else {
              toast.error(result.error || 'Error al archivar cotización');
            }
          } catch {
            toast.error('Error al archivar cotización');
          } finally {
            setIsActionLoading(false);
          }
        }}
        title="Archivar Cotización"
        description="¿Estás seguro de archivar esta cotización? Podrás desarchivarla más tarde."
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
              toast.success('Cotización eliminada exitosamente');
              setShowArchiveModal(false);
              router.push(`/${studioSlug}/studio/commercial/promises/${promiseId}`);
            } else {
              toast.error(result.error || 'Error al eliminar cotización');
            }
          } catch {
            toast.error('Error al eliminar cotización');
          } finally {
            setIsActionLoading(false);
          }
        }}
        title="Eliminar Cotización"
        description="¿Estás seguro de eliminar esta cotización? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="destructive"
        loading={isActionLoading}
      />

      {/* Modal de Información de Proceso de Cierre */}
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

