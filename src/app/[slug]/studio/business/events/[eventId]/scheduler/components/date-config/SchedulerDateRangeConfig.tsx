'use client';

import { useState } from 'react';
import { type DateRange } from 'react-day-picker';
import { Calendar } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover';
import { ZenCalendar, ZenButton } from '@/components/ui/zen';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface SchedulerDateRangeConfigProps {
  dateRange?: DateRange;
  onDateRangeChange: (range: DateRange | undefined) => void;
  onValidate?: (range: DateRange | undefined) => boolean;
  studioSlug: string;
  eventId: string;
}

export function SchedulerDateRangeConfig({
  dateRange,
  onDateRangeChange,
  onValidate,
  studioSlug,
  eventId,
}: SchedulerDateRangeConfigProps) {
  const [open, setOpen] = useState(false);
  const [tempRange, setTempRange] = useState<DateRange | undefined>(dateRange);
  const [saving, setSaving] = useState(false);

  const handleApply = async () => {
    if (!tempRange?.from || !tempRange?.to) {
      return;
    }

    // Validar antes de guardar en BD
    // Si falla validación, el modal se abre automáticamente en validateDateRangeChange
    if (onValidate && !onValidate(tempRange)) {
      setOpen(false); // Cerrar popover
      return; // Bloquear guardado
    }

    setSaving(true);
    try {
      const { actualizarRangoScheduler } = await import('@/lib/actions/studio/business/events');
      const result = await actualizarRangoScheduler(studioSlug, eventId, {
        from: tempRange.from,
        to: tempRange.to,
      });

      if (result.success) {
        // Actualizar el rango local - esto actualizará el header y sincronizará el UI
        onDateRangeChange(tempRange);
        setOpen(false);
      }
    } catch (error) {
      // Error manejado por toast en el componente
    } finally {
      setSaving(false);
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (isOpen) {
          setTempRange(dateRange);
        }
      }}
    >
      <PopoverTrigger asChild>
        <ZenButton variant="ghost" size="sm" className="gap-2">
          <Calendar className="h-4 w-4" />
          {dateRange?.from ? (
            dateRange.to ? (
              <>
                {format(dateRange.from, 'dd MMM', { locale: es })} -{' '}
                {format(dateRange.to, 'dd MMM', { locale: es })}
              </>
            ) : (
              format(dateRange.from, 'dd MMM', { locale: es })
            )
          ) : (
            'Configurar rango'
          )}
        </ZenButton>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 bg-zinc-900 border-zinc-800"
        align="end"
        onInteractOutside={() => setOpen(false)}
      >
        <div className="p-3">
          <ZenCalendar
            mode="range"
            defaultMonth={tempRange?.from || dateRange?.from}
            selected={tempRange}
            onSelect={setTempRange}
            numberOfMonths={2}
            locale={es}
            className="rounded-lg border shadow-sm"
          />
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
            <ZenButton
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancelar
            </ZenButton>
            <ZenButton
              variant="default"
              size="sm"
              onClick={handleApply}
              disabled={!tempRange?.from || !tempRange?.to || saving}
              loading={saving}
            >
              Aplicar rango
            </ZenButton>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

