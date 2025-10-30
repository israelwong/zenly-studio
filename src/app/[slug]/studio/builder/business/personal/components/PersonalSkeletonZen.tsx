import React from 'react';
import {
    ZenCard,
    ZenCardHeader,
    ZenCardTitle,
    ZenCardContent
} from '@/components/ui/zen';

export function PersonalSkeletonZen() {
    return (
        <div className="space-y-6">
            {/* Skeleton para 3 categorías */}
            {[...Array(3)].map((_, categoryIndex) => (
                <ZenCard key={categoryIndex} variant="default" padding="none">
                    <ZenCardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {/* Icono de categoría */}
                                <div className="w-5 h-5 bg-zinc-700 rounded animate-pulse" />
                                {/* Nombre de categoría */}
                                <div className="h-6 bg-zinc-700 rounded w-32 animate-pulse" />
                                {/* Badge de contador */}
                                <div className="h-5 bg-zinc-700 rounded-full w-8 animate-pulse" />
                            </div>
                            {/* Botón "Nuevo Personal" */}
                            <div className="h-9 bg-zinc-700 rounded w-32 animate-pulse" />
                        </div>
                    </ZenCardHeader>
                    <ZenCardContent>
                        <div className="space-y-3">
                            {/* Skeleton para 3 items de personal por categoría */}
                            {[...Array(3)].map((_, itemIndex) => (
                                <div key={itemIndex} className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            {/* Avatar */}
                                            <div className="w-10 h-10 bg-zinc-700 rounded-full animate-pulse" />
                                            <div className="space-y-2">
                                                {/* Nombre */}
                                                <div className="h-4 bg-zinc-700 rounded w-24 animate-pulse" />
                                                {/* Email/Teléfono */}
                                                <div className="h-3 bg-zinc-700 rounded w-32 animate-pulse" />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {/* Badges de perfiles */}
                                            <div className="h-5 bg-zinc-700 rounded-full w-16 animate-pulse" />
                                            <div className="h-5 bg-zinc-700 rounded-full w-20 animate-pulse" />
                                            {/* Botones de acción */}
                                            <div className="flex gap-1">
                                                <div className="w-8 h-8 bg-zinc-700 rounded animate-pulse" />
                                                <div className="w-8 h-8 bg-zinc-700 rounded animate-pulse" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ZenCardContent>
                </ZenCard>
            ))}
        </div>
    );
}
