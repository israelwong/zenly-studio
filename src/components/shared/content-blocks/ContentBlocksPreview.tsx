'use client';

import React from 'react';
import { ContentBlock } from '@/types/content-blocks';
import { BlockRenderer } from './BlockRenderer';
import { Image, Video, Layout, Sparkles } from 'lucide-react';

interface ContentBlocksPreviewProps {
    blocks: ContentBlock[];
    className?: string;
    context?: 'portfolio' | 'offer';
    contextData?: {
        eventTypeName?: string;
        offerSlug?: string;
        offerId?: string;
    };
}

export function ContentBlocksPreview({
    blocks,
    className = '',
    context,
    contextData
}: ContentBlocksPreviewProps) {
    if (!blocks || blocks.length === 0) {
        return (
            <div className={`flex flex-col items-center justify-center py-16 px-4 ${className}`}>
                {/* Icono decorativo con gradiente */}
                <div className="relative mb-6">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-blue-500/20 to-emerald-500/20 rounded-2xl blur-xl"></div>
                    <div className="relative bg-zinc-800/80 border border-zinc-700/50 rounded-2xl p-6 backdrop-blur-sm">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-500/10 rounded-lg">
                                <Image className="h-5 w-5 text-purple-400" />
                            </div>
                            <div className="p-2 bg-blue-500/10 rounded-lg">
                                <Video className="h-5 w-5 text-blue-400" />
                            </div>
                            <div className="p-2 bg-emerald-500/10 rounded-lg">
                                <Layout className="h-5 w-5 text-emerald-400" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Título y descripción */}
                <div className="text-center max-w-md space-y-3 mb-6">
                    <h3 className="text-xl font-semibold text-zinc-100 flex items-center justify-center gap-2">
                        <Sparkles className="h-5 w-5 text-purple-400" />
                        Agrega componentes multimedia
                    </h3>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                        Crea contenido atractivo con imágenes, videos, galerías y más componentes visuales
                    </p>
                </div>

                {/* Card informativa mejorada */}
                <div className="bg-gradient-to-br from-zinc-800/60 to-zinc-900/60 border border-zinc-700/50 rounded-xl p-5 max-w-md mx-auto backdrop-blur-sm shadow-lg">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg mt-0.5">
                            <Layout className="h-4 w-4 text-blue-400" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-medium text-zinc-300 mb-1">
                                Vista previa en tiempo real
                            </p>
                            <p className="text-xs text-zinc-500 leading-relaxed">
                                Usa el editor para agregar componentes y ver la vista previa aquí instantáneamente
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`space-y-2 ${className}`}>
            {blocks
                .sort((a, b) => a.order - b.order) // Asegurar orden correcto
                .map((block) => {
                    // Si es hero-portfolio, inyectar eventTypeName en el config
                    const enrichedBlock = block.type === 'hero-portfolio' && contextData?.eventTypeName
                        ? {
                            ...block,
                            config: {
                                ...block.config,
                                eventTypeName: contextData.eventTypeName
                            }
                        }
                        : block;

                    return (
                        <div key={block.id} className="w-full">
                            <BlockRenderer block={enrichedBlock} context={context} />
                        </div>
                    );
                })}
        </div>
    );
}
