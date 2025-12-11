"use client";

import { useState, useEffect } from "react";
import { ZenButton, ZenBadge } from "@/components/ui/zen";
import { TipoEventoQuickAddModal } from "./TipoEventoQuickAddModal";
import { TipoEventoManagementModal } from "./TipoEventoManagementModal";
import { obtenerTiposEvento } from "@/lib/actions/studio/negocio/tipos-evento.actions";
import type { TipoEventoData } from "@/lib/actions/schemas/tipos-evento-schemas";
import { Plus, Loader2, Settings } from "lucide-react";
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
  const [showManagement, setShowManagement] = useState(false);

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
          <span className="text-red-400">*</span>
          {showBadge && (
            <div className="inline-flex items-center rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-400">
              Recomendado
            </div>
          )}
        </label>
        {eventTypes.length > 0 && (
          <ZenButton
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowManagement(true)}
            className="h-7 text-xs"
          >
            <Settings className="h-3 w-3 mr-1" />
            Gestionar
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
          {/* Contenedor con scroll vertical - muestra 3.5 cards (58px por card + 8px gap) */}
          <div className="max-h-[215px] overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900">
            {/* Lista de tipos de evento */}
            {eventTypes.map((type) => {
              const isSelected = selectedEventTypeId === type.id;
              const packagesCount = type.paquetes?.length || 0;

              return (
                <div
                  key={type.id}
                  onClick={() => onChange(type.id)}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${isSelected
                    ? "bg-emerald-500/10 border-emerald-500/30 ring-1 ring-emerald-500/20"
                    : "bg-zinc-900 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50"
                    }`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`w-2 h-2 rounded-full ${isSelected ? "bg-emerald-500" : "bg-zinc-700"
                      }`} />
                    <span className={`text-sm font-medium ${isSelected ? "text-emerald-400" : "text-zinc-300"
                      }`}>
                      {type.nombre}
                    </span>
                  </div>
                  {packagesCount > 0 && (
                    <span className="px-2 py-0.5 text-xs font-medium text-zinc-400 bg-zinc-800/50 border border-zinc-700/50 rounded-full whitespace-nowrap">
                      {packagesCount} {packagesCount === 1 ? 'paquete' : 'paquetes'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

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

      {/* Management Modal */}
      {showManagement && (
        <TipoEventoManagementModal
          isOpen={showManagement}
          onClose={() => setShowManagement(false)}
          studioSlug={studioSlug}
          onUpdate={(updatedTypes) => {
            // Actualizar lista local sin recargar desde servidor
            if (updatedTypes) {
              const activeTypes = updatedTypes.filter(t => t.status === "active");
              setEventTypes(activeTypes);
            }
          }}
        />
      )}
    </div>
  );
}
