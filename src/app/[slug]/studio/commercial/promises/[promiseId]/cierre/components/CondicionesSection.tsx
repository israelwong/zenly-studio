'use client';

import React, { memo } from 'react';
import { CheckCircle2, AlertCircle, Loader2, MoreVertical } from 'lucide-react';
import { CondicionesComercialesDesglose } from '@/components/shared/condiciones-comerciales';
import { ZenDropdownMenu, ZenDropdownMenuTrigger, ZenDropdownMenuContent, ZenDropdownMenuItem } from '@/components/ui/zen';

interface CondicionComercial {
  id: string;
  name: string;
  description?: string | null;
  discount_percentage?: number | null;
  advance_type?: string;
  advance_percentage?: number | null;
  advance_amount?: number | null;
}

interface CondicionesSectionProps {
  condicionesData: {
    condiciones_comerciales_id?: string | null;
    condiciones_comerciales_definidas?: boolean;
    condiciones_comerciales?: CondicionComercial | null;
  } | null;
  loadingRegistro: boolean;
  precioBase: number;
  onDefinirClick: () => void;
  onQuitarCondiciones: () => void;
  isRemovingCondiciones: boolean;
  negociacionPrecioOriginal?: number | null;
  negociacionPrecioPersonalizado?: number | null;
}

export const CondicionesSection = memo(function CondicionesSection({
  condicionesData,
  loadingRegistro,
  precioBase,
  onDefinirClick,
  onQuitarCondiciones,
  isRemovingCondiciones,
  negociacionPrecioOriginal,
  negociacionPrecioPersonalizado,
}: CondicionesSectionProps) {
  if (condicionesData?.condiciones_comerciales_definidas && condicionesData?.condiciones_comerciales) {
    return (
      <CondicionesComercialesDesglose
        precioBase={precioBase}
        condicion={condicionesData.condiciones_comerciales as any}
        negociacionPrecioOriginal={negociacionPrecioOriginal}
        negociacionPrecioPersonalizado={negociacionPrecioPersonalizado}
        dropdownMenu={
          <ZenDropdownMenu>
            <ZenDropdownMenuTrigger asChild>
              <button
                className="h-5 w-5 p-0 rounded hover:bg-zinc-700/50 transition-colors flex items-center justify-center"
                disabled={isRemovingCondiciones}
              >
                <MoreVertical className="h-3.5 w-3.5 text-zinc-400" />
              </button>
            </ZenDropdownMenuTrigger>
            <ZenDropdownMenuContent align="end">
              <ZenDropdownMenuItem onClick={onDefinirClick}>
                Cambiar condiciones
              </ZenDropdownMenuItem>
              <ZenDropdownMenuItem 
                onClick={onQuitarCondiciones}
                className="text-red-400 hover:text-red-300"
              >
                Quitar condiciones
              </ZenDropdownMenuItem>
            </ZenDropdownMenuContent>
          </ZenDropdownMenu>
        }
      />
    );
  }

  return (
    <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-3">
      <div className="flex items-start gap-2">
        {loadingRegistro ? (
          <Loader2 className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5 animate-spin" />
        ) : (
          <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-zinc-400 uppercase tracking-wide font-semibold">
              Condiciones Comerciales
            </span>
            <button
              onClick={onDefinirClick}
              className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              Definir
            </button>
          </div>
          <span className="text-sm text-zinc-300">
            No definidas
          </span>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Solo re-renderizar si cambian datos de condiciones
  return (
    prevProps.condicionesData?.condiciones_comerciales_id === nextProps.condicionesData?.condiciones_comerciales_id &&
    prevProps.condicionesData?.condiciones_comerciales_definidas === nextProps.condicionesData?.condiciones_comerciales_definidas &&
    prevProps.loadingRegistro === nextProps.loadingRegistro &&
    prevProps.isRemovingCondiciones === nextProps.isRemovingCondiciones &&
    prevProps.precioBase === nextProps.precioBase &&
    prevProps.negociacionPrecioOriginal === nextProps.negociacionPrecioOriginal &&
    prevProps.negociacionPrecioPersonalizado === nextProps.negociacionPrecioPersonalizado
  );
});

