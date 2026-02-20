'use client';

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
 * Skeleton del header (PublicPromisePageHeader) para alinear con la vista real.
 * Cover + textos: evento, fecha, CTA.
 */
function CierreHeaderSkeleton() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/40 via-zinc-950 to-zinc-950" />
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>
      <div className="relative max-w-4xl mx-auto px-4 pt-6 pb-8 md:pt-8 md:pb-10">
        {/* Cover placeholder (altura similar al header real) */}
        <div className="rounded-xl overflow-hidden mb-6 h-32 sm:h-40 bg-zinc-800/80 animate-pulse" />
        <div className="text-center space-y-2">
          <div className="h-6 sm:h-7 bg-zinc-800 rounded w-48 sm:w-64 mx-auto animate-pulse" />
          <div className="h-4 bg-zinc-800 rounded w-36 sm:w-44 mx-auto animate-pulse" />
          <div className="h-9 w-44 sm:w-52 bg-zinc-700 rounded-lg mx-auto mt-3 animate-pulse" />
        </div>
      </div>
    </section>
  );
}

/**
 * Skeleton específico para la página de cierre.
 * Alineado con PublicQuoteAuthorizedView: header (PublicPromisePageHeader) + pasos (Firma → Pago).
 * Usado como fallback de Suspense y en loading.tsx de la ruta.
 */
export function CierrePageSkeleton() {
  return (
    <>
      <CierreHeaderSkeleton />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="relative space-y-6">
          {/* PASO 1: Firma de Contrato (w-12 h-12 como en la vista real) */}
          <div className="relative">
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-12 h-12 rounded-full bg-blue-500/20 border-2 border-blue-500 flex items-center justify-center relative z-10 animate-pulse">
                <div className="w-5 h-5 bg-blue-400/50 rounded-full" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="mb-4">
                  <div className="h-6 sm:h-7 bg-zinc-800 rounded w-48 sm:w-64 mb-2 animate-pulse" />
                  <div className="h-4 bg-zinc-800 rounded max-w-md mb-1 animate-pulse" />
                  <div className="h-4 bg-zinc-800 rounded w-3/4 max-w-sm animate-pulse" />
                </div>
                <ContractStepCardSkeleton />
              </div>
            </div>
          </div>

          {/* PASO 2: Realiza tu Pago (w-10 h-10 como en la vista real) */}
          <div className="relative">
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-10 h-10 rounded-full bg-blue-500/20 border-2 border-blue-500 flex items-center justify-center relative z-10 animate-pulse">
                <div className="w-4 h-4 bg-blue-400/50 rounded-full" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="mb-4">
                  <div className="h-5 sm:h-6 bg-zinc-800 rounded w-40 sm:w-48 mb-2 animate-pulse" />
                  <div className="h-4 bg-zinc-800 rounded max-w-sm animate-pulse" />
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 sm:p-6 animate-pulse">
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div className="h-4 bg-zinc-800 rounded w-16" />
                      <div className="h-5 bg-zinc-800 rounded w-32 sm:w-40" />
                    </div>
                    <div className="space-y-3">
                      <div className="h-4 bg-zinc-800 rounded w-20" />
                      <div className="h-5 bg-zinc-800 rounded w-36 sm:w-48" />
                    </div>
                    <div className="space-y-3">
                      <div className="h-4 bg-zinc-800 rounded w-28 sm:w-36" />
                      <div className="p-3 sm:p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                        <div className="h-6 bg-zinc-700 rounded w-full max-w-xs" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg animate-pulse">
                  <div className="h-4 bg-blue-500/20 rounded w-full max-w-md mx-auto" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
