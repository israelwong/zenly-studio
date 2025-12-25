'use client';

import { ZenCard, ZenCardHeader, ZenCardTitle, ZenCardContent, ZenSidebarTrigger } from '@/components/ui/zen';
import { ToastContainer } from '@/components/client';
import { useToast } from '@/hooks/useToast';
import { useEvento } from '../context/EventoContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { ServiciosContratadosTree } from './components/ServiciosContratadosTree';
import { ResumenPago } from '../components/ResumenPago';

export default function EventoCotizacionesPage() {
  const { evento, studioInfo } = useEvento();
  usePageTitle({ sectionName: 'cotizaciones', studioName: studioInfo?.studio_name });
  const { toasts, removeToast } = useToast();

  const tieneMultiplesCotizaciones = evento.cotizaciones.length > 1;

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Page Header */}
      <div className="sticky top-0 z-20 bg-zinc-900/10 backdrop-blur-sm -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 pt-4 pb-4 mb-8 lg:static lg:bg-transparent lg:backdrop-blur-none">
        <div className="flex items-center gap-3 mb-2">
          <ZenSidebarTrigger className="lg:hidden" />
          <h1 className="text-3xl font-bold text-zinc-100">
            {tieneMultiplesCotizaciones ? 'Cotizaciones' : 'Cotización'}
          </h1>
        </div>
        <p className="text-zinc-400">Detalles de servicios y pagos</p>
      </div>

      {/* Si hay múltiples cotizaciones, mostrar cards */}
      {tieneMultiplesCotizaciones ? (
        <div className="space-y-6">
          {evento.cotizaciones.map((cotizacion) => (
            <ZenCard key={cotizacion.id}>
              <ZenCardHeader>
                <ZenCardTitle>{cotizacion.name}</ZenCardTitle>
              </ZenCardHeader>
              <ZenCardContent>
                <div className="grid gap-8 lg:grid-cols-2">
                  <div>
                    <ServiciosContratadosTree servicios={cotizacion.servicios} />
                  </div>
                  <div>
                    <ResumenPago
                      eventoId={evento.id}
                      total={cotizacion.total}
                      pagado={cotizacion.pagado}
                      pendiente={cotizacion.pendiente}
                      descuento={cotizacion.descuento}
                    />
                  </div>
                </div>
              </ZenCardContent>
            </ZenCard>
          ))}

          {/* Resumen total consolidado */}
          <ZenCard>
            <ZenCardHeader>
              <ZenCardTitle>Resumen Total</ZenCardTitle>
            </ZenCardHeader>
            <ZenCardContent>
              <ResumenPago
                eventoId={evento.id}
                total={evento.total}
                pagado={evento.pagado}
                pendiente={evento.pendiente}
                descuento={evento.descuento}
              />
            </ZenCardContent>
          </ZenCard>
        </div>
      ) : (
        /* Si solo hay una cotización, mostrar sin card */
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <ServiciosContratadosTree servicios={evento.cotizaciones[0].servicios} />
          </div>
          <div className="space-y-6">
            <ResumenPago
              eventoId={evento.id}
              total={evento.total}
              pagado={evento.pagado}
              pendiente={evento.pendiente}
              descuento={evento.descuento}
            />
          </div>
        </div>
      )}
    </>
  );
}
