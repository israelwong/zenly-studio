/**
 * Utilidades financieras compartidas para UI.
 * Total Contract = (Items Total - Discounts) + Taxes.
 * Usa cotizacion-calculation-engine como SSoT (misma lógica que commercial y getPromiseFinancials).
 */

import {
  calculateCotizacionTotals,
  type CotizacionCalculationEngineInput,
} from './cotizacion-calculation-engine';

/** Quote snapshot compatible con eventData.cotizaciones y resumen (snapshots inmutables). */
export interface QuoteSnapshot {
  price: number;
  discount?: number | null;
  status?: string;
  negociacion_precio_original?: number | null;
  negociacion_precio_personalizado?: number | null;
  /** Precio de lista (suma ítems); para desglose Cortesías / Bono / Ajuste. */
  precio_calculado?: number | null;
  bono_especial?: number | null;
  cortesias_monto_snapshot?: number | null;
  cortesias_count_snapshot?: number | null;
  condiciones_comerciales_discount_percentage_snapshot?: number | null;
  condiciones_comerciales_advance_percentage_snapshot?: number | null;
  condiciones_comerciales_advance_type_snapshot?: string | null;
  condiciones_comerciales_advance_amount_snapshot?: number | null;
}

function toNum(v: number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function buildEngineInput(quote: QuoteSnapshot): CotizacionCalculationEngineInput {
  return {
    price: toNum(quote.price),
    discount: quote.discount != null ? toNum(quote.discount) : null,
    negociacion_precio_original:
      quote.negociacion_precio_original != null ? toNum(quote.negociacion_precio_original) : null,
    negociacion_precio_personalizado:
      quote.negociacion_precio_personalizado != null ? toNum(quote.negociacion_precio_personalizado) : null,
    condiciones_comerciales_discount_percentage_snapshot:
      quote.condiciones_comerciales_discount_percentage_snapshot != null
        ? toNum(quote.condiciones_comerciales_discount_percentage_snapshot)
        : null,
    condiciones_comerciales_advance_percentage_snapshot:
      quote.condiciones_comerciales_advance_percentage_snapshot != null
        ? toNum(quote.condiciones_comerciales_advance_percentage_snapshot)
        : null,
    condiciones_comerciales_advance_type_snapshot: quote.condiciones_comerciales_advance_type_snapshot ?? null,
    condiciones_comerciales_advance_amount_snapshot:
      quote.condiciones_comerciales_advance_amount_snapshot != null
        ? toNum(quote.condiciones_comerciales_advance_amount_snapshot)
        : null,
  };
}

/**
 * Calcula el total a pagar (contract total) de una cotización usando el motor SSoT.
 * Misma fórmula que commercial y getPromiseFinancials.
 */
export function computeContractTotalFromQuote(quote: QuoteSnapshot): number {
  const out = calculateCotizacionTotals(buildEngineInput(quote));
  return out.totalAPagar;
}

/**
 * Ajuste por cierre: total - (precioLista - montoCortesias - montoBono).
 * Misma fórmula que getAjusteCierre en promise-public-financials.
 */
function getAjusteCierre(
  total: number,
  precioLista: number,
  montoCortesias: number,
  montoBono: number
): number {
  const subtotal = Math.max(0, precioLista - montoCortesias - montoBono);
  return total - subtotal;
}

/** Micro-resumen de una cotización para UI: desglose alineado con ResumenPago (precio lista, cortesías, bono, ajuste, total, anticipo, diferido). */
export function getQuoteMicroSummary(quote: QuoteSnapshot): {
  precioLista: number;
  montoCortesias: number;
  cortesiasCount: number;
  montoBono: number;
  ajusteCierre: number;
  total: number;
  anticipo: number;
  diferido: number;
  advancePct: number | null;
  advanceType: string | null;
} {
  const out = calculateCotizacionTotals(buildEngineInput(quote));
  const advancePct =
    quote.condiciones_comerciales_advance_percentage_snapshot != null
      ? Number(quote.condiciones_comerciales_advance_percentage_snapshot)
      : null;
  const advanceType = quote.condiciones_comerciales_advance_type_snapshot ?? null;
  const precioLista =
    quote.precio_calculado != null && Number(quote.precio_calculado) > 0
      ? Number(quote.precio_calculado)
      : out.precioBaseReal;
  const montoCortesias = toNum(quote.cortesias_monto_snapshot);
  const cortesiasCount = quote.cortesias_count_snapshot != null ? Number(quote.cortesias_count_snapshot) : 0;
  const montoBono = toNum(quote.bono_especial);
  const total = out.totalAPagar;
  const ajusteCierre = getAjusteCierre(total, precioLista, montoCortesias, montoBono);
  return {
    precioLista,
    montoCortesias,
    cortesiasCount,
    montoBono,
    ajusteCierre,
    total,
    anticipo: out.anticipo,
    diferido: out.diferido,
    advancePct: Number.isFinite(advancePct) ? advancePct : null,
    advanceType,
  };
}

/**
 * Suma el total contrato de varias cotizaciones aprobadas (misma lógica que getPromiseFinancials).
 */
export function computeContractTotalFromQuotes(quotes: QuoteSnapshot[]): number {
  return quotes.reduce((sum, q) => sum + computeContractTotalFromQuote(q), 0);
}

/**
 * Calcula total pagado y saldo pendiente a partir del total contrato y la lista de pagos.
 * El llamador debe pasar solo pagos activos (status === 'completed'); excluir cancelados.
 */
export function computeFinancialSummary(
  contractTotal: number,
  payments: Array<{ amount: number }>
): { totalPaid: number; balanceDue: number } {
  const totalPaid = payments.reduce((s, p) => s + toNum(p.amount), 0);
  const balanceDue = Math.max(0, contractTotal - totalPaid);
  return { totalPaid, balanceDue };
}
