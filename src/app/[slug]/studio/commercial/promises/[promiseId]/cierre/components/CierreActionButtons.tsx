'use client';

import React from 'react';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { ZenButton } from '@/components/ui/zen';

interface CierreActionButtonsProps {
  onAutorizar: () => void;
  onCancelarCierre: () => void;
  isAuthorizing: boolean;
  loadingRegistro: boolean;
  puedeAutorizar: boolean;
  /** Estado local del switch de pago: botón deshabilitado si false (mismo frame que el toggle) */
  pagoConfirmadoLocal?: boolean;
  /** true mientras se guarda confirmación de pago (evita autorizar con datos incompletos) */
  pagoUpdatePending?: boolean;
  /** false si falta método de pago en algún ítem del staging */
  pagoStagingValid?: boolean;
}

export function CierreActionButtons({
  onAutorizar,
  onCancelarCierre,
  isAuthorizing,
  loadingRegistro,
  puedeAutorizar,
  pagoConfirmadoLocal = false,
  pagoUpdatePending = false,
  pagoStagingValid = true,
}: CierreActionButtonsProps) {
  const autorizarDisabled = isAuthorizing || loadingRegistro || !puedeAutorizar || !pagoConfirmadoLocal || pagoUpdatePending || !pagoStagingValid;
  
  // Etiquetado semántico por contexto de carga (sin spinner manual, ZenButton lo maneja con loading prop)
  const getButtonText = () => {
    if (pagoUpdatePending) return 'Actualizando confirmación...';
    if (isAuthorizing) return 'Autorizando evento...';
    if (loadingRegistro) return 'Procesando...';
    return 'Autorizar y Crear Evento';
  };

  const isLoading = pagoUpdatePending || isAuthorizing || loadingRegistro;
  const showIcon = !isLoading;

  return (
    <div className="space-y-2">
      <ZenButton
        variant="primary"
        className="w-full"
        onClick={onAutorizar}
        disabled={autorizarDisabled}
        loading={isLoading}
      >
        {showIcon && <CheckCircle2 className="w-4 h-4 mr-2" />}
        {getButtonText()}
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
