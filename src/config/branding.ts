/**
 * Configuración centralizada de branding Zenly Studio
 * 
 * @deprecated Este archivo mantiene valores por defecto para compatibilidad.
 * Preferir usar hooks de usePlatformConfig para obtener datos desde BD:
 * - useCommercialName() - Nombre comercial
 * - useCommercialNameShort() - Nombre corto
 * - usePlatformDomain() - Dominio
 * - usePlatformBranding() - Información completa
 * 
 * ESTRATEGIA:
 * - Marca: "Zenly México" (legal) / "Zenly Studio" (comercial)
 * - Dominio: "zenly.mx" (desde BD)
 */

export const BRANDING = {
  // Marca principal (valores por defecto, usar BD cuando esté disponible)
  name: 'ZENLY',
  fullName: 'Zenly Studio',
  tagline: 'Plataforma para estudios fotográficos profesionales',

  // Dominio comercial (valores por defecto)
  domain: 'zenly.mx',
  websiteUrl: 'https://zenly.mx',

  // Copyright
  copyrightYear: new Date().getFullYear(),
  copyrightText: `© ${new Date().getFullYear()} Zenly Studio. Todos los derechos reservados.`,

  // Email
  emailFrom: 'ZENLY',
  emailDomain: 'zenly.mx',

  // SEO (valores por defecto)
  seo: {
    title: 'Zenly Studio - Plataforma para fotógrafos profesionales',
    description: 'Plataforma modular SaaS para estudios fotográficos. Gestiona tu negocio, portafolio, clientes y más.',
    keywords: ['fotografía', 'gestión', 'estudios fotográficos', 'saas', 'portfolio'],
  },

  // Social (deprecated - no usar)
  social: {
    twitter: '@zenlystudio',
    instagram: '@zenlystudio',
    facebook: 'zenlystudio',
  },

  // Legal
  legal: {
    companyName: 'Zenly México',
    commercialName: 'Zenly Studio',
    country: 'México',
  }
} as const;

// Helper para construir emails
export const getEmailAddress = (prefix: string) => {
  return `${prefix}@${BRANDING.emailDomain}`;
};

// Emails comunes
export const EMAILS = {
  noreply: getEmailAddress('noreply'),
  support: getEmailAddress('support'),
  hello: getEmailAddress('hello'),
  billing: getEmailAddress('billing'),
} as const;

