/**
 * Módulos de Plataforma V2.0 - Helpers
 * 
 * Estos helpers proporcionan validación BÁSICA de módulos activos.
 * NO incluyen validación de planes/suscripciones (eso viene en Iteración 2).
 * 
 * Para MVP Studio:
 * - Validar si un módulo está activo en un studio
 * - Listar módulos activos de un studio
 * - Proteger rutas basado en módulos activos
 * 
 * Para Iteración 2 (Admin):
 * - checkStudioModuleWithPlan() - Validación completa con planes
 * - Verificación de límites de uso
 * - Billing y Stripe integration
 */

import { prisma } from '@/lib/prisma';

/**
 * Verifica si un módulo está activo para un studio
 * 
 * @param studioId - ID del studio
 * @param moduleSlug - Slug del módulo (e.g., "manager", "magic", "marketing")
 * @returns true si el módulo está activo, false si no
 * 
 * @example
 * const hasManager = await checkStudioModule('demo-studio-id', 'manager');
 * if (!hasManager) {
 *   redirect('/studio/demo-studio/settings/modules');
 * }
 */
export async function checkStudioModule(
  studioId: string,
  moduleSlug: string
): Promise<boolean> {
  try {
    // 1. Buscar el módulo por slug
    const module = await prisma.platform_modules.findUnique({
      where: { slug: moduleSlug }
    });

    if (!module) {
      console.warn(`[checkStudioModule] Module not found: ${moduleSlug}`);
      return false;
    }

    // 2. Verificar si está activo en el studio
    const activation = await prisma.studio_modules.findUnique({
      where: {
        studio_id_module_id: {
          studio_id: studioId,
          module_id: module.id
        }
      }
    });

    return activation?.is_active || false;
  } catch (error) {
    console.error('[checkStudioModule] Error:', error);
    return false;
  }
}

/**
 * Obtiene todos los módulos activos de un studio
 * 
 * @param studioId - ID del studio
 * @returns Array de módulos activos con su información
 * 
 * @example
 * const modules = await getActiveModules('demo-studio-id');
 * // [{ id: '...', slug: 'manager', name: 'ZEN Manager', ... }]
 */
export async function getActiveModules(studioId: string) {
  try {
    const activations = await prisma.studio_modules.findMany({
      where: {
        studio_id: studioId,
        is_active: true
      },
      include: {
        module: true
      }
    });

    return activations.map(activation => activation.module);
  } catch (error) {
    console.error('[getActiveModules] Error:', error);
    return [];
  }
}

/**
 * Obtiene información detallada de un módulo específico
 * 
 * @param moduleSlug - Slug del módulo
 * @returns Información del módulo o null si no existe
 * 
 * @example
 * const module = await getModuleInfo('manager');
 * // { id: '...', slug: 'manager', name: 'ZEN Manager', category: 'CORE', ... }
 */
export async function getModuleInfo(moduleSlug: string) {
  try {
    return await prisma.platform_modules.findUnique({
      where: { slug: moduleSlug }
    });
  } catch (error) {
    console.error('[getModuleInfo] Error:', error);
    return null;
  }
}

/**
 * Verifica múltiples módulos a la vez
 * 
 * @param studioId - ID del studio
 * @param moduleSlugs - Array de slugs de módulos a verificar
 * @returns Objeto con el resultado de cada módulo { manager: true, magic: false, ... }
 * 
 * @example
 * const access = await checkMultipleModules('demo-studio-id', ['manager', 'magic', 'marketing']);
 * // { manager: true, magic: true, marketing: true }
 */
export async function checkMultipleModules(
  studioId: string,
  moduleSlugs: string[]
): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = {};

  for (const slug of moduleSlugs) {
    results[slug] = await checkStudioModule(studioId, slug);
  }

  return results;
}

/**
 * Tipo de retorno para módulos con estado de activación
 */
export interface ModuleWithActivation {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  base_price: number | null;
  is_active: boolean;
  activated_at: Date | null;
}

/**
 * Obtiene todos los módulos disponibles con su estado de activación para un studio
 * 
 * @param studioId - ID del studio
 * @returns Array de todos los módulos con información de si están activos
 * 
 * @example
 * const modules = await getAllModulesWithStatus('demo-studio-id');
 * // [
 * //   { slug: 'manager', name: 'ZEN Manager', is_active: true, ... },
 * //   { slug: 'payment', name: 'ZEN Payment', is_active: false, ... }
 * // ]
 */
export async function getAllModulesWithStatus(
  studioId: string
): Promise<ModuleWithActivation[]> {
  try {
    const allModules = await prisma.platform_modules.findMany({
      where: { is_active: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }]
    });

    const activations = await prisma.studio_modules.findMany({
      where: { studio_id: studioId }
    });

    const activationMap = new Map(
      activations.map(a => [a.module_id, a])
    );

    return allModules.map(module => ({
      id: module.id,
      slug: module.slug,
      name: module.name,
      description: module.description,
      category: module.category,
      base_price: module.base_price,
      is_active: activationMap.get(module.id)?.is_active || false,
      activated_at: activationMap.get(module.id)?.activated_at || null
    }));
  } catch (error) {
    console.error('[getAllModulesWithStatus] Error:', error);
    return [];
  }
}

