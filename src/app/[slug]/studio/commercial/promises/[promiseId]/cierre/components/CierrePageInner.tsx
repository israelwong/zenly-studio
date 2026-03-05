'use client';

import { usePromiseContext } from '../../context/PromiseContext';
import { PromiseCierreClient } from './PromiseCierreClient';

/**
 * Contenido de la página cierre: usa datos del layout (context).
 * La guarda de servidor en page.tsx ya validó que la promesa está en cierre.
 * initialMetodosPago: inyectados desde el servidor (cache) para dropdown instantáneo.
 */
export function CierrePageInner({
  initialMetodosPago = [],
}: {
  initialMetodosPago?: Array<{ id: string; payment_method_name: string }>;
}) {
  const { cotizacionEnCierre } = usePromiseContext();
  return (
    <PromiseCierreClient
      initialCotizacionEnCierre={cotizacionEnCierre ?? null}
      initialMetodosPago={initialMetodosPago}
    />
  );
}
