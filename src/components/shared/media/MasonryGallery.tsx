'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { MasonryPhotoAlbum, RenderImageProps, RenderImageContext } from "react-photo-album";
import Lightbox from "yet-another-react-lightbox";
import "react-photo-album/masonry.css";
import "yet-another-react-lightbox/styles.css";
import { MediaItem } from '@/types/content-blocks';

interface MasonryPhoto {
    src: string;
    width: number;
    height: number;
    alt?: string;
}

interface MasonryGalleryProps {
    media: MediaItem[];
    columns?: number;
    spacing?: number;
    className?: string;
    enableLightbox?: boolean;
    showSizeLabel?: boolean;
}

// Función para obtener las dimensiones reales de una imagen
const getImageDimensions = (src: string): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
        const img = new window.Image();
        img.onload = () => {
            resolve({ width: img.naturalWidth, height: img.naturalHeight });
        };
        img.onerror = () => {
            // Si falla, usar dimensiones por defecto
            resolve({ width: 800, height: 600 });
        };
        img.src = src;
    });
};

// Función auxiliar para crear el objeto photo necesario para react-photo-album
const createMasonryPhoto = async (
    mediaItem: MediaItem,
    index: number
): Promise<MasonryPhoto> => {
    // Obtener dimensiones reales de la imagen
    const dimensions = await getImageDimensions(mediaItem.file_url);

    return {
        src: mediaItem.file_url,
        width: dimensions.width,
        height: dimensions.height,
        alt: mediaItem.filename || `Imagen ${index + 1}`
    };
};

export function MasonryGallery({
    media,
    columns = 3,
    spacing = 4,
    className = '',
    enableLightbox = true,
    showSizeLabel = false
}: MasonryGalleryProps) {
    // Estado para el lightbox
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    // Estado para las fotos con dimensiones reales
    const [photos, setPhotos] = useState<MasonryPhoto[]>([]);
    const [loading, setLoading] = useState(true);

    // Cargar las dimensiones reales de las imágenes
    useEffect(() => {
        const loadPhotos = async () => {
            setLoading(true);
            try {
                const photosWithDimensions = await Promise.all(
                    media.map((mediaItem, index) =>
                        createMasonryPhoto(mediaItem, index)
                    )
                );
                setPhotos(photosWithDimensions);
            } catch (error) {
                console.error('Error loading image dimensions:', error);
                // Fallback con dimensiones por defecto
                const fallbackPhotos = media.map((mediaItem, index) => ({
                    src: mediaItem.file_url,
                    width: 800,
                    height: 600,
                    alt: mediaItem.filename || `Imagen ${index + 1}`
                }));
                setPhotos(fallbackPhotos);
            } finally {
                setLoading(false);
            }
        };

        if (media.length > 0) {
            loadPhotos();
        } else {
            setLoading(false);
        }
    }, [media]);

    // Preparar slides para el lightbox
    const lightboxSlides = photos.map(photo => ({
        src: photo.src,
        alt: photo.alt || 'Imagen de galería'
    }));

    // Función para manejar el click en una imagen
    const handleImageClick = (index: number) => {
        if (enableLightbox) {
            setLightboxIndex(index);
            setLightboxOpen(true);
        }
    };

    // Render personalizado para las imágenes
    const renderNextJSImage = ({ alt, title, sizes }: RenderImageProps, { photo, width, height }: RenderImageContext) => {
        const imageIndex = photos.findIndex(p => p.src === photo.src);
        const mediaItem = media[imageIndex];

        return (
            <div
                key={photo.src}
                style={{
                    width: "100%",
                    position: "relative",
                    aspectRatio: `${width} / ${height}`,
                }}
                className="overflow-hidden rounded-lg bg-zinc-800 hover:shadow-xl transition-all duration-300 cursor-pointer group"
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

                {/* Storage Size Label */}
                {showSizeLabel && mediaItem?.storage_bytes && (
                    <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        {Math.round(mediaItem.storage_bytes / 1024)}KB
                    </div>
                )}
            </div>
        );
    };

    // Estado de loading
    if (loading) {
        return (
            <div className={`${className} flex items-center justify-center py-12`}>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                <p className="ml-4 text-zinc-300">Cargando galería...</p>
            </div>
        );
    }

    // Validación temprana
    if (!photos.length) {
        return (
            <div className={`${className} p-8 bg-zinc-800 rounded-lg border border-zinc-700 text-center`}>
                <p className="text-zinc-500">No hay imágenes disponibles para mostrar</p>
            </div>
        );
    }

    return (
        <div className={`w-full ${className}`}>
            {/* Masonry Layout con react-photo-album */}
            <MasonryPhotoAlbum
                photos={photos}
                columns={columns}
                spacing={spacing}
                render={{
                    image: renderNextJSImage
                }}
            />

            {/* Lightbox */}
            {enableLightbox && (
                <Lightbox
                    open={lightboxOpen}
                    close={() => setLightboxOpen(false)}
                    index={lightboxIndex}
                    slides={lightboxSlides}
                    on={{
                        view: ({ index }) => setLightboxIndex(index),
                    }}
                />
            )}
        </div>
    );
}
