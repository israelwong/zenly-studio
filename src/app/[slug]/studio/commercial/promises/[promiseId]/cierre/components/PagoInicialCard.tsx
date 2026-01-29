'use client';

import React, { memo, useState } from 'react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenConfirmModal } from '@/components/ui/zen';
import { CheckCircle2, AlertCircle, Loader2, Trash2 } from 'lucide-react';

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
  onEliminarPago?: () => void | Promise<void>;
}

function PagoInicialCardInner({
  pagoData,
  loadingRegistro,
  onRegistrarPagoClick,
  onEliminarPago,
}: PagoInicialCardProps) {
  const [showEliminarPagoConfirm, setShowEliminarPagoConfirm] = useState(false);
  const tienePagoRegistrado = pagoData?.pago_concepto && pagoData?.pago_monto;

  const handleConfirmEliminar = async () => {
    await onEliminarPago?.();
    setShowEliminarPagoConfirm(false);
  };

  return (
    <ZenCard className="h-auto">
      <ZenCardHeader className="border-b border-zinc-800 py-3 px-4">
        <div className="flex items-center justify-between">
          <ZenCardTitle className="text-sm">Pago Inicial</ZenCardTitle>
          <button
            onClick={onRegistrarPagoClick}
            className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            {tienePagoRegistrado ? 'Editar' : 'Agregar'}
          </button>
        </div>
      </ZenCardHeader>
      <ZenCardContent className="p-4">
        <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-3">
          <div className="flex items-start gap-2">
            {loadingRegistro ? (
              <Loader2 className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5 animate-spin" />
            ) : tienePagoRegistrado ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0 overflow-visible">
              {tienePagoRegistrado ? (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex flex-col gap-0.5">
                    <div className="text-xs text-emerald-400 break-words">
                      {pagoData.pago_concepto}: ${pagoData.pago_monto?.toLocaleString('es-MX')}
                    </div>
                    {pagoData.pago_metodo_nombre != null && pagoData.pago_metodo_nombre !== '' && (
                      <div className="text-xs text-zinc-500 mt-0.5">
                        Método: {pagoData.pago_metodo_nombre}
                      </div>
                    )}
                  </div>
                  {onEliminarPago && (
                    <button
                      type="button"
                      onClick={() => setShowEliminarPagoConfirm(true)}
                      className="shrink-0 p-1.5 rounded-md text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Eliminar pago"
                      aria-label="Eliminar pago"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
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
        <div className="mt-3 text-xs text-zinc-500 text-center">
          Este pago solo se registrará al crear el evento
        </div>
      </ZenCardContent>

      <ZenConfirmModal
        isOpen={showEliminarPagoConfirm}
        onClose={() => setShowEliminarPagoConfirm(false)}
        onConfirm={handleConfirmEliminar}
        title="¿Quitar pago inicial?"
        description="Se eliminará el pago registrado. Quedará como promesa de pago. Puedes agregar otro pago después."
        confirmText="Sí, quitar pago"
        cancelText="Cancelar"
        variant="destructive"
      />
    </ZenCard>
  );
}

export const PagoInicialCard = memo(PagoInicialCardInner);
