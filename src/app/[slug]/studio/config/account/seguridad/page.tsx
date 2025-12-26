import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { Shield } from 'lucide-react';
import {
  PasswordChangeForm,
  SecuritySettings,
  SessionsHistory,
  SecuritySkeleton
} from './components';

export const metadata: Metadata = {
  title: 'ZEN Studio - Seguridad',
  description: 'Gestiona la seguridad de tu cuenta y configura las opciones de protección',
};

interface SeguridadPageProps {
  params: {
    slug: string;
  };
}

export default async function SeguridadPage({ params }: SeguridadPageProps) {
  const { slug: studioSlug } = await params;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-blue-400" />
          <h1 className="text-3xl font-bold text-white">Seguridad</h1>
        </div>
        <p className="text-zinc-400 text-lg">
          Gestiona la seguridad de tu cuenta y configura las opciones de protección.
        </p>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Password Change Form */}
        <Suspense fallback={<SecuritySkeleton />}>
          <PasswordChangeForm studioSlug={studioSlug} />
        </Suspense>

        {/* Security Settings */}
        <Suspense fallback={<SecuritySkeleton />}>
          <SecuritySettings studioSlug={studioSlug} />
        </Suspense>
      </div>

      {/* Sessions History - Full Width */}
      <Suspense fallback={<SecuritySkeleton />}>
        <SessionsHistory studioSlug={studioSlug} />
      </Suspense>
    </div>
  );
}
