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
  studioSlug: string;
  promiseId: string;
  cotizacionId: string;
  onNotasChange: (notas: string) => void;
}

export function FinalizarNegociacion({
  negociacionState,
  calculoNegociado,
  validacionMargen,
  cotizacionOriginal,
  studioSlug,
  promiseId,
  cotizacionId,
  onNotasChange,
}: FinalizarNegociacionProps) {
  const router = useRouter();
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
    if (!nombreVersion.trim()) {
      toast.error('El nombre de la cotización es requerido');
      return;
    }

    if (!calculoNegociado) {
      // Verificar si es porque el precio es inválido
      const precioMinimo = cotizacionOriginal.items.reduce(
        (sum, item) =>
          sum +
          ((item.cost ?? 0) * item.quantity) +
          ((item.expense ?? 0) * item.quantity),
        0
      );
      if (
        negociacionState.precioPersonalizado !== null &&
        negociacionState.precioPersonalizado < precioMinimo
      ) {
        toast.error(
          `El precio negociado no puede ser menor al costo total + gasto total (${precioMinimo.toLocaleString('es-MX', {
            style: 'currency',
            currency: 'MXN',
          })})`
        );
      } else {
        toast.error('No hay cambios válidos para aplicar');
      }
      return;
    }

    // Validar margen antes de finalizar
    if (validacionMargen && !validacionMargen.esValido) {
      toast.error(validacionMargen.mensaje);
      return;
    }

    setLoading(true);

    try {
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
        toast.success('Cotización en negociación creada exitosamente');
        router.push(
          `/${studioSlug}/studio/commercial/promises/${promiseId}/cotizacion/${result.data.id}`
        );
      } else {
        toast.error(result.error || 'Error al crear cotización en negociación');
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
        <ZenCardTitle>Crear Cotización en Negociación</ZenCardTitle>
        <ZenCardDescription>
          Se creará una nueva cotización con estado "negociación" basada en la cotización original
        </ZenCardDescription>
      </ZenCardHeader>
      <ZenCardContent className="space-y-6">
        {/* Nombre de la cotización */}
        <div className="space-y-2">
          <ZenInput
            label="Nombre de la cotización"
            value={nombreVersion}
            onChange={(e) => setNombreVersion(e.target.value)}
            placeholder="Ej: Cotización Básica - Negociada"
            required
          />
        </div>

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
            disabled={loading}
            loading={loading}
            className="flex-1"
          >
            Crear Cotización en Negociación
          </ZenButton>
        </div>
      </ZenCardContent>
    </ZenCard>
  );
}
