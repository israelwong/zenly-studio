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

export default function SlugLoading({ variant = 'gradient' }: { variant?: LoadingVariant }) {
    if (variant === 'solid') {
        return (
            <div className="fixed inset-0 bg-zinc-950 flex flex-col items-center justify-center z-50">
                {/* Imagen */}
                <div className="w-32 h-32 mb-8 relative overflow-hidden rounded-lg">
                    <div className="absolute inset-0 bg-zinc-800 animate-pulse" />
                    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-zinc-700/50 to-transparent animate-shimmer" />
                </div>
                
                {/* Línea separadora */}
                <div className="w-24 h-px bg-zinc-800 mb-8" />
                
                {/* Texto */}
                <p className="text-zinc-400 text-sm font-medium">
                    Optimizando experiencia
                    <span className="ml-1">
                        <span className="inline-block animate-pulse [animation-delay:0s] [animation-duration:1.4s]">.</span>
                        <span className="inline-block animate-pulse [animation-delay:0.2s] [animation-duration:1.4s]">.</span>
                        <span className="inline-block animate-pulse [animation-delay:0.4s] [animation-duration:1.4s]">.</span>
                    </span>
                </p>
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
