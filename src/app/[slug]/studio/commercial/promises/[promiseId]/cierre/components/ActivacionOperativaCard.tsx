'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenInput, ZenSelect, ZenSwitch } from '@/components/ui/zen';
import { Loader2, X, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { formatearMoneda } from '@/lib/actions/studio/catalogo/calcular-precio';

/** Mapeo de nombres largos de métodos de pago a versiones cortas para UI */
const mapearNombreMetodoPago = (nombre: string): string => {
  const mappings: Record<string, string> = {
    'Transferencia a cuenta del negocio': 'SPEI a negocio',
  };
  return mappings[nombre] ?? nombre;
};

export interface PagoStagingItem {
  id: string;
  monto: number;
  metodoId: string | null;
  fecha: Date;
  concepto: string;
  tipo: 'anticipo' | 'abono_cierre';
  isReadOnly?: boolean;
}

interface ActivacionOperativaCardProps {
  studioSlug: string;
  cotizacionId: string;
  anticipoMonto: number;
  pagoData?: {
    pago_confirmado_estudio?: boolean;
    pago_concepto?: string | null;
    pago_monto?: number | null;
    pago_fecha?: Date | null;
    pago_metodo_id?: string | null;
  } | null;
  onSuccess: () => void;
  /** Métodos de pago inyectados desde el servidor (page) → cliente; sin fetch ni loading en el hijo */
  metodosPago?: Array<{ id: string; payment_method_name: string }>;
  /** Notifica al padre mientras la Server Action está en curso (bloquea botón Autorizar) */
  onTransitionPendingChange?: (pending: boolean) => void;
  /** Mismo frame que el toggle: padre actualiza pagoConfirmadoLocal para disabled atómico del botón */
  onPagoConfirmadoOptimistic?: (checked: boolean) => void;
  /** Callback para enviar el staging al padre (para validación y payload de autorización) */
  onStagingChange?: (staging: PagoStagingItem[], isValid: boolean) => void;
}

export function ActivacionOperativaCard({
  studioSlug,
  cotizacionId,
  anticipoMonto,
  pagoData,
  onSuccess,
  metodosPago = [],
  onTransitionPendingChange,
  onPagoConfirmadoOptimistic,
  onStagingChange,
}: ActivacionOperativaCardProps) {
  const [pagoConfirmadoUI, setPagoConfirmadoUI] = useState(() => pagoData?.pago_confirmado_estudio === true);
  const [montoTotalRecibido, setMontoTotalRecibido] = useState(() => 
    pagoData?.pago_monto != null ? String(pagoData.pago_monto) : (anticipoMonto > 0 ? String(anticipoMonto) : '')
  );
  const [pagoStaging, setPagoStaging] = useState<PagoStagingItem[]>([]);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const metodoDefault = metodosPago.length > 0 ? metodosPago[0].id : null;

  // Auto-split Top-Down: cuando cambia el monto total recibido, regenerar staging
  useEffect(() => {
    if (!pagoConfirmadoUI) return;

    const totalNum = parseFloat(montoTotalRecibido);
    if (isNaN(totalNum) || totalNum <= 0) {
      setPagoStaging([]);
      return;
    }

    if (totalNum === anticipoMonto) {
      // Monto exacto: una sola card (anticipo fijo)
      setPagoStaging([{
        id: 'anticipo-1',
        monto: anticipoMonto,
        metodoId: metodoDefault,
        fecha: new Date(),
        concepto: 'Anticipo',
        tipo: 'anticipo',
        isReadOnly: true,
      }]);
    } else if (totalNum > anticipoMonto) {
      // Excedente: dos cards (anticipo fijo + abono adicional variable)
      const excedente = totalNum - anticipoMonto;
      setPagoStaging([
        {
          id: 'anticipo-1',
          monto: anticipoMonto,
          metodoId: metodoDefault,
          fecha: new Date(),
          concepto: 'Anticipo',
          tipo: 'anticipo',
          isReadOnly: true,
        },
        {
          id: 'abono-2',
          monto: excedente,
          metodoId: metodoDefault,
          fecha: new Date(),
          concepto: 'Abono adicional',
          tipo: 'abono_cierre',
          isReadOnly: false,
        },
      ]);
    } else {
      // Monto menor al anticipo: una sola card con el monto parcial (editable)
      setPagoStaging([{
        id: 'anticipo-parcial-1',
        monto: totalNum,
        metodoId: metodoDefault,
        fecha: new Date(),
        concepto: 'Anticipo parcial',
        tipo: 'anticipo',
        isReadOnly: false,
      }]);
    }
  }, [montoTotalRecibido, pagoConfirmadoUI, anticipoMonto, metodoDefault]);

  // Validación y notificación al padre
  const validationState = useMemo(() => {
    if (!pagoConfirmadoUI) {
      return { isValid: false, totalStaging: 0, errors: [] };
    }

    const totalRecibido = parseFloat(montoTotalRecibido);
    if (isNaN(totalRecibido) || totalRecibido <= 0) {
      return { isValid: false, totalStaging: 0, errors: ['Monto total inválido'] };
    }

    const totalStaging = pagoStaging.reduce((sum, p) => sum + p.monto, 0);
    const errors: string[] = [];

    if (Math.abs(totalStaging - totalRecibido) > 0.01) {
      errors.push('Total de pagos no coincide con monto recibido');
    }

    pagoStaging.forEach((p) => {
      if (!p.metodoId) {
        errors.push(`Falta método de pago en: ${p.concepto}`);
      }
    });

    return { isValid: errors.length === 0, totalStaging, errors };
  }, [pagoConfirmadoUI, montoTotalRecibido, pagoStaging]);

  useEffect(() => {
    onStagingChange?.(pagoStaging, validationState.isValid);
  }, [pagoStaging, validationState.isValid, onStagingChange]);

  const handleSwitchChange = (checked: boolean) => {
    if (checked) {
      const totalNum = parseFloat(montoTotalRecibido);
      if (!montoTotalRecibido || isNaN(totalNum) || totalNum <= 0) {
        return;
      }
    }

    setPagoConfirmadoUI(checked);
    onPagoConfirmadoOptimistic?.(checked);

    if (!checked) {
      setPagoStaging([]);
    }
  };

  const handleUpdatePagoItem = (id: string, updates: Partial<PagoStagingItem>) => {
    setPagoStaging((prev) => {
      const updated = prev.map((p) => (p.id === id ? { ...p, ...updates } : p));
      
      // Sincronía Bottom-Up: si se editó el monto de un abono, actualizar monto total
      if (updates.monto !== undefined) {
        const nuevoTotal = updated.reduce((sum, p) => sum + p.monto, 0);
        setMontoTotalRecibido(String(nuevoTotal));
      }
      
      return updated;
    });
  };

  const handleRemovePagoItem = (id: string) => {
    setPagoStaging((prev) => {
      const filtered = prev.filter((p) => p.id !== id);
      
      // Sincronía Smart: al eliminar abono adicional, regresar monto total al anticipo
      const nuevoTotal = filtered.reduce((sum, p) => sum + p.monto, 0);
      setMontoTotalRecibido(String(nuevoTotal));
      
      return filtered;
    });
  };

  const toggleCardExpanded = (id: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const fieldsDisabled = !pagoConfirmadoUI;

  return (
    <ZenCard className="border-amber-500/50 bg-amber-500/5 relative">
      <ZenCardHeader className="border-b border-amber-500/20 py-3 px-4">
        <div className="flex flex-col gap-3 w-full">
          <ZenSwitch
            checked={pagoConfirmadoUI}
            onCheckedChange={handleSwitchChange}
            label="Pago confirmado"
            labelClassName="text-sm text-amber-200"
            variant="emerald"
            className="w-full"
          />
        </div>
      </ZenCardHeader>
      {pagoConfirmadoUI && (
        <ZenCardContent className="p-4 space-y-4">
          <p className="text-xs text-zinc-400">
            Los datos se guardarán al autorizar el evento.
          </p>

          {/* Input: Monto Total Recibido */}
          <div className="space-y-2">
              <label className="block text-xs font-medium text-zinc-400">
                Monto Total Recibido
              </label>
              <ZenInput
                type="number"
                value={montoTotalRecibido}
                onChange={(e) => setMontoTotalRecibido(e.target.value)}
                placeholder="0.00"
                min={0}
                step={0.01}
                className="text-lg font-semibold"
              />
              <p className="text-xs text-zinc-500">
                Anticipo pactado: {formatearMoneda(anticipoMonto)}
              </p>
            </div>

            {/* Validación */}
            {validationState.errors.length > 0 && (
              <div className="rounded-md bg-rose-500/10 border border-rose-500/30 p-2">
                <ul className="text-xs text-rose-400 space-y-1">
                  {validationState.errors.map((err, i) => (
                    <li key={i}>• {err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Mini-Cards (Pills) */}
            {pagoStaging.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
                  Distribución de pagos ({pagoStaging.length})
                </p>
                {pagoStaging.map((pago) => {
                  const isExpanded = expandedCards.has(pago.id);
                  const metodo = metodosPago.find((m) => m.id === pago.metodoId);
                  const hasError = !pago.metodoId;

                  return (
                    <div
                      key={pago.id}
                      className={`rounded-lg border ${
                        hasError ? 'border-rose-500/50 bg-rose-500/5' : 'border-zinc-700 bg-zinc-800/30'
                      } transition-all`}
                    >
                      {/* Header colapsable */}
                      <div className="w-full px-3 py-2 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => toggleCardExpanded(pago.id)}
                          className="flex items-center gap-2 min-w-0 flex-1 hover:opacity-80 transition-opacity"
                        >
                          <span className="text-xs font-medium text-zinc-300 truncate">
                            {pago.concepto}
                          </span>
                          <span className="text-sm font-semibold text-emerald-400">
                            {formatearMoneda(pago.monto)}
                          </span>
                        </button>
                        <div className="flex items-center gap-2 shrink-0">
                          {metodo && (
                            <span className="text-xs text-zinc-500">{mapearNombreMetodoPago(metodo.payment_method_name)}</span>
                          )}
                          {pago.concepto.includes('adicional') && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemovePagoItem(pago.id);
                              }}
                              className="h-5 w-5 rounded-full hover:bg-rose-500/20 flex items-center justify-center text-rose-400"
                              title="Eliminar"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => toggleCardExpanded(pago.id)}
                            className="hover:opacity-80 transition-opacity"
                            aria-label={isExpanded ? 'Colapsar' : 'Expandir'}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-zinc-500" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-zinc-500" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Contenido expandido */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-3 space-y-3 border-t border-zinc-700/50">
                          <div className="grid grid-cols-[110px_1fr] gap-4">
                            <div className="min-w-0">
                              <label className="block text-xs font-medium text-zinc-400 mb-1">
                                Monto {pago.isReadOnly && '(Fijo)'}
                              </label>
                              <ZenInput
                                type="number"
                                value={String(pago.monto)}
                                onChange={(e) =>
                                  handleUpdatePagoItem(pago.id, {
                                    monto: parseFloat(e.target.value) || 0,
                                  })
                                }
                                min={0}
                                step={0.01}
                                disabled={pago.isReadOnly}
                                className={pago.isReadOnly ? 'opacity-60 cursor-not-allowed' : ''}
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <label className="block text-xs font-medium text-zinc-400 mb-1">
                                Método de pago
                              </label>
                              <ZenSelect
                                value={pago.metodoId ?? ''}
                                onValueChange={(val) =>
                                  handleUpdatePagoItem(pago.id, { metodoId: val })
                                }
                                options={metodosPago.map((pm) => ({
                                  value: pm.id,
                                  label: mapearNombreMetodoPago(pm.payment_method_name),
                                }))}
                                placeholder="Seleccionar"
                                disableSearch
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1">
                              Fecha de pago
                            </label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <button
                                  type="button"
                                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-300 hover:border-zinc-600 flex items-center justify-between"
                                >
                                  <span>{format(pago.fecha, 'PPP', { locale: es })}</span>
                                  <CalendarIcon className="h-4 w-4 text-zinc-400" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent
                                className="w-auto p-0 bg-zinc-900 border-zinc-700"
                                align="start"
                              >
                                <Calendar
                                  mode="single"
                                  selected={pago.fecha}
                                  onSelect={(d) => {
                                    if (d) handleUpdatePagoItem(pago.id, { fecha: d });
                                  }}
                                  locale={es}
                                  className="rounded-md border-0"
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </ZenCardContent>
      )}
    </ZenCard>
  );
}
