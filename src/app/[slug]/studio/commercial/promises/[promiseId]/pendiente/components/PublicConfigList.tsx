'use client';

import React from 'react';
import { LayoutGrid, Package, RefreshCw, Wand2, BarChart3, Tag, FileText, FileCheck, Timer, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Props alineadas con PromiseShareSettings del modal */
export interface PublicConfigListProps {
  show_packages: boolean;
  portafolios: boolean;
  allow_recalc: boolean;
  rounding_mode: 'exact' | 'charm';
  show_categories_subtotals: boolean;
  show_items_prices: boolean;
  show_standard_conditions: boolean;
  show_offer_conditions: boolean;
  min_days_to_hire: number;
  auto_generate_contract: boolean;
}

/** Fila con indicador LED (dot) a la derecha para ON/OFF */
function RowLed({
  label,
  active,
  icon: Icon,
}: {
  label: string;
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <li className="flex items-center gap-2 py-1.5 min-w-0 text-[11px]">
      <Icon className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
      <span className="text-zinc-400 flex-1 min-w-0 truncate">{label}</span>
      <span
        className={cn(
          'h-2 w-2 shrink-0 rounded-full',
          active ? 'bg-emerald-500' : 'bg-zinc-600'
        )}
        aria-hidden
      />
    </li>
  );
}

/** Fila con valor de texto/número a la derecha en verde */
function RowValue({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <li className="flex items-center gap-2 py-1.5 min-w-0 text-[11px]">
      <Icon className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
      <span className="text-zinc-400 flex-1 min-w-0 truncate">{label}</span>
      <span className="font-medium shrink-0 tabular-nums text-emerald-500">
        {value}
      </span>
    </li>
  );
}

export function PublicConfigList(props: PublicConfigListProps) {
  const roundingLabel = props.rounding_mode === 'exact' ? 'Exacto' : 'Mágico (Charm)';

  return (
    <div className="space-y-3.5">
      {/* 1. Vista general */}
      <section>
        <h3 className="text-xs font-semibold text-zinc-300 mb-1">
          Mostrar en vista general de promesas
        </h3>
        <ul className="space-y-0">
          <RowLed label="Portafolios" active={props.portafolios} icon={LayoutGrid} />
          <RowLed label="Paquetes" active={props.show_packages} icon={Package} />
        </ul>
      </section>

      {/* 2. Precios de paquetes */}
      <section>
        <h3 className="text-xs font-semibold text-zinc-300 mb-1">Precios de paquetes</h3>
        <ul className="space-y-0">
          {props.show_packages && (
            <>
              <RowLed
                label="Recálculo automático de paquetes"
                active={props.allow_recalc}
                icon={RefreshCw}
              />
              <RowValue label="Estilo de redondeo" value={roundingLabel} icon={Wand2} />
            </>
          )}
          {!props.show_packages && (
            <li className="flex items-center gap-2 py-1.5 text-[11px] text-zinc-500">
              <Package className="h-3.5 w-3.5 shrink-0" />
              <span>Activa Paquetes arriba para configurar</span>
            </li>
          )}
        </ul>
      </section>

      {/* 3. Info. en cotización */}
      <section>
        <h3 className="text-xs font-semibold text-zinc-300 mb-1">
          Mostrar información en cotización y paquetes
        </h3>
        <ul className="space-y-0">
          <RowLed
            label="Subtotal por categoría"
            active={props.show_categories_subtotals}
            icon={BarChart3}
          />
          <RowLed label="Precio por item" active={props.show_items_prices} icon={Tag} />
          <RowLed
            label="Condiciones comerciales estándar"
            active={props.show_standard_conditions}
            icon={FileText}
          />
          <RowLed
            label="Condiciones comerciales especiales"
            active={props.show_offer_conditions}
            icon={FileCheck}
          />
        </ul>
      </section>

      {/* 4. Contratación */}
      <section>
        <h3 className="text-xs font-semibold text-zinc-300 mb-1">Contratación</h3>
        <ul className="space-y-0">
          <RowValue
            label="Límite de días para poder contratar"
            value={`${props.min_days_to_hire}d`}
            icon={Timer}
          />
          <RowLed
            label="Generar contrato automáticamente al autorizar"
            active={props.auto_generate_contract}
            icon={ClipboardList}
          />
        </ul>
      </section>
    </div>
  );
}
