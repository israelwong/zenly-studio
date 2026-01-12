'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, X } from 'lucide-react';
import { ZenInput, ZenButton, ZenBadge } from '@/components/ui/zen';
import { toast } from 'sonner';
import { obtenerCondicionesComerciales } from '@/lib/actions/studio/config/condiciones-comerciales.actions';
import type { CondicionComercial, CondicionComercialTemporal } from '@/lib/utils/negociacion-calc';
import { formatCurrency } from '@/lib/actions/utils/formatting';

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
      type?: string;
      metodo_pago_id: string | null;
      metodos_pago: Array<{
        id: string;
        metodo_pago_id: string;
        metodo_pago_name: string;
      }>;
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
          type: c.type,
          metodo_pago_id: null,
          metodos_pago: c.condiciones_comerciales_metodo_pago.map((mp) => ({
            id: mp.id,
            metodo_pago_id: mp.metodo_pago_id,
            metodo_pago_name: mp.metodos_pago.payment_method_name,
          })),
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
        // Si tiene métodos de pago y hay uno seleccionado, usar ese
        const metodoPagoSeleccionado = condicion.metodos_pago.length > 0 && condicion.metodo_pago_id
          ? condicion.metodos_pago.find((mp) => mp.metodo_pago_id === condicion.metodo_pago_id)
          : null;
        
        const condicionCompleta: CondicionComercial = {
          id: condicion.id,
          name: condicion.name,
          description: condicion.description,
          discount_percentage: condicion.discount_percentage,
          advance_percentage: condicion.advance_percentage,
          advance_type: condicion.advance_type,
          advance_amount: condicion.advance_amount,
          metodo_pago_id: metodoPagoSeleccionado?.metodo_pago_id || condicion.metodo_pago_id || null,
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

  // Determinar método de pago seleccionado (si existe)
  const condicionActual = condicionesComerciales.find((c) => c.id === condicionSeleccionada);
  const selectedMetodoPagoId = condicionActual?.metodos_pago.find((mp) => 
    condicionActual.metodo_pago_id === mp.metodo_pago_id
  )?.id || null;

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
          {loadingCondiciones ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="p-4 border border-zinc-700 rounded-lg bg-zinc-800/30 animate-pulse">
                  <div className="h-4 w-32 bg-zinc-700 rounded mb-2" />
                  <div className="h-3 w-full bg-zinc-700 rounded" />
                </div>
              ))}
            </div>
          ) : condicionesComerciales.length === 0 ? (
            <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
              <p className="text-sm text-zinc-400">No hay condiciones comerciales disponibles</p>
            </div>
          ) : (
            <div className="space-y-2">
              {condicionesComerciales.map((condicion) => {
                // Si no tiene métodos de pago, mostrar la condición sin método específico
                if (condicion.metodos_pago.length === 0) {
                  const isSelected = condicionSeleccionada === condicion.id && !selectedMetodoPagoId;
                  return (
                    <div
                      key={condicion.id}
                      onClick={() => handleSelectCondicion(condicion.id)}
                      className={`
                        border rounded-lg p-3 cursor-pointer transition-all
                        ${isSelected
                          ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/20'
                          : 'border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/50'
                        }
                      `}
                    >
                      <div className="flex items-start gap-3">
                        {/* Radio Button */}
                        <div className="mt-0.5 shrink-0">
                          <div
                            className={`
                              w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all
                              ${isSelected
                                ? 'border-emerald-500 bg-emerald-500'
                                : 'border-zinc-600'
                              }
                            `}
                          >
                            {isSelected && (
                              <div className="w-2 h-2 rounded-full bg-white" />
                            )}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`font-medium text-sm ${isSelected ? 'text-white' : 'text-zinc-300'}`}>
                              {condicion.name}
                            </span>
                            {condicion.type === 'offer' && (
                              <ZenBadge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-[10px] px-1.5 py-0.5 rounded-full">
                                Oferta especial
                              </ZenBadge>
                            )}
                          </div>

                          {condicion.description && (
                            <p className={`text-xs mt-1 ${isSelected ? 'text-zinc-400' : 'text-zinc-500'}`}>
                              {condicion.description}
                            </p>
                          )}

                          <div className={`flex items-center gap-3 text-xs mt-1.5 ${isSelected ? 'text-zinc-300' : 'text-zinc-400'}`}>
                            {(() => {
                              const advanceType = condicion.advance_type || 'percentage';
                              if (advanceType === 'fixed_amount' && condicion.advance_amount) {
                                return <span>Anticipo: {formatCurrency(condicion.advance_amount)}</span>;
                              } else if (advanceType === 'percentage' && condicion.advance_percentage !== null) {
                                return <span>Anticipo: {condicion.advance_percentage}%</span>;
                              }
                              return null;
                            })()}
                            <span>Descuento: {condicion.discount_percentage ?? 0}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Si tiene métodos de pago, mostrar uno por cada método
                return (
                  <div key={condicion.id} className="space-y-2">
                    {condicion.metodos_pago.map((metodo) => {
                      const isSelected = condicionSeleccionada === condicion.id && selectedMetodoPagoId === metodo.id;
                      return (
                        <div
                          key={metodo.id}
                          onClick={() => handleSelectCondicion(condicion.id, metodo.id)}
                          className={`
                            border rounded-lg p-3 cursor-pointer transition-all
                            ${isSelected
                              ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/20'
                              : 'border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/50'
                            }
                          `}
                        >
                          <div className="flex items-start gap-3">
                            {/* Radio Button */}
                            <div className="mt-0.5 shrink-0">
                              <div
                                className={`
                                  w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all
                                  ${isSelected
                                    ? 'border-emerald-500 bg-emerald-500'
                                    : 'border-zinc-600'
                                  }
                                `}
                              >
                                {isSelected && (
                                  <div className="w-2 h-2 rounded-full bg-white" />
                                )}
                              </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`font-medium text-sm ${isSelected ? 'text-white' : 'text-zinc-300'}`}>
                                  {condicion.name}
                                </span>
                                {condicion.type === 'offer' && (
                                  <ZenBadge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-[10px] px-1.5 py-0.5 rounded-full">
                                    Oferta especial
                                  </ZenBadge>
                                )}
                              </div>

                              {condicion.description && (
                                <p className={`text-xs mt-1 ${isSelected ? 'text-zinc-400' : 'text-zinc-500'}`}>
                                  {condicion.description}
                                </p>
                              )}

                              <div className={`flex items-center gap-3 text-xs mt-1.5 ${isSelected ? 'text-zinc-300' : 'text-zinc-400'}`}>
                                {(() => {
                                  const advanceType = condicion.advance_type || 'percentage';
                                  if (advanceType === 'fixed_amount' && condicion.advance_amount) {
                                    return <span>Anticipo: {formatCurrency(condicion.advance_amount)}</span>;
                                  } else if (advanceType === 'percentage' && condicion.advance_percentage !== null) {
                                    return <span>Anticipo: {condicion.advance_percentage}%</span>;
                                  }
                                  return null;
                                })()}
                                <span>Descuento: {condicion.discount_percentage ?? 0}%</span>
                                <span className="text-emerald-400">Método: {metodo.metodo_pago_name}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}

          <div className="relative pt-2">
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
