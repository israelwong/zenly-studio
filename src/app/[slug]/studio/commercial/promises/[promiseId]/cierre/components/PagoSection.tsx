'use client';

import React, { memo } from 'react';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface PagoSectionProps {
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

export const PagoSection = memo(function PagoSection({
  pagoData,
  loadingRegistro,
  onRegistrarPagoClick,
}: PagoSectionProps) {
  // Calcular estado del pago dentro del componente
  let pagoIcon: React.ReactNode;
  let pagoEstado: string;
  let pagoColor: string;

  let metodoPagoNombre: string | null = null;
  
  if (pagoData?.pago_concepto && pagoData?.pago_monto) {
    pagoIcon = <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />;
    pagoEstado = `${pagoData.pago_concepto}: $${pagoData.pago_monto.toLocaleString('es-MX')}`;
    pagoColor = 'text-emerald-400';
    metodoPagoNombre = pagoData.pago_metodo_nombre || null;
  } else if (pagoData?.pago_registrado === false) {
    pagoIcon = <AlertCircle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />;
    pagoEstado = 'Promesa de pago';
    pagoColor = 'text-blue-400';
  } else {
    pagoIcon = <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />;
    pagoEstado = 'No definido';
    pagoColor = 'text-amber-400';
  }
  return (
    <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-3">
      <div className="flex items-start gap-2">
        {loadingRegistro ? (
          <Loader2 className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5 animate-spin" />
        ) : (
          pagoIcon
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-zinc-400 uppercase tracking-wide font-semibold">
              Pago Inicial
            </span>
            <button
              onClick={onRegistrarPagoClick}
              className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              {pagoData?.pago_registrado ? 'Editar' : 'Registrar'}
            </button>
          </div>
          {!pagoData?.pago_registrado && (
            <span className="text-sm text-zinc-300">
              No registrado
            </span>
          )}
          <div className={`text-xs ${!pagoData?.pago_registrado ? 'mt-1' : ''}`}>
            <span className={pagoColor}>{pagoEstado}</span>
            {metodoPagoNombre && (
              <span className="text-zinc-500"> • {metodoPagoNombre}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Solo re-renderizar si cambian datos de pago
  return (
    prevProps.pagoData?.pago_registrado === nextProps.pagoData?.pago_registrado &&
    prevProps.pagoData?.pago_concepto === nextProps.pagoData?.pago_concepto &&
    prevProps.pagoData?.pago_monto === nextProps.pagoData?.pago_monto &&
    prevProps.pagoData?.pago_metodo_nombre === nextProps.pagoData?.pago_metodo_nombre &&
    prevProps.loadingRegistro === nextProps.loadingRegistro
  );
});

