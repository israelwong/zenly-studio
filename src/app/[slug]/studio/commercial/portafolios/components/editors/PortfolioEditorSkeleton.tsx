import { ArrowLeft } from 'lucide-react';
import { ZenButton, ZenCard, ZenCardContent, ZenCardHeader } from '@/components/ui/zen';

export function PortfolioEditorSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Header */}
            <div className="flex items-center gap-4">
                <ZenButton variant="ghost" disabled className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Regresar
                </ZenButton>
                <div>
                    <div className="h-8 w-48 bg-zinc-800 rounded mb-2"></div>
                    <div className="h-4 w-64 bg-zinc-800 rounded"></div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Panel de Edición Skeleton */}
                <div className="space-y-6">
                    <ZenCard>
                        <ZenCardHeader>
                            <div className="flex items-center justify-between">
                                <div className="h-6 w-40 bg-zinc-800 rounded"></div>
                                <div className="flex items-center gap-4">
                                    <div className="h-8 w-24 bg-zinc-800 rounded-full"></div>
                                    <div className="h-9 w-28 bg-zinc-800 rounded-full"></div>
                                </div>
                            </div>
                        </ZenCardHeader>

                        <ZenCardContent className="space-y-4">
                            {/* Grid de portada y título */}
                            <div className="grid grid-cols-3 gap-4">
                                {/* Portada */}
                                <div className="aspect-square bg-zinc-800 rounded-lg"></div>

                                {/* Título y controles */}
                                <div className="col-span-2 space-y-4">
                                    <div className="h-20 bg-zinc-800 rounded-md"></div>
                                    <div className="h-16 bg-zinc-800 rounded-md"></div>
                                </div>
                            </div>

                            {/* Sección de componentes */}
                            <div className="space-y-2 pt-6">
                                <div className="flex items-center justify-between mb-6 pb-4 border-t border-zinc-800">
                                    <div className="flex items-center gap-2 mt-4">
                                        <div className="h-5 w-32 bg-zinc-800 rounded"></div>
                                        <div className="h-5 w-8 bg-zinc-800 rounded-full"></div>
                                    </div>
                                    <div className="h-4 w-16 bg-zinc-800 rounded mt-4"></div>
                                </div>

                                {/* Bloques de contenido skeleton */}
                                <div className="space-y-4">
                                    <div className="h-12 bg-zinc-800 rounded-md"></div>
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-4 w-4 bg-zinc-700 rounded"></div>
                                                    <div className="h-4 w-32 bg-zinc-700 rounded"></div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="h-4 w-4 bg-zinc-700 rounded"></div>
                                                    <div className="h-4 w-4 bg-zinc-700 rounded"></div>
                                                </div>
                                            </div>
                                            <div className="h-48 bg-zinc-700 rounded"></div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Tags skeleton */}
                            <div className="space-y-4 p-4 border border-zinc-800 rounded-md">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="h-4 w-32 bg-zinc-800 rounded"></div>
                                    <div className="h-8 w-24 bg-zinc-800 rounded"></div>
                                </div>
                                <div className="flex gap-2">
                                    <div className="h-6 w-20 bg-zinc-800 rounded-full"></div>
                                    <div className="h-6 w-24 bg-zinc-800 rounded-full"></div>
                                    <div className="h-6 w-16 bg-zinc-800 rounded-full"></div>
                                </div>
                            </div>

                            {/* Botones */}
                            <div className="flex gap-3 pt-4">
                                <div className="flex-1 h-10 bg-zinc-800 rounded-md"></div>
                                <div className="h-10 w-32 bg-zinc-800 rounded-md"></div>
                                <div className="h-10 w-24 bg-zinc-800 rounded-md"></div>
                            </div>
                        </ZenCardContent>
                    </ZenCard>
                </div>

                {/* Panel de Preview Skeleton */}
                <div className="hidden lg:block">
                    <div className="sticky top-6">
                        <div className="w-full max-w-sm mx-auto relative">
                            {/* Simulador de móvil con dimensiones reales del componente */}
                            <div className="bg-zinc-900 border border-zinc-700 rounded-3xl shadow-2xl w-[375px] h-[812px] flex flex-col relative overflow-hidden">
                                {/* Header */}
                                <div className="shrink-0 rounded-t-3xl bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800 px-4 py-3 animate-pulse">
                                    <div className="flex items-center justify-between">
                                        <div className="h-9 w-24 bg-zinc-800 rounded"></div>
                                        <div className="h-9 w-9 bg-zinc-800 rounded-full"></div>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 overflow-hidden p-5 animate-pulse">
                                    <div className="space-y-4">
                                        {/* Hero image */}
                                        <div className="aspect-video bg-zinc-800 rounded-lg"></div>

                                        {/* Title */}
                                        <div className="h-7 w-3/4 bg-zinc-800 rounded"></div>

                                        {/* Description lines */}
                                        <div className="space-y-2">
                                            <div className="h-4 w-full bg-zinc-800 rounded"></div>
                                            <div className="h-4 w-5/6 bg-zinc-800 rounded"></div>
                                            <div className="h-4 w-4/5 bg-zinc-800 rounded"></div>
                                        </div>

                                        {/* Gallery preview */}
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="aspect-square bg-zinc-800 rounded"></div>
                                            <div className="aspect-square bg-zinc-800 rounded"></div>
                                        </div>

                                        {/* More content */}
                                        <div className="space-y-2">
                                            <div className="h-4 w-full bg-zinc-800 rounded"></div>
                                            <div className="h-4 w-3/4 bg-zinc-800 rounded"></div>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="shrink-0 border-t border-zinc-800 p-4 bg-zinc-900 rounded-b-3xl animate-pulse">
                                    <div className="flex items-center justify-between">
                                        <div className="h-6 w-24 bg-zinc-800 rounded"></div>
                                        <div className="h-6 w-32 bg-zinc-800 rounded"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
