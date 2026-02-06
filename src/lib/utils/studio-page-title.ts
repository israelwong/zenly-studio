/**
 * Títulos de página del Studio (pestaña del navegador y document.title).
 * Usar en generateMetadata (server) y en document.title (client) para consistencia y UTF-8 correcto.
 */

export const DEFAULT_STUDIO_NAME = 'Zenly Studio';

/** Nombres de página en español (UTF-8). Evitar strings hardcodeados con encoding incorrecto. */
export const STUDIO_PAGE_NAMES = {
  COTIZACION: 'Cotización',
  NUEVA_COTIZACION: 'Nueva Cotización',
  EDITAR_COTIZACION: 'Editar Cotización',
  PROMESAS: 'Promesas',
  EVENTOS: 'Eventos',
  EVENTO: 'Evento',
  CLIENTES: 'Clientes',
  FINANZAS: 'Finanzas',
  DASHBOARD: 'Dashboard',
  CONTRATOS: 'Contratos',
  INTEGRACIONES: 'Integraciones',
  IDENTIDAD: 'Identidad',
  AYUDA: 'Ayuda',
  PLAN: 'Plan',
  SCHEDULER: 'Scheduler',
  CONVERSACIONES: 'Conversaciones',
  EMAIL: 'Email',
  PORTAFOLIO: 'Portafolio',
  NUEVO_PORTAFOLIO: 'Nuevo Portafolio',
  NUEVA_OFERTA: 'Nueva Oferta',
  OFERTA: 'Oferta',
  CONFIGURACION_CUENTA: 'Configuración de Cuenta',
  PERFIL_NEGOCIO: 'Perfil de Negocio',
  PERSONAL: 'Personal',
  PLANTILLAS_WHATSAPP: 'Plantillas WhatsApp',
} as const;

/**
 * Construye el título de pestaña para una página del Studio.
 * Formato: "{studioName} - {pageName}"
 */
export function getStudioPageTitle(
  pageName: string,
  studioName?: string | null
): string {
  const base = studioName?.trim() || DEFAULT_STUDIO_NAME;
  return `${base} - ${pageName}`;
}
