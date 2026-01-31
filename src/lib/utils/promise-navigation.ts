import { isTerminalStage } from '@/lib/utils/pipeline-stage-names';

/** Estado de ruta de una promesa (sub-ruta bajo [promiseId]) */
export type PromiseRouteState = 'pendiente' | 'cierre' | 'autorizada';

/** Promesa con al menos pipeline_stage.slug (ej. PromiseWithContact del Kanban) */
export interface PromiseWithStageSlug {
  promise_id?: string | null;
  id: string;
  promise_pipeline_stage?: { slug: string } | null;
}

const CIERRE_SLUGS = new Set([
  'closing', 'cierre', 'en_cierre',
]);

/**
 * Determina la sub-ruta según el slug del pipeline_stage.
 * - Terminal (approved, canceled, archived, etc.) → autorizada
 * - Cierre (closing, cierre, en_cierre) → cierre
 * - Resto → pendiente
 */
export function getPromiseRouteStateFromSlug(slug: string | null | undefined): PromiseRouteState {
  if (!slug) return 'pendiente';
  if (isTerminalStage(slug)) return 'autorizada';
  if (CIERRE_SLUGS.has(slug)) return 'cierre';
  return 'pendiente';
}

/**
 * Ruta completa a la sub-página correcta de una promesa (para enlaces y redirects).
 * Usar desde Kanban: href y router.push sin pasar por raíz.
 */
export function getPromisePath(
  studioSlug: string,
  promise: PromiseWithStageSlug
): string {
  const promiseId = promise.promise_id ?? promise.id;
  const slug = promise.promise_pipeline_stage?.slug;
  const state = getPromiseRouteStateFromSlug(slug);
  return `/${studioSlug}/studio/commercial/promises/${promiseId}/${state}`;
}

/**
 * Ruta completa dado el estado ya determinado (ej. desde determinePromiseState en servidor).
 * Para redirect en [promiseId]/page.tsx y guardas en /pendiente, /cierre, /autorizada.
 */
export function getPromisePathFromState(
  studioSlug: string,
  promiseId: string,
  state: PromiseRouteState
): string {
  return `/${studioSlug}/studio/commercial/promises/${promiseId}/${state}`;
}
