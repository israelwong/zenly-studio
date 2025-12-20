'use client';

import { useEffect } from 'react';

/**
 * Hook para actualizar el favicon dinámicamente
 */
export function useFavicon(faviconUrl: string | null | undefined, studioName?: string) {
  useEffect(() => {
    if (!faviconUrl) return;

    // Buscar o crear el elemento link del favicon
    let link = document.querySelector<HTMLLinkElement>("link[rel*='icon']");
    
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }

    link.href = faviconUrl;

    // Actualizar el título de la pestaña si se proporciona studioName
    if (studioName) {
      document.title = `${studioName} - Portal de Cliente`;
    }

    // Cleanup: restaurar favicon por defecto al desmontar (opcional)
    return () => {
      // No restauramos para mantener consistencia durante navegación
    };
  }, [faviconUrl, studioName]);
}

