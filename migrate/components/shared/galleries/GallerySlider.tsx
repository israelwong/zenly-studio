'use client'
import React, { useEffect, useRef } from 'react'
import Glide from '@glidejs/glide'
import Image from 'next/image'

// Nuevos tipos
export type GallerySliderVariant = 'centered' | 'multiple' | 'fullwidth' | 'showcase'
export type MediaSliderVariant = GallerySliderVariant // Para compatibilidad hacia atrás

interface GallerySliderProps {
    imagenes: string[]
    variant?: GallerySliderVariant
    autoplay?: boolean | number
    perView?: number
    gap?: number
    animationDuration?: number
    className?: string
    alt?: string
    rounded?: boolean // Prop estandarizado para redondeado (mantiene compatibilidad con imagenBordeRedondeado)
    imagenBordeRedondeado?: boolean // Deprecated: usar 'rounded' en su lugar
    margenEntreFotos?: number
    // Configuración responsive
    breakpoints?: {
        [key: number]: {
            perView?: number
            gap?: number
        }
    }
}

// Para compatibilidad hacia atrás
interface MediaSliderProps extends GallerySliderProps { }

export default function GallerySlider({
    imagenes,
    variant = 'multiple',
    autoplay = 3000,
    perView = 3.5,
    gap = 0,
    animationDuration = 700,
    className = '',
    alt = 'Imagen',
    rounded,
    imagenBordeRedondeado = true, // Valor por defecto para retrocompatibilidad
    margenEntreFotos = 0,
    breakpoints = {
        1024: { perView: 4 },
        640: { perView: 1.3 }
    }
}: GallerySliderProps) {
    const sliderRef = useRef<HTMLDivElement>(null)
    const glideRef = useRef<Glide | null>(null)

    // Determinar si aplicar redondeado (prioridad a 'rounded', fallback a 'imagenBordeRedondeado')
    const shouldRound = rounded !== undefined ? rounded : imagenBordeRedondeado

    // Configuraciones predefinidas por variante
    const getVariantConfig = (): any => {
        switch (variant) {
            case 'centered':
                return {
                    type: 'carousel' as const,
                    focusAt: 'center' as const,
                    perView: 1,
                    autoplay: autoplay,
                    animationDuration,
                    gap: 20,
                    breakpoints: {
                        768: { perView: 1 }
                    }
                }
            case 'fullwidth':
                return {
                    type: 'carousel' as const,
                    focusAt: 'center' as const,
                    perView: 1,
                    autoplay: autoplay,
                    animationDuration,
                    gap: 0,
                    breakpoints: {
                        768: { perView: 1 }
                    }
                }
            case 'showcase':
                return {
                    type: 'carousel' as const,
                    focusAt: 'center' as const,
                    perView: 3.5,
                    autoplay: autoplay,
                    animationDuration,
                    gap: 16,
                    breakpoints: {
                        1024: { perView: 4, gap: 20 },
                        768: { perView: 2.5, gap: 16 },
                        640: { perView: 1.3, gap: 12 }
                    }
                }
            case 'multiple':
            default:
                return {
                    type: 'carousel' as const,
                    focusAt: 'center' as const,
                    perView,
                    autoplay: autoplay,
                    animationDuration,
                    gap,
                    breakpoints
                }
        }
    }

    useEffect(() => {
        if (!sliderRef.current || !imagenes.length) return

        const config = getVariantConfig()

        glideRef.current = new Glide(sliderRef.current, {
            ...config,
            classes: {
                activeNav: '[&>*]:bg-slate-200',
            },
        })

        glideRef.current.mount()

        return () => {
            if (glideRef.current) {
                glideRef.current.destroy()
                glideRef.current = null
            }
        }
    }, [imagenes, variant, autoplay, perView, gap, animationDuration, imagenBordeRedondeado, margenEntreFotos])

    if (!imagenes.length) {
        return (
            <div className="w-full h-64 bg-zinc-800 rounded-lg flex items-center justify-center">
                <p className="text-zinc-400">No hay imágenes disponibles</p>
            </div>
        )
    }

    return (
        <div
            ref={sliderRef}
            className={`glide relative w-full h-fit ${className}`}
        >
            <div className="overflow-hidden" data-glide-el="track">
                <ul className="whitespace-no-wrap flex-no-wrap [backface-visibility: hidden] [transform-style: preserve-3d] [touch-action: pan-Y] [will-change: transform] relative flex w-full overflow-hidden p-0">
                    {imagenes.map((imagen, index) => (
                        <li
                            key={index}
                            className={variant === 'showcase' ? "glide__slide" : "flex-shrink-0"}
                            style={{
                                marginRight: index < imagenes.length - 1 ? `${margenEntreFotos}px` : '0px'
                            }}
                        >
                            <div className={`relative overflow-hidden ${shouldRound ? (variant === 'showcase' ? 'rounded-xl' : 'rounded-lg') : ''} ${variant === 'showcase' ? 'aspect-square' : ''}`}>
                                {variant === 'showcase' ? (
                                    <Image
                                        src={imagen}
                                        alt={`${alt} ${index + 1}`}
                                        fill
                                        className="object-cover w-full h-full transition-transform duration-300 hover:scale-105"
                                        unoptimized={true}
                                        sizes="(max-width: 640px) 80vw, (max-width: 1024px) 25vw, 20vw"
                                    />
                                ) : (
                                    <Image
                                        src={imagen}
                                        alt={`${alt} ${index + 1}`}
                                        width={500}
                                        height={500}
                                        className="m-auto max-h-full w-full max-w-full object-cover transition-transform duration-300 hover:scale-105"
                                        unoptimized={true}
                                    />
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Navigation bullets para variant centered */}
            {variant === 'centered' && imagenes.length > 1 && (
                <div className="glide__bullets flex justify-center gap-2 mt-4" data-glide-el="controls[nav]">
                    {imagenes.map((_, index) => (
                        <button
                            key={index}
                            className="w-3 h-3 rounded-full bg-zinc-600 hover:bg-zinc-400 transition-colors"
                            data-glide-dir={`=${index}`}
                        />
                    ))}
                </div>
            )}

            {/* Navigation arrows para variant fullwidth */}
            {variant === 'fullwidth' && imagenes.length > 1 && (
                <div className="glide__arrows absolute inset-y-0 left-0 right-0 flex items-center justify-between pointer-events-none" data-glide-el="controls">
                    <button
                        className="glide__arrow glide__arrow--left pointer-events-auto bg-black/50 text-white p-2 rounded-full ml-4 hover:bg-black/70 transition-colors"
                        data-glide-dir="<"
                    >
                        ←
                    </button>
                    <button
                        className="glide__arrow glide__arrow--right pointer-events-auto bg-black/50 text-white p-2 rounded-full mr-4 hover:bg-black/70 transition-colors"
                        data-glide-dir=">"
                    >
                        →
                    </button>
                </div>
            )}
        </div>
    )
}

// Export como MediaSlider para compatibilidad hacia atrás
export { GallerySlider as MediaSlider }
