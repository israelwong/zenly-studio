'use client';

import * as React from 'react';
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from 'lucide-react';
import { DayButton, DayPicker, getDefaultClassNames } from 'react-day-picker';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ZenButton } from './ZenButton';
import { ZEN_COLORS } from '../tokens/colors';
import { ZEN_SPACING } from '../tokens/spacing';

interface ZenCalendarProps extends Omit<React.ComponentProps<typeof DayPicker>, 'mode'> {
  buttonVariant?: React.ComponentProps<typeof ZenButton>['variant'];
  mode?: 'single' | 'multiple' | 'range';
}

function ZenCalendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = 'label',
  buttonVariant = 'ghost',
  formatters,
  components,
  mode,
  ...props
}: ZenCalendarProps) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      mode={mode}
      locale={es}
      showOutsideDays={showOutsideDays}
      className={cn(
        'bg-zinc-900 group/calendar p-3 [--cell-size:--spacing(8)]',
        '[[data-slot=card-content]_&]:bg-transparent [[data-slot=popover-content]_&]:bg-transparent',
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className
      )}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString('es-419', { month: 'short' }),
        ...formatters,
      }}
      classNames={{
        root: cn('w-fit', defaultClassNames.root),
        months: cn(
          'flex gap-4 flex-col md:flex-row relative',
          defaultClassNames.months
        ),
        month: cn('flex flex-col w-full gap-4', defaultClassNames.month),
        nav: cn(
          'flex items-center gap-1 w-full absolute top-0 inset-x-0 justify-between',
          defaultClassNames.nav
        ),
        button_previous: cn(
          'size-(--cell-size) aria-disabled:opacity-50 p-0 select-none',
          'hover:bg-zinc-800 rounded-md transition-colors',
          defaultClassNames.button_previous
        ),
        button_next: cn(
          'size-(--cell-size) aria-disabled:opacity-50 p-0 select-none',
          'hover:bg-zinc-800 rounded-md transition-colors',
          defaultClassNames.button_next
        ),
        month_caption: cn(
          'flex items-center justify-center h-(--cell-size) w-full px-(--cell-size)',
          defaultClassNames.month_caption
        ),
        dropdowns: cn(
          'w-full flex items-center text-sm font-medium justify-center h-(--cell-size) gap-1.5',
          defaultClassNames.dropdowns
        ),
        dropdown_root: cn(
          'relative has-focus:border-zinc-600 border border-zinc-700 shadow-sm',
          'has-focus:ring-blue-500/50 has-focus:ring-[3px] rounded-md bg-zinc-800',
          defaultClassNames.dropdown_root
        ),
        dropdown: cn('absolute bg-zinc-800 inset-0 opacity-0', defaultClassNames.dropdown),
        caption_label: cn(
          'select-none font-medium text-zinc-300',
          captionLayout === 'label'
            ? 'text-sm'
            : 'rounded-md pl-2 pr-1 flex items-center gap-1 text-sm h-8 [&>svg]:text-zinc-400 [&>svg]:size-3.5',
          defaultClassNames.caption_label
        ),
        table: 'w-full border-collapse',
        weekdays: cn('flex', defaultClassNames.weekdays),
        weekday: cn(
          'text-zinc-400 rounded-md flex-1 font-normal text-[0.8rem] select-none',
          defaultClassNames.weekday
        ),
        week: cn('flex w-full mt-2', defaultClassNames.week),
        week_number_header: cn(
          'select-none w-(--cell-size)',
          defaultClassNames.week_number_header
        ),
        week_number: cn(
          'text-[0.8rem] select-none text-zinc-400',
          defaultClassNames.week_number
        ),
        day: cn(
          'relative w-full h-full p-0 text-center [&:last-child[data-selected=true]_button]:rounded-r-md [&:last-child[data-selected-single=true]_button]:rounded-r-md group/day aspect-square select-none',
          props.showWeekNumber
            ? '[&:nth-child(2)[data-selected=true]_button]:rounded-l-md [&:nth-child(2)[data-selected-single=true]_button]:rounded-l-md'
            : '[&:first-child[data-selected=true]_button]:rounded-l-md [&:first-child[data-selected-single=true]_button]:rounded-l-md',
          defaultClassNames.day
        ),
        range_start: cn('rounded-l-md bg-blue-600/20', defaultClassNames.range_start),
        range_middle: cn('rounded-none bg-blue-600/10', defaultClassNames.range_middle),
        range_end: cn('rounded-r-md bg-blue-600/20', defaultClassNames.range_end),
        today: cn(
          'bg-zinc-800 text-zinc-200 rounded-md data-[selected=true]:rounded-none',
          defaultClassNames.today
        ),
        outside: cn(
          'text-zinc-500 aria-selected:text-zinc-500',
          defaultClassNames.outside
        ),
        disabled: cn('text-zinc-600 opacity-50', defaultClassNames.disabled),
        hidden: cn('invisible', defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return (
            <div
              data-slot="calendar"
              ref={rootRef}
              className={cn(className)}
              {...props}
            />
          );
        },
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === 'left') {
            return (
              <ChevronLeftIcon className={cn('size-4 text-zinc-400', className)} {...props} />
            );
          }

          if (orientation === 'right') {
            return (
              <ChevronRightIcon
                className={cn('size-4 text-zinc-400', className)}
                {...props}
              />
            );
          }

          return (
            <ChevronDownIcon className={cn('size-4 text-zinc-400', className)} {...props} />
          );
        },
        DayButton: ZenCalendarDayButton,
        WeekNumber: ({ children, ...props }) => {
          return (
            <td {...props}>
              <div className="flex size-(--cell-size) items-center justify-center text-center">
                {children}
              </div>
            </td>
          );
        },
        ...components,
      }}
      {...props}
    />
  );
}

function ZenCalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const defaultClassNames = getDefaultClassNames();
  const ref = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  const isSelected = modifiers.selected && !modifiers.range_start && !modifiers.range_end && !modifiers.range_middle;

  return (
    <button
      ref={ref}
      type="button"
      data-day={day.date.toLocaleDateString()}
      data-selected={modifiers.selected}
      data-selected-single={isSelected}
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        'data-[selected-single=true]:bg-blue-600 data-[selected-single=true]:text-white data-[selected-single=true]:font-semibold',
        'data-[selected=true]:bg-blue-600 data-[selected=true]:text-white data-[selected=true]:font-semibold',
        'data-[range-middle=true]:bg-blue-600/20 data-[range-middle=true]:text-zinc-200',
        'data-[range-start=true]:bg-blue-600 data-[range-start=true]:text-white',
        'data-[range-end=true]:bg-blue-600 data-[range-end=true]:text-white',
        'group-data-[focused=true]/day:border-blue-500 group-data-[focused=true]/day:ring-blue-500/50',
        'dark:hover:text-zinc-200 flex aspect-square size-auto w-full min-w-(--cell-size)',
        'flex-col gap-1 leading-none font-normal group-data-[focused=true]/day:relative',
        'group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:ring-[3px]',
        'data-[range-end=true]:rounded-md data-[range-end=true]:rounded-r-md',
        'data-[range-middle=true]:rounded-none data-[range-start=true]:rounded-md',
        'data-[range-start=true]:rounded-l-md hover:bg-zinc-800 transition-colors',
        'text-zinc-300 [&>span]:text-xs [&>span]:opacity-70',
        defaultClassNames.day,
        className
      )}
      {...props}
    />
  );
}

export { ZenCalendar, ZenCalendarDayButton };
export type { ZenCalendarProps };

