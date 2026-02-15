'use client';

const STORAGE_KEY_PREFIX = 'scheduler-staging';

/** Clave debe ser "sectionId-STAGE" (ej. "clx123-PLANNING"). Valida formato y stage válido. */
export function isValidStageKey(key: string): boolean {
  if (typeof key !== 'string' || key.length < 3) return false;
  const sep = key.lastIndexOf('-'); // último guión por si sectionId tiene guiones
  if (sep <= 0 || sep === key.length - 1) return false;
  
  const sectionId = key.slice(0, sep);
  const stage = key.slice(sep + 1);
  
  // Validar sectionId
  if (sectionId === 'undefined' || sectionId.length === 0) return false;
  
  // Validar stage: solo valores del enum TaskCategoryStage
  const validStages = new Set(['PLANNING', 'PRODUCTION', 'POST_PRODUCTION', 'DELIVERY']);
  return validStages.has(stage);
}

export interface SchedulerStagingState {
  explicitlyActivatedStageIds: string[];
  customCategoriesBySectionStage: Array<[string, Array<{ id: string; name: string }>]>;
}

export function getSchedulerStagingKey(eventId: string): string {
  return `${STORAGE_KEY_PREFIX}-${eventId}`;
}

export function getSchedulerStaging(eventId: string): SchedulerStagingState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(getSchedulerStagingKey(eventId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SchedulerStagingState;
    const explicit = Array.isArray(parsed.explicitlyActivatedStageIds) ? parsed.explicitlyActivatedStageIds : [];
    const custom = Array.isArray(parsed.customCategoriesBySectionStage) ? parsed.customCategoriesBySectionStage : [];
    return {
      explicitlyActivatedStageIds: explicit.filter(isValidStageKey),
      customCategoriesBySectionStage: custom.filter(([key]) => isValidStageKey(key)),
    };
  } catch {
    return null;
  }
}

export function setSchedulerStaging(eventId: string, state: SchedulerStagingState): void {
  if (typeof window === 'undefined') return;
  try {
    const explicit = state.explicitlyActivatedStageIds.filter(isValidStageKey);
    const custom = state.customCategoriesBySectionStage.filter(([key]) => isValidStageKey(key));
    localStorage.setItem(
      getSchedulerStagingKey(eventId),
      JSON.stringify({
        explicitlyActivatedStageIds: explicit,
        customCategoriesBySectionStage: custom,
      })
    );
  } catch {
    // ignore
  }
}

export function clearSchedulerStaging(eventId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(getSchedulerStagingKey(eventId));
  } catch {
    // ignore
  }
}

/** Estructura jerárquica: sectionId -> stage -> categorías. Preserva la herencia de sección. */
export interface CustomCategoriesHierarchy {
  [sectionId: string]: {
    [stage: string]: Array<{ id: string; name: string }>;
  };
}

const STAGE_KEY_SEP = '-';

function parseStageKey(key: string): { sectionId: string; stage: string } | null {
  const sep = key.indexOf(STAGE_KEY_SEP);
  if (sep <= 0 || sep >= key.length - 1) return null;
  return { sectionId: key.slice(0, sep), stage: key.slice(sep + 1) };
}

/** Recupera categorías con estructura jerárquica; luego aplana a Map sectionId-stage -> []. Así la jerarquía no se pierde. */
export function customCategoriesMapFromStaging(
  staging: SchedulerStagingState['customCategoriesBySectionStage']
): Map<string, Array<{ id: string; name: string }>> {
  const hierarchy: CustomCategoriesHierarchy = {};
  for (const [key, list] of staging) {
    if (!isValidStageKey(key) || !Array.isArray(list)) continue;
    const parsed = parseStageKey(key);
    if (!parsed) continue;
    if (!hierarchy[parsed.sectionId]) hierarchy[parsed.sectionId] = {};
    hierarchy[parsed.sectionId][parsed.stage] = list;
  }
  const map = new Map<string, Array<{ id: string; name: string }>>();
  for (const [sectionId, byStage] of Object.entries(hierarchy)) {
    for (const [stage, categories] of Object.entries(byStage)) {
      map.set(`${sectionId}-${stage}`, categories);
    }
  }
  return map;
}

export function customCategoriesToStaging(
  map: Map<string, Array<{ id: string; name: string }>>
): SchedulerStagingState['customCategoriesBySectionStage'] {
  return Array.from(map.entries()).filter(([key]) => isValidStageKey(key));
}
