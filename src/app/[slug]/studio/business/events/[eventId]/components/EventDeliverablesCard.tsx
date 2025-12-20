'use client';

import React, { useState, useEffect } from 'react';
import { Plus, ExternalLink, Link2, MoreVertical, Edit, Trash2 } from 'lucide-react';
import {
  ZenCard,
  ZenCardHeader,
  ZenCardTitle,
  ZenCardContent,
  ZenButton,
  ZenInput,
  ZenConfirmModal,
  ZenDropdownMenu,
  ZenDropdownMenuTrigger,
  ZenDropdownMenuContent,
  ZenDropdownMenuItem,
  ZenDropdownMenuSeparator,
} from '@/components/ui/zen';
import {
  obtenerEntregables,
  crearEntregable,
  actualizarEntregable,
  eliminarEntregable,
  type Deliverable,
} from '@/lib/actions/studio/business/events/deliverables.actions';
import { toast } from 'sonner';

interface EventDeliverablesCardProps {
  studioSlug: string;
  eventId: string;
  onUpdated?: () => void;
}

export function EventDeliverablesCard({
  studioSlug,
  eventId,
  onUpdated,
}: EventDeliverablesCardProps) {
  const [entregables, setEntregables] = useState<Deliverable[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
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
        name: entregable.name,
        description: entregable.description || '',
        file_url: entregable.file_url || '',
      });
    } else {
      setEditingId(null);
      setFormData({
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
        // Optimistic update para edición
        const originalEntregables = [...entregables];
        setEntregables(prev => prev.map(item =>
          item.id === editingId
            ? { ...item, name: formData.name, description: formData.description || null, file_url: formData.file_url || null }
            : item
        ));

        const result = await actualizarEntregable(studioSlug, {
          id: editingId,
          name: formData.name,
          description: formData.description || undefined,
          file_url: formData.file_url || undefined,
        });

        if (result.success && result.data) {
          // Actualizar con los datos del servidor
          setEntregables(prev => prev.map(item =>
            item.id === editingId ? result.data! : item
          ));
          toast.success('Entregable actualizado');
          handleCloseForm();
          onUpdated?.();
        } else {
          // Rollback en caso de error
          setEntregables(originalEntregables);
          toast.error(result.error || 'Error al actualizar entregable');
        }
      } else {
        const result = await crearEntregable(studioSlug, {
          event_id: eventId,
          type: 'OTHER',
          name: formData.name,
          description: formData.description || undefined,
          file_url: formData.file_url || undefined,
        });

        if (result.success && result.data) {
          // Agregar el nuevo entregable al estado local
          setEntregables(prev => [...prev, result.data!]);
          toast.success('Entregable creado');
          handleCloseForm();
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

    // Optimistic update para eliminación
    const originalEntregables = [...entregables];
    setEntregables(prev => prev.filter(item => item.id !== deletingId));
    setIsDeleteModalOpen(false);
    const idToDelete = deletingId;
    setDeletingId(null);

    setIsDeleting(true);
    try {
      const result = await eliminarEntregable(studioSlug, idToDelete);
      if (result.success) {
        toast.success('Entregable eliminado');
        onUpdated?.();
      } else {
        // Rollback en caso de error
        setEntregables(originalEntregables);
        toast.error(result.error || 'Error al eliminar entregable');
      }
    } catch (error) {
      console.error('Error deleting entregable:', error);
      // Rollback en caso de error
      setEntregables(originalEntregables);
      toast.error('Error al eliminar entregable');
    } finally {
      setIsDeleting(false);
    }
  };


  if (loading) {
    return (
      <ZenCard>
        <ZenCardHeader className="border-b border-zinc-800 py-2 px-3 shrink-0">
          <div className="flex items-center justify-between animate-pulse">
            <div className="h-4 w-20 bg-zinc-800 rounded" />
            <div className="h-6 w-20 bg-zinc-800 rounded" />
          </div>
        </ZenCardHeader>
        <ZenCardContent className="p-4">
          <div className="space-y-3 animate-pulse">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-800">
                <div className="h-4 w-32 bg-zinc-800 rounded mb-2" />
                <div className="h-3 w-full bg-zinc-800 rounded mb-1.5" />
                <div className="h-3 w-24 bg-zinc-800 rounded" />
              </div>
            ))}
          </div>
        </ZenCardContent>
      </ZenCard>
    );
  }

  const totalEntregables = entregables.length;

  return (
    <>
      <ZenCard>
        <ZenCardHeader className="border-b border-zinc-800 py-2 px-3 shrink-0">
          <div className="flex items-center justify-between">
            <ZenCardTitle className="text-sm font-medium flex items-center pt-1">
              Entregables
            </ZenCardTitle>
            <ZenButton
              variant="ghost"
              size="sm"
              onClick={() => handleOpenForm()}
              className="h-6 px-2 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/20"
            >
              <Plus className="h-3 w-3 mr-1" />
              Agregar
            </ZenButton>
          </div>
        </ZenCardHeader>
        <ZenCardContent className="p-4">
          {totalEntregables === 0 ? (
            <div className="text-center py-4">
              <p className="text-xs text-zinc-500 mb-2">
                No hay entregables registrados
              </p>
              <p className="text-xs text-zinc-600">
                Agrega un enlace a tus entregables
              </p>
            </div>
          ) : (
            <div className={`space-y-2 ${totalEntregables > 5 ? 'max-h-[400px] overflow-y-auto' : ''}`}>
              {entregables.map((entregable) => {
                return (
                  <div
                    key={entregable.id}
                    className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-800"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-zinc-200 text-xs truncate mb-1">
                          {entregable.name}
                        </h4>
                        {entregable.description && (
                          <p className="text-xs text-zinc-400 mb-1.5 line-clamp-2">
                            {entregable.description}
                          </p>
                        )}
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
                      <div className="shrink-0">
                        <ZenDropdownMenu
                          open={openMenuId === entregable.id}
                          onOpenChange={(open) => setOpenMenuId(open ? entregable.id : null)}
                        >
                          <ZenDropdownMenuTrigger asChild>
                            <ZenButton
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-zinc-400 hover:text-zinc-300"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </ZenButton>
                          </ZenDropdownMenuTrigger>
                          <ZenDropdownMenuContent align="end">
                            <ZenDropdownMenuItem
                              onClick={() => {
                                handleOpenForm(entregable);
                                setOpenMenuId(null);
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </ZenDropdownMenuItem>
                            <ZenDropdownMenuSeparator />
                            <ZenDropdownMenuItem
                              onClick={() => {
                                setDeletingId(entregable.id);
                                setIsDeleteModalOpen(true);
                                setOpenMenuId(null);
                              }}
                              className="text-red-400 focus:text-red-300 focus:bg-red-950/20"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
                            </ZenDropdownMenuItem>
                          </ZenDropdownMenuContent>
                        </ZenDropdownMenu>
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
