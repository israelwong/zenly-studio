'use client';

import React, { useState, useEffect } from 'react';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { ZenDialog, ZenButton, ZenConfirmModal } from '@/components/ui/zen';
import { getLocationsByStudioSlug, deleteLocationByStudioSlug } from '@/lib/actions/studio/locations/locations.actions';
import { toast } from 'sonner';
import { LocationCreateModal } from './LocationCreateModal';
import type { LocationOption } from './LocationSelector';

interface LocationManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  studioSlug: string;
  onLocationUpdated?: (location: LocationOption) => void;
  onLocationDeleted?: (locationId: string) => void;
  onRefetch?: () => void;
}

export function LocationManagerModal({
  isOpen,
  onClose,
  studioSlug,
  onLocationUpdated,
  onLocationDeleted,
  onRefetch,
}: LocationManagerModalProps) {
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingLocation, setEditingLocation] = useState<LocationOption | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isCreateOrEditOpen = editingLocation !== null || creatingNew;

  useEffect(() => {
    if (!isOpen || !studioSlug) return;
    setLoading(true);
    getLocationsByStudioSlug(studioSlug)
      .then((res) => {
        if (res.success && res.data) setLocations(res.data);
        else setLocations([]);
      })
      .finally(() => setLoading(false));
  }, [isOpen, studioSlug]);

  const handleEditSuccess = (updated: LocationOption) => {
    setLocations((prev) =>
      prev.map((loc) => (loc.id === updated.id ? updated : loc))
    );
    setEditingLocation(null);
    onLocationUpdated?.(updated);
  };

  const handleCreateSuccess = (created: LocationOption) => {
    setLocations((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    setCreatingNew(false);
    onLocationUpdated?.(created);
  };

  const closeCreateOrEdit = () => {
    setEditingLocation(null);
    setCreatingNew(false);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      const res = await deleteLocationByStudioSlug(studioSlug, deletingId);
      if (res.success) {
        setLocations((prev) => prev.filter((loc) => loc.id !== deletingId));
        onLocationDeleted?.(deletingId);
        toast.success('Locación eliminada');
        setDeletingId(null);
        onRefetch?.();
      } else {
        toast.error(res.error ?? 'Error al eliminar');
      }
    } catch {
      toast.error('Error al eliminar locación');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleManagerClose = () => {
    setEditingLocation(null);
    setCreatingNew(false);
    setDeletingId(null);
    onRefetch?.();
    onClose();
  };

  const openCreateModal = () => setCreatingNew(true);

  return (
    <>
      <ZenDialog
        isOpen={isOpen}
        onClose={handleManagerClose}
        title="Gestionar locaciones"
        description="Añade, edita o elimina las locaciones del estudio."
        maxWidth="md"
      >
        <div className="flex flex-col min-h-0 max-h-[60vh]">
          <div className="overflow-y-auto flex-1 min-h-0 pr-1">
            {loading ? (
              <div className="py-6 text-center text-sm text-zinc-500">Cargando…</div>
            ) : locations.length === 0 ? (
              <p className="py-6 text-center text-sm text-zinc-500">No hay locaciones registradas.</p>
            ) : (
              <ul className="space-y-1">
                {locations.map((loc) => (
                  <li
                    key={loc.id}
                    className="flex items-center gap-2 rounded-lg border border-zinc-700/60 bg-zinc-900/40 px-3 py-2.5"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-200 truncate">{loc.name}</p>
                      {loc.address && (
                        <p className="text-xs text-zinc-500 truncate mt-0.5">{loc.address}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditingLocation(loc)}
                        className="p-1.5 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/60 transition-colors"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingId(loc.id)}
                        className="p-1.5 rounded text-zinc-400 hover:text-red-400 hover:bg-zinc-700/60 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="shrink-0 pt-3 mt-3">
            <ZenButton
              type="button"
              variant="outline"
              onClick={openCreateModal}
              className="w-full gap-2 text-zinc-300 border-zinc-600 hover:bg-zinc-800 hover:border-zinc-500"
            >
              <Plus className="h-4 w-4" />
              Registrar locación
            </ZenButton>
          </div>
        </div>
      </ZenDialog>

      <LocationCreateModal
        isOpen={isCreateOrEditOpen}
        onClose={closeCreateOrEdit}
        studioSlug={studioSlug}
        initialName=""
        initialData={editingLocation}
        onSuccess={(loc) => {
          if (editingLocation) {
            handleEditSuccess(loc);
          } else {
            handleCreateSuccess(loc);
          }
        }}
      />

      <ZenConfirmModal
        isOpen={deletingId !== null}
        onClose={() => !isDeleting && setDeletingId(null)}
        onConfirm={handleDeleteConfirm}
        title="Eliminar locación"
        description="¿Eliminar esta locación? Los agendamientos que la usen seguirán mostrando el nombre guardado en el evento."
        confirmText="Eliminar"
        variant="destructive"
        loading={isDeleting}
      />
    </>
  );
}
