'use client';

import React, { useState, useRef } from 'react';
import { Upload, User, Crop, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useFileUpload } from '@/hooks/useFileUpload';
import { Dropzone } from '@/components/ui/shadcn/dropzone';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/shadcn/avatar';
import { AvatarCropModal } from './AvatarCropModal';

interface AvatarManagerZenProps {
  url?: string | null | undefined;
  onUpdate: (url: string) => Promise<void>;
  onLocalUpdate: (url: string | null) => void;
  studioSlug: string;
  loading?: boolean;
}

export function AvatarManagerZen({
  url,
  onUpdate,
  onLocalUpdate,
  studioSlug,
  loading = false
}: AvatarManagerZenProps) {
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropImageUrl, setCropImageUrl] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hook para upload de archivos
  const { uploading, progress, error, uploadFile, deleteFile } = useFileUpload({
    studioSlug,
    category: 'identidad',
    subcategory: 'avatars',
    allowedMimeTypes: ['image/jpeg', 'image/png'], // Solo JPG y PNG
    maxSize: 2, // 2MB (después de optimización)
    onError: (error) => {
      toast.error(error);
    }
  });


  const handleFileSelect = async (file: File) => {
    // Validar tipo de archivo
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      toast.error('Solo se permiten archivos JPG y PNG para tu foto de perfil.');
      return;
    }

    // Validar tamaño inicial (10MB máximo antes de optimizar)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('La imagen es demasiado grande. Por favor selecciona una imagen más pequeña.');
      return;
    }

    // Abrir modal de crop con la imagen seleccionada
    setCropImageUrl(URL.createObjectURL(file));
    setShowCropModal(true);
  };

  const handleCropApply = async (cropData: { x: number; y: number; scale: number; rotation: number }, croppedImageUrl: string) => {
    try {
      // Convertir la URL del blob a File
      const response = await fetch(croppedImageUrl);
      const blob = await response.blob();
      const file = new File([blob], 'avatar-cropped.jpg', { type: 'image/jpeg' });

      // Subir el archivo cropeado
      const result = await uploadFile(file);
      if (result.success && result.publicUrl) {
        // Actualizar solo una vez con la URL pública final
        onLocalUpdate(result.publicUrl);
        await onUpdate(result.publicUrl);
        toast.success('¡Perfecto! Tu foto de perfil se ha actualizado correctamente');
      } else {
        // Revertir cambios en caso de error
        onLocalUpdate(url || null);
        toast.error(result.error || 'No pudimos subir tu foto. Inténtalo de nuevo.');
      }

      setShowCropModal(false);
    } catch (error) {
      console.error('Error al aplicar crop:', error);
      // Revertir en caso de error
      onLocalUpdate(url || null);
      toast.error('Error al procesar la imagen');
    }
  };


  const handleRemoveUrl = async () => {
    // Guardar la URL original para rollback
    const originalUrl = url ?? null;

    setIsDeleting(true);

    try {
      if (originalUrl) {
        await deleteFile(originalUrl);
      }
      await onUpdate('');
      // Solo actualizar después de que termine exitosamente
      onLocalUpdate(null);
      toast.success('Tu foto de perfil se ha eliminado');
    } catch (error) {
      toast.error('No pudimos eliminar tu foto. Inténtalo de nuevo');
      console.error('Error al eliminar archivo:', error);
    } finally {
      setIsDeleting(false);
    }
  };


  return (
    <div className="space-y-4">
      {url ? (
        <div className="flex flex-col items-center justify-center space-y-4">
          {/* Avatar con dropzone para reemplazar */}
          <div className="relative group flex items-center justify-center">
            {/* Dropzone invisible sobre el avatar para permitir drag and drop */}
            <Dropzone
              onFileSelect={handleFileSelect}
              acceptedFileTypes={{
                'image/jpeg': ['.jpg', '.jpeg'],
                'image/png': ['.png']
              }}
              maxSize={10}
              maxFiles={1}
              disabled={uploading || loading || isDeleting}
              className="absolute inset-0 w-[256px] h-[256px] rounded-full z-0 cursor-pointer"
            >
              <div className="w-full h-full" />
            </Dropzone>

            <div className="relative flex items-center justify-center z-10">
              <Avatar className="w-[256px] h-[256px] border-2 border-zinc-400 pointer-events-none">
                <AvatarImage
                  src={url}
                  alt="Avatar"
                  className="object-cover object-center"
                />
                <AvatarFallback className="flex items-center justify-center">
                  <User className="h-16 w-16" />
                </AvatarFallback>
              </Avatar>

              {/* Overlay de eliminando */}
              {isDeleting && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center z-20">
                  <div className="text-center">
                    <div className="animate-spin h-8 w-8 border-2 border-red-500 border-t-transparent rounded-full mx-auto mb-2" />
                    <p className="text-white text-xs font-medium">Eliminando...</p>
                  </div>
                </div>
              )}

              {/* Overlay con opciones al hacer hover */}
              {!isDeleting && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3 z-20 pointer-events-none">
                  {/* Botón Ajustar */}
                  <button
                    onClick={() => {
                      setCropImageUrl(url);
                      setShowCropModal(true);
                    }}
                    disabled={uploading || loading || isDeleting}
                    className="flex flex-col items-center gap-1.5 px-3 py-2 bg-zinc-800/90 hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed pointer-events-auto"
                    title="Ajustar avatar"
                  >
                    <Crop className="h-4 w-4 text-blue-400" />
                    <span className="text-white text-xs font-medium">Ajustar</span>
                  </button>

                  {/* Botón Eliminar */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveUrl();
                    }}
                    disabled={uploading || loading || isDeleting}
                    className="flex flex-col items-center gap-1.5 px-3 py-2 bg-red-600/90 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed pointer-events-auto"
                    title="Eliminar avatar"
                  >
                    <Trash2 className="h-4 w-4 text-white" />
                    <span className="text-white text-xs font-medium">Eliminar</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center">
          {/* Dropzone circular personalizado */}
          <div className="relative">
            <Dropzone
              onFileSelect={handleFileSelect}
              acceptedFileTypes={{
                'image/jpeg': ['.jpg', '.jpeg'],
                'image/png': ['.png']
              }}
              maxSize={10}
              maxFiles={1}
              disabled={uploading || loading}
              className="w-[256px] h-[256px] border-2 border-dashed border-zinc-400 hover:border-zinc-300 hover:bg-zinc-900/30 transition-all duration-300 rounded-full group cursor-pointer relative overflow-hidden flex items-center justify-center"
            >
              <div className="flex flex-col items-center justify-center text-center p-6">
                {/* Icono principal */}
                <div className="w-16 h-16 mb-4 rounded-full bg-zinc-800/80 flex items-center justify-center group-hover:bg-zinc-700 group-hover:scale-110 transition-all duration-200">
                  <Upload className="h-8 w-8 text-zinc-400 group-hover:text-zinc-300 transition-colors duration-200" />
                </div>

                {/* Texto principal */}
                <h3 className="text-zinc-200 text-sm font-medium mb-2">
                  Subir Avatar
                </h3>

                {/* Especificaciones técnicas */}
                <p className="text-zinc-400 text-xs">
                  JPG, PNG hasta 10MB
                </p>
              </div>
            </Dropzone>

            {/* Indicador de estado de carga */}
            {uploading && (
              <div className="absolute inset-0 bg-zinc-900/90 backdrop-blur-sm rounded-full flex items-center justify-center z-20">
                <div className="text-center">
                  <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
                  <p className="text-zinc-200 text-xs font-medium">Subiendo...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Input de archivo oculto para compatibilidad */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,image/jpeg,image/png"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file);
        }}
        className="hidden"
      />

      {/* Mostrar error si existe con ZEN styling */}
      {error && (
        <div className="p-3 bg-red-900/20 border border-red-800/30 rounded-md">
          <div className="flex items-center">
            <div className="h-2 w-2 bg-red-400 rounded-full mr-2" />
            <span className="text-red-400 text-sm">{error}</span>
          </div>
        </div>
      )}



      {/* Modal de crop */}
      <AvatarCropModal
        isOpen={showCropModal}
        onClose={() => setShowCropModal(false)}
        imageUrl={cropImageUrl}
        onCrop={handleCropApply}
      />
    </div>
  );
}
