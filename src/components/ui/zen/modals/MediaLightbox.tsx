"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface MediaLightboxProps {
    isOpen: boolean;
    onClose: () => void;
    items: Array<{
        id: string;
        url: string;
        fileName: string;
        type: 'foto' | 'video';
    }>;
    initialIndex?: number;
}

export function MediaLightbox({
    isOpen,
    onClose,
    items,
    initialIndex = 0,
}: MediaLightboxProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const touchStartX = useRef(0);

    useEffect(() => {
        const validIndex = Math.max(0, Math.min(initialIndex, items.length - 1));
        setCurrentIndex(validIndex);
    }, [initialIndex, items.length, isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft') handlePrevious();
            if (e.key === 'ArrowRight') handleNext();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, currentIndex, items.length, onClose]);

    if (!isOpen || items.length === 0) return null;

    const currentItem = items[currentIndex];
    if (!currentItem) return null;

    const handleNext = () => {
        setCurrentIndex((prev) => (prev + 1) % items.length);
    };

    const handlePrevious = () => {
        setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        const touchEndX = e.changedTouches[0].clientX;
        const deltaX = touchEndX - touchStartX.current;

        // Swipe left (negative delta) = next
        if (deltaX < -30) {
            handleNext();
        }
        // Swipe right (positive delta) = previous
        else if (deltaX > 30) {
            handlePrevious();
        }
    };

    return (
        <div
            className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center"
        >
            {/* Close Button */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                }}
                className="absolute top-4 right-4 p-2 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 z-[10000]"
                aria-label="Close"
            >
                <X className="w-6 h-6 text-white" />
            </button>

            {/* Media Display */}
            <div 
                className="w-full h-full flex items-center justify-center relative"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onClick={(e) => e.stopPropagation()}
            >
                {currentItem.type === 'foto' ? (
                    <Image
                        src={currentItem.url}
                        alt={currentItem.fileName}
                        layout="fill"
                        objectFit="contain"
                        priority
                    />
                ) : (
                    <video
                        src={currentItem.url}
                        controls
                        autoPlay
                        className="max-w-full max-h-full"
                    />
                )}
            </div>

            {/* Navigation Buttons */}
            {items.length > 1 && (
                <>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handlePrevious();
                        }}
                        className="absolute left-4 p-2 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 z-10"
                        aria-label="Previous"
                    >
                        <ChevronLeft className="w-6 h-6 text-white" />
                    </button>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleNext();
                        }}
                        className="absolute right-4 p-2 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 z-10"
                        aria-label="Next"
                    >
                        <ChevronRight className="w-6 h-6 text-white" />
                    </button>
                </>
            )}

            {/* Bottom Info Bar */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                <div className="flex items-center justify-between max-w-2xl mx-auto">
                    <div>
                        <p className="text-white font-medium">{currentItem.fileName}</p>
                        <p className="text-zinc-400 text-sm">
                            {currentIndex + 1} / {items.length}
                        </p>
                    </div>
                    {items.length > 1 && (
                        <div className="flex gap-2">
                            {items.map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setCurrentIndex(idx);
                                    }}
                                    className={`w-2 h-2 rounded-full transition-all ${idx === currentIndex
                                            ? "bg-emerald-500 w-6"
                                            : "bg-zinc-600 hover:bg-zinc-500"
                                        }`}
                                    aria-label={`Go to item ${idx + 1}`}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
