'use client';

import React from 'react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle } from '@/components/ui/zen';
import { PagoSection } from './PagoSection';

interface PagoInicialCardProps {
  pagoData: {
    pago_registrado?: boolean;
    pago_concepto?: string | null;
    pago_monto?: number | null;
    pago_fecha?: Date | null;
    pago_metodo_id?: string | null;
    pago_metodo_nombre?: string | null;
  } | null;
  loadingRegistro: boolean;
  onRegistrarPagoClick: () => void;
}

export function PagoInicialCard({
  pagoData,
  loadingRegistro,
  onRegistrarPagoClick,
}: PagoInicialCardProps) {
  return (
    <ZenCard className="h-auto">
      <ZenCardHeader className="border-b border-zinc-800 py-3 px-4">
        <ZenCardTitle className="text-sm">Pago Inicial</ZenCardTitle>
      </ZenCardHeader>
      <ZenCardContent className="p-4">
        <PagoSection
          pagoData={pagoData}
          loadingRegistro={loadingRegistro}
          onRegistrarPagoClick={onRegistrarPagoClick}
        />
      </ZenCardContent>
    </ZenCard>
  );
}
