'use client';

import React, { useState, useEffect } from 'react';
import { CreditCard } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle } from '@/components/ui/zen';
import { obtenerMetodosPago } from '@/lib/actions/studio/config/metodos-pago.actions';
import { toast } from 'sonner';

interface MetodoPago {
  id: string;
  payment_method_name: string;
  payment_method: string | null;
  status: string;
  order: number | null;
}

interface MetodoPagoSelectorProps {
  studioSlug: string;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export function MetodoPagoSelector({
  studioSlug,
  selectedId,
  onSelect,
}: MetodoPagoSelectorProps) {
  const [metodos, setMetodos] = useState<MetodoPago[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMetodos = async () => {
      try {
        setLoading(true);
        const result = await obtenerMetodosPago(studioSlug);

        if (result.success && result.data) {
          // Filtrar solo métodos activos
          const metodosActivos = result.data.filter((m: MetodoPago) => m.status === 'active');
          setMetodos(metodosActivos);
        } else {
          toast.error(result.error || 'Error al cargar métodos de pago');
        }
      } catch (error) {
        console.error('Error loading metodos:', error);
        toast.error('Error al cargar métodos de pago');
      } finally {
        setLoading(false);
      }
    };

    loadMetodos();
  }, [studioSlug]);

  const getMetodoLabel = (metodo: MetodoPago) => {
    // Mapear payment_method a labels más amigables
    const methodMap: Record<string, string> = {
      cash: 'Efectivo',
      transfer: 'Transferencia',
      card: 'Tarjeta',
      stripe: 'Stripe',
      promise: 'Con promesa de pago',
    };

    if (metodo.payment_method && methodMap[metodo.payment_method]) {
      return methodMap[metodo.payment_method];
    }

    return metodo.payment_method_name;
  };

  return (
    <ZenCard variant="outlined">
      <ZenCardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-600/20 rounded-lg">
            <CreditCard className="h-5 w-5 text-green-400" />
          </div>
          <ZenCardTitle className="text-lg">Método de Pago</ZenCardTitle>
        </div>
      </ZenCardHeader>
      <ZenCardContent className="space-y-4">
        {loading ? (
          <div className="text-center py-4 text-zinc-400">Cargando métodos de pago...</div>
        ) : metodos.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-zinc-400">No hay métodos de pago disponibles</p>
          </div>
        ) : (
          <div className="space-y-2">
            {metodos.map((metodo) => (
              <label
                key={metodo.id}
                className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedId === metodo.id
                    ? 'border-green-500 bg-green-500/10'
                    : 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/50'
                }`}
              >
                <input
                  type="radio"
                  name="metodo-pago"
                  value={metodo.id}
                  checked={selectedId === metodo.id}
                  onChange={() => onSelect(metodo.id)}
                  className="h-4 w-4 text-green-600 focus:ring-green-500 focus:ring-offset-zinc-900"
                />
                <div className="flex-1">
                  <div className="font-semibold text-white">{getMetodoLabel(metodo)}</div>
                  {metodo.payment_method_name !== getMetodoLabel(metodo) && (
                    <p className="text-sm text-zinc-400 mt-1">{metodo.payment_method_name}</p>
                  )}
                </div>
              </label>
            ))}
          </div>
        )}
      </ZenCardContent>
    </ZenCard>
  );
}

