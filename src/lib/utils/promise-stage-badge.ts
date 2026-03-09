/**
 * Mapeo unificado de estilos e iconos para el badge/chip de estado de promesas.
 * Usar en DetallePromesa (header) y PromesasKanban (tarjetas Historial).
 */

export type PromiseStageBadgeKind = 'approved' | 'canceled' | 'archived' | 'pending';

export interface PromiseStageBadgeConfig {
  className: string;
  label: string;
  kind: PromiseStageBadgeKind;
}

export type PromiseStageBadgeSize = 'default' | 'compact';

const SLUG_APPROVED = new Set(['approved', 'aprobada', 'aprobado', 'autorizada', 'autorizado']);
const SLUG_CANCELED = new Set(['canceled', 'cancelado', 'cancelada']);
const SLUG_ARCHIVED = new Set(['archived', 'archivado', 'archivada']);

function normalizeKind(slug: string | undefined): PromiseStageBadgeKind {
  if (!slug) return 'pending';
  const s = slug.toLowerCase().trim();
  if (SLUG_APPROVED.has(s)) return 'approved';
  if (SLUG_CANCELED.has(s)) return 'canceled';
  if (SLUG_ARCHIVED.has(s)) return 'archived';
  return 'pending';
}

const STYLES: Record<PromiseStageBadgeKind, { className: string; label: string }> = {
  approved: {
    className: 'bg-green-500/10 text-green-500 border-green-500/20',
    label: 'Aprobada',
  },
  canceled: {
    className: 'bg-red-500/10 text-red-500 border-red-500/20',
    label: 'Cancelada',
  },
  archived: {
    className: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
    label: 'Archivada',
  },
  pending: {
    className: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    label: 'Pendiente',
  },
};

const SIZE_CLASSES: Record<PromiseStageBadgeSize, string> = {
  default: 'inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium border',
  compact: 'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border font-medium text-[10px]',
};

/**
 * Devuelve la configuración de estilos y etiqueta para el badge de etapa.
 * @param slug - Slug de la etapa (ej. 'archived', 'cancelado', 'aprobada')
 * @param stageName - Nombre opcional de la etapa para mostrar en pendiente (ej. "Nuevo", "En cierre")
 * @param size - 'default' para detalle/header, 'compact' para tarjetas Kanban Historial
 */
export function getPromiseStageBadgeConfig(
  slug: string | undefined,
  stageName?: string | null,
  size: PromiseStageBadgeSize = 'default'
): PromiseStageBadgeConfig {
  const kind = normalizeKind(slug);
  const base = STYLES[kind];
  const label =
    kind === 'pending' && stageName?.trim()
      ? stageName.trim()
      : base.label;
  return {
    className: `${SIZE_CLASSES[size]} ${base.className}`,
    label,
    kind,
  };
}
