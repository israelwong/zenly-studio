"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, X, Copy, Check, Trash2 } from "lucide-react";
import {
  ZenButton,
  ZenInput,
  ZenTextarea,
  ZenCard,
  ZenCardContent,
  ZenCardHeader,
  ZenCardTitle,
  ZenConfirmModal,
  ZenSwitch,
  ZenBadge,
} from "@/components/ui/zen";
import { ContentBlocksEditor } from "@/components/content-blocks";
import { CategorizedComponentSelector, ComponentOption } from "@/app/[slug]/profile/edit/content/portfolios/components/CategorizedComponentSelector";
import { ContentBlock } from "@/types/content-blocks";
import { createOffer, updateOffer, checkOfferSlugExists } from "@/lib/actions/studio/offers/offers.actions";
import type { CreateOfferData, LeadFormField } from "@/lib/actions/schemas/offer-schemas";
import type { StudioOffer } from "@/types/offers";
import { toast } from "sonner";
import cuid from "cuid";
import { Loader2 } from "lucide-react";

interface OfferEditorProps {
  studioSlug: string;
  mode: "create" | "edit";
  offer?: StudioOffer;
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

export function OfferEditor({ studioSlug, mode, offer }: OfferEditorProps) {
  const router = useRouter();

  // Estado del formulario básico
  const [formData, setFormData] = useState({
    name: offer?.name || "",
    description: offer?.description || "",
    objective: (offer?.objective || "presencial") as "presencial" | "virtual",
    slug: offer?.slug || generateSlug(offer?.name || ""),
    is_active: offer?.is_active ?? true,
  });

  // Estado para landing page
  const [contentBlocks, setContentBlocks] = useState<ContentBlock[]>(
    offer?.landing_page?.content_blocks
      ? (offer.landing_page.content_blocks as ContentBlock[])
      : []
  );

  // Estado para leadform
  const [leadformData, setLeadformData] = useState({
    title: offer?.leadform?.title || "",
    description: offer?.leadform?.description || "",
    success_message: offer?.leadform?.success_message || "¡Gracias! Nos pondremos en contacto pronto.",
    success_redirect_url: offer?.leadform?.success_redirect_url || "",
    fields_config: {
      fields: (offer?.leadform?.fields_config?.fields || []) as LeadFormField[],
    },
  });

  const [isSaving, setIsSaving] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showComponentSelector, setShowComponentSelector] = useState(false);
  const [insertAtIndex, setInsertAtIndex] = useState<number | undefined>(undefined);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showAddFieldModal, setShowAddFieldModal] = useState(false);
  const [newField, setNewField] = useState<Partial<LeadFormField>>({
    type: "text",
    label: "",
    required: false,
  });
  const [nameError, setNameError] = useState<string | null>(null);
  const [isValidatingSlug, setIsValidatingSlug] = useState(false);
  const [slugHint, setSlugHint] = useState<string | null>(null);

  // Generar slug automáticamente cuando cambia el nombre
  useEffect(() => {
    if (formData.name) {
      const expectedSlug = generateSlug(formData.name);
      // Actualizar slug si está vacío o si coincide con el generado desde el título actual
      // (esto permite que se actualice cuando el nombre cambia)
      if (!formData.slug || formData.slug === expectedSlug || formData.slug === generateSlug(offer?.name || "")) {
        if (expectedSlug !== formData.slug) {
          setFormData((prev) => ({
            ...prev,
            slug: expectedSlug,
          }));
        }
      }
    }
  }, [formData.name, formData.slug, offer?.name]);

  // Validar slug único cuando cambia el nombre o slug
  useEffect(() => {
    const validateSlug = async () => {
      if (!formData.slug || !formData.slug.trim()) {
        setNameError(null);
        setSlugHint(null);
        setIsValidatingSlug(false);
        return;
      }

      // Solo validar si el slug es diferente al original (o si es creación)
      const currentSlug = offer?.slug || "";
      if (mode === "edit" && formData.slug === currentSlug) {
        setNameError(null);
        // Mostrar slug actual si es el mismo (ya inicializado)
        setSlugHint(`Slug: ${formData.slug}`);
        setIsValidatingSlug(false);
        return;
      }

      setIsValidatingSlug(true);
      setNameError(null);
      setSlugHint(null);

      try {
        const slugExists = await checkOfferSlugExists(
          studioSlug,
          formData.slug,
          mode === "edit" ? offer?.id : undefined
        );

        if (slugExists) {
          setNameError("Ya existe una oferta con este nombre");
          setSlugHint(null);
        } else {
          setNameError(null);
          setSlugHint(`Slug: ${formData.slug}`);
        }
      } catch (error) {
        console.error("Error validating slug:", error);
        setNameError(null);
        setSlugHint(null);
      } finally {
        setIsValidatingSlug(false);
      }
    };

    // Debounce para evitar demasiadas llamadas
    const timeoutId = setTimeout(() => {
      validateSlug();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData.slug, formData.name, studioSlug, mode, offer?.slug, offer?.id]);

  const handleDragStateChange = useCallback((isDragging: boolean) => {
    // Callback requerido por ContentBlocksEditor para manejar cambios de estado de drag
    // No necesitamos hacer nada aquí, pero el parámetro es requerido por la interfaz
    void isDragging; // Marcar como usado para evitar warning
  }, []);

  const handleAddComponentFromSelector = (component: ComponentOption) => {
    const generateId = () => `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    let config: Record<string, unknown> = {};

    switch (component.type) {
      case "text":
        config = {
          text: "",
          textType: "text",
          fontSize: "base",
          fontWeight: "normal",
          alignment: "left",
        };
        break;
      case "separator":
        config = { style: "solid", height: 0.5 };
        break;
      default:
        config = {};
    }

    const newBlock: ContentBlock = {
      id: generateId(),
      type: component.type,
      order: insertAtIndex !== undefined ? insertAtIndex : contentBlocks.length,
      presentation: "block",
      media: [],
      config,
    };

    const indexToInsert = insertAtIndex !== undefined ? insertAtIndex : contentBlocks.length;
    if (indexToInsert < contentBlocks.length) {
      const newBlocks = [...contentBlocks];
      newBlocks.splice(indexToInsert, 0, newBlock);
      newBlocks.forEach((block, index) => {
        block.order = index;
      });
      setContentBlocks(newBlocks);
    } else {
      setContentBlocks([...contentBlocks, newBlock]);
    }

    setShowComponentSelector(false);
    setInsertAtIndex(undefined);
  };


  const handleAddLeadFormField = () => {
    if (!newField.label || !newField.type) {
      toast.error("Completa el tipo y la etiqueta del campo");
      return;
    }

    const field: LeadFormField = {
      id: cuid(),
      type: newField.type as LeadFormField["type"],
      label: newField.label,
      required: newField.required || false,
      placeholder: newField.placeholder,
      options: newField.type === "select" ? newField.options : undefined,
    };

    setLeadformData((prev) => ({
      ...prev,
      fields_config: {
        fields: [...prev.fields_config.fields, field],
      },
    }));

    setNewField({ type: "text", label: "", required: false });
    setShowAddFieldModal(false);
  };

  const handleRemoveLeadFormField = (id: string) => {
    setLeadformData((prev) => ({
      ...prev,
      fields_config: {
        fields: prev.fields_config.fields.filter((field) => field.id !== id),
      },
    }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      // Validaciones básicas
      if (!formData.name.trim()) {
        toast.error("El nombre es requerido");
        setIsSaving(false);
        return;
      }

      if (!formData.slug.trim()) {
        toast.error("El slug es requerido");
        setIsSaving(false);
        return;
      }

      // Validación de slug único
      if (nameError) {
        toast.error("Ya existe una oferta con este nombre");
        setIsSaving(false);
        return;
      }

      if (contentBlocks.length === 0) {
        toast.error("Agrega al menos un componente a la landing page");
        setIsSaving(false);
        return;
      }

      // Preparar datos para guardar
      const offerData: CreateOfferData = {
        name: formData.name,
        description: formData.description || undefined,
        objective: formData.objective,
        slug: formData.slug,
        is_active: formData.is_active,
        landing_page: {
          content_blocks: contentBlocks,
          cta_config: {
            buttons: [],
          },
        },
        leadform: {
          title: leadformData.title || undefined,
          description: leadformData.description || undefined,
          success_message: leadformData.success_message,
          success_redirect_url: leadformData.success_redirect_url || undefined,
          fields_config: leadformData.fields_config,
        },
      };

      let result;
      if (mode === "create") {
        result = await createOffer(studioSlug, offerData);
      } else {
        if (!offer?.id) {
          toast.error("ID de oferta requerido para actualizar");
          setIsSaving(false);
          return;
        }
        result = await updateOffer(offer.id, studioSlug, {
          id: offer.id,
          ...offerData,
        });
      }

      if (!result.success) {
        toast.error(result.error || "Error al guardar la oferta");
        setIsSaving(false);
        return;
      }

      toast.success(
        mode === "create"
          ? "Oferta creada exitosamente"
          : "Oferta actualizada exitosamente"
      );

      router.push(`/${studioSlug}/studio/commercial/ofertas`);
    } catch (error) {
      console.error("[OfferEditor] Error:", error);
      toast.error("Error al guardar la oferta");
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!offer?.id) return;

    setIsDeleting(true);
    try {
      const { deleteOffer } = await import("@/lib/actions/studio/offers/offers.actions");
      const result = await deleteOffer(offer.id, studioSlug);

      if (result.success) {
        toast.success("Oferta eliminada exitosamente");
        router.push(`/${studioSlug}/studio/commercial/ofertas`);
      } else {
        toast.error(result.error || "Error al eliminar la oferta");
        setIsDeleting(false);
      }
    } catch (error) {
      console.error("[OfferEditor] Error:", error);
      toast.error("Error al eliminar la oferta");
      setIsDeleting(false);
    }
  };

  const publicUrl = offer
    ? `/${studioSlug}/offer/${offer.id}`
    : `/${studioSlug}/offer/${formData.slug}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <ZenButton variant="ghost" onClick={() => router.back()} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Regresar
        </ZenButton>
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">
            {mode === "create" ? "Nueva Oferta" : "Editar Oferta"}
          </h1>
          <p className="text-zinc-400">
            {mode === "create"
              ? "Crea una nueva oferta comercial"
              : "Modifica tu oferta comercial"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel de Edición */}
        <div className="space-y-6">
          {/* Información Básica */}
          <ZenCard>
            <ZenCardHeader>
              <ZenCardTitle>Información Básica</ZenCardTitle>
            </ZenCardHeader>
            <ZenCardContent className="space-y-4">
              <div>
                <ZenInput
                  label="Nombre de la Oferta"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Ej: Oferta de Verano 2024"
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

              <ZenTextarea
                label="Descripción Breve"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Descripción corta de la oferta"
                rows={3}
              />

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Objetivo
                </label>
                <select
                  value={formData.objective}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      objective: e.target.value as "presencial" | "virtual",
                    }))
                  }
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-300"
                >
                  <option value="presencial">Cita Presencial</option>
                  <option value="virtual">Cita Virtual</option>
                </select>
              </div>



              {offer && (
                <div className="flex items-center gap-3 p-4 border border-zinc-800 rounded-md bg-zinc-900/50">
                  <div className="flex-1">
                    <p className="text-xs text-zinc-500 mb-1">URL Pública</p>
                    <p className="text-sm text-zinc-300 font-mono break-all">
                      {publicUrl}
                    </p>
                  </div>
                  <ZenButton
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(
                          `${window.location.origin}${publicUrl}`
                        );
                        setLinkCopied(true);
                        toast.success("Link copiado");
                        setTimeout(() => setLinkCopied(false), 2000);
                      } catch {
                        toast.error("Error al copiar el link");
                      }
                    }}
                  >
                    {linkCopied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </ZenButton>
                </div>
              )}

              <div className="flex items-center gap-3">
                <ZenSwitch
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, is_active: checked }))
                  }
                  label="Oferta Activa"
                />
              </div>
            </ZenCardContent>
          </ZenCard>

          {/* Landing Page */}
          <ZenCard>
            <ZenCardHeader>
              <ZenCardTitle>Landing Page</ZenCardTitle>
            </ZenCardHeader>
            <ZenCardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-zinc-300">
                    Componentes de Contenido
                  </h3>
                  <ZenButton
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setInsertAtIndex(undefined);
                      setShowComponentSelector(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar
                  </ZenButton>
                </div>

                <ContentBlocksEditor
                  blocks={contentBlocks}
                  onBlocksChange={(updatedBlocksOrFn) => {
                    setContentBlocks((prev) => {
                      const updatedBlocks =
                        typeof updatedBlocksOrFn === "function"
                          ? updatedBlocksOrFn(prev)
                          : updatedBlocksOrFn;
                      return updatedBlocks.map((block, index) => ({
                        ...block,
                        order: index,
                      }));
                    });
                  }}
                  studioSlug={studioSlug}
                  hideHeader={true}
                  onAddComponentClick={() => {
                    setInsertAtIndex(undefined);
                    setShowComponentSelector(true);
                  }}
                  onDragStateChange={handleDragStateChange}
                />
              </div>

            </ZenCardContent>
          </ZenCard>

          {/* Leadform */}
          <ZenCard>
            <ZenCardHeader>
              <ZenCardTitle>Leadform</ZenCardTitle>
            </ZenCardHeader>
            <ZenCardContent className="space-y-4">
              <ZenInput
                label="Título del Formulario"
                value={leadformData.title}
                onChange={(e) =>
                  setLeadformData((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="Solicita información"
              />

              <ZenTextarea
                label="Descripción"
                value={leadformData.description}
                onChange={(e) =>
                  setLeadformData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Completa el formulario para obtener más información"
                rows={2}
              />

              <ZenTextarea
                label="Mensaje de Éxito"
                value={leadformData.success_message}
                onChange={(e) =>
                  setLeadformData((prev) => ({
                    ...prev,
                    success_message: e.target.value,
                  }))
                }
                rows={2}
              />

              <ZenInput
                label="URL de Redirección (opcional)"
                value={leadformData.success_redirect_url}
                onChange={(e) =>
                  setLeadformData((prev) => ({
                    ...prev,
                    success_redirect_url: e.target.value,
                  }))
                }
                placeholder="https://..."
              />

              {/* Campos Personalizados */}
              <div className="border-t border-zinc-800 pt-4 mt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-zinc-300">
                    Campos Personalizados
                  </h3>
                  <ZenButton
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddFieldModal(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar Campo
                  </ZenButton>
                </div>

                <div className="space-y-2">
                  {leadformData.fields_config.fields.map((field) => (
                    <div
                      key={field.id}
                      className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-zinc-300">
                            {field.label}
                          </span>
                          <ZenBadge variant="secondary" size="sm">
                            {field.type}
                          </ZenBadge>
                          {field.required && (
                            <ZenBadge variant="destructive" size="sm">
                              Requerido
                            </ZenBadge>
                          )}
                        </div>
                      </div>
                      <ZenButton
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveLeadFormField(field.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </ZenButton>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-zinc-500 mt-3">
                  Nota: Los campos básicos (nombre, teléfono, email) siempre están
                  incluidos.
                </p>
              </div>
            </ZenCardContent>
          </ZenCard>

          {/* Botones de Acción */}
          <div className="flex gap-3">
            <ZenButton onClick={handleSave} className="flex-1" loading={isSaving}>
              {mode === "create" ? "Crear Oferta" : "Guardar Cambios"}
            </ZenButton>
            <ZenButton
              variant="outline"
              onClick={() => setShowCancelModal(true)}
              disabled={isSaving}
            >
              Cancelar
            </ZenButton>
            {mode === "edit" && (
              <ZenButton
                variant="outline"
                onClick={() => setShowDeleteModal(true)}
                disabled={isSaving}
                className="text-red-400 hover:text-red-300 hover:bg-red-950/20 border-red-800/50"
              >
                <Trash2 className="h-4 w-4" />
              </ZenButton>
            )}
          </div>
        </div>
      </div>

      {/* Modal Selector de Componentes */}
      <CategorizedComponentSelector
        isOpen={showComponentSelector}
        onClose={() => {
          setShowComponentSelector(false);
          setInsertAtIndex(undefined);
        }}
        onSelect={handleAddComponentFromSelector}
      />

      {/* Modal Agregar Campo Leadform */}
      {showAddFieldModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <ZenCard className="max-w-md w-full mx-4">
            <ZenCardHeader>
              <div className="flex items-center justify-between">
                <ZenCardTitle>Agregar Campo</ZenCardTitle>
                <ZenButton
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAddFieldModal(false);
                    setNewField({ type: "text", label: "", required: false });
                  }}
                >
                  <X className="h-4 w-4" />
                </ZenButton>
              </div>
            </ZenCardHeader>
            <ZenCardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Tipo de Campo
                </label>
                <select
                  value={newField.type}
                  onChange={(e) =>
                    setNewField((prev) => ({
                      ...prev,
                      type: e.target.value as LeadFormField["type"],
                    }))
                  }
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-300"
                >
                  <option value="text">Texto</option>
                  <option value="textarea">Área de Texto</option>
                  <option value="email">Email</option>
                  <option value="phone">Teléfono</option>
                  <option value="select">Select</option>
                  <option value="date">Fecha</option>
                </select>
              </div>

              <ZenInput
                label="Etiqueta"
                value={newField.label || ""}
                onChange={(e) =>
                  setNewField((prev) => ({ ...prev, label: e.target.value }))
                }
                placeholder="Ej: Mensaje adicional"
                required
              />

              <ZenInput
                label="Placeholder (opcional)"
                value={newField.placeholder || ""}
                onChange={(e) =>
                  setNewField((prev) => ({ ...prev, placeholder: e.target.value }))
                }
                placeholder="Texto de ayuda"
              />

              {newField.type === "select" && (
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Opciones (una por línea)
                  </label>
                  <textarea
                    value={newField.options?.join("\n") || ""}
                    onChange={(e) =>
                      setNewField((prev) => ({
                        ...prev,
                        options: e.target.value
                          .split("\n")
                          .filter((opt) => opt.trim()),
                      }))
                    }
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-300"
                    rows={4}
                    placeholder="Opción 1&#10;Opción 2&#10;Opción 3"
                  />
                </div>
              )}

              <div className="flex items-center gap-3">
                <ZenSwitch
                  checked={newField.required || false}
                  onCheckedChange={(checked) =>
                    setNewField((prev) => ({ ...prev, required: checked }))
                  }
                  label="Campo Requerido"
                />
              </div>

              <div className="flex gap-3">
                <ZenButton onClick={handleAddLeadFormField} className="flex-1">
                  Agregar Campo
                </ZenButton>
                <ZenButton
                  variant="outline"
                  onClick={() => {
                    setShowAddFieldModal(false);
                    setNewField({ type: "text", label: "", required: false });
                  }}
                >
                  Cancelar
                </ZenButton>
              </div>
            </ZenCardContent>
          </ZenCard>
        </div>
      )}

      {/* Modal Cancelar */}
      <ZenConfirmModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={() => router.back()}
        title="Cancelar Edición"
        description="¿Estás seguro de que quieres cancelar? Se perderán todos los cambios no guardados."
        confirmText="Sí, Cancelar"
        cancelText="Continuar Editando"
        variant="destructive"
      />

      {/* Modal Eliminar */}
      <ZenConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Eliminar Oferta"
        description="¿Estás seguro de que quieres eliminar esta oferta? Esta acción no se puede deshacer."
        confirmText="Sí, Eliminar"
        cancelText="Cancelar"
        variant="destructive"
        loading={isDeleting}
      />
    </div>
  );
}
