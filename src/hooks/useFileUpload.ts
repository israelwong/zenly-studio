'use client';

import { useState, useCallback } from 'react';
import { uploadFileStorage, deleteFileStorage, updateFileStorage } from '@/lib/actions/shared/media.actions';
import { optimizeAvatarImage } from '@/lib/utils/image-optimizer';
import type { FileUploadResult, FileDeleteResult } from '@/lib/actions/schemas/media-schemas';

interface UseFileUploadOptions {
  studioSlug: string;
  category: 'identidad' | 'servicios' | 'eventos' | 'galeria' | 'clientes' | 'documentos' | 'temp';
  subcategory?: string;
  allowedMimeTypes: readonly string[];
  maxSize?: number; // en MB
  onSuccess?: (url: string) => void;
  onError?: (error: string) => void;
}

interface UseFileUploadReturn {
  uploading: boolean;
  progress: number;
  error: string | null;
  uploadFile: (file: File) => Promise<FileUploadResult>;
  deleteFile: (url: string) => Promise<FileDeleteResult>;
  updateFile: (file: File, oldUrl?: string) => Promise<FileUploadResult>;
  resetError: () => void;
}

export function useFileUpload(options: UseFileUploadOptions): UseFileUploadReturn {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const { 
    studioSlug, 
    category, 
    subcategory, 
    allowedMimeTypes, 
    maxSize = 5, 
    onSuccess, 
    onError 
  } = options;

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  const validateFile = useCallback((file: File): boolean => {
    // Validar por MIME type
    if (allowedMimeTypes.includes(file.type)) {
      // MIME válido, continuar
    } else {
      // Si MIME no es reconocido, verificar por extensión
      const fileName = file.name.toLowerCase();
      const isSVG = fileName.endsWith('.svg') && allowedMimeTypes.includes('image/svg+xml');
      
      if (!isSVG) {
        const allowedTypes = allowedMimeTypes.join(', ');
        setError(`Tipo de archivo no permitido. Tipos soportados: ${allowedTypes}`);
        return false;
      }
    }

    const maxSizeBytes = maxSize * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setError(`El archivo es demasiado grande. Máximo ${maxSize}MB permitido.`);
      return false;
    }

    return true;
  }, [allowedMimeTypes, maxSize]);

  const uploadFile = useCallback(async (file: File): Promise<FileUploadResult> => {
    setUploading(true);
    setProgress(0);
    setError(null);

    if (!validateFile(file)) {
      setUploading(false);
      return { success: false, error: error || 'Error de validación' };
    }

    try {
      // Simular progreso
      setProgress(25);

      const result = await uploadFileStorage({
        file,
        category,
        subcategory,
        studioSlug
      });

      setProgress(75);

      if (result.success && result.publicUrl) {
        setProgress(100);
        onSuccess?.(result.publicUrl);
      } else {
        const errorMessage = result.error || 'Error desconocido al subir archivo';
        setError(errorMessage);
        onError?.(errorMessage);
      }

      return result;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error inesperado';
      setError(errorMessage);
      onError?.(errorMessage);

      return { success: false, error: errorMessage };
    } finally {
      setUploading(false);
      // Resetear progreso después de un momento
      setTimeout(() => setProgress(0), 1000);
    }
  }, [category, subcategory, studioSlug, validateFile, onSuccess, onError, error]);

  const deleteFile = useCallback(async (url: string): Promise<FileDeleteResult> => {
    setError(null);

    try {
      const result = await deleteFileStorage({ 
        publicUrl: url, 
        studioSlug 
      });

      if (!result.success && result.error) {
        setError(result.error);
        onError?.(result.error);
      }

      return result;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error inesperado';
      setError(errorMessage);
      onError?.(errorMessage);

      return { success: false, error: errorMessage };
    }
  }, [studioSlug, onError]);

  const updateFile = useCallback(async (file: File, oldUrl?: string): Promise<FileUploadResult> => {
    setUploading(true);
    setProgress(0);
    setError(null);

    if (!validateFile(file)) {
      setUploading(false);
      return { success: false, error: error || 'Error de validación' };
    }

    try {
      setProgress(25);

      const result = await updateFileStorage({
        file,
        oldPublicUrl: oldUrl,
        category,
        subcategory,
        studioSlug
      });

      setProgress(75);

      if (result.success && result.publicUrl) {
        setProgress(100);
        onSuccess?.(result.publicUrl);
      } else {
        const errorMessage = result.error || 'Error desconocido al actualizar archivo';
        setError(errorMessage);
        onError?.(errorMessage);
      }

      return result;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error inesperado';
      setError(errorMessage);
      onError?.(errorMessage);

      return { success: false, error: errorMessage };
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  }, [category, subcategory, studioSlug, validateFile, onSuccess, onError, error]);

  return {
    uploading,
    progress,
    error,
    uploadFile,
    deleteFile,
    updateFile,
    resetError
  };
}
