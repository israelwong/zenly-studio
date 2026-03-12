'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { ZenCard, ZenCardHeader, ZenCardTitle, ZenCardContent, ZenSidebarTrigger, ZenButton } from '@/components/ui/zen';
import { ToastContainer } from '@/components/client';
import { useToast } from '@/hooks/useToast';
import { useEvento } from '../context/EventoContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { ServiciosContratadosTree } from './components/ServiciosContratadosTree';
import { ResumenPago } from '../components/ResumenPago';
import { solicitarAnexoCliente } from '@/lib/actions/cliente';
import { PlusCircle } from 'lucide-react';
import { formatearMoneda } from '@/lib/actions/studio/catalogo/calcular-precio';

export default function EventoCotizacionesPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const clientId = params?.clientId as string;
  const { evento, studioInfo } = useEvento();
  const pageTitle = studioInfo?.studio_name
    ? `Cotizaciones - ${studioInfo.studio_name}`
    : 'Cotizaciones';
  usePageTitle(pageTitle);
  const { toasts, removeToast, success: toastSuccess, error: toastError } = useToast();
  const [solicitandoId, setSolicitandoId] = useState<string | null>(null);

  const tieneMultiplesCotizaciones = evento.cotizaciones.length > 1;
  const mejorasDisponibles = evento.mejorasDisponibles ?? [];

  const handleAprobarYSumar = async (cotizacionAnexoId: string) => {
    if (!slug || !clientId) return;
    setSolicitandoId(cotizacionAnexoId);
    try {
      const result = await solicitarAnexoCliente(slug, clientId, evento.id, cotizacionAnexoId);
      if (result.success) {
        toastSuccess('Solicitud enviada. El estudio completará el proceso con usted.');
        window.location.reload();
      } else {
        toastError(result.message ?? 'Error al enviar');
      }
    } finally {
      setSolicitandoId(null);
    }
  };

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

      {/* Sección A: Contrato actual */}
      <section className="space-y-4 mb-10">
        <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
          Contrato actual
        </h2>
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
      </section>

      {/* Sección B: Mejoras disponibles */}
      {mejorasDisponibles.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
            Mejoras disponibles
          </h2>
          <p className="text-sm text-zinc-500">
            Propuestas adicionales que puedes sumar a tu evento. Al aprobar, el estudio completará el proceso con usted.
          </p>
          <div className="space-y-4">
            {mejorasDisponibles.map((mejora) => (
              <ZenCard key={mejora.id} className="border-amber-500/30 bg-zinc-800/50">
                <ZenCardHeader>
                  <ZenCardTitle>{mejora.name}</ZenCardTitle>
                  {mejora.descripcion && (
                    <p className="text-sm text-zinc-400 mt-1">{mejora.descripcion}</p>
                  )}
                </ZenCardHeader>
                <ZenCardContent>
                  <div className="grid gap-6 lg:grid-cols-2">
                    <div>
                      <ServiciosContratadosTree servicios={mejora.servicios} />
                    </div>
                    <div className="flex flex-col justify-between gap-4">
                      <p className="text-lg font-semibold text-emerald-400">
                        {formatearMoneda(mejora.total)}
                      </p>
                      <ZenButton
                        onClick={() => handleAprobarYSumar(mejora.id)}
                        loading={solicitandoId === mejora.id}
                        loadingText="Enviando..."
                        className="w-fit"
                      >
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Aprobar y Sumar al Evento
                      </ZenButton>
                    </div>
                  </div>
                </ZenCardContent>
              </ZenCard>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
