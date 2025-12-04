'use client';

import React, { useRef } from 'react';
import { ProfileHeader, ProfileNavigation, ProfileFooter } from '@/components/profile';

interface MobilePreviewOfferProps {
  children?: React.ReactNode;
  data?: Record<string, unknown>;
  loading?: boolean;
}

/**
 * MobilePreviewOffer - Preview móvil específico para ofertas
 * Con header, navigation (tab inicio activo) y footer
 */
export function MobilePreviewOffer({
  children,
  data,
  loading = false,
}: MobilePreviewOfferProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="w-full max-w-sm mx-auto relative">
      {/* Simulador de móvil con proporciones reales */}
      <div className="bg-zinc-900 border border-zinc-700 rounded-3xl shadow-2xl w-[375px] h-[812px] flex flex-col relative overflow-hidden">
        {/* Header Sticky con logo y nombre */}
        <div className="flex-shrink-0">
          <ProfileHeader data={data} loading={loading} />
        </div>

        {/* Navigation debajo del header */}
        <div className="flex-shrink-0">
          <ProfileNavigation activeSection="inicio" />
        </div>

        {/* Contenido con scroll interno */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#71717a transparent',
          }}
        >
          <div className="px-4 pb-4">
            {children}

            {/* Footer dentro del contenido scrolleable */}
            <div className="mt-6">
              <ProfileFooter data={data} loading={loading} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
