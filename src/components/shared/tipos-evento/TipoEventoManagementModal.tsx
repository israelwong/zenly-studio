"use client";

import { useState, useEffect } from "react";
import { ZenButton, ZenCard, ZenCardContent } from "@/components/ui/zen";
import { ZenConfirmModal } from "@/components/ui/zen/overlays/ZenConfirmModal";
import {
  obtenerTiposEvento,
  eliminarTipoEvento,
} from "@/lib/actions/studio/negocio/tipos-evento.actions";
import type { TipoEventoData } from "@/lib/actions/schemas/tipos-evento-schemas";
import { TipoEventoEnrichedModal } from "@/components/shared/tipos-evento/TipoEventoEnrichedModal";
import { X, Plus, Pencil, Trash2, Loader2, Package, Image as ImageIcon, Video } from "lucide-react";
import { toast } from "sonner";

/** Skeleton que imita un ítem de la lista (cover 48x48 + título + metadata) para evitar layout shift */
function EventTypeListSkeleton() {
  return (
    <ZenCard className="overflow-hidden">
      <ZenCardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 shrink-0 rounded-md bg-zinc-800 animate-pulse" />
          <div className="flex-1 min-w-0 flex flex-col justify-center gap-2">
            <div className="w-32 h-4 rounded bg-zinc-800 animate-pulse" />
            <div className="w-20 h-3 rounded bg-zinc-800/80 animate-pulse" />
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 animate-pulse" />
            <div className="w-8 h-8 rounded-lg bg-zinc-800 animate-pulse" />
          </div>
        </div>
      </ZenCardContent>
    </ZenCard>
  );
}

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
  const [enrichedModalOpen, setEnrichedModalOpen] = useState(false);
  const [enrichedModalTipo, setEnrichedModalTipo] = useState<TipoEventoData | undefined>(undefined);
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

  // Debug: verificar que cover_image_url / cover_video_url llegan al componente
  useEffect(() => {
    if (isOpen && eventTypes.length > 0) {
      console.log("Event Type Data (covers):", eventTypes.map((t) => ({
        id: t.id,
        nombre: t.nombre,
        cover_image_url: t.cover_image_url ?? null,
        cover_video_url: t.cover_video_url ?? null,
        cover_media_type: t.cover_media_type ?? null,
      })));
    }
  }, [isOpen, eventTypes]);

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

  const handleEnrichedSuccess = async (tipoEvento: TipoEventoData) => {
    const result = await obtenerTiposEvento(studioSlug);
    if (result.success && result.data) {
      setEventTypes(result.data);
    } else {
      if (enrichedModalTipo) {
        setEventTypes((prev) =>
          prev.map((t) => (t.id === tipoEvento.id ? tipoEvento : t))
        );
      } else {
        setEventTypes((prev) => [...prev, tipoEvento]);
      }
    }
    setEnrichedModalOpen(false);
    setEnrichedModalTipo(undefined);
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

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-[10050] animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[10050] flex items-center justify-center p-4 pointer-events-none">
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
            <div className="space-y-4">
              <ZenButton
                variant="outline"
                size="sm"
                onClick={() => {
                  setEnrichedModalTipo(undefined);
                  setEnrichedModalOpen(true);
                }}
                className="w-full"
                disabled={loading}
              >
                <Plus className="h-4 w-4 mr-2" />
                Crear nuevo tipo de evento
              </ZenButton>

              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <EventTypeListSkeleton key={i} />
                  ))}
                </div>
              ) : eventTypes.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 text-sm">
                  No hay tipos de evento creados
                </div>
              ) : (
                <div className="space-y-2">
                    {eventTypes.map((type) => (
                      <ZenCard key={type.id} className="overflow-hidden">
                        <ZenCardContent className="p-4">
                          <div className="flex items-center gap-4">
                            {/* Thumbnail portada 48x48: imagen > video > placeholder (gradiente + icono) */}
                            <div className="relative w-12 h-12 shrink-0 rounded-md overflow-hidden bg-gradient-to-br from-zinc-800 to-zinc-700/90 border border-zinc-700/50">
                              {/* Placeholder siempre debajo: gradiente + icono */}
                              <span className="absolute inset-0 flex items-center justify-center text-zinc-500" aria-hidden>
                                {type.cover_media_type === "video" ? (
                                  <Video className="h-5 w-5" />
                                ) : (
                                  <ImageIcon className="h-5 w-5" />
                                )}
                              </span>
                              {type.cover_image_url?.trim() ? (
                                <img
                                  src={type.cover_image_url}
                                  alt=""
                                  className="relative z-10 block w-full h-12 object-cover"
                                  loading="lazy"
                                  onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                  }}
                                />
                              ) : type.cover_video_url?.trim() ? (
                                <video
                                  src={type.cover_video_url}
                                  className="relative z-10 block w-full h-12 object-cover"
                                  muted
                                  autoPlay
                                  loop
                                  playsInline
                                  preload="auto"
                                />
                              ) : null}
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
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
                                  {type.paquetes?.length ?? type._count?.paquetes ?? 0} paquete(s)
                                </span>
                                {type._count?.eventos !== undefined && (
                                  <span>
                                    {type._count.eventos} evento(s)
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0 self-center">
                              <button
                                onClick={() => {
                                  setEnrichedModalTipo(type);
                                  setEnrichedModalOpen(true);
                                }}
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
                        </ZenCardContent>
                      </ZenCard>
                    ))}
                  </div>
                )}
            </div>
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

      <TipoEventoEnrichedModal
        isOpen={enrichedModalOpen}
        onClose={() => {
          setEnrichedModalOpen(false);
          setEnrichedModalTipo(undefined);
        }}
        onSuccess={handleEnrichedSuccess}
        studioSlug={studioSlug}
        tipoEvento={enrichedModalTipo}
        zIndex={10060}
      />

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
