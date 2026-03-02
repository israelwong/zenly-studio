/**
 * Utilidades de formato de texto para datos de formularios (contratos, comunicaciones).
 * Alineado con la normalización en server (promises.actions).
 */

/** Primera letra de cada palabra en mayúscula (Title Case). */
export function toTitleCase(s: string): string {
  return s
    .trim()
    .split(/\s+/)
    .map((w) => (w.length === 0 ? w : w[0].toUpperCase() + w.slice(1).toLowerCase()))
    .join(' ');
}

/**
 * Clave única para deduplicar contactos por teléfono o email.
 * Prioridad: teléfono normalizado (10 dígitos) > email en minúsculas > id.
 */
export function contactDedupKey(contact: {
  id: string;
  phone: string;
  email?: string | null;
}): string {
  const phoneNorm = contact.phone?.replace(/\D/g, '').slice(-10);
  const emailNorm = contact.email?.trim().toLowerCase();
  return (phoneNorm && phoneNorm.length >= 10 ? phoneNorm : '') || emailNorm || contact.id;
}

/**
 * Deduplica una lista de contactos por teléfono o email (primera ocurrencia gana).
 */
export function deduplicateContactsByPhoneOrEmail<T extends { id: string; phone: string; email?: string | null }>(
  list: T[]
): T[] {
  const seen = new Set<string>();
  return list.filter((c) => {
    const key = contactDedupKey(c);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
