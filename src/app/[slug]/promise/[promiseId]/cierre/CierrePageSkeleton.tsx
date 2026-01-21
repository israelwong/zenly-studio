/**
 * ⚠️ STREAMING: Skeleton específico para la página de cierre
 * Solo muestra placeholders para el contenido del contrato (deferred)
 * El header ya está renderizado por CierrePageBasic
 */
export function CierrePageSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Skeleton para la tarjeta de contrato */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 animate-pulse">
        <div className="h-8 bg-zinc-800 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-zinc-800 rounded w-full"></div>
          <div className="h-4 bg-zinc-800 rounded w-5/6"></div>
          <div className="h-4 bg-zinc-800 rounded w-4/6"></div>
        </div>
      </div>

      {/* Skeleton para la tarjeta financiera */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 animate-pulse">
        <div className="h-6 bg-zinc-800 rounded w-1/4 mb-4"></div>
        <div className="space-y-2">
          <div className="h-4 bg-zinc-800 rounded w-1/2"></div>
          <div className="h-4 bg-zinc-800 rounded w-1/3"></div>
        </div>
      </div>

      {/* Skeleton para botones de acción */}
      <div className="flex gap-4 animate-pulse">
        <div className="h-10 bg-zinc-800 rounded w-32"></div>
        <div className="h-10 bg-zinc-800 rounded w-32"></div>
      </div>
    </div>
  );
}
