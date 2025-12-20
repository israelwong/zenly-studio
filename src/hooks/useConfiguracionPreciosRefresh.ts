import { useEffect, useCallback } from 'react';

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

    console.log('[useConfiguracionPreciosRefresh] 📢 Disparando evento de actualización:', { studioSlug, config });

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
 */
export function useConfiguracionPreciosUpdateListener(
  studioSlug: string,
  onUpdate: (config?: ConfiguracionPreciosUpdateEventDetail) => void
) {
  useEffect(() => {
    console.log('[useConfiguracionPreciosUpdateListener] 👂 Registrando listener para:', studioSlug);

    const handleUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<ConfiguracionPreciosUpdateEventDetail>;
      console.log('[useConfiguracionPreciosUpdateListener] 📨 Evento recibido:', customEvent.detail);

      if (customEvent.detail?.studioSlug === studioSlug) {
        console.log('[useConfiguracionPreciosUpdateListener] ✅ Slug coincide, ejecutando callback');
        onUpdate(customEvent.detail);
      } else {
        console.log('[useConfiguracionPreciosUpdateListener] ⚠️ Slug no coincide:', customEvent.detail?.studioSlug, 'vs', studioSlug);
      }
    };

    window.addEventListener(CONFIGURACION_PRECIOS_UPDATE_EVENT, handleUpdate);

    return () => {
      console.log('[useConfiguracionPreciosUpdateListener] 🔌 Desregistrando listener para:', studioSlug);
      window.removeEventListener(CONFIGURACION_PRECIOS_UPDATE_EVENT, handleUpdate);
    };
  }, [studioSlug, onUpdate]);
}

