'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle2, ChevronRight } from 'lucide-react';
import { ZenCard, ZenButton, ZenDialog } from '@/components/ui/zen';
import { ContractPreview } from '@/components/shared/contracts/ContractPreview';
import type { CondicionesComercialesData, CotizacionRenderData } from '@/components/shared/contracts/types';
import { useCotizacionesRealtime } from '@/hooks/useCotizacionesRealtime';
import type { EventContractData } from '@/types/contracts';
import confetti from 'canvas-confetti';

interface BienvenidoPageClientProps {
  studioSlug: string;
  promiseId: string;
  contactName: string;
  nombreEstudio: string;
  nombreEvento: string | null;
  fechaEvento: string | null;
  categoriaEvento: string | null;
  archivoContratoUrl: string | null;
  initialEventoId: string | null;
  cotizacionId: string;
  contractId: string;
  /** false = flujo manual (estudio autorizó): mostrar confetti al entrar. */
  selectedByProspect?: boolean;
  contract: {
    template_id: string | null;
    content: string | null;
    version: number;
    signed_at: Date | null;
    total_final: number | null;
    condiciones_comerciales: {
      id: string;
      name: string;
      description: string | null;
      advance_percentage: number | null;
      advance_type: string | null;
      advance_amount: number | null;
      discount_percentage: number | null;
    } | null;
  } | null;
  cotizacionData?: CotizacionRenderData;
  condicionesData?: CondicionesComercialesData;
}

export function BienvenidoPageClient({
  studioSlug,
  promiseId,
  contactName,
  nombreEstudio,
  nombreEvento,
  fechaEvento,
  categoriaEvento,
  archivoContratoUrl: _archivoContratoUrl,
  initialEventoId,
  cotizacionId,
  contractId,
  contract,
  cotizacionData: cotizacionDataProp,
  condicionesData: condicionesDataProp,
  selectedByProspect = true,
}: BienvenidoPageClientProps) {
  const router = useRouter();
  const [, setEventoId] = useState<string | null>(initialEventoId);
  const [showContractModal, setShowContractModal] = useState(false);
  const confettiFiredRef = useRef(false);

  // Confetti solo en flujo manual (estudio autorizó; el cliente no eligió desde el link)
  useEffect(() => {
    if (selectedByProspect !== false || confettiFiredRef.current) return;
    confettiFiredRef.current = true;
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'],
      zIndex: 2147483647,
    });
    const t = setTimeout(() => {
      confetti({ particleCount: 40, angle: 60, spread: 55, origin: { x: 0 }, zIndex: 2147483647 });
      confetti({ particleCount: 40, angle: 120, spread: 55, origin: { x: 1 }, zIndex: 2147483647 });
    }, 200);
    return () => clearTimeout(t);
  }, [selectedByProspect]);

  const goToPortal = useCallback(() => {
    router.push(`/${studioSlug}/cliente/login`);
  }, [router, studioSlug]);

  useCotizacionesRealtime({
    studioSlug,
    promiseId,
    onCotizacionUpdated: useCallback((id: string, changeInfo?: { evento_id?: string | null }) => {
      if (id === cotizacionId && changeInfo?.evento_id) {
        setEventoId(changeInfo.evento_id);
      }
    }, [cotizacionId]),
  });

  const displayName = contactName?.trim() || 'Cliente';
  const hasContract = contract != null && (!!contract.content?.trim() || !!contract.template_id || !!contract.signed_at);

  // ⚠️ RENDERIZADO: Priorizar condicionesData del servidor (con desglose completo)
  // Si no viene del servidor, construir fallback desde contract.condiciones_comerciales
  const condicionesData = useMemo((): CondicionesComercialesData | undefined => {
    if (condicionesDataProp) return condicionesDataProp;
    
    if (!contract?.condiciones_comerciales) return undefined;
    const cc = contract.condiciones_comerciales;
    const totalFinal = contract.total_final ?? undefined;
    let montoAnticipo: number | undefined;
    if (totalFinal != null && totalFinal > 0) {
      if (cc.advance_type === 'fixed_amount' && cc.advance_amount != null) {
        montoAnticipo = cc.advance_amount;
      } else if (cc.advance_type === 'percentage' && cc.advance_percentage != null) {
        montoAnticipo = (totalFinal * cc.advance_percentage) / 100;
      }
    }
    return {
      nombre: cc.name,
      descripcion: cc.description ?? undefined,
      porcentaje_anticipo: cc.advance_percentage ?? undefined,
      tipo_anticipo: (cc.advance_type as 'percentage' | 'fixed_amount') ?? undefined,
      monto_anticipo: montoAnticipo,
      porcentaje_descuento: cc.discount_percentage ?? undefined,
      total_contrato: totalFinal,
      total_final: totalFinal,
    };
  }, [condicionesDataProp, contract?.condiciones_comerciales, contract?.total_final]);

  // eventData obligatorio para que useContractRenderer use condicionesData (mismo patrón que pendiente/cierre)
  const eventData = useMemo((): EventContractData | undefined => {
    if (!contract?.content?.trim()) return undefined;
    const totalStr =
      contract.total_final != null
        ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(contract.total_final)
        : '';
    return {
      nombre_cliente: (contactName?.trim() || 'Cliente').toUpperCase(),
      email_cliente: '',
      telefono_cliente: '',
      direccion_cliente: '',
      fecha_evento: fechaEvento ?? '',
      tipo_evento: (categoriaEvento?.trim() || 'Evento').toUpperCase(),
      nombre_evento: (nombreEvento?.trim() || '—').toUpperCase(),
      total_contrato: totalStr,
      condiciones_pago: '',
      nombre_studio: (nombreEstudio?.trim() || 'Estudio').toUpperCase(),
      nombre_representante: '',
      telefono_studio: '',
      correo_studio: '',
      direccion_studio: '',
      fecha_firma_cliente: contract.signed_at
        ? new Date(contract.signed_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
        : '',
      servicios_incluidos: [],
    };
  }, [
    contract?.content,
    contract?.total_final,
    contract?.signed_at,
    contactName,
    fechaEvento,
    categoriaEvento,
    nombreEvento,
    nombreEstudio,
  ]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <ZenCard className="overflow-hidden">
        <div className="p-8 sm:p-10 space-y-6 text-center">
          {/* Header: icono + título (eje visual) */}
          <div>
            <div
              className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 mb-5 animate-in fade-in-0 zoom-in-95 duration-500"
              aria-hidden
            >
              <CheckCircle2 className="w-9 h-9 text-emerald-400" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              {displayName}
            </h1>
          </div>

          {/* Subtítulo de impacto */}
          {fechaEvento && (
            <p className="text-zinc-300 text-lg font-medium">
              Tu fecha del <span className="font-semibold text-emerald-400">{fechaEvento}</span> ya es oficial.
            </p>
          )}

          {/* Texto emocional */}
          <p className="text-zinc-400 text-sm sm:text-base leading-relaxed max-w-lg mx-auto">
            Muchas gracias por tu confianza. Estamos muy entusiasmados de poder celebrar contigo tu evento.
          </p>

          {/* Divisor sutil + acciones centradas */}
          <div className="border-t border-zinc-700/80 pt-6 flex flex-col items-center space-y-8">
            {/* Contrato: mismo párrafo, link sin icono */}
            {hasContract && (
              <p className="text-sm text-zinc-400 max-w-lg">
                Puedes revisar tu contrato digital y descargarlo en cualquier momento{' '}
                <ZenButton
                  variant="ghost"
                  size="sm"
                  className="inline-flex h-auto py-0 px-0 -my-0.5 align-baseline font-medium text-emerald-400 hover:text-emerald-300 underline decoration-emerald-500/50 hover:decoration-emerald-400 underline-offset-2"
                  onClick={() => setShowContractModal(true)}
                >
                  Ver contrato firmado
                </ZenButton>
              </p>
            )}

            {/* Portal: gap generoso antes del CTA */}
            <div className="space-y-3 w-full max-w-sm">
              <p className="text-sm text-zinc-400">
                Consulta el progreso, pagos y todos los detalles de tu producción en tu portal.
              </p>
              <ZenButton
                variant="primary"
                size="lg"
                className="w-full text-base font-semibold"
                onClick={goToPortal}
              >
                Ir a mi Portal de Cliente
                <ChevronRight className="w-5 h-5 ml-2" />
              </ZenButton>
            </div>
          </div>
        </div>
      </ZenCard>

      <ZenDialog
        isOpen={showContractModal}
        onClose={() => setShowContractModal(false)}
        title="Contrato firmado"
        maxWidth="4xl"
      >
        {contract?.content?.trim() ? (
          <div className="flex flex-col max-h-[calc(90vh-180px)] min-h-[300px] overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-auto px-1">
              <ContractPreview
                content={contract.content}
                eventData={eventData}
                cotizacionData={cotizacionDataProp}
                condicionesData={condicionesData}
                noCard
                hideFlexibilidadNote
                className="min-h-full"
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
            <Loader2 className="w-12 h-12 mb-4 text-zinc-500 animate-spin" />
            <p className="text-sm font-medium">Cargando contrato...</p>
            <p className="text-xs mt-1">El documento se está generando. Solo un momento.</p>
          </div>
        )}
      </ZenDialog>
    </div>
  );
}
