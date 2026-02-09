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
  return secciones.map((sec) => ({
    id: sec.id,
    orden: sec.orden,
    categorias: sec.categorias.map((cat) => ({ id: cat.id, orden: cat.orden })),
  }));
}

/**
 * Ordena por estructura canónica: Sección → Categoría → índice original.
 * Misma lógica para Card y Scheduler; sin pesos ni nombres. El orden inicial debe venir de la consulta (paridad orderBy con el Card).
 */
export function ordenarPorEstructuraCanonica<T>(
  items: T[],
  secciones: SeccionData[] | CatalogoParaOrden,
  getCategoryId: (item: T) => string | null,
  _getItemName?: (item: T) => string | null
): T[] {
  const catalog = Array.isArray(secciones) && secciones.length > 0 && 'nombre' in secciones[0]
    ? seccionesToCatalogoParaOrden(secciones as SeccionData[])
    : (secciones as CatalogoParaOrden);
  const orderMap = buildCategoryOrderMap(catalog);
  const copy = [...items];
  const indexOf = new Map<T, number>();
  copy.forEach((it, i) => indexOf.set(it, i));
  return copy.sort((a, b) => {
    const catA = getCategoryId(a);
    const catB = getCategoryId(b);
    const ordA = catA ? orderMap.get(catA) : { sectionOrden: 999, categoryOrden: 999 };
    const ordB = catB ? orderMap.get(catB) : { sectionOrden: 999, categoryOrden: 999 };
    if (ordA.sectionOrden !== ordB.sectionOrden) return ordA.sectionOrden - ordB.sectionOrden;
    if (ordA.categoryOrden !== ordB.categoryOrden) return ordA.categoryOrden - ordB.categoryOrden;
    return (indexOf.get(a) ?? 0) - (indexOf.get(b) ?? 0);
  });
}

/**
 * Devuelve ids en orden canónico (Sección → Categoría → ítem). Mismo motor que el Card.
 * El Scheduler debe usar solo esta función para construir el orden de filas.
 */
export function obtenerOrdenCanonicoIds<T extends ItemParaOrdenCanonico>(
  items: T[],
  secciones: SeccionData[] | CatalogoParaOrden,
  getCategoryId: (item: T) => string | null
): string[] {
  const catalog = Array.isArray(secciones) && secciones.length > 0 && 'nombre' in secciones[0]
    ? seccionesToCatalogoParaOrden(secciones as SeccionData[])
    : (secciones as CatalogoParaOrden);
  return _obtenerOrdenCanonicoIds(items, catalog, getCategoryId);
}

export type { CatalogoParaOrden, ItemParaOrdenCanonico };
