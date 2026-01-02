'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle } from '@/components/ui/zen';
import { FileText, Loader2 } from 'lucide-react';
import { PromiseClosingProcessCard } from './PromiseClosingProcessCard';
import { getCotizacionesByPromiseId } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import { useCotizacionesRealtime } from '@/hooks/useCotizacionesRealtime';
import type { CotizacionListItem } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';

interface PromiseClosingProcessSectionProps {
  studioSlug: string;
  promiseId: string | null;
  promiseData: {
    name: string;
    phone: string;
    email: string | null;
    address: string | null;
    event_date: Date | null;
    event_name: string | null;
    event_type_name: string | null;
  };
  onAuthorizeClick: () => void;
}

export function PromiseClosingProcessSection({
  studioSlug,
  promiseId,
  promiseData,
  onAuthorizeClick,
}: PromiseClosingProcessSectionProps) {
  const [cotizaciones, setCotizaciones] = useState<CotizacionListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCotizaciones = React.useCallback(async () => {
    if (!promiseId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const result = await getCotizacionesByPromiseId(promiseId);
      if (result.success && result.data) {
        setCotizaciones(result.data);
      }
    } catch (error) {
      console.error('[PromiseClosingProcessSection] Error loading cotizaciones:', error);
    } finally {
      setLoading(false);
    }
  }, [promiseId]);

  // Cargar cotizaciones iniciales
  useEffect(() => {
    loadCotizaciones();
  }, [loadCotizaciones]);

  // Suscribirse a cambios en tiempo real
  useCotizacionesRealtime({
    studioSlug,
    promiseId: promiseId || null,
    onCotizacionInserted: () => {
      loadCotizaciones();
    },
    onCotizacionUpdated: () => {
      loadCotizaciones();
    },
    onCotizacionDeleted: () => {
      loadCotizaciones();
    },
  });

  // Buscar cotización en cierre o aprobada
  const closingOrApprovedQuote = cotizaciones.find(
    (c) =>
      (c.status === 'en_cierre' ||
        c.status === 'aprobada' ||
        c.status === 'autorizada' ||
        c.status === 'approved') &&
      !c.archived &&
      c.status !== 'cancelada'
  );

  if (loading) {
    return (
      <ZenCard className="h-full flex flex-col">
        <ZenCardHeader className="border-b border-zinc-800 py-3 px-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-zinc-600 shrink-0" />
            <ZenCardTitle className="text-sm">Proceso de Cierre</ZenCardTitle>
          </div>
        </ZenCardHeader>
        <ZenCardContent className="p-4 flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 text-emerald-500 animate-spin" />
        </ZenCardContent>
      </ZenCard>
    );
  }

  // Si hay cotización en cierre o aprobada, mostrar el card de proceso
  if (closingOrApprovedQuote && promiseId) {
    return (
      <PromiseClosingProcessCard
        cotizacion={closingOrApprovedQuote}
        promiseData={promiseData}
        studioSlug={studioSlug}
        promiseId={promiseId}
        onAuthorizeClick={onAuthorizeClick}
        isLoadingPromiseData={false}
      />
    );
  }

  // Si no hay cotización en cierre, mostrar mensaje informativo
  return (
    <ZenCard className="h-full flex flex-col">
      <ZenCardHeader className="border-b border-zinc-800 py-3 px-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-zinc-600 shrink-0" />
          <ZenCardTitle className="text-sm">Proceso de Cierre</ZenCardTitle>
        </div>
      </ZenCardHeader>
      <ZenCardContent className="p-6 flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center text-center">
          <FileText className="h-12 w-12 text-zinc-600 mb-3" />
          <p className="text-sm text-zinc-400">
            No tienes cotización en proceso de cierre
          </p>
          <p className="text-xs text-zinc-500 mt-2">
            Selecciona "Pasar a Cierre" en una cotización pendiente para iniciar el proceso
          </p>
        </div>
      </ZenCardContent>
    </ZenCard>
  );
}

