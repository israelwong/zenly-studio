import { LoadingSpinner } from "@/components/ui/shadcn/loading-spinner"
import { Card, CardContent } from "@/components/ui/shadcn/card"

export function RedirectLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-zinc-900 border-zinc-800">
        <CardContent className="flex flex-col items-center justify-center p-8 space-y-6">
          {/* Logo o icono de la aplicación */}
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>

          {/* Spinner animado */}
          <LoadingSpinner size="lg" className="text-blue-600" />

          {/* Mensaje principal */}
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold text-white">
              Un momento por favor
            </h2>
            <p className="text-zinc-400 text-sm">
              Estamos configurando tu experiencia...
            </p>
          </div>

          {/* Indicador de progreso visual */}
          <div className="w-full bg-zinc-800 rounded-full h-1">
            <div className="bg-blue-600 h-1 rounded-full animate-pulse w-3/4"></div>
          </div>

          {/* Mensaje secundario */}
          <p className="text-zinc-500 text-xs text-center">
            Redirigiendo a tu panel de control
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
