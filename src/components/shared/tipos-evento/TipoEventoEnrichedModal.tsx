'use client';

import { useState, useEffect } from 'react';
import { CalendarIcon } from 'lucide-react';
import { ZenDialog, ZenInput, ZenCard, ZenCardContent } from '@/components/ui/zen';
import { ZenCalendar } from '@/components/ui/zen';
import { ZenSelect } from '@/components/ui/zen/forms/ZenSelect';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover';
import { MobilePreviewFull } from '@/components/previews/MobilePreviewFull';
import { PublicPromisePageHeader } from '@/components/promise/PublicPromisePageHeader';
import { CoverDropzone } from '@/components/shared/CoverDropzone';
import { crearTipoEvento, actualizarTipoEvento } from '@/lib/actions/studio/negocio/tipos-evento.actions';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import type { TipoEventoData } from '@/lib/actions/schemas/tipos-evento-schemas';
import { toast } from 'sonner';
import { formatDisplayDate } from '@/lib/utils/date-formatter';
import { es } from 'date-fns/locale';

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

  // Variables de ejemplo para preview (no se guardan en BD)
  const [nombreContacto, setNombreContacto] = useState('María Pérez');
  const [fechaEvento, setFechaEvento] = useState<Date>(() => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    return futureDate;
  });
  const [nombreEvento, setNombreEvento] = useState('una persona');
  const [region, setRegion] = useState('Regina');
  const [calendarOpen, setCalendarOpen] = useState(false);

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

  // Actualizar región cuando cambia nombreEvento
  useEffect(() => {
    if (nombreEvento === 'una persona') {
      setRegion('Regina');
    } else {
      setRegion('Regina y Armando');
    }
  }, [nombreEvento]);

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

  // Preview data para el header - Usa variables de ejemplo
  const previewData = {
    prospectName: nombreContacto,
    eventName: region,
    eventTypeName: nombre || 'Boda',
    eventDate: fechaEvento,
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

          {/* Variables de ejemplo para preview */}
          <div className="space-y-4 pt-4 border-t border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-300">Datos de ejemplo</h3>
            <p className="text-xs text-zinc-500 mb-4">
              Estas variables son solo para previsualizar cómo se verá la información. No se guardan en la base de datos.
            </p>

            {/* Nombre del contacto */}
            <ZenInput
              label="Nombre de la persona que contacta al studio"
              value={nombreContacto}
              onChange={(e) => setNombreContacto(e.target.value)}
              placeholder="María Pérez"
              disabled={loading}
            />

            {/* Fecha de evento */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300 block">
                Fecha de evento
              </label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-3 py-2 text-sm bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-300 hover:border-zinc-600 transition-colors"
                  >
                    <span>{formatDisplayDate(fechaEvento)}</span>
                    <CalendarIcon className="h-4 w-4 text-zinc-400" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-0 bg-zinc-900 border-zinc-700"
                  align="start"
                  sideOffset={4}
                >
                  <ZenCalendar
                    mode="single"
                    selected={fechaEvento}
                    onSelect={(selectedDate: Date | undefined) => {
                      if (selectedDate) {
                        const normalizedDate = new Date(Date.UTC(
                          selectedDate.getUTCFullYear(),
                          selectedDate.getUTCMonth(),
                          selectedDate.getUTCDate(),
                          12, 0, 0
                        ));
                        setFechaEvento(normalizedDate);
                        setCalendarOpen(false);
                      }
                    }}
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-zinc-500 leading-relaxed">
                La recomendación de contratación está definida para el ejemplo por 30 días, pero tú puedes modificar esa fecha en tu panel de gestión de promesas.
              </p>
            </div>

            {/* Nombre del evento - Botones toggle */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300 block">
                Nombre del evento
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setNombreEvento('una persona')}
                  disabled={loading}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    nombreEvento === 'una persona'
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  una persona
                </button>
                <button
                  type="button"
                  onClick={() => setNombreEvento('2 personas')}
                  disabled={loading}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    nombreEvento === '2 personas'
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  2 personas
                </button>
              </div>
            </div>

            {/* Input sin label que se actualiza según nombreEvento */}
            <ZenInput
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder={nombreEvento === 'una persona' ? 'Regina' : 'Regina y Armando'}
              disabled={loading}
            />
          </div>
        </div>

        {/* Columna Derecha: Preview Mobile - Completo */}
        <div className="hidden lg:block self-start">
          <div className="sticky top-6">
            <div className="relative rounded-lg">
              <div className="flex justify-center">
                <MobilePreviewFull hideHeader hideFooter isEditMode>
                  <div className="w-full">
                    <PublicPromisePageHeader {...previewData} />
                  </div>
                </MobilePreviewFull>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ZenDialog>
  );
}
