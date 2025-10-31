'use client';

import React from 'react';
import { ContentBlock } from '@/types/content-blocks';
import { BlockRenderer } from './BlockRenderer';

interface ContentBlocksPreviewProps {
    blocks: ContentBlock[];
    className?: string;
}

export function ContentBlocksPreview({
    blocks,
    className = ''
}: ContentBlocksPreviewProps) {
    if (!blocks || blocks.length === 0) {
        return (
            <div className={`text-center py-12 px-4 ${className}`}>
                <h3 className="text-lg font-semibold text-zinc-300 mb-2">
                    Agrega componentes multimedia
                </h3>
                <p className="text-zinc-400 mb-3">
                    Crea contenido atractivo con imágenes, videos, galerías y más
                </p>
                <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 max-w-sm mx-auto">
                    <p className="text-sm text-zinc-500">
                        Usa el editor para agregar componentes y ver la vista previa aquí
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className={`space-y-2 ${className}`}>
            {blocks
                .sort((a, b) => a.order - b.order) // Asegurar orden correcto
                .map((block) => (
                    <div key={block.id} className="w-full">
                        <BlockRenderer block={block} />
                    </div>
                ))}
        </div>
    );
}
