'use client';

import React from 'react';
import { Globe, Package, Wand2, FileText, Timer, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PublicConfigMatrixProps {
  paquetes: boolean;
  portafolios: boolean;
  contrato: boolean;
  redondeo: 'Exacto' | 'Mágico';
  condEstandar: boolean;
  ofertas: boolean;
  dias: number;
}

const items: Array<{
  key: keyof PublicConfigMatrixProps;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  formatValue: (props: PublicConfigMatrixProps) => string;
  isActive?: (props: PublicConfigMatrixProps) => boolean;
}> = [
  { key: 'portafolios', label: 'Portafolios', Icon: Globe, formatValue: (p) => (p.portafolios ? 'ON' : 'OFF'), isActive: (p) => p.portafolios },
  { key: 'paquetes', label: 'Paquetes', Icon: Package, formatValue: (p) => (p.paquetes ? 'ON' : 'OFF'), isActive: (p) => p.paquetes },
  { key: 'redondeo', label: 'Redondeo', Icon: Wand2, formatValue: (p) => p.redondeo, isActive: () => true },
  { key: 'condEstandar', label: 'Cond. estándar', Icon: FileText, formatValue: (p) => (p.condEstandar ? 'ON' : 'OFF'), isActive: (p) => p.condEstandar },
  { key: 'ofertas', label: 'Ofertas', Icon: Tag, formatValue: (p) => (p.ofertas ? 'ON' : 'OFF'), isActive: (p) => p.ofertas },
  { key: 'dias', label: 'Días límite', Icon: Timer, formatValue: (p) => `${p.dias}d`, isActive: () => true },
  { key: 'contrato', label: 'Contrato', Icon: FileText, formatValue: (p) => (p.contrato ? 'Auto' : 'Off'), isActive: (p) => p.contrato },
];

export function PublicConfigMatrix(props: PublicConfigMatrixProps) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-2">
      {items.map(({ key, label, Icon, formatValue, isActive }) => {
        const value = formatValue(props);
        const active = isActive?.(props) ?? false;
        return (
          <div key={key} className="flex items-center gap-2 py-1 min-w-0">
            <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80 text-zinc-500" />
            <div className="min-w-0 flex-1 flex items-baseline gap-1.5">
              <span className="text-[11px] text-zinc-500 truncate">{label}</span>
              <span
                className={cn(
                  'text-xs font-semibold shrink-0',
                  active ? 'text-cyan-400/90' : 'text-zinc-500'
                )}
              >
                {value}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
