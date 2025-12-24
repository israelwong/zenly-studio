'use client';

import { Package } from 'lucide-react';
import { ZenCard } from '@/components/ui/zen';
import { PublicServiciosTree } from '@/components/promise/PublicServiciosTree';
import type { PublicSeccionData } from '@/types/public-promise';

interface ServiciosContratadosTreeProps {
  servicios: PublicSeccionData[];
}

export function ServiciosContratadosTree({ servicios }: ServiciosContratadosTreeProps) {
  return (
    <ZenCard>
      <div className="p-6 space-y-4">
        <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
          <Package className="h-5 w-5" />
          Servicios Contratados
        </h3>

        {servicios.length > 0 ? (
          <PublicServiciosTree servicios={servicios} showPrices={false} />
        ) : (
          <p className="text-sm text-zinc-400 py-4 text-center">
            No hay servicios contratados
          </p>
        )}
      </div>
    </ZenCard>
  );
}

