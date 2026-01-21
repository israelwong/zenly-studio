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

  // Procesar cada item
  items.forEach((item) => {
    // Usar snapshots primero (más confiables), luego campos operacionales como fallback
    // ⚠️ HIGIENE DE DATOS: Mantener nombres originales para mostrar (la normalización se hace antes de llamar esta función)
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
    const categoriaData = seccionesMap.get(seccionNombre)!.categorias.get(categoriaNombre)!;
    
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

    // ⚠️ HIGIENE DE DATOS: Ordenar items dentro de la categoría por order
    categoriaData.items.push(itemData);
  });

  // ⚠️ HIGIENE DE DATOS: Ordenar items dentro de cada categoría por order
  seccionesMap.forEach(seccion => {
    seccion.categorias.forEach(categoria => {
      categoria.items.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    });
  });

  // Convertir a formato final y ordenar
  const secciones = Array.from(seccionesMap.values())
    .sort((a, b) => a.orden - b.orden)
    .map(seccion => ({
      nombre: seccion.nombre,
      orden: seccion.orden,
      categorias: Array.from(seccion.categorias.values())
        .sort((a, b) => a.orden - b.orden)
        .map(categoria => ({
          nombre: categoria.nombre,
          orden: categoria.orden,
          items: categoria.items,
        })),
    }));

  // Calcular total
  const total = items.reduce((sum, item) => sum + item.subtotal, 0);

  return {
    secciones,
    total,
  };
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

