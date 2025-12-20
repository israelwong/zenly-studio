'use client';

import React from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription, ZenButton } from '@/components/ui/zen';
import { CotizacionForm } from '../../../components/CotizacionForm';

export default function NuevaCotizacionPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const studioSlug = params.slug as string;
  const promiseId = params.promiseId as string;
  const packageId = searchParams.get('paqueteId') || null;
  const contactId = searchParams.get('contactId') || null;

  return (
    <div className="w-full max-w-7xl mx-auto">
      <ZenCard variant="default" padding="none">
        <ZenCardHeader className="border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <ZenButton
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="p-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </ZenButton>
            <div>
              <ZenCardTitle>Nueva Cotización</ZenCardTitle>
              <ZenCardDescription>
                {packageId ? 'Crear cotización desde paquete' : 'Crear cotización personalizada'}
              </ZenCardDescription>
            </div>
          </div>
        </ZenCardHeader>
        <ZenCardContent className="p-6">
          <CotizacionForm
            studioSlug={studioSlug}
            promiseId={promiseId}
            packageId={packageId}
            contactId={contactId}
            redirectOnSuccess={`/${studioSlug}/studio/commercial/promises/${promiseId}`}
          />
        </ZenCardContent>
      </ZenCard>
    </div>
  );
}

