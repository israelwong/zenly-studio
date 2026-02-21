'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ZenButton } from '@/components/ui/zen';
import type { CotizacionCompleta } from '@/lib/utils/negociacion-calc';

interface NegociacionHeaderProps {
  cotizacion: CotizacionCompleta | null;
  /** Ruta explícita al detalle de la promesa (recomendado: funciona en nueva pestaña) */
  backHref?: string;
  /** Solo se usa si backHref no está definido */
  onBack?: () => void;
}

export function NegociacionHeader({
  cotizacion,
  backHref,
  onBack,
}: NegociacionHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        {backHref ? (
          <Link
            href={backHref}
            onClick={() => window.dispatchEvent(new CustomEvent('close-overlays'))}
            className="inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors"
            aria-label="Volver al detalle de la promesa"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
        ) : (
          <ZenButton
            variant="ghost"
            size="sm"
            onClick={onBack}
            icon={ArrowLeft}
            iconPosition="left"
          >
            Volver
          </ZenButton>
        )}
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
