'use client';

import React, { forwardRef } from 'react';
import { ResumenPago, type ResumenPagoProps } from '@/components/shared/precio';

/**
 * Resumen de Pago para cotizaciones/promesa (vista pública y autorización).
 * Re-exporta el componente compartido ResumenPago con margen superior (mt-4) por defecto.
 */
export const PrecioDesglose = forwardRef<HTMLDivElement, ResumenPagoProps>(
  (props, ref) => <ResumenPago ref={ref} {...props} compact={false} />
);

PrecioDesglose.displayName = 'PrecioDesglose';
