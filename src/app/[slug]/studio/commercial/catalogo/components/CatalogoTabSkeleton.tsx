/**
 * Skeleton para el tab del catálogo
 * Debe coincidir exactamente con el contenido real
 */
export function CatalogoTabSkeleton() {
    return (
        <div className="space-y-4">
            {/* Header con botón de crear sección */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Diseña la estructura de tu catálogo comercial</h3>
                <div className="h-8 w-32 bg-zinc-700 rounded animate-pulse" />
            </div>

            {/* Lista de secciones */}
            <div className="space-y-2">
                {/* Sección expandida */}
                <div className="border border-zinc-700 rounded-lg overflow-hidden animate-pulse">
                    {/* Header de sección */}
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
                        {/* Categoría expandida */}
                        <div className="border-t border-zinc-700/50">
                            {/* Header de categoría */}
                            <div className="p-4 pl-8 flex items-center justify-between hover:bg-zinc-800/30 bg-zinc-800/20">
                                <div className="flex items-center gap-3 flex-1">
                                    <div className="w-3 h-3 bg-zinc-700 rounded"></div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 bg-zinc-700 rounded"></div>
                                        <div className="h-4 bg-zinc-700 rounded w-32"></div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="h-4 bg-zinc-700 rounded w-10"></div>
                                    <div className="w-6 h-6 bg-zinc-700 rounded"></div>
                                    <div className="w-6 h-6 bg-zinc-700 rounded"></div>
                                </div>
                            </div>

                            {/* Items dentro de la categoría */}
                            <div className="bg-zinc-800/20 border-l-2 border-zinc-700/30 ml-8">
                                {[1, 2].map((j) => (
                                    <div key={j} className={`flex items-center justify-between p-3 pl-6 ${j > 1 ? 'border-t border-zinc-700/30' : ''}`}>
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
                </div>

                {/* Secciones colapsadas (solo headers) */}
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
