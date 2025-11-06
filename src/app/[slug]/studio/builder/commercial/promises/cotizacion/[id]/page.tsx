'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription, ZenButton } from '@/components/ui/zen';
import { CotizacionForm } from '../../components/CotizacionForm';

export default function EditarCotizacionPage() {
  const params = useParams();
  const router = useRouter();
  const studioSlug = params.slug as string;
  const cotizacionId = params.id as string;

  return (
    <div className="w-full max-w-7xl mx-auto">
      <ZenCard variant="default" padding="none">
        <ZenCardHeader className="border-b border-zinc-800">
          <div className="flex items-center justify-between w-full">
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
                <ZenCardTitle>Editar Cotización</ZenCardTitle>
                <ZenCardDescription>
                  Actualiza la información de la cotización
                </ZenCardDescription>
              </div>
            </div>
          </div>
        </ZenCardHeader>
        <ZenCardContent className="p-6">
          <CotizacionForm
            studioSlug={studioSlug}
            cotizacionId={cotizacionId}
            redirectOnSuccess={`/${studioSlug}/studio/builder/commercial/promises`}
          />
        </ZenCardContent>
      </ZenCard>
    </div>
  );
}

