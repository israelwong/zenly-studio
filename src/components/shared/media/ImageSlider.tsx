'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MediaItem } from '@/types/content-blocks';
import { formatBytes } from '@/lib/utils/storage';

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
    autoplay,
    className = ''
}: ImageSliderProps) {
    const [currentIndex, setCurrentIndex] = useState(0);

    const aspectRatioClasses = {
        square: 'aspect-square',
        video: 'aspect-video',
        portrait: 'aspect-[3/4]',
        landscape: 'aspect-[4/3]'
    };

    const aspectClass = aspectRatioClasses[aspectRatio];

    const nextSlide = () => {
        setCurrentIndex((prev) => (prev + 1) % media.length);
    };

    const prevSlide = () => {
        setCurrentIndex((prev) => (prev - 1 + media.length) % media.length);
    };

    const goToSlide = (index: number) => {
        setCurrentIndex(index);
    };

    // Autoplay effect
    React.useEffect(() => {
        if (autoplay && media.length > 1) {
            const interval = setInterval(nextSlide, autoplay);
            return () => clearInterval(interval);
        }
    }, [autoplay, media.length]);

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

            {/* Slider */}
            <div className="relative group">
                <div className={`relative bg-zinc-800 rounded-lg overflow-hidden ${aspectClass}`}>
                    <Image
                        src={media[currentIndex].file_url}
                        alt={media[currentIndex].filename}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 80vw"
                    />

                    {/* Storage Size Label */}
                    {media[currentIndex].storage_bytes && (
                        <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                            {formatBytes(media[currentIndex].storage_bytes)}
                        </div>
                    )}
                </div>

                {/* Navigation Arrows */}
                {showArrows && media.length > 1 && (
                    <>
                        <button
                            onClick={prevSlide}
                            className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                            onClick={nextSlide}
                            className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <ChevronRight className="h-5 w-5" />
                        </button>
                    </>
                )}

                {/* Dots Indicator */}
                {showDots && media.length > 1 && (
                    <div className="flex justify-center space-x-2 mt-4">
                        {media.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => goToSlide(index)}
                                className={`w-2 h-2 rounded-full transition-colors ${index === currentIndex
                                    ? 'bg-emerald-500'
                                    : 'bg-zinc-600 hover:bg-zinc-500'
                                    }`}
                            />
                        ))}
                    </div>
                )}

                {/* Image Counter */}
                {media.length > 1 && (
                    <div className="absolute top-4 right-4 bg-black/50 text-white text-sm px-2 py-1 rounded">
                        {currentIndex + 1} / {media.length}
                    </div>
                )}
            </div>
        </div>
    );
}
