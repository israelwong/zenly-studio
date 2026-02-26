'use client';

import React from 'react';
import Link from 'next/link';
import { Calendar, MapPin, User, Phone, Mail, FileText, Home, Edit, ExternalLink } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCheckbox } from '@/components/ui/zen';
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
      />

      {/* Card: Datos del evento */}
      <ZenCard variant="outlined" padding="none" className="bg-zinc-900/30 border-zinc-800">
        <ZenCardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-zinc-400" />
              <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
                Datos del evento
              </p>
            </div>
            {onEditEvent && (
              <button
                onClick={onEditEvent}
                className="flex items-center gap-1.5 px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors rounded hover:bg-zinc-800/50"
              >
                <Edit className="h-3 w-3" />
                <span>Editar</span>
              </button>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <Calendar className="h-3.5 w-3.5 text-zinc-500 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-zinc-500 mb-0.5">Fecha del evento</p>
                <p className="text-sm font-medium text-zinc-200">{formatDate(formData.event_date || null)}</p>
              </div>
            </div>

            {formData.event_name && (
              <div className="flex items-start gap-2">
                <User className="h-3.5 w-3.5 text-zinc-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-zinc-500 mb-0.5">Festejado(s)</p>
                  <p className="text-sm font-medium text-zinc-200">{formData.event_name}</p>
                </div>
              </div>
            )}

            {formData.event_location && (
              <div className="flex items-start gap-2">
                <MapPin className="h-3.5 w-3.5 text-zinc-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-zinc-500 mb-0.5">Lugar</p>
                  <p className="text-sm font-medium text-zinc-200">{formData.event_location}</p>
                </div>
              </div>
            )}
          </div>
        </ZenCardContent>
      </ZenCard>

      {/* Información de contacto (resumen) */}
      <ZenCard variant="outlined" padding="none" className="bg-zinc-900/30 border-zinc-800">
        <ZenCardContent className="p-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-zinc-400" />
                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
                  Datos para el contrato
                </p>
              </div>
              {onEditContact && (
                <button
                  onClick={onEditContact}
                  className="flex items-center gap-1.5 px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors rounded hover:bg-zinc-800/50"
                >
                  <Edit className="h-3 w-3" />
                  <span>Editar</span>
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div className="flex items-start gap-2">
                <User className="h-3 w-3 text-zinc-500 shrink-0 mt-0.5" />
                <span className="text-zinc-400">{formData.contact_name || '—'}</span>
              </div>
              <div className="flex items-start gap-2">
                <Phone className="h-3 w-3 text-zinc-500 shrink-0 mt-0.5" />
                <span className="text-zinc-400">{formData.contact_phone || '—'}</span>
              </div>
              <div className="flex items-start gap-2 sm:col-span-2">
                <Mail className="h-3 w-3 text-zinc-500 shrink-0 mt-0.5" />
                <span className="text-zinc-400">{formData.contact_email || '—'}</span>
              </div>
              {formData.contact_address && (
                <div className="flex items-start gap-2 sm:col-span-2">
                  <Home className="h-3 w-3 text-zinc-500 shrink-0 mt-0.5" />
                  <span className="text-zinc-400 text-xs leading-relaxed">{formData.contact_address}</span>
                </div>
              )}
            </div>
          </div>
        </ZenCardContent>
      </ZenCard>

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
