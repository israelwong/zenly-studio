'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, FileText } from 'lucide-react';
import {
  ZenCard,
  ZenCardContent,
  ZenCardHeader,
  ZenCardTitle,
  ZenCardDescription,
  ZenButton,
  ZenBadge,
} from '@/components/ui/zen';
import { getCotizacionById } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import { crearRevisionCotizacion } from '@/lib/actions/studio/commercial/promises/cotizaciones-revision.actions';
import { CotizacionForm } from '@/app/[slug]/studio/commercial/promises/components/CotizacionForm';
import { toast } from 'sonner';

export default function EditarRevisionPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const studioSlug = params.slug as string;
  const promiseId = params.promiseId as string;
  const cotizacionId = params.cotizacionId as string;
  const originalId = searchParams.get('originalId');

  useEffect(() => {
    document.title = 'Zenly Studio - Revisión';
  }, []);

  const isNewRevision = cotizacionId === 'new' && originalId !== null;

  const [cotizacion, setCotizacion] = useState<{
    id: string;
    name: string;
    description: string | null;
    price: number;
    status: string;
    promise_id: string | null;
    contact_id: string | null;
    evento_id: string | null;
    revision_of_id: string | null;
    revision_number: number | null;
    revision_status: string | null;
    items: Array<{ item_id: string; quantity: number }>;
  } | null>(null);
  const [cotizacionOriginal, setCotizacionOriginal] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreatingRevision, setIsCreatingRevision] = useState(false);
  const pendingActionRef = React.useRef<'guardar' | 'autorizar' | null>(null);

  // Cargar datos de revisión y original
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Si es nueva revisión, cargar solo la original
        if (isNewRevision && originalId) {
          const originalResult = await getCotizacionById(originalId, studioSlug);
          if (originalResult.success && originalResult.data) {
            setCotizacionOriginal({
              id: originalResult.data.id,
              name: originalResult.data.name,
            });
            // Preparar datos de la original para el formulario
            setCotizacion({
              id: 'new',
              name: `${originalResult.data.name} - Revisión`,
              description: originalResult.data.description,
              price: originalResult.data.price,
              status: 'pendiente',
              promise_id: originalResult.data.promise_id,
              contact_id: originalResult.data.contact_id,
              evento_id: originalResult.data.evento_id,
              revision_of_id: originalId,
              revision_number: null,
              revision_status: null,
              items: originalResult.data.items,
            });
          } else {
            toast.error(originalResult.error || 'Error al cargar la cotización original');
            router.push(`/${studioSlug}/studio/commercial/promises/${promiseId}`);
            return;
          }
        } else {
          // Cargar revisión existente
          const cotizacionResult = await getCotizacionById(cotizacionId, studioSlug);

          if (cotizacionResult.success && cotizacionResult.data) {
            setCotizacion({
              ...cotizacionResult.data,
              revision_of_id: cotizacionResult.data.revision_of_id ?? null,
              revision_number: cotizacionResult.data.revision_number ?? null,
              revision_status: cotizacionResult.data.revision_status ?? null,
            });

            // Si es revisión, cargar cotización original
            if (cotizacionResult.data.revision_of_id) {
              const originalResult = await getCotizacionById(
                cotizacionResult.data.revision_of_id,
                studioSlug
              );
              if (originalResult.success && originalResult.data) {
                setCotizacionOriginal({
                  id: originalResult.data.id,
                  name: originalResult.data.name,
                });
              }
            }
          } else {
            toast.error(cotizacionResult.error || 'Error al cargar la revisión');
            router.push(`/${studioSlug}/studio/commercial/promises/${promiseId}`);
            return;
          }
        }
      } catch (error) {
        console.error('Error loading revision:', error);
        toast.error('Error al cargar la revisión');
        router.push(`/${studioSlug}/studio/commercial/promises/${promiseId}`);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [cotizacionId, studioSlug, promiseId, router, isNewRevision, originalId]);

  const handleCancel = () => {
    // Regresar a la página anterior (history back)
    router.back();
  };

  const handleCreateRevision = async (data: {
    nombre: string;
    descripcion?: string;
    precio: number;
    items: { [key: string]: number };
  }): Promise<{ success: boolean; revisionId?: string; error?: string }> => {
    if (!originalId) {
      return { success: false, error: 'No se encontró la cotización original' };
    }

    setIsCreatingRevision(true);
    try {
      const result = await crearRevisionCotizacion({
        studio_slug: studioSlug,
        cotizacion_original_id: originalId,
        nombre: data.nombre.trim(),
        descripcion: data.descripcion?.trim(),
        precio: data.precio,
        items: data.items,
      });

      if (!result.success) {
        setIsCreatingRevision(false);
        return { success: false, error: result.error };
      }

      if (result.data?.id) {
        setIsCreatingRevision(false);
        // Redirigir según la acción pendiente (usar ref para valor inmediato)
        const action = pendingActionRef.current;
        if (action === 'autorizar') {
          router.push(`/${studioSlug}/studio/commercial/promises/${promiseId}/cotizacion/${result.data.id}/revision/autorizar`);
        } else if (action === 'guardar') {
          // Guardar borrador: redirigir a promiseId y refrescar para ver cambios
          router.push(`/${studioSlug}/studio/commercial/promises/${promiseId}`);
          router.refresh(); // Forzar recarga de datos del servidor
        } else {
          // Por defecto, redirigir a la página de edición de la revisión creada
          router.push(`/${studioSlug}/studio/commercial/promises/${promiseId}/cotizacion/${result.data.id}/revision`);
        }
        pendingActionRef.current = null;
        return { success: true, revisionId: result.data.id };
      }

      setIsCreatingRevision(false);
      return { success: false, error: 'No se pudo obtener el ID de la revisión' };
    } catch (error) {
      setIsCreatingRevision(false);
      return { success: false, error: error instanceof Error ? error.message : 'Error al crear revisión' };
    }
  };

  const handleGuardarBorrador = async () => {
    if (isNewRevision) {
      // Si es nueva revisión, establecer acción pendiente usando ref para acceso inmediato
      pendingActionRef.current = 'guardar';
    }
    // Disparar submit del formulario usando requestSubmit para evitar recarga de página
    // Si es nueva revisión, onCreateAsRevision creará la revisión y redirigirá a promiseId
    // Si ya existe, updateCotizacion actualizará y redirigirá usando redirectOnSuccess
    const form = document.querySelector('form') as HTMLFormElement;
    if (form && typeof form.requestSubmit === 'function') {
      form.requestSubmit();
    } else if (form) {
      // Fallback para navegadores que no soportan requestSubmit
      const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
      form.dispatchEvent(submitEvent);
    }
  };

  const handleAutorizarRevision = async () => {
    // Establecer acción pendiente para guardar antes de autorizar
    pendingActionRef.current = 'autorizar';

    // Disparar submit del formulario para guardar cambios
    const form = document.querySelector('form') as HTMLFormElement;
    if (form && typeof form.requestSubmit === 'function') {
      form.requestSubmit();
    } else if (form) {
      // Fallback para navegadores que no soportan requestSubmit
      const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
      form.dispatchEvent(submitEvent);
    }
  };

  const handleAfterSave = () => {
    // Redirigir según la acción pendiente
    const action = pendingActionRef.current;
    if (action === 'autorizar') {
      router.push(`/${studioSlug}/studio/commercial/promises/${promiseId}/cotizacion/${cotizacionId}/revision/autorizar`);
    } else {
      router.push(`/${studioSlug}/studio/commercial/promises/${promiseId}`);
      router.refresh();
    }
    // Limpiar acción pendiente
    pendingActionRef.current = null;
  };

  // Si no hay datos de cotización, mostrar skeleton completo (clon del CotizacionForm skeleton)
  if (!cotizacion && loading) {
    return (
      <div className="w-full max-w-7xl mx-auto">
        <ZenCard variant="default" padding="none">
          <ZenCardHeader className="border-b border-zinc-800">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-zinc-800 rounded animate-pulse" />
                <div className="space-y-2">
                  <div className="h-6 w-48 bg-zinc-800 rounded animate-pulse" />
                  <div className="h-4 w-64 bg-zinc-800 rounded animate-pulse" />
                </div>
              </div>
              <div className="h-10 w-48 bg-zinc-800 rounded animate-pulse" />
            </div>
          </ZenCardHeader>

          <ZenCardContent className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Columna 1: Servicios Disponibles - Skeleton */}
              <div className="lg:col-span-2">
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-6 w-48 bg-zinc-800 rounded animate-pulse" />
                    <div className="h-5 w-16 bg-zinc-800 rounded-full animate-pulse" />
                  </div>
                  <div className="h-10 w-full bg-zinc-800 rounded-lg animate-pulse" />
                </div>

                <div className="space-y-2">
                  {[...Array(3)].map((_, seccionIndex) => (
                    <div key={`skeleton-seccion-${seccionIndex}`} className="border border-zinc-700 rounded-lg overflow-hidden">
                      <div className="p-4 bg-zinc-800/30">
                        <div className="flex items-center gap-3">
                          <div className="h-4 w-4 bg-zinc-700 rounded animate-pulse" />
                          <div className="h-5 w-32 bg-zinc-700 rounded animate-pulse" />
                          <div className="h-5 w-24 bg-zinc-700 rounded-full animate-pulse ml-auto" />
                        </div>
                      </div>
                      <div className="bg-zinc-900/50">
                        {[...Array(2)].map((_, categoriaIndex) => (
                          <div key={`skeleton-categoria-${categoriaIndex}`} className={categoriaIndex > 0 ? 'border-t border-zinc-700/50' : ''}>
                            <div className="p-3 pl-8">
                              <div className="flex items-center gap-3">
                                <div className="h-3 w-3 bg-zinc-700 rounded animate-pulse" />
                                <div className="h-4 w-28 bg-zinc-700 rounded animate-pulse" />
                                <div className="h-4 w-20 bg-zinc-700 rounded-full animate-pulse ml-auto" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Columna 2: Configuración - Skeleton */}
              <div className="lg:sticky lg:top-6">
                <div className="space-y-4">
                  <div>
                    <div className="h-6 w-32 bg-zinc-800 rounded animate-pulse mb-4" />
                    <div className="space-y-4">
                      <div>
                        <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse mb-2" />
                        <div className="h-10 w-full bg-zinc-800 rounded-lg animate-pulse" />
                      </div>
                      <div>
                        <div className="h-4 w-28 bg-zinc-800 rounded animate-pulse mb-2" />
                        <div className="h-20 w-full bg-zinc-800 rounded-lg animate-pulse" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="h-6 w-40 bg-zinc-800 rounded animate-pulse mb-4" />
                    <div className="bg-zinc-800/50 rounded-lg p-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="h-3 w-20 bg-zinc-700 rounded animate-pulse mb-2" />
                          <div className="h-10 w-full bg-zinc-700 rounded animate-pulse" />
                        </div>
                        <div>
                          <div className="h-3 w-24 bg-zinc-700 rounded animate-pulse mb-2" />
                          <div className="h-10 w-full bg-zinc-700 rounded animate-pulse" />
                        </div>
                      </div>
                      <div>
                        <div className="h-4 w-24 bg-zinc-700 rounded animate-pulse mb-2" />
                        <div className="h-8 w-32 bg-zinc-700 rounded animate-pulse" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ZenCardContent>
        </ZenCard>
      </div>
    );
  }

  if (!cotizacion) {
    return null;
  }

  const revisionNumber = cotizacion.revision_number || (isNewRevision ? 'Nueva' : 1);
  const isAuthorized = cotizacion.status === 'aprobada' || cotizacion.status === 'autorizada';
  const eventoId = cotizacion.evento_id;

  return (
    <div className="w-full max-w-7xl mx-auto">
      <ZenCard variant="default" padding="none">
        <ZenCardHeader className="border-b border-zinc-800">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <ZenButton
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                className="p-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </ZenButton>
              <div>
                <div className="flex items-center gap-2">
                  <ZenCardTitle>
                    {isAuthorized ? 'Revisión Autorizada' : `Editar Revisión #${revisionNumber}`}
                  </ZenCardTitle>
                  <ZenBadge variant={isAuthorized ? 'success' : 'secondary'}>
                    {isAuthorized ? 'Autorizada' : 'Revisión Pendiente'}
                  </ZenBadge>
                </div>
                <ZenCardDescription>
                  {cotizacionOriginal && (
                    <span className="text-zinc-400">
                      Revisión de: <span className="text-zinc-300 font-medium">{cotizacionOriginal.name}</span>
                    </span>
                  )}
                </ZenCardDescription>
              </div>
            </div>
            {isAuthorized && eventoId ? (
              <ZenButton
                variant="primary"
                onClick={() => router.push(`/${studioSlug}/studio/business/events/${eventoId}`)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white focus-visible:ring-emerald-500/50"
              >
                Gestionar Evento
              </ZenButton>
            ) : !isAuthorized ? (
              <ZenButton
                variant="primary"
                onClick={handleAutorizarRevision}
                className="bg-emerald-600 hover:bg-emerald-700 text-white focus-visible:ring-emerald-500/50"
                loading={isCreatingRevision}
              >
                Pasar a Autorización
              </ZenButton>
            ) : null}
          </div>
        </ZenCardHeader>

        {/* Información de revisión */}
        {cotizacionOriginal && (
          <div className="border-b border-zinc-800 bg-zinc-900/30 p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-900/20 rounded-lg">
                <FileText className="h-5 w-5 text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-zinc-300 font-medium mb-1">
                  Información de la Revisión
                </p>
                <p className="text-xs text-zinc-400">
                  Esta revisión reemplazará la cotización &quot;{cotizacionOriginal.name}&quot; una vez autorizada.
                  Puedes editar los items libremente y guardar como borrador para continuar después.
                </p>
              </div>
            </div>
          </div>
        )}

        <ZenCardContent className="p-6">
          {/* Usar CotizacionForm sin contacto ni configuraciones comerciales */}
          <CotizacionForm
            studioSlug={studioSlug}
            promiseId={promiseId}
            cotizacionId={isNewRevision ? undefined : cotizacionId}
            revisionOriginalId={originalId || cotizacion?.revision_of_id || null}
            onCreateAsRevision={isNewRevision ? handleCreateRevision : undefined}
            onAfterSave={!isNewRevision ? handleAfterSave : undefined}
            customActionButtons={
              isAuthorized ? (
                // Si está autorizada, solo mostrar botón Cerrar
                <div className="border-t border-zinc-700 pt-3 mt-4">
                  <div className="flex justify-end">
                    <ZenButton
                      type="button"
                      variant="secondary"
                      onClick={handleCancel}
                    >
                      Cerrar
                    </ZenButton>
                  </div>
                </div>
              ) : (
                // Si está pendiente, mostrar Cancelar y Guardar Borrador
                <div className="border-t border-zinc-700 pt-3 mt-4">
                  <div className="flex gap-2">
                    <ZenButton
                      type="button"
                      variant="secondary"
                      onClick={handleCancel}
                      disabled={isCreatingRevision}
                      className="flex-1"
                    >
                      Cancelar
                    </ZenButton>
                    <ZenButton
                      type="button"
                      variant="primary"
                      onClick={handleGuardarBorrador}
                      loading={isCreatingRevision}
                      disabled={isCreatingRevision}
                      className="flex-1"
                    >
                      Guardar Borrador
                    </ZenButton>
                  </div>
                </div>
              )
            }
          />

        </ZenCardContent>
      </ZenCard>
    </div>
  );
}
