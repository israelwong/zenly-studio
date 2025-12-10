'use client';

import { useEffect } from 'react';

/**
 * Hook para actualizar el favicon dinámicamente en el cliente
 * Útil cuando el logo del studio cambia sin hacer reload de la página
 * 
 * @param logoUrl - URL del logo del studio (puede ser null)
 * 
 * @example
 * ```tsx
 * function ProfileHeader({ logoUrl }) {
 *   useDynamicFavicon(logoUrl);
 *   // ...
 * }
 * ```
 */
export function useDynamicFavicon(logoUrl: string | null | undefined) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Si no hay logo, no actualizar favicon (usa el default)
    if (!logoUrl) return;

    // Buscar o crear link tags para favicon
    const updateFavicon = () => {
      // Favicon estándar
      let favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (!favicon) {
        favicon = document.createElement('link');
        favicon.rel = 'icon';
        document.head.appendChild(favicon);
      }
      favicon.href = logoUrl;

      // Shortcut icon (para compatibilidad)
      let shortcut = document.querySelector<HTMLLinkElement>('link[rel="shortcut icon"]');
      if (!shortcut) {
        shortcut = document.createElement('link');
        shortcut.rel = 'shortcut icon';
        document.head.appendChild(shortcut);
      }
      shortcut.href = logoUrl;

      // Apple touch icon
      let appleTouchIcon = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
      if (!appleTouchIcon) {
        appleTouchIcon = document.createElement('link');
        appleTouchIcon.rel = 'apple-touch-icon';
        document.head.appendChild(appleTouchIcon);
      }
      appleTouchIcon.href = logoUrl;

      // Agregar timestamp para forzar actualización
      const timestamp = Date.now();
      favicon.href = `${logoUrl}${logoUrl.includes('?') ? '&' : '?'}t=${timestamp}`;
      shortcut.href = `${logoUrl}${logoUrl.includes('?') ? '&' : '?'}t=${timestamp}`;
      appleTouchIcon.href = `${logoUrl}${logoUrl.includes('?') ? '&' : '?'}t=${timestamp}`;
    };

    updateFavicon();

    // Cleanup: no es necesario revertir el favicon al desmontar
    // ya que queremos que persista el nuevo
  }, [logoUrl]);
}

/**
 * Función standalone para actualizar favicon desde cualquier lugar
 * Útil para llamar después de actualizar el logo
 * 
 * @example
 * ```tsx
 * const handleLogoUpdate = async (newUrl: string) => {
 *   await updateStudioLogo(studioSlug, { logo_url: newUrl });
 *   updateFavicon(newUrl); // ← Actualizar favicon inmediatamente
 *   router.refresh();
 * };
 * ```
 */
export function updateFavicon(logoUrl: string | null) {
  if (typeof window === 'undefined') return;
  if (!logoUrl) return;

  const timestamp = Date.now();
  const faviconUrl = `${logoUrl}${logoUrl.includes('?') ? '&' : '?'}t=${timestamp}`;

  // Actualizar todos los link tags de favicon
  const selectors = [
    'link[rel="icon"]',
    'link[rel="shortcut icon"]',
    'link[rel="apple-touch-icon"]'
  ];

  selectors.forEach(selector => {
    const links = document.querySelectorAll<HTMLLinkElement>(selector);
    links.forEach(link => {
      link.href = faviconUrl;
    });
  });

  // Si no existen, crear nuevos
  if (document.querySelectorAll('link[rel="icon"]').length === 0) {
    const favicon = document.createElement('link');
    favicon.rel = 'icon';
    favicon.href = faviconUrl;
    document.head.appendChild(favicon);
  }
}
