'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { OfferEditor } from '../components/OfferEditor';
import { getOffer } from '@/lib/actions/studio/offers/offers.actions';
import type { StudioOffer } from '@/types/offers';
import { toast } from 'sonner';

export default function OfertaPage() {
  const params = useParams();
  const studioSlug = params.slug as string;
  const offerId = params.offerId as string;

  const [offer, setOffer] = useState<StudioOffer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOffer = async () => {
      try {
        const result = await getOffer(offerId, studioSlug);

        if (result.success && result.data) {
          setOffer(result.data);
        } else {
          toast.error(result.error || 'Error al cargar la oferta');
        }
      } catch (error) {
        console.error('[OfertaPage] Error:', error);
        toast.error('Error al cargar la oferta');
      } finally {
        setLoading(false);
      }
    };

    if (offerId) {
      loadOffer();
    }
  }, [offerId, studioSlug]);

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto">
        <div className="space-y-6">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-9 w-9 bg-zinc-800/50 rounded-md animate-pulse" />
              <div className="h-8 w-48 bg-zinc-800/50 rounded animate-pulse" />
            </div>
            <div className="flex items-center gap-3">
              {/* Badge de almacenamiento skeleton */}
              <div className="flex items-center gap-1.5 px-2.5 py-1.5">
                <div className="h-3.5 w-3.5 bg-zinc-800/50 rounded animate-pulse" />
                <div className="h-4 w-16 bg-zinc-800/50 rounded animate-pulse" />
              </div>
              <div className="h-8 w-px bg-zinc-800 mx-2" />
              {/* Status skeleton */}
              <div className="flex items-center gap-3">
                <div className="h-10 w-20 bg-zinc-800/50 rounded animate-pulse" />
                <div className="h-6 w-11 bg-zinc-800/50 rounded-full animate-pulse" />
              </div>
              <div className="h-8 w-px bg-zinc-800 mx-2" />
              {/* Botón actualizar skeleton */}
              <div className="h-9 w-32 bg-zinc-800/50 rounded-md animate-pulse" />
              {/* Menú skeleton */}
              <div className="h-9 w-9 bg-zinc-800/50 rounded-md animate-pulse" />
            </div>
          </div>

          {/* Tabs Navigation Skeleton */}
          <div className="bg-zinc-900/50 rounded-lg p-1.5 border border-zinc-800">
            <div className="flex gap-1">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex-1 h-10 bg-zinc-800/50 rounded-md animate-pulse"
                />
              ))}
            </div>
          </div>

          {/* Tab Content Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 p-6">
              <div className="space-y-4">
                <div className="h-6 w-32 bg-zinc-800/50 rounded animate-pulse" />
                <div className="h-10 w-full bg-zinc-800/50 rounded animate-pulse" />
                <div className="h-24 w-full bg-zinc-800/50 rounded animate-pulse" />
                <div className="h-10 w-full bg-zinc-800/50 rounded animate-pulse" />
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="h-96 bg-zinc-800/50 rounded-lg animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="w-full max-w-7xl mx-auto">
        <div className="text-center py-12">
          <p className="text-zinc-400">Oferta no encontrada</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto">
      <OfferEditor studioSlug={studioSlug} mode="edit" offer={offer || undefined} />
    </div>
  );
}
