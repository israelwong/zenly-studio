'use client';

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { ZenButton } from '@/components/ui/zen';
import type { CotizacionCompleta } from '@/lib/utils/negociacion-calc';

interface NegociacionHeaderProps {
  cotizacion: CotizacionCompleta | null;
  onBack: () => void;
}

export function NegociacionHeader({
  cotizacion,
  onBack,
}: NegociacionHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <ZenButton
          variant="ghost"
          size="sm"
          onClick={onBack}
          icon={ArrowLeft}
          iconPosition="left"
        >
          Volver
        </ZenButton>
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">
            Negociación de Cotización
          </h1>
          {cotizacion && (
            <p className="text-sm text-zinc-400 mt-1">{cotizacion.name}</p>
          )}
        </div>
      </div>
    </div>
  );
}
