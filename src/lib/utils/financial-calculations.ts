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
 * Suma el total contrato de varias cotizaciones aprobadas (misma lógica que getPromiseFinancials).
 */
export function computeContractTotalFromQuotes(quotes: QuoteSnapshot[]): number {
  return quotes.reduce((sum, q) => sum + computeContractTotalFromQuote(q), 0);
}

/**
 * Calcula total pagado y saldo pendiente a partir del total contrato y la lista de pagos.
 */
export function computeFinancialSummary(
  contractTotal: number,
  payments: Array<{ amount: number }>
): { totalPaid: number; balanceDue: number } {
  const totalPaid = payments.reduce((s, p) => s + toNum(p.amount), 0);
  const balanceDue = Math.max(0, contractTotal - totalPaid);
  return { totalPaid, balanceDue };
}
