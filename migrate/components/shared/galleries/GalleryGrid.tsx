'use client'
import React, { useState } from 'react'
import Image from 'next/image'
import Lightbox from "yet-another-react-lightbox"
import "yet-another-react-lightbox/styles.css"
import GallerySlider from './GallerySlider'

/**
 * Componente GalleryGrid - Completamente reusable y container-agnóstico
 * 
 * Galería de imágenes sin contenido hardcodeado, todo viene por props
 * 
 * Características:
 * - 100% dependiente de props - sin contenido predefinido
 * - Sin diferenciación entre tipos de evento
 * - Múltiples variantes: grid, slider, carousel, masonry, fullwidth, etc.
 * - Configuración flexible de columnas y espaciado
 * - Títulos, descripciones y emojis completamente opcionales
 * - CTA opcional con acción configurable
 * - Container-agnóstico: control de padding interno
 * - Layout masonry con alturas variables (tipo Pinterest)
 * - Se adapta a cualquier contexto sin lógica específica
 * 
 * Ejemplo de uso:
 * <GalleryGrid
 *   imagenes={['img1.jpg', 'img2.jpg', 'img3.jpg']}
 *   titulo="Mi Galería"                    // Opcional
 *   descripcion="Descripción personalizada" // Opcional
 *   emoji="📸"                             // Opcional
 *   variant="masonry"                      // grid | masonry | slider | carousel | fullwidth
 *   columns={3}
 *   gap="md"
 *   noPadding={true}                       // Para uso dentro de containers
 * />
 * 
 * Layout Masonry (Pinterest-style):
 * <GalleryGrid imagenes={imagenes} variant="masonry" columns={3} />
 * 
 * Uso mínimo (solo imágenes):
 * <GalleryGrid imagenes={imagenes} noPadding={true} />
 * 
 * Control de padding:
 * - noPadding={true}: Sin padding interno (ideal para containers)
 * - lightPadding={true}: Padding ligero (4px)
 * - Por defecto: Padding moderado según variante
 */

// Tipos más flexibles para diferentes contextos
export type GalleryVariant = 'default' | 'compact' | 'landing' | 'grid' | 'masonry' | 'slider' | 'fullwidth' | 'carousel'

interface GalleryGridProps {
    imagenes: string[] // Requerido - las imágenes que se van a mostrar
    variant?: GalleryVariant
    titulo?: string
    descripcion?: string
    showCTA?: boolean
    ctaText?: string
    ctaAction?: () => void
    className?: string
    columns?: 2 | 3 | 4 | 5 | 6 // Columnas configurables
    gap?: 'sm' | 'md' | 'lg' // Espaciado configurable
    // Props para personalización completa
    emoji?: string
    gradiente?: string
    altText?: string
    // Props para container-agnostic behavior
    noPadding?: boolean // Si true, elimina padding interno
    lightPadding?: boolean // Si true, usa padding ligero
    // Props para lightbox
    enableLightbox?: boolean // Si true, habilita lightbox al hacer click
    lightboxClassName?: string // Clases CSS personalizadas para el lightbox
}

export default function GalleryGrid({
    imagenes, // Ahora requerido
    variant = 'grid',
    titulo,
    descripcion,
    showCTA = false,
    ctaText = 'Ver más trabajos',
    ctaAction,
    className = "",
    columns = 3,
    gap = 'md',
    emoji,
    gradiente,
    altText,
    noPadding = false,
    lightPadding = false,
    enableLightbox = true,
    lightboxClassName = ''
}: GalleryGridProps) {

    // Estado del lightbox
    const [lightboxOpen, setLightboxOpen] = useState(false)
    const [lightboxIndex, setLightboxIndex] = useState(0)

    // Validación temprana - si no hay imágenes, mostrar mensaje
    if (!imagenes || imagenes.length === 0) {
        const errorPadding = noPadding ? '' : lightPadding ? 'py-4' : 'py-8';
        const errorContainer = noPadding ? 'w-full' : 'max-w-4xl mx-auto px-2 sm:px-4';

        return (
            <section className={`${errorPadding} bg-zinc-900 ${className}`}>
                <div className={errorContainer}>
                    <div className="bg-zinc-800 rounded-lg p-4 text-center">
                        <p className="text-zinc-400 text-lg">No hay imágenes disponibles para mostrar</p>
                    </div>
                </div>
            </section>
        )
    }

    const getContenidoPorTipo = () => {
        return {
            titulo: titulo || '', // Solo usa lo que se pasa por props
            descripcion: descripcion || '', // Solo usa lo que se pasa por props
            emoji: emoji || '', // Solo usa lo que se pasa por props
            gradiente: gradiente || 'from-purple-500/20 via-pink-500/20 to-purple-500/20' // Gradiente por defecto neutral
        }
    }

    const contenido = getContenidoPorTipo()

    // Configuración por variante
    const getVariantStyles = () => {
        // Control de padding basado en props
        const getPaddingStyle = () => {
            if (noPadding) return '';
            if (lightPadding) return 'py-4';

            // Padding por variante (más ligero por defecto)
            switch (variant) {
                case 'compact': return 'py-4';
                case 'landing': return 'py-12';
                case 'fullwidth': return 'py-8';
                default: return 'py-8';
            }
        };

        switch (variant) {
            case 'compact':
                return {
                    sectionPadding: getPaddingStyle(),
                    headerMargin: 'mb-4',
                    titleSize: 'text-xl sm:text-2xl',
                    descriptionSize: 'text-base',
                    showDescription: false,
                    containerClass: 'max-w-4xl mx-auto px-2 sm:px-4'
                }
            case 'masonry':
                return {
                    sectionPadding: getPaddingStyle(),
                    headerMargin: 'mb-8',
                    titleSize: 'text-2xl sm:text-3xl',
                    descriptionSize: 'text-lg',
                    showDescription: true,
                    containerClass: 'max-w-7xl mx-auto px-2 sm:px-4 lg:px-6'
                }
            case 'landing':
                return {
                    sectionPadding: getPaddingStyle(),
                    headerMargin: 'mb-12',
                    titleSize: 'text-3xl sm:text-5xl',
                    descriptionSize: 'text-xl',
                    showDescription: true,
                    containerClass: 'max-w-7xl mx-auto px-2 sm:px-4 lg:px-6'
                }
            case 'fullwidth':
                return {
                    sectionPadding: getPaddingStyle(),
                    headerMargin: 'mb-8',
                    titleSize: 'text-2xl sm:text-4xl',
                    descriptionSize: 'text-lg',
                    showDescription: true,
                    containerClass: noPadding ? 'w-full' : 'w-full px-2 sm:px-4' // Sin max-width para full width
                }
            default:
                return {
                    sectionPadding: getPaddingStyle(),
                    headerMargin: 'mb-8',
                    titleSize: 'text-2xl sm:text-4xl',
                    descriptionSize: 'text-lg',
                    showDescription: true,
                    containerClass: 'max-w-7xl mx-auto px-2 sm:px-4 lg:px-6'
                }
        }
    }

    // Configuración de columnas responsivas
    const getGridStyles = () => {
        const gapStyles = {
            sm: 'gap-2',
            md: 'gap-4',
            lg: 'gap-6'
        }

        const columnStyles = {
            2: 'grid-cols-1 sm:grid-cols-2',
            3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
            4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
            5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5',
            6: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6'
        }

        // Configuración específica para masonry
        if (variant === 'masonry') {
            return {
                gridClass: `columns-1 sm:columns-2 lg:columns-${columns} ${gapStyles[gap]} space-y-${gap === 'sm' ? '2' : gap === 'md' ? '4' : '6'}`,
                itemClass: 'break-inside-avoid mb-2 sm:mb-4 group relative overflow-hidden rounded-lg bg-zinc-800 transition-all duration-300 hover:scale-105 hover:shadow-xl'
            }
        }

        return {
            gridClass: `grid ${columnStyles[columns]} ${gapStyles[gap]}`,
            itemClass: 'group relative overflow-hidden rounded-lg aspect-square bg-zinc-800 transition-all duration-300 hover:scale-105 hover:shadow-xl'
        }
    }

    const variantStyles = getVariantStyles()
    const gridStyles = getGridStyles()

    return (
        <section className={`${variantStyles.sectionPadding} ${className}`}>
            <div className={variantStyles.containerClass}>
                {/* Header - Solo se muestra si hay contenido proporcionado */}
                {(contenido.titulo || contenido.descripcion || contenido.emoji) && (
                    <div className={`text-center ${variantStyles.headerMargin}`}>
                        {(contenido.titulo || contenido.emoji) && (
                            <div className="flex items-center justify-center gap-3 mb-4">
                                {contenido.emoji && <span className="text-3xl">{contenido.emoji}</span>}
                                {contenido.titulo && (
                                    <h2 className={`${variantStyles.titleSize} font-bold text-zinc-200`}>
                                        {contenido.titulo}
                                    </h2>
                                )}
                            </div>
                        )}

                        {variantStyles.showDescription && contenido.descripcion && (
                            <p className={`${variantStyles.descriptionSize} text-gray-600 max-w-2xl mx-auto leading-relaxed`}>
                                {contenido.descripcion}
                            </p>
                        )}
                    </div>
                )}

                {/* Renderizado condicional según variante */}
                <div className="relative">
                    {variant === 'slider' || variant === 'carousel' ? (
                        <GallerySlider
                            imagenes={imagenes}
                            variant="multiple"
                            autoplay={3000}
                            perView={3.5}
                            gap={0}
                            className="w-full"
                            alt={altText || contenido.titulo}
                            breakpoints={{
                                1024: { perView: 4 },
                                640: { perView: 1.3 }
                            }}
                        />
                    ) : variant === 'masonry' ? (
                        <div className={gridStyles.gridClass}>
                            {imagenes.map((imagen, index) => {
                                // Alturas variables para efecto masonry
                                const heights = ['h-48', 'h-64', 'h-56', 'h-72', 'h-60', 'h-80', 'h-52'];
                                const randomHeight = heights[index % heights.length];

                                const handleImageClick = () => {
                                    if (enableLightbox) {
                                        setLightboxIndex(index)
                                        setLightboxOpen(true)
                                    }
                                }

                                return (
                                    <div
                                        key={index}
                                        className={`${gridStyles.itemClass} ${randomHeight} ${enableLightbox ? 'cursor-pointer' : ''}`}
                                        onClick={handleImageClick}
                                    >
                                        <Image
                                            src={imagen}
                                            alt={altText ? `${altText} - Imagen ${index + 1}` : `${contenido.titulo} - Imagen ${index + 1}`}
                                            fill
                                            className="object-cover transition-transform duration-500 group-hover:scale-110"
                                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                        />
                                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                        {enableLightbox && (
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
                                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                                    </svg>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    ) : variant === 'grid' || variant === 'fullwidth' ? (
                        <div className={gridStyles.gridClass}>
                            {imagenes.map((imagen, index) => {
                                const handleImageClick = () => {
                                    if (enableLightbox) {
                                        setLightboxIndex(index)
                                        setLightboxOpen(true)
                                    }
                                }

                                return (
                                    <div
                                        key={index}
                                        className={`${gridStyles.itemClass} ${enableLightbox ? 'cursor-pointer' : ''}`}
                                        onClick={handleImageClick}
                                    >
                                        <Image
                                            src={imagen}
                                            alt={altText ? `${altText} - Imagen ${index + 1}` : `${contenido.titulo} - Imagen ${index + 1}`}
                                            fill
                                            className="object-cover transition-transform duration-500 group-hover:scale-110"
                                            sizes={
                                                variant === 'fullwidth'
                                                    ? "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                                                    : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                            }
                                        />
                                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                        {enableLightbox && (
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
                                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                                    </svg>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <GallerySlider
                            imagenes={imagenes}
                            variant="showcase"
                            className="w-full"
                            alt={titulo || 'Imagen de galería'}
                            imagenBordeRedondeado={true}
                            autoplay={4000}
                        />
                    )}
                </div>
            </div>

            {/* Lightbox */}
            {enableLightbox && (
                <Lightbox
                    open={lightboxOpen}
                    close={() => setLightboxOpen(false)}
                    index={lightboxIndex}
                    slides={imagenes.map((imagen, index) => ({
                        src: imagen,
                        alt: altText ? `${altText} - Imagen ${index + 1}` : `${titulo || 'Imagen'} - ${index + 1}`,
                        width: 1200,
                        height: 800
                    }))}
                    className={lightboxClassName}
                    carousel={{
                        finite: false,
                        preload: 2,
                        padding: 0,
                        spacing: 0
                    }}
                    animation={{
                        fade: 300,
                        swipe: 500
                    }}
                    controller={{
                        closeOnPullDown: true,
                        closeOnBackdropClick: true
                    }}
                    styles={{
                        container: {
                            backgroundColor: "rgba(0, 0, 0, .95)",
                            padding: 0
                        },
                        slide: {
                            padding: 0,
                            margin: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '100vw',
                            height: '100vh'
                        }
                    }}
                />
            )}
        </section>
    )
}
