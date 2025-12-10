'use client';

import React from 'react';

interface MobilePreviewOfferProps {
  children?: React.ReactNode;
  data?: Record<string, unknown>;
  loading?: boolean;
}

/**
 * MobilePreviewOffer - Preview móvil específico para ofertas
 * Muestra solo la card de oferta sin header ni navegación
 */
export function MobilePreviewOffer({
  children,
}: MobilePreviewOfferProps) {
  return (
    <div className="w-full max-w-sm mx-auto relative">
      {/* Simulador de móvil con proporciones reales */}
      <div className="bg-zinc-900 border border-zinc-700 rounded-3xl shadow-2xl w-[375px] h-[812px] flex flex-col relative overflow-hidden">
        {/* Contenido desde arriba con scroll */}
        <div className="flex-1 overflow-y-auto p-4">
          {children}
        </div>
      </div>
    </div>
  );
}
