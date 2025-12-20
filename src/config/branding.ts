/**
 * Configuración centralizada de branding ZEN Studio
 * 
 * ESTRATEGIA:
 * - Marca: "ZEN" / "ZEN Studio" (en textos, UI, copyright)
 * - Dominio: "zenn.com" (solo en URLs clickeables)
 */

export const BRANDING = {
  // Marca principal
  name: 'ZEN',
  fullName: 'ZEN Studio',
  tagline: 'Plataforma para fotógrafos profesionales',
  
  // Dominio comercial
  domain: 'zenn.com',
  websiteUrl: 'https://zenn.com',
  
  // Copyright
  copyrightYear: new Date().getFullYear(),
  copyrightText: `© ${new Date().getFullYear()} ZEN Studio. Todos los derechos reservados.`,
  
  // Email
  emailFrom: 'ZEN',
  emailDomain: 'zenn.com',
  
  // SEO
  seo: {
    title: 'ZEN Studio - Plataforma para fotógrafos profesionales',
    description: 'Plataforma modular SaaS para estudios fotográficos. Gestiona tu negocio, portafolio, clientes y más.',
    keywords: ['fotografía', 'gestión', 'estudios fotográficos', 'saas', 'portfolio'],
  },
  
  // Social
  social: {
    twitter: '@zenstudio',
    instagram: '@zenstudio',
    facebook: 'zenstudio',
  },
  
  // Legal
  legal: {
    companyName: 'ZEN Studio',
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

