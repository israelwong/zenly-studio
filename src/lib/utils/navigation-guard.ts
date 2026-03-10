/**
 * Guard de navegación post-escritura (Zero-Rebound Standard).
 * Cualquier Write que preceda a una navegación debe activar este flag.
 * Cualquier Auto-Router (p. ej. Realtime) debe consultarlo antes de mover al usuario.
 * Ver: .cursor/docs/architecture/zero-rebound-standard.md
 */

const navigatingAfterSaveRef = { current: false };

export function setNavigatingAfterSave(value: boolean): void {
  navigatingAfterSaveRef.current = value;
}

export function getIsNavigatingAfterSave(): boolean {
  return navigatingAfterSaveRef.current;
}
