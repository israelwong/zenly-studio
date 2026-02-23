'use client';

import React from 'react';
import { ZenBadge } from '@/components/ui/zen';
import { formatCurrency } from '@/lib/actions/utils/formatting';

interface CondicionComercial {
  id: string;
  name: string;
  description: string | null;
  advance_percentage: number | null;
  advance_type?: string | null;
  advance_amount?: number | null;
  discount_percentage: number | null;
  type?: string;
  metodos_pago: Array<{
    id: string;
    metodo_pago_id: string;
    metodo_pago_name: string;
  }>;
}

interface CondicionesComercialesSelectorProps {
  condiciones: CondicionComercial[];
  selectedCondicionId: string | null;
  selectedMetodoPagoId: string | null;
  onSelectCondicion: (condicionId: string, metodoPagoId: string) => void;
  loading?: boolean;
}

export function CondicionesComercialesSelector({
  condiciones,
  selectedCondicionId,
  selectedMetodoPagoId,
  onSelectCondicion,
  loading = false,
}: CondicionesComercialesSelectorProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="p-4 border border-zinc-700 rounded-lg bg-zinc-800/30 animate-pulse">
            <div className="h-4 w-32 bg-zinc-700 rounded mb-2" />
            <div className="h-3 w-full bg-zinc-700 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (condiciones.length === 0) {
    return (
      <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
        <p className="text-sm text-zinc-400">No hay condiciones comerciales disponibles</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {condiciones.map((condicion) => {
        // Si no tiene métodos de pago, mostrar la condición sin método específico
        if (condicion.metodos_pago.length === 0) {
          const isSelected = selectedCondicionId === condicion.id && !selectedMetodoPagoId;
          return (
            <div
              key={condicion.id}
              onClick={() => onSelectCondicion(condicion.id, condicion.id)}
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
                    {(condicion.discount_percentage ?? 0) > 0 && (
                      <span>Descuento: {condicion.discount_percentage}%</span>
                    )}
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
              const isSelected = selectedCondicionId === condicion.id && selectedMetodoPagoId === metodo.id;
              return (
                <div
                  key={metodo.id}
                  onClick={() => onSelectCondicion(condicion.id, metodo.id)}
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
                        {(condicion.discount_percentage ?? 0) > 0 && (
                          <span>Descuento: {condicion.discount_percentage}%</span>
                        )}
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
  );
}
