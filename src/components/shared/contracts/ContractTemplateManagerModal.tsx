"use client";

import React, { useState, useEffect } from "react";
import { Plus, Loader2 } from "lucide-react";
import { ZenDialog } from "@/components/ui/zen/modals/ZenDialog";
import { ZenButton, ZenConfirmModal } from "@/components/ui/zen";
import { ContractTemplatesTable } from "@/app/[slug]/studio/config/contratos/components";
import { ContractEditorModal } from "./ContractEditorModal";
import {
  getContractTemplates,
  getContractTemplate,
  createContractTemplate,
  updateContractTemplate,
  duplicateContractTemplate,
  toggleContractTemplate,
  deleteContractTemplate,
} from "@/lib/actions/studio/business/contracts";
import { DEFAULT_CONTRACT_TEMPLATE } from "@/lib/constants/contract-template";
import type { ContractTemplate } from "@/types/contracts";
import { toast } from "sonner";

interface ContractTemplateManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  studioSlug: string;
  eventTypeId?: string;
  onSelect?: (templateId: string) => void;
}

export function ContractTemplateManagerModal({
  isOpen,
  onClose,
  studioSlug,
  eventTypeId,
  onSelect,
}: ContractTemplateManagerModalProps) {
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ContractTemplate | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [duplicatingTemplateId, setDuplicatingTemplateId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<ContractTemplate | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen, studioSlug, eventTypeId]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const result = await getContractTemplates(studioSlug, {
        ...(eventTypeId && { eventTypeId }),
        // No filtrar por isActive para mostrar todas (activas e inactivas)
      });
      
      console.log('[ContractTemplateManagerModal] Cargando plantillas:', {
        studioSlug,
        eventTypeId,
        filters: { eventTypeId },
        result: result.success ? { count: result.data?.length, templates: result.data } : { error: result.error },
      });

      if (result.success && result.data) {
        setTemplates(result.data);
        if (result.data.length === 0) {
          console.warn('[ContractTemplateManagerModal] No se encontraron plantillas para el studio:', studioSlug);
        }
      } else {
        toast.error(result.error || "Error al cargar plantillas");
      }
    } catch (error) {
      console.error("Error loading templates:", error);
      toast.error("Error al cargar plantillas");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (templateId: string) => {
    try {
      const result = await getContractTemplate(studioSlug, templateId);
      if (result.success && result.data) {
        setEditingTemplate(result.data);
        setEditModalOpen(true);
      } else {
        toast.error(result.error || "Error al cargar plantilla");
      }
    } catch (error) {
      console.error("Error loading template:", error);
      toast.error("Error al cargar plantilla");
    }
  };

  const handleDuplicate = async (templateId: string) => {
    setDuplicatingTemplateId(templateId);
    try {
      const result = await duplicateContractTemplate(studioSlug, {
        template_id: templateId,
      });

      if (result.success && result.data) {
        toast.success("Plantilla duplicada correctamente");
        // Actualizar estado local
        setTemplates((prev) => [...prev, result.data!]);
        // Si hay callback onSelect, seleccionar automáticamente
        if (onSelect) {
          onSelect(result.data.id);
        }
      } else {
        toast.error(result.error || "Error al duplicar plantilla");
      }
    } catch (error) {
      console.error("Error duplicating template:", error);
      toast.error("Error al duplicar plantilla");
    } finally {
      setDuplicatingTemplateId(null);
    }
  };

  const handleToggle = async (templateId: string) => {
    try {
      const result = await toggleContractTemplate(studioSlug, templateId);
      if (result.success && result.data) {
        toast.success("Estado actualizado correctamente");
        // Actualizar estado local
        setTemplates((prev) =>
          prev.map((template) =>
            template.id === templateId
              ? { ...template, is_active: result.data!.is_active }
              : template
          )
        );
      } else {
        toast.error(result.error || "Error al cambiar estado");
      }
    } catch (error) {
      console.error("Error toggling template:", error);
      toast.error("Error al cambiar estado");
    }
  };

  const handleDeleteClick = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setTemplateToDelete(template);
      setDeleteConfirmOpen(true);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!templateToDelete) return;

    try {
      const result = await deleteContractTemplate(studioSlug, templateToDelete.id);
      if (result.success) {
        toast.success("Plantilla eliminada correctamente");
        // Actualizar estado local - remover la plantilla eliminada
        setTemplates((prev) => prev.filter((template) => template.id !== templateToDelete.id));
        setDeleteConfirmOpen(false);
        setTemplateToDelete(null);
      } else {
        toast.error(result.error || "Error al eliminar plantilla");
      }
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Error al eliminar plantilla");
    }
  };

  return (
    <>
      <ZenDialog
        isOpen={isOpen}
        onClose={onClose}
        title="Gestionar Plantillas de Contrato"
        description="Crea, edita, duplica y gestiona tus plantillas de contrato"
        maxWidth="6xl"
        onCancel={onClose}
        cancelLabel="Cerrar"
        closeOnClickOutside={false}
        zIndex={10060}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-400">
              {templates.length} plantilla{templates.length !== 1 ? "s" : ""} disponible{templates.length !== 1 ? "s" : ""}
            </p>
            <ZenButton
              variant="default"
              size="sm"
              onClick={() => setCreateModalOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Crear Nueva Plantilla
            </ZenButton>
          </div>

          {loading ? (
            <div className="relative rounded-lg border border-zinc-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-400 uppercase w-[200px] min-w-[200px]">
                        Nombre
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-400 uppercase">
                        Descripción
                      </th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-zinc-400 uppercase">
                        Estado
                      </th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-zinc-400 uppercase">
                        Versión
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-zinc-400 uppercase">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3].map((i) => (
                      <tr key={i} className="border-b border-zinc-800/50">
                        <td className="py-4 px-4 w-[200px] min-w-[200px]">
                          <div className="h-5 w-32 rounded bg-zinc-700 animate-pulse" />
                        </td>
                        <td className="py-4 px-4">
                          <div className="h-4 w-48 rounded bg-zinc-700 animate-pulse" />
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <div className="h-6 w-16 rounded bg-zinc-700 animate-pulse" />
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="h-4 w-8 rounded bg-zinc-700 animate-pulse mx-auto" />
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-end">
                            <div className="h-8 w-8 rounded bg-zinc-700 animate-pulse" />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <ContractTemplatesTable
              templates={templates}
              onEdit={handleEdit}
              onDuplicate={handleDuplicate}
              onToggle={handleToggle}
              onDelete={handleDeleteClick}
            />
          )}
        </div>
      </ZenDialog>

      {/* Modal crear plantilla */}
      <ContractEditorModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        mode="create-template"
        studioSlug={studioSlug}
        initialContent={DEFAULT_CONTRACT_TEMPLATE}
        onSave={async (data) => {
          setIsCreating(true);
          try {
            const result = await createContractTemplate(studioSlug, {
              name: data.name || "",
              description: data.description || "",
              content: data.content,
              is_default: data.is_default || false,
              ...(eventTypeId && { event_type_id: eventTypeId }),
            });

            if (result.success && result.data) {
              toast.success("Plantilla creada correctamente");
              setCreateModalOpen(false);
              // Actualizar estado local
              setTemplates((prev) => [...prev, result.data!]);
              // Si hay callback onSelect, seleccionar automáticamente
              if (onSelect && result.data.id) {
                onSelect(result.data.id);
              }
            } else {
              toast.error(result.error || "Error al crear plantilla");
            }
          } catch (error) {
            console.error("Error creating template:", error);
            toast.error("Error al crear plantilla");
          } finally {
            setIsCreating(false);
          }
        }}
        isLoading={isCreating}
      />

      {/* Modal editar plantilla */}
      {editingTemplate && (
        <ContractEditorModal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setEditingTemplate(null);
          }}
          mode="edit-template"
          studioSlug={studioSlug}
          initialContent={editingTemplate.content}
          initialName={editingTemplate.name}
          initialDescription={editingTemplate.description || ""}
          initialIsDefault={editingTemplate.is_default}
          onSave={async (data) => {
            setIsUpdating(true);
            try {
              const result = await updateContractTemplate(
                studioSlug,
                editingTemplate.id,
                {
                  name: data.name || "",
                  description: data.description || "",
                  content: data.content,
                  is_default: data.is_default || false,
                }
              );

              if (result.success && result.data) {
                toast.success("Plantilla actualizada correctamente");
                setEditModalOpen(false);
                // Actualizar estado local
                setTemplates((prev) =>
                  prev.map((template) =>
                    template.id === editingTemplate.id ? result.data! : template
                  )
                );
                setEditingTemplate(null);
              } else {
                toast.error(result.error || "Error al actualizar plantilla");
              }
            } catch (error) {
              console.error("Error updating template:", error);
              toast.error("Error al actualizar plantilla");
            } finally {
              setIsUpdating(false);
            }
          }}
          isLoading={isUpdating}
        />
      )}

      {/* Modal confirmar eliminación */}
      <ZenConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setTemplateToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Eliminar Plantilla"
        description={`¿Estás seguro de que deseas eliminar la plantilla "${templateToDelete?.name}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="destructive"
      />
    </>
  );
}
