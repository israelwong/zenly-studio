'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Edit2 } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle } from '@/components/ui/zen';
import type { CotizacionListItem } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';

interface CotizacionHeaderCardProps {
  cotizacion: CotizacionListItem;
  studioSlug: string;
  promiseId: string;
  onPreviewClick: () => void;
  loadingCotizacion: boolean;
}

export function CotizacionHeaderCard({
  cotizacion,
  studioSlug,
  promiseId,
  onPreviewClick,
  loadingCotizacion,
}: CotizacionHeaderCardProps) {
  const router = useRouter();

  return (
    <ZenCard className="h-auto">
      <ZenCardHeader className="border-b border-zinc-800 py-3 px-4">
        <ZenCardTitle className="text-sm">Cotización</ZenCardTitle>
      </ZenCardHeader>
      <ZenCardContent className="p-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h4 className="text-base font-semibold text-white flex-1">{cotizacion.name}</h4>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => router.push(`/${studioSlug}/studio/commercial/promises/${promiseId}/cotizacion/${cotizacion.id}`)}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 transition-colors text-xs text-zinc-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Edit2 className="h-3 w-3" />
              Editar
            </button>
            <button
              onClick={onPreviewClick}
              disabled={loadingCotizacion}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 transition-colors text-xs text-zinc-300 hover:text-white shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Eye className="h-3 w-3" />
              {loadingCotizacion ? 'Cargando...' : 'Preview'}
            </button>
          </div>
        </div>
      </ZenCardContent>
    </ZenCard>
  );
}
