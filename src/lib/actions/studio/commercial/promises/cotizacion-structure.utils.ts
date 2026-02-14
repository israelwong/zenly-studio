/**
 * Utilidades para construir estructura jerárquica de cotizaciones
 * Fuente única de verdad para agrupar items por Sección → Categoría → Items
 */

export interface CotizacionItemInput {
  // Snapshots (prioridad - inmutables)
  seccion_name_snapshot?: string | null;
  category_name_snapshot?: string | null;
  name_snapshot?: string | null;
  description_snapshot?: string | null;
  // Campos operacionales (fallback - mutables)
  seccion_name?: string | null;
  category_name?: string | null;
  name?: string | null;
  description?: string | null;
  // Datos del item
  quantity: number;
  subtotal: number;
  unit_price?: number;
  item_id?: string | null;
  id?: string;
  order?: number;
  // ⚠️ HIGIENE DE DATOS: Orden de sección y categoría desde catálogo
  seccion_orden?: number;
  categoria_orden?: number;
  // Campos adicionales opcionales
  cost?: number;
  expense?: number;
  [key: string]: unknown;
}

export interface CategoriaEstructura {
  nombre: string;
  orden: number;
  items: Array<{
    nombre: string;
    descripcion?: string;
    cantidad: number;
    subtotal: number;
    unit_price?: number;
    item_id?: string | null;
    id?: string;
    order?: number;
    [key: string]: unknown;
  }>;
}

export interface SeccionEstructura {
  nombre: string;
  orden: number;
  categorias: CategoriaEstructura[];
}

export interface EstructuraJerarquica {
  secciones: SeccionEstructura[];
  total: number;
}

export interface ConstruirEstructuraOptions {
  /**
   * Incluir precio unitario en los items
   * @default false
   */
  incluirPrecios?: boolean;
  /**
   * Incluir descripciones en los items
   * @default true
   */
  incluirDescripciones?: boolean;
  /**
   * Método de ordenamiento:
   * - 'insercion': Mantiene orden de inserción (basado en order del item)
   * - 'incremental': Asigna orden incremental basado en primera aparición
   * - 'catalogo': Usa orden de sección y categoría desde catálogo (seccion_orden, categoria_orden)
   * @default 'incremental'
   */
  ordenarPor?: 'insercion' | 'incremental' | 'catalogo';
}

/**
 * Construye estructura jerárquica Sección → Categoría → Items desde items de cotización
 * 
 * Fuente única de verdad para agrupar items de cotización.
 * Usa snapshots primero (inmutables), luego campos operacionales como fallback.
 * 
 * @param items - Array de items de cotización con snapshots y campos operacionales
 * @param options - Opciones de construcción
 * @returns Estructura jerárquica con secciones, categorías e items
 * 
 * @example
 * ```typescript
 * const estructura = construirEstructuraJerarquicaCotizacion(
 *   cotizacion.cotizacion_items,
 *   { incluirPrecios: true, incluirDescripciones: true }
 * );
 * ```
 */
export function construirEstructuraJerarquicaCotizacion(
  items: CotizacionItemInput[],
  options: ConstruirEstructuraOptions = {}
): EstructuraJerarquica {
  const {
    incluirPrecios = false,
    incluirDescripciones = true,
    ordenarPor = 'incremental',
  } = options;

  // Map para mantener orden de inserción y asignar orden incremental
  const seccionesMap = new Map<string, {
    nombre: string;
    orden: number;
    categorias: Map<string, {
      nombre: string;
      orden: number;
      items: Array<{
        nombre: string;
        descripcion?: string;
        cantidad: number;
        subtotal: number;
        unit_price?: number;
        item_id?: string | null;
        id?: string;
        order?: number;
        [key: string]: unknown;
      }>;
    }>;
  }>();

  let seccionOrdenCounter = 0;
  const seccionOrdenMap = new Map<string, number>();
  const categoriaOrdenMap = new Map<string, number>();

  // Procesar cada item (omitir null/undefined; arrays vacíos no entran)
  (items ?? []).forEach((item) => {
    if (!item) return;
    // Usar snapshots primero (más confiables), luego campos operacionales como fallback
    const seccionNombre = item.seccion_name_snapshot || item.seccion_name || "Sin sección";
    const categoriaNombre = item.category_name_snapshot || item.category_name || "Sin categoría";
    const itemNombre = item.name_snapshot || item.name || "Item sin nombre";
    const itemDescripcion = incluirDescripciones
      ? (item.description_snapshot || item.description || undefined)
      : undefined;

    // Asignar orden según método seleccionado
    if (ordenarPor === 'incremental') {
      // Asignar orden a sección si es la primera vez que la vemos
      if (!seccionOrdenMap.has(seccionNombre)) {
        seccionOrdenMap.set(seccionNombre, seccionOrdenCounter++);
      }

      // Obtener o crear sección
      if (!seccionesMap.has(seccionNombre)) {
        seccionesMap.set(seccionNombre, {
          nombre: seccionNombre,
          orden: seccionOrdenMap.get(seccionNombre)!,
          categorias: new Map(),
        });
      }

      const seccionData = seccionesMap.get(seccionNombre)!;

      // Asignar orden a categoría dentro de la sección si es la primera vez que la vemos
      const categoriaKey = `${seccionNombre}::${categoriaNombre}`;
      if (!categoriaOrdenMap.has(categoriaKey)) {
        categoriaOrdenMap.set(categoriaKey, seccionData.categorias.size);
      }

      // Obtener o crear categoría
      if (!seccionData.categorias.has(categoriaNombre)) {
        seccionData.categorias.set(categoriaNombre, {
          nombre: categoriaNombre,
          orden: categoriaOrdenMap.get(categoriaKey)!,
          items: [],
        });
      }
    } else if (ordenarPor === 'catalogo') {
      // ⚠️ HIGIENE DE DATOS: Usar orden de sección y categoría desde catálogo
      const seccionOrden = item.seccion_orden ?? 999;
      const categoriaOrden = item.categoria_orden ?? 999;

      // Obtener o crear sección con orden del catálogo
      if (!seccionesMap.has(seccionNombre)) {
        seccionesMap.set(seccionNombre, {
          nombre: seccionNombre,
          orden: seccionOrden,
          categorias: new Map(),
        });
      }

      const seccionData = seccionesMap.get(seccionNombre)!;

      // Obtener o crear categoría con orden del catálogo
      if (!seccionData.categorias.has(categoriaNombre)) {
        seccionData.categorias.set(categoriaNombre, {
          nombre: categoriaNombre,
          orden: categoriaOrden,
          items: [],
        });
      }
    } else {
      // Orden por inserción: usar orden del item si existe
      if (!seccionesMap.has(seccionNombre)) {
        seccionesMap.set(seccionNombre, {
          nombre: seccionNombre,
          orden: item.order ?? 999,
          categorias: new Map(),
        });
      }

      const seccionData = seccionesMap.get(seccionNombre)!;

      if (!seccionData.categorias.has(categoriaNombre)) {
        seccionData.categorias.set(categoriaNombre, {
          nombre: categoriaNombre,
          orden: item.order ?? 999,
          items: [],
        });
      }
    }

    // Agregar item a la categoría
    const categoriaData = seccionesMap.get(seccionNombre)?.categorias.get(categoriaNombre);
    if (!categoriaData) return;
    
    const itemData: {
      nombre: string;
      descripcion?: string;
      cantidad: number;
      subtotal: number;
      unit_price?: number;
      item_id?: string | null;
      id?: string;
      order?: number;
      [key: string]: unknown;
    } = {
      nombre: itemNombre,
      cantidad: item.quantity,
      subtotal: item.subtotal,
    };

    if (incluirDescripciones && itemDescripcion) {
      itemData.descripcion = itemDescripcion;
    }

    if (incluirPrecios && item.unit_price !== undefined) {
      itemData.unit_price = item.unit_price;
    }

    if (item.item_id !== undefined) {
      itemData.item_id = item.item_id;
    }

    if (item.id !== undefined) {
      itemData.id = item.id;
    }

    if (item.order !== undefined) {
      itemData.order = item.order;
    }

    // Preservar billing_type si existe
    if (item.billing_type !== undefined) {
      itemData.billing_type = item.billing_type;
    }

    // ⚠️ HIGIENE DE DATOS: Ordenar items dentro de la categoría por order
    categoriaData.items.push(itemData);
  });

  // ⚠️ HIGIENE DE DATOS: Ordenar items dentro de cada categoría por order
  seccionesMap.forEach(seccion => {
    seccion.categorias.forEach(categoria => {
      categoria.items.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    });
  });

  // Convertir a formato final y ordenar (secciones/categorías sin ítems se mantienen; items vacíos = [])
  const secciones = Array.from(seccionesMap.values())
    .sort((a, b) => a.orden - b.orden)
    .map(seccion => ({
      nombre: seccion?.nombre ?? 'Sin sección',
      orden: seccion?.orden ?? 999,
      categorias: Array.from(seccion?.categorias?.values() ?? [])
        .sort((a, b) => (a?.orden ?? 999) - (b?.orden ?? 999))
        .map(categoria => ({
          nombre: categoria?.nombre ?? 'Sin categoría',
          orden: categoria?.orden ?? 999,
          items: categoria?.items ?? [],
        })),
    }));

  // Calcular total
  const total = (items ?? []).reduce((sum, item) => sum + (item?.subtotal ?? 0), 0);

  return {
    secciones,
    total,
  };
}

/**
 * Devuelve los ids de cotizacion_item en el orden canónico de la estructura (sección → categoría → ítem).
 * Usar para asignar visualIndex/order en scheduler a partir de la fuente única de verdad.
 */
export function aplanarEstructuraAOrdenIds(estructura: EstructuraJerarquica): string[] {
  const ids: string[] = [];
  for (const s of estructura.secciones ?? []) {
    const categorias = s?.categorias ?? [];
    if (categorias.length === 0) continue;
    for (const c of categorias) {
      const items = c?.items ?? [];
      if (items.length === 0) continue;
      for (const item of items) {
        if (item?.id != null) ids.push(item.id);
      }
    }
  }
  return ids;
}

/** Peso por nombre para desempate (Shooting/Sesión primero, Asistencia después). Mismo criterio que sync. */
/** Limpia el nombre antes de calcular peso: lowercase, trim, quita sufijos como "- modificado". */
function limpiarNombreParaPeso(name: string | null | undefined, nameSnapshot: string | null | undefined): string {
  const raw = (name ?? nameSnapshot ?? '').toString();
  return raw
    .toLowerCase()
    .trim()
    .replace(/\s*-\s*modificado\s*$/i, '')
    .trim();
}

/**
 * Peso para desempate dentro de la misma categoría (orden canónico).
 * 0 = Shooting/sesión (primero), 1000 = otros, 5000 = asistencia/asistente (último).
 */
export function pesoPorNombreCotizacion(name: string | null | undefined, nameSnapshot: string | null | undefined): number {
  const n = limpiarNombreParaPeso(name, nameSnapshot);
  if (n.includes('shooting') || n.includes('sesión') || n.includes('sesion')) return 0;
  if (n.includes('asistencia') || n.includes('asistente')) return 5000;
  return 1000;
}

/** Catálogo mínimo para construir mapa de orden (sección → categoría). Solo order, una sola fuente de verdad. */
export type CatalogoParaOrden = Array<{ id: string; order: number; categorias: Array<{ id: string; order: number }> }>;

export function buildCategoryOrderMap(secciones: CatalogoParaOrden): Map<string, { sectionOrden: number; categoryOrden: number }> {
  const map = new Map<string, { sectionOrden: number; categoryOrden: number }>();
  (secciones ?? []).forEach((sec, sIdx) => {
    if (sec == null) return;
    (sec.categorias ?? []).forEach((cat, cIdx) => {
      if (cat != null && cat.id != null) {
        map.set(cat.id, { sectionOrden: Number(sec.order) || sIdx, categoryOrden: Number(cat.order) || cIdx });
      }
    });
  });
  return map;
}

/** Ítem mínimo para ordenar por estructura maestra (id, quantity, subtotal, nombres, etc.). */
export interface ItemParaOrdenCanonico {
  id: string;
  quantity: number;
  subtotal: number;
  name?: string | null;
  name_snapshot?: string | null;
  seccion_name?: string | null;
  category_name?: string | null;
  seccion_name_snapshot?: string | null;
  category_name_snapshot?: string | null;
  [key: string]: unknown;
}

/**
 * Orden canónico usando la función maestra (construirEstructuraJerarquicaCotizacion + aplanar).
 * Mismo motor que Workflow Card / agruparServiciosPorCotizacion. Devuelve ids en orden de visualización.
 */
export function obtenerOrdenCanonicoIds<T extends ItemParaOrdenCanonico>(
  items: T[],
  secciones: CatalogoParaOrden,
  getCategoryId: (item: T) => string | null
): string[] {
  const categoryOrderMap = buildCategoryOrderMap(secciones);
  const input: CotizacionItemInput[] = items.map((item) => {
    const catId = getCategoryId(item);
    const order = catId ? categoryOrderMap.get(catId) : null;
    const sectionOrden = order?.sectionOrden ?? 999;
    const categoryOrden = order?.categoryOrden ?? 999;
    return {
      id: item.id,
      item_id: (item as { item_id?: string | null }).item_id,
      quantity: item.quantity,
      subtotal: Number(item.subtotal ?? 0),
      name: item.name,
      name_snapshot: item.name_snapshot,
      seccion_name: item.seccion_name ?? item.seccion_name_snapshot ?? null,
      category_name: item.category_name ?? item.category_name_snapshot ?? null,
      seccion_orden: sectionOrden,
      categoria_orden: categoryOrden,
      order: pesoPorNombreCotizacion(item.name, item.name_snapshot),
    };
  });
  const estructura = construirEstructuraJerarquicaCotizacion(input, { ordenarPor: 'catalogo' });
  return aplanarEstructuraAOrdenIds(estructura);
}

/**
 * Consulta estándar para obtener cotizacion_items con snapshots y campos operacionales
 * Usar esta consulta en todas las funciones que necesiten construir estructura jerárquica
 */
export const COTIZACION_ITEMS_SELECT_STANDARD = {
  id: true,
  item_id: true,
  quantity: true,
  unit_price: true,
  subtotal: true,
  order: true,
  billing_type: true,
  // Snapshots (prioridad - inmutables)
  name_snapshot: true,
  description_snapshot: true,
  category_name_snapshot: true,
  seccion_name_snapshot: true,
  // Campos operacionales (fallback - mutables)
  name: true,
  description: true,
  category_name: true,
  seccion_name: true,
} as const;

/** Shape mínimo para ordenar por catálogo (relaciones Prisma de cotizacion_item) */
type ItemConOrdenCatalogo = {
  order?: number | null;
  items?: {
    order?: number | null;
    service_categories?: {
      order?: number | null;
      section_categories?: { service_sections?: { order?: number | null } } | null;
    } | null;
  } | null;
  service_categories?: {
    order?: number | null;
    section_categories?: { service_sections?: { order?: number | null } } | null;
  } | null;
};

/**
 * Orden estándar: seccion_orden (catálogo) > categoria_orden (catálogo) > item_order (catálogo) > order (cotización).
 * Fuente única para PDF, Cotización y Scheduler. Ítems (ej. Shooting) heredan el peso de su categoría.
 */
export function ordenarCotizacionItemsPorCatalogo<T extends ItemConOrdenCatalogo>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const seccionA = a.items?.service_categories?.section_categories?.service_sections?.order ?? a.service_categories?.section_categories?.service_sections?.order ?? 999;
    const seccionB = b.items?.service_categories?.section_categories?.service_sections?.order ?? b.service_categories?.section_categories?.service_sections?.order ?? 999;
    if (seccionA !== seccionB) return seccionA - seccionB;
    const catA = a.items?.service_categories?.order ?? a.service_categories?.order ?? 999;
    const catB = b.items?.service_categories?.order ?? b.service_categories?.order ?? 999;
    if (catA !== catB) return catA - catB;
    const itemOrderA = a.items?.order ?? 999;
    const itemOrderB = b.items?.order ?? 999;
    if (itemOrderA !== itemOrderB) return itemOrderA - itemOrderB;
    return (a.order ?? 999) - (b.order ?? 999);
  });
}

