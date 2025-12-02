'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, BarChart3, Eye, MousePointerClick, TrendingUp } from 'lucide-react';
import {
  ZenCard,
  ZenCardContent,
  ZenCardHeader,
  ZenCardTitle,
  ZenButton
} from '@/components/ui/zen';
import { getOffer } from '@/lib/actions/studio/offers/offers.actions';
import { getOfferStats } from '@/lib/actions/studio/offers/offer-stats.actions';
import type { StudioOffer, OfferStats } from '@/types/offers';
import { toast } from 'sonner';

export default function EstadisticasOfertaPage() {
  const params = useParams();
  const router = useRouter();
  const studioSlug = params.slug as string;
  const offerId = params.offerId as string;

  const [offer, setOffer] = useState<StudioOffer | null>(null);
  const [stats, setStats] = useState<OfferStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [offerResult, statsResult] = await Promise.all([
          getOffer(offerId, studioSlug),
          getOfferStats({ offer_id: offerId }),
        ]);

        if (offerResult.success && offerResult.data) {
          setOffer(offerResult.data);
        } else {
          toast.error(offerResult.error || 'Error al cargar la oferta');
        }

        if (statsResult.success && statsResult.data) {
          setStats(statsResult.data);
        } else {
          toast.error(statsResult.error || 'Error al cargar las estadísticas');
        }
      } catch (error) {
        console.error('[EstadisticasOfertaPage] Error:', error);
        toast.error('Error al cargar los datos');
      } finally {
        setLoading(false);
      }
    };

    if (offerId) {
      loadData();
    }
  }, [offerId, studioSlug]);

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto">
        <div className="space-y-4">
          <div className="h-12 bg-zinc-800/50 rounded-lg animate-pulse" />
          <div className="h-64 bg-zinc-800/50 rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  if (!offer || !stats) {
    return (
      <div className="w-full max-w-7xl mx-auto">
        <div className="text-center py-12">
          <p className="text-zinc-400">No se pudieron cargar los datos</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <ZenCard variant="default" padding="none">
        <ZenCardHeader className="border-b border-zinc-800">
          <div className="flex items-center gap-4">
            <ZenButton
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/${studioSlug}/studio/commercial/ofertas`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </ZenButton>
            <div>
              <ZenCardTitle>Estadísticas: {offer.name}</ZenCardTitle>
            </div>
          </div>
        </ZenCardHeader>

        <ZenCardContent className="p-6">
          {/* Métricas principales */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="h-4 w-4 text-blue-400" />
                <span className="text-sm text-zinc-400">Visitas Landing</span>
              </div>
              <p className="text-2xl font-bold text-zinc-100">
                {stats.total_landing_visits}
              </p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <MousePointerClick className="h-4 w-4 text-purple-400" />
                <span className="text-sm text-zinc-400">Visitas Leadform</span>
              </div>
              <p className="text-2xl font-bold text-zinc-100">
                {stats.total_leadform_visits}
              </p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                <span className="text-sm text-zinc-400">Conversiones</span>
              </div>
              <p className="text-2xl font-bold text-zinc-100">
                {stats.total_submissions}
              </p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-4 w-4 text-amber-400" />
                <span className="text-sm text-zinc-400">Tasa Conversión</span>
              </div>
              <p className="text-2xl font-bold text-zinc-100">
                {stats.conversion_rate.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Tasa de click-through */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <MousePointerClick className="h-4 w-4 text-blue-400" />
              <span className="text-sm font-medium text-zinc-300">Tasa de Click-through (CTR)</span>
            </div>
            <p className="text-3xl font-bold text-zinc-100">
              {stats.click_through_rate.toFixed(1)}%
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              Porcentaje de visitantes que hacen click en los CTAs para ir al leadform
            </p>
          </div>

          {/* Visitas por fecha */}
          {stats.visits_by_date.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-zinc-100 mb-4">Visitas por Fecha</h3>
              <div className="space-y-2">
                {stats.visits_by_date.slice(-7).map((day, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">
                      {new Date(day.date).toLocaleDateString('es-MX', {
                        day: 'numeric',
                        month: 'short'
                      })}
                    </span>
                    <div className="flex items-center gap-4">
                      <span className="text-zinc-500">
                        Landing: <span className="text-blue-400">{day.landing_visits}</span>
                      </span>
                      <span className="text-zinc-500">
                        Leadform: <span className="text-purple-400">{day.leadform_visits}</span>
                      </span>
                      <span className="text-zinc-500">
                        Conversiones: <span className="text-emerald-400">{day.submissions}</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Visitas por UTM */}
          {stats.visits_by_utm.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-zinc-100 mb-4">Desglose por Campaña (UTM)</h3>
              <div className="space-y-3">
                {stats.visits_by_utm.map((utm, index) => (
                  <div key={index} className="border-b border-zinc-800 pb-3 last:border-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-zinc-300">
                        {utm.utm_source || 'Sin fuente'} / {utm.utm_medium || 'Sin medio'} / {utm.utm_campaign || 'Sin campaña'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-zinc-500">
                      <span>
                        Landing: <span className="text-blue-400">{utm.landing_visits}</span>
                      </span>
                      <span>
                        Leadform: <span className="text-purple-400">{utm.leadform_visits}</span>
                      </span>
                      <span>
                        Conversiones: <span className="text-emerald-400">{utm.submissions}</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ZenCardContent>
      </ZenCard>
    </div>
  );
}
