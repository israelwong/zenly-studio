import { prisma } from '@/lib/prisma';
import { calculateCotizacionTotals } from '@/lib/utils/cotizacion-calculation-engine';

export interface PromiseFinancials {
  contractValue: number;
  paidAmount: number;
  pendingAmount: number;
  cotizaciones: Array<{
    id: string;
    name: string;
    price: number;
    discount: number | null;
    precioFinal: number; // totalAPagar del engine (SSoT)
    pagado: number;
    pendiente: number;
  }>;
}

function buildEngineInput(c: {
  price: unknown;
  discount: unknown;
  negociacion_precio_original?: unknown;
  negociacion_precio_personalizado?: unknown;
  condiciones_comerciales_discount_percentage_snapshot?: unknown;
  condiciones_comerciales_advance_percentage_snapshot?: unknown;
  condiciones_comerciales_advance_type_snapshot?: unknown;
  condiciones_comerciales_advance_amount_snapshot?: unknown;
}) {
  return {
    price: Number(c.price),
    discount: c.discount != null ? Number(c.discount) : null,
    negociacion_precio_original: c.negociacion_precio_original != null ? Number(c.negociacion_precio_original) : null,
    negociacion_precio_personalizado: c.negociacion_precio_personalizado != null ? Number(c.negociacion_precio_personalizado) : null,
    condiciones_comerciales_discount_percentage_snapshot: c.condiciones_comerciales_discount_percentage_snapshot != null ? Number(c.condiciones_comerciales_discount_percentage_snapshot) : null,
    condiciones_comerciales_advance_percentage_snapshot: c.condiciones_comerciales_advance_percentage_snapshot != null ? Number(c.condiciones_comerciales_advance_percentage_snapshot) : null,
    condiciones_comerciales_advance_type_snapshot: c.condiciones_comerciales_advance_type_snapshot ?? null,
    condiciones_comerciales_advance_amount_snapshot: c.condiciones_comerciales_advance_amount_snapshot != null ? Number(c.condiciones_comerciales_advance_amount_snapshot) : null,
    condiciones_comerciales: null,
  };
}

/**
 * Calcula los montos financieros de una promesa desde sus cotizaciones y pagos
 * Fuente única de verdad: Promesa → Cotizaciones → Pagos (usa cotizacion-calculation-engine)
 */
export async function getPromiseFinancials(
  promiseId: string
): Promise<PromiseFinancials> {
  const cotizaciones = await prisma.studio_cotizaciones.findMany({
    where: {
      promise_id: promiseId,
      status: { in: ['aprobada', 'autorizada', 'approved'] },
    },
    select: {
      id: true,
      name: true,
      price: true,
      discount: true,
      negociacion_precio_original: true,
      negociacion_precio_personalizado: true,
      condiciones_comerciales_discount_percentage_snapshot: true,
      condiciones_comerciales_advance_percentage_snapshot: true,
      condiciones_comerciales_advance_type_snapshot: true,
      condiciones_comerciales_advance_amount_snapshot: true,
      pagos: {
        where: {
          status: { in: ['paid', 'completed', 'succeeded'] },
        },
        select: { amount: true },
      },
    },
  });

  const contractValue = cotizaciones.reduce((sum, c) => {
    const out = calculateCotizacionTotals(buildEngineInput(c));
    return sum + out.totalAPagar;
  }, 0);

  const paidAmount = cotizaciones.reduce(
    (sum, c) =>
      sum + c.pagos.reduce((pSum, p) => pSum + Number(p.amount), 0),
    0
  );

  const pendingAmount = contractValue - paidAmount;

  const cotizacionesDetalle = cotizaciones.map((c) => {
    const out = calculateCotizacionTotals(buildEngineInput(c));
    const pagado = c.pagos.reduce((sum, p) => sum + Number(p.amount), 0);
    return {
      id: c.id,
      name: c.name,
      price: Number(c.price),
      discount: out.descuentoAplicado > 0 ? out.descuentoAplicado : (c.discount != null ? Number(c.discount) : null),
      precioFinal: out.totalAPagar,
      pagado,
      pendiente: out.totalAPagar - pagado,
    };
  });

  return {
    contractValue,
    paidAmount,
    pendingAmount,
    cotizaciones: cotizacionesDetalle,
  };
}

/**
 * Calcula el total pagado de una promesa (helper rápido)
 */
export async function getPromisePaidAmount(promiseId: string): Promise<number> {
  const pagos = await prisma.studio_pagos.findMany({
    where: {
      promise_id: promiseId,
      status: { in: ['paid', 'completed', 'succeeded'] },
    },
    select: { amount: true },
  });

  return pagos.reduce((sum, p) => sum + Number(p.amount), 0);
}

/**
 * Calcula el contract value de una promesa desde cotizaciones aprobadas
 * Usa cotizacion-calculation-engine (SSoT: snapshots + precio negociado)
 */
export async function getPromiseContractValue(
  promiseId: string
): Promise<number> {
  const cotizaciones = await prisma.studio_cotizaciones.findMany({
    where: {
      promise_id: promiseId,
      status: { in: ['aprobada', 'autorizada', 'approved'] },
    },
    select: {
      price: true,
      discount: true,
      negociacion_precio_original: true,
      negociacion_precio_personalizado: true,
      condiciones_comerciales_discount_percentage_snapshot: true,
      condiciones_comerciales_advance_percentage_snapshot: true,
      condiciones_comerciales_advance_type_snapshot: true,
      condiciones_comerciales_advance_amount_snapshot: true,
    },
  });

  return cotizaciones.reduce((sum, c) => {
    const out = calculateCotizacionTotals(buildEngineInput(c));
    return sum + out.totalAPagar;
  }, 0);
}

