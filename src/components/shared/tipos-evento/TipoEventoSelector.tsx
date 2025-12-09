"use client";

import { useState, useEffect } from "react";
import { ZenButton, ZenBadge } from "@/components/ui/zen";
import { TipoEventoQuickAddModal } from "./TipoEventoQuickAddModal";
import { obtenerTiposEvento } from "@/lib/actions/studio/negocio/tipos-evento.actions";
import type { TipoEventoData } from "@/lib/actions/schemas/tipos-evento-schemas";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface TipoEventoSelectorProps {
  studioSlug: string;
  selectedEventTypeId: string | null;
  onChange: (eventTypeId: string | null) => void;
  label?: string;
  hint?: string;
  showBadge?: boolean;
}

/**
 * TipoEventoSelector - Selector simple de tipo de evento único
 * Para uso en formularios de portfolios, posts, etc.
 */
export function TipoEventoSelector({
  studioSlug,
  selectedEventTypeId,
  onChange,
  label = "Tipo de Evento",
  hint = "Los portfolios categorizados son más fáciles de encontrar y reciben más visitas",
  showBadge = true,
}: TipoEventoSelectorProps) {
  const [eventTypes, setEventTypes] = useState<TipoEventoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  useEffect(() => {
    loadEventTypes();
  }, [studioSlug]);

  const loadEventTypes = async () => {
    setLoading(true);
    try {
      const result = await obtenerTiposEvento(studioSlug);
      if (result.success && result.data) {
        const activeTypes = result.data.filter(t => t.status === "active");
        setEventTypes(activeTypes);
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

  const handleQuickAddSuccess = (newType: TipoEventoData) => {
    setEventTypes([...eventTypes, newType]);
    onChange(newType.id);
    toast.success(`Tipo de evento "${newType.nombre}" creado`);
    setShowQuickAdd(false);
  };

  if (loading) {
    return (
      <div className="flex items-center py-3">
        <Loader2 className="h-4 w-4 text-zinc-500 animate-spin mr-2" />
        <span className="text-sm text-zinc-500">Cargando tipos de evento...</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Label */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
          {label}
          {showBadge && (
            <div className="inline-flex items-center rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-400">
              Recomendado
            </div>
          )}
        </label>
        {eventTypes.length > 0 && (
          <ZenButton
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowQuickAdd(true)}
            className="h-7 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Agregar tipo
          </ZenButton>
        )}
      </div>

      {/* Selector */}
      {eventTypes.length === 0 ? (
        <div className="border border-zinc-800 rounded-lg p-4 text-center">
          <p className="text-sm text-zinc-400 mb-3">
            No tienes tipos de evento creados
          </p>
          <ZenButton
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowQuickAdd(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Crear primer tipo de evento
          </ZenButton>
        </div>
      ) : (
        <div className="space-y-2">
          <select
            value={selectedEventTypeId || ""}
            onChange={(e) => onChange(e.target.value || null)}
            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-md text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
          >
            <option value="">Sin categoría</option>
            {eventTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.nombre}
              </option>
            ))}
          </select>

          {/* Hint */}
          {hint && (
            <p className="text-xs text-zinc-500">
              {hint}
            </p>
          )}
        </div>
      )}

      {/* Quick Add Modal */}
      {showQuickAdd && (
        <TipoEventoQuickAddModal
          isOpen={showQuickAdd}
          onClose={() => setShowQuickAdd(false)}
          onSuccess={handleQuickAddSuccess}
          studioSlug={studioSlug}
        />
      )}
    </div>
  );
}
