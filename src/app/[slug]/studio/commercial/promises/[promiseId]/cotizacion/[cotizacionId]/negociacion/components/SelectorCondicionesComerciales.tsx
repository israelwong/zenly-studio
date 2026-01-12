'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, X } from 'lucide-react';
import { ZenInput, ZenButton } from '@/components/ui/zen';
import { toast } from 'sonner';
import { obtenerCondicionesComerciales } from '@/lib/actions/studio/config/condiciones-comerciales.actions';
import type { CondicionComercial, CondicionComercialTemporal } from '@/lib/utils/negociacion-calc';

interface SelectorCondicionesComercialesProps {
  studioSlug: string;
  condicionSeleccionada: string | null;
  condicionTemporal: CondicionComercialTemporal | null;
  onCondicionChange: (
    condicionId: string | null,
    condicionTemporal: CondicionComercialTemporal | null,
    condicionCompleta?: CondicionComercial | null
  ) => void;
  onCondicionesLoaded?: (condiciones: Array<{
    id: string;
    name: string;
    description: string | null;
    discount_percentage: number | null;
    advance_percentage: number | null;
    advance_type: string | null;
    advance_amount: number | null;
    metodo_pago_id: string | null;
  }>) => void;
}

export function SelectorCondicionesComerciales({
  studioSlug,
  condicionSeleccionada,
  condicionTemporal,
  onCondicionChange,
  onCondicionesLoaded,
}: SelectorCondicionesComercialesProps) {
  const [crearTemporal, setCrearTemporal] = useState(false);
  const [condicionesComerciales, setCondicionesComerciales] = useState<
    Array<{
      id: string;
      name: string;
      description: string | null;
      discount_percentage: number | null;
      advance_percentage: number | null;
      advance_type: string | null;
      advance_amount: number | null;
      metodo_pago_id: string | null;
    }>
  >([]);
  const [loadingCondiciones, setLoadingCondiciones] = useState(true);
  const [formTemporal, setFormTemporal] = useState<CondicionComercialTemporal>({
    name: '',
    description: '',
    discount_percentage: null,
    advance_percentage: null,
    advance_type: 'percentage',
    advance_amount: null,
    metodo_pago_id: null,
    is_temporary: true,
  });
  const hasNotifiedRef = useRef(false);

  // Cargar condiciones comerciales
  const loadCondiciones = useCallback(async () => {
    try {
      setLoadingCondiciones(true);
      const result = await obtenerCondicionesComerciales(studioSlug);

      if (result.success && result.data) {
        const condicionesMapeadas = result.data.map((c) => ({
          id: c.id,
          name: c.name,
          description: c.description,
          discount_percentage: c.discount_percentage,
          advance_percentage: c.advance_percentage,
          advance_type: c.advance_type,
          advance_amount: c.advance_amount,
          metodo_pago_id: null,
        }));
        setCondicionesComerciales(condicionesMapeadas);
        onCondicionesLoaded?.(condicionesMapeadas);
      }
    } catch (error) {
      console.error('Error loading condiciones:', error);
      toast.error('Error al cargar condiciones comerciales');
    } finally {
      setLoadingCondiciones(false);
    }
  }, [studioSlug]);

  useEffect(() => {
    loadCondiciones();
  }, [loadCondiciones]);

  // Cuando se cargan las condiciones y hay una seleccionada, notificar al padre
  useEffect(() => {
    const tieneCondicionTemporal = condicionTemporal !== null;
    if (condicionesComerciales.length > 0 && condicionSeleccionada && !tieneCondicionTemporal && !hasNotifiedRef.current) {
      const condicion = condicionesComerciales.find((c) => c.id === condicionSeleccionada);
      if (condicion) {
        const condicionCompleta: CondicionComercial = {
          id: condicion.id,
          name: condicion.name,
          description: condicion.description,
          discount_percentage: condicion.discount_percentage,
          advance_percentage: condicion.advance_percentage,
          advance_type: condicion.advance_type,
          advance_amount: condicion.advance_amount,
          metodo_pago_id: condicion.metodo_pago_id,
        };
        onCondicionChange(condicionSeleccionada, null, condicionCompleta);
        hasNotifiedRef.current = true;
      }
    }
    // Reset cuando cambia la condición seleccionada
    if (!condicionSeleccionada) {
      hasNotifiedRef.current = false;
    }
  }, [condicionesComerciales.length, condicionSeleccionada, condicionTemporal === null]);

  const handleSelectCondicion = (condicionId: string) => {
    if (condicionId === '') {
      onCondicionChange(null, null, null);
      setCrearTemporal(false);
    } else {
      const condicion = condicionesComerciales.find((c) => c.id === condicionId);
      const condicionCompleta: CondicionComercial | null = condicion ? {
        id: condicion.id,
        name: condicion.name,
        description: condicion.description,
        discount_percentage: condicion.discount_percentage,
        advance_percentage: condicion.advance_percentage,
        advance_type: condicion.advance_type,
        advance_amount: condicion.advance_amount,
        metodo_pago_id: condicion.metodo_pago_id,
      } : null;
      onCondicionChange(condicionId, null, condicionCompleta);
      setCrearTemporal(false);
    }
  };

  const handleCrearTemporal = () => {
    setCrearTemporal(true);
    onCondicionChange(null, null, null);
  };

  const handleGuardarTemporal = () => {
    if (!formTemporal.name.trim()) {
      toast.error('El nombre es requerido');
      return;
    }

    onCondicionChange(null, formTemporal, null);
    setCrearTemporal(false);
  };

  const handleCancelarTemporal = () => {
    setCrearTemporal(false);
    setFormTemporal({
      name: '',
      description: '',
      discount_percentage: null,
      advance_percentage: null,
      advance_type: 'percentage',
      advance_amount: null,
      metodo_pago_id: null,
      is_temporary: true,
    });
  };

  return (
    <div className="bg-zinc-800/50 rounded-lg p-4 space-y-4">
      <div>
        <h4 className="text-sm font-semibold text-white mb-1">
          Condiciones Comerciales
        </h4>
        <p className="text-xs text-zinc-400 mb-3">
          Aplica condiciones existentes o crea una especial para esta negociación
        </p>
      </div>

      {!crearTemporal ? (
        <>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">
              Condición existente
            </label>
            <select
              className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={condicionSeleccionada || ''}
              onChange={(e) => handleSelectCondicion(e.target.value)}
              disabled={loadingCondiciones}
            >
              <option value="">Ninguna</option>
              {condicionesComerciales.map((condicion) => (
                <option key={condicion.id} value={condicion.id}>
                  {condicion.name}
                  {condicion.discount_percentage
                    ? ` (${condicion.discount_percentage}% desc.)`
                    : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-zinc-700" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-zinc-800/50 px-2 text-zinc-500">O</span>
            </div>
          </div>

          <ZenButton
            variant="outline"
            onClick={handleCrearTemporal}
            icon={Plus}
            iconPosition="left"
            className="w-full"
          >
            Crear condición especial
          </ZenButton>

          {condicionTemporal && (
            <div className="p-3 bg-emerald-950/20 border border-emerald-800/30 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-emerald-400">
                    {condicionTemporal.name}
                  </p>
                  {condicionTemporal.discount_percentage && (
                    <p className="text-xs text-zinc-400 mt-1">
                      Descuento: {condicionTemporal.discount_percentage}%
                    </p>
                  )}
                </div>
                <button
                  onClick={() => onCondicionChange(null, null, null)}
                  className="text-zinc-400 hover:text-zinc-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-zinc-300">
              Nueva condición temporal
            </h4>
            <button
              onClick={handleCancelarTemporal}
              className="text-zinc-400 hover:text-zinc-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <ZenInput
            label="Nombre"
            value={formTemporal.name}
            onChange={(e) =>
              setFormTemporal((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder="Ej: Oferta Especial Enero"
            required
          />

          <ZenInput
            label="Descripción (opcional)"
            value={formTemporal.description || ''}
            onChange={(e) =>
              setFormTemporal((prev) => ({
                ...prev,
                description: e.target.value,
              }))
            }
            placeholder="Descripción de la condición"
          />

          <div className="grid grid-cols-2 gap-4">
            <ZenInput
              label="Descuento (%)"
              type="number"
              value={formTemporal.discount_percentage?.toString() || ''}
              onChange={(e) =>
                setFormTemporal((prev) => ({
                  ...prev,
                  discount_percentage: e.target.value
                    ? parseFloat(e.target.value)
                    : null,
                }))
              }
              placeholder="0"
              min="0"
              max="100"
            />

            <ZenInput
              label="Anticipo (%)"
              type="number"
              value={formTemporal.advance_percentage?.toString() || ''}
              onChange={(e) =>
                setFormTemporal((prev) => ({
                  ...prev,
                  advance_percentage: e.target.value
                    ? parseFloat(e.target.value)
                    : null,
                }))
              }
              placeholder="0"
              min="0"
              max="100"
            />
          </div>

          <div className="p-3 bg-yellow-950/20 border border-yellow-800/30 rounded-lg">
            <p className="text-xs text-yellow-400">
              ⚠️ Esta condición solo aplica a esta promesa y no se guarda como
              general
            </p>
          </div>

          <div className="flex gap-2">
            <ZenButton
              variant="primary"
              onClick={handleGuardarTemporal}
              className="flex-1"
            >
              Guardar condición
            </ZenButton>
            <ZenButton
              variant="outline"
              onClick={handleCancelarTemporal}
              className="flex-1"
            >
              Cancelar
            </ZenButton>
          </div>
        </div>
      )}
    </div>
  );
}
