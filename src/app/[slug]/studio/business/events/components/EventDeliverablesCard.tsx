'use client';

import React, { useState, useEffect } from 'react';
import { Plus, ExternalLink, Image, Video, FileText, Package, Download, Trash2, Edit2, CheckCircle2, Clock, Link2 } from 'lucide-react';
import {
  ZenCard,
  ZenCardHeader,
  ZenCardTitle,
  ZenCardContent,
  ZenButton,
  ZenInput,
  ZenSelect,
  ZenConfirmModal,
} from '@/components/ui/zen';
import {
  obtenerEntregables,
  crearEntregable,
  actualizarEntregable,
  eliminarEntregable,
  type Deliverable,
} from '@/lib/actions/studio/business/events/deliverables.actions';
import { DeliverableType } from '@prisma/client';
import { toast } from 'sonner';
import { formatDateTime } from '@/lib/actions/utils/formatting';

interface EventDeliverablesCardProps {
  studioSlug: string;
  eventId: string;
  onUpdated?: () => void;
}

const DELIVERABLE_TYPE_LABELS: Record<DeliverableType, string> = {
  PHOTO_GALLERY: 'Galería de Fotos',
  VIDEO_HIGHLIGHTS: 'Video Highlights',
  FULL_VIDEO: 'Video Completo',
  ALBUM: 'Álbum',
  DIGITAL_DOWNLOAD: 'Descarga Digital',
  OTHER: 'Otro',
};

const DELIVERABLE_TYPE_ICONS: Record<DeliverableType, React.ComponentType<{ className?: string }>> = {
  PHOTO_GALLERY: Image,
  VIDEO_HIGHLIGHTS: Video,
  FULL_VIDEO: Video,
  ALBUM: Package,
  DIGITAL_DOWNLOAD: Download,
  OTHER: FileText,
};


export function EventDeliverablesCard({
  studioSlug,
  eventId,
  onUpdated,
}: EventDeliverablesCardProps) {
  const [entregables, setEntregables] = useState<Deliverable[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    type: 'PHOTO_GALLERY' as DeliverableType,
    name: '',
    description: '',
    file_url: '',
  });

  useEffect(() => {
    loadEntregables();
  }, [eventId]);

  const loadEntregables = async () => {
    try {
      setLoading(true);
      const result = await obtenerEntregables(studioSlug, eventId);
      if (result.success && result.data) {
        setEntregables(result.data);
      } else {
        toast.error(result.error || 'Error al cargar entregables');
      }
    } catch (error) {
      console.error('Error loading entregables:', error);
      toast.error('Error al cargar entregables');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForm = (entregable?: Deliverable) => {
    if (entregable) {
      setEditingId(entregable.id);
      setFormData({
        type: entregable.type,
        name: entregable.name,
        description: entregable.description || '',
        file_url: entregable.file_url || '',
      });
    } else {
      setEditingId(null);
      setFormData({
        type: 'PHOTO_GALLERY',
        name: '',
        description: '',
        file_url: '',
      });
    }
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setFormData({
      type: 'PHOTO_GALLERY',
      name: '',
      description: '',
      file_url: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('El nombre es requerido');
      return;
    }

    setIsSaving(true);
    try {
      if (editingId) {
        const result = await actualizarEntregable(studioSlug, {
          id: editingId,
          name: formData.name,
          description: formData.description || undefined,
          file_url: formData.file_url || undefined,
        });
        if (result.success) {
          toast.success('Entregable actualizado');
          handleCloseForm();
          loadEntregables();
          onUpdated?.();
        } else {
          toast.error(result.error || 'Error al actualizar entregable');
        }
      } else {
        const result = await crearEntregable(studioSlug, {
          event_id: eventId,
          type: formData.type,
          name: formData.name,
          description: formData.description || undefined,
          file_url: formData.file_url || undefined,
        });
        if (result.success) {
          toast.success('Entregable creado');
          handleCloseForm();
          loadEntregables();
          onUpdated?.();
        } else {
          toast.error(result.error || 'Error al crear entregable');
        }
      }
    } catch (error) {
      console.error('Error saving entregable:', error);
      toast.error('Error al guardar entregable');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      const result = await eliminarEntregable(studioSlug, deletingId);
      if (result.success) {
        toast.success('Entregable eliminado');
        setIsDeleteModalOpen(false);
        setDeletingId(null);
        loadEntregables();
        onUpdated?.();
      } else {
        toast.error(result.error || 'Error al eliminar entregable');
      }
    } catch (error) {
      console.error('Error deleting entregable:', error);
      toast.error('Error al eliminar entregable');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMarkDelivered = async (id: string) => {
    try {
      const result = await actualizarEntregable(studioSlug, {
        id,
        delivered_at: new Date(),
      });
      if (result.success) {
        toast.success('Marcado como entregado');
        loadEntregables();
        onUpdated?.();
      } else {
        toast.error(result.error || 'Error al actualizar');
      }
    } catch (error) {
      console.error('Error marking delivered:', error);
      toast.error('Error al marcar como entregado');
    }
  };

  if (loading) {
    return (
      <ZenCard>
        <ZenCardHeader>
          <ZenCardTitle>Entregables</ZenCardTitle>
        </ZenCardHeader>
        <ZenCardContent>
          <div className="text-center py-8 text-zinc-400">Cargando...</div>
        </ZenCardContent>
      </ZenCard>
    );
  }

  return (
    <>
      <ZenCard>
        <ZenCardHeader>
          <div className="flex items-center justify-between">
            <ZenCardTitle className="text-base">Entregables</ZenCardTitle>
            {entregables.length === 0 && (
              <ZenButton
                variant="ghost"
                size="sm"
                onClick={() => handleOpenForm()}
                className="gap-1.5 h-7"
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="text-xs">Agregar</span>
              </ZenButton>
            )}
          </div>
        </ZenCardHeader>
        <ZenCardContent className="py-3">
          {entregables.length === 0 ? (
            <div className="text-center py-4">
              <Package className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-xs text-zinc-500 mb-1">No hay entregable</p>
              <p className="text-xs text-zinc-600">
                Agrega un enlace a tus entregables
              </p>
            </div>
          ) : (
            <div>
              {entregables.slice(0, 1).map((entregable) => {
                const TypeIcon = DELIVERABLE_TYPE_ICONS[entregable.type];

                return (
                  <div
                    key={entregable.id}
                    className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-800"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <div className="p-1.5 bg-blue-600/20 rounded flex-shrink-0">
                          <TypeIcon className="h-4 w-4 text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <h4 className="font-medium text-zinc-200 text-xs truncate">
                              {entregable.name}
                            </h4>
                            {entregable.delivered_at && (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                            )}
                          </div>
                          {entregable.file_url && (
                            <a
                              href={entregable.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                            >
                              <Link2 className="h-3 w-3" />
                              <span>Ver enlace</span>
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        {!entregable.delivered_at && (
                          <ZenButton
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkDelivered(entregable.id)}
                            className="h-7 w-7 p-0"
                            title="Marcar como entregado"
                          >
                            <Clock className="h-3.5 w-3.5 text-zinc-400" />
                          </ZenButton>
                        )}
                        <ZenButton
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenForm(entregable)}
                          className="h-7 w-7 p-0"
                        >
                          <Edit2 className="h-3.5 w-3.5 text-zinc-400" />
                        </ZenButton>
                        <ZenButton
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDeletingId(entregable.id);
                            setIsDeleteModalOpen(true);
                          }}
                          className="h-7 w-7 p-0 text-zinc-400 hover:text-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </ZenButton>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ZenCardContent>
      </ZenCard>

      {/* Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-zinc-900 rounded-lg border border-zinc-800 w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-zinc-200 mb-4">
              {editingId ? 'Editar Entregable' : 'Nuevo Entregable'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!editingId && (
                <div>
                  <label className="text-sm font-medium text-zinc-300 mb-1.5 block">
                    Tipo
                  </label>
                  <ZenSelect
                    value={formData.type}
                    onValueChange={(value) =>
                      setFormData({ ...formData, type: value as DeliverableType })
                    }
                    options={Object.entries(DELIVERABLE_TYPE_LABELS).map(([value, label]) => ({
                      value,
                      label,
                    }))}
                  />
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-zinc-300 mb-1.5 block">
                  Nombre *
                </label>
                <ZenInput
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Galería de fotos - Ceremonia"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-300 mb-1.5 block">
                  Descripción
                </label>
                <ZenInput
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Descripción opcional"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-300 mb-1.5 block">
                  Enlace (URL)
                </label>
                <ZenInput
                  type="url"
                  value={formData.file_url}
                  onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                  placeholder="https://drive.google.com/..."
                />
                <p className="text-xs text-zinc-500 mt-1.5">
                  Enlace a Google Drive, Dropbox, WeTransfer u otro servicio
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <ZenButton
                  type="button"
                  variant="ghost"
                  onClick={handleCloseForm}
                  className="flex-1"
                  disabled={isSaving}
                >
                  Cancelar
                </ZenButton>
                <ZenButton type="submit" className="flex-1" loading={isSaving}>
                  {editingId ? 'Actualizar' : 'Crear'}
                </ZenButton>
              </div>
            </form>
          </div>
        </div>
      )}

      <ZenConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!isDeleting) {
            setIsDeleteModalOpen(false);
            setDeletingId(null);
          }
        }}
        onConfirm={handleDelete}
        title="Eliminar Entregable"
        description="¿Estás seguro de eliminar este entregable? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="destructive"
        loading={isDeleting}
      />
    </>
  );
}
