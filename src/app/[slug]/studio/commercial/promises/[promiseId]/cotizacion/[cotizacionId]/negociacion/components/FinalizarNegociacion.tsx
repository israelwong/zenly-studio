'use client';

import React, { useState } from 'react';
import {
  ZenCard,
  ZenCardContent,
  ZenCardHeader,
  ZenCardTitle,
  ZenCardDescription,
  ZenButton,
  ZenInput,
  ZenTextarea,
} from '@/components/ui/zen';
import {
  crearVersionNegociada,
  aplicarCambiosNegociacion,
} from '@/lib/actions/studio/commercial/promises/negociacion.actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import type {
  CalculoNegociacionResult,
  ValidacionMargen,
  CotizacionCompleta,
} from '@/lib/utils/negociacion-calc';
import type { NegociacionState } from '../page';

interface FinalizarNegociacionProps {
  negociacionState: NegociacionState;
  calculoNegociado: CalculoNegociacionResult | null;
  validacionMargen: ValidacionMargen | null;
  cotizacionOriginal: CotizacionCompleta;
  onFinalizar: (opcion: 'crear_version' | 'aplicar_cambios', nombre?: string) => Promise<void>;
  studioSlug: string;
  promiseId: string;
  cotizacionId: string;
}

export function FinalizarNegociacion({
  negociacionState,
  calculoNegociado,
  validacionMargen,
  cotizacionOriginal,
  studioSlug,
  promiseId,
  cotizacionId,
}: FinalizarNegociacionProps) {
  const router = useRouter();
  const [opcionFinalizar, setOpcionFinalizar] = useState<
    'crear_version' | 'aplicar_cambios' | null
  >(null);
  const [nombreVersion, setNombreVersion] = useState(
    `${cotizacionOriginal.name} - Negociada`
  );
  const [loading, setLoading] = useState(false);

  const tieneCambios =
    negociacionState.precioPersonalizado !== null ||
    negociacionState.descuentoAdicional !== null ||
    negociacionState.condicionComercialId !== null ||
    negociacionState.condicionComercialTemporal !== null ||
    negociacionState.itemsCortesia.size > 0;

  const handleFinalizar = async () => {
    if (!opcionFinalizar) {
      toast.error('Selecciona una opción para finalizar');
      return;
    }

    if (opcionFinalizar === 'crear_version' && !nombreVersion.trim()) {
      toast.error('El nombre de la versión es requerido');
      return;
    }

    if (!calculoNegociado) {
      toast.error('No hay cambios para aplicar');
      return;
    }

    // Validar margen antes de finalizar
    if (validacionMargen && !validacionMargen.esValido) {
      toast.error(validacionMargen.mensaje);
      return;
    }

    setLoading(true);

    try {
      if (opcionFinalizar === 'crear_version') {
        const result = await crearVersionNegociada({
          studio_slug: studioSlug,
          cotizacion_original_id: cotizacionId,
          nombre: nombreVersion.trim(),
          descripcion: cotizacionOriginal.description || undefined,
          precio_personalizado: negociacionState.precioPersonalizado ?? undefined,
          descuento_adicional: negociacionState.descuentoAdicional ?? undefined,
          condicion_comercial_id: negociacionState.condicionComercialId ?? undefined,
          condicion_comercial_temporal:
            negociacionState.condicionComercialTemporal ?? undefined,
          items_cortesia: Array.from(negociacionState.itemsCortesia),
          notas: negociacionState.notas || undefined,
        });

        if (result.success && result.data) {
          toast.success('Versión negociada creada exitosamente');
          router.push(
            `/${studioSlug}/studio/commercial/promises/${promiseId}/cotizacion/${result.data.id}`
          );
        } else {
          toast.error(result.error || 'Error al crear versión negociada');
        }
      } else {
        const result = await aplicarCambiosNegociacion({
          studio_slug: studioSlug,
          cotizacion_id: cotizacionId,
          precio_personalizado: negociacionState.precioPersonalizado ?? undefined,
          descuento_adicional: negociacionState.descuentoAdicional ?? undefined,
          condicion_comercial_id: negociacionState.condicionComercialId ?? undefined,
          condicion_comercial_temporal:
            negociacionState.condicionComercialTemporal ?? undefined,
          items_cortesia: Array.from(negociacionState.itemsCortesia),
          notas: negociacionState.notas || undefined,
        });

        if (result.success) {
          toast.success('Cambios aplicados exitosamente');
          router.push(
            `/${studioSlug}/studio/commercial/promises/${promiseId}/cotizacion/${cotizacionId}`
          );
        } else {
          toast.error(result.error || 'Error al aplicar cambios');
        }
      }
    } catch (error) {
      console.error('[NEGOCIACION] Error finalizando:', error);
      toast.error('Error al finalizar negociación');
    } finally {
      setLoading(false);
    }
  };

  if (!tieneCambios) {
    return null;
  }

  return (
    <ZenCard>
      <ZenCardHeader>
        <ZenCardTitle>Finalizar Negociación</ZenCardTitle>
        <ZenCardDescription>
          Elige cómo deseas aplicar los cambios de negociación
        </ZenCardDescription>
      </ZenCardHeader>
      <ZenCardContent className="space-y-6">
        {/* Opciones */}
        <div className="space-y-3">
          <label className="flex items-start gap-3 p-4 rounded-lg border border-zinc-800 cursor-pointer hover:bg-zinc-900/50 transition-colors">
            <input
              type="radio"
              name="finalizar"
              value="crear_version"
              checked={opcionFinalizar === 'crear_version'}
              onChange={() => setOpcionFinalizar('crear_version')}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="font-medium text-zinc-200">
                Crear nueva versión negociada
              </div>
              <div className="text-sm text-zinc-400 mt-1">
                Crea una nueva cotización como revisión con los cambios aplicados.
                La original se mantiene intacta.
              </div>
            </div>
          </label>

          <label className="flex items-start gap-3 p-4 rounded-lg border border-zinc-800 cursor-pointer hover:bg-zinc-900/50 transition-colors">
            <input
              type="radio"
              name="finalizar"
              value="aplicar_cambios"
              checked={opcionFinalizar === 'aplicar_cambios'}
              onChange={() => setOpcionFinalizar('aplicar_cambios')}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="font-medium text-zinc-200">
                Aplicar cambios a cotización actual
              </div>
              <div className="text-sm text-zinc-400 mt-1">
                Modifica la cotización actual directamente con los cambios de
                negociación.
              </div>
            </div>
          </label>
        </div>

        {/* Nombre de versión (solo si crear versión) */}
        {opcionFinalizar === 'crear_version' && (
          <div className="space-y-2">
            <ZenInput
              label="Nombre de la versión"
              value={nombreVersion}
              onChange={(e) => setNombreVersion(e.target.value)}
              placeholder="Ej: Cotización Básica - Oferta Especial"
              required
            />
          </div>
        )}

        {/* Notas */}
        <div className="space-y-2">
            <ZenTextarea
              label="Notas (opcional)"
              value={negociacionState.notas}
              onChange={(e) => onNotasChange(e.target.value)}
              placeholder="Notas sobre esta negociación..."
              rows={3}
            />
        </div>

        {/* Resumen de cambios */}
        {calculoNegociado && (
          <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg space-y-2">
            <div className="text-sm font-medium text-zinc-300 mb-3">
              Resumen de cambios:
            </div>
            <ul className="space-y-1 text-sm text-zinc-400">
              {negociacionState.precioPersonalizado !== null && (
                <li>
                  • Precio personalizado:{' '}
                  {calculoNegociado.precioFinal.toLocaleString('es-MX', {
                    style: 'currency',
                    currency: 'MXN',
                  })}
                </li>
              )}
              {negociacionState.descuentoAdicional !== null &&
                negociacionState.descuentoAdicional > 0 && (
                  <li>
                    • Descuento adicional:{' '}
                    {negociacionState.descuentoAdicional.toLocaleString('es-MX', {
                      style: 'currency',
                      currency: 'MXN',
                    })}
                  </li>
                )}
              {(negociacionState.condicionComercialId ||
                negociacionState.condicionComercialTemporal) && (
                <li>
                  • Condición comercial especial aplicada
                </li>
              )}
              {negociacionState.itemsCortesia.size > 0 && (
                <li>
                  • {negociacionState.itemsCortesia.size} item(s) marcado(s) como
                  cortesía
                </li>
              )}
              <li>
                • Impacto en utilidad:{' '}
                <span
                  className={
                    calculoNegociado.impactoUtilidad < 0
                      ? 'text-red-400'
                      : 'text-emerald-400'
                  }
                >
                  {calculoNegociado.impactoUtilidad > 0 ? '+' : ''}
                  {calculoNegociado.impactoUtilidad.toLocaleString('es-MX', {
                    style: 'currency',
                    currency: 'MXN',
                  })}
                </span>
              </li>
            </ul>
          </div>
        )}

        {/* Botones */}
        <div className="flex gap-3">
          <ZenButton
            variant="primary"
            onClick={handleFinalizar}
            disabled={!opcionFinalizar || loading}
            loading={loading}
            className="flex-1"
          >
            {opcionFinalizar === 'crear_version'
              ? 'Crear Versión Negociada'
              : 'Aplicar Cambios'}
          </ZenButton>
        </div>
      </ZenCardContent>
    </ZenCard>
  );
}
