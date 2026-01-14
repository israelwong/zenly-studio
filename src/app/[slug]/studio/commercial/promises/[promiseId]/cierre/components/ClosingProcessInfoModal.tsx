'use client';

import React, { useState } from 'react';
import { Info } from 'lucide-react';
import { ZenDialog, ZenButton, ZenCheckbox } from '@/components/ui/zen';

interface ClosingProcessInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onCancel?: () => void;
  showDismissCheckbox?: boolean;
  cotizacionName?: string;
  isLoading?: boolean;
}

const STORAGE_KEY = 'zen-closing-process-info-dismissed';

export function getClosingProcessInfoDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setClosingProcessInfoDismissed(value: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (value) {
      localStorage.setItem(STORAGE_KEY, 'true');
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Ignorar errores de localStorage
  }
}

export function ClosingProcessInfoModal({
  isOpen,
  onClose,
  onConfirm,
  onCancel,
  showDismissCheckbox = true,
  cotizacionName,
  isLoading = false,
}: ClosingProcessInfoModalProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleConfirm = () => {
    if (showDismissCheckbox && dontShowAgain) {
      setClosingProcessInfoDismissed(true);
    }
    onConfirm();
  };

  const handleCancel = () => {
    onCancel?.();
    onClose();
  };

  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={onClose}
      title="¿Pasar cotización a proceso de cierre?"
      description={
        cotizacionName
          ? `Estás a punto de pasar "${cotizacionName}" al proceso de cierre.`
          : 'Estás a punto de pasar esta cotización al proceso de cierre.'
      }
      maxWidth="md"
      onSave={handleConfirm}
      onCancel={handleCancel}
      saveLabel="Continuar"
      cancelLabel="Cancelar"
      closeOnClickOutside={false}
      isLoading={isLoading}
    >
      <div className="space-y-4">
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 space-y-3">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <p className="text-sm text-zinc-300 font-medium">¿Qué pasará?</p>
              <ul className="text-sm text-zinc-400 space-y-2 list-disc list-inside">
                <li>
                  La cotización cambiará a estado <span className="text-blue-400 font-medium">"En Cierre"</span>
                </li>
                <li>
                  Podrás gestionar el contrato y registro de pago desde el panel de proceso de cierre
                </li>
                <li>
                  Solo puede haber una cotización en proceso de cierre por promesa
                </li>
              </ul>
            </div>
          </div>
        </div>

        {showDismissCheckbox && (
          <div className="flex items-center gap-2 pt-2">
            <ZenCheckbox
              id="dont-show-again"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked === true)}
            />
            <label
              htmlFor="dont-show-again"
              className="text-sm text-zinc-400 cursor-pointer select-none"
            >
              No volver a mostrar este mensaje
            </label>
          </div>
        )}
      </div>
    </ZenDialog>
  );
}

