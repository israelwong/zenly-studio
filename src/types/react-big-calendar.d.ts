declare module 'react-big-calendar' {
  import { ComponentType, CSSProperties } from 'react';
  import { Moment } from 'moment';

  export type View = 'month' | 'week' | 'day' | 'agenda';
  export type Navigate = 'PREV' | 'NEXT' | 'TODAY' | 'DATE';

  export interface Event {
    id?: string | number;
    title?: string;
    start?: Date;
    end?: Date;
    resource?: any;
    allDay?: boolean;
  }

  export interface CalendarProps {
    localizer: any;
    events?: Event[];
    startAccessor?: string | ((event: Event) => Date);
    endAccessor?: string | ((event: Event) => Date);
    defaultDate?: Date;
    defaultView?: View;
    view?: View;
    onNavigate?: (date: Date, view: View, action: Navigate) => void;
    onView?: (view: View) => void;
    onSelectEvent?: (event: Event) => void;
    onSelectSlot?: (slotInfo: { start: Date; end: Date; slots: Date[] }) => void;
    selectable?: boolean;
    popup?: boolean;
    popupOffset?: number | { x: number; y: number };
    eventPropGetter?: (event: Event) => { style?: CSSProperties; className?: string };
    slotPropGetter?: (date: Date) => { style?: CSSProperties; className?: string };
    dayPropGetter?: (date: Date) => { style?: CSSProperties; className?: string };
    formats?: {
      dayFormat?: string | ((date: Date) => string);
      weekdayFormat?: string | ((date: Date) => string);
      monthHeaderFormat?: string | ((date: Date) => string);
      dayHeaderFormat?: string | ((date: Date) => string);
      dayRangeHeaderFormat?: (args: { start: Date; end: Date }) => string;
      eventTimeRangeFormat?: (args: { start: Date; end: Date }) => string;
      eventTimeRangeStartFormat?: (args: { start: Date; end: Date }) => string;
      eventTimeRangeEndFormat?: (args: { start: Date; end: Date }) => string;
      agendaHeaderFormat?: (args: { start: Date; end: Date }) => string;
      agendaDateFormat?: string | ((date: Date) => string);
      agendaTimeFormat?: string | ((date: Date) => string);
      agendaTimeRangeFormat?: (args: { start: Date; end: Date }) => string;
    };
    messages?: {
      next?: string;
      previous?: string;
      today?: string;
      month?: string;
      week?: string;
      day?: string;
      agenda?: string;
      date?: string;
      time?: string;
      event?: string;
      noEventsInRange?: string;
      showMore?: (total: number) => string;
    };
    culture?: string;
    components?: {
      event?: ComponentType<any>;
      eventWrapper?: ComponentType<any>;
      dayWrapper?: ComponentType<any>;
      dateCellWrapper?: ComponentType<any>;
      timeSlotWrapper?: ComponentType<any>;
      timeGutterHeader?: ComponentType<any>;
      toolbar?: ComponentType<any>;
      header?: ComponentType<any>;
      agenda?: {
        date?: ComponentType<any>;
        time?: ComponentType<any>;
        event?: ComponentType<any>;
      };
      day?: {
        header?: ComponentType<any>;
        event?: ComponentType<any>;
      };
      week?: {
        header?: ComponentType<any>;
        event?: ComponentType<any>;
      };
      month?: {
        header?: ComponentType<any>;
        dateHeader?: ComponentType<any>;
        event?: ComponentType<any>;
      };
    };
    style?: CSSProperties;
    className?: string;
    length?: number;
    min?: Date;
    max?: Date;
    scrollToTime?: Date;
    rtl?: boolean;
    step?: number;
    timeslots?: number;
    showMultiDayTimes?: boolean;
    resizable?: boolean;
    draggableAccessor?: (event: Event) => boolean;
    onEventDrop?: (args: { event: Event; start: Date; end: Date }) => void;
    onEventResize?: (args: { event: Event; start: Date; end: Date }) => void;
  }

  export const Calendar: ComponentType<CalendarProps>;
  export const momentLocalizer: (moment: typeof Moment) => any;
  export const globalizeLocalizer: (globalize: any) => any;
  export const dateFnsLocalizer: (dateFns: any) => any;
}

