'use client';

import React, { useRef, useEffect } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MediaItem } from '@/types/content-blocks';
import Glide from '@glidejs/glide';
import '@glidejs/glide/dist/css/glide.core.min.css';
import '@glidejs/glide/dist/css/glide.theme.min.css';

interface ImageSliderProps {
    media: MediaItem[];
    title?: string;
    description?: string;
    aspectRatio?: 'square' | 'video' | 'portrait' | 'landscape';
    showArrows?: boolean;
    showDots?: boolean;
    autoplay?: number; // milliseconds
    className?: string;
}

export function ImageSlider({
    media,
    title,
    description,
    aspectRatio = 'video',
    showArrows = true,
    showDots = true,
    autoplay = 4000,
    className = ''
}: ImageSliderProps) {
    const glideRef = useRef<HTMLDivElement>(null);
    const glideInstanceRef = useRef<Glide | null>(null);

    const aspectRatioClasses = {
        square: 'aspect-square',
        video: 'aspect-video',
        portrait: 'aspect-[3/4]',
        landscape: 'aspect-[4/3]'
    };

    const aspectClass = aspectRatioClasses[aspectRatio];

    useEffect(() => {
        if (!glideRef.current || !media.length) return;

        const glideInstance = new Glide(glideRef.current, {
            type: 'carousel',
            focusAt: 'center',
            perView: 1,
            autoplay: autoplay,
            animationDuration: 600,
            gap: 0,
            classes: {
                activeNav: '[&>*]:bg-emerald-500',
            },
            breakpoints: {
                768: { perView: 1 }
            }
        });

        glideInstance.mount();
        glideInstanceRef.current = glideInstance;

        return () => {
            if (glideInstanceRef.current) {
                glideInstanceRef.current.destroy();
                glideInstanceRef.current = null;
            }
        };
    }, [media, autoplay]);

    if (!media || media.length === 0) {
        return (
            <div className={`text-center py-8 ${className}`}>
                <p className="text-zinc-500">No hay imágenes disponibles</p>
            </div>
        );
    }

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Header */}
            {(title || description) && (
                <div className="text-center">
                    {title && (
                        <h3 className="text-xl font-semibold text-zinc-300 mb-2">
                            {title}
                        </h3>
                    )}
                    {description && (
                        <p className="text-zinc-500">
                            {description}
                        </p>
                    )}
                </div>
            )}

            {/* Glide Slider */}
            <div ref={glideRef} className="glide relative w-full">
                <div className="overflow-hidden" data-glide-el="track">
                    <ul className="whitespace-no-wrap flex-no-wrap [backface-visibility: hidden] [transform-style: preserve-3d] [touch-action: pan-Y] [will-change: transform] relative flex w-full overflow-hidden p-0">
                        {media.map((item, index) => (
                            <li key={item.id} className="glide__slide">
                                <div className={`relative bg-zinc-800 rounded-lg overflow-hidden ${aspectClass}`}>
                                    <Image
                                        src={item.file_url}
                                        alt={item.filename}
                                        fill
                                        className="object-cover"
                                        sizes="(max-width: 768px) 100vw, 80vw"
                                        priority={index === 0}
                                    />
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Navigation Arrows */}
                {showArrows && media.length > 1 && (
                    <div className="glide__arrows absolute inset-y-0 left-0 right-0 flex items-center justify-between pointer-events-none" data-glide-el="controls">
                        <button
                            className="glide__arrow glide__arrow--left pointer-events-auto bg-black/60 text-white p-2 rounded-full ml-2 hover:bg-black/80 transition-colors"
                            data-glide-dir="<"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                            className="glide__arrow glide__arrow--right pointer-events-auto bg-black/60 text-white p-2 rounded-full mr-2 hover:bg-black/80 transition-colors"
                            data-glide-dir=">"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                )}

                {/* Dots Indicator */}
                {showDots && media.length > 1 && (
                    <div className="glide__bullets flex justify-center gap-2 mt-4" data-glide-el="controls[nav]">
                        {media.map((_, index) => (
                            <button
                                key={index}
                                className="w-2 h-2 rounded-full bg-zinc-600 hover:bg-zinc-500 transition-colors"
                                data-glide-dir={`=${index}`}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
