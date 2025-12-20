"use client";

import { useState, useEffect } from "react";
import { ZenButton, ZenInput, ZenCard, ZenCardContent } from "@/components/ui/zen";
import { ZenConfirmModal } from "@/components/ui/zen/overlays/ZenConfirmModal";
import {
  obtenerTiposEvento,
  crearTipoEvento,
  actualizarTipoEvento,
  eliminarTipoEvento,
} from "@/lib/actions/studio/negocio/tipos-evento.actions";
import type { TipoEventoData } from "@/lib/actions/schemas/tipos-evento-schemas";
import { X, Plus, Pencil, Trash2, Loader2, AlertTriangle, Package } from "lucide-react";
import { toast } from "sonner";

interface TipoEventoManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  studioSlug: string;
  onUpdate?: (updatedTypes?: TipoEventoData[]) => void; // Recibe la lista actualizada
}

export function TipoEventoManagementModal({
  isOpen,
  onClose,
  studioSlug,
  onUpdate,
}: TipoEventoManagementModalProps) {
  const [eventTypes, setEventTypes] = useState<TipoEventoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [creatingNew, setCreatingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    name: string;
    hasEvents: boolean;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadEventTypes();
    }
  }, [isOpen, studioSlug]);

  const loadEventTypes = async () => {
    setLoading(true);
    try {
      const result = await obtenerTiposEvento(studioSlug);
      if (result.success && result.data) {
        setEventTypes(result.data);
      } else {
        toast.error(result.error || "Error al cargar tipos de evento");
      }
    } catch (error) {
      console.error("Error loading event types:", error);
      toast.error("Error al cargar tipos de evento");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast.error("El nombre es requerido");
      return;
    }

    // Validar que no exista duplicado
    const nombreNormalizado = newName.trim().toLowerCase();
    const existe = eventTypes.some(
      (type) => type.nombre.toLowerCase() === nombreNormalizado
    );

    if (existe) {
      toast.error("Ya existe un tipo de evento con ese nombre");
      return;
    }

    setActionLoading("create");
    try {
      const result = await crearTipoEvento(studioSlug, {
        nombre: newName.trim(),
        status: "active",
      });

      if (result.success && result.data) {
        toast.success(`Tipo de evento "${result.data.nombre}" creado`);
        setNewName("");
        setCreatingNew(false);
        // Actualizar lista local
        setEventTypes([...eventTypes, result.data]);
        // No llamar onUpdate aquí - se llama al cerrar el modal
      } else {
        toast.error(result.error || "Error al crear tipo de evento");
      }
    } catch (error) {
      console.error("Error creating event type:", error);
      toast.error("Error al crear tipo de evento");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editingName.trim()) {
      toast.error("El nombre es requerido");
      return;
    }

    // Validar que no exista duplicado (excluyendo el actual)
    const nombreNormalizado = editingName.trim().toLowerCase();
    const existe = eventTypes.some(
      (type) => type.id !== id && type.nombre.toLowerCase() === nombreNormalizado
    );

    if (existe) {
      toast.error("Ya existe un tipo de evento con ese nombre");
      return;
    }

    setActionLoading(id);
    try {
      const result = await actualizarTipoEvento(studioSlug, id, {
        nombre: editingName.trim(),
      });

      if (result.success) {
        toast.success("Tipo de evento actualizado");
        setEditingId(null);
        setEditingName("");
        // Actualizar lista local
        setEventTypes(
          eventTypes.map((type) =>
            type.id === id ? { ...type, nombre: editingName.trim() } : type
          )
        );
        // No llamar onUpdate aquí - se llama al cerrar el modal
      } else {
        toast.error(result.error || "Error al actualizar tipo de evento");
      }
    } catch (error) {
      console.error("Error updating event type:", error);
      toast.error("Error al actualizar tipo de evento");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteClick = (type: TipoEventoData) => {
    // Verificar si tiene eventos asociados
    const hasEvents = (type._count?.eventos || 0) > 0;

    setDeleteConfirm({
      id: type.id,
      name: type.nombre,
      hasEvents,
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;

    // Bloquear eliminación si tiene eventos asociados
    if (deleteConfirm.hasEvents) {
      toast.error("No se puede eliminar un tipo de evento con eventos asociados");
      setDeleteConfirm(null);
      return;
    }

    setActionLoading(deleteConfirm.id);
    try {
      const result = await eliminarTipoEvento(deleteConfirm.id);

      if (result.success) {
        toast.success(`Tipo de evento "${deleteConfirm.name}" eliminado`);
        setDeleteConfirm(null);
        // Actualizar lista local
        setEventTypes(eventTypes.filter((type) => type.id !== deleteConfirm.id));
        // No llamar onUpdate aquí - se llama al cerrar el modal
      } else {
        toast.error(result.error || "Error al eliminar tipo de evento");
      }
    } catch (error) {
      console.error("Error deleting event type:", error);
      toast.error("Error al eliminar tipo de evento");
    } finally {
      setActionLoading(null);
    }
  };

  const startEdit = (type: TipoEventoData) => {
    setEditingId(type.id);
    setEditingName(type.nombre);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-50 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col pointer-events-auto animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-zinc-800">
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">
                Gestionar Tipos de Evento
              </h2>
              <p className="text-sm text-zinc-400 mt-1">
                Usado en paquetes y leadform de promesas
              </p>
            </div>
            <button
              onClick={() => {
                onUpdate?.(eventTypes); // Pasar lista actualizada
                onClose();
              }}
              className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-zinc-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 text-zinc-500 animate-spin" />
                <span className="ml-2 text-sm text-zinc-500">Cargando...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Botón crear nuevo */}
                {!creatingNew && (
                  <ZenButton
                    variant="outline"
                    size="sm"
                    onClick={() => setCreatingNew(true)}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Crear nuevo tipo de evento
                  </ZenButton>
                )}

                {/* Form crear nuevo */}
                {creatingNew && (
                  <ZenCard className="border-emerald-500/30 bg-emerald-500/5">
                    <ZenCardContent className="p-4 space-y-3">
                      <div>
                        <label className="text-sm font-medium text-zinc-300 mb-1.5 block">
                          Nuevo tipo de evento
                        </label>
                        <ZenInput
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          placeholder="Ej: Bodas, XV Años, Corporativo..."
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleCreate();
                            if (e.key === "Escape") {
                              setCreatingNew(false);
                              setNewName("");
                            }
                          }}
                        />
                      </div>
                      <div className="flex gap-2">
                        <ZenButton
                          onClick={handleCreate}
                          disabled={!newName.trim() || actionLoading === "create"}
                          className="flex-1"
                        >
                          {actionLoading === "create" ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Creando...
                            </>
                          ) : (
                            <>
                              <Plus className="h-4 w-4 mr-2" />
                              Crear
                            </>
                          )}
                        </ZenButton>
                        <ZenButton
                          variant="ghost"
                          onClick={() => {
                            setCreatingNew(false);
                            setNewName("");
                          }}
                        >
                          Cancelar
                        </ZenButton>
                      </div>
                    </ZenCardContent>
                  </ZenCard>
                )}

                {/* Lista de tipos de evento */}
                {eventTypes.length === 0 ? (
                  <div className="text-center py-12 text-zinc-500 text-sm">
                    No hay tipos de evento creados
                  </div>
                ) : (
                  <div className="space-y-2">
                    {eventTypes.map((type) => (
                      <ZenCard
                        key={type.id}
                        className={
                          editingId === type.id
                            ? "border-emerald-500/30 bg-emerald-500/5"
                            : ""
                        }
                      >
                        <ZenCardContent className="p-4">
                          {editingId === type.id ? (
                            // Modo edición
                            <div className="space-y-3">
                              <ZenInput
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleUpdate(type.id);
                                  if (e.key === "Escape") cancelEdit();
                                }}
                              />
                              <div className="flex gap-2">
                                <ZenButton
                                  size="sm"
                                  onClick={() => handleUpdate(type.id)}
                                  disabled={
                                    !editingName.trim() || actionLoading === type.id
                                  }
                                  className="flex-1"
                                >
                                  {actionLoading === type.id ? (
                                    <>
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      Guardando...
                                    </>
                                  ) : (
                                    "Guardar"
                                  )}
                                </ZenButton>
                                <ZenButton
                                  variant="ghost"
                                  size="sm"
                                  onClick={cancelEdit}
                                >
                                  Cancelar
                                </ZenButton>
                              </div>
                            </div>
                          ) : (
                            // Modo vista
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h3 className="text-sm font-medium text-zinc-200">
                                    {type.nombre}
                                  </h3>
                                  {type.status === "inactive" && (
                                    <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">
                                      Inactivo
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                                  <span className="flex items-center gap-1">
                                    <Package className="h-3 w-3" />
                                    {type.paquetes?.length || 0} paquete(s)
                                  </span>
                                  {type._count?.eventos !== undefined && (
                                    <span>
                                      {type._count.eventos} evento(s)
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => startEdit(type)}
                                  className="p-2 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-emerald-400"
                                  title="Editar"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteClick(type)}
                                  disabled={actionLoading === type.id}
                                  className="p-2 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-red-400 disabled:opacity-50"
                                  title="Eliminar"
                                >
                                  {actionLoading === type.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                            </div>
                          )}
                        </ZenCardContent>
                      </ZenCard>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-zinc-800 flex justify-end">
            <ZenButton
              variant="outline"
              onClick={() => {
                onUpdate?.(eventTypes); // Pasar lista actualizada
                onClose();
              }}
            >
              Cerrar
            </ZenButton>
          </div>
        </div>
      </div>

      {/* Confirm Delete Modal */}
      {deleteConfirm && (
        <ZenConfirmModal
          isOpen={true}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={handleDeleteConfirm}
          title={
            deleteConfirm.hasEvents
              ? "No se puede eliminar"
              : "Confirmar eliminación"
          }
          description={
            deleteConfirm.hasEvents
              ? `El tipo de evento "${deleteConfirm.name}" tiene eventos asociados y no puede ser eliminado. Primero debes eliminar o reasignar los eventos.`
              : `¿Estás seguro de eliminar el tipo de evento "${deleteConfirm.name}"? Esta acción no se puede deshacer.`
          }
          confirmText={deleteConfirm.hasEvents ? "Entendido" : "Eliminar"}
          cancelText={deleteConfirm.hasEvents ? undefined : "Cancelar"}
          variant={deleteConfirm.hasEvents ? "default" : "destructive"}
          hideConfirmButton={deleteConfirm.hasEvents}
        />
      )}
    </>
  );
}
