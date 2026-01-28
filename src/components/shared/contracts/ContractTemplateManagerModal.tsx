"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Plus, Loader2 } from "lucide-react";
import { ZenDialog } from "@/components/ui/zen/modals/ZenDialog";
import { ZenButton } from "@/components/ui/zen";
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
import {
  getStudioContractData,
  validateStudioContractData,
  createDefaultTemplateForStudio,
  type StudioContractData,
} from "@/lib/actions/studio/business/contracts/templates.actions";
import { DEFAULT_CONTRACT_TEMPLATE } from "@/lib/constants/contract-template";
import type { ContractTemplate } from "@/types/contracts";
import { toast } from "sonner";
import { StudioContractDataModal } from "./StudioContractDataModal";
import { CheckCircle2, X, AlertCircle, Settings } from "lucide-react";

interface ContractTemplateManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  studioSlug: string;
  eventTypeId?: string;
  onSelect?: (templateId: string) => void;
  zIndex?: number; // ✅ Para permitir anidamiento correcto
}

export function ContractTemplateManagerModal({
  isOpen,
  onClose,
  studioSlug,
  eventTypeId,
  onSelect,
  zIndex = 10050, // ✅ Default, pero puede ser sobrescrito para anidamiento
}: ContractTemplateManagerModalProps) {
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ContractTemplate | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [duplicatingTemplateId, setDuplicatingTemplateId] = useState<string | null>(null);
  const [studioDataModalOpen, setStudioDataModalOpen] = useState(false);
  const [studioDataModalFromValidation, setStudioDataModalFromValidation] = useState(false);
  const [showDefaultTemplateMessage, setShowDefaultTemplateMessage] = useState(false);
  const [defaultTemplateCreated, setDefaultTemplateCreated] = useState(false);
  const [hasValidStudioData, setHasValidStudioData] = useState(false);

  const initializeModal = useCallback(async () => {
    setLoading(true);
    
    // Cargar plantillas primero, independientemente de la validación de datos del estudio
    const templatesResult = await getContractTemplates(studioSlug, {
      ...(eventTypeId && { eventTypeId }),
      // No filtrar por isActive para mostrar todas (activas e inactivas)
    });
    
    if (templatesResult.success && templatesResult.data) {
      setTemplates(templatesResult.data);
    }
    
    // Verificar datos del estudio en paralelo (no bloquea la carga de plantillas)
    const studioDataResult = await getStudioContractData(studioSlug);
    if (!studioDataResult.success || !studioDataResult.data) {
      // Si falla obtener datos del estudio, solo mostrar advertencia pero permitir gestionar plantillas
      setHasValidStudioData(false);
      setLoading(false);
      return;
    }

    // Extraer solo los datos legales (sin sources) para validación
    const contractData: StudioContractData = {
      nombre_studio: studioDataResult.data.nombre_studio,
      nombre_representante: studioDataResult.data.nombre_representante,
      telefono_studio: studioDataResult.data.telefono_studio,
      correo_studio: studioDataResult.data.correo_studio,
      direccion_studio: studioDataResult.data.direccion_studio,
    };

    const validation = await validateStudioContractData(contractData);
    if (!validation.isValid) {
      // Si faltan datos, mostrar advertencia pero las plantillas ya están cargadas
      setStudioDataModalFromValidation(true);
      setStudioDataModalOpen(true);
      setHasValidStudioData(false);
      setLoading(false);
      return;
    }

    // Si datos completos, verificar y crear plantilla default si es necesario
    setHasValidStudioData(true);
    
    // Verificar si existe plantilla default usando las plantillas ya cargadas
    const hasDefault = templatesResult.success && templatesResult.data 
      ? templatesResult.data.some((t) => t.is_default)
      : false;
    
    if (!hasDefault) {
      // Crear plantilla default automáticamente
      const createResult = await createDefaultTemplateForStudio(studioSlug);
      if (createResult.success && createResult.data) {
        setDefaultTemplateCreated(true);
        setShowDefaultTemplateMessage(true);
        // Agregar la nueva plantilla al estado sin recargar todo
        setTemplates((prev) => [createResult.data!, ...prev]);
      }
    }
    
    setLoading(false);
  }, [studioSlug, eventTypeId]);

  useEffect(() => {
    if (isOpen) {
      initializeModal();
    } else {
      // Resetear estados cuando se cierra el modal
      setStudioDataModalOpen(false);
      setShowDefaultTemplateMessage(false);
      setDefaultTemplateCreated(false);
      setHasValidStudioData(false);
      setLoading(true);
    }
  }, [isOpen, initializeModal]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const result = await getContractTemplates(studioSlug, {
        ...(eventTypeId && { eventTypeId }),
        // No filtrar por isActive para mostrar todas (activas e inactivas)
      });

      if (result.success && result.data) {
        setTemplates(result.data);
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
      const template = templates.find((t) => t.id === templateId);
      if (template?.is_default) {
        toast.error("No puedes desactivar la plantilla por defecto");
        return;
      }

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

  const handleDeleteClick = async (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;

    if (template.is_default) {
      toast.error("No puedes eliminar la plantilla por defecto. Primero cambia la plantilla por defecto a otra plantilla.");
      return;
    }

    try {
      const result = await deleteContractTemplate(studioSlug, templateId);
      if (result.success) {
        toast.success("Plantilla eliminada correctamente");
        // Actualizar estado local - remover la plantilla eliminada
        setTemplates((prev) => prev.filter((t) => t.id !== templateId));
      } else {
        toast.error(result.error || "Error al eliminar plantilla");
      }
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Error al eliminar plantilla");
    }
  };

  const handleSetDefault = async (templateId: string) => {
    try {
      const result = await updateContractTemplate(studioSlug, templateId, {
        is_default: true,
      });

      if (result.success && result.data) {
        toast.success("Plantilla por defecto actualizada correctamente");
        // Actualizar estado local - desmarcar todas y marcar la nueva
        setTemplates((prev) =>
          prev.map((template) => ({
            ...template,
            is_default: template.id === templateId,
            // Si es la nueva default, asegurar que esté activa
            is_active: template.id === templateId ? true : template.is_active,
          }))
        );
      } else {
        toast.error(result.error || "Error al cambiar plantilla por defecto");
      }
    } catch (error) {
      console.error("Error setting default template:", error);
      toast.error("Error al cambiar plantilla por defecto");
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
        zIndex={zIndex}
      >
        <div className="space-y-4">
          {/* Mensaje cuando faltan datos del estudio */}
          {!hasValidStudioData && !loading && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex gap-3 items-start">
              <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-amber-300 font-medium mb-1">
                  Datos del estudio pendientes
                </p>
                <p className="text-xs text-amber-400/80">
                  Completa los datos del estudio para poder gestionar las plantillas de contrato.
                </p>
              </div>
            </div>
          )}

          {/* Mensaje informativo de plantilla creada */}
          {showDefaultTemplateMessage && defaultTemplateCreated && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 flex gap-3 items-start">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-emerald-300 font-medium mb-1">
                  Plantilla por defecto creada
                </p>
                <p className="text-xs text-emerald-400/80 mb-3">
                  Hemos creado para ti una plantilla por defecto lista para usar. Revísala y personalízala para que se adapte a tu negocio.
                </p>
                <ZenButton
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const defaultTemplate = templates.find((t) => t.is_default);
                    if (defaultTemplate) {
                      handleEdit(defaultTemplate.id);
                    }
                  }}
                  className="text-emerald-300 border-emerald-500/50 hover:bg-emerald-500/10"
                >
                  Ver plantilla
                </ZenButton>
              </div>
              <button
                onClick={() => setShowDefaultTemplateMessage(false)}
                className="text-emerald-400/60 hover:text-emerald-300 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-400">
              {templates.length} plantilla{templates.length !== 1 ? "s" : ""} disponible{templates.length !== 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-2">
              <ZenButton
                variant="outline"
                size="sm"
                onClick={() => {
                  setStudioDataModalFromValidation(false);
                  setStudioDataModalOpen(true);
                }}
              >
                <Settings className="h-4 w-4 mr-2" />
                Editar datos legales del estudio
              </ZenButton>
              <ZenButton
                variant="default"
                size="sm"
                onClick={() => {
                  if (!hasValidStudioData) {
                    setStudioDataModalFromValidation(false);
                    setStudioDataModalOpen(true);
                    return;
                  }
                  setCreateModalOpen(true);
                }}
                disabled={!hasValidStudioData}
                title={!hasValidStudioData ? "Completa los datos del estudio para crear plantillas" : undefined}
              >
                <Plus className="h-4 w-4 mr-2" />
                Crear Nueva Plantilla
              </ZenButton>
            </div>
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
              onSetDefault={handleSetDefault}
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
              
              // Si se creó como default, recargar todas las plantillas para actualizar el estado
              if (data.is_default) {
                await loadTemplates();
              } else {
                // Si no es default, solo agregar al estado local
                setTemplates((prev) => [...prev, result.data!]);
              }
              
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

      {/* Modal de datos del estudio */}
      <StudioContractDataModal
        isOpen={studioDataModalOpen}
        onClose={() => {
          setStudioDataModalOpen(false);
          // Si se cierra sin guardar (cancelar) y viene de validación inicial, cerrar el modal principal también
          if (studioDataModalFromValidation) {
            onClose();
          }
        }}
        studioSlug={studioSlug}
        onSave={async () => {
          // Cerrar solo el modal de datos del estudio (no el principal)
          setStudioDataModalOpen(false);
          setStudioDataModalFromValidation(false);
          // Marcar que ahora tenemos datos válidos
          setHasValidStudioData(true);
          // Después de guardar datos, verificar y crear plantilla default
          // Recargar plantillas después de guardar datos del estudio
          await loadTemplates();
          // El modal principal se mantiene abierto y muestra las plantillas
        }}
      />
    </>
  );
}
