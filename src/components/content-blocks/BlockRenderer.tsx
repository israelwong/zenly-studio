'use client';

import React from 'react';
import { ContentBlock, TextBlockConfig, MediaBlockConfig } from '@/types/content-blocks';
import { VideoSingle } from '@/components/shared/video';
import { ImageSingle, ImageGrid } from '@/components/shared/media';
import { MasonryGallery } from '@/components/shared/media/MasonryGallery';

interface BlockRendererProps {
    block: ContentBlock;
    className?: string;
}

export function BlockRenderer({ block, className = '' }: BlockRendererProps) {
    const renderBlock = () => {
        switch (block.type) {
            case 'image':
                if (!block.media || block.media.length === 0) {
                    return (
                        <div className={`${className} p-8 bg-zinc-800 rounded-lg border border-zinc-700 text-center`}>
                            <p className="text-zinc-500">No hay imagen disponible</p>
                        </div>
                    );
                }
                return (
                    <ImageSingle
                        media={block.media[0]}
                        aspectRatio="auto"
                        className={className}
                        showCaption={false}
                        studioSlug=""
                        showSizeLabel={false}
                        showBorder={false}
                    />
                );

            case 'gallery':
                if (!block.media || block.media.length === 0) {
                    return (
                        <div className={`${className} p-8 bg-zinc-800 rounded-lg border border-zinc-700 text-center`}>
                            <p className="text-zinc-500">No hay imágenes en la galería</p>
                        </div>
                    );
                }

                // Determinar el modo de la galería
                const mode = (block.config as Partial<MediaBlockConfig>)?.mode || 'grid';
                
                // Renderizar según el modo
                switch (mode) {
                    case 'masonry':
                        return (
                            <MasonryGallery
                                media={block.media}
                                className={className}
                                enableLightbox={true}
                                showSizeLabel={false}
                                columns={3}
                                spacing={4}
                            />
                        );
                    case 'slide':
                        // TODO: Implementar GallerySlide
                        return (
                            <ImageGrid
                                media={block.media}
                                title={block.title}
                                description={block.description}
                                config={block.config}
                                className={className}
                                showSizeLabel={false}
                                isEditable={false}
                                lightbox={true}
                            />
                        );
                    case 'grid':
                    default:
                        return (
                            <ImageGrid
                                media={block.media}
                                title={block.title}
                                description={block.description}
                                config={block.config}
                                className={className}
                                showSizeLabel={false}
                                isEditable={false}
                                lightbox={true}
                            />
                        );
                }

            case 'video':
                if (!block.media || block.media.length === 0) {
                    return (
                        <div className={`${className} p-8 bg-zinc-800 rounded-lg border border-zinc-700 text-center`}>
                            <p className="text-zinc-500">No hay video disponible</p>
                        </div>
                    );
                }
                return (
                    <VideoSingle
                        src={block.media[0].file_url}
                        config={block.config}
                        storageBytes={block.media[0].storage_bytes}
                        className={className}
                        showSizeLabel={false}
                    />
                );

            case 'text':
                const textConfig = block.config as TextBlockConfig;
                return (
                    <div
                        className={`${className} ${block.presentation === 'fullwidth' ? 'w-full' : 'max-w-4xl mx-auto'
                            }`}
                    >
                        {block.title && (
                            <h3 className="text-xl font-semibold text-zinc-300 mb-3">
                                {block.title}
                            </h3>
                        )}
                        <div
                            className={`text-${textConfig?.fontSize || 'base'} font-${textConfig?.fontWeight || 'normal'}`}
                            style={{
                                color: textConfig?.color || '#ffffff',
                                textAlign: textConfig?.alignment || 'left'
                            }}
                        >
                            {block.description}
                        </div>
                    </div>
                );

            default:
                return (
                    <div className={`${className} p-4 bg-zinc-800 rounded-lg border border-zinc-700`}>
                        <p className="text-zinc-500 text-center">
                            Tipo de componente no soportado: {block.type}
                        </p>
                    </div>
                );
        }
    };

    return (
        <div className="w-full">
            {renderBlock()}
        </div>
    );
}
