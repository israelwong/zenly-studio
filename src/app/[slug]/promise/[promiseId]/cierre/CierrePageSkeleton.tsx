/**
 * Skeleton reutilizable para la card de contrato (PASO 1: Firma).
 * Usado en CierrePageSkeleton y en PublicQuoteAuthorizedView cuando el contrato aún no tiene content.
 */
export function ContractStepCardSkeleton() {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg animate-pulse">
      <div className="p-4 sm:p-6 border-b border-zinc-800">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-zinc-800 rounded-lg shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="h-5 sm:h-6 bg-zinc-800 rounded w-32 sm:w-40 mb-2" />
              <div className="h-3 sm:h-4 bg-zinc-800 rounded w-24 sm:w-32" />
            </div>
          </div>
          <div className="hidden sm:block w-24 h-6 bg-zinc-800 rounded" />
        </div>
      </div>
      <div className="p-4 sm:p-6 space-y-4">
        <div className="space-y-2">
          <div className="h-4 bg-zinc-800 rounded w-full" />
          <div className="h-4 bg-zinc-800 rounded w-5/6" />
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2">
          <div className="h-10 bg-zinc-800 rounded w-full sm:w-32" />
          <div className="h-10 bg-zinc-800 rounded w-full sm:w-32" />
        </div>
      </div>
    </div>
  );
}

/**
 * ⚠️ STREAMING: Skeleton específico para la página de cierre
 * Solo muestra placeholders para el contenido del contrato (deferred)
 * El header ya está renderizado por CierrePageBasic
 */
export function CierrePageSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Flujo de pasos */}
      <div className="relative space-y-6">
        {/* PASO 1: Firma de Contrato */}
        <div className="relative">
          <div className="flex items-start gap-3 sm:gap-4">
            {/* Número del paso - responsivo */}
            <div className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-500/20 border-2 border-blue-500 flex items-center justify-center relative z-10 animate-pulse">
              <div className="w-4 h-4 sm:w-5 sm:h-5 bg-blue-400/50 rounded-full"></div>
            </div>

            {/* Contenido */}
            <div className="flex-1 min-w-0">
              {/* Título y descripción */}
              <div className="mb-4">
                <div className="h-6 sm:h-7 bg-zinc-800 rounded w-48 sm:w-64 mb-2 animate-pulse"></div>
                <div className="h-4 bg-zinc-800 rounded w-full max-w-md mb-1 animate-pulse"></div>
                <div className="h-4 bg-zinc-800 rounded w-3/4 max-w-sm animate-pulse"></div>
              </div>

              {/* Skeleton para PublicContractCard */}
              <ContractStepCardSkeleton />
            </div>
          </div>
        </div>

        {/* PASO 2: Realiza tu Pago (opcional - solo si está firmado) */}
        <div className="relative">
          <div className="flex items-start gap-3 sm:gap-4">
            {/* Número del paso - más pequeño */}
            <div className="shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-500/20 border-2 border-blue-500 flex items-center justify-center relative z-10 animate-pulse">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-blue-400/50 rounded-full"></div>
            </div>

            {/* Contenido */}
            <div className="flex-1 min-w-0">
              {/* Título y descripción */}
              <div className="mb-4">
                <div className="h-5 sm:h-6 bg-zinc-800 rounded w-40 sm:w-48 mb-2 animate-pulse"></div>
                <div className="h-4 bg-zinc-800 rounded w-full max-w-sm animate-pulse"></div>
              </div>

              {/* Skeleton para ZenCard de información bancaria */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 sm:p-6 animate-pulse">
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="h-4 bg-zinc-800 rounded w-16"></div>
                    <div className="h-5 bg-zinc-800 rounded w-32 sm:w-40"></div>
                  </div>
                  <div className="space-y-3">
                    <div className="h-4 bg-zinc-800 rounded w-20"></div>
                    <div className="h-5 bg-zinc-800 rounded w-36 sm:w-48"></div>
                  </div>
                  <div className="space-y-3">
                    <div className="h-4 bg-zinc-800 rounded w-28 sm:w-36"></div>
                    <div className="p-3 sm:p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                      <div className="h-6 bg-zinc-700 rounded w-full max-w-xs"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Skeleton para mensaje de confirmación */}
              <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg animate-pulse">
                <div className="h-4 bg-blue-500/20 rounded w-full max-w-md mx-auto"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
