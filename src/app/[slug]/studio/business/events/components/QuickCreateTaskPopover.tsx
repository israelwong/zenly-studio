'use client';

import React, { useState, useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover';
import { ZenButton, ZenInput, ZenSelect } from '@/components/ui/zen';
import { Plus } from 'lucide-react';
import { crearTareaManualScheduler } from '@/lib/actions/studio/business/events/scheduler-actions';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const INPUT_HEIGHT = 'h-9';
const NUM_INPUT_CLASS = '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';

const SERVICE_BILLING_OPTIONS = [
  { value: 'SERVICE', label: 'Honorario fijo' },
  { value: 'HOUR', label: 'Por hora' },
] as const;

interface QuickCreateTaskPopoverProps {
  studioSlug: string;
  eventId: string;
  sectionId: string;
  sectionName: string;
  categoryId: string;
  categoryName: string;
  phaseKey: string;
  onSuccess: () => void;
  triggerClassName?: string;
}

export function QuickCreateTaskPopover({
  studioSlug,
  eventId,
  sectionId,
  sectionName,
  categoryId,
  categoryName,
  phaseKey,
  onSuccess,
  triggerClassName,
}: QuickCreateTaskPopoverProps) {
  const [open, setOpen] = useState(false);
  const [profitType, setProfitType] = useState<'servicio' | 'product'>('servicio');
  const [serviceBilling, setServiceBilling] = useState<string>('SERVICE');
  const [totalAmount, setTotalAmount] = useState<string>('');
  const [pricePerUnit, setPricePerUnit] = useState<string>('');
  const [hours, setHours] = useState<string>('1');
  const [quantity, setQuantity] = useState<string>('1');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const computedTotal = useMemo(() => {
    if (profitType === 'servicio') {
      if (serviceBilling === 'SERVICE') return parseFloat(totalAmount.replace(/,/g, '.')) || 0;
      const p = parseFloat(pricePerUnit.replace(/,/g, '.')) || 0;
      const h = Math.max(1, Math.min(999, parseInt(hours, 10) || 1));
      return p * h;
    }
    const p = parseFloat(pricePerUnit.replace(/,/g, '.')) || 0;
    const q = Math.max(1, Math.min(999, parseInt(quantity, 10) || 1));
    return p * q;
  }, [profitType, serviceBilling, totalAmount, pricePerUnit, hours, quantity]);

  const canCreate = Boolean(name.trim()) && computedTotal > 0;

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('Escribe el nombre de la tarea');
      return;
    }
    if (computedTotal <= 0) {
      toast.error('El monto debe ser mayor a 0');
      return;
    }

    const catalogCategoryId = categoryId.startsWith('__') ? null : categoryId;
    const billingType = profitType === 'servicio' ? serviceBilling : 'UNIT';
    const durationHours = profitType === 'servicio' && serviceBilling === 'HOUR'
      ? Math.max(1, Math.min(999, parseInt(hours, 10) || 1))
      : undefined;
    const quantitySnapshot = profitType === 'product'
      ? Math.max(1, Math.min(999, parseInt(quantity, 10) || 1))
      : undefined;

    setLoading(true);
    try {
      const result = await crearTareaManualScheduler(studioSlug, eventId, {
        sectionId,
        stage: phaseKey,
        name: trimmed,
        durationDays: 1,
        catalog_category_id: catalogCategoryId,
        catalog_section_name_snapshot: sectionName,
        catalog_category_name_snapshot: categoryName,
        budget_amount: computedTotal,
        billing_type_snapshot: billingType,
        duration_hours_snapshot: durationHours,
        quantity_snapshot: quantitySnapshot,
        profit_type_snapshot: profitType,
      });
      if (result.success) {
        toast.success('Tarea creada');
        resetForm();
        setOpen(false);
        onSuccess();
      } else {
        toast.error(result.error ?? 'Error al crear');
      }
    } catch {
      toast.error('Error al crear la tarea');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setProfitType('servicio');
    setServiceBilling('SERVICE');
    setTotalAmount('');
    setPricePerUnit('');
    setHours('1');
    setQuantity('1');
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) resetForm();
    setOpen(o);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <ZenButton
          variant="ghost"
          size="sm"
          className={cn('h-6 w-6 p-0 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50', triggerClassName)}
          aria-label="Añadir tarea"
        >
          <Plus className="h-3 w-3" />
        </ZenButton>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 p-3 bg-zinc-950 border-zinc-800"
        align="end"
        side="bottom"
        sideOffset={4}
      >
        <div className="space-y-2.5">
          <div className="text-[11px] font-medium text-zinc-400">Nueva tarea en {categoryName}</div>

          <ZenInput
            label="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Revisión de iluminación"
            className={INPUT_HEIGHT}
          />

          {/* Toggle Servicio / Producto */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-zinc-500 h-4">Naturaleza</label>
            <div className="flex rounded-lg border border-zinc-700 overflow-hidden">
              <button
                type="button"
                onClick={() => setProfitType('servicio')}
                className={cn(
                  'flex-1 py-1.5 text-xs font-medium transition-colors',
                  profitType === 'servicio'
                    ? 'bg-zinc-700 text-zinc-100'
                    : 'bg-transparent text-zinc-500 hover:text-zinc-300'
                )}
              >
                Servicio
              </button>
              <button
                type="button"
                onClick={() => setProfitType('product')}
                className={cn(
                  'flex-1 py-1.5 text-xs font-medium transition-colors',
                  profitType === 'product'
                    ? 'bg-zinc-700 text-zinc-100'
                    : 'bg-transparent text-zinc-500 hover:text-zinc-300'
                )}
              >
                Producto
              </button>
            </div>
          </div>

          {/* Campos SERVICIO */}
          {profitType === 'servicio' && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-zinc-500 h-4">Tipo de cobro</label>
                <ZenSelect
                  value={serviceBilling}
                  onValueChange={setServiceBilling}
                  options={SERVICE_BILLING_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                  placeholder="Seleccionar"
                  disableSearch
                  className={INPUT_HEIGHT}
                />
              </div>
              {serviceBilling === 'SERVICE' && (
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-zinc-500 h-4">Monto total ($)</label>
                  <ZenInput
                    type="number"
                    min={0}
                    step={0.01}
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    placeholder="0"
                    className={cn(INPUT_HEIGHT, NUM_INPUT_CLASS)}
                  />
                </div>
              )}
              {serviceBilling === 'HOUR' && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-zinc-500 h-4">Precio/hr ($)</label>
                    <ZenInput
                      type="number"
                      min={0}
                      step={0.01}
                      value={pricePerUnit}
                      onChange={(e) => setPricePerUnit(e.target.value)}
                      placeholder="0"
                      className={cn(INPUT_HEIGHT, NUM_INPUT_CLASS)}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-zinc-500 h-4">Horas</label>
                    <ZenInput
                      type="number"
                      min={1}
                      max={999}
                      value={hours}
                      onChange={(e) => setHours(String(Math.max(1, Math.min(999, parseInt(e.target.value, 10) || 1))))}
                      className={cn(INPUT_HEIGHT, NUM_INPUT_CLASS)}
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Campos PRODUCTO */}
          {profitType === 'product' && (
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-zinc-500 h-4">Precio unit. ($)</label>
                <ZenInput
                  type="number"
                  min={0}
                  step={0.01}
                  value={pricePerUnit}
                  onChange={(e) => setPricePerUnit(e.target.value)}
                  placeholder="0"
                  className={cn(INPUT_HEIGHT, NUM_INPUT_CLASS)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-zinc-500 h-4">Cantidad</label>
                <ZenInput
                  type="number"
                  min={1}
                  max={999}
                  value={quantity}
                  onChange={(e) => setQuantity(String(Math.max(1, Math.min(999, parseInt(e.target.value, 10) || 1))))}
                  className={cn(INPUT_HEIGHT, NUM_INPUT_CLASS)}
                />
              </div>
            </div>
          )}

          {computedTotal > 0 && (
            <div className="text-[11px] text-zinc-500">
              Total: <span className="font-semibold text-emerald-400">${computedTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
            </div>
          )}

          <ZenButton
            variant="primary"
            size="sm"
            className={cn('w-full mt-1', INPUT_HEIGHT)}
            onClick={() => void handleCreate()}
            loading={loading}
            disabled={!canCreate || loading}
          >
            Crear
          </ZenButton>
        </div>
      </PopoverContent>
    </Popover>
  );
}
