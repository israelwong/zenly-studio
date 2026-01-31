'use client';

import React from 'react';
import { LayoutGrid, Package, Wand2, FileText, Timer, Tag } from 'lucide-react';
import { ZenSwitch } from '@/components/ui/zen';
import { cn } from '@/lib/utils';

export interface PublicConfigListProps {
  paquetes: boolean;
  portafolios: boolean;
  contrato: boolean;
  redondeo: 'Exacto' | 'Mágico';
  condEstandar: boolean;
  ofertas: boolean;
  dias: number;
}

const ICONS = {
  portafolios: LayoutGrid,
  paquetes: Package,
  redondeo: Wand2,
  ofertas: Tag,
  contrato: FileText,
  dias: Timer,
} as const;

function buildGroups(props: PublicConfigListProps): Array<{
  title: string;
  items: Array<{ key: keyof typeof ICONS; label: string; value: string; active: boolean; isSwitch: boolean }>;
}> {
  return [
    {
      title: 'Mostrar en vista general de promesas',
      items: [
        { key: 'portafolios', label: 'Portafolios', value: props.portafolios ? 'ON' : 'OFF', active: props.portafolios, isSwitch: true },
        { key: 'paquetes', label: 'Paquetes', value: props.paquetes ? 'ON' : 'OFF', active: props.paquetes, isSwitch: true },
      ],
    },
    {
      title: 'Precios de paquetes',
      items: [
        { key: 'redondeo', label: 'Redondeo', value: props.redondeo, active: true, isSwitch: false },
        { key: 'ofertas', label: 'Ofertas especiales', value: props.ofertas ? 'ON' : 'OFF', active: props.ofertas, isSwitch: true },
      ],
    },
    {
      title: 'Cierre',
      items: [
        { key: 'contrato', label: 'Contrato automático', value: props.contrato ? 'Auto' : 'Off', active: props.contrato, isSwitch: true },
        { key: 'dias', label: 'Días límite de contratación', value: `${props.dias}d`, active: true, isSwitch: false },
      ],
    },
  ];
}

export function PublicConfigList(props: PublicConfigListProps) {
  const data = buildGroups(props);
  return (
    <div className="space-y-3">
      {data.map((group) => (
        <div key={group.title}>
          <h3 className="text-sm font-semibold text-zinc-200 mb-1.5">{group.title}</h3>
          <ul className="space-y-1">
            {group.items.map((item) => {
              const Icon = ICONS[item.key];
              return (
                <li key={item.key} className="flex items-center gap-2 text-[11px]">
                  <Icon className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                  <span className="text-zinc-400 font-light flex-1 min-w-0 truncate">{item.label}</span>
                  {item.isSwitch ? (
                    <ZenSwitch checked={item.active} disabled className="shrink-0 scale-75" />
                  ) : (
                    <span
                      className={cn(
                        'font-medium shrink-0',
                        item.active ? 'text-emerald-400' : 'text-zinc-500'
                      )}
                    >
                      {item.value}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
