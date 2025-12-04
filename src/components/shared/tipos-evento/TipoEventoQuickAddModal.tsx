"use client";

import { useState } from "react";
import { ZenInput, ZenButton } from "@/components/ui/zen";
import { crearTipoEvento, actualizarTipoEvento } from "@/lib/actions/studio/negocio/tipos-evento.actions";
import type { TipoEventoData } from "@/lib/actions/schemas/tipos-evento-schemas";
import { toast } from "sonner";

interface TipoEventoQuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newTipoEvento: TipoEventoData) => void;
  studioSlug: string;
  tipoEvento?: TipoEventoData; // Para edición
}

export function TipoEventoQuickAddModal({
  isOpen,
  onClose,
  onSuccess,
  studioSlug,
  tipoEvento,
}: TipoEventoQuickAddModalProps) {
  const [loading, setLoading] = useState(false);
  const [nombre, setNombre] = useState(tipoEvento?.nombre || "");
  const [error, setError] = useState("");
  const isEditMode = !!tipoEvento;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nombre.trim()) {
      setError("El nombre es requerido");
      return;
    }

    setLoading(true);
    setError("");

    try {
      let result;

      if (isEditMode && tipoEvento) {
        // Actualizar tipo existente
        result = await actualizarTipoEvento(studioSlug, tipoEvento.id, {
          nombre: nombre.trim(),
        });
      } else {
        // Crear nuevo tipo
        result = await crearTipoEvento(studioSlug, {
          nombre: nombre.trim(),
          status: "active",
        });
      }

      if (result.success && result.data) {
        onSuccess(result.data);
        handleClose();
      } else {
        setError(result.error || `Error al ${isEditMode ? 'actualizar' : 'crear'} tipo de evento`);
      }
    } catch (err) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} event type:`, err);
      setError(`Error inesperado al ${isEditMode ? 'actualizar' : 'crear'} tipo de evento`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setNombre("");
    setError("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          {isEditMode ? 'Editar' : 'Agregar'} Tipo de Evento
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <ZenInput
            label="Nombre del tipo de evento"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Boda, XV Años, Corporativo"
            error={error}
            disabled={loading}
            autoFocus
          />

          <div className="flex items-center gap-2 justify-end">
            <ZenButton
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancelar
            </ZenButton>
            <ZenButton
              type="submit"
              loading={loading}
              disabled={!nombre.trim() || loading}
            >
              {isEditMode ? 'Actualizar' : 'Crear'}
            </ZenButton>
          </div>
        </form>
      </div>
    </div>
  );
}
