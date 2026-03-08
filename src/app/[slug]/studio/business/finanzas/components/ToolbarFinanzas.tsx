'use client';

import React from 'react';
import { History, ShieldAlert } from 'lucide-react';
import { ZenButton } from '@/components/ui/zen';

export type VistaFinanzas = 'resumen' | 'rentabilidad';

interface ToolbarFinanzasProps {
  vistaActiva: VistaFinanzas;
  onVistaChange: (vista: VistaFinanzas) => void;
  onHistorial: () => void;
  onAuditoria: () => void;
}

export function ToolbarFinanzas({
  vistaActiva,
  onVistaChange,
  onHistorial,
  onAuditoria,
}: ToolbarFinanzasProps) {
  return (
    <div className="flex items-center justify-between gap-2 px-6 py-2.5 border-b border-zinc-800 bg-zinc-900/50">
      {/* Tabs a la izquierda */}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => onVistaChange('resumen')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            vistaActiva === 'resumen'
              ? 'bg-zinc-800 text-zinc-100'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Resumen
        </button>
        <button
          type="button"
          onClick={() => onVistaChange('rentabilidad')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            vistaActiva === 'rentabilidad'
              ? 'bg-zinc-800 text-zinc-100'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Rentabilidad
        </button>
      </div>

      {/* Historial y Auditoría a la derecha, ghost para no competir con las Tabs */}
      <div className="flex items-center gap-1.5">
        <ZenButton
          variant="ghost"
          size="sm"
          onClick={onHistorial}
          icon={History}
          iconPosition="left"
        >
          Historial de transacciones
        </ZenButton>
        <ZenButton
          variant="ghost"
          size="sm"
          onClick={onAuditoria}
          icon={ShieldAlert}
          iconPosition="left"
        >
          Auditoría de Integridad
        </ZenButton>
      </div>
    </div>
  );
}
