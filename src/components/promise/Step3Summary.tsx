'use client';

import React from 'react';
import Link from 'next/link';
import { Edit, ExternalLink } from 'lucide-react';
import { ZenCheckbox } from '@/components/ui/zen';
import { ResumenPago } from '@/components/shared/precio';
import { formatDisplayDateLong } from '@/lib/utils/date-formatter';

interface PrecioCalculado {
  precioBase: number;
  descuentoCondicion: number;
  precioConDescuento: number;
  advanceType: 'percentage' | 'fixed_amount';
  anticipoPorcentaje: number | null;
  anticipoMontoFijo: number | null;
  anticipo: number;
  diferido: number;
}

interface BookingFormData {
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  contact_address: string;
  event_name: string;
  event_location: string;
  event_date: Date | null;
  event_type_name: string | null;
}

interface Step3SummaryProps {
  formData: Partial<BookingFormData>;
  cotizacionName: string;
  precioCalculado?: PrecioCalculado | null;
  precioFinal?: number;
  isFromNegociacion?: boolean;
  /** Precio de lista (Studio) */
  precioLista?: number;
  /** Monto cortesías */
  montoCortesias?: number;
  /** Cantidad ítems cortesía (para "Cortesías (N)") */
  cortesiasCount?: number;
  /** Bono especial */
  montoBono?: number;
  /** Precio final de cierre (total exacto a mostrar). */
  precioFinalCierre?: number;
  /** Ajuste por cierre para desglose (solo mostrar si !== 0). */
  ajusteCierre?: number;
  /** Fase 29.2: Si true, muestra badge PAGADO en el anticipo (Modo Cierre). */
  pagoConfirmado?: boolean;
  errors: Record<string, string>;
  termsAccepted: boolean;
  onAcceptTerms: (accepted: boolean) => void;
  onEditEvent?: () => void;
  onEditContact?: () => void;
  studioSlug?: string;
}

export function Step3Summary({
  formData,
  cotizacionName,
  precioCalculado,
  precioFinal = 0,
  isFromNegociacion = false,
  precioLista,
  montoCortesias = 0,
  cortesiasCount = 0,
  montoBono = 0,
  precioFinalCierre,
  ajusteCierre = 0,
  pagoConfirmado = false,
  errors,
  termsAccepted,
  onAcceptTerms,
  onEditEvent,
  onEditContact,
  studioSlug,
}: Step3SummaryProps) {
  const handleTermsChange = (checked: boolean) => {
    onAcceptTerms(checked);
  };

  // Usar formatDisplayDateLong que usa métodos UTC exclusivamente
  const formatDate = (date: Date | null): string => {
    if (!date) return 'No definida';
    return formatDisplayDateLong(date);
  };

  const finalPrice = precioFinalCierre ?? (precioCalculado ? precioCalculado.precioConDescuento : precioFinal);
  const tieneConcesiones = montoCortesias > 0 || montoBono > 0;
  // Misma lógica que CotizacionDetailSheet / PrecioDesglose: sin redondear a enteros; ResumenPago formatea con 2 decimales.
  const anticipo = precioCalculado?.anticipo ?? 0;
  const diferido = finalPrice - anticipo;

  return (
    <div className="space-y-4">
      {/* Resumen de Pago sin card extra; el componente tiene su propio contenedor. */}
      <ResumenPago
        precioBase={precioCalculado?.precioBase ?? precioLista ?? finalPrice}
        descuentoCondicion={precioCalculado?.descuentoCondicion ?? 0}
        precioConDescuento={precioCalculado?.precioConDescuento}
        advanceType={precioCalculado?.advanceType ?? 'percentage'}
        anticipoPorcentaje={precioCalculado?.anticipoPorcentaje ?? null}
        anticipo={anticipo}
        diferido={diferido}
        precioLista={precioLista ?? precioCalculado?.precioBase ?? null}
        montoCortesias={montoCortesias}
        cortesiasCount={cortesiasCount}
        montoBono={montoBono}
        precioFinalCierre={finalPrice}
        ajusteCierre={ajusteCierre}
        tieneConcesiones={tieneConcesiones}
        compact
        title="COTIZACIÓN AUTORIZADA"
        pagoConfirmado={pagoConfirmado}
      />

      {/* Resumen: una columna por tarjeta, estilo smartphone (card minimalista) */}
      <div className="space-y-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Datos del evento</span>
            {onEditEvent && (
              <button type="button" onClick={onEditEvent} className="text-emerald-500 hover:text-emerald-400 transition-colors inline-flex items-center gap-1 text-xs font-normal">
                <Edit className="h-3 w-3" />
                Editar
              </button>
            )}
          </div>
          <div className="space-y-1.5 text-sm">
            <p className="flex flex-wrap gap-x-1.5 gap-y-0.5">
              <span className="text-zinc-400 shrink-0">Fecha:</span>
              <span className="text-white">{formatDate(formData.event_date || null)}</span>
            </p>
            {formData.event_name && (
              <p className="flex flex-wrap gap-x-1.5 gap-y-0.5">
                <span className="text-zinc-400 shrink-0">Festejado(s):</span>
                <span className="text-white">{formData.event_name}</span>
              </p>
            )}
            {formData.event_location && (
              <p className="flex flex-wrap gap-x-1.5 gap-y-0.5">
                <span className="text-zinc-400 shrink-0">Lugar:</span>
                <span className="text-white">{formData.event_location}</span>
              </p>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Datos de contacto</span>
            {onEditContact && (
              <button type="button" onClick={onEditContact} className="text-emerald-500 hover:text-emerald-400 transition-colors inline-flex items-center gap-1 text-xs font-normal">
                <Edit className="h-3 w-3" />
                Editar
              </button>
            )}
          </div>
          <div className="space-y-1.5 text-sm">
            <p className="flex flex-wrap gap-x-1.5 gap-y-0.5">
              <span className="text-zinc-400 shrink-0">Nombre:</span>
              <span className="text-white">{formData.contact_name || '—'}</span>
            </p>
            <p className="flex flex-wrap gap-x-1.5 gap-y-0.5">
              <span className="text-zinc-400 shrink-0">Teléfono:</span>
              <span className="text-white">{formData.contact_phone || '—'}</span>
            </p>
            <p className="flex flex-wrap gap-x-1.5 gap-y-0.5">
              <span className="text-zinc-400 shrink-0">Email:</span>
              <span className="text-white">{formData.contact_email || '—'}</span>
            </p>
            {formData.contact_address && (
              <p className="flex flex-wrap gap-x-1.5 gap-y-0.5">
                <span className="text-zinc-400 shrink-0">Dirección:</span>
                <span className="text-white text-xs leading-relaxed">{formData.contact_address}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Checkbox de consentimiento legal */}
      <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800">
        <ZenCheckbox
          checked={termsAccepted}
          onCheckedChange={handleTermsChange}
          label="He leído la propuesta, acepto los términos y condiciones y solicito la generación de mi contrato."
          error={errors.terms}
        />
        {studioSlug && (
          <div className="mt-2 ml-6">
            <Link
              href={`/${studioSlug}/aviso-privacidad`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-300 transition-colors"
            >
              <span>Ver aviso de privacidad</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
