import type { PrismaClient } from '@prisma/client';

type PrismaClientLike = Pick<
  PrismaClient,
  'studio_condiciones_comerciales' | 'studio_condiciones_comerciales_negociacion'
>;

/**
 * Anticipo mínimo requerido (A_req) según condición comercial o negociación.
 * Usado para split contable: si M_staff > A_req se crean dos registros (anticipo + abono).
 */
export async function getAnticipoRequeridoCierre(
  client: PrismaClientLike,
  cotizacionId: string,
  precioBase: number,
  condicionesComercialesId?: string | null
): Promise<number> {
  if (condicionesComercialesId) {
    const cond = await client.studio_condiciones_comerciales.findUnique({
      where: { id: condicionesComercialesId },
      select: { advance_type: true, advance_percentage: true, advance_amount: true },
    });
    if (cond) {
      const isFixed = cond.advance_type === 'fixed_amount' || cond.advance_type === 'amount';
      const ant = isFixed && cond.advance_amount != null
        ? Number(cond.advance_amount)
        : Math.round(precioBase * ((cond.advance_percentage ?? 0) / 100));
      return ant > 0 ? ant : 0;
    }
  }
  const neg = await client.studio_condiciones_comerciales_negociacion.findUnique({
    where: { cotizacion_id: cotizacionId },
    select: { advance_type: true, advance_percentage: true, advance_amount: true },
  });
  if (neg) {
    const isFixed = neg.advance_type === 'fixed_amount' || neg.advance_type === 'amount';
    const ant = isFixed && neg.advance_amount != null
      ? Number(neg.advance_amount)
      : Math.round(precioBase * ((neg.advance_percentage ?? 0) / 100));
    return ant > 0 ? ant : 0;
  }
  return 0;
}
