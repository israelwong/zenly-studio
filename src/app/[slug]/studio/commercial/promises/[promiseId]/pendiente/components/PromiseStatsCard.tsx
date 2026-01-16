'use client';

import React, { useState, useEffect } from 'react';
import { Eye, TrendingUp, RefreshCw } from 'lucide-react';
import { ZenCard, ZenCardHeader, ZenCardTitle, ZenCardContent, ZenButton, ZenBadge } from '@/components/ui/zen';
import { getPromiseViewStats, getCotizacionClickStats, getPaqueteClickStats } from '@/lib/actions/studio/commercial/promises/promise-analytics.actions';
import { formatDateTime } from '@/lib/actions/utils/formatting';

interface PromiseStatsCardProps {
  studioSlug: string;
  promiseId: string | null;
}

export function PromiseStatsCard({
  studioSlug,
  promiseId,
}: PromiseStatsCardProps) {
  const [viewStats, setViewStats] = useState<{
    totalViews: number;
    uniqueViews: number;
    lastView: Date | null;
  } | null>(null);
  const [cotizacionStats, setCotizacionStats] = useState<Array<{
    cotizacionId: string;
    cotizacionName: string;
    clicks: number;
  }>>([]);
  const [paqueteStats, setPaqueteStats] = useState<Array<{
    paqueteId: string;
    paqueteName: string;
    clicks: number;
  }>>([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const loadingStatsRef = React.useRef(false);

  const loadStats = async () => {
    if (!promiseId || loadingStatsRef.current) return;

    loadingStatsRef.current = true;
    setLoadingStats(true);

    try {
      const [viewsResult, cotizacionesResult, paquetesResult] = await Promise.allSettled([
        getPromiseViewStats(promiseId),
        getCotizacionClickStats(promiseId),
        getPaqueteClickStats(promiseId),
      ]);

      if (viewsResult.status === 'fulfilled' && viewsResult.value.success && viewsResult.value.data) {
        setViewStats({
          totalViews: viewsResult.value.data.totalViews,
          uniqueViews: viewsResult.value.data.uniqueViews,
          lastView: viewsResult.value.data.lastView,
        });
      } else {
        setViewStats((prev) => prev || {
          totalViews: 0,
          uniqueViews: 0,
          lastView: null,
        });
      }

      if (cotizacionesResult.status === 'fulfilled' && cotizacionesResult.value.success) {
        setCotizacionStats(cotizacionesResult.value.data || []);
      } else {
        setCotizacionStats([]);
      }

      if (paquetesResult.status === 'fulfilled' && paquetesResult.value.success) {
        setPaqueteStats(paquetesResult.value.data || []);
      } else {
        setPaqueteStats([]);
      }
    } catch (error) {
      console.error('[PromiseStatsCard] Error loading stats:', error);
    } finally {
      loadingStatsRef.current = false;
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    if (promiseId) {
      loadStats();
    }
  }, [promiseId]);

  if (!promiseId) {
    return null;
  }

  return (
    <ZenCard>
      <ZenCardHeader className="border-b border-zinc-800 py-2 px-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <ZenCardTitle className="text-sm font-medium flex items-center gap-1.5 pt-1">
            <Eye className="h-3.5 w-3.5 text-zinc-400" />
            Estadísticas
          </ZenCardTitle>
          <ZenButton
            variant="ghost"
            size="sm"
            onClick={loadStats}
            disabled={loadingStats}
            className="h-6 w-6 p-0 text-zinc-400 hover:text-emerald-400 disabled:opacity-50"
            title="Actualizar estadísticas"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingStats ? 'animate-spin' : ''}`} />
          </ZenButton>
        </div>
      </ZenCardHeader>
      <ZenCardContent className="p-4">
        {loadingStats ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="h-2.5 w-12 bg-zinc-800 rounded animate-pulse" />
                <div className="h-5 w-8 bg-zinc-800 rounded animate-pulse" />
              </div>
              <div className="space-y-1.5">
                <div className="h-2.5 w-12 bg-zinc-800 rounded animate-pulse" />
                <div className="h-5 w-8 bg-zinc-800 rounded animate-pulse" />
              </div>
            </div>
          </div>
        ) : viewStats ? (
          <div className="space-y-4">
            {/* Estadísticas principales */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-zinc-800/30 rounded-md p-2.5">
                <div className="text-[10px] text-zinc-500 mb-1">Total</div>
                <div className="text-lg font-semibold text-white">{viewStats.totalViews}</div>
              </div>
              <div className="bg-zinc-800/30 rounded-md p-2.5">
                <div className="text-[10px] text-zinc-500 mb-1">Únicas</div>
                <div className="text-lg font-semibold text-white">{viewStats.uniqueViews}</div>
              </div>
            </div>

            {/* Última visita */}
            {viewStats.lastView && (
              <div className="bg-zinc-800/30 rounded-md p-2.5">
                <div className="text-[10px] text-zinc-500 mb-1">Última visita</div>
                <div className="text-xs text-zinc-300">
                  {formatDateTime(viewStats.lastView, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            )}

            {/* Clicks en paquetes */}
            {paqueteStats.length > 0 && (
              <div className="border-t border-zinc-800 pt-3">
                <h4 className="text-[10px] font-medium text-zinc-500 mb-2 uppercase tracking-wide">Paquetes</h4>
                <div className="space-y-1.5">
                  {paqueteStats.map((stat) => (
                    <div key={stat.paqueteId} className="flex items-center justify-between text-xs">
                      <span className="text-zinc-300 truncate flex-1 text-[11px]">{stat.paqueteName}</span>
                      <ZenBadge variant="secondary" className="ml-2 shrink-0 text-[10px] px-1.5 py-0 h-4 min-w-[20px]">
                        {stat.clicks}
                      </ZenBadge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Clicks en cotizaciones */}
            {cotizacionStats.length > 0 && (
              <div className="border-t border-zinc-800 pt-3">
                <h4 className="text-[10px] font-medium text-zinc-500 mb-2 uppercase tracking-wide">Cotizaciones</h4>
                <div className="space-y-1.5">
                  {cotizacionStats.map((stat) => (
                    <div key={stat.cotizacionId} className="flex items-center justify-between text-xs">
                      <span className="text-zinc-300 truncate flex-1 text-[11px]">{stat.cotizacionName}</span>
                      <ZenBadge variant="secondary" className="ml-2 shrink-0 text-[10px] px-1.5 py-0 h-4 min-w-[20px]">
                        {stat.clicks}
                      </ZenBadge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Estado vacío */}
            {viewStats.totalViews === 0 && paqueteStats.length === 0 && cotizacionStats.length === 0 && (
              <div className="text-xs text-zinc-500 text-center py-2">Sin visitas aún</div>
            )}
          </div>
        ) : (
          <div className="text-xs text-zinc-500 text-center py-2">Sin visitas aún</div>
        )}
      </ZenCardContent>
    </ZenCard>
  );
}
