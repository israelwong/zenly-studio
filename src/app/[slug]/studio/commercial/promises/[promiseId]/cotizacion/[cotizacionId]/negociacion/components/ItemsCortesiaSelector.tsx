'use client';

import React from 'react';
import {
  ZenCard,
  ZenCardContent,
  ZenCardHeader,
  ZenCardTitle,
  ZenCardDescription,
  ZenBadge,
} from '@/components/ui/zen';
import { formatearMoneda } from '@/lib/actions/studio/catalogo/calcular-precio';
import type { CotizacionItem } from '@/lib/utils/negociacion-calc';
import { calcularImpactoCortesias } from '@/lib/utils/negociacion-calc';
import { Gift } from 'lucide-react';

interface ItemsCortesiaSelectorProps {
  items: CotizacionItem[];
  itemsCortesia: Set<string>;
  onItemsChange: (items: Set<string>) => void;
}

export function ItemsCortesiaSelector({
  items,
  itemsCortesia,
  onItemsChange,
}: ItemsCortesiaSelectorProps) {
  const toggleCortesia = (itemId: string) => {
    const newSet = new Set(itemsCortesia);
    if (newSet.has(itemId)) {
      newSet.delete(itemId);
    } else {
      newSet.add(itemId);
    }
    onItemsChange(newSet);
  };

  const impacto = calcularImpactoCortesias(items, itemsCortesia);

  return (
    <ZenCard>
      <ZenCardHeader>
        <ZenCardTitle>Items de Cortesía</ZenCardTitle>
        <ZenCardDescription>
          Selecciona items que se incluyen sin cargo (precio = $0, pero mantiene
          costo/gasto)
        </ZenCardDescription>
      </ZenCardHeader>
      <ZenCardContent className="space-y-4">
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {items.map((item) => {
            const isCortesia = itemsCortesia.has(item.id);
            const precioItem = (item.unit_price || 0) * item.quantity;

            return (
              <div
                key={item.id}
                className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                  isCortesia
                    ? 'bg-emerald-950/20 border-emerald-800/30'
                    : 'bg-zinc-900/50 border-zinc-800'
                }`}
                onClick={() => toggleCortesia(item.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <input
                        type="checkbox"
                        checked={isCortesia}
                        onChange={() => toggleCortesia(item.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border-zinc-700 bg-zinc-800 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-sm font-medium text-zinc-200 truncate">
                        {item.name || 'Item sin nombre'}
                      </span>
                      {isCortesia && (
                        <ZenBadge variant="success" className="text-[10px]">
                          <Gift className="h-3 w-3 mr-1" />
                          Cortesía
                        </ZenBadge>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-xs text-zinc-400 line-clamp-1">
                        {item.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs">
                      <span className="text-zinc-500">
                        Cantidad: {item.quantity}
                      </span>
                      <span
                        className={
                          isCortesia
                            ? 'text-emerald-400 line-through'
                            : 'text-zinc-300'
                        }
                      >
                        Precio:{' '}
                        {isCortesia
                          ? formatearMoneda(0)
                          : formatearMoneda(precioItem)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {impacto.totalCortesias > 0 && (
          <div className="border-t border-zinc-800 pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Total cortesías:</span>
              <span className="font-semibold text-zinc-200">
                {formatearMoneda(impacto.totalCortesias)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Impacto en utilidad:</span>
              <span
                className={`font-semibold ${
                  impacto.impactoUtilidad < 0
                    ? 'text-red-400'
                    : 'text-emerald-400'
                }`}
              >
                {impacto.impactoUtilidad > 0 ? '+' : ''}
                {formatearMoneda(impacto.impactoUtilidad)}
              </span>
            </div>
          </div>
        )}
      </ZenCardContent>
    </ZenCard>
  );
}
