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
        <div className="space-y-4">
          <div className="h-12 bg-zinc-800/50 rounded-lg animate-pulse" />
          <div className="h-64 bg-zinc-800/50 rounded-lg animate-pulse" />
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
      <OfferEditor studioSlug={studioSlug} mode="edit" offer={offer} />
    </div>
  );
}
