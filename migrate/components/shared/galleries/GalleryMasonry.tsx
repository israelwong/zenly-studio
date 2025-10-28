'use client'
import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { MasonryPhotoAlbum, RenderImageProps, RenderImageContext } from "react-photo-album"
import Lightbox from "yet-another-react-lightbox"
import "react-photo-album/masonry.css"
import "yet-another-react-lightbox/styles.css"

// Tipo para las imágenes del masonry
interface MasonryPhoto {
    src: string
    width: number
    height: number
    alt?: string
}

interface GalleryMasonryProps {
    imagenes: string[] | MasonryPhoto[]
    columns?: number
    spacing?: number
    className?: string
    alt?: string
    // Props para container-agnostic behavior
    noPadding?: boolean
    lightPadding?: boolean
    // Props para header (opcional)
    titulo?: string
    descripcion?: string
    emoji?: string
    // Props para lightbox
    enableLightbox?: boolean
    lightboxClassName?: string
    // Props para control de ancho simplificado
    fullWidth?: boolean // Si true, ocupa todo el ancho disponible. Si false/undefined, usa max-w-4xl centrado
    // Props para control de estilo
    rounded?: boolean // Si true, aplica rounded-lg. Si false/undefined, no aplica redondeado
}

// Función para obtener las dimensiones reales de una imagen
const getImageDimensions = (src: string): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
        const img = new window.Image()
        img.onload = () => {
            resolve({ width: img.naturalWidth, height: img.naturalHeight })
        }
        img.onerror = () => {
            // Si falla, usar dimensiones por defecto
            resolve({ width: 800, height: 600 })
        }
        img.src = src
    })
}

// Función para obtener las clases de padding según los props
const getPaddingClasses = (noPadding?: boolean, lightPadding?: boolean): string => {
    if (noPadding) return ''
    if (lightPadding) return 'px-2 py-4'
    return 'px-4 py-8'
}

// Función para obtener las clases del container según los props
const getContainerClasses = (
    noPadding?: boolean,
    lightPadding?: boolean,
    fullWidth?: boolean
): string => {
    const baseClasses = []

    // Control de padding
    if (noPadding) {
        baseClasses.push('p-0')
    } else if (lightPadding) {
        baseClasses.push('px-2 py-4')
    } else {
        baseClasses.push('px-4 py-8')
    }

    // Control de ancho simplificado
    if (fullWidth) {
        baseClasses.push('w-full')
    } else {
        baseClasses.push('max-w-7xl mx-auto')
    }

    return baseClasses.join(' ')
}

// Función auxiliar para crear el objeto photo necesario para react-photo-album
const createMasonryPhoto = async (
    imagen: string | MasonryPhoto,
    index: number,
    altText: string
): Promise<MasonryPhoto> => {
    if (typeof imagen === 'string') {
        // Obtener dimensiones reales de la imagen
        const dimensions = await getImageDimensions(imagen)

        return {
            src: imagen,
            width: dimensions.width,
            height: dimensions.height,
            alt: `${altText} ${index + 1}`
        }
    }

    return {
        ...imagen,
        alt: imagen.alt || `${altText} ${index + 1}`
    }
}

export default function GalleryMasonry({
    imagenes,
    columns = 3,
    spacing = 4,
    className = '',
    alt = 'Imagen de galería',
    noPadding = false,
    lightPadding = false,
    titulo,
    descripcion,
    emoji,
    enableLightbox = false,
    lightboxClassName = '',
    fullWidth = false,
    rounded = true
}: GalleryMasonryProps) {
    // Estado para el lightbox
    const [lightboxOpen, setLightboxOpen] = useState(false)
    const [lightboxIndex, setLightboxIndex] = useState(0)
    // Estado para las fotos con dimensiones reales
    const [photos, setPhotos] = useState<MasonryPhoto[]>([])
    const [loading, setLoading] = useState(true)

    // Cargar las dimensiones reales de las imágenes
    useEffect(() => {
        const loadPhotos = async () => {
            setLoading(true)
            try {
                const photosWithDimensions = await Promise.all(
                    imagenes.map((imagen, index) =>
                        createMasonryPhoto(imagen, index, alt)
                    )
                )
                setPhotos(photosWithDimensions)
            } catch (error) {
                console.error('Error loading image dimensions:', error)
                // Fallback con dimensiones por defecto
                const fallbackPhotos = imagenes.map((imagen, index) => {
                    if (typeof imagen === 'string') {
                        return {
                            src: imagen,
                            width: 800,
                            height: 600,
                            alt: `${alt} ${index + 1}`
                        }
                    }
                    return imagen
                })
                setPhotos(fallbackPhotos)
            } finally {
                setLoading(false)
            }
        }

        loadPhotos()
    }, [imagenes, alt])

    // Preparar slides para el lightbox con dimensiones optimizadas
    const lightboxSlides = photos.map(photo => ({
        src: photo.src,
        alt: photo.alt || alt,
        width: Math.max(photo.width, 1200), // Asegurar un mínimo de ancho
        height: Math.max(photo.height, 800)  // Asegurar un mínimo de alto
    }))

    // Función para manejar el click en una imagen (si el lightbox está habilitado)
    const handleImageClick = (index: number) => {
        if (enableLightbox) {
            setLightboxIndex(index)
            setLightboxOpen(true)
        }
    }

    // Render personalizado para las imágenes
    const renderNextJSImage = ({ alt, title, sizes }: RenderImageProps, { photo, width, height }: RenderImageContext) => {
        const imageIndex = photos.findIndex(p => p.src === photo.src)

        return (
            <div
                key={photo.src}
                style={{
                    width: "100%",
                    position: "relative",
                    aspectRatio: `${width} / ${height}`,
                }}
                className={`overflow-hidden ${rounded ? 'rounded-lg' : ''} bg-zinc-800 hover:shadow-xl transition-all duration-300 ${enableLightbox ? 'cursor-pointer' : ''}`}
                onClick={() => handleImageClick(imageIndex)}
            >
                <Image
                    fill
                    src={photo.src}
                    alt={alt || photo.alt || 'Imagen de galería'}
                    title={title}
                    sizes={sizes}
                    className="object-cover hover:scale-105 transition-transform duration-300"
                    priority={imageIndex < 6} // Priorizar las primeras 6 imágenes
                />
            </div>
        )
    }

    // Clases de padding condicional
    const paddingClasses = getPaddingClasses(noPadding, lightPadding)

    // Estado de loading
    if (loading) {
        return (
            <section className={`${paddingClasses} ${className}`}>
                <div className={getContainerClasses(noPadding, lightPadding, fullWidth)}>
                    {/* Header opcional */}
                    {(titulo || descripcion || emoji) && (
                        <div className="text-center mb-8">
                            {(titulo || emoji) && (
                                <div className="flex items-center justify-center gap-3 mb-4">
                                    {emoji && <span className="text-3xl">{emoji}</span>}
                                    {titulo && (
                                        <h2 className="text-2xl md:text-3xl font-bold text-white">
                                            {titulo}
                                        </h2>
                                    )}
                                </div>
                            )}
                            {descripcion && (
                                <p className="text-zinc-300 text-lg max-w-3xl mx-auto leading-relaxed">
                                    {descripcion}
                                </p>
                            )}
                        </div>
                    )}

                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                        <p className="ml-4 text-zinc-300">Cargando dimensiones de imágenes...</p>
                    </div>
                </div>
            </section>
        )
    }

    // Validación temprana
    if (!photos.length) {
        const errorPadding = getPaddingClasses()
        const errorContainer = getContainerClasses(noPadding, lightPadding, fullWidth)

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

    return (
        <section className={`${paddingClasses} ${className}`}>
            <div className={getContainerClasses(noPadding, lightPadding, fullWidth)}>
                {/* Header opcional */}
                {(titulo || descripcion || emoji) && (
                    <div className="text-center mb-8">
                        {(titulo || emoji) && (
                            <div className="flex items-center justify-center gap-3 mb-4">
                                {emoji && <span className="text-3xl">{emoji}</span>}
                                {titulo && (
                                    <h2 className="text-2xl md:text-3xl font-bold text-white">
                                        {titulo}
                                    </h2>
                                )}
                            </div>
                        )}
                        {descripcion && (
                            <p className="text-zinc-300 text-lg max-w-3xl mx-auto leading-relaxed">
                                {descripcion}
                            </p>
                        )}
                    </div>
                )}

                {/* Masonry Layout con react-photo-album */}
                <div className="w-full">
                    <MasonryPhotoAlbum
                        photos={photos}
                        columns={columns}
                        spacing={spacing}
                        render={{
                            image: renderNextJSImage
                        }}
                    />
                </div>

                {/* Lightbox */}
                {enableLightbox && (
                    <Lightbox
                        open={lightboxOpen}
                        close={() => setLightboxOpen(false)}
                        index={lightboxIndex}
                        slides={lightboxSlides}
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
                                padding: "20px",
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
            </div>
        </section>
    )
}
