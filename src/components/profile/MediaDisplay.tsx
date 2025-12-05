'use client';

import Image from 'next/image';

interface MediaDisplayProps {
    src: string;
    alt: string;
    fileType: 'image' | 'video';
    thumbnailUrl?: string;
    className?: string;
    fill?: boolean;
    width?: number;
    height?: number;
    sizes?: string;
    priority?: boolean;
    unoptimized?: boolean;
    style?: React.CSSProperties;
    onClick?: (e: React.MouseEvent) => void;
}

/**
 * MediaDisplay - Componente para renderizar imágenes o thumbnails de videos
 * Si es video, muestra el thumbnail (primer frame) en lugar del video completo
 * Si es imagen, la muestra normalmente
 */
export function MediaDisplay({
    src,
    alt,
    fileType,
    thumbnailUrl,
    className,
    fill,
    width,
    height,
    sizes,
    priority,
    unoptimized = true,
    style,
    onClick
}: MediaDisplayProps) {
    // Si es video, usar thumbnail si existe
    const displaySrc = fileType === 'video'
        ? thumbnailUrl // Solo usar thumbnail si existe
        : src;

    // Si es video sin thumbnail, mostrar el video con poster en el primer frame
    if (fileType === 'video' && !thumbnailUrl) {
        // Renderizar video con preload="metadata" para mostrar primer frame
        if (fill) {
            return (
                <div className="relative w-full h-full" style={style}>
                    <video
                        src={src}
                        className={className}
                        preload="metadata"
                        muted
                        playsInline
                        onClick={onClick}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }}
                    />
                </div>
            );
        }

        return (
            <video
                src={src}
                className={className}
                width={width}
                height={height}
                preload="metadata"
                muted
                playsInline
                onClick={onClick}
                style={{ ...style, objectFit: 'cover', pointerEvents: 'none' }}
            />
        );
    }

    // Si es video pero no tiene thumbnail válido, no renderizar nada
    if (fileType === 'video' && !displaySrc) {
        return null;
    }

    // Renderizar imagen o thumbnail del video
    if (fill) {
        return (
            <Image
                src={displaySrc}
                alt={alt}
                fill
                className={className}
                sizes={sizes}
                priority={priority}
                unoptimized={unoptimized}
                style={style}
                onClick={onClick}
            />
        );
    }

    return (
        <Image
            src={displaySrc}
            alt={alt}
            width={width || 800}
            height={height || 800}
            className={className}
            sizes={sizes}
            priority={priority}
            unoptimized={unoptimized}
            style={style}
            onClick={onClick}
        />
    );
}
