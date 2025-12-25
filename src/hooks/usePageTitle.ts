'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

interface UsePageTitleOptions {
  sectionName: string;
  studioName?: string | null;
}

const sectionTitles: Record<string, string> = {
  '': 'Resumen del evento',
  'entrega-digital': 'Entrega Digital',
  'contrato': 'Contrato',
  'pagos': 'Pagos',
  'cotizaciones': 'Cotizaciones',
};

export function usePageTitle({ sectionName, studioName }: UsePageTitleOptions) {
  const pathname = usePathname();

  useEffect(() => {
    const section = sectionTitles[sectionName] || sectionName;
    const baseTitle = studioName || 'ZEN Platform';
    const title = `${section} - ${baseTitle}`;

    document.title = title;

    // Actualizar meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', `Gestiona ${section.toLowerCase()} con ${baseTitle}`);
    }

    // Actualizar Open Graph title
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      ogTitle.setAttribute('content', title);
    }

    // Actualizar Twitter/X title
    const twitterTitle = document.querySelector('meta[name="twitter:title"]');
    if (twitterTitle) {
      twitterTitle.setAttribute('content', title);
    }
  }, [sectionName, studioName, pathname]);
}

