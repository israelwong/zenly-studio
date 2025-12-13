'use client';

import React from 'react';
import { ZenBadge } from '@/components/ui/zen';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/shadcn/sheet';
import type { PublicCotizacion, PublicPaquete } from '@/types/public-promise';
import { Check } from 'lucide-react';
import { getTotalServicios } from '@/lib/utils/public-promise';

interface ComparadorSheetProps {
  cotizaciones: PublicCotizacion[];
  paquetes: PublicPaquete[];
  isOpen: boolean;
  onClose: () => void;
}

type ComparableItem = (PublicCotizacion | PublicPaquete) & { type: 'cotizacion' | 'paquete' };

export function ComparadorSheet({
  cotizaciones,
  paquetes,
  isOpen,
  onClose,
}: ComparadorSheetProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Combinar cotizaciones y paquetes
  const items: ComparableItem[] = [
    ...cotizaciones.map((c) => ({ ...c, type: 'cotizacion' as const })),
    ...paquetes.map((p) => ({ ...p, type: 'paquete' as const })),
  ];

  // Obtener todos los servicios únicos
  const allServicios = new Set<string>();
  items.forEach((item) => {
    item.servicios.forEach((s) => {
      allServicios.add(s.name);
    });
  });

  const serviciosArray = Array.from(allServicios);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-6xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-2xl">Comparador de Opciones</SheetTitle>
          <SheetDescription>
            Compara las características y servicios de todas las opciones disponibles
          </SheetDescription>
        </SheetHeader>

        <div className="py-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left p-4 font-semibold text-white sticky left-0 bg-zinc-950 z-10">
                    Característica
                  </th>
                  {items.map((item) => (
                    <th key={item.id} className="p-4 min-w-[200px]">
                      <div className="text-left space-y-2">
                        <ZenBadge
                          className={
                            item.type === 'cotizacion'
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                          }
                        >
                          {item.type === 'cotizacion' ? 'Cotización' : 'Paquete'}
                        </ZenBadge>
                        <p className="font-semibold text-white">{item.name}</p>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Precio */}
                <tr className="border-b border-zinc-800/50">
                  <td className="p-4 font-medium text-zinc-400 sticky left-0 bg-zinc-950 z-10">
                    Precio
                  </td>
                  {items.map((item) => {
                    const finalPrice =
                      item.type === 'cotizacion' && item.discount
                        ? item.price - (item.price * item.discount) / 100
                        : item.price;

                    return (
                      <td key={item.id} className="p-4">
                        <div>
                          <p className="text-xl font-bold text-white">
                            {formatPrice(finalPrice)}
                          </p>
                          {item.type === 'cotizacion' && item.discount && (
                            <p className="text-sm text-zinc-500 line-through">
                              {formatPrice(item.price)}
                            </p>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>

                {/* Total de servicios */}
                <tr className="border-b border-zinc-800/50">
                  <td className="p-4 font-medium text-zinc-400 sticky left-0 bg-zinc-950 z-10">
                    Total de servicios
                  </td>
                  {items.map((item) => (
                    <td key={item.id} className="p-4">
                      <p className="text-white font-semibold">
                        {getTotalServicios(item.servicios)}
                      </p>
                    </td>
                  ))}
                </tr>

                {/* Servicios individuales */}
                {serviciosArray.map((servicioName) => (
                  <tr key={servicioName} className="border-b border-zinc-800/50">
                    <td className="p-4 text-zinc-400 sticky left-0 bg-zinc-950 z-10">
                      {servicioName}
                    </td>
                    {items.map((item) => {
                      const hasServicio = item.servicios.some(
                        (s) => s.name === servicioName
                      );
                      return (
                        <td key={item.id} className="p-4 text-center">
                          {hasServicio ? (
                            <Check className="h-5 w-5 text-emerald-400 mx-auto" />
                          ) : (
                            <span className="text-zinc-700">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
            <p className="text-sm text-zinc-400">
              💡 <span className="font-semibold">Tip:</span> Desliza horizontalmente para
              ver todas las opciones si estás en móvil
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

