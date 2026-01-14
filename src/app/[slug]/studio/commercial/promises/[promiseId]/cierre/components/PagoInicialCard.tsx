'use client';

import React from 'react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle } from '@/components/ui/zen';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

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
  // Determinar estado del pago
  const tienePagoRegistrado = pagoData?.pago_concepto && pagoData?.pago_monto;
  const esPromesaPago = pagoData?.pago_registrado === false || !tienePagoRegistrado;

  // Mostrar contenido siempre (pago registrado o promesa de pago)
  const mostrarContenido = true;

  return (
    <ZenCard className="h-auto">
      <ZenCardHeader className="border-b border-zinc-800 py-3 px-4">
        <div className="flex items-center justify-between">
          <ZenCardTitle className="text-sm">Pago Inicial</ZenCardTitle>
          <button
            onClick={onRegistrarPagoClick}
            className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            {tienePagoRegistrado ? 'Editar' : 'Registrar'}
          </button>
        </div>
      </ZenCardHeader>
      <ZenCardContent className="p-4">
        {mostrarContenido && (
          <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-3">
            <div className="flex items-start gap-2">
              {loadingRegistro ? (
                <Loader2 className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5 animate-spin" />
              ) : tienePagoRegistrado ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                {tienePagoRegistrado ? (
                  <div className="space-y-1">
                    <div className="text-xs text-emerald-400">
                      {pagoData.pago_concepto}: ${pagoData.pago_monto?.toLocaleString('es-MX')}
                    </div>
                    {pagoData.pago_metodo_nombre && (
                      <div className="text-xs text-zinc-500">
                        Método: {pagoData.pago_metodo_nombre}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-blue-400">
                    Promesa de pago
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        <div className="mt-3 text-xs text-zinc-500 text-center">
          Este pago solo se registrará al crear el evento
        </div>
      </ZenCardContent>
    </ZenCard>
  );
}
