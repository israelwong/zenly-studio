import type { PipelineStage } from '@/lib/actions/schemas/promises-schemas';

/**
 * Mapa de slugs técnicos a nombres por defecto (fallback si no hay stages)
 */
const DEFAULT_STAGE_NAMES: Record<string, string> = {
  pending: 'Pendiente',
  negotiation: 'Negociación',
  approved: 'Aprobado',
  closing: 'Cierre',
  archived: 'Archivado',
  canceled: 'Cancelado',
  // Slugs en español (legacy)
  pendiente: 'Pendiente',
  negociacion: 'Negociación',
  en_cierre: 'Cierre',
  cierre: 'Cierre',
  aprobada: 'Aprobado',
  autorizada: 'Aprobado',
};

/**
 * Crear mapa de slug -> name desde array de stages
 */
export function createStageNameMap(stages: PipelineStage[]): Map<string, string> {
  const map = new Map<string, string>();
  
  stages.forEach(stage => {
    map.set(stage.slug, stage.name);
  });
  
  return map;
}

/**
 * Obtener nombre de display para un slug de stage
 * Usa el mapa de stages si está disponible, sino usa nombres por defecto
 */
export function getStageDisplayName(
  slug: string,
  stageMap?: Map<string, string> | null
): string {
  if (stageMap) {
    const name = stageMap.get(slug);
    if (name) return name;
  }
  
  // Fallback a nombres por defecto
  return DEFAULT_STAGE_NAMES[slug] || slug;
}

/**
 * Obtener nombre de display para status de cotización
 * Mapea status de cotización a slug de stage y luego a nombre
 */
export function getCotizacionStatusDisplayName(
  status: string,
  stageMap?: Map<string, string> | null
): string {
  // Normalizar status
  const normalizedStatus = status.toLowerCase().trim();
  
  // Mapear status de cotización a slug de stage
  const statusToSlugMap: Record<string, string> = {
    'pendiente': 'pending',
    'negociacion': 'negotiation',
    'en_cierre': 'closing',
    'cierre': 'closing',
    'aprobada': 'approved',
    'autorizada': 'approved',
    'approved': 'approved',
  };
  
  const stageSlug = statusToSlugMap[normalizedStatus] || normalizedStatus;
  return getStageDisplayName(stageSlug, stageMap);
}

/**
 * Obtener nombre original del sistema para un slug de stage
 */
export function getSystemStageName(slug: string): string {
  return DEFAULT_STAGE_NAMES[slug] || slug;
}

const TERMINAL_SLUGS = new Set([
  'approved', 'aprobada', 'autorizada',
  'canceled', 'cancelado',
  'archived', 'archivado',
]);

/**
 * Retorna true si el slug es una etapa terminal (cierre del pipeline).
 */
export function isTerminalStage(slug: string): boolean {
  return TERMINAL_SLUGS.has(slug);
}

/**
 * Color por tipo de etapa terminal: aprobado verde, cancelado rojo, archivado gris.
 */
export function getTerminalColor(slug: string): string {
  if (slug === 'approved' || slug === 'aprobada' || slug === 'autorizada') return '#10B981';
  if (slug === 'canceled' || slug === 'cancelado') return '#EF4444';
  if (slug === 'archived' || slug === 'archivado') return '#71717a';
  return '#71717a';
}
