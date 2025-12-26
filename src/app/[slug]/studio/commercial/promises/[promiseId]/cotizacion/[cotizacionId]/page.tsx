'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, MoreVertical, Archive, Trash2 } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription, ZenButton, ZenConfirmModal, ZenDropdownMenu, ZenDropdownMenuTrigger, ZenDropdownMenuContent, ZenDropdownMenuItem, ZenDropdownMenuSeparator } from '@/components/ui/zen';
import { CotizacionForm } from '../../../components/CotizacionForm';
import { archiveCotizacion, deleteCotizacion, getCotizacionById } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import { getPromiseById } from '@/lib/actions/studio/commercial/promises/promise-logs.actions';
import { obtenerCondicionComercial } from '@/lib/actions/studio/config/condiciones-comerciales.actions';
import { ZenBadge } from '@/components/ui/zen';
import { toast } from 'sonner';

export default function EditarCotizacionPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const studioSlug = params.slug as string;
  const promiseId = params.promiseId as string;
  const cotizacionId = params.cotizacionId as string;
  const contactId = searchParams.get('contactId');

  useEffect(() => {
    document.title = 'ZEN Studio - Cotización';
  }, []);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isFormLoading, setIsFormLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isValidatingDate, setIsValidatingDate] = useState(false);
  const [cotizacionStatus, setCotizacionStatus] = useState<string | null>(null);
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

  // Cargar estado de la cotización y condición comercial
  useEffect(() => {
    const loadCotizacionStatus = async () => {
      try {
        const result = await getCotizacionById(cotizacionId, studioSlug);
        if (result.success && result.data) {
          setCotizacionStatus(result.data.status);
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
      }
    };

    loadCotizacionStatus();
  }, [cotizacionId, studioSlug]);

  const handleAutorizar = async () => {
    // Validar que la cotización no esté ya autorizada
    if (isAlreadyAuthorized) {
      toast.error('Esta cotización ya está autorizada');
      return;
    }

    // Validar que exista al menos una fecha definida
    try {
      setIsValidatingDate(true);
      const result = await getPromiseById(promiseId);

      if (result.success && result.data) {
        // Usar event_date como campo principal (estándar actual)
        // También verificar defined_date e interested_dates como fallback para compatibilidad
        const hasDate = result.data.event_date ||
          result.data.defined_date ||
          (result.data.interested_dates && result.data.interested_dates.length > 0);

        if (!hasDate) {
          toast.error('Debe existir al menos una fecha definida para autorizar la cotización');
          setIsValidatingDate(false);
          return;
        }

        // Si hay fecha, redirigir
        router.push(`/${studioSlug}/studio/commercial/promises/${promiseId}/cotizacion/${cotizacionId}/autorizar`);
      } else {
        toast.error('Error al validar la promesa');
      }
    } catch (error) {
      console.error('Error validating promise:', error);
      toast.error('Error al validar la promesa');
    } finally {
      setIsValidatingDate(false);
    }
  };

  // Verificar si la cotización ya está autorizada o aprobada
  // Regla de negocio: Solo se puede autorizar si la cotización NO está autorizada/aprobada
  // Una promesa puede tener múltiples cotizaciones aprobadas, así que no restringimos por otras cotizaciones
  const isAlreadyAuthorized =
    cotizacionStatus === 'autorizada' ||
    cotizacionStatus === 'aprobada' ||
    cotizacionStatus === 'approved';

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
              {!isAlreadyAuthorized && (
                <ZenButton
                  variant="primary"
                  size="md"
                  onClick={handleAutorizar}
                  disabled={isFormLoading || isActionLoading || isValidatingDate}
                  loading={isValidatingDate}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white focus-visible:ring-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Autorizar ahora
                </ZenButton>
              )}
              <ZenDropdownMenu>
                <ZenDropdownMenuTrigger asChild>
                  <ZenButton
                    variant="ghost"
                    size="md"
                    disabled={isFormLoading || isActionLoading}
                    className="h-9 w-9 p-0"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </ZenButton>
                </ZenDropdownMenuTrigger>
                <ZenDropdownMenuContent align="end">
                  <ZenDropdownMenuItem
                    onClick={() => setShowArchiveModal(true)}
                    disabled={isActionLoading}
                  >
                    <Archive className="h-4 w-4 mr-2" />
                    Archivar
                  </ZenDropdownMenuItem>
                  <ZenDropdownMenuSeparator />
                  <ZenDropdownMenuItem
                    onClick={() => setShowDeleteModal(true)}
                    disabled={isActionLoading}
                    className="text-red-400 focus:text-red-300"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar
                  </ZenDropdownMenuItem>
                </ZenDropdownMenuContent>
              </ZenDropdownMenu>
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
            onAutorizar={handleAutorizar}
            isAutorizando={isValidatingDate}
            isAlreadyAuthorized={isAlreadyAuthorized}
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
    </div>
  );
}

