'use client';

import { useState, useEffect } from 'react';
import { ZenDialog, ZenInput, ZenCard, ZenCardContent } from '@/components/ui/zen';
import { MobilePreviewFull } from '@/components/previews/MobilePreviewFull';
import { PublicPromisePageHeader } from '@/components/promise/PublicPromisePageHeader';
import { CoverDropzone } from '@/components/shared/CoverDropzone';
import { crearTipoEvento, actualizarTipoEvento } from '@/lib/actions/studio/negocio/tipos-evento.actions';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import type { TipoEventoData } from '@/lib/actions/schemas/tipos-evento-schemas';
import { toast } from 'sonner';

interface TipoEventoEnrichedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (tipoEvento: TipoEventoData) => void;
  studioSlug: string;
  tipoEvento?: TipoEventoData;
  zIndex?: number;
}


export function TipoEventoEnrichedModal({
  isOpen,
  onClose,
  onSuccess,
  studioSlug,
  tipoEvento,
  zIndex = 10050,
}: TipoEventoEnrichedModalProps) {
  const isEditMode = !!tipoEvento;

  // Estado del formulario
  const [nombre, setNombre] = useState(tipoEvento?.nombre || '');
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(tipoEvento?.cover_image_url || null);
  const [coverVideoUrl, setCoverVideoUrl] = useState<string | null>(tipoEvento?.cover_video_url || null);
  const [coverMediaType, setCoverMediaType] = useState<'image' | 'video' | null>(tipoEvento?.cover_media_type || null);
  const [coverDesignVariant, setCoverDesignVariant] = useState<'solid' | 'gradient' | null>(tipoEvento?.cover_design_variant || 'gradient');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Hook para upload de archivos multimedia
  const { uploadFiles, isUploading } = useMediaUpload();

  // Inicializar estado cuando cambia tipoEvento
  useEffect(() => {
    if (tipoEvento) {
      setNombre(tipoEvento.nombre || '');
      setCoverImageUrl(tipoEvento.cover_image_url || null);
      setCoverVideoUrl(tipoEvento.cover_video_url || null);
      setCoverMediaType(tipoEvento.cover_media_type || null);
    } else {
      // Reset para modo creación
      setNombre('');
      setCoverImageUrl(null);
      setCoverVideoUrl(null);
      setCoverMediaType(null);
    }
  }, [tipoEvento, isOpen]);

  // Manejar upload de cover
  const handleCoverUpload = async (files: File[]) => {
    if (!files || files.length === 0) return;

    try {
      const uploadedFiles = await uploadFiles(files, studioSlug, 'eventos', 'event-types');
      if (uploadedFiles.length > 0) {
        const file = uploadedFiles[0];
        const fileType = files[0].type.startsWith('video/') ? 'video' : 'image';

        if (fileType === 'video') {
          setCoverVideoUrl(file.url);
          setCoverMediaType('video');
          setCoverImageUrl(null);
        } else {
          setCoverImageUrl(file.url);
          setCoverMediaType('image');
          setCoverVideoUrl(null);
        }
        toast.success('Cover subido exitosamente');
      }
    } catch (error) {
      console.error('Error uploading cover:', error);
      toast.error('Error al subir el cover');
    }
  };

  const handleRemoveCover = () => {
    setCoverImageUrl(null);
    setCoverVideoUrl(null);
    setCoverMediaType(null);
    toast.success('Cover eliminado');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nombre.trim()) {
      setError('El nombre es requerido');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = {
        nombre: nombre.trim(),
        cover_image_url: coverImageUrl,
        cover_video_url: coverVideoUrl,
        cover_media_type: coverMediaType,
        cover_design_variant: coverDesignVariant,
        status: 'active' as const,
      };

      let result;
      if (isEditMode && tipoEvento) {
        result = await actualizarTipoEvento(studioSlug, tipoEvento.id, formData);
      } else {
        result = await crearTipoEvento(studioSlug, formData);
      }

      if (result.success && result.data) {
        toast.success(`Tipo de evento ${isEditMode ? 'actualizado' : 'creado'} exitosamente`);
        onSuccess(result.data);
        handleClose();
      } else {
        setError(result.error || `Error al ${isEditMode ? 'actualizar' : 'crear'} tipo de evento`);
      }
    } catch (err) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} event type:`, err);
      setError(`Error inesperado al ${isEditMode ? 'actualizar' : 'crear'} tipo de evento`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Disparar evento para cerrar overlays
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('close-overlays'));
    }
    setError('');
    onClose();
  };

  // Preview data para el header - Datos realistas que coinciden con la vista pública
  const previewData = {
    prospectName: 'María González',
    eventName: 'María y Juan', // Solo el nombre del evento, sin el tipo
    eventTypeName: nombre || 'Boda',
    eventDate: (() => {
      // Fecha futura realista (60 días desde hoy)
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 60);
      return futureDate;
    })(),
    variant: 'pendientes' as const,
    coverImageUrl,
    coverVideoUrl,
    coverMediaType,
    coverDesignVariant,
    isPreviewMode: true,
  };

  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditMode ? 'Editar Tipo de Evento' : 'Crear Tipo de Evento'}
      description="Diseña tu vitrina de experiencia con covers multimedia"
      maxWidth="4xl"
      zIndex={zIndex}
      closeOnClickOutside={false}
      onCancel={handleClose}
      cancelLabel="Cancelar"
      onSave={handleSubmit}
      saveLabel={isEditMode ? 'Actualizar' : 'Crear'}
      isLoading={loading}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Columna Izquierda: Editor */}
        <div className="space-y-6">
          {/* Nombre */}
          <ZenInput
            label="Nombre del tipo de evento"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Boda, XV Años, Corporativo"
            error={error}
            disabled={loading}
            autoFocus
            required
          />

          {/* Cover Multimedia */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Cover Multimedia <span className="text-zinc-500 text-xs">(opcional)</span>
              </label>
              <p className="text-xs text-zinc-500 mb-3 leading-relaxed">
                Este elemento multimedia se mostrará como header impactante en la vista pública cuando el prospecto revise paquetes y cotizaciones. Crea una primera impresión visual memorable.
              </p>
              <CoverDropzone
                mediaUrl={coverMediaType === 'image' ? coverImageUrl : coverMediaType === 'video' ? coverVideoUrl : null}
                mediaType={coverMediaType}
                onDropFiles={handleCoverUpload}
                onRemoveMedia={handleRemoveCover}
                isUploading={isUploading}
                variant="compact"
                helpText="Imagen o video que se mostrará como portada del tipo de evento"
              />
            </div>
          </div>
        </div>

        {/* Columna Derecha: Preview Mobile - Solo parte superior para enfocar el header */}
        <div className="hidden lg:block self-start">
          <div className="sticky top-6">
            <div className="relative overflow-hidden rounded-lg" style={{ height: '550px' }}>
              <div className="absolute inset-0 overflow-y-auto flex justify-center">
                <MobilePreviewFull hideHeader hideFooter isEditMode>
                  <div className="w-full">
                    <PublicPromisePageHeader {...previewData} />
                  </div>
                </MobilePreviewFull>
              </div>
              {/* Degradado del fondo del mobile preview (zinc-950) a transparente - ancho coincide con mobile preview */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[375px] h-24 bg-linear-to-t from-zinc-950 via-zinc-950/80 to-transparent pointer-events-none" />
            </div>
          </div>
        </div>
      </div>
    </ZenDialog>
  );
}
