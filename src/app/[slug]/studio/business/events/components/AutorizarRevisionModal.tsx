'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  ZenDialog,
  ZenButton,
  ZenInput,
  ZenCheckbox,
  ZenCard,
  ZenCardContent,
} from '@/components/ui/zen';
import { autorizarRevisionCotizacion } from '@/lib/actions/studio/commercial/promises/cotizaciones-revision.actions';
import { CondicionesComercialesSelector } from '@/app/[slug]/studio/commercial/promises/[promiseId]/cotizacion/[cotizacionId]/autorizar/components/CondicionesComercialesSelector';
import { formatearMoneda } from '@/lib/actions/studio/catalogo/calcular-precio';
import type { EventoDetalle } from '@/lib/actions/studio/business/events';

interface AutorizarRevisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  studioSlug: string;
  promiseId: string;
  revision: NonNullable<EventoDetalle['cotizaciones']>[number];
  onSuccess?: () => void;
}

export function AutorizarRevisionModal({
  isOpen,
  onClose,
  studioSlug,
  promiseId,
  revision,
  onSuccess,
}: AutorizarRevisionModalProps) {
  const [condicionComercialId, setCondicionComercialId] = useState<string | null>(null);
  const [monto, setMonto] = useState<string>('');
  const [migrarDependencias, setMigrarDependencias] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inicializar monto con precio de revisión
  useEffect(() => {
    if (isOpen && revision) {
      setMonto(revision.price.toString());
    }
  }, [isOpen, revision]);

  const handleAutorizar = async () => {
    if (!condicionComercialId || !monto || isSubmitting) {
      toast.error('Completa todos los campos requeridos');
      return;
    }

    const montoNumero = parseFloat(monto);
    if (isNaN(montoNumero) || montoNumero < 0) {
      toast.error('El monto debe ser un número válido');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await autorizarRevisionCotizacion({
        studio_slug: studioSlug,
        revision_id: revision.id,
        promise_id: promiseId,
        condiciones_comerciales_id: condicionComercialId,
        monto: montoNumero,
        migrar_dependencias: migrarDependencias,
      });

      if (!result.success) {
        toast.error(result.error || 'Error al autorizar revisión');
        return;
      }

      toast.success('Revisión autorizada exitosamente');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error autorizing revision:', error);
      toast.error('Error al autorizar revisión');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Autorizar Revisión de Cotización"
      maxWidth="2xl"
    >
      <div className="space-y-6">
        {/* Información de la revisión */}
        <div className="p-4 bg-blue-950/20 border border-blue-500/30 rounded-lg">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-300 mb-1">Revisión #{revision.revision_number || 1}</p>
              <p className="text-sm text-blue-200">{revision.name}</p>
              <p className="text-xs text-blue-400 mt-1">
                Precio base: {formatearMoneda(revision.price)}
              </p>
            </div>
          </div>
        </div>

        {/* Condiciones Comerciales */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Condiciones Comerciales *
          </label>
          <CondicionesComercialesSelector
            studioSlug={studioSlug}
            selectedId={condicionComercialId}
            onSelect={setCondicionComercialId}
            precioBase={revision.price}
            onMontoChange={setMonto}
            disabled={isSubmitting}
          />
        </div>

        {/* Monto Total */}
        <ZenCard variant="outlined">
          <ZenCardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-white mb-1">Monto Total</h3>
                <p className="text-xs text-zinc-400">
                  Monto final después de aplicar condiciones comerciales
                </p>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-emerald-400">
                  {monto ? formatearMoneda(parseFloat(monto)) : formatearMoneda(0)}
                </div>
              </div>
            </div>
          </ZenCardContent>
        </ZenCard>

        {/* Opción de migración de dependencias */}
        <div className="p-4 bg-zinc-900/30 border border-zinc-800 rounded-lg">
          <div className="flex items-start gap-3">
            <ZenCheckbox
              checked={migrarDependencias}
              onCheckedChange={setMigrarDependencias}
              disabled={isSubmitting}
            />
            <div className="flex-1">
              <label className="text-sm font-medium text-zinc-300 cursor-pointer">
                Migrar dependencias automáticamente
              </label>
              <p className="text-xs text-zinc-400 mt-1">
                Si está marcado, se migrarán automáticamente las tareas del scheduler y las
                asignaciones de personal de la cotización original a esta revisión. Los items
                se emparejarán por su ID del catálogo.
              </p>
              {!migrarDependencias && (
                <div className="mt-2 p-2 bg-yellow-950/20 border border-yellow-500/30 rounded text-xs text-yellow-300">
                  <AlertCircle className="h-3 w-3 inline mr-1" />
                  Sin migración, las tareas y asignaciones quedarán vinculadas a la cotización original.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
          <ZenButton type="button" variant="ghost" onClick={handleClose} disabled={isSubmitting}>
            Cancelar
          </ZenButton>
          <ZenButton onClick={handleAutorizar} loading={isSubmitting} disabled={isSubmitting || !condicionComercialId || !monto}>
            Autorizar Revisión
          </ZenButton>
        </div>
      </div>
    </ZenDialog>
  );
}
