'use client';

import React from 'react';
import { CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react';
import { ZenButton } from '@/components/ui/zen';

interface CierreActionButtonsProps {
  onAutorizar: () => void;
  onCancelarCierre: () => void;
  isAuthorizing: boolean;
  loadingRegistro: boolean;
  puedeAutorizar: boolean;
  /** Estado local del switch de pago: botón deshabilitado si false cuando requiereConfirmacionPago (mismo frame que el toggle) */
  pagoConfirmadoLocal?: boolean;
  /** Solo cuando true se exige pagoConfirmadoLocal para habilitar Autorizar (firma requerida + contrato firmado) */
  requiereConfirmacionPago?: boolean;
  /** true mientras se guarda confirmación de pago (evita autorizar con datos incompletos) */
  pagoUpdatePending?: boolean;
  /** false si falta método de pago en algún ítem del staging */
  pagoStagingValid?: boolean;
  /** Datos del contrato para validar firma y mensaje dinámico del footer */
  contratoData?: {
    firma_requerida?: boolean;
    contract_signed_at?: Date | null;
    /** Incluir contrato en el cierre (no omitido). Si true y !contratoGenerado, se pide generar. */
    contratoIncluido?: boolean;
    /** Contrato ya generado (plantilla/contenido). Si false con contratoIncluido, mensaje "generar contrato". */
    contratoGenerado?: boolean;
  } | null;
}

export function CierreActionButtons({
  onAutorizar,
  onCancelarCierre,
  isAuthorizing,
  loadingRegistro,
  puedeAutorizar,
  pagoConfirmadoLocal = false,
  requiereConfirmacionPago = false,
  pagoUpdatePending = false,
  pagoStagingValid = true,
  contratoData,
}: CierreActionButtonsProps) {
  // 🛡️ GUARDIÁN FINAL: Validar pago, contrato generado y firma
  const firmaRequerida = contratoData?.firma_requerida !== false;
  const contratoFirmado = contratoData?.contract_signed_at != null;
  const contratoIncluido = contratoData?.contratoIncluido === true;
  const contratoGenerado = contratoData?.contratoGenerado === true;
  const exigeContratoYNoGenerado = contratoIncluido && !contratoGenerado;
  const exigePagoYNoConfirmado = requiereConfirmacionPago && !pagoConfirmadoLocal;
  const exigeFirmaYNoProcesada = contratoGenerado && firmaRequerida && !contratoFirmado;

  // pagoStagingValid solo exige cuando se requiere confirmación de pago (contrato firmado + firma requerida)
  const stagingBlock = requiereConfirmacionPago && !pagoStagingValid;
  const autorizarDisabled = isAuthorizing || loadingRegistro || !puedeAutorizar || exigeContratoYNoGenerado || exigePagoYNoConfirmado || exigeFirmaYNoProcesada || pagoUpdatePending || stagingBlock;
  
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
      {/* Mensaje dinámico: generar contrato (Caso A) o firma pendiente (Caso B) — arriba del botón Autorizar */}
      {exigeContratoYNoGenerado && (
        <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-2">
          <Clock className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" aria-hidden />
          <p className="text-xs text-amber-300 leading-relaxed">
            Se requiere generar el contrato para autorizar el evento.
          </p>
        </div>
      )}
      {!exigeContratoYNoGenerado && exigeFirmaYNoProcesada && (
        <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-2">
          <Clock className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" aria-hidden />
          <p className="text-xs text-amber-300 leading-relaxed">
            Firma del contrato requerida para autorizar
          </p>
        </div>
      )}

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
