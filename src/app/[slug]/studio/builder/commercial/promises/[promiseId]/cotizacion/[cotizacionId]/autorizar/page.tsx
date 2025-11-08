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
import { MetodoPagoSelector } from './components/MetodoPagoSelector';

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
  const [metodoPagoId, setMetodoPagoId] = useState<string | null>(null);
  const [monto, setMonto] = useState<string>('');

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

  const handleAutorizar = () => {
    // TODO: Implementar lógica de autorización
    toast.info('Funcionalidad de autorización pendiente de implementar');
  };

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto">
        <ZenCard>
          <ZenCardContent className="p-6">
            <div className="flex items-center justify-center py-12">
              <div className="text-zinc-400">Cargando cotización...</div>
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
                Confirma las condiciones comerciales y método de pago para autorizar esta cotización
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

              {/* Método de Pago */}
              <MetodoPagoSelector
                studioSlug={studioSlug}
                selectedId={metodoPagoId}
                onSelect={setMetodoPagoId}
              />

              {/* Monto Final */}
              <ZenCard variant="outlined">
                <ZenCardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white">Monto a autorizar</h3>
                      <p className="text-sm text-zinc-400 mt-1">
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
                  disabled={!condicionComercialId || !metodoPagoId || !monto}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white focus-visible:ring-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Autorizar Cotización
                </ZenButton>
              </div>
            </div>
          </div>
        </ZenCardContent>
      </ZenCard>
    </div>
  );
}

