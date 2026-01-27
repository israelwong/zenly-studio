/**
 * ⚠️ STREAMING: Loading genérico para [slug]
 * Se muestra durante transiciones entre diferentes interfaces
 * (perfil público, studio, cliente, etc.)
 * 
 * Variantes:
 * - solid: Imagen arriba, línea separadora, texto abajo
 * - gradient: Texto arriba, imagen de fondo con degradado
 */
type LoadingVariant = 'solid' | 'gradient';

export default function SlugLoading({ variant = 'solid' }: { variant?: LoadingVariant }) {
    if (variant === 'solid') {
        return (
            <div className="fixed inset-0 bg-zinc-950 flex flex-col items-center justify-center z-50">
                <div className="flex flex-col items-center gap-4 w-full max-w-xs px-4">
                    {/* Texto */}
                    <p className="text-zinc-400 text-sm font-medium">
                        Optimizando experiencia
                        <span className="ml-1">
                            <span className="inline-block animate-pulse [animation-delay:0s] [animation-duration:1.4s]">.</span>
                            <span className="inline-block animate-pulse [animation-delay:0.2s] [animation-duration:1.4s]">.</span>
                            <span className="inline-block animate-pulse [animation-delay:0.4s] [animation-duration:1.4s]">.</span>
                        </span>
                    </p>
                    
                    {/* Barra de progreso */}
                    <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full w-0 bg-blue-500 rounded-full animate-progress-load" />
                    </div>
                </div>
            </div>
        );
    }

    // Variante degradado
    return (
        <div className="fixed inset-0 bg-zinc-950 z-50">
            {/* Imagen de fondo con degradado */}
            <div className="absolute inset-0">
                <div className="absolute inset-0 bg-zinc-800 animate-pulse" />
                <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/80 via-zinc-950/90 to-zinc-950" />
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-zinc-700/30 to-transparent animate-shimmer" />
            </div>
            
            {/* Texto centrado */}
            <div className="relative h-full flex items-center justify-center">
                <p className="text-zinc-400 text-sm font-medium">
                    Optimizando experiencia
                    <span className="ml-1">
                        <span className="inline-block animate-pulse [animation-delay:0s] [animation-duration:1.4s]">.</span>
                        <span className="inline-block animate-pulse [animation-delay:0.2s] [animation-duration:1.4s]">.</span>
                        <span className="inline-block animate-pulse [animation-delay:0.4s] [animation-duration:1.4s]">.</span>
                    </span>
                </p>
            </div>
        </div>
    );
}
