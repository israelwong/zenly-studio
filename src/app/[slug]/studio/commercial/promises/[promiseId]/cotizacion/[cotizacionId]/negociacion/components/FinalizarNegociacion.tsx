'use client';

import React, { useState, startTransition } from 'react';
import {
  ZenCard,
  ZenCardContent,
  ZenCardHeader,
  ZenCardTitle,
  ZenCardDescription,
  ZenButton,
  ZenInput,
  ZenTextarea,
  ZenSwitch,
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
  studioSlug: string;
  promiseId: string;
  cotizacionId: string;
  onNotasChange: (notas: string) => void;
  condicionEsPrivada?: boolean;
  /** true si hay cambios en ítems o duración (add/remove/qty/horas) */
  hasItemOrDurationChanges?: boolean;
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
  condicionEsPrivada = false,
  hasItemOrDurationChanges = false,
}: FinalizarNegociacionProps) {
  const router = useRouter();

  const isUpdating = cotizacionOriginal.status === 'negociacion';

  const [nombreVersion, setNombreVersion] = useState(
    isUpdating ? cotizacionOriginal.name : `${cotizacionOriginal.name} - Especial`
  );
  const [loading, setLoading] = useState(false);
  const [visibleToClient, setVisibleToClient] = useState(
    isUpdating ? (cotizacionOriginal.visible_to_client ?? false) : false
  );

  const tieneCambios =
    hasItemOrDurationChanges ||
    negociacionState.precioPersonalizado !== null ||
    negociacionState.descuentoAdicional !== null ||
    negociacionState.condicionComercialId !== null ||
    negociacionState.condicionComercialTemporal !== null ||
    negociacionState.itemsCortesia.size > 0;

  const tieneCondicionComercial =
    negociacionState.condicionComercialId !== null ||
    negociacionState.condicionComercialTemporal !== null;

  const handleFinalizar = async () => {
    if (!tieneCondicionComercial) {
      toast.error('Selecciona una condición comercial de negociación para poder crear o actualizar');
      return;
    }

    // Solo validar nombre si estamos creando una nueva cotización
    if (!isUpdating && !nombreVersion.trim()) {
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
      const result = isUpdating
        ? await aplicarCambiosNegociacion({
            studio_slug: studioSlug,
            cotizacion_id: cotizacionId,
            precio_personalizado: negociacionState.precioPersonalizado ?? undefined,
            descuento_adicional: negociacionState.descuentoAdicional ?? undefined,
            condicion_comercial_id: negociacionState.condicionComercialId ?? undefined,
            condicion_comercial_temporal:
              negociacionState.condicionComercialTemporal ?? undefined,
            items_cortesia: Array.from(negociacionState.itemsCortesia),
            notas: negociacionState.notas || undefined,
            visible_to_client: visibleToClient,
          })
        : await crearVersionNegociada({
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
            visible_to_client: visibleToClient,
          });

      if (result.success && result.data) {
        toast.success(
          isUpdating
            ? 'Cotización en negociación actualizada exitosamente'
            : 'Cotización en negociación creada exitosamente'
        );
        startTransition(() => {
          router.push(`/${studioSlug}/studio/commercial/promises/${promiseId}`);
          router.refresh();
        });
      } else {
        toast.error(
          result.error ||
            (isUpdating
              ? 'Error al actualizar cotización en negociación'
              : 'Error al crear cotización en negociación')
        );
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
            placeholder="Ej: Cotización Básica - Especial"
            required
          />
        </div>

        {/* Notas + Visible para el cliente (menor separación entre ambos) */}
        <div className="space-y-2">
            <ZenTextarea
              label="Descripción (opcional)"
              value={negociacionState.notas}
              onChange={(e) => onNotasChange(e.target.value)}
              placeholder="Descripción de la negociación..."
              rows={3}
            />
          <div className="flex items-center justify-between p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg">
          <div className="flex-1">
            <label className="text-sm font-medium text-zinc-300 cursor-pointer">
              Visible para el cliente
            </label>
            <p className="text-xs text-zinc-500 mt-0.5">
              La cotización negociada será visible por el prospecto para revisión
            </p>
          </div>
          <ZenSwitch
            checked={visibleToClient}
            onCheckedChange={setVisibleToClient}
          />
          </div>
        </div>

        {/* Botones */}
        {!tieneCondicionComercial && (
          <p className="text-xs text-amber-400/90">
            Selecciona una condición comercial arriba para poder crear o actualizar la negociación.
          </p>
        )}
        <div className="space-y-3">
          <ZenButton
            variant="primary"
            onClick={handleFinalizar}
            disabled={loading || !tieneCondicionComercial}
            loading={loading}
            className="w-full"
          >
            {isUpdating ? 'Actualizar Negociación' : 'Crear Cotización en Negociación'}
          </ZenButton>
          <ZenButton
            variant="outline"
            onClick={() => router.push(`/${studioSlug}/studio/commercial/promises/${promiseId}`)}
            disabled={loading}
            className="w-full"
          >
            Cancelar
          </ZenButton>
        </div>
      </ZenCardContent>
    </ZenCard>
  );
}
