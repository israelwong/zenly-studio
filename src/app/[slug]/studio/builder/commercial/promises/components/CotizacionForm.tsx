'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ZenButton, ZenCard, ZenCardContent } from '@/components/ui/zen';
import { toast } from 'sonner';

interface CotizacionFormProps {
  studioSlug: string;
  promiseId?: string | null;
  packageId?: string | null;
  cotizacionId?: string;
  redirectOnSuccess?: string;
}

export function CotizacionForm({
  studioSlug,
  promiseId,
  packageId,
  cotizacionId,
  redirectOnSuccess,
}: CotizacionFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const isEditMode = !!cotizacionId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // TODO: Implementar lógica de creación/actualización de cotización
    try {
      // Simulación de guardado
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast.success(isEditMode ? 'Cotización actualizada exitosamente' : 'Cotización creada exitosamente');

      if (redirectOnSuccess) {
        router.push(redirectOnSuccess);
      } else {
        router.back();
      }
    } catch (error) {
      console.error('Error saving quote:', error);
      toast.error(`Error al ${isEditMode ? 'actualizar' : 'crear'} cotización`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <ZenCard variant="outlined">
        <ZenCardContent className="p-4">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-zinc-400 mb-2">
                {isEditMode ? 'Editando cotización' : packageId ? 'Creando cotización desde paquete' : 'Creando cotización personalizada'}
              </p>
              {packageId && (
                <p className="text-xs text-zinc-500">Paquete ID: {packageId}</p>
              )}
              {promiseId && (
                <p className="text-xs text-zinc-500">Promesa ID: {promiseId}</p>
              )}
              {cotizacionId && (
                <p className="text-xs text-zinc-500">Cotización ID: {cotizacionId}</p>
              )}
            </div>

            {/* TODO: Implementar formulario completo de cotización */}
            <div className="p-8 border border-dashed border-zinc-700 rounded-lg text-center">
              <p className="text-sm text-zinc-400">
                Formulario de cotización en desarrollo
              </p>
            </div>
          </div>
        </ZenCardContent>
      </ZenCard>

      <div className="flex justify-end gap-3">
        <ZenButton
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancelar
        </ZenButton>
        <ZenButton type="submit" loading={loading}>
          {isEditMode ? 'Actualizar' : 'Crear'} Cotización
        </ZenButton>
      </div>
    </form>
  );
}

