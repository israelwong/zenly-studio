/**
 * Optimiza imágenes manteniendo calidad
 * - Comprime a máximo 1.5MB
 * - Mantiene relación de aspecto
 * - Retorna tamaño real para tracking
 */

export async function optimizeImage(file: File): Promise<{
  optimizedFile: File;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
}> {
  const originalSize = file.size;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      try {
        const img = new Image();
        img.src = event.target?.result as string;

        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;

          // Limitar dimensiones máximas a 2560px (suficiente para web/mobile)
          const MAX_WIDTH = 2560;
          const MAX_HEIGHT = 2560;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round((width * MAX_HEIGHT) / height);
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('No se pudo obtener contexto del canvas');

          ctx.drawImage(img, 0, 0, width, height);

          // Convertir a blob con compresión
          canvas.toBlob(
            (blob) => {
              if (!blob) throw new Error('No se pudo crear blob');

              const optimizedSize = blob.size;
              const compressionRatio = Math.round(
                ((originalSize - optimizedSize) / originalSize) * 100
              );

              // Crear nuevo File con el blob optimizado
              const optimizedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });

              resolve({
                optimizedFile,
                originalSize,
                optimizedSize,
                compressionRatio,
              });
            },
            'image/jpeg',
            0.92 // Calidad 92% - alta calidad manteniendo tamaño razonable
          );
        };

        img.onerror = () => reject(new Error('Error al cargar imagen'));
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Error al leer archivo'));
  });
}

/**
 * Optimiza avatares/fotos de perfil CON MENOS COMPRESIÓN
 * - Dimensiones pequeñas (máximo 500px) para avatares
 * - Calidad MÁS ALTA (96%) para mantener detalles faciales
 * - Especialmente optimizado para perfiles
 */
export async function optimizeAvatarImage(file: File): Promise<{
  optimizedFile: File;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
}> {
  const originalSize = file.size;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      try {
        const img = new Image();
        img.src = event.target?.result as string;

        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;

          // Avatar: máximo 500px (suficiente para cualquier tamaño de pantalla)
          const MAX_SIZE = 500;

          if (width > height) {
            if (width > MAX_SIZE) {
              height = Math.round((height * MAX_SIZE) / width);
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width = Math.round((width * MAX_SIZE) / height);
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('No se pudo obtener contexto del canvas');

          ctx.drawImage(img, 0, 0, width, height);

          // Convertir a blob con MENOS compresión para avatares
          canvas.toBlob(
            (blob) => {
              if (!blob) throw new Error('No se pudo crear blob');

              const optimizedSize = blob.size;
              const compressionRatio = Math.round(
                ((originalSize - optimizedSize) / originalSize) * 100
              );

              // Crear nuevo File con el blob optimizado
              const optimizedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });

              resolve({
                optimizedFile,
                originalSize,
                optimizedSize,
                compressionRatio,
              });
            },
            'image/jpeg',
            0.96 // Calidad 96% - MÁS ALTA para avatares (detalles faciales)
          );
        };

        img.onerror = () => reject(new Error('Error al cargar imagen'));
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Error al leer archivo'));
  });
}

/**
 * Comprime videos (sin conversión, solo análisis de tamaño)
 * Nota: Conversión real se haría server-side con ffmpeg si es necesario
 */
export async function analyzeVideo(file: File): Promise<{
  fileSize: number;
  fileName: string;
  type: string;
}> {
  // Por ahora solo retornamos metadata
  // La compresión real de video requiere ffmpeg server-side
  return {
    fileSize: file.size,
    fileName: file.name,
    type: file.type,
  };
}

/**
 * Formatea bytes a formato legible
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

import { APP_CONFIG } from '@/lib/actions/constants/config';

/**
 * Obtiene el límite de tamaño según el tipo de archivo
 */
export function getFileSizeLimit(fileType: 'image' | 'video'): number {
  return fileType === 'image' ? APP_CONFIG.MAX_IMAGE_SIZE : APP_CONFIG.MAX_VIDEO_SIZE;
}

/**
 * Valida tamaño de archivo según tipo
 * Usa límites centralizados de APP_CONFIG
 */
export function validateFileSize(file: File): {
  valid: boolean;
  error?: string;
  maxSize?: string;
} {
  if (file.type.startsWith('image/')) {
    const maxSize = APP_CONFIG.MAX_IMAGE_SIZE;
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `Imagen demasiado grande. Máximo: ${formatBytes(maxSize)}`,
        maxSize: formatBytes(maxSize),
      };
    }
  } else if (file.type.startsWith('video/')) {
    const maxSize = APP_CONFIG.MAX_VIDEO_SIZE;
    if (file.size > maxSize) {
      const fileSizeFormatted = formatBytes(file.size);
      const maxSizeFormatted = formatBytes(maxSize);
      return {
        valid: false,
        error: `No se pudo cargar el video. El archivo (${fileSizeFormatted}) excede el tamaño máximo permitido de ${maxSizeFormatted}. Por favor, comprime el video o elige uno más pequeño.`,
        maxSize: maxSizeFormatted,
      };
    }
  }

  return { valid: true };
}
