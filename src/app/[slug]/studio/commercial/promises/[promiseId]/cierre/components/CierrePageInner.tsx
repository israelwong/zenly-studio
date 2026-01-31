'use client';

import { usePromiseContext } from '../../context/PromiseContext';
import { PromiseCierreClient } from './PromiseCierreClient';

/**
 * Contenido de la página cierre: usa datos del layout (context).
 * La guarda de servidor en page.tsx ya validó que la promesa está en cierre.
 */
export function CierrePageInner() {
  const { cotizacionEnCierre } = usePromiseContext();
  return <PromiseCierreClient initialCotizacionEnCierre={cotizacionEnCierre ?? null} />;
}
