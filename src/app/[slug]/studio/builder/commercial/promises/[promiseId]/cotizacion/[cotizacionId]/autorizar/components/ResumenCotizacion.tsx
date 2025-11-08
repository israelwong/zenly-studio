'use client';

import React from 'react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle } from '@/components/ui/zen';
import { FileText } from 'lucide-react';

interface ResumenCotizacionProps {
  cotizacion: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    status: string;
    items: Array<{ item_id: string; quantity: number }>;
  };
}

export function ResumenCotizacion({ cotizacion }: ResumenCotizacionProps) {
  return (
    <ZenCard variant="outline">
      <ZenCardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600/20 rounded-lg">
            <FileText className="h-5 w-5 text-blue-400" />
          </div>
          <ZenCardTitle className="text-lg">Resumen de Cotización</ZenCardTitle>
        </div>
      </ZenCardHeader>
      <ZenCardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium text-zinc-400">Nombre</label>
          <p className="text-white mt-1">{cotizacion.name}</p>
        </div>

        {cotizacion.description && (
          <div>
            <label className="text-sm font-medium text-zinc-400">Descripción</label>
            <p className="text-white mt-1">{cotizacion.description}</p>
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-zinc-400">Precio Base</label>
          <p className="text-white mt-1 text-lg font-semibold">
            ${cotizacion.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        <div>
          <label className="text-sm font-medium text-zinc-400">Estado</label>
          <p className="text-white mt-1 capitalize">{cotizacion.status}</p>
        </div>

        {cotizacion.items.length > 0 && (
          <div>
            <label className="text-sm font-medium text-zinc-400">Items incluidos</label>
            <p className="text-white mt-1">{cotizacion.items.length} item(s)</p>
          </div>
        )}
      </ZenCardContent>
    </ZenCard>
  );
}

