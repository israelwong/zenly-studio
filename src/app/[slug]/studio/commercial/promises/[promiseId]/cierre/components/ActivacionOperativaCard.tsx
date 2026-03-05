'use client';

import React, { useState, useTransition } from 'react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenInput, ZenSelect, ZenSwitch } from '@/components/ui/zen';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { actualizarPagoCierre } from '@/lib/actions/studio/commercial/promises/cotizaciones-cierre.actions';
import { toast } from 'sonner';

interface ActivacionOperativaCardProps {
  studioSlug: string;
  cotizacionId: string;
  anticipoMonto: number;
  pagoData?: {
    pago_confirmado_estudio?: boolean;
    pago_concepto?: string | null;
    pago_monto?: number | null;
    pago_fecha?: Date | null;
    pago_metodo_id?: string | null;
  } | null;
  onSuccess: () => void;
  /** Métodos de pago inyectados desde el servidor (page) → cliente; sin fetch ni loading en el hijo */
  metodosPago?: Array<{ id: string; payment_method_name: string }>;
  /** Notifica al padre mientras la Server Action está en curso (bloquea botón Autorizar) */
  onTransitionPendingChange?: (pending: boolean) => void;
  /** Mismo frame que el toggle: padre actualiza pagoConfirmadoLocal para disabled atómico del botón */
  onPagoConfirmadoOptimistic?: (checked: boolean) => void;
}

export function ActivacionOperativaCard({
  studioSlug,
  cotizacionId,
  anticipoMonto,
  pagoData,
  onSuccess,
  metodosPago = [],
  onTransitionPendingChange,
  onPagoConfirmadoOptimistic,
}: ActivacionOperativaCardProps) {
  const [, startTransition] = useTransition();
  const [concepto] = useState('Anticipo');
  const [monto, setMonto] = useState(() =>
    pagoData?.pago_monto != null ? String(pagoData.pago_monto) : (anticipoMonto > 0 ? String(anticipoMonto) : ''));
  const [fecha, setFecha] = useState(() => (pagoData?.pago_fecha ? new Date(pagoData.pago_fecha) : new Date()));
  const [metodoId, setMetodoId] = useState(() => pagoData?.pago_metodo_id ?? '');
  const [pagoConfirmadoUI, setPagoConfirmadoUI] = useState(() => pagoData?.pago_confirmado_estudio === true);
  const [saving, setSaving] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const fieldsDisabled = pagoConfirmadoUI || saving;
  const desbloqueando = saving && !pagoConfirmadoUI;

  const handleSwitchChange = (checked: boolean) => {
    if (checked) {
      const montoNum = parseFloat(monto);
      if (!monto || isNaN(montoNum) || montoNum <= 0) {
        toast.error('Ingresa un monto válido');
        return;
      }
    }

    const previous = pagoConfirmadoUI;
    setPagoConfirmadoUI(checked);
    onPagoConfirmadoOptimistic?.(checked);
    setSaving(true);
    onTransitionPendingChange?.(true);
    startTransition(() => {
      const payload = checked
        ? { concepto: concepto.trim(), monto: parseFloat(monto), fecha, metodo_id: metodoId || null }
        : { concepto: null, monto: null, fecha: null, metodo_id: null };
      actualizarPagoCierre(studioSlug, cotizacionId, payload)
        .then((result) => {
          if (result.success) {
            toast.success(checked ? 'Recibo confirmado. Ya puedes autorizar y crear el evento.' : 'Pago desbloqueado. Puedes corregir y volver a confirmar.');
            onSuccess();
          } else {
            setPagoConfirmadoUI(previous);
            toast.error(result.error ?? (checked ? 'Error al confirmar recibo' : 'Error al desbloquear'));
          }
        })
        .catch(() => {
          setPagoConfirmadoUI(previous);
          toast.error(checked ? 'Error al confirmar recibo' : 'Error al desbloquear');
        })
        .finally(() => {
          setSaving(false);
          onTransitionPendingChange?.(false);
        });
    });
  };

  const labelClass = fieldsDisabled ? 'block text-xs font-medium text-zinc-500 mb-1' : 'block text-xs font-medium text-zinc-400 mb-1';
  const formSectionClass = fieldsDisabled ? 'space-y-3 opacity-60' : 'space-y-3';

  return (
    <ZenCard className="border-amber-500/50 bg-amber-500/5 relative">
      {saving && (
        <div className="absolute inset-0 z-10 rounded-lg bg-zinc-950/40 backdrop-blur-[1px] pointer-events-auto cursor-wait flex items-center justify-center" aria-hidden>
          <div className="flex flex-col items-center gap-2 text-amber-400">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-sm font-medium">{desbloqueando ? 'Cancelando confirmación...' : 'Confirmando pago...'}</span>
          </div>
        </div>
      )}
      <ZenCardHeader className="border-b border-amber-500/20 py-3 px-4">
        <ZenCardTitle className="text-sm font-semibold text-amber-200">
          Confirmación de pago
        </ZenCardTitle>
      </ZenCardHeader>
      <ZenCardContent className="p-4 space-y-4">
        <p className={`text-xs ${fieldsDisabled ? 'text-zinc-500' : 'text-zinc-400'}`}>
          {fieldsDisabled
            ? 'Pago registrado. Desactiva el switch si necesitas corregir antes de autorizar.'
            : 'El cliente ya firmó. Registra el monto recibido para habilitar "Autorizar y Crear Evento".'}
        </p>
        <div className={formSectionClass}>
          <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,6rem)_1fr] gap-3">
            <div className="min-w-0">
              <label className={labelClass}>Monto recibido</label>
              <ZenInput
                type="number"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="0.00"
                min={0}
                step={0.01}
                disabled={fieldsDisabled}
              />
            </div>
            <div className="min-w-0">
              <label className={labelClass}>Método de pago</label>
              <ZenSelect
                value={metodoId}
                onValueChange={setMetodoId}
                options={metodosPago.map((pm) => ({ value: pm.id, label: pm.payment_method_name }))}
                placeholder="Seleccionar método"
                disabled={fieldsDisabled}
                disableSearch
                className="min-h-[2.625rem]"
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Fecha de pago</label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  disabled={fieldsDisabled}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-300 hover:border-zinc-600 flex items-center justify-between disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  <span>{fecha ? format(fecha, 'PPP', { locale: es }) : 'Seleccionar'}</span>
                  <CalendarIcon className="h-4 w-4 text-zinc-400" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-zinc-900 border-zinc-700" align="start">
                <Calendar
                  mode="single"
                  selected={fecha}
                  onSelect={(d) => { if (d) { setFecha(d); setCalendarOpen(false); } }}
                  locale={es}
                  className="rounded-md border-0"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <ZenSwitch
          label={saving ? (desbloqueando ? 'Cancelando confirmación...' : 'Confirmando pago...') : 'Pago confirmado'}
          labelLeading={saving ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-amber-400" aria-hidden /> : undefined}
          checked={pagoConfirmadoUI}
          onCheckedChange={handleSwitchChange}
          disabled={saving}
        />
      </ZenCardContent>
    </ZenCard>
  );
}
