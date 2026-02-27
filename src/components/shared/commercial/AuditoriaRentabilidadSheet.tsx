'use client';

import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/shadcn/sheet';
import { cn } from '@/lib/utils';

export interface AuditoriaRentabilidadSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  /** Precio total a cobrar */
  total: number;
  totalCosto: number;
  totalGasto: number;
  utilidadNeta: number;
  /** Contenido extra debajo del bloque core (ej. Escenario del sistema, Comparativa, Salud financiera en cotización). */
  children?: React.ReactNode;
  className?: string;
}

/**
 * Sheet reutilizable de Auditoría de Rentabilidad.
 * Abre con Escenario del sistema; Comparativa y Salud financiera vienen en children.
 */
export function AuditoriaRentabilidadSheet({
  open,
  onOpenChange,
  title = 'Auditoría de Rentabilidad',
  total,
  totalCosto,
  totalGasto,
  utilidadNeta,
  children,
  className,
}: AuditoriaRentabilidadSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          'flex flex-col w-full max-w-md bg-zinc-900 border-zinc-800 overflow-y-auto',
          className
        )}
      >
        <SheetHeader className="border-b border-zinc-800/50 pb-4">
          <SheetTitle className="text-left text-white">{title}</SheetTitle>
        </SheetHeader>
        <div className="px-6 py-4 space-y-6">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
