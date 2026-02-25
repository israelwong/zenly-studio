'use client';

/**
 * Banner ultra-simple cuando se accede con ?preview=studio.
 * Advierte que se está previsualizando antes de publicar.
 */
export function StudioPreviewBanner() {
  return (
    <div
      className="bg-amber-500/10 border-b border-amber-500/20 py-2 text-center text-amber-500 text-xs font-medium sticky top-0 z-50 backdrop-blur-md"
      role="status"
      aria-live="polite"
    >
      ⚠️ MODO ESTUDIO: Estás previsualizando la propuesta antes de publicarla.
    </div>
  );
}
