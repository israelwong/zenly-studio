'use client';

import { useState } from 'react';
import { type DateRange } from 'react-day-picker';
import { Calendar } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover';
import { ZenCalendar, ZenButton } from '@/components/ui/zen';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface GanttDateRangeConfigProps {
  dateRange?: DateRange;
  onDateRangeChange: (range: DateRange | undefined) => void;
}

export function GanttDateRangeConfig({
  dateRange,
  onDateRangeChange,
}: GanttDateRangeConfigProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
      <PopoverContent className="w-auto p-0 bg-zinc-900 border-zinc-800" align="end">
        <ZenCalendar
          mode="range"
          selected={dateRange}
          onSelect={(range) => {
            onDateRangeChange(range);
            if (range?.from && range?.to) {
              setOpen(false);
            }
          }}
          numberOfMonths={2}
          locale={es}
        />
      </PopoverContent>
    </Popover>
  );
}

