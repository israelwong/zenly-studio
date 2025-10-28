"use client";
import { useEffect, useRef } from "react";
import Glide from "@glidejs/glide";
import Image from "next/image";

interface ImageCarouselProps {
    images: string[]
    baseUrl: string
    className?: string
    autoplay?: number
    perView?: number
    gap?: number
    animationDuration?: number
    breakpoints?: {
        [key: number]: {
            perView?: number
            gap?: number
        }
    }
    imageClassName?: string
    containerClassName?: string
    trackClassName?: string
}

const ImageCarousel = ({
    images,
    baseUrl,
    className = "",
    autoplay = 3000,
    perView = 3.5,
    gap = 0,
    animationDuration = 700,
    breakpoints = {
        1024: { perView: 4 },
        640: { perView: 1.3 }
    },
    imageClassName = "m-auto max-h-full w-full max-w-full rounded-lg",
    containerClassName = "relative w-full h-fit",
    trackClassName = "overflow-hidden"
}: ImageCarouselProps) => {
    const glideRef = useRef<HTMLDivElement>(null)
    const glideInstanceRef = useRef<Glide | null>(null)

    useEffect(() => {
        if (!glideRef.current) return

        const glideInstance = new Glide(glideRef.current, {
            type: "carousel",
            focusAt: "center",
            perView,
            autoplay,
            animationDuration,
            gap,
            classes: {
                activeNav: "[&>*]:bg-slate-200",
            },
            breakpoints,
        })

        glideInstance.mount()
        glideInstanceRef.current = glideInstance

        return () => {
            if (glideInstanceRef.current) {
                glideInstanceRef.current.destroy()
            }
        }
    }, [images, perView, autoplay, animationDuration, gap, breakpoints])

    return (
        <div className={className}>
            <div ref={glideRef} className={containerClassName}>
                <div className={trackClassName} data-glide-el="track">
                    <ul className="whitespace-no-wrap flex-no-wrap [backface-visibility: hidden] [transform-style: preserve-3d] [touch-action: pan-Y] [will-change: transform] relative flex w-full overflow-hidden p-0">
                        {images.map((image, index) => (
                            <li key={index} className="glide__slide">
                                <div className="relative aspect-square overflow-hidden">
                                    <Image
                                        src={`${baseUrl}${image}`}
                                        alt={`Imagen ${index + 1}`}
                                        fill
                                        className={imageClassName}
                                        unoptimized={true}
                                        sizes="(max-width: 640px) 80vw, (max-width: 1024px) 25vw, 20vw"
                                    />
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    )
}

export default ImageCarousel
