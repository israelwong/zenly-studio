'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { CreditCard } from 'lucide-react';
import { ZenCard, ZenCardHeader, ZenCardTitle, ZenCardContent } from '@/components/ui/zen';
import { SubscriptionDataLoader } from './components';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function SuscripcionPage() {
  const params = useParams();
  const studioSlug = params.slug as string;
  usePageTitle('Suscripción');

  return (
    <ZenCard>
      <ZenCardHeader>
        <div className="flex items-center gap-3">
          <CreditCard className="h-6 w-6 text-emerald-400" />
          <ZenCardTitle>Suscripción</ZenCardTitle>
        </div>
      </ZenCardHeader>
      <ZenCardContent>
        <SubscriptionDataLoader studioSlug={studioSlug} />
      </ZenCardContent>
    </ZenCard>
  );
}
