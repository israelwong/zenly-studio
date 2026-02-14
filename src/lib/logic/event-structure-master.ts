/**
 * Fuente única de verdad para la jerarquía Sección > Categoría > Ítem en eventos.
 * Workflow Card y Scheduler deben consumir solo esta librería para orden/estructura.
 */

import type { SeccionData } from '@/lib/actions/schemas/catalogo-schemas';
import {
  buildCategoryOrderMap,
  obtenerOrdenCanonicoIds as _obtenerOrdenCanonicoIds,
  type CatalogoParaOrden,
  type ItemParaOrdenCanonico,
} from '@/lib/actions/studio/commercial/promises/cotizacion-structure.utils';

function seccionesToCatalogoParaOrden(secciones: SeccionData[]): CatalogoParaOrden {
  return (secciones ?? [])
    .filter((sec): sec is SeccionData => sec != null && sec.id != null)
    .map((sec) => {
      const categorias = (sec.categorias ?? []).filter((c): c is NonNullable<typeof c> => c != null && c.id != null);
      const sortedCategories = [...categorias].sort(
        (a, b) => (Number(a.order) || Number((a as { orden?: number }).orden) || 0) - (Number(b.order) || Number((b as { orden?: number }).orden) || 0)
      );
      return {
        id: sec.id,
        order: Number(sec.order) || 0,
        categorias: sortedCategories.map((cat) => ({
          id: cat.id,
          order: Number(cat.order) || Number((cat as { orden?: number }).orden) || 0,
        })),
      };
    });
}

const UNCATEGORIZED_ID = 'uncategorized';
const UNCATEGORIZED_ORDER = { sectionOrden: 999, categoryOrden: 999 };

/**
 * Guardián de categorías: obtiene el ID de categoría del ítem de forma segura.
 * Si el ID no existe en el mapa de secciones (validCategoryIds), asigna forzosamente 'uncategorized'.
 * Nunca devuelve null: siempre string (id válido o 'uncategorized').
 */
function safeGetCategoryId<T>(
  item: T,
  getCategoryId: (item: T) => string | null,
  validCategoryIds: Set<string> | null
): string {
  try {
    if (item == null) return UNCATEGORIZED_ID;
    const id = getCategoryId(item);
    const raw = id != null && typeof id === 'string' ? id : null;
    if (raw == null) return UNCATEGORIZED_ID;
    if (validCategoryIds != null && !validCategoryIds.has(raw)) return UNCATEGORIZED_ID;
    return raw;
  } catch {
    return UNCATEGORIZED_ID;
  }
}

/**
 * Ordena por estructura canónica: Sección → Categoría → índice original.
 * IDs que no están en el catálogo → 'uncategorized' (orden 999). Sin order_index → 999.
 */
export function ordenarPorEstructuraCanonica<T>(
  items: T[],
  secciones: SeccionData[] | CatalogoParaOrden,
  getCategoryId: (item: T) => string | null,
  _getItemName?: (item: T) => string | null
): T[] {
  const safeItems = (items ?? []).filter((x): x is T => x != null);
  if (safeItems.length === 0) return [];

  const isSeccionData = Array.isArray(secciones) && secciones.length > 0 && secciones[0] != null && 'nombre' in secciones[0];

  let catalog: CatalogoParaOrden;
  try {
    catalog = isSeccionData ? seccionesToCatalogoParaOrden(secciones as SeccionData[]) : (secciones as CatalogoParaOrden) ?? [];
  } catch {
    catalog = [];
  }

  const orderMap = buildCategoryOrderMap(Array.isArray(catalog) ? catalog : []);
  orderMap.set(UNCATEGORIZED_ID, UNCATEGORIZED_ORDER);
  const validCategoryIds = new Set(orderMap.keys());

  const indexOf = new Map<T, number>();
  safeItems.forEach((it, i) => indexOf.set(it, i));

  const orderFor = (catId: string): { sectionOrden: number; categoryOrden: number } => {
    const o = orderMap.get(catId);
    if (!o) return UNCATEGORIZED_ORDER;
    return {
      sectionOrden: o.sectionOrden ?? 999,
      categoryOrden: o.categoryOrden ?? 999,
    };
  };

  /** Límite para evitar timeout por bucle/corrupción; sort típico ~n log n, 5000 cubre ~500 ítems */
  const MAX_ITERACIONES_ORDENAMIENTO = 5000;
  let iteraciones = 0;

  return [...safeItems].sort((a, b) => {
    iteraciones++;
    if (iteraciones > MAX_ITERACIONES_ORDENAMIENTO) {
      throw new Error(
        `[event-structure-master] Contador de seguridad: ordenamiento excedió ${MAX_ITERACIONES_ORDENAMIENTO} iteraciones (posible bucle o datos corruptos). items=${safeItems.length}`
      );
    }
    const catA = safeGetCategoryId(a, getCategoryId, validCategoryIds);
    const catB = safeGetCategoryId(b, getCategoryId, validCategoryIds);
    const ordA = orderFor(catA);
    const ordB = orderFor(catB);
    if (ordA.sectionOrden !== ordB.sectionOrden) return ordA.sectionOrden - ordB.sectionOrden;
    if (ordA.categoryOrden !== ordB.categoryOrden) return ordA.categoryOrden - ordB.categoryOrden;
    return (indexOf.get(a) ?? 0) - (indexOf.get(b) ?? 0);
  });
}

/**
 * Devuelve ids en orden canónico (Sección → Categoría → ítem). Mismo motor que el Card.
 * Blindado: ítems nulos o sin catalog_category_id se ignoran o van al final.
 */
export function obtenerOrdenCanonicoIds<T extends ItemParaOrdenCanonico>(
  items: T[],
  secciones: SeccionData[] | CatalogoParaOrden,
  getCategoryId: (item: T) => string | null
): string[] {
  const safeItems = (items ?? []).filter((x): x is T => x != null && (x as { id?: unknown }).id != null);
  if (safeItems.length === 0) return [];

  let catalog: CatalogoParaOrden;
  try {
    catalog =
      Array.isArray(secciones) && secciones.length > 0 && secciones[0] != null && 'nombre' in secciones[0]
        ? seccionesToCatalogoParaOrden(secciones as SeccionData[])
        : (secciones as CatalogoParaOrden) ?? [];
  } catch {
    catalog = [];
  }

  const safeGetCategoryId = (item: T): string | null => {
    try {
      const id = getCategoryId(item);
      return id != null && typeof id === 'string' ? id : null;
    } catch {
      return null;
    }
  };

  return _obtenerOrdenCanonicoIds(safeItems, catalog, safeGetCategoryId);
}

export type { CatalogoParaOrden, ItemParaOrdenCanonico };
