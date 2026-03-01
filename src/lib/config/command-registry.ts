/**
 * Registro de comandos para el buscador global (Cmd+K).
 * Cada entrada es buscable por label, description y keywords (sinónimos).
 */

export type CommandCategory = 'Navegación' | 'Herramientas Rápidas' | 'Configuración' | 'Ayuda';

export type CommandActionType = 'route' | 'modal' | 'callback';

export interface CommandEntry {
  id: string;
  label: string;
  description?: string;
  category: CommandCategory;
  keywords: string[];
  /** Tipo de acción: route = navegación, modal = CustomEvent, callback = función inyectada */
  actionType: CommandActionType;
  /**
   * Según actionType:
   * - route: path con studioSlug inyectado (ej. /${slug}/studio/...)
   * - modal: nombre del CustomEvent (ej. open-capacidad-operativa-modal)
   * - callback: clave del callback (agenda | contacts | magic | personal)
   */
  action: string;
}

/**
 * Construye el registro de comandos con el slug del estudio.
 * Rutas usan el slug; modales y callbacks no.
 */
export function getCommandRegistry(studioSlug: string): CommandEntry[] {
  const s = studioSlug;
  return [
    // ——— Configuración (modales vía CustomEvent) ———
    {
      id: 'capacidad-operativa',
      label: 'Capacidad Operativa',
      description: 'Máximo de eventos por día en el estudio',
      category: 'Configuración',
      keywords: ['cupo', 'límite', 'límites', 'saturación', 'agenda', 'máximo', 'eventos por día', 'capacidad', 'día'],
      actionType: 'modal',
      action: 'open-capacidad-operativa-modal',
    },
    {
      id: 'rentabilidad',
      label: 'Configuración de Rentabilidad',
      description: 'Utilidad, comisiones y sobreprecios',
      category: 'Configuración',
      keywords: ['rentabilidad', 'utilidad', 'margen', 'sobreprecio', 'comisión', 'precios', 'cotización'],
      actionType: 'modal',
      action: 'open-rentabilidad-modal',
    },
    {
      id: 'condiciones',
      label: 'Condiciones Comerciales',
      description: 'Condiciones y métodos de pago',
      category: 'Configuración',
      keywords: ['condiciones', 'pago', 'utilidad', 'descuento', 'comercial'],
      actionType: 'modal',
      action: 'open-condiciones-modal',
    },
    {
      id: 'pagos',
      label: 'Métodos de Pago',
      description: 'Transferencias y medios de pago',
      category: 'Configuración',
      keywords: ['pagos', 'transferencia', 'clabe', 'tarjeta', 'efectivo'],
      actionType: 'modal',
      action: 'open-payment-methods-modal',
    },
    {
      id: 'contratos',
      label: 'Plantilla de Contratos',
      description: 'Plantillas de contratos reutilizables',
      category: 'Configuración',
      keywords: ['contratos', 'plantilla', 'documentos', 'legal'],
      actionType: 'modal',
      action: 'open-contracts-modal',
    },
    {
      id: 'tipos-evento',
      label: 'Tipos de Evento',
      description: 'Tipos de eventos para promesas',
      category: 'Configuración',
      keywords: ['tipos', 'evento', 'boda', 'quinceañera', 'paquetes', 'servicios'],
      actionType: 'modal',
      action: 'open-event-types-modal',
    },
    // ——— Herramientas Rápidas (callbacks) ———
    {
      id: 'agenda',
      label: 'Agenda',
      description: 'Vista de agenda unificada',
      category: 'Herramientas Rápidas',
      keywords: ['agenda', 'calendario', 'citas', 'eventos', 'fecha'],
      actionType: 'callback',
      action: 'agenda',
    },
    {
      id: 'contactos',
      label: 'Contactos',
      description: 'Lista de contactos',
      category: 'Herramientas Rápidas',
      keywords: ['contactos', 'clientes', 'personas', 'lead'],
      actionType: 'callback',
      action: 'contacts',
    },
    {
      id: 'zen-magic',
      label: 'ZEN Magic',
      description: 'Asistente de IA',
      category: 'Herramientas Rápidas',
      keywords: ['magic', 'ia', 'asistente', 'ayuda', 'zen'],
      actionType: 'callback',
      action: 'magic',
    },
    {
      id: 'personal',
      label: 'Personal',
      description: 'Gestión de personal',
      category: 'Herramientas Rápidas',
      keywords: ['personal', 'equipo', 'crew', 'staff'],
      actionType: 'callback',
      action: 'personal',
    },
    // ——— Navegación (rutas con studioSlug) ———
    {
      id: 'dashboard',
      label: 'Dashboard',
      description: 'Panel principal',
      category: 'Navegación',
      keywords: ['dashboard', 'inicio', 'panel', 'resumen'],
      actionType: 'route',
      action: `/${s}/studio/commercial/dashboard`,
    },
    {
      id: 'business',
      label: 'Business',
      description: 'Eventos de negocio',
      category: 'Navegación',
      keywords: ['business', 'eventos', 'negocio'],
      actionType: 'route',
      action: `/${s}/studio/business/events`,
    },
    {
      id: 'promesas',
      label: 'Promesas',
      description: 'Pipeline de promesas',
      category: 'Navegación',
      keywords: ['promesas', 'pipeline', 'prospectos', 'cotización'],
      actionType: 'route',
      action: `/${s}/studio/commercial/promises`,
    },
    {
      id: 'catalogo',
      label: 'Oferta Comercial / Catálogo',
      description: 'Catálogo de servicios y productos',
      category: 'Navegación',
      keywords: ['catálogo', 'catalogo', 'oferta', 'comercial', 'servicios', 'productos', 'precios'],
      actionType: 'route',
      action: `/${s}/studio/commercial/catalogo`,
    },
    {
      id: 'paquetes',
      label: 'Paquetes',
      description: 'Paquetes y ofertas empaquetadas',
      category: 'Navegación',
      keywords: ['paquetes', 'pack', 'ofertas', 'combo', 'boda', 'evento'],
      actionType: 'route',
      action: `/${s}/studio/commercial/paquetes`,
    },
    {
      id: 'portafolios',
      label: 'Portafolios',
      description: 'Portafolios y galerías',
      category: 'Navegación',
      keywords: ['portafolios', 'portfolio', 'galería', 'galerias', 'fotos', 'trabajos'],
      actionType: 'route',
      action: `/${s}/studio/commercial/portafolios`,
    },
    {
      id: 'contratos-nav',
      label: 'Contratos',
      description: 'Configuración de contratos',
      category: 'Navegación',
      keywords: ['contratos', 'plantillas', 'documentos'],
      actionType: 'route',
      action: `/${s}/studio/config/contratos`,
    },
    {
      id: 'finanzas',
      label: 'Finanzas',
      description: 'Finanzas del estudio',
      category: 'Navegación',
      keywords: ['finanzas', 'ingresos', 'gastos', 'dinero'],
      actionType: 'route',
      action: `/${s}/studio/business/finanzas`,
    },
    {
      id: 'ofertas',
      label: 'Ofertas',
      description: 'Campañas y ofertas',
      category: 'Navegación',
      keywords: ['ofertas', 'campañas', 'megaphone'],
      actionType: 'route',
      action: `/${s}/studio/commercial/ofertas`,
    },
    {
      id: 'analytics',
      label: 'Analytics',
      description: 'Métricas y análisis',
      category: 'Navegación',
      keywords: ['analytics', 'métricas', 'estadísticas', 'gráficas'],
      actionType: 'route',
      action: `/${s}/studio/commercial/dashboard`,
    },
    // ——— Ayuda ———
    {
      id: 'documentacion',
      label: 'Documentación',
      description: 'Ayuda y documentación',
      category: 'Ayuda',
      keywords: ['documentación', 'ayuda', 'docs'],
      actionType: 'route',
      action: '#help-docs',
    },
    {
      id: 'atajos',
      label: 'Atajos de Teclado',
      description: 'Lista de atajos',
      category: 'Ayuda',
      keywords: ['atajos', 'teclado', 'shortcuts', 'comandos'],
      actionType: 'route',
      action: '#help-shortcuts',
    },
  ];
}

/** Orden de categorías para agrupar en la UI */
export const COMMAND_CATEGORY_ORDER: CommandCategory[] = [
  'Herramientas Rápidas',
  'Navegación',
  'Configuración',
  'Ayuda',
];
