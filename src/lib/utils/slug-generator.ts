/**
 * Genera un slug base desde el título (sin sufijo único)
 * Usa la misma lógica que portfolios para consistencia
 */
export function generateSlugBase(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remover acentos
    .replace(/[^a-z0-9\s-]/g, '') // Remover caracteres especiales
    .replace(/\s+/g, '-') // Reemplazar espacios con guiones
    .replace(/-+/g, '-') // Remover guiones múltiples
    .replace(/^-+|-+$/g, '') // Remover guiones al inicio/final
    .substring(0, 60) // Limitar a 60 caracteres
    .replace(/-+$/, ''); // Remover guion final si quedó
}

/**
 * Genera un slug único para posts basado en el título
 * Formato: titulo-normalizado-abc123 (título + sufijo único de 6 chars)
 */
export function generatePostSlug(title: string, uniqueId: string): string {
  // Usar la función base para normalizar el título
  const slugBase = generateSlugBase(title) || 'post';

  // Usar los primeros 6 caracteres del ID como sufijo único
  const suffix = uniqueId.substring(0, 6);

  return `${slugBase}-${suffix}`;
}

/**
 * Valida si un slug tiene el formato correcto
 */
export function isValidPostSlug(slug: string): boolean {
  // Debe tener formato: texto-abc123
  // Mínimo 8 caracteres (x-abc123)
  const slugRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?-[a-z0-9]{6}$/;
  return slugRegex.test(slug);
}
