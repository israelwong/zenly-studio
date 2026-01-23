"use client";

import { useState, useEffect } from "react";
import { ZenButton, ZenBadge } from "@/components/ui/zen";
import { TipoEventoEnrichedModal } from "./TipoEventoEnrichedModal";
import { TipoEventoManagementModal } from "./TipoEventoManagementModal";
import { obtenerTiposEvento } from "@/lib/actions/studio/negocio/tipos-evento.actions";
import type { TipoEventoData } from "@/lib/actions/schemas/tipos-evento-schemas";
import { Plus, Settings, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface EventTypesManagerProps {
  studioSlug: string;
  selectedTypes: string[];
  onChange: (selectedTypes: string[]) => void;
}

export function EventTypesManager({
  studioSlug,
  selectedTypes,
  onChange,
}: EventTypesManagerProps) {
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

        // Auto-seleccionar tipos que tienen paquetes (solo si no hay selección previa)
        if (selectedTypes.length === 0) {
          const typesWithPackages = activeTypes
            .filter(t => (t.paquetes?.length || 0) > 0)
            .map(t => t.id);

          if (typesWithPackages.length > 0) {
            onChange(typesWithPackages);
          }
        }
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

  const handleToggle = (typeId: string) => {
    if (selectedTypes.includes(typeId)) {
      onChange(selectedTypes.filter(id => id !== typeId));
    } else {
      onChange([...selectedTypes, typeId]);
    }
  };

  const handleQuickAddSuccess = (newType: TipoEventoData) => {
    setEventTypes([...eventTypes, newType]);
    onChange([...selectedTypes, newType.id]);
    toast.success(`Tipo de evento "${newType.nombre}" creado`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 text-zinc-500 animate-spin" />
        <span className="ml-2 text-sm text-zinc-500">Cargando tipos de evento...</span>
      </div>
    );
  }

  if (eventTypes.length === 0) {
    return (
      <div className="border border-zinc-800 rounded-lg p-6 text-center">
        <p className="text-sm text-zinc-400 mb-3">
          No tienes tipos de evento creados
        </p>
        <ZenButton
          variant="outline"
          size="sm"
          onClick={() => setShowQuickAdd(true)}
        >
          <Plus className="h-4 w-4 mr-1" />
          Crear primer tipo de evento
        </ZenButton>

        {showQuickAdd && (
          <TipoEventoEnrichedModal
            isOpen={showQuickAdd}
            onClose={() => {
              setShowQuickAdd(false);
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('close-overlays'));
              }
            }}
            onSuccess={handleQuickAddSuccess}
            studioSlug={studioSlug}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500">
          {selectedTypes.length} de {eventTypes.length} seleccionados
        </span>
        <div className="flex items-center gap-2">
          <ZenButton
            variant="ghost"
            size="sm"
            onClick={() => setShowQuickAdd(true)}
          >
            <Plus className="h-3 w-3 mr-1" />
            Agregar
          </ZenButton>
          <ZenButton
            variant="outline"
            size="sm"
            onClick={() => setShowManagement(true)}
          >
            <Settings className="h-3 w-3 mr-1" />
            Gestionar
          </ZenButton>
        </div>
      </div>

      {/* Lista de tipos */}
      <div className="space-y-2">
        {eventTypes.map((type) => {
          const isSelected = selectedTypes.includes(type.id);
          const packagesCount = type.paquetes?.length || 0;

          return (
            <div
              key={type.id}
              onClick={() => handleToggle(type.id)}
              className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${isSelected
                ? "bg-emerald-500/10 border-emerald-500/30"
                : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
                }`}
            >
              <label className="flex items-center gap-3 flex-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleToggle(type.id)}
                  className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-zinc-950"
                />
                <span className={`text-sm font-medium ${isSelected ? "text-emerald-400" : "text-zinc-300"
                  }`}>
                  {type.nombre}
                </span>
              </label>

              {/* Indicador de paquetes */}
              <div className="flex items-center gap-2">
                {packagesCount > 0 ? (
                  <ZenBadge variant="secondary" size="sm">
                    {packagesCount} {packagesCount === 1 ? "paquete" : "paquetes"}
                  </ZenBadge>
                ) : (
                  <ZenBadge variant="destructive" size="sm">
                    Sin paquetes
                  </ZenBadge>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Enriquecido */}
      {showQuickAdd && (
        <TipoEventoEnrichedModal
          isOpen={showQuickAdd}
          onClose={() => {
            setShowQuickAdd(false);
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('close-overlays'));
            }
          }}
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
