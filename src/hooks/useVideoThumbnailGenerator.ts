import { useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { generateVideoThumbnail, optimizeVideoThumbnail } from '@/lib/utils/video-thumbnail';
import { toast } from 'sonner';

// Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

const BUCKET_NAME = 'Studio';

interface MediaItem {
  id: string;
  file_url: string;
  file_type: 'image' | 'video';
  thumbnail_url?: string | null;
  filename: string;
}

/**
 * Hook para generar thumbnails de videos que no los tienen
 * Útil para posts existentes creados antes de la funcionalidad de thumbnails
 */
export function useVideoThumbnailGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);

  /**
   * Genera thumbnails para todos los videos sin thumbnail en un array de media
   */
  const generateMissingThumbnails = useCallback(
    async (mediaItems: MediaItem[], studioSlug: string): Promise<MediaItem[]> => {
      if (!supabase) {
        console.warn('Cliente Supabase no configurado');
        return mediaItems;
      }

      setIsGenerating(true);

      try {
        const updatedMedia = await Promise.all(
          mediaItems.map(async (item) => {
            // Si es video y no tiene thumbnail, generar uno
            if (item.file_type === 'video' && !item.thumbnail_url) {
              try {
                // Descargar video
                const videoResponse = await fetch(item.file_url);
                const videoBlob = await videoResponse.blob();
                const videoFile = new File([videoBlob], item.filename, {
                  type: 'video/mp4',
                });

                // Generar thumbnail
                const thumbnail = await generateVideoThumbnail(videoFile);
                const optimizedThumbnail = await optimizeVideoThumbnail(thumbnail);

                // Generar ruta para thumbnail
                const timestamp = Date.now();
                const randomId = Math.random().toString(36).substring(2, 8);
                const thumbPath = `studios/${studioSlug}/posts/content/thumbnails/thumb-${timestamp}-${randomId}.jpg`;

                // Subir thumbnail
                const { data: thumbData, error: thumbError } = await supabase.storage
                  .from(BUCKET_NAME)
                  .upload(thumbPath, optimizedThumbnail, {
                    cacheControl: '3600',
                    upsert: true,
                    contentType: 'image/jpeg',
                  });

                if (!thumbError && thumbData?.path) {
                  const {
                    data: { publicUrl: thumbPublicUrl },
                  } = supabase.storage.from(BUCKET_NAME).getPublicUrl(thumbData.path);

                  const thumbnailUrl = `${thumbPublicUrl}?t=${Date.now()}`;

                  return {
                    ...item,
                    thumbnail_url: thumbnailUrl,
                  };
                } else {
                  console.warn(`No se pudo subir thumbnail para ${item.filename}:`, thumbError);
                  return item;
                }
              } catch (error) {
                console.warn(`Error generando thumbnail para ${item.filename}:`, error);
                return item;
              }
            }

            // Si no es video o ya tiene thumbnail, retornar sin cambios
            return item;
          })
        );

        // Contar cuántos thumbnails se generaron
        const generatedCount = updatedMedia.filter(
          (item, index) =>
            item.file_type === 'video' &&
            item.thumbnail_url &&
            !mediaItems[index].thumbnail_url
        ).length;

        if (generatedCount > 0) {
          toast.success(`${generatedCount} thumbnail${generatedCount > 1 ? 's' : ''} generado${generatedCount > 1 ? 's' : ''}`);
        }

        return updatedMedia;
      } catch (error) {
        console.error('Error generando thumbnails:', error);
        toast.error('Error al generar thumbnails');
        return mediaItems;
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  /**
   * Genera thumbnail para un solo video
   */
  const generateSingleThumbnail = useCallback(
    async (
      videoUrl: string,
      filename: string,
      studioSlug: string
    ): Promise<string | null> => {
      if (!supabase) {
        console.warn('Cliente Supabase no configurado');
        return null;
      }

      try {
        // Descargar video
        const videoResponse = await fetch(videoUrl);
        const videoBlob = await videoResponse.blob();
        const videoFile = new File([videoBlob], filename, { type: 'video/mp4' });

        // Generar thumbnail
        const thumbnail = await generateVideoThumbnail(videoFile);
        const optimizedThumbnail = await optimizeVideoThumbnail(thumbnail);

        // Generar ruta para thumbnail
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 8);
        const thumbPath = `studios/${studioSlug}/posts/content/thumbnails/thumb-${timestamp}-${randomId}.jpg`;

        // Subir thumbnail
        const { data: thumbData, error: thumbError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(thumbPath, optimizedThumbnail, {
            cacheControl: '3600',
            upsert: true,
            contentType: 'image/jpeg',
          });

        if (!thumbError && thumbData?.path) {
          const {
            data: { publicUrl: thumbPublicUrl },
          } = supabase.storage.from(BUCKET_NAME).getPublicUrl(thumbData.path);

          return `${thumbPublicUrl}?t=${Date.now()}`;
        }

        return null;
      } catch (error) {
        console.error('Error generando thumbnail:', error);
        return null;
      }
    },
    []
  );

  return {
    generateMissingThumbnails,
    generateSingleThumbnail,
    isGenerating,
  };
}
