'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { ZenDialog } from '@/components/ui/zen';
import { toast } from 'sonner';
import type { EventoDetalle } from '@/lib/actions/studio/business/events';

interface InfoCrearRevisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  cotizacion: NonNullable<EventoDetalle['cotizaciones']>[number];
  studioSlug: string;
}

export function InfoCrearRevisionModal({
  isOpen,
  onClose,
  onConfirm,
  cotizacion,
  studioSlug,
}: InfoCrearRevisionModalProps) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleConfirm = () => {
    if (!cotizacion.promise_id) {
      toast.error('No hay promesa asociada');
      return;
    }

    setIsRedirecting(true);
    // Redirigir a página de nueva cotización (flujo legacy de revisión eliminado)
    // Si se necesita crear una revisión, se debe hacer desde el flujo normal de cotizaciones
    const redirectUrl = `/${studioSlug}/studio/commercial/promises/${cotizacion.promise_id}/cotizacion/nueva`;
    router.push(redirectUrl);
  };

  // Prevenir que el modal se cierre cuando está redirigiendo
  const handleClose = () => {
    if (!isRedirecting && !isCreating) {
      onClose();
    }
  };

  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Crear Revisión de Cotización"
      description="¿Qué significa crear una revisión?"
      maxWidth="lg"
      onCancel={handleClose}
      cancelLabel="Cancelar"
      onSave={handleConfirm}
      saveLabel={
        isRedirecting
          ? 'Redirigiendo para edición...'
          : isCreating
            ? 'Creando Revisión...'
            : 'Continuar con edición'
      }
      saveVariant="primary"
      isLoading={isCreating || isRedirecting}
    >
      <div className="space-y-6">
        {/* Información principal */}
        <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-900/20 rounded-lg">
              <FileText className="h-5 w-5 text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white mb-1">
                Cotización: {cotizacion.name}
              </h3>
              <p className="text-sm text-zinc-400">
                Se creará una nueva versión de esta cotización que podrás modificar sin afectar la versión original.
              </p>
            </div>
          </div>
        </div>

        {/* Proceso paso a paso */}
        <div className="space-y-4">
          <h4 className="font-semibold text-zinc-300 text-sm uppercase tracking-wide">
            Proceso de Revisión
          </h4>

          <div className="space-y-3">
            {/* Paso 1 */}
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-900/30 border border-emerald-700/50 flex items-center justify-center">
                <span className="text-emerald-400 font-semibold text-sm">1</span>
              </div>
              <div className="flex-1">
                <p className="text-sm text-white font-medium mb-1">
                  Crear Revisión
                </p>
                <p className="text-xs text-zinc-400">
                  Se creará una nueva cotización basada en la original. Podrás agregar, quitar o modificar servicios y ajustar precios.
                </p>
              </div>
            </div>

            {/* Flecha */}
            <div className="flex items-center justify-center py-1">
              <ArrowRight className="h-4 w-4 text-zinc-600" />
            </div>

            {/* Paso 2 */}
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-900/30 border border-blue-700/50 flex items-center justify-center">
                <span className="text-blue-400 font-semibold text-sm">2</span>
              </div>
              <div className="flex-1">
                <p className="text-sm text-white font-medium mb-1">
                  Revisión Pendiente
                </p>
                <p className="text-xs text-zinc-400">
                  La revisión quedará como &quot;pendiente&quot; hasta que la autorices. La cotización original seguirá siendo la activa del evento.
                </p>
              </div>
            </div>

            {/* Flecha */}
            <div className="flex items-center justify-center py-1">
              <ArrowRight className="h-4 w-4 text-zinc-600" />
            </div>

            {/* Paso 3 */}
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-900/30 border border-purple-700/50 flex items-center justify-center">
                <span className="text-purple-400 font-semibold text-sm">3</span>
              </div>
              <div className="flex-1">
                <p className="text-sm text-white font-medium mb-1">
                  Autorizar Revisión
                </p>
                <p className="text-xs text-zinc-400">
                  Al autorizar, la revisión se convertirá en la cotización activa. Las tareas del scheduler y asignaciones de personal se migrarán automáticamente si los servicios coinciden.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Información importante */}
        <div className="bg-amber-900/20 border border-amber-700/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-300 mb-2">
                Información Importante
              </p>
              <ul className="text-xs text-zinc-400 space-y-1.5">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <span>La cotización original se mantendrá como histórico y no se eliminará.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <span>Si eliminas servicios que tienen tareas o personal asignado, esas dependencias no se migrarán.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <span>Los pagos registrados se mantendrán vinculados a la cotización original.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </ZenDialog>
  );
}
