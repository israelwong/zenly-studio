"use client";

import { useState, useEffect } from "react";
import { ZenInput, ZenTextarea } from "@/components/ui/zen";
import { useOfferEditor } from "../OfferEditorContext";
import { ObjectiveRadio } from "./ObjectiveRadio";
import { Loader2 } from "lucide-react";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { toast } from "sonner";
import { CoverDropzone } from "@/components/shared/CoverDropzone";

interface BasicInfoEditorProps {
  studioSlug: string;
  nameError: string | null;
  isValidatingSlug: boolean;
  slugHint: string | null;
}

// Helper para generar slug desde nombre
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function BasicInfoEditor({
  studioSlug,
  nameError,
  isValidatingSlug,
  slugHint,
}: BasicInfoEditorProps) {
  const { formData, updateFormData } = useOfferEditor();
  const { uploadFiles } = useMediaUpload();

  const [isUploadingCover, setIsUploadingCover] = useState(false);

  // Auto-generar slug cuando cambia el nombre
  useEffect(() => {
    if (formData.name) {
      const expectedSlug = generateSlug(formData.name);
      // Solo actualizar si el slug está vacío o si coincide con el esperado
      if (!formData.slug || formData.slug !== expectedSlug) {
        updateFormData({ slug: expectedSlug });
      }
    }
  }, [formData.name]); // Remover formData.slug y updateFormData de las dependencias

  const handleCoverUpload = async (files: File[]) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    setIsUploadingCover(true);
    try {
      const uploadedFiles = await uploadFiles(
        [file],
        studioSlug,
        "offers",
        "covers"
      );

      if (uploadedFiles.length > 0) {
        updateFormData({
          cover_media_url: uploadedFiles[0].url,
          cover_media_type: isVideo ? "video" : "image",
        });
        toast.success("Portada subida correctamente");
      }
    } catch (error) {
      console.error("Error uploading cover:", error);
      toast.error("Error al subir la portada");
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleRemoveCover = () => {
    updateFormData({
      cover_media_url: null,
      cover_media_type: null,
    });
    toast.success("Portada eliminada");
  };

  return (
    <div className="space-y-4">
      {/* Nombre */}
      <div>
        <ZenInput
          id="offer-name-input"
          label="Nombre de la Oferta"
          value={formData.name}
          onChange={(e) => updateFormData({ name: e.target.value })}
          placeholder="Ej: Sesión Fotográfica de Verano 2024"
          required
          error={nameError ?? undefined}
        />
        {/* Indicador de validación y hint */}
        {isValidatingSlug && !nameError && (
          <p className="text-xs text-zinc-400 mt-1 flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            Validando disponibilidad...
          </p>
        )}
        {slugHint && !isValidatingSlug && !nameError && (
          <p className="text-xs text-emerald-400 mt-1">
            {slugHint}
          </p>
        )}
      </div>

      {/* Descripción */}
      <ZenTextarea
        id="offer-description-textarea"
        label="Descripción (Uso Interno)"
        value={formData.description}
        onChange={(e) => updateFormData({ description: e.target.value })}
        placeholder="Notas internas sobre la oferta. Esta descripción no aparecerá en la publicación pública."
        rows={3}
      />
      <p className="text-xs text-zinc-500 mt-1">
        Solo para uso interno, no se mostrará públicamente
      </p>

      {/* Portada Multimedia */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          Portada (Foto o Video) <span className="text-red-400">*</span>
        </label>
        <CoverDropzone
          mediaUrl={formData.cover_media_url || null}
          mediaType={formData.cover_media_type || null}
          onDropFiles={handleCoverUpload}
          onRemoveMedia={handleRemoveCover}
          isUploading={isUploadingCover}
          variant="large"
          aspectRatio="video"
          helpText="Recomendado: 1920x1080px"
          placeholderText="Arrastra una imagen o video, o haz clic para seleccionar"
          showHelpText={true}
        />
        <p className="text-xs text-zinc-500 mt-2">
          Esta imagen/video se mostrará en el feed público de tu perfil
        </p>
      </div>

      {/* Objetivo - Radio Buttons */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-3">
          Objetivo de la Oferta <span className="text-red-400">*</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ObjectiveRadio
            value="presencial"
            checked={formData.objective === "presencial"}
            onChange={(value) => updateFormData({ objective: value })}
          />
          <ObjectiveRadio
            value="virtual"
            checked={formData.objective === "virtual"}
            onChange={(value) => updateFormData({ objective: value })}
          />
        </div>
      </div>
    </div>
  );
}
