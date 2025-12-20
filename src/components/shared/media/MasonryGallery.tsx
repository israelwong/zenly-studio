'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Trash2, Play } from 'lucide-react';
import { MasonryPhotoAlbum, RenderImageProps, RenderImageContext } from "react-photo-album";
import Lightbox from "yet-another-react-lightbox";
import Video from "yet-another-react-lightbox/plugins/video";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
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
    onDelete?: (mediaId: string) => void;
    showDeleteButtons?: boolean;
    borderStyle?: 'normal' | 'rounded';
}

// Componente para mostrar thumbnail de video
function VideoThumbnail({ videoUrl, thumbnailUrl, alt, limitHeight = false, isPreview = false }: { videoUrl: string; thumbnailUrl?: string; alt: string; limitHeight?: boolean; isPreview?: boolean }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [thumbnailDataUrl, setThumbnailDataUrl] = useState<string | null>(null);
    const [hasThumbnail, setHasThumbnail] = useState(!!thumbnailUrl);

    useEffect(() => {
        // Si hay thumbnail_url, usarlo directamente
        if (thumbnailUrl) {
            setHasThumbnail(true);
            return;
        }

        // Si no hay thumbnail, intentar capturar el primer frame
        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (!video || !canvas) return;

        const captureFrame = () => {
            try {
                video.currentTime = 0.1; // Ir al primer frame
                const onSeeked = () => {
                    const ctx = canvas.getContext('2d');
                    if (ctx && video.videoWidth > 0 && video.videoHeight > 0) {
                        canvas.width = video.videoWidth;
                        canvas.height = video.videoHeight;
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                        setThumbnailDataUrl(dataUrl);
                        setHasThumbnail(true);
                    }
                };
                video.addEventListener('seeked', onSeeked, { once: true });
            } catch (error) {
                console.error('Error capturing video frame:', error);
            }
        };

        video.addEventListener('loadedmetadata', captureFrame, { once: true });
        video.load(); // Forzar carga del video

        return () => {
            video.removeEventListener('loadedmetadata', captureFrame);
        };
    }, [videoUrl, thumbnailUrl]);

    return (
        <>
            {/* Video oculto para capturar frame */}
            <video
                ref={videoRef}
                src={videoUrl}
                className="hidden"
                preload="metadata"
                muted
                crossOrigin="anonymous"
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Mostrar thumbnail si existe o fue capturado */}
            {hasThumbnail ? (
                <div className={isPreview ? "relative w-full" : "absolute inset-0"}>
                    {thumbnailUrl ? (
                        isPreview ? (
                            <img
                                src={thumbnailUrl}
                                alt={alt}
                                className="object-contain w-full h-auto"
                            />
                        ) : (
                            <Image
                                src={thumbnailUrl}
                                alt={alt}
                                fill
                                className="object-contain"
                                sizes="(max-width: 768px) 100vw, 50vw"
                                unoptimized
                            />
                        )
                    ) : thumbnailDataUrl ? (
                        isPreview ? (
                            <img
                                src={thumbnailDataUrl}
                                alt={alt}
                                className="object-contain w-full h-auto"
                            />
                        ) : (
                            <Image
                                src={thumbnailDataUrl}
                                alt={alt}
                                fill
                                className="object-contain"
                                sizes="(max-width: 768px) 100vw, 50vw"
                                unoptimized
                            />
                        )
                    ) : null}
                    {/* Indicador de video */}
                    <div className={isPreview ? "absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none" : "absolute inset-0 flex items-center justify-center bg-black/20"}>
                        <div className="bg-black/60 rounded-full p-2">
                            <Play className="w-6 h-6 text-white fill-white" />
                        </div>
                    </div>
                </div>
            ) : (
                // Fallback: mostrar fondo con indicador mientras carga
                <div className={isPreview ? "relative w-full h-32 bg-zinc-900 flex items-center justify-center" : "absolute inset-0 bg-zinc-900 flex items-center justify-center"}>
                    <div className="bg-black/60 rounded-full p-2">
                        <Play className="w-6 h-6 text-white fill-white" />
                    </div>
                </div>
            )}
        </>
    );
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
    // Si es video, usar dimensiones por defecto o poster
    if (mediaItem.file_type === 'video') {
        // Intentar usar dimensiones del poster si existe
        if (mediaItem.thumbnail_url) {
            try {
                const dimensions = await getImageDimensions(mediaItem.thumbnail_url);
                return {
                    src: mediaItem.thumbnail_url || mediaItem.file_url,
                    width: dimensions.width,
                    height: dimensions.height,
                    alt: mediaItem.filename || `Video ${index + 1}`
                };
            } catch {
                // Si falla, usar dimensiones por defecto para video
                return {
                    src: mediaItem.thumbnail_url || mediaItem.file_url,
                    width: 1920,
                    height: 1080,
                    alt: mediaItem.filename || `Video ${index + 1}`
                };
            }
        }
        // Si no hay poster, usar dimensiones por defecto
        return {
            src: mediaItem.file_url,
            width: 1920,
            height: 1080,
            alt: mediaItem.filename || `Video ${index + 1}`
        };
    }

    // Para imágenes, obtener dimensiones reales
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
    showSizeLabel = false,
    onDelete,
    showDeleteButtons = false,
    borderStyle = 'rounded'
}: MasonryGalleryProps) {
    // Estado para el lightbox
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    // Estado para las fotos con dimensiones reales
    const [photos, setPhotos] = useState<MasonryPhoto[]>([]);
    const [loading, setLoading] = useState(true);

    // Detectar si hay múltiples videos para limitar altura
    const hasMultipleVideos = media.length > 1 && media.some(item => item.file_type === 'video');

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
    const lightboxSlides = media.map((mediaItem, index) => {
        const photo = photos[index];
        if (!photo) return null;

        if (mediaItem.file_type === 'video') {
            return {
                type: 'video' as const,
                sources: [{
                    src: mediaItem.file_url,
                    type: 'video/mp4'
                }],
                poster: mediaItem.thumbnail_url || mediaItem.file_url,
                autoPlay: true,
                muted: false,
                controls: true,
                playsInline: true
            };
        }

        return {
            src: photo.src,
            alt: photo.alt || 'Imagen de galería',
            width: photo.width,
            height: photo.height
        };
    }).filter((slide): slide is Exclude<typeof slide, null> => slide !== null);

    // Función para manejar el click en una imagen
    const handleImageClick = (index: number) => {
        if (enableLightbox) {
            setLightboxIndex(index);
            setLightboxOpen(true);
        }
    };

    // Render personalizado para las imágenes y videos
    const renderNextJSImage = ({ alt, title, sizes }: RenderImageProps, { photo, width, height }: RenderImageContext) => {
        const imageIndex = photos.findIndex(p => p.src === photo.src);
        const mediaItem = media[imageIndex];

        if (!mediaItem) return null;

        const isVideo = mediaItem.file_type === 'video';

        return (
            <div
                key={photo.src}
                style={{
                    width: "100%",
                    position: "relative",
                    ...(showDeleteButtons ? { aspectRatio: `${width} / ${height}` } : { aspectRatio: 'auto', height: 'auto' }),
                    ...(isVideo && hasMultipleVideos && showDeleteButtons ? { maxHeight: '400px' } : {})
                }}
                className={`overflow-hidden ${borderStyle === 'rounded' ? 'rounded-lg' : 'rounded-none'} ${showDeleteButtons ? 'bg-zinc-800' : ''} hover:shadow-xl transition-all duration-300 cursor-pointer group`}
                onClick={() => handleImageClick(imageIndex)}
            >
                {isVideo ? (
                    <VideoThumbnail
                        videoUrl={mediaItem.file_url}
                        thumbnailUrl={mediaItem.thumbnail_url}
                        alt={alt || mediaItem.filename || 'Video de galería'}
                        limitHeight={hasMultipleVideos && showDeleteButtons}
                        isPreview={!showDeleteButtons}
                    />
                ) : showDeleteButtons ? (
                    <Image
                        fill
                        src={photo.src}
                        alt={alt || photo.alt || 'Imagen de galería'}
                        title={title}
                        sizes={sizes}
                        className="object-cover hover:scale-105 transition-transform duration-300"
                        priority={imageIndex < 6}
                    />
                ) : (
                    <img
                        src={photo.src}
                        alt={alt || photo.alt || 'Imagen de galería'}
                        className="w-full h-auto object-contain"
                        style={{ aspectRatio: 'auto' }}
                    />
                )}

                {/* Storage Size Label */}
                {showSizeLabel && mediaItem?.storage_bytes && (
                    <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        {Math.round(mediaItem.storage_bytes / 1024)}KB
                    </div>
                )}

                {/* Delete Button - Dentro de la imagen */}
                {showDeleteButtons && onDelete && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(mediaItem.id);
                        }}
                        className="absolute bottom-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 z-20"
                        title={`Eliminar ${isVideo ? 'video' : 'imagen'}`}
                        style={{ pointerEvents: 'auto' }}
                    >
                        <Trash2 className="h-3 w-3" />
                    </button>
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
        <div className={`w-full ${className}`} key={media.map(item => item.id).join('-')}>
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
                    plugins={[Video, Zoom]}
                    video={{
                        controls: true,
                        playsInline: true,
                        autoPlay: true,
                        muted: false,
                        loop: false
                    }}
                    on={{
                        view: ({ index }) => setLightboxIndex(index),
                    }}
                    controller={{
                        closeOnPullDown: true,
                        closeOnBackdropClick: true
                    }}
                />
            )}
        </div>
    );
}
