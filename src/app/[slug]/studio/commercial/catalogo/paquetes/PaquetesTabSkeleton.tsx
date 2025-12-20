/**
 * Skeleton para el tab de Paquetes
 * Consistente con CatalogoTabSkeleton
 */
export function PaquetesTabSkeleton() {
    return (
        <div className="space-y-4">
            {/* Header con loading */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Crea y organiza tus paquetes de servicios</h3>
                <div className="flex items-center gap-2 text-zinc-400">
                    <div className="h-8 w-32 bg-zinc-700 rounded animate-pulse" />
                </div>
            </div>

            {/* Skeleton de tipos de evento */}
            <div className="space-y-2">
                {/* Tipo de evento expandido */}
                <div className="border border-zinc-700 rounded-lg overflow-hidden animate-pulse">
                    {/* Header del tipo de evento */}
                    <div className="bg-zinc-800/30 p-4 flex items-center justify-between hover:bg-zinc-800/50">
                        <div className="flex items-center gap-3 flex-1">
                            <div className="w-4 h-4 bg-zinc-700 rounded"></div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-zinc-700 rounded"></div>
                                <div className="h-5 bg-zinc-700 rounded w-40"></div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="h-5 bg-zinc-700 rounded w-12"></div>
                            <div className="w-8 h-8 bg-zinc-700 rounded"></div>
                            <div className="w-8 h-8 bg-zinc-700 rounded"></div>
                        </div>
                    </div>

                    {/* Contenido expandido */}
                    <div className="bg-zinc-900/50 space-y-0">
                        <div className="border-t border-zinc-700/50">
                            {[1, 2].map((j) => (
                                <div key={j} className={`flex items-center justify-between p-3 pl-8 ${j > 1 ? 'border-t border-zinc-700/30' : ''}`}>
                                    <div className="flex items-center gap-3 flex-1">
                                        <div className="w-3 h-3 bg-zinc-700 rounded"></div>
                                        <div className="flex-1 min-w-0">
                                            <div className="h-4 bg-zinc-700 rounded w-40 mb-1"></div>
                                            <div className="h-3 bg-zinc-700 rounded w-24"></div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="h-4 bg-zinc-700 rounded w-20"></div>
                                        <div className="w-6 h-6 bg-zinc-700 rounded"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Tipos de evento colapsados (solo headers) */}
                {[1, 2].map((i) => (
                    <div key={i} className="border border-zinc-700 rounded-lg overflow-hidden animate-pulse">
                        <div className="bg-zinc-800/30 p-4 flex items-center justify-between hover:bg-zinc-800/50">
                            <div className="flex items-center gap-3 flex-1">
                                <div className="w-4 h-4 bg-zinc-700 rounded"></div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-zinc-700 rounded"></div>
                                    <div className="h-5 bg-zinc-700 rounded w-40"></div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="h-5 bg-zinc-700 rounded w-12"></div>
                                <div className="w-8 h-8 bg-zinc-700 rounded"></div>
                                <div className="w-8 h-8 bg-zinc-700 rounded"></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

