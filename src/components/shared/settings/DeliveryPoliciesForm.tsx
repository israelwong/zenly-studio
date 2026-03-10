'use client';

import { Package, FileText, Scale, Calendar } from 'lucide-react';
import { ZenInput } from '@/components/ui/zen';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/shadcn/hover-card';

export interface DeliveryPoliciesValue {
  dias_entrega_default: number | '';
  dias_seguridad_default: number | '';
}

export interface DeliveryPoliciesFormProps {
  value: DeliveryPoliciesValue;
  onChange: (value: DeliveryPoliciesValue) => void;
  /** Si true, muestra el título "Políticas de Entrega (Global)" dentro del bloque. Por defecto false (para modal dedicado). */
  showTitle?: boolean;
}

export function DeliveryPoliciesForm({
  value,
  onChange,
  showTitle = false,
}: DeliveryPoliciesFormProps) {
  const a = typeof value.dias_entrega_default === 'number' ? value.dias_entrega_default : 0;
  const b = typeof value.dias_seguridad_default === 'number' ? value.dias_seguridad_default : 0;
  const sum = a + b;
  const summaryText = sum > 0 ? `${sum} días` : '— (no configurado)';

  return (
    <div className="border border-border/50 rounded-md p-4 space-y-4">
      {showTitle && (
        <h3 className="text-sm font-semibold text-zinc-200">Políticas de Entrega (Global)</h3>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <HoverCard openDelay={200}>
            <HoverCardTrigger asChild>
              <label className="text-sm font-medium text-zinc-200 cursor-help">
                Días de entrega estándar
              </label>
            </HoverCardTrigger>
            <HoverCardContent side="top" className="max-w-xs text-sm text-zinc-300">
              Días que tardas en entregar el trabajo final tras el evento
            </HoverCardContent>
          </HoverCard>
          <ZenInput
            type="number"
            min={0}
            value={value.dias_entrega_default === '' ? '' : value.dias_entrega_default}
            onChange={(e) => {
              const v = e.target.value;
              if (v === '') {
                onChange({ ...value, dias_entrega_default: '' });
              } else {
                const n = parseInt(v, 10);
                if (!Number.isNaN(n) && n >= 0) {
                  onChange({ ...value, dias_entrega_default: n });
                }
              }
            }}
            onBlur={(e) => {
              const n = parseInt(e.target.value, 10);
              if (e.target.value !== '' && (Number.isNaN(n) || n < 0)) {
                onChange({ ...value, dias_entrega_default: '' });
              }
            }}
            placeholder="Ej. 15"
          />
        </div>
        <div className="flex flex-col gap-2">
          <HoverCard openDelay={200}>
            <HoverCardTrigger asChild>
              <label className="text-sm font-medium text-zinc-200 cursor-help">
                Días de margen de seguridad
              </label>
            </HoverCardTrigger>
            <HoverCardContent side="top" className="max-w-xs text-sm text-zinc-300">
              Días adicionales para protegerte ante imprevistos
            </HoverCardContent>
          </HoverCard>
          <ZenInput
            type="number"
            min={0}
            value={value.dias_seguridad_default === '' ? '' : value.dias_seguridad_default}
            onChange={(e) => {
              const v = e.target.value;
              if (v === '') {
                onChange({ ...value, dias_seguridad_default: '' });
              } else {
                const n = parseInt(v, 10);
                if (!Number.isNaN(n) && n >= 0) {
                  onChange({ ...value, dias_seguridad_default: n });
                }
              }
            }}
            onBlur={(e) => {
              const n = parseInt(e.target.value, 10);
              if (e.target.value !== '' && (Number.isNaN(n) || n < 0)) {
                onChange({ ...value, dias_seguridad_default: '' });
              }
            }}
            placeholder="Ej. 5"
          />
        </div>
      </div>
      <p className="text-xs text-zinc-400">
        Tus clientes verán una promesa de entrega de{' '}
        <span className="font-medium text-zinc-300">{summaryText}</span>.
      </p>

      <div className="bg-muted/40 border border-border/50 rounded-lg p-3 mt-4">
        <p className="text-sm font-medium text-zinc-200 mb-2">¿Cómo se usa esta información?</p>
        <ul className="space-y-2 text-xs text-muted-foreground">
          <li className="flex items-start gap-2">
            <Package className="size-3.5 shrink-0 mt-0.5 text-zinc-500" aria-hidden />
            <span><strong className="text-zinc-300">Catálogo:</strong> Te alerta si un servicio requiere más tiempo del que prometes.</span>
          </li>
          <li className="flex items-start gap-2">
            <FileText className="size-3.5 shrink-0 mt-0.5 text-zinc-500" aria-hidden />
            <span><strong className="text-zinc-300">Cotizaciones:</strong> Se usa como el tiempo de entrega sugerido por defecto.</span>
          </li>
          <li className="flex items-start gap-2">
            <Scale className="size-3.5 shrink-0 mt-0.5 text-zinc-500" aria-hidden />
            <span><strong className="text-zinc-300">Contratos:</strong> Calcula automáticamente la fecha límite legal (@fecha_limite).</span>
          </li>
          <li className="flex items-start gap-2">
            <Calendar className="size-3.5 shrink-0 mt-0.5 text-zinc-500" aria-hidden />
            <span><strong className="text-zinc-300">Cronograma:</strong> Define el rango exacto de días que tienes para trabajar.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
