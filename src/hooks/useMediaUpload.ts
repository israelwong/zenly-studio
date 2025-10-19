import { useState, useCallback } from 'react';
import { uploadFileStorage, deleteFileStorage } from '@/lib/actions/shared/media.actions';
import { optimizeImage, analyzeVideo, validateFileSize, formatBytes } from '@/lib/utils/image-optimizer';
import { toast } from 'sonner';

interface UploadedFile {
  id: string;
  url: string;
  fileName: string;
  size: number;
  isUploading?: boolean;
  originalSize?: number;
  compressionRatio?: number;
}

export function useMediaUpload() {
  const [isUploading, setIsUploading] = useState(false);

  const uploadFiles = useCallback(
    async (files: File[], studioSlug: string, category: string, subcategory?: string): Promise<UploadedFile[]> => {
      setIsUploading(true);
      const uploadedFiles: UploadedFile[] = [];

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

            // Optimizar si es imagen
            if (file.type.startsWith('image/')) {
              try {
                const optimized = await optimizeImage(file);
                fileToUpload = optimized.optimizedFile;
                originalSize = optimized.originalSize;
                compressionRatio = optimized.compressionRatio;

                toast.success(
                  `${file.name}: Comprimido ${compressionRatio}% (${formatBytes(optimized.optimizedSize)})`
                );
              } catch (error) {
                console.warn(`No se pudo optimizar ${file.name}, usando original:`, error);
                // Continuar con archivo original si la optimización falla
              }
            } else if (file.type.startsWith('video/')) {
              // Videos se cargan tal cual (compresión server-side con ffmpeg si es necesario)
              await analyzeVideo(file);
            }

            // Subir a Supabase
            const result = await uploadFileStorage({
              file: fileToUpload,
              studioSlug,
              category,
              subcategory
            });

            if (result.success && result.publicUrl) {
              uploadedFiles.push({
                id: `${Date.now()}-${Math.random()}`,
                url: result.publicUrl,
                fileName: file.name,
                size: fileToUpload.size,
                originalSize: originalSize !== fileToUpload.size ? originalSize : undefined,
                compressionRatio: compressionRatio > 0 ? compressionRatio : undefined,
              });
              toast.success(`${file.name} subido correctamente`);
            } else {
              toast.error(`Error subiendo ${file.name}: ${result.error}`);
            }
          } catch (error) {
            toast.error(`Error subiendo ${file.name}`);
            console.error(error);
          }
        }
        return uploadedFiles;
      } finally {
        setIsUploading(false);
      }
    },
    []
  );

  const deleteFile = useCallback(
    async (publicUrl: string, studioSlug: string): Promise<boolean> => {
      try {
        const result = await deleteFileStorage({
          publicUrl,
          studioSlug
        });

        if (result.success) {
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
    []
  );

  return {
    uploadFiles,
    deleteFile,
    isUploading
  };
}
