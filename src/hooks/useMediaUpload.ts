import { useState, useCallback, createElement } from 'react';
import { createClient } from '@supabase/supabase-js';
import { optimizeImage, analyzeVideo, validateFileSize, formatBytes } from '@/lib/utils/image-optimizer';
import { generateVideoThumbnail, optimizeVideoThumbnail } from '@/lib/utils/video-thumbnail';
import { deleteFileStorage } from '@/lib/actions/shared/media.actions';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface UploadedFile {
  id: string;
  url: string;
  fileName: string;
  size: number;
  isUploading?: boolean;
  originalSize?: number;
  compressionRatio?: number;
  thumbnailUrl?: string;
}

// Supabase client para uploads directo
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

const BUCKET_NAME = 'Studio';

/**
 * Genera la ruta del archivo en Supabase
 */
function generateSupabasePath(
  studioSlug: string,
  category: string,
  subcategory: string | undefined,
  filename: string
): string {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 8);

  let path = `studios/${studioSlug}/${category}`;

  if (subcategory) {
    path += `/${subcategory}`;
  }

  const cleanFilename = filename
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, '-')
    .replace(/-+/g, '-');

  const extension = cleanFilename.split('.').pop();
  const nameWithoutExt = cleanFilename.replace(`.${extension}`, '');

  path += `/${nameWithoutExt}-${timestamp}-${randomId}.${extension}`;

  return path;
}

export function useMediaUpload(onMediaSizeChange?: (bytes: number, operation: 'add' | 'remove') => void) {
  const [isUploading, setIsUploading] = useState(false);

  const uploadFiles = useCallback(
    async (files: File[], studioSlug: string, category: string, subcategory?: string): Promise<UploadedFile[]> => {
      if (!supabase) {
        toast.error("Cliente Supabase no configurado");
        return [];
      }

      setIsUploading(true);
      const uploadedFiles: UploadedFile[] = [];
      const totalFiles = files.length;
      const batchToastId = `upload-batch-${Date.now()}`;
      let uploadedCount = 0;

      // Toast inicial con estilo success y spinner verde
      toast.success(`Subiendo 0 de ${totalFiles} archivo${totalFiles > 1 ? 's' : ''}...`, {
        id: batchToastId,
        icon: createElement(Loader2, { className: "h-4 w-4 animate-spin text-emerald-500" }),
        duration: Infinity // No auto-dismiss mientras sube
      });

      try {
        for (const file of files) {
          try {
            // Validar tamaño
            const validation = validateFileSize(file);
            if (!validation.valid) {
              toast.error(validation.error || `${file.name}: Tamaño no válido`);
              continue;
            }

            let fileToUpload = file;
            let originalSize = file.size;
            let compressionRatio = 0;
            let thumbnailUrl: string | undefined;

            // Optimizar si es imagen
            if (file.type.startsWith('image/')) {
              try {
                const optimized = await optimizeImage(file);
                fileToUpload = optimized.optimizedFile;
                originalSize = optimized.originalSize;
                compressionRatio = optimized.compressionRatio;
              } catch (error) {
                console.warn(`No se pudo optimizar ${file.name}, usando original:`, error);
              }
            } else if (file.type.startsWith('video/')) {
              await analyzeVideo(file);

              // Generar thumbnail del video
              try {
                const thumbnail = await generateVideoThumbnail(file);
                const optimizedThumbnail = await optimizeVideoThumbnail(thumbnail);

                // Subir thumbnail
                const thumbPath = generateSupabasePath(
                  studioSlug,
                  category,
                  subcategory ? `${subcategory}/thumbnails` : 'thumbnails',
                  thumbnail.name
                );

                const { data: thumbData, error: thumbError } = await supabase.storage
                  .from(BUCKET_NAME)
                  .upload(thumbPath, optimizedThumbnail, {
                    cacheControl: '3600',
                    upsert: true,
                    contentType: 'image/jpeg',
                  });

                if (!thumbError && thumbData?.path) {
                  const { data: { publicUrl: thumbPublicUrl } } = supabase.storage
                    .from(BUCKET_NAME)
                    .getPublicUrl(thumbData.path);

                  thumbnailUrl = `${thumbPublicUrl}?t=${Date.now()}`;
                } else {
                  console.warn('No se pudo subir thumbnail:', thumbError);
                }
              } catch (error) {
                console.warn(`No se pudo generar thumbnail para ${file.name}:`, error);
              }
            }

            // Generar ruta
            const filePath = generateSupabasePath(studioSlug, category, subcategory, file.name);

            // Subir directamente a Supabase desde cliente
            const { data, error: uploadError } = await supabase.storage
              .from(BUCKET_NAME)
              .upload(filePath, fileToUpload, {
                cacheControl: '3600',
                upsert: true,
                contentType: fileToUpload.type,
              });

            if (uploadError) {
              console.error(`Error subiendo ${file.name}:`, uploadError);
              const errorMsg = uploadError.message || 'Error desconocido';

              // Detectar errores RLS
              if (errorMsg.includes('row level security') || errorMsg.includes('policy')) {
                toast.error(`Permiso denegado: No tienes permisos para subir archivos. ${errorMsg}`);
              } else {
                toast.error(`Error subiendo ${file.name}: ${errorMsg}`);
              }
              continue;
            }

            if (!data?.path) {
              toast.error(`Error subiendo ${file.name}: No se obtuvo ruta`);
              continue;
            }

            // Obtener URL pública
            const { data: { publicUrl } } = supabase.storage
              .from(BUCKET_NAME)
              .getPublicUrl(data.path);

            if (!publicUrl) {
              toast.error(`Error obteniendo URL de ${file.name}`);
              continue;
            }

            const finalSize = fileToUpload.size;
            uploadedFiles.push({
              id: `${Date.now()}-${Math.random()}`,
              url: `${publicUrl}?t=${Date.now()}`,
              fileName: file.name,
              size: finalSize,
              originalSize: originalSize !== finalSize ? originalSize : undefined,
              compressionRatio: compressionRatio > 0 ? compressionRatio : undefined,
              thumbnailUrl,
            });

            // Notificar cambio de tamaño
            if (onMediaSizeChange) {
              onMediaSizeChange(finalSize, 'add');
            }

            // Actualizar contador y toast
            uploadedCount++;
            toast.success(`Subiendo ${uploadedCount} de ${totalFiles} archivo${totalFiles > 1 ? 's' : ''}...`, {
              id: batchToastId,
              icon: createElement(Loader2, { className: "h-4 w-4 animate-spin text-emerald-500" }),
              duration: Infinity
            });
          } catch (error) {
            console.error(`Error subiendo ${file.name}:`, error);
            // Continuar con los demás archivos sin mostrar error individual
          }
        }

        // Toast final - con icono de check y duración normal
        if (uploadedFiles.length > 0) {
          toast.success(
            `${uploadedFiles.length} archivo${uploadedFiles.length > 1 ? 's subidos' : ' subido'} correctamente`,
            {
              id: batchToastId,
              duration: 4000 // Auto-dismiss después de 4s
            }
          );
        } else {
          toast.error('No se pudo subir ningún archivo', { id: batchToastId });
        }

        return uploadedFiles;
      } catch (error) {
        console.error('Error en uploadFiles:', error);
        toast.error('Error al subir archivos', { id: batchToastId });
        return [];
      } finally {
        setIsUploading(false);
      }
    },
    [onMediaSizeChange]
  );

  const deleteFile = useCallback(
    async (publicUrl: string, studioSlug: string, fileSize?: number): Promise<boolean> => {
      try {
        const result = await deleteFileStorage({
          publicUrl,
          studioSlug
        });

        if (result.success) {
          // Notificar cambio de tamaño
          if (onMediaSizeChange && fileSize) {
            onMediaSizeChange(fileSize, 'remove');
          }

          toast.success('Archivo eliminado correctamente');
          return true;
        } else {
          toast.error(`Error eliminando archivo: ${result.error}`);
          return false;
        }
      } catch (error) {
        toast.error('Error eliminando archivo');
        console.error(error);
        return false;
      }
    },
    [onMediaSizeChange]
  );

  return {
    uploadFiles,
    deleteFile,
    isUploading
  };
}
