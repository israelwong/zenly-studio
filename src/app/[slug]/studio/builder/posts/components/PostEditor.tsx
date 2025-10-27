"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { ZenButton, ZenInput, ZenCard, ZenTextarea, ZenSelect } from "@/components/ui/zen";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/shadcn/tabs";
import Lightbox from "yet-another-react-lightbox";
import Video from "yet-another-react-lightbox/plugins/video";
import "yet-another-react-lightbox/styles.css";
import { toast } from "sonner";
import { Trash2, Upload, Loader2, GripVertical, Play, Save, Eye, Send } from "lucide-react";
import { usePostStore } from "@/lib/actions/schemas/post-store";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { arrayMove } from "@dnd-kit/sortable";
import { createStudioPost, updateStudioPost } from "@/lib/actions/studio/builder/posts";
import { PostFormData, MediaItem } from "@/lib/actions/schemas/post-schemas";
import { useRouter } from "next/navigation";

// Tipo local para el componente (incluye propiedades adicionales)
interface LocalMediaItem extends MediaItem {
  fileName?: string;
  isUploading?: boolean;
}

interface PostEditorProps {
  studioSlug: string;
  eventTypes: Array<{ id: string; name: string }>;
  mode: "create" | "edit";
  post?: PostFormData;
}

export function PostEditor({ studioSlug, eventTypes, mode, post }: PostEditorProps) {
  const router = useRouter();

  // ============================================
  // ESTADOS DEL FORMULARIO
  // ============================================
  const [formData, setFormData] = useState<PostFormData>({
    title: "",
    caption: "",
    media: [],
    cover_index: 0,
    category: "portfolio",
    event_type_id: undefined,
    tags: [],
    cta_enabled: true,
    cta_text: "Cotiza tu evento",
    cta_action: "whatsapp",
    cta_link: undefined,
    is_featured: false,
    is_published: false,
  });

  // ============================================
  // ESTADOS DE MULTIMEDIA
  // ============================================
  const [media, setMedia] = useState<LocalMediaItem[]>([]);
  const [isDraggingMedia, setIsDraggingMedia] = useState(false);

  // Lightbox states
  const [isMediaLightboxOpen, setIsMediaLightboxOpen] = useState(false);
  const [lightboxSlides, setLightboxSlides] = useState<Array<{ src: string; alt?: string } | { type: "video"; width: number; height: number; poster: string; sources: { src: string; type: string }[] }>>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // File input refs
  const mediaInputRef = useRef<HTMLInputElement>(null);

  // ============================================
  // ESTADOS DE UI
  // ============================================
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("datos");

  // ============================================
  // ZUSTAND STORE (PREVIEW EN TIEMPO REAL)
  // ============================================
  const { setPreview, updatePreview } = usePostStore();

  // ============================================
  // DRAG & DROP SENSORS
  // ============================================
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // ============================================
  // CARGAR DATOS DEL POST (SI EXISTE)
  // ============================================
  useEffect(() => {
    if (post && mode === "edit") {
      setFormData({
        title: post.title || "",
        caption: post.caption || "",
        media: post.media || [],
        cover_index: post.cover_index || 0,
        category: post.category || "portfolio",
        event_type_id: post.event_type_id || undefined,
        tags: post.tags || [],
        cta_enabled: post.cta_enabled ?? true,
        cta_text: post.cta_text || "Cotiza tu evento",
        cta_action: post.cta_action || "whatsapp",
        cta_link: post.cta_link || undefined,
        is_featured: post.is_featured ?? false,
        is_published: post.is_published ?? false,
      });
      setMedia(post.media || []);

      // Actualizar preview
      setPreview({
        id: post.id,
        title: post.title || undefined,
        caption: post.caption || undefined,
        media: post.media || [],
        cover_index: post.cover_index || 0,
        category: post.category || "portfolio",
        tags: post.tags || [],
        cta_enabled: post.cta_enabled ?? true,
        cta_text: post.cta_text || "Cotiza tu evento",
        cta_action: post.cta_action || "whatsapp",
      });
    } else {
      // Limpiar formulario para nuevo post
      const defaultData: PostFormData = {
        title: "",
        caption: "",
        media: [],
        cover_index: 0,
        category: "portfolio",
        tags: [],
        cta_enabled: true,
        cta_text: "Cotiza tu evento",
        cta_action: "whatsapp",
        is_featured: false,
        is_published: false,
      };
      setFormData(defaultData);
      setMedia([]);
      setPreview({
        ...defaultData,
        media: [],
      });
    }
  }, [post, mode, setPreview]);

  // ============================================
  // ACTUALIZAR PREVIEW EN TIEMPO REAL
  // ============================================
  useEffect(() => {
    updatePreview({
      title: formData.title,
      caption: formData.caption,
      media: media,
      cover_index: formData.cover_index,
      category: formData.category,
      tags: formData.tags,
      cta_enabled: formData.cta_enabled,
      cta_text: formData.cta_text,
      cta_action: formData.cta_action,
    });
  }, [formData, media, updatePreview]);

  // ============================================
  // HANDLERS - FORM
  // ============================================
  const handleInputChange = (field: keyof PostFormData, value: string | boolean | number | string[] | undefined) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // ============================================
  // HANDLERS - MEDIA UPLOAD
  // ============================================
  const handleMediaUpload = async (files: FileList) => {
    if (isUploading) return;

    const validFiles = Array.from(files).filter((file) => {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      return isImage || isVideo;
    });

    if (validFiles.length === 0) {
      toast.error("Por favor selecciona archivos válidos (imágenes o videos)");
      return;
    }

    setIsUploading(true);
    const uploadedItems: LocalMediaItem[] = [];

    try {
      for (const file of validFiles) {
        const tempUrl = URL.createObjectURL(file);
        const isVideo = file.type.startsWith("video/");

        // Agregar item temporal con loading state
        const tempItem: LocalMediaItem = {
          file_url: tempUrl,
          file_type: isVideo ? 'video' : 'image',
          filename: file.name,
          storage_path: '', // Se llenará después del upload
          fileName: file.name,
          isUploading: true,
        };

        setMedia((prev) => [...prev, tempItem]);

        // TODO: Implementar upload real a Supabase
        // const result = await uploadPostMedia(studioSlug, postId, file);

        // Simular upload (REMOVER ESTO Y USAR UPLOAD REAL)
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Actualizar con datos reales del servidor
        const uploadedItem: LocalMediaItem = {
          file_url: tempUrl, // Reemplazar con URL real de Supabase
          file_type: isVideo ? 'video' : 'image',
          filename: file.name,
          storage_path: `studios/${studioSlug}/posts/temp/${file.name}`,
          thumbnail_url: tempUrl,
          fileName: file.name,
          isUploading: false,
        };

        uploadedItems.push(uploadedItem);

        // Actualizar el item temporal con datos reales
        setMedia((prev) =>
          prev.map((item) => (item.filename === file.name ? uploadedItem : item))
        );
      }

      toast.success(`${uploadedItems.length} archivo(s) subido(s)`);
    } catch (error) {
      console.error("Error uploading media:", error);
      toast.error("Error al subir archivos");
      // Remover items con error
      setMedia((prev) => prev.filter((item) => !item.isUploading));
    } finally {
      setIsUploading(false);
    }
  };

  // ============================================
  // HANDLERS - DRAG & DROP
  // ============================================
  const handleMediaDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingMedia(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleMediaUpload(e.dataTransfer.files);
    }
  };

  const handleMediaDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingMedia(true);
  };

  const handleMediaDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingMedia(false);
  };

  // ============================================
  // HANDLERS - REORDER MEDIA
  // ============================================
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setMedia((items) => {
        const oldIndex = items.findIndex((item) => item.filename === active.id);
        const newIndex = items.findIndex((item) => item.filename === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });

      // TODO: Actualizar orden en el servidor
      // await reorderPostMedia(postId, newOrder);
    }
  };

  // ============================================
  // HANDLERS - DELETE MEDIA
  // ============================================
  const handleDeleteMedia = async (fileName: string) => {
    const item = media.find((m) => m.fileName === fileName);
    if (!item) return;

    try {
      // TODO: Eliminar del servidor
      // if (item.storage_path) {
      //   await deletePostMedia(item.storage_path);
      // }

      setMedia((prev) => prev.filter((m) => m.fileName !== fileName));

      // Ajustar cover_index si es necesario
      const deletedIndex = media.findIndex((m) => m.fileName === fileName);
      if (deletedIndex === formData.cover_index) {
        handleInputChange('cover_index', 0);
      } else if (deletedIndex < formData.cover_index) {
        handleInputChange('cover_index', formData.cover_index - 1);
      }

      toast.success("Archivo eliminado");
    } catch (error) {
      console.error("Error deleting media:", error);
      toast.error("Error al eliminar archivo");
    }
  };

  // ============================================
  // HANDLERS - LIGHTBOX
  // ============================================
  const openLightbox = (index: number) => {
    const slides = media.map((item) => {
      if (item.file_type === 'image') {
        return { src: item.file_url, alt: item.filename };
      } else {
        return {
          type: 'video' as const,
          width: item.dimensions?.width || 1920,
          height: item.dimensions?.height || 1080,
          poster: item.thumbnail_url || item.file_url,
          sources: [{ src: item.file_url, type: 'video/mp4' }],
        };
      }
    });

    setLightboxSlides(slides);
    setLightboxIndex(index);
    setIsMediaLightboxOpen(true);
  };

  // ============================================
  // HANDLERS - SAVE
  // ============================================
  const handleSave = async () => {
    if (!formData.title?.trim()) {
      toast.error("El título es requerido");
      return;
    }

    if (media.length === 0) {
      toast.error("Agrega al menos una foto o video");
      return;
    }

    setIsSaving(true);

    try {
      const dataToSave: PostFormData = {
        ...formData,
        media: media.map(item => ({
          ...item,
          isUploading: undefined, // Remover propiedades temporales
        })),
      };

      // TODO: Obtener studioId real
      const studioId = "temp-studio-id";

      let result;
      if (mode === "create") {
        result = await createStudioPost(studioId, dataToSave);
      } else {
        result = await updateStudioPost(post?.id || "", dataToSave);
      }

      if (result.success) {
        toast.success(mode === "create" ? "Post creado" : "Post actualizado");
        router.push(`/${studioSlug}/studio/builder/posts`);
      } else {
        toast.error(result.error || "Error al guardar post");
      }
    } catch (error) {
      console.error("Error saving post:", error);
      toast.error("Error al guardar post");
    } finally {
      setIsSaving(false);
    }
  };

  // ============================================
  // OPCIONES DE CATEGORÍA Y CTA
  // ============================================
  const categoryOptions = [
    { value: "portfolio", label: "Portfolio" },
    { value: "blog", label: "Blog" },
    { value: "promo", label: "Promoción" },
  ];

  const ctaActionOptions = [
    { value: "whatsapp", label: "WhatsApp" },
    { value: "lead_form", label: "Formulario" },
    { value: "calendar", label: "Agendar" },
  ];

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Editor */}
      <div className="space-y-6">
        <ZenCard className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="datos">Datos</TabsTrigger>
              <TabsTrigger value="media">
                Media {media.length > 0 && `(${media.length})`}
              </TabsTrigger>
              <TabsTrigger value="preview">
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: DATOS */}
            <TabsContent value="datos" className="space-y-6 mt-6">
              <form className="space-y-6">
                {/* Título */}
                <div>
                  <label className="block text-sm font-medium text-zinc-200 mb-2">
                    Título *
                  </label>
                  <ZenInput
                    value={formData.title || ""}
                    onChange={(e) => handleInputChange("title", e.target.value)}
                    placeholder="Ej: Boda en la playa"
                    maxLength={200}
                  />
                </div>

                {/* Caption */}
                <div>
                  <label className="block text-sm font-medium text-zinc-200 mb-2">
                    Descripción
                  </label>
                  <ZenTextarea
                    label="Descripción"
                    value={formData.caption || ""}
                    onChange={(e) => handleInputChange("caption", e.target.value)}
                    placeholder="Describe tu trabajo..."
                    rows={4}
                    maxLength={2000}
                  />
                </div>

                {/* Categoría */}
                <div>
                  <label className="block text-sm font-medium text-zinc-200 mb-2">
                    Categoría
                  </label>
                  <ZenSelect
                    value={formData.category}
                    onValueChange={(value) => handleInputChange("category", value)}
                    options={categoryOptions}
                  />
                </div>

                {/* Tipo de Evento */}
                {eventTypes.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-zinc-200 mb-2">
                      Tipo de Evento
                    </label>
                    <ZenSelect
                      value={formData.event_type_id || ""}
                      onValueChange={(value) => handleInputChange("event_type_id", value)}
                      options={[
                        { value: "", label: "Sin especificar" },
                        ...eventTypes.map(et => ({ value: et.id, label: et.name }))
                      ]}
                    />
                  </div>
                )}

                {/* CTA Section */}
                <div className="space-y-4 p-4 bg-zinc-900 rounded-lg border border-zinc-800">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-zinc-200">
                      Call to Action (CTA)
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.cta_enabled}
                        onChange={(e) => handleInputChange("cta_enabled", e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-sm text-zinc-400">Activar</span>
                    </label>
                  </div>

                  {formData.cta_enabled && (
                    <>
                      <ZenInput
                        value={formData.cta_text}
                        onChange={(e) => handleInputChange("cta_text", e.target.value)}
                        placeholder="Texto del botón"
                      />
                      <ZenSelect
                        value={formData.cta_action}
                        onValueChange={(value) => handleInputChange("cta_action", value)}
                        options={ctaActionOptions}
                      />
                    </>
                  )}
                </div>

                {/* Opciones adicionales */}
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_featured}
                      onChange={(e) => handleInputChange("is_featured", e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm text-zinc-400">Destacado</span>
                  </label>
                </div>
              </form>
            </TabsContent>

            {/* TAB 2: MEDIA */}
            <TabsContent value="media" className="space-y-6 mt-6">
              <div className="space-y-4">
                {/* Grid de Media con Drag & Drop */}
                <div>
                  <label className="block text-sm font-medium text-zinc-200 mb-3">
                    Fotos y Videos
                  </label>

                  <MediaGrid
                    items={media}
                    onDelete={handleDeleteMedia}
                    isDragging={isDraggingMedia}
                    onUploadClick={() => mediaInputRef.current?.click()}
                    onDrop={handleMediaDrop}
                    onDragOver={handleMediaDragOver}
                    onDragLeave={handleMediaDragLeave}
                    onReorder={handleDragEnd}
                    onItemClick={openLightbox}
                    coverIndex={formData.cover_index}
                    onSetCover={(index) => handleInputChange('cover_index', index)}
                    sensors={sensors}
                  />
                </div>

                {/* Info */}
                <ZenCard className="p-3 bg-blue-500/10 border-blue-500/30">
                  <p className="text-xs text-blue-300">
                    📸 Imágenes: JPG, PNG, GIF (máx. 5MB) | 🎬 Videos: MP4, MOV (máx. 100MB)
                  </p>
                </ZenCard>
              </div>
            </TabsContent>

            {/* TAB 3: PREVIEW */}
            <TabsContent value="preview" className="mt-6">
              <div className="space-y-4">
                <ZenCard className="p-3 bg-blue-500/10 border-blue-500/30">
                  <p className="text-xs text-blue-300">
                    👀 Este es el preview de cómo se verá tu post en la vista pública
                  </p>
                </ZenCard>

                {/* TODO: Implementar MobilePreview component */}
                <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
                  <p className="text-zinc-400 text-sm text-center">
                    Preview en tiempo real (por implementar con MobilePreview component)
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </ZenCard>

        {/* Botones de acción */}
        <div className="flex items-center justify-end gap-3">
          <ZenButton
            variant="secondary"
            onClick={() => router.back()}
            disabled={isSaving || isUploading}
          >
            Cancelar
          </ZenButton>
          <ZenButton
            onClick={handleSave}
            disabled={isSaving || isUploading || !formData.title?.trim() || media.length === 0}
            className="gap-2"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : formData.is_published ? (
              <Send className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {mode === "create" ? "Crear" : "Actualizar"} Post
          </ZenButton>
        </div>
      </div>

      {/* Preview Sidebar */}
      <div className="lg:sticky lg:top-6 lg:h-fit">
        <ZenCard className="p-6">
          <h3 className="text-lg font-semibold text-zinc-100 mb-4">Preview</h3>
          <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
            <p className="text-zinc-400 text-sm text-center">
              Preview móvil en tiempo real (por implementar)
            </p>
          </div>
        </ZenCard>
      </div>

      {/* Input oculto para file upload */}
      <input
        ref={mediaInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime"
        multiple
        onChange={(e) => e.target.files && handleMediaUpload(e.target.files)}
        className="hidden"
      />

      {/* Lightbox para media */}
      <Lightbox
        open={isMediaLightboxOpen}
        close={() => setIsMediaLightboxOpen(false)}
        slides={lightboxSlides}
        index={lightboxIndex}
        plugins={[Video]}
        video={{
          controls: true,
          playsInline: true,
          autoPlay: true,
        }}
        on={{
          view: ({ index }) => setLightboxIndex(index),
        }}
      />
    </div>
  );
}

// ============================================
// COMPONENTE: MediaGrid
// ============================================
interface MediaGridProps {
  items: LocalMediaItem[];
  onDelete: (fileName: string) => void;
  isDragging: boolean;
  onUploadClick: () => void;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onReorder: (event: DragEndEvent) => void;
  onItemClick: (index: number) => void;
  coverIndex: number;
  onSetCover: (index: number) => void;
  sensors: ReturnType<typeof useSensors>;
}

function MediaGrid({
  items,
  onDelete,
  isDragging,
  onUploadClick,
  onDrop,
  onDragOver,
  onDragLeave,
  onReorder,
  onItemClick,
  coverIndex,
  onSetCover,
  sensors,
}: MediaGridProps) {
  return (
    <div
      className={`relative border-2 border-dashed rounded-lg p-4 transition-colors ${isDragging
        ? "border-emerald-500 bg-emerald-500/5"
        : "border-zinc-700 hover:border-zinc-600"
        }`}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
      {items.length === 0 ? (
        <div className="text-center py-12">
          <Upload className="w-12 h-12 mx-auto mb-4 text-zinc-600" />
          <p className="text-sm text-zinc-400 mb-2">
            Arrastra archivos aquí o haz click para subir
          </p>
          <ZenButton type="button" variant="secondary" size="sm" onClick={onUploadClick}>
            <Upload className="w-4 h-4 mr-2" />
            Seleccionar Archivos
          </ZenButton>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onReorder}
        >
          <SortableContext
            items={items.map((item, index) => item.filename || item.id || `item-${index}`)}
            strategy={verticalListSortingStrategy}
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {items.map((item, index) => (
                <SortableMediaItem
                  key={item.filename || item.id}
                  item={item}
                  index={index}
                  isCover={index === coverIndex}
                  onDelete={() => onDelete(item.filename || item.id || `item-${index}`)}
                  onClick={() => onItemClick(index)}
                  onSetCover={() => onSetCover(index)}
                />
              ))}

              {/* Botón para agregar más */}
              <button
                type="button"
                onClick={onUploadClick}
                className="aspect-square rounded-lg border-2 border-dashed border-zinc-700 hover:border-emerald-500 transition-colors flex items-center justify-center group"
              >
                <Upload className="w-6 h-6 text-zinc-600 group-hover:text-emerald-500" />
              </button>
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

// ============================================
// COMPONENTE: SortableMediaItem
// ============================================
interface SortableMediaItemProps {
  item: MediaItem;
  index: number;
  isCover: boolean;
  onDelete: () => void;
  onClick: () => void;
  onSetCover: () => void;
}

function SortableMediaItem({
  item,
  index,
  isCover,
  onDelete,
  onClick,
  onSetCover,
}: SortableMediaItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: (item.filename || item.id || `item-${Date.now()}`) as string,
  });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative aspect-square rounded-lg overflow-hidden group ${isCover ? 'ring-2 ring-emerald-500' : ''
        }`}
    >
      {/* Image/Video Preview */}
      <div className="w-full h-full cursor-pointer" onClick={onClick}>
        {item.file_type === 'image' ? (
          <Image
            src={(item.thumbnail_url || item.file_url || '/placeholder.jpg') as string}
            alt={(item.filename || 'Media item') as string}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
            <Play className="w-12 h-12 text-zinc-400" />
          </div>
        )}
      </div>

      {/* Loading Overlay */}
      {item.isUploading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
      )}

      {/* Actions */}
      <div className="absolute top-2 left-2 right-2 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Drag Handle */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="p-1.5 bg-black/60 backdrop-blur-sm rounded cursor-move"
        >
          <GripVertical className="w-4 h-4 text-white" />
        </button>

        {/* Delete Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1.5 bg-red-500/80 backdrop-blur-sm rounded hover:bg-red-500"
        >
          <Trash2 className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Cover Badge */}
      {isCover && (
        <div className="absolute bottom-2 left-2 px-2 py-1 bg-emerald-500 rounded text-xs font-medium">
          Portada
        </div>
      )}

      {/* Set as Cover Button */}
      {!isCover && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSetCover();
          }}
          className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
        >
          Hacer portada
        </button>
      )}

      {/* Index Badge */}
      <div className="absolute top-2 right-2 w-6 h-6 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
        {index + 1}
      </div>
    </div>
  );
}

// Helper function for keyboard sensor
function sortableKeyboardCoordinates() {
  return { x: 0, y: 0 };
}
