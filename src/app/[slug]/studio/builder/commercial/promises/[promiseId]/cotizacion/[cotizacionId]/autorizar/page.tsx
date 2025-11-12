'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription, ZenButton } from '@/components/ui/zen';
import { getCotizacionById } from '@/lib/actions/studio/builder/commercial/promises/cotizaciones.actions';
import { getPromiseById } from '@/lib/actions/studio/builder/commercial/promises/promise-logs.actions';
import { toast } from 'sonner';
import { ResumenCotizacion } from './components/ResumenCotizacion';
import { DatosContratante } from './components/DatosContratante';
import { CondicionesComercialesSelector } from './components/CondicionesComercialesSelector';
import { autorizarCotizacion } from '@/lib/actions/studio/builder/commercial/promises/cotizaciones.actions';

export default function AutorizarCotizacionPage() {
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
    items: Array<{ item_id: string; quantity: number }>;
  } | null>(null);
  const [promise, setPromise] = useState<{
    contact_name: string;
    contact_phone: string;
    contact_email: string | null;
    event_type_name: string | null;
    interested_dates: string[] | null;
    defined_date: Date | null;
  } | null>(null);

  // Estados del formulario
  const [condicionComercialId, setCondicionComercialId] = useState<string | null>(null);
  const [monto, setMonto] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [cotizacionResult, promiseResult] = await Promise.all([
          getCotizacionById(cotizacionId, studioSlug),
          getPromiseById(promiseId),
        ]);

        if (cotizacionResult.success && cotizacionResult.data) {
          setCotizacion(cotizacionResult.data);
          // Inicializar monto con el precio de la cotización
          setMonto(cotizacionResult.data.price.toString());
        } else {
          toast.error(cotizacionResult.error || 'Cotización no encontrada');
          router.push(`/${studioSlug}/studio/builder/commercial/promises/${promiseId}`);
          return;
        }

        if (promiseResult.success && promiseResult.data) {
          setPromise({
            contact_name: promiseResult.data.contact_name,
            contact_phone: promiseResult.data.contact_phone,
            contact_email: promiseResult.data.contact_email,
            event_type_name: promiseResult.data.event_type_name,
            interested_dates: promiseResult.data.interested_dates,
            defined_date: promiseResult.data.defined_date,
          });
        } else {
          toast.error(promiseResult.error || 'Error al cargar datos de la promesa');
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Error al cargar datos');
        router.push(`/${studioSlug}/studio/builder/commercial/promises/${promiseId}`);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [cotizacionId, studioSlug, promiseId, router]);


  const handleAutorizar = async () => {
    if (!condicionComercialId || !monto) {
      toast.error('Por favor selecciona una condición comercial');
      return;
    }

    try {
      setIsSubmitting(true);

      const result = await autorizarCotizacion({
        studio_slug: studioSlug,
        cotizacion_id: cotizacionId,
        promise_id: promiseId,
        condiciones_comerciales_id: condicionComercialId,
        monto: parseFloat(monto),
      });

      if (result.success) {
        toast.success('Cotización autorizada exitosamente');
        // Redirigir al detalle del evento si existe
        if (result.data?.evento_id) {
          router.push(`/${studioSlug}/studio/builder/business/events/${result.data.evento_id}`);
        } else {
          router.push(`/${studioSlug}/studio/builder/commercial/promises/${promiseId}`);
        }
      } else {
        toast.error(result.error || 'Error al autorizar cotización');
      }
    } catch (error) {
      console.error('Error autorizando cotización:', error);
      toast.error('Error al autorizar cotización');
    } finally {
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
                    {/* Items skeleton - Expandido para simetría visual */}
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

  return (
    <div className="w-full max-w-7xl mx-auto">
      <ZenCard variant="default" padding="none">
        <ZenCardHeader className="border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <ZenButton
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/${studioSlug}/studio/builder/commercial/promises/${promiseId}`)}
              className="p-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </ZenButton>
            <div className="p-2 bg-emerald-600/20 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <ZenCardTitle>Autorizar Cotización</ZenCardTitle>
              <ZenCardDescription>
                Selecciona las condiciones comerciales para autorizar esta cotización
              </ZenCardDescription>
            </div>
          </div>
        </ZenCardHeader>

        <ZenCardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Columna 1: Resumen de Cotización */}
            <div className="space-y-6">
              <ResumenCotizacion cotizacion={cotizacion} />
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
              />

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
                  onClick={() => router.push(`/${studioSlug}/studio/builder/commercial/promises/${promiseId}`)}
                >
                  Cancelar
                </ZenButton>
                <ZenButton
                  variant="primary"
                  onClick={handleAutorizar}
                  disabled={!condicionComercialId || !monto || isSubmitting}
                  loading={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white focus-visible:ring-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Autorizando...' : 'Autorizar Cotización'}
                </ZenButton>
              </div>
            </div>
          </div>
        </ZenCardContent>
      </ZenCard>
    </div>
  );
}

