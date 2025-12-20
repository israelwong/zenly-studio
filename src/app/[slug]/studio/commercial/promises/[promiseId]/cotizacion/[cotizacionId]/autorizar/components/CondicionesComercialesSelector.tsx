'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Settings2, Plus } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenButton } from '@/components/ui/zen';
import { obtenerCondicionesComerciales } from '@/lib/actions/studio/config/condiciones-comerciales.actions';
import { toast } from 'sonner';
import { CondicionesComercialesManager } from '@/components/shared/condiciones-comerciales';

interface CondicionComercial {
  id: string;
  name: string;
  description: string | null;
  discount_percentage: number | null;
  advance_percentage: number | null;
  status: string;
  order: number | null;
}

interface CondicionesComercialesSelectorProps {
  studioSlug: string;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  precioBase: number;
  onMontoChange: (monto: string) => void;
  disabled?: boolean;
}

export function CondicionesComercialesSelector({
  studioSlug,
  selectedId,
  onSelect,
  precioBase,
  onMontoChange,
  disabled = false,
}: CondicionesComercialesSelectorProps) {
  const [condiciones, setCondiciones] = useState<CondicionComercial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showManager, setShowManager] = useState(false);
  const [selectedCondicion, setSelectedCondicion] = useState<CondicionComercial | null>(null);

  const loadCondiciones = useCallback(async () => {
    try {
      setLoading(true);
      const result = await obtenerCondicionesComerciales(studioSlug);

      if (result.success && result.data) {
        setCondiciones(result.data);
      } else {
        toast.error(result.error || 'Error al cargar condiciones comerciales');
      }
    } catch (error) {
      console.error('Error loading condiciones:', error);
      toast.error('Error al cargar condiciones comerciales');
    } finally {
      setLoading(false);
    }
  }, [studioSlug]);

  useEffect(() => {
    loadCondiciones();
  }, [loadCondiciones]);

  useEffect(() => {
    if (selectedId) {
      const condicion = condiciones.find((c) => c.id === selectedId);
      setSelectedCondicion(condicion || null);
    } else {
      setSelectedCondicion(null);
    }
  }, [selectedId, condiciones]);

  useEffect(() => {
    if (selectedCondicion && precioBase > 0) {
      // Calcular monto con descuento aplicado
      let montoFinal = precioBase;
      if (selectedCondicion.discount_percentage) {
        montoFinal = precioBase * (1 - selectedCondicion.discount_percentage / 100);
      }

      onMontoChange(montoFinal.toFixed(2));
    } else if (!selectedCondicion) {
      onMontoChange(precioBase.toString());
    }
  }, [selectedCondicion, precioBase, onMontoChange]);

  const handleSelect = (id: string) => {
    onSelect(id);
  };

  return (
    <>
      <ZenCard variant="outlined">
        <ZenCardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-600/20 rounded-lg">
                <Settings2 className="h-5 w-5 text-purple-400" />
              </div>
              <ZenCardTitle className="text-lg">Condiciones Comerciales</ZenCardTitle>
            </div>
            <ZenButton
              variant="ghost"
              size="sm"
              onClick={() => setShowManager(true)}
              disabled={disabled}
              className="text-zinc-400 hover:text-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Settings2 className="h-4 w-4 mr-2" />
              Gestionar
            </ZenButton>
          </div>
        </ZenCardHeader>
        <ZenCardContent className="space-y-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 border border-zinc-700 rounded-lg bg-zinc-800/30 animate-pulse">
                  <div className="flex items-start gap-3">
                    <div className="h-4 w-4 bg-zinc-700 rounded-full mt-1" />
                    <div className="flex-1 space-y-2">
                      <div className="h-5 w-32 bg-zinc-700 rounded" />
                      <div className="h-4 w-full bg-zinc-700 rounded" />
                      <div className="flex gap-4 mt-2">
                        <div className="h-4 w-24 bg-zinc-700 rounded" />
                        <div className="h-4 w-24 bg-zinc-700 rounded" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : condiciones.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-zinc-400 mb-3">No hay condiciones comerciales disponibles</p>
              <ZenButton
                variant="outline"
                size="sm"
                onClick={() => setShowManager(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Crear primera condición
              </ZenButton>
            </div>
          ) : (
            <div className="space-y-2">
              {condiciones.map((condicion) => (
                <label
                  key={condicion.id}
                  className={`flex items-start gap-3 p-4 border rounded-lg transition-colors ${
                    disabled
                      ? 'cursor-not-allowed opacity-50'
                      : 'cursor-pointer'
                  } ${
                    selectedId === condicion.id
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="condicion-comercial"
                    value={condicion.id}
                    checked={selectedId === condicion.id}
                    onChange={() => handleSelect(condicion.id)}
                    disabled={disabled}
                    className="mt-1 h-4 w-4 text-purple-600 focus:ring-purple-500 focus:ring-offset-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-white">{condicion.name}</div>
                    {condicion.description && (
                      <p className="text-sm text-zinc-400 mt-1">{condicion.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-sm text-zinc-300">
                      {condicion.advance_percentage && (
                        <span>Anticipo: {condicion.advance_percentage}%</span>
                      )}
                      <span>Descuento: {condicion.discount_percentage ?? 0}%</span>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </ZenCardContent>
      </ZenCard>

      <CondicionesComercialesManager
        studioSlug={studioSlug}
        isOpen={showManager}
        onClose={() => setShowManager(false)}
        onRefresh={() => {
          // Recargar condiciones inmediatamente cuando hay cambios
          loadCondiciones();
        }}
      />
    </>
  );
}

