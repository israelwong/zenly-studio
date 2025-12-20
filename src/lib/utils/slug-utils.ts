/**
 * Utilidades compartidas para generación y validación de slugs
 * Usado por portfolios y posts para experiencia homogénea
 */

import { generateSlug as generateSlugBase } from "@/lib/actions/utils/validation";

/**
 * Genera un slug desde texto usando la función compartida de validación
 * @param text - Texto a convertir en slug
 * @returns Slug normalizado
 */
export function generateSlug(text: string): string {
    return generateSlugBase(text);
}

/**
 * Valida si un slug tiene el formato correcto
 * @param slug - Slug a validar
 * @returns true si es válido
 */
export function isValidSlug(slug: string): boolean {
    const slugRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
    return slugRegex.test(slug) && slug.length > 0 && slug.length <= 100;
}

/**
 * Normaliza un slug para asegurar formato correcto
 * @param slug - Slug a normalizar
 * @returns Slug normalizado
 */
export function normalizeSlug(slug: string): string {
    return generateSlugBase(slug);
}

/**
 * Genera un slug único agregando sufijo numérico si es necesario
 * Esta función es genérica y puede ser usada con cualquier función de verificación
 * 
 * @param baseSlug - Slug base
 * @param checkExists - Función async que verifica si el slug existe
 * @returns Slug único
 */
export async function generateUniqueSlug(
    baseSlug: string,
    checkExists: (slug: string) => Promise<boolean>
): Promise<string> {
    let slug = baseSlug;
    let counter = 1;

    while (true) {
        const exists = await checkExists(slug);

        if (!exists) {
            return slug;
        }

        // Si existe, agregar número al final
        slug = `${baseSlug}-${counter}`;
        counter++;

        // Límite de seguridad para evitar loops infinitos
        if (counter > 1000) {
            // Usar timestamp como último recurso
            slug = `${baseSlug}-${Date.now()}`;
            break;
        }
    }

    return slug;
}

/**
 * Verifica si dos slugs son equivalentes (ignorando sufijos numéricos)
 * @param slug1 - Primer slug
 * @param slug2 - Segundo slug
 * @returns true si son equivalentes
 */
export function areSlugsEquivalent(slug1: string, slug2: string): boolean {
    // Remover sufijos numéricos para comparar base
    const base1 = slug1.replace(/-\d+$/, '');
    const base2 = slug2.replace(/-\d+$/, '');
    return base1 === base2;
}

/**
 * Extrae el slug base (sin sufijo numérico)
 * @param slug - Slug con posible sufijo
 * @returns Slug base
 */
export function getBaseSlug(slug: string): string {
    return slug.replace(/-\d+$/, '');
}

/**
 * Genera sugerencias de slug alternativos
 * @param baseSlug - Slug base
 * @param count - Número de sugerencias
 * @returns Array de slugs sugeridos
 */
export function generateSlugSuggestions(baseSlug: string, count: number = 3): string[] {
    const suggestions: string[] = [];

    for (let i = 1; i <= count; i++) {
        suggestions.push(`${baseSlug}-${i}`);
    }

    // Agregar variación con fecha
    const today = new Date();
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;
    suggestions.push(`${baseSlug}-${dateStr}`);

    return suggestions;
}
