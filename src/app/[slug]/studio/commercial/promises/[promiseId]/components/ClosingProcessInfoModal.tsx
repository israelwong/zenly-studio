'use client';

import React, { useState } from 'react';
import { Info, CheckCircle2, FileText, CreditCard, Bell } from 'lucide-react';
import { ZenDialog, ZenBadge, ZenCheckbox } from '@/components/ui/zen';
import { formatDisplayDateLong } from '@/lib/utils/date-formatter';
import { toUtcDateOnly } from '@/lib/utils/date-only';

interface ReminderInfo {
  id: string;
  subject_text: string;
  reminder_date: Date;
  description: string | null;
}

interface ClosingProcessInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (deleteReminder: boolean) => void;
  onCancel?: () => void;
  cotizacionName?: string;
  reminder?: ReminderInfo | null;
  isLoading?: boolean;
}

export function ClosingProcessInfoModal({
  isOpen,
  onClose,
  onConfirm,
  onCancel,
  cotizacionName,
  reminder,
  isLoading = false,
}: ClosingProcessInfoModalProps) {
  const [deleteReminder, setDeleteReminder] = useState(false);

  const handleConfirm = () => {
    if (isLoading) return; // No permitir confirmar si ya está procesando
    onConfirm(deleteReminder);
  };

  // Resetear estado cuando se cierra el modal
  React.useEffect(() => {
    if (!isOpen) {
      setDeleteReminder(false);
    }
  }, [isOpen]);

  const handleCancel = () => {
    if (isLoading) return; // No permitir cancelar si está procesando
    onCancel?.();
    onClose();
  };

  const handleClose = () => {
    if (isLoading) return; // No permitir cerrar si está procesando
    onClose();
  };

  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={handleClose}
      title="¿Pasar cotización a proceso de cierre?"
      description={
        isLoading
          ? 'Procesando y redirigiendo...'
          : cotizacionName
            ? `Estás a punto de pasar "${cotizacionName}" al proceso de cierre.`
            : 'Estás a punto de pasar esta cotización al proceso de cierre.'
      }
      maxWidth="lg"
      onSave={handleConfirm}
      onCancel={handleCancel}
      saveLabel={isLoading ? 'Procesando...' : 'Continuar'}
      cancelLabel="Cancelar"
      closeOnClickOutside={false}
      isLoading={isLoading}
    >
      <div className="space-y-6">
        {/* Información principal */}
        <div className="bg-gradient-to-br from-zinc-800/60 to-zinc-800/40 border border-zinc-700/50 rounded-lg p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
              <Info className="h-5 w-5 text-blue-400" />
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <p className="text-sm font-semibold text-zinc-200 mb-2">¿Qué pasará?</p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-sm text-zinc-300">
                        La cotización cambiará a estado{' '}
                        <ZenBadge variant="info" size="sm" className="inline-flex">
                          En Cierre
                        </ZenBadge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <FileText className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-zinc-300">
                        Podrás gestionar el contrato y registro de pago desde el panel de proceso de cierre
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CreditCard className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-zinc-300">
                        Solo puede haber una cotización en proceso de cierre por promesa
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Información sobre recordatorio */}
        {reminder && (
          <div className="bg-amber-950/20 border border-amber-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                <Bell className="h-4 w-4 text-amber-400" />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-sm font-medium text-amber-200 mb-1">
                    Recordatorio asociado
                  </p>
                  <p className="text-xs text-amber-300/80 mb-2">
                    Esta promesa tiene un recordatorio programado: <strong>{reminder.subject_text}</strong>
                  </p>
                  {reminder.description && (
                    <p className="text-xs text-amber-300/60 mb-2">
                      {reminder.description}
                    </p>
                  )}
                  <p className="text-xs text-amber-300/60">
                    Fecha: {formatDisplayDateLong(toUtcDateOnly(reminder.reminder_date))}
                  </p>
                </div>
                <div className="pt-2 border-t border-amber-500/20">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <ZenCheckbox
                      checked={deleteReminder}
                      onCheckedChange={(checked) => setDeleteReminder(checked === true)}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <p className="text-sm text-amber-200 group-hover:text-amber-100">
                        Eliminar recordatorio al pasar a cierre
                      </p>
                      <p className="text-xs text-amber-300/60 mt-1">
                        Si no lo marcas, el recordatorio se mantendrá activo
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ZenDialog>
  );
}
