'use client';

/**
 * Banner fijo superior cuando se accede a la vista pública con ?preview=studio.
 * Advierte que la información aún no es pública para el cliente.
 */
export function StudioPreviewBanner() {
  return (
    <div
      className="sticky top-0 z-[100] w-full border-b border-amber-500 bg-amber-500/20 px-4 py-2.5 text-center"
      role="status"
      aria-live="polite"
    >
      <p className="text-sm font-medium text-amber-200">
        ⚠️ VISTA PREVIA DE ESTUDIO — Esta información aún no es pública para el cliente.
      </p>
    </div>
  );
}
