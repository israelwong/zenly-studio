import { prisma } from '@/lib/prisma';

export interface PromiseFinancials {
  contractValue: number;
  paidAmount: number;
  pendingAmount: number;
  cotizaciones: Array<{
    id: string;
    name: string;
    price: number;
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
  // 1. Obtener todas las cotizaciones aprobadas de la promesa
  const cotizaciones = await prisma.studio_cotizaciones.findMany({
    where: {
      promise_id: promiseId,
      status: { in: ['aprobada', 'autorizada', 'approved'] },
    },
    include: {
      pagos: {
        where: {
          status: { in: ['paid', 'completed', 'succeeded'] },
        },
        select: { amount: true },
      },
    },
  });

  // 2. Calcular total a pagar (suma de cotizaciones aprobadas)
  const contractValue = cotizaciones.reduce(
    (sum, c) => sum + Number(c.price),
    0
  );

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
    const pagado = c.pagos.reduce((sum, p) => sum + Number(p.amount), 0);
    return {
      id: c.id,
      name: c.name,
      price: Number(c.price),
      pagado,
      pendiente: Number(c.price) - pagado,
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
 */
export async function getPromiseContractValue(
  promiseId: string
): Promise<number> {
  const cotizaciones = await prisma.studio_cotizaciones.findMany({
    where: {
      promise_id: promiseId,
      status: { in: ['aprobada', 'autorizada', 'approved'] },
    },
    select: { price: true },
  });

  return cotizaciones.reduce((sum, c) => sum + Number(c.price), 0);
}

