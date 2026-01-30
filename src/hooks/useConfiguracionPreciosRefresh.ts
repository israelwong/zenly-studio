import { useEffect, useCallback, useRef } from 'react';

// Evento personalizado para notificar cambios en configuración de precios
export const CONFIGURACION_PRECIOS_UPDATE_EVENT = 'configuracion-precios-update';

export interface ConfiguracionPreciosUpdateEventDetail {
  studioSlug: string;
  // Configuración completa en decimales (0.30 = 30%)
  utilidad_servicio?: number;
  utilidad_producto?: number;
  comision_venta?: number;
  sobreprecio?: number;
}

/**
 * Hook para disparar actualización de configuración de precios
 * Usar después de actualizar la configuración en UtilidadForm
 */
export function useConfiguracionPreciosRefresh() {
  const triggerUpdate = useCallback((studioSlug: string, config?: {
    utilidad_servicio?: number;
    utilidad_producto?: number;
    comision_venta?: number;
    sobreprecio?: number;
  }) => {
    // Validar que studioSlug sea un string y no un objeto
    if (typeof studioSlug !== 'string') {
      console.error('[useConfiguracionPreciosRefresh] ❌ Error: studioSlug debe ser un string, recibido:', typeof studioSlug, studioSlug);
      return;
    }

    window.dispatchEvent(
      new CustomEvent<ConfiguracionPreciosUpdateEventDetail>(CONFIGURACION_PRECIOS_UPDATE_EVENT, {
        detail: {
          studioSlug: studioSlug as string,
          utilidad_servicio: config?.utilidad_servicio,
          utilidad_producto: config?.utilidad_producto,
          comision_venta: config?.comision_venta,
          sobreprecio: config?.sobreprecio,
        },
      })
    );
  }, []);

  return { triggerUpdate };
}

/**
 * Hook para escuchar actualizaciones de configuración de precios
 * Usar en componentes que necesitan recargar cuando cambia la configuración
 *
 * Estabilización: onUpdate se guarda en ref para que el useEffect solo dependa de studioSlug
 * (evita registrar/desregistrar en bucle cuando el padre pasa un callback sin useCallback)
 */
export function useConfiguracionPreciosUpdateListener(
  studioSlug: string,
  onUpdate: (config?: ConfiguracionPreciosUpdateEventDetail) => void
) {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const lastCallRef = useRef<{ slug: string; ts: number }>({ slug: '', ts: 0 });
  const THROTTLE_MS = 800;

  // Nombre del canal estable: solo depende del slug (primitivo)
  const slugStable = typeof studioSlug === 'string' ? studioSlug : '';

  useEffect(() => {
    if (!slugStable) return;

    const handleUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<ConfiguracionPreciosUpdateEventDetail>;
      const detail = customEvent.detail;
      if (!detail?.studioSlug || detail.studioSlug !== slugStable) return;
      const now = Date.now();
      if (lastCallRef.current.slug === slugStable && now - lastCallRef.current.ts < THROTTLE_MS) return;
      lastCallRef.current = { slug: slugStable, ts: now };
      onUpdateRef.current?.(detail);
    };

    window.addEventListener(CONFIGURACION_PRECIOS_UPDATE_EVENT, handleUpdate);
    return () => window.removeEventListener(CONFIGURACION_PRECIOS_UPDATE_EVENT, handleUpdate);
  }, [slugStable]);
}

