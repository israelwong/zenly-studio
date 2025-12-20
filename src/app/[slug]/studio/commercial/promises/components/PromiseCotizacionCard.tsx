'use client';

import React from 'react';
import { Package, Sparkles, Trash2 } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenButton } from '@/components/ui/zen';

interface PromiseCotizacionCardProps {
  id: string;
  name: string;
  price: number;
  description?: string;
  type: 'package' | 'custom';
  packageId?: string;
  createdAt: Date;
  onDelete?: (id: string) => void;
}

export function PromiseCotizacionCard({
  id,
  name,
  price,
  description,
  type,
  onDelete,
}: PromiseCotizacionCardProps) {
  return (
    <ZenCard variant="outlined">
      <ZenCardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {type === 'package' ? (
              <Package className="h-4 w-4 text-zinc-400" />
            ) : (
              <Sparkles className="h-4 w-4 text-zinc-400" />
            )}
            <ZenCardTitle className="text-sm">{name}</ZenCardTitle>
          </div>
          {onDelete && (
            <ZenButton
              variant="ghost"
              size="sm"
              onClick={() => onDelete(id)}
              className="text-red-400 hover:text-red-300 h-6 px-2"
            >
              <Trash2 className="h-3 w-3" />
            </ZenButton>
          )}
        </div>
      </ZenCardHeader>
      <ZenCardContent>
        <div className="space-y-2">
          {description && (
            <p className="text-xs text-zinc-400">{description}</p>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-300">
              ${price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-zinc-500">
              {type === 'package' ? 'Desde paquete' : 'Personalizada'}
            </span>
          </div>
        </div>
      </ZenCardContent>
    </ZenCard>
  );
}

