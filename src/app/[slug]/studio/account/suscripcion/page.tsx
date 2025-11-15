'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { CreditCard } from 'lucide-react';
import { SubscriptionDataLoader } from './components';

export default function SuscripcionPage() {
  const params = useParams();
  const studioSlug = params.slug as string;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <CreditCard className="h-8 w-8 text-green-400" />
          <h1 className="text-3xl font-bold text-white">Suscripción</h1>
        </div>
        <p className="text-zinc-400 text-lg">
          Gestiona tu plan de suscripción y revisa el historial de facturación.
        </p>
      </div>

      {/* Subscription Data Loader */}
      <SubscriptionDataLoader studioSlug={studioSlug} />
    </div>
  );
}
