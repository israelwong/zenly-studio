import { prisma } from '@/lib/prisma';

export interface PromiseFinancials {
  contractValue: number;
  paidAmount: number;
  pendingAmount: number;
  cotizaciones: Array<{
    id: string;
    name: string;
    price: number;
    discount: number | null;
    precioFinal: number; // price - discount
    pagado: number;
    pendiente: number;
  }>;
}

/**
 * Calcula los montos financieros de una promesa desde sus cotizaciones y pagos
 * Fuente única de verdad: Promesa → Cotizaciones → Pagos
 */
export async function getPromiseFinancials(
  promiseId: string
): Promise<PromiseFinancials> {
  // 1. Obtener todas las cotizaciones aprobadas de la promesa con snapshots de condiciones comerciales
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
      // Snapshots de condiciones comerciales (inmutables)
      condiciones_comerciales_discount_percentage_snapshot: true,
      pagos: {
        where: {
          status: { in: ['paid', 'completed', 'succeeded'] },
        },
        select: { amount: true },
      },
    },
  });

  // 2. Calcular total a pagar (suma de cotizaciones aprobadas considerando descuentos)
  // Priorizar descuento de snapshots de condiciones comerciales sobre campo discount directo
  const contractValue = cotizaciones.reduce((sum, c) => {
    const precioBase = Number(c.price);
    
    // Calcular descuento: priorizar snapshot de condiciones comerciales
    let descuentoMonto = 0;
    if (c.condiciones_comerciales_discount_percentage_snapshot != null) {
      // Usar descuento porcentual de condiciones comerciales (snapshot)
      const descuentoPorcentaje = Number(c.condiciones_comerciales_discount_percentage_snapshot);
      descuentoMonto = precioBase * (descuentoPorcentaje / 100);
    } else if (c.discount) {
      // Fallback al campo discount directo
      descuentoMonto = Number(c.discount);
    }
    
    const precioFinal = precioBase - descuentoMonto;
    return sum + precioFinal;
  }, 0);

  // 3. Calcular total pagado (suma de todos los pagos válidos)
  const paidAmount = cotizaciones.reduce(
    (sum, c) =>
      sum + c.pagos.reduce((pSum, p) => pSum + Number(p.amount), 0),
    0
  );

  // 4. Calcular pendiente
  const pendingAmount = contractValue - paidAmount;

  // 5. Detalle por cotización
  const cotizacionesDetalle = cotizaciones.map((c) => {
    const precioBase = Number(c.price);
    
    // Calcular descuento: priorizar snapshot de condiciones comerciales
    let descuentoMonto = 0;
    if (c.condiciones_comerciales_discount_percentage_snapshot != null) {
      // Usar descuento porcentual de condiciones comerciales (snapshot)
      const descuentoPorcentaje = Number(c.condiciones_comerciales_discount_percentage_snapshot);
      descuentoMonto = precioBase * (descuentoPorcentaje / 100);
    } else if (c.discount) {
      // Fallback al campo discount directo
      descuentoMonto = Number(c.discount);
    }
    
    const precioFinal = precioBase - descuentoMonto;
    const pagado = c.pagos.reduce((sum, p) => sum + Number(p.amount), 0);
    return {
      id: c.id,
      name: c.name,
      price: precioBase,
      discount: descuentoMonto > 0 ? descuentoMonto : (c.discount || null),
      precioFinal,
      pagado,
      pendiente: precioFinal - pagado,
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
 * Considera descuentos aplicados a las cotizaciones (prioriza snapshots de condiciones comerciales)
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
      // Snapshots de condiciones comerciales (inmutables)
      condiciones_comerciales_discount_percentage_snapshot: true,
    },
  });

  return cotizaciones.reduce((sum, c) => {
    const precioBase = Number(c.price);
    
    // Calcular descuento: priorizar snapshot de condiciones comerciales
    let descuentoMonto = 0;
    if (c.condiciones_comerciales_discount_percentage_snapshot != null) {
      // Usar descuento porcentual de condiciones comerciales (snapshot)
      const descuentoPorcentaje = Number(c.condiciones_comerciales_discount_percentage_snapshot);
      descuentoMonto = precioBase * (descuentoPorcentaje / 100);
    } else if (c.discount) {
      // Fallback al campo discount directo
      descuentoMonto = Number(c.discount);
    }
    
    return sum + (precioBase - descuentoMonto);
  }, 0);
}

