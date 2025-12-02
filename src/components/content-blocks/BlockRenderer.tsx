'use client';

import React from 'react';
import { ContentBlock, TextBlockConfig, MediaBlockConfig, HeroContactConfig, HeroImageConfig, HeroVideoConfig, HeroTextConfig, HeroConfig, SeparatorBlockConfig } from '@/types/content-blocks';
import { VideoSingle } from '@/components/shared/video';
import { ImageSingle, ImageGrid, ImageCarousel } from '@/components/shared/media';
import { MasonryGallery } from '@/components/shared/media/MasonryGallery';
import HeroComponent from '@/components/shared/hero/HeroComponent';

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
                                showDeleteButtons={false}
                                onDelete={undefined}
                            />
                        );
                    case 'slide':
                        return (
                            <ImageCarousel
                                media={block.media}
                                title={block.title}
                                description={block.description}
                                showArrows={true}
                                showDots={true}
                                autoplay={4000}
                                className={className}
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

            case 'media-gallery':
                if (!block.media || block.media.length === 0) {
                    return (
                        <div className={`${className} p-8 bg-zinc-800 rounded-lg border border-zinc-700 text-center`}>
                            <p className="text-zinc-500">No hay contenido en la galería</p>
                        </div>
                    );
                }

                // Determinar el modo de visualización desde config
                const mediaGalleryMode = (block.config as Partial<MediaBlockConfig>)?.mode || 'grid';
                const mediaGalleryConfig = block.config as Partial<MediaBlockConfig>;
                const borderStyle = mediaGalleryConfig.borderStyle || 'rounded';

                // Siempre renderizar según el modo seleccionado, incluso con 1 archivo
                switch (mediaGalleryMode) {
                    case 'masonry':
                        return (
                            <MasonryGallery
                                media={block.media}
                                className={className}
                                enableLightbox={true}
                                showSizeLabel={false}
                                columns={mediaGalleryConfig.columns ?? 3}
                                spacing={mediaGalleryConfig.gap ?? 4}
                                showDeleteButtons={false}
                                onDelete={undefined}
                                borderStyle={borderStyle}
                            />
                        );
                    case 'slide':
                        return (
                            <ImageCarousel
                                media={block.media}
                                title={block.title}
                                description={block.description}
                                showArrows={mediaGalleryConfig.showArrows ?? true}
                                showDots={mediaGalleryConfig.showDots ?? false}
                                autoplay={mediaGalleryConfig.autoplay ?? 4000}
                                className={className}
                            />
                        );
                    case 'grid':
                    default:
                        return (
                            <ImageGrid
                                media={block.media}
                                title={block.title}
                                description={block.description}
                                config={{
                                    ...mediaGalleryConfig,
                                    borderStyle
                                }}
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
                const textContent = textConfig?.text || block.description || '';
                const textAlignment = textConfig?.alignment || 'left';
                const textType = textConfig?.textType || 'text';
                const fontSize = textConfig?.fontSize || 'base';
                const fontWeight = textConfig?.fontWeight || 'normal';
                const italic = textConfig?.italic || false;

                const alignmentClasses = {
                    left: 'text-left',
                    center: 'text-center',
                    right: 'text-right'
                };

                // Mapeo de tamaños de fuente
                const fontSizeClasses = {
                    sm: 'text-sm',
                    base: 'text-base',
                    lg: 'text-lg',
                    xl: 'text-xl',
                    '2xl': 'text-2xl',
                };

                // Estilos según el tipo de texto
                const textTypeStyles = {
                    'heading-1': {
                        tag: 'h1' as const,
                        className: `text-2xl font-bold text-zinc-300 leading-tight break-words overflow-wrap-anywhere ${alignmentClasses[textAlignment as keyof typeof alignmentClasses] || alignmentClasses.left}`,
                        containerClass: `${className} ${block.presentation === 'fullwidth' ? 'w-full' : 'max-w-4xl mx-auto'} mt-5`,
                    },
                    'heading-3': {
                        tag: 'h3' as const,
                        className: `text-xl font-semibold text-zinc-300 leading-tight break-words overflow-wrap-anywhere ${alignmentClasses[textAlignment as keyof typeof alignmentClasses] || alignmentClasses.left}`,
                        containerClass: `${className} ${block.presentation === 'fullwidth' ? 'w-full' : 'max-w-4xl mx-auto'}`,
                    },
                    'text': {
                        tag: 'div' as const,
                        className: `${fontSizeClasses[fontSize]} font-${fontWeight} ${italic ? 'italic' : ''} leading-relaxed break-words overflow-wrap-anywhere ${alignmentClasses[textAlignment as keyof typeof alignmentClasses] || alignmentClasses.left}`,
                        containerClass: `${className} ${block.presentation === 'fullwidth' ? 'w-full' : 'max-w-4xl mx-auto'} mb-5 overflow-hidden`,
                    },
                    'blockquote': {
                        tag: 'blockquote' as const,
                        className: `border-l-4 border-zinc-800 pl-4 py-1 text-md italic ${fontSizeClasses[fontSize]} font-${fontWeight} leading-relaxed break-words overflow-wrap-anywhere ${alignmentClasses[textAlignment as keyof typeof alignmentClasses] || alignmentClasses.left}`,
                        containerClass: `${className} ${block.presentation === 'fullwidth' ? 'w-full' : 'max-w-4xl mx-auto'}`,
                    },
                };

                const style = textTypeStyles[textType as keyof typeof textTypeStyles] || textTypeStyles.text;
                const Tag = style.tag;

                return (
                    <div className={style.containerClass}>
                        {block.title && textType === 'text' && (
                            <h3 className="text-xl font-semibold text-zinc-300 mb-3">
                                {block.title}
                            </h3>
                        )}
                        <Tag
                            className={style.className}
                            style={{
                                color: textConfig?.color || (textType === 'blockquote' ? '#a1a1aa' : textType === 'heading-1' || textType === 'heading-3' ? '#e4e4e7' : '#d4d4d8'),
                                wordBreak: 'break-word',
                                overflowWrap: 'break-word',
                            }}
                        >
                            {textContent}
                        </Tag>
                    </div>
                );

            case 'hero-contact':
            case 'hero-image':
            case 'hero-video':
            case 'hero-text':
            case 'hero':
                // Convertir configuraciones antiguas a HeroConfig unificado
                let heroConfig: HeroConfig = {};

                if (block.type === 'hero-contact') {
                    const oldConfig = block.config as HeroContactConfig;
                    heroConfig = {
                        title: oldConfig.titulo,
                        subtitle: oldConfig.evento,
                        description: oldConfig.descripcion,
                        textAlignment: 'center',
                        verticalAlignment: 'center',
                        backgroundType: 'image',
                        containerStyle: 'fullscreen'
                    };
                } else if (block.type === 'hero-image') {
                    const oldConfig = block.config as HeroImageConfig;
                    heroConfig = {
                        title: oldConfig.title,
                        subtitle: oldConfig.subtitle,
                        description: oldConfig.description,
                        buttons: oldConfig.buttons,
                        overlay: oldConfig.overlay,
                        overlayOpacity: oldConfig.overlayOpacity,
                        textAlignment: oldConfig.textAlignment || 'center',
                        verticalAlignment: oldConfig.imagePosition === 'top' ? 'top' : oldConfig.imagePosition === 'bottom' ? 'bottom' : 'center',
                        backgroundType: 'image',
                        containerStyle: 'fullscreen'
                    };
                } else if (block.type === 'hero-video') {
                    const oldConfig = block.config as HeroVideoConfig;
                    heroConfig = {
                        title: oldConfig.title,
                        subtitle: oldConfig.subtitle,
                        description: oldConfig.description,
                        buttons: oldConfig.buttons,
                        overlay: oldConfig.overlay,
                        overlayOpacity: oldConfig.overlayOpacity,
                        textAlignment: oldConfig.textAlignment || 'center',
                        verticalAlignment: 'center',
                        backgroundType: 'video',
                        autoPlay: oldConfig.autoPlay,
                        muted: oldConfig.muted,
                        loop: oldConfig.loop,
                        containerStyle: 'fullscreen'
                    };
                } else if (block.type === 'hero-text') {
                    const oldConfig = block.config as HeroTextConfig;
                    heroConfig = {
                        title: oldConfig.title,
                        subtitle: oldConfig.subtitle,
                        description: oldConfig.description,
                        buttons: oldConfig.buttons,
                        textAlignment: oldConfig.textAlignment || 'center',
                        verticalAlignment: 'center',
                        backgroundType: 'image',
                        containerStyle: 'fullscreen'
                    };
                } else {
                    // Caso 'hero' - usar configuración directamente
                    heroConfig = (block.config || {}) as HeroConfig;
                }

                return (
                    <HeroComponent
                        config={heroConfig}
                        media={block.media || []}
                        className={className}
                    />
                );

            case 'separator':
                const separatorConfig = (block.config || {}) as Partial<SeparatorBlockConfig>;
                const separatorStyle = separatorConfig.style || 'space';
                const separatorHeight = separatorConfig.height ?? (separatorStyle === 'space' ? 24 : 0.5);

                // En mobile preview siempre usar zinc-600 para líneas
                const borderColorClass = 'border-zinc-700';

                if (separatorStyle === 'space') {
                    return (
                        <div
                            className={className}
                            style={{ height: `${separatorHeight}px` }}
                            aria-hidden="true"
                        />
                    );
                }

                if (separatorStyle === 'dotted') {
                    return (
                        <div
                            className={`${className} w-full border-dotted ${borderColorClass} border-t my-4`}
                            style={{ borderTopWidth: `${separatorHeight}px` }}
                            aria-hidden="true"
                        />
                    );
                }

                return (
                    <div
                        className={`${className} w-full border-solid ${borderColorClass} border-t my-4`}
                        style={{ borderTopWidth: `${separatorHeight}px` }}
                        aria-hidden="true"
                    />
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
