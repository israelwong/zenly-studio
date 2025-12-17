'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription, ZenButton } from '@/components/ui/zen';
import { getCotizacionById } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import { getPromiseById } from '@/lib/actions/studio/commercial/promises/promise-logs.actions';
import { toast } from 'sonner';
import { ResumenCotizacion } from '@/components/shared/cotizaciones';
import { DatosContratante } from '../../autorizar/components/DatosContratante';
import { CondicionesComercialesSelector } from '../../autorizar/components/CondicionesComercialesSelector';
import { autorizarRevisionCotizacion } from '@/lib/actions/studio/commercial/promises/cotizaciones-revision.actions';

export default function AutorizarRevisionPage() {
  const params = useParams();
  const router = useRouter();
  const studioSlug = params.slug as string;
  const promiseId = params.promiseId as string;
  const cotizacionId = params.cotizacionId as string;

  const [loading, setLoading] = useState(true);
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
    items: Array<{
      item_id: string;
      quantity: number;
      unit_price: number;
      subtotal: number;
      cost: number;
      expense: number;
      name: string | null;
      description: string | null;
      category_name: string | null;
      seccion_name: string | null;
    }>;
  } | null>(null);
  const [cotizacionOriginal, setCotizacionOriginal] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [promise, setPromise] = useState<{
    contact_name: string;
    contact_phone: string;
    contact_email: string | null;
    event_type_name: string | null;
    event_date: Date | null;
    interested_dates: string[] | null;
    defined_date: Date | null;
  } | null>(null);

  // Estados del formulario
  const [condicionComercialId, setCondicionComercialId] = useState<string | null>(null);
  const [monto, setMonto] = useState<string>('');
  const [migrarDependencias, setMigrarDependencias] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [cotizacionResult, promiseResult] = await Promise.all([
          getCotizacionById(cotizacionId, studioSlug),
          getPromiseById(promiseId),
        ]);

        if (cotizacionResult.success && cotizacionResult.data) {
          // Validar que sea una revisión
          if (!cotizacionResult.data.revision_of_id) {
            toast.error('Esta cotización no es una revisión');
            router.push(`/${studioSlug}/studio/commercial/promises/${promiseId}`);
            return;
          }

          setCotizacion({
            ...cotizacionResult.data,
            evento_id: cotizacionResult.data.evento_id || null,
            revision_of_id: cotizacionResult.data.revision_of_id || null,
            revision_number: cotizacionResult.data.revision_number || null,
          });
          // Inicializar monto con el precio de la cotización
          setMonto(cotizacionResult.data.price.toString());

          // Cargar cotización original
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
              // Si la revisión no tiene evento_id pero la original s?, usar el de la original
              if (!cotizacionResult.data.evento_id && originalResult.data.evento_id) {
                setCotizacion({
                  ...cotizacionResult.data,
                  evento_id: originalResult.data.evento_id,
                  revision_of_id: cotizacionResult.data.revision_of_id || null,
                  revision_number: cotizacionResult.data.revision_number || null,
                });
              }
            }
          }
        } else {
          toast.error(cotizacionResult.error || 'Revisión no encontrada');
          router.push(`/${studioSlug}/studio/commercial/promises/${promiseId}`);
          return;
        }

        if (promiseResult.success && promiseResult.data) {
          setPromise({
            contact_name: promiseResult.data.contact_name,
            contact_phone: promiseResult.data.contact_phone,
            contact_email: promiseResult.data.contact_email,
            event_type_name: promiseResult.data.event_type_name,
            event_date: promiseResult.data.event_date,
            interested_dates: promiseResult.data.interested_dates,
            defined_date: promiseResult.data.defined_date,
          });
        } else {
          toast.error(promiseResult.error || 'Error al cargar datos de la promesa');
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Error al cargar datos');
        router.push(`/${studioSlug}/studio/commercial/promises/${promiseId}`);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [cotizacionId, studioSlug, promiseId, router]);

  const handleAutorizar = async () => {
    if (!condicionComercialId || !monto || isSubmitting || isRedirecting) {
      return;
    }

    try {
      setIsSubmitting(true);

      const result = await autorizarRevisionCotizacion({
        studio_slug: studioSlug,
        revision_id: cotizacionId,
        promise_id: promiseId,
        condiciones_comerciales_id: condicionComercialId,
        monto: parseFloat(monto),
        migrar_dependencias: migrarDependencias,
      });

      if (result.success) {
        toast.success('Revisión autorizada exitosamente');
        setIsSubmitting(false);
        setIsRedirecting(true);

        // Redirigir al detalle del evento si existe
        const eventoId = result.data?.evento_id || cotizacion?.evento_id;
        if (eventoId) {
          router.push(`/${studioSlug}/studio/business/events/${eventoId}`);
        } else {
          router.push(`/${studioSlug}/studio/commercial/promises/${promiseId}`);
        }
      } else {
        toast.error(result.error || 'Error al autorizar revisión');
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('Error autorizando revisión:', error);
      toast.error('Error al autorizar revisión');
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto">
        <ZenCard variant="default" padding="none">
          {/* Header Skeleton */}
          <ZenCardHeader className="border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-zinc-800 rounded animate-pulse" />
              <div className="h-5 w-5 bg-zinc-800 rounded-lg animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-6 w-48 bg-zinc-800 rounded animate-pulse" />
                <div className="h-4 w-96 bg-zinc-800 rounded animate-pulse" />
              </div>
            </div>
          </ZenCardHeader>

          <ZenCardContent className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Columna 1: Resumen de Cotización Skeleton */}
              <div className="space-y-6">
                <ZenCard variant="outlined" className="h-full">
                  <ZenCardHeader>
                    <div className="flex items-center justify-between">
                      <div className="h-5 w-32 bg-zinc-800 rounded animate-pulse" />
                      <div className="h-8 w-8 bg-zinc-800 rounded animate-pulse" />
                    </div>
                  </ZenCardHeader>
                  <ZenCardContent className="space-y-4 flex-1">
                    {/* Descripción skeleton */}
                    <div className="pb-4 border-b border-zinc-700">
                      <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse mb-2" />
                      <div className="h-16 w-full bg-zinc-800 rounded animate-pulse" />
                    </div>
                    {/* Items skeleton */}
                    <div className="space-y-3 flex-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="space-y-2">
                          <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" />
                          <div className="pl-4 space-y-1">
                            <div className="h-3 w-24 bg-zinc-800/70 rounded animate-pulse" />
                            <div className="pl-4 space-y-1">
                              {[1, 2, 3].map((j) => (
                                <div key={j} className="grid grid-cols-[1fr_60px_100px] gap-2">
                                  <div className="h-4 w-full bg-zinc-800/70 rounded animate-pulse" />
                                  <div className="h-4 w-12 bg-zinc-800/70 rounded animate-pulse ml-auto" />
                                  <div className="h-4 w-16 bg-zinc-800/70 rounded animate-pulse ml-auto" />
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ZenCardContent>
                </ZenCard>
              </div>

              {/* Columna 2: Formulario de Autorización Skeleton */}
              <div className="space-y-6">
                {/* Datos del Contratante Skeleton */}
                <ZenCard variant="outlined">
                  <ZenCardHeader>
                    <div className="flex items-center gap-3">
                      <div className="h-5 w-5 bg-zinc-800 rounded-lg animate-pulse" />
                      <div className="h-5 w-40 bg-zinc-800 rounded animate-pulse" />
                    </div>
                  </ZenCardHeader>
                  <ZenCardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="h-3 w-16 bg-zinc-800 rounded animate-pulse" />
                      <div className="h-5 w-full bg-zinc-800 rounded animate-pulse" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 w-20 bg-zinc-800 rounded animate-pulse" />
                      <div className="h-5 w-full bg-zinc-800 rounded animate-pulse" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 w-16 bg-zinc-800 rounded animate-pulse" />
                      <div className="h-5 w-full bg-zinc-800 rounded animate-pulse" />
                    </div>
                  </ZenCardContent>
                </ZenCard>

                {/* Condiciones Comerciales Skeleton */}
                <ZenCard variant="outlined">
                  <ZenCardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-5 w-5 bg-zinc-800 rounded-lg animate-pulse" />
                        <div className="h-5 w-48 bg-zinc-800 rounded animate-pulse" />
                      </div>
                      <div className="h-8 w-24 bg-zinc-800 rounded animate-pulse" />
                    </div>
                  </ZenCardHeader>
                  <ZenCardContent className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="p-4 border border-zinc-700 rounded-lg bg-zinc-800/30 animate-pulse">
                        <div className="flex items-start gap-3">
                          <div className="h-4 w-4 bg-zinc-700 rounded-full mt-1" />
                          <div className="flex-1 space-y-2">
                            <div className="h-5 w-32 bg-zinc-700 rounded" />
                            <div className="h-4 w-full bg-zinc-700 rounded" />
                            <div className="flex gap-4 mt-2">
                              <div className="h-4 w-24 bg-zinc-700 rounded" />
                              <div className="h-4 w-24 bg-zinc-700 rounded" />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </ZenCardContent>
                </ZenCard>

                {/* Monto Total Skeleton */}
                <ZenCard variant="outlined">
                  <ZenCardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="h-6 w-32 bg-zinc-800 rounded animate-pulse" />
                        <div className="h-4 w-64 bg-zinc-800 rounded animate-pulse" />
                      </div>
                      <div className="h-8 w-32 bg-zinc-800 rounded animate-pulse" />
                    </div>
                  </ZenCardContent>
                </ZenCard>

                {/* Botones de Acción Skeleton */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                  <div className="h-10 w-24 bg-zinc-800 rounded animate-pulse" />
                  <div className="h-10 w-40 bg-zinc-800 rounded animate-pulse" />
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

  const revisionNumber = cotizacion.revision_number || 1;

  return (
    <div className="w-full max-w-7xl mx-auto">
      <ZenCard variant="default" padding="none">
        <ZenCardHeader className="border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <ZenButton
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/${studioSlug}/studio/commercial/promises/${promiseId}/cotizacion/${cotizacionId}/revision`)}
              className="p-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </ZenButton>
            <div className={`p-2 rounded-lg bg-emerald-600/20`}>
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <ZenCardTitle>Autorizar Revisión #{revisionNumber}</ZenCardTitle>
              </div>
              <ZenCardDescription>
                {cotizacionOriginal && (
                  <span className="text-zinc-400">
                    Esta revisión reemplazará la cotización &ldquo;{cotizacionOriginal.name}&rdquo; una vez autorizada.
                  </span>
                )}
              </ZenCardDescription>
            </div>
          </div>
        </ZenCardHeader>

        <ZenCardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Columna 1: Resumen de Cotización */}
            <div className="space-y-6">
              <ResumenCotizacion cotizacion={cotizacion} isRevision={true} />
            </div>

            {/* Columna 2: Formulario de Autorización */}
            <div className="space-y-6">
              {/* Datos del Contratante */}
              {promise && <DatosContratante promise={promise} />}

              {/* Condiciones Comerciales */}
              <CondicionesComercialesSelector
                studioSlug={studioSlug}
                selectedId={condicionComercialId}
                onSelect={setCondicionComercialId}
                precioBase={cotizacion.price}
                onMontoChange={setMonto}
                disabled={isSubmitting || isRedirecting}
              />

              {/* Migrar Dependencias */}
              <ZenCard variant="outlined">
                <ZenCardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="migrarDependencias"
                      checked={migrarDependencias}
                      onChange={(e) => setMigrarDependencias(e.target.checked)}
                      disabled={isSubmitting || isRedirecting}
                      className="w-4 h-4 text-emerald-600 bg-zinc-900 border-zinc-700 rounded focus:ring-emerald-500 disabled:opacity-50"
                    />
                    <label htmlFor="migrarDependencias" className="text-sm text-zinc-300 cursor-pointer">
                      Migrar dependencias automáticamente (tareas del scheduler y asignaciones de personal)
                    </label>
                  </div>
                </ZenCardContent>
              </ZenCard>

              {/* Monto Total */}
              <ZenCard variant="outlined">
                <ZenCardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1">Monto Total</h3>
                      <p className="text-sm text-zinc-400">
                        Monto final después de aplicar condiciones comerciales
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-emerald-400">
                        ${parseFloat(monto || '0').toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </ZenCardContent>
              </ZenCard>

              {/* Botones de Acción */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                <ZenButton
                  variant="ghost"
                  onClick={() => router.push(`/${studioSlug}/studio/commercial/promises/${promiseId}`)}
                  disabled={isSubmitting || isRedirecting}
                >
                  Cancelar
                </ZenButton>
                <ZenButton
                  variant="primary"
                  onClick={handleAutorizar}
                  disabled={!condicionComercialId || !monto || isSubmitting || isRedirecting}
                  loading={isSubmitting || isRedirecting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white focus-visible:ring-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRedirecting
                    ? 'Redirigiendo...'
                    : isSubmitting
                      ? 'Autorizando...'
                      : 'Autorizar y Reemplazar'}
                </ZenButton>
              </div>
            </div>
          </div>
        </ZenCardContent>
      </ZenCard>
    </div>
  );
}
