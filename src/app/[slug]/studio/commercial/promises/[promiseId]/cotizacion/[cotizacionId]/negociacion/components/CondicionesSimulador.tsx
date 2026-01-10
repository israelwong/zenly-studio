'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ZenCard,
  ZenCardContent,
  ZenCardHeader,
  ZenCardTitle,
  ZenCardDescription,
  ZenButton,
  ZenInput,
} from '@/components/ui/zen';
import { obtenerCondicionesComerciales } from '@/lib/actions/studio/config/condiciones-comerciales.actions';
import { obtenerMetodosPago } from '@/lib/actions/studio/config/metodos-pago.actions';
import { toast } from 'sonner';
import { Plus, X } from 'lucide-react';
import type {
  CondicionComercial,
  CondicionComercialTemporal,
} from '@/lib/utils/negociacion-calc';

interface CondicionesSimuladorProps {
  studioSlug: string;
  condicionSeleccionada: string | null;
  condicionTemporal: CondicionComercialTemporal | null;
  onCondicionChange: (
    condicionId: string | null,
    condicionTemporal: CondicionComercialTemporal | null
  ) => void;
  onCondicionesLoaded: (
    condiciones: Array<{
      id: string;
      name: string;
      description: string | null;
      discount_percentage: number | null;
      advance_percentage: number | null;
      advance_type: string | null;
      advance_amount: number | null;
      metodo_pago_id: string | null;
    }>
  ) => void;
}

interface CondicionComercialDB {
  id: string;
  name: string;
  description: string | null;
  discount_percentage: number | null;
  advance_percentage: number | null;
  advance_type: string | null;
  advance_amount: number | null;
}

interface MetodoPago {
  id: string;
  payment_method_name: string;
}

export function CondicionesSimulador({
  studioSlug,
  condicionSeleccionada,
  condicionTemporal,
  onCondicionChange,
  onCondicionesLoaded,
}: CondicionesSimuladorProps) {
  const [condiciones, setCondiciones] = useState<CondicionComercialDB[]>([]);
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([]);
  const [loading, setLoading] = useState(true);
  const [crearTemporal, setCrearTemporal] = useState(false);
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

  const loadCondiciones = useCallback(async () => {
    try {
      setLoading(true);
      const result = await obtenerCondicionesComerciales(studioSlug);

      if (result.success && result.data) {
        setCondiciones(result.data);
        onCondicionesLoaded(
          result.data.map((c) => ({
            id: c.id,
            name: c.name,
            description: c.description,
            discount_percentage: c.discount_percentage,
            advance_percentage: c.advance_percentage,
            advance_type: c.advance_type,
            advance_amount: c.advance_amount,
            metodo_pago_id: null, // Se obtiene de la relación
          }))
        );
      }
    } catch (error) {
      console.error('Error loading condiciones:', error);
      toast.error('Error al cargar condiciones comerciales');
    } finally {
      setLoading(false);
    }
  }, [studioSlug, onCondicionesLoaded]);

  const loadMetodosPago = useCallback(async () => {
    try {
      const result = await obtenerMetodosPago(studioSlug);
      if (result.success && result.data) {
        setMetodosPago(result.data);
      }
    } catch (error) {
      console.error('Error loading métodos de pago:', error);
    }
  }, [studioSlug]);

  useEffect(() => {
    loadCondiciones();
    loadMetodosPago();
  }, [loadCondiciones, loadMetodosPago]);

  const handleSelectCondicion = (condicionId: string) => {
    if (condicionId === '') {
      onCondicionChange(null, null);
      setCrearTemporal(false);
    } else {
      onCondicionChange(condicionId, null);
      setCrearTemporal(false);
    }
  };

  const handleCrearTemporal = () => {
    setCrearTemporal(true);
    onCondicionChange(null, null);
  };

  const handleGuardarTemporal = () => {
    if (!formTemporal.name.trim()) {
      toast.error('El nombre es requerido');
      return;
    }

    onCondicionChange(null, formTemporal);
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
    <ZenCard>
      <ZenCardHeader>
        <ZenCardTitle>Condiciones Comerciales</ZenCardTitle>
        <ZenCardDescription>
          Aplica condiciones existentes o crea una especial para esta negociación
        </ZenCardDescription>
      </ZenCardHeader>
      <ZenCardContent className="space-y-4">
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
                disabled={loading}
              >
                <option value="">Ninguna</option>
                {condiciones.map((condicion) => (
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
                <span className="bg-zinc-900 px-2 text-zinc-500">O</span>
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
                    onClick={() => onCondicionChange(null, null)}
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
      </ZenCardContent>
    </ZenCard>
  );
}
