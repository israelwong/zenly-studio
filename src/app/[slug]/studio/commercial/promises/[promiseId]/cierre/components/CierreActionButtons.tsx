'use client';

import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { ZenButton } from '@/components/ui/zen';

interface CierreActionButtonsProps {
  onAutorizar: () => void;
  onCancelarCierre: () => void;
  isAuthorizing: boolean;
  loadingRegistro: boolean;
  puedeAutorizar: boolean;
}

export function CierreActionButtons({
  onAutorizar,
  onCancelarCierre,
  isAuthorizing,
  loadingRegistro,
  puedeAutorizar,
}: CierreActionButtonsProps) {
  return (
    <div className="space-y-2">
      <ZenButton
        variant="primary"
        className="w-full"
        onClick={onAutorizar}
        disabled={isAuthorizing || loadingRegistro || !puedeAutorizar}
        loading={isAuthorizing || loadingRegistro}
      >
        <CheckCircle2 className="w-4 h-4 mr-2" />
        Autorizar y Crear Evento
      </ZenButton>
      <ZenButton
        variant="outline"
        className="w-full text-zinc-400 hover:text-red-400 hover:border-red-500"
        onClick={onCancelarCierre}
      >
        <XCircle className="h-4 w-4 mr-2" />
        Cancelar Cierre
      </ZenButton>
    </div>
  );
}
