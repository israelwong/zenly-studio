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
            <div className={`text-center py-8 ${className}`}>
                <div className="text-zinc-500 mb-2">
                    📝
                </div>
                <p className="text-zinc-400 mb-1">No hay componentes agregados</p>
                <p className="text-sm text-zinc-500">
                    Agrega componentes desde el editor para ver la vista previa
                </p>
            </div>
        );
    }

    return (
        <div className={`space-y-6 ${className}`}>
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
