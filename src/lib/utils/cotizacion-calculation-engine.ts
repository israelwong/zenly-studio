/**
 * Motor de Cálculo de Cotización - Fuente Única de Verdad (SSoT)
 *
 * Centraliza total a pagar, descuento aplicado, anticipo y diferido para cotizaciones.
 * Reglas alineadas con renderer.actions.ts (getPromiseContractData / buildEventContractData).
 *
 * Reglas:
 * 1. Si existe negociacion_precio_personalizado → ese es el Total Final (descuento % se ignora).
 * 2. Si no, aplicar descuento por % (priorizando snapshots) sobre precioBaseReal.
 * 3. Anticipo y Diferido se calculan sobre el Total Final resuelto.
 *
 * Convención: studio_cotizaciones.discount es MONTO absoluto (no %). Si discount > 0,
 * price en BD = precio ya con descuento; precioBaseReal = price + discount.
 */

import { roundPrice } from './price-rounding';

export interface CotizacionCalculationEngineInput {
  /** Precio de la cotización (DB). Si discount > 0, puede ser "precio ya con descuento". */
  price: number;
  /** Descuento directo en cotización: MONTO absoluto (no %). */
  discount: number | null;
  negociacion_precio_original: number | null;
  negociacion_precio_personalizado: number | null;

  /** Snapshots inmutables (prioridad sobre condiciones "vivas"). */
  condiciones_comerciales_discount_percentage_snapshot: number | null;
  condiciones_comerciales_advance_percentage_snapshot: number | null;
  condiciones_comerciales_advance_type_snapshot: string | null;
  condiciones_comerciales_advance_amount_snapshot: number | null;

  /** Condiciones comerciales (fallback si no hay snapshots). */
  condiciones_comerciales?: {
    discount_percentage?: number | null;
    advance_percentage?: number | null;
    advance_type?: string | null;
    advance_amount?: number | null;
  } | null;

  /** Si true, aplica charm rounding al total (solo paquetes); recalcula anticipo si es %. */
  applyCharmRounding?: boolean;
}

export interface CotizacionCalculationEngineOutput {
  totalAPagar: number;
  precioBase: number;
  precioBaseReal: number;
  descuentoAplicado: number;
  descuentoPorcentaje: number | null;
  source: 'negociado' | 'descuento_porcentaje' | 'descuento_monto' | 'sin_descuento';
  anticipo: number;
  diferido: number;
  precioOriginalParaComparativa?: number;
  ahorroTotal?: number;
}

function toNum(v: number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Calcula total a pagar, descuento, anticipo y diferido para una cotización.
 * Lógica idéntica a renderer.actions.ts para garantizar 0 centavos de diferencia.
 */
export function calculateCotizacionTotals(
  input: CotizacionCalculationEngineInput
): CotizacionCalculationEngineOutput {
  const price = toNum(input.price);
  const descuentoExistente = toNum(input.discount);
  const precioBaseReal = descuentoExistente > 0 ? price + descuentoExistente : price;

  const precioNegociado =
    input.negociacion_precio_personalizado != null && Number(input.negociacion_precio_personalizado) > 0
      ? Number(input.negociacion_precio_personalizado)
      : null;
  const precioOriginalNegociacion =
    input.negociacion_precio_original != null ? Number(input.negociacion_precio_original) : null;
  const esNegociacion = precioNegociado !== null && precioNegociado > 0;

  const discountPctSnapshot = input.condiciones_comerciales_discount_percentage_snapshot;
  const advancePctSnapshot = input.condiciones_comerciales_advance_percentage_snapshot;
  const advanceTypeSnapshot = input.condiciones_comerciales_advance_type_snapshot;
  const advanceAmountSnapshot = input.condiciones_comerciales_advance_amount_snapshot;
  const cond = input.condiciones_comerciales;

  const discountPct =
    discountPctSnapshot != null
      ? toNum(discountPctSnapshot)
      : (cond?.discount_percentage != null ? toNum(cond.discount_percentage) : null);
  const advancePct =
    advancePctSnapshot != null
      ? toNum(advancePctSnapshot)
      : (cond?.advance_percentage != null ? toNum(cond.advance_percentage) : null);
  const advanceType = advanceTypeSnapshot ?? cond?.advance_type ?? null;
  const advanceAmount =
    advanceAmountSnapshot != null
      ? toNum(advanceAmountSnapshot)
      : (cond?.advance_amount != null ? toNum(cond.advance_amount) : null);

  let totalAPagar: number;
  let descuentoAplicado: number;
  let descuentoPorcentaje: number | null = null;
  let source: CotizacionCalculationEngineOutput['source'];
  let precioOriginalParaComparativa: number = precioBaseReal;
  let ahorroTotal: number | undefined;

  if (esNegociacion && precioNegociado !== null) {
    totalAPagar = precioNegociado;
    descuentoAplicado = 0;
    descuentoPorcentaje = null;
    source = 'negociado';
    precioOriginalParaComparativa = precioOriginalNegociacion ?? precioBaseReal;
    ahorroTotal = precioOriginalParaComparativa - precioNegociado;
  } else if (discountPct != null && discountPct > 0) {
    descuentoAplicado = (precioBaseReal * discountPct) / 100;
    totalAPagar = precioBaseReal - descuentoAplicado;
    descuentoPorcentaje = discountPct;
    source = 'descuento_porcentaje';
  } else if (descuentoExistente > 0) {
    totalAPagar = price;
    descuentoAplicado = descuentoExistente;
    source = 'descuento_monto';
  } else {
    totalAPagar = price;
    descuentoAplicado = 0;
    source = 'sin_descuento';
  }

  if (input.applyCharmRounding) {
    totalAPagar = roundPrice(totalAPagar, 'charm');
  }

  let anticipo = 0;
  const isPercentage = advanceType === 'percentage' || advanceType === 'Percentage';
  if (isPercentage && advancePct != null && advancePct > 0) {
    anticipo = (totalAPagar * advancePct) / 100;
  } else if (
    (advanceType === 'fixed_amount' || advanceType === 'Fixed_amount' || advanceType === 'amount') &&
    advanceAmount != null &&
    advanceAmount > 0
  ) {
    anticipo = advanceAmount;
  }

  const diferido = totalAPagar - anticipo;

  return {
    totalAPagar,
    precioBase: price,
    precioBaseReal,
    descuentoAplicado,
    descuentoPorcentaje,
    source,
    anticipo,
    diferido,
    precioOriginalParaComparativa,
    ...(ahorroTotal !== undefined && { ahorroTotal }),
  };
}

// --- Prueba interna: replicar exactamente la lógica del renderer y comparar (0 centavos diferencia) ---

function rendererLogicReference(
  price: number,
  discount: number,
  precioNegociado: number | null,
  precioOriginalNegociacion: number | null,
  discountPct: number | null,
  advancePct: number | null,
  advanceType: string | null,
  advanceAmount: number | null
): { totalFinal: number; descuentoAplicado: number; anticipo: number; diferido: number } {
  const precioBaseReal = discount > 0 ? price + discount : price;
  const esNegociacion = precioNegociado !== null && precioNegociado > 0;

  let totalFinal: number;
  let descuentoAplicado: number;

  if (esNegociacion && precioNegociado !== null) {
    totalFinal = precioNegociado;
    descuentoAplicado = 0;
  } else if (discountPct != null && discountPct > 0) {
    descuentoAplicado = (precioBaseReal * discountPct) / 100;
    totalFinal = precioBaseReal - descuentoAplicado;
  } else if (discount > 0) {
    totalFinal = price;
    descuentoAplicado = discount;
  } else {
    totalFinal = price;
    descuentoAplicado = 0;
  }

  let anticipo = 0;
  if (advanceType === 'percentage' && advancePct != null && advancePct > 0) {
    anticipo = (totalFinal * advancePct) / 100;
  } else if (advanceType === 'fixed_amount' && advanceAmount != null && advanceAmount > 0) {
    anticipo = advanceAmount;
  }
  const diferido = totalFinal - anticipo;

  return { totalFinal, descuentoAplicado, anticipo, diferido };
}

/**
 * Ejecuta prueba interna: compara salida del engine con la lógica de referencia del renderer.
 * Debe dar 0 centavos de diferencia en total, descuento, anticipo y diferido.
 */
export function runInternalRendererParityTest(): { ok: boolean; message: string } {
  const cases: Array<{
    name: string;
    price: number;
    discount: number;
    precioNegociado: number | null;
    precioOriginalNegociacion: number | null;
    discountPct: number | null;
    advancePct: number | null;
    advanceType: string | null;
    advanceAmount: number | null;
  }> = [
    {
      name: 'negociado',
      price: 25000,
      discount: 0,
      precioNegociado: 22000,
      precioOriginalNegociacion: 25000,
      discountPct: 10,
      advancePct: 50,
      advanceType: 'percentage',
      advanceAmount: null,
    },
    {
      name: 'descuento porcentaje',
      price: 20000,
      discount: 0,
      precioNegociado: null,
      precioOriginalNegociacion: null,
      discountPct: 15,
      advancePct: 30,
      advanceType: 'percentage',
      advanceAmount: null,
    },
    {
      name: 'descuento monto (price ya con descuento)',
      price: 17000,
      discount: 3000,
      precioNegociado: null,
      precioOriginalNegociacion: null,
      discountPct: null,
      advancePct: 25,
      advanceType: 'percentage',
      advanceAmount: null,
    },
    {
      name: 'anticipo fixed_amount',
      price: 18000,
      discount: 0,
      precioNegociado: null,
      precioOriginalNegociacion: null,
      discountPct: null,
      advancePct: null,
      advanceType: 'fixed_amount',
      advanceAmount: 5000,
    },
    {
      name: 'sin condiciones',
      price: 15000,
      discount: 0,
      precioNegociado: null,
      precioOriginalNegociacion: null,
      discountPct: null,
      advancePct: null,
      advanceType: null,
      advanceAmount: null,
    },
    {
      name: 'sin condiciones con discount monto',
      price: 12000,
      discount: 2000,
      precioNegociado: null,
      precioOriginalNegociacion: null,
      discountPct: null,
      advancePct: null,
      advanceType: null,
      advanceAmount: null,
    },
    {
      name: 'certificación: base 30k, desc 10%, negociado 25k (manda), anticipo 20%',
      price: 30000,
      discount: 0,
      precioNegociado: 25000,
      precioOriginalNegociacion: 30000,
      discountPct: 10,
      advancePct: 20,
      advanceType: 'percentage',
      advanceAmount: null,
    },
  ];

  for (const c of cases) {
    const ref = rendererLogicReference(
      c.price,
      c.discount,
      c.precioNegociado,
      c.precioOriginalNegociacion,
      c.discountPct,
      c.advancePct,
      c.advanceType,
      c.advanceAmount
    );
    const out = calculateCotizacionTotals({
      price: c.price,
      discount: c.discount,
      negociacion_precio_original: c.precioOriginalNegociacion,
      negociacion_precio_personalizado: c.precioNegociado,
      condiciones_comerciales_discount_percentage_snapshot: c.discountPct,
      condiciones_comerciales_advance_percentage_snapshot: c.advancePct,
      condiciones_comerciales_advance_type_snapshot: c.advanceType,
      condiciones_comerciales_advance_amount_snapshot: c.advanceAmount,
      condiciones_comerciales:
        c.discountPct != null || c.advancePct != null || c.advanceAmount != null
          ? {
              discount_percentage: c.discountPct,
              advance_percentage: c.advancePct,
              advance_type: c.advanceType,
              advance_amount: c.advanceAmount,
            }
          : null,
    });

    const eps = 0.005;
    if (
      Math.abs(out.totalAPagar - ref.totalFinal) > eps ||
      Math.abs(out.descuentoAplicado - ref.descuentoAplicado) > eps ||
      Math.abs(out.anticipo - ref.anticipo) > eps ||
      Math.abs(out.diferido - ref.diferido) > eps
    ) {
      return {
        ok: false,
        message: `[${c.name}] Engine vs renderer: totalAPagar=${out.totalAPagar} vs ${ref.totalFinal}, descuento=${out.descuentoAplicado} vs ${ref.descuentoAplicado}, anticipo=${out.anticipo} vs ${ref.anticipo}, diferido=${out.diferido} vs ${ref.diferido}`,
      };
    }
  }

  return { ok: true, message: 'Todos los casos coinciden con la lógica del renderer (0 centavos diferencia).' };
}
