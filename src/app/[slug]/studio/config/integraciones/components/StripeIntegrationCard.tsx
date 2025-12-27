'use client';

import React from 'react';
import { IntegrationCard } from './IntegrationCard';

export function StripeIntegrationCard() {
  return (
    <IntegrationCard
      name="Stripe"
      description="Procesa pagos de forma segura con Stripe"
      iconColor="text-indigo-400"
      isComingSoon={true}
    />
  );
}

